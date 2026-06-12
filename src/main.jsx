import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const demoLeads = [
  { id: 1, owner: "John Smith", phone: "513-555-0121", state: "Ohio", county: "Hamilton", address: "123 Vine St, Cincinnati, OH", overage: 18500, status: "New" },
  { id: 2, owner: "Lisa Brown", phone: "713-555-0198", state: "Texas", county: "Harris", address: "880 Main Ave, Houston, TX", overage: 32000, status: "New" },
  { id: 3, owner: "Carlos Diaz", phone: "305-555-0144", state: "Florida", county: "Miami-Dade", address: "45 Ocean Dr, Miami, FL", overage: 27500, status: "Interested" },
  { id: 4, owner: "Angela Reed", phone: "404-555-0177", state: "Georgia", county: "Fulton", address: "77 Peachtree Rd, Atlanta, GA", overage: 14300, status: "Contacted" }
];

function App() {
  const [page, setPage] = useState("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const paymentSuccess = window.location.search.includes("success=true");
  const [loggedIn, setLoggedIn] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState("free");
  const [leads, setLeads] = useState(demoLeads);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [showHotLeads, setShowHotLeads] = useState(false);
  const [notes, setNotes] = useState({});
  
const filtered = useMemo(() => {
  const q = query.toLowerCase();

  return leads.filter(l => {
    const matchesSearch =
      `${l.owner} ${l.phone} ${l.state} ${l.county} ${l.address} ${l.status}`
        .toLowerCase()
        .includes(q);

    const matchesHotLead =
      !showHotLeads || l.status === "Interested";

    return matchesSearch && matchesHotLead;
  });
}, [query, leads, showHotLeads]);

  function loginAsInvestor() {
    setLoggedIn(true);
    setAdmin(false);
    setPage("dashboard");
  }

  function loginAsAdmin() {
    setLoggedIn(true);
    setAdmin(true);
    setPage("dashboard");
  }

  async function signUp() {
  if (!supabase) {
    alert("Supabase is not connected yet.");
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Account created. Check your email if confirmation is required.");
}

async function signIn() {
  if (!supabase) {
    alert("Supabase is not connected yet.");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }

const { data: userData } = await supabase.auth.getUser();

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("subscription_status")
  .eq("id", userData.user.id)
  .single();

if (profileError) {
  alert(profileError.message);
  return;
}

setSubscriptionStatus(profile.subscription_status);
setLoggedIn(true);
setAdmin(false);
setPage("dashboard");

}
  function logout() {
    setLoggedIn(false);
    setAdmin(false);
    setPage("home");
  }

  function updateStatus(id, status) {
    setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
  }
function toggleFavorite(id) {
  setFavorites(prev =>
    prev.includes(id)
      ? prev.filter(favId => favId !== id)
      : [...prev, id]
  );
}
async function updateNote(id, note) {
  setNotes(prev => ({
    ...prev,
    [id]: note
  }));

  if (!supabase) {
    alert("Supabase not connected");
    return;
  }

  const { data: userData } = await supabase.auth.getUser();

  const userEmail = userData?.user?.email;

  if (!userEmail) {
    alert("No logged-in user email found");
    return;
  }

const { error } = await supabase
  .from("lead_notes")
  .upsert(
    {
      lead_id: String(id),
      user_email: userEmail,
      note: note
    },
    {
      onConflict: "user_email,lead_id"
    }
  );

if (error) {
  alert("Note save error: " + error.message);
}
  );

  if (error) {
    alert("Note save error: " + error.message);
  }
}
  function addLead() {
    const id = leads.length + 1;
    setLeads([...leads, {
      id,
      owner: "New Demo Lead",
      phone: "555-555-0000",
      state: "Ohio",
      county: "Cuyahoga",
      address: `${id} Market St, Cleveland, OH`,
      overage: 10000 + id * 1500,
      status: "New"
    }]);
  }
  function handleCSVUpload(event) {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const text = e.target.result;
    const rows = text.split("\n").slice(1);

    const importedLeads = rows
      .filter(row => row.trim() !== "")
      .map((row, index) => {
        const columns = row.split(",");

        return {
          id: leads.length + index + 1,
          owner: columns[0] || "",
          phone: columns[1] || "",
          state: columns[2] || "",
          county: columns[3] || "",
          address: columns[4] || "",
          overage: Number(columns[5]) || 0,
          status: columns[6] || "New"
        };
      });

    setLeads([...leads, ...importedLeads]);
  };

  reader.readAsText(file);
}

  function exportCSV() {
    const rows = [
      ["Owner", "Phone", "State", "County", "Address", "Estimated Overage", "Status"],
      ...filtered.map(l => [l.owner, l.phone, l.state, l.county, l.address, l.overage, l.status])
    ];

    const csv = rows
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "psl-leads.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

if (page === "login") {
  return (
    <main className="center">
      <section className="login-card">
        <h1>PSL Finance Hub</h1>
        <p>Create an account or login.</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="primary" onClick={signUp}>
          Create Account
        </button>

        <button className="secondary" onClick={signIn}>
          Login
        </button>

        <button className="link" onClick={() => setPage("home")}>
          Back Home
        </button>
      </section>
    </main>
  );
}
  if (page === "terms") {
  return (
    <main className="center">
      <section className="login-card">
        <h1>Terms of Service</h1>
        <p>PSL Finance Hub provides foreclosure overage lead management tools for informational and business use only.</p>
        <p>Users are responsible for verifying all lead data before taking action.</p>
        <p>Use of this platform does not guarantee profits, successful claims, or recovery of funds.</p>
        <button className="link" onClick={() => setPage("dashboard")}>Back to Dashboard</button>
      </section>
    </main>
  );
}

if (page === "privacy") {
  return (
    <main className="center">
      <section className="login-card">
        <h1>Privacy Policy</h1>
        <p>PSL Finance Hub collects account information, login details, uploaded lead data, and usage information needed to operate the platform.</p>
        <p>We do not sell user account information. Users are responsible for handling uploaded lead data lawfully.</p>
        <button className="link" onClick={() => setPage("dashboard")}>Back to Dashboard</button>
      </section>
    </main>
  );
}

if (page === "refund") {
  return (
    <main className="center">
      <section className="login-card">
        <h1>Refund Policy</h1>
        <p>Subscriptions are billed monthly. Users may cancel future billing according to Stripe subscription settings.</p>
        <p>Refunds are reviewed case by case. Access may remain active until the end of the paid billing period.</p>
        <button className="link" onClick={() => setPage("dashboard")}>Back to Dashboard</button>
      </section>
    </main>
  );
}

if (page === "disclaimer") {
  return (
    <main className="center">
      <section className="login-card">
        <h1>Disclaimer</h1>
        <p>PSL Finance Hub does not provide legal, financial, tax, or investment advice.</p>
        <p>Lead data may contain errors or outdated information. Users must verify all information independently.</p>
        <p>Users are responsible for complying with all applicable laws when contacting owners or using lead data.</p>
        <button className="link" onClick={() => setPage("dashboard")}>Back to Dashboard</button>
      </section>
    </main>
  );
}
if (page === "dashboard" && loggedIn) {
  if (subscriptionStatus !== "active") {
    return (
      <main className="center">
        <section className="login-card">
          <h1>Upgrade Required</h1>
          <p>Your account is currently on the free plan.</p>

          <a
            href="https://buy.stripe.com/test_3cIbJ30n6a3ofNydRsabK00"
            target="_blank"
            rel="noopener noreferrer"
          >
            Upgrade to Starter Plan
          </a>

          <button
            className="link"
            onClick={() => setPage("home")}
          >
            Back Home
          </button>
        </section>
      </main>
    );
  }

  const totalOverage = leads.reduce((sum, l) => sum + Number(l.overage || 0), 0);
    const hotLeads = leads.filter(l => l.status === "Interested").length;
  
 const leadsByState = filtered.reduce((acc, lead) => {
  acc[lead.state] = (acc[lead.state] || 0) + 1;
  return acc;
}, {});
  
 const leadsByCounty = filtered.reduce((acc, lead) => {
  acc[lead.county] = (acc[lead.county] || 0) + 1;
  return acc;
}, {});
  
  const topOverages = [...filtered]
  .sort((a, b) => b.overage - a.overage)
  .slice(0, 10);

  const statesCovered = new Set(filtered.map(lead => lead.state)).size;

const countiesCovered = new Set(filtered.map(lead => lead.county)).size;

const largestOverage = filtered.length
  ? Math.max(...filtered.map(lead => Number(lead.overage || 0)))
  : 0;

const averageOverage = filtered.length
  ? filtered.reduce(
      (sum, lead) => sum + Number(lead.overage || 0),
      0
    ) / filtered.length
  : 0;
  
const statusCounts = filtered.reduce((acc, lead) => {
  acc[lead.status] = (acc[lead.status] || 0) + 1;
  return acc;
}, {});
  const favoriteLeads = filtered.filter(lead =>
  favorites.includes(lead.id)
);
    return (
      <main className="app">
        <aside className="sidebar">
          <h2>PSL</h2>
          <button onClick={() => setAdmin(false)}>Investor Dashboard</button>
          <button onClick={() => setAdmin(true)}>Admin Panel</button>

<a
  className="sidebar-link"
  href="https://buy.stripe.com/4gM28t3zi5N89pa9BcabK01"
  target="_blank"
  rel="noopener noreferrer"
>
  Upgrade to Starter Plan
</a>
<button onClick={() => setPage("terms")}>Terms</button>
<button onClick={() => setPage("privacy")}>Privacy</button>
<button onClick={() => setPage("refund")}>Refund Policy</button>
<button onClick={() => setPage("disclaimer")}>Disclaimer</button>
          
<button onClick={logout}>Logout</button>
        </aside>

        <section className="content">
         <div className="topbar">
  <div>
    <h1>{admin ? "Admin Panel" : "Investor Dashboard"}</h1>
    <p>{admin ? "Manage leads and system data." : "Search and export foreclosure overage leads."}</p>
   <p className="member-badge">
  🟢 ACTIVE MEMBER — Starter Plan
</p>

<p>
  Welcome back, {email}
</p>
  </div>
</div>
          <div className="account-card">
  <h2>Account Summary</h2>
  <p><strong>Plan:</strong> Starter</p>
  <p><strong>Status:</strong> Active</p>
  <p><strong>Access:</strong> Investor Dashboard + CSV Export</p>
           <a
  className="manage-subscription"
  href="https://billing.stripe.com/p/login/test"
  target="_blank"
  rel="noopener noreferrer"
>
  Manage Subscription
</a> 
</div>

          <div className="stats">
            <div className="stat"><b>{leads.length}</b><span>Total Leads</span></div>
            <div className="stat"><b>${totalOverage.toLocaleString()}</b><span>Estimated Overage</span></div>
            <div className="stat"><b>{hotLeads}</b><span>Hot Leads</span></div>
          </div>
          <div className="kpi-grid">
  <div className="stat"><b>{statesCovered}</b><span>States Covered</span></div>
  <div className="stat"><b>{countiesCovered}</b><span>Counties Covered</span></div>
  <div className="stat"><b>${largestOverage.toLocaleString()}</b><span>Largest Overage</span></div>
  <div className="stat"><b>${Math.round(averageOverage).toLocaleString()}</b><span>Average Overage</span></div>
</div>
          <div className="analytics-card">
  <h2>Lead Status Analytics</h2>

  {["New", "Contacted", "Interested", "Closed"].map((status) => (
    <div className="state-row" key={status}>
      <span>{status}</span>
      <strong>{statusCounts[status] || 0} Leads</strong>
    </div>
  ))}
</div>
          <div className="analytics-card">
  <h2>⭐ Favorite Leads ({favoriteLeads.length})</h2>

  {favoriteLeads.length === 0 ? (
    <p>No favorites saved yet.</p>
  ) : (
    favoriteLeads.map((lead) => (
      <div className="state-row" key={lead.id}>
        <span>{lead.owner} ({lead.county})</span>
        <strong>${lead.overage.toLocaleString()}</strong>
      </div>
    ))
  )}
</div>
 
          <div className="analytics-card">
  <h2>Leads by State</h2>

  {Object.entries(leadsByState).map(([state, count]) => (
    <div className="state-row" key={state}>
      <span>{state}</span>
      <strong>{count} Leads</strong>
    </div>
  ))}
</div>
          <div className="analytics-card">
  <h2>Top Counties</h2>

  {Object.entries(leadsByCounty)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([county, count]) => (
      <div className="state-row" key={county}>
        <span>{county}</span>
        <strong>{count} Leads</strong>
      </div>
    ))}
</div>
          <div className="analytics-card">
  <h2>💰 Top Overage Opportunities</h2>

  {topOverages.map((lead) => (
    <div className="state-row" key={lead.id}>
      <span>
        {lead.owner} ({lead.county})
      </span>

      <strong>
        ${lead.overage.toLocaleString()}
      </strong>
    </div>
  ))}
</div>

               {admin && (
            <section className="panel">
              <h2>Admin Tools</h2>
              <button className="primary" onClick={addLead}>Add Demo Lead</button>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
              />
              <p>This admin panel is ready for Supabase database connection later.</p>
            </section>
          )}

          <section className="panel">
            <div className="table-wrap">
              <div className="panel-head">
  <input
    className="search"
    placeholder="🔍 Search by owner, phone, state, county, address, or status..."
    value={query}
    onChange={e => setQuery(e.target.value)}
  />

  <button
    className="primary"
    onClick={() => setShowHotLeads(!showHotLeads)}
  >
    {showHotLeads ? "🔥 Hot Leads ON" : "🔥 Hot Leads OFF"}
  </button>

  <span className="lead-count">
    {filtered.length} Leads Found
  </span>

  <button className="primary" onClick={exportCSV}>
    Download CSV
  </button>
</div>
              <table>
                <thead>
                  <tr>
                    <th>Owner</th><th>Phone</th><th>State</th><th>County</th><th>Address</th><th>Overage</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <tr key={lead.id}>
                      <td>{lead.owner}</td>
                      <td><a href={`tel:${lead.phone}`}>{lead.phone}</a></td>
                      <td>{lead.state}</td>
                      <td>{lead.county}</td>
                      <td>{lead.address}</td>
                      <td>${lead.overage.toLocaleString()}</td>
                      <td><span className={`badge ${lead.status.toLowerCase()}`}>{lead.status}</span></td>
                 <td>
  <button onClick={() => toggleFavorite(lead.id)}>
    {favorites.includes(lead.id) ? "★ Saved" : "☆ Favorite"}
  </button>

  <button onClick={() => updateStatus(lead.id, "Contacted")}>
    Contacted
  </button>

  <button onClick={() => updateStatus(lead.id, "Interested")}>
    Interested
  </button>

  <button onClick={() => updateStatus(lead.id, "Closed")}>
    Closed
  </button>

<textarea
  placeholder="Add note..."
  value={notes[lead.id] || ""}
  onChange={(e) =>
    setNotes(prev => ({
      ...prev,
      [lead.id]: e.target.value
    }))
  }
  rows="2"
/>

<button
  onClick={() => updateNote(lead.id, notes[lead.id] || "")}
>
  Save Note
</button>
</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main>
      {paymentSuccess && (
  <div style={{
    background: "#22c55e",
    color: "#07120b",
    padding: "16px",
    textAlign: "center",
    fontWeight: "bold"
  }}>
    🎉 Payment Successful! Welcome to PSL Finance Hub. You can now access your dashboard.
  </div>
)}
      <nav className="nav">
        <strong>PSL Finance Hub</strong>
        <div>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <button onClick={() => setPage("login")}>Login</button>
        </div>
      </nav>

      <section className="hero">
        <h1>Find Hidden Foreclosure Money Most Investors Miss</h1>
        <p>PSL Finance Hub helps investors discover foreclosure overage leads, track deals, and export opportunities nationwide.</p>
        <button className="primary big" onClick={() => setPage("login")}>Enter Platform</button>
      </section>

      <section id="features" className="cards">
        <div><h3>Lead Database</h3><p>Search foreclosure overage opportunities by state, county, owner, and amount.</p></div>
        <div><h3>Investor Dashboard</h3><p>Track lead status from new to contacted, interested, and closed.</p></div>
        <div><h3>Admin Panel</h3><p>Add leads and manage your foreclosure lead system.</p></div>
        <div><h3>CSV Export</h3><p>Download lead lists for outreach, calling, texting, and follow-up.</p></div>
      </section>

      <section id="pricing" className="pricing">
        <h2>Simple Pricing</h2>
        <div className="cards">
          <div><h3>Starter</h3><b>$49/mo</b><p>Limited lead access.</p></div>
          <div><h3>Pro</h3><b>$149/mo</b><p>Full dashboard access.</p></div>
          <div><h3>Elite</h3><b>$299/mo</b><p>Premium leads and exports.</p></div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

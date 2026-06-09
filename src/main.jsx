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

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return leads.filter(l =>
      `${l.owner} ${l.phone} ${l.state} ${l.county} ${l.address} ${l.status}`.toLowerCase().includes(q)
    );
  }, [query, leads]);

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
 .eq("email", email.trim().toLowerCase())
  .maybeSingle();

if (profileError) {
  alert(profileError.message);
  return;
}
alert(JSON.stringify(profile));

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
if (page === "dashboard" && loggedIn) {
  if (subscriptionStatus !== "active") {
    return (
      <main className="center">
        <section className="login-card">
          <h1>Upgrade Required</h1>
          <p>Your account is currently on the free plan.</p>

          <a
            href="https://buy.stripe.com/4gM28t3zi5N89pa9BcabK01"
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

    return (
      <main className="app">
        <aside className="sidebar">
          <h2>PSL</h2>
          <button onClick={() => setAdmin(false)}>Investor Dashboard</button>
          <button onClick={() => setAdmin(true)}>Admin Panel</button>
<button onClick={exportCSV}>Export CSV</button>

<a
  className="sidebar-link"
  href="https://buy.stripe.com/4gM28t3zi5N89pa9BcabK01"
  target="_blank"
  rel="noopener noreferrer"
>
  Upgrade to Starter Plan
</a>

<button onClick={logout}>Logout</button>
        </aside>

        <section className="content">
          <div className="topbar">
            <div>
              <h1>{admin ? "Admin Panel" : "Investor Dashboard"}</h1>
              <p>{admin ? "Manage leads and system data." : "Search and export foreclosure overage leads."}</p>
            </div>
          </div>

          <div className="stats">
            <div className="stat"><b>{leads.length}</b><span>Total Leads</span></div>
            <div className="stat"><b>${totalOverage.toLocaleString()}</b><span>Estimated Overage</span></div>
            <div className="stat"><b>{hotLeads}</b><span>Hot Leads</span></div>
          </div>

          {admin && (
            <section className="panel">
              <h2>Admin Tools</h2>
              <button className="primary" onClick={addLead}>Add Demo Lead</button>
              <p>This admin panel is ready for Supabase database connection later.</p>
            </section>
          )}

          <section className="panel">
            <div className="panel-head">
              <input
                className="search"
                placeholder="Search leads by owner, phone, state, county, address, status..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button className="primary" onClick={exportCSV}>Download CSV</button>
            </div>

            <div className="table-wrap">
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
                        <button onClick={() => updateStatus(lead.id, "Contacted")}>Contacted</button>
                        <button onClick={() => updateStatus(lead.id, "Interested")}>Interested</button>
                        <button onClick={() => updateStatus(lead.id, "Closed")}>Closed</button>
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

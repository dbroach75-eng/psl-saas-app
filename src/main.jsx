import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const stripeLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK || "#";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const demoLeads = [
  { id: 1, owner_name: "John Smith", state: "Ohio", county: "Hamilton", address: "123 Vine St, Cincinnati, OH", estimated_overage: 18500, status: "New" },
  { id: 2, owner_name: "Lisa Brown", state: "Texas", county: "Harris", address: "880 Main Ave, Houston, TX", estimated_overage: 32000, status: "New" },
  { id: 3, owner_name: "Carlos Diaz", state: "Florida", county: "Miami-Dade", address: "45 Ocean Dr, Miami, FL", estimated_overage: 27500, status: "Interested" },
  { id: 4, owner_name: "Angela Reed", state: "Georgia", county: "Fulton", address: "77 Peachtree Rd, Atlanta, GA", estimated_overage: 14300, status: "Contacted" }
];

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState(demoLeads);
  const [query, setQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState("home");

  async function authSubmit(e) {
    e.preventDefault();
    if (!supabase) {
      setUser({ email });
      setPage("dashboard");
      return;
    }

    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (result.error) return alert(result.error.message);
    setUser(result.data.user || { email });
    setPage("dashboard");
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setPage("home");
  }

  const filtered = useMemo(() => {
    return leads.filter(l => `${l.owner_name} ${l.state} ${l.county} ${l.address} ${l.status}`.toLowerCase().includes(query.toLowerCase()));
  }, [leads, query]);

  function exportCSV() {
    const rows = ["Owner,State,County,Address,Estimated Overage,Status"];
    filtered.forEach(l => rows.push(`"${l.owner_name}","${l.state}","${l.county}","${l.address}",${l.estimated_overage},"${l.status}"`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "psl-leads.csv";
    a.click();
  }

  function updateStatus(id, status) {
    setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
  }

  function addDemoLead() {
    const id = leads.length + 1;
    setLeads([...leads, {
      id,
      owner_name: "New Lead",
      state: "Ohio",
      county: "Cuyahoga",
      address: `${id} Market St`,
      estimated_overage: 10000 + id * 1500,
      status: "New"
    }]);
  }

  if (page === "auth") {
    return (
      <main className="auth-wrap">
        <section className="auth-card">
          <h1>{authMode === "login" ? "Login" : "Create Account"}</h1>
          <p>Access PSL investor tools and foreclosure overage leads.</p>
          <form onSubmit={authSubmit}>
            <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button className="primary">{authMode === "login" ? "Login" : "Sign Up"}</button>
          </form>
          <button className="link" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
            {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
          </button>
          <button className="link" onClick={() => setPage("home")}>Back home</button>
        </section>
      </main>
    );
  }

  if (page === "dashboard" && user) {
    const totalOverage = leads.reduce((sum, l) => sum + Number(l.estimated_overage || 0), 0);
    return (
      <main className="app">
        <aside className="sidebar">
          <h2>PSL</h2>
          <button onClick={() => setIsAdmin(false)}>Investor Dashboard</button>
          <button onClick={() => setIsAdmin(true)}>Admin Panel</button>
          <a href={stripeLink}>Upgrade</a>
          <button onClick={logout}>Logout</button>
        </aside>

        <section className="content">
          <div className="topbar">
            <div>
              <h1>{isAdmin ? "Admin Command Center" : "Investor Lead Dashboard"}</h1>
              <p>{user.email}</p>
            </div>
            <button className="primary" onClick={exportCSV}>Export CSV</button>
          </div>

          <div className="stats">
            <div className="stat"><b>{leads.length}</b><span>Total Leads</span></div>
            <div className="stat"><b>${totalOverage.toLocaleString()}</b><span>Estimated Overage</span></div>
            <div className="stat"><b>{leads.filter(l => l.status === "Interested").length}</b><span>Hot Leads</span></div>
          </div>

          {isAdmin && (
            <div className="panel">
              <h2>Admin Tools</h2>
              <button className="primary" onClick={addDemoLead}>Add Demo Lead</button>
              <p>Next step: connect this to Supabase table inserts.</p>
            </div>
          )}

          <div className="panel">
            <input className="search" placeholder="Search by owner, state, county, address..." value={query} onChange={e => setQuery(e.target.value)} />
            <table>
              <thead><tr><th>Owner</th><th>State</th><th>County</th><th>Address</th><th>Overage</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id}>
                    <td>{lead.owner_name}</td>
                    <td>{lead.state}</td>
                    <td>{lead.county}</td>
                    <td>{lead.address}</td>
                    <td>${Number(lead.estimated_overage).toLocaleString()}</td>
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
      </main>
    );
  }

  return (
    <main>
      <nav className="nav">
        <strong>PSL Finance Hub</strong>
        <div>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <button onClick={() => setPage("auth")}>Login</button>
        </div>
      </nav>

      <section className="hero">
        <h1>Find Hidden Foreclosure Money Most Investors Miss</h1>
        <p>PSL Finance Hub helps investors discover foreclosure overage leads, track deals, and export opportunities nationwide.</p>
        <button className="primary big" onClick={() => setPage("auth")}>Get Started</button>
      </section>

      <section id="features" className="cards">
        <div><h3>Lead Database</h3><p>Search foreclosure overage opportunities by state, county, owner, and amount.</p></div>
        <div><h3>Investor Dashboard</h3><p>Track lead status from new to contacted, interested, and closed.</p></div>
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

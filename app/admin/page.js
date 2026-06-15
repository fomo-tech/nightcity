"use client";

import { useEffect, useMemo, useState } from "react";

const emptyConfig = {
  maintenance: false,
  maintenanceMessage: "",
  realtimeEnabled: true,
  maxPlayersPerRoom: 16,
  motd: "",
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("ADMIN LOGIN REQUIRED");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ users: 0, saves: 0 });
  const [config, setConfig] = useState(emptyConfig);
  const [editing, setEditing] = useState({});
  const [busy, setBusy] = useState(false);

  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  useEffect(() => {
    const saved = localStorage.getItem("ncpx_admin_token") || "";
    if (saved) {
      setToken(saved);
      load(saved);
    }
  }, []);

  async function login(event) {
    event?.preventDefault();
    setBusy(true);
    setStatus("AUTHENTICATING...");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "LOGIN_FAILED");
      localStorage.setItem("ncpx_admin_token", data.token);
      setToken(data.token);
      setPassword("");
      setStatus(data.passwordConfigured ? "ADMIN ONLINE" : "ADMIN ONLINE - DEV PASSWORD");
      await load(data.token);
    } catch (error) {
      setStatus(error.message || "LOGIN FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function load(nextToken = token) {
    if (!nextToken) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/overview", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${nextToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "ADMIN_LOAD_FAILED");
      setUsers(data.users || []);
      setStats(data.stats || { users: 0, saves: 0 });
      setConfig({ ...emptyConfig, ...(data.config || {}) });
      setStatus(data.dbConnected ? "ADMIN DATA SYNCED" : `DB OFFLINE: ${data.error || "NO CONNECTION"}`);
    } catch (error) {
      setStatus(error.message || "LOAD FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function saveConfig() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/overview", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "CONFIG_SAVE_FAILED");
      setConfig({ ...emptyConfig, ...data.config });
      setStatus("CONFIG SAVED");
    } catch (error) {
      setStatus(error.message || "CONFIG SAVE FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function saveUser(user) {
    const draft = editing[user.id] || user;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ name: draft.name, provider: draft.provider }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "USER_SAVE_FAILED");
      setEditing(prev => ({ ...prev, [user.id]: null }));
      setStatus("USER UPDATED");
      await load();
    } catch (error) {
      setStatus(error.message || "USER SAVE FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(user) {
    if (!confirm(`DELETE ${user.name || user.id}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "USER_DELETE_FAILED");
      setStatus(`USER DELETED (${data.deletedSaves || 0} SAVES)`);
      await load();
    } catch (error) {
      setStatus(error.message || "USER DELETE FAILED");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("ncpx_admin_token");
    setToken("");
    setUsers([]);
    setStatus("ADMIN LOGIN REQUIRED");
  }

  return (
    <main className="admin-shell">
      <section className="admin-topbar">
        <div>
          <h1>NCPX ADMIN</h1>
          <p>{status}</p>
        </div>
        {token && (
          <div className="admin-actions">
            <button onClick={() => load()} disabled={busy}>REFRESH</button>
            <button onClick={logout}>LOG OUT</button>
          </div>
        )}
      </section>

      {!token ? (
        <form className="admin-login" onSubmit={login}>
          <label>ADMIN PASSWORD</label>
          <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoFocus />
          <button disabled={busy || !password}>{busy ? "CHECKING..." : "LOGIN"}</button>
          <p>Set `ADMIN_PASSWORD` in env for production. Local dev fallback password is `admin`.</p>
        </form>
      ) : (
        <div className="admin-grid">
          <section className="admin-panel">
            <h2>APP CONFIG</h2>
            <label className="admin-check">
              <input type="checkbox" checked={config.realtimeEnabled} onChange={event => setConfig({ ...config, realtimeEnabled: event.target.checked })} />
              REALTIME ENABLED
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={config.maintenance} onChange={event => setConfig({ ...config, maintenance: event.target.checked })} />
              MAINTENANCE MODE
            </label>
            <label>MAX PLAYERS / ROOM</label>
            <input type="number" min="2" max="64" value={config.maxPlayersPerRoom} onChange={event => setConfig({ ...config, maxPlayersPerRoom: event.target.value })} />
            <label>MOTD</label>
            <input value={config.motd} onChange={event => setConfig({ ...config, motd: event.target.value })} />
            <label>MAINTENANCE MESSAGE</label>
            <textarea value={config.maintenanceMessage} onChange={event => setConfig({ ...config, maintenanceMessage: event.target.value })} />
            <button onClick={saveConfig} disabled={busy}>SAVE CONFIG</button>
          </section>

          <section className="admin-panel admin-users">
            <div className="admin-section-head">
              <h2>USERS</h2>
              <span>{stats.users} ACCOUNTS · {stats.saves} SAVES</span>
            </div>
            <div className="admin-table">
              <div className="admin-row admin-row-head">
                <span>ID</span><span>NAME</span><span>PROVIDER</span><span>UPDATED</span><span>ACTIONS</span>
              </div>
              {users.map(user => {
                const draft = editing[user.id] || user;
                return (
                  <div className="admin-row" key={user.id}>
                    <span className="admin-id">{user.id}</span>
                    <input value={draft.name || ""} onChange={event => setEditing(prev => ({ ...prev, [user.id]: { ...draft, name: event.target.value } }))} />
                    <input value={draft.provider || ""} onChange={event => setEditing(prev => ({ ...prev, [user.id]: { ...draft, provider: event.target.value } }))} />
                    <span>{user.updatedAt || user.createdAt || "N/A"}</span>
                    <span className="admin-row-actions">
                      <button onClick={() => saveUser(user)} disabled={busy}>SAVE</button>
                      <button className="danger" onClick={() => deleteUser(user)} disabled={busy}>DELETE</button>
                    </span>
                  </div>
                );
              })}
              {!users.length && <div className="admin-empty">NO USERS FOUND</div>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

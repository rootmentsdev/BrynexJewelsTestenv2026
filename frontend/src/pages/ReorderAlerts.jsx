import { useState, useEffect } from "react";
import { Trash2, BellRing, Mail, MapPin, Search, Check } from "lucide-react";
import Header from "../components/Header";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

// ── Confirmation Modal ──────────────────────────────────────────────────────
const ConfirmModal = ({ open, onClose, onConfirm, title, description, confirmLabel, confirmStyle }) => {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.35)" }}>
      <div style={{ background:"white", borderRadius:16, padding:"36px 40px", width:420, maxWidth:"90vw", boxShadow:"0 20px 60px rgba(0,0,0,0.18)", textAlign:"center" }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:"#111827", marginBottom:10 }}>{title}</h2>
        <p style={{ fontSize:13, color:"#6b7280", marginBottom:28, lineHeight:1.6 }}>{description}</p>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
          <button
            onClick={onClose}
            style={{ height:38, padding:"0 20px", fontSize:13, fontWeight:500, color:"#374151", background:"white", border:"1px solid #d1d5db", borderRadius:8, cursor:"pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ height:38, padding:"0 20px", fontSize:13, fontWeight:600, borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", gap:7, border:"none", ...confirmStyle }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReorderAlerts = () => {
  const isSidebarOpen = useSidebar();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);

  // Modal state
  const [deleteModal, setDeleteModal] = useState(null);   // alertId
  const [resolveModal, setResolveModal] = useState(null); // alertId
  const [notifyModal, setNotifyModal] = useState(null);   // alertId

  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  useEffect(() => { fetchAlerts(); }, [filter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/reorder-alerts?status=${filter}`);
      if (!res.ok) throw new Error();
      setAlerts(await res.json());
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reorder-alerts/${deleteModal}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAlerts(a => a.filter(x => x._id !== deleteModal));
    } catch { alert("Failed to delete alert"); }
    finally { setDeleteModal(null); }
  };

  const confirmResolve = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reorder-alerts/${resolveModal}/resolve`, { method: "PUT" });
      if (!res.ok) throw new Error();
      setAlerts(a => a.map(x => x._id === resolveModal ? { ...x, status: "resolved" } : x));
    } catch { alert("Failed to resolve alert"); }
    finally { setResolveModal(null); }
  };

  const confirmNotify = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reorder-alerts/${notifyModal}/notify`, { method: "PUT" });
      if (!res.ok) throw new Error();
      alert("Notification sent!");
    } catch { alert("Failed to send notification"); }
    finally { setNotifyModal(null); }
  };

  const handleTestEmail = async () => {
    if (!testEmail) { alert("Please enter an email address"); return; }
    try {
      setTestingEmail(true);
      const res = await fetch(`${API_URL}/api/reorder-alerts/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      alert("✅ Test email sent successfully!");
      setShowTestEmail(false);
      setTestEmail("");
    } catch (e) { alert(`❌ Failed: ${e.message}`); }
    finally { setTestingEmail(false); }
  };

  const activeAlerts   = alerts.filter(a => a.status === "active");
  const resolvedAlerts = alerts.filter(a => a.status === "resolved");
  const baseAlerts     = filter === "active" ? activeAlerts : resolvedAlerts;
  const displayedAlerts = baseAlerts.filter(a => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (a.itemName  || "").toLowerCase().includes(s) ||
      (a.itemSku   || "").toLowerCase().includes(s) ||
      (a.itemGroup || "").toLowerCase().includes(s) ||
      (a.warehouse || "").toLowerCase().includes(s)
    );
  });

  return (
    <>
      <Header title="Reorder Alert" />

      {/* Modals */}
      <ConfirmModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={confirmDelete}
        title="Delete this item?"
        description="Are you sure you want to delete this item? This action cannot be undone."
        confirmLabel={<><Trash2 size={14} />Delete</>}
        confirmStyle={{ background:"#fecdd3", color:"#dc2626" }}
      />
      <ConfirmModal
        open={!!resolveModal}
        onClose={() => setResolveModal(null)}
        onConfirm={confirmResolve}
        title="Mark as Resolved?"
        description="Are you sure you want to mark this stock issue as resolved?"
        confirmLabel={<><Check size={14} />Mark as Resolved</>}
        confirmStyle={{ background:"#9B48D7", color:"white" }}
      />
      <ConfirmModal
        open={!!notifyModal}
        onClose={() => setNotifyModal(null)}
        onConfirm={confirmNotify}
        title="Notify about low stock?"
        description="Send a notification to the responsible team about the low stock for this item?"
        confirmLabel={<><BellRing size={14} />Notify</>}
        confirmStyle={{ background:"#9B48D7", color:"white" }}
      />

      <div className={`transition-all duration-300 min-h-screen bg-[#f8f9fa] ${isSidebarOpen ? "ml-64" : "ml-0"}`}>
        <div className="px-8 py-6">

          {/* Page title + Test Email */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-[15px] font-bold text-[#111827]">REORDER ALERT</h1>
              <p className="text-xs text-[#9ca3af] mt-0.5">Monitor products that need reordering</p>
            </div>
            <button
              onClick={() => setShowTestEmail(!showTestEmail)}
              style={{ display:"flex", flexDirection:"row", alignItems:"center", gap:6, height:32, padding:"0 12px", fontSize:12, fontWeight:500, color:"#374151", background:"white", border:"1px solid #d1d5db", borderRadius:6, cursor:"pointer" }}
            >
              <Mail size={13} style={{ color:"#9B48D7", flexShrink:0 }} />
              Test Email
            </button>
          </div>

          {/* Test Email Panel */}
          {showTestEmail && (
            <div className="mb-5 bg-white border border-[#e5e7eb] rounded-md p-4">
              <p className="text-xs font-semibold text-[#374151] mb-3">Send a test email to verify your email settings</p>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  className="flex-1 h-8 px-3 text-xs border border-[#e5e7eb] rounded-md focus:outline-none focus:ring-1 focus:ring-[#9B48D7]"
                />
                <button onClick={() => { setShowTestEmail(false); setTestEmail(""); }} className="h-8 px-3 text-xs font-medium text-[#6b7280] bg-white border border-[#d1d5db] rounded-md cursor-pointer">Cancel</button>
                <button onClick={handleTestEmail} disabled={testingEmail} className="h-8 px-3 text-xs font-medium text-white bg-[#9B48D7] border border-[#8637c3] rounded-md disabled:opacity-50 cursor-pointer">
                  {testingEmail ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          )}

          {/* Search + Status tabs */}
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="Search by SKU (e.g. BLCB9), product name, category, or location..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 h-9 w-[420px] border border-[#e5e7eb] bg-white text-xs text-[#1e293b] placeholder:text-[#b0b7c3] rounded-md focus:outline-none focus:ring-1 focus:ring-[#9B48D7]"
              />
            </div>
            <div className="flex items-center gap-2">
              {[
                { key:"active",   label:"Active Alerts", count: activeAlerts.length },
                { key:"resolved", label:"Resolved",      count: resolvedAlerts.length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`inline-flex items-center gap-2 h-8 px-4 text-xs font-semibold rounded-full border cursor-pointer ${
                    filter === key ? "bg-white border-[#d1d5db] text-[#111827] shadow-sm" : "bg-transparent border-transparent text-[#9ca3af]"
                  }`}
                >
                  {label}
                  <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:20, height:20, fontSize:9, fontWeight:700, borderRadius:"50%", background:"#9B48D7", color:"white", flexShrink:0 }}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#e5e7eb] rounded-sm overflow-hidden">

            {/* Header */}
            <div className="bg-[#111827] flex items-center px-5 py-3">
              <div className="text-[10px] font-semibold tracking-widest text-[#9ca3af] uppercase" style={{flex:2}}>Item Details</div>
              <div className="text-[10px] font-semibold tracking-widest text-[#9ca3af] uppercase" style={{flex:1}}>Warehouse Location</div>
              <div className="text-[10px] font-semibold tracking-widest text-[#9ca3af] uppercase" style={{flex:1}}>Current Stock</div>
              <div className="text-[10px] font-semibold tracking-widest text-[#9ca3af] uppercase" style={{flex:1}}>Reorder Point</div>
              <div className="text-[10px] font-semibold tracking-widest text-[#9ca3af] uppercase" style={{width:108, textAlign:"right"}}>Actions</div>
            </div>

            {/* Rows */}
            {loading ? (
              <div className="py-16 text-center text-sm text-[#9ca3af]">Loading alerts...</div>
            ) : displayedAlerts.length === 0 ? (
              <div className="py-16 text-center">
                <BellRing size={28} className="text-[#d1d5db] mx-auto mb-3" />
                <p className="text-sm font-medium text-[#374151]">
                  {searchTerm ? "No alerts match your search" : filter === "active" ? "No active reorder alerts" : "No resolved alerts"}
                </p>
              </div>
            ) : displayedAlerts.map((alert) => {
              const isResolved = alert.status === "resolved";
              const btnStyle = { width:28, height:28, minWidth:28, minHeight:28, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:5, cursor:"pointer" };

              return (
                <div key={alert._id} className="flex items-center px-5 py-4 border-t border-[#f3f4f6]">
                  {/* Item Details */}
                  <div style={{flex:2}}>
                    {alert.itemSku && (
                      <span className="inline-block px-2 py-0.5 text-[9px] font-semibold rounded-sm bg-[#ede9fe] text-[#6d28d9] mb-1">
                        SKU : {alert.itemSku}
                      </span>
                    )}
                    <div className="text-sm font-semibold text-[#111827] leading-tight">{alert.itemName || "—"}</div>
                    <div className="text-[11px] text-[#9ca3af] mt-0.5">Group: {alert.itemGroup || "—"}</div>
                  </div>

                  {/* Warehouse */}
                  <div style={{flex:1, display:"flex", alignItems:"center", gap:5, fontSize:13, color:"#374151"}}>
                    <MapPin size={13} style={{color:"#9B48D7", flexShrink:0}} />
                    {alert.warehouse || "—"}
                  </div>

                  {/* Current Stock */}
                  <div style={{flex:1, fontSize:13}}>
                    <span style={{fontWeight:600, color:"#ef4444"}}>{alert.currentStock}</span>
                    <span style={{color:"#9ca3af"}}> /{alert.reorderPoint * 2 || alert.reorderPoint} Target</span>
                  </div>

                  {/* Reorder Point */}
                  <div style={{flex:1, fontSize:13, fontWeight:500, color:"#374151"}}>{alert.reorderPoint}</div>

                  {/* Actions — order: notify | resolve | delete (matches design) */}
                  <div style={{width:108, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6}}>
                    {!isResolved && (
                      <button
                        onClick={() => setNotifyModal(alert._id)}
                        style={{ ...btnStyle, background:"#9B48D7", border:"1px solid #8637c3", color:"white" }}
                        title="Notify"
                      >
                        <BellRing size={12} />
                      </button>
                    )}
                    {!isResolved && (
                      <button
                        onClick={() => setResolveModal(alert._id)}
                        style={{ ...btnStyle, background:"white", border:"1px solid #e5e7eb", color:"#9B48D7" }}
                        title="Mark as Resolved"
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteModal(alert._id)}
                      style={{ ...btnStyle, background:"#fef2f2", border:"1px solid #fecaca", color:"#ef4444" }}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </>
  );
};

export default ReorderAlerts;

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Send, PackageCheck } from "lucide-react";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";

const currency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const PurchaseReceives = () => {
  const isSidebarOpen = useSidebar();
  const location = useLocation();
  const isNewReceive = location.pathname === "/purchase/receives/new";
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  const [receives, setReceives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});

  useEffect(() => {
    if (isNewReceive) return;
    const fetchReceives = async () => {
      setLoading(true);
      try {
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.email || null;
        const userPower = user?.power || "";

        if (!userId) { setReceives([]); setLoading(false); return; }

        const adminEmails = ['officerootments@gmail.com'];
        const isAdminEmail = adminEmails.some(e => userId.toLowerCase() === e.toLowerCase());
        const isAdmin = isAdminEmail ||
          (userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin')) ||
          (user?.locCode && (String(user.locCode) === '858' || String(user.locCode) === '103'));

        const params = new URLSearchParams({ userId });
        if (userPower) params.append("userPower", userPower);
        if (user?.locCode) params.append("locCode", user.locCode);

        if (!isAdmin) {
          const fallbackLocations = [
            { locName: "Warehouse", locCode: "858" }, { locName: "G-Edappally", locCode: "702" },
            { locName: "HEAD OFFICE01", locCode: "759" }, { locName: "SG-Trivandrum", locCode: "700" },
            { locName: "Z-Edapally", locCode: "144" }, { locName: "Z-Edappal", locCode: "100" },
            { locName: "Z-Perinthalmanna", locCode: "133" }, { locName: "Z-Kottakkal", locCode: "122" },
            { locName: "G-Kottayam", locCode: "701" }, { locName: "G-Perumbavoor", locCode: "703" },
            { locName: "G-Thrissur", locCode: "704" }, { locName: "G-Chavakkad", locCode: "706" },
            { locName: "G-Calicut", locCode: "712" }, { locName: "G-Vadakara", locCode: "708" },
            { locName: "G-Edappal", locCode: "707" }, { locName: "G-Perinthalmanna", locCode: "709" },
            { locName: "G-Kottakkal", locCode: "711" }, { locName: "G-Manjeri", locCode: "710" },
            { locName: "G-Palakkad", locCode: "705" }, { locName: "G-Kalpetta", locCode: "717" },
            { locName: "G-Kannur", locCode: "716" }, { locName: "G-Mg Road", locCode: "718" },
            { locName: "Production", locCode: "101" }, { locName: "Office", locCode: "102" },
          ];
          const loc = fallbackLocations.find(l => l.locCode === String(user?.locCode));
          const userWarehouse = mapWarehouse(loc?.locName || user?.locName || "");
          if (userWarehouse) params.append("warehouse", userWarehouse);
        }

        const response = await fetch(`${API_URL}/api/purchase/receives?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch purchase receives");
        const data = await response.json();
        setReceives(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading purchase receives:", error);
        setReceives([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReceives();
    const handleReceiveSaved = () => fetchReceives();
    window.addEventListener("receiveSaved", handleReceiveSaved);
    return () => window.removeEventListener("receiveSaved", handleReceiveSaved);
  }, [isNewReceive, API_URL]);

  const handleSendReceive = async (receiveId) => {
    setSending(prev => ({ ...prev, [receiveId]: true }));
    try {
      const response = await fetch(`${API_URL}/api/purchase/receives/${receiveId}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send purchase receive");
      }
      setReceives(prev => prev.map(r => r._id === receiveId ? { ...r, status: "received" } : r));
      alert("Purchase receive sent successfully!");
    } catch (error) {
      alert("Failed to send purchase receive: " + error.message);
    } finally {
      setSending(prev => ({ ...prev, [receiveId]: false }));
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    } catch { return "-"; }
  };

  const getStatusBadge = (status) => {
    const map = {
      draft:              { label: "Draft",              bg: "bg-[#F3F4F6]", text: "text-[#6B7280]",  dot: "bg-[#9CA3AF]" },
      in_transit:         { label: "In Transit",         bg: "bg-[#FFFBEB]", text: "text-[#92400E]",  dot: "bg-[#F59E0B]" },
      partially_received: { label: "Partial",            bg: "bg-[#FFF7ED]", text: "text-[#9A3412]",  dot: "bg-[#F97316]" },
      received:           { label: "Received",           bg: "bg-[#F0FDF4]", text: "text-[#166534]",  dot: "bg-[#10b981]" },
    };
    const s = map[status] || map.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-none px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-current/20 ${s.bg} ${s.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

  const getTotalReceived = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (parseFloat(item.received) || 0), 0);
  };

  const receivedCount = receives.filter(r => r.status === "received").length;
  const inTransitCount = receives.filter(r => r.status === "in_transit").length;
  const draftCount = receives.filter(r => (r.status || "draft") === "draft").length;

  return (
    <>
      <Header title="Purchase Receives" />
      <div className={`transition-all duration-300 min-h-screen bg-slate-50 flex flex-col ${isSidebarOpen ? "ml-64" : "ml-0"}`}>

        {/* ── Top Action Bar ── */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <p className="text-xs text-[#6B7280] font-medium">
              {receives.length > 0 ? `${receives.length} total receives` : "No receives yet"}
            </p>
            <Link
              to="/purchase/receives/new"
              className="inline-flex h-9 items-center gap-1.5 px-4 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold uppercase tracking-wider text-white transition-colors shadow-sm"
            >
              + New Receive
            </Link>
          </div>
        </div>

        <div className="px-6 py-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="h-6 w-6 animate-spin rounded-none border-2 border-[#8B5CF6] border-t-transparent" />
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Loading receives...</p>
            </div>

          ) : receives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 rounded-none bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center mb-6">
                <PackageCheck size={30} className="text-[#8B5CF6]" />
              </div>
              <h2 className="text-base font-bold text-[#111827] uppercase tracking-wide mb-2">
                No Purchase Receives Yet
              </h2>
              <p className="text-xs text-[#6B7280] mb-6 text-center max-w-xs">
                Log items received from your vendors to keep inventory accurate.
              </p>
              <Link
                to="/purchase/receives/new"
                className="inline-flex h-9 items-center gap-2 px-6 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold uppercase tracking-wider text-white transition-colors shadow-sm"
              >
                Receive Items
              </Link>
            </div>

          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Total</p>
                  <p className="text-2xl font-bold text-[#111827]">{receives.length}</p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Draft</p>
                  <p className="text-2xl font-bold text-[#9CA3AF]">{draftCount}</p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">In Transit</p>
                  <p className="text-2xl font-bold text-[#F59E0B]">{inTransitCount}</p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Received</p>
                  <p className="text-2xl font-bold text-[#10b981]">{receivedCount}</p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-none border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#E5E7EB]">
                    <thead className="bg-[#F9FAFB]">
                      <tr>
                        <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#6B7280] w-10">#</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Received Date</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Receive #</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Purchase Order #</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Vendor</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Items Received</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Status</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#E5E7EB]">
                      {receives.map((receive, index) => (
                        <tr key={receive._id || receive.id} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="px-5 py-3 text-center text-xs text-[#9CA3AF] font-medium">{index + 1}</td>
                          <td className="px-5 py-3 text-xs text-[#6B7280] whitespace-nowrap">{formatDate(receive.receivedDate)}</td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <Link
                              to={`/purchase/receives/${receive._id || receive.id}`}
                              className="text-xs font-bold text-[#8B5CF6] hover:text-[#7C3AED] hover:underline"
                            >
                              {receive.receiveNumber}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-xs text-[#6B7280] whitespace-nowrap">
                            {receive.purchaseOrderNumber || receive.purchaseOrderId?.orderNumber || "—"}
                          </td>
                          <td className="px-5 py-3 text-xs text-[#374151] font-medium whitespace-nowrap">
                            {receive.vendorName || receive.vendorId?.displayName || receive.vendorId?.companyName || "—"}
                          </td>
                          <td className="px-5 py-3 text-xs text-[#6B7280] whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-[#F3F4F6] border border-[#E5E7EB] text-[10px] font-bold text-[#374151]">
                              {getTotalReceived(receive.items)} items
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {getStatusBadge(receive.status || "received")}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {receive.status === "draft" && (
                              <button
                                onClick={() => handleSendReceive(receive._id || receive.id)}
                                disabled={sending[receive._id || receive.id]}
                                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-none border border-[#C4B5FD] bg-[#F5F3FF] text-[#7C3AED] text-[10px] font-bold uppercase tracking-wider hover:bg-[#EDE9FE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Send size={11} />
                                {sending[receive._id || receive.id] ? "Sending..." : "Send"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default PurchaseReceives;

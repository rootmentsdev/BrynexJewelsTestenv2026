import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Send, Search, X, ShoppingCart, ArrowRight } from "lucide-react";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";

const currency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const fallbackLocations = [
  { locName: "Z-Edapally1", locCode: "144" },
  { locName: "Warehouse", locCode: "858" },
  { locName: "G-Edappally", locCode: "702" },
  { locName: "HEAD OFFICE01", locCode: "759" },
  { locName: "SG-Trivandrum", locCode: "700" },
  { locName: "Z- Edappal", locCode: "100" },
  { locName: "Z.Perinthalmanna", locCode: "133" },
  { locName: "Z.Kottakkal", locCode: "122" },
  { locName: "G.Kottayam", locCode: "701" },
  { locName: "G.Perumbavoor", locCode: "703" },
  { locName: "G.Thrissur", locCode: "704" },
  { locName: "G.Chavakkad", locCode: "706" },
  { locName: "G.Calicut ", locCode: "712" },
  { locName: "G.Vadakara", locCode: "708" },
  { locName: "G.Edappal", locCode: "707" },
  { locName: "G.Perinthalmanna", locCode: "709" },
  { locName: "G.Kottakkal", locCode: "711" },
  { locName: "G.Manjeri", locCode: "710" },
  { locName: "G.Palakkad ", locCode: "705" },
  { locName: "G.Kalpetta", locCode: "717" },
  { locName: "G.Kannur", locCode: "716" },
  { locName: "G.Mg Road", locCode: "718" },
  { locName: "Production", locCode: "101" },
  { locName: "Office", locCode: "102" },
  { locName: "WAREHOUSE", locCode: "103" },
];

const PurchaseOrders = () => {
  const isSidebarOpen = useSidebar();
  const location = useLocation();
  const isNewOrder = location.pathname === "/purchase/orders/new";
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOrderNumber, setSearchOrderNumber] = useState("");
  const [sending, setSending] = useState({});

  useEffect(() => {
    if (isNewOrder) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.email || null;
        const userPower = user?.power || "";

        let searchParam;
        if (searchOrderNumber) {
          searchParam = `orderNumber=${encodeURIComponent(searchOrderNumber)}`;
        } else if (userId) {
          const params = new URLSearchParams({ userId });
          if (userPower) params.append("userPower", userPower);
          if (user?.locCode) params.append("locCode", user.locCode);
          let userLocName = "";
          if (user?.locCode) {
            const loc = fallbackLocations.find(l => l.locCode === user.locCode || l.locCode === String(user.locCode));
            if (loc) userLocName = loc.locName;
          }
          if (!userLocName) userLocName = user?.username || user?.locName || "";
          const userWarehouse = mapWarehouse(userLocName);
          if (userWarehouse) params.append("warehouse", userWarehouse);
          searchParam = params.toString();
        } else {
          searchParam = "";
        }

        const url = `${API_URL}/api/purchase/orders${searchParam ? `?${searchParam}` : ""}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch purchase orders");
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading purchase orders:", error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    const handleOrderSaved = () => fetchOrders();
    window.addEventListener("orderSaved", handleOrderSaved);
    return () => window.removeEventListener("orderSaved", handleOrderSaved);
  }, [isNewOrder, API_URL, searchOrderNumber]);

  const handleSendOrder = async (orderId) => {
    setSending(prev => ({ ...prev, [orderId]: true }));
    try {
      const response = await fetch(`${API_URL}/api/purchase/orders/${orderId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send purchase order");
      }
      setOrders(prev => prev.map(order => order._id === orderId ? { ...order, status: "sent" } : order));
      alert("Purchase order sent successfully!");
    } catch (error) {
      alert("Failed to send purchase order: " + error.message);
    } finally {
      setSending(prev => ({ ...prev, [orderId]: false }));
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
      draft:     { label: "Draft",     bg: "bg-[#F3F4F6]",  text: "text-[#6B7280]",  dot: "bg-[#9CA3AF]" },
      sent:      { label: "Sent",      bg: "bg-[#EFF6FF]",  text: "text-[#1E40AF]",  dot: "bg-[#3b82f6]" },
      received:  { label: "Received",  bg: "bg-[#F0FDF4]",  text: "text-[#166534]",  dot: "bg-[#10b981]" },
      cancelled: { label: "Cancelled", bg: "bg-[#FFF1F2]",  text: "text-[#991b1b]",  dot: "bg-[#ef4444]" },
    };
    const s = map[status] || map.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text} border-current/20`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

  // Counts
  const draftCount = orders.filter(o => (o.status || "draft") === "draft").length;
  const sentCount = orders.filter(o => o.status === "sent").length;
  const receivedCount = orders.filter(o => o.status === "received").length;

  return (
    <>
      <Header title="Purchase Orders" />
      <div className={`transition-all duration-300 min-h-screen bg-slate-50 flex flex-col ${isSidebarOpen ? "ml-64" : "ml-0"}`}>

        {/* ── Top Action Bar ── */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">

            {/* Search */}
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-[#9CA3AF] pointer-events-none" />
              <input
                type="text"
                placeholder="Search by order number..."
                value={searchOrderNumber}
                onChange={(e) => setSearchOrderNumber(e.target.value)}
                className="h-9 pl-9 pr-9 w-64 rounded-none border border-[#E5E7EB] bg-white text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#8B5CF6] focus:outline-none transition-colors"
              />
              {searchOrderNumber && (
                <button
                  onClick={() => setSearchOrderNumber("")}
                  className="absolute right-2.5 text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Right Buttons */}
            <div className="flex items-center gap-2">
              <Link
                to="/purchase/receives"
                className="inline-flex h-9 items-center gap-1.5 px-4 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] transition-colors shadow-sm"
              >
                In Transit Receives
              </Link>
              <Link
                to="/purchase/orders/new"
                className="inline-flex h-9 items-center gap-1.5 px-4 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold uppercase tracking-wider text-white transition-colors shadow-sm"
              >
                + New Order
              </Link>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 flex-1">

          {/* Loading */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="h-6 w-6 animate-spin rounded-none border-2 border-[#8B5CF6] border-t-transparent" />
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Loading orders...</p>
            </div>

          ) : orders.length === 0 ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-none bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center mb-6">
                <ShoppingCart size={30} className="text-[#8B5CF6]" />
              </div>
              <h2 className="text-base font-bold text-[#111827] uppercase tracking-wide mb-2">
                No Purchase Orders Yet
              </h2>
              <p className="text-xs text-[#6B7280] mb-6 text-center max-w-xs">
                Create, customize, and send professional Purchase Orders to your vendors.
              </p>
              <Link
                to="/purchase/orders/new"
                className="inline-flex h-9 items-center gap-2 px-6 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold uppercase tracking-wider text-white transition-colors shadow-sm"
              >
                Create New Purchase Order
              </Link>

              {/* Lifecycle steps */}
              <div className="mt-14 w-full max-w-2xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] text-center mb-5">Life cycle of a purchase order</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {["Raise Purchase Order", "Convert to Open", "Receive Goods", "Convert to Bill", "Record Payment"].map((step, i, arr) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-none border border-[#DDD6FE] bg-white text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] shadow-sm">
                        {step}
                      </span>
                      {i < arr.length - 1 && <ArrowRight size={12} className="text-[#C4B5FD]" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          ) : (
            /* ── Orders Table ── */
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-[#111827]">{orders.length}</p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Draft</p>
                  <p className="text-2xl font-bold text-[#9CA3AF]">{draftCount}</p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Sent</p>
                  <p className="text-2xl font-bold text-[#3b82f6]">{sentCount}</p>
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
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Date</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Order #</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Vendor</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Reference #</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Delivery Date</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Total</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Status</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#E5E7EB]">
                      {orders.map((order, index) => (
                        <tr key={order._id || order.id} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="px-5 py-3 text-center text-xs text-[#9CA3AF] font-medium">{index + 1}</td>
                          <td className="px-5 py-3 text-xs text-[#6B7280] whitespace-nowrap">{formatDate(order.date)}</td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <Link
                              to={`/purchase/orders/${order._id || order.id}`}
                              className="text-xs font-bold text-[#8B5CF6] hover:text-[#7C3AED] hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-xs text-[#374151] font-medium whitespace-nowrap">{order.vendorName || "—"}</td>
                          <td className="px-5 py-3 text-xs text-[#6B7280] whitespace-nowrap">{order.referenceNumber || "—"}</td>
                          <td className="px-5 py-3 text-xs text-[#6B7280] whitespace-nowrap">{formatDate(order.deliveryDate)}</td>
                          <td className="px-5 py-3 text-xs font-bold text-[#111827] text-right whitespace-nowrap">
                            {currency(order.finalTotal || 0)}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {getStatusBadge(order.status || "draft")}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {order.status === "draft" && (
                              <button
                                onClick={() => handleSendOrder(order._id || order.id)}
                                disabled={sending[order._id || order.id]}
                                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-none border border-[#C4B5FD] bg-[#F5F3FF] text-[#7C3AED] text-[10px] font-bold uppercase tracking-wider hover:bg-[#EDE9FE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Send size={11} />
                                {sending[order._id || order.id] ? "Sending..." : "Send"}
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

export default PurchaseOrders;

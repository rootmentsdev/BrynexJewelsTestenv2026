import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Trash2, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Head from "../components/Head";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";

const PERIOD_OPTIONS = [
  { label: "30 Days", value: 30 },
  { label: "90 Days", value: 90 },
  { label: "180 Days", value: 180 },
  { label: "1 Year", value: 365 },
];

const PAGE_SIZE = 10;

const TransferOrders = () => {
  const isSidebarOpen = useSidebar();
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  // Get user info
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.email || user?._id || user?.id || "";
  const userLocCode = user?.locCode || "";
  const userEmail = user?.email || user?.username || "";
  const adminEmails = ["officerootments@gmail.com"];
  const isAdminEmail = userEmail && adminEmails.some((e) => userEmail.toLowerCase() === e.toLowerCase());
  const isAdmin = isAdminEmail || user?.power === "admin";
  const isWarehouseUser = user?.power === "warehouse";

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

  let userLocName = "";
  if (user?.locCode) {
    const location = fallbackLocations.find(
      (loc) => loc.locCode === user.locCode || loc.locCode === String(user.locCode)
    );
    if (location) userLocName = location.locName;
  }
  if (!userLocName) userLocName = user?.username || user?.locName || "";

  const [transferOrders, setTransferOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [ordersToDelete, setOrdersToDelete] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [transferPeriod, setTransferPeriod] = useState(90);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();

  const userWarehouse = mapLocNameToWarehouse(userLocName);
  const isWarehouseSelection =
    (userWarehouse || "").toString().toLowerCase().trim() === "warehouse" ||
    userLocCode === "858" ||
    userLocCode === "103";
  const shouldFilterByWarehouse = !isWarehouseUser && !(isAdmin && isWarehouseSelection);

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return "-";
    }
  };

  const formatDateTime = (date) => {
    if (!date) return "-";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const displayHours = d.getHours() % 12 || 12;
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = d.getHours() >= 12 ? "PM" : "AM";
      return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`;
    } catch {
      return "-";
    }
  };

  // Fetch transfer orders
  useEffect(() => {
    const fetchTransferOrders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (userId) params.append("userId", userId);

        if (
          shouldFilterByWarehouse &&
          userWarehouse &&
          userWarehouse !== "undefined" &&
          userWarehouse !== "null"
        ) {
          params.append("destinationWarehouse", userWarehouse);
          params.append("sourceWarehouse", userWarehouse);
        }
        if (user?.power) params.append("userPower", user.power);
        if (user?.locCode) params.append("locCode", user.locCode);

        const response = await fetch(`${API_URL}/api/inventory/transfer-orders?${params}`);
        if (!response.ok) throw new Error("Failed to fetch transfer orders");
        const data = await response.json();
        let orders = Array.isArray(data) ? data : [];

        if (
          shouldFilterByWarehouse &&
          userWarehouse &&
          userWarehouse !== "undefined" &&
          userWarehouse !== "null"
        ) {
          const userWarehouseLower = userWarehouse.toLowerCase().trim();
          const userBase = userWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();

          const matchesWarehouse = (orderWarehouse) => {
            if (!orderWarehouse) return false;
            const owLower = orderWarehouse.toString().toLowerCase().trim();
            const owBase = owLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
            if (owLower === userWarehouseLower) return true;
            if (owBase && userBase && owBase === userBase) return true;
            if (owLower.includes(userWarehouseLower) || userWarehouseLower.includes(owLower)) return true;
            const owNorm = owLower.replace(/^[a-z]{1,2}[.\-]\s*/i, "").trim();
            const uNorm = userWarehouseLower.replace(/^[a-z]{1,2}[.\-]\s*/i, "").trim();
            if (owNorm && uNorm && owNorm === uNorm) return true;
            return false;
          };

          orders = orders.filter((order) => {
            const matchesDest = matchesWarehouse(order.destinationWarehouse);
            const matchesSource = matchesWarehouse(order.sourceWarehouse);
            if (order.status === "draft" && matchesDest && !matchesSource) return false;
            return matchesDest || matchesSource;
          });
        }

        // Filter by transfer period
        const periodMs = transferPeriod * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - periodMs;
        orders = orders.filter((o) => {
          const d = new Date(o.date || o.createdAt);
          return !isNaN(d.getTime()) ? d.getTime() >= cutoff : true;
        });

        setTransferOrders(orders);
        setCurrentPage(1);
      } catch (error) {
        console.error("Error fetching transfer orders:", error);
        setTransferOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTransferOrders();
  }, [API_URL, userId, isWarehouseUser, isAdmin, isWarehouseSelection, userWarehouse, refreshTrigger, transferPeriod]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) setRefreshTrigger((p) => p + 1);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (location.state?.refresh) {
      setRefreshTrigger((p) => p + 1);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Filtered + paginated
  const filteredOrders = transferOrders.filter((order) => {
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (order.transferOrderNumber || "").toLowerCase().includes(s) ||
      (order.reason || "").toLowerCase().includes(s) ||
      (order.sourceWarehouse || "").toLowerCase().includes(s) ||
      (order.destinationWarehouse || "").toLowerCase().includes(s)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Status counts (from ALL transferOrders)
  const transferredCount = transferOrders.filter((o) => o.status === "transferred").length;
  const inTransitCount = transferOrders.filter((o) => o.status === "in_transit").length;
  const draftCount = transferOrders.filter((o) => o.status === "draft").length;

  // Checkbox handlers
  const handleCheckboxChange = (orderId, isChecked) => {
    const n = new Set(selectedOrders);
    isChecked ? n.add(orderId) : n.delete(orderId);
    setSelectedOrders(n);
  };
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedOrders(new Set(filteredOrders.map((o) => o._id || o.id).filter(Boolean)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  // Delete handlers
  const handleDeleteClick = () => {
    const ids = Array.from(selectedOrders);
    if (!ids.length) return;
    setOrdersToDelete(filteredOrders.filter((o) => ids.includes(o._id || o.id)));
    setDeleteStep(1);
    setShowDeleteModal(true);
  };
  const handleSingleDelete = (order) => {
    setOrdersToDelete([order]);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setOrdersToDelete([]);
  };

  const refreshList = async () => {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (shouldFilterByWarehouse && userWarehouse && userWarehouse !== "undefined" && userWarehouse !== "null") {
      params.append("destinationWarehouse", userWarehouse);
      params.append("sourceWarehouse", userWarehouse);
    }
    const res = await fetch(`${API_URL}/api/inventory/transfer-orders?${params}`);
    if (res.ok) {
      const data = await res.json();
      let orders = Array.isArray(data) ? data : [];
      if (shouldFilterByWarehouse && userWarehouse && userWarehouse !== "undefined" && userWarehouse !== "null") {
        const uwl = userWarehouse.toLowerCase().trim();
        const ub = uwl.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
        const match = (w) => {
          if (!w) return false;
          const wl = w.toString().toLowerCase().trim();
          const wb = wl.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
          return wl === uwl || (wb && ub && wb === ub) || wl.includes(uwl) || uwl.includes(wl);
        };
        orders = orders.filter((o) => {
          const md = match(o.destinationWarehouse);
          const ms = match(o.sourceWarehouse);
          if (o.status === "draft" && md && !ms) return false;
          return md || ms;
        });
      }
      setTransferOrders(orders);
    }
  };

  const handleConfirmDeleteStep2 = async () => {
    setDeleting(true);
    try {
      await Promise.all(
        ordersToDelete.map(async (order) => {
          const id = order._id || order.id;
          if (!id) return;
          const res = await fetch(`${API_URL}/api/inventory/transfer-orders/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Failed to delete");
          }
        })
      );
      const deletedIds = ordersToDelete.map((o) => o._id || o.id).filter(Boolean);
      const newSel = new Set(selectedOrders);
      deletedIds.forEach((id) => newSel.delete(id));
      setSelectedOrders(newSel);
      await refreshList();
      setShowDeleteModal(false);
      setDeleteStep(1);
      setOrdersToDelete([]);
    } catch (err) {
      alert(`Error deleting: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatus((p) => new Set(p).add(orderId));
    try {
      const res = await fetch(`${API_URL}/api/inventory/transfer-orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update status");
      }
      await refreshList();
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setUpdatingStatus((p) => {
        const n = new Set(p);
        n.delete(orderId);
        return n;
      });
    }
  };

  // Pagination helpers
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  // Status badge (non-admin)
  const getStatusBadge = (status) => {
    const map = {
      transferred: { label: "Transferred", bg: "bg-[#d1fae5]", text: "text-[#065f46]", dot: "#065f46" },
      in_transit: { label: "In Transit", bg: "bg-[#ede9fe]", text: "text-[#6d28d9]", dot: "#6d28d9" },
      draft: { label: "Draft", bg: "bg-[#f3f4f6]", text: "text-[#6b7280]", dot: "#6b7280" },
    };
    const s = map[status] || { label: status, bg: "bg-[#f3f4f6]", text: "text-[#6b7280]", dot: "#6b7280" };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${s.bg} ${s.text}`}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
        {s.label}
      </span>
    );
  };

  // Admin status dropdown
  const getStatusSelect = (order) => {
    const map = {
      transferred: { bg: "bg-[#d1fae5]", text: "text-[#065f46]" },
      in_transit: { bg: "bg-[#ede9fe]", text: "text-[#6d28d9]" },
      draft: { bg: "bg-[#f3f4f6]", text: "text-[#6b7280]" },
    };
    const s = map[order.status] || map.draft;
    const id = order._id || order.id;
    return (
      <div className="relative inline-flex items-center">
        <select
          value={order.status}
          onChange={(e) => handleStatusChange(id, e.target.value)}
          disabled={updatingStatus.has(id)}
          className={`appearance-none pr-6 pl-3 py-1 text-xs font-semibold rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-[#9B48D7] disabled:opacity-50 cursor-pointer ${s.bg} ${s.text}`}
        >
          <option value="draft">Draft</option>
          <option value="in_transit">In Transit</option>
          <option value="transferred">Transferred</option>
        </select>
        <ChevronDown size={11} className={`pointer-events-none absolute right-1.5 ${s.text}`} />
      </div>
    );
  };

  const TABLE_COLS = [
    "DATE",
    "TRANSFER ORDER #",
    "REASON",
    "STATUS",
    "QUANTITY",
    "SOURCE WAREHOUSE",
    "DESTINATION WAREHOUSE",
    "CREATED BY",
  ];

  return (
    <>
      <Header title="Transfer Orders" />
      <div className={`transition-all duration-300 p-8 bg-[#f8f9fa] min-h-screen ${isSidebarOpen ? "ml-64" : "ml-0"}`}>

        {/* ── Top bar: Search + New button ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-[#94a3b8]" size={15} />
              <input
                type="text"
                placeholder="Search by reference number, reasons, or description"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-3 h-9 w-[320px] border border-[#e2e8f0] bg-white text-xs text-[#1e293b] placeholder:text-[#b0b7c3] focus:outline-none focus:ring-1 focus:ring-[#9B48D7] rounded-md"
              />
            </div>
            {/* Order count pill */}
            {!loading && (
              <span className="px-3 py-1 text-xs font-semibold bg-[#ede9fe] text-[#6d28d9] rounded-full">
                {filteredOrders.length} {filteredOrders.length === 1 ? "Order" : "Orders"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && selectedOrders.size > 0 && (
              <button
                onClick={handleDeleteClick}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#dc2626] px-4 text-sm font-semibold text-white hover:bg-[#b91c1c] transition cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete ({selectedOrders.size})</span>
              </button>
            )}
            <Link
              to="/inventory/transfer-orders/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#9B48D7] px-5 text-sm font-semibold text-white hover:bg-[#8637c3] transition"
            >
              <span className="text-base leading-none">+</span>
              <span>New Transfer Order</span>
            </Link>
          </div>
        </div>

        {/* ── Second row: Transfer Period (left) + Status tabs (right) ── */}
        <div className="flex items-center justify-between mb-4">
          {/* Transfer Period dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#64748b]">Transfer Period</span>
            <div className="relative">
              <select
                value={transferPeriod}
                onChange={(e) => setTransferPeriod(Number(e.target.value))}
                className="appearance-none h-7 pl-2.5 pr-7 text-[11px] font-semibold border border-[#e2e8f0] bg-white text-[#374151] rounded-md focus:outline-none focus:ring-1 focus:ring-[#9B48D7] cursor-pointer"
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            </div>
          </div>

          {/* Status tab pills */}
          <div className="flex items-center bg-[#f0f0f3] rounded-full p-0.5">
            {[
              { key: "all",         label: "All",         count: transferOrders.length },
              { key: "in_transit",  label: "In Transit",  count: inTransitCount },
              { key: "transferred", label: "Transfered", count: transferredCount },
              { key: "draft",       label: "Draft",        count: draftCount },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => { setStatusFilter(key); setCurrentPage(1); }}
                className={`inline-flex items-center px-2 py-0.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === key
                    ? "bg-white shadow-sm text-[#111827]"
                    : "text-[#b0b7c3] hover:text-[#9ca3af]"
                }`}
                style={{ fontSize: "10px", fontWeight: statusFilter === key ? 700 : 400 }}
              >
                {label}
                <span
                  className="inline-flex items-center justify-center rounded-full bg-[#9B48D7] text-white shrink-0 ml-1"
                  style={{ width: "14px", height: "14px", fontSize: "8px", fontWeight: 500 }}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-[#e2e8f0] overflow-hidden rounded-sm">
          <div className="overflow-x-auto">
            {loading ? (
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#18181b]">
                    <th className="w-10 px-4 py-3 border-r border-[#27272a]" />
                    {TABLE_COLS.map((c) => (
                      <th key={c} className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-[#a1a1aa] uppercase border-r border-[#27272a] last:border-r-0 whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: TABLE_COLS.length + 1 }).map((_, j) => (
                        <td key={j} className="px-4 py-3 border-r border-[#f1f5f9] last:border-r-0">
                          <div className="h-4 bg-[#e2e8f0] rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : filteredOrders.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-[#f1f5f9] flex items-center justify-center mb-4">
                  <Search className="text-[#94a3b8]" size={22} />
                </div>
                <p className="text-sm font-semibold text-[#1e293b] mb-1">
                  {searchTerm ? "No transfer orders found" : "No transfer orders yet"}
                </p>
                <p className="text-xs text-[#64748b] mb-4">
                  {searchTerm ? "Try adjusting your search" : "Create your first transfer order to get started"}
                </p>
                {!searchTerm && (
                  <Link
                    to="/inventory/transfer-orders/new"
                    className="inline-flex items-center gap-2 rounded-md bg-[#9B48D7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8637c3] transition"
                  >
                    + Create Transfer Order
                  </Link>
                )}
              </div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#18181b]">
                    <th className="w-10 px-4 py-3 text-center border-r border-[#27272a]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#52525b] accent-[#9B48D7] cursor-pointer"
                        checked={
                          pagedOrders.length > 0 &&
                          pagedOrders.every((o) => {
                            const id = o._id || o.id;
                            return !id || selectedOrders.has(id);
                          })
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    {TABLE_COLS.map((col, i) => (
                      <th
                        key={col}
                        className={`px-4 py-3 text-left text-[10px] font-semibold tracking-widest text-[#a1a1aa] uppercase whitespace-nowrap ${i < TABLE_COLS.length - 1 ? "border-r border-[#27272a]" : ""}`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {pagedOrders.map((order) => {
                    const id = order._id || order.id;
                    return (
                      <tr
                        key={id}
                        className="hover:bg-[#faf5ff] transition-colors cursor-pointer group"
                        onClick={() => navigate(`/inventory/transfer-orders/${id}`)}
                      >
                        {/* Checkbox */}
                        <td
                          className="px-4 py-3 text-center border-r border-[#f1f5f9]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-[#d1d5db] accent-[#9B48D7] cursor-pointer"
                              checked={selectedOrders.has(id)}
                              onChange={(e) => handleCheckboxChange(id, e.target.checked)}
                            />
                            {isAdmin && selectedOrders.has(id) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSingleDelete(order); }}
                                className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[#475569] border-r border-[#f1f5f9]">
                          {formatDate(order.date)}
                        </td>

                        {/* Transfer Order # */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm border-r border-[#f1f5f9]">
                          <span
                            className="font-semibold text-[#9B48D7] group-hover:underline cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigate(`/inventory/transfer-orders/${id}`); }}
                          >
                            {order.transferOrderNumber || "—"}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="px-4 py-3 text-sm text-[#6b7280] border-r border-[#f1f5f9] max-w-[180px] truncate">
                          {order.reason || "—"}
                        </td>

                        {/* Status */}
                        <td
                          className="px-4 py-3 whitespace-nowrap text-sm border-r border-[#f1f5f9]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isAdmin ? getStatusSelect(order) : getStatusBadge(order.status)}
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold text-[#1f2937] border-r border-[#f1f5f9]">
                          {parseFloat(order.totalQuantityTransferred || 0).toFixed(0)}
                        </td>

                        {/* Source Warehouse */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[#475569] border-r border-[#f1f5f9]">
                          {order.sourceWarehouse || "—"}
                        </td>

                        {/* Destination Warehouse */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[#475569] border-r border-[#f1f5f9]">
                          {order.destinationWarehouse || "—"}
                        </td>

                        {/* Created By */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[#64748b]">
                          {order.createdBy || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Pagination ── */}
          {!loading && filteredOrders.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-1 py-5 border-t border-[#f1f5f9]">
              {/* Previous */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 h-8 text-xs font-medium text-[#6b7280] hover:text-[#1f2937] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-[#9ca3af] text-xs select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 text-xs font-semibold rounded-md transition cursor-pointer ${
                      currentPage === page
                        ? "bg-[#9B48D7] text-white"
                        : "text-[#374151] hover:bg-[#f3f4f6]"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              {/* Next */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 h-8 text-xs font-medium text-[#6b7280] hover:text-[#1f2937] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ── 2-Step Delete Modal ── */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white shadow-xl max-w-md w-full mx-4 rounded-md">
              <div className="p-6">
                {deleteStep === 1 ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="text-red-600" size={20} />
                      </div>
                      <h3 className="text-lg font-semibold text-[#1e293b]">
                        Delete {ordersToDelete.length === 1 ? "Transfer Order" : `${ordersToDelete.length} Transfer Orders`}?
                      </h3>
                    </div>
                    <p className="text-sm text-[#64748b] mb-6">
                      Are you sure you want to delete{" "}
                      {ordersToDelete.length === 1 ? "this transfer order" : `these ${ordersToDelete.length} transfer orders`}?
                      {ordersToDelete.some((o) => o.status === "transferred") && (
                        <span className="block mt-2 text-red-600 font-medium">
                          ⚠️ Some orders are already transferred. Stock will be reversed before deletion.
                        </span>
                      )}
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button onClick={handleCancelDelete} className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-md hover:bg-[#f8fafc] transition">
                        Cancel
                      </button>
                      <button onClick={() => setDeleteStep(2)} className="px-4 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-md hover:bg-[#b91c1c] transition">
                        Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="text-red-600" size={20} />
                      </div>
                      <h3 className="text-lg font-semibold text-[#1e293b]">Final Confirmation</h3>
                    </div>
                    <p className="text-sm text-[#64748b] mb-4">
                      This action cannot be undone. Are you absolutely sure?
                    </p>
                    {ordersToDelete.length > 0 && (
                      <div className="mb-4 p-3 bg-[#f8fafc] max-h-40 overflow-y-auto border border-[#e2e8f0] rounded">
                        <p className="text-xs font-semibold text-[#64748b] mb-2">Orders to be deleted:</p>
                        <ul className="text-xs text-[#475569] space-y-1">
                          {ordersToDelete.map((order, idx) => (
                            <li key={order._id || order.id || idx}>
                              • {order.transferOrderNumber || `Order-${String(order._id || order.id).slice(-8)}`} — {order.reason || "No reason"} ({order.status})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setDeleteStep(1)} disabled={deleting} className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-md hover:bg-[#f8fafc] transition">
                        Back
                      </button>
                      <button
                        onClick={handleConfirmDeleteStep2}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-md hover:bg-[#b91c1c] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {deleting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Confirm Delete"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TransferOrders;

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Trash2, AlertTriangle } from "lucide-react";
import Head from "../components/Head";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";

const StoreOrders = () => {
  const isSidebarOpen = useSidebar();
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  
  // Get user info
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.email || user?._id || user?.id || "";
  const userLocCode = user?.locCode || "";
  const userEmail = user?.email || user?.username || "";
  const adminEmails = ['officerootments@gmail.com'];
  const isAdminEmail = userEmail && adminEmails.some(email => userEmail.toLowerCase() === email.toLowerCase());
  const isAdmin = isAdminEmail || user?.power === "admin";
  const isWarehouseUser = user?.power === "warehouse";
  const isStoreUser = !isAdmin && !isWarehouseUser;
  
  // Fallback locations mapping
  const fallbackLocations = [
    { "locName": "Z-Edapally1", "locCode": "144" },
    { "locName": "Warehouse", "locCode": "858" },
    { "locName": "G-Edappally", "locCode": "702" },
    { "locName": "HEAD OFFICE01", "locCode": "759" },
    { "locName": "SG-Trivandrum", "locCode": "700" },
    { "locName": "Z- Edappal", "locCode": "100" },
    { "locName": "Z.Perinthalmanna", "locCode": "133" },
    { "locName": "Z.Kottakkal", "locCode": "122" },
    { "locName": "G.Kottayam", "locCode": "701" },
    { "locName": "G.Perumbavoor", "locCode": "703" },
    { "locName": "G.Thrissur", "locCode": "704" },
    { "locName": "G.Chavakkad", "locCode": "706" },
    { "locName": "G.Calicut ", "locCode": "712" },
    { "locName": "G.Vadakara", "locCode": "708" },
    { "locName": "G.Edappal", "locCode": "707" },
    { "locName": "G.Perinthalmanna", "locCode": "709" },
    { "locName": "G.Kottakkal", "locCode": "711" },
    { "locName": "G.Manjeri", "locCode": "710" },
    { "locName": "G.Palakkad ", "locCode": "705" },
    { "locName": "G.Kalpetta", "locCode": "717" },
    { "locName": "G.Kannur", "locCode": "716" },
    { "locName": "G.Mg Road", "locCode": "718" },
    { "locName": "Production", "locCode": "101" },
    { "locName": "Office", "locCode": "102" },
    { "locName": "WAREHOUSE", "locCode": "103" }
  ];
  
  // Get location name
  let userLocName = "";
  if (user?.locCode) {
    const location = fallbackLocations.find(loc => loc.locCode === user.locCode || loc.locCode === String(user.locCode));
    if (location) {
      userLocName = location.locName;
    }
  }
  if (!userLocName) {
    userLocName = user?.username || user?.locName || "";
  }
  
  const userWarehouse = mapLocNameToWarehouse(userLocName);
  
  const [storeOrders, setStoreOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [ordersToDelete, setOrdersToDelete] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(new Set());
  
  // Format date
  const formatDate = (date) => {
    if (!date) return "-";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "-";
    }
  };
  
  // Format datetime
  const formatDateTime = (date) => {
    if (!date) return "-";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = d.getHours() >= 12 ? "PM" : "AM";
      const displayHours = d.getHours() % 12 || 12;
      return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`;
    } catch {
      return "-";
    }
  };
  
  // Fetch store orders
  useEffect(() => {
    const fetchStoreOrders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (userId) params.append("userId", userId);
        if (statusFilter !== "all") params.append("status", statusFilter);
        
        // Filter by store warehouse for store users
        if (isStoreUser && userWarehouse) {
          params.append("storeWarehouse", userWarehouse);
        }
        if (user?.power) params.append("userPower", user.power);
        if (user?.locCode) params.append("locCode", user.locCode);
        
        const response = await fetch(`${API_URL}/api/inventory/store-orders?${params}`);
        if (!response.ok) throw new Error("Failed to fetch store orders");
        const data = await response.json();
        let orders = Array.isArray(data) ? data : [];
        
        setStoreOrders(orders);
      } catch (error) {
        console.error("Error fetching store orders:", error);
        setStoreOrders([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStoreOrders();
  }, [API_URL, userId, statusFilter, isStoreUser, userWarehouse, user?.power, user?.locCode]);
  
  // Listen for status changes from other pages (like StoreOrderView)
  useEffect(() => {
    const handleStatusChange = (event) => {
      console.log("📦 Store order status changed event received in StoreOrders list", event.detail);
      
      const { orderId, status } = event.detail;
      
      // Update the order in the list
      setStoreOrders(prevOrders => {
        return prevOrders.map(order => {
          const orderIdStr = (order._id || order.id)?.toString();
          if (orderIdStr === orderId?.toString()) {
            console.log(`🔄 Updating order ${order.orderNumber} status to ${status}`);
            return { ...order, status };
          }
          return order;
        });
      });
    };

    window.addEventListener("storeOrderStatusChanged", handleStatusChange);
    return () => {
      window.removeEventListener("storeOrderStatusChanged", handleStatusChange);
    };
  }, []);
  
  // Filter store orders by search term
  const filteredOrders = storeOrders.filter(order => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (order.orderNumber || "").toLowerCase().includes(searchLower) ||
      (order.reason || "").toLowerCase().includes(searchLower) ||
      (order.storeWarehouse || "").toLowerCase().includes(searchLower)
    );
  });
  
  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { label: "Draft", className: "bg-[#f3f4f6] text-[#4b5563]" },
      pending: { label: "Pending", className: "bg-[#fef3c7] text-[#92400e]" },
      approved: { label: "Approved", className: "bg-[#ecfdf5] text-[#047857]" },
      rejected: { label: "Rejected", className: "bg-[#fee2e2] text-[#991b1b]" },
      transferred: { label: "Transferred", className: "bg-[#dbeafe] text-[#1e40af]" },
    };
    const statusInfo = statusMap[status] || { label: status || "Draft", className: "bg-[#f3f4f6] text-[#6b7280]" };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
        <span className="h-2 w-2 rounded-full bg-current" />
        {statusInfo.label}
      </span>
    );
  };
  
  const draftCount = storeOrders.filter(o => o.status === "draft").length;
  const pendingCount = storeOrders.filter(o => o.status === "pending").length;
  const approvedCount = storeOrders.filter(o => o.status === "approved").length;
  const rejectedCount = storeOrders.filter(o => o.status === "rejected").length;
  const transferredCount = storeOrders.filter(o => o.status === "transferred").length;
  
  // Handle checkbox change
  const handleCheckboxChange = (orderId, isChecked) => {
    const newSelected = new Set(selectedOrders);
    if (isChecked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };
  
  // Handle select all checkbox
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const allIds = filteredOrders.map(order => order._id || order.id).filter(Boolean);
      setSelectedOrders(new Set(allIds));
    } else {
      setSelectedOrders(new Set());
    }
  };
  
  // Handle delete button click
  const handleDeleteClick = () => {
    const selectedIds = Array.from(selectedOrders);
    if (selectedIds.length === 0) return;
    
    const orders = filteredOrders.filter(order => {
      const id = order._id || order.id;
      return id && selectedIds.includes(id);
    });
    
    setOrdersToDelete(orders);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };
  
  // Handle single delete
  const handleSingleDelete = (order) => {
    const orderId = order._id || order.id;
    if (!orderId) return;
    
    setOrdersToDelete([order]);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };
  
  // Confirm delete (step 1)
  const handleConfirmDeleteStep1 = () => {
    setDeleteStep(2);
  };
  
  // Final delete confirmation (step 2)
  const handleConfirmDeleteStep2 = async () => {
    setDeleting(true);
    try {
      const deletePromises = ordersToDelete.map(async (order) => {
        const orderId = order._id || order.id;
        if (!orderId) return;
        
        const response = await fetch(`${API_URL}/api/inventory/store-orders/${orderId}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete store order");
        }
        
        return orderId;
      });

      await Promise.all(deletePromises);
      
      // Remove deleted orders from selected set
      const deletedIds = ordersToDelete.map(order => order._id || order.id).filter(Boolean);
      const newSelected = new Set(selectedOrders);
      deletedIds.forEach(id => newSelected.delete(id));
      setSelectedOrders(newSelected);
      
      // Refresh the list
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      if (isStoreUser && userWarehouse) {
        params.append("storeWarehouse", userWarehouse);
      }
      
      const response = await fetch(`${API_URL}/api/inventory/store-orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStoreOrders(Array.isArray(data) ? data : []);
      }
      
      setShowDeleteModal(false);
      setDeleteStep(1);
      setOrdersToDelete([]);
      alert(`Successfully deleted ${ordersToDelete.length} store order(s)`);
    } catch (error) {
      console.error("Error deleting store orders:", error);
      alert(`Error deleting store orders: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };
  
  // Cancel delete
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setOrdersToDelete([]);
  };
  
  // Handle status change (approve/reject)
  const handleStatusChange = async (orderId, newStatus, rejectionReason = "") => {
    setUpdatingStatus(prev => new Set(prev).add(orderId));
    try {
      const updateData = { status: newStatus };
      if (newStatus === "rejected" && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
      
      const response = await fetch(`${API_URL}/api/inventory/store-orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If there are stock issues, format them nicely
        if (errorData.stockIssues && Array.isArray(errorData.stockIssues)) {
          let errorMessage = errorData.message || "Cannot approve store order: Insufficient stock in Warehouse.\n\n";
          errorMessage += "Details:\n\n";
          errorData.stockIssues.forEach((issue, index) => {
            errorMessage += `${index + 1}. ${issue.itemName}${issue.itemSku && issue.itemSku !== "N/A" ? ` (SKU: ${issue.itemSku})` : ''}\n`;
            errorMessage += `   • Requested: ${issue.requested.toFixed(2)} units\n`;
            errorMessage += `   • Available in Warehouse: ${issue.available.toFixed(2)} units\n`;
            errorMessage += `   • Shortfall: ${issue.shortfall.toFixed(2)} units`;
            if (issue.error) {
              errorMessage += `\n   • Error: ${issue.error}`;
            }
            errorMessage += `\n\n`;
          });
          errorMessage += "Please ensure sufficient stock is available in Warehouse before approving this order.";
          alert(errorMessage);
          throw new Error("Insufficient stock - see details above");
        } else {
          throw new Error(errorData.message || "Failed to update status");
        }
      }

      // Refresh the list
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      if (isStoreUser && userWarehouse) {
        params.append("storeWarehouse", userWarehouse);
      }
      
      const refreshResponse = await fetch(`${API_URL}/api/inventory/store-orders?${params}`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setStoreOrders(Array.isArray(data) ? data : []);
      }
      
      // Dispatch event to notify other pages (like StoreOrderView) that status changed
      console.log("📦 Dispatching storeOrderStatusChanged event", {
        orderId,
        newStatus
      });
      
      window.dispatchEvent(new CustomEvent("storeOrderStatusChanged", {
        detail: {
          orderId,
          status: newStatus,
          source: "store-orders-list"
        }
      }));
      
      // Show success message
      if (newStatus === "approved") {
        alert("Store order approved successfully! Transfer order created and set to 'In Transit'.");
      } else if (newStatus === "rejected") {
        alert("Store order rejected successfully.");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      // Only show error alert if it's not already shown above
      if (!error.message.includes("Insufficient stock - see details above")) {
        alert(`Error updating status: ${error.message}`);
      }
    } finally {
      setUpdatingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };
  
  // Calculate total quantity requested
  const getTotalQuantity = (order) => {
    if (!order.items || !Array.isArray(order.items)) return 0;
    return order.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  };
  
  return (
    <>
      <Header title="Store Orders" />
      <div className={`transition-all duration-300 p-6 bg-[#f8fafc] min-h-screen ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>

        {/* Page Title + Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#1f2937]">Store Orders</h1>
            {!loading && (
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-[#e2e8f0] text-[#475569] rounded-full">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && selectedOrders.size > 0 && (
              <button
                onClick={handleDeleteClick}
                className="inline-flex h-10 items-center gap-2 rounded-none bg-[#dc2626] px-4 text-sm font-semibold text-white transition hover:bg-[#b91c1c] shadow-sm cursor-pointer"
              >
                <Trash2 size={16} />
                <span>Delete ({selectedOrders.size})</span>
              </button>
            )}
            <Link
              to="/inventory/store-orders/new"
              className="inline-flex h-10 items-center gap-2 rounded-none bg-[#9B48D7] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#8637c3]"
            >
              <span className="text-lg leading-none">+</span>
              <span>New</span>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
          <input
            type="text"
            placeholder="Search by order number, reason, or store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 h-10 border border-[#e2e8f0] bg-white text-sm text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#9B48D7] focus:border-transparent transition-all rounded-none"
          />
        </div>

        {/* Table Card */}
        <div className="border border-[#e2e8f0] bg-white overflow-hidden">

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 border-b border-[#e2e8f0] px-5 py-3 bg-white">
            <span className="text-xs font-semibold text-[#374151] mr-2">Order period: <span className="font-normal text-[#6b7280]">All orders</span></span>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => setStatusFilter("draft")}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === "draft"
                    ? "bg-[#18181b] text-white"
                    : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
                }`}
              >
                Draft <span className="ml-1 opacity-80">{draftCount}</span>
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === "pending"
                    ? "bg-[#18181b] text-white"
                    : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
                }`}
              >
                Pending <span className="ml-1 opacity-80">{pendingCount}</span>
              </button>
              <button
                onClick={() => setStatusFilter("approved")}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === "approved"
                    ? "bg-[#18181b] text-white"
                    : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                onClick={() => setStatusFilter("rejected")}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === "rejected"
                    ? "bg-[#18181b] text-white"
                    : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
                }`}
              >
                Rejected ({rejectedCount})
              </button>
              <button
                onClick={() => setStatusFilter("transferred")}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === "transferred"
                    ? "bg-[#18181b] text-white"
                    : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
                }`}
              >
                Transferred ({transferredCount})
              </button>
              {statusFilter !== "all" && (
                <button
                  onClick={() => setStatusFilter("all")}
                  className="px-3 py-1 text-xs font-semibold text-[#9B48D7] hover:bg-[#f3f4f6] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#18181b]">
                    {["", "DATE", "ORDER #", "STORE WAREHOUSE", "REASON", "STATUS", "ITEMS", "TOTAL QTY", "CREATED BY", "CREATED TIME", "LAST MODIFIED"].map((col, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-[#a1a1aa] uppercase border-r border-[#27272a] last:border-r-0 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 11 }).map((_, j) => (
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
                  {searchTerm ? "No store orders found" : "No store orders yet"}
                </p>
                <p className="text-xs text-[#64748b] mb-4">
                  {searchTerm ? "Try adjusting your search" : "Create your first store order to get started"}
                </p>
                {!searchTerm && (
                  <Link
                    to="/inventory/store-orders/new"
                    className="inline-flex items-center gap-2 rounded-none bg-[#9B48D7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8637c3] transition-colors"
                  >
                    + Create Store Order
                  </Link>
                )}
              </div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#18181b]">
                    <th className="px-4 py-3 text-center text-[11px] font-semibold tracking-widest text-[#a1a1aa] uppercase border-r border-[#27272a] w-12">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded-none border-[#52525b] text-[#9B48D7] focus:ring-[#9B48D7] cursor-pointer accent-[#9B48D7]" 
                        checked={filteredOrders.length > 0 && filteredOrders.every(order => {
                          const id = order._id || order.id;
                          return !id || selectedOrders.has(id);
                        })}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    {[
                      "DATE", "ORDER #", "STORE WAREHOUSE", "REASON", 
                      `STATUS${(isAdmin || isWarehouseUser) ? " (Admin)" : ""}`, 
                      "ITEMS", "TOTAL QTY", "CREATED BY", "CREATED TIME", "LAST MODIFIED"
                    ].map((col, i, arr) => (
                      <th key={col} className={`px-4 py-3 ${i === 5 || i === 6 ? 'text-right' : 'text-left'} text-[11px] font-semibold tracking-widest text-[#a1a1aa] uppercase whitespace-nowrap ${i < arr.length - 1 ? 'border-r border-[#27272a]' : ''}`}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order._id || order.id}
                      className="hover:bg-[#faf5ff] transition-colors cursor-pointer group"
                      onClick={() => navigate(`/inventory/store-orders/${order._id || order.id}`)}
                    >
                      <td className="px-4 py-3 text-center border-r border-[#f1f5f9]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 rounded-none border-[#d1d9f2] cursor-pointer accent-[#9B48D7]" 
                            checked={selectedOrders.has(order._id || order.id)}
                            onChange={(e) => handleCheckboxChange(order._id || order.id, e.target.checked)}
                          />
                          {isAdmin && selectedOrders.has(order._id || order.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSingleDelete(order);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="Delete this store order"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#475569] border-r border-[#f1f5f9]">
                        {formatDate(order.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm border-r border-[#f1f5f9]">
                        <span
                          className="font-semibold text-[#9B48D7] group-hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/inventory/store-orders/${order._id || order.id}`);
                          }}
                        >
                          {order.orderNumber || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#475569] border-r border-[#f1f5f9]">
                        {order.storeWarehouse || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#475569] border-r border-[#f1f5f9] max-w-xs truncate">
                        {order.reason || "-"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm border-r border-[#f1f5f9]" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <select
                            value={order.status || "pending"}
                            disabled={updatingStatus.has(order._id || order.id)}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              handleStatusChange(order._id || order.id, newStatus);
                            }}
                            className={`appearance-none cursor-pointer rounded-full px-3 py-1 pr-6 text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-[#9B48D7] transition-all ${
                              order.status === "draft"
                                ? "bg-[#f3f4f6] text-[#4b5563] border-gray-300"
                                : order.status === "approved"
                                ? "bg-[#ecfdf5] text-[#047857] border-emerald-300"
                                : order.status === "rejected"
                                ? "bg-[#fee2e2] text-[#991b1b] border-red-300"
                                : order.status === "transferred"
                                ? "bg-[#dbeafe] text-[#1e40af] border-blue-300"
                                : "bg-[#fef3c7] text-[#92400e] border-amber-300"
                            } ${updatingStatus.has(order._id || order.id) ? "opacity-50 cursor-wait" : ""}`}
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                              backgroundRepeat: "no-repeat",
                              backgroundPosition: "right 6px center",
                              backgroundSize: "12px 12px"
                            }}
                          >
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="transferred">Transferred</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-[#1f2937] border-r border-[#f1f5f9]">
                        {order.items && Array.isArray(order.items) ? order.items.length : 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-[#1f2937] border-r border-[#f1f5f9]">
                        {getTotalQuantity(order).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#475569] border-r border-[#f1f5f9]">
                        {order.createdBy || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#64748b] border-r border-[#f1f5f9]">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#64748b]">
                        {formatDateTime(order.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 2-Step Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                {deleteStep === 1 ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="text-red-600" size={20} />
                      </div>
                      <h3 className="text-lg font-semibold text-[#1e293b]">
                        Delete {ordersToDelete.length === 1 ? 'Store Order' : `${ordersToDelete.length} Store Orders`}?
                      </h3>
                    </div>
                    <p className="text-sm text-[#64748b] mb-6">
                      Are you sure you want to delete {ordersToDelete.length === 1 ? 'this store order' : `these ${ordersToDelete.length} store orders`}? 
                      {ordersToDelete.some(order => order.status === 'approved' || order.status === 'transferred') && (
                        <span className="block mt-2 text-red-600 font-medium">
                          ⚠️ Some orders are already approved or transferred. This action cannot be undone.
                        </span>
                      )}
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={handleCancelDelete}
                        className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-none hover:bg-[#f8fafc] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDeleteStep1}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-none hover:bg-[#b91c1c] transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="text-red-600" size={20} />
                      </div>
                      <h3 className="text-lg font-semibold text-[#1e293b]">
                        Final Confirmation
                      </h3>
                    </div>
                    <p className="text-sm text-[#64748b] mb-4">
                      This action cannot be undone. Are you absolutely sure you want to delete {ordersToDelete.length === 1 ? 'this store order' : `these ${ordersToDelete.length} store orders`}?
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={handleCancelDelete}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-none hover:bg-[#f8fafc] transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDeleteStep2}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-none hover:bg-[#b91c1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting ? "Deleting..." : "Delete Permanently"}
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

export default StoreOrders;

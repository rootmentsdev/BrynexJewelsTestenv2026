import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Plus, Trash2, AlertTriangle } from "lucide-react";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";
import Select from "react-select";

const InventoryAdjustments = () => {
  const isSidebarOpen = useSidebar();
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  
  // Get user info
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.email || user?._id || user?.id || "";
  const isAdmin = user?.power === "admin";
  
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
  
  // Get location name - prioritize locCode lookup over username
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
  
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "All",
    status: "All",
    period: "All",
  });
  const [selectedAdjustments, setSelectedAdjustments] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1 = first confirmation, 2 = second confirmation
  const [deleting, setDeleting] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState([]);
  
  // Helper function to map locName to warehouse name
  // Use the shared warehouse mapping utility
  const mapLocNameToWarehouse = (locName) => {
    if (!locName) return "";
    return mapWarehouse(locName);
  };
  
  // Get user's warehouse name
  const userWarehouse = mapLocNameToWarehouse(userLocName);
  
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
  
  // Fetch adjustments
  useEffect(() => {
    const fetchAdjustments = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (userId) params.append("userId", userId);
        if (filters.type !== "All") params.append("adjustmentType", filters.type.toLowerCase());
        if (filters.status !== "All") params.append("status", filters.status.toLowerCase());
        
        // For non-admin users AND admins viewing specific store, filter by warehouse in the backend
        if (userWarehouse) {
          params.append("warehouse", userWarehouse);
          console.log(`🔍 Inventory Adjustments: Filtering by warehouse: "${userWarehouse}"`);
        }
        if (user?.power) params.append("userPower", user.power);
        if (user?.locCode) params.append("locCode", user.locCode);
        
        const fullUrl = `${API_URL}/api/inventory/adjustments?${params}`;
        console.log(`📡 Inventory Adjustments: Fetching from: ${fullUrl}`);
        
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error("Failed to fetch adjustments");
        const data = await response.json();
        let adjustmentsList = Array.isArray(data) ? data : [];
        
        // Additional client-side filtering as backup (in case backend doesn't filter)
        if (!isAdmin && userWarehouse) {
          const beforeFilter = adjustmentsList.length;
          const userWarehouseLower = userWarehouse.toLowerCase();
          adjustmentsList = adjustmentsList.filter(adj => {
            const adjWarehouse = (adj.warehouse || "").toLowerCase();
            const adjBase = adjWarehouse.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
            const userBase = userWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
            
            return adjWarehouse === userWarehouseLower || 
                   adjBase === userBase ||
                   adjWarehouse.includes(userWarehouseLower) ||
                   userWarehouseLower.includes(adjWarehouse);
          });
          console.log(`✅ Inventory Adjustments: Filtered to ${adjustmentsList.length} adjustments (from ${beforeFilter}) for warehouse: "${userWarehouse}"`);
        }
        
        setAdjustments(adjustmentsList);
      } catch (error) {
        console.error("Error fetching adjustments:", error);
        setAdjustments([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdjustments();
  }, [API_URL, userId, filters.type, filters.status, isAdmin, userWarehouse]);
  
  // Helper function to check if date is in period
  const isDateInPeriod = (date, period) => {
    if (!date || period === "All") return true;
    
    try {
      const adjustmentDate = new Date(date);
      if (isNaN(adjustmentDate.getTime())) return true; // If date is invalid, include it
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDay = now.getDate();
      
      const adjYear = adjustmentDate.getFullYear();
      const adjMonth = adjustmentDate.getMonth();
      
      switch (period) {
        case "This Month":
          return adjYear === currentYear && adjMonth === currentMonth;
        case "Last Month":
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return adjYear === lastMonthYear && adjMonth === lastMonth;
        case "This Year":
          return adjYear === currentYear;
        default:
          return true;
      }
    } catch {
      return true; // If error parsing date, include it
    }
  };

  // Filter adjustments by search term and period
  const filteredAdjustments = adjustments.filter(adjustment => {
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const adjustmentId = adjustment.id || adjustment._id || "";
      const matchesSearch = (
        (adjustment.referenceNumber || "").toLowerCase().includes(searchLower) ||
        (adjustment.reason || "").toLowerCase().includes(searchLower) ||
        (adjustment.description || "").toLowerCase().includes(searchLower) ||
        (adjustment.warehouse || "").toLowerCase().includes(searchLower) ||
        String(adjustmentId).toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }
    
    // Filter by period
    if (filters.period !== "All") {
      const adjustmentDate = adjustment.date || adjustment.createdAt;
      if (!isDateInPeriod(adjustmentDate, filters.period)) {
        return false;
      }
    }
    
    // Filter by type (client-side backup, though backend should handle this)
    if (filters.type !== "All") {
      const adjustmentType = (adjustment.adjustmentType || "").toLowerCase();
      const filterType = filters.type.toLowerCase();
      if (adjustmentType !== filterType) {
        return false;
      }
    }
    
    // Filter by status (client-side backup, though backend should handle this)
    if (filters.status !== "All") {
      const adjustmentStatus = (adjustment.status || "").toLowerCase();
      const filterStatus = filters.status.toLowerCase();
      if (adjustmentStatus !== filterStatus) {
        return false;
      }
    }
    
    return true;
  });

  // Handle adjustment click - navigate to detail page
  const handleAdjustmentClick = (adjustment) => {
    const adjustmentId = adjustment.id || adjustment._id;
    if (adjustmentId) {
      navigate(`/inventory/adjustments/${adjustmentId}`);
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (adjustmentId, isChecked) => {
    const newSelected = new Set(selectedAdjustments);
    if (isChecked) {
      newSelected.add(adjustmentId);
    } else {
      newSelected.delete(adjustmentId);
    }
    setSelectedAdjustments(newSelected);
  };

  // Handle select all checkbox
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const allIds = filteredAdjustments.map(adj => adj.id || adj._id).filter(Boolean);
      setSelectedAdjustments(new Set(allIds));
    } else {
      setSelectedAdjustments(new Set());
    }
  };

  // Handle delete button click
  const handleDeleteClick = () => {
    const selectedIds = Array.from(selectedAdjustments);
    if (selectedIds.length === 0) return;
    
    const items = filteredAdjustments.filter(adj => {
      const id = adj.id || adj._id;
      return selectedIds.includes(id);
    });
    
    setItemsToDelete(items);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };

  // Handle single delete from checkbox
  const handleSingleDelete = (adjustment) => {
    const adjustmentId = adjustment.id || adjustment._id;
    if (!adjustmentId) return;
    
    setItemsToDelete([adjustment]);
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
      const deletePromises = itemsToDelete.map(async (adjustment) => {
        const adjustmentId = adjustment.id || adjustment._id;
        if (!adjustmentId) return;
        
        const response = await fetch(`${API_URL}/api/inventory/adjustments/${adjustmentId}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete adjustment");
        }
        
        return adjustmentId;
      });

      await Promise.all(deletePromises);
      
      // Remove deleted items from selected set
      const deletedIds = itemsToDelete.map(adj => adj.id || adj._id).filter(Boolean);
      const newSelected = new Set(selectedAdjustments);
      deletedIds.forEach(id => newSelected.delete(id));
      setSelectedAdjustments(newSelected);
      
      // Refresh the list
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (filters.type !== "All") params.append("adjustmentType", filters.type.toLowerCase());
      if (filters.status !== "All") params.append("status", filters.status.toLowerCase());
      
      if (!isAdmin && userWarehouse) {
        params.append("warehouse", userWarehouse);
      }
      
      const response = await fetch(`${API_URL}/api/inventory/adjustments?${params}`);
      if (response.ok) {
        const data = await response.json();
        let adjustmentsList = Array.isArray(data) ? data : [];
        
        if (!isAdmin && userWarehouse) {
          const userWarehouseLower = userWarehouse.toLowerCase();
          adjustmentsList = adjustmentsList.filter(adj => {
            const adjWarehouse = (adj.warehouse || "").toLowerCase();
            const adjBase = adjWarehouse.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
            const userBase = userWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
            
            return adjWarehouse === userWarehouseLower || 
                   adjBase === userBase ||
                   adjWarehouse.includes(userWarehouseLower) ||
                   userWarehouseLower.includes(adjWarehouse);
          });
        }
        
        setAdjustments(adjustmentsList);
      }
      
      setShowDeleteModal(false);
      setDeleteStep(1);
      setItemsToDelete([]);
      alert(`Successfully deleted ${itemsToDelete.length} adjustment(s)`);
    } catch (error) {
      console.error("Error deleting adjustments:", error);
      alert(`Error deleting adjustments: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setItemsToDelete([]);
  };

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '40px',
      height: '40px',
      border: state.isFocused ? '1px solid #9B48D7' : '1px solid #E5E7EB',
      borderRadius: '0px',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(155,72,215,0.15)' : 'none',
      fontSize: '0.875rem',
      backgroundColor: 'white',
      transition: 'all 0.15s ease',
      cursor: 'pointer',
      '&:hover': { border: '1px solid #cbd5e1' }
    }),
    valueContainer: base => ({ ...base, height: '40px', padding: '0 12px' }),
    input: base => ({ ...base, margin: '0px', padding: '0px' }),
    indicatorSeparator: base => ({ ...base, display: 'none' }),
    dropdownIndicator: (base, state) => ({
      ...base,
      padding: '0 12px',
      transition: 'transform 0.2s ease',
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      color: '#6b7280'
    }),
    singleValue: base => ({
      ...base,
      color: '#1f2937'
    }),
    menu: base => ({
      ...base,
      zIndex: 9999,
      borderRadius: '0px',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
      marginTop: '2px',
      backgroundColor: 'white',
      overflow: 'hidden'
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.875rem',
      cursor: 'pointer',
      backgroundColor: state.isSelected ? '#9B48D7' : state.isFocused ? '#f5f3ff' : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
      padding: '10px 12px',
      '&:active': { backgroundColor: '#9B48D7', color: 'white' }
    })
  };

  return (
    <>
      <Header title="Inventory Adjustments" />
      <div className={`transition-all duration-300 min-h-screen bg-[#F9FAFB] flex flex-col ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        
        {/* ── Top Header Bar ── */}
        <div className="px-6 pt-5 pb-4 border-b border-[#E5E7EB] bg-white">
          <div className="flex flex-wrap items-center justify-end gap-4">
            <div className="flex items-center gap-2.5">
              {selectedAdjustments.size > 0 && (
                <button
                  onClick={handleDeleteClick}
                  className="inline-flex h-9 items-center gap-2 rounded-none border border-[#dc2626] bg-[#fef2f2] hover:bg-[#fee2e2] px-3.5 text-xs font-semibold text-[#dc2626] shadow-sm transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete ({selectedAdjustments.size})</span>
                </button>
              )}
              <Link
                to="/inventory/adjustments/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={15} className="text-white" />
                <span>New Adjustment</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Controls Row: Search, Filters, Badges ── */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Box & Filters */}
            <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={14} className="text-[#9CA3AF]" />
                </div>
                <input
                  type="text"
                  placeholder="Search by reference number, reason, description, or warehouse..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-none border border-[#E5E7EB] bg-white text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#8B5CF6] focus:outline-none transition-colors"
                />
              </div>

              <Select
                value={{ value: filters.type, label: filters.type === 'All' ? 'Type: All' : filters.type }}
                onChange={(opt) => setFilters({ ...filters, type: opt.value })}
                options={[
                  { value: "All", label: "Type: All" },
                  { value: "Quantity", label: "Quantity" },
                  { value: "Value", label: "Value" }
                ]}
                styles={customSelectStyles}
                isSearchable={false}
              />
              <Select
                value={{ value: filters.status, label: filters.status === 'All' ? 'Status: All' : filters.status }}
                onChange={(opt) => setFilters({ ...filters, status: opt.value })}
                options={[
                  { value: "All", label: "Status: All" },
                  { value: "Draft", label: "Draft" },
                  { value: "Adjusted", label: "Adjusted" }
                ]}
                styles={customSelectStyles}
                isSearchable={false}
              />
              <Select
                value={{ value: filters.period, label: filters.period === 'All' ? 'Period: All' : filters.period }}
                onChange={(opt) => setFilters({ ...filters, period: opt.value })}
                options={[
                  { value: "All", label: "Period: All" },
                  { value: "This Month", label: "This Month" },
                  { value: "Last Month", label: "Last Month" },
                  { value: "This Year", label: "This Year" }
                ]}
                styles={customSelectStyles}
                isSearchable={false}
              />
            </div>

            {/* Badges / Metrics */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-none bg-[#F5F3FF] border border-[#DDD6FE] px-3 py-1 text-xs font-bold text-[#7C3AED]">
                Total: {filteredAdjustments.length} {filteredAdjustments.length === 1 ? 'Adjustment' : 'Adjustments'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Main Table Card ── */}
        <div className="px-6 pb-8 pt-2">
          <section className="rounded-none border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="px-8 py-16 text-center flex flex-col items-center justify-center">
                  <div className="inline-block animate-spin h-6 w-6 border-2 border-[#8B5CF6] border-t-transparent mb-2" />
                  <p className="text-xs font-medium text-[#6B7280]">Loading adjustments...</p>
                </div>
              ) : filteredAdjustments.length === 0 ? (
                <div className="px-8 py-16 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-none bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center mb-3">
                    <Search className="text-[#8B5CF6]" size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide mb-1">
                    {searchTerm ? "No adjustments found" : "No adjustments yet"}
                  </h3>
                  <p className="text-xs text-[#6B7280] max-w-sm mb-4">
                    {searchTerm ? "Try adjusting your search or filters" : "Create your first inventory adjustment to get started"}
                  </p>
                  {!searchTerm && (
                    <Link
                      to="/inventory/adjustments/new"
                      className="inline-flex items-center gap-2 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus size={14} className="text-white" />
                      Create Adjustment
                    </Link>
                  )}
                </div>
              ) : (
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#1e1e1e] text-white text-xs uppercase tracking-wide font-bold">
                      <th className="w-10 px-3 py-3 text-center border-r border-[#333333] whitespace-nowrap">
                        <input 
                          type="checkbox" 
                          className="h-3.5 w-3.5 rounded-none border-gray-600 bg-[#2d2d2d] accent-[#8B5CF6] cursor-pointer" 
                          checked={filteredAdjustments.length > 0 && filteredAdjustments.every(adj => {
                            const id = adj.id || adj._id;
                            return id && selectedAdjustments.has(id);
                          })}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">Date</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">Reference Number</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">Reason</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">Type</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">Status</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">Warehouse</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">Created By</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">Created Time</th>
                      <th className="px-3 py-3 text-left whitespace-nowrap">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6] text-xs text-[#1F2937]">
                    {filteredAdjustments.map((adjustment, index) => {
                      const adjustmentId = adjustment.id || adjustment._id;
                      if (!adjustmentId) return null;
                      return (
                        <tr
                          key={adjustmentId}
                          className={`${index % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]/40"} hover:bg-purple-50/25 transition-colors cursor-pointer group`}
                          onClick={() => handleAdjustmentClick(adjustment)}
                        >
                          <td className="px-3 py-2.5 text-center border-r border-[#E5E7EB]" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <input 
                                type="checkbox" 
                                className="h-3.5 w-3.5 rounded-none border-[#D1D5DB] accent-[#8B5CF6] cursor-pointer" 
                                checked={selectedAdjustments.has(adjustmentId)}
                                onChange={(e) => handleCheckboxChange(adjustmentId, e.target.checked)}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-[#4B5563] border-r border-[#E5E7EB]">
                            {formatDate(adjustment.date)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-semibold border-r border-[#E5E7EB]">
                            <span
                              className="text-[#8B5CF6] hover:text-[#7C3AED] hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdjustmentClick(adjustment);
                              }}
                            >
                              {adjustment.referenceNumber || (adjustmentId && String(adjustmentId).slice(-8)) || "-"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-[#111827] font-medium border-r border-[#E5E7EB]">
                            {adjustment.reason || "-"}
                          </td>
                          <td className="px-3 py-2.5 text-[#4B5563] border-r border-[#E5E7EB]">
                            <span className="inline-flex items-center rounded-none bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                              {adjustment.adjustmentType === "quantity" ? "QUANTITY" : "VALUE"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 border-r border-[#E5E7EB]">
                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none ${
                              adjustment.status === "adjusted"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}>
                              {adjustment.status === "adjusted" ? "ADJUSTED" : "DRAFT"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-[#4B5563] border-r border-[#E5E7EB]">
                            {adjustment.warehouse || "-"}
                          </td>
                          <td className="px-3 py-2.5 text-[#4B5563] border-r border-[#E5E7EB]">
                            {adjustment.createdBy || "-"}
                          </td>
                          <td className="px-3 py-2.5 text-[#6B7280] border-r border-[#E5E7EB]">
                            {formatDateTime(adjustment.createdAt)}
                          </td>
                          <td className="px-3 py-2.5 text-[#4B5563] max-w-xs truncate">
                            {adjustment.description || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

      {/* 2-Step Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-none shadow-xl max-w-md w-full mx-4 border border-[#E5E7EB]">
            <div className="p-6">
              {deleteStep === 1 ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-none bg-red-100 flex items-center justify-center border border-red-200">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-[#111827] uppercase">
                      Delete {itemsToDelete.length === 1 ? 'Adjustment' : `${itemsToDelete.length} Adjustments`}?
                    </h3>
                  </div>
                  <p className="text-xs text-[#6B7280] mb-6 font-medium">
                    Are you sure you want to delete {itemsToDelete.length === 1 ? 'this adjustment' : `these ${itemsToDelete.length} adjustments`}? 
                    {itemsToDelete.some(item => item.status === 'adjusted') && (
                      <span className="block mt-2 text-red-600 font-bold">
                        ⚠️ Some adjustments are already applied. Stock will be reversed before deletion.
                      </span>
                    )}
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={handleCancelDelete}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6B7280] bg-[#EEEEEE] border border-[#E5E7EB] rounded-none hover:bg-[#E2E2E2] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDeleteStep1}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#dc2626] rounded-none hover:bg-[#b91c1c] transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-none bg-red-100 flex items-center justify-center border border-red-200">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-[#111827] uppercase">
                      Final Confirmation
                    </h3>
                  </div>
                  <p className="text-xs text-[#6B7280] mb-4 font-medium">
                    This action cannot be undone. Are you absolutely sure you want to delete {itemsToDelete.length === 1 ? 'this adjustment' : `these ${itemsToDelete.length} adjustments`}?
                  </p>
                  {itemsToDelete.length > 0 && (
                    <div className="mb-4 p-3 bg-[#F9FAFB] rounded-none max-h-40 overflow-y-auto border border-[#E5E7EB]">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">Items to be deleted:</p>
                      <ul className="text-xs text-[#4B5563] space-y-1">
                        {itemsToDelete.map((item, idx) => (
                          <li key={item.id || item._id || idx} className="font-medium">
                            • {item.referenceNumber || `Ref-${String(item.id || item._id).slice(-8)}`} - {item.reason || 'No reason'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setDeleteStep(1)}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6B7280] bg-[#EEEEEE] border border-[#E5E7EB] rounded-none hover:bg-[#E2E2E2] transition-colors"
                      disabled={deleting}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmDeleteStep2}
                      disabled={deleting}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#dc2626] rounded-none hover:bg-[#b91c1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {deleting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          DELETING...
                        </>
                      ) : (
                        'CONFIRM DELETE'
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

export default InventoryAdjustments;

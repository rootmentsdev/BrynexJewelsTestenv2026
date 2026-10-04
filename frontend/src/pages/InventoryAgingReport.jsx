import React, { useEffect, useMemo, useState } from "react";
import Headers from "../components/Header.jsx";
import Select from "react-select";
import baseUrl from "../api/api.js";
import { CSVLink } from "react-csv";
import { Helmet } from "react-helmet";
import { FiDownload } from "react-icons/fi";
import { Loader2, Printer, Clock, Package, AlertTriangle, Layers, Search, RefreshCw } from "lucide-react";
import { useSidebar } from "../hooks/useSidebar.js";

// Helper to format currency
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  const num = Number(amount);
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Custom React-Select styles for clean modern UI
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "#ffffff",
    borderColor: state.isFocused ? "#9333ea" : "#d1d5db",
    borderRadius: "0.5rem",
    padding: "1px 2px",
    minHeight: "40px",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(147, 51, 234, 0.2)" : "none",
    "&:hover": {
      borderColor: "#9ca3af",
    },
    fontSize: "0.875rem",
    color: "#1f2937",
    cursor: "pointer",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "#9333ea"
      : state.isFocused
      ? "#f3e8ff"
      : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#374151",
    fontSize: "0.875rem",
    cursor: "pointer",
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: "0.5rem",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    zIndex: 50,
  }),
};

const storeOptions = [
  { value: "All Stores", label: "All Stores (Warehouse & MG Road)" },
  { value: "Warehouse", label: "Warehouse" },
  { value: "MG Road", label: "MG Road" },
];

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "shirt", label: "Shirt Sales" },
  { value: "shoe", label: "Shoe Sales" },
  { value: "other", label: "Other Goods" },
];

const bracketOptions = [
  { value: "all", label: "All Age Brackets" },
  { value: "0_30", label: "0 - 30 Days (Fresh Stock)" },
  { value: "31_60", label: "31 - 60 Days (Normal)" },
  { value: "61_90", label: "61 - 90 Days (Slow Moving)" },
  { value: "91_120", label: "91 - 120 Days (Attention)" },
  { value: "120_plus", label: "120+ Days (Stagnant Stock)" },
];

const InventoryAgingReport = () => {
  const isSidebarOpen = useSidebar();
  const [selectedStore, setSelectedStore] = useState("All Stores");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBracket, setSelectedBracket] = useState("all");
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("age_desc"); // age_desc, age_asc, stock_desc, value_desc
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hideZeroStock, setHideZeroStock] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState("50");

  const currentUser = JSON.parse(localStorage.getItem("rootfinuser") || "{}");
  const isAdmin = (currentUser?.power || "").toLowerCase() === "admin";
  const isClusterManager = (currentUser?.role || "").toLowerCase() === "cluster_manager";
  const clusterAllowedLocCodes = currentUser?.allowedLocCodes || [];
  const adminEmails = ["officerootments@gmail.com", "brynex@gmail.com"];
  const isMainAdmin =
    isAdmin ||
    adminEmails.some((email) => (currentUser?.email || "").toLowerCase() === email.toLowerCase()) ||
    ["858", "103"].includes(currentUser?.locCode);
  const canChooseStore = isMainAdmin || isClusterManager;

  useEffect(() => {
    if (!canChooseStore && currentUser?.locCode) {
      if (currentUser?.locCode === "718") {
        setSelectedStore("MG Road");
      } else {
        setSelectedStore("Warehouse");
      }
    }
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setHasFetched(true);
    try {
      const warehouseParam = selectedStore || "All Stores";

      const params = new URLSearchParams({
        warehouse: warehouseParam,
        locCode: currentUser?.locCode || "",
        userId: currentUser?.email || currentUser?._id || "",
        category: selectedCategory,
        bracket: selectedBracket,
        asOfDate: asOfDate,
      });

      if (isClusterManager && clusterAllowedLocCodes.length > 0) {
        params.append("allowedLocCodes", clusterAllowedLocCodes.join(","));
      }

      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const response = await fetch(`${API_URL}/api/reports/inventory/aging?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch inventory aging report");
      const result = await response.json();

      if (result.success && result.data) {
        let items = result.data.items || [];
        let brackets = result.data.brackets || null;
        let summary = result.data.summary || null;

        // Resilient fallback for legacy backend data format { summary, aging: [{ bucket, items: [...] }] }
        if ((!items || items.length === 0) && Array.isArray(result.data.aging)) {
          items = [];
          result.data.aging.forEach((bGroup) => {
            (bGroup.items || []).forEach((it) => {
              const qty = parseFloat(it.quantity ?? it.stockOnHand ?? 0) || 0;
              const val = parseFloat(it.value ?? it.stockValue ?? 0) || 0;
              const unitCost = parseFloat(it.costPrice ?? (qty > 0 ? val / qty : 0)) || 0;
              const daysOld = parseInt(it.daysOld ?? it.ageInDays ?? 0, 10) || 0;

              let bracketKey = "0_30";
              let bracketLabel = "0 - 30 Days";
              if (daysOld <= 30) {
                bracketKey = "0_30";
                bracketLabel = "0 - 30 Days";
              } else if (daysOld <= 60) {
                bracketKey = "31_60";
                bracketLabel = "31 - 60 Days";
              } else if (daysOld <= 90) {
                bracketKey = "61_90";
                bracketLabel = "61 - 90 Days";
              } else if (daysOld <= 120) {
                bracketKey = "91_120";
                bracketLabel = "91 - 120 Days";
              } else {
                bracketKey = "120_plus";
                bracketLabel = "120+ Days";
              }

              items.push({
                itemId: it._id || it.sku || it.itemName,
                itemName: it.itemName || "Unnamed Item",
                sku: it.sku || "N/A",
                size: it.size || "-",
                category: it.category || "other",
                warehouse: selectedStore || "Warehouse",
                stockOnHand: qty,
                costPrice: unitCost,
                stockValue: val > 0 ? val : qty * unitCost,
                inwardDate: it.inwardDate || "-",
                inwardSource: it.inwardSource || "Initial Stock",
                ageInDays: daysOld,
                ageBracket: bracketKey,
                bracketLabel: bracketLabel,
              });
            });
          });
        }

        // Compute summary fallback if missing
        if (!summary) {
          const totalStock = items.reduce((s, i) => s + (i.stockOnHand || 0), 0);
          const totalVal = items.reduce((s, i) => s + (i.stockValue || 0), 0);
          summary = {
            totalItems: items.length,
            totalStock: totalStock,
            totalValue: totalVal,
            averageAgeDays: totalStock > 0 ? Math.round(items.reduce((s, i) => s + (i.ageInDays * i.stockOnHand), 0) / totalStock) : 0,
            criticalAgedValue: items.filter(i => i.ageInDays > 90).reduce((s, i) => s + i.stockValue, 0),
            criticalAgedStock: items.filter(i => i.ageInDays > 90).reduce((s, i) => s + i.stockOnHand, 0),
            warehouse: selectedStore || "All Stores",
          };
        }

        setReportData({
          summary,
          brackets,
          items,
        });
      } else {
        setReportData(null);
      }
    } catch (error) {
      console.error("Error fetching inventory aging report:", error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedStore, selectedCategory, selectedBracket, asOfDate]);

  // Filter and sort items client-side for immediate responsiveness
  const processedItems = useMemo(() => {
    if (!reportData?.items) return [];
    let list = [...reportData.items];

    // Filter zero stock if toggle enabled
    if (hideZeroStock) {
      list = list.filter((item) => (item.stockOnHand || 0) > 0);
    }

    // Search query filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.itemName?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q) ||
          item.groupName?.toLowerCase().includes(q) ||
          item.warehouse?.toLowerCase().includes(q) ||
          item.inwardSource?.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "age_desc") return (b.ageInDays || 0) - (a.ageInDays || 0);
      if (sortBy === "age_asc") return (a.ageInDays || 0) - (b.ageInDays || 0);
      if (sortBy === "stock_desc") return (b.stockOnHand || 0) - (a.stockOnHand || 0);
      if (sortBy === "value_desc") return (b.stockValue || 0) - (a.stockValue || 0);
      if (sortBy === "name_asc") return (a.itemName || "").localeCompare(b.itemName || "");
      return 0;
    });

    return list;
  }, [reportData, searchQuery, sortBy]);

  // Pagination
  const paginatedItems = useMemo(() => {
    if (itemsPerPage === "all") return processedItems;
    const perPage = parseInt(itemsPerPage, 10);
    const start = (currentPage - 1) * perPage;
    return processedItems.slice(start, start + perPage);
  }, [processedItems, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === "all") return 1;
    return Math.ceil(processedItems.length / parseInt(itemsPerPage, 10)) || 1;
  }, [processedItems, itemsPerPage]);

  // CSV Data preparation
  const csvData = useMemo(() => {
    if (!processedItems || processedItems.length === 0) return [];
    return processedItems.map((item, index) => ({
      "Sl No": index + 1,
      "Item Name": item.itemName || "",
      "Group Name": item.groupName || "-",
      "SKU": item.sku || "",
      "Size": item.size || "-",
      "Category": item.category || "",
      "Warehouse": item.warehouse || "",
      "Stock On Hand (pcs)": item.stockOnHand || 0,
      "Cost Price (₹)": item.costPrice || 0,
      "Stock Valuation (₹)": item.stockValue || 0,
      "Inward Date": item.inwardDate || "",
      "Inward Source": item.inwardSource || "",
      "Age (Days)": item.ageInDays || 0,
      "Age Bracket": item.bracketLabel || "",
    }));
  }, [processedItems]);

  const summary = reportData?.summary;
  const brackets = reportData?.brackets;

  return (
    <>
      <Helmet>
        <title>Inventory Aging Report | RootFin</title>
      </Helmet>
      <Headers title={"Inventory Aging Report"} />

      <div className={`transition-all duration-300 p-6 bg-[#f8fafc] min-h-screen ${isSidebarOpen ? "ml-64" : "ml-0"}`}>
        
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1f2937] flex items-center gap-2.5">
              <Clock className="text-[#9333ea]" size={26} />
              <span>Inventory Aging Report</span>
            </h1>
            <p className="text-sm text-[#64748b] mt-0.5">
              Track how long products remain in stock based on inward dates from Bills, Transfers, and Receives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {csvData.length > 0 && (
              <CSVLink
                data={csvData}
                filename={`inventory-aging-report-${asOfDate}.csv`}
                className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5f5] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-xs hover:bg-[#f8fafc] transition"
              >
                <FiDownload size={15} className="text-[#9333ea]" />
                <span>Export CSV</span>
              </CSVLink>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5f5] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-xs hover:bg-[#f8fafc] transition"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#9333ea] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#7e22ce] transition disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-xs mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Store / Warehouse */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5">
                Store / Warehouse
              </label>
              <Select
                options={storeOptions}
                styles={customSelectStyles}
                value={storeOptions.find((opt) => opt.value === selectedStore)}
                onChange={(option) => setSelectedStore(option ? option.value : "All Stores")}
                isDisabled={!canChooseStore}
                placeholder="Select Warehouse..."
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5">
                Category
              </label>
              <Select
                options={categoryOptions}
                styles={customSelectStyles}
                value={categoryOptions.find((opt) => opt.value === selectedCategory)}
                onChange={(option) => setSelectedCategory(option ? option.value : "all")}
                placeholder="Select Category..."
              />
            </div>

            {/* As-Of Evaluation Date */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5">
                Evaluation Date (As Of)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-[#d1d5db] rounded-lg text-sm text-[#1f2937] focus:outline-none focus:border-[#9333ea] focus:ring-1 focus:ring-[#9333ea]"
                />
              </div>
            </div>

            {/* Age Bracket Filter */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5">
                Age Bracket
              </label>
              <Select
                options={bracketOptions}
                styles={customSelectStyles}
                value={bracketOptions.find((opt) => opt.value === selectedBracket)}
                onChange={(option) => setSelectedBracket(option ? option.value : "all")}
                placeholder="Filter by Age..."
              />
            </div>
          </div>
        </div>

        {/* Top KPI Metrics Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Total Stock Items</span>
                <div className="w-8 h-8 rounded-lg bg-[#f3e8ff] text-[#9333ea] flex items-center justify-center">
                  <Package size={17} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#101828]">{(summary.totalStock || 0).toLocaleString()}</span>
                <span className="text-xs text-[#64748b]">pcs ({summary.totalItems || 0} items)</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Inventory Valuation</span>
                <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
                  <Layers size={17} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#059669]">{formatCurrency(summary.totalValue)}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Average Stock Age</span>
                <div className="w-8 h-8 rounded-lg bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
                  <Clock size={17} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#2563eb]">{summary.averageAgeDays || 0}</span>
                <span className="text-xs text-[#64748b]">days on hand</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Aged Stock (&gt;90 Days)</span>
                <div className="w-8 h-8 rounded-lg bg-[#fef2f2] text-[#ef4444] flex items-center justify-center">
                  <AlertTriangle size={17} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#ef4444]">{formatCurrency(summary.criticalAgedValue)}</span>
                <span className="text-xs text-[#64748b]">({summary.criticalAgedStock} pcs)</span>
              </div>
            </div>
          </div>
        )}

        {/* Age Brackets Interactive Breakdown Grid */}
        {brackets && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {Object.values(brackets).map((b) => {
              const isSelected = selectedBracket === b.bracket;
              return (
                <button
                  key={b.bracket}
                  onClick={() => setSelectedBracket(selectedBracket === b.bracket ? "all" : b.bracket)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#faf5ff] border-[#9333ea] shadow-sm ring-2 ring-[#9333ea]/20"
                      : "bg-white border-[#e2e8f0] hover:border-[#cbd5e1] hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#374151]">{b.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.badgeBg}`}>
                      {b.count} items
                    </span>
                  </div>
                  <div className="text-base font-bold text-[#111827]">{formatCurrency(b.value)}</div>
                  <div className="text-[11px] text-[#64748b] mt-0.5">{b.stock.toLocaleString()} units</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Search & Sort Table Toolbar */}
        <div className="bg-white rounded-t-xl border border-[#e2e8f0] border-b-0 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by item name, SKU, group, warehouse..."
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-[#d1d5db] text-xs text-[#1f2937] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#9333ea] focus:ring-1 focus:ring-[#9333ea]"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#475569] cursor-pointer select-none bg-[#f8fafc] px-3 py-1.5 rounded-lg border border-[#e2e8f0] hover:bg-[#f1f5f9]">
              <input
                type="checkbox"
                checked={hideZeroStock}
                onChange={(e) => {
                  setHideZeroStock(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-3.5 h-3.5 text-[#9333ea] rounded border-gray-300 focus:ring-[#9333ea]"
              />
              <span>In-Stock Only</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#64748b]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 px-3 rounded-lg border border-[#d1d5db] text-xs font-medium text-[#374151] bg-white focus:outline-none focus:border-[#9333ea] cursor-pointer"
              >
                <option value="age_desc">Oldest Stock (Highest Age)</option>
                <option value="age_asc">Newest Stock (Lowest Age)</option>
                <option value="value_desc">Highest Valuation</option>
                <option value="stock_desc">Highest Quantity</option>
                <option value="name_asc">Item Name (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#64748b]">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-2.5 rounded-lg border border-[#d1d5db] text-xs font-medium text-[#374151] bg-white focus:outline-none focus:border-[#9333ea] cursor-pointer"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Detailed Items Aging Table */}
        <div className="bg-white rounded-b-xl border border-[#e2e8f0] shadow-xs overflow-hidden mb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#64748b]">
              <Loader2 size={32} className="animate-spin text-[#9333ea] mb-3" />
              <p className="text-sm font-medium">Calculating stock age across transactions...</p>
            </div>
          ) : processedItems.length === 0 ? (
            <div className="py-16 text-center text-[#64748b]">
              <Package size={40} className="mx-auto text-[#cbd5e1] mb-2" />
              <p className="text-base font-semibold text-[#1e293b]">No aging records found</p>
              <p className="text-xs text-[#64748b] mt-1">Try adjusting the warehouse, category, or bracket filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">Inward Date &amp; Source</th>
                    <th className="py-3 px-4 text-center">Stock Age</th>
                    <th className="py-3 px-4 text-center">Age Bracket</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-right">Stock Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] text-xs text-[#1e293b]">
                  {paginatedItems.map((item, idx) => {
                    const rowNumber = itemsPerPage === "all" ? idx + 1 : (currentPage - 1) * parseInt(itemsPerPage, 10) + idx + 1;
                    
                    return (
                      <tr key={`${item.itemId}_${item.warehouse}_${idx}`} className="hover:bg-[#faf5ff]/60 transition-colors">
                        <td className="py-3 px-4 text-[#94a3b8] font-medium">{rowNumber}</td>
                        
                        {/* Item Name & Details */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#111827]">{item.itemName}</div>
                          <div className="text-[11px] text-[#64748b] mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {item.sku && <span>SKU: <strong className="text-[#475569]">{item.sku}</strong></span>}
                            {item.size && item.size !== "-" && <span>• Size: {item.size}</span>}
                            {item.groupName && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-100 font-medium text-[10px]">
                                {item.groupName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Warehouse */}
                        <td className="py-3 px-4 font-medium text-[#475569]">
                          {item.warehouse}
                        </td>

                        {/* Inward Date & Source */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#111827]">{item.inwardDate || "-"}</div>
                          <div className="text-[11px] text-[#64748b]">{item.inwardSource || "Initial Stock"}</div>
                        </td>

                        {/* Age in Days */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            item.ageInDays <= 30 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            item.ageInDays <= 60 ? "bg-blue-50 text-blue-700 border border-blue-200" :
                            item.ageInDays <= 90 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            item.ageInDays <= 120 ? "bg-orange-50 text-orange-700 border border-orange-200" :
                            "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            {item.ageInDays} Days
                          </span>
                        </td>

                        {/* Age Bracket */}
                        <td className="py-3 px-4 text-center">
                          <span className="text-[11px] font-medium text-[#475569]">
                            {item.bracketLabel}
                          </span>
                        </td>

                        {/* Current Stock */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-[#111827]">
                            {item.stockOnHand?.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#64748b] ml-1">pcs</span>
                        </td>

                        {/* Cost Price */}
                        <td className="py-3 px-4 text-right font-medium text-[#475569]">
                          {formatCurrency(item.costPrice)}
                        </td>

                        {/* Total Stock Valuation */}
                        <td className="py-3 px-4 text-right font-bold text-[#059669]">
                          {formatCurrency(item.stockValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && processedItems.length > 0 && itemsPerPage !== "all" && totalPages > 1 && (
            <div className="bg-[#f8fafc] border-t border-[#e2e8f0] px-4 py-3 flex items-center justify-between text-xs text-[#64748b]">
              <div>
                Showing {(currentPage - 1) * parseInt(itemsPerPage, 10) + 1} to{" "}
                {Math.min(currentPage * parseInt(itemsPerPage, 10), processedItems.length)} of {processedItems.length} records
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded border border-[#d1d5db] bg-white font-medium hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="font-medium text-[#374151]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded border border-[#d1d5db] bg-white font-medium hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default InventoryAgingReport;

import React, { useEffect, useMemo, useState } from "react";
import Headers from "../components/Header.jsx";
import Select from "react-select";
import baseUrl from "../api/api.js";
import { CSVLink } from "react-csv";
import { Helmet } from "react-helmet";
import { FiDownload, FiSliders } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import { useSidebar } from "../hooks/useSidebar.js";

// Helper to format date into "01 Sep, 2026"
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const cleanStr = String(dateStr).split("T")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, "0");
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${monthNames[monthIndex]}, ${year}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleString("en-US", { month: "short" });
      const year = d.getFullYear();
      return `${day} ${month}, ${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

// Helper to format currency
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  const num = Number(amount);
  return `₹${num.toLocaleString("en-IN")}`;
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

const SalesByInvoiceReport = () => {
  const isSidebarOpen = useSidebar();
  const todayStr = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [selectedStore, setSelectedStore] = useState("all");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Advanced filtering states
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [skuSearch, setSkuSearch] = useState("");
  const [sizeFilter, setSizeFilter] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem("rootfinuser") || "{}");
  const isAdmin = (currentUser?.power || "").toLowerCase() === "admin";
  const isClusterManager =
    (currentUser?.role || "").toLowerCase() === "cluster_manager";
  const clusterAllowedLocCodes = currentUser?.allowedLocCodes || [];
  const canSelectStore = isAdmin || isClusterManager;

  useEffect(() => {
    if (!canSelectStore && currentUser?.locCode) {
      setSelectedStore(currentUser.locCode);
    }
    if (
      isClusterManager &&
      clusterAllowedLocCodes.length > 0 &&
      selectedStore === "all"
    ) {
      setSelectedStore(clusterAllowedLocCodes[0]);
    }
  }, []);

  const storeOptions = [
    { value: "all", label: "All Stores" },
    { value: "702", label: "SG - Edappally" },
    { value: "144", label: "Z-Edapally" },
    { value: "858", label: "Warehouse" },
    { value: "759", label: "HEAD OFFICE01" },
    { value: "700", label: "SG-Trivandrum" },
    { value: "100", label: "Z-Edappal" },
    { value: "133", label: "Z.Perinthalmanna" },
    { value: "122", label: "Z.Kottakkal" },
    { value: "701", label: "G.Kottayam" },
    { value: "703", label: "G.Perumbavoor" },
    { value: "704", label: "G.Thrissur" },
    { value: "706", label: "G.Chavakkad" },
    { value: "712", label: "G.Calicut" },
    { value: "708", label: "G.Vadakara" },
    { value: "707", label: "G.Edappal" },
    { value: "709", label: "G.Perinthalmanna" },
    { value: "711", label: "G.Kottakkal" },
    { value: "710", label: "G.Manjeri" },
    { value: "705", label: "G.Palakkad" },
    { value: "717", label: "G.Kalpetta" },
    { value: "716", label: "G.Kannur" },
    { value: "718", label: "G.MG Road" },
    { value: "101", label: "Production" },
    { value: "102", label: "Office" },
    { value: "103", label: "WAREHOUSE" },
  ];

  const categoryOptions = [
    { value: null, label: "All Categories" },
    { value: "Shoes", label: "Shoes" },
    { value: "Shirts", label: "Shirts" },
    { value: "Accessories", label: "Accessories" },
    { value: "Others", label: "Others" },
  ];

  const sizeOptions = [
    { value: null, label: "All Size" },
    { value: "XS", label: "XS" },
    { value: "S", label: "S" },
    { value: "M", label: "M" },
    { value: "L", label: "L" },
    { value: "XL", label: "XL" },
    { value: "XXL", label: "XXL" },
    { value: "6", label: "6" },
    { value: "7", label: "7" },
    { value: "8", label: "8" },
    { value: "9", label: "9" },
    { value: "10", label: "10" },
    { value: "11", label: "11" },
    { value: "12", label: "12" },
    { value: "28", label: "28" },
    { value: "30", label: "30" },
    { value: "32", label: "32" },
    { value: "34", label: "34" },
    { value: "36", label: "36" },
    { value: "38", label: "38" },
    { value: "40", label: "40" },
    { value: "42", label: "42" },
  ];

  const fetchReport = async () => {
    setLoading(true);
    setHasFetched(true);
    try {
      const endpoint = `api/reports/sales/by-invoice`;

      const params = new URLSearchParams({
        dateFrom: fromDate,
        dateTo: toDate,
        locCode: canSelectStore ? selectedStore : currentUser?.locCode,
        userId: currentUser?.email || currentUser?.userId,
        isAdmin: isAdmin ? "true" : "false",
        isClusterManager: isClusterManager ? "true" : "false",
        ...(isClusterManager && clusterAllowedLocCodes.length > 0
          ? { allowedLocCodes: clusterAllowedLocCodes.join(",") }
          : {}),
        ...(categoryFilter && { category: categoryFilter }),
        ...(skuSearch && { sku: skuSearch }),
        ...(sizeFilter && { size: sizeFilter }),
        ...(customerSearch && { customer: customerSearch }),
      });

      const response = await fetch(`${baseUrl.baseUrl}${endpoint}?${params}`);

      if (!response.ok) {
        const text = await response.text();
        console.error("API Error:", response.status, text);
        alert(`API Error: ${response.status}`);
        return;
      }

      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
      } else {
        alert(
          "Failed to fetch report: " + (result.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      alert("Error fetching report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setCategoryFilter(null);
    setSizeFilter(null);
    setSkuSearch("");
    setCustomerSearch("");
  };

  // Prepare CSV Export Data
  const csvHeaders = [
    { label: "DATE", key: "date" },
    { label: "INVOICE NO.", key: "invoiceNumber" },
    { label: "CUSTOMER NAME", key: "customer" },
    { label: "STATUS", key: "status" },
    { label: "SKU", key: "skus" },
    { label: "CATEGORY", key: "category" },
    { label: "ITEMS", key: "items" },
    { label: "AMOUNT", key: "totalAmount" },
    { label: "DISCOUNT", key: "discount" },
    { label: "NET AMOUNT", key: "netAmount" },
    { label: "PAYMENT", key: "paymentMethod" },
    { label: "BRANCH", key: "branch" },
  ];

  const csvExportData = useMemo(() => {
    if (!reportData?.invoices || reportData.invoices.length === 0) return [];
    return reportData.invoices.map((inv) => ({
      date: formatDisplayDate(inv.date),
      invoiceNumber: inv.invoiceNumber,
      customer: inv.customer,
      status: inv.isReturned ? (inv.returnStatus === "partial" ? "Returned (Partial)" : "Returned") : "Active",
      skus: inv.skus || "N/A",
      category: inv.category || "Income",
      items: inv.items || inv.subCategory || "Balance Payable",
      totalAmount: inv.totalAmount || 0,
      discount: inv.discount || 0,
      netAmount: inv.netAmount || 0,
      paymentMethod: inv.paymentMethod || "UPI",
      branch: inv.branch || "SG Edappally",
    }));
  }, [reportData]);

  const invoices = reportData?.invoices || [];
  const summary = reportData?.summary || {
    totalInvoices: 0,
    totalSales: 0,
    totalItems: 0,
    avgInvoiceValue: 0,
  };

  return (
    <>
      <Helmet>
        <title>Sales by Invoice | RootFin</title>
      </Helmet>

      <div className="min-h-screen bg-[#f8f9fa]">
        <Headers title={"Sales by Invoice Report"} />

        <div
          className={`transition-all duration-300 ${
            isSidebarOpen ? "ml-[240px]" : "ml-0"
          }`}
        >
          <div className="p-6 md:p-8 space-y-6">
            {/* Top Control & Filter Container */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-5">
              {/* Row 1: Primary Controls */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-wrap items-end gap-4">
                  {/* From Date */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="fromDate"
                      className="text-xs font-semibold text-gray-600 tracking-wide"
                    >
                      From Date
                    </label>
                    <input
                      type="date"
                      id="fromDate"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-44 px-3.5 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all"
                    />
                  </div>

                  {/* To Date */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="toDate"
                      className="text-xs font-semibold text-gray-600 tracking-wide"
                    >
                      To Date
                    </label>
                    <input
                      type="date"
                      id="toDate"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-44 px-3.5 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all"
                    />
                  </div>

                  {/* Store Selector */}
                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                    <label className="text-xs font-semibold text-gray-600 tracking-wide">
                      Store
                    </label>
                    {canSelectStore ? (
                      <Select
                        options={
                          isClusterManager
                            ? [
                                { value: "all", label: "All Stores" },
                                ...storeOptions.filter((s) =>
                                  clusterAllowedLocCodes.includes(s.value)
                                ),
                              ]
                            : storeOptions
                        }
                        value={
                          storeOptions.find(
                            (s) => s.value === selectedStore
                          ) || {
                            value: selectedStore,
                            label: selectedStore,
                          }
                        }
                        onChange={(opt) => setSelectedStore(opt.value)}
                        isSearchable
                        placeholder="Select Store..."
                        styles={customSelectStyles}
                      />
                    ) : (
                      <div className="px-3.5 py-2 text-sm text-gray-800 bg-gray-50 border border-gray-300 rounded-lg">
                        {storeOptions.find((s) => s.value === selectedStore)
                          ?.label || selectedStore}
                      </div>
                    )}
                  </div>

                  {/* Fetch Data Button */}
                  <button
                    type="button"
                    onClick={fetchReport}
                    disabled={loading}
                    className="px-6 py-2 text-sm font-medium text-white bg-[#9333ea] hover:bg-[#7e22ce] active:bg-[#6b21a8] rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{loading ? "Fetching..." : "Fetch Data"}</span>
                  </button>
                </div>

                {/* Filters Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="px-4 py-2 text-sm font-medium text-gray-800 bg-[#f3f4f6] hover:bg-[#e5e7eb] rounded-lg border border-gray-300 flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>Filters</span>
                  <FiSliders className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              {/* Row 2: Secondary Filter Bar */}
              {showAdvancedFilters && (
                <div className="pt-4 border-t border-gray-100 flex flex-wrap items-end justify-between gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                    {/* Category */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600 tracking-wide">
                        Category
                      </label>
                      <Select
                        options={categoryOptions}
                        value={categoryOptions.find(
                          (c) => c.value === categoryFilter
                        )}
                        onChange={(opt) => setCategoryFilter(opt.value)}
                        placeholder="All Categories"
                        styles={customSelectStyles}
                      />
                    </div>

                    {/* Size */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600 tracking-wide">
                        Size
                      </label>
                      <Select
                        options={sizeOptions}
                        value={sizeOptions.find((s) => s.value === sizeFilter)}
                        onChange={(opt) => setSizeFilter(opt.value)}
                        placeholder="All Size"
                        styles={customSelectStyles}
                      />
                    </div>

                    {/* Item SKU */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600 tracking-wide">
                        Item SKU
                      </label>
                      <input
                        type="text"
                        value={skuSearch}
                        onChange={(e) => setSkuSearch(e.target.value)}
                        placeholder="Search by SKU"
                        className="px-3.5 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all"
                      />
                    </div>

                    {/* Customer */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600 tracking-wide">
                        Customer
                      </label>
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search Customer"
                        className="px-3.5 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all"
                      />
                    </div>
                  </div>

                  {/* Clear all Filters */}
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-5 py-2 text-sm font-medium text-[#9333ea] hover:bg-purple-50 border border-[#9333ea] rounded-lg transition-all cursor-pointer whitespace-nowrap"
                  >
                    Clear all Filters
                  </button>
                </div>
              )}
            </div>

            {/* KPI Summary Cards Bar */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 flex-1 divide-x divide-gray-100">
                {/* Total Invoices */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    TOTAL INVOICES
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">
                    {summary.totalInvoices || 0}
                  </div>
                </div>

                {/* Total Sales */}
                <div className="space-y-1 pl-6 md:pl-12">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    TOTAL SALES
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">
                    {Number(summary.totalSales || 0).toLocaleString("en-IN")}
                  </div>
                </div>

                {/* Total Items */}
                <div className="space-y-1 pl-6 md:pl-12">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    TOTAL ITEMS
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">
                    {summary.totalItems || 0}
                  </div>
                </div>

                {/* Avg Invoice Value */}
                <div className="space-y-1 pl-6 md:pl-12">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    AVG INVOICE VALUE
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">
                    {Number(summary.avgInvoiceValue || 0).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Export CSV Button */}
              {csvExportData.length > 0 ? (
                <CSVLink
                  data={csvExportData}
                  headers={csvHeaders}
                  filename={`Sales_By_Invoice_${fromDate}_to_${toDate}.csv`}
                  className="px-4 py-2 text-sm font-medium text-gray-800 bg-[#f3f4f6] hover:bg-[#e5e7eb] rounded-lg border border-gray-300 flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Export CSV</span>
                  <FiDownload className="w-4 h-4 text-gray-700" />
                </CSVLink>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 text-sm font-medium text-gray-400 bg-[#f3f4f6] rounded-lg border border-gray-200 flex items-center gap-2 cursor-not-allowed opacity-60 whitespace-nowrap"
                >
                  <span>Export CSV</span>
                  <FiDownload className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Invoices Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  {/* Black Header */}
                  <thead>
                    <tr className="bg-[#18181b] text-white text-xs font-bold uppercase tracking-wider select-none">
                      <th className="py-3.5 px-4 text-left border-r border-zinc-700/60 whitespace-nowrap">
                        DATE
                      </th>
                      <th className="py-3.5 px-4 text-left border-r border-zinc-700/60 whitespace-nowrap">
                        INVOICE NO.
                      </th>
                      <th className="py-3.5 px-4 text-left border-r border-zinc-700/60 whitespace-nowrap">
                        CUSTOMER NAME
                      </th>
                      <th className="py-3.5 px-4 text-left border-r border-zinc-700/60 whitespace-nowrap">
                        SKU
                      </th>
                      <th className="py-3.5 px-4 text-center border-r border-zinc-700/60 whitespace-nowrap">
                        CATEGORY
                      </th>
                      <th className="py-3.5 px-4 text-left border-r border-zinc-700/60 whitespace-nowrap">
                        ITEMS
                      </th>
                      <th className="py-3.5 px-4 text-right border-r border-zinc-700/60 whitespace-nowrap">
                        AMOUNT
                      </th>
                      <th className="py-3.5 px-4 text-right border-r border-zinc-700/60 whitespace-nowrap">
                        DISCOUNT
                      </th>
                      <th className="py-3.5 px-4 text-right border-r border-zinc-700/60 whitespace-nowrap">
                        NET AMOUNT
                      </th>
                      <th className="py-3.5 px-4 text-center border-r border-zinc-700/60 whitespace-nowrap">
                        PAYMENT
                      </th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap">
                        BRANCH
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-700 bg-white">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="py-16 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                            <span className="text-sm font-medium">
                              Fetching sales records...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : invoices.length > 0 ? (
                      invoices.map((inv, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            inv.isReturned
                              ? "bg-red-50/60 hover:bg-red-100/60 border-l-4 border-l-red-500"
                              : "hover:bg-gray-50/80"
                          }`}
                        >
                          {/* Date */}
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-normal text-gray-700">
                            {formatDisplayDate(inv.date)}
                          </td>

                          {/* Invoice No */}
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-normal text-gray-700">
                            <div className="flex items-center gap-2">
                              <span className={inv.isReturned ? "font-semibold text-red-700" : "text-gray-800"}>
                                {inv.invoiceNumber || "-"}
                              </span>
                              {inv.isReturned && (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-100 border border-red-200 rounded">
                                  {inv.returnStatus === "partial" ? "Partial Return" : "Returned"}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer Name */}
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-normal text-gray-800">
                            {inv.customer || "-"}
                          </td>

                          {/* SKU (Purple color) */}
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-normal text-[#9333ea]">
                            {inv.skus || "-"}
                          </td>

                          {/* Category (Lavender / Red Badge) */}
                          <td className="py-3 px-4 border-r border-gray-200 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-3.5 py-1 text-xs font-semibold rounded-full ${
                                inv.isReturned
                                  ? "text-red-700 bg-red-100 border border-red-200"
                                  : "text-[#9333ea] bg-[#f3e8ff]"
                              }`}
                            >
                              {inv.isReturned
                                ? inv.returnStatus === "partial"
                                  ? "Returned (Partial)"
                                  : "Returned"
                                : inv.category || "General"}
                            </span>
                          </td>

                          {/* Items / Sub Category */}
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap text-gray-700">
                            {inv.items || inv.subCategory || "Balance Payable"}
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 border-r border-gray-200 text-right whitespace-nowrap text-gray-700">
                            {formatCurrency(inv.totalAmount || 0)}
                          </td>

                          {/* Discount */}
                          <td className="py-3 px-4 border-r border-gray-200 text-right whitespace-nowrap text-gray-700">
                            {formatCurrency(inv.discount || 0)}
                          </td>

                          {/* Net Amount (Green or Red color) */}
                          <td
                            className={`py-3 px-4 border-r border-gray-200 text-right whitespace-nowrap font-semibold ${
                              inv.isReturned
                                ? "text-red-600 line-through decoration-red-400"
                                : "text-[#16a34a]"
                            }`}
                          >
                            {formatCurrency(inv.netAmount || 0)}
                          </td>

                          {/* Payment (Lavender Badge) */}
                          <td className="py-3 px-4 border-r border-gray-200 text-center whitespace-nowrap">
                            <span className="inline-block px-3.5 py-1 text-xs font-semibold text-[#9333ea] bg-[#f3e8ff] rounded-full">
                              {inv.paymentMethod || "Cash"}
                            </span>
                          </td>

                          {/* Branch */}
                          <td className="py-3 px-4 whitespace-nowrap text-gray-700">
                            {inv.branch || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={11}
                          className="py-14 text-center text-gray-500 font-medium text-sm"
                        >
                          {!hasFetched
                            ? "Select Date range and click Fetch Data"
                            : "No invoice records found for the selected criteria."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SalesByInvoiceReport;
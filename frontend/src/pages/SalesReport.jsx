import React, { useEffect, useMemo, useState } from "react";
import Headers from "../components/Header.jsx";
import Select from "react-select";
import baseUrl from "../api/api.js";
import { CSVLink } from "react-csv";
import { Helmet } from "react-helmet";
import { FiDownload, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Loader2, Printer } from "lucide-react";
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

const SalesReport = () => {
  const isSidebarOpen = useSidebar();
  const todayStr = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [selectedStore, setSelectedStore] = useState("all");
  const [reportType, setReportType] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem("rootfinuser") || "{}");
  const isAdmin = (currentUser?.power || "").toLowerCase() === "admin";
  const isClusterManager = (currentUser?.role || "").toLowerCase() === "cluster_manager";
  const clusterAllowedLocCodes = currentUser?.allowedLocCodes || [];
  const canSelectStore = isAdmin || isClusterManager;

  useEffect(() => {
    if (!canSelectStore && currentUser?.locCode) {
      setSelectedStore(currentUser.locCode);
    }
    if (isClusterManager && clusterAllowedLocCodes.length > 0 && selectedStore === "all") {
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

  const reportTypeOptions = [
    { value: "summary", label: "Sales Summary" },
    { value: "by-item", label: "Sales by Item" },
    { value: "returns", label: "Return Summary" },
  ];

  const fetchReport = async () => {
    setLoading(true);
    setHasFetched(true);
    try {
      const endpoint = `api/reports/sales/${reportType}`;
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
      });

      const response = await fetch(`${baseUrl.baseUrl}${endpoint}?${params}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setReportData(result.data);
        prepareCsvData(result.data, reportType);
      } else {
        alert("Failed to fetch report: " + (result.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      alert("Error fetching report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const prepareCsvData = (data, type) => {
    let csv = [];
    if (type === "summary") {
      csv = data.invoices?.map((inv) => ({
        Date: inv.date,
        "Invoice No": inv.invoiceNumber,
        Customer: inv.customer,
        Category: inv.category,
        Amount: inv.amount,
        Discount: inv.discount,
        "Payment Method": inv.paymentMethod,
        Branch: inv.branch,
      })) || [];
    } else if (type === "by-item") {
      csv = data.items?.map((item) => ({
        "Item Name": item.name,
        SKU: item.sku,
        Category: item.category,
        Size: item.size,
        Quantity: item.quantity,
        "Unit Price": item.unitPrice,
        "Total Amount": item.totalAmount,
        "Invoice Count": item.invoiceCount,
      })) || [];
    } else if (type === "returns") {
      csv = data.returns?.map((ret) => ({
        Date: ret.date,
        "Invoice No": ret.invoiceNumber,
        Customer: ret.customer,
        Amount: ret.amount,
        Reason: ret.reason,
        Branch: ret.branch,
      })) || [];
    }
    setCsvData(csv);
  };

  return (
    <>
      <Helmet>
        <title>Sales Report | RootFin</title>
      </Helmet>

      <div className="min-h-screen bg-[#f8f9fa]">
        <Headers title={"Sales Report"} />

        <div
          className={`transition-all duration-300 ${
            isSidebarOpen ? "ml-[240px]" : "ml-0"
          }`}
        >
          <div className="p-6 md:p-8 space-y-6">
            {/* Top Control & Filter Container */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex flex-wrap items-end justify-between gap-4">
                {/* Left Controls: Dates, Store, Report Type, Action */}
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
                          storeOptions.find((s) => s.value === selectedStore) || {
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
                        {storeOptions.find((s) => s.value === selectedStore)?.label || selectedStore}
                      </div>
                    )}
                  </div>

                  {/* Report Type */}
                  <div className="flex flex-col gap-1.5 min-w-[180px]">
                    <label className="text-xs font-semibold text-gray-600 tracking-wide">
                      Report Type
                    </label>
                    <Select
                      options={reportTypeOptions}
                      value={reportTypeOptions.find((r) => r.value === reportType)}
                      onChange={(opt) => {
                        setReportType(opt.value);
                        setReportData(null);
                        setHasFetched(false);
                      }}
                      styles={customSelectStyles}
                    />
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

                {/* Right Controls: Export CSV & Print PDF */}
                <div className="flex items-center gap-3">
                  {csvData.length > 0 ? (
                    <CSVLink
                      data={csvData}
                      filename={`sales-report-${fromDate}-to-${toDate}.csv`}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <FiDownload className="w-4 h-4 text-gray-500" />
                      <span>Export CSV</span>
                    </CSVLink>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2 cursor-not-allowed opacity-60"
                    >
                      <FiDownload className="w-4 h-4 text-gray-400" />
                      <span>Export CSV</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => window.print()}
                    disabled={!reportData}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border flex items-center gap-2 transition-all ${
                      reportData
                        ? "text-gray-700 bg-white hover:bg-gray-50 border-gray-300 shadow-sm cursor-pointer"
                        : "text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <Printer className="w-4 h-4 text-gray-500" />
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State Table when No Data Fetched */}
            {!reportData && (
              <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#18181b] text-white">
                      <tr>
                        {reportType === "summary" && (
                          <>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">DATE</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">INVOICE NO.</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">CUSTOMER NAME</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">CATEGORY</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">PAYMENT</th>
                            <th className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">AMOUNT</th>
                          </>
                        )}
                        {reportType === "by-item" && (
                          <>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">ITEM NAME</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">SKU</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">CATEGORY</th>
                            <th className="py-3.5 px-4 text-center text-[11px] font-bold tracking-wider text-white uppercase">QUANTITY</th>
                            <th className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">UNIT PRICE</th>
                            <th className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">TOTAL AMOUNT</th>
                          </>
                        )}
                        {reportType === "returns" && (
                          <>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">DATE</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">INVOICE NO.</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">CUSTOMER</th>
                            <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">REASON</th>
                            <th className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">AMOUNT</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={6} className="py-24 text-center">
                          <p className="text-sm font-medium text-gray-500">
                            {hasFetched ? "No data found for the selected criteria" : "Select Date range and click Fetch Data"}
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Results Display when Data is Available */}
            {reportData && (
              <div className="space-y-6">
                {/* 1. SALES SUMMARY TYPE */}
                {reportType === "summary" && (
                  <>
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Total Invoices</div>
                        <div className="text-3xl font-bold text-gray-900">{reportData.summary?.totalInvoices || 0}</div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Total Sales</div>
                        <div className="text-3xl font-bold text-emerald-600">{formatCurrency(reportData.summary?.totalSales || 0)}</div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Total Discount</div>
                        <div className="text-3xl font-bold text-red-500">{formatCurrency(reportData.summary?.totalDiscount || 0)}</div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Net Sales</div>
                        <div className="text-3xl font-bold text-[#9333ea]">{formatCurrency(reportData.summary?.netSales || 0)}</div>
                      </div>
                    </div>

                    {/* Payment Breakdown Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Payment Breakdown</h3>
                        <button
                          type="button"
                          onClick={() => setShowPaymentBreakdown(!showPaymentBreakdown)}
                          className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>{showPaymentBreakdown ? "Hide Details" : "Show Details"}</span>
                          {showPaymentBreakdown ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </div>

                      {showPaymentBreakdown && (
                        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50/50">
                          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center shadow-2xs">
                            <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Cash</div>
                            <div className="text-lg font-bold text-emerald-600">{formatCurrency(reportData.summary?.paymentBreakdown?.cash || 0)}</div>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center shadow-2xs">
                            <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Bank</div>
                            <div className="text-lg font-bold text-blue-600">{formatCurrency(reportData.summary?.paymentBreakdown?.bank || 0)}</div>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center shadow-2xs">
                            <div className="text-xs font-semibold uppercase text-gray-500 mb-1">UPI</div>
                            <div className="text-lg font-bold text-purple-600">{formatCurrency(reportData.summary?.paymentBreakdown?.upi || 0)}</div>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center shadow-2xs">
                            <div className="text-xs font-semibold uppercase text-gray-500 mb-1">RBL</div>
                            <div className="text-lg font-bold text-amber-600">{formatCurrency(reportData.summary?.paymentBreakdown?.rbl || 0)}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sales by Category & Top Salespersons */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Sales by Category */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Sales by Category</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-[#18181b] text-white">
                              <tr>
                                <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-white uppercase">Category</th>
                                <th className="py-3 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">Count</th>
                                <th className="py-3 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {reportData.salesByCategory?.map((cat, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                                  <td className="py-3 px-4 text-sm font-medium text-gray-800">{cat.category}</td>
                                  <td className="py-3 px-4 text-sm text-right text-gray-600">{cat.count}</td>
                                  <td className="py-3 px-4 text-sm text-right font-bold text-emerald-600">{formatCurrency(cat.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Top Sales Persons */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Top Sales Persons</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-[#18181b] text-white">
                              <tr>
                                <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-white uppercase">Name</th>
                                <th className="py-3 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">Sales</th>
                                <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-white uppercase">Store</th>
                                <th className="py-3 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {reportData.topSalesPersons?.map((person, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                                  <td className="py-3 px-4 text-sm font-semibold text-gray-900">{person.name}</td>
                                  <td className="py-3 px-4 text-sm text-right font-medium text-purple-600">{person.count}</td>
                                  <td className="py-3 px-4 text-xs text-gray-500">{person.store}</td>
                                  <td className="py-3 px-4 text-sm text-right font-bold text-emerald-600">{formatCurrency(person.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 2. SALES BY ITEM TYPE */}
                {reportType === "by-item" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Total Items</div>
                        <div className="text-3xl font-bold text-gray-900">{reportData.totalItems || 0}</div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Total Quantity</div>
                        <div className="text-3xl font-bold text-purple-600">{reportData.totalQuantity || 0}</div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Total Amount</div>
                        <div className="text-3xl font-bold text-emerald-600">{formatCurrency(reportData.totalAmount || 0)}</div>
                      </div>
                    </div>

                    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#18181b] text-white">
                            <tr>
                              <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">ITEM NAME</th>
                              <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">SKU</th>
                              <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">CATEGORY</th>
                              <th className="py-3.5 px-4 text-center text-[11px] font-bold tracking-wider text-white uppercase">SIZE</th>
                              <th className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">QUANTITY</th>
                              <th className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">UNIT PRICE</th>
                              <th className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">TOTAL AMOUNT</th>
                              <th className="py-3.5 px-4 text-center text-[11px] font-bold tracking-wider text-white uppercase">INVOICES</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {reportData.items?.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                                <td className="py-3 px-4 text-sm font-semibold text-gray-900">{item.name}</td>
                                <td className="py-3 px-4 text-xs font-mono text-gray-500">{item.sku}</td>
                                <td className="py-3 px-4 text-xs text-gray-600">{item.category}</td>
                                <td className="py-3 px-4 text-xs text-center text-gray-600">{item.size || "-"}</td>
                                <td className="py-3 px-4 text-sm text-right font-bold text-purple-600">{item.quantity}</td>
                                <td className="py-3 px-4 text-sm text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                                <td className="py-3 px-4 text-sm text-right font-bold text-emerald-600">{formatCurrency(item.totalAmount)}</td>
                                <td className="py-3 px-4 text-xs text-center text-gray-600">{item.invoiceCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* 3. RETURN SUMMARY TYPE */}
                {reportType === "returns" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Total Returns</div>
                        <div className="text-3xl font-bold text-red-500">{reportData.summary?.totalReturns || 0}</div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Total Return Amount</div>
                        <div className="text-3xl font-bold text-red-600">{formatCurrency(reportData.summary?.totalReturnAmount || 0)}</div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Average Return</div>
                        <div className="text-3xl font-bold text-gray-800">{formatCurrency(reportData.summary?.averageReturnAmount || 0)}</div>
                      </div>
                    </div>

                    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#18181b] text-white">
                            <tr>
                              <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">DATE</th>
                              <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">INVOICE NO.</th>
                              <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">CUSTOMER</th>
                              <th className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">AMOUNT</th>
                              <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">REASON</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {reportData.returns?.map((ret, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-700">{formatDisplayDate(ret.date)}</td>
                                <td className="py-3 px-4 text-xs font-mono text-gray-600">{ret.invoiceNumber}</td>
                                <td className="py-3 px-4 text-sm font-medium text-gray-800">{ret.customer}</td>
                                <td className="py-3 px-4 text-sm text-right font-bold text-red-600">{formatCurrency(ret.amount)}</td>
                                <td className="py-3 px-4 text-xs text-gray-600">{ret.reason || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SalesReport;
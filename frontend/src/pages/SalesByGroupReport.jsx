import React, { useEffect, useMemo, useState } from "react";
import Headers from "../components/Header.jsx";
import Select from "react-select";
import baseUrl from "../api/api.js";
import { CSVLink } from "react-csv";
import { Helmet } from "react-helmet";
import { FiDownload } from "react-icons/fi";
import { Loader2, Printer } from "lucide-react";
import { useSidebar } from "../hooks/useSidebar.js";

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

const SalesByGroupReport = () => {
  const isSidebarOpen = useSidebar();
  const todayStr = new Date().toISOString().split("T")[0];
  const currentUser = JSON.parse(localStorage.getItem("rootfinuser") || "{}");
  const isAdmin = (currentUser?.power || "").toLowerCase() === "admin";
  const isClusterManager = (currentUser?.role || "").toLowerCase() === "cluster_manager";
  const clusterAllowedLocCodes = currentUser?.allowedLocCodes || [];
  const canSelectStore = isAdmin || isClusterManager;

  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [selectedStore, setSelectedStore] = useState(
    isAdmin ? "all" : isClusterManager ? (clusterAllowedLocCodes[0] || "all") : currentUser?.locCode || "all"
  );
  const [loading, setLoading] = useState(false);
  const [sizes, setSizes] = useState([]);
  const [rows, setRows] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!canSelectStore && currentUser?.locCode) {
      setSelectedStore(currentUser.locCode);
    }
    if (isClusterManager && clusterAllowedLocCodes.length > 0 && selectedStore === "all") {
      setSelectedStore(clusterAllowedLocCodes[0]);
    }
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setHasFetched(true);
    try {
      const params = new URLSearchParams({
        dateFrom: fromDate,
        dateTo: toDate,
        locCode: canSelectStore ? selectedStore : currentUser?.locCode,
        userId: currentUser?.email || currentUser?.userId || "",
        isAdmin: isAdmin ? "true" : "false",
        isClusterManager: isClusterManager ? "true" : "false",
        ...(isClusterManager && clusterAllowedLocCodes.length > 0
          ? { allowedLocCodes: clusterAllowedLocCodes.join(",") }
          : {}),
      });
      const res = await fetch(`${baseUrl.baseUrl}api/reports/sales/by-group?${params}`);
      const json = await res.json();
      if (json.success) {
        setSizes(json.data.sizes || []);
        setRows(json.data.rows || []);
      } else {
        alert("Error: " + (json.message || "Failed to fetch sales by group report"));
      }
    } catch (e) {
      console.error("Fetch error:", e);
      alert("Fetch error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const csvHeaders = useMemo(() => [
    { label: "Group Name", key: "groupName" },
    ...sizes.map((s) => ({ label: String(s), key: `size_${s}` })),
    { label: "Total", key: "total" },
  ], [sizes]);

  const csvData = useMemo(() => {
    return rows.map((r) => {
      const row = { groupName: r.groupName, total: r.total };
      sizes.forEach((s) => {
        row[`size_${s}`] = r.sizes?.[s] || 0;
      });
      return row;
    });
  }, [rows, sizes]);

  const grandTotals = useMemo(() => {
    const totals = {};
    sizes.forEach((s) => {
      totals[s] = rows.reduce((sum, r) => sum + (r.sizes?.[s] || 0), 0);
    });
    return totals;
  }, [rows, sizes]);

  const grandTotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.total || 0), 0);
  }, [rows]);

  return (
    <>
      <Helmet>
        <title>Sales by Group Report | RootFin</title>
      </Helmet>

      <div className="min-h-screen bg-[#f8f9fa]">
        <Headers title={"Sales by Group Report"} />

        <div
          className={`transition-all duration-300 ${
            isSidebarOpen ? "ml-[240px]" : "ml-0"
          }`}
        >
          <div className="p-6 md:p-8 space-y-6">
            {/* Top Control & Filter Container */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex flex-wrap items-end justify-between gap-4">
                {/* Left Controls: From Date, To Date, Store, Fetch Button */}
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

                  {/* Fetch Report Button */}
                  <button
                    type="button"
                    onClick={fetchReport}
                    disabled={loading}
                    className="px-6 py-2 text-sm font-medium text-white bg-[#9333ea] hover:bg-[#7e22ce] active:bg-[#6b21a8] rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{loading ? "Fetching..." : "Fetch Report"}</span>
                  </button>
                </div>

                {/* Right Controls: Export CSV & Print PDF */}
                <div className="flex items-center gap-3">
                  {csvData.length > 0 ? (
                    <CSVLink
                      data={csvData}
                      headers={csvHeaders}
                      filename={`sales-by-group-${fromDate}-to-${toDate}.csv`}
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
                    disabled={!hasFetched || rows.length === 0}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border flex items-center gap-2 transition-all ${
                      hasFetched && rows.length > 0
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

            {/* KPI Summary Cards */}
            {hasFetched && rows.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Total Item Groups
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{rows.length}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Distinct Sizes
                  </div>
                  <div className="text-3xl font-bold text-purple-600">{sizes.length}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Total Units Sold
                  </div>
                  <div className="text-3xl font-bold text-emerald-600">{grandTotal}</div>
                </div>
              </div>
            )}

            {/* Table Container */}
            <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table
                  className="w-full text-left border-collapse"
                  style={{ minWidth: `${Math.max(600, 240 + sizes.length * 64 + 90)}px` }}
                >
                  {/* Black Header */}
                  <thead>
                    <tr className="bg-[#18181b] text-white text-xs font-bold uppercase tracking-wider select-none">
                      <th className="py-3.5 px-4 text-left border-r border-zinc-700/60 whitespace-nowrap min-w-[220px]">
                        GROUP NAME
                      </th>
                      {sizes.map((s) => (
                        <th
                          key={s}
                          className="py-3.5 px-3 text-center border-r border-zinc-700/60 whitespace-nowrap min-w-[60px]"
                        >
                          {s}
                        </th>
                      ))}
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[90px] bg-zinc-900">
                        TOTAL
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-700 bg-white">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={sizes.length + 2 || 6}
                          className="py-16 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                            <span className="text-sm font-medium">
                              Fetching sales group records...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : hasFetched && rows.length > 0 ? (
                      rows.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-purple-50/40 transition-colors"
                        >
                          {/* Group Name */}
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-medium text-gray-900">
                            {row.groupName}
                          </td>

                          {/* Sizes columns */}
                          {sizes.map((s) => {
                            const count = row.sizes?.[s];
                            return (
                              <td
                                key={s}
                                className="py-3 px-3 border-r border-gray-200 text-center whitespace-nowrap text-xs"
                              >
                                {count ? (
                                  <span className="font-semibold text-gray-800">
                                    {count}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 font-normal">—</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Group Total */}
                          <td className="py-3 px-4 text-center whitespace-nowrap font-bold text-[#9333ea] bg-purple-50/50">
                            {row.total}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={sizes.length + 2 || 6}
                          className="py-20 text-center text-gray-500"
                        >
                          <p className="text-sm font-medium text-gray-500">
                            {!hasFetched
                              ? "Select Date range and click Fetch Report"
                              : "No sales group records found for the selected criteria."}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Sales quantities grouped by item group and size
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Table Footer */}
                  {hasFetched && rows.length > 0 && !loading && (
                    <tfoot>
                      <tr className="bg-gray-100/80 border-t-2 border-gray-300 text-xs font-bold uppercase tracking-wider text-gray-800">
                        <td className="py-3.5 px-4 border-r border-gray-300 text-left">
                          TOTAL
                        </td>
                        {sizes.map((s) => (
                          <td
                            key={s}
                            className="py-3.5 px-3 border-r border-gray-300 text-center font-bold text-gray-900"
                          >
                            {grandTotals[s] || <span className="text-gray-400 font-normal">—</span>}
                          </td>
                        ))}
                        <td className="py-3.5 px-4 text-center font-bold text-white bg-[#9333ea]">
                          {grandTotal}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SalesByGroupReport;

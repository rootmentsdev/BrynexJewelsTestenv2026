import React, { useMemo, useRef, useState } from "react";
import Headers from "../components/Header.jsx";
import { Helmet } from "react-helmet";
import { useSidebar } from "../hooks/useSidebar.js";
import { CSVLink } from "react-csv";
import { FiDownload, FiPrinter } from "react-icons/fi";
import { Loader2 } from "lucide-react";

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

// Helper to format time into "10:34 am"
const formatDisplayTime = (dateStr) => {
  if (!dateStr) return "";
  try {
    if (dateStr.includes("T")) {
      const timePart = dateStr.split("T")[1];
      if (timePart) {
        const [hours, minutes] = timePart.split(":");
        if (hours !== undefined && minutes !== undefined) {
          let h = parseInt(hours, 10);
          const m = minutes.substring(0, 2);
          const ampm = h >= 12 ? "pm" : "am";
          h = h % 12;
          h = h ? h : 12;
          return `${h}:${m} ${ampm}`;
        }
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d
        .toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .toLowerCase();
    }
    return "";
  } catch {
    return "";
  }
};

// Helper to format numbers with Indian formatting
const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-IN");
};

const Revenuereport = () => {
  const isSidebarOpen = useSidebar();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);

  const printRef = useRef(null);
  const currentusers = JSON.parse(localStorage.getItem("rootfinuser") || "{}");

  const handleFetch = async () => {
    if (!fromDate || !toDate) {
      alert("Please select both From Date and To Date");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      alert("From Date cannot be after To Date");
      return;
    }

    setLoading(true);
    setHasFetched(true);

    try {
      const locCode = currentusers?.locCode || "144";
      const baseUrl1 = "https://rentalapi.rootments.live/api/GetBooking";
      const bookingUrl = `${baseUrl1}/GetBookingList?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
      const rentoutUrl = `${baseUrl1}/GetRentoutList?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;

      const [bookingRes, rentoutRes] = await Promise.all([
        fetch(bookingUrl),
        fetch(rentoutUrl),
      ]);

      const [bookingJson, rentoutJson] = await Promise.all([
        bookingRes.json(),
        rentoutRes.json(),
      ]);

      const bookingList = (bookingJson?.dataSet?.data || []).map((t) => {
        const rawDate = t.bookingDate || t.date || "";
        const cash = Number(t.bookingCashAmount || t.cash || 0);
        const bank = Number(t.bookingBankAmount || t.bank || 0);
        const upi = Number(t.bookingUPIAmount || t.upi || 0);
        const totalAmount = cash + bank + upi;

        return {
          rawDate,
          date: formatDisplayDate(rawDate),
          time: formatDisplayTime(rawDate),
          invoiceNo: t.invoiceNo || "-",
          customerName: t.customerName || t.custName || "-",
          category: "Booking",
          subCategory: "Advance",
          difference: totalAmount,
        };
      });

      const rentoutList = (rentoutJson?.dataSet?.data || []).map((t) => {
        const rawDate = t.rentOutDate || t.date || "";
        const cash = Number(t.rentoutCashAmount || 0);
        const bank = Number(t.rentoutBankAmount || 0);
        const upi = Number(t.rentoutUPIAmount || 0);
        const security = Number(t.securityAmount || 0);
        const collected = cash + bank + upi;
        const diff =
          collected > 0
            ? collected - security
            : Number(t.invoiceAmount || 0) - Number(t.advanceAmount || 0);

        return {
          rawDate,
          date: formatDisplayDate(rawDate),
          time: formatDisplayTime(rawDate),
          invoiceNo: t.invoiceNo || "-",
          customerName: t.customerName || t.custName || "-",
          category: "Rent Out",
          subCategory: "Balance Payable",
          difference: diff,
        };
      });

      const combined = [...rentoutList, ...bookingList];
      setRevenueData(combined);
    } catch (error) {
      console.error("Error fetching revenue report:", error);
      alert("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate total difference
  const totalDifference = useMemo(() => {
    return revenueData.reduce(
      (sum, item) => sum + Number(item.difference || 0),
      0
    );
  }, [revenueData]);

  // CSV Export Configuration
  const csvHeaders = [
    { label: "DATE", key: "date" },
    { label: "TIME", key: "time" },
    { label: "INVOICE NO.", key: "invoiceNo" },
    { label: "CUSTOMER NAME", key: "customerName" },
    { label: "CATEGORY", key: "category" },
    { label: "SUBCATEGORY", key: "subCategory" },
    { label: "DIFFERENCE", key: "difference" },
  ];

  const csvExportData = useMemo(() => {
    if (revenueData.length === 0) return [];
    return [
      ...revenueData,
      {
        date: "Total",
        time: "",
        invoiceNo: "",
        customerName: "",
        category: "",
        subCategory: "",
        difference: totalDifference,
      },
    ];
  }, [revenueData, totalDifference]);

  // Print PDF handler
  const handlePrint = () => {
    if (revenueData.length === 0) {
      alert("No data available to print.");
      return;
    }
    window.print();
  };

  return (
    <>
      <Helmet>
        <title>Revenue Report | RootFin</title>
      </Helmet>

      {/* Print-specific stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-revenue-area, #printable-revenue-area * {
            visibility: visible;
          }
          #printable-revenue-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10px;
          }
          .no-print {
            display: none !important;
          }
          nav, aside, header {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #d1d5db !important;
            padding: 6px 8px !important;
            font-size: 11px !important;
          }
          th {
            background-color: #18181b !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          tfoot tr {
            background-color: #e5e7eb !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="no-print">
          <Headers title={"Revenue Report"} />
        </div>

        <div
          className={`transition-all duration-300 ${
            isSidebarOpen ? "ml-[240px]" : "ml-0"
          }`}
        >
          <div className="p-6 md:p-8">
            {/* Top Controls Bar */}
            <div className="no-print flex flex-wrap items-end justify-between gap-4 mb-6 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              {/* Left filter inputs */}
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

                {/* Fetch Data Button */}
                <button
                  type="button"
                  onClick={handleFetch}
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-white bg-[#9333ea] hover:bg-[#7e22ce] active:bg-[#6b21a8] rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loading ? "Fetching..." : "Fetch Data"}</span>
                </button>
              </div>

              {/* Right action buttons: Export CSV & Print PDF */}
              <div className="flex items-center gap-3">
                {/* Export CSV Button */}
                {revenueData.length > 0 ? (
                  <CSVLink
                    data={csvExportData}
                    headers={csvHeaders}
                    filename={`Revenue_Report_${fromDate || "all"}_to_${
                      toDate || "all"
                    }.csv`}
                    className="px-4 py-2 text-sm font-medium text-gray-800 bg-[#e5e7eb] hover:bg-[#d1d5db] active:bg-[#9ca3af] rounded-lg border border-gray-300 flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span>Export CSV</span>
                    <FiDownload className="w-4 h-4 text-gray-700" />
                  </CSVLink>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 text-sm font-medium text-gray-400 bg-[#f3f4f6] rounded-lg border border-gray-200 flex items-center gap-2 cursor-not-allowed opacity-60"
                  >
                    <span>Export CSV</span>
                    <FiDownload className="w-4 h-4 text-gray-400" />
                  </button>
                )}

                {/* Print PDF Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={revenueData.length === 0}
                  className="px-4 py-2 text-sm font-medium text-gray-800 bg-[#e5e7eb] hover:bg-[#d1d5db] active:bg-[#9ca3af] rounded-lg border border-gray-300 flex items-center gap-2 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>Print PDF</span>
                  <FiPrinter className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>

            {/* Print Header on paper */}
            <div className="hidden print:block mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                RootFin Revenue Report
              </h2>
              <p className="text-sm text-gray-600">
                Period: {formatDisplayDate(fromDate)} to{" "}
                {formatDisplayDate(toDate)}
              </p>
            </div>

            {/* Report Table Card */}
            <div
              id="printable-revenue-area"
              ref={printRef}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
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
                        CATEGORY
                      </th>
                      <th className="py-3.5 px-4 text-left border-r border-zinc-700/60 whitespace-nowrap">
                        SUBCATEGORY
                      </th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">
                        DIFFERENCE
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-700 bg-white">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-16 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                            <span className="text-sm font-medium">
                              Fetching revenue records...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : revenueData.length > 0 ? (
                      revenueData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50/80 transition-colors"
                        >
                          {/* Date & Time */}
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap">
                            <div className="font-normal text-gray-800">
                              {row.date}
                            </div>
                            {row.time && (
                              <div className="text-xs text-gray-400 font-normal">
                                {row.time}
                              </div>
                            )}
                          </td>

                          {/* Invoice No */}
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-normal text-gray-700">
                            {row.invoiceNo}
                          </td>

                          {/* Customer Name */}
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-normal text-gray-800">
                            {row.customerName}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-normal text-gray-700">
                            {row.category}
                          </td>

                          {/* Sub Category */}
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-normal text-gray-700">
                            {row.subCategory}
                          </td>

                          {/* Difference */}
                          <td className="py-3 px-4 text-right whitespace-nowrap font-normal text-gray-800">
                            {formatNumber(row.difference)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-14 text-center text-gray-500 font-medium text-sm"
                        >
                          {!hasFetched
                            ? "Select Date range and click Fetch Data"
                            : "No revenue records found for the selected date range."}
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Summary Totals Footer */}
                  {revenueData.length > 0 && (
                    <tfoot>
                      <tr className="bg-[#e5e7eb] font-bold text-gray-900 text-sm border-t-2 border-gray-300">
                        <td
                          colSpan={5}
                          className="py-3.5 px-4 text-left font-bold border-r border-gray-300 tracking-wide"
                        >
                          Total
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                          {formatNumber(totalDifference)}
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

export default Revenuereport;
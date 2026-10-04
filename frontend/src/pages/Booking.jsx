import React, { useMemo, useRef, useState } from "react";
import Headers from "../components/Header.jsx";
import { Helmet } from "react-helmet";
import { useSidebar } from "../hooks/useSidebar.js";
import { CSVLink } from "react-csv";
import { FiDownload, FiPrinter } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import baseUrl from "../api/api.js";

// Helper to format date into "01 Sep, 2026" format
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

// Helper to format numbers with commas (Indian number format)
const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-IN");
};

const Booking = () => {
  const isSidebarOpen = useSidebar();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);

  const printRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem("rootfinuser") || "{}");

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
      const locCode = currentUser?.locCode || "144";
      const twsBase = "https://rentalapi.rootments.live/api/GetBooking";
      const bookingUrl = `${twsBase}/GetBookingList?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;

      // Optional override data fetch
      let overrideRows = [];
      try {
        const backendBase = baseUrl?.baseUrl || "http://localhost:7000/";
        const overrideRes = await fetch(
          `${backendBase}api/tws/getEditedTransactions?fromDate=${fromDate}&toDate=${toDate}&locCode=${locCode}`
        );
        if (overrideRes.ok) {
          const overrideJson = await overrideRes.json();
          overrideRows = overrideJson?.data || [];
        }
      } catch (err) {
        console.warn("Could not fetch overrides:", err);
      }

      const editedMap = new Map();
      overrideRows.forEach((row) => {
        const key = String(row.invoiceNo || row.invoice || "").trim();
        const category = (row.type || row.Category || "").toLowerCase();
        editedMap.set(`${key}-${category}`, row);
        editedMap.set(key, row);
      });

      const response = await fetch(bookingUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch booking data: ${response.statusText}`);
      }

      const resData = await response.json();
      const rawList = resData?.dataSet?.data || [];

      const formattedList = rawList.map((item) => {
        const invKey = String(item.invoiceNo || "").trim();
        const override = editedMap.get(`${invKey}-booking`) || editedMap.get(invKey);

        const rawDate = override?.date || item.bookingDate || item.date || "";
        const invoiceNo = override?.invoiceNo || item.invoiceNo || "-";
        const customerName =
          override?.customerName ||
          item.customerName ||
          item.custName ||
          item.customer ||
          "-";
        const quantity = Number(override?.quantity ?? item.quantity ?? 1);
        const billValue = Number(
          override?.billValue ?? item.invoiceAmount ?? item.billValue ?? 0
        );
        const cash = Number(
          override?.cash ?? item.bookingCashAmount ?? item.cash ?? 0
        );
        const rbl = Number(
          override?.rbl ?? item.rblRazorPay ?? item.rbl ?? 0
        );
        const bank = Number(
          override?.bank ?? item.bookingBankAmount ?? item.bank ?? 0
        );
        const upi = Number(
          override?.upi ?? item.bookingUPIAmount ?? item.upi ?? 0
        );
        const totalAmount = cash + rbl + bank + upi;

        return {
          rawDate,
          date: formatDisplayDate(rawDate),
          invoiceNo,
          customerName,
          quantity,
          billValue,
          cash,
          rbl,
          bank,
          upi,
          totalAmount,
        };
      });

      setBookingData(formattedList);
    } catch (error) {
      console.error("Error fetching booking data:", error);
      alert("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary totals
  const totals = useMemo(() => {
    return bookingData.reduce(
      (acc, item) => {
        acc.quantity += Number(item.quantity || 0);
        acc.billValue += Number(item.billValue || 0);
        acc.cash += Number(item.cash || 0);
        acc.rbl += Number(item.rbl || 0);
        acc.bank += Number(item.bank || 0);
        acc.upi += Number(item.upi || 0);
        acc.totalAmount += Number(item.totalAmount || 0);
        return acc;
      },
      {
        quantity: 0,
        billValue: 0,
        cash: 0,
        rbl: 0,
        bank: 0,
        upi: 0,
        totalAmount: 0,
      }
    );
  }, [bookingData]);

  // CSV Export configuration
  const csvHeaders = [
    { label: "DATE", key: "date" },
    { label: "INVOICE NO.", key: "invoiceNo" },
    { label: "CUSTOMER NAME", key: "customerName" },
    { label: "QUANTITY", key: "quantity" },
    { label: "BILL VALUE", key: "billValue" },
    { label: "CASH", key: "cash" },
    { label: "RBL", key: "rbl" },
    { label: "BANK", key: "bank" },
    { label: "UPI", key: "upi" },
    { label: "TOTAL AMOUNT", key: "totalAmount" },
  ];

  const csvExportData = useMemo(() => {
    if (bookingData.length === 0) return [];
    return [
      ...bookingData,
      {
        date: "Total",
        invoiceNo: "",
        customerName: "",
        quantity: totals.quantity,
        billValue: totals.billValue,
        cash: totals.cash,
        rbl: totals.rbl,
        bank: totals.bank,
        upi: totals.upi,
        totalAmount: totals.totalAmount,
      },
    ];
  }, [bookingData, totals]);

  // Print PDF handler
  const handlePrint = () => {
    if (bookingData.length === 0) {
      alert("No data available to print.");
      return;
    }
    window.print();
  };

  return (
    <>
      <Helmet>
        <title>Booking Report | RootFin</title>
      </Helmet>

      {/* Print-specific styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible;
          }
          #printable-report-area {
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
          <Headers title={"Booking Report"} />
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
                {bookingData.length > 0 ? (
                  <CSVLink
                    data={csvExportData}
                    headers={csvHeaders}
                    filename={`Booking_Report_${fromDate || "all"}_to_${
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
                  disabled={bookingData.length === 0}
                  className="px-4 py-2 text-sm font-medium text-gray-800 bg-[#e5e7eb] hover:bg-[#d1d5db] active:bg-[#9ca3af] rounded-lg border border-gray-300 flex items-center gap-2 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>Print PDF</span>
                  <FiPrinter className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>

            {/* Print Header only visible on paper/print */}
            <div className="hidden print:block mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                RootFin Booking Report
              </h2>
              <p className="text-sm text-gray-600">
                Period: {formatDisplayDate(fromDate)} to{" "}
                {formatDisplayDate(toDate)}
              </p>
            </div>

            {/* Report Table Card */}
            <div
              id="printable-report-area"
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
                      <th className="py-3.5 px-4 text-center border-r border-zinc-700/60 whitespace-nowrap">
                        QUANTITY
                      </th>
                      <th className="py-3.5 px-4 text-right border-r border-zinc-700/60 whitespace-nowrap">
                        BILL VALUE
                      </th>
                      <th className="py-3.5 px-4 text-right border-r border-zinc-700/60 whitespace-nowrap">
                        CASH
                      </th>
                      <th className="py-3.5 px-4 text-right border-r border-zinc-700/60 whitespace-nowrap">
                        RBL
                      </th>
                      <th className="py-3.5 px-4 text-right border-r border-zinc-700/60 whitespace-nowrap">
                        BANK
                      </th>
                      <th className="py-3.5 px-4 text-right border-r border-zinc-700/60 whitespace-nowrap">
                        UPI
                      </th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">
                        TOTAL AMOUNT
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-700 bg-white">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="py-16 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                            <span className="text-sm font-medium">
                              Fetching booking records...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : bookingData.length > 0 ? (
                      bookingData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50/80 transition-colors"
                        >
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-normal text-gray-700">
                            {row.date}
                          </td>
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-normal text-gray-700">
                            {row.invoiceNo}
                          </td>
                          <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap font-medium text-gray-800">
                            {row.customerName}
                          </td>
                          <td className="py-3 px-4 border-r border-gray-200 text-center whitespace-nowrap text-gray-700">
                            {row.quantity}
                          </td>
                          <td className="py-3 px-4 border-r border-gray-200 text-right whitespace-nowrap text-gray-700">
                            {formatNumber(row.billValue)}
                          </td>
                          <td className="py-3 px-4 border-r border-gray-200 text-right whitespace-nowrap text-gray-700">
                            {formatNumber(row.cash)}
                          </td>
                          <td className="py-3 px-4 border-r border-gray-200 text-right whitespace-nowrap text-gray-700">
                            {formatNumber(row.rbl)}
                          </td>
                          <td className="py-3 px-4 border-r border-gray-200 text-right whitespace-nowrap text-gray-700">
                            {formatNumber(row.bank)}
                          </td>
                          <td className="py-3 px-4 border-r border-gray-200 text-right whitespace-nowrap text-gray-700">
                            {formatNumber(row.upi)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-gray-900">
                            {formatNumber(row.totalAmount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={10}
                          className="py-14 text-center text-gray-500 font-medium text-sm"
                        >
                          {!hasFetched
                            ? "Select Date range and click Fetch Data"
                            : "No booking records found for the selected date range."}
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Summary Totals Footer */}
                  {bookingData.length > 0 && (
                    <tfoot>
                      <tr className="bg-[#e5e7eb] font-bold text-gray-900 text-sm border-t-2 border-gray-300">
                        <td
                          colSpan={5}
                          className="py-3.5 px-4 text-left font-bold border-r border-gray-300 tracking-wide"
                        >
                          Total
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold border-r border-gray-300 whitespace-nowrap">
                          {formatNumber(totals.cash)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold border-r border-gray-300 whitespace-nowrap">
                          {formatNumber(totals.rbl)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold border-r border-gray-300 whitespace-nowrap">
                          {formatNumber(totals.bank)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold border-r border-gray-300 whitespace-nowrap">
                          {formatNumber(totals.upi)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                          {formatNumber(totals.totalAmount)}
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

export default Booking;

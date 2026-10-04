/*  ────────────────────────────────────────────────
 *  Security.jsx  – hybrid opening-balance logic
 *  ────────────────────────────────────────────────*/
import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import Headers from "../components/Header.jsx";
import useFetch from "../hooks/useFetch.jsx";
import openingBalanceMap from "../data/openingBalance.json";
import { useSidebar } from "../hooks/useSidebar.js";
import { Download, Printer, Loader2 } from "lucide-react";

/* ---------- Store master list ---------- */
const AllLoation = [
  { locName: "Z-Edapally1", locCode: "144" },
  { locName: "G-Edappally", locCode: "702" },
  { locName: "SG-Trivandrum", locCode: "700" },
  { locName: "Z- Edappal", locCode: "100" },
  { locName: "Z.Perinthalmanna", locCode: "133" },
  { locName: "Z.Kottakkal", locCode: "122" },
  { locName: "G.Kottayam", locCode: "701" },
  { locName: "G.Perumbavoor", locCode: "703" },
  { locName: "G.Thrissur", locCode: "704" },
  { locName: "G.Chavakkad", locCode: "706" },
  { locName: "G.Calicut", locCode: "712" },
  { locName: "G.Vadakara", locCode: "708" },
  { locName: "G.Edappal", locCode: "707" },
  { locName: "G.Perinthalmanna", locCode: "709" },
  { locName: "G.Kottakkal", locCode: "711" },
  { locName: "G.Manjeri", locCode: "710" },
  { locName: "G.Palakkad", locCode: "705" },
  { locName: "G.Kalpetta", locCode: "717" },
  { locName: "G.Kannur", locCode: "716" },
  { locName: "G.Mg Road", locCode: "718" },
];
const getStoreName = (c) => AllLoation.find((l) => l.locCode === c)?.locName || "Unknown";

/* ---------- helpers ---------- */
const getMonthStart = (iso) => iso.slice(0, 7) + "-01"; // YYYY-MM-01
const getManualOpening = (locCode, date) =>
  openingBalanceMap[locCode]?.[getMonthStart(date)] ?? null;
const dayBefore = (iso) => {
  const d = new Date(iso);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return { dateFormatted: "-", timeFormatted: "" };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { dateFormatted: dateStr, timeFormatted: "" };
    const dateFormatted = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const hasTime = typeof dateStr === "string" && (dateStr.includes("T") || dateStr.includes(":"));
    const timeFormatted = hasTime
      ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()
      : "";
    return { dateFormatted, timeFormatted };
  } catch {
    return { dateFormatted: dateStr, timeFormatted: "" };
  }
};

const formatNum = (num) => {
  if (num === undefined || num === null || isNaN(num) || num === "") return "0";
  return Number(num).toLocaleString("en-IN");
};

const Security = () => {
  const isSidebarOpen = useSidebar();
  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const firstOfMonth = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-01`;
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [selectedStore, setSelectedStore] = useState("current"); // "current" | "all" | "cluster"
  const [rentAll, setRentAll] = useState([]); // all-store mode
  const [returnAll, setReturnAll] = useState([]);
  const [openingCash, setOpeningCash] = useState(0);
  const [allStoreOpenings, setAllStoreOpenings] = useState({}); // locCode -> opening balance

  const user = JSON.parse(localStorage.getItem("rootfinuser") || "{}");
  const isClusterManager = (user?.role || "").toLowerCase() === "cluster_manager";
  const clusterStores = isClusterManager
    ? AllLoation.filter((s) => (user.allowedLocCodes || []).includes(s.locCode))
    : [];
  const baseAPI = "https://rentalapi.rootments.live/api/GetBooking";

  const [loading, setLoading] = useState(false);
  const printRef = useRef(null);

  /* ---------- hybrid opening-balance calc ---------- */
  const calcOpeningCash = async () => {
    if (selectedStore !== "current") return;

    const loc = user.locCode;
    const manualOpen = getManualOpening(loc, fromDate);

    /* ——— NEW LOGIC path ——— */
    if (manualOpen !== null) {
      const monthStart = getMonthStart(fromDate);
      if (fromDate === monthStart) {
        setOpeningCash(manualOpen);
        return;
      }

      const urlIn = `${baseAPI}/GetRentoutList?LocCode=${loc}&DateFrom=${monthStart}&DateTo=${dayBefore(fromDate)}`;
      const urlOut = `${baseAPI}/GetReturnList?LocCode=${loc}&DateFrom=${monthStart}&DateTo=${dayBefore(fromDate)}`;

      try {
        const [r1, r2] = await Promise.all([fetch(urlIn), fetch(urlOut)]);
        const [j1, j2] = await Promise.all([r1.json(), r2.json()]);
        const secIn = (j1?.dataSet?.data || []).reduce((s, t) => s + +(t.securityAmount || 0), 0);
        const secOut = (j2?.dataSet?.data || []).reduce((s, t) => s + +(t.securityAmount || 0), 0);
        setOpeningCash(manualOpen + (secIn - secOut));
        return;
      } catch {
        setOpeningCash(manualOpen); // graceful fallback
        return;
      }
    }

    /* ——— OLD LOGIC path ——— */
    try {
      const urlIn = `${baseAPI}/GetRentoutList?LocCode=${loc}&DateFrom=2025-01-01&DateTo=${dayBefore(fromDate)}`;
      const urlOut = `${baseAPI}/GetReturnList?LocCode=${loc}&DateFrom=2025-01-01&DateTo=${dayBefore(fromDate)}`;
      const [r1, r2] = await Promise.all([fetch(urlIn), fetch(urlOut)]);
      const [j1, j2] = await Promise.all([r1.json(), r2.json()]);
      const secIn = (j1?.dataSet?.data || []).reduce((s, t) => s + +(t.securityAmount || 0), 0);
      const secOut = (j2?.dataSet?.data || []).reduce((s, t) => s + +(t.securityAmount || 0), 0);
      setOpeningCash(secIn - secOut);
    } catch {
      setOpeningCash(0);
    }
  };

  /* run calc when store/date changes (current-store mode) */
  useEffect(() => {
    if (selectedStore === "current") calcOpeningCash();
  }, [selectedStore, fromDate, user.locCode]);

  /* ---------- data fetch for current store ---------- */
  const apiRentCur = `${baseAPI}/GetRentoutList?LocCode=${user.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
  const apiRetCur = `${baseAPI}/GetReturnList?LocCode=${user.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
  const fetchOpts = useMemo(() => ({}), []);
  const { data: rentData } = useFetch(selectedStore === "current" ? apiRentCur : null, fetchOpts);
  const { data: retData } = useFetch(selectedStore === "current" ? apiRetCur : null, fetchOpts);

  /* ---------- handleFetch (all-store / cluster mode) ---------- */
  const handleFetch = async () => {
    if (selectedStore !== "all" && selectedStore !== "cluster") {
      await calcOpeningCash();
      return;
    }

    setLoading(true);
    const storesToFetch = selectedStore === "cluster" ? clusterStores : AllLoation;
    const tmpRent = [],
      tmpRet = [];
    const openingMap = {};

    for (const store of storesToFetch) {
      const u1 = `${baseAPI}/GetRentoutList?LocCode=${store.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
      const u2 = `${baseAPI}/GetReturnList?LocCode=${store.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;

      const manualOpen = getManualOpening(store.locCode, fromDate);
      try {
        if (manualOpen !== null) {
          const monthStart = getMonthStart(fromDate);
          if (fromDate === monthStart) {
            openingMap[store.locCode] = manualOpen;
          } else {
            const [oR1, oR2] = await Promise.all([
              fetch(`${baseAPI}/GetRentoutList?LocCode=${store.locCode}&DateFrom=${monthStart}&DateTo=${dayBefore(fromDate)}`),
              fetch(`${baseAPI}/GetReturnList?LocCode=${store.locCode}&DateFrom=${monthStart}&DateTo=${dayBefore(fromDate)}`),
            ]);
            const [oj1, oj2] = await Promise.all([oR1.json(), oR2.json()]);
            const oSecIn = (oj1?.dataSet?.data || []).reduce((acc, t) => acc + +(t.securityAmount || 0), 0);
            const oSecOut = (oj2?.dataSet?.data || []).reduce((acc, t) => acc + +(t.securityAmount || 0), 0);
            openingMap[store.locCode] = manualOpen + (oSecIn - oSecOut);
          }
        } else {
          const [oR1, oR2] = await Promise.all([
            fetch(`${baseAPI}/GetRentoutList?LocCode=${store.locCode}&DateFrom=2025-01-01&DateTo=${dayBefore(fromDate)}`),
            fetch(`${baseAPI}/GetReturnList?LocCode=${store.locCode}&DateFrom=2025-01-01&DateTo=${dayBefore(fromDate)}`),
          ]);
          const [oj1, oj2] = await Promise.all([oR1.json(), oR2.json()]);
          const oSecIn = (oj1?.dataSet?.data || []).reduce((acc, t) => acc + +(t.securityAmount || 0), 0);
          const oSecOut = (oj2?.dataSet?.data || []).reduce((acc, t) => acc + +(t.securityAmount || 0), 0);
          openingMap[store.locCode] = oSecIn - oSecOut;
        }
      } catch {
        openingMap[store.locCode] = 0;
      }

      try {
        const [r1, r2] = await Promise.all([fetch(u1), fetch(u2)]);
        const [j1, j2] = await Promise.all([r1.json(), r2.json()]);
        if (j1?.dataSet?.data)
          tmpRent.push(...j1.dataSet.data.map((d) => ({ ...d, locCode: store.locCode, Category: "RentOut" })));
        if (j2?.dataSet?.data)
          tmpRet.push(...j2.dataSet.data.map((d) => ({ ...d, locCode: store.locCode, Category: "Return" })));
      } catch (e) {
        console.error("Fetch err", e);
      }
    }

    setRentAll(tmpRent.map((d) => ({ ...d, _openingForStore: openingMap[d.locCode] || 0 })));
    setReturnAll(tmpRet.map((d) => ({ ...d, _openingForStore: openingMap[d.locCode] || 0 })));
    setAllStoreOpenings(openingMap);
    setLoading(false);
  };

  /* ---------- build rows ---------- */
  let tableRows = [];
  if (selectedStore === "current") {
    const rentList = rentData?.dataSet?.data || [];
    const retList = retData?.dataSet?.data || [];

    const rentMap = {};
    rentList.forEach((t) => {
      rentMap[t.invoiceNo] = t;
    });
    const retMap = {};
    retList.forEach((t) => {
      retMap[t.invoiceNo] = t;
    });

    const allInvoices = [...new Set([...rentList.map((t) => t.invoiceNo), ...retList.map((t) => t.invoiceNo)])];

    tableRows = allInvoices.map((inv) => {
      const r = rentMap[inv];
      const x = retMap[inv];
      const hasBoth = r && x;
      return {
        date: r ? r.rentOutDate : x.returnedDate,
        returnDate: x ? x.returnedDate : null,
        invoice: inv,
        customer: r ? r.customerName : x.customerName,
        category: hasBoth ? "RentOut + Return" : r ? "RentOut" : "Return",
        sub: hasBoth ? "Security" : r ? "Security" : "Security Refund",
        secIn: r ? +(r.securityAmount || 0) : 0,
        secOutCash: x ? +(x.returnCashAmount || 0) : 0,
        secOutRbl: x ? +(x.rblRazorPay || 0) : 0,
        merged: hasBoth,
      };
    });
  } else {
    const combined = [...rentAll, ...returnAll];
    const acc = {};

    for (const [lc, opening] of Object.entries(allStoreOpenings)) {
      if (opening === 0) continue;
      const name = getStoreName(lc);
      if (!acc[name]) acc[name] = { store: name, locCode: lc, secIn: opening, secOutCash: 0, secOutRbl: 0 };
    }

    combined.forEach((t) => {
      const name = getStoreName(t.locCode);
      if (!acc[name])
        acc[name] = {
          store: name,
          locCode: t.locCode,
          secIn: allStoreOpenings[t.locCode] || 0,
          secOutCash: 0,
          secOutRbl: 0,
        };
      if (t.Category === "Return") {
        acc[name].secOutCash += +(t.returnCashAmount || 0);
        acc[name].secOutRbl += +(t.rblRazorPay || 0);
      } else {
        acc[name].secIn += +(t.securityAmount || 0);
      }
    });

    tableRows = Object.values(acc).map((r) => ({ ...r, diff: r.secIn - (r.secOutCash + r.secOutRbl) }));
  }

  const totIn = tableRows.reduce((s, r) => s + (r.secIn || 0), 0);
  const totOutCash = tableRows.reduce((s, r) => s + (r.secOutCash || 0), 0);
  const totOutRbl = tableRows.reduce((s, r) => s + (r.secOutRbl || 0), 0);
  const totOut = totOutCash + totOutRbl;
  const adjIn = selectedStore === "current" ? totIn + openingCash : totIn;

  /* ---------- CSV export helper ---------- */
  const handleExportCSV = () => {
    if (tableRows.length === 0 && openingCash === 0) return alert("No data to export");
    const isAllStore = selectedStore === "all" || selectedStore === "cluster";
    const headers = isAllStore
      ? ["Store", "LocCode", "Security In", "Security Out (Cash)", "Security Out (RBL)", "Difference"]
      : [
          "Date",
          "Invoice No",
          "Customer Name",
          "Category",
          "Sub Category",
          "Security In",
          "Security Out (Cash)",
          "Security Out (RBL)",
          "Difference",
        ];

    let rows = [];
    if (isAllStore) {
      rows = tableRows.map((r) => [
        r.store,
        r.locCode,
        r.secIn || 0,
        r.secOutCash || 0,
        r.secOutRbl || 0,
        r.diff || 0,
      ]);
    } else {
      if (openingCash !== 0) {
        rows.push(["OPENING CASH", "", "", "", "", openingCash, 0, 0, 0]);
      }
      rows.push(
        ...tableRows.map((r) => [
          r.date,
          r.invoice,
          r.customer || "",
          r.category || "",
          r.sub || "",
          r.secIn || 0,
          r.secOutCash || 0,
          r.secOutRbl || 0,
          r.secIn - (r.secOutCash + r.secOutRbl),
        ])
      );
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Security_Report_${fromDate}_to_${toDate}.csv`;
    link.click();
  };

  /* ---------- print helper ---------- */
  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Security Report - ${fromDate} to ${toDate}</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; margin: 0; padding: 10px; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { background-color: #1e1e1e !important; color: #ffffff !important; padding: 8px 10px; font-size: 10px; text-transform: uppercase; font-weight: bold; border-right: 1px solid #333; }
            td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #f1f5f9; }
            tfoot tr { background-color: #e5e7eb !important; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          <h2>Security Report</h2>
          <p>Period: ${fromDate || "N/A"} to ${toDate || "N/A"} | Store: ${selectedStore === "current" ? getStoreName(user?.locCode) : selectedStore}</p>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <>
      <Helmet>
        <title>Security Report | RootFin</title>
      </Helmet>
      <div>
        <Headers title="Security Report" />
        <div className={`transition-all duration-300 min-h-screen bg-[#f8fafc] p-6 md:p-8 ${isSidebarOpen ? "ml-64" : "ml-0"}`}>
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 mb-6">
            {/* Left Controls: From Date, To Date, Store, Fetch Button */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-[38px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 shadow-sm focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-[38px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 shadow-sm focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1 min-w-[180px]">
                <label className="text-xs font-semibold text-gray-500">Store</label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="h-[38px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 shadow-sm focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="current">
                    {getStoreName(user.locCode)}
                  </option>
                  {isClusterManager && clusterStores.length > 0 && (
                    <option value="cluster">My Stores (All Assigned)</option>
                  )}
                  {(user.power || "").toLowerCase() === "admin" && (
                    <option value="all">All Stores (Totals)</option>
                  )}
                </select>
              </div>

              <button
                onClick={handleFetch}
                disabled={loading}
                className="h-[38px] px-5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? "Fetching..." : "Fetch Data"}</span>
              </button>
            </div>

            {/* Right Controls: Export CSV, Print PDF */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportCSV}
                className="h-[38px] px-4 rounded-lg bg-[#EEEEEE] hover:bg-[#E2E2E2] text-gray-800 text-sm font-medium border border-gray-200 flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <span>Export CSV</span>
                <Download className="w-4 h-4 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="h-[38px] px-4 rounded-lg bg-[#EEEEEE] hover:bg-[#E2E2E2] text-gray-800 text-sm font-medium border border-gray-200 flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <span>Print PDF</span>
                <Printer className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Table Card */}
          <div className="rounded-none border border-gray-200 bg-white shadow-sm overflow-hidden" ref={printRef}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-full text-left text-xs">
                <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                  <tr className="bg-[#1e1e1e] text-white text-xs uppercase tracking-wide font-bold">
                    {selectedStore === "all" || selectedStore === "cluster" ? (
                      <>
                        <th scope="col" className="px-4 py-3 text-left border-r border-[#333333]">
                          STORE
                        </th>
                        <th scope="col" className="px-4 py-3 text-left border-r border-[#333333]">
                          LOCCODE
                        </th>
                        <th scope="col" className="px-4 py-3 text-right border-r border-[#333333]">
                          SECURITY IN
                        </th>
                        <th scope="col" className="px-4 py-3 text-right border-r border-[#333333]">
                          SECURITY OUT (CASH)
                        </th>
                        <th scope="col" className="px-4 py-3 text-right border-r border-[#333333]">
                          SECURITY OUT (RBL)
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          DIFFERENCE
                        </th>
                      </>
                    ) : (
                      <>
                        <th scope="col" className="px-4 py-3 text-left border-r border-[#333333]">
                          DATE
                        </th>
                        <th scope="col" className="px-4 py-3 text-left border-r border-[#333333]">
                          INVOICE NO.
                        </th>
                        <th scope="col" className="px-4 py-3 text-left border-r border-[#333333]">
                          CUSTOMER NAME
                        </th>
                        <th scope="col" className="px-4 py-3 text-left border-r border-[#333333]">
                          CATEGORY
                        </th>
                        <th scope="col" className="px-4 py-3 text-left border-r border-[#333333]">
                          SUB CATEGORY
                        </th>
                        <th scope="col" className="px-4 py-3 text-right border-r border-[#333333]">
                          SECURITY IN
                        </th>
                        <th scope="col" className="px-4 py-3 text-right border-r border-[#333333]">
                          SECURITY OUT (CASH)
                        </th>
                        <th scope="col" className="px-4 py-3 text-right border-r border-[#333333]">
                          SECURITY OUT (RBL)
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          DIFFERENCE
                        </th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-xs">
                  {/* Opening Cash Row */}
                  {selectedStore === "current" && openingCash !== 0 && (
                    <tr className="bg-gray-50/80 font-bold border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-900 uppercase tracking-wider font-bold">Total</td>
                      <td colSpan={4} className="px-4 py-3 text-gray-400"></td>
                      <td className="px-4 py-3 text-right text-gray-900 font-bold">{formatNum(openingCash)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-bold">0</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-bold">0</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-bold">0</td>
                    </tr>
                  )}

                  {tableRows.length ? (
                    tableRows.map((r, i) => {
                      if (selectedStore === "all" || selectedStore === "cluster") {
                        return (
                          <tr key={i} className="border-b border-gray-100 hover:bg-[#f8fafc] transition-colors">
                            <td className="px-4 py-3.5 text-gray-900 font-medium whitespace-nowrap">{r.store}</td>
                            <td className="px-4 py-3.5 text-gray-600 font-mono">{r.locCode}</td>
                            <td className="px-4 py-3.5 text-right text-gray-700 font-medium">{formatNum(r.secIn)}</td>
                            <td className="px-4 py-3.5 text-right text-gray-700 font-medium">{formatNum(r.secOutCash)}</td>
                            <td className="px-4 py-3.5 text-right text-gray-700 font-medium">{formatNum(r.secOutRbl)}</td>
                            <td className="px-4 py-3.5 text-right text-gray-900 font-semibold">{formatNum(r.diff)}</td>
                          </tr>
                        );
                      }

                      const { dateFormatted, timeFormatted } = formatDateTime(r.date);
                      const returnDt = r.returnDate ? formatDateTime(r.returnDate) : null;

                      return (
                        <tr key={i} className="border-b border-gray-100 hover:bg-[#f8fafc] transition-colors">
                          <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">
                            <div>{dateFormatted}</div>
                            {timeFormatted && <div className="text-[11px] text-gray-400">{timeFormatted}</div>}
                            {r.merged && returnDt && (
                              <div className="text-[11px] text-purple-600 mt-0.5">↩ Return: {returnDt.dateFormatted}</div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-gray-700 font-mono whitespace-nowrap">{r.invoice || "-"}</td>
                          <td className="px-4 py-3.5 text-gray-900 font-medium whitespace-nowrap">{r.customer || "-"}</td>
                          <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{r.category || "-"}</td>
                          <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{r.sub || "-"}</td>
                          <td className="px-4 py-3.5 text-right text-gray-700 font-medium">
                            {r.secIn ? formatNum(r.secIn) : ""}
                          </td>
                          <td className="px-4 py-3.5 text-right text-gray-700 font-medium">
                            {r.secOutCash ? formatNum(r.secOutCash) : ""}
                          </td>
                          <td className="px-4 py-3.5 text-right text-gray-700 font-medium">
                            {r.secOutRbl ? formatNum(r.secOutRbl) : ""}
                          </td>
                          <td className="px-4 py-3.5 text-right text-gray-900 font-semibold">
                            {formatNum(r.secIn - (r.secOutCash + r.secOutRbl))}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={selectedStore === "all" || selectedStore === "cluster" ? 6 : 9} className="px-4 py-12 text-center text-gray-500">
                        No transactions found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Footer Totals */}
                <tfoot style={{ position: "sticky", bottom: 0, zIndex: 1 }}>
                  <tr className="bg-[#e5e7eb] font-bold text-xs text-gray-900 border-t border-gray-300">
                    <td colSpan={selectedStore === "all" || selectedStore === "cluster" ? 2 : 5} className="px-4 py-3.5 text-left uppercase tracking-wider font-bold">
                      Total
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold">{formatNum(adjIn)}</td>
                    <td className="px-4 py-3.5 text-right font-bold">{formatNum(totOutCash)}</td>
                    <td className="px-4 py-3.5 text-right font-bold">{formatNum(totOutRbl)}</td>
                    <td className="px-4 py-3.5 text-right font-bold">{formatNum(adjIn - totOut)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Security;

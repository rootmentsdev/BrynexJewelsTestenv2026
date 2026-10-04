import { useRef, useState, useEffect } from "react";
import Headers from "../components/Header.jsx";
import { Helmet } from "react-helmet";
import { Download, Printer, Loader2 } from "lucide-react";
import baseUrl from "../api/api.js";
import dataCache from "../utils/cache.js";
import { useSidebar } from "../hooks/useSidebar.js";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatNum = (num) => {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-IN");
};

const DayBook = () => {
  const isSidebarOpen = useSidebar();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);
  const [data3, setData3] = useState(null);
  const [mongoTransactions, setMongoTransactions] = useState([]);
  const currentusers = JSON.parse(localStorage.getItem("rootfinuser") || "{}");
  const abortControllerRef = useRef(null);
  const printRef = useRef(null);

  const handleFetch = async () => {
    const twsBase = "https://rentalapi.rootments.live/api/GetBooking";
    if (!fromDate || !toDate) {
      return alert("Select date range first");
    }

    const bookingU = `${twsBase}/GetBookingList?LocCode=${currentusers?.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
    const rentoutU = `${twsBase}/GetRentoutList?LocCode=${currentusers?.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
    const returnU = `${twsBase}/GetReturnList?LocCode=${currentusers?.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
    const deleteU = `${twsBase}/GetDeleteList?LocCode=${currentusers?.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
    const mongoU = `${baseUrl.baseUrl}user/Getpayment?LocCode=${currentusers?.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;

    // Check cache for all URLs
    const cachedBooking = dataCache.get(bookingU);
    const cachedRentout = dataCache.get(rentoutU);
    const cachedReturn = dataCache.get(returnU);
    const cachedDelete = dataCache.get(deleteU);
    const cachedMongo = dataCache.get(mongoU);

    if (cachedBooking && cachedRentout && cachedReturn && cachedDelete && cachedMongo) {
      setData(cachedBooking);
      setData1(cachedRentout);
      setData2(cachedReturn);
      setData3(cachedDelete);
      setMongoTransactions(cachedMongo.data || []);
      return;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);

    try {
      const [bookingRes, rentoutRes, returnRes, deleteRes, mongoRes] = await Promise.all([
        fetch(bookingU, { signal }),
        fetch(rentoutU, { signal }),
        fetch(returnU, { signal }),
        fetch(deleteU, { signal }),
        fetch(mongoU, { signal }),
      ]);

      const [bookingData, rentoutData, returnData, deleteData, mongoData] = await Promise.all([
        bookingRes.json(),
        rentoutRes.json(),
        returnRes.json(),
        deleteRes.json(),
        mongoRes.json(),
      ]);

      dataCache.set(bookingU, bookingData);
      dataCache.set(rentoutU, rentoutData);
      dataCache.set(returnU, returnData);
      dataCache.set(deleteU, deleteData);
      dataCache.set(mongoU, mongoData);

      setData(bookingData);
      setData1(rentoutData);
      setData2(returnData);
      setData3(deleteData);
      setMongoTransactions(mongoData.data || []);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Fetch error:", err);
        alert("Error fetching data. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const bookingList = (data?.dataSet?.data || []).map((item) => ({
      ...item,
      date: item.bookingDate?.split("T")[0],
      invoiceNo: item.invoiceNo,
      customerName: item.customerName,
      quantity: item.quantity || 1,
      Category: "Booking",
      SubCategory: "Advance",
      billValue: Number(item.invoiceAmount || 0),
      cash: Number(item.bookingCashAmount || 0),
      rbl: Number(item.rblRazorPay || 0),
      bank: Number(item.bookingBankAmount || 0),
      upi: Number(item.bookingUPIAmount || 0),
      amount:
        Number(item.bookingCashAmount || 0) +
        Number(item.rblRazorPay || 0) +
        Number(item.bookingBankAmount || 0) +
        Number(item.bookingUPIAmount || 0),
      totalTransaction:
        Number(item.bookingCashAmount || 0) +
        Number(item.rblRazorPay || 0) +
        Number(item.bookingBankAmount || 0) +
        Number(item.bookingUPIAmount || 0),
      source: "booking",
    }));

    const rentoutList = (data1?.dataSet?.data || []).map((item) => ({
      ...item,
      date: (item.rentOutDate || "").split("T")[0],
      invoiceNo: item.invoiceNo,
      customerName: item.customerName,
      quantity: item.quantity || 1,
      Category: "RentOut",
      SubCategory: "Security",
      billValue: Number(item.invoiceAmount || 0),
      cash: Number(item.rentoutCashAmount || 0),
      rbl: Number(item.rblRazorPay || 0),
      bank: Number(item.rentoutBankAmount || 0),
      upi: Number(item.rentoutUPIAmount || 0),
      amount:
        Number(item.rentoutCashAmount || 0) +
        Number(item.rblRazorPay || 0) +
        Number(item.rentoutBankAmount || 0) +
        Number(item.rentoutUPIAmount || 0),
      totalTransaction:
        Number(item.rentoutCashAmount || 0) +
        Number(item.rblRazorPay || 0) +
        Number(item.rentoutBankAmount || 0) +
        Number(item.rentoutUPIAmount || 0),
      source: "rentout",
    }));

    const returnList = (data2?.dataSet?.data || []).map((item) => {
      const returnCashAmount = -Math.abs(Number(item.returnCashAmount || 0));
      const returnRblAmount = -Math.abs(Number(item.rblRazorPay || 0));
      const returnBankAmount = returnRblAmount !== 0 ? 0 : -Math.abs(Number(item.returnBankAmount || 0));
      const returnUPIAmount = returnRblAmount !== 0 ? 0 : -Math.abs(Number(item.returnUPIAmount || 0));

      return {
        ...item,
        date: (item.returnedDate || item.returnDate || item.createdDate || "").split("T")[0],
        customerName: item.customerName || item.custName || item.customer || "",
        invoiceNo: item.invoiceNo,
        Category: "Return",
        SubCategory: "Security Refund",
        billValue: Number(item.invoiceAmount || 0),
        cash: returnCashAmount,
        rbl: returnRblAmount,
        bank: returnBankAmount,
        upi: returnUPIAmount,
        amount: returnCashAmount + returnRblAmount + returnBankAmount + returnUPIAmount,
        totalTransaction: returnCashAmount + returnRblAmount + returnBankAmount + returnUPIAmount,
        source: "return",
      };
    });

    const deleteList = (data3?.dataSet?.data || []).map((item) => {
      const deleteCashAmount = -Math.abs(Number(item.deleteCashAmount || 0));
      const deleteRblAmount = -Math.abs(Number(item.rblRazorPay || 0));
      const deleteBankAmount = deleteRblAmount !== 0 ? 0 : -Math.abs(Number(item.deleteBankAmount || 0));
      const deleteUPIAmount = deleteRblAmount !== 0 ? 0 : -Math.abs(Number(item.deleteUPIAmount || 0));

      return {
        ...item,
        date: item.cancelDate?.split("T")[0],
        invoiceNo: item.invoiceNo,
        customerName: item.customerName,
        Category: "Cancel",
        SubCategory: "Cancellation Refund",
        billValue: Number(item.invoiceAmount || 0),
        cash: deleteCashAmount,
        rbl: deleteRblAmount,
        bank: deleteBankAmount,
        upi: deleteUPIAmount,
        amount: deleteCashAmount + deleteRblAmount + deleteBankAmount + deleteUPIAmount,
        totalTransaction: deleteCashAmount + deleteRblAmount + deleteBankAmount + deleteUPIAmount,
        source: "deleted",
      };
    });

    const mongoList = (mongoTransactions || []).map((tx) => ({
      ...tx,
      date: tx.date?.split("T")[0] || "",
      Category: tx.type,
      SubCategory: tx.category,
      customerName: tx.customerName || "",
      billValue: Number(tx.billValue ?? tx.invoiceAmount ?? tx.amount),
      cash: Number(tx.cash),
      rbl: Number(tx.rbl || tx.rblRazorPay || 0),
      bank: Number(tx.bank),
      upi: Number(tx.upi),
      amount: Number(tx.cash) + Number(tx.rbl || 0) + Number(tx.bank) + Number(tx.upi),
      totalTransaction: Number(tx.cash) + Number(tx.rbl || 0) + Number(tx.bank) + Number(tx.upi),
      source: "mongo",
    }));

    const allTws = [...bookingList, ...rentoutList, ...returnList, ...deleteList];
    const allData = [...allTws, ...mongoList];

    // Remove duplicates
    const deduped = Array.from(
      new Map(
        allData.map((tx) => {
          const dateKey = new Date(tx.date).toISOString().split("T")[0];
          const key = `${tx.invoiceNo || tx._id || tx.locCode}-${dateKey}-${tx.Category || ""}`;
          return [key, tx];
        })
      ).values()
    );

    setAllTransactions(deduped);
  }, [data, data1, data2, data3, mongoTransactions]);

  const handleExportCSV = () => {
    if (allTransactions.length === 0) return alert("No transactions to export");
    const headers = [
      "Date",
      "Invoice No",
      "Customer Name",
      "Quantity",
      "Bill Value",
      "Cash",
      "RBL",
      "Bank",
      "UPI",
      "Total Amount",
    ];
    const rows = allTransactions.map((t) => [
      formatDate(t.date),
      t.invoiceNo || t._id || t.locCode || "-",
      t.customerName || "-",
      t.quantity || 1,
      t.billValue || 0,
      t.cash || 0,
      t.rbl || 0,
      t.bank || 0,
      t.upi || 0,
      t.amount || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DayBook_${fromDate}_to_${toDate}.csv`;
    link.click();
  };

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Rent out Report - ${fromDate} to ${toDate}</title>
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
          <h2>Rent out Report</h2>
          <p>Period: ${fromDate || "N/A"} to ${toDate || "N/A"}</p>
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
        <title>Rentout | RootFin</title>
      </Helmet>
      <div>
        <Headers title="Rent out Report" />
        <div className={`transition-all duration-300 min-h-screen bg-[#f8fafc] p-6 md:p-8 ${isSidebarOpen ? "ml-64" : "ml-0"}`}>
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 mb-6">
            {/* Left Controls: From Date, To Date, Fetch Data */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="from" className="text-xs font-semibold text-gray-500">
                  From Date
                </label>
                <input
                  type="date"
                  id="from"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-[38px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 shadow-sm focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="to" className="text-xs font-semibold text-gray-500">
                  To Date
                </label>
                <input
                  type="date"
                  id="to"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-[38px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 shadow-sm focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <button
                onClick={handleFetch}
                disabled={isLoading}
                className="h-[38px] px-5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isLoading ? "Fetching..." : "Fetch Data"}</span>
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
                    <th scope="col" className="px-4 py-3 text-left border-r border-[#333333]">
                      DATE
                    </th>
                    <th scope="col" className="px-4 py-3 text-left border-r border-[#333333]">
                      INVOICE NO.
                    </th>
                    <th scope="col" className="px-4 py-3 text-left border-r border-[#333333]">
                      CUSTOMER NAME
                    </th>
                    <th scope="col" className="px-4 py-3 text-center border-r border-[#333333]">
                      QUANTITY
                    </th>
                    <th scope="col" className="px-4 py-3 text-right border-r border-[#333333]">
                      BILL VALUE
                    </th>
                    <th scope="col" className="px-4 py-3 text-right border-r border-[#333333]">
                      CASH
                    </th>
                    <th scope="col" className="px-4 py-3 text-right border-r border-[#333333]">
                      RBL
                    </th>
                    <th scope="col" className="px-4 py-3 text-right border-r border-[#333333]">
                      BANK
                    </th>
                    <th scope="col" className="px-4 py-3 text-right border-r border-[#333333]">
                      UPI
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      TOTAL AMOUNT
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {allTransactions.length > 0 ? (
                    allTransactions.map((transaction, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-[#f8fafc] transition-colors">
                        <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{formatDate(transaction.date)}</td>
                        <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap font-mono">
                          {transaction.invoiceNo || transaction._id || transaction.locCode || "-"}
                        </td>
                        <td className="px-4 py-3.5 text-gray-900 font-medium whitespace-nowrap">
                          {transaction.customerName || "-"}
                        </td>
                        <td className="px-4 py-3.5 text-center text-gray-700">{transaction.quantity || 1}</td>
                        <td className="px-4 py-3.5 text-right text-gray-700 font-medium">
                          {formatNum(transaction.billValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-700 font-medium">
                          {formatNum(transaction.cash)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-700 font-medium">
                          {formatNum(transaction.rbl)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-700 font-medium">
                          {formatNum(transaction.bank)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-700 font-medium">
                          {formatNum(transaction.upi)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-900 font-semibold">
                          {formatNum(transaction.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center text-gray-500">
                        {!toDate || !fromDate ? "Select date range and click 'Fetch Data'" : "No transactions found"}
                      </td>
                    </tr>
                  )}
                </tbody>

                {allTransactions.length > 0 && (
                  <tfoot style={{ position: "sticky", bottom: 0, zIndex: 1 }}>
                    <tr className="bg-[#e5e7eb] font-bold text-xs text-gray-900 border-t border-gray-300">
                      <td colSpan="5" className="px-4 py-3.5 text-left uppercase tracking-wider font-bold">
                        Total
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        {formatNum(allTransactions.reduce((sum, item) => sum + Number(item.cash || 0), 0))}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        {formatNum(allTransactions.reduce((sum, item) => sum + Number(item.rbl || 0), 0))}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        {formatNum(allTransactions.reduce((sum, item) => sum + Number(item.bank || 0), 0))}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        {formatNum(allTransactions.reduce((sum, item) => sum + Number(item.upi || 0), 0))}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        {formatNum(allTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DayBook;
import React, { useState, useCallback, useMemo } from "react";
import Headers from "../components/Header.jsx";
import Select from "react-select";
import { CSVLink } from "react-csv";
import { Helmet } from "react-helmet";
import { FiDownload, FiChevronDown, FiChevronRight } from "react-icons/fi";
import { Loader2, Printer, RotateCcw } from "lucide-react";
import baseUrl from "../api/api";
import { useSidebar } from "../hooks/useSidebar.js";

const TWS_BASE = "https://rentalapi.rootments.live/api/GetBooking";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(n || 0);

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const STORE_LIST = [
  { locName: "G-Edappal",        locCode: "707" },
  { locName: "G-Edappally",      locCode: "702" },
  { locName: "G-Kalpetta",       locCode: "717" },
  { locName: "G-Kannur",         locCode: "716" },
  { locName: "G-Kottakkal",      locCode: "711" },
  { locName: "G-Kottayam",       locCode: "701" },
  { locName: "G-Manjeri",        locCode: "710" },
  { locName: "G-Mg Road",        locCode: "718" },
  { locName: "G-Palakkad",       locCode: "705" },
  { locName: "G-Perinthalmanna", locCode: "709" },
  { locName: "G-Perumbavoor",    locCode: "703" },
  { locName: "G-Thrissur",       locCode: "704" },
  { locName: "G-Vadakara",       locCode: "708" },
  { locName: "G-Chavakkad",      locCode: "706" },
  { locName: "G-Calicut",        locCode: "712" },
  { locName: "HEAD OFFICE01",    locCode: "759" },
  { locName: "Office",           locCode: "102" },
  { locName: "Production",       locCode: "101" },
  { locName: "SG-Trivandrum",    locCode: "700" },
  { locName: "Warehouse",        locCode: "858" },
  { locName: "WAREHOUSE",        locCode: "103" },
  { locName: "Z-Edappal",        locCode: "100" },
  { locName: "Z-Edapally",       locCode: "144" },
  { locName: "Z-Kottakkal",      locCode: "122" },
  { locName: "Z-Perinthalmanna", locCode: "133" },
];

const EXPENSE_CATEGORIES = new Set([
  "petty expenses","staff reimbursement","maintenance expenses","telephone internet",
  "utility bill","salary","rent","courier charges","asset purchase","promotion_services",
  "spot incentive","bulk amount transfer","other expenses","shoe sales return",
  "shirt sales return","dry cleaning","altration","material","travel exp","fuel exp",
  "waste management","water charges","printing stationary","staff welfare",
  "staff accommodation","incentive","write off",
]);

const CATEGORY_LABEL_MAP = {
  "dry cleaning":         "Dry Cleaning",
  "altration":            "Altration",
  "material":             "Material",
  "courier charges":      "Courier Charges",
  "maintenance expenses": "Repairs & Maintenance",
  "travel exp":           "Travel Exp",
  "fuel exp":             "Fuel Exp",
  "petty expenses":       "Office Expense",
  "telephone internet":   "Internet Expense",
  "utility bill":         "Electricity Charges",
  "waste management":     "Waste Management",
  "water charges":        "Water Charges",
  "salary":               "Salary / Salary Advance",
  "printing stationary":  "Printing & Stationary",
  "staff welfare":        "Staff Welfare",
  "staff reimbursement":  "Staff Accommodation",
  "rent":                 "Rent",
  "asset purchase":       "Asset Purchase",
  "incentive":            "Incentive",
  "spot incentive":       "Incentive",
  "other expenses":       "Refund",
  "bulk amount transfer": "Cash to Bank",
  "write off":            "Write Off",
  "promotion_services":   "Promotion / Services",
  "shoe sales return":    "Shoe Sales Return",
  "shirt sales return":   "Shirt Sales Return",
};

const getCategoryLabel = (cat) =>
  CATEGORY_LABEL_MAP[(cat || "").toLowerCase().trim()] || cat;

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

export default function IncomeExpenseReport() {
  const isSidebarOpen = useSidebar();
  const user = JSON.parse(localStorage.getItem("rootfinuser")) || {};
  const isAdmin = (user.power || "").toLowerCase() === "admin";
  const isClusterManager = (user.role || "").toLowerCase() === "cluster_manager";
  const clusterAllowedLocCodes = user.allowedLocCodes || [];
  const canSelectStore = isAdmin || isClusterManager;

  const [fromDate, setFromDate] = useState(firstOfMonth());
  const [toDate, setToDate] = useState(today());
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [selectedStore, setSelectedStore] = useState("all");
  const [incomeRows, setIncomeRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [expanded, setExpanded] = useState({});

  const locCode = canSelectStore ? selectedStore : (user.locCode || "");
  const twsLocCode = (locCode === "all" || !locCode) ? (user.locCode || "") : locCode;

  const ALL_LOC_CODES = useMemo(() => {
    return isClusterManager
      ? clusterAllowedLocCodes
      : STORE_LIST.map((s) => s.locCode);
  }, [isClusterManager, clusterAllowedLocCodes]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setHasFetched(true);
    setIncomeRows([]);
    setExpenseRows([]);
    setExpanded({});
    try {
      const API = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

      const safeFetch = async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            console.warn(`TWS fetch failed (${res.status}): ${url}`);
            return {};
          }
          return await res.json();
        } catch (e) {
          console.warn("TWS fetch error:", url, e.message);
          return {};
        }
      };

      const locCodesToFetch = (locCode === "all" || !locCode) ? ALL_LOC_CODES : [twsLocCode];

      const twsResults = await Promise.all(
        locCodesToFetch.map((lc) =>
          Promise.all([
            safeFetch(`${TWS_BASE}/GetBookingList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
            safeFetch(`${TWS_BASE}/GetRentoutList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
            safeFetch(`${TWS_BASE}/GetReturnList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
            safeFetch(`${TWS_BASE}/GetDeleteList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
          ])
        )
      );

      const bookingData = { dataSet: { data: twsResults.flatMap((r) => r[0]?.dataSet?.data || []) } };
      const rentoutData = { dataSet: { data: twsResults.flatMap((r) => r[1]?.dataSet?.data || []) } };
      const returnData  = { dataSet: { data: twsResults.flatMap((r) => r[2]?.dataSet?.data || []) } };
      const cancelData  = { dataSet: { data: twsResults.flatMap((r) => r[3]?.dataSet?.data || []) } };

      const mongoRes = await fetch(`${API}/user/Getpayment?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`);
      let mongoJson = mongoRes.ok ? await mongoRes.json() : {};

      if (isClusterManager && (locCode === "all" || !locCode)) {
        const mongoResults = await Promise.all(
          clusterAllowedLocCodes.map((lc) =>
            fetch(`${API}/user/Getpayment?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`)
              .then((r) => (r.ok ? r.json() : {}))
              .catch(() => ({}))
          )
        );
        const merged = mongoResults.flatMap((r) => (Array.isArray(r) ? r : r?.data || []));
        mongoJson = { data: merged };
      }

      const bookingList = (bookingData?.dataSet?.data || []).map((item) => ({
        date: (item.bookingDate || "").split("T")[0],
        invoiceNo: item.invoiceNo,
        customerName: item.customerName || "",
        category: "Booking",
        subCategory: "Advance",
        cash: Number(item.bookingCashAmount || 0),
        rbl:  Number(item.rblRazorPay || 0),
        bank: Number(item.bookingBankAmount || 0),
        upi:  Number(item.bookingUPIAmount || 0),
        locCode: item.locCode || locCode,
      }));

      const rentoutList = [];
      (rentoutData?.dataSet?.data || []).forEach((item) => {
        const security       = Number(item.securityAmount || 0);
        const advance        = Number(item.advanceAmount || 0);
        const balancePayable = Number(item.invoiceAmount || 0) - advance;
        const cash  = Number(item.rentoutCashAmount || 0);
        const rbl   = Number(item.rblRazorPay || 0);
        const bank  = Number(item.rentoutBankAmount || 0);
        const upi   = Number(item.rentoutUPIAmount || 0);
        const base  = {
          date: (item.rentOutDate || "").split("T")[0],
          invoiceNo: item.invoiceNo,
          customerName: item.customerName || "",
          category: "RentOut",
          locCode: item.locCode || locCode,
          cash, rbl, bank, upi,
        };
        rentoutList.push({ ...base, subCategory: "Security", amount: security });
        rentoutList.push({ ...base, subCategory: "Balance Payable", amount: balancePayable });
      });

      const returnList = (returnData?.dataSet?.data || []).map((item) => {
        const rbl = -Math.abs(Number(item.rblRazorPay || 0));
        return {
          date: (item.returnedDate || item.returnDate || "").split("T")[0],
          invoiceNo: item.invoiceNo,
          customerName: item.customerName || "",
          category: "Return",
          subCategory: "Security Refund",
          cash: -Math.abs(Number(item.returnCashAmount || 0)),
          rbl,
          bank: rbl !== 0 ? 0 : -Math.abs(Number(item.returnBankAmount || 0)),
          upi:  rbl !== 0 ? 0 : -Math.abs(Number(item.returnUPIAmount || 0)),
          locCode: item.locCode || locCode,
        };
      });

      const cancelList = (cancelData?.dataSet?.data || []).map((item) => {
        const rbl = -Math.abs(Number(item.rblRazorPay || 0));
        return {
          date: (item.cancelDate || "").split("T")[0],
          invoiceNo: item.invoiceNo,
          customerName: item.customerName || "",
          category: "Cancel",
          subCategory: "Cancellation Refund",
          cash: -Math.abs(Number(item.deleteCashAmount || 0)),
          rbl,
          bank: rbl !== 0 ? 0 : -Math.abs(Number(item.deleteBankAmount || 0)),
          upi:  rbl !== 0 ? 0 : -Math.abs(Number(item.deleteUPIAmount || 0)),
          locCode: item.locCode || locCode,
        };
      });

      const mongoTxns = Array.isArray(mongoJson) ? mongoJson : mongoJson.data || [];
      const mongoIncome = [];
      const mongoExpense = [];

      mongoTxns.forEach((t) => {
        const tp  = (t.type || "").toLowerCase();
        const sub = (t.subCategory || "").toLowerCase().trim();
        const cat = (t.category || "").toLowerCase().trim();
        const inv = (t.invoiceNo || "").toUpperCase();
        const isShoeOrShirtSale =
          sub === "shoe sales" || sub === "shirt sales" || sub === "mixed sales" ||
          cat === "shoe sales" || cat === "shirt sales" || cat === "mixed sales";
        const isReturnInvoice = inv.startsWith("RTN-") || inv.startsWith("RET-");
        if (!isShoeOrShirtSale && !isReturnInvoice && (inv.startsWith("INV-") || inv.startsWith("RTN-") || inv.startsWith("RET-"))) return;

        const normalizedCategory = isShoeOrShirtSale ? "Sales" : isReturnInvoice ? "Return Invoice" : (t.category || "Uncategorized");
        const normalizedSubCategory = isShoeOrShirtSale ? (t.subCategory || t.category || "Sales") : isReturnInvoice ? (t.subCategory || "Sales Return") : (t.subCategory || t.category || "");

        const row = {
          date: (t.date || "").split("T")[0],
          invoiceNo: t.invoiceNo || t.locCode || "",
          customerName: t.customerName || "",
          category: normalizedCategory,
          subCategory: normalizedSubCategory,
          remark: t.remark || t.remarks || "",
          cash: Number(t.cash || 0),
          rbl:  Number(t.rbl || t.rblRazorPay || 0),
          bank: Number(t.bank || 0),
          upi:  Number(t.upi || 0),
          locCode: t.locCode || locCode,
        };

        if (isReturnInvoice) mongoExpense.push(row);
        else if (tp === "income") mongoIncome.push(row);
        else if (tp === "expense") mongoExpense.push(row);
        else if (EXPENSE_CATEGORIES.has(cat)) mongoExpense.push(row);
      });

      setIncomeRows([...bookingList, ...rentoutList, ...mongoIncome]);
      setExpenseRows([...returnList, ...cancelList, ...mongoExpense]);
    } catch (e) {
      console.error(e);
      alert("Error fetching income/expense records: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, locCode, twsLocCode, ALL_LOC_CODES, isClusterManager, clusterAllowedLocCodes]);

  const buildGrouped = (rows) => {
    const map = {};
    rows.forEach((t) => {
      const cat = t.category || "Uncategorized";
      const sub = t.subCategory || cat;
      if (filterCategory !== "All Categories" && filterCategory !== cat) return;
      if (!map[cat]) map[cat] = { subCategories: {}, cash: 0, rbl: 0, bank: 0, upi: 0 };
      if (!map[cat].subCategories[sub]) map[cat].subCategories[sub] = { transactions: [], cash: 0, rbl: 0, bank: 0, upi: 0 };

      const isRentOut = cat === "RentOut";
      const subG = map[cat].subCategories[sub];
      subG.transactions.push(t);

      if (isRentOut) {
        subG.cash += t.amount || 0;
        map[cat].cash += t.amount || 0;
      } else {
        subG.cash += t.cash || 0;
        subG.rbl  += t.rbl  || 0;
        subG.bank += t.bank || 0;
        subG.upi  += t.upi  || 0;
        map[cat].cash += t.cash || 0;
        map[cat].rbl  += t.rbl  || 0;
        map[cat].bank += t.bank || 0;
        map[cat].upi  += t.upi  || 0;
      }
    });
    return map;
  };

  const incomeGrouped  = useMemo(() => buildGrouped(incomeRows), [incomeRows, filterCategory]);
  const expenseGrouped = useMemo(() => buildGrouped(expenseRows), [expenseRows, filterCategory]);

  const sumGroup = (grouped) =>
    Object.values(grouped).reduce(
      (s, g) => ({ cash: s.cash + g.cash, rbl: s.rbl + g.rbl, bank: s.bank + g.bank, upi: s.upi + g.upi }),
      { cash: 0, rbl: 0, bank: 0, upi: 0 }
    );

  const incTotals = useMemo(() => sumGroup(incomeGrouped), [incomeGrouped]);
  const expTotals = useMemo(() => sumGroup(expenseGrouped), [expenseGrouped]);
  const incTotal  = incTotals.cash + incTotals.rbl + incTotals.bank + incTotals.upi;
  const expTotal  = expTotals.cash + expTotals.rbl + expTotals.bank + expTotals.upi;
  const netCash   = incTotals.cash + expTotals.cash;
  const netRbl    = incTotals.rbl  + expTotals.rbl;
  const netBank   = incTotals.bank + expTotals.bank;
  const netUpi    = incTotals.upi  + expTotals.upi;
  const netTotal  = incTotal + expTotal;

  const allCategories = useMemo(() => {
    return [...new Set([...incomeRows, ...expenseRows].map((t) => t.category || "Uncategorized"))];
  }, [incomeRows, expenseRows]);

  const categoryOptions = useMemo(() => [
    { value: "All Categories", label: "All Categories" },
    ...allCategories.map((c) => ({ value: c, label: getCategoryLabel(c) })),
  ], [allCategories]);

  const storeSelectOptions = useMemo(() => [
    { value: "all", label: isClusterManager ? "All My Stores" : "All Stores" },
    ...(isClusterManager
      ? STORE_LIST.filter((s) => clusterAllowedLocCodes.includes(s.locCode))
      : STORE_LIST
    ).map((s) => ({ value: s.locCode, label: s.locName })),
  ], [isClusterManager, clusterAllowedLocCodes]);

  const toggleExpand = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const getBranchName = (lc) => {
    const store = STORE_LIST.find((s) => s.locCode === String(lc));
    return store ? store.locName : lc || "-";
  };

  const showBranch = selectedStore === "all" || (isClusterManager && selectedStore === "all");

  const csvExportData = useMemo(() => {
    const list = [];
    incomeRows.forEach((t) => {
      list.push({
        Type: "Income",
        Date: t.date || "-",
        Category: getCategoryLabel(t.category),
        "Sub Category": getCategoryLabel(t.subCategory),
        "Invoice / Item": t.invoiceNo || "-",
        Customer: t.customerName || "-",
        Remarks: t.remark || "-",
        Branch: getBranchName(t.locCode),
        Cash: t.cash || 0,
        Razorpay: t.rbl || 0,
        Bank: t.bank || 0,
        UPI: t.upi || 0,
        Total: (t.cash || 0) + (t.rbl || 0) + (t.bank || 0) + (t.upi || 0),
      });
    });
    expenseRows.forEach((t) => {
      list.push({
        Type: "Expense",
        Date: t.date || "-",
        Category: getCategoryLabel(t.category),
        "Sub Category": getCategoryLabel(t.subCategory),
        "Invoice / Item": t.invoiceNo || "-",
        Customer: t.customerName || "-",
        Remarks: t.remark || "-",
        Branch: getBranchName(t.locCode),
        Cash: t.cash || 0,
        Razorpay: t.rbl || 0,
        Bank: t.bank || 0,
        UPI: t.upi || 0,
        Total: (t.cash || 0) + (t.rbl || 0) + (t.bank || 0) + (t.upi || 0),
      });
    });
    return list;
  }, [incomeRows, expenseRows]);

  const renderCategoryRows = (grouped, typeLabel, isIncome) =>
    Object.keys(grouped).map((cat) => {
      const g = grouped[cat];
      const catTotal = g.cash + g.rbl + g.bank + g.upi;
      const catKey = `${typeLabel}-${cat}`;
      const isCatExp = !!expanded[catKey];
      const sign = (v) => (isIncome ? fmt(v) : v !== 0 ? `-${fmt(Math.abs(v))}` : "-");

      return [
        // Category header row (clickable)
        <tr
          key={catKey}
          className="cursor-pointer bg-purple-50/70 hover:bg-purple-100/70 transition-colors border-b border-purple-100 select-none"
          onClick={() => toggleExpand(catKey)}
        >
          <td className="px-3 py-2.5 text-center w-10 text-[#9333ea]">
            {isCatExp ? <FiChevronDown className="inline w-4 h-4" /> : <FiChevronRight className="inline w-4 h-4" />}
          </td>
          <td className="px-3 py-2.5 text-sm font-semibold text-gray-900" colSpan={showBranch ? 4 : 3}>
            {getCategoryLabel(cat)}
          </td>
          <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-800">{g.cash !== 0 ? sign(g.cash) : "-"}</td>
          <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-800">{g.rbl  !== 0 ? sign(g.rbl)  : "-"}</td>
          <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-800">{g.bank !== 0 ? sign(g.bank) : "-"}</td>
          <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-800">{g.upi  !== 0 ? sign(g.upi)  : "-"}</td>
          <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900">
            {isIncome ? fmt(catTotal) : `-${fmt(Math.abs(catTotal))}`}
          </td>
        </tr>,

        // SubCategory rows
        ...(isCatExp
          ? Object.keys(g.subCategories).map((sub) => {
              const sg = g.subCategories[sub];
              const subTotal = sg.cash + sg.rbl + sg.bank + sg.upi;
              const subKey = `${catKey}-${sub}`;
              const isSubExp = !!expanded[subKey];

              const subCats = Object.keys(g.subCategories);
              const isRedundantSub =
                subCats.length === 1 && sub.toLowerCase().trim() === cat.toLowerCase().trim();

              const txRows = sg.transactions.map((t, i) => {
                const dateStr = t.date
                  ? new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : "-";
                const isRentOut = cat === "RentOut";
                const isIncentiveCat = cat.toLowerCase() === "incentive";
                const tCash = isRentOut ? t.amount || 0 : t.cash || 0;
                return (
                  <tr key={`${subKey}-${i}`} className="bg-gray-50/50 hover:bg-purple-50/30 transition-colors border-b border-gray-100 text-xs">
                    <td className="px-3 py-2 text-gray-400 pl-8">{dateStr}</td>
                    <td className="px-3 py-2 text-gray-700 font-mono">{t.invoiceNo || t.customerName || "-"}</td>
                    <td className="px-3 py-2 text-gray-600 font-medium">
                      {isIncentiveCat ? t.remark || t.customerName || "-" : t.customerName || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-400 italic max-w-[160px] truncate" title={t.remark || ""}>
                      {t.remark || "-"}
                    </td>
                    {showBranch && (
                      <td className="px-3 py-2">
                        <span className="inline-block px-2 py-0.5 text-[11px] font-medium text-purple-700 bg-purple-50 rounded-md">
                          {getBranchName(t.locCode)}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2 text-right text-gray-700">{tCash !== 0 ? fmt(tCash) : "-"}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{!isRentOut && t.rbl !== 0 ? fmt(t.rbl) : "-"}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{!isRentOut && t.bank !== 0 ? fmt(t.bank) : "-"}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{!isRentOut && t.upi !== 0 ? fmt(t.upi) : "-"}</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                );
              });

              if (isRedundantSub) {
                return isCatExp ? txRows : [];
              }

              return [
                <tr
                  key={subKey}
                  className="cursor-pointer bg-purple-50/30 hover:bg-purple-50/60 transition-colors border-b border-purple-50 select-none text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(subKey);
                  }}
                >
                  <td className="px-3 py-2 text-center w-10 pl-6 text-[#9333ea]">
                    {isSubExp ? <FiChevronDown className="inline w-3.5 h-3.5" /> : <FiChevronRight className="inline w-3.5 h-3.5" />}
                  </td>
                  <td className="px-3 py-2 text-gray-700 font-medium pl-4" colSpan={showBranch ? 4 : 3}>
                    {getCategoryLabel(sub)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">{sg.cash !== 0 ? sign(sg.cash) : "-"}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{sg.rbl  !== 0 ? sign(sg.rbl)  : "-"}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{sg.bank !== 0 ? sign(sg.bank) : "-"}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{sg.upi  !== 0 ? sign(sg.upi)  : "-"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">
                    {isIncome ? fmt(subTotal) : `-${fmt(Math.abs(subTotal))}`}
                  </td>
                </tr>,
                ...(isSubExp ? txRows : []),
              ];
            }).flat()
          : []),
      ];
    });

  const hasData = !loading && (Object.keys(incomeGrouped).length > 0 || Object.keys(expenseGrouped).length > 0);

  return (
    <>
      <Helmet>
        <title>Income &amp; Expenses Report | RootFin</title>
      </Helmet>

      <div className="min-h-screen bg-[#f8f9fa]">
        <Headers title={"Income & Expenses Report"} />

        <div
          className={`transition-all duration-300 ${
            isSidebarOpen ? "ml-[240px]" : "ml-0"
          }`}
        >
          <div className="p-6 md:p-8 space-y-6">
            {/* Top Control & Filter Container */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex flex-wrap items-end justify-between gap-4">
                {/* Left Controls */}
                <div className="flex flex-wrap items-end gap-4">
                  {/* From Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 tracking-wide">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-44 px-3.5 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all"
                    />
                  </div>

                  {/* To Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 tracking-wide">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-44 px-3.5 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all"
                    />
                  </div>

                  {/* Category Selector */}
                  <div className="flex flex-col gap-1.5 min-w-[190px]">
                    <label className="text-xs font-semibold text-gray-600 tracking-wide">
                      Category
                    </label>
                    <Select
                      options={categoryOptions}
                      value={categoryOptions.find((c) => c.value === filterCategory)}
                      onChange={(opt) => setFilterCategory(opt.value)}
                      styles={customSelectStyles}
                    />
                  </div>

                  {/* Store Selector */}
                  {canSelectStore && (
                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                      <label className="text-xs font-semibold text-gray-600 tracking-wide">
                        Store
                      </label>
                      <Select
                        options={storeSelectOptions}
                        value={storeSelectOptions.find((s) => s.value === selectedStore) || {
                          value: selectedStore,
                          label: selectedStore,
                        }}
                        onChange={(opt) => setSelectedStore(opt.value)}
                        isSearchable
                        placeholder="Select Store..."
                        styles={customSelectStyles}
                      />
                    </div>
                  )}

                  {/* Apply Filter Button */}
                  <button
                    type="button"
                    onClick={fetchData}
                    disabled={loading}
                    className="px-6 py-2 text-sm font-medium text-white bg-[#9333ea] hover:bg-[#7e22ce] active:bg-[#6b21a8] rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{loading ? "Applying..." : "Apply Filter"}</span>
                  </button>

                  {/* Reset Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate(firstOfMonth());
                      setToDate(today());
                      setFilterCategory("All Categories");
                      setSelectedStore("all");
                      setIncomeRows([]);
                      setExpenseRows([]);
                      setExpanded({});
                      setHasFetched(false);
                    }}
                    className="p-2.5 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors cursor-pointer"
                    title="Reset Filters"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Right Controls: Export CSV & Print PDF */}
                <div className="flex items-center gap-3">
                  {csvExportData.length > 0 ? (
                    <CSVLink
                      data={csvExportData}
                      filename={`income-expense-report-${fromDate}-to-${toDate}.csv`}
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
                    disabled={!hasData}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border flex items-center gap-2 transition-all ${
                      hasData
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
            {hasData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1.5">
                    Total Income
                  </div>
                  <div className="text-2xl lg:text-3xl font-bold text-emerald-600">
                    {fmt(incTotal)}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1.5">
                    Total Expenses
                  </div>
                  <div className="text-2xl lg:text-3xl font-bold text-rose-600">
                    {fmt(Math.abs(expTotal))}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wider text-purple-700 mb-1.5">
                    Net Difference
                  </div>
                  <div className={`text-2xl lg:text-3xl font-bold ${netTotal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmt(netTotal)}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Total Transactions
                  </div>
                  <div className="text-2xl lg:text-3xl font-bold text-gray-900">
                    {incomeRows.length + expenseRows.length}
                  </div>
                </div>
              </div>
            )}

            {/* Report Table */}
            <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#18181b] text-white select-none">
                    <tr>
                      <th className="py-3.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider border-r border-zinc-700/60 w-12"></th>
                      <th className="py-3.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider border-r border-zinc-700/60">
                        Category / Sub Category
                      </th>
                      <th className="py-3.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider border-r border-zinc-700/60">
                        Customer
                      </th>
                      <th className="py-3.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider border-r border-zinc-700/60">
                        Remarks
                      </th>
                      {showBranch && (
                        <th className="py-3.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider border-r border-zinc-700/60">
                          Branch
                        </th>
                      )}
                      <th className="py-3.5 px-3 text-right text-[11px] font-bold uppercase tracking-wider border-r border-zinc-700/60">
                        Cash
                      </th>
                      <th className="py-3.5 px-3 text-right text-[11px] font-bold uppercase tracking-wider border-r border-zinc-700/60">
                        Razorpay
                      </th>
                      <th className="py-3.5 px-3 text-right text-[11px] font-bold uppercase tracking-wider border-r border-zinc-700/60">
                        Bank
                      </th>
                      <th className="py-3.5 px-3 text-right text-[11px] font-bold uppercase tracking-wider border-r border-zinc-700/60">
                        UPI
                      </th>
                      <th className="py-3.5 px-3 text-right text-[11px] font-bold uppercase tracking-wider bg-zinc-900">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {loading && (
                      <tr>
                        <td colSpan={showBranch ? 10 : 9} className="py-20 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                            <span className="text-sm font-medium">Fetching income &amp; expenses data...</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading && !hasData && incomeRows.length === 0 && expenseRows.length === 0 && (
                      <tr>
                        <td colSpan={showBranch ? 10 : 9} className="py-24 text-center">
                          <p className="text-sm font-medium text-gray-500">
                            {hasFetched ? "No records found for the selected criteria" : "Select date range and click Apply Filter"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Detailed overview of Income &amp; Expense Report
                          </p>
                        </td>
                      </tr>
                    )}

                    {!loading && !hasData && (incomeRows.length > 0 || expenseRows.length > 0) && (
                      <tr>
                        <td colSpan={showBranch ? 10 : 9} className="py-16 text-center text-gray-500 text-sm">
                          No results match the selected category filter.
                        </td>
                      </tr>
                    )}

                    {hasData && (
                      <>
                        {/* INCOME SECTION */}
                        <tr className="bg-emerald-500/15 border-y border-emerald-200">
                          <td colSpan={showBranch ? 10 : 9} className="px-4 py-2.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                            INCOME
                          </td>
                        </tr>
                        {renderCategoryRows(incomeGrouped, "INCOME", true)}
                        <tr className="bg-emerald-50/80 border-t-2 border-emerald-300 font-semibold text-xs">
                          <td colSpan={showBranch ? 5 : 4} className="px-4 py-2.5 text-left uppercase text-emerald-900 font-bold tracking-wide">
                            Income Total
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-800">{incTotals.cash !== 0 ? fmt(incTotals.cash) : "-"}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-800">{incTotals.rbl  !== 0 ? fmt(incTotals.rbl)  : "-"}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-800">{incTotals.bank !== 0 ? fmt(incTotals.bank) : "-"}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-800">{incTotals.upi  !== 0 ? fmt(incTotals.upi)  : "-"}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-900 text-sm">{fmt(incTotal)}</td>
                        </tr>

                        {/* EXPENSES SECTION */}
                        <tr className="bg-rose-500/15 border-y border-rose-200">
                          <td colSpan={showBranch ? 10 : 9} className="px-4 py-2.5 text-xs font-bold text-rose-900 uppercase tracking-wider">
                            EXPENSES
                          </td>
                        </tr>
                        {renderCategoryRows(expenseGrouped, "EXPENSE", false)}
                        <tr className="bg-rose-50/80 border-t-2 border-rose-300 font-semibold text-xs">
                          <td colSpan={showBranch ? 5 : 4} className="px-4 py-2.5 text-left uppercase text-rose-900 font-bold tracking-wide">
                            Expense Total
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-rose-800">{expTotals.cash !== 0 ? `-${fmt(Math.abs(expTotals.cash))}` : "-"}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-rose-800">{expTotals.rbl  !== 0 ? `-${fmt(Math.abs(expTotals.rbl))}` : "-"}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-rose-800">{expTotals.bank !== 0 ? `-${fmt(Math.abs(expTotals.bank))}` : "-"}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-rose-800">{expTotals.upi  !== 0 ? `-${fmt(Math.abs(expTotals.upi))}` : "-"}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-rose-900 text-sm">{expTotal !== 0 ? `-${fmt(Math.abs(expTotal))}` : "-"}</td>
                        </tr>

                        {/* NET DIFFERENCE SECTION */}
                        <tr className="bg-purple-100/80 border-t-2 border-purple-300 font-bold text-xs">
                          <td colSpan={showBranch ? 5 : 4} className="px-4 py-3 text-left uppercase text-purple-950 tracking-wide font-extrabold text-sm">
                            Net Difference Total
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-purple-900">{netCash !== 0 ? fmt(netCash) : "-"}</td>
                          <td className="px-3 py-3 text-right font-bold text-purple-900">{netRbl  !== 0 ? fmt(netRbl)  : "-"}</td>
                          <td className="px-3 py-3 text-right font-bold text-purple-900">{netBank !== 0 ? fmt(netBank) : "-"}</td>
                          <td className="px-3 py-3 text-right font-bold text-purple-900">{netUpi  !== 0 ? fmt(netUpi)  : "-"}</td>
                          <td className="px-3 py-3 text-right font-extrabold text-white bg-[#9333ea] text-sm">
                            {fmt(netTotal)}
                          </td>
                        </tr>
                      </>
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
}

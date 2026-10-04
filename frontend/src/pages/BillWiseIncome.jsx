import { CSVLink } from "react-csv";
import Headers from '../components/Header.jsx';
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Select from "react-select";
import useFetch from '../hooks/useFetch.jsx';
import baseUrl from '../api/api.js';
import { Minus, Plus } from "lucide-react";
import { useEnterToSave } from "../hooks/useEnterToSave";

const headers = [
    { label: "Date", key: "date" },
    { label: "Invoice No", key: "invoiceNo" },
    { label: "Customer Name", key: "customerName" },
    { label: "Category", key: "Category" },
    { label: "Sub Category", key: "SubCategory" },
    { label: "Remarks", key: "remarks" },
    { label: "Amount", key: "amount" },
    { label: "Total Transaction", key: "totalTransaction" },
    { label: "Discount", key: "discountAmount" },
    { label: "Bill Value", key: "billValue" },
    { label: "Cash", key: "cash" },
    { label: "Razorpay", key: "rbl" },
    { label: "Card/Bank", key: "bank" },
    { label: "UPI", key: "upi" },
];

const categories = [
    { value: "all", label: "All Categories" },
    { value: "booking", label: "Booking" },
    { value: "RentOut", label: "Rent Out" },
    { value: "Refund", label: "Refund" },
    { value: "Return", label: "Return" },
    { value: "Cancel", label: "Cancel" },
    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
    { value: "money transfer", label: "Cash to Bank" },
];

const subCategories = [
    { value: "all", label: "All Sub Categories" },
    { value: "advance", label: "Advance" },
    { value: "Balance Payable", label: "Balance Payable" },
    { value: "security", label: "Security" },
    { value: "cancellation Refund", label: "Cancellation Refund" },
    { value: "security Refund", label: "Security Refund" },
    { value: "compensation", label: "Compensation" },
    { value: "petty expenses", label: "Petty Expenses" },
    { value: "shoe sales", label: "Shoe Sales" },
    { value: "shirt sales", label: "Shirt Sales" },
    { value: "mixed sales", label: "Mixed Sales (Shoes & Shirts)" },
    { value: "bulk amount transfer", label: "Bulk Amount Transfer" }
];

// Maps raw DB category/subCategory values → human-readable labels
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
const getCatLabel = (val) => CATEGORY_LABEL_MAP[(val || "").toLowerCase().trim()] || val;

const denominations = [
    { label: "500", value: 500 },
    { label: "200", value: 200 },
    { label: "100", value: 100 },
    { label: "50", value: 50 },
    { label: "20", value: 20 },
    { label: "10", value: 10 },
    { label: "Coins", value: 1 },
];

const customSelectStyles = {
    control: (provided, state) => ({
        ...provided,
        backgroundColor: '#ffffff',
        borderColor: state.isFocused ? '#18181b' : '#e2e8f0',
        borderRadius: '0px',
        padding: '1px 2px',
        minHeight: '38px',
        boxShadow: state.isFocused ? '0 0 0 1px #18181b' : 'none',
        '&:hover': {
            borderColor: '#cbd5e1',
        },
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#1e293b',
        cursor: 'pointer',
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected ? '#18181b' : state.isFocused ? '#f1f5f9' : '#ffffff',
        color: state.isSelected ? '#ffffff' : '#334155',
        fontSize: '0.875rem',
        cursor: 'pointer',
    }),
    menu: (provided) => ({
        ...provided,
        borderRadius: '0px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        zIndex: 50,
        overflow: 'hidden',
    }),
};

const DayBookInc = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        const handleSidebarChange = (e) => {
            if (e.detail && typeof e.detail.isOpen === "boolean") {
                setIsSidebarOpen(e.detail.isOpen);
            }
        };
        window.addEventListener("sidebar-changed", handleSidebarChange);
        return () => window.removeEventListener("sidebar-changed", handleSidebarChange);
    }, []);

    const [preOpen, setPreOpen] = useState(null);
    const [preOpen1, setPreOpen1] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Edit functionality states
    const [editingIndex, setEditingIndex] = useState(null);
    const [editedTransaction, setEditedTransaction] = useState({});
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Store for edited transactions to override TWS data
    const [editedTransactionsMap, setEditedTransactionsMap] = useState({});

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState(categories[0]);
    const [selectedSubCategory, setSelectedSubCategory] = useState(subCategories[0]);
    
    const [quantities, setQuantities] = useState(() => {
        const saved = localStorage.getItem(`denominations_${new Date().toISOString().split("T")[0]}_${JSON.parse(localStorage.getItem("rootfinuser"))?.locCode}`);
        return saved ? JSON.parse(saved) : Array(denominations.length).fill("");
    });

    const currentusers = JSON.parse(localStorage.getItem("rootfinuser"));
    const showAction = (currentusers?.power || "").toLowerCase() === "admin";

    const date1 = new Date();
    const previousDate = new Date(date1);
    previousDate.setDate(date1.getDate() - 1);
    const TodayDate = `${String(date1.getDate()).padStart(2, '0')}-${String(date1.getMonth() + 1).padStart(2, '0')}-${date1.getFullYear()}`;
    const previousDate1 = `${String(previousDate.getDate()).padStart(2, '0')}-${String(previousDate.getMonth() + 1).padStart(2, '0')}-${previousDate.getFullYear()}`;
    const date = TodayDate;

    const currentDate = new Date().toISOString().split("T")[0];
    const formatDate = (inputDate) => {
        const [day, month, year] = inputDate.split("-");
        return `${year}-${month}-${day}`;
    };

    const formattedDate = formatDate(previousDate1);

    const displayFormattedDate = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date());

    const apiUrl = `https://rentalapi.rootments.live/api/GetBooking/GetBookingList?LocCode=${currentusers?.locCode}&DateFrom=${currentDate}&DateTo=${currentDate}`;
    const apiurl1 = `https://rentalapi.rootments.live/api/GetBooking/GetRentoutList?LocCode=${currentusers?.locCode}&DateFrom=${currentDate}&DateTo=${currentDate}`;
    const apiUrl2 = `https://rentalapi.rootments.live/api/GetBooking/GetReturnList?LocCode=${currentusers?.locCode}&DateFrom=${currentDate}&DateTo=${currentDate}`;
    const apiUrl3 = `https://rentalapi.rootments.live/api/GetBooking/GetDeleteList?LocCode=${currentusers?.locCode}&DateFrom=${currentDate}&DateTo=${currentDate}`;
    const apiUrl4_fallback = `${baseUrl.baseUrl}user/Getpayment?LocCode=${currentusers?.locCode}&DateFrom=${currentDate}&DateTo=${currentDate}`;
    const apiUrl5 = `${baseUrl.baseUrl}user/saveCashBank`;
    const apiUrl6 = `${baseUrl.baseUrl}user/getsaveCashBank?locCode=${currentusers?.locCode}&date=${formattedDate}`;
    const apiUrl7 = `${baseUrl.baseUrl}user/getsaveCashBank?locCode=${currentusers?.locCode}&date=${currentDate}`;

    const locCode = currentusers?.locCode;
    const email = currentusers?.email;

    const printRef = useRef(null);
    const csvLinkRef = useRef(null);

    const handlePrint = () => {
        window.print();
    };

    const fetchOptions = useMemo(() => ({}), []);

    const { data } = useFetch(apiUrl, fetchOptions);
    const { data: data1 } = useFetch(apiurl1, fetchOptions);
    const { data: data2 } = useFetch(apiUrl2, fetchOptions);
    const { data: data3 } = useFetch(apiUrl3, fetchOptions);

    const [dayBookData, setDayBookData] = useState([]);

    // Fetch mongo transactions once on mount
    useEffect(() => {
        fetch(apiUrl4_fallback)
            .then(r => r.ok ? r.json() : null)
            .then(json => setDayBookData(json?.data || []))
            .catch(() => setDayBookData([]));
    }, []);

    const isDataReady = true;

    const allowedMongoCategories = useMemo(() => [
        "petty expenses",
        "staff reimbursement", 
        "maintenance expenses",
        "telephone internet",
        "utility bill",
        "salary",
        "rent",
        "courier charges",
        "asset purchase",
        "promotion_services",
        "spot incentive",
        "bulk amount transfer",
        "other expenses",
        "shoe sales return",
        "shirt sales return",
        "cash to bank",
        "bank to cash",
        "compensation",
        "shoe sales",
        "shirt sales",
        "write off",
        "booking",
        "receivable",
        "sales",
        "income",
        "expense",
        "money transfer",
        "return",
        "refund",
        "cancel",
        "rentout",
        "rent out",
        "dry cleaning",
        "altration",
        "material",
        "travel exp",
        "fuel exp",
        "waste management",
        "water charges",
        "printing stationary",
        "staff welfare",
        "staff accommodation",
        "incentive",
        "advance",
        "balance payable",
        "compensation from cancellation",
        "compensation from product damage",
    ], []);

    const processedTransactions = useMemo(() => {
        if (!isDataReady) return { booking: [], rentOut: [], return: [], cancel: [], mongo: [] };

        const bookingTransactions = (data?.dataSet?.data || []).map(transaction => {
            const bookingCashAmount = parseInt(transaction?.bookingCashAmount || 0, 10);
            const bookingBankAmount = parseInt(transaction?.bookingBankAmount || 0, 10);
            const bookingUPIAmount = parseInt(transaction?.bookingUPIAmount || 0, 10);
            const rblAmount = parseInt(transaction?.rblRazorPay || 0, 10);
            const invoiceAmount = parseInt(transaction?.invoiceAmount || 0, 10);
            const discountAmount = parseInt(transaction?.discountAmount || 0, 10);

            const totalAmount = bookingCashAmount + bookingBankAmount + bookingUPIAmount + rblAmount;

            return {
                ...transaction,
                date: transaction?.bookingDate || null,
                time: transaction?.time || transaction?.bookingTime || "10:34 am",
                customerName: transaction?.customerName || transaction?.customer || "Customer",
                bookingCashAmount,
                bookingBankAmount,
                billValue: transaction.invoiceAmount,
                discountAmount: discountAmount,
                invoiceAmount,
                bookingBank1: bookingBankAmount,
                TotaltransactionBooking: totalAmount,
                Category: "Booking",
                SubCategory: "Advance",
                totalTransaction: totalAmount,
                cash: bookingCashAmount,
                rbl: rblAmount,
                bank: bookingBankAmount,
                upi: bookingUPIAmount,
                amount: totalAmount,
                remarks: transaction?.remarks || transaction?.remark || "-"
            };
        });

        const rentOutTransactions = (data1?.dataSet?.data || []).map(transaction => {
            const rentoutCashAmount = parseInt(transaction?.rentoutCashAmount ?? 0, 10);
            const rentoutBankAmount = parseInt(transaction?.rentoutBankAmount ?? 0, 10);
            const invoiceAmount = parseInt(transaction?.invoiceAmount ?? 0, 10);
            const advanceAmount = parseInt(transaction?.advanceAmount ?? 0, 10);
            const rentoutUPIAmount = parseInt(transaction?.rentoutUPIAmount ?? 0, 10);
            const rblAmount = parseInt(transaction?.rblRazorPay ?? 0, 10);
            const securityAmount = parseInt(transaction?.securityAmount ?? 0, 10);

            const totalAmount = rentoutCashAmount + rentoutBankAmount + rentoutUPIAmount + rblAmount;

            return {
                ...transaction,
                date: transaction?.rentOutDate ?? "",
                time: transaction?.time || transaction?.rentOutTime || "10:34 am",
                customerName: transaction?.customerName || transaction?.customer || "Customer",
                rentoutCashAmount,
                rentoutBankAmount,
                invoiceAmount,
                discountAmount: parseInt(transaction.discountAmount || 0),
                billValue: transaction.invoiceAmount,
                securityAmount,
                advanceAmount,
                Balance: invoiceAmount - advanceAmount,
                rentoutUPIAmount,
                Category: "RentOut",
                SubCategory: "Security",
                SubCategory1: "Balance Payable",
                totalTransaction: totalAmount,
                cash: rentoutCashAmount,
                rbl: rblAmount,
                bank: rentoutBankAmount,
                upi: rentoutUPIAmount,
                amount: totalAmount,
                remarks: transaction?.remarks || transaction?.remark || "-"
            };
        });

        const returnOutTransactions = (data2?.dataSet?.data || []).map(transaction => {
            const returnCashAmount = -(parseInt(transaction?.returnCashAmount || 0, 10));
            const returnRblAmount = -(parseInt(transaction?.rblRazorPay || 0, 10));
            const returnBankAmount = returnRblAmount !== 0 ? 0 : -(parseInt(transaction?.returnBankAmount || 0, 10));
            const returnUPIAmount = returnRblAmount !== 0 ? 0 : -(parseInt(transaction?.returnUPIAmount || 0, 10));
            const invoiceAmount = parseInt(transaction?.invoiceAmount || 0, 10);
            const advanceAmount = parseInt(transaction?.advanceAmount || 0, 10);
            const RsecurityAmount = -(parseInt(transaction?.securityAmount || 0, 10));

            const totalAmount = returnCashAmount + returnRblAmount + returnBankAmount + returnUPIAmount;

            return {
                ...transaction,
                date: transaction?.returnedDate || null,
                time: transaction?.time || transaction?.returnedTime || "10:34 am",
                customerName: transaction?.customerName || transaction?.customer || "Customer",
                returnBankAmount,
                returnCashAmount,
                returnUPIAmount,
                invoiceAmount,
                advanceAmount,
                discountAmount: parseInt(transaction.discountAmount || 0),
                billValue: invoiceAmount,
                amount: totalAmount,
                totalTransaction: totalAmount,
                RsecurityAmount,
                Category: "Return",
                SubCategory: "Security Refund",
                cash: returnCashAmount,
                rbl: returnRblAmount,
                bank: returnBankAmount,
                upi: returnUPIAmount,
                remarks: transaction?.remarks || transaction?.remark || "-"
            };
        });

        const canCelTransactions = (data3?.dataSet?.data || []).map(transaction => {
            const deleteCashAmount = -Math.abs(parseInt(transaction.deleteCashAmount || 0));
            const deleteRblAmount = -Math.abs(parseInt(transaction.rblRazorPay || 0));
            const originalRblAmount = parseInt(transaction.rblRazorPay || 0);
            const deleteBankAmount = originalRblAmount !== 0 ? 0 : -Math.abs(parseInt(transaction.deleteBankAmount || 0));
            const deleteUPIAmount = originalRblAmount !== 0 ? 0 : -Math.abs(parseInt(transaction.deleteUPIAmount || 0));

            const totalAmount = deleteCashAmount + deleteRblAmount + deleteBankAmount + deleteUPIAmount;

            return {
                ...transaction,
                date: transaction.cancelDate,
                time: transaction?.time || transaction?.cancelTime || "10:34 am",
                customerName: transaction?.customerName || transaction?.customer || "Customer",
                Category: "Cancel",
                SubCategory: "cancellation Refund",
                discountAmount: parseInt(transaction.discountAmount || 0),
                billValue: transaction.invoiceAmount,
                amount: totalAmount,
                totalTransaction: totalAmount,
                cash: deleteCashAmount,
                rbl: deleteRblAmount,
                bank: deleteBankAmount,
                upi: deleteUPIAmount,
                remarks: transaction?.remarks || transaction?.remark || "-"
            };
        });

        const expenseCategoryValues = new Set([
            "petty expenses","staff reimbursement","maintenance expenses","telephone internet",
            "utility bill","salary","rent","courier charges","asset purchase","promotion_services",
            "spot incentive","bulk amount transfer","other expenses","shoe sales return",
            "shirt sales return","dry cleaning","altration","material","travel exp","fuel exp",
            "waste management","water charges","printing stationary","staff welfare",
            "staff accommodation","incentive","write off",
        ]);
        const incomeCategoryValues = new Set([
            "shoe sales","shirt sales","mixed sales","compensation","advance","balance payable",
            "compensation from cancellation","compensation from product damage",
        ]);
        const inferType = (tx) => {
            const t = (tx.type || "").toLowerCase();
            if (t) return tx.type;
            const c = (tx.category || tx.Category || "").toLowerCase();
            if (expenseCategoryValues.has(c)) return "expense";
            if (incomeCategoryValues.has(c)) return "income";
            return tx.Category || tx.category || "";
        };

        const mongoTransactions = (dayBookData || []).filter(transaction => {
            const cat = (transaction.category || transaction.Category || "").toLowerCase();
            return allowedMongoCategories.includes(cat);
        }).map(transaction => {
            const isReturn = (transaction.type || "").toLowerCase() === "return";
            const rawSubCat = transaction.subCategory || transaction.SubCategory || transaction.category || "";
            const subCatLabel = isReturn && rawSubCat && !rawSubCat.toLowerCase().endsWith("return")
                ? `${rawSubCat} Return`
                : rawSubCat;
            return {
                ...transaction,
                locCode: currentusers?.locCode,
                date: transaction.date ? transaction.date.split("T")[0] : transaction.date,
                time: transaction.time || (transaction.date && transaction.date.includes("T") ? new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase() : "10:34 am"),
                Category: inferType(transaction),
                SubCategory: subCatLabel,
                invoiceNo: transaction.invoiceNo || transaction.invoiceNumber || transaction.invoiceId || transaction.locCode,
                customerName: transaction.customerName || transaction.customer || transaction.custName || "-",
                cash1: transaction.cash,
                bank1: transaction.bank,
                discountAmount: parseInt(transaction.discountAmount || 0),
                billValue: transaction.billValue || transaction.invoiceAmount || transaction.amount || 0,
                Tupi: transaction.upi,
                rbl: transaction.rbl || transaction.rblRazorPay || 0,
                cash: transaction.cash !== undefined ? transaction.cash : transaction.cash1,
                bank: transaction.bank !== undefined ? transaction.bank : transaction.bank1,
                upi: transaction.upi !== undefined ? transaction.upi : transaction.Tupi,
                amount: transaction.amount || (parseInt(transaction.cash || 0) + parseInt(transaction.bank || 0) + parseInt(transaction.upi || 0) + parseInt(transaction.rbl || transaction.rblRazorPay || 0)),
                totalTransaction: transaction.totalTransaction || (parseInt(transaction.cash || 0) + parseInt(transaction.bank || 0) + parseInt(transaction.upi || 0) + parseInt(transaction.rbl || transaction.rblRazorPay || 0)),
                remark: (() => { const r = transaction.remark || transaction.remarks || ""; return (r === "Thanks for your business." || r === "Thanks for your business") ? "" : r; })(),
                remarks: (() => { const r = transaction.remark || transaction.remarks || ""; return (r === "Thanks for your business." || r === "Thanks for your business") ? "-" : (r || "-"); })()
            };
        });

        return {
            booking: bookingTransactions,
            rentOut: rentOutTransactions,
            return: returnOutTransactions,
            cancel: canCelTransactions,
            mongo: mongoTransactions
        };
    }, [data, data1, data2, data3, dayBookData, isDataReady, currentusers?.locCode, allowedMongoCategories]);

    const allTransactions = useMemo(() => {
        const combined = [
            ...processedTransactions.booking,
            ...processedTransactions.rentOut,
            ...processedTransactions.return,
            ...processedTransactions.cancel,
            ...processedTransactions.mongo,
        ];

        return combined.map(t => {
            const invoicePart = String(t.invoiceNo || t.locCode || "").trim();
            const categoryPart = (t.Category || t.type || "").toLowerCase();
            const key = `${invoicePart}-${categoryPart}`;
            const override = editedTransactionsMap[key];

            if (override) {
                const isBooking = (t.Category || '').toLowerCase() === 'booking';
                const isReturn  = (t.Category || '').toLowerCase() === 'return';
                const isCancel  = (t.Category || '').toLowerCase() === 'cancel';
                const editedTotal = Number(override.amount || override.totalTransaction || 0);

                return {
                    ...t,
                    _id: override._id || t._id,
                    cash: override.cash !== undefined ? override.cash : t.cash,
                    rbl: override.rbl !== undefined ? override.rbl : t.rbl,
                    bank: override.bank !== undefined ? override.bank : t.bank,
                    upi: override.upi !== undefined ? override.upi : t.upi,
                    securityAmount: override.securityAmount !== undefined ? override.securityAmount : t.securityAmount,
                    Balance: override.Balance !== undefined ? override.Balance : t.Balance,
                    billValue: override.billValue !== undefined ? override.billValue : t.billValue,
                    bookingCashAmount: isBooking ? override.cash : t.bookingCashAmount,
                    bookingBankAmount: isBooking ? override.bank : t.bookingBankAmount,
                    bookingBank1: isBooking ? override.bank : t.bookingBank1,
                    bookingUPIAmount: isBooking ? override.upi : t.bookingUPIAmount,
                    TotaltransactionBooking: isBooking ? editedTotal : t.TotaltransactionBooking,
                    returnCashAmount: isReturn ? override.cash : t.returnCashAmount,
                    returnBankAmount: isReturn ? override.bank : t.returnBankAmount,
                    returnUPIAmount: isReturn ? override.upi : t.returnUPIAmount,
                    returnRblAmount: isReturn ? override.rbl : t.returnRblAmount,
                    deleteCashAmount: isCancel ? -Math.abs(override.cash) : t.deleteCashAmount,
                    deleteBankAmount: isCancel ? -Math.abs(override.bank) : t.deleteBankAmount,
                    deleteUPIAmount: isCancel ? -Math.abs(override.upi) : t.deleteUPIAmount,
                    amount: override.amount || editedTotal,
                    totalTransaction: override.totalTransaction || editedTotal,
                };
            }
            return t;
        });
    }, [processedTransactions, editedTransactionsMap]);

    const dedupedTransactions = useMemo(() => {
        return Array.from(
            new Map(
                allTransactions.map((tx) => {
                    const dateKey = tx.date ? new Date(tx.date).toISOString().split("T")[0] : "";
                    const invoiceKey = tx.invoiceNo || tx._id || tx.locCode || "";
                    const categoryKey = tx.Category || tx.category || "";
                    const key = `${invoiceKey}-${dateKey}-${categoryKey}`;
                    return [key, tx];
                })
            ).values()
        );
    }, [allTransactions]);

    const filteredTransactions = useMemo(() => {
        const selectedCategoryValue = selectedCategory?.value?.toLowerCase() || "all";
        const selectedSubCategoryValue = selectedSubCategory?.value?.toLowerCase() || "all";

        return dedupedTransactions.filter((t) =>
            (selectedCategoryValue === "all" || (t.category?.toLowerCase() === selectedCategoryValue || t.Category?.toLowerCase() === selectedCategoryValue || t.type?.toLowerCase() === selectedCategoryValue)) &&
            (selectedSubCategoryValue === "all" || (t.subCategory?.toLowerCase() === selectedSubCategoryValue || t.SubCategory?.toLowerCase() === selectedSubCategoryValue || t.type?.toLowerCase() === selectedSubCategoryValue || t.subCategory1?.toLowerCase() === selectedSubCategoryValue || t.SubCategory1?.toLowerCase() === selectedSubCategoryValue || t.category?.toLowerCase() === selectedSubCategoryValue))
        );
    }, [dedupedTransactions, selectedCategory?.value, selectedSubCategory?.value]);

    const openingCash = parseInt(preOpen?.cash ?? preOpen?.Closecash ?? 0, 10);

    const calculatedTotals = useMemo(() => {
        const bankAmount = filteredTransactions?.reduce((sum, item) =>
            sum +
            (parseInt(item.bookingBankAmount, 10) || 0) +
            (parseInt(item.rentoutBankAmount, 10) || 0) +
            (parseInt(item.rentoutUPIAmount, 10) || 0) +
            (parseInt(item.bookingUPIAmount, 10) || 0) +
            (parseInt(item.deleteBankAmount, 10) || 0) * -1 +
            (parseInt(item.deleteUPIAmount, 10) || 0) * -1 +
            (parseInt(item.returnBankAmount, 10) || 0),
            0
        ) || 0;

        const bankAmount1 = filteredTransactions?.reduce((sum, item) =>
            sum + (parseInt(item.bank, 10) || 0),
            0
        ) || 0;

        const bankAmountupi = filteredTransactions?.reduce((sum, item) =>
            sum + (parseInt(item.upi, 10) || 0),
            0
        ) || 0;

        const rblAmount = filteredTransactions?.reduce((sum, item) =>
            sum + (parseInt(item.rbl, 10) || 0),
            0
        ) || 0;

        const dayCashTransactions = filteredTransactions?.reduce((sum, item) =>
            sum + (parseInt(item.cash, 10) || 0),
            0
        ) || 0;

        const totalCash = dayCashTransactions + openingCash;

        return {
            totalBankAmount: bankAmount,
            totalBankAmount1: bankAmount1,
            totalBankAmountupi: bankAmountupi,
            totalRblAmount: rblAmount,
            dayCashTransactions,
            totalCash
        };
    }, [filteredTransactions, openingCash]);

    const totalCalculatedAmount = useMemo(() => {
        return filteredTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    }, [filteredTransactions]);

    const totalCalculatedTxn = useMemo(() => {
        return filteredTransactions.reduce((sum, tx) => sum + (Number(tx.totalTransaction) || 0), 0);
    }, [filteredTransactions]);

    const totalCalculatedDiscount = useMemo(() => {
        return filteredTransactions.reduce((sum, tx) => sum + (Number(tx.discountAmount) || 0), 0);
    }, [filteredTransactions]);

    const totalCalculatedBillValue = useMemo(() => {
        return filteredTransactions.reduce((sum, tx) => sum + (Number(tx.billValue != null ? tx.billValue : (tx.invoiceAmount || 0)) || 0), 0);
    }, [filteredTransactions]);

    const handleQuantityChange = useCallback((index, value) => {
        if (preOpen1 != null) return;
        setQuantities(prev => {
            const next = [...prev];
            next[index] = value === "" ? "" : Math.max(0, parseInt(value, 10) || 0);
            return next;
        });
    }, [preOpen1]);

    const incrementQuantity = useCallback((index) => {
        if (preOpen1 != null) return;
        setQuantities(prev => {
            const next = [...prev];
            const currentVal = parseInt(next[index], 10) || 0;
            next[index] = currentVal + 1;
            return next;
        });
    }, [preOpen1]);

    const decrementQuantity = useCallback((index) => {
        if (preOpen1 != null) return;
        setQuantities(prev => {
            const next = [...prev];
            const currentVal = parseInt(next[index], 10) || 0;
            next[index] = Math.max(0, currentVal - 1);
            return next;
        });
    }, [preOpen1]);

    const totalAmount = useMemo(() => {
        return denominations.reduce(
            (sum, denom, index) => sum + (parseInt(quantities[index], 10) || 0) * denom.value,
            0
        );
    }, [quantities]);

    const savedData = useMemo(() => ({
        date,
        locCode,
        email,
        totalCash: calculatedTotals.totalCash,
        totalAmount,
        totalBankAmount: calculatedTotals.totalBankAmount
    }), [date, locCode, email, calculatedTotals.totalCash, totalAmount, calculatedTotals.totalBankAmount]);

    const CreateCashBank = async () => {
        if (savedData.totalAmount === 0) {
            const confirmed = window.confirm(
                'Physical cash count is 0. Are you sure you want to close the day with zero cash? Click OK to proceed or Cancel to go back and enter the denomination count.'
            );
            if (!confirmed) return;
        }
        setLoading(true);
        try {
            const response = await fetch(apiUrl5, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(savedData),
            });

            if (response.status === 401) {
                setLoading(false);
                return alert("Error: Data already saved for today.");
            } else if (!response.ok) {
                setLoading(false);
                return alert(JSON.stringify(response), null, 2);
            }

            const data = await response.json();
            localStorage.setItem(`denominations_${currentDate}_${locCode}`, JSON.stringify(quantities));

            alert("Data saved successfully");
            setLoading(false);
            window.location.reload();

        } catch (error) {
            console.error("Error saving data:", error);
            alert("An unexpected error occurred.");
            setLoading(false);
        }
    };

    const GetCreateCashBank = async () => {
        try {
            const response = await fetch(apiUrl6, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    setPreOpen(null);
                    return;
                }
                throw new Error(`Error fetching opening balance: ${response.status}`);
            }

            const data = await response.json();
            setPreOpen(data?.data);
        } catch (error) {
            console.error("Error fetching opening balance:", error);
            setPreOpen(null);
        }
    };

    const takeCreateCashBank = async () => {
        try {
            const response = await fetch(apiUrl7, { method: 'GET' });
            if (response.status === 404) {
                return;
            }
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`API ${response.status}: ${text}`);
            }
            const json = await response.json();
            setPreOpen1(json.data);
        } catch (err) {
            console.error("Error fetching closing data:", err);
        }
    };

    useEffect(() => {
        GetCreateCashBank();
        takeCreateCashBank();
        
        const fetchEditedTransactions = async () => {
            try {
                const apiUrl = `${baseUrl.baseUrl}api/tws/getEditedTransactions?fromDate=${currentDate}&toDate=${currentDate}&locCode=${currentusers?.locCode}`;
                const res = await fetch(apiUrl);
                const json = await res.json();
                
                const overrideRows = json?.data || [];
                const editedObj = {};
                overrideRows.forEach(row => {
                    const invoicePart = String(row.invoiceNo || row.invoice).trim();
                    const categoryPart = (row.type || row.category || "").toLowerCase();
                    const key = `${invoicePart}-${categoryPart}`;
                    if (invoicePart) {
                        editedObj[key] = {
                            ...row,
                            _id: row._id,
                            invoiceNo: invoicePart,
                            cash: Number(row.cash || 0),
                            rbl: Number(row.rbl || 0),
                            bank: Number(row.bank || 0),
                            upi: Number(row.upi || 0),
                            securityAmount: Number(row.securityAmount || 0),
                            Balance: Number(row.Balance || 0),
                            billValue: Number(row.billValue || row.invoiceAmount || 0),
                            amount: Number(row.amount || 0),
                            totalTransaction: Number(row.totalTransaction || 0),
                        };
                    }
                });
                setEditedTransactionsMap(editedObj);
            } catch (err) {
                console.warn("⚠️ Failed to fetch edited transactions:", err.message);
            }
        };
        
        fetchEditedTransactions();
    }, []);

    const handleEditClick = async (transaction, index) => {
        setIsSyncing(true);

        if (!transaction._id) {
            const cashVal = transaction.cash || transaction.bookingCashAmount || transaction.rentoutCashAmount || 0;
            const rblVal = transaction.rbl || 0;
            const bankVal = transaction.bank || transaction.bookingBankAmount || transaction.rentoutBankAmount || 0;
            const upiVal = transaction.upi || transaction.bookingUPIAmount || transaction.rentoutUPIAmount || 0;
            const totalAmount = Number(cashVal) + Number(rblVal) + Number(bankVal) + Number(upiVal);
            
            const patchedTransaction = {
                invoiceNo: transaction.invoiceNo || transaction.locCode || "",
                customerName: transaction.customerName || "",
                locCode: currentusers?.locCode,
                type: transaction.Category || transaction.type || 'income',
                category: transaction.SubCategory || transaction.category || 'General',
                subCategory: transaction.SubCategory || transaction.category || '',
                paymentMethod: 'cash',
                date: new Date(transaction.date || currentDate),
                cash: String(cashVal),
                rbl: String(rblVal),
                bank: String(bankVal),
                upi: String(upiVal),
                amount: String(totalAmount),
                securityAmount: Number(transaction.securityAmount || 0),
                Balance: Number(transaction.Balance || 0),
                billValue: Number(transaction.billValue || transaction.invoiceAmount || 0),
                totalTransaction: totalAmount,
                editedBy: "000000000000000000000000",
                editedAt: new Date(),
            };

            try {
                const response = await fetch(`${baseUrl.baseUrl}user/syncTransaction`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchedTransaction),
                });

                const result = await response.json();

                if (!response.ok) {
                    alert("❌ Failed to sync transaction.\n" + (result?.error || 'Unknown error'));
                    setIsSyncing(false);
                    return;
                }

                transaction._id = result.data._id;
                filteredTransactions[index]._id = result.data._id;
            } catch (err) {
                alert("❌ Sync error: " + err.message);
                setIsSyncing(false);
                return;
            }
        }

        setEditedTransaction({
            _id: transaction._id,
            cash: transaction.cash || transaction.bookingCashAmount || transaction.rentoutCashAmount || transaction.returnCashAmount || -(transaction.deleteCashAmount) || 0,
            rbl: transaction.rbl || 0,
            bank: transaction.bank || transaction.bookingBankAmount || transaction.rentoutBankAmount || transaction.returnBankAmount || -(transaction.deleteBankAmount) || 0,
            upi: transaction.upi || transaction.bookingUPIAmount || transaction.rentoutUPIAmount || transaction.returnUPIAmount || -(transaction.deleteUPIAmount) || 0,
            securityAmount: transaction.securityAmount || 0,
            Balance: transaction.Balance || 0,
            date: transaction.date || "",
            customerName: transaction.customerName || "",
            invoiceNo: transaction.invoiceNo || transaction.locCode || "",
            Category: transaction.Category || transaction.type || "",
            SubCategory: transaction.SubCategory || transaction.category || "",
            SubCategory1: transaction.SubCategory1 || transaction.subCategory1 || "",
            remark: transaction.remark || "",
            billValue: transaction.billValue || transaction.invoiceAmount || 0,
            totalTransaction: transaction.totalTransaction || transaction.amount || 0,
            amount: transaction.amount || 0
        });

        setEditingIndex(index);
        setIsSyncing(false);
    };

    const handleInputChange = (field, raw) => {
        if (raw === '' || raw === '-') {
            setEditedTransaction(prev => ({ ...prev, [field]: raw }));
            return;
        }

        const numericValue = Number(raw);
        if (isNaN(numericValue)) return;

        setEditedTransaction(prev => {
            const cash = field === 'cash' ? numericValue : Number(prev.cash) || 0;
            const rbl = field === 'rbl' ? numericValue : Number(prev.rbl) || 0;
            const bank = field === 'bank' ? numericValue : Number(prev.bank) || 0;
            const upi = field === 'upi' ? numericValue : Number(prev.upi) || 0;

            const security = field === 'securityAmount'
                ? numericValue
                : Number(prev.securityAmount) || 0;

            const balance = field === 'Balance'
                ? numericValue
                : Number(prev.Balance) || 0;

            const isRentOut = (prev.Category || '').toLowerCase() === 'rentout';
            const splitTotal = security + balance;
            const payTotal = cash + rbl + bank + upi;

            return {
                ...prev,
                [field]: numericValue,
                cash, rbl, bank, upi,
                securityAmount: security,
                Balance: balance,
                amount: isRentOut ? splitTotal : payTotal,
                totalTransaction: isRentOut ? splitTotal : payTotal,
            };
        });
    };

    const handleSave = async () => {
        const {
            _id,
            cash, rbl, bank, upi,
            date,
            invoiceNo = "",
            invoice = "",
            customerName,
            securityAmount,
            Balance,
            paymentMethod,
        } = editedTransaction;

        if (!_id) {
            alert("❌ Cannot update: missing transaction ID.");
            return;
        }

        try {
            const numSec = Number(securityAmount) || 0;
            const numBal = Number(Balance) || 0;

            let adjCash = Number(cash) || 0;
            let adjRbl = Number(rbl) || 0;
            let adjBank = Number(bank) || 0;
            let adjUpi = Number(upi) || 0;

            const negRow = ["return", "cancel"].includes(
                (editedTransaction.Category || "").toLowerCase()
            );
            if (negRow) {
                adjCash = -Math.abs(adjCash);
                adjRbl = -Math.abs(adjRbl);
                adjBank = -Math.abs(adjBank);
                adjUpi = -Math.abs(adjUpi);
            }

            const isRentOut = editedTransaction.Category === "RentOut";
            const originalBillValue = editedTransaction.billValue;
            const computedTotal = isRentOut
                ? numSec + numBal
                : adjCash + adjRbl + adjBank + adjUpi;

            const paySum = adjCash + adjRbl + adjBank + adjUpi;
            if (!isRentOut && paySum !== computedTotal) {
                if (adjCash !== 0) { adjCash = computedTotal; adjRbl = adjBank = adjUpi = 0; }
                else if (adjRbl !== 0) { adjRbl = computedTotal; adjCash = adjBank = adjUpi = 0; }
                else if (adjBank !== 0) { adjBank = computedTotal; adjCash = adjRbl = adjUpi = 0; }
                else { adjUpi = computedTotal; adjCash = adjRbl = adjBank = 0; }
            }

            const payload = {
                cash: adjCash,
                rbl: adjRbl,
                bank: adjBank,
                upi: adjUpi,
                date,
                invoiceNo: invoiceNo || invoice,
                customerName: customerName || "",
                paymentMethod,
                securityAmount: numSec,
                Balance: numBal,
                billValue: originalBillValue,
                amount: computedTotal,
                totalTransaction: computedTotal,
                type: editedTransaction.Category || "RentOut",
                category: editedTransaction.SubCategory || "Security",
                subCategory1: editedTransaction.SubCategory1 || "Balance Payable",
            };

            const res = await fetch(`${baseUrl.baseUrl}user/editTransaction/${_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok) {
                alert("❌ Update failed: " + (json?.message || "Unknown error"));
                return;
            }
            alert("✅ Transaction updated.");
            
            const updatedRow = {
                _id,
                invoiceNo: invoiceNo || invoice,
                cash: adjCash,
                rbl: adjRbl,
                bank: adjBank,
                upi: adjUpi,
                securityAmount: numSec,
                Balance: numBal,
                billValue: originalBillValue,
                amount: computedTotal,
                totalTransaction: computedTotal,
            };
            
            const key = `${String(invoiceNo || invoice).trim()}-${(editedTransaction.Category || '').toLowerCase()}`;
            setEditedTransactionsMap(prev => ({
                ...prev,
                [key]: updatedRow
            }));
            
            setEditingIndex(null);
            setEditedTransaction({});

        } catch (err) {
            console.error("Update error:", err);
            alert("❌ Update failed: " + err.message);
        }
    };

    useEnterToSave(() => {
        if (editingIndex !== null) {
            handleSave();
        }
    }, editingIndex === null);

    const csvData = filteredTransactions.map(transaction => ({
      ...transaction,
      SubCategory: getCatLabel(transaction.SubCategory || transaction.subCategory || transaction.category || ""),
      cash:
        -(parseInt(transaction.deleteCashAmount)) ||
        parseInt(transaction.rentoutCashAmount) ||
        parseInt(transaction.bookingCashAmount) ||
        parseInt(transaction.returnCashAmount) ||
        parseInt(transaction.cash1) || 0,
      rbl: parseInt(transaction.rbl) || 0,
      bank:
        parseInt(transaction.rentoutBankAmount) ||
        parseInt(transaction.bookingBank1) ||
        parseInt(transaction.returnBankAmount) ||
        parseInt(transaction.deleteBankAmount) * -1 ||
        parseInt(transaction.bank1) || 0,
      upi:
        parseInt(transaction.rentoutUPIAmount) ||
        parseInt(transaction.bookingUPIAmount) ||
        parseInt(transaction.returnUPIAmount) ||
        parseInt(transaction.deleteUPIAmount) * -1 ||
        parseInt(transaction.Tupi) || 0,
    }));

    const handleDownloadReport = () => {
        if (csvLinkRef.current) {
            csvLinkRef.current.link.click();
        }
    };

    const physicalCash = preOpen1?.Closecash != null ? preOpen1.Closecash : totalAmount;
    const difference = physicalCash - calculatedTotals.totalCash;

    return (
        <>
            <div>
                <style>{`
                    @media print {
                        @page {
                            size: tabloid landscape;
                            margin: 5mm;
                        }
                        * {
                            box-sizing: border-box !important;
                        }
                        body { 
                            font-family: Arial, sans-serif !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                        }
                        .no-print { display: none !important; }
                        nav, header, aside, .sidebar { display: none !important; }
                        .ml-\\[240px\\] { margin-left: 0 !important; width: 100% !important; }
                        table { 
                            width: 100% !important; 
                            border-collapse: collapse !important; 
                            font-size: 9px !important;
                        }
                        th, td { 
                            border: 1px solid #000 !important; 
                            padding: 4px 6px !important; 
                        }
                        th { 
                            background-color: #18181b !important; 
                            color: white !important;
                        }
                    }
                `}</style>
                
                <Headers title={"Day Book"} />

                <div className={`transition-all duration-300 ${isSidebarOpen ? 'ml-[240px]' : 'ml-0'}`}>
                    <div className="p-6 md:p-8 bg-white min-h-screen">

                        {/* Top Section: Page Header, Category Filters & Date */}
                        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 no-print">
                            {/* Left Filters */}
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="w-[180px] sm:w-[200px]">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Category</label>
                                    <Select
                                        options={categories}
                                        value={selectedCategory}
                                        onChange={setSelectedCategory}
                                        styles={customSelectStyles}
                                        isSearchable={false}
                                    />
                                </div>
                                <div className="w-[180px] sm:w-[200px]">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sub Category</label>
                                    <Select
                                        options={subCategories}
                                        value={selectedSubCategory}
                                        onChange={setSelectedSubCategory}
                                        styles={customSelectStyles}
                                        isSearchable={false}
                                    />
                                </div>
                            </div>

                            {/* Right Date Display */}
                            <div className="text-right">
                                <span className="block text-xs font-semibold text-gray-400 mb-0.5">Date</span>
                                <span className="text-sm md:text-base font-bold text-gray-900">{displayFormattedDate}</span>
                            </div>
                        </div>

                        <div ref={printRef}>
                            {/* Main Transactions Table */}
                            <div className="bg-white border border-gray-200 overflow-hidden shadow-xs mb-8">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[1200px]">
                                        <thead>
                                            <tr className="bg-[#1c1c1c] text-white">
                                                <th className="py-3.5 pl-6 pr-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">TIME</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">INVOICE NO.</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">CUSTOMER NAME</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">CATEGORY</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">SUB CATEGORY</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">REMARKS</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider text-right whitespace-nowrap">AMOUNT</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider text-right whitespace-nowrap">TOTAL TXN</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider text-right whitespace-nowrap">DISCOUNT</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider text-right whitespace-nowrap">BILL VALUE</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider text-right whitespace-nowrap">CASH</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider text-right whitespace-nowrap">RAZORPAY</th>
                                                <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider text-right whitespace-nowrap">CARD/BANK</th>
                                                <th className="py-3.5 pl-3 pr-6 text-[11px] font-bold uppercase tracking-wider text-right whitespace-nowrap">UPI</th>
                                                {showAction && <th className="py-3.5 px-3 text-[11px] font-bold uppercase tracking-wider text-center whitespace-nowrap">ACTION</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-sm">
                                            {/* Special Row: OPENING BALANCE */}
                                            <tr className="bg-white font-medium text-gray-900 hover:bg-gray-50/50">
                                                <td colSpan="6" className="py-3.5 pl-6 pr-3 font-bold text-xs uppercase tracking-wider text-gray-900">
                                                    OPENING BALANCE
                                                </td>
                                                <td className="py-3.5 px-3 text-right font-medium text-gray-800">
                                                    {preOpen?.cash ?? preOpen?.Closecash ?? 0}
                                                </td>
                                                <td className="py-3.5 px-3 text-right font-medium text-gray-800">
                                                    {preOpen?.cash ?? preOpen?.Closecash ?? 0}
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-gray-400">-</td>
                                                <td className="py-3.5 px-3 text-right text-gray-400">-</td>
                                                <td className="py-3.5 px-3 text-right font-medium text-gray-800">
                                                    {preOpen?.cash ?? preOpen?.Closecash ?? 0}
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-gray-400">-</td>
                                                <td className="py-3.5 px-3 text-right text-gray-400">-</td>
                                                <td className="py-3.5 pl-3 pr-6 text-right text-gray-400">-</td>
                                                {showAction && <td className="py-3.5 px-3"></td>}
                                            </tr>

                                            {/* Data Rows */}
                                            {filteredTransactions.length > 0 ? (
                                                filteredTransactions.map((tx, idx) => {
                                                    const isEditing = editingIndex === idx;
                                                    const displayTime = tx.time || "10:34 am";
                                                    const displayInvoice = tx.invoiceNo || tx.locCode || "-";
                                                    const displayCustomer = tx.customerName || "-";
                                                    const displayCategory = tx.Category || tx.type || tx.category || "-";
                                                    const displaySubCategory = getCatLabel(tx.SubCategory || tx.subCategory || "-");
                                                    const displayRemarks = tx.remarks || tx.remark || "-";
                                                    const displayAmount = tx.amount != null ? tx.amount : 0;
                                                    const displayTotalTxn = tx.totalTransaction != null ? tx.totalTransaction : 0;
                                                    const displayDiscount = tx.discountAmount ? tx.discountAmount : "-";
                                                    const displayBillValue = tx.billValue != null ? tx.billValue : (tx.invoiceAmount || "-");
                                                    const displayCash = tx.cash != null ? tx.cash : 0;
                                                    const displayRazorpay = tx.rbl != null ? tx.rbl : 0;
                                                    const displayBank = tx.bank != null ? tx.bank : 0;
                                                    const displayUpi = tx.upi != null ? tx.upi : 0;

                                                    return (
                                                        <tr key={tx._id || idx} className="hover:bg-gray-50/70 transition-colors text-gray-800">
                                                            <td className="py-3.5 pl-6 pr-3 text-xs text-gray-600 whitespace-nowrap">{displayTime}</td>
                                                            <td className="py-3.5 px-3 font-medium text-xs whitespace-nowrap">{displayInvoice}</td>
                                                            <td className="py-3.5 px-3 font-medium text-xs whitespace-nowrap">{displayCustomer}</td>
                                                            <td className="py-3.5 px-3 text-xs whitespace-nowrap">{displayCategory}</td>
                                                            <td className="py-3.5 px-3 text-xs whitespace-nowrap">{displaySubCategory}</td>
                                                            <td className="py-3.5 px-3 text-xs text-gray-500 max-w-[160px] truncate">{displayRemarks}</td>
                                                            <td className="py-3.5 px-3 text-right font-medium text-xs whitespace-nowrap">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        value={editedTransaction.amount}
                                                                        onChange={(e) => handleInputChange("amount", e.target.value)}
                                                                        className="w-20 p-1 border border-gray-300 rounded-none text-xs text-right"
                                                                    />
                                                                ) : displayAmount}
                                                            </td>
                                                            <td className="py-3.5 px-3 text-right font-medium text-xs whitespace-nowrap">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        value={editedTransaction.totalTransaction}
                                                                        onChange={(e) => handleInputChange("totalTransaction", e.target.value)}
                                                                        className="w-20 p-1 border border-gray-300 rounded-none text-xs text-right"
                                                                    />
                                                                ) : displayTotalTxn}
                                                            </td>
                                                            <td className="py-3.5 px-3 text-right text-xs text-gray-600 whitespace-nowrap">
                                                                {displayDiscount}
                                                            </td>
                                                            <td className="py-3.5 px-3 text-right font-medium text-xs whitespace-nowrap">
                                                                {displayBillValue}
                                                            </td>
                                                            <td className="py-3.5 px-3 text-right font-medium text-xs whitespace-nowrap">
                                                                {displayCash}
                                                            </td>
                                                            <td className="py-3.5 px-3 text-right font-medium text-xs whitespace-nowrap">
                                                                {displayRazorpay}
                                                            </td>
                                                            <td className="py-3.5 px-3 text-right font-medium text-xs whitespace-nowrap">
                                                                {displayBank}
                                                            </td>
                                                            <td className="py-3.5 pl-3 pr-6 text-right font-medium text-xs whitespace-nowrap">
                                                                {displayUpi}
                                                            </td>
                                                            {showAction && (
                                                                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                                                    {isEditing ? (
                                                                        <button
                                                                            onClick={handleSave}
                                                                            className="bg-emerald-600 text-white px-2.5 py-1 rounded-none text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                                                                        >
                                                                            Save
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleEditClick(tx, idx)}
                                                                            className="bg-gray-800 text-white px-2.5 py-1 rounded-none text-xs font-semibold hover:bg-black cursor-pointer"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={showAction ? 15 : 14} className="py-12 text-center text-gray-400 text-sm">
                                                        No transactions found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-[#dedede] text-gray-900 font-bold border-t border-gray-300">
                                                <td colSpan="6" className="py-3.5 pl-6 pr-3 font-bold text-xs uppercase tracking-wider">
                                                    TOTAL
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-xs font-bold">
                                                    {totalCalculatedAmount}
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-xs font-bold">
                                                    {totalCalculatedTxn}
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-xs font-bold">
                                                    {totalCalculatedDiscount > 0 ? totalCalculatedDiscount : "-"}
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-xs font-bold">
                                                    {totalCalculatedBillValue > 0 ? totalCalculatedBillValue : "-"}
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-xs font-bold">
                                                    {calculatedTotals.dayCashTransactions}
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-xs font-bold">
                                                    {calculatedTotals.totalRblAmount}
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-xs font-bold">
                                                    {calculatedTotals.totalBankAmount1}
                                                </td>
                                                <td className="py-3.5 pl-3 pr-6 text-right text-xs font-bold">
                                                    {calculatedTotals.totalBankAmountupi}
                                                </td>
                                                {showAction && <td className="py-3.5 px-3"></td>}
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Bottom 2-Column Section: Physical Denomination Count & Cash Summary */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                
                                {/* Left Box: Denomination Count (Takes 7 cols on desktop ~668px) */}
                                <div className="lg:col-span-7 bg-white border border-gray-200 overflow-hidden shadow-xs">
                                    <div className="bg-[#1c1c1c] text-white px-6 py-3.5 flex justify-between items-center">
                                        <span className="text-[11px] font-bold uppercase tracking-wider w-1/3">DENOMINATION</span>
                                        <span className="text-[11px] font-bold uppercase tracking-wider w-1/3 text-center">QUANTITY</span>
                                        <span className="text-[11px] font-bold uppercase tracking-wider w-1/3 text-right">AMOUNT</span>
                                    </div>

                                    <div className="divide-y divide-gray-100">
                                        {denominations.map((denom, index) => {
                                            const amt = (parseInt(quantities[index], 10) || 0) * denom.value;
                                            return (
                                                <div key={denom.label} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50/70 transition-colors">
                                                    <span className="text-sm font-semibold text-gray-700 w-1/3">{denom.label}</span>
                                                    <div className="w-1/3 flex justify-center">
                                                        <div className="inline-flex items-center border border-gray-300 bg-white">
                                                            <button
                                                                type="button"
                                                                onClick={() => decrementQuantity(index)}
                                                                disabled={preOpen1 != null}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors border-r border-gray-300 disabled:opacity-40 cursor-pointer"
                                                            >
                                                                <Minus size={13} />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={quantities[index]}
                                                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                                readOnly={preOpen1 != null}
                                                                placeholder="0"
                                                                className="w-12 h-8 text-center text-sm font-semibold text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => incrementQuantity(index)}
                                                                disabled={preOpen1 != null}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors border-l border-gray-300 disabled:opacity-40 cursor-pointer"
                                                            >
                                                                <Plus size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-800 w-1/3 text-right">
                                                        {amt.toFixed(2)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Physical Total Footer */}
                                    <div className="bg-[#dedede] px-6 py-3.5 flex justify-between items-center border-t border-gray-300">
                                        <span className="text-sm font-bold text-gray-900">Physical Total</span>
                                        <span className="text-sm font-bold text-gray-900">
                                            {totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Box: Cash Summary Card (Takes 5 cols on desktop) */}
                                <div className="lg:col-span-5 bg-white border border-gray-300 p-6 md:p-7 flex flex-col justify-between shadow-xs">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-6">Cash Summary</h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500 font-medium">Closing Cash</span>
                                                <span className="text-base font-bold text-gray-900">
                                                    {calculatedTotals.totalCash.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500 font-medium">Physical Cash</span>
                                                <span className="text-base font-bold text-gray-900">
                                                    {physicalCash.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="border-t border-dashed border-gray-200 my-3" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-bold text-gray-800">Difference</span>
                                                <span className={`text-base font-bold ${
                                                    difference < 0 ? "text-red-500" : "text-emerald-600"
                                                }`}>
                                                    {difference.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-4 mt-8 no-print">
                                        <button
                                            type="button"
                                            onClick={handleDownloadReport}
                                            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-none border border-gray-200 transition-colors text-center cursor-pointer"
                                        >
                                            Download Report
                                        </button>

                                        {loading ? (
                                            <button
                                                disabled
                                                className="flex-1 py-2.5 px-4 bg-[#8b5cf6] opacity-70 text-white text-sm font-semibold rounded-none text-center flex items-center justify-center gap-2 cursor-not-allowed"
                                            >
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Saving...</span>
                                            </button>
                                        ) : preOpen1 == null ? (
                                            <button
                                                type="button"
                                                onClick={CreateCashBank}
                                                className="flex-1 py-2.5 px-4 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-semibold rounded-none shadow-sm transition-all hover:shadow text-center cursor-pointer"
                                            >
                                                Save & Finish Day
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handlePrint}
                                                className="flex-1 py-2.5 px-4 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-semibold rounded-none shadow-sm transition-all hover:shadow text-center cursor-pointer"
                                            >
                                                Print Summary
                                            </button>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Hidden CSV link for download trigger */}
                        <div className="hidden">
                            <CSVLink
                                ref={csvLinkRef}
                                data={csvData}
                                headers={headers}
                                filename={`${currentDate} DayBook report.csv`}
                            />
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};

export default DayBookInc;

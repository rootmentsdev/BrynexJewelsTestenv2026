import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Printer,
  Download,
  Mail,
  Share2,
  Edit,
  MoreHorizontal,
  ArrowLeft,
  Search,
  Plus,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Building2,
  Phone
} from "lucide-react";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";
import Header from "../components/Header";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";

const SalesInvoiceDetail = () => {
  const isSidebarOpen = useSidebar();
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [returnInvoiceItems, setReturnInvoiceItems] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  
  // Return Invoice States
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState("");
  const [returnPaymentMethod, setReturnPaymentMethod] = useState("Cash");
  const [returningInvoice, setReturningInvoice] = useState(false);

  // Get current user info
  const currentUser = JSON.parse(localStorage.getItem("rootfinuser") || "{}");
  const isAdminOrWarehouse = currentUser.power === 'admin' || currentUser.power === 'warehouse';

  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  // Branch to location code mapping
  const branchToLocCodeMap = {
    "G-Edappally": "702",
    "G-Edappal": "707",
    "G-Calicut": "712",
    "SG-Trivandrum": "700",
    "G-Kottakkal": "711",
    "Z-Edappal": "100",
    "Z-Perinthalmanna": "133",
    "Z-Kottakkal": "122",
    "G-Kottayam": "701",
    "G-Perumbavoor": "703",
    "G-Thrissur": "704",
    "G-Chavakkad": "706",
    "G-Vadakara": "708",
    "G-Perinthalmanna": "709",
    "G-Manjeri": "710",
    "G-Palakkad": "705",
    "G-Kalpetta": "717",
    "G-Kannur": "716",
    "G-Mg Road": "718",
    "Z-Edapally": "144",
    "HEAD OFFICE01": "759",
    "Warehouse": "858",
    "Production": "101",
    "Office": "102",
    "WAREHOUSE": "103",
    "Dappr Squad": "555",
    "Edapally Branch": "702",
    "Calicut Branch": "712",
    "Chavakkad Branch": "706",
    "Edappal Branch": "707",
    "Kalpetta Branch": "717",
    "Kannur Branch": "716",
    "Kottakkal Branch": "711",
    "Kottayam Branch": "701",
    "Manjery Branch": "710",
    "Palakkad Branch": "705",
    "Perinthalmanna Branch": "709",
    "Perumbavoor Branch": "703",
    "GPerumbavoor": "703",
    "GPerumbavoorStore": "703",
    "SuitorGuy MG Road": "718",
    "Thrissur Branch": "704",
    "Vadakara Branch": "708",
    "Z-Edapally1 Branch": "144",
    "Z-Edappal Branch": "100",
    "Z-Perinthalmanna Branch": "133",
    "Z-Kottakkal Branch": "122",
  };

  const getLocCodeForBranch = (branchName) => {
    return branchToLocCodeMap[branchName] || null;
  };

  const getUserInfo = () => {
    try {
      const userStr = localStorage.getItem("rootfinuser");
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
    }
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Dynamic Indian currency number to words conversion
  const numberToWords = (amount) => {
    if (isNaN(amount) || amount === null || amount === undefined) return "";
    const num = Math.abs(Number(amount));
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    const a = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convert = (n) => {
      if (n === 0) return "";
      if (n < 20) return a[n] + " ";
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "") + " ";
      if (n < 1000) return a[Math.floor(n / 100)] + " Hundred " + convert(n % 100);
      if (n < 100000) return convert(Math.floor(n / 1000)) + "Thousand " + convert(n % 1000);
      if (n < 10000000) return convert(Math.floor(n / 100000)) + "Lakh " + convert(n % 100000);
      return convert(Math.floor(n / 10000000)) + "Crore " + convert(n % 10000000);
    };

    let words = "Rupees " + (rupees === 0 ? "Zero " : convert(rupees));
    if (paise > 0) {
      words += "and " + convert(paise) + "Paise ";
    }
    return words.trim() + " Only";
  };

  // Store locations for mapping user store
  const fallbackLocations = [
    { locName: "Z-Edapally1", locCode: "144" },
    { locName: "Warehouse", locCode: "858" },
    { locName: "G-Edappally", locCode: "702" },
    { locName: "HEAD OFFICE01", locCode: "759" },
    { locName: "SG-Trivandrum", locCode: "700" },
    { locName: "Z- Edappal", locCode: "100" },
    { locName: "Z.Perinthalmanna", locCode: "133" },
    { locName: "Z.Kottakkal", locCode: "122" },
    { locName: "G.Kottayam", locCode: "701" },
    { locName: "G.Perumbavoor", locCode: "703" },
    { locName: "G.Thrissur", locCode: "704" },
    { locName: "G.Chavakkad", locCode: "706" },
    { locName: "G.Calicut ", locCode: "712" },
    { locName: "G.Vadakara", locCode: "708" },
    { locName: "G.Edappal", locCode: "707" },
    { locName: "G.Perinthalmanna", locCode: "709" },
    { locName: "G.Kottakkal", locCode: "711" },
    { locName: "G.Manjeri", locCode: "710" },
    { locName: "G.Palakkad ", locCode: "705" },
    { locName: "G.Kalpetta", locCode: "717" },
    { locName: "G.Kannur", locCode: "716" },
    { locName: "G.Mg Road", locCode: "718" },
    { locName: "Production", locCode: "101" },
    { locName: "Office", locCode: "102" },
    { locName: "WAREHOUSE", locCode: "103" },
    { locName: "Dappr Squad", locCode: "555" },
  ];

  const getUserStoreDetails = (user) => {
    if (!user) return { userLocName: "", userWarehouse: "", locCode: "" };
    let userLocName = "";
    if (user.locCode) {
      const loc = fallbackLocations.find(
        (l) => l.locCode === user.locCode || l.locCode === String(user.locCode)
      );
      if (loc) userLocName = loc.locName;
    }
    if (!userLocName) {
      userLocName = user.username || user.locName || "";
    }
    const userWarehouse = mapWarehouse(userLocName);
    return {
      userLocName,
      userWarehouse,
      locCode: user.locCode || "",
    };
  };

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoadingList(true);
      try {
        const user = getUserInfo();
        if (!user || !user.email) return;
        const params = new URLSearchParams({
          userId: user.email,
        });
        if (user.power) params.append("userPower", user.power);
        if (user.locCode) params.append("locCode", user.locCode);

        // Store filtering parameters matching SalesInvoices.jsx
        const { userLocName, userWarehouse } = getUserStoreDetails(user);
        if (userWarehouse) {
          params.append("warehouse", userWarehouse);
        }
        if (user.locCode) {
          params.append("filterLocCode", user.locCode);
        }
        if (userLocName) {
          params.append("branch", userLocName);
        }

        const response = await fetch(`${API_URL}/api/sales/invoices?${params.toString()}`);

        if (response.ok) {
          const data = await response.json();
          setInvoices(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error fetching invoices list:", err);
      } finally {
        setLoadingList(false);
      }
    };

    fetchInvoices();
  }, [API_URL]);

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/api/sales/invoices/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch invoice: ${response.statusText}`);
        }
        const data = await response.json();
        setInvoice(data);

        // If invoice is fully returned and has no line items, fetch the return invoice
        if (data.returnStatus === "full" && (!data.lineItems || data.lineItems.length === 0)) {
          try {
            const user = getUserInfo();
            const params = new URLSearchParams({
              userId: user.email,
            });
            if (user.power) params.append("userPower", user.power);
            if (user.locCode) params.append("locCode", user.locCode);

            const allInvoicesResponse = await fetch(`${API_URL}/api/sales/invoices?${params.toString()}`);
            if (allInvoicesResponse.ok) {
              const allInvoices = await allInvoicesResponse.json();
              const returnInvoice = allInvoices.find(inv => 
                inv.category === "Return" && 
                (inv.originalInvoiceNumber === data.invoiceNumber || 
                 inv.invoiceNumber?.includes(data.invoiceNumber))
              );
              
              if (returnInvoice && returnInvoice.lineItems && returnInvoice.lineItems.length > 0) {
                setReturnInvoiceItems(returnInvoice.lineItems);
              }
            }
          } catch (err) {
            console.error("Error finding return invoice:", err);
          }
        }
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
    }
  }, [id, API_URL]);

  useEffect(() => {
    const fetchStoreInfo = async () => {
      if (!invoice || !invoice.branch) return;
      
      const branchLocCode = getLocCodeForBranch(invoice.branch);
      if (!branchLocCode) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/stores/loc/${branchLocCode}`);
        if (response.ok) {
          const data = await response.json();
          if (data.store) {
            setStoreInfo(data.store);
          }
        }
      } catch (err) {
        console.error("Error fetching store info:", err);
      }
    };

    fetchStoreInfo();
  }, [invoice, API_URL]);

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    alert("Email functionality will be implemented");
  };

  const handleSMS = () => {
    alert("SMS functionality will be implemented");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Invoice ${invoice?.invoiceNumber}`,
        text: `Invoice for ${invoice?.customer}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Invoice link copied to clipboard");
    }
  };

  const handleOpenReturnModal = async () => {
    if (invoice?.returnStatus === "full") {
      alert("This invoice has already been fully returned and cannot be returned again.");
      return;
    }

    try {
      const itemsWithFreshData = await Promise.all(
        (invoice.lineItems || []).map(async (item) => {
          try {
            let freshItemData = item.itemData;
            
            if (item.itemGroupId) {
              const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${item.itemGroupId}`);
              if (response.ok) {
                const group = await response.json();
                const groupItem = group.items?.find(i => (i._id || i.id) === (item.itemData?._id || item.itemData?.id));
                if (groupItem) {
                  freshItemData = { ...item.itemData, returnable: groupItem.returnable };
                }
              }
            } else {
              const response = await fetch(`${API_URL}/api/shoe-sales/items/${item.itemData?._id || item.itemData?.id}`);
              if (response.ok) {
                freshItemData = await response.json();
              }
            }
            
            return {
              ...item,
              itemData: freshItemData,
              returnQuantity: 0,
              isReturnable: freshItemData?.returnable === true,
            };
          } catch (err) {
            console.error("Error fetching item data:", err);
            return {
              ...item,
              returnQuantity: 0,
              isReturnable: item.itemData?.returnable === true,
            };
          }
        })
      );
      
      setReturnItems(itemsWithFreshData);
      setReturnReason("");
      setShowReturnModal(true);
    } catch (error) {
      console.error("Error opening return modal:", error);
      alert("Failed to initialize return items. Please try again.");
    }
  };

  const handleReturnQuantityChange = (index, quantity) => {
    const item = returnItems[index];
    if (item.itemData?.returnable !== true) {
      alert(`Item "${item.item || item.itemData?.itemName || 'Unknown'}" cannot be returned as it is not marked as returnable. Please enable the "Returnable Item" option in the product settings to return this item.`);
      return;
    }
    
    const updated = [...returnItems];
    updated[index].returnQuantity = Math.min(
      parseFloat(quantity) || 0,
      parseFloat(updated[index].quantity || 0)
    );
    setReturnItems(updated);
  };

  const calculateReturnAmountWithTax = (item) => {
    if (!item.returnQuantity || item.returnQuantity <= 0) return 0;
    if (!invoice) return 0;
    
    const originalQuantity = parseFloat(item.quantity || 0);
    if (originalQuantity <= 0) return 0;
    
    const originalItemSubTotal = parseFloat((item.rate * originalQuantity) || 0);
    const originalInvoiceSubTotal = parseFloat(invoice.subTotal || 0);
    
    const returnQuantityRatio = item.returnQuantity / originalQuantity;
    const returnSubTotal = originalItemSubTotal * returnQuantityRatio;
    
    if (originalInvoiceSubTotal > 0) {
      const returnSubTotalRatio = returnSubTotal / originalInvoiceSubTotal;
      const invoiceFinalTotal = parseFloat(invoice.finalTotal || 0);
      
      if (invoiceFinalTotal > 0) {
        const proportionalFinalTotal = invoiceFinalTotal * returnSubTotalRatio;
        return Math.max(0, proportionalFinalTotal);
      }
      
      const invoiceTotalTax = parseFloat(invoice.totalTax || 0);
      const invoiceDiscountAmount = parseFloat(invoice.discountAmount || 0);
      const invoiceTdsAmount = parseFloat(invoice.tdsTcsAmount || 0);
      const invoiceAdjustmentAmount = parseFloat(invoice.adjustmentAmount || 0);
      
      const proportionalSubTotal = originalInvoiceSubTotal * returnSubTotalRatio;
      let proportionalTax = invoiceTotalTax > 0 ? invoiceTotalTax * returnSubTotalRatio : proportionalSubTotal * 0.05;
      const proportionalDiscount = invoiceDiscountAmount * returnSubTotalRatio;
      const proportionalTds = invoiceTdsAmount * returnSubTotalRatio;
      const proportionalAdjustment = invoiceAdjustmentAmount * returnSubTotalRatio;
      
      const returnAmountWithTax = proportionalSubTotal + proportionalTax - proportionalDiscount - proportionalTds + proportionalAdjustment;
      return Math.max(0, returnAmountWithTax);
    }
    
    return item.returnQuantity * parseFloat(item.rate || 0);
  };

  const calculateTotalReturnAmountWithTax = () => {
    return returnItems.reduce((sum, item) => sum + calculateReturnAmountWithTax(item), 0);
  };

  const handleSubmitReturn = async () => {
    const itemsToReturn = returnItems.filter((item) => item.returnQuantity > 0);

    if (itemsToReturn.length === 0) {
      alert("Please select at least one item to return");
      return;
    }

    const nonReturnableItems = itemsToReturn.filter((item) => item.itemData?.returnable !== true);
    if (nonReturnableItems.length > 0) {
      const itemNames = nonReturnableItems.map((item) => item.item || item.itemData?.itemName || "Unknown").join(", ");
      alert(`Item cannot be returned!\n\nThe following items are not marked as returnable: ${itemNames}\n\nPlease enable the "Returnable Item" option in the product settings to return these items.`);
      return;
    }

    if (!returnReason.trim()) {
      alert("Please provide a reason for return");
      return;
    }

    setReturningInvoice(true);
    try {
      const user = getUserInfo();
      const returnTotal = calculateTotalReturnAmountWithTax();

      const returnInvoicePayload = {
        customer: invoice.customer,
        customerPhone: invoice.customerPhone,
        invoiceDate: new Date().toISOString().split("T")[0],
        terms: "Due on Receipt",
        branch: invoice.branch,
        salesperson: invoice.salesperson,
        category: "Return",
        originalInvoiceId: invoice._id,
        originalInvoiceNumber: invoice.invoiceNumber,
        notes: `Return for Invoice ${invoice.invoiceNumber}. Reason: ${returnReason}`,
        paymentMethod: returnPaymentMethod,
        lineItems: itemsToReturn.map((item) => ({
          item: item.item,
          quantity: item.returnQuantity,
          rate: item.rate,
          amount: calculateReturnAmountWithTax(item),
          itemData: item.itemData,
          size: item.size,
          itemGroupId: item.itemGroupId,
        })),
        subTotal: returnTotal,
        finalTotal: -returnTotal,
        status: "sent",
        userId: user?.email,
      };

      const returnResponse = await fetch(`${API_URL}/api/sales/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(returnInvoicePayload),
      });

      if (!returnResponse.ok) {
        throw new Error("Failed to create return invoice");
      }

      const result = await returnResponse.json();

      const updatedLineItems = invoice.lineItems
        .map((originalItem) => {
          const returnedItem = itemsToReturn.find(
            (ret) => (ret.itemData?._id || ret.item) === (originalItem.itemData?._id || originalItem.item)
          );

          if (!returnedItem) {
            return originalItem;
          }

          const remainingQty = (originalItem.quantity || 0) - returnedItem.returnQuantity;
          if (remainingQty <= 0) {
            return null;
          }

          return {
            ...originalItem,
            quantity: remainingQty,
            amount: remainingQty * originalItem.rate,
          };
        })
        .filter(Boolean);

      if (updatedLineItems.length > 0) {
        const remainingSubTotal = updatedLineItems.reduce((sum, item) => sum + item.amount, 0);
        const originalSubTotal = parseFloat(invoice.subTotal || 0);
        const ratio = originalSubTotal > 0 ? remainingSubTotal / originalSubTotal : 1;

        const remainingFinalTotal = parseFloat(invoice.finalTotal || 0) * ratio;
        const remainingTax = parseFloat(invoice.totalTax || 0) * ratio;

        await fetch(`${API_URL}/api/sales/invoices/${invoice._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineItems: updatedLineItems,
            subTotal: remainingSubTotal,
            finalTotal: remainingFinalTotal,
            totalTax: remainingTax,
            returnStatus: "partial",
            userId: user?.email,
          }),
        });
      } else {
        await fetch(`${API_URL}/api/sales/invoices/${invoice._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineItems: [],
            returnStatus: "full",
            userId: user?.email,
          }),
        });
      }

      alert(
        `Return invoice created: ${result.invoiceNumber}\n\n` +
        (updatedLineItems.length > 0 
          ? `Original invoice ${invoice.invoiceNumber} has been updated with remaining quantities.\n`
          : `All items have been returned.\n`) +
        `View return invoices at: Sales > Invoice Returns`
      );
      
      setShowReturnModal(false);
      window.location.reload();
    } catch (error) {
      console.error("Return error:", error);
      alert("Could not create return invoice: " + error.message);
    } finally {
      setReturningInvoice(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = invoice?.customerPhone || "";
    if (!phone) {
      alert("Customer phone number not available.");
      return;
    }
  
    const cleanedPhone = phone.replace(/\D/g, '');
    let formattedPhone = cleanedPhone;
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
  
    const message =
      `Hello,\n\n` +
      `Here is your invoice from ${invoice.branch || "Bridesberry"}.\n` +
      `Invoice No: ${invoice.invoiceNumber}\n` +
      `Invoice Date: ${formatDate(invoice.invoiceDate)}\n` +
      `Customer: ${invoice.customer}\n` +
      `Phone: ${invoice.customerPhone || 'Not provided'}\n` +
      `Branch: ${invoice.branch}\n\n` +
      `Sub Total: ₹${parseFloat(invoice.subTotal || 0).toLocaleString('en-IN')}\n` +
      `Total Amount: ₹${parseFloat(invoice.finalTotal || 0).toLocaleString('en-IN')}\n\n` +
      `Status: ${invoice.status?.toUpperCase() || 'SENT'}\n` +
      `Terms: ${invoice.terms || 'Due on Receipt'}\n\n` +
      `Thank you for your business!`;
  
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Loading invoice details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center max-w-sm p-6 bg-white border border-[#E5E7EB] shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => navigate("/sales/invoices")}
            className="px-4 py-2 bg-[#EEEEEE] hover:bg-[#E2E2E2] text-[#111827] text-xs font-bold uppercase tracking-wider border border-[#E5E7EB] cursor-pointer"
          >
            ← Back to Invoices
          </button>
        </div>
      </div>
    );
  }
  
  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center max-w-sm p-6 bg-white border border-[#E5E7EB] shadow-sm">
          <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#111827] mb-4">Invoice Not Found</p>
          <button
            onClick={() => navigate("/sales/invoices")}
            className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            View All Invoices
          </button>
        </div>
      </div>
    );
  }
  
  const activeUser = getUserInfo();
  const { userLocName: activeLocName, userWarehouse: activeWarehouse, locCode: activeLocCode } = getUserStoreDetails(activeUser);

  const filteredSidebarInvoices = invoices.filter((inv) => {
    // 1. Exclude Return/Refund/Cancel invoices from this sidebar list (matches SalesInvoices.jsx)
    const categoryLower = (inv.category || "").toLowerCase().trim();
    const isReturnRefundCancel = ["return", "refund", "cancel"].includes(categoryLower);
    const invoiceNumber = (inv.invoiceNumber || "").toUpperCase();
    const hasReturnPrefix =
      invoiceNumber.startsWith("RTN-") ||
      invoiceNumber.startsWith("RET-") ||
      invoiceNumber.startsWith("REFUND-") ||
      invoiceNumber.startsWith("CANCEL-");

    if (isReturnRefundCancel || hasReturnPrefix) {
      return false;
    }

    // 2. Extra client-side store filter safety
    if (activeWarehouse && activeWarehouse !== "Warehouse" && activeWarehouse !== "All Stores") {
      const invWarehouse = (inv.warehouse || "").toLowerCase().trim();
      const invBranch = (inv.branch || "").toLowerCase().trim();
      const invLocCode = String(inv.locCode || "").trim();

      const targetWarehouse = activeWarehouse.toLowerCase().trim();
      const targetLocName = (activeLocName || "").toLowerCase().trim();
      const targetLocCode = String(activeLocCode || "").trim();

      const matchesStore =
        (targetLocCode && invLocCode && invLocCode === targetLocCode) ||
        (targetWarehouse && (invWarehouse.includes(targetWarehouse) || invBranch.includes(targetWarehouse))) ||
        (targetLocName && (invWarehouse.includes(targetLocName) || invBranch.includes(targetLocName)));

      // If the invoice has store attribution and doesn't match this store, exclude it
      if (!matchesStore && (inv.warehouse || inv.branch || inv.locCode)) {
        return false;
      }
    }

    // 3. Search filter
    if (invoiceSearch) {
      const searchLower = invoiceSearch.toLowerCase().trim();
      return (
        inv.invoiceNumber?.toLowerCase().includes(searchLower) ||
        inv.customer?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Financial summary computation
  const storedSubTotal = parseFloat(invoice.subTotal || 0);
  const storedTotalTax = parseFloat(invoice.totalTax || 0);
  const storedFinalTotal = parseFloat(invoice.finalTotal || 0);
  const lineItems = invoice.lineItems || [];
  const computedSubTotal = lineItems.reduce((s, i) => s + (parseFloat(i.lineTotal) || (parseFloat(i.quantity || 0) * parseFloat(i.rate || 0))), 0);
  const computedTotalTax = lineItems.reduce((s, i) => s + (parseFloat(i.cgstAmount || 0)) + (parseFloat(i.sgstAmount || 0)) + (parseFloat(i.igstAmount || 0)), 0);
  const displaySubTotal = storedSubTotal > 0 ? storedSubTotal : computedSubTotal;
  const displayTotalTax = storedTotalTax > 0 ? storedTotalTax : computedTotalTax;
  const displayFinalTotal = storedFinalTotal > 0 ? storedFinalTotal : (computedSubTotal - parseFloat(invoice.discountAmount || 0) - parseFloat(invoice.tdsTcsAmount || 0) + parseFloat(invoice.adjustmentAmount || 0));

  const itemsToDisplay = (invoice.lineItems && invoice.lineItems.length > 0) 
    ? invoice.lineItems 
    : returnInvoiceItems;

  return (
    <>
      <Header title="Sales Invoices" />
      <div className="invoice-page-wrapper min-h-[calc(100vh-65px)] bg-[#F9FAFB] text-[#111827]">
        
        {/* Print Styles */}
        <style>
          {`
            @media print {
              html, body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              
              nav, aside, header, footer,
              .ml-64, .w-80, 
              [class*="sidebar"],
              [class*="nav-"],
              .no-print {
                display: none !important;
                visibility: hidden !important;
                width: 0 !important;
                height: 0 !important;
              }
              
              button, a {
                display: none !important;
              }
              
              #printable-invoice {
                display: block !important;
                visibility: visible !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 210mm !important;
                margin: 0 auto !important;
                padding: 6mm !important;
                background: white !important;
                box-shadow: none !important;
                border: 1px solid #e5e7eb !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              #printable-invoice * {
                visibility: visible !important;
              }
              
              @page {
                size: A4;
                margin: 6mm;
              }
            }
          `}
        </style>

        <div className="flex">
          {/* ── LEFT INVOICES LIST SIDEBAR ── */}
          <div className={`transition-all duration-300 w-80 bg-white border-r border-[#E5E7EB] h-[calc(100vh-65px)] overflow-y-auto shrink-0 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
            <div className="p-4 border-b border-[#E5E7EB] bg-white sticky top-0 z-10 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold tracking-wider text-[#111827] uppercase flex items-center gap-1.5">
                  <span>All Invoices</span>
                  <span className="text-[10px] font-bold text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 border border-[#E5E7EB]">
                    {filteredSidebarInvoices.length}
                  </span>
                </h2>
                <Link
                  to="/sales/invoices/new"
                  className="inline-flex items-center gap-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-3 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                >
                  <Plus size={13} className="text-white" />
                  New
                </Link>
              </div>

              {/* Filter search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter invoices..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-2.5 rounded-none border border-[#E5E7EB] bg-[#F9FAFB] text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#8B5CF6] focus:bg-white focus:outline-none transition-colors"
                />
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              </div>
            </div>

            <div className="p-2">
              {loadingList ? (
                <div className="text-center py-10">
                  <div className="inline-block animate-spin h-5 w-5 border-2 border-[#8B5CF6] border-t-transparent mb-2" />
                  <div className="text-xs text-[#6B7280]">Loading invoices...</div>
                </div>
              ) : filteredSidebarInvoices.length === 0 ? (
                <div className="text-center py-10 text-xs text-[#6B7280]">
                  No invoices found
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredSidebarInvoices.map((inv) => (
                    <Link
                      key={inv._id}
                      to={`/sales/invoices/${inv._id}`}
                      className={`block p-3 rounded-none border transition-all cursor-pointer ${
                        inv._id === id
                          ? 'bg-[#F5F3FF] border-[#DDD6FE] border-l-4 border-l-[#8B5CF6] shadow-xs'
                          : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#111827]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Customer Avatar Initials */}
                        <div className={`w-8 h-8 rounded-none flex items-center justify-center font-bold text-xs shrink-0 ${
                          inv._id === id ? 'bg-[#8B5CF6] text-white' : 'bg-[#F3F4F6] text-[#4B5563]'
                        }`}>
                          {(inv.customer || "C").slice(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-bold truncate ${inv._id === id ? 'text-[#7C3AED]' : 'text-[#111827]'}`}>
                            {inv.customer || "Walk-in Customer"}
                          </div>
                          <div className="text-[11px] font-semibold text-[#6B7280] font-mono mt-0.5">
                            {inv.invoiceNumber}
                          </div>
                          <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                            {formatDate(inv.invoiceDate)}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold text-[#111827]">
                            {formatCurrency(inv.finalTotal)}
                          </div>
                          <span
                            className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-none ${
                              inv.returnStatus === 'full'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : inv.status?.toLowerCase() === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.status?.toLowerCase() === 'draft'
                                ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                : 'bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]'
                            }`}
                          >
                            {inv.returnStatus === 'full' ? 'RETURNED' : (inv.status || 'SENT').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── MAIN CONTENT AREA ── */}
          <div className="flex-1 px-8 pb-16 pt-6 h-[calc(100vh-65px)] overflow-y-auto">
            
            {/* Top Action Toolbar - Single Row */}
            <div className="flex items-center justify-between gap-4 mb-6 no-print flex-nowrap">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => navigate("/sales/invoices")}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <ArrowLeft size={14} className="text-[#111827]" />
                  <span>All Invoices</span>
                </button>
                <div className="flex items-center gap-2.5 min-w-0">
                  <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#111827] uppercase font-mono truncate">
                    {invoice.invoiceNumber}
                  </h1>
                  {invoice?.returnStatus === "full" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold uppercase tracking-wider rounded-none shrink-0">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      FULLY RETURNED
                    </span>
                  )}
                  {invoice?.returnStatus === "partial" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold uppercase tracking-wider rounded-none shrink-0">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      PARTIALLY RETURNED
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {isAdminOrWarehouse && (
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer size={14} className="text-[#111827]" />
                    <span>Print</span>
                  </button>
                )}

                {/* RETURN BUTTON */}
                {!["return", "refund", "cancel"].includes((invoice?.category || "").toLowerCase()) && (
                  invoice?.returnStatus === "full" ? (
                    <Link
                      to="/sales/invoices/returns"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-none border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold uppercase tracking-wider text-red-700 shadow-xs transition-colors cursor-pointer"
                      title="This invoice is fully returned. Click to view return invoice."
                    >
                      <RotateCcw size={13} className="text-red-600" />
                      <span>View Return</span>
                    </Link>
                  ) : (
                    <button
                      onClick={handleOpenReturnModal}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-none text-xs font-bold uppercase tracking-wider bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <RotateCcw size={13} className="text-white" />
                      <span>Return</span>
                    </button>
                  )
                )}

                {/* EDIT BUTTON (Purple Primary) */}
                {isAdminOrWarehouse && (
                  <Link
                    to={`/sales/invoices/${id}/edit`}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
                  >
                    <Edit size={14} className="text-white" />
                    <span>Edit</span>
                  </Link>
                )}

                {/* MORE OPTIONS */}
                {isAdminOrWarehouse && (
                  <button className="inline-flex items-center justify-center h-9 w-9 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-[#111827] shadow-xs transition-colors cursor-pointer">
                    <MoreHorizontal size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* ── REDESIGNED INVOICE DOCUMENT SHEET ── */}
            <div id="printable-invoice" className="bg-white border border-[#E5E7EB] shadow-md max-w-4xl mx-auto rounded-none overflow-hidden my-4">
              
              {/* Brand Top Accent Line */}
              <div className="h-1.5 bg-[#8B5CF6] w-full" />

              <div className="p-8 space-y-7">
                {/* 1. Document Header: Company & Tax Invoice */}
                <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-[#E5E7EB]">
                  {/* Company Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Building2 size={20} className="text-[#8B5CF6]" />
                      <h1 className="text-xl font-extrabold tracking-tight text-[#111827] uppercase">
                        {storeInfo?.name || invoice.branch || "Bridesberry"}
                      </h1>
                    </div>
                    <div className="text-xs text-[#4B5563] space-y-0.5 leading-relaxed">
                      {storeInfo?.address && <div>{storeInfo.address}</div>}
                      {storeInfo?.city && <div>{storeInfo.city}</div>}
                      {storeInfo?.state && <div>{storeInfo.state}</div>}
                      {!storeInfo?.address && !storeInfo?.city && <div>Kerala, INDIA</div>}
                    </div>
                    <div className="pt-1">
                      <span className="inline-flex items-center px-2 py-0.5 bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827] text-[11px] font-bold tracking-wider font-mono">
                        GSTIN: 32AEHCR4208L1ZS
                      </span>
                    </div>
                  </div>

                  {/* Tax Invoice Title & Status Pill */}
                  <div className="text-right space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-[#111827] uppercase">
                      TAX INVOICE
                    </h2>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs font-mono font-bold text-[#6B7280]">{invoice.invoiceNumber}</span>
                      {invoice?.returnStatus === "full" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-wider rounded-none">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          FULLY RETURNED
                        </span>
                      ) : invoice?.returnStatus === "partial" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider rounded-none">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                          PARTIALLY RETURNED
                        </span>
                      ) : (invoice.status || "").toLowerCase() === "paid" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider rounded-none">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          PAID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-violet-50 text-[#7C3AED] border border-[#DDD6FE] text-[10px] font-bold uppercase tracking-wider rounded-none">
                          <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full" />
                          {(invoice.status || "SENT").toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Metadata Grid: Bill To + Invoice Meta */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-[#F9FAFB] border border-[#E5E7EB]">
                  {/* Bill To */}
                  <div>
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                      Bill To
                    </span>
                    <div className="text-base font-bold text-[#111827]">
                      {invoice.customer || "Walk-in Customer"}
                    </div>
                    {invoice.customerPhone && (
                      <div className="text-xs text-[#4B5563] mt-1 font-medium flex items-center gap-1.5">
                        <Phone size={12} className="text-[#6B7280]" />
                        <span className="font-mono text-[#111827]">{invoice.customerPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Invoice Meta Grid */}
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">
                        Invoice Date
                      </span>
                      <span className="font-semibold text-[#111827]">
                        {formatDate(invoice.invoiceDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">
                        Terms
                      </span>
                      <span className="font-semibold text-[#111827]">
                        {invoice.terms || "Due on Receipt"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">
                        Place of Supply
                      </span>
                      <span className="font-semibold text-[#111827]">
                        Kerala (32)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">
                        Sales Person
                      </span>
                      <span className="font-semibold text-[#111827]">
                        {invoice.salesperson || "NIYAS"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Items Table */}
                <div className="border border-[#E5E7EB] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#1e1e1e] text-white">
                        <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider text-[11px] w-12 border-r border-[#333333]">#</th>
                        <th className="py-2.5 px-3 text-left font-bold uppercase tracking-wider text-[11px] border-r border-[#333333]">Item & Description</th>
                        <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider text-[11px] w-16 border-r border-[#333333]">Size</th>
                        <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider text-[11px] w-24 border-r border-[#333333]">HSN/SAC</th>
                        <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider text-[11px] w-16 border-r border-[#333333]">Qty</th>
                        <th className="py-2.5 px-3 text-right font-bold uppercase tracking-wider text-[11px] w-24 border-r border-[#333333]">Rate</th>
                        <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider text-[11px] w-20 border-r border-[#333333]">CGST</th>
                        <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider text-[11px] w-20 border-r border-[#333333]">SGST</th>
                        <th className="py-2.5 px-3 text-right font-bold uppercase tracking-wider text-[11px] w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {!itemsToDisplay || itemsToDisplay.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="px-4 py-8 text-center bg-[#F9FAFB]">
                            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B7280]">
                              <RotateCcw size={16} className="text-red-500" />
                              <span>This invoice has been fully returned. Line items were cleared.</span>
                            </div>
                            <p className="text-xs text-[#9CA3AF] mt-1">
                              Unable to retrieve item details from return invoice.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        itemsToDisplay.map((item, index) => {
                          const itemData = item.itemData || {};
                          const hsnCode = itemData.hsnCode || itemData.hsn || "61051010";
                          const cgstPercent = parseFloat(item.cgstPercent || 0);
                          const sgstPercent = parseFloat(item.sgstPercent || 0);
                          const cgstAmount = parseFloat(item.cgstAmount || 0);
                          const sgstAmount = parseFloat(item.sgstAmount || 0);
                          const baseAmount = parseFloat(item.baseAmount || item.amount || 0);

                          return (
                            <tr key={index} className="hover:bg-[#F9FAFB] transition-colors">
                              <td className="py-3 px-3 text-center text-[#6B7280] font-medium border-r border-[#E5E7EB]">
                                {index + 1}
                              </td>
                              <td className="py-3 px-3 text-left border-r border-[#E5E7EB]">
                                <div className="font-bold text-[#111827] text-xs">
                                  {item.item || itemData.itemName}
                                </div>
                                {itemData.description && (
                                  <div className="text-[11px] text-[#6B7280] mt-0.5">
                                    {itemData.description}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center border-r border-[#E5E7EB]">
                                <span className="inline-block px-2 py-0.5 bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827] font-bold text-[11px]">
                                  {item.size || itemData.size || "42"}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-[11px] text-[#6B7280] border-r border-[#E5E7EB]">
                                {hsnCode}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-[#111827] border-r border-[#E5E7EB]">
                                {parseFloat(item.quantity || 0).toFixed(2)}
                                <span className="text-[10px] text-[#6B7280] block font-normal">pcs</span>
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-[#111827] border-r border-[#E5E7EB]">
                                {parseFloat(item.rate || 0).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>
                              <td className="py-3 px-3 text-center text-[#4B5563] border-r border-[#E5E7EB]">
                                <div className="text-[10px] text-[#6B7280]">{cgstPercent > 0 ? cgstPercent.toFixed(1) : '2.5'}%</div>
                                <div className="font-semibold text-[#111827]">
                                  {cgstAmount > 0 ? cgstAmount.toFixed(2) : (baseAmount * 0.025).toFixed(2)}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center text-[#4B5563] border-r border-[#E5E7EB]">
                                <div className="text-[10px] text-[#6B7280]">{sgstPercent > 0 ? sgstPercent.toFixed(1) : '2.5'}%</div>
                                <div className="font-semibold text-[#111827]">
                                  {sgstAmount > 0 ? sgstAmount.toFixed(2) : (baseAmount * 0.025).toFixed(2)}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-[#111827]">
                                {parseFloat(item.rate || 0).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. Totals & Notes Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                  {/* Left Column: Total in Words & Notes */}
                  <div className="space-y-4">
                    <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                        Total in Words
                      </span>
                      <p className="text-xs font-bold text-[#111827] italic leading-relaxed">
                        {numberToWords(displayFinalTotal)}
                      </p>
                    </div>

                    <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                        Notes & Terms
                      </span>
                      <p className="text-xs text-[#4B5563] leading-relaxed">
                        {invoice.customerNotes || "Thanks for your business. Subject to standard warranty and store terms."}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Financial Breakdown */}
                  <div className="space-y-2 p-5 bg-[#F9FAFB] border border-[#E5E7EB]">
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-[#6B7280] font-medium">Sub Total</span>
                      <span className="font-bold text-[#111827]">{formatCurrency(displaySubTotal)}</span>
                    </div>

                    {parseFloat(invoice.discountAmount || 0) > 0 && (
                      <div className="flex justify-between text-xs py-1 text-red-600">
                        <span className="font-medium">Discount ({invoice.discount?.value || '0'}{invoice.discount?.type || '%'})</span>
                        <span className="font-bold">(-) {formatCurrency(invoice.discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs py-1 text-[#4B5563]">
                      <span className="font-medium">CGST @ 2.5%</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(displayTotalTax / 2)}</span>
                    </div>

                    <div className="flex justify-between text-xs py-1 text-[#4B5563]">
                      <span className="font-medium">SGST @ 2.5%</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(displayTotalTax / 2)}</span>
                    </div>

                    {invoice.tdsTcsAmount > 0 && (
                      <div className="flex justify-between text-xs py-1 text-red-600">
                        <span className="font-medium">Payment Made</span>
                        <span className="font-bold">(-) {formatCurrency(invoice.tdsTcsAmount)}</span>
                      </div>
                    )}

                    {parseFloat(invoice.adjustmentAmount || 0) !== 0 && (
                      <div className="flex justify-between text-xs py-1 text-[#4B5563]">
                        <span className="font-medium">Adjustment</span>
                        <span className="font-semibold text-[#111827]">
                          {parseFloat(invoice.adjustmentAmount || 0) > 0 ? "(+)" : "(-)"} {formatCurrency(Math.abs(parseFloat(invoice.adjustmentAmount || 0)))}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-[#E5E7EB] pt-2 mt-2 flex justify-between text-sm font-extrabold text-[#111827]">
                      <span>Total</span>
                      <span>{formatCurrency(displayFinalTotal)}</span>
                    </div>

                    <div className="bg-[#F5F3FF] border border-[#DDD6FE] p-3.5 mt-3 flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#7C3AED]">Balance Due</span>
                      <span className="text-lg font-black text-[#7C3AED]">{formatCurrency(displayFinalTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Signature Section */}
                <div className="pt-6 border-t border-[#E5E7EB] flex flex-wrap items-end justify-between gap-6">
                  <div className="text-[11px] text-[#9CA3AF]">
                    This is a computer-generated tax invoice. No physical signature required.
                  </div>
                  <div className="text-right">
                    <div className="w-52 border-b border-[#111827] mb-2 ml-auto" />
                    <div className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                      Authorised Signature
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5">
                      For {storeInfo?.name || invoice.branch || "Bridesberry"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RETURN INVOICE MODAL ── */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-none shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E5E7EB]">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-base font-bold text-[#111827] uppercase tracking-wide">Return Invoice</h2>
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="text-[#6B7280] hover:text-[#111827] text-lg font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Original Invoice Info */}
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-none p-4">
                  <p className="text-xs uppercase font-bold text-[#6B7280] tracking-wider mb-1">Original Invoice</p>
                  <p className="text-base font-bold text-[#111827]">{invoice.invoiceNumber}</p>
                  <p className="text-xs text-[#6B7280] mt-1 font-medium">{invoice.customer}</p>
                </div>

                {/* Return Reason */}
                <div>
                  <label className="block text-xs uppercase font-bold text-[#4B5563] tracking-wider mb-2">
                    Reason for Return <span className="text-[#EF4444]">*</span>
                  </label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="e.g., Damaged product, Wrong item, Customer request..."
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-none text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#8B5CF6] focus:outline-none transition-colors"
                    rows="3"
                  />
                </div>

                {/* Refund Payment Method */}
                <div>
                  <label className="block text-xs uppercase font-bold text-[#4B5563] tracking-wider mb-2">
                    Refund Payment Method <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#111827]">
                      <input
                        type="radio"
                        name="returnPaymentMethod"
                        value="Cash"
                        checked={returnPaymentMethod === "Cash"}
                        onChange={(e) => setReturnPaymentMethod(e.target.value)}
                        className="w-4 h-4 accent-[#8B5CF6]"
                      />
                      <span>Cash</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#111827]">
                      <input
                        type="radio"
                        name="returnPaymentMethod"
                        value="RBL"
                        checked={returnPaymentMethod === "RBL"}
                        onChange={(e) => setReturnPaymentMethod(e.target.value)}
                        className="w-4 h-4 accent-[#8B5CF6]"
                      />
                      <span>Razorpay</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-1.5">
                    Select how the refund amount will be returned to the customer
                  </p>
                </div>

                {/* Items to Return */}
                <div>
                  <label className="block text-xs uppercase font-bold text-[#4B5563] tracking-wider mb-3">
                    Select Items to Return
                  </label>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {returnItems.map((item, index) => {
                      const isReturnable = item.itemData?.returnable === true;
                      return (
                        <div 
                          key={index} 
                          className={`border rounded-none p-3.5 transition-colors ${
                            isReturnable 
                              ? "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]" 
                              : "border-red-200 bg-red-50/50 opacity-80"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2.5">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-xs text-[#111827]">{item.item}</p>
                                {!isReturnable && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-800 rounded-none font-bold uppercase tracking-wider">
                                    Not Returnable
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#6B7280] mt-1">
                                Original Qty: {parseFloat(item.quantity || 0).toFixed(2)} pcs
                              </p>
                            </div>
                            <p className="text-xs font-bold text-[#111827]">
                              ₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <label className="text-xs font-medium text-[#6B7280]">Return Qty:</label>
                            <input
                              type="number"
                              min="0"
                              max={parseFloat(item.quantity || 0)}
                              step="0.01"
                              value={item.returnQuantity || 0}
                              onChange={(e) => handleReturnQuantityChange(index, e.target.value)}
                              onFocus={(e) => {
                                if (!isReturnable) {
                                  e.target.blur();
                                  alert(`Item "${item.item || item.itemData?.itemName || 'Unknown'}" cannot be returned as it is not marked as returnable. Please enable the "Returnable Item" option in the product settings to return this item.`);
                                }
                              }}
                              disabled={!isReturnable}
                              className={`w-24 px-2.5 py-1.5 border rounded-none text-xs focus:outline-none ${
                                isReturnable
                                  ? "border-[#E5E7EB] text-[#111827] focus:border-[#8B5CF6]"
                                  : "border-red-200 bg-red-100/50 text-red-800 cursor-not-allowed opacity-60"
                              }`}
                              title={!isReturnable ? `Item "${item.item || item.itemData?.itemName || 'Unknown'}" cannot be returned. Enable "Returnable Item" in product settings.` : ""}
                            />
                            <span className="text-xs text-[#6B7280]">pcs</span>
                            {item.returnQuantity > 0 && isReturnable && (
                              <span className="text-xs font-bold text-red-600 ml-auto">
                                - ₹{calculateReturnAmountWithTax(item).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            )}
                          </div>
                          {!isReturnable && (
                            <p className="text-[11px] text-red-700 mt-2 italic font-medium">
                              This item cannot be returned as it is not marked as returnable.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Return Summary */}
                {returnItems.some((item) => item.returnQuantity > 0) && (
                  <div className="bg-red-50 border border-red-200 rounded-none p-4">
                    <p className="text-xs uppercase font-bold text-red-900 tracking-wider mb-2">Return Summary</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-red-700">Items to Return:</span>
                        <span className="font-bold text-red-950">
                          {returnItems.reduce((sum, item) => sum + (item.returnQuantity || 0), 0).toFixed(2)} pcs
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold border-t border-red-200 pt-2 mt-1.5">
                        <span className="text-red-950 uppercase tracking-wider">Return Amount:</span>
                        <span className="text-red-600 text-sm">
                          - ₹{calculateTotalReturnAmountWithTax().toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] px-6 py-3.5 flex items-center justify-end gap-3 z-10">
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#111827] bg-[#EEEEEE] hover:bg-[#E2E2E2] border border-[#E5E7EB] rounded-none transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReturn}
                  disabled={returningInvoice}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#EF4444] hover:bg-[#DC2626] rounded-none disabled:opacity-50 shadow-sm transition-colors cursor-pointer"
                >
                  {returningInvoice ? "Creating..." : "Create Return Invoice"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SalesInvoiceDetail;

import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { X, Edit, FileText, Check, ChevronRight } from "lucide-react";
import AttachmentDisplay from "../components/AttachmentDisplay";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const PurchaseReceiveDetail = () => {
  const isSidebarOpen = useSidebar();
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  const [receive, setReceive] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [receives, setReceives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPdfView, setShowPdfView] = useState(false);
  const [converting, setConverting] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get user info
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.email || user?._id || user?.id || user?.locCode || null;
        const locCode = user?.locCode || "";

        if (!userId) {
          navigate("/purchase/receives");
          return;
        }

        // Fetch the specific purchase receive
        const receiveResponse = await fetch(`${API_URL}/api/purchase/receives/${id}`);
        if (!receiveResponse.ok) {
          const errorText = await receiveResponse.text();
          console.error("Error fetching purchase receive:", receiveResponse.status, errorText);
          throw new Error(`Purchase receive not found: ${receiveResponse.status}`);
        }
        const receiveData = await receiveResponse.json();
        console.log("Purchase receive data loaded:", receiveData);
        setReceive(receiveData);

        // Fetch vendor if vendorId exists
        if (receiveData.vendorId) {
          try {
            const vendorId = receiveData.vendorId._id || receiveData.vendorId;
            const vendorResponse = await fetch(`${API_URL}/api/purchase/vendors/${vendorId}`);
            if (vendorResponse.ok) {
              const vendorData = await vendorResponse.json();
              setVendor(vendorData);
            }
          } catch (error) {
            console.error("Error fetching vendor:", error);
          }
        }

        // Fetch purchase order to get rates, taxes, and totals
        if (receiveData.purchaseOrderId) {
          try {
            const poId = receiveData.purchaseOrderId._id || receiveData.purchaseOrderId;
            const poResponse = await fetch(`${API_URL}/api/purchase/orders/${poId}`);
            if (poResponse.ok) {
              const poData = await poResponse.json();
              setPurchaseOrder(poData);
            }
          } catch (error) {
            console.error("Error fetching purchase order:", error);
          }
        }

        // Fetch all receives for sidebar
        const receivesResponse = await fetch(`${API_URL}/api/purchase/receives?userId=${userId}${locCode ? `&locCode=${locCode}` : ""}`);
        if (receivesResponse.ok) {
          const receivesData = await receivesResponse.json();
          setReceives(Array.isArray(receivesData) ? receivesData : []);
        }
      } catch (error) {
        console.error("Error loading purchase receive:", error);
        navigate("/purchase/receives");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, API_URL]);

  if (loading) {
    return (
      <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!receive) {
    return (
      <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="text-center">
          <p className="text-lg text-[#64748b] mb-4">Purchase Receive not found</p>
          <Link to="/purchase/receives" className="text-[#2563eb] hover:underline">
            Back to Purchase Receives
          </Link>
        </div>
      </div>
    );
  }

  // Get status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { label: "Draft", className: "bg-[#f3f4f6] text-[#6b7280]" },
      in_transit: { label: "In Transit", className: "bg-[#fef3c7] text-[#92400e]" },
      partially_received: { label: "Partially Received", className: "bg-[#fef3c7] text-[#92400e]" },
      received: { label: "Received", className: "bg-[#dcfce7] text-[#166534]" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "bg-[#f3f4f6] text-[#6b7280]" };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Get company details (you may need to fetch this from user/organization settings)
  const companyName = "Rootements GOOD"; // This should come from user/organization settings
  const companyAddress = "Illath, Kurathikadu, Mavelikara, Assam, 690107"; // This should come from user/organization settings
  const companyGSTIN = "45678"; // This should come from user/organization settings
  const companyCountry = "India";

  // Get vendor details
  const vendorName = vendor?.displayName || vendor?.companyName || receive.vendorName || "";
  const vendorState = vendor?.billingState || "";
  const vendorGSTIN = vendor?.gstin || "";
  const vendorEmail = vendor?.email || "";
  const purchaseOrderNumber = receive.purchaseOrderNumber || (receive.purchaseOrderId?.orderNumber) || "";

  // Build vendor address
  const vendorAddressParts = [
    vendor?.billingAddress,
    vendor?.billingAddress2,
    vendor?.billingCity,
    vendor?.billingState,
    vendor?.billingPinCode,
  ].filter(Boolean);
  const vendorAddress = vendorAddressParts.join(", ");

  // Build delivery address (from purchase order if available)
  const deliveryAddressParts = purchaseOrder?.deliveryAddress ? [
    purchaseOrder.deliveryAddress?.attention,
    purchaseOrder.deliveryAddress?.street1,
    purchaseOrder.deliveryAddress?.street2,
    purchaseOrder.deliveryAddress?.city,
    purchaseOrder.deliveryAddress?.state,
    purchaseOrder.deliveryAddress?.zip,
    purchaseOrder.deliveryAddress?.country,
  ].filter(Boolean) : [];
  const deliveryAddress = deliveryAddressParts.length > 0 ? deliveryAddressParts.join(", ") : "Warehouse";

  // Calculate totals from purchase order items matched with received quantities
  const calculateTotals = () => {
    if (!purchaseOrder || !receive.items) {
      console.log("⚠️ Cannot calculate totals - missing purchaseOrder or receive.items");
      return { subTotal: 0, totalTax: 0, finalTotal: 0, taxBreakdown: {} };
    }

    console.log("📊 Calculating totals:");
    console.log("   Purchase Order items:", purchaseOrder.items?.length || 0);
    console.log("   Receive items:", receive.items?.length || 0);

    // Create multiple maps for flexible matching
    const poItemByIdMap = new Map();
    const poItemByNameMap = new Map();
    const poItemBySkuMap = new Map();
    
    purchaseOrder.items?.forEach(item => {
      // Map by itemId
      if (item.itemId) {
        const itemIdStr = item.itemId._id?.toString() || item.itemId.toString();
        poItemByIdMap.set(itemIdStr, item);
      }
      // Map by itemName
      if (item.itemName) {
        poItemByNameMap.set(item.itemName.toLowerCase().trim(), item);
      }
      // Map by SKU
      if (item.itemSku || item.sku) {
        const sku = (item.itemSku || item.sku).toLowerCase().trim();
        poItemBySkuMap.set(sku, item);
      }
    });

    let subTotal = 0;
    const taxBreakdown = {};
    let matchedItems = 0;

    receive.items.forEach(receiveItem => {
      // Try multiple matching strategies
      let poItem = null;
      
      // 1. Try matching by itemId
      if (receiveItem.itemId) {
        const itemIdStr = receiveItem.itemId._id?.toString() || receiveItem.itemId.toString();
        poItem = poItemByIdMap.get(itemIdStr);
        if (poItem) console.log(`   ✅ Matched by itemId: ${itemIdStr}`);
      }
      
      // 2. Try matching by SKU
      if (!poItem && (receiveItem.itemSku || receiveItem.sku)) {
        const sku = (receiveItem.itemSku || receiveItem.sku).toLowerCase().trim();
        poItem = poItemBySkuMap.get(sku);
        if (poItem) console.log(`   ✅ Matched by SKU: ${sku}`);
      }
      
      // 3. Try matching by itemName
      if (!poItem && receiveItem.itemName) {
        const name = receiveItem.itemName.toLowerCase().trim();
        poItem = poItemByNameMap.get(name);
        if (poItem) console.log(`   ✅ Matched by name: ${receiveItem.itemName}`);
      }
      
      if (poItem) {
        matchedItems++;
        const receivedQty = parseFloat(receiveItem.received) || 0;
        const rate = parseFloat(poItem.rate) || 0;
        const itemAmount = receivedQty * rate;
        subTotal += itemAmount;
        
        console.log(`   Item: ${receiveItem.itemName}, Qty: ${receivedQty}, Rate: ${rate}, Amount: ${itemAmount}`);

        // Calculate taxes based on received quantity
        const taxMultiplier = receivedQty / (parseFloat(poItem.quantity) || 1);
        
        if (poItem.isInterState && poItem.igstPercent > 0) {
          const igstAmount = (parseFloat(poItem.igstAmount) || 0) * taxMultiplier;
          const key = `IGST (${poItem.igstPercent}%)`;
          taxBreakdown[key] = (taxBreakdown[key] || 0) + igstAmount;
        } else if (!poItem.isInterState) {
          if (poItem.cgstPercent > 0) {
            const cgstAmount = (parseFloat(poItem.cgstAmount) || 0) * taxMultiplier;
            const key = `CGST (${poItem.cgstPercent}%)`;
            taxBreakdown[key] = (taxBreakdown[key] || 0) + cgstAmount;
          }
          if (poItem.sgstPercent > 0) {
            const sgstAmount = (parseFloat(poItem.sgstAmount) || 0) * taxMultiplier;
            const key = `SGST (${poItem.sgstPercent}%)`;
            taxBreakdown[key] = (taxBreakdown[key] || 0) + sgstAmount;
          }
        }
      } else {
        console.warn(`   ⚠️ No PO item found for receive item: ${receiveItem.itemName} (ID: ${receiveItem.itemId})`);
      }
    });

    const totalTax = Object.values(taxBreakdown).reduce((sum, val) => sum + val, 0);
    const finalTotal = subTotal + totalTax;
    
    console.log(`   Matched items: ${matchedItems}/${receive.items.length}`);
    console.log(`   Sub Total: ${subTotal}`);
    console.log(`   Total Tax: ${totalTax}`);
    console.log(`   Final Total: ${finalTotal}`);

    return { subTotal, totalTax, finalTotal, taxBreakdown };
  };

  const totals = calculateTotals();

  // Get item with PO details for display
  const getItemWithPODetails = (receiveItem) => {
    if (!purchaseOrder) return null;
    
    // Try multiple matching strategies (same as calculateTotals)
    let poItem = null;
    
    // 1. Try matching by itemId
    if (receiveItem.itemId) {
      const itemIdStr = receiveItem.itemId._id?.toString() || receiveItem.itemId.toString();
      poItem = purchaseOrder.items?.find(item => {
        const poItemIdStr = item.itemId?._id?.toString() || item.itemId?.toString();
        return poItemIdStr === itemIdStr;
      });
    }
    
    // 2. Try matching by SKU
    if (!poItem && (receiveItem.itemSku || receiveItem.sku)) {
      const sku = (receiveItem.itemSku || receiveItem.sku).toLowerCase().trim();
      poItem = purchaseOrder.items?.find(item => {
        const poSku = (item.itemSku || item.sku || "").toLowerCase().trim();
        return poSku === sku;
      });
    }
    
    // 3. Try matching by itemName
    if (!poItem && receiveItem.itemName) {
      const name = receiveItem.itemName.toLowerCase().trim();
      poItem = purchaseOrder.items?.find(item => {
        const poName = (item.itemName || "").toLowerCase().trim();
        return poName === name;
      });
    }
    
    return poItem;
  };

  // Handle PDF Download
  const handlePrint = async () => {
    if (!pdfRef.current || !receive) return;

    try {
      // Dynamically import html2pdf to handle module loading
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      
      const element = pdfRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `PurchaseReceive_${receive.receiveNumber || id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Error generating PDF:", error);
      // Fallback to print dialog if PDF generation fails
      alert("PDF generation failed. Opening print dialog instead.");
      window.print();
    }
  };

  // Convert Purchase Receive to Bill
  const handleConvertToBill = async () => {
    if (!receive || !receive._id) {
      alert("Purchase receive data is missing");
      return;
    }

    setConverting(true);
    try {
      // Get user info for branch
      const userStr = localStorage.getItem("rootfinuser");
      const user = userStr ? JSON.parse(userStr) : null;
      const branch = user?.branch || "Head Office";

      // Generate bill number from receive number
      const billNumber = `BILL-${receive.receiveNumber}`;
      const billDate = new Date().toISOString().split('T')[0]; // Today's date
      
      // Calculate due date (60 days from today)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 60);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const response = await fetch(
        `${API_URL}/api/purchase/receives/${receive._id}/convert-to-bill`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            billNumber: billNumber,
            billDate: billDate,
            dueDate: dueDateStr,
            branch: branch,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to convert to bill" }));
        
        if (response.status === 409) {
          // Bill already exists - navigate to existing bill
          if (errorData.billId) {
            alert(`Bill already exists for this purchase receive. Redirecting to bill...`);
            navigate(`/purchase/bills/${errorData.billId}`);
          } else {
            alert(errorData.message || "Bill already exists for this purchase receive");
          }
        } else {
          alert(errorData.message || "Failed to convert purchase receive to bill");
        }
        return;
      }

      const billData = await response.json();
      alert("Bill created successfully!");
      
      // Navigate to the created bill
      if (billData._id) {
        navigate(`/purchase/bills/${billData._id}`);
      } else {
        // If no bill ID, navigate to bills list
        navigate("/purchase/bills");
      }
    } catch (error) {
      console.error("Error converting to bill:", error);
      alert("An error occurred while converting to bill. Please try again.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] flex ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
      {/* Left Sidebar - Receives List */}
      <div className="w-80 bg-white border-r border-[#e6eafb] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#e6eafb]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#1f2937]">{vendorName}</h2>
          </div>
          <p className="text-2xl font-bold text-[#1f2937]">{formatCurrency(totals.finalTotal)}</p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-b border-[#e6eafb] flex gap-2">
          <button 
            onClick={() => navigate(`/purchase/receives/${id}/edit`)}
            className="flex-1 rounded-md border border-[#d7dcf5] bg-white px-3 py-2 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
          >
            <Edit size={16} className="inline mr-1" />
            Edit
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 rounded-md border border-[#d7dcf5] bg-white px-3 py-2 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
          >
            <FileText size={16} className="inline mr-1" />
            PDF/Print
          </button>
        </div>

        {/* Receives List */}
        <div className="flex-1 overflow-y-auto">
          {receives.map((r) => {
            const isActive = (r._id || r.id) === id;
            return (
              <Link
                key={r._id || r.id}
                to={`/purchase/receives/${r._id || r.id}`}
                className={`block p-4 border-b border-[#e6eafb] hover:bg-[#f9fafb] transition-colors ${
                  isActive ? "bg-[#f0f4ff] border-l-4 border-l-[#2563eb]" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isActive ? "text-[#2563eb]" : "text-[#1f2937]"}`}>
                    {r.receiveNumber}
                  </span>
                  {isActive && <ChevronRight size={16} className="text-[#2563eb]" />}
                </div>
                <div className="text-xs text-[#64748b]">
                  {r.purchaseOrderNumber || (r.purchaseOrderId?.orderNumber) || ""}
                </div>
                <div className="mt-1">
                  {getStatusBadge(r.status || "received")}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-[#e6eafb] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#1f2937]">{receive.receiveNumber}</h1>
              {getStatusBadge(receive.status || "received")}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate(`/purchase/receives/${id}/edit`)}
                className="rounded-md border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
              >
                <Edit size={16} className="inline mr-1" />
                Edit
              </button>
              <button 
                onClick={handlePrint}
                className="rounded-md border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
              >
                <FileText size={16} className="inline mr-1" />
                PDF/Print
              </button>
              <button 
                onClick={handleConvertToBill}
                disabled={converting}
                className="rounded-md border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {converting ? "Converting..." : "Convert to Bill"}
              </button>
              <button className="rounded-md border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">
                Mark as In Transit
              </button>
              <button className="rounded-md border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#dc2626] hover:bg-[#f8fafc] transition-colors">
                Delete
              </button>
              <Link
                to="/purchase/receives"
                className="rounded-md p-2 text-[#64748b] hover:bg-[#f5f7fb] transition-colors"
              >
                <X size={20} />
              </Link>
            </div>
          </div>
          <div className="mt-2 text-sm text-[#64748b]">
            Purchase Orders {receives.length}
          </div>
        </div>

        {/* PDF View Toggle */}
        <div className="bg-white border-b border-[#e6eafb] px-6 py-2">
          <label className="flex items-center gap-2 text-sm text-[#64748b]">
            <input
              type="checkbox"
              checked={showPdfView}
              onChange={(e) => setShowPdfView(e.target.checked)}
              className="rounded border-[#d1d9f2] text-[#4f46e5] focus:ring-[#4338ca]"
            />
            Show PDF View
          </label>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Header Bar */}
          <div className="sticky top-0 z-10 bg-white border-b border-[#e6eafb] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/purchase/receives"
                className="p-2 hover:bg-[#f1f5f9] rounded-md transition-colors"
              >
                <X size={20} className="text-[#64748b]" />
              </Link>
              <h1 className="text-xl font-semibold text-[#1f2937]">Purchase Receive Details</h1>
            </div>
            <div className="flex items-center gap-4">
              {getStatusBadge(receive.status || "received")}
            </div>
          </div>

          {/* Receive Content */}
          <div className="p-8 max-w-5xl mx-auto">
            <div ref={pdfRef} className="bg-white rounded-lg border border-[#e6eafb] shadow-sm">
              {/* Receive Header */}
              <div className="p-8 border-b border-[#e6eafb]">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-4xl font-bold text-[#1f2937] mb-2">PURCHASE RECEIVE</h1>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#64748b] mb-1">GRN# {receive.receiveNumber}</p>
                    <p className="text-lg font-semibold text-[#1f2937]">
                      Total {formatCurrency(totals.finalTotal)}
                    </p>
                  </div>
                </div>

                {/* Order From / Order To */}
                <div className="grid grid-cols-2 gap-8">
                  {/* Order From */}
                  <div>
                    <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                      Order From
                    </h3>
                    <div className="text-sm text-[#1f2937] space-y-1">
                      <p className="font-semibold">{vendorName}</p>
                      {vendorAddress && <p>{vendorAddress}</p>}
                      {vendorState && <p>{vendorState}</p>}
                      {vendorGSTIN && <p>GSTIN {vendorGSTIN}</p>}
                      {vendorEmail && <p>{vendorEmail}</p>}
                    </div>
                  </div>

                  {/* Order To */}
                  <div>
                    <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                      Order To
                    </h3>
                    <div className="text-sm text-[#1f2937] space-y-1">
                      <p className="font-semibold">{companyName}</p>
                      <p>{companyAddress}</p>
                      <p>{companyCountry}</p>
                      <p>GSTIN {companyGSTIN}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                {deliveryAddress && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                      Delivery Address
                    </h3>
                    <div className="text-sm text-[#1f2937]">
                      <p>{deliveryAddress}</p>
                    </div>
                  </div>
                )}

                {/* Dates and Terms */}
                <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-[#64748b]">Received Date: </span>
                    <span className="text-[#1f2937] font-medium">{formatDate(receive.receivedDate)}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b]">Purchase Order#: </span>
                    <Link
                      to={`/purchase/orders/${receive.purchaseOrderId?._id || receive.purchaseOrderId}`}
                      className="text-[#2563eb] hover:underline font-medium"
                    >
                      {purchaseOrderNumber}
                    </Link>
                  </div>
                  <div>
                    <span className="text-[#64748b]">Terms: </span>
                    <span className="text-[#1f2937] font-medium">{purchaseOrder?.paymentTerms || "Due on Receipt"}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="p-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e6eafb]">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                        #
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                        Item & Description
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                        Size
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                        HSN/SAC
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                        Qty
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                        Rate
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {receive.items && receive.items.length > 0 ? (
                      receive.items.map((item, index) => {
                        const poItem = getItemWithPODetails(item);
                        const receivedQty = parseFloat(item.received) || 0;
                        const rate = poItem ? (parseFloat(poItem.rate) || 0) : 0;
                        const amount = receivedQty * rate;
                        
                        return (
                          <tr key={index} className="border-b border-[#e6eafb]">
                            <td className="py-3 px-4 text-sm text-[#1f2937]">{index + 1}</td>
                            <td className="py-3 px-4 text-sm text-[#1f2937]">
                              <div>
                                <p className="font-medium">{item.itemName || "-"}</p>
                                {item.itemDescription && (
                                  <p className="text-xs text-[#64748b] mt-1">{item.itemDescription}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-[#1f2937]">{poItem?.size || "-"}</td>
                            <td className="py-3 px-4 text-sm text-[#1f2937]">
                              {poItem?.taxCode || "-"}
                            </td>
                            <td className="py-3 px-4 text-sm text-[#1f2937] text-right">
                              {receivedQty.toFixed(2)} pcs
                            </td>
                            <td className="py-3 px-4 text-sm text-[#1f2937] text-right">
                              {formatCurrency(rate)}
                            </td>
                            <td className="py-3 px-4 text-sm text-[#1f2937] text-right font-medium">
                              {formatCurrency(amount)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-sm text-[#64748b]">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="p-8 border-t border-[#e6eafb] bg-[#fafbff]">
                <div className="max-w-md ml-auto space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">Sub Total</span>
                    <span className="text-[#1f2937] font-medium">
                      {formatCurrency(totals.subTotal)}
                    </span>
                  </div>

                  {/* Tax Breakdown */}
                  {Object.entries(totals.taxBreakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-[#64748b]">{key}</span>
                      <span className="text-[#1f2937] font-medium">{formatCurrency(value)}</span>
                    </div>
                  ))}

                  <div className="pt-3 border-t border-[#e6eafb] flex justify-between">
                    <span className="text-base font-semibold text-[#1f2937]">Total</span>
                    <span className="text-base font-semibold text-[#1f2937]">
                      {formatCurrency(totals.finalTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {receive.notes && (
                <div className="p-8 border-t border-[#e6eafb]">
                  <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                    Notes
                  </h3>
                  <p className="text-sm text-[#1f2937] whitespace-pre-wrap">{receive.notes}</p>
                </div>
              )}

              {/* Attachments */}
              {receive.attachments && receive.attachments.length > 0 && (
                <div className="p-8 border-t border-[#e6eafb]">
                  <AttachmentDisplay attachments={receive.attachments} />
                </div>
              )}

              {/* Authorized Signature */}
              <div className="p-8 border-t border-[#e6eafb]">
                <div className="max-w-xs">
                  <div className="border-b border-[#e6eafb] h-16"></div>
                  <p className="text-xs text-[#64748b] mt-2">Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseReceiveDetail;


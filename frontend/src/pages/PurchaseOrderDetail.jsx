import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { X, Edit, FileText, Check, ChevronRight, Send } from "lucide-react";
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

const PurchaseOrderDetail = () => {
  const isSidebarOpen = useSidebar();
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  const [order, setOrder] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get user info
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        // Use email as primary identifier (e.g., officerootments@gmail.com)
        const userId = user?.email || user?._id || user?.id || user?.locCode || null;
        const locCode = user?.locCode || "";

        if (!userId) {
          navigate("/purchase/orders");
          return;
        }

        // Fetch the specific purchase order
        const orderResponse = await fetch(`${API_URL}/api/purchase/orders/${id}`);
        if (!orderResponse.ok) {
          const errorText = await orderResponse.text();
          console.error("Error fetching purchase order:", orderResponse.status, errorText);
          throw new Error(`Purchase order not found: ${orderResponse.status}`);
        }
        const orderData = await orderResponse.json();
        console.log("Purchase order data loaded:", orderData);
        setOrder(orderData);

        // Fetch vendor if vendorId exists
        if (orderData.vendorId) {
          try {
            const vendorResponse = await fetch(`${API_URL}/api/purchase/vendors/${orderData.vendorId}`);
            if (vendorResponse.ok) {
              const vendorData = await vendorResponse.json();
              setVendor(vendorData);
            }
          } catch (error) {
            console.error("Error fetching vendor:", error);
          }
        }

        // Fetch all orders for sidebar
        const ordersResponse = await fetch(`${API_URL}/api/purchase/orders?userId=${userId}${locCode ? `&locCode=${locCode}` : ""}`);
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          setOrders(Array.isArray(ordersData) ? ordersData : []);
        }
      } catch (error) {
        console.error("Error loading purchase order:", error);
        navigate("/purchase/orders");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, API_URL]);

  // Send purchase order function
  const handleSendOrder = async () => {
    if (!order || order.status !== "draft") return;
    
    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/purchase/orders/${id}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send purchase order");
      }
      
      const data = await response.json();
      console.log("Purchase order sent successfully:", data);
      
      // Update the order status in the local state
      setOrder(prev => ({ ...prev, status: "sent" }));
      
      // Show success message (you could use a toast notification here)
      alert("Purchase order sent successfully!");
      
    } catch (error) {
      console.error("Error sending purchase order:", error);
      alert("Failed to send purchase order: " + error.message);
    } finally {
      setSending(false);
    }
  };

  // Handle PDF Download
  const handlePrint = async () => {
    if (!pdfRef.current || !order) return;

    try {
      // Dynamically import html2pdf to handle module loading
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      
      const element = pdfRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `PurchaseOrder_${order.orderNumber || id}.pdf`,
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

  if (loading) {
    return (
      <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="text-center">
          <p className="text-lg text-[#64748b] mb-4">Purchase Order not found</p>
          <Link to="/purchase/orders" className="text-[#2563eb] hover:underline">
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  // Get status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { label: "Draft", className: "bg-[#f3f4f6] text-[#6b7280]" },
      sent: { label: "Sent", className: "bg-[#dbeafe] text-[#1e40af]" },
      received: { label: "Received", className: "bg-[#dcfce7] text-[#166534]" },
      cancelled: { label: "Cancelled", className: "bg-[#fee2e2] text-[#991b1b]" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "bg-[#f3f4f6] text-[#6b7280]" };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Process orders for sidebar
  const processedOrders = orders.map((o) => ({
    ...o,
    finalTotal: parseFloat(o.finalTotal) || 0,
  }));

  // Get company details (you may need to fetch this from user/organization settings)
  const companyName = "Meenakshi Apparels"; // This should come from user/organization settings
  const companyAddress = "6182 MAINROAD, GANDHI NAGAR, DELHI-110051"; // This should come from user/organization settings
  const companyGSTIN = "07AACPA8514M1ZX"; // This should come from user/organization settings
  const companyCountry = "India";

  // Get vendor details
  const vendorName = vendor?.displayName || vendor?.companyName || order.vendorName || "";
  const vendorState = vendor?.billingState || "";
  const vendorGSTIN = vendor?.gstin || "";
  const vendorEmail = vendor?.email || "";

  // Build vendor address
  const vendorAddressParts = [
    vendor?.billingAddress,
    vendor?.billingAddress2,
    vendor?.billingCity,
    vendor?.billingState,
    vendor?.billingPinCode,
  ].filter(Boolean);
  const vendorAddress = vendorAddressParts.join(", ");

  // Build delivery address
  const deliveryAddressParts = [
    order.deliveryAddress?.attention,
    order.deliveryAddress?.street1,
    order.deliveryAddress?.street2,
    order.deliveryAddress?.city,
    order.deliveryAddress?.state,
    order.deliveryAddress?.zip,
    order.deliveryAddress?.country,
  ].filter(Boolean);
  const deliveryAddress = deliveryAddressParts.join(", ");

  // Calculate tax breakdown
  const taxBreakdown = {};
  order.items?.forEach((item) => {
    if (item.isInterState && item.igstPercent > 0) {
      const key = `IGST${item.igstPercent} (${item.igstPercent}%)`;
      taxBreakdown[key] = (taxBreakdown[key] || 0) + parseFloat(item.igstAmount || 0);
    } else if (!item.isInterState) {
      if (item.cgstPercent > 0) {
        const key = `CGST${item.cgstPercent} (${item.cgstPercent}%)`;
        taxBreakdown[key] = (taxBreakdown[key] || 0) + parseFloat(item.cgstAmount || 0);
      }
      if (item.sgstPercent > 0) {
        const key = `SGST${item.sgstPercent} (${item.sgstPercent}%)`;
        taxBreakdown[key] = (taxBreakdown[key] || 0) + parseFloat(item.sgstAmount || 0);
      }
    }
  });

  return (
    <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] flex ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
      {/* Left Sidebar - Orders List */}
      <div className="w-80 bg-white border-r border-[#e6eafb] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#e6eafb]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#1f2937]">{vendorName}</h2>
          </div>
          <p className="text-2xl font-bold text-[#1f2937]">{formatCurrency(order.finalTotal || 0)}</p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-b border-[#e6eafb] flex gap-2">
          <button 
            onClick={() => navigate(`/purchase/orders/${id}/edit`)}
            className="flex-1 px-3 py-2 text-sm font-medium text-[#475569] border border-[#d7dcf5] rounded-md hover:bg-[#f8fafc] transition-colors"
          >
            <Edit size={14} className="inline mr-1" />
            Edit
          </button>
          {order.status === "draft" && (
            <button 
              onClick={handleSendOrder}
              disabled={sending}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-[#3762f9] rounded-md hover:bg-[#2748c9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={14} className="inline mr-1" />
              {sending ? "Sending..." : "Send"}
            </button>
          )}
          <button 
            onClick={handlePrint}
            className="flex-1 px-3 py-2 text-sm font-medium text-[#475569] border border-[#d7dcf5] rounded-md hover:bg-[#f8fafc] transition-colors"
          >
            <FileText size={14} className="inline mr-1" />
            PDF/Print
          </button>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto">
          {processedOrders
            .filter((o) => o.vendorName === order.vendorName)
            .map((o) => (
              <Link
                key={o._id}
                to={`/purchase/orders/${o._id}`}
                className={`block p-4 border-b border-[#e6eafb] hover:bg-[#f9fafb] transition-colors ${
                  o._id === id ? "bg-[#eff6ff] border-l-4 border-l-[#2563eb]" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-[#d1d9f2] text-[#4f46e5] focus:ring-[#4338ca]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-[#1f2937] truncate">{o.vendorName}</p>
                      <ChevronRight size={16} className="text-[#94a3b8] shrink-0" />
                    </div>
                    <p className="text-xs text-[#64748b] mb-1">
                      {o.orderNumber} - {formatDate(o.date)}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#1f2937]">
                        {formatCurrency(o.finalTotal)}
                      </p>
                      {getStatusBadge(o.status || "draft")}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Header Bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#e6eafb] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/purchase/orders"
              className="p-2 hover:bg-[#f1f5f9] rounded-md transition-colors"
            >
              <X size={20} className="text-[#64748b]" />
            </Link>
            <h1 className="text-xl font-semibold text-[#1f2937]">Purchase Order Details</h1>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge(order.status || "draft")}
          </div>
        </div>

        {/* Order Content */}
        <div className="p-8 max-w-5xl mx-auto">
          <div ref={pdfRef} className="bg-white rounded-lg border border-[#e6eafb] shadow-sm">
            {/* Order Header */}
            <div className="p-8 border-b border-[#e6eafb]">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-[#1f2937] mb-2">PURCHASE ORDER</h1>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#64748b] mb-1">PO# {order.orderNumber}</p>
                  <p className="text-lg font-semibold text-[#1f2937]">
                    Total {formatCurrency(order.finalTotal || 0)}
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
                    <p className="font-semibold">{companyName}</p>
                    <p>{companyAddress}</p>
                    <p>{companyCountry}</p>
                    <p>GSTIN {companyGSTIN}</p>
                  </div>
                </div>

                {/* Order To */}
                <div>
                  <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                    Order To
                  </h3>
                  <div className="text-sm text-[#1f2937] space-y-1">
                    <p className="font-semibold">{vendorName}</p>
                    {vendorAddress && <p>{vendorAddress}</p>}
                    {vendorState && <p>{vendorState}</p>}
                    {vendorGSTIN && <p>GSTIN {vendorGSTIN}</p>}
                    {vendorEmail && <p>{vendorEmail}</p>}
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
                  <span className="text-[#64748b]">Order Date: </span>
                  <span className="text-[#1f2937] font-medium">{formatDate(order.date)}</span>
                </div>
                <div>
                  <span className="text-[#64748b]">Delivery Date: </span>
                  <span className="text-[#1f2937] font-medium">
                    {order.deliveryDate ? formatDate(order.deliveryDate) : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748b]">Terms: </span>
                  <span className="text-[#1f2937] font-medium">{order.paymentTerms || "Due on Receipt"}</span>
                </div>
              </div>

              {/* Reference Number */}
              {order.referenceNumber && (
                <div className="mt-4 text-sm">
                  <span className="text-[#64748b]">Reference#: </span>
                  <span className="text-[#1f2937] font-medium">{order.referenceNumber}</span>
                </div>
              )}

              {/* Shipment Preference */}
              {order.shipmentPreference && (
                <div className="mt-2 text-sm">
                  <span className="text-[#64748b]">Shipment Preference: </span>
                  <span className="text-[#1f2937] font-medium">{order.shipmentPreference}</span>
                </div>
              )}
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
                  {order.items?.map((item, index) => (
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
                      <td className="py-3 px-4 text-sm text-[#1f2937]">{item.size || "-"}</td>
                      <td className="py-3 px-4 text-sm text-[#1f2937]">
                        {item.taxCode || "-"}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] text-right">
                        {item.quantity?.toFixed(2) || "0.00"} pcs
                      </td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] text-right">
                        {formatCurrency(item.rate || 0)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] text-right font-medium">
                        {formatCurrency(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="p-8 border-t border-[#e6eafb] bg-[#fafbff]">
              <div className="max-w-md ml-auto space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748b]">Sub Total</span>
                  <span className="text-[#1f2937] font-medium">
                    {formatCurrency(order.subTotal || 0)}
                  </span>
                </div>

                {/* Tax Breakdown */}
                {Object.entries(taxBreakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-[#64748b]">{key}</span>
                    <span className="text-[#1f2937] font-medium">{formatCurrency(value)}</span>
                  </div>
                ))}

                {/* Discount */}
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">Discount</span>
                    <span className="text-[#1f2937] font-medium text-[#10b981]">
                      -{formatCurrency(order.discountAmount || 0)}
                    </span>
                  </div>
                )}

                {/* TDS/TCS */}
                {order.tdsTcsAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">
                      {order.tdsTcsType || "TDS"} ({order.tdsTcsTax || ""})
                    </span>
                    <span className="text-[#1f2937] font-medium text-[#dc2626]">
                      -{formatCurrency(order.tdsTcsAmount || 0)}
                    </span>
                  </div>
                )}

                {/* Adjustment */}
                {order.adjustment !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">Adjustment</span>
                    <span className="text-[#1f2937] font-medium">
                      {order.adjustment > 0 ? "+" : ""}
                      {formatCurrency(order.adjustment || 0)}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-[#e6eafb] flex justify-between">
                  <span className="text-base font-semibold text-[#1f2937]">Total</span>
                  <span className="text-base font-semibold text-[#1f2937]">
                    {formatCurrency(order.finalTotal || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.customerNotes && (
              <div className="p-8 border-t border-[#e6eafb]">
                <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                  Customer Notes
                </h3>
                <p className="text-sm text-[#1f2937] whitespace-pre-wrap">{order.customerNotes}</p>
              </div>
            )}

            {/* Terms and Conditions */}
            {order.termsAndConditions && (
              <div className="p-8 border-t border-[#e6eafb]">
                <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                  Terms and Conditions
                </h3>
                <p className="text-sm text-[#1f2937] whitespace-pre-wrap">{order.termsAndConditions}</p>
              </div>
            )}

            {/* Attachments */}
            {order.attachments && order.attachments.length > 0 && (
              <div className="p-8 border-t border-[#e6eafb]">
                <AttachmentDisplay attachments={order.attachments} />
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
  );
};

export default PurchaseOrderDetail;


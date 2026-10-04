import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { X, Edit, Check, ChevronRight, Download } from "lucide-react";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const formatCurrency = (value) => {
  const isSidebarOpen = useSidebar();
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

const VendorCreditDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const printRef = useRef(null);

  const [credit, setCredit] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPdfView, setShowPdfView] = useState(false);

  // Handle Download PDF
  const handleDownloadPDF = () => {
    if (!printRef.current || !credit) return;

    try {
      const printContent = printRef.current.innerHTML;
      
      // Create a new window for printing
      const printWindow = window.open("", "_blank");
      
      if (!printWindow) {
        alert("Please allow popups for this site to download PDF");
        return;
      }

      // Write the HTML content
      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Vendor Credit ${credit.creditNoteNumber || ""}</title>
            <meta charset="utf-8">
            <style>
              @page { 
                margin: 10mm; 
                size: A4;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0;
                padding: 20px;
                background: white;
              }
              .credit-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0;
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left; 
              }
              th {
                background-color: #f5f5f5;
                font-weight: bold;
              }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .summary { 
                margin-top: 20px; 
                border-top: 2px solid #ddd; 
                padding-top: 10px; 
              }
              .summary-row {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 10px; 
                }
                @page {
                  margin: 10mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="credit-container">
              ${printContent}
            </div>
            <script>
              // Auto-trigger print dialog when page loads
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try the Print option instead.");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get user info
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?._id || user?.id || user?.email || user?.locCode || null;
        const locCode = user?.locCode || "";

        if (!userId) {
          navigate("/purchase/vendor-credits");
          return;
        }

        // Fetch the specific vendor credit
        const creditResponse = await fetch(`${API_URL}/api/purchase/vendor-credits/${id}`);
        if (!creditResponse.ok) {
          const errorText = await creditResponse.text();
          console.error("Error fetching vendor credit:", creditResponse.status, errorText);
          throw new Error(`Vendor credit not found: ${creditResponse.status}`);
        }
        const creditData = await creditResponse.json();
        console.log("Vendor credit data loaded:", creditData);
        setCredit(creditData);

        // Fetch vendor if vendorId exists
        if (creditData.vendorId) {
          try {
            const vendorResponse = await fetch(`${API_URL}/api/purchase/vendors/${creditData.vendorId}`);
            if (vendorResponse.ok) {
              const vendorData = await vendorResponse.json();
              setVendor(vendorData);
            }
          } catch (error) {
            console.error("Error fetching vendor:", error);
          }
        }

        // Fetch all vendor credits for sidebar
        const creditsResponse = await fetch(`${API_URL}/api/purchase/vendor-credits?userId=${userId}${locCode ? `&locCode=${locCode}` : ""}`);
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          setCredits(Array.isArray(creditsData) ? creditsData : []);
        }
      } catch (error) {
        console.error("Error loading vendor credit:", error);
        navigate("/purchase/vendor-credits");
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

  if (!credit) {
    return (
      <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="text-center">
          <p className="text-lg text-[#64748b] mb-4">Vendor credit not found</p>
          <Link to="/purchase/vendor-credits" className="text-[#2563eb] hover:underline">
            Back to Vendor Credits
          </Link>
        </div>
      </div>
    );
  }

  const creditTotal = parseFloat(credit.finalTotal) || 0;
  const unusedCredit = parseFloat(credit.unusedCredit) || 0;
  const appliedCredit = parseFloat(credit.appliedCredit) || 0;

  // Process credits for sidebar
  const processedCredits = credits
    .filter((c) => c.vendorName === credit.vendorName)
    .map((c) => ({
      ...c,
      finalTotal: parseFloat(c.finalTotal) || 0,
    }));

  // Get company details (you may need to fetch this from user/organization settings)
  const companyName = "Bridesberry"; // This should come from user/organization settings
  const companyAddress = "Kerala"; // This should come from user/organization settings
  const companyGSTIN = "32ABCFR1426N129"; // This should come from user/organization settings
  const companyEmail = "rootmentsoffice@gmail.com"; // This should come from user/organization settings
  const companyCountry = "India";

  // Get vendor details
  const vendorName = vendor?.displayName || vendor?.companyName || credit.vendorName || "";
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

  // Calculate tax breakdown
  const taxBreakdown = {};
  credit.items?.forEach((item) => {
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
      {/* Left Sidebar - Vendor Credits List */}
      <div className="w-80 bg-white border-r border-[#e6eafb] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#e6eafb]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#1f2937]">{vendorName}</h2>
          </div>
          <p className="text-2xl font-bold text-[#1f2937]">{formatCurrency(creditTotal)}</p>
          {unusedCredit > 0 && (
            <p className="text-sm text-[#64748b] mt-1">
              Unused: {formatCurrency(unusedCredit)}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-3 border-b border-[#e6eafb] bg-[#fafbff] flex items-center gap-2">
          <button 
            onClick={() => navigate(`/purchase/vendor-credits/${id}/edit`)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Edit size={14} className="text-slate-500" />
            <span>Edit</span>
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/80 active:bg-indigo-100 border border-indigo-200/80 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Download size={14} className="text-indigo-600" />
            <span>PDF</span>
          </button>
        </div>

        {/* Status Banner */}
        <div className="p-4 bg-[#f0fdf4] border-b border-[#e6eafb]">
          <p className="text-sm font-medium text-[#16a34a]">
            Status: {credit.status?.toUpperCase() || "DRAFT"}
          </p>
        </div>

        {/* Vendor Credits List */}
        <div className="flex-1 overflow-y-auto">
          {processedCredits.map((c) => (
            <Link
              key={c.id || c._id}
              to={`/purchase/vendor-credits/${c.id || c._id}`}
              className={`block p-4 border-b border-[#e6eafb] hover:bg-[#f9fafb] transition-colors ${
                (c.id || c._id) === id ? "bg-[#eff6ff] border-l-4 border-l-[#2563eb]" : ""
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
                    <p className="text-sm font-medium text-[#1f2937] truncate">{c.vendorName}</p>
                    <ChevronRight size={16} className="text-[#94a3b8] shrink-0" />
                  </div>
                  <p className="text-xs text-[#64748b] mb-1">
                    {c.creditNoteNumber} - {formatDate(c.creditDate)}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#1f2937]">
                      {formatCurrency(c.finalTotal)}
                    </p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      c.status === "open"
                        ? "text-[#16a34a] bg-[#dcfce7]"
                        : c.status === "draft"
                        ? "text-[#6b7280] bg-[#f3f4f6]"
                        : "text-[#dc2626] bg-[#fee2e2]"
                    }`}>
                      {c.status?.toUpperCase() || "DRAFT"}
                    </span>
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
              to="/purchase/vendor-credits"
              className="p-2 hover:bg-[#f1f5f9] rounded-md transition-colors"
            >
              <X size={20} className="text-[#64748b]" />
            </Link>
            <h1 className="text-xl font-semibold text-[#1f2937]">Vendor Credit Details</h1>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[#475569] cursor-pointer">
              <input
                type="checkbox"
                checked={showPdfView}
                onChange={(e) => setShowPdfView(e.target.checked)}
                className="h-4 w-4 rounded border-[#d1d9f2] text-[#4f46e5] focus:ring-[#4338ca]"
              />
              Show PDF View
            </label>
          </div>
        </div>

        {/* Vendor Credit Content */}
        <div className="p-8 max-w-5xl mx-auto">
          <div ref={printRef} className="bg-white rounded-lg border border-[#e6eafb] shadow-sm">
            {/* Vendor Credit Header */}
            <div className="p-8 border-b border-[#e6eafb]">
              <div className="flex items-start justify-between mb-6">
                {/* Company Info (Top Left) */}
                <div>
                  <div className="text-sm text-[#1f2937] space-y-1 mb-4">
                    <p className="font-semibold">{companyName}</p>
                    <p>{companyAddress}</p>
                    <p>{companyCountry}</p>
                    <p>GSTIN {companyGSTIN}</p>
                    {companyEmail && <p>{companyEmail}</p>}
                  </div>
                </div>
                
                {/* Vendor Credit Title and Info (Top Right) */}
                <div className="text-right">
                  <h1 className="text-4xl font-bold text-[#1f2937] mb-2">VENDOR CREDIT</h1>
                  <p className="text-sm text-[#64748b] mb-1">Credit Note# {credit.creditNoteNumber}</p>
                  <p className="text-lg font-semibold text-[#1f2937]">
                    Total {formatCurrency(creditTotal)}
                  </p>
                  {unusedCredit > 0 && (
                    <p className="text-sm text-[#64748b] mt-1">
                      Unused: {formatCurrency(unusedCredit)}
                    </p>
                  )}
                </div>
              </div>

              {/* Credit From / Credit Details */}
              <div className="grid grid-cols-2 gap-8 mt-6">
                {/* Credit From (Vendor) */}
                <div>
                  <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                    Credit From
                  </h3>
                  <div className="text-sm text-[#1f2937] space-y-1">
                    <p className="font-semibold">{vendorName}</p>
                    {vendorAddress && <p>{vendorAddress}</p>}
                    {vendorState && <p>{vendorState}</p>}
                    {vendorGSTIN && <p>GSTIN {vendorGSTIN}</p>}
                    {vendorEmail && <p>{vendorEmail}</p>}
                  </div>
                </div>

                {/* Credit Details (Date and Order) */}
                <div>
                  <div className="text-sm text-[#1f2937] space-y-2">
                    <div>
                      <span className="text-[#64748b]">Credit Date: </span>
                      <span className="font-medium">{formatDate(credit.creditDate)}</span>
                    </div>
                    {credit.orderNumber && (
                      <div>
                        <span className="text-[#64748b]">Order#: </span>
                        <span className="font-medium">{credit.orderNumber}</span>
                      </div>
                    )}
                    {credit.branch && (
                      <div>
                        <span className="text-[#64748b]">Branch: </span>
                        <span className="font-medium">{credit.branch}</span>
                      </div>
                    )}
                    {credit.warehouse && (
                      <div>
                        <span className="text-[#64748b]">Warehouse: </span>
                        <span className="font-medium">{credit.warehouse}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="p-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#e6eafb]">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-r border-[#e6eafb]">
                      #
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-r border-[#e6eafb]">
                      Item & Description
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-r border-[#e6eafb]">
                      Size
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-r border-[#e6eafb]">
                      HSN/SAC
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-r border-[#e6eafb]">
                      Qty
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-r border-[#e6eafb]">
                      Rate
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {credit.items?.map((item, index) => (
                    <tr key={index} className="border-b border-[#e6eafb]">
                      <td className="py-3 px-4 text-sm text-[#1f2937] border-r border-[#e6eafb]">{index + 1}</td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] border-r border-[#e6eafb]">
                        <div>
                          <p className="font-medium">{item.itemName || "-"}</p>
                          {item.itemDescription && (
                            <p className="text-xs text-[#64748b] mt-1">{item.itemDescription}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] border-r border-[#e6eafb]">{item.size || "-"}</td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] border-r border-[#e6eafb]">
                        {item.taxCode || "-"}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] text-right border-r border-[#e6eafb]">
                        {item.quantity?.toFixed(2) || "0.00"} PCS
                      </td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] text-right border-r border-[#e6eafb]">
                        {formatCurrency(item.rate || 0).replace('₹', '').trim()}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] text-right font-medium">
                        {formatCurrency(item.amount || item.baseAmount || 0).replace('₹', '').trim()}
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
                    {formatCurrency(credit.subTotal || 0).replace('₹', '').trim()}
                  </span>
                </div>

                {/* Tax Breakdown */}
                {Object.entries(taxBreakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-[#64748b]">{key}</span>
                    <span className="text-[#1f2937] font-medium">{formatCurrency(value).replace('₹', '').trim()}</span>
                  </div>
                ))}

                {/* Discount */}
                {credit.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">Discount</span>
                    <span className="text-[#1f2937] font-medium text-[#10b981]">
                      -{formatCurrency(credit.discountAmount || 0).replace('₹', '').trim()}
                    </span>
                  </div>
                )}

                {/* TDS/TCS */}
                {credit.tdsTcsAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">
                      {credit.tdsTcsType || "TDS"} ({credit.tdsTcsTax || ""})
                    </span>
                    <span className="text-[#1f2937] font-medium text-[#dc2626]">
                      -{formatCurrency(credit.tdsTcsAmount || 0).replace('₹', '').trim()}
                    </span>
                  </div>
                )}

                {/* Adjustment */}
                {credit.adjustment !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">Adjustment</span>
                    <span className="text-[#1f2937] font-medium">
                      {credit.adjustment > 0 ? "+" : ""}
                      {formatCurrency(credit.adjustment || 0).replace('₹', '').trim()}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-[#e6eafb] flex justify-between">
                  <span className="text-base font-semibold text-[#1f2937]">Total</span>
                  <span className="text-base font-semibold text-[#1f2937]">
                    {formatCurrency(credit.finalTotal || 0)}
                  </span>
                </div>

                {/* Credit Application Info */}
                {appliedCredit > 0 && (
                  <div className="pt-3 border-t border-[#e6eafb] space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748b]">Applied to Bills</span>
                      <span className="text-[#1f2937] font-medium">
                        {formatCurrency(appliedCredit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748b]">Unused Credit</span>
                      <span className="text-[#1f2937] font-medium">
                        {formatCurrency(unusedCredit)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {credit.notes && (
              <div className="p-8 border-t border-[#e6eafb]">
                <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                  Notes
                </h3>
                <p className="text-sm text-[#1f2937] whitespace-pre-wrap">{credit.notes}</p>
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

export default VendorCreditDetail;




import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { X, Edit, Check, ChevronRight, Download, Trash2 } from "lucide-react";
import baseUrl from "../api/api";
import AttachmentDisplay from "../components/AttachmentDisplay";
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

const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
};

const BillDetail = () => {
  const isSidebarOpen = useSidebar();
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const printRef = useRef(null);

  const [bill, setBill] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPdfView, setShowPdfView] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, step: 1 });
  const [deleting, setDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  // Handle Delete Bill
  const handleDeleteClick = () => {
    setDeleteConfirm({ show: true, step: 1 });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.step === 1) {
      // First confirmation - move to second step
      setDeleteConfirm({ ...deleteConfirm, step: 2 });
      return;
    }

    // Second confirmation - proceed with deletion
    if (deleteConfirm.step === 2 && id) {
      setDeleting(true);
      try {
        const response = await fetch(`${API_URL}/api/purchase/bills/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete bill");
        }

        // Navigate back to bills list after successful deletion
        navigate("/purchase/bills");
      } catch (error) {
        console.error("Error deleting bill:", error);
        alert(`Failed to delete bill: ${error.message}`);
        setDeleting(false);
        setDeleteConfirm({ show: false, step: 1 });
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, step: 1 });
  };

  // Handle Change Status from Draft to Completed
  const handleChangeStatusToCompleted = async () => {
    if (!bill || bill.status !== "draft") return;
    
    setChangingStatus(true);
    try {
      const response = await fetch(`${API_URL}/api/purchase/bills/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...bill,
          status: "completed",
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change bill status");
      }
      
      const updatedBill = await response.json();
      console.log("Bill status changed successfully:", updatedBill);
      
      // Update the bill status in the local state
      setBill(prev => ({ ...prev, status: "completed" }));
      
      alert("Bill status changed to Completed successfully!");
      
    } catch (error) {
      console.error("Error changing bill status:", error);
      alert("Failed to change bill status: " + error.message);
    } finally {
      setChangingStatus(false);
    }
  };

  // Handle Download PDF
  const handleDownloadPDF = () => {
    if (!printRef.current || !bill) return;

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
            <title>Bill ${bill.billNumber || ""}</title>
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
              .bill-container {
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
            <div class="bill-container">
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
          navigate("/purchase/bills");
          return;
        }

        // Fetch the specific bill
        const billResponse = await fetch(`${API_URL}/api/purchase/bills/${id}`);
        if (!billResponse.ok) {
          const errorText = await billResponse.text();
          console.error("Error fetching bill:", billResponse.status, errorText);
          throw new Error(`Bill not found: ${billResponse.status}`);
        }
        const billData = await billResponse.json();
        console.log("Bill data loaded:", billData);
        setBill(billData);

        // Fetch vendor if vendorId exists
        if (billData.vendorId) {
          try {
            const vendorResponse = await fetch(`${API_URL}/api/purchase/vendors/${billData.vendorId}`);
            if (vendorResponse.ok) {
              const vendorData = await vendorResponse.json();
              setVendor(vendorData);
            }
          } catch (error) {
            console.error("Error fetching vendor:", error);
          }
        }

        // Fetch all bills for sidebar
        const billsResponse = await fetch(`${API_URL}/api/purchase/bills?userId=${userId}${locCode ? `&locCode=${locCode}` : ""}`);
        if (billsResponse.ok) {
          const billsData = await billsResponse.json();
          setBills(Array.isArray(billsData) ? billsData : []);
        }
      } catch (error) {
        console.error("Error loading bill:", error);
        navigate("/purchase/bills");
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

  if (!bill) {
    return (
      <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="text-center">
          <p className="text-lg text-[#64748b] mb-4">Bill not found</p>
          <Link to="/purchase/bills" className="text-[#2563eb] hover:underline">
            Back to Bills
          </Link>
        </div>
      </div>
    );
  }

  // Calculate bill status
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
  if (dueDate) dueDate.setHours(0, 0, 0, 0);

  let status = "COMPLETED";
  let isOverdue = false;
  let overdueDays = 0;

  if (dueDate) {
    if (dueDate < today) {
      isOverdue = true;
      overdueDays = daysBetween(today, dueDate);
      status = "OVERDUE";
    } else if (dueDate.getTime() === today.getTime()) {
      status = "DUE_TODAY";
    }
  }

  const balanceDue = parseFloat(bill.finalTotal) || 0;

  // Process bills for sidebar
  const processedBills = bills.map((b) => {
    const bDueDate = b.dueDate ? new Date(b.dueDate) : null;
    if (bDueDate) bDueDate.setHours(0, 0, 0, 0);

    let bStatus = "COMPLETED";
    let bIsOverdue = false;
    let bOverdueDays = 0;

    if (bDueDate) {
      if (bDueDate < today) {
        bIsOverdue = true;
        bOverdueDays = daysBetween(today, bDueDate);
        bStatus = "OVERDUE";
      } else if (bDueDate.getTime() === today.getTime()) {
        bStatus = "DUE_TODAY";
      }
    }

    return {
      ...b,
      status: bStatus,
      isOverdue: bIsOverdue,
      overdueDays: bOverdueDays,
      finalTotal: parseFloat(b.finalTotal) || 0,
    };
  });

  // Get company details (you may need to fetch this from user/organization settings)
  const companyName = "Bridesberry"; // This should come from user/organization settings
  const companyAddress = "Kerala"; // This should come from user/organization settings
  const companyGSTIN = "32ABCFR1426N129"; // This should come from user/organization settings
  const companyEmail = "rootmentsoffice@gmail.com"; // This should come from user/organization settings
  const companyCountry = "India";

  // Get vendor details
  const vendorName = vendor?.displayName || vendor?.companyName || bill.vendorName || "";
  const vendorState = vendor?.billingState || bill.destinationOfSupply || "";
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
  bill.items?.forEach((item) => {
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
      {/* Left Sidebar - Bills List */}
      <div className="w-80 bg-white border-r border-[#e6eafb] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#e6eafb]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#1f2937]">{vendorName}</h2>
          </div>
          <p className="text-2xl font-bold text-[#1f2937]">{formatCurrency(balanceDue)}</p>
        </div>

        {/* Action Buttons */}
        <div className="p-3 border-b border-[#e6eafb] bg-[#fafbff] flex items-center gap-2">
          <button 
            onClick={() => navigate(`/purchase/bills/${id}/edit`)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
            title="Edit Bill"
          >
            <Edit size={13} className="text-slate-500 shrink-0" />
            <span>Edit</span>
          </button>
          
          <button 
            onClick={handleDownloadPDF}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/80 active:bg-indigo-100 border border-indigo-200/80 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
            title="Download PDF"
          >
            <Download size={13} className="text-indigo-600 shrink-0" />
            <span className="whitespace-nowrap">PDF</span>
          </button>

          {bill && bill.status === "draft" && (
            <button 
              onClick={handleChangeStatusToCompleted}
              disabled={changingStatus}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 rounded-lg shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Change bill status from Draft to Completed"
            >
              <Check size={13} className="text-emerald-600 shrink-0" />
              <span>{changingStatus ? "..." : "Done"}</span>
            </button>
          )}

          <button 
            onClick={handleDeleteClick}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50/70 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
            title="Delete Bill"
          >
            <Trash2 size={13} className="text-rose-500 shrink-0" />
            <span>Delete</span>
          </button>
        </div>

        {/* Overdue Banner */}
        {isOverdue && (
          <div className="p-4 bg-[#dbeafe] border-b border-[#e6eafb]">
            <p className="text-sm font-medium text-[#1e40af]">
              Payment for this bill is overdue.
            </p>
          </div>
        )}

        {/* Bills List */}
        <div className="flex-1 overflow-y-auto">
          {processedBills
            .filter((b) => b.vendorName === bill.vendorName)
            .map((b) => (
              <Link
                key={b._id}
                to={`/purchase/bills/${b._id}`}
                className={`block p-4 border-b border-[#e6eafb] hover:bg-[#f9fafb] transition-colors ${
                  b._id === id ? "bg-[#eff6ff] border-l-4 border-l-[#2563eb]" : ""
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
                      <p className="text-sm font-medium text-[#1f2937] truncate">{b.vendorName}</p>
                      <ChevronRight size={16} className="text-[#94a3b8] shrink-0" />
                    </div>
                    <p className="text-xs text-[#64748b] mb-1">
                      {b.billNumber} - {formatDate(b.billDate)}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#1f2937]">
                        {formatCurrency(b.finalTotal)}
                      </p>
                      {b.isOverdue ? (
                        <span className="text-xs font-medium text-[#dc2626] bg-[#fee2e2] px-2 py-0.5 rounded">
                          OVERDUE BY {b.overdueDays} DAYS
                        </span>
                      ) : b.status === "DUE_TODAY" ? (
                        <span className="text-xs font-medium text-[#f59e0b] bg-[#fef3c7] px-2 py-0.5 rounded">
                          DUE TODAY
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-[#10b981] bg-[#d1fae5] px-2 py-0.5 rounded">
                          COMPLETED
                        </span>
                      )}
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
              to="/purchase/bills"
              className="p-2 hover:bg-[#f1f5f9] rounded-md transition-colors"
            >
              <X size={20} className="text-[#64748b]" />
            </Link>
            <h1 className="text-xl font-semibold text-[#1f2937]">Bill Details</h1>
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

        {/* Bill Content */}
        <div className="p-8 max-w-5xl mx-auto">
          <div ref={printRef} className="bg-white rounded-lg border border-[#e6eafb] shadow-sm">
            {/* Bill Header */}
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
                
                {/* Bill Title and Info (Top Right) */}
                <div className="text-right">
                  <h1 className="text-4xl font-bold text-[#1f2937] mb-2">BILL</h1>
                  <p className="text-sm text-[#64748b] mb-1">Bill# {bill.billNumber}</p>
                  <p className="text-lg font-semibold text-[#1f2937]">
                    Balance Due {formatCurrency(balanceDue)}
                  </p>
                </div>
              </div>

              {/* Bill From / Bill Details */}
              <div className="grid grid-cols-2 gap-8 mt-6">
                {/* Bill From (Vendor) */}
                <div>
                  <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                    Bill From
                  </h3>
                  <div className="text-sm text-[#1f2937] space-y-1">
                    <p className="font-semibold">{vendorName}</p>
                    {vendorAddress && <p>{vendorAddress}</p>}
                    {vendorState && <p>{vendorState}</p>}
                    {vendorGSTIN && <p>GSTIN {vendorGSTIN}</p>}
                    {vendorEmail && <p>{vendorEmail}</p>}
                  </div>
                </div>

                {/* Bill Details (Dates and Terms) */}
                <div>
                  <div className="text-sm text-[#1f2937] space-y-2">
                    <div>
                      <span className="text-[#64748b]">Bill Date: </span>
                      <span className="font-medium">{formatDate(bill.billDate)}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Due Date: </span>
                      <span className="font-medium">
                        {bill.dueDate ? formatDate(bill.dueDate) : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Terms: </span>
                      <span className="font-medium">{bill.paymentTerms || "Net 60"}</span>
                    </div>
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
                      Cost Price
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-r border-[#e6eafb]">
                      MRP
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items?.map((item, index) => (
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
                        {item.hsnCode || item.taxCode || "-"}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] text-right border-r border-[#e6eafb]">
                        {item.quantity?.toFixed(2) || "0.00"} PCS
                      </td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] text-right border-r border-[#e6eafb]">
                        {formatCurrency(item.rate || item.costPrice || 0).replace('₹', '').trim()}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#1f2937] text-right border-r border-[#e6eafb]">
                        {formatCurrency(item.mrp || item.sellingPrice || 0).replace('₹', '').trim()}
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
                    {formatCurrency(bill.subTotal || 0).replace('₹', '').trim()}
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
                {bill.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">Discount</span>
                    <span className="text-[#1f2937] font-medium text-[#10b981]">
                      -{formatCurrency(bill.discountAmount || 0).replace('₹', '').trim()}
                    </span>
                  </div>
                )}

                {/* TDS/TCS */}
                {bill.tdsTcsAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">
                      {bill.tdsTcsType || "TDS"} ({bill.tdsTcsTax || ""})
                    </span>
                    <span className="text-[#1f2937] font-medium text-[#dc2626]">
                      -{formatCurrency(bill.tdsTcsAmount || 0).replace('₹', '').trim()}
                    </span>
                  </div>
                )}

                {/* Adjustment */}
                {bill.adjustment !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">Adjustment</span>
                    <span className="text-[#1f2937] font-medium">
                      {bill.adjustment > 0 ? "+" : ""}
                      {formatCurrency(bill.adjustment || 0).replace('₹', '').trim()}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-[#e6eafb] flex justify-between">
                  <span className="text-base font-semibold text-[#1f2937]">Total</span>
                  <span className="text-base font-semibold text-[#1f2937]">
                    {formatCurrency(bill.finalTotal || 0)}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#e6eafb] flex justify-between">
                  <span className="text-base font-semibold text-[#1f2937]">Balance Due</span>
                  <span className="text-base font-semibold text-[#1f2937]">
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {bill.notes && (
              <div className="p-8 border-t border-[#e6eafb]">
                <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                  Notes
                </h3>
                <p className="text-sm text-[#1f2937] whitespace-pre-wrap">{bill.notes}</p>
              </div>
            )}

            {/* Attachments */}
            {bill.attachments && bill.attachments.length > 0 && (
              <div className="p-8 border-t border-[#e6eafb]">
                <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-4">
                  Attachments
                </h3>
                <AttachmentDisplay attachments={bill.attachments} />
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-[#1e293b] text-center mb-2">
                {deleteConfirm.step === 1 ? "Delete Bill?" : "Are you absolutely sure?"}
              </h3>
              <p className="text-sm text-[#64748b] text-center mb-6">
                {deleteConfirm.step === 1 
                  ? "This action will delete the bill and reverse the stock changes. This cannot be undone."
                  : "This will permanently delete the bill and affect the stock in the group. This action cannot be reversed."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#e2e8f0] text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? "Deleting..." : deleteConfirm.step === 1 ? "Yes, Delete" : "Yes, Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillDetail;


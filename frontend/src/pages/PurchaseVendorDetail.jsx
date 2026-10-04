import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { 
  X, Mail, Phone, MapPin, Building2, FileText, CreditCard, 
  MessageSquare, FileSpreadsheet, Edit3, Plus, Download, 
  Printer, Trash2, ExternalLink, Clock, CheckCircle2, 
  AlertCircle, ChevronDown, Send, ShieldCheck, ArrowRight,
  Globe, Landmark, ReceiptText, UserCheck, Eye
} from "lucide-react";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const currency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const PurchaseVendorDetail = () => {
  const isSidebarOpen = useSidebar();
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [billStatusFilter, setBillStatusFilter] = useState("All");
  const [vendorHistory, setVendorHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [loadingVendor, setLoadingVendor] = useState(true);

  // Fetch Vendor
  useEffect(() => {
    const fetchVendor = async () => {
      setLoadingVendor(true);
      try {
        const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
        let foundVendor = null;

        try {
          const response = await fetch(`${API_URL}/api/purchase/vendors/${id}`);
          if (response.ok) {
            foundVendor = await response.json();
          }
        } catch (apiError) {
          console.warn("API fetch failed, trying localStorage:", apiError);
        }

        if (!foundVendor) {
          const vendors = JSON.parse(localStorage.getItem("vendors") || "[]");
          foundVendor = vendors.find((v) =>
            v.id === id ||
            v._id === id ||
            (v.id && String(v.id) === String(id)) ||
            (v._id && String(v._id) === String(id))
          );
        }

        if (foundVendor) {
          const vendorWithId = {
            ...foundVendor,
            id: foundVendor.id || foundVendor._id || id,
          };
          setVendor(vendorWithId);
          const vendorComments = JSON.parse(localStorage.getItem(`vendor_comments_${id}`) || "[]");
          setComments(vendorComments);
        } else {
          navigate("/purchase/vendors");
        }
      } catch (error) {
        console.error("Error fetching vendor:", error);
        navigate("/purchase/vendors");
      } finally {
        setLoadingVendor(false);
      }
    };

    fetchVendor();
  }, [id, navigate]);

  // Fetch vendor history
  useEffect(() => {
    const fetchVendorHistory = async () => {
      const vendorId = vendor?.id || vendor?._id || id;
      if (!vendorId) return;

      setLoadingHistory(true);
      try {
        const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
        const response = await fetch(`${API_URL}/api/purchase/vendors/${vendorId}/history?limit=50`);

        if (response.ok) {
          const history = await response.json();
          setVendorHistory(Array.isArray(history) ? history : []);
        } else {
          setVendorHistory([]);
        }
      } catch (error) {
        console.error("Error fetching vendor history:", error);
        setVendorHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (vendor) {
      fetchVendorHistory();
    }
  }, [vendor, id]);

  // Fetch bills for this vendor when Transactions tab is active
  useEffect(() => {
    if (activeTab === "Transactions" && vendor) {
      const fetchBills = async () => {
        setLoadingBills(true);
        try {
          const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
          const userStr = localStorage.getItem("rootfinuser");
          const user = userStr ? JSON.parse(userStr) : null;
          const userId = user?.email || null;
          const userPower = user?.power || "";

          if (!userId) {
            setBills([]);
            setLoadingBills(false);
            return;
          }

          const response = await fetch(`${API_URL}/api/purchase/bills?userId=${encodeURIComponent(userId)}${userPower ? `&userPower=${encodeURIComponent(userPower)}` : ""}`);
          if (response.ok) {
            const allBills = await response.json();
            const vendorId = vendor.id || vendor._id || id;
            const vendorName = vendor.displayName || vendor.companyName || `${vendor.firstName || ""} ${vendor.lastName || ""}`.trim();

            const vendorBills = Array.isArray(allBills) ? allBills.filter(bill => {
              const billVendorId = bill.vendorId?.toString() || bill.vendorId;
              const billVendorName = bill.vendorName || "";
              return (
                billVendorId === vendorId?.toString() ||
                billVendorId === id ||
                (billVendorName && vendorName && billVendorName.toLowerCase() === vendorName.toLowerCase())
              );
            }) : [];

            setBills(vendorBills);
          }
        } catch (error) {
          console.error("Error fetching bills:", error);
          setBills([]);
        } finally {
          setLoadingBills(false);
        }
      };

      fetchBills();
    }
  }, [activeTab, vendor, id]);

  const handleAddComment = () => {
    if (!commentText.trim()) return;

    const newComment = {
      id: `comment_${Date.now()}`,
      text: commentText,
      createdAt: new Date().toISOString(),
      createdBy: JSON.parse(localStorage.getItem("rootfinuser") || "{}")?.name || "User",
    };

    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    localStorage.setItem(`vendor_comments_${id}`, JSON.stringify(updatedComments));
    setCommentText("");
  };

  const applyFormatting = (format) => {
    const textarea = document.getElementById("comment-textarea");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = commentText.substring(start, end);

    let formattedText = "";
    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "underline":
        formattedText = `__${selectedText}__`;
        break;
      default:
        formattedText = selectedText;
    }

    const newText = commentText.substring(0, start) + formattedText + commentText.substring(end);
    setCommentText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreMenu && !event.target.closest('.relative')) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  if (loadingVendor || !vendor) {
    return (
      <>
        <Header title="Vendor Details" />
        <div className={`transition-all duration-300 min-h-screen bg-[#f8fafc] p-6 md:p-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8B5CF6] border-t-transparent"></div>
            <p className="mt-4 text-sm font-medium text-gray-500">Loading vendor details...</p>
          </div>
        </div>
      </>
    );
  }

  const tabs = [
    { name: "Overview", icon: Building2 },
    { name: "Comments", icon: MessageSquare },
    { name: "Transactions", icon: ReceiptText },
    { name: "Mails", icon: Mail },
    { name: "Statement", icon: FileSpreadsheet }
  ];

  const vendorDisplayName = vendor.displayName || vendor.companyName || `${vendor.firstName || ""} ${vendor.lastName || ""}`.trim() || "Vendor";

  return (
    <>
      <Header title="Vendor Details" />
      <div className={`transition-all duration-300 min-h-screen bg-[#f8fafc] p-4 md:p-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        
        {/* Main Card Container */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
          
          {/* Top Header Banner */}
          <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-purple-50/30 px-6 py-5 md:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              
              {/* Vendor Title & Badges */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                  <Building2 size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{vendorDisplayName}</h1>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${vendor.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${vendor.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      {vendor.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    {vendor.companyName && <span>{vendor.companyName}</span>}
                    {vendor.gstin && <span>• GSTIN: <strong className="text-gray-700">{vendor.gstin}</strong></span>}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => navigate(`/purchase/vendors/${id}/edit`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
                >
                  <Edit3 size={15} />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => {
                    navigate(`/purchase/bills/new?vendorId=${id}&vendorName=${encodeURIComponent(vendorDisplayName)}`);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition hover:from-[#7C3AED] hover:to-[#6D28D9] cursor-pointer"
                >
                  <Plus size={16} />
                  <span>New Transaction</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
                  >
                    <span>More</span>
                    <ChevronDown size={14} className="text-gray-500" />
                  </button>

                  {showMoreMenu && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={async () => {
                          setShowMoreMenu(false);
                          if (confirm(`Are you sure you want to mark "${vendorDisplayName}" as inactive?`)) {
                            try {
                              const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
                              const response = await fetch(`${API_URL}/api/purchase/vendors/${id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...vendor, isActive: false, status: 'inactive' }),
                              });

                              if (response.ok) {
                                alert('Vendor marked as inactive successfully!');
                                navigate('/purchase/vendors');
                              } else {
                                throw new Error('Failed to update vendor');
                              }
                            } catch (error) {
                              console.error('Error marking vendor as inactive:', error);
                              alert('Failed to mark vendor as inactive. Please try again.');
                            }
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition flex items-center gap-2"
                      >
                        <UserCheck size={14} />
                        <span>Mark as Inactive</span>
                      </button>

                      <button
                        onClick={async () => {
                          setShowMoreMenu(false);
                          if (confirm(`Are you sure you want to delete "${vendorDisplayName}"? This action cannot be undone.`)) {
                            try {
                              const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
                              const response = await fetch(`${API_URL}/api/purchase/vendors/${id}`, {
                                method: 'DELETE',
                              });

                              if (response.ok) {
                                alert('Vendor deleted successfully!');
                                navigate('/purchase/vendors');
                              } else {
                                const errorData = await response.json();
                                throw new Error(errorData.message || 'Failed to delete vendor');
                              }
                            } catch (error) {
                              console.error('Error deleting vendor:', error);
                              alert(`Failed to delete vendor: ${error.message}`);
                            }
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        <span>Delete Vendor</span>
                      </button>

                      <div className="my-1 border-t border-gray-100"></div>

                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          window.print();
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition flex items-center gap-2"
                      >
                        <Printer size={14} />
                        <span>Print Details</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          const headers = ["Display Name", "Company Name", "Email", "Phone", "GSTIN", "Source of Supply", "Currency", "Payment Terms", "Outstanding Payables", "Unused Credits"];
                          const row = [
                            vendor.displayName || "",
                            vendor.companyName || "",
                            vendor.email || "",
                            vendor.phone || vendor.mobile || "",
                            vendor.gstin || "",
                            vendor.sourceOfSupply || "",
                            vendor.currency || "INR",
                            vendor.paymentTerms || "",
                            vendor.payables || 0,
                            vendor.credits || 0
                          ];
                          const csvContent = [headers.map(h => `"${h}"`).join(","), row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")].join("\n");
                          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement("a");
                          link.href = URL.createObjectURL(blob);
                          link.download = `${vendorDisplayName.replace(/\s+/g, "_")}_details.csv`;
                          link.click();
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition flex items-center gap-2"
                      >
                        <Download size={14} />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  to="/purchase/vendors"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition"
                  title="Close"
                >
                  <X size={18} />
                </Link>
              </div>

            </div>

            {/* Navigation Tabs */}
            <div className="mt-6 flex items-center gap-2 border-b border-gray-200/80 overflow-x-auto scrollbar-none">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`inline-flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition-all cursor-pointer relative ${
                      isActive
                        ? "text-[#8B5CF6]"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <TabIcon size={16} />
                    <span>{tab.name}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "Overview" && (
            <div className="p-6 md:p-8">
              <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                
                {/* Left Column: Vendor Details, Addresses, Contacts, Bank Info */}
                <div className="space-y-8">
                  
                  {/* Primary Contact Card */}
                  <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/50 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
                          {vendorDisplayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{vendorDisplayName}</h3>
                          <p className="text-xs text-gray-500">{vendor.companyName || "Vendor Account"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {vendor.email && (
                          <a
                            href={`mailto:${vendor.email}?subject=Regarding ${vendorDisplayName}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-[#8B5CF6] hover:bg-purple-100 text-xs font-semibold transition"
                          >
                            <Send size={12} />
                            <span>Email</span>
                          </a>
                        )}
                        <button
                          onClick={() => alert(`Invitation link has been generated for ${vendor.email || vendorDisplayName}.`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold transition"
                        >
                          <Globe size={12} />
                          <span>Portal</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-2.5 text-gray-600">
                        <Mail size={15} className="text-purple-500 shrink-0" />
                        <span className="truncate">{vendor.email || "No email address"}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-gray-600">
                        <Phone size={15} className="text-purple-500 shrink-0" />
                        <span>{vendor.phone || vendor.mobile || "No phone number"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Addresses Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                        <MapPin size={14} className="text-purple-600" />
                        <span>Addresses</span>
                      </h4>
                      <button
                        onClick={() => navigate(`/purchase/vendors/${id}/edit?section=shipping`)}
                        className="text-xs font-semibold text-[#8B5CF6] hover:underline"
                      >
                        + Edit Address
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Billing Address Card */}
                      <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Billing Address</p>
                        {vendor.billingAddress ? (
                          <div className="text-xs text-gray-700 space-y-1">
                            <p className="font-semibold text-gray-900">{vendor.billingAddress}</p>
                            {vendor.billingAddress2 && <p>{vendor.billingAddress2}</p>}
                            <p>
                              {[vendor.billingCity, vendor.billingState, vendor.billingPinCode].filter(Boolean).join(", ")}
                            </p>
                            {vendor.billingCountry && <p className="text-gray-500">{vendor.billingCountry}</p>}
                            {vendor.billingPhone && <p className="text-gray-500 mt-2 flex items-center gap-1"><Phone size={12} /> {vendor.billingPhone}</p>}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No billing address specified</p>
                        )}
                      </div>

                      {/* Shipping Address Card */}
                      <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Shipping Address</p>
                        {vendor.shippingAddress ? (
                          <div className="text-xs text-gray-700 space-y-1">
                            <p className="font-semibold text-gray-900">{vendor.shippingAddress}</p>
                            {vendor.shippingAddress2 && <p>{vendor.shippingAddress2}</p>}
                            <p>
                              {[vendor.shippingCity, vendor.shippingState, vendor.shippingPinCode].filter(Boolean).join(", ")}
                            </p>
                            {vendor.shippingCountry && <p className="text-gray-500">{vendor.shippingCountry}</p>}
                            {vendor.shippingPhone && <p className="text-gray-500 mt-2 flex items-center gap-1"><Phone size={12} /> {vendor.shippingPhone}</p>}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No shipping address specified</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Other Details Grid */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                      <FileText size={14} className="text-purple-600" />
                      <span>Tax & Registration Info</span>
                    </h4>

                    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                        <div>
                          <p className="text-gray-400 font-medium">Currency</p>
                          <p className="font-semibold text-gray-900 mt-0.5">{vendor.currency || "INR (₹)"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">GST Treatment</p>
                          <p className="font-semibold text-gray-900 mt-0.5">{vendor.gstTreatment || "Registered"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">GSTIN / UIN</p>
                          <p className="font-semibold text-purple-700 mt-0.5 font-mono">{vendor.gstin || "—"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">Source of Supply</p>
                          <p className="font-semibold text-gray-900 mt-0.5">{vendor.sourceOfSupply || "—"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">PAN Number</p>
                          <p className="font-semibold text-gray-900 mt-0.5 font-mono">{vendor.pan || "—"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">Payment Terms</p>
                          <p className="font-semibold text-gray-900 mt-0.5">{vendor.paymentTerms || "Due on Receipt"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Persons Table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                        <UserCheck size={14} className="text-purple-600" />
                        <span>Contact Persons</span>
                      </h4>
                      <button
                        onClick={() => navigate(`/purchase/vendors/${id}/edit?section=contacts`)}
                        className="text-xs font-semibold text-[#8B5CF6] hover:underline"
                      >
                        + Add Contact
                      </button>
                    </div>

                    {vendor.contacts && vendor.contacts.length > 0 ? (
                      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead className="bg-[#1e1e1e] text-white">
                            <tr>
                              <th className="px-4 py-2.5 font-bold uppercase tracking-wider">Name</th>
                              <th className="px-4 py-2.5 font-bold uppercase tracking-wider">Email</th>
                              <th className="px-4 py-2.5 font-bold uppercase tracking-wider">Work Phone</th>
                              <th className="px-4 py-2.5 font-bold uppercase tracking-wider">Mobile</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {vendor.contacts.map((contact, idx) => (
                              <tr key={idx} className="hover:bg-purple-50/40 transition-colors">
                                <td className="px-4 py-3 font-semibold text-gray-900">
                                  {[contact.salutation, contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                                </td>
                                <td className="px-4 py-3 text-gray-600">{contact.email || "—"}</td>
                                <td className="px-4 py-3 text-gray-600">{contact.workPhone || "—"}</td>
                                <td className="px-4 py-3 text-gray-600">{contact.mobile || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-xs text-gray-400">
                        No contact persons added yet.
                      </div>
                    )}
                  </div>

                  {/* Bank Accounts Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                        <Landmark size={14} className="text-purple-600" />
                        <span>Bank Accounts</span>
                      </h4>
                      <button
                        onClick={() => navigate(`/purchase/vendors/${id}/edit?section=bank`)}
                        className="text-xs font-semibold text-[#8B5CF6] hover:underline"
                      >
                        + Add Bank
                      </button>
                    </div>

                    {vendor.bankAccounts && vendor.bankAccounts.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {vendor.bankAccounts.map((bank, idx) => (
                          <div key={idx} className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-3 mb-2.5">
                              <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                                <CreditCard size={16} />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-xs">{bank.bankName || "Bank"}</p>
                                <p className="text-[11px] text-gray-500">{bank.accountHolderName}</p>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 space-y-0.5 pt-2 border-t border-gray-100 font-mono">
                              <p>A/C: <strong>{bank.accountNumber}</strong></p>
                              {bank.ifsc && <p>IFSC: <strong>{bank.ifsc}</strong></p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-xs text-gray-400">
                        No bank accounts registered.
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Column: Financial Cards, Due Period, Activity Stream */}
                <div className="space-y-6">
                  
                  {/* Financial Summary Card */}
                  <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-br from-white via-purple-50/20 to-purple-100/30 p-6 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-4 flex items-center justify-between">
                      <span>Payables Summary</span>
                      <span className="text-[11px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{vendor.currency || "INR"}</span>
                    </h4>

                    <div className="space-y-4">
                      <div className="rounded-xl bg-white border border-purple-100 p-4 shadow-xs">
                        <p className="text-xs text-gray-500 font-medium">Outstanding Payables</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">
                          {currency(vendor.payables || 0)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white border border-purple-100 p-4 shadow-xs">
                        <p className="text-xs text-gray-500 font-medium">Unused Credits</p>
                        <p className="text-2xl font-black text-emerald-600 mt-1">
                          {currency(vendor.credits || 0)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-gray-500 border-t border-purple-100/60">
                        <div>
                          <p className="text-[11px]">Items to receive</p>
                          <p className="font-bold text-gray-800 text-sm mt-0.5">{vendor.itemsToReceive || 0}</p>
                        </div>
                        <div>
                          <p className="text-[11px]">Total items ordered</p>
                          <p className="font-bold text-gray-800 text-sm mt-0.5">{vendor.totalItemsOrdered || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Terms Card */}
                  <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Payment Terms</h4>
                    <p className="text-sm font-semibold text-gray-900">{vendor.paymentTerms || "Due On Receipt"}</p>
                    <p className="text-xs text-gray-500 mt-1">Default payment terms configured for invoices & bills.</p>
                  </div>

                  {/* Timeline Activity Stream */}
                  <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-purple-600" />
                        <span>Recent Activity</span>
                      </span>
                      {vendorHistory.length > 0 && (
                        <span className="text-[11px] font-semibold text-gray-400">{vendorHistory.length} events</span>
                      )}
                    </h4>

                    {loadingHistory ? (
                      <div className="py-8 text-center text-xs text-gray-400">Loading activity timeline...</div>
                    ) : vendorHistory.length > 0 ? (
                      <div className="relative pl-5 space-y-4 border-l-2 border-purple-200 ml-2">
                        {vendorHistory.slice(0, 10).map((activity, idx) => {
                          const formatDate = (dateString) => {
                            if (!dateString) return "";
                            const d = new Date(dateString);
                            return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                          };

                          return (
                            <div key={activity.id || activity._id || idx} className="relative group">
                              {/* Glowing timeline dot */}
                              <div className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-white border-2 border-[#8B5CF6] group-hover:scale-125 transition-transform shadow-xs"></div>
                              
                              <div className="text-xs">
                                <p className="font-bold text-gray-900">{activity.title || "Activity Recorded"}</p>
                                <p className="text-gray-600 mt-0.5 leading-relaxed">{activity.description || ""}</p>
                                <p className="text-[10px] text-gray-400 mt-1 font-mono">{formatDate(activity.changedAt)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-gray-400 italic">
                        No activity records found.
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 2: COMMENTS */}
          {activeTab === "Comments" && (
            <div className="p-6 md:p-8 max-w-3xl">
              <div className="mb-6">
                <div className="flex items-center gap-1.5 mb-2">
                  <button
                    onClick={() => applyFormatting("bold")}
                    className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    onClick={() => applyFormatting("italic")}
                    className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-xs italic text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    onClick={() => applyFormatting("underline")}
                    className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-xs underline text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                    title="Underline"
                  >
                    U
                  </button>
                </div>

                <textarea
                  id="comment-textarea"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write an internal note or comment about this vendor..."
                  className="w-full min-h-[110px] rounded-xl border border-gray-200 p-3.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-[#8B5CF6] focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] transition resize-y"
                />

                <div className="mt-2.5 flex justify-end">
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Post Comment</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Comments Stream</h3>
                {comments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center text-xs text-gray-400">
                    No comments yet. Be the first to leave a note.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                        <p className="text-xs text-gray-800 whitespace-pre-wrap">{comment.text}</p>
                        <p className="text-[11px] text-gray-400 mt-2 font-medium">
                          {comment.createdBy} • {new Date(comment.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTIONS */}
          {activeTab === "Transactions" && (
            <div className="p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Purchase Bills</h3>
                  <p className="text-xs text-gray-500">All transaction invoices associated with this vendor</p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={billStatusFilter}
                    onChange={(e) => setBillStatusFilter(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="All">Status: All</option>
                    <option value="OPEN">Open</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="PAID">Paid</option>
                  </select>

                  <button
                    onClick={() => navigate(`/purchase/bills/new?vendorId=${id}&vendorName=${encodeURIComponent(vendorDisplayName)}`)}
                    className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] px-3.5 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>New Bill</span>
                  </button>
                </div>
              </div>

              {loadingBills ? (
                <div className="py-12 text-center text-xs text-gray-400">Loading bills...</div>
              ) : bills.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
                  <ReceiptText size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No bills found</p>
                  <p className="text-xs text-gray-400 mt-1">Create a purchase bill to track vendor payments.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-[#1e1e1e] text-white">
                      <tr>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Branch</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Bill #</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Order #</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Amount</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Balance</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bills
                        .filter(bill => {
                          if (billStatusFilter === "All") return true;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
                          if (dueDate) dueDate.setHours(0, 0, 0, 0);

                          if (billStatusFilter === "OVERDUE") return dueDate && dueDate < today && parseFloat(bill.finalTotal || 0) > 0;
                          if (billStatusFilter === "PAID") return parseFloat(bill.finalTotal || 0) === 0;
                          if (billStatusFilter === "OPEN") return !dueDate || dueDate >= today;
                          return true;
                        })
                        .map((bill) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
                          if (dueDate) dueDate.setHours(0, 0, 0, 0);
                          const isOverdue = dueDate && dueDate < today && parseFloat(bill.finalTotal || 0) > 0;

                          const formatDate = (date) => {
                            if (!date) return "—";
                            const d = new Date(date);
                            return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                          };

                          return (
                            <tr
                              key={bill._id || bill.id}
                              onClick={() => navigate(`/purchase/bills/${bill._id || bill.id}`)}
                              className="hover:bg-purple-50/40 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-3.5 text-gray-600">{formatDate(bill.billDate)}</td>
                              <td className="px-4 py-3.5 text-gray-800 font-medium">{bill.branch || "Warehouse"}</td>
                              <td className="px-4 py-3.5 font-bold text-[#8B5CF6] hover:underline">{bill.billNumber || "—"}</td>
                              <td className="px-4 py-3.5 text-gray-500">{bill.orderNumber || "—"}</td>
                              <td className="px-4 py-3.5 text-right font-bold text-gray-900">{currency(parseFloat(bill.finalTotal || 0))}</td>
                              <td className="px-4 py-3.5 text-right font-bold text-gray-900">{currency(parseFloat(bill.finalTotal || 0))}</td>
                              <td className="px-4 py-3.5 text-center">
                                {isOverdue ? (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Overdue</span>
                                ) : parseFloat(bill.finalTotal || 0) === 0 ? (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Open</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MAILS & TAB 5: STATEMENT */}
          {(activeTab === "Mails" || activeTab === "Statement") && (
            <div className="p-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 text-[#8B5CF6] flex items-center justify-center mx-auto mb-3">
                {activeTab === "Mails" ? <Mail size={24} /> : <FileSpreadsheet size={24} />}
              </div>
              <h4 className="text-base font-bold text-gray-800">{activeTab} View</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                {activeTab === "Mails" 
                  ? "Track communication history and automated email logs for this vendor."
                  : "Generate customized vendor ledger statements and export them to PDF/Excel."
                }
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default PurchaseVendorDetail;

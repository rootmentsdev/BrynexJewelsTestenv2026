import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import { useSidebar } from "../hooks/useSidebar.js";
import dataCache from "../utils/cache";
import { Plus, Search, Calendar, RotateCcw, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const SalesInvoices = () => {
  const isSidebarOpen = useSidebar();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Date range filtering states
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  // Get user info from localStorage
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

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "sent":
        return "bg-purple-50 text-purple-700 border border-purple-200";
      case "draft":
        return "bg-gray-100 text-gray-700 border border-gray-200";
      case "overdue":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  // Get return status badge
  const getReturnStatusBadge = (returnStatus) => {
    switch (returnStatus) {
      case "full":
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none bg-red-50 text-red-700 border border-red-200">
            FULLY RETURNED
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none bg-amber-50 text-amber-700 border border-amber-200">
            PARTIALLY RETURNED
          </span>
        );
      case "none":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none bg-gray-100 text-gray-600 border border-gray-200">
            NOT RETURNED
          </span>
        );
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    
    setDeleting(true);
    try {
      const user = getUserInfo();
      const invoiceId = invoiceToDelete._id || invoiceToDelete.id;
      
      console.log(`Deleting invoice: ${invoiceId}`);
      
      const response = await fetch(
        `${API_URL}/api/sales/invoices/${invoiceId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.email }),
        }
      );

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error("Delete response error:", responseData);
        // Close modal and reset state before showing error
        setShowDeleteModal(false);
        setInvoiceToDelete(null);
        setDeleting(false);
        
        // Show error message to user
        alert(`Cannot delete invoice: ${responseData.message || "Failed to delete invoice"}`);
        return; // Exit early, don't remove from list
      }

      // Only remove from list if deletion was successful
      setInvoices(invoices.filter(inv => (inv._id || inv.id) !== invoiceId));
      setShowDeleteModal(false);
      setInvoiceToDelete(null);
      
      // Clear cache so Financial Summary Report fetches fresh data
      dataCache.clear();
      
      // Set flag to trigger refresh in Financial Summary Report
      sessionStorage.setItem('invoiceDeleted', 'true');
      
      alert("Invoice deleted successfully");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      // Close modal and reset state on error
      setShowDeleteModal(false);
      setInvoiceToDelete(null);
      alert(`Failed to delete invoice: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Fetch invoices from API
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);

      try {
        const user = getUserInfo();
        if (!user || !user.email) {
          setError("User information not found. Please log in again.");
          setLoading(false);
          return;
        }

        // Check if user is admin
        const adminEmails = ['officerootments@gmail.com'];
        const isAdminEmail = user.email && adminEmails.some(email => user.email.toLowerCase() === email.toLowerCase());
        const userIsAdmin = isAdminEmail || user.power === "admin" || (user.locCode && (user.locCode === '858' || user.locCode === '103'));
        setIsAdmin(userIsAdmin);

        const params = new URLSearchParams({
          userId: user.email,
        });

        // Add userPower and locCode if available
        if (user.power) params.append("userPower", user.power);
        if (user.locCode) params.append("locCode", user.locCode);
        
        // Add warehouse parameter for filtering
        const fallbackLocations = [
          { "locName": "Z-Edapally1", "locCode": "144" },
          { "locName": "Warehouse", "locCode": "858" },
          { "locName": "G-Edappally", "locCode": "702" },
          { "locName": "HEAD OFFICE01", "locCode": "759" },
          { "locName": "SG-Trivandrum", "locCode": "700" },
          { "locName": "Z- Edappal", "locCode": "100" },
          { "locName": "Z.Perinthalmanna", "locCode": "133" },
          { "locName": "Z.Kottakkal", "locCode": "122" },
          { "locName": "G.Kottayam", "locCode": "701" },
          { "locName": "G.Perumbavoor", "locCode": "703" },
          { "locName": "G.Thrissur", "locCode": "704" },
          { "locName": "G.Chavakkad", "locCode": "706" },
          { "locName": "G.Calicut ", "locCode": "712" },
          { "locName": "G.Vadakara", "locCode": "708" },
          { "locName": "G.Edappal", "locCode": "707" },
          { "locName": "G.Perinthalmanna", "locCode": "709" },
          { "locName": "G.Kottakkal", "locCode": "711" },
          { "locName": "G.Manjeri", "locCode": "710" },
          { "locName": "G.Palakkad ", "locCode": "705" },
          { "locName": "G.Kalpetta", "locCode": "717" },
          { "locName": "G.Kannur", "locCode": "716" },
          { "locName": "G.Mg Road", "locCode": "718" },
          { "locName": "Production", "locCode": "101" },
          { "locName": "Office", "locCode": "102" },
          { "locName": "WAREHOUSE", "locCode": "103" }
        ];
        
        let userLocName = "";
        if (user?.locCode) {
          const location = fallbackLocations.find(loc => loc.locCode === user.locCode || loc.locCode === String(user.locCode));
          if (location) {
            userLocName = location.locName;
          }
        }
        if (!userLocName) {
          userLocName = user?.username || user?.locName || "";
        }
        
        const userWarehouse = mapWarehouse(userLocName);
        if (userWarehouse) {
          params.append("warehouse", userWarehouse);
        }
        // Also pass the locCode for filtering by location code
        if (user?.locCode) {
          params.append("filterLocCode", user.locCode);
        }

        // Add date range filtering if specified
        if (fromDate) params.append("fromDate", fromDate);
        if (toDate) params.append("toDate", toDate);

        const response = await fetch(`${API_URL}/api/sales/invoices?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch invoices: ${response.statusText}`);
        }

        const data = await response.json();
        setInvoices(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError(err.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [API_URL, fromDate, toDate]);

  // Filter invoices based on search term AND exclude Return/Refund/Cancel categories
  const filteredInvoices = invoices.filter(invoice => {
    // Exclude Return/Refund/Cancel invoices from this page
    const categoryLower = (invoice.category || "").toLowerCase().trim();
    const isReturnRefundCancel = ["return", "refund", "cancel"].includes(categoryLower);
    
    // Also check invoice number pattern (RTN-, RET-, REFUND-INV, etc.)
    const invoiceNumber = (invoice.invoiceNumber || "").toUpperCase();
    const hasReturnPrefix = invoiceNumber.startsWith("RTN-") || 
                           invoiceNumber.startsWith("RET-") || 
                           invoiceNumber.startsWith("REFUND-") || 
                           invoiceNumber.startsWith("CANCEL-");
    
    if (isReturnRefundCancel || hasReturnPrefix) {
      console.log(`🚫 Filtering out return invoice: ${invoice.invoiceNumber} (category: ${invoice.category})`);
      return false; // Don't show return/refund/cancel invoices on this page
    }
    
    // Apply search filter
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
      invoice.customer?.toLowerCase().includes(searchLower) ||
      invoice.orderNumber?.toLowerCase().includes(searchLower) ||
      invoice.branch?.toLowerCase().includes(searchLower)
    );
  });
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
  
  // Reset to page 1 when search term or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fromDate, toDate]);
  
  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  return (
    <>
      <Header title="Sales Invoices" />
      <div className={`invoice-page-wrapper transition-all duration-300 min-h-screen bg-[#F9FAFB] flex flex-col ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* ── Top Header Bar ── */}
        <div className="px-6 pt-5 pb-4 border-b border-[#E5E7EB] bg-white">
          <div className="flex flex-wrap items-center justify-end gap-4">
            <div className="flex items-center gap-2.5">
              <Link
                to="/sales/invoices/returns"
                className="inline-flex h-9 items-center gap-2 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] px-3.5 text-xs font-semibold text-[#111827] shadow-sm transition-colors cursor-pointer"
              >
                <RotateCcw size={14} className="text-[#111827]" />
                <span>View Returns</span>
              </Link>
              <Link
                to="/sales/invoices/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={15} className="text-white" />
                <span>New Invoice</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Controls Row: Search, Date Filter, Badges ── */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Box & Date Filter Button */}
            <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={14} className="text-[#9CA3AF]" />
                </div>
                <input
                  type="text"
                  placeholder="Search by invoice #, customer name, or order #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-none border border-[#E5E7EB] bg-white text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#8B5CF6] focus:outline-none transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`h-9 px-3.5 rounded-none border text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  showDateFilter || fromDate || toDate
                    ? 'border-[#D1D5DB] bg-[#E2E2E2] text-[#111827] font-bold'
                    : 'border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-[#111827]'
                }`}
              >
                <Calendar size={13} className="text-[#111827]" />
                <span>Date Filter</span>
              </button>
            </div>

            {/* Badges / Metrics */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-none bg-[#F5F3FF] border border-[#DDD6FE] px-3 py-1 text-xs font-bold text-[#7C3AED]">
                Total: {filteredInvoices.length} {filteredInvoices.length === 1 ? 'Invoice' : 'Invoices'}
              </span>
              {(fromDate || toDate) && (
                <span className="inline-flex items-center gap-1.5 rounded-none bg-[#EDE9FE] border border-[#C4B5FD] px-2.5 py-1 text-xs font-bold text-[#6D28D9]">
                  📅 Filtered
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 rounded-none bg-[#FEF3C7] border border-[#FDE68A] px-2.5 py-1 text-xs font-bold text-[#92400E]">
                  🔍 "{searchTerm}"
                </span>
              )}
            </div>
          </div>

          {/* Date Range Drawer */}
          {showDateFilter && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-none border border-[#E5E7EB] bg-white p-3.5 shadow-sm">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#374151]">From:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 rounded-none border border-[#E5E7EB] px-2.5 text-xs text-[#111827] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#374151]">To:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 rounded-none border border-[#E5E7EB] px-2.5 text-xs text-[#111827] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="h-8 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] px-3 text-xs font-semibold uppercase tracking-wider text-[#111827] transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* ── Main Table Card ── */}
        <div className="px-6 pb-8 pt-2">
          <section className="rounded-none border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">

            {loading ? (
              <div className="px-8 py-16 text-center flex flex-col items-center justify-center">
                <div className="inline-block animate-spin h-6 w-6 border-2 border-[#8B5CF6] border-t-transparent mb-2" />
                <p className="text-xs font-medium text-[#6B7280]">Loading invoices...</p>
              </div>
            ) : error ? (
              <div className="px-8 py-16 text-center">
                <p className="text-xs font-semibold text-red-500">{error}</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="px-8 py-16 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-none bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center mb-3">
                  <FileText size={24} className="text-[#8B5CF6]" />
                </div>
                <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide mb-1">No Invoices Found</h3>
                <p className="text-xs text-[#6B7280] max-w-sm mb-4">
                  You haven't created any sales invoices yet. Get started by creating your first invoice.
                </p>
                <Link
                  to="/sales/invoices/new"
                  className="inline-flex items-center gap-2 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors cursor-pointer"
                >
                  <Plus size={14} className="text-white" />
                  Create Invoice
                </Link>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="px-8 py-16 text-center flex flex-col items-center justify-center">
                <p className="text-xs text-[#6B7280]">No invoices match your search. Try a different search term.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#1e1e1e] text-white text-xs uppercase tracking-wide font-bold">
                      <th className="w-10 px-3 py-3 text-center border-r border-[#333333] whitespace-nowrap">#</th>
                      <th className="w-10 px-3 py-3 text-center border-r border-[#333333] whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded-none border-gray-600 bg-[#2d2d2d] accent-[#8B5CF6] cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">DATE</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">INVOICE#</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">ORDER NUMBER</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">CUSTOMER NAME</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">INVOICE STATUS</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">RETURN STATUS</th>
                      <th className="px-3 py-3 text-right border-r border-[#333333] whitespace-nowrap">INVOICE AMOUNT</th>
                      <th className="px-3 py-3 text-right border-r border-[#333333] whitespace-nowrap">BALANCE</th>
                      <th className="px-3 py-3 text-left whitespace-nowrap">BRANCH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6] text-xs text-[#1F2937]">
                    {paginatedInvoices.map((invoice, index) => (
                      <tr
                        key={invoice._id || invoice.id}
                        className={`${index % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]/40"} hover:bg-purple-50/25 transition-colors`}
                      >
                        <td className="px-3 py-2.5 text-center font-medium text-[#6B7280]">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded-none border-[#D1D5DB] accent-[#8B5CF6]"
                          />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-[#4B5563]">
                          {formatDate(invoice.invoiceDate)}
                        </td>
                        <td className="px-3 py-2.5 font-semibold">
                          <Link
                            to={`/sales/invoices/${invoice._id || invoice.id}`}
                            className="text-[#8B5CF6] hover:text-[#7C3AED] hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-[#4B5563]">{invoice.orderNumber || "-"}</td>
                        <td className="px-3 py-2.5 text-[#111827] font-medium">{invoice.customer || "-"}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none ${getStatusColor(invoice.status)}`}>
                            {(invoice.status || "sent").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {getReturnStatusBadge(invoice.returnStatus)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-[#111827]">
                          {formatCurrency(
                            parseFloat(invoice.finalTotal) > 0
                              ? invoice.finalTotal
                              : (invoice.lineItems || []).reduce((s, i) => s + (parseFloat(i.lineTotal) || (parseFloat(i.quantity || 0) * parseFloat(i.rate || 0))), 0)
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-[#111827]">
                          ₹0.00
                        </td>
                        <td className="px-3 py-2.5 text-[#4B5563]">{invoice.branch || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Table Footer with Pagination */}
                <div className="border-t border-[#E5E7EB] bg-[#FAFAFA] px-5 py-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6B7280]">
                    <div className="flex items-center gap-4">
                      <span>
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length} {filteredInvoices.length !== 1 ? 'invoices' : 'invoice'}
                      </span>
                      <span className="font-bold text-[#111827]">
                        Total: ₹{filteredInvoices.reduce((sum, inv) => {
                          const total = parseFloat(inv.finalTotal) > 0
                            ? parseFloat(inv.finalTotal)
                            : (inv.lineItems || []).reduce((s, i) => s + (parseFloat(i.lineTotal) || (parseFloat(i.quantity || 0) * parseFloat(i.rate || 0))), 0);
                          return sum + total;
                        }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#6B7280]">Rows:</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="rounded-none border border-[#E5E7EB] bg-white px-2 py-0.5 text-xs text-[#374151] focus:border-[#8B5CF6] focus:outline-none"
                          >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={goToFirstPage}
                            disabled={currentPage === 1}
                            className="h-7 w-7 flex items-center justify-center rounded-none border border-[#E5E7EB] bg-white text-[#374151] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="First page"
                          >
                            <ChevronsLeft size={13} />
                          </button>
                          <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                            className="h-7 w-7 flex items-center justify-center rounded-none border border-[#E5E7EB] bg-white text-[#374151] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Previous page"
                          >
                            <ChevronLeft size={13} />
                          </button>

                          <span className="px-2 text-xs font-semibold text-[#111827]">
                            {currentPage} / {totalPages}
                          </span>

                          <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="h-7 w-7 flex items-center justify-center rounded-none border border-[#E5E7EB] bg-white text-[#374151] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Next page"
                          >
                            <ChevronRight size={13} />
                          </button>
                          <button
                            onClick={goToLastPage}
                            disabled={currentPage === totalPages}
                            className="h-7 w-7 flex items-center justify-center rounded-none border border-[#E5E7EB] bg-white text-[#374151] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Last page"
                          >
                            <ChevronsRight size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default SalesInvoices;


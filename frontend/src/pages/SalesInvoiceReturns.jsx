import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";
import { Search, Calendar, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw } from "lucide-react";

const SalesInvoiceReturns = () => {
  const isSidebarOpen = useSidebar();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  // Get category badge color with sharp corners
  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case "return":
        return "bg-amber-50 text-amber-800 border border-amber-200";
      case "refund":
        return "bg-red-50 text-red-700 border border-red-200";
      case "cancel":
        return "bg-gray-100 text-gray-700 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  // Get return status badge with sharp corners
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

        const params = new URLSearchParams({
          userId: user.email,
        });

        if (user.power) params.append("userPower", user.power);
        if (user.locCode) params.append("locCode", user.locCode);
        
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
        if (user?.locCode) {
          params.append("filterLocCode", user.locCode);
        }

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
  }, [API_URL]);

  // Filter invoices to show ONLY Return/Refund/Cancel categories and date filtering
  const filteredInvoices = invoices.filter(invoice => {
    const categoryLower = (invoice.category || "").toLowerCase().trim();
    const isReturnRefundCancel = ["return", "refund", "cancel"].includes(categoryLower);
    
    if (!isReturnRefundCancel) {
      return false;
    }

    // Date range filtering
    if (fromDate || toDate) {
      if (!invoice.invoiceDate) return false;
      const invoiceDateStr = new Date(invoice.invoiceDate).toISOString().split("T")[0];
      if (fromDate && invoiceDateStr < fromDate) return false;
      if (toDate && invoiceDateStr > toDate) return false;
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

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fromDate, toDate]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

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
      <Header title="Invoice Returns" />
      <div className={`invoice-page-wrapper transition-all duration-300 min-h-screen bg-[#F9FAFB] flex flex-col ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* ── Top Header Bar ── */}
        <div className="px-6 pt-5 pb-4 border-b border-[#E5E7EB] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#111827] uppercase">
                Invoice Returns
              </h1>
              <p className="text-xs text-[#6B7280] mt-0.5">
                View all return, refund, and cancellation invoices.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                to="/sales/invoices"
                className="inline-flex h-9 items-center gap-2 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] px-3.5 text-xs font-semibold text-[#111827] shadow-sm transition-colors cursor-pointer"
              >
                <FileText size={14} className="text-[#111827]" />
                <span>View Sales Invoices</span>
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
                Total: {filteredInvoices.length} {filteredInvoices.length === 1 ? 'Return' : 'Returns'}
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
                  className="h-8 rounded-none border border-[#E5E7EB] bg-white px-2.5 text-xs text-[#111827] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#374151]">To:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 rounded-none border border-[#E5E7EB] bg-white px-2.5 text-xs text-[#111827] focus:border-[#8B5CF6] focus:outline-none"
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
                <p className="text-xs font-medium text-[#6B7280]">Loading return invoices...</p>
              </div>
            ) : error ? (
              <div className="px-8 py-16 text-center">
                <p className="text-xs font-semibold text-red-500">{error}</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="px-8 py-16 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-none bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center mb-3">
                  <RotateCcw size={24} className="text-[#8B5CF6]" />
                </div>
                <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide mb-1">No Return Invoices Found</h3>
                <p className="text-xs text-[#6B7280] max-w-sm mb-4">
                  There are currently no return, refund, or cancellation invoices recorded.
                </p>
                <Link
                  to="/sales/invoices"
                  className="inline-flex items-center gap-2 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors cursor-pointer"
                >
                  <FileText size={14} className="text-white" />
                  View Invoices
                </Link>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="px-8 py-16 text-center flex flex-col items-center justify-center">
                <p className="text-xs text-[#6B7280]">No return invoices match your search. Try a different search term.</p>
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
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">CATEGORY</th>
                      <th className="px-3 py-3 text-left border-r border-[#333333] whitespace-nowrap">RETURN STATUS</th>
                      <th className="px-3 py-3 text-right border-r border-[#333333] whitespace-nowrap">INVOICE AMOUNT</th>
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
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none ${getCategoryColor(invoice.category)}`}>
                            {(invoice.category || "").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {getReturnStatusBadge(invoice.returnStatus)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-[#111827]">
                          {formatCurrency(invoice.finalTotal)}
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
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length} {filteredInvoices.length !== 1 ? 'returns' : 'return'}
                      </span>
                      <span className="font-bold text-[#111827]">
                        Total: ₹{filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.finalTotal) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                          </select>
                        </div>
                        <span className="text-xs text-[#6B7280]">
                          Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={goToFirstPage}
                            disabled={currentPage === 1}
                            className="p-1 rounded-none border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed text-[#374151]"
                            title="First Page"
                          >
                            <ChevronsLeft size={14} />
                          </button>
                          <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                            className="p-1 rounded-none border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed text-[#374151]"
                            title="Previous Page"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded-none border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed text-[#374151]"
                            title="Next Page"
                          >
                            <ChevronRight size={14} />
                          </button>
                          <button
                            onClick={goToLastPage}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded-none border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed text-[#374151]"
                            title="Last Page"
                          >
                            <ChevronsRight size={14} />
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

export default SalesInvoiceReturns;

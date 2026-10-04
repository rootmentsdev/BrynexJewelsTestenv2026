import { useMemo, useState, useEffect } from "react";
import Header from "../components/Header";
import { Link, useLocation } from "react-router-dom";
import { Search, Plus, Download, X } from "lucide-react";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const currency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const PurchaseVendors = () => {
  const isSidebarOpen = useSidebar();
  const location = useLocation();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Load vendors from API and localStorage
  useEffect(() => {
    const loadVendors = async () => {
      setLoading(true);
      try {
        const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

        // Get user info - use email as primary identifier
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.email || null;
        const userPower = user?.power || "";

        let vendorsFromAPI = [];

        // Try to fetch from PostgreSQL API first
        if (userId) {
          try {
            const response = await fetch(`${API_URL}/api/purchase/vendors?userId=${encodeURIComponent(userId)}${userPower ? `&userPower=${encodeURIComponent(userPower)}` : ""}`);
            if (response.ok) {
              const data = await response.json();
              vendorsFromAPI = Array.isArray(data) ? data : [];
            }
          } catch (apiError) {
            console.warn("API fetch failed, trying localStorage:", apiError);
          }
        }

        // Fallback to localStorage if API returns no vendors or fails
        let vendorsFromLocalStorage = [];
        try {
          const savedVendors = JSON.parse(localStorage.getItem("vendors") || "[]");
          vendorsFromLocalStorage = Array.isArray(savedVendors) ? savedVendors : [];
        } catch (localError) {
          console.warn("Error reading localStorage:", localError);
        }

        // Combine both sources, prioritizing API results
        // Use a Map to avoid duplicates (by displayName or id)
        const vendorMap = new Map();

        // Add API vendors first
        vendorsFromAPI.forEach(vendor => {
          const key = vendor.displayName || vendor.companyName || vendor._id || vendor.id;
          if (key) vendorMap.set(key, vendor);
        });

        // Add localStorage vendors if not already present
        vendorsFromLocalStorage.forEach(vendor => {
          const key = vendor.displayName || vendor.companyName || vendor.id;
          if (key && !vendorMap.has(key)) {
            vendorMap.set(key, vendor);
          }
        });

        // Convert to array and ensure each vendor has an id field (use _id if id doesn't exist)
        const allVendors = Array.from(vendorMap.values()).map(vendor => ({
          ...vendor,
          id: vendor.id || vendor._id || vendor.displayName || vendor.companyName,
        }));

        setVendors(allVendors);
      } catch (error) {
        console.error("Error loading vendors:", error);
        // Final fallback to localStorage only
        try {
          const savedVendors = JSON.parse(localStorage.getItem("vendors") || "[]");
          setVendors(savedVendors);
        } catch {
          setVendors([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadVendors();

    // Listen for storage events to update when vendors are added from another tab/window
    const handleStorageChange = (e) => {
      if (e.key === "vendors") {
        loadVendors();
      }
    };

    // Listen for custom event when vendor is saved in the same tab
    const handleVendorSaved = () => {
      loadVendors();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("vendorSaved", handleVendorSaved);

    // Also reload when location changes (when coming back from create page)
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("vendorSaved", handleVendorSaved);
    };
  }, [location]);

  // Filter vendors based on search term
  const filteredVendors = useMemo(() => {
    // First filter out inactive vendors (only show active by default)
    const activeVendors = vendors.filter(v => {
      // If explicitly marked as inactive in either field, filter it out
      if (v.isActive === false || v.isActive === 'false' || v.status === 'inactive') {
        return false;
      }
      return true;
    });

    if (!searchTerm) return activeVendors;
    const term = searchTerm.toLowerCase();
    return activeVendors.filter((v) => {
      const name = (v.displayName || v.companyName || v.name || `${v.firstName || ""} ${v.lastName || ""}`).toLowerCase();
      const company = (v.companyName || "").toLowerCase();
      const email = (v.email || "").toLowerCase();
      const phone = (v.phone || v.mobile || "").toLowerCase();
      return name.includes(term) || company.includes(term) || email.includes(term) || phone.includes(term);
    });
  }, [vendors, searchTerm]);

  const handleExport = () => {
    if (filteredVendors.length === 0) return alert("No vendors to export");

    const headers = ["Name", "Company Name", "Email", "Work Phone", "GST Treatment", "Payables", "Unused Credits"];
    const rows = filteredVendors.map(v => [
      v.displayName || `${v.firstName || ""} ${v.lastName || ""}`.trim(),
      v.companyName || "-",
      v.email || "-",
      v.phone || v.mobile || "-",
      v.gstTreatment || "-",
      v.payables || 0,
      v.credits || 0
    ]);

    const csvContent = [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `all_vendors_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Header title="All Vendors" />
      <div className={`transition-all duration-300 min-h-screen bg-[#f8fafc] p-6 md:p-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Header Title & Action button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[#111827] tracking-tight">
              All Vendors
            </h1>
            {!loading && (
              <span className="px-3 py-1 rounded-full bg-[#e2e8f0] text-xs font-semibold text-[#475569]">
                {filteredVendors.length} {filteredVendors.length === 1 ? 'vendor' : 'vendors'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-none bg-[#EEEEEE] hover:bg-[#E2E2E2] px-4 py-2.5 text-sm font-semibold text-[#111827] border border-[#d1d5db] shadow-sm transition-colors cursor-pointer"
            >
              <Download size={16} />
              <span>Export All</span>
            </button>
            <Link
              to="/purchase/vendors/new"
              className="inline-flex items-center gap-2 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={18} />
              <span>New Vendor</span>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#9ca3af]" size={18} />
            <input
              type="text"
              placeholder="Search vendors by name, company, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-none border border-[#e2e8f0] bg-white text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#8B5CF6] shadow-sm transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af] hover:text-[#4b5563]"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Vendors Table */}
        <div className="rounded-none border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-full text-left text-xs">
              <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <tr className="bg-[#1e1e1e] text-white text-xs uppercase tracking-wide font-bold">
                  <th scope="col" className="px-3 py-3 text-center border-r border-[#333333] text-xs font-bold uppercase tracking-wider text-white w-14">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-[#333333]">
                    NAME
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-[#333333]">
                    COMPANY NAME
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-[#333333]">
                    EMAIL
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-[#333333]">
                    WORK PHONE
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-[#333333]">
                    GST TREATMENT
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white border-r border-[#333333]">
                    PAYABLES (BCY)
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white">
                    UNUSED CREDITS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      Loading vendors...
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      {searchTerm ? "No vendors found matching your search." : "No vendors added yet. Click 'New Vendor' to add one."}
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((v, index) => (
                    <tr key={v.id || index} className="border-b border-gray-100 hover:bg-[#f8fafc] transition-colors">
                      <td className="px-3 py-3.5 border-r border-gray-100 text-center text-gray-500 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap border-r border-gray-100">
                        <Link
                          to={`/purchase/vendors/${v._id || v.id}`}
                          className="font-semibold text-[#8B5CF6] hover:text-[#7C3AED] transition-colors"
                        >
                          {v.displayName || v.companyName || v.name || `${v.firstName || ""} ${v.lastName || ""}`.trim()}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 border-r border-gray-100">{v.companyName || "-"}</td>
                      <td className="px-4 py-3.5 text-gray-700 border-r border-gray-100">{v.email || "-"}</td>
                      <td className="px-4 py-3.5 text-gray-700 border-r border-gray-100">{v.phone || v.mobile || "-"}</td>
                      <td className="px-4 py-3.5 whitespace-pre-line text-gray-700 border-r border-gray-100">{v.gstTreatment || "-"}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900 border-r border-gray-100">{currency(v.payables || 0)}</td>
                      <td className="px-4 py-3.5 text-right text-gray-700 font-medium">{currency(v.credits || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default PurchaseVendors;




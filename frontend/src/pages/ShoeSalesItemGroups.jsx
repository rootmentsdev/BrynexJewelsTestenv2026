import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Folder, Plus, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Search } from "lucide-react";
import Head from "../components/Head";
import Header from "../components/Header";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";


const columns = [
  { key: "select", label: "" },
  { key: "name", label: "NAME" },
  { key: "sku", label: "SKU" },
  { key: "stock", label: "STOCK ON HAND" },
  { key: "reorder", label: "REORDER POINT" }
];

// Generate skeleton rows for loading state (no mock data)
const generateSkeletonRows = (count = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `skeleton-${i}`,
    name: "",
    items: 0,
    sku: "",
    stock: "",
    reorder: "",
    isSkeleton: true
  }));
};
const ShoeSalesItemGroups = () => {
  const navigate = useNavigate();
  const isSidebarOpen = useSidebar();
  const [rows, setRows] = useState([]); // Start with empty array
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1 = first confirmation, 2 = second confirmation
  const [deleting, setDeleting] = useState(false);
  const [groupsToDelete, setGroupsToDelete] = useState([]);
  const [accessMessage, setAccessMessage] = useState(""); // Message for non-admin users
  const [searchTerm, setSearchTerm] = useState("");
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  const fetchItemGroups = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem("rootfinuser");
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.email || null;
      const userPower = user?.power || "";
      const userEmail = user?.email || user?.username || "";
      const adminEmails = ['officerootments@gmail.com'];
      const isAdminEmail = userEmail && adminEmails.some(email => userEmail.toLowerCase() === email.toLowerCase());
      const isAdmin = isAdminEmail ||
                      user?.power === "admin" || 
                      (user?.locCode && (user.locCode === '858' || user.locCode === '103'));
      
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
      
      const mapLocNameToWarehouse = (locName) => {
        if (!locName) return "";
        return mapWarehouse(locName);
      };
      
      const userWarehouse = mapLocNameToWarehouse(userLocName);
      
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (searchTerm && searchTerm.trim()) {
        queryParams.append('search', searchTerm.trim());
      }
      
      if (userId) queryParams.append('userId', userId);
      if (userPower) queryParams.append('userPower', userPower);
      if (user?.locCode) queryParams.append('locCode', user.locCode);
      if (userWarehouse && userWarehouse !== "Warehouse") {
        queryParams.append('warehouse', userWarehouse);
      }
      
      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups?${queryParams.toString()}`);
      
      if (!response.ok) {
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          setAccessMessage(errorData.message || "You don't have permission to access item groups.");
          setRows([]);
          setTotalItems(0);
          setTotalPages(1);
          return;
        }
        throw new Error("Failed to fetch item groups");
      }

      const data = await response.json();
      setAccessMessage("");
      
      let groups = [];
      let total = 0;
      let pages = 1;
      
      if (Array.isArray(data)) {
        groups = data;
        total = data.length;
        pages = Math.ceil(total / itemsPerPage);
      } else if (data.groups && Array.isArray(data.groups)) {
        groups = data.groups;
        total = data.total || data.totalGroups || groups.length;
        pages = data.totalPages || data.pages || Math.ceil(total / itemsPerPage);
      }

      const formattedRows = groups.map((g) => ({
        id: g._id || g.id,
        name: g.groupName || g.name || "Untitled Group",
        items: typeof g.items === "number" ? g.items : (Array.isArray(g.items) ? g.items.length : (g.totalItems || g.itemCount || 0)),
        sku: g.sku || g.groupSku || "-",
        stock: g.totalStockOnHand !== undefined ? g.totalStockOnHand : (g.stockOnHand !== undefined ? g.stockOnHand : (g.stock !== undefined ? g.stock : 0)),
        reorder: g.reorderPoint || g.reorder || "-",
        image: g.image || g.groupImage || null,
      }));

      setRows(formattedRows);
      setTotalItems(total);
      setTotalPages(pages || 1);
    } catch (err) {
      console.error("Error fetching item groups:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemGroups();
  }, [currentPage, itemsPerPage, searchTerm]);

  const handleSelectAll = (checked) => {
    if (checked) {
      const validIds = rows.filter(row => row.id && !row.id.startsWith('skeleton-')).map(r => r.id);
      setSelectedGroups(new Set(validIds));
    } else {
      setSelectedGroups(new Set());
    }
  };

  const handleCheckboxChange = (id, checked) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleDeleteClick = () => {
    if (selectedGroups.size === 0) return;
    const selectedList = rows.filter(row => selectedGroups.has(row.id));
    setGroupsToDelete(selectedList);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };

  const handleSingleDelete = (group) => {
    setGroupsToDelete([group]);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteStep1 = () => {
    setDeleteStep(2);
  };

  const handleConfirmDeleteStep2 = async () => {
    try {
      setDeleting(true);
      const deletePromises = groupsToDelete.map(group =>
        fetch(`${API_URL}/api/shoe-sales/item-groups/${group.id}`, { method: "DELETE" })
      );
      await Promise.all(deletePromises);
      setSelectedGroups(new Set());
      setShowDeleteModal(false);
      setDeleteStep(1);
      setGroupsToDelete([]);
      fetchItemGroups();
    } catch (error) {
      console.error("Error deleting item groups:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setGroupsToDelete([]);
  };

  return (
    <>
      <Header title="Item Groups" />
      <div className={`transition-all duration-300 p-6 bg-[#f8fafc] min-h-screen ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="flex items-center justify-end mb-6">
          <div className="flex items-center gap-3">
            {selectedGroups.size > 0 && (
              <button
                onClick={handleDeleteClick}
                className="inline-flex h-10 items-center gap-2 rounded-none bg-[#dc2626] px-4 text-sm font-semibold text-white transition hover:bg-[#b91c1c] shadow-sm cursor-pointer"
              >
                <Trash2 size={16} />
                <span>Delete ({selectedGroups.size})</span>
              </button>
            )}
            <Link
              to="/shoe-sales/item-groups/new"
              className="inline-flex h-10 items-center gap-2 rounded-none bg-[#9B48D7] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#8637c3]"
            >
              <Plus size={16} />
              <span>New Item Group</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative w-[279px] h-[44px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name or sku"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-full pl-10 pr-4 rounded-none border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none shadow-sm transition-all"
            />
          </div>

          <div className="text-xs font-medium text-[#475569]">
            {totalItems} groups | Showing newest first
          </div>
        </div>

        <div className="w-full bg-white rounded-none border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#18181b] text-white">
                <tr>
                  <th scope="col" className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-none border-gray-600 text-[#9B48D7] focus:ring-[#9B48D7] cursor-pointer"
                      checked={rows.length > 0 && rows.filter(row => row.id && !row.id.startsWith('skeleton-')).every(row => selectedGroups.has(row.id))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-white uppercase">
                    NAME
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">
                    SKU
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">
                    STOCK IN HAND
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">
                    REORDER POINT
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Folder size={48} className="text-gray-300" />
                        {accessMessage ? (
                          <>
                            <p className="text-sm font-medium text-gray-700">Access Restricted</p>
                            <p className="text-xs text-gray-500 max-w-md">{accessMessage}</p>
                            <button
                              onClick={() => navigate("/shoe-sales/items")}
                              className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-[#9B48D7] rounded-none hover:bg-[#8637c3] transition-colors cursor-pointer"
                            >
                              Go to Items Page
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-gray-700">
                              No item groups found
                            </p>
                            <p className="text-xs text-gray-400">
                              {searchTerm ? "Try a different search term" : "Create your first item group to get started"}
                            </p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id || row.name} className="h-[60px] hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-4 text-center">
                        {row.id && !row.id.startsWith('skeleton-') ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded-none border-gray-300 text-[#9B48D7] focus:ring-[#9B48D7] cursor-pointer"
                              checked={selectedGroups.has(row.id)}
                              onChange={(e) => handleCheckboxChange(row.id, e.target.checked)}
                            />
                            {selectedGroups.has(row.id) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSingleDelete(row);
                                }}
                                className="p-1 rounded-none hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                                title="Delete this group"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block h-4 w-4 rounded-none border border-gray-200 bg-gray-50" />
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {row.isSkeleton ? (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-none bg-gray-200 animate-pulse shrink-0" />
                            <div className="space-y-1.5">
                              <div className="h-4 w-32 bg-gray-200 rounded-none animate-pulse" />
                              <div className="h-3 w-16 bg-gray-100 rounded-none animate-pulse" />
                            </div>
                          </div>
                        ) : (
                          <Link
                            to={`/shoe-sales/item-groups/${row.id}`}
                            className="flex items-center gap-3 group cursor-pointer"
                          >
                            {row.image ? (
                              <div className="w-10 h-10 rounded-none bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden p-0.5 shadow-sm">
                                <img src={row.image} alt={row.name} className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-none bg-[#e2e8f0] flex-shrink-0 flex items-center justify-center text-gray-500 group-hover:bg-[#f1e6fa] group-hover:text-[#9B48D7] transition-colors">
                                <Folder size={18} />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-gray-900 group-hover:text-[#9B48D7] transition-colors">
                                {row.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {row.items || 0} items
                              </p>
                            </div>
                          </Link>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right text-sm text-gray-500">
                        {row.isSkeleton ? (
                          <div className="h-4 w-12 bg-gray-200 rounded-none animate-pulse ml-auto" />
                        ) : (
                          row.sku || "-"
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right text-sm font-semibold text-gray-800">
                        {row.isSkeleton ? (
                          <div className="h-4 w-10 bg-gray-200 rounded-none animate-pulse ml-auto" />
                        ) : (
                          row.stock ?? "-"
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right text-sm text-gray-500">
                        {row.isSkeleton ? (
                          <div className="h-4 w-12 bg-gray-200 rounded-none animate-pulse ml-auto" />
                        ) : (
                          row.reorder || "-"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
            <div className="text-xs text-gray-400">
              Showing {rows.length > 0 ? ((currentPage - 1) * itemsPerPage + 1) : 0} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} groups
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ← Previous
              </button>
              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (currentPage > 3) pages.push("...");
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);
                    for (let i = start; i <= end; i++) {
                      if (!pages.includes(i)) pages.push(i);
                    }
                    if (currentPage < totalPages - 2) pages.push("...");
                    pages.push(totalPages);
                  }
                  return pages.map((page, idx) => {
                    if (page === "...") {
                      return <span key={`dots-${idx}`} className="px-1 text-xs text-gray-400">...</span>;
                    }
                    const isActive = currentPage === page;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        disabled={loading}
                        className={`w-8 h-8 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          isActive
                            ? "bg-[#18181b] text-white shadow-sm"
                            : "text-gray-600 hover:text-black hover:bg-gray-100"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  });
                })()}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-none shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                {deleteStep === 1 ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-none bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="text-red-600" size={20} />
                      </div>
                      <h3 className="text-lg font-semibold text-[#1e293b]">
                        Delete {groupsToDelete.length === 1 ? 'Item Group' : `${groupsToDelete.length} Item Groups`}?
                      </h3>
                    </div>
                    <p className="text-sm text-[#64748b] mb-6">
                      Are you sure you want to delete {groupsToDelete.length === 1 ? 'this item group' : `these ${groupsToDelete.length} item groups`}? 
                      This action cannot be undone and will also delete all items within {groupsToDelete.length === 1 ? 'this group' : 'these groups'}.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={handleCancelDelete}
                        className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-none hover:bg-[#f8fafc] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDeleteStep1}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-none hover:bg-[#b91c1c] transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-none bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="text-red-600" size={20} />
                      </div>
                      <h3 className="text-lg font-semibold text-[#1e293b]">
                        Final Confirmation
                      </h3>
                    </div>
                    <p className="text-sm text-[#64748b] mb-4">
                      This action cannot be undone. Are you absolutely sure you want to delete {groupsToDelete.length === 1 ? 'this item group' : `these ${groupsToDelete.length} item groups`}?
                    </p>
                    {groupsToDelete.length > 0 && (
                      <div className="mb-4 p-3 bg-[#f8fafc] rounded-none max-h-40 overflow-y-auto">
                        <p className="text-xs font-semibold text-[#64748b] mb-2">Item groups to be deleted:</p>
                        <ul className="text-xs text-[#475569] space-y-1">
                          {groupsToDelete.map((group, idx) => (
                            <li key={group.id || idx}>
                              • {group.name} {group.sku ? `(${group.sku})` : ''} - {group.items} items
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setDeleteStep(1)}
                        className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-none hover:bg-[#f8fafc] transition-colors"
                        disabled={deleting}
                      >
                        Back
                      </button>
                      <button
                        onClick={handleConfirmDeleteStep2}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-none hover:bg-[#b91c1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {deleting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Deleting...
                          </>
                        ) : (
                          'Confirm Delete'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

};

export default ShoeSalesItemGroups;

const PrimaryButton = ({ children, to, onClick }) => {
  const Component = to ? Link : "button";
  return (
    <Component
      to={to}
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#4285f4] px-4 text-sm font-medium text-white transition hover:bg-[#3367d6] active:bg-[#2851a3]"
    >
      {children}
    </Component>
  );
};

const MutedButton = ({ children }) => (
  <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d2d8e4] bg-white text-[#2f3445] transition hover:bg-[#eef1f7] active:bg-[#e2e6f0]">
    {children}
  </button>
);
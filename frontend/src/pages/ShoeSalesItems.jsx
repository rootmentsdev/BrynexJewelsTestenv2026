import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { SlidersHorizontal, Plus, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Search, FolderPlus, Layers, Check, CheckCircle2, X, Barcode, Copy, Pencil, Save, Scissors } from "lucide-react";
import Head from "../components/Head";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import { useSidebar } from "../hooks/useSidebar.js";

const columns = [
  { key: "select", label: "" },
  { key: "name", label: "NAME" },
  { key: "sku", label: "SKU" },
  { key: "reorder", label: "REORDER LEVEL" }
];

const API_ROOT = (baseUrl?.baseUrl || "").replace(/\/$/, "");

const ShoeSalesItems = () => {
  const isSidebarOpen = useSidebar();
  const skeletonRows = useMemo(() => Array.from({ length: 6 }), []);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Add to Group Modal State
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [groupOption, setGroupOption] = useState("existing"); // "existing" | "new"
  const [existingGroups, setExistingGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupUnit, setNewGroupUnit] = useState("PCS");
  const [addingToGroup, setAddingToGroup] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userEmail = user?.email || user?.username || "";
  const adminEmails = ['officerootments@gmail.com', 'brynex@gmail.com'];
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

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (searchTerm && searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      
      if (userWarehouse && userWarehouse !== "Warehouse") {
        params.append("warehouse", userWarehouse);
      }
      params.append("isAdmin", isAdmin.toString());
      if (user?.power) params.append("userPower", user.power);
      if (user?.locCode) params.append("locCode", user.locCode);
      
      const fullUrl = `${API_ROOT}/api/shoe-sales/items?${params}`;
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error("Unable to load items.");
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        const activeOnly = data.filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false");
        setItems(activeOnly);
        setTotalItems(activeOnly.length);
        setTotalPages(Math.ceil(activeOnly.length / itemsPerPage));
      } else {
        const list = Array.isArray(data.items) ? data.items : [];
        const activeOnly = list.filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false");
        setItems(activeOnly);
        if (data.pagination) {
          setTotalItems(data.pagination.totalItems || 0);
          setTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to fetch items.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, isAdmin, userWarehouse, searchTerm, user?.power, user?.locCode]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenAddToGroupModal = async () => {
    if (selectedItems.size === 0) return;
    setShowAddToGroupModal(true);
    setGroupOption("existing");
    setSelectedGroupId("");
    setNewGroupName("");
    setNewGroupUnit("PCS");
    setGroupSearchTerm("");
    
    // Fetch existing groups
    try {
      setLoadingGroups(true);
      const res = await fetch(`${API_ROOT}/api/shoe-sales/item-groups?limit=1000&all=true`);
      if (res.ok) {
        const data = await res.json();
        const groupList = Array.isArray(data) ? data : (Array.isArray(data?.groups) ? data.groups : []);
        const activeGroups = groupList.filter(g => g.isActive !== false);
        setExistingGroups(activeGroups);
        if (activeGroups.length > 0) {
          setSelectedGroupId(activeGroups[0]._id || activeGroups[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching item groups:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleConfirmAddToGroup = async () => {
    if (groupOption === "existing" && !selectedGroupId) {
      alert("Please select an existing item group from the list.");
      return;
    }
    if (groupOption === "new" && !newGroupName.trim()) {
      alert("Please enter a name for the new item group.");
      return;
    }

    const selectedList = items.filter(item => item._id && selectedItems.has(item._id));
    if (selectedList.length === 0) return;

    setAddingToGroup(true);
    try {
      const payload = {
        option: groupOption,
        groupId: selectedGroupId,
        newGroupName: newGroupName.trim(),
        newGroupUnit: newGroupUnit || "PCS",
        itemIds: Array.from(selectedItems),
        items: selectedList,
        userWarehouse: userWarehouse || "Warehouse",
      };

      const response = await fetch(`${API_ROOT}/api/shoe-sales/item-groups/add-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let resData = null;
      try {
        resData = await response.json();
      } catch (parseErr) {
        // Handle non-JSON HTML error responses
      }

      if (!response.ok) {
        throw new Error(resData?.message || `Server returned error (${response.status})`);
      }

      setToastMessage({
        type: "success",
        text: resData.message || `Successfully added ${selectedItems.size} items to group!`,
      });
      setTimeout(() => setToastMessage(null), 4000);

      setSelectedItems(new Set());
      setShowAddToGroupModal(false);
      fetchItems();
    } catch (err) {
      console.error("Error adding items to group:", err);
      alert(err.message || "Failed to add items to group.");
    } finally {
      setAddingToGroup(false);
    }
  };

  const handleCheckboxChange = (itemId, isChecked) => {
    const newSelected = new Set(selectedItems);
    if (isChecked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const allIds = items.filter(item => item._id).map(item => item._id);
      setSelectedItems(new Set(allIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleDeleteClick = () => {
    const selectedIds = Array.from(selectedItems);
    if (selectedIds.length === 0) return;
    
    const itemsToDeleteList = items.filter(item => {
      const id = item._id;
      return id && selectedIds.includes(id);
    });
    
    setItemsToDelete(itemsToDeleteList);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };

  const handleSingleDelete = (item) => {
    const itemId = item._id;
    if (!itemId) return;
    
    setItemsToDelete([item]);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteStep1 = () => {
    setDeleteStep(2);
  };

  const handleConfirmDeleteStep2 = async () => {
    setDeleting(true);
    try {
      const deletePromises = itemsToDelete.map(async (item) => {
        const itemId = item._id;
        if (!itemId) return;
        
        const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete item");
        }
        
        return itemId;
      });

      await Promise.all(deletePromises);
      
      const deletedIds = itemsToDelete.map(i => i._id).filter(Boolean);
      const newSelected = new Set(selectedItems);
      deletedIds.forEach(id => newSelected.delete(id));
      setSelectedItems(newSelected);
      
      setCurrentPage(1);
      setShowDeleteModal(false);
      setDeleteStep(1);
      setItemsToDelete([]);
      window.location.reload();
    } catch (error) {
      console.error("Error deleting items:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setItemsToDelete([]);
  };

  return (
    <>
      <Header title="Items" />
      <div className={`transition-all duration-300 p-6 bg-[#f8fafc] min-h-screen ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="flex items-center justify-end mb-6">
          <div className="flex items-center gap-3">
            {selectedItems.size > 0 && (
              <button
                onClick={handleOpenAddToGroupModal}
                className="inline-flex h-10 items-center gap-2 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] px-4 text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer"
              >
                <FolderPlus size={16} />
                <span>Add to Group ({selectedItems.size})</span>
              </button>
            )}
            {isAdmin && selectedItems.size > 0 && (
              <button
                onClick={handleDeleteClick}
                className="inline-flex h-10 items-center gap-2 rounded-none bg-[#dc2626] px-4 text-sm font-semibold text-white transition hover:bg-[#b91c1c] shadow-sm cursor-pointer"
              >
                <Trash2 size={16} />
                <span>Delete ({selectedItems.size})</span>
              </button>
            )}
            {isAdmin && (
              <Link
                to="/shoe-sales/items/new"
                className="inline-flex h-10 items-center gap-2 rounded-none bg-[#9B48D7] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#8637c3]"
              >
                <Plus size={16} />
                <span>New Item</span>
              </Link>
            )}
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
            {totalItems} items | Showing newest first
          </div>
        </div>

        {error && (
          <div className="mb-4 border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2 rounded-none shadow-sm">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div className="w-full bg-white rounded-none border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#18181b] text-white">
                <tr>
                  <th scope="col" className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-none border-gray-600 text-[#9B48D7] focus:ring-[#9B48D7] cursor-pointer"
                      checked={items.length > 0 && items.every(item => !item._id || selectedItems.has(item._id))}
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
                    STOCK ON HAND
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right text-[11px] font-bold tracking-wider text-white uppercase">
                    REORDER LEVEL
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {loading
                  ? skeletonRows.map((_, idx) => (
                      <tr key={idx} className="h-[60px]">
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-block h-4 w-4 rounded-none border border-gray-200 bg-gray-50" />
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-none bg-gray-200 animate-pulse shrink-0" />
                            <div className="space-y-1.5">
                              <div className="h-4 w-40 bg-gray-200 rounded-none animate-pulse" />
                              <div className="h-3 w-20 bg-gray-100 rounded-none animate-pulse" />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="h-4 w-12 bg-gray-200 rounded-none animate-pulse ml-auto" />
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="h-4 w-10 bg-gray-200 rounded-none animate-pulse ml-auto" />
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="h-4 w-12 bg-gray-200 rounded-none animate-pulse ml-auto" />
                        </td>
                      </tr>
                    ))
                  : items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <span className="text-4xl">📦</span>
                            <p className="text-sm font-semibold text-gray-700">
                              {searchTerm ? "No items found" : "No items yet"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {searchTerm ? "Try a different search term" : "Create a new item to get started"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const itemPath = item.isFromGroup && item.itemGroupId
                          ? `/shoe-sales/item-groups/${item.itemGroupId}/items/${item._id}`
                          : `/shoe-sales/items/${item._id}`;
                        
                        let stockVal = 0;
                        if (typeof item.stockOnHand === "number") {
                          stockVal = item.stockOnHand;
                        } else if (Array.isArray(item.warehouseStocks) && item.warehouseStocks.length > 0) {
                          if (userWarehouse && userWarehouse !== "Warehouse") {
                            const ws = item.warehouseStocks.find(w => (w.warehouse || "").toLowerCase().includes(userWarehouse.toLowerCase()));
                            stockVal = ws ? (Number(ws.stockOnHand) || 0) : 0;
                          } else {
                            stockVal = item.warehouseStocks.reduce((sum, ws) => sum + (Number(ws.stockOnHand) || 0), 0);
                          }
                        } else if (typeof item.stock === "number") {
                          stockVal = item.stock;
                        }

                        return (
                          <tr key={item._id} className="h-[60px] hover:bg-gray-50/80 transition-colors">
                              <td className="py-2.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded-none border-gray-300 text-[#9B48D7] focus:ring-[#9B48D7] cursor-pointer"
                                    checked={selectedItems.has(item._id)}
                                    onChange={(e) => handleCheckboxChange(item._id, e.target.checked)}
                                  />
                                  {isAdmin && selectedItems.has(item._id) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSingleDelete(item);
                                      }}
                                      className="p-1 rounded-none hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                                      title="Delete this item"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>

                              <td className="py-2.5 px-4">
                                <Link
                                  to={itemPath}
                                  className="flex items-center gap-3 group cursor-pointer"
                                >
                                  {(() => {
                                    const itemImg = item.image || (item.images && item.images[0]?.data) || (item.images && typeof item.images[0] === 'string' && item.images[0]) || "";
                                    if (itemImg) {
                                      return (
                                        <div className="w-10 h-10 rounded-none bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden p-0.5 shadow-sm">
                                          <img
                                            src={itemImg}
                                            alt={item.itemName || item.name}
                                            className="w-full h-full object-contain"
                                          />
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="w-10 h-10 rounded-none bg-[#e2e8f0] flex-shrink-0 flex items-center justify-center text-gray-700 font-bold text-sm group-hover:bg-[#f1e6fa] group-hover:text-[#9B48D7] transition-colors uppercase">
                                        {(item.itemName || item.name || "?")[0]}
                                      </div>
                                    );
                                  })()}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold text-gray-900 group-hover:text-[#9B48D7] transition-colors">
                                        {item.itemName || item.name}
                                      </p>
                                      {item.isFromGroup && (
                                        <span className="inline-flex items-center rounded-none bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-[#9B48D7] border border-purple-200">
                                          GROUP
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400">
                                      {item.brand || item.itemGroupName || "Unbranded"}
                                    </p>
                                  </div>
                                </Link>
                              </td>

                              <td className="py-2.5 px-4 text-right text-sm font-mono text-gray-800">
                                {item.sku || "-"}
                              </td>

                              <td className="py-2.5 px-4 text-right text-sm font-semibold text-gray-800">
                                {stockVal}
                              </td>

                              <td className="py-2.5 px-4 text-right text-sm text-gray-500">
                                {item.reorderPoint || "-"}
                              </td>
                            </tr>
                          );
                        })
                    )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
            <div className="text-xs text-gray-400">
              Showing {items.length > 0 ? ((currentPage - 1) * itemsPerPage + 1) : 0} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
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
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-none shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {deleteStep === 1 ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1e293b]">
                      Delete {itemsToDelete.length === 1 ? 'Item' : `${itemsToDelete.length} Items`}?
                    </h3>
                  </div>
                  <p className="text-sm text-[#64748b] mb-6">
                    Are you sure you want to delete {itemsToDelete.length === 1 ? 'this item' : `these ${itemsToDelete.length} items`}? 
                    This action cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={handleCancelDelete}
                      className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDeleteStep1}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-lg hover:bg-[#b91c1c] transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1e293b]">
                      Final Confirmation
                    </h3>
                  </div>
                  <p className="text-sm text-[#64748b] mb-4">
                    This action cannot be undone. Are you absolutely sure you want to delete {itemsToDelete.length === 1 ? 'this item' : `these ${itemsToDelete.length} items`}?
                  </p>
                  {itemsToDelete.length > 0 && (
                    <div className="mb-4 p-3 bg-[#f8fafc] rounded-lg max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-[#64748b] mb-2">Items to be deleted:</p>
                      <ul className="text-xs text-[#475569] space-y-1">
                        {itemsToDelete.map((item, idx) => (
                          <li key={item._id || idx}>
                            • {item.itemName || item.name} {item.sku ? `(${item.sku})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setDeleteStep(1)}
                      className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors"
                      disabled={deleting}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmDeleteStep2}
                      disabled={deleting}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-lg hover:bg-[#b91c1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

      {/* Add to Group Modal */}
      {showAddToGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-none border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-none bg-purple-100 flex items-center justify-center text-purple-700">
                  <FolderPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">Add Items to Group</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedItems.size} item{selectedItems.size > 1 ? "s" : ""} selected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddToGroupModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-200/60 rounded-none transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Selected Items Mini Preview */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                  Items to Add ({selectedItems.size})
                </label>
                <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-none">
                  {items
                    .filter((it) => it._id && selectedItems.has(it._id))
                    .map((it) => (
                      <span
                        key={it._id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-none shadow-2xs"
                      >
                        <span className="truncate max-w-[170px] font-semibold">{it.itemName || it.name}</span>
                        {it.sku && (
                          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1 py-0.2 border border-purple-100">
                            {it.sku}
                          </span>
                        )}
                      </span>
                    ))}
                </div>
              </div>

              {/* Option Tabs */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                  Group Destination
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-none border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setGroupOption("existing")}
                    className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-none transition-all cursor-pointer ${
                      groupOption === "existing"
                        ? "bg-white text-purple-700 shadow-xs border border-gray-200"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Layers size={14} />
                    <span>Existing Group</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupOption("new")}
                    className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-none transition-all cursor-pointer ${
                      groupOption === "new"
                        ? "bg-white text-purple-700 shadow-xs border border-gray-200"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Plus size={14} />
                    <span>Create New Group</span>
                  </button>
                </div>
              </div>

              {/* Existing Group Picker */}
              {groupOption === "existing" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                    <input
                      type="text"
                      placeholder="Search existing groups by name..."
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-none border border-gray-200 bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1.5 border border-gray-200 rounded-none p-2 bg-gray-50">
                    {loadingGroups ? (
                      <div className="py-8 text-center text-xs text-gray-400">Loading groups...</div>
                    ) : existingGroups.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400">No item groups found</div>
                    ) : (
                      existingGroups
                        .filter((g) => {
                          if (!groupSearchTerm.trim()) return true;
                          const term = groupSearchTerm.toLowerCase();
                          return (
                            (g.name || "").toLowerCase().includes(term) ||
                            (g.sku || "").toLowerCase().includes(term)
                          );
                        })
                        .map((grp) => {
                          const isSelected = selectedGroupId === (grp._id || grp.id);
                          const count = Array.isArray(grp.items)
                            ? grp.items.length
                            : typeof grp.items === "number"
                            ? grp.items
                            : Array.isArray(grp.itemsList)
                            ? grp.itemsList.length
                            : 0;
                          return (
                            <div
                              key={grp._id || grp.id}
                              onClick={() => setSelectedGroupId(grp._id || grp.id)}
                              className={`p-2.5 rounded-none border flex items-center justify-between cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-purple-50 border-purple-400 shadow-2xs"
                                  : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-100/60"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-900 truncate">{grp.name}</span>
                                  <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-none">
                                    {count} items
                                  </span>
                                </div>
                                {grp.sku && <p className="text-[11px] text-gray-400 font-mono mt-0.5">SKU: {grp.sku}</p>}
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-none bg-purple-600 text-white flex items-center justify-center shrink-0">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* Create New Group Inputs */}
              {groupOption === "new" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      New Item Group Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ring Set Gold, Diamond Bangles"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-none border border-gray-200 bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Unit</label>
                    <select
                      value={newGroupUnit}
                      onChange={(e) => setNewGroupUnit(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-none border border-gray-200 bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 cursor-pointer"
                    >
                      <option value="PCS">PCS (Pieces)</option>
                      <option value="GMS">GMS (Grams)</option>
                      <option value="KGS">KGS (Kilograms)</option>
                      <option value="SET">SET (Set)</option>
                      <option value="BOX">BOX (Box)</option>
                      <option value="PAIR">PAIR (Pair)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddToGroupModal(false)}
                disabled={addingToGroup}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-none hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddToGroup}
                disabled={
                  addingToGroup ||
                  (groupOption === "existing" && !selectedGroupId) ||
                  (groupOption === "new" && !newGroupName.trim())
                }
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-none shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {addingToGroup ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <FolderPlus size={14} />
                    <span>{groupOption === "new" ? "Create Group & Add Items" : "Add to Group"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-none shadow-2xl flex items-center gap-3 border border-gray-700 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 size={18} className="text-green-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage.text}</span>
        </div>
      )}
    </>
  );
};

export default ShoeSalesItems;

const FloatingField = ({ label, placeholder, inputType = "input", hint, prefix }) => (
  <label className="flex w-full flex-col gap-1 text-sm text-[#475569]">
    <span className="font-medium">{label}</span>
    {inputType === "textarea" ? (
      <textarea
        placeholder={placeholder}
        rows={3}
        className="rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] placeholder:text-[#94a3b8] focus:border-[#3762f9] focus:outline-none"
      />
    ) : inputType === "select" ? (
      <select className="rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#3762f9] focus:outline-none">
        <option>{placeholder}</option>
      </select>
    ) : (
      <div className="flex items-center rounded-lg border border-[#d7dcf5] focus-within:border-[#3762f9]">
        {prefix && <span className="pl-3 text-xs font-semibold uppercase text-[#64748b]">{prefix}</span>}
        <input
          type="text"
          placeholder={placeholder}
          className="w-full rounded-lg px-3 py-2 text-sm text-[#1f2937] placeholder:text-[#94a3b8] focus:outline-none"
        />
        {hint && <span className="pr-3 text-xs text-[#94a3b8]">{hint}</span>}
      </div>
    )}
  </label>
);

const FloatingCheckbox = ({ label, defaultChecked = false }) => (
  <label className="inline-flex items-center gap-3 rounded-lg border border-[#dbe4ff] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-sm">
    <input
      type="checkbox"
      defaultChecked={defaultChecked}
      className="h-4 w-4 rounded border-[#cbd5f5] text-[#4285f4] focus:ring-[#4285f4]"
    />
    {label}
  </label>
);

const ImagePlaceholder = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M7 15.5L10 12l3 3 4-4 3 3.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.7"
    />
    <circle cx="9" cy="8" r="1.3" fill="currentColor" opacity="0.5" />
  </svg>
);

const FloatingSelect = ({ label, options = [], placeholder }) => (
  <label className="flex w-full flex-col gap-1 text-sm text-[#475569]">
    <span className="font-medium">{label}</span>
    <select className="rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none">
      {placeholder && <option>{placeholder}</option>}
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  </label>
);

const FloatingRadio = ({ name, label, defaultChecked = false }) => (
  <label className="inline-flex items-center gap-2 rounded-full border border-[#dbe4ff] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-sm">
    <input
      type="radio"
      name={name}
      defaultChecked={defaultChecked}
      className="text-[#4285f4] focus:ring-[#4285f4]"
    />
    {label}
  </label>
);

const ActionButton = ({ children, to, onClick }) => {
  const Component = to ? Link : "button";
  return (
    <Component
      to={to}
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-medium text-white transition hover:bg-[#1d4ed8] active:bg-[#1e40af]"
    >
      {children}
    </Component>
  );
};

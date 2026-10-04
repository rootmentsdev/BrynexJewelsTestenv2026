import { useState, useEffect, useRef, useMemo } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search, X, Plus, Trash2 } from "lucide-react";
import Head from "../components/Head";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";

const Label = ({ children, required = false }) => (
  <label className="block text-xs font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const Input = ({ placeholder = "", className = "", ...props }) => {
  const baseClasses = "w-full rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 transition-colors";
  const tableInputClasses = "h-[36px] px-[10px] py-[6px]";
  const defaultClasses = "px-3.5 py-2.5";
  
  const isTableInput = className.includes("table-input");
  const finalClasses = `${baseClasses} ${isTableInput ? tableInputClasses : defaultClasses} ${className}`;
  
  return (
    <input
      {...props}
      className={finalClasses}
      placeholder={placeholder}
    />
  );
};

// Warehouse Dropdown Component for Store Warehouse selection
const WarehouseDropdown = ({ value, onChange, options, placeholder = "Select warehouse...", required = false, disabled = false }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  const toggleDropdown = (e) => {
    if (disabled) return;
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLabel = value || placeholder;

  const dropdownPortal = isOpen && !disabled ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 999999,
      }}
    >
      <div className="rounded-lg border border-gray-200 bg-white shadow-xl max-h-60 overflow-y-auto">
        <div className="flex items-center gap-2 p-2 border-b border-gray-100">
          <Search size={14} className="text-gray-400 ml-1" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search warehouses..."
            className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="py-1">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No warehouses found</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className={`px-3.5 py-2 text-sm cursor-pointer transition-colors ${
                  value === option ? "bg-purple-50 text-purple-700 font-semibold" : "text-gray-800 hover:bg-gray-50"
                }`}
              >
                {option}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative w-full">
        <input
          ref={buttonRef}
          onClick={toggleDropdown}
          type="text"
          readOnly
          value={selectedLabel}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full h-10 rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors cursor-pointer px-3 py-2.5 pr-8 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px_16px] bg-[right_0.5rem_center] bg-no-repeat ${
            disabled ? "cursor-not-allowed bg-[#f3f4f6] opacity-60" : ""
          }`}
        />
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// ItemDropdown Component for Store Orders - shows items available in store warehouse
const ItemDropdown = ({ rowId, value, onChange, storeWarehouse, onStockFetched, isStoreUser = false, userWarehouse = "" }) => {
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [displayedCount, setDisplayedCount] = useState(20);
  const ITEMS_PER_PAGE = 20;

  // Filter items by warehouse - show ONLY items that have stock in the selected store warehouse
  const filterItemsByWarehouse = (itemsList, targetWarehouse) => {
    if (!targetWarehouse) return [];
    
    // Normalize target warehouse using mapping utility
    const normalizedTarget = mapWarehouse(targetWarehouse);
    const targetWarehouseLower = (normalizedTarget || targetWarehouse).toLowerCase().trim();
    const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
    
    return itemsList.filter(item => {
      if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks)) return false;
      
      // Find matching warehouse stock
      const matchingStock = item.warehouseStocks.find(ws => {
        if (!ws.warehouse) return false;
        const stockWarehouseRaw = ws.warehouse.toString().trim();
        const normalizedStock = mapWarehouse(stockWarehouseRaw);
        const stockWarehouse = (normalizedStock || stockWarehouseRaw).toLowerCase().trim();
        
        // For store users - NEVER show warehouse stock (confidential)
        if (isStoreUser && (stockWarehouse === "warehouse" || stockWarehouse.includes("warehouse"))) {
          return false;
        }
        
        // Check exact match after normalization
        if (stockWarehouse === targetWarehouseLower) return true;
        
        // Check base name match (e.g., "edappally" matches "edapally branch")
        const stockBase = stockWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
        if (stockBase && targetBase && stockBase === targetBase) return true;
        
        // Partial match - check if warehouse name contains target or vice versa
        if (stockWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(stockWarehouse)) {
          return true;
        }
        
        return false;
      });
      
      // Only return items that have stock in the selected warehouse (stock > 0)
      if (matchingStock) {
        const stockOnHand = parseFloat(matchingStock.stockOnHand) || 0;
        return stockOnHand > 0; // Only show items with available stock
      }
      
      return false;
    });
  };

  // Fetch items and item groups
  useEffect(() => {
    const fetchItems = async () => {
      if (!storeWarehouse) {
        setItems([]);
        return;
      }
      
      setLoading(true);
      try {
        // 1. Fetch item groups for the specific store warehouse
        const groupsResponse = await fetch(
          `${API_URL}/api/shoe-sales/item-groups?page=1&limit=10000&warehouse=${encodeURIComponent(storeWarehouse)}&isAdmin=false`
        );
        let groupsList = [];
        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json();
          groupsList = Array.isArray(groupsData) ? groupsData : (groupsData.groups || groupsData.data || []);
        }

        const formattedGroups = groupsList
          .filter(group => group?.isActive !== false && String(group?.isActive).toLowerCase() !== "false")
          .map(group => {
            // Use pre-computed warehouseStocks if available
            let combinedWarehouseStocks = Array.isArray(group.warehouseStocks) ? [...group.warehouseStocks] : [];
            
            // Otherwise compute from items array if available
            const grpItems = Array.isArray(group.itemsList) ? group.itemsList : (Array.isArray(group.items) ? group.items : []);
            if (combinedWarehouseStocks.length === 0 && grpItems.length > 0) {
              grpItems.forEach(grpItem => {
                (grpItem.warehouseStocks || []).forEach(ws => {
                  const existingWs = combinedWarehouseStocks.find(cws => cws.warehouse === ws.warehouse);
                  if (existingWs) {
                    existingWs.stockOnHand = (parseFloat(existingWs.stockOnHand) || 0) + (parseFloat(ws.stockOnHand) || 0);
                    existingWs.availableForSale = (parseFloat(existingWs.availableForSale) || 0) + (parseFloat(ws.availableForSale) || 0);
                  } else {
                    combinedWarehouseStocks.push({
                      warehouse: ws.warehouse,
                      stockOnHand: parseFloat(ws.stockOnHand) || 0,
                      availableForSale: parseFloat(ws.availableForSale) || 0,
                    });
                  }
                });
              });
            }

            return {
              _id: group._id || group.id,
              id: group._id || group.id,
              itemName: group.name,
              sku: group.sku || "",
              isFromGroup: true,
              isGroup: true,
              itemGroupId: group._id || group.id,
              groupName: group.name,
              itemCount: typeof group.items === 'number' ? group.items : (Array.isArray(group.items) ? group.items.length : (grpItems.length || 0)),
              warehouseStocks: combinedWarehouseStocks,
              stock: group.stock,
              isActive: true,
            };
          });

        console.log(`🏪 Store Order items: ${formattedGroups.length} Item Groups for warehouse "${storeWarehouse}"`);
        setItems(formattedGroups);
      } catch (error) {
        console.error("Error fetching items:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchItems();
  }, [storeWarehouse, API_URL, isStoreUser]);

  useEffect(() => {
    if (value) {
      if (typeof value === 'object' && value !== null) {
        setSelectedItem(value);
      } else if (items.length > 0) {
        const item = items.find((i) => i._id === value || i.itemName === value);
        setSelectedItem(item || null);
      }
    } else {
      setSelectedItem(null);
    }
  }, [value, items]);

  // Fetch stock when item is selected
  const onStockFetchedRef = useRef(onStockFetched);
  useEffect(() => {
    onStockFetchedRef.current = onStockFetched;
  }, [onStockFetched]);

  const prevItemRef = useRef(null);
  const prevWarehouseRef = useRef(null);

  useEffect(() => {
    const itemKey = selectedItem 
      ? (selectedItem.isFromGroup 
          ? `${selectedItem.itemGroupId}-${selectedItem.itemName}-${selectedItem.sku || ''}`
          : selectedItem._id)
      : null;
    
    if (!selectedItem || !storeWarehouse) {
      prevItemRef.current = itemKey;
      prevWarehouseRef.current = storeWarehouse;
      return;
    }
    
    if (itemKey === prevItemRef.current && storeWarehouse === prevWarehouseRef.current) {
      return;
    }
    
    prevItemRef.current = itemKey;
    prevWarehouseRef.current = storeWarehouse;
    
    const fetchStock = async () => {
      try {
        const params = new URLSearchParams({ warehouse: storeWarehouse });
        
        if (selectedItem.isFromGroup) {
          params.append('itemGroupId', selectedItem.itemGroupId);
          params.append('itemName', selectedItem.itemName);
          if (selectedItem.sku) params.append('itemSku', selectedItem.sku);
        } else {
          params.append('itemId', selectedItem._id);
        }
        
        console.log(`🔍 Fetching stock for: ${selectedItem.itemName} in warehouse: ${storeWarehouse}`);
        const response = await fetch(`${API_URL}/api/inventory/store-orders/stock/item?${params}`);
        if (response.ok) {
          const stockData = await response.json();
          const quantity = stockData.currentQuantity ?? stockData.stockOnHand ?? 0;
          console.log(`✅ Stock fetched: ${quantity} units for ${selectedItem.itemName}`);
          if (onStockFetchedRef.current) {
            onStockFetchedRef.current(quantity);
          }
        } else {
          console.warn(`⚠️ Failed to fetch stock for ${selectedItem.itemName}:`, response.status);
          if (onStockFetchedRef.current) {
            onStockFetchedRef.current(0);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching stock:", error);
        if (onStockFetchedRef.current) {
          onStockFetchedRef.current(0);
        }
      }
    };
    
    fetchStock();
  }, [selectedItem, storeWarehouse, API_URL]);

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 500),
    });
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === "") return items;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return items.filter((item) => {
      const itemName = (item?.itemName || "").toLowerCase();
      const sku = (item?.sku || "").toLowerCase();
      const groupName = (item?.groupName || "").toLowerCase();
      return itemName.includes(searchLower) || sku.includes(searchLower) || groupName.includes(searchLower);
    });
  }, [items, searchTerm]);

  const handleSelectItem = (item) => {
    onChange(item);
    setIsOpen(false);
    setSearchTerm("");
  };

  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [searchTerm]);

  const getStockOnHand = (item, warehouse) => {
    if (!item) return 0;
    
    // Normalize warehouse using mapping utility
    const normalizedWarehouse = mapWarehouse(warehouse);
    const warehouseLower = (normalizedWarehouse || warehouse || "").toLowerCase().trim();
    const warehouseBase = warehouseLower.replace(/\s*(branch|warehouse|sg|g|z|suitorguy)\s*$/i, "").trim();
    
    if (item.warehouseStocks && Array.isArray(item.warehouseStocks) && item.warehouseStocks.length > 0) {
      const warehouseStock = item.warehouseStocks.find(ws => {
        if (!ws.warehouse) return false;
        const wsWarehouseRaw = ws.warehouse.toString().trim();
        const normalizedWs = mapWarehouse(wsWarehouseRaw);
        const wsWarehouse = (normalizedWs || wsWarehouseRaw).toLowerCase().trim();
        const wsBase = wsWarehouse.replace(/\s*(branch|warehouse|sg|g|z|suitorguy)\s*$/i, "").trim();
        
        // Exact match after normalization
        if (wsWarehouse === warehouseLower) return true;
        
        // Base name match
        if (wsBase && warehouseBase && wsBase === warehouseBase) return true;
        
        // Partial match
        if (wsWarehouse.includes(warehouseLower) || warehouseLower.includes(wsWarehouse)) return true;
        if (wsWarehouse.includes(warehouseBase) || warehouseBase.includes(wsWarehouse)) return true;
        return false;
      });
      
      if (warehouseStock && warehouseStock.stockOnHand !== undefined) {
        return parseFloat(warehouseStock.stockOnHand) || 0;
      }
    }
    
    if (item.stock !== undefined && item.stock !== null) {
      return parseFloat(item.stock) || 0;
    }
    
    return 0;
  };

  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 999999,
      }}
    >
      <div className="rounded-xl shadow-xl bg-white border border-[#d7dcf5] flex flex-col" style={{ width: '500px', maxWidth: '90vw', maxHeight: '70vh' }}>
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2.5 bg-[#fafbff]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="h-8 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="py-2 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d3d3d3 #f5f5f5' }}>
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">
              {searchTerm ? "No items found" : "No items available in this warehouse"}
            </div>
          ) : (
            <>
              {filteredItems.slice(0, displayedCount).map((item) => {
                const isSelected = selectedItem && (
                  (selectedItem._id && selectedItem._id === item._id) ||
                  (selectedItem.itemName && selectedItem.itemName === item.itemName)
                );
                const stockOnHand = getStockOnHand(item, storeWarehouse);
                
                return (
                  <div
                    key={item._id || item.itemName || Math.random()}
                    onClick={() => handleSelectItem(item)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-[#2563eb] text-white" : "hover:bg-[#f1f5f9]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${isSelected ? "text-white" : "text-[#1f2937]"}`}>
                          {item.itemName || "Unnamed Item"}
                        </div>
                        <div className={`text-xs mt-1 ${isSelected ? "text-white/80" : "text-[#64748b]"}`}>
                          {item.isGroup ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isSelected ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"}`}>
                                ITEM GROUP
                              </span>
                              {item.sku ? `• SKU: ${item.sku}` : ''}
                            </span>
                          ) : (
                            `SKU: ${item.sku || "N/A"}`
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <div className={`text-xs ${isSelected ? "text-white/80" : "text-[#64748b]"}`}>
                          Current Stock
                        </div>
                        <div className={`text-sm font-medium mt-0.5 ${isSelected ? "text-white" : Number(stockOnHand) > 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                          {Number(stockOnHand) > 0 ? `${Number(stockOnHand).toFixed(2)} pcs` : "0.00 pcs"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredItems.length > displayedCount && (
                <div className="px-4 py-3 border-t border-[#e2e8f0] text-center bg-[#f9faff]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
                    }}
                    className="w-full px-4 py-2.5 text-sm font-medium text-[#2563eb] hover:bg-[#eef2ff] rounded-lg transition-colors"
                  >
                    Load More ({displayedCount} of {filteredItems.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative w-full overflow-visible">
        <input
          ref={buttonRef}
          onClick={toggleDropdown}
          type="text"
          readOnly
          placeholder="Type or click to select an item."
          value={selectedItem ? selectedItem.itemName : ""}
          className="w-full h-[36px] rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors cursor-pointer px-[10px] py-[6px]"
        />
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

const StoreOrderCreate = () => {
  const isSidebarOpen = useSidebar();
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const isEditMode = !!id;
  
  // Get user info
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.email || user?._id || user?.id || "";
  const isAdmin = user?.power === "admin";
  const isWarehouseUser = user?.power === "warehouse";
  const isStoreUser = !isAdmin && !isWarehouseUser;
  const userLocCode = user?.locCode || "";
  
  // Fallback locations mapping
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
  
  // Get user's location name and warehouse
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
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderNumberLoading, setOrderNumberLoading] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [storeWarehouse, setStoreWarehouse] = useState("SuitorGuy MG Road");
  const [tableRows, setTableRows] = useState([{ 
    id: 1, 
    item: null, 
    itemId: null, 
    itemGroupId: null, 
    itemName: "", 
    itemSku: "", 
    currentStock: 0, 
    quantity: "" 
  }]);
  
  // Warehouse options for admin (stores/branches only, exclude Warehouse)
  const storeWarehouseOptions = [
    "SuitorGuy MG Road",
  ];
  
  // For store users, only show their own warehouse as option
  const availableWarehouseOptions = isStoreUser && userWarehouse 
    ? [userWarehouse] 
    : storeWarehouseOptions;
  
  // Fetch next order number when creating a new order (not in edit mode)
  useEffect(() => {
    const fetchNextOrderNumber = async () => {
      // Only fetch if not in edit mode and order number is not set
      if (isEditMode || orderNumber) return;
      
      try {
        setOrderNumberLoading(true);
        const response = await fetch(`${API_URL}/api/inventory/store-orders/next-number`);
        if (!response.ok) {
          throw new Error("Failed to fetch next order number");
        }
        const data = await response.json();
        if (data.orderNumber) {
          setOrderNumber(data.orderNumber);
        }
      } catch (error) {
        console.error("Error fetching next order number:", error);
        // Fallback to default format if API fails
        setOrderNumber("SO-00001");
      } finally {
        setOrderNumberLoading(false);
      }
    };

    fetchNextOrderNumber();
  }, [isEditMode, API_URL, orderNumber]);

  // Set default store warehouse for store users (read-only for them)
  useEffect(() => {
    if (!isEditMode && !isAdmin && !isWarehouseUser && userWarehouse && !storeWarehouse) {
      setStoreWarehouse(userWarehouse);
      console.log(`📍 Auto-setting store warehouse to user's warehouse: "${userWarehouse}"`);
    }
  }, [isEditMode, isAdmin, isWarehouseUser, userWarehouse, storeWarehouse]);
  
  // Clear selected items when store warehouse changes (only in create mode)
  useEffect(() => {
    if (!isEditMode && storeWarehouse) {
      // Reset all table rows to clear selected items when warehouse changes
      setTableRows([{ 
        id: 1, 
        item: null, 
        itemId: null, 
        itemGroupId: null, 
        itemName: "", 
        itemSku: "", 
        currentStock: 0, 
        quantity: "" 
      }]);
    }
  }, [storeWarehouse, isEditMode]);
  
  // Load store order data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadStoreOrder = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/api/inventory/store-orders/${id}`);
          if (!response.ok) throw new Error("Failed to load store order");
          const data = await response.json();
          
          setOrderNumber(data.orderNumber || "");
          setDate(data.date ? new Date(data.date).toISOString().split('T')[0] : date);
          setReason(data.reason || "");
          setStoreWarehouse(data.storeWarehouse || "");
          
          if (data.items && Array.isArray(data.items)) {
            const rows = data.items.map((item, index) => ({
              id: index + 1,
              item: { _id: item.itemId, itemName: item.itemName },
              itemId: item.itemId,
              itemGroupId: item.itemGroupId,
              itemName: item.itemName,
              itemSku: item.itemSku || "",
              currentStock: item.currentStock || 0,
              quantity: item.quantity?.toString() || "",
            }));
            setTableRows(rows.length > 0 ? rows : [{ id: 1, item: null, itemId: null, itemGroupId: null, itemName: "", itemSku: "", currentStock: 0, quantity: "" }]);
          }
        } catch (error) {
          console.error("Error loading store order:", error);
          alert("Failed to load store order");
          navigate("/inventory/store-orders");
        } finally {
          setLoading(false);
        }
      };
      loadStoreOrder();
    }
  }, [isEditMode, id, API_URL, navigate, date]);
  
  // Handle item selection
  const handleItemSelect = (rowId, item) => {
    setTableRows(rows => {
      return rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            item: item,
            itemId: item.isFromGroup ? null : item._id,
            itemGroupId: item.itemGroupId || null,
            itemName: item.itemName || "",
            itemSku: item.sku || "",
          };
        }
        return row;
      });
    });
  };
  
  // Handle stock fetched (current stock in store warehouse)
  const handleStockFetched = (rowId) => (currentQuantity) => {
    console.log(`📦 Stock fetched for row ${rowId}: ${currentQuantity} units`);
    setTableRows(rows => {
      return rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            currentStock: currentQuantity,
          };
        }
        return row;
      });
    });
  };
  
  // Handle quantity change
  const handleQuantityChange = (rowId, value) => {
    setTableRows(rows =>
      rows.map(row => {
        if (row.id === rowId) {
          return { ...row, quantity: value };
        }
        return row;
      })
    );
  };
  
  // Handle add row
  const handleAddRow = () => {
    const newId = Math.max(...tableRows.map(r => r.id), 0) + 1;
    setTableRows([...tableRows, { 
      id: newId, 
      item: null, 
      itemId: null, 
      itemGroupId: null, 
      itemName: "", 
      itemSku: "", 
      currentStock: 0, 
      quantity: "" 
    }]);
  };
  
  // Handle remove row
  const handleRemoveRow = (rowId) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter(row => row.id !== rowId));
    }
  };
  
  // Handle save (supports status: "draft" or "pending")
  const handleSave = async (statusToSave = "pending") => {
    if (!date || !storeWarehouse) {
      alert("Please fill in all required fields");
      return;
    }
    
    if (tableRows.length === 0 || !tableRows.some(row => row.itemName && parseFloat(row.quantity) > 0)) {
      alert("Please add at least one item with quantity");
      return;
    }
    
    setSaving(true);
    try {
      const items = tableRows
        .filter(row => row.itemName && parseFloat(row.quantity) > 0)
        .map(row => ({
          itemId: row.itemId,
          itemGroupId: row.itemGroupId,
          itemName: row.itemName,
          itemSku: row.itemSku,
          quantity: parseFloat(row.quantity) || 0,
        }));
      
      const orderData = {
        orderNumber: orderNumber || undefined, // Backend will auto-generate if not provided
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        reason,
        storeWarehouse,
        items,
        status: statusToSave,
        userId,
        locCode: userLocCode || "",
      };
      
      const url = isEditMode 
        ? `${API_URL}/api/inventory/store-orders/${id}`
        : `${API_URL}/api/inventory/store-orders`;
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save store order");
      }
      
      const savedOrder = await response.json();
      const statusLabel = statusToSave === "draft" ? "Draft" : "Pending";
      alert(`Store order ${isEditMode ? "updated" : "created"} successfully as ${statusLabel}`);
      navigate("/inventory/store-orders");
    } catch (error) {
      console.error("Error saving store order:", error);
      alert(error.message || "Failed to save store order. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  
  // Enter key to save store order
  useEnterToSave(() => handleSave("pending"), saving);
  
  if (loading) {
    return (
      <div className={`transition-all duration-300 p-8 bg-[#f8f9fa] min-h-screen flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="text-gray-500 font-medium text-sm">Loading store order...</div>
      </div>
    );
  }
  
  return (
    <div className={`transition-all duration-300 min-h-screen bg-[#f8f9fa] ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
      <div className="p-6 md:p-8 space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isEditMode ? "Edit Store Order" : "New Store Order"}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Add items and quantities to request stock transfer from the main warehouse.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/inventory/store-orders")}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors bg-white shadow-sm cursor-pointer disabled:opacity-50"
            >
              Back to Store Orders
            </button>
            {!isEditMode && (
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={saving || !date || !storeWarehouse}
                className="px-4 py-2 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-white"
              >
                <span>+ Save as Draft</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave(isEditMode ? "pending" : "pending")}
              disabled={saving || !date || !storeWarehouse}
              className="px-5 py-2 bg-[#9333ea] hover:bg-[#7e22ce] active:bg-[#6b21a8] text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>{saving ? "Saving..." : isEditMode ? "Update Order" : "Submit Order (Pending)"}</span>
            </button>
          </div>
        </div>

        {/* Section 1: Store Order Information */}
        <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="text-purple-600 font-bold text-[11px] tracking-wider uppercase">
            STORE ORDER INFORMATION
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Order Number */}
            <div>
              <Label>Order Number</Label>
              <div className="relative">
                <input
                  type="text"
                  value={orderNumberLoading ? "Generating..." : orderNumber}
                  onChange={(e) => {
                    if (!isEditMode) return;
                    setOrderNumber(e.target.value);
                  }}
                  placeholder={orderNumberLoading ? "Generating..." : "Auto-generated"}
                  readOnly={!isEditMode}
                  disabled={orderNumberLoading}
                  className={`w-full h-10 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 pr-14 ${
                    !isEditMode ? "bg-gray-50/60" : ""
                  } ${orderNumberLoading ? "opacity-50" : ""}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                  Auto
                </span>
              </div>
            </div>

            {/* Date */}
            <div>
              <Label required>Date</Label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
            </div>

            {/* Store Warehouse */}
            <div>
              <Label required>Store Warehouse</Label>
              <WarehouseDropdown
                value={storeWarehouse}
                onChange={(value) => setStoreWarehouse(value)}
                options={availableWarehouseOptions}
                placeholder="Select store warehouse"
                required
                disabled={isStoreUser}
              />
              {isStoreUser && (
                <p className="text-[11px] text-gray-400 mt-1">This is your assigned store (read-only)</p>
              )}
            </div>

            {/* Destination Warehouse */}
            <div>
              <Label>Destination Warehouse</Label>
              <input
                type="text"
                value="Warehouse"
                readOnly
                className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50/80 px-3.5 py-2 text-sm text-gray-600 cursor-not-allowed"
              />
              <p className="text-[11px] text-gray-400 mt-1">Orders are always requested from main Warehouse</p>
            </div>

            {/* Reason */}
            <div className="md:col-span-2 lg:col-span-4">
              <Label>Reason</Label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason for this order..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Requested Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-purple-600 font-bold text-[11px] tracking-wider uppercase">
              REQUESTED ITEMS
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {tableRows.length} item{tableRows.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#18181b] text-white text-xs font-bold uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4 text-left border-r border-zinc-700/60 min-w-[280px]">
                    ITEM DETAILS
                  </th>
                  <th className="py-3.5 px-4 text-center border-r border-zinc-700/60 w-48">
                    CURRENT STORE STOCK
                  </th>
                  <th className="py-3.5 px-4 text-center border-r border-zinc-700/60 w-48">
                    QUANTITY REQUESTED
                  </th>
                  <th className="py-3.5 px-4 text-center w-20">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700 bg-white">
                {tableRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Item Details */}
                    <td className="py-3 px-4 border-r border-gray-200 align-top">
                      <ItemDropdown
                        rowId={row.id}
                        value={row.item}
                        onChange={(item) => handleItemSelect(row.id, item)}
                        storeWarehouse={storeWarehouse}
                        onStockFetched={handleStockFetched(row.id)}
                        isStoreUser={isStoreUser}
                        userWarehouse={userWarehouse}
                      />
                    </td>

                    {/* Current Stock */}
                    <td className="py-3 px-4 border-r border-gray-200 text-center align-top">
                      <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                        {Math.round(row.currentStock || 0)} Units
                      </div>
                    </td>

                    {/* Quantity Requested */}
                    <td className="py-3 px-4 border-r border-gray-200 align-top">
                      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 focus-within:ring-1 focus-within:ring-purple-600 focus-within:border-purple-600">
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                          placeholder="0"
                          min="0"
                          step="1"
                          className="w-full border-0 text-right text-sm font-semibold text-gray-900 focus:outline-none focus:ring-0"
                        />
                        <span className="text-xs text-gray-400 font-medium">Units</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center align-top">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row Bar */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-4 py-2 text-sm font-semibold text-[#9333ea] hover:bg-purple-50 border border-dashed border-[#9333ea] rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus size={16} />
              <span>Add Row</span>
            </button>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/inventory/store-orders")}
            disabled={saving}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          {!isEditMode && (
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={saving || !date || !storeWarehouse}
              className="px-5 py-2.5 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-white"
            >
              <span>+ Save as Draft</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave(isEditMode ? "pending" : "pending")}
            disabled={saving || !date || !storeWarehouse}
            className="px-6 py-2.5 bg-[#9333ea] hover:bg-[#7e22ce] active:bg-[#6b21a8] text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? "Saving..." : isEditMode ? "Update Order" : "Submit Order (Pending)"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreOrderCreate;

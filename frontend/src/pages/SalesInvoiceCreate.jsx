import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search, Image as ImageIcon, ChevronDown, X, Settings, Pencil, Check, Plus, HelpCircle, ChevronUp, MessageCircle, ArrowLeft, Calendar } from "lucide-react";
import Head from "../components/Head";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";

// Utility function to round to 2 decimal places without floating-point errors
// This fixes issues like 9999.99 showing as 9999.989999 or 100.01 instead of 100.00
const round2 = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 0;
  // Use Number.EPSILON to handle floating-point precision
  return Math.round((parseFloat(num) + Number.EPSILON) * 100) / 100;
};

// Keyboard shortcut hook
const useKeyboardShortcut = (key, ctrlKey, callback) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === key.toLowerCase() && e.ctrlKey === ctrlKey) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, ctrlKey, callback]);
};

// ItemDropdown Component - filters items by warehouse
const ItemDropdown = ({ rowId, value, onChange, warehouse, onNewItem, isStoreUser = false }) => {
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  // Filter items by warehouse stock
  const filterItemsByWarehouse = (itemsList, targetWarehouse) => {
    if (!targetWarehouse) return itemsList;
    
    const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
    
    // If "Warehouse" is selected (main warehouse view), show ALL items - NO FILTERING
    // This shows combined stock from all warehouses
    if (targetWarehouseLower === "warehouse") {
      console.log("🏢 Warehouse selected - showing ALL items without filtering (combined stock)");
      return itemsList; // Return all items without any filtering
    }
    
    // For specific branches/stores, show items from that branch (including out of stock)
    return itemsList.filter(item => {
      if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) {
        return false;
      }
      
      return item.warehouseStocks.some(ws => {
        if (!ws.warehouse) return false;
        const stockWarehouseRaw = (ws.warehouse || "").toString().trim();
        const stockWarehouse = stockWarehouseRaw.toLowerCase().trim();
        
        // For store users - NEVER show warehouse stock (confidential)
        if (isStoreUser && (stockWarehouse === "warehouse" || stockWarehouse.includes("warehouse"))) {
          return false;
        }
        
        // For specific branches, show items from that exact branch (not warehouse)
        // Check exact match first
        if (stockWarehouse === targetWarehouseLower) {
          return true;
        }
        
        // Special handling for Trivandrum variations - be more aggressive with matching
        const trivandrumVariations = ["trivandrum", "grooms trivandrum", "sg-trivandrum", "trivandrum branch", "grooms trivandum"];
        const stockIsTrivandrum = trivandrumVariations.some(v => stockWarehouse.includes(v.toLowerCase()));
        const targetIsTrivandrum = trivandrumVariations.some(v => targetWarehouseLower.includes(v.toLowerCase()));
        if (stockIsTrivandrum && targetIsTrivandrum) {
          return true;
        }
        
        // Check base name match (e.g., "kannur" matches "kannur branch")
        // Also normalize hyphens and dots for matching (e.g., "G-Edappally" matches "GEdappally")
        const normalizeForMatch = (str) => {
          return str.replace(/[-.\s]/g, "").toLowerCase();
        };
        
        const stockNormalized = normalizeForMatch(stockWarehouse);
        const targetNormalized = normalizeForMatch(targetWarehouseLower);
        
        // Check if normalized names match (handles G-Edappally vs GEdappally)
        if (stockNormalized === targetNormalized) {
          return true;
        }
        
        // Check base name match (e.g., "kannur" matches "kannur branch")
        const stockBase = stockWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
        const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
        
        if (stockBase && targetBase && stockBase === targetBase) {
          return true;
        }
        
        // Also check normalized base names
        const stockBaseNormalized = normalizeForMatch(stockBase);
        const targetBaseNormalized = normalizeForMatch(targetBase);
        
        if (stockBaseNormalized && targetBaseNormalized && stockBaseNormalized === targetBaseNormalized) {
          return true;
        }
        
        // Partial match - check if warehouse name contains target or vice versa
        if (stockWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(stockWarehouse)) {
          return true;
        }
        
        return false;
      });
    });
  };

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        // Fetch all items (no limit - get all products)
        const response = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
        if (!response.ok) throw new Error("Failed to fetch items");
        const data = await response.json();
        
        let itemsList = [];
        if (Array.isArray(data)) {
          itemsList = data;
        } else if (data.items && Array.isArray(data.items)) {
          itemsList = data.items;
        }
        
        console.log(`📦 Fetched ${itemsList.length} items from API`);
        
        // Filter active items
        const activeItems = itemsList.filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false");
        console.log(`✅ Active items: ${activeItems.length}`);
        
        // Filter by warehouse if warehouse is selected
        const filteredItems = warehouse ? filterItemsByWarehouse(activeItems, warehouse) : activeItems;
        console.log(`🏢 Items after warehouse filter (${warehouse || 'none'}): ${filteredItems.length}`);
        
        setItems(filteredItems);
      } catch (error) {
        console.error("Error fetching items:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
    
    // Listen for stock update events to refetch items
    const handleStockUpdate = (event) => {
      console.log("📦 Stock updated event received, refetching items...", event.detail);
      fetchItems();
    };
    
    window.addEventListener("stockUpdated", handleStockUpdate);
    
    return () => {
      window.removeEventListener("stockUpdated", handleStockUpdate);
    };
  }, [warehouse, API_URL]);

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

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 460;
    const dropdownHeight = 420;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    // Align to left edge of trigger, but clamp so it doesn't go off-screen right
    const left = Math.min(rect.left, window.innerWidth - dropdownWidth - 16);
    setDropdownPos({
      top: openUpward ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: Math.max(left, 8),
      width: dropdownWidth,
      openUpward,
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

  const filteredItems = items.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const itemName = (item.itemName || "").toLowerCase();
    const sku = (item.sku || "").toLowerCase();
    return itemName.includes(searchLower) || sku.includes(searchLower);
  });

  // Auto-select when only one item matches (for barcode scanning)
  useEffect(() => {
    // Only auto-select if:
    // 1. Dropdown is open
    // 2. There's a search term (user typed/scanned something)
    // 3. Exactly 1 filtered item
    // 4. Item is not already selected
    if (isOpen && searchTerm && searchTerm.length >= 3 && filteredItems.length === 1 && !selectedItem) {
      console.log(`🎯 INVOICE AUTO-SELECT: Only 1 item matches "${searchTerm}"`);
      console.log(`   Item:`, filteredItems[0]);
      
      // Auto-select after 300ms to ensure user finished typing
      const timer = setTimeout(() => {
        console.log(`✅ INVOICE AUTO-SELECTING single match:`, filteredItems[0]);
        handleSelectItem(filteredItems[0]);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchTerm, filteredItems, selectedItem]);

  const handleSelectItem = (item) => {
    onChange(item);
    setSelectedItem(item);
    setIsOpen(false);
    setSearchTerm("");
  };

  const getStockInWarehouse = (item, targetWarehouse, isStoreUserParam = false) => {
    if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || !targetWarehouse) return 0;
    
    // Use warehouse mapping to normalize target warehouse name
    const normalizedTargetWarehouse = mapLocNameToWarehouse(targetWarehouse);
    const targetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
    
    const matchingStock = item.warehouseStocks.find(ws => {
      if (!ws.warehouse) return false;
      
      // Normalize the stock warehouse name using the same mapping
      const normalizedStockWarehouse = mapLocNameToWarehouse(ws.warehouse.toString());
      const stockWarehouse = normalizedStockWarehouse.toLowerCase().trim();
      
      // Store users cannot see warehouse stock (confidential)
      if (isStoreUserParam && stockWarehouse === "warehouse") {
        return false;
      }
      
      return stockWarehouse === targetWarehouseLower || 
             stockWarehouse.includes(targetWarehouseLower) ||
             targetWarehouseLower.includes(stockWarehouse);
    });
    
    return matchingStock ? (parseFloat(matchingStock.stockOnHand) || 0) : 0;
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
      className={dropdownPos.openUpward ? "dropdown-animate-up" : "dropdown-animate"}
    >
      <div className="rounded-none shadow-2xl bg-white border border-[#e2e8f0] overflow-hidden" style={{ width: '100%' }}>
        <div className="flex items-center gap-2 border-b border-[#f1f5f9] px-3 py-2 bg-white">
          <Search size={14} className="text-[#9ca3af] shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="h-7 w-full border-none bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="py-2 max-h-[400px] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d3d3d3 #f5f5f5' }}>
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">
              {searchTerm ? "No items found" : warehouse ? `No items available in ${warehouse}` : "No items available"}
            </div>
          ) : (
            filteredItems.map((item) => {
              // Get available stock - use availableForSale directly (same as item details page)
              const getAvailableStock = (item, targetWarehouse, isStoreUserParam = false) => {
                if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || !targetWarehouse) return 0;
                
                // Use warehouse mapping to normalize target warehouse name
                const normalizedTargetWarehouse = mapLocNameToWarehouse(targetWarehouse);
                const targetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
                
                const matchingStock = item.warehouseStocks.find(ws => {
                  if (!ws.warehouse) return false;
                  
                  // Normalize the stock warehouse name using the same mapping
                  const normalizedStockWarehouse = mapLocNameToWarehouse(ws.warehouse.toString());
                  const stockWarehouse = normalizedStockWarehouse.toLowerCase().trim();
                  
                  if (isStoreUserParam && stockWarehouse === "warehouse") {
                    return false;
                  }
                  
                  // Check for exact match first, then partial matches
                  return stockWarehouse === targetWarehouseLower || 
                         stockWarehouse.includes(targetWarehouseLower) ||
                         targetWarehouseLower.includes(stockWarehouse);
                });
                
                if (!matchingStock) return 0;
                // Use availableForSale directly, fallback to stockOnHand if not available
                const availableForSale = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
                return Math.max(0, availableForSale);
              };

              // Get total available stock (all warehouses combined)
              const getTotalAvailableStock = (item) => {
                if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks)) return 0;
                return item.warehouseStocks.reduce((sum, ws) => {
                  // Use availableForSale directly, fallback to stockOnHand if not available
                  const availableForSale = parseFloat(ws.availableForSale) || parseFloat(ws.stockOnHand) || 0;
                  return sum + Math.max(0, availableForSale);
                }, 0);
              };
              
              // For "Warehouse", show combined stock from all warehouses
              const isWarehouse = warehouse && warehouse.toLowerCase().trim() === "warehouse";
              const availableStock = isWarehouse ? getTotalAvailableStock(item) : (warehouse ? getAvailableStock(item, warehouse, isStoreUser) : getTotalAvailableStock(item));
              const isOutOfStock = availableStock <= 0;
              const purchaseRate = typeof item.sellingPrice === 'number' ? item.sellingPrice : (typeof item.costPrice === 'number' ? item.costPrice : 0);
              const isSelected = (typeof value === 'object' && value?._id === item._id) || 
                                 (typeof value === 'string' && value === (item.itemName || item._id));
              
              // Get group name if item is from a group
              const groupName = item.groupName || item.group?.name || (item.itemGroupId ? "Group: undefined" : null);
              
              return (
                <div
                  key={item._id}
                  onClick={() => !isOutOfStock && handleSelectItem(item)}
                  className={`px-4 py-3 transition-colors border-b border-[#f1f5f9] last:border-0 ${
                    isOutOfStock ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                  } ${isSelected ? "bg-[#f0f4ff]" : "hover:bg-[#f8fafc]"}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${isSelected ? "text-[#4f46e5]" : "text-[#111827]"}`}>
                        {item.itemName || "Unnamed Item"}
                        {isOutOfStock && <span className="ml-2 text-xs font-normal text-[#ef4444]">(Out of Stock)</span>}
                      </div>
                      <div className="text-xs text-[#9ca3af] mt-0.5">
                        SKU: {item.sku || "N/A"} · Purchase Rate: ₹{purchaseRate.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-[#6b7280]">Stock on Hand</div>
                      <div className={`text-sm font-semibold ${isOutOfStock ? "text-[#ef4444]" : "text-[#16a34a]"}`}>
                        {availableStock.toFixed(2)} pcs
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {onNewItem && (
          <div className="border-t border-[#e2e8f0] px-3 py-2 bg-[#fafbff]">
            <div
              onClick={() => {
                onNewItem();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm text-[#374151] hover:bg-[#f3f4f6] rounded-none transition-colors"
            >
              <span>+</span>
              <span>New Item</span>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative w-full overflow-visible m-0 p-0">
        <input
          ref={buttonRef}
          type="text"
          value={selectedItem ? (selectedItem.itemName || "") : searchTerm}
          onChange={(e) => {
            const inputValue = e.target.value;
            setSearchTerm(inputValue);
            // Clear selection if user starts typing something different
            if (selectedItem && inputValue !== selectedItem.itemName) {
              setSelectedItem(null);
              onChange(null);
            }
            // Show dropdown when typing
            if (!isOpen && inputValue.length > 0) {
              setIsOpen(true);
              updatePos();
            } else if (inputValue.length === 0) {
              setIsOpen(false);
            }
          }}
          onFocus={() => {
            if (!isOpen) {
              setIsOpen(true);
              updatePos();
            }
          }}
          placeholder="Type of click to select an item"
          className="w-full h-9 rounded-none border border-[#e5e7eb] bg-white px-2.5 text-xs text-[#111827] placeholder:text-[#9ca3af] focus:border-[#8b5cf6] focus:outline-none transition-colors"
        />
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// Extract size from item name as fallback (e.g. "Test Group - Black/32" → "32")
const extractSizeFromName = (itemName) => {
  if (!itemName) return "";
  // Match the last segment after "/" which is typically the size
  const match = itemName.match(/\/([^/]+)$/);
  return match ? match[1].trim() : "";
};

const blankLineItem = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  item: "",
  itemData: null,
  size: "",
  quantity: 1,
  remarks: "",
  rate: 0,
  tax: "",
  amount: 0,
  baseAmount: 0,
  discountedAmount: 0,
  cgstAmount: 0,
  sgstAmount: 0,
  igstAmount: 0,
  lineTaxTotal: 0,
  lineTotal: 0,
  taxPercent: 0,
  cgstPercent: 0,
  sgstPercent: 0,
  igstPercent: 0,
  isInterState: false,
});

// Improved TaxDropdown Component with better styling
const TaxDropdown = ({ rowId, value, onChange, taxOptions, nonTaxableOptions, onNewTax, ...props }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTax, setSelectedTax] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    if (value) {
      const tax = [...taxOptions, ...nonTaxableOptions].find((t) => t.id === value);
      setSelectedTax(tax);
    } else {
      setSelectedTax(null);
    }
  }, [value, taxOptions, nonTaxableOptions]);

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    setDropdownPos({
      top: openUpward ? rect.top - dropdownHeight - 6 : rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - 280),
      width: Math.max(rect.width, 260),
      openUpward,
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

  const filteredTaxOptions = taxOptions.filter((tax) =>
    tax.display.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTax = (taxId) => {
    onChange(taxId);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearTax = (e) => {
    e.stopPropagation();
    onChange("");
    setSelectedTax(null);
  };

  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: Math.max(dropdownPos.width, 260),
        zIndex: 999999,
      }}
      className={dropdownPos.openUpward ? "dropdown-animate-up" : "dropdown-animate"}
    >
      <div className="rounded-none shadow-2xl bg-white border border-[#e2e8f0] overflow-hidden">
        {/* Search */}
        <div className="flex items-center gap-2 border-b border-[#f1f5f9] px-3 py-2 bg-[#f8fafc]">
          <Search size={13} className="text-[#9ca3af] shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="flex-1 border-none bg-transparent text-xs text-[#111827] outline-none placeholder:text-[#9ca3af]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>

        <div className="max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {/* Non-Taxable */}
          {nonTaxableOptions.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] bg-[#f9fafb]">
                Non-Taxable
              </div>
              {nonTaxableOptions.map((option) => (
                <div key={option.id} onClick={() => handleSelectTax(option.id)}
                  className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                    value === option.id ? "bg-[#1e3a8a] text-white" : "text-[#374151] hover:bg-[#f3f4f6]"
                  }`}>
                  {option.name}
                </div>
              ))}
            </>
          )}

          {/* Tax Groups */}
          {filteredTaxOptions.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] bg-[#f9fafb]">
                Tax Groups
              </div>
              {filteredTaxOptions.map((tax) => (
                <div key={tax.id} onClick={() => handleSelectTax(tax.id)}
                  className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                    value === tax.id ? "bg-[#1e3a8a] text-white" : "text-[#374151] hover:bg-[#f3f4f6]"
                  }`}>
                  <span>{tax.display}</span>
                  {value === tax.id && <Check size={12} />}
                </div>
              ))}
            </>
          )}

          {filteredTaxOptions.length === 0 && nonTaxableOptions.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-[#9ca3af]">No taxes found</div>
          )}
        </div>

        {onNewTax && (
          <div onClick={() => { onNewTax(); setIsOpen(false); }}
            className="flex items-center gap-2 px-3 py-2 text-xs text-[#374151] hover:bg-[#f3f4f6] cursor-pointer border-t border-[#f3f4f6]">
            <Plus size={12} /> New Tax
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative w-full" ref={buttonRef}>
        <button
          type="button"
          onClick={toggleDropdown}
          className="w-full h-9 rounded-none border border-[#e5e7eb] bg-white px-2.5 text-xs text-[#111827] hover:border-[#8b5cf6] focus:outline-none flex items-center justify-between gap-1 transition-colors overflow-hidden"
        >
          <span className="truncate text-left flex-1 text-[#374151] min-w-0 block">
            {selectedTax ? selectedTax.display || selectedTax.name : <span className="text-[#9ca3af]">Select Tax</span>}
          </span>
          <ChevronDown size={14} className={`shrink-0 text-[#9ca3af] transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};


const SalesInvoiceCreate = () => {
  const isSidebarOpen = useSidebar();
  // Complete and corrected mapping from branch names to location codes
  const branchToLocCodeMap = {
    // Main office and special locations
    "Head Office": "759",
    "Warehouse": "858",
    // Main stores
    "Production": "101",
    "Office": "102",
    "HEAD OFFICE01": "759",
    
    // G. prefix stores (main branches) - dash, dot, and no-separator variations
    "G-Edappally": "702",
    "G.Edappally": "702",
    "GEdappally": "702",
    "GEdapally": "702",  // Single 'p' variation
    "G-Kottayam": "701",
    "G.Kottayam": "701",
    "GKottayam": "701",
    "G-Perumbavoor": "703",
    "G.Perumbavoor": "703",
    "GPerumbavoor": "703",
    "GPerumbavoorStore": "703",
    "G-Thrissur": "704",
    "G.Thrissur": "704",
    "GThrissur": "704",
    "G-Palakkad": "705",
    "G.Palakkad": "705",
    "GPalakkad": "705",
    "G-Chavakkad": "706",
    "G.Chavakkad": "706",
    "GChavakkad": "706",
    "G-Edappal": "707",
    "G.Edappal": "707",
    "GEdappal": "707",
    "G-Vadakara": "708",
    "G.Vadakara": "708",
    "GVadakara": "708",
    "G-Perinthalmanna": "709",
    "G.Perinthalmanna": "709",
    "GPerinthalmanna": "709",
    "G-Manjeri": "710",
    "G.Manjeri": "710",
    "GManjeri": "710",
    "G-Kottakkal": "711",
    "G.Kottakkal": "711",
    "GKottakkal": "711",
    "G-Calicut": "712",
    "G.Calicut": "712",
    "GCalicut": "712",
    "G-Kannur": "716",
    "G.Kannur": "716",
    "GKannur": "716",
    "G-Kalpetta": "717",
    "G.Kalpetta": "717",
    "GKalpetta": "717",
    
    // MG Road variations (all point to same store - unique keys only)
    "G-Mg Road": "718",
    "G.Mg Road": "718",
    "G-MG Road": "718",
    "GMG Road": "718",
    "GMg Road": "718",
    "MG Road": "718",
    "mg road": "718",
    "g.mg road": "718",
    "g.mg": "718",
    "SuitorGuy MG Road": "718",
    
    // SG prefix stores (Trivandrum variations)
    "SG-Trivandrum": "700",
    "SG.Trivandrum": "700",
    "sg.tvm": "700",
    "SG.tvm": "700",
    "sg-tvm": "700",
    "Grooms Trivandrum": "700",  // ✅ ADDED: Main Trivandrum store
    "Grooms Trivandum": "700",   // ✅ ADDED: Spelling variation
    "Trivandrum Branch": "700",  // ✅ ADDED: Branch variation
    "SG.Kottayam": "701",
    
    // Z. prefix stores (franchise/other branches)
    "Z-Edapally": "144",
    "Z-Edappal": "100",
    "Z-Perinthalmanna": "133",
    "Z-Kottakkal": "122",
    
    // Alternative names with "Branch" suffix
    "G-Kottayam Branch": "701",
    "G.Kottayam Branch": "701",
    "Kottayam Branch": "701",
    "Kottayam": "701",
    
    // All dropdown branch name variations
    "Edapally Branch": "702",
    "Chavakkad Branch": "706",
    "Edappal Branch": "707",
    "Kalpetta Branch": "717",
    "Kannur Branch": "716",
    "Kottakkal Branch": "711",
    "Manjery Branch": "710",
    "Manjeri Branch": "710",
    "Palakkad Branch": "705",
    "Perinthalmanna Branch": "709",
    "Perumbavoor Branch": "703",
    "Thrissur Branch": "704",
    "Vadakara Branch": "708",
    "Calicut": "712",
    "Calicut Branch": "712",
    "Z-Edapally1 Branch": "144",
    "Z-Edappal Branch": "100",
    "Z-Perinthalmanna Branch": "133",
    "Z-Kottakkal Branch": "122",
  };

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  // Keyboard shortcuts
  // Ctrl+O - Open new invoice
  const handleCtrlO = useCallback(() => {
    if (!isEditMode) {
      return;
    }
    navigate("/sales/invoices/new");
  }, [isEditMode, navigate]);

  useKeyboardShortcut("o", true, handleCtrlO);

  // Ctrl+I - Open invoice list
  const handleCtrlI = useCallback(() => {
    navigate("/sales/invoices");
  }, [navigate]);

  useKeyboardShortcut("i", true, handleCtrlI);

  // Ctrl+N - Create new invoice
  const handleCtrlN = useCallback(() => {
    if (!isEditMode) {
      return;
    }
    navigate("/sales/invoices/new");
  }, [isEditMode, navigate]);

  useKeyboardShortcut("n", true, handleCtrlN);
  
  // Function to get initial branch based on user's logged-in location
  const getInitialBranch = () => {
    try {
      const userStr = localStorage.getItem("rootfinuser");
      if (userStr) {
        const user = JSON.parse(userStr);
        
        // Admin users should not be locked to a branch — return Warehouse so they can pick freely
        if ((user?.power || "").toLowerCase() === "admin") {
          return "Warehouse";
        }
        
        const userLocCode = user?.locCode;
        if (userLocCode) {
          // Find the branch name that matches the user's location code
          for (const [branchName, locCode] of Object.entries(branchToLocCodeMap)) {
            if (locCode === userLocCode) {
              return branchName;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error getting initial branch from user location:", error);
    }
    
    return "Warehouse";
  };
  
  const [customer, setCustomer] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [branch, setBranch] = useState(getInitialBranch());
  const [invoiceNumber, setInvoiceNumber] = useState("INV-009193");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [salesperson, setSalesperson] = useState("");
  const [salesPersons, setSalesPersons] = useState([]);
  const [showSalesPersonModal, setShowSalesPersonModal] = useState(false);
  const [newSalesPerson, setNewSalesPerson] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
    phone: "",
    email: "",
  });
  const [loadingSalesPersons, setLoadingSalesPersons] = useState(false);
  const [userLocCode, setUserLocCode] = useState("");
  const [userStoreId, setUserStoreId] = useState("");
  const [subject, setSubject] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [category, setCategory] = useState("income");
  const [subCategory, setSubCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState([]); // Array to store multiple selected payment methods
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPaymentAmounts, setSplitPaymentAmounts] = useState({
    cash: "",
    bank: "",
    upi: "",
    rbl: ""
  });
  const [lineItems, setLineItems] = useState([blankLineItem()]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [tdsEnabled, setTdsEnabled] = useState(true);
  const [tax, setTax] = useState("");
  const [discount, setDiscount] = useState({ value: "0", type: "₹" });
  const [applyDiscountAfterTax, setApplyDiscountAfterTax] = useState(false);
  const [showDiscountSection, setShowDiscountSection] = useState(false);
  const [totalTaxAmount, setTotalTaxAmount] = useState("");
  const [tdsTcsType, setTdsTcsType] = useState("TDS"); // "TDS" or "TCS"
  const [tdsTcsTax, setTdsTcsTax] = useState("");
  const [adjustment, setAdjustment] = useState("0.00");
  const [showNewTaxModal, setShowNewTaxModal] = useState(false);
  const [newTax, setNewTax] = useState({
    name: "",
    rate: "",
    type: "",
  });
  const [taxOptions, setTaxOptions] = useState([
    { id: "gst0", name: "GST0", rate: 0, display: "GST0 [0%]" },
    { id: "gst5", name: "GST5", rate: 5, display: "GST5 [5%]" },
    { id: "gst12", name: "GST12", rate: 12, display: "GST12 [12%]" },
    { id: "gst18", name: "GST18", rate: 18, display: "GST18 [18%]" },
    { id: "gst28", name: "GST28", rate: 28, display: "GST28 [28%]" },
  ]);
  const [nonTaxableOptions] = useState([
    {
      id: "out-of-scope",
      name: "Out of Scope",
      description: "Supplies on which you don't charge any GST or include them in the returns.",
    },
    {
      id: "non-gst-supply",
      name: "Non-GST Supply",
      description: "Supplies which do not come under GST such as petroleum products and liquor.",
    },
  ]);
  const [tdsOptions] = useState([
    { id: "tds-commission", name: "Commission or Brokerage", rate: 5, display: "Commission or Brokerage [5%]" },
    { id: "tds-commission-reduced", name: "Commission or Brokerage (Reduced)", rate: 3.75, display: "Commission or Brokerage (Reduced) [3.75%]" },
    { id: "tds-dividend", name: "Dividend", rate: 10, display: "Dividend [10%]" },
    { id: "tds-dividend-reduced", name: "Dividend (Reduced)", rate: 7.5, display: "Dividend (Reduced) [7.5%]" },
    { id: "tds-other-interest", name: "Other Interest than securities", rate: 10, display: "Other Interest than securities [10%]" },
    { id: "tds-other-interest-reduced", name: "Other Interest than securities (Reduced)", rate: 7.5, display: "Other Interest than securities (Reduced) [7.5%]" },
    { id: "tds-contractors-others", name: "Payment of contractors for Others", rate: 2, display: "Payment of contractors for Others [2%]" },
    { id: "tds-contractors-others-reduced", name: "Payment of contractors for Others (Reduced)", rate: 1.5, display: "Payment of contractors for Others (Reduced) [1.5%]" },
    { id: "tds-contractors-huf", name: "Payment of contractors HUF/Indiv", rate: 1, display: "Payment of contractors HUF/Indiv [1%]" },
    { id: "tds-contractors-huf-reduced", name: "Payment of contractors HUF/Indiv (Reduced)", rate: 0.75, display: "Payment of contractors HUF/Indiv (Reduced) [0.75%]" },
    { id: "tds-professional-fees", name: "Professional Fees", rate: 10, display: "Professional Fees [10%]" },
    { id: "tds-professional-fees-reduced", name: "Professional Fees (Reduced)", rate: 7.5, display: "Professional Fees (Reduced) [7.5%]" },
    { id: "tds-rent", name: "Rent on land or furniture etc", rate: 10, display: "Rent on land or furniture etc [10%]" },
    { id: "tds-rent-reduced", name: "Rent on land or furniture etc (Reduced)", rate: 7.5, display: "Rent on land or furniture etc (Reduced) [7.5%]" },
    { id: "tds-technical-fees", name: "Technical Fees (2%)", rate: 2, display: "Technical Fees (2%) [2%]" },
  ]);
  const [customerNotes, setCustomerNotes] = useState("Thanks for your business.");
  const [isSaving, setIsSaving] = useState(false);
  const [showInvoiceSettingsModal, setShowInvoiceSettingsModal] = useState(false);
  const [invoiceSettings, setInvoiceSettings] = useState({
    autoGenerate: true,
    prefix: "INV-",
    nextNumber: "009647",
    restartYearly: false,
  });
  
  // Bulk Add Items states
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkScanInput, setBulkScanInput] = useState("");
  const [bulkScannedItems, setBulkScannedItems] = useState([]); // Array of {item, quantity, sku}
  const [bulkItems, setBulkItems] = useState([]); // All items for bulk add modal
  const [bulkItemsLoading, setBulkItemsLoading] = useState(false);
  const bulkScanInputRef = useRef(null);
  const bulkScanBufferRef = useRef("");
  const bulkScanTimeoutRef = useRef(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSearchTerm, setBulkSearchTerm] = useState("");
  const [bulkResults, setBulkResults] = useState([]);
  const [selectedBulkItems, setSelectedBulkItems] = useState([]);
  const [isScanning, setIsScanning] = useState(false); // Used for bulk item loading
  
  // Alert state for better UI alerts
  const [alert, setAlert] = useState(null); // {message, type: 'error'|'success'|'warning'}
  
  // Function to show better alerts
  const showStockAlert = (message, type = 'error') => {
    setAlert({ message, type });
    // Auto-dismiss after 6 seconds
    setTimeout(() => setAlert(null), 6000);
  };

  const controlBase =
    "w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#111827] hover:border-[#9ca3af] focus:border-[#9ca3af] focus:outline-none focus:ring-0 transition-all";
  const textareaBase = `${controlBase} resize-none`;
  const subtleControlBase =
    "rounded-xl border border-[#d4dbf4] bg-white px-3 py-2 text-sm text-[#0f172a] focus:border-[#9ca3af] focus:outline-none focus:ring-0";

  // Input component for consistent styling
  const Input = ({ placeholder = "", className = "", ...props }) => {
    const baseClasses = "w-full rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#9ca3af] focus:outline-none focus:ring-0 transition-colors px-3 py-2";
    return (
      <input
        {...props}
        className={`${baseClasses} ${className}`}
        placeholder={placeholder}
      />
    );
  };

  // Calculate GST for a single line item (similar to Bills.jsx)
  const calculateGSTLineItem = (item, discountConfig, allTaxOptions) => {
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    // Calculate total amount (inclusive of tax) using round2 to avoid floating-point errors
    const roundedTotalAmount = round2(quantity * rate);

    const extractTaxRate = (taxRateValue) => {
      if (!taxRateValue) return null;
      const taxRateStr = String(taxRateValue);
      const bracketMatch = taxRateStr.match(/\[(\d+(?:\.\d+)?)%?\]/);
      if (bracketMatch) {
        return parseFloat(bracketMatch[1]);
      }
      const numberMatch = taxRateStr.replace(/[^\d.]/g, '');
      const taxRate = parseFloat(numberMatch);
      return isNaN(taxRate) ? null : taxRate;
    };

    const selectedTax = allTaxOptions.find(t => t.id === item.tax);
    
    let taxPercent = 0;
    let cgstPercent = 0;
    let sgstPercent = 0;
    let igstPercent = 0;
    let isInterState = false;

    const itemData = item.itemData;
    let itemTaxRate = null;
    let itemIsInterState = false;

    if (itemData) {
      if (itemData.taxRateIntra) {
        itemTaxRate = extractTaxRate(itemData.taxRateIntra);
        itemIsInterState = false;
      } else if (itemData.taxRateInter) {
        itemTaxRate = extractTaxRate(itemData.taxRateInter);
        itemIsInterState = true;
      }
    }

    if (itemTaxRate !== null) {
      taxPercent = itemTaxRate;
      isInterState = itemIsInterState;
    } else if (selectedTax && selectedTax.rate !== undefined && selectedTax.rate > 0) {
      taxPercent = selectedTax.rate;
      isInterState = false;
    } else if (item.tax) {
      // Try to extract tax rate from tax string (e.g., "GST 5%" -> 5)
      const taxStr = String(item.tax);
      if (taxStr.includes("GST")) {
        const rateMatch = taxStr.match(/(\d+(?:\.\d+)?)/);
        if (rateMatch) {
          taxPercent = parseFloat(rateMatch[1]);
        }
      }
    }

    if (taxPercent > 0) {
      if (isInterState) {
        igstPercent = taxPercent;
      } else {
        cgstPercent = taxPercent / 2;
        sgstPercent = taxPercent / 2;
      }
    }

    // INCLUSIVE GST LOGIC (like Zoho Books)
    // The rate includes tax, so we need to extract the base amount
    let baseAmount = roundedTotalAmount;
    let discountedAmount = roundedTotalAmount;
    let lineTaxTotal = 0;
    
    if (taxPercent > 0) {
      // Calculate base amount from inclusive total
      // Formula: baseAmount = totalAmount / (1 + taxPercent/100)
      baseAmount = round2(roundedTotalAmount / (1 + taxPercent / 100));
      // IMPORTANT: Calculate tax as the difference to avoid rounding errors
      // This ensures baseAmount + lineTaxTotal = roundedTotalAmount exactly
      lineTaxTotal = round2(roundedTotalAmount - baseAmount);
    }

    // Apply discount if configured - REMOVED from line item level
    // Discount is applied at the total level in calculateTotals() to avoid double-discounting
    // discountedAmount stays equal to roundedTotalAmount here

    // Calculate individual tax amounts (CGST/SGST/IGST) from the total tax
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isInterState && igstPercent > 0) {
      igstAmount = lineTaxTotal;
    } else if (!isInterState && (cgstPercent > 0 || sgstPercent > 0)) {
      // Split the total tax evenly between CGST and SGST
      // Use floor for CGST and the remainder for SGST to ensure they add up exactly
      cgstAmount = round2(lineTaxTotal / 2);
      sgstAmount = round2(lineTaxTotal - cgstAmount);
    }

    // For inclusive GST, the line total is the discounted amount (which already includes tax)
    const lineTotal = discountedAmount;

    return {
      baseAmount: baseAmount.toFixed(2),
      discountedAmount: discountedAmount.toFixed(2),
      cgstAmount: cgstAmount.toFixed(2),
      sgstAmount: sgstAmount.toFixed(2),
      igstAmount: igstAmount.toFixed(2),
      lineTaxTotal: lineTaxTotal.toFixed(2),
      lineTotal: lineTotal.toFixed(2),
      taxPercent,
      cgstPercent,
      sgstPercent,
      igstPercent,
      isInterState,
    };
  };

  // Calculate totals with tax logic (similar to Bills.jsx)
  const calculateTotals = () => {
    const allTaxOptions = [...taxOptions, ...nonTaxableOptions];
    const discountConfig = {
      value: discount.value,
      type: discount.type,
      applyAfterTax: applyDiscountAfterTax,
    };

    // Recalculate all line items with current discount
    const recalculatedItems = lineItems.map(item => {
      const gstCalculation = calculateGSTLineItem(item, discountConfig, allTaxOptions);
      return {
        ...item,
        ...gstCalculation,
        baseAmount: round2(parseFloat(gstCalculation.baseAmount)),
        discountedAmount: round2(parseFloat(gstCalculation.discountedAmount)),
        cgstAmount: round2(parseFloat(gstCalculation.cgstAmount)),
        sgstAmount: round2(parseFloat(gstCalculation.sgstAmount)),
        igstAmount: round2(parseFloat(gstCalculation.igstAmount)),
        lineTaxTotal: round2(parseFloat(gstCalculation.lineTaxTotal)),
        lineTotal: round2(parseFloat(gstCalculation.lineTotal)),
        taxPercent: gstCalculation.taxPercent,
        cgstPercent: gstCalculation.cgstPercent,
        sgstPercent: gstCalculation.sgstPercent,
        igstPercent: gstCalculation.igstPercent,
        isInterState: gstCalculation.isInterState,
      };
    });

    // Calculate subtotal (for inclusive GST display, show the total amount including tax)
    // IMPORTANT: Calculate subTotal directly from lineTotal to avoid rounding errors
    // Don't use baseAmount + taxAmount as that can cause 4000.01 instead of 4000.00
    let subTotal = 0;
    let baseAmount = 0;
    let totalTaxAmount = 0;
    
    recalculatedItems.forEach(item => {
      // lineTotal is the original amount (qty × rate), which is already correct
      subTotal += round2(item.lineTotal || 0);
      baseAmount += round2(item.baseAmount || 0);
      totalTaxAmount += round2(item.lineTaxTotal || 0);
    });
    
    // Round final sums
    subTotal = round2(subTotal);
    baseAmount = round2(baseAmount);
    totalTaxAmount = round2(totalTaxAmount);

    // Calculate tax breakdown from recalculated items
    const taxMap = new Map();
    let calculatedTotalTax = 0;

    recalculatedItems.forEach((item) => {
      if (item.taxPercent && parseFloat(item.taxPercent) > 0) {
        const taxRate = parseFloat(item.taxPercent);
        const taxAmount = round2(item.lineTaxTotal || 0);
        calculatedTotalTax += taxAmount;

        if (item.isInterState && item.igstAmount > 0) {
          const key = `IGST${taxRate}`;
          if (taxMap.has(key)) {
            taxMap.get(key).amount += round2(item.igstAmount || 0);
          } else {
            taxMap.set(key, {
              type: 'IGST',
              rate: taxRate,
              amount: round2(item.igstAmount || 0),
            });
          }
        } else {
          const cgstAmt = round2(item.cgstAmount || 0);
          const sgstAmt = round2(item.sgstAmount || 0);
          const totalGstAmount = round2(cgstAmt + sgstAmt);
          if (totalGstAmount > 0) {
            const key = `GST${taxRate}`;
            if (taxMap.has(key)) {
              taxMap.get(key).amount += totalGstAmount;
            } else {
              taxMap.set(key, {
                type: 'GST',
                rate: taxRate,
                amount: totalGstAmount,
              });
            }
          }
        }
      }
    });

    const taxBreakdown = Array.from(taxMap.values()).sort((a, b) => {
      const typeOrder = { 'GST': 0, 'IGST': 1 };
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.rate - b.rate;
    });

    const roundedCalculatedTotalTax = round2(calculatedTotalTax);
    const totalTax = totalTaxAmount > 0 ? totalTaxAmount : roundedCalculatedTotalTax;

    // Calculate discount
    // For rounding adjustment use-case (Zoho-like):
    //  - user enters -0.52 => total should decrease by 0.52
    //  - user enters +0.48 => total should increase by 0.48
    // Our finalTotal formula is: finalTotal = subTotal - discountAmount - tds + adjustment
    // So we convert the user-entered delta (d) into discountAmount = -d.
    let discountAmount = 0;
    const parsedDiscountValue = parseFloat(discount.value);
    if (discount.value !== "" && !Number.isNaN(parsedDiscountValue) && parsedDiscountValue !== 0) {
      if (discount.type === "%") {
        // Apply % discount on the subTotal (inclusive of tax)
        discountAmount = round2(subTotal * parsedDiscountValue / 100);
      } else {
        // Flat ₹ discount — subtract directly
        discountAmount = round2(parsedDiscountValue);
      }
    }

    // Calculate TDS/TCS (Zoho calculates TDS on the base amount, not the inclusive total)
    let tdsTcsAmount = 0;
    if (tdsTcsTax) {
      const allTdsTcsOptions = [...taxOptions, ...tdsOptions];
      const selectedTdsTcsTax = allTdsTcsOptions.find(t => t.id === tdsTcsTax);
      if (selectedTdsTcsTax && selectedTdsTcsTax.rate !== undefined) {
        tdsTcsAmount = round2(baseAmount * selectedTdsTcsTax.rate / 100);
      }
    }

    const adjustmentAmount = round2(parseFloat(adjustment) || 0);

    // Calculate final total (for inclusive GST, tax is already in subTotal)
    // finalTotal = subTotal (which includes tax) - discount - TDS/TCS + adjustment
    const finalTotal = round2(subTotal - discountAmount - tdsTcsAmount + adjustmentAmount);

    return {
      subTotal: subTotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxBreakdown,
      totalTax: totalTax,
      calculatedTotalTax: roundedCalculatedTotalTax,
      tdsTcsAmount: tdsTcsAmount.toFixed(2),
      adjustmentAmount: adjustmentAmount.toFixed(2),
      finalTotal: finalTotal.toFixed(2)
    };
  };

  const totals = calculateTotals();

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

  // Check if user is admin or store user
  const getStoreAccessControl = () => {
    const user = getUserInfo();
    if (!user) return { isAdmin: false, userStore: null, isStoreUser: false };

    // Check if user is admin (has admin power or no specific store assigned)
    const isAdmin = (user.power || "").toLowerCase() === "admin" || (user.power || "").toLowerCase() === "superadmin";
    
    // If user has a storeName, they are a store user
    const isStoreUser = !!user.storeName && !isAdmin;
    
    return {
      isAdmin,
      userStore: user.storeName || null,
      isStoreUser,
      user
    };
  };

  // Initialize store access control
  const storeAccess = getStoreAccessControl();

  // Set branch and warehouse automatically for store users
  useEffect(() => {
    if (storeAccess.isStoreUser && storeAccess.userStore) {
      setBranch(storeAccess.userStore);
      // Map the store name to the correct warehouse name
      const mappedWarehouse = mapLocNameToWarehouse(storeAccess.userStore);
      setWarehouse(mappedWarehouse);
      console.log(`🏪 Store user warehouse mapping: "${storeAccess.userStore}" → "${mappedWarehouse}"`);
    }
  }, [storeAccess.isStoreUser, storeAccess.userStore]);

  // Ensure warehouse is always set when branch changes
  useEffect(() => {
    if (branch && !storeAccess.isStoreUser) {
      const mappedWarehouse = mapLocNameToWarehouse(branch);
      if (mappedWarehouse && mappedWarehouse !== warehouse) {
        setWarehouse(mappedWarehouse);
        console.log(`🏢 Branch changed: "${branch}" → warehouse: "${mappedWarehouse}"`);
      }
    }
  }, [branch, storeAccess.isStoreUser]);

  // Generate next invoice number
  const generateNextInvoiceNumber = async () => {
    try {
      const user = getUserInfo();
      if (!user || !user.email) return;

      const response = await fetch(`${API_URL}/api/sales/invoices/next-number`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.email || user.username || "",
          locCode: (() => {
            const branchLocCode = getLocCodeForBranch(branch);
            console.log(`🔢 Next Invoice Number - Branch: "${branch}" → LocCode: "${branchLocCode}"`);
            return branchLocCode || user.locCode || userLocCode || "";
          })(),
          prefix: invoiceSettings.prefix,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.nextInvoiceNumber) {
          setInvoiceNumber(data.nextInvoiceNumber);
          // Update next number in settings
          const numberPart = data.nextInvoiceNumber.replace(invoiceSettings.prefix, "");
          const nextNum = parseInt(numberPart, 10);
          if (!isNaN(nextNum)) {
            setInvoiceSettings(prev => ({
              ...prev,
              nextNumber: (nextNum + 1).toString().padStart(6, '0')
            }));
          }
        }
      }
    } catch (error) {
      console.error("Error generating invoice number:", error);
    }
  };

  // Handle invoice settings save
  const handleSaveInvoiceSettings = () => {
    if (invoiceSettings.autoGenerate) {
      const newInvoiceNumber = `${invoiceSettings.prefix}${invoiceSettings.nextNumber}`;
      setInvoiceNumber(newInvoiceNumber);
    }
    setShowInvoiceSettingsModal(false);
  };


  // Load all available items for bulk modal
  const loadAllBulkItems = async () => {
    setIsScanning(true);
    setBulkResults([]); // Clear previous results
    try {
      console.log("🔄 Loading bulk items...", { warehouse, API_URL });
      const response = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch items: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      let items = Array.isArray(data) ? data : (data.items || []);
      console.log("📦 Fetched items:", items.length);
      
      // Filter active items
      const activeItems = items.filter(item => item?.isActive !== false && String(item?.isActive).toLowerCase() !== "false");
      console.log("✅ Active items:", activeItems.length);
      
      // Filter items with stock > 0
      const itemsWithStock = activeItems.filter(item => {
        const totalStock = item.warehouseStocks?.reduce((sum, ws) => sum + (parseFloat(ws.stockOnHand) || 0), 0) || 0;
        return totalStock > 0;
      });
      console.log("📦 Items with stock:", itemsWithStock.length);
      
      // For bulk add, show items with stock > 0
      // Sort by warehouse match (show matching warehouse items first)
      let warehouseFilteredItems = itemsWithStock;
      
      if (warehouse && itemsWithStock.length > 0) {
        const targetWarehouseLower = warehouse.toLowerCase().trim();
        warehouseFilteredItems = itemsWithStock.sort((a, b) => {
          const aHasMatch = a.warehouseStocks?.some(ws => {
            if (!ws?.warehouse) return false;
            const stockWarehouse = ws.warehouse.toString().toLowerCase().trim();
            return stockWarehouse === targetWarehouseLower || 
                   stockWarehouse.includes(targetWarehouseLower) || 
                   targetWarehouseLower.includes(stockWarehouse);
          }) || false;
          
          const bHasMatch = b.warehouseStocks?.some(ws => {
            if (!ws?.warehouse) return false;
            const stockWarehouse = ws.warehouse.toString().toLowerCase().trim();
            return stockWarehouse === targetWarehouseLower || 
                   stockWarehouse.includes(targetWarehouseLower) || 
                   targetWarehouseLower.includes(stockWarehouse);
          }) || false;
          
          // Items matching warehouse come first
          if (aHasMatch && !bHasMatch) return -1;
          if (!aHasMatch && bHasMatch) return 1;
          return 0;
        });
      }
      
      console.log("🏪 Final items to display:", warehouseFilteredItems.length);
      setBulkResults(warehouseFilteredItems);
    } catch (error) {
      console.error("❌ Error loading bulk items:", error);
      showStockAlert(`Failed to load items: ${error.message}. Please try again.`, 'error');
      setBulkResults([]);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle bulk item search
  const handleBulkSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      // If search is cleared, reload all items
      loadAllBulkItems();
      return;
    }
    
    setIsScanning(true);
    try {
      const response = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
      if (!response.ok) throw new Error("Failed to fetch items");
      
      const data = await response.json();
      let items = Array.isArray(data) ? data : (data.items || []);
      
      // Filter active items and match search term
      const filteredItems = items.filter(item => {
        if (item?.isActive === false || String(item?.isActive).toLowerCase() === "false") return false;
        const searchLower = searchTerm.toLowerCase();
        return (
          (item.sku && item.sku.toLowerCase().includes(searchLower)) ||
          (item.itemName && item.itemName.toLowerCase().includes(searchLower)) ||
          (item.barcode && item.barcode.toLowerCase().includes(searchLower))
        );
      });
      
      // Filter items with stock > 0
      const itemsWithStock = filteredItems.filter(item => {
        const totalStock = item.warehouseStocks?.reduce((sum, ws) => sum + (parseFloat(ws.stockOnHand) || 0), 0) || 0;
        return totalStock > 0;
      });
      
      // For bulk add, show items with stock > 0
      // Optional: Sort by warehouse match if warehouse is selected
      let warehouseFilteredItems = itemsWithStock;
      if (warehouse && itemsWithStock.length > 0) {
        const targetWarehouseLower = warehouse.toLowerCase().trim();
        warehouseFilteredItems = itemsWithStock.sort((a, b) => {
          const aHasMatch = a.warehouseStocks?.some(ws => {
            if (!ws?.warehouse) return false;
            const stockWarehouse = ws.warehouse.toString().toLowerCase().trim();
            return stockWarehouse === targetWarehouseLower || 
                   stockWarehouse.includes(targetWarehouseLower) || 
                   targetWarehouseLower.includes(stockWarehouse);
          }) || false;
          
          const bHasMatch = b.warehouseStocks?.some(ws => {
            if (!ws?.warehouse) return false;
            const stockWarehouse = ws.warehouse.toString().toLowerCase().trim();
            return stockWarehouse === targetWarehouseLower || 
                   stockWarehouse.includes(targetWarehouseLower) || 
                   targetWarehouseLower.includes(stockWarehouse);
          }) || false;
          
          if (aHasMatch && !bHasMatch) return -1;
          if (!aHasMatch && bHasMatch) return 1;
          return 0;
        });
      }
      
      setBulkResults(warehouseFilteredItems);
    } catch (error) {
      console.error("Error searching bulk items:", error);
      setBulkResults([]);
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle item selection in bulk modal
  const toggleBulkItemSelection = (item) => {
    setSelectedBulkItems(prev => {
      const existingIndex = prev.findIndex(selected => selected._id === item._id);
      if (existingIndex >= 0) {
        // Remove item
        return prev.filter(selected => selected._id !== item._id);
      } else {
        // Add item with default quantity 1
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  // Add or update item quantity directly from left panel (Zoho Books style)
  const addOrUpdateBulkItemQuantity = (item, quantity) => {
    const qty = Math.max(0, parseFloat(quantity) || 0);
    if (qty <= 0) {
      // Remove item if quantity is 0
      setSelectedBulkItems(prev => prev.filter(selected => selected._id !== item._id));
    } else {
      setSelectedBulkItems(prev => {
        const existingIndex = prev.findIndex(selected => selected._id === item._id);
        if (existingIndex >= 0) {
          // Update existing item quantity
          return prev.map(selected =>
            selected._id === item._id ? { ...selected, quantity: qty } : selected
          );
        } else {
          // Add new item with quantity
          return [...prev, { ...item, quantity: qty }];
        }
      });
    }
  };

  // Update quantity for selected bulk item (right panel)
  const updateBulkItemQuantity = (itemId, quantity) => {
    setSelectedBulkItems(prev =>
      prev.map(item =>
        item._id === itemId ? { ...item, quantity: Math.max(1, parseInt(quantity) || 1) } : item
      )
    );
  };

  // Get quantity for an item from selected items
  const getBulkItemQuantity = (itemId) => {
    const selected = selectedBulkItems.find(item => item._id === itemId);
    return selected ? selected.quantity : 0;
  };

  // Add all selected bulk items to invoice
  const handleAddBulkItems = () => {
    if (selectedBulkItems.length === 0) {
      showStockAlert("Please select at least one item", 'error');
      return;
    }

    const allTaxOptions = [...taxOptions, ...nonTaxableOptions];
    const discountConfig = {
      value: discount.value,
      type: discount.type,
      applyAfterTax: applyDiscountAfterTax,
    };

    const newLineItems = selectedBulkItems.map(selectedItem => {
      const newLineItem = {
        ...blankLineItem(),
        item: selectedItem.itemName || "",
        itemData: selectedItem,
        size: selectedItem.size || extractSizeFromName(selectedItem.itemName),
        rate: typeof selectedItem.sellingPrice === 'number' ? selectedItem.sellingPrice : (typeof selectedItem.costPrice === 'number' ? selectedItem.costPrice : 0),
        quantity: selectedItem.quantity,
      };
      
      const gstCalculation = calculateGSTLineItem(newLineItem, discountConfig, allTaxOptions);
      return {
        ...newLineItem,
        ...gstCalculation,
        baseAmount: parseFloat(gstCalculation.baseAmount),
        discountedAmount: parseFloat(gstCalculation.discountedAmount),
        cgstAmount: parseFloat(gstCalculation.cgstAmount),
        sgstAmount: parseFloat(gstCalculation.sgstAmount),
        igstAmount: parseFloat(gstCalculation.igstAmount),
        lineTaxTotal: parseFloat(gstCalculation.lineTaxTotal),
        lineTotal: parseFloat(gstCalculation.lineTotal),
        amount: parseFloat(gstCalculation.baseAmount),
        taxPercent: gstCalculation.taxPercent,
        cgstPercent: gstCalculation.cgstPercent,
        sgstPercent: gstCalculation.sgstPercent,
        igstPercent: gstCalculation.igstPercent,
        isInterState: gstCalculation.isInterState,
      };
    });

    setLineItems(prev => [...prev, ...newLineItems]);
    setShowBulkModal(false);
    setBulkSearchTerm("");
    setBulkResults([]);
    setSelectedBulkItems([]);
  };

  // Handle saving invoice
  const handleSaveInvoice = async (status = "sent") => {
    // Validate required fields
    if (!customer.trim()) {
      showStockAlert("Please enter a customer name", 'error');
      return;
    }

    if (!invoiceNumber.trim()) {
      showStockAlert("Please enter an invoice number", 'error');
      return;
    }

    // Validate sales person is required
    if (!salesperson.trim()) {
      showStockAlert("Please select a sales person", 'error');
      return;
    }


    // Validate that at least one item is added
    if (!lineItems || lineItems.length === 0) {
      showStockAlert("Please add at least one item to the invoice", 'error');
      return;
    }

    // Validate payment method is selected
    if (!isSplitPayment && (!paymentMethod || paymentMethod.length === 0)) {
      showStockAlert("Please select a payment method", 'error');
      return;
    }

    // Validate that all line items have required data
    const invalidItems = lineItems.filter(item => !item.item || !item.quantity || parseFloat(item.quantity) <= 0);
    if (invalidItems.length > 0) {
      showStockAlert("Please ensure all items have valid names and quantities greater than 0", 'error');
      return;
    }

    const user = getUserInfo();
    if (!user || !user.email) {
      showStockAlert("User information not found. Please log in again.", 'error');
      return;
    }

    // Validate stock for each line item
    const stockValidationErrors = [];
    for (const item of lineItems) {
      if (!item.item || !item.quantity) continue;
      
      const itemData = item.itemData;
      if (!itemData) continue;
      
      // Calculate available stock for this item
      let availableStock = 0;
      if (warehouse && itemData.warehouseStocks && Array.isArray(itemData.warehouseStocks)) {
        const targetWarehouseLower = warehouse.toLowerCase().trim();
        
        if (targetWarehouseLower === "warehouse") {
          // Show total stock from all warehouses
          availableStock = itemData.warehouseStocks.reduce((sum, ws) => {
            const stock = parseFloat(ws.availableForSale) || parseFloat(ws.stockOnHand) || 0;
            return sum + Math.max(0, stock);
          }, 0);
        } else {
          // For specific warehouse, find matching warehouse stock
          const normalizedTargetWarehouse = mapLocNameToWarehouse(warehouse);
          const normalizedTargetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
          
          const matchingStock = itemData.warehouseStocks.find(ws => {
            if (!ws.warehouse) return false;
            const normalizedStockWarehouse = mapLocNameToWarehouse(ws.warehouse.toString());
            const stockWarehouse = normalizedStockWarehouse.toLowerCase().trim();
            
            return stockWarehouse === normalizedTargetWarehouseLower || 
                   stockWarehouse.includes(normalizedTargetWarehouseLower) ||
                   normalizedTargetWarehouseLower.includes(stockWarehouse);
          });
          
          if (matchingStock) {
            availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
          }
        }
      }
      
      const quantity = parseFloat(item.quantity) || 0;
      if (quantity > availableStock) {
        stockValidationErrors.push({
          itemName: itemData.itemName || item.item,
          quantity: quantity,
          available: availableStock
        });
      }
    }
    
    // If there are stock validation errors, show them and don't save
    if (stockValidationErrors.length > 0) {
      const errorMessage = stockValidationErrors.map(err => 
        `${err.itemName}: Trying to add ${err.quantity} pcs but only ${err.available.toFixed(2)} pcs available`
      ).join('\n');
      
      showStockAlert(errorMessage, 'error');
      setIsSaving(false);
      return;
    }

    setIsSaving(true);

    try {
      // Debug logging before sending
      console.log("=== FRONTEND FORM DEBUG ===");
      console.log("Category selected:", category);
      console.log("SubCategory selected:", subCategory);
      console.log("=== END FRONTEND DEBUG ===");

      const invoiceData = {
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        customer: customer.trim(),
        customerPhone: customerPhone.trim() || "", // Ensure it's always sent
        branch,
        orderNumber: "", // Removed field, keeping for backward compatibility
        terms: "Due on Receipt", // Default value, keeping for backward compatibility
        salesperson: salesperson.trim(),
        subject: subject.trim(),
        warehouse,
        category,
        subCategory,
        remark: "", // Removed from UI but kept for backend compatibility
        paymentMethod: Array.isArray(paymentMethod) ? paymentMethod.join(", ") : paymentMethod, // Convert array to comma-separated string for backend
        isSplitPayment,
        splitPaymentAmounts: isSplitPayment ? splitPaymentAmounts : null,
        lineItems: lineItems.map(item => ({
          item: typeof item.item === 'string' ? item.item : (item.item?.itemName || item.itemData?.itemName || item.itemDetails || ""),
          itemData: item.itemData ? {
            ...item.itemData,
            _id: item.itemData._id,
            itemName: item.itemData.itemName || item.itemData.name || item.item,
            itemGroupId: item.itemData.itemGroupId || null,
            sku: item.itemData.sku || "",
            isFromGroup: item.itemData.isFromGroup || false,
          } : null,
          itemGroupId: item.itemData?.itemGroupId || null,
          itemSku: item.itemData?.sku || "",
          size: item.size || "",
          quantity: parseFloat(item.quantity) || 0,
          rate: parseFloat(item.rate) || 0,
          tax: item.tax || "",
          amount: parseFloat(item.amount) || 0,
        })),
        customerNotes,
        termsAndConditions: "", // Removed field, keeping for backward compatibility
        discount,
        applyDiscountAfterTax,
        tdsTcsType,
        tdsTcsTax,
        adjustment,
        subTotal: parseFloat(totals.subTotal) || 0,
        discountAmount: parseFloat(totals.discountAmount) || 0,
        totalTax: parseFloat(totals.totalTax) || 0,
        tdsTcsAmount: parseFloat(totals.tdsTcsAmount) || 0,
        adjustmentAmount: parseFloat(totals.adjustmentAmount) || 0,
        finalTotal: parseFloat(totals.finalTotal) || 0,
        status,
        userId: user.email || user.username || "",
        locCode: (() => {
          const branchLocCode = getLocCodeForBranch(branch);
          console.log(`🏢 Invoice Creation - Branch: "${branch}" → LocCode: "${branchLocCode}"`);
          return branchLocCode || user.locCode || userLocCode || "";
        })(),
      };

      const url = isEditMode ? `${API_URL}/api/sales/invoices/${id}` : `${API_URL}/api/sales/invoices`;
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
      });

      console.log("=== REQUEST SENT ===");
      console.log("Invoice data sent to backend:", JSON.stringify({
        category: invoiceData.category,
        warehouse: invoiceData.warehouse,
        branch: invoiceData.branch,
        lineItems: invoiceData.lineItems?.length || 0,
        lineItemDetails: invoiceData.lineItems?.map(li => ({
          item: li.item,
          itemGroupId: li.itemGroupId,
          sku: li.itemSku,
          quantity: li.quantity
        }))
      }, null, 2));
      console.log("=== END REQUEST ===");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save invoice");
      }

      // Success - automatically send WhatsApp message
      if (customerPhone.trim()) {
        console.log("📱 Automatically sending WhatsApp message...");
        sendWhatsAppMessage(invoiceData);
      } else {
        console.log("⚠️ No customer phone provided, skipping WhatsApp");
      }

      // Dispatch stock update event to refresh item pages
      console.log("📦 Dispatching stock update event...");
      const stockUpdateEvent = new CustomEvent("stockUpdated", {
        detail: {
          updatedItems: invoiceData.lineItems.map(item => ({
            itemId: item.itemData?._id,
            itemGroupId: item.itemData?.itemGroupId,
            itemName: item.itemData?.itemName || item.item,
            itemSku: item.itemData?.sku,
            warehouse: invoiceData.warehouse,
            quantityChanged: item.quantity,
            operation: "sale" // Indicates stock was reduced due to sale
          })),
          warehouse: invoiceData.warehouse,
          operation: "invoice_created"
        }
      });
      window.dispatchEvent(stockUpdateEvent);

      // Navigate appropriately
      if (isEditMode) {
        navigate(`/sales/invoices/${id}`);
      } else {
        navigate("/sales/invoices");
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      showStockAlert(error.message || "Failed to save invoice. Please try again.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to send WhatsApp message automatically
  const sendWhatsAppMessage = (invoiceData) => {
    const phone = invoiceData.customerPhone || "";
    
    if (!phone) {
      console.log("❌ No customer phone number available for WhatsApp");
      return;
    }
  
    // Clean and format phone number - remove all non-digit characters
    const cleanedPhone = phone.replace(/\D/g, '');
    
    // Ensure phone number has country code (India: 91)
    let formattedPhone = cleanedPhone;
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone; // Add India country code
    }

    // Format date
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    // Format currency
    const formatCurrency = (amount) => {
      return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Create professional invoice message
    const message = 
`╔══════════════════════════════════╗
║             SUITOR GUY                  ║
║              INVOICE                    ║
╚══════════════════════════════════╝

INVOICE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Invoice No: ${invoiceData.invoiceNumber}
Date: ${formatDate(invoiceData.invoiceDate)}
Branch: ${invoiceData.branch || 'Main Branch'}
Salesperson: ${invoiceData.salesperson || 'N/A'}

CUSTOMER INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${invoiceData.customer}
Phone: ${invoiceData.customerPhone || 'Not provided'}

ITEMS PURCHASED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${invoiceData.lineItems?.map((item, index) => {
  const itemName = (item.item || 'Item').length > 25 ? 
    (item.item || 'Item').substring(0, 25) + '...' : 
    (item.item || 'Item');
  return `${String(index + 1).padStart(2, '0')}. ${itemName}
    Qty: ${item.quantity || 0} × ${formatCurrency(item.rate)} = ${formatCurrency(item.amount)}`;
}).join('\n\n') || 'No items'}

PAYMENT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${invoiceData.discountAmount > 0 ? `
Subtotal:        ${formatCurrency(invoiceData.subTotal)}
Discount:        -${formatCurrency(invoiceData.discountAmount)}` : ''}${invoiceData.totalTax > 0 ? `
Amount (Incl. Tax): ${formatCurrency(invoiceData.finalTotal)}
Tax Included:       ${formatCurrency(invoiceData.totalTax)}` : `
Amount:             ${formatCurrency(invoiceData.finalTotal)}`}${invoiceData.adjustmentAmount != 0 ? `
Adjustment:         ${invoiceData.adjustmentAmount >= 0 ? '+' : ''}${formatCurrency(invoiceData.adjustmentAmount)}` : ''}
                    ─────────────────
TOTAL AMOUNT:       ${formatCurrency(invoiceData.finalTotal)}
                    ═════════════════

Payment Method: ${Array.isArray(invoiceData.paymentMethod) ? invoiceData.paymentMethod.join(', ') : invoiceData.paymentMethod || 'Cash'}
Status: ${invoiceData.status?.toUpperCase() || 'CONFIRMED'}

${invoiceData.customerNotes ? `Notes: ${invoiceData.customerNotes}\n\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for choosing Suitor Guy!
For any queries, please contact us.

${invoiceData.branch || 'Suitor Guy'}
Customer Service Available`;
  
    // Detect if device is mobile or desktop
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Use web.whatsapp.com for desktop (works in browser), wa.me for mobile
    const url = isMobile 
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  
    console.log("📱 Opening WhatsApp with URL:", url);
    console.log("📱 Device type:", isMobile ? "Mobile" : "Desktop");
    
    // Try to open WhatsApp
    const whatsappWindow = window.open(url, "_blank");
    
    // Check if popup was blocked
    if (!whatsappWindow || whatsappWindow.closed || typeof whatsappWindow.closed === 'undefined') {
      console.warn("⚠️ Pop-up blocked! Showing fallback message.");
      
      // Fallback: Show alert with instructions
      alert(
        `WhatsApp redirect was blocked by your browser.\n\n` +
        `Please allow pop-ups for this site, or manually open WhatsApp and send the message to:\n\n` +
        `Phone: ${formattedPhone}\n\n` +
        `The invoice has been saved successfully.`
      );
      
      // Try alternative method: direct navigation (works if pop-up blocker is strict)
      setTimeout(() => {
        window.location.href = url;
      }, 100);
    }
  };

  // Enter key to save invoice - DISABLED to allow barcode scanning
  // Users can click the save button instead
  // useEnterToSave(() => handleSaveInvoice("sent"), isSaving);

  // Get location code for selected branch
  const getLocCodeForBranch = (branchName) => {
    console.log(`🔍 getLocCodeForBranch called with: "${branchName}"`);
    
    if (!branchName) {
      console.log("❌ No branch name provided");
      return null;
    }
    
    // Try exact match first
    if (branchToLocCodeMap[branchName]) {
      console.log(`✅ Exact match found: ${branchName} -> ${branchToLocCodeMap[branchName]}`);
      return branchToLocCodeMap[branchName];
    }
    
    // Try case-insensitive match
    const branchNameLower = branchName.toLowerCase();
    for (const [key, value] of Object.entries(branchToLocCodeMap)) {
      if (key.toLowerCase() === branchNameLower) {
        console.log(`✅ Case-insensitive match found: ${branchName} -> ${key} -> ${value}`);
        return value;
      }
    }
    
    // Try partial match (remove "Branch" suffix and try again)
    const withoutBranch = branchName.replace(/\s*Branch\s*$/i, '').trim();
    if (branchToLocCodeMap[withoutBranch]) {
      console.log(`✅ Partial match found: ${branchName} -> ${withoutBranch} -> ${branchToLocCodeMap[withoutBranch]}`);
      return branchToLocCodeMap[withoutBranch];
    }
    
    console.log(`❌ No match found for branch: "${branchName}"`);
    return null;
  };

  // Get user location code from localStorage (for default store creation)
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("rootfinuser");
      if (userStr) {
        const user = JSON.parse(userStr);
        const locCode = user?.locCode || "";
        setUserLocCode(locCode);
      }
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
    }
  }, []);

  // Load invoice data when in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadInvoiceData = async () => {
        try {
          const response = await fetch(`${API_URL}/api/sales/invoices/${id}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch invoice: ${response.statusText}`);
          }
          const invoiceData = await response.json();
          
          // Populate form fields with invoice data
          setCustomer(invoiceData.customer || "");
          setCustomerPhone(invoiceData.customerPhone || "");
          setBranch(invoiceData.branch || "Warehouse");
          setInvoiceNumber(invoiceData.invoiceNumber || "");
          setInvoiceDate(invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate).toISOString().slice(0, 10) : "");
          setSalesperson(invoiceData.salesperson || "");
          setSubject(invoiceData.subject || "");
          setWarehouse(invoiceData.warehouse || "");
          setCategory(invoiceData.category || "income");
          setSubCategory(invoiceData.subCategory || "");
          // Handle paymentMethod - convert string to array if needed
          const paymentMethodValue = invoiceData.paymentMethod || "";
          if (typeof paymentMethodValue === "string" && paymentMethodValue.includes(",")) {
            setPaymentMethod(paymentMethodValue.split(",").map((m) => m.trim()).filter(Boolean));
          } else if (typeof paymentMethodValue === "string" && paymentMethodValue) {
            setPaymentMethod([paymentMethodValue]);
          } else if (Array.isArray(paymentMethodValue)) {
            setPaymentMethod(paymentMethodValue);
          } else {
            setPaymentMethod([]);
          }
          
          // Handle split payment data
          if (invoiceData.isSplitPayment) {
            setIsSplitPayment(true);
            setSplitPaymentAmounts(invoiceData.splitPaymentAmounts || { cash: "", bank: "", upi: "", rbl: "" });
          }
          
          // Set line items
          if (invoiceData.lineItems && invoiceData.lineItems.length > 0) {
            setLineItems(invoiceData.lineItems);
          }
          
          // Set discount
          if (invoiceData.discount) {
            setDiscount(invoiceData.discount);
          }
          
          // Set tax and adjustment
          setTax(invoiceData.tax || "");
          setAdjustment(invoiceData.adjustmentAmount || "0.00");
          
          // Set TDS/TCS fields
          if (invoiceData.tdsTcsType) {
            setTdsTcsType(invoiceData.tdsTcsType);
          }
          if (invoiceData.tdsTcsTax) {
            setTdsTcsTax(invoiceData.tdsTcsTax);
          }
          
        } catch (error) {
          console.error("Error loading invoice data:", error);
          showStockAlert("Failed to load invoice data", 'error');
        }
      };
      
      loadInvoiceData();
    }
  }, [isEditMode, id, API_URL]);

  // Fetch sales persons and store info for the selected branch
  useEffect(() => {
    const branchLocCode = getLocCodeForBranch(branch);
    
    if (branchLocCode) {
      setLoadingSalesPersons(true);
      
      console.log(`Fetching sales persons and store info for branch: ${branch}, locCode: ${branchLocCode}`);
      
      // First, ensure store exists for this branch
      const ensureStoreExists = async () => {
        try {
          // Try to fetch the store
          const fetchStoreResponse = await fetch(`${API_URL}/api/stores/loc/${branchLocCode}`);
          
          if (fetchStoreResponse.ok) {
            console.log(`✅ Store already exists for ${branch}`);
            return;
          }
          
          if (fetchStoreResponse.status === 404) {
            // Store doesn't exist - create it
            console.log(`📦 Creating store for branch: ${branch} (locCode: ${branchLocCode})`);
            const createStoreResponse = await fetch(`${API_URL}/api/stores`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: branch,
                locCode: branchLocCode,
              }),
            });
            
            if (createStoreResponse.ok) {
              const storeData = await createStoreResponse.json();
              console.log(`✨ Store created successfully: ${storeData.store.name} (ID: ${storeData.store.id})`);
            } else {
              const errorData = await createStoreResponse.json().catch(() => ({}));
              console.warn(`⚠️ Could not create store: ${errorData.message || 'Unknown error'}`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error ensuring store exists: ${error.message}`);
        }
      };
      
      // Ensure store exists, then fetch sales persons
      ensureStoreExists().then(() => {
        // Fetch sales persons
        fetch(`${API_URL}/api/sales-persons/loc/${branchLocCode}?isActive=true`)
          .then(res => {
            if (res.status === 404) {
              // Store doesn't exist for this branch yet - this is expected for new branches
              setSalesPersons([]);
              setSalesperson("");
              return null;
            }
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            if (data && data.salesPersons && Array.isArray(data.salesPersons)) {
              console.log(`Found ${data.salesPersons.length} sales persons for ${branch}:`, data.salesPersons.map(sp => `${sp.firstName} ${sp.lastName}`));
              // Format sales persons for display: use firstName only if lastName is a placeholder
              const formatted = data.salesPersons.map(sp => {
                const lastName = (sp.lastName || "").trim();
                const isPlaceholderLastName = !lastName || lastName === "-";
                const displayName = isPlaceholderLastName ? sp.firstName : `${sp.firstName} ${lastName}`;
                return {
                  id: sp.id,
                  name: displayName,
                  fullName: displayName,
                  ...sp
                };
              });
              setSalesPersons(formatted);
              
              // Don't auto-select any sales person - user must choose manually
              // This prevents unwanted auto-selection of sales persons
            } else {
              setSalesPersons([]);
              setSalesperson("");
            }
          })
          .catch(err => {
            // Silently ignore errors - expected for new branches
            setSalesPersons([]);
            setSalesperson("");
          })
          .finally(() => setLoadingSalesPersons(false));
      });
    } else {
      // No location code for this branch
      console.warn(`No location code mapping found for branch: ${branch}`);
      setSalesPersons([]);
      setSalesperson("");
    }
  }, [branch, API_URL]);

  // Handle adding new sales person
  const handleAddSalesPerson = async () => {
    // Validate visible fields first - only Name and Employee ID
    if (!newSalesPerson.firstName.trim() || !newSalesPerson.employeeId.trim()) {
      showStockAlert("Please fill all required fields (Name and Employee ID)", 'error');
      return;
    }

    // Get location code for the selected branch
    const branchLocCode = getLocCodeForBranch(branch);
    
    if (!branchLocCode) {
      showStockAlert(`Unable to determine location code for branch: ${branch}. Please contact administrator.`, 'error');
      return;
    }

    // Check if store exists, if not create it
    let storeIdToUse = null;
    
    try {
      // First, try to fetch the store
      const fetchStoreResponse = await fetch(`${API_URL}/api/stores/loc/${branchLocCode}`);
      
      if (fetchStoreResponse.ok) {
        const fetchStoreData = await fetchStoreResponse.json();
        if (fetchStoreData.store && fetchStoreData.store.id) {
          storeIdToUse = fetchStoreData.store.id;
          console.log(`Found existing store for ${branch}: ${fetchStoreData.store.name} (ID: ${storeIdToUse})`);
        }
      } else if (fetchStoreResponse.status === 404) {
        console.info(`ℹ️ Store not yet created for branch: ${branch} (locCode: ${branchLocCode}), will create when adding sales person`);
      } else {
        const errorData = await fetchStoreResponse.json().catch(() => ({}));
        console.error(`Error fetching store:`, errorData);
      }
      
      // If store doesn't exist by location code, try to find it by name or create it
      if (!storeIdToUse) {
        // First, try to find store by name (case-insensitive)
        try {
          const allStoresResponse = await fetch(`${API_URL}/api/stores`);
          if (allStoresResponse.ok) {
            const allStoresData = await allStoresResponse.json();
            const existingStore = allStoresData.stores?.find(store => 
              store.name.toLowerCase().trim() === branch.toLowerCase().trim() ||
              store.locCode === branchLocCode
            );
            
            if (existingStore) {
              storeIdToUse = existingStore.id;
              console.log(`Found existing store by name/locCode: ${existingStore.name} (ID: ${storeIdToUse})`);
            }
          }
        } catch (error) {
          console.warn("Could not fetch all stores:", error);
        }
        
        // If still not found, try to create it
        if (!storeIdToUse) {
          console.log(`Creating new store for branch: ${branch} with locCode: ${branchLocCode}`);
          const storeResponse = await fetch(`${API_URL}/api/stores`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: branch, // Use branch name as store name
              locCode: branchLocCode,
              // Don't include email field - let it use default empty string
            }),
          });

          const storeData = await storeResponse.json();
          
          if (storeResponse.ok && storeData.store && storeData.store.id) {
            storeIdToUse = storeData.store.id;
            console.log(`Created new store for ${branch}: ${storeData.store.name} (ID: ${storeIdToUse})`);
          } else if (storeResponse.status === 409) {
            // Store already exists - try to find it again
            console.log(`Store already exists, trying to find it again...`);
            try {
              const retryResponse = await fetch(`${API_URL}/api/stores`);
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                const existingStore = retryData.stores?.find(store => 
                  store.name.toLowerCase().trim() === branch.toLowerCase().trim() ||
                  store.locCode === branchLocCode
                );
                
                if (existingStore) {
                  storeIdToUse = existingStore.id;
                  console.log(`Found existing store after conflict: ${existingStore.name} (ID: ${storeIdToUse})`);
                }
              }
            } catch (retryError) {
              console.error("Error finding existing store after conflict:", retryError);
            }
            
            if (!storeIdToUse) {
              console.error(`Store exists but could not find it for branch: ${branch}`);
              showStockAlert(`Store exists but could not be located. Please refresh the page or contact administrator.`, 'error');
              return;
            }
          } else {
            console.error(`Failed to create store:`, storeData);
            const errorMsg = storeData.message || storeData.errors || storeData.error || 'Please contact administrator.';
            showStockAlert(`Unable to create store for branch: ${branch}. ${errorMsg}`, 'error');
            return;
          }
        }
      }
      
      // Validate storeId is a valid UUID format
      if (!storeIdToUse || typeof storeIdToUse !== 'string') {
        console.error(`Invalid store ID format: ${storeIdToUse}`);
        showStockAlert("Invalid store ID format. Please contact administrator.", 'error');
        return;
      }
      
    } catch (error) {
      console.error("Error creating/fetching store:", error);
      showStockAlert(`Unable to find or create store for branch: ${branch}. ${error.message || 'Please contact administrator.'}`, 'error');
      return;
    }

    if (!storeIdToUse) {
      showStockAlert("Store information is missing. Please refresh the page or contact administrator.", 'error');
      return;
    }

    try {
      // Prepare the request body - only Name and Employee ID (backend requires phone and email, so we send placeholders)
      const requestBody = {
        firstName: newSalesPerson.firstName.trim(), // Full name stored in firstName
        lastName: "-", // Backend requires lastName, send placeholder
        employeeId: newSalesPerson.employeeId.trim(),
        phone: "0000000000", // Backend requires phone, send placeholder
        email: `${newSalesPerson.employeeId.trim()}@placeholder.com`, // Backend validates email format, send placeholder
        storeId: storeIdToUse,
      };
      
      console.log("Creating sales person with data:", {
        ...requestBody,
        storeId: storeIdToUse,
      });
      
      const response = await fetch(`${API_URL}/api/sales-persons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.salesPerson) {
        const sp = data.salesPerson;
        const formattedName = sp.firstName; // Use firstName as the full name
        
        console.log(`Sales person ${formattedName} created successfully for branch: ${branch} (locCode: ${branchLocCode})`);
        
        // Refresh the sales persons list by fetching again
        const refreshResponse = await fetch(`${API_URL}/api/sales-persons/loc/${branchLocCode}?isActive=true`);
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData && refreshData.salesPersons && Array.isArray(refreshData.salesPersons)) {
            const formatted = refreshData.salesPersons.map(sp => {
              const lastName = (sp.lastName || "").trim();
              const isPlaceholderLastName = !lastName || lastName === "-";
              const displayName = isPlaceholderLastName ? sp.firstName : `${sp.firstName} ${lastName}`;
              return {
                id: sp.id,
                name: displayName,
                fullName: displayName,
                ...sp
              };
            });
            setSalesPersons(formatted);
          }
        }
        
        setSalesperson(formattedName);
        setShowSalesPersonModal(false);
        setNewSalesPerson({
          firstName: "",
          lastName: "",
          employeeId: "",
          phone: "",
          email: "",
        });
      } else {
        console.error("Failed to create sales person:", data);
        const errorMessage = data.message || data.error || "Failed to create sales person";
        showStockAlert(errorMessage, 'error');
      }
    } catch (error) {
      console.error("Error creating sales person:", error);
      showStockAlert("Error creating sales person: " + (error.message || "Unknown error"), 'error');
    }
  };

  // Handle deleting sales person
  const handleDeleteSalesPerson = async (salesPersonId, salesPersonName) => {
    if (!confirm(`Are you sure you want to delete sales person "${salesPersonName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/sales-persons/${salesPersonId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh the sales persons list
        const branchLocCode = getLocCodeForBranch(branch);
        if (branchLocCode) {
          const refreshResponse = await fetch(`${API_URL}/api/sales-persons/loc/${branchLocCode}?isActive=true`);
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData && refreshData.salesPersons && Array.isArray(refreshData.salesPersons)) {
              const formatted = refreshData.salesPersons.map(sp => ({
                id: sp.id,
                name: sp.firstName || `${sp.firstName} ${sp.lastName}`.trim(),
                fullName: sp.firstName || `${sp.firstName} ${sp.lastName}`.trim(),
                ...sp
              }));
              setSalesPersons(formatted);
              
              // If the deleted person was selected, clear the selection
              if (salesperson === salesPersonName) {
                setSalesperson("");
              }
            } else {
              setSalesPersons([]);
              setSalesperson("");
            }
          }
        }
        
        console.log(`Sales person "${salesPersonName}" deleted successfully`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete sales person");
      }
    } catch (error) {
      console.error("Error deleting sales person:", error);
      showStockAlert("Error deleting sales person: " + (error.message || "Unknown error"), 'error');
    }
  };

  const handleLineItemChange = (id, key, value) => {
    const allTaxOptions = [...taxOptions, ...nonTaxableOptions];
    const discountConfig = {
      value: discount.value,
      type: discount.type,
      applyAfterTax: applyDiscountAfterTax,
    };

    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          let updated = { ...item };

          if (key === "item" && typeof value === 'object' && value !== null) {
            // When item is selected from dropdown
            const itemData = value;
            const sellingPrice = typeof itemData.sellingPrice === 'number' ? itemData.sellingPrice : (typeof itemData.costPrice === 'number' ? itemData.costPrice : 0);
            updated = {
              ...updated,
              item: itemData.itemName || "",
              itemData: itemData,
              rate: sellingPrice,
              size: itemData.size || extractSizeFromName(itemData.itemName),
            };
          } else {
            updated = {
              ...updated,
              [key]: value,
            };
          }

          // Recalculate GST for the updated item
          const gstCalculation = calculateGSTLineItem(updated, discountConfig, allTaxOptions);
          return {
            ...updated,
            ...gstCalculation,
            baseAmount: parseFloat(gstCalculation.baseAmount),
            discountedAmount: parseFloat(gstCalculation.discountedAmount),
            cgstAmount: parseFloat(gstCalculation.cgstAmount),
            sgstAmount: parseFloat(gstCalculation.sgstAmount),
            igstAmount: parseFloat(gstCalculation.igstAmount),
            lineTaxTotal: parseFloat(gstCalculation.lineTaxTotal),
            lineTotal: parseFloat(gstCalculation.lineTotal),
            amount: parseFloat(gstCalculation.baseAmount),
            taxPercent: gstCalculation.taxPercent,
            cgstPercent: gstCalculation.cgstPercent,
            sgstPercent: gstCalculation.sgstPercent,
            igstPercent: gstCalculation.igstPercent,
            isInterState: gstCalculation.isInterState,
          };
        }
        return item;
      })
    );

    // Auto-set sub category when an item is selected (outside setLineItems to ensure it always fires)
    if (key === "item" && typeof value === 'object' && value !== null) {
      const itemCategory = (value.category || "").toLowerCase().trim();
      if (itemCategory === "shoe") {
        setSubCategory("shoe sales");
      } else if (itemCategory === "shirt") {
        setSubCategory("shirt sales");
      } else {
        setSubCategory("");
      }
    }
  };

  const handleQuantityChange = (id, value) => {
    const quantity = Number(value) || 0;
    
    // Find the item to get available stock
    const lineItem = lineItems.find(item => item.id === id);
    if (lineItem && lineItem.itemData) {
      const itemData = lineItem.itemData;
      
      // Calculate available stock using same logic as display
      let availableStock = 0;
      if (warehouse && itemData.warehouseStocks && Array.isArray(itemData.warehouseStocks)) {
        const targetWarehouseLower = warehouse.toLowerCase().trim();
        
        if (targetWarehouseLower === "warehouse") {
          // Show total stock from all warehouses
          availableStock = itemData.warehouseStocks.reduce((sum, ws) => {
            const stock = parseFloat(ws.availableForSale) || parseFloat(ws.stockOnHand) || 0;
            return sum + Math.max(0, stock);
          }, 0);
        } else {
          // For specific warehouse, find matching warehouse stock
          const normalizedTargetWarehouse = mapLocNameToWarehouse(warehouse);
          const normalizedTargetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
          
          const matchingStock = itemData.warehouseStocks.find(ws => {
            if (!ws.warehouse) return false;
            const normalizedStockWarehouse = mapLocNameToWarehouse(ws.warehouse.toString());
            const stockWarehouse = normalizedStockWarehouse.toLowerCase().trim();
            
            return stockWarehouse === normalizedTargetWarehouseLower || 
                   stockWarehouse.includes(normalizedTargetWarehouseLower) ||
                   normalizedTargetWarehouseLower.includes(stockWarehouse);
          });
          
          if (matchingStock) {
            availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
          }
        }
      }
      
      // Limit quantity to available stock
      const limitedQuantity = Math.min(quantity, availableStock);
      
      if (quantity > availableStock && quantity > 0) {
        showStockAlert(`⚠️ ${itemData.itemName || lineItem.item}: Only ${availableStock.toFixed(2)} pcs available`, 'warning');
      }
      
      handleLineItemChange(id, "quantity", limitedQuantity);
    } else {
      handleLineItemChange(id, "quantity", quantity);
    }
  };

  const handleRateChange = (id, value) => {
    handleLineItemChange(id, "rate", Number(value) || 0);
  };

  // Recalculate line items when discount changes
  useEffect(() => {
    if (lineItems.length === 0) return;
    
    const allTaxOptions = [...taxOptions, ...nonTaxableOptions];
    const discountConfig = {
      value: discount.value,
      type: discount.type,
      applyAfterTax: applyDiscountAfterTax,
    };

    setLineItems(prevItems => 
      prevItems.map(item => {
        const gstCalculation = calculateGSTLineItem(item, discountConfig, allTaxOptions);
        return {
          ...item,
          ...gstCalculation,
          baseAmount: parseFloat(gstCalculation.baseAmount),
          discountedAmount: parseFloat(gstCalculation.discountedAmount),
          cgstAmount: parseFloat(gstCalculation.cgstAmount),
          sgstAmount: parseFloat(gstCalculation.sgstAmount),
          igstAmount: parseFloat(gstCalculation.igstAmount),
          lineTaxTotal: parseFloat(gstCalculation.lineTaxTotal),
          lineTotal: parseFloat(gstCalculation.lineTotal),
          amount: parseFloat(gstCalculation.baseAmount),
          taxPercent: gstCalculation.taxPercent,
          cgstPercent: gstCalculation.cgstPercent,
          sgstPercent: gstCalculation.sgstPercent,
          igstPercent: gstCalculation.igstPercent,
          isInterState: gstCalculation.isInterState,
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discount.value, discount.type, applyDiscountAfterTax]);

  const addLineItem = () => {
    setLineItems((prev) => [...prev, blankLineItem()]);
  };
  
  // Bulk Add Items functions
  const handleBulkAddOpen = () => {
    setShowBulkAddModal(true);
    setBulkScannedItems([]);
    setBulkScanInput("");
    bulkScanBufferRef.current = "";
    // Fetch items for bulk add
    fetchBulkItems();
    // Focus input after modal opens
    setTimeout(() => {
      if (bulkScanInputRef.current) {
        bulkScanInputRef.current.focus();
      }
    }, 100);
  };
  
  const fetchBulkItems = async () => {
    setBulkItemsLoading(true);
    try {
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const response = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
      if (!response.ok) throw new Error("Failed to fetch items");
      const data = await response.json();
      
      let itemsList = [];
      if (Array.isArray(data)) {
        itemsList = data;
      } else if (data.items && Array.isArray(data.items)) {
        itemsList = data.items;
      }
      
      // Filter active items
      const activeItems = itemsList.filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false");
      
      // Filter by warehouse if warehouse is selected
      const filteredItems = warehouse ? filterItemsByWarehouse(activeItems, warehouse) : activeItems;
      
      setBulkItems(filteredItems);
    } catch (error) {
      console.error("Error fetching bulk items:", error);
      setBulkItems([]);
    } finally {
      setBulkItemsLoading(false);
    }
  };
  
  const filterItemsByWarehouse = (itemsList, targetWarehouse) => {
    if (!targetWarehouse) return itemsList;
    
    const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
    
    // If "Warehouse" is selected (main warehouse view), show ALL items - NO FILTERING
    if (targetWarehouseLower === "warehouse") {
      return itemsList;
    }
    
    // For specific branches/stores, show ONLY items from that branch
    return itemsList.filter(item => {
      if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) {
        return false;
      }
      
      return item.warehouseStocks.some(ws => {
        if (!ws.warehouse) return false;
        const stockWarehouse = (ws.warehouse || "").toString().toLowerCase().trim();
        
        // Check stock quantity first
        const stockOnHand = parseFloat(ws.stockOnHand) || 0;
        const availableForSale = parseFloat(ws.availableForSale) || 0;
        const hasStock = stockOnHand > 0 || availableForSale > 0;
        
        if (!hasStock) return false;
        
        // Check exact match or partial match
        if (stockWarehouse === targetWarehouseLower) {
          return true;
        }
        
        // Check base name match
        const stockBase = stockWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
        const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
        
        if (stockBase && targetBase && stockBase === targetBase) {
          return true;
        }
        
        // Partial match
        if (stockWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(stockWarehouse)) {
          return true;
        }
        
        return false;
      });
    });
  };
  
  const handleBulkAddClose = () => {
    setShowBulkAddModal(false);
    setBulkScannedItems([]);
    setBulkScanInput("");
    bulkScanBufferRef.current = "";
  };
  
  const handleBulkScanKeyDown = async (e) => {
    // Clear any existing timeout
    if (bulkScanTimeoutRef.current) {
      clearTimeout(bulkScanTimeoutRef.current);
    }
    
    const char = e.key;
    
    // If Enter key is pressed, process the scanned code
    if (char === "Enter") {
      e.preventDefault();
      const scannedCode = bulkScanBufferRef.current.trim();
      
      if (scannedCode.length > 0) {
        await processBulkScan(scannedCode);
        bulkScanBufferRef.current = "";
        setBulkScanInput("");
      }
      return;
    }
    
    // Ignore special keys (Shift, Ctrl, Alt, etc.)
    if (char.length > 1) {
      return;
    }
    
    // Append character to buffer
    bulkScanBufferRef.current += char;
    setBulkScanInput(bulkScanBufferRef.current);
    
    // Set a timeout to reset buffer if no activity
    bulkScanTimeoutRef.current = setTimeout(() => {
      bulkScanBufferRef.current = "";
    }, 100);
  };
  
  const processBulkScan = async (scannedCode) => {
    console.log(`📱 Bulk scan: "${scannedCode}"`);
    
    try {
      // Use already loaded bulkItems instead of fetching again
      if (bulkItems.length === 0) {
        console.log("⚠️ No items loaded yet");
        showStockAlert("Items are still loading. Please wait.", 'warning');
        return;
      }
      
      // Find item by SKU
      const foundItem = bulkItems.find(item => 
        item.sku && item.sku.toLowerCase() === scannedCode.toLowerCase()
      );
      
      if (foundItem) {
        console.log(`✅ Found item:`, foundItem);
        console.log(`📦 Warehouse stocks:`, foundItem.warehouseStocks);
        
        // Get available stock using the same logic as display
        // Use availableForSale if available, otherwise use stockOnHand
        let availableStock = 0;
        if (warehouse && foundItem.warehouseStocks && Array.isArray(foundItem.warehouseStocks)) {
          const targetWarehouseLower = warehouse.toLowerCase().trim();
          
          if (targetWarehouseLower === "warehouse") {
            // Show total stock from all warehouses
            availableStock = foundItem.warehouseStocks.reduce((sum, ws) => {
              const stock = parseFloat(ws.availableForSale) || parseFloat(ws.stockOnHand) || 0;
              return sum + Math.max(0, stock);
            }, 0);
          } else {
            // For specific warehouse, find matching warehouse stock
            const normalizedTargetWarehouse = mapLocNameToWarehouse(warehouse);
            const normalizedTargetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
            
            const matchingStock = foundItem.warehouseStocks.find(ws => {
              if (!ws.warehouse) return false;
              const normalizedStockWarehouse = mapLocNameToWarehouse(ws.warehouse.toString());
              const stockWarehouse = normalizedStockWarehouse.toLowerCase().trim();
              
              return stockWarehouse === normalizedTargetWarehouseLower || 
                     stockWarehouse.includes(normalizedTargetWarehouseLower) ||
                     normalizedTargetWarehouseLower.includes(stockWarehouse);
            });
            
            if (matchingStock) {
              availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
            }
          }
        }
        
        console.log(`📊 Available stock for ${foundItem.itemName}: ${availableStock}`);
        
        // Check if item already in bulk list
        setBulkScannedItems(prev => {
          const existingIndex = prev.findIndex(i => i.item._id === foundItem._id);
          
          if (existingIndex >= 0) {
            // Check if incrementing would exceed available stock
            const currentQuantity = prev[existingIndex].quantity;
            if (currentQuantity >= availableStock) {
              showStockAlert(`❌ Cannot add more. Only ${availableStock} pcs available for ${foundItem.itemName}`, 'error');
              return prev;
            }
            
            // Increment quantity
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + 1
            };
            console.log(`📈 Incremented quantity for ${foundItem.itemName} to ${updated[existingIndex].quantity}`);
            return updated;
          } else {
            // Check if we can add at least 1 item
            if (availableStock <= 0) {
              showStockAlert(`❌ No stock available for ${foundItem.itemName}`, 'error');
              return prev;
            }
            
            // Add new item
            console.log(`➕ Added new item ${foundItem.itemName}`);
            return [...prev, {
              item: foundItem.itemName || "",
              itemData: foundItem,
              quantity: 1,
              sku: foundItem.sku
            }];
          }
        });
      } else {
        console.log(`❌ Item not found for SKU: "${scannedCode}"`);
        showStockAlert(`Item with SKU "${scannedCode}" not found`, 'error');
      }
    } catch (error) {
      console.error("Error processing bulk scan:", error);
      showStockAlert("Error finding item. Please try again.", 'error');
    }
  };
  
  const handleBulkAddItems = () => {
    if (bulkScannedItems.length === 0) {
      showStockAlert("Please scan at least one item", 'error');
      return;
    }
    
    // Add all scanned items to line items
    const newLineItems = bulkScannedItems.map(scanned => {
      const item = scanned.item;
      const quantity = scanned.quantity;
      
      // Get available stock
      const getAvailableStock = (item, targetWarehouse) => {
        if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || !targetWarehouse) return 0;
        
        // Use warehouse mapping to normalize target warehouse name
        const normalizedTargetWarehouse = mapLocNameToWarehouse(targetWarehouse);
        const targetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
        
        const matchingStock = item.warehouseStocks.find(ws => {
          if (!ws.warehouse) return false;
          
          // Normalize the stock warehouse name using the same mapping
          const normalizedStockWarehouse = mapLocNameToWarehouse(ws.warehouse.toString());
          const stockWarehouse = normalizedStockWarehouse.toLowerCase().trim();
          
          return stockWarehouse === targetWarehouseLower || 
                 stockWarehouse.includes(targetWarehouseLower) ||
                 targetWarehouseLower.includes(stockWarehouse);
        });
        
        if (!matchingStock) return 0;
        const availableForSale = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
        return Math.max(0, availableForSale);
      };
      
      const availableStock = warehouse ? getAvailableStock(item, warehouse) : 0;
      const rate = typeof item.sellingPrice === 'number' ? item.sellingPrice : (typeof item.costPrice === 'number' ? item.costPrice : 0);
      const amount = round2(quantity * rate);
      
      return {
        id: Date.now() + Math.random(),
        item: item.itemName || "",
        itemData: item, // Store the full item object for ItemDropdown
        itemDetails: item.itemName || "",
        size: item.size || extractSizeFromName(item.itemName),
        quantity: quantity.toString(),
        rate: rate.toFixed(2),
        discount: "0",
        tax: "",
        amount: amount.toFixed(2),
        availableStock: availableStock,
        sku: item.sku || "",
      };
    });
    
    // Add to existing line items (remove blank item if exists)
    setLineItems(prev => {
      const filtered = prev.filter(item => item.itemDetails && item.itemDetails.trim() !== "");
      return [...filtered, ...newLineItems];
    });

    // Auto-set sub category from bulk added items
    const categories = [...new Set(bulkScannedItems.map(s => (s.item.category || "").toLowerCase().trim()))];
    if (categories.length === 1) {
      if (categories[0] === "shoe") setSubCategory("shoe sales");
      else if (categories[0] === "shirt") setSubCategory("shirt sales");
    } else if (categories.includes("shoe") && categories.includes("shirt")) {
      setSubCategory("mixed sales");
    }
    console.log(`✅ Added ${newLineItems.length} items to invoice`);
    handleBulkAddClose();
  };
  
  const handleRemoveBulkItem = (index) => {
    setBulkScannedItems(prev => prev.filter((_, i) => i !== index));
  };

  const removeLineItem = (id) => {
    setLineItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      // If no items left, add a blank item
      return filtered.length > 0 ? filtered : [blankLineItem()];
    });
    // Also remove from selected items if it was selected
    setSelectedItems((prev) => {
      const newSelected = new Set(prev);
      newSelected.delete(id);
      return newSelected;
    });
  };

  // Removed toggleTds - now using tdsTcsType state with radio buttons

  // Handle saving new tax
  const handleSaveNewTax = () => {
    if (!newTax.name || !newTax.rate) {
      showStockAlert("Please fill in Tax Name and Rate", 'error');
      return;
    }
    const taxOption = {
      id: `gst${newTax.rate}`,
      name: newTax.name,
      rate: parseFloat(newTax.rate),
      display: `${newTax.name} [${newTax.rate}%]`,
    };
    setTaxOptions([...taxOptions, taxOption]);
    setNewTax({ name: "", rate: "", type: "" });
    setShowNewTaxModal(false);
  };

  // Label component
  const Label = ({ children, required = false }) => (
    <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${required ? "text-[#ef4444]" : "text-[#64748b]"} mb-2 block`}>
      {children}
      {required && <span className="ml-0.5">*</span>}
    </span>
  );

  // Improved Select component with better styling
  const Select = ({ className = "", ...props }) => {
    const baseClasses = "w-full rounded-lg border border-[#e5e7eb] bg-white text-sm text-[#111827] hover:border-[#9ca3af] focus:border-[#9ca3af] focus:outline-none focus:ring-0 transition-all cursor-pointer px-3 py-2.5 appearance-none bg-no-repeat bg-right pr-10";
    return (
      <select
        {...props}
        className={`${baseClasses} ${className}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 10px center',
          backgroundRepeat: 'no-repeat',
          paddingRight: '32px'
        }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Better Alert UI */}
      {alert && (
        <div className={`fixed top-4 right-4 z-[9999] max-w-md rounded-lg shadow-2xl border-l-4 p-4 animate-in fade-in slide-in-from-top-2 ${
          alert.type === 'error' 
            ? 'bg-[#fef2f2] border-l-[#ef4444] text-[#991b1b]' 
            : alert.type === 'success'
            ? 'bg-[#f0fdf4] border-l-[#10b981] text-[#065f46]'
            : 'bg-[#fffbeb] border-l-[#f59e0b] text-[#92400e]'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {alert.type === 'error' && <span className="text-xl">❌</span>}
              {alert.type === 'success' && <span className="text-xl">✅</span>}
              {alert.type === 'warning' && <span className="text-xl">⚠️</span>}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1">
                {alert.type === 'error' ? 'Stock Validation Error' : alert.type === 'success' ? 'Success' : 'Warning'}
              </p>
              <p className="text-sm whitespace-pre-wrap">{alert.message}</p>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="flex-shrink-0 text-lg hover:opacity-70 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className={`invoice-page-wrapper transition-all duration-300 min-h-screen flex flex-col ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* ── Top Header Bar ── */}
        <div className="px-6 pt-5 pb-3">
          {/* Heading and Action Buttons */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#111827] uppercase">
                {isEditMode ? "Edit Invoice" : "Create Invoice"}
              </h1>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {isEditMode ? "Update an existing invoice" : "Create a new sales invoice"}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/sales/invoices"
                className="inline-flex items-center gap-2 rounded-none border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-semibold text-[#8B5CF6] hover:bg-purple-50 transition-colors shadow-sm"
              >
                <X size={14} className="text-[#8B5CF6]" />
                Back to Invoice
              </Link>
              <button
                type="button"
                onClick={() => setShowInvoiceSettingsModal(true)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-none border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] transition-colors shadow-sm"
                title="Settings"
              >
                <Settings size={15} className="text-[#4B5563]" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Body: Left Main Card + Right Sidebar (Equal Height with items-stretch) ── */}
        <div className="flex flex-1 min-h-0 px-6 pb-6 gap-4 items-stretch">
          {/* ── LEFT / MAIN COLUMN ── */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="rounded-none border border-[#E5E7EB] bg-white p-6 shadow-sm w-full flex-1 flex flex-col justify-between">
              <div>
                {/* BILL TO & INVOICE DETAILS */}
                <div className="grid grid-cols-2 gap-6">
                  {/* BILL TO */}
                  <div>
                    <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#8B5CF6]">
                      BILL TO
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1.5">
                          Customer Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={customer}
                          onChange={(e) => setCustomer(e.target.value)}
                          placeholder="Search or add customer"
                          className="w-full h-[42px] rounded-none border border-[#E5E7EB] bg-white px-3.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#8B5CF6] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1.5">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="flex h-[42px] rounded-none border border-[#E5E7EB] bg-white overflow-hidden focus-within:border-[#8B5CF6] transition-colors">
                          <span className="inline-flex items-center px-3.5 text-sm font-medium text-[#374151] border-r border-[#E5E7EB] bg-[#F9FAFB]">
                            +91
                          </span>
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Enter phone number"
                            className="flex-1 px-3.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none bg-transparent"
                          />
                        </div>
                      </div>
                      <SalesPersonSelect
                        label="Sales Person"
                        placeholder="Select sales person"
                        value={salesperson}
                        onChange={(value) => setSalesperson(value)}
                        options={salesPersons}
                        onManageClick={() => setShowSalesPersonModal(true)}
                        onDeleteClick={handleDeleteSalesPerson}
                        disabled={status.loading || isSaving}
                        required={true}
                      />
                    </div>
                  </div>

                  {/* INVOICE DETAILS */}
                  <div>
                    <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#8B5CF6]">
                      INVOICE DETAILS
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1.5">
                          Invoice Number <span className="text-red-500">*</span>
                        </label>
                        <div className="flex h-[42px] items-center rounded-none border border-[#E5E7EB] bg-white px-3.5 focus-within:border-[#8B5CF6] transition-colors">
                          <input
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            className="flex-1 border-0 bg-transparent text-sm text-[#374151] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowInvoiceSettingsModal(true)}
                            className="text-[#9CA3AF] hover:text-[#374151] transition-colors p-1"
                            title="Invoice Settings"
                          >
                            <Settings size={16} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1.5">
                          Invoice Date <span className="text-red-500">*</span>
                        </label>
                        <div className="flex h-[42px] items-center rounded-none border border-[#E5E7EB] bg-white px-3.5 focus-within:border-[#8B5CF6] transition-colors">
                          <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            className="flex-1 border-0 bg-transparent text-sm text-[#374151] focus:outline-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CLASSIFICATION */}
                <div className="mt-8 pt-6 border-t border-[#F3F4F6]">
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#8B5CF6]">
                    CLASSIFICATION
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">
                        Branch <span className="text-red-500">*</span>
                      </label>
                      {storeAccess.isStoreUser ? (
                        <input
                          type="text"
                          value={branch}
                          readOnly
                          className="w-full h-[42px] rounded-none border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 text-sm text-[#111827] cursor-not-allowed opacity-75"
                        />
                      ) : (
                        <div className="relative">
                          <select
                            value={branch}
                            onChange={(e) => {
                              const b = e.target.value;
                              setBranch(b);
                              setWarehouse(mapLocNameToWarehouse(b));
                            }}
                            className="w-full h-[42px] appearance-none rounded-none border border-[#E5E7EB] bg-white px-3.5 pr-8 text-sm text-[#111827] focus:border-[#8B5CF6] focus:outline-none transition-colors cursor-pointer"
                          >
                            <option value="Warehouse">Warehouse</option>
                            <option value="SuitorGuy MG Road">MG Road</option>
                          </select>
                          <ChevronDown
                            size={16}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value="Income"
                          disabled
                          className="w-full h-[42px] appearance-none rounded-none border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 pr-8 text-sm text-[#111827] cursor-not-allowed"
                        >
                          <option value="Income">Income</option>
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="mt-8">
                  <div className="overflow-x-auto rounded-none border border-[#E5E7EB]">
                    <table className="min-w-full divide-y divide-[#E5E7EB]">
                      <thead className="bg-[#18181B] text-white">
                        <tr>
                          <th className="w-10 px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded-none border-gray-600 bg-transparent text-[#8B5CF6] focus:ring-0 cursor-pointer"
                              checked={lineItems.length > 0 && selectedItems.size === lineItems.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems(new Set(lineItems.map(i => i.id)));
                                } else {
                                  setSelectedItems(new Set());
                                }
                              }}
                            />
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
                            ITEM DESCRIPTION
                          </th>
                          <th className="w-20 px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                            SIZE
                          </th>
                          <th className="w-28 px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                            QUANTITY
                          </th>
                          <th className="w-24 px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                            REMARKS
                          </th>
                          <th className="w-24 px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                            RATE
                          </th>
                          <th className="w-28 px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                            TAX
                          </th>
                          <th className="w-24 px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-white">
                            AMOUNT
                          </th>
                          <th className="w-10 px-2 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] bg-white">
                        {lineItems.map((item) => (
                          <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                            <td className="px-3 py-2 text-center align-middle">
                              <input
                                type="checkbox"
                                checked={selectedItems.has(item.id)}
                                onChange={(e) => {
                                  const s = new Set(selectedItems);
                                  e.target.checked ? s.add(item.id) : s.delete(item.id);
                                  setSelectedItems(s);
                                }}
                                className="h-4 w-4 rounded-none border-[#D1D5DB] text-[#8B5CF6] focus:ring-[#8B5CF6] cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-none bg-[#E4E4E7] flex items-center justify-center shrink-0 overflow-hidden">
                                  {item.itemData?.images && item.itemData.images.length > 0 ? (
                                    <img
                                      src={item.itemData.images[0].url || item.itemData.images[0]}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : item.itemData?.image ? (
                                    <img
                                      src={item.itemData.image}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="w-full h-full bg-[#D4D4D8] block" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                  <ItemDropdown
                                    rowId={item.id}
                                    value={item.itemData || item.item}
                                    onChange={(value) => handleLineItemChange(item.id, "item", value)}
                                    warehouse={warehouse}
                                    onNewItem={storeAccess.isAdmin ? () => navigate("/shoe-sales/items/new") : undefined}
                                    isStoreUser={storeAccess.isStoreUser}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center align-middle">
                              <input
                                value={item.size || ""}
                                onChange={(e) => handleLineItemChange(item.id, "size", e.target.value)}
                                placeholder="-"
                                className="w-full h-9 rounded-none border border-[#E5E7EB] px-2 text-center text-xs text-[#111827] focus:border-[#8B5CF6] focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-2 text-center align-middle">
                              <div className="inline-flex items-center rounded-none border border-[#E5E7EB] bg-white h-9 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item.id, Math.max(0, (parseFloat(item.quantity) || 0) - 1))}
                                  className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-black text-sm font-semibold transition-colors rounded-none"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                  className="w-8 h-full text-xs font-semibold text-center text-[#111827] focus:outline-none border-0 p-0 rounded-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item.id, (parseFloat(item.quantity) || 0) + 1)}
                                  className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-black text-sm font-semibold transition-colors rounded-none"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center align-middle">
                              <input
                                value={item.remarks || ""}
                                onChange={(e) => handleLineItemChange(item.id, "remarks", e.target.value)}
                                placeholder="-"
                                className="w-full h-9 rounded-none border border-[#E5E7EB] px-2 text-center text-xs text-[#111827] focus:border-[#8B5CF6] focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-2 text-center align-middle">
                              <input
                                type="number"
                                min={0}
                                value={item.rate || ""}
                                onChange={(e) => handleRateChange(item.id, e.target.value)}
                                placeholder="-"
                                className="w-full h-9 rounded-none border border-[#E5E7EB] px-2 text-center text-xs text-[#111827] focus:border-[#8B5CF6] focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-2 text-center align-middle">
                              <TaxDropdown
                                rowId={item.id}
                                value={item.tax}
                                onChange={(v) => handleLineItemChange(item.id, "tax", v)}
                                taxOptions={taxOptions}
                                nonTaxableOptions={nonTaxableOptions}
                                onNewTax={() => setShowNewTaxModal(true)}
                              />
                            </td>
                            <td className="px-3 py-2 text-center align-middle text-xs font-semibold text-[#111827]">
                              {parseFloat(item.lineTotal || item.amount || 0) > 0 ? `₹${item.lineTotal || item.amount}` : "-"}
                            </td>
                            <td className="px-2 py-2 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => removeLineItem(item.id)}
                                className="inline-flex items-center justify-center h-7 w-7 rounded-none text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Remove item"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Table bottom actions */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={addLineItem}
                        className="inline-flex items-center gap-1.5 rounded-none border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-semibold text-[#374151] hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        <Plus size={14} /> Add Row
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkAddOpen}
                        className="inline-flex items-center gap-1.5 rounded-none border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-semibold text-[#374151] hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        <Plus size={14} /> Add Bulk Items
                      </button>
                      {selectedItems.size > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLineItems((p) => {
                              const f = p.filter((i) => !selectedItems.has(i.id));
                              return f.length ? f : [blankLineItem()];
                            });
                            setSelectedItems(new Set());
                          }}
                          className="inline-flex items-center gap-1.5 rounded-none border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors shadow-sm"
                        >
                          <X size={14} /> Remove ({selectedItems.size})
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-[#9CA3AF]">All price exclude local tax</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDEBAR (320px) - Stretches to same height as left card ── */}
          <div className="w-80 shrink-0 bg-white rounded-none border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between">
            {/* TOP SECTION: Payment methods, sub total, discount */}
            <div className="space-y-5">
              {/* PAYMENT METHOD */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8B5CF6]">
                  PAYMENT METHOD
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* CASH */}
                  {(() => {
                    const isSelected = !isSplitPayment && paymentMethod.includes("Cash");
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod(["Cash"]);
                          setIsSplitPayment(false);
                        }}
                        className={`payment-method-btn flex items-center justify-center gap-2.5 px-3 rounded-xl transition-all cursor-pointer ${
                          isSelected ? "payment-method-selected" : ""
                        }`}
                        style={{
                          border: isSelected ? "2px solid #8B5CF6" : "1.5px solid #E5E7EB",
                          backgroundColor: isSelected ? "#F5F3FF" : "#FFFFFF",
                          borderRadius: "12px",
                          minHeight: "50px",
                          color: "#111827",
                        }}
                      >
                        <svg className="w-5 h-5 shrink-0 text-[#111827]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="2" y="6" width="20" height="12" rx="2" />
                          <circle cx="12" cy="12" r="2.5" />
                        </svg>
                        <span className="text-xs font-bold text-[#111827] tracking-wider">CASH</span>
                      </button>
                    );
                  })()}

                  {/* UPI */}
                  {(() => {
                    const isSelected = !isSplitPayment && paymentMethod.includes("UPI");
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod(["UPI"]);
                          setIsSplitPayment(false);
                        }}
                        className={`payment-method-btn flex items-center justify-center gap-2.5 px-3 rounded-xl transition-all cursor-pointer ${
                          isSelected ? "payment-method-selected" : ""
                        }`}
                        style={{
                          border: isSelected ? "2px solid #8B5CF6" : "1.5px solid #E5E7EB",
                          backgroundColor: isSelected ? "#F5F3FF" : "#FFFFFF",
                          borderRadius: "12px",
                          minHeight: "50px",
                          color: "#111827",
                        }}
                      >
                        <div className="flex flex-col items-center justify-center leading-none">
                          <div className="flex items-center gap-0.5">
                            <span className="text-sm font-black italic tracking-tighter text-[#111827]">UPI</span>
                            <svg className="w-3.5 h-3 text-[#111827]" viewBox="0 0 24 16" fill="currentColor">
                              <path d="M0 0 L10 8 L0 16 Z" />
                              <path d="M11 0 L21 8 L11 16 Z" />
                            </svg>
                          </div>
                          <span className="text-[5.5px] font-bold tracking-tighter text-[#6B7280] uppercase mt-0.5">
                            UNIFIED PAYMENTS INTERFACE
                          </span>
                        </div>
                      </button>
                    );
                  })()}

                  {/* CARD/ BANK */}
                  {(() => {
                    const isSelected = !isSplitPayment && paymentMethod.includes("Card / Bank");
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod(["Card / Bank"]);
                          setIsSplitPayment(false);
                        }}
                        className={`payment-method-btn flex items-center justify-center gap-2.5 px-3 rounded-xl transition-all cursor-pointer ${
                          isSelected ? "payment-method-selected" : ""
                        }`}
                        style={{
                          border: isSelected ? "2px solid #8B5CF6" : "1.5px solid #E5E7EB",
                          backgroundColor: isSelected ? "#F5F3FF" : "#FFFFFF",
                          borderRadius: "12px",
                          minHeight: "50px",
                          color: "#111827",
                        }}
                      >
                        <svg className="w-5 h-5 shrink-0 text-[#111827]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M14 10v11M2 10l10-7 10 7" />
                        </svg>
                        <span className="text-xs font-bold text-[#111827] tracking-wider">CARD/ BANK</span>
                      </button>
                    );
                  })()}

                  {/* SPLIT */}
                  {(() => {
                    const isSelected = isSplitPayment;
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setIsSplitPayment(!isSplitPayment);
                          setPaymentMethod([]);
                          if (isSplitPayment) setSplitPaymentAmounts({ cash: "", bank: "", upi: "", rbl: "" });
                        }}
                        className={`payment-method-btn flex items-center justify-center gap-2.5 px-3 rounded-xl transition-all cursor-pointer ${
                          isSelected ? "payment-method-selected" : ""
                        }`}
                        style={{
                          border: isSelected ? "2px solid #8B5CF6" : "1.5px solid #E5E7EB",
                          backgroundColor: isSelected ? "#F5F3FF" : "#FFFFFF",
                          borderRadius: "12px",
                          minHeight: "50px",
                          color: "#111827",
                        }}
                      >
                        <svg className="w-4 h-4 shrink-0 text-[#111827]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4" />
                        </svg>
                        <span className="text-xs font-bold text-[#111827] tracking-wider">SPLIT</span>
                      </button>
                    );
                  })()}
                </div>

                {/* Split inputs */}
                {isSplitPayment && (
                  <div className="grid grid-cols-3 gap-2 pt-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#8B5CF6] mb-1">Cash</label>
                      <input
                        type="number"
                        value={splitPaymentAmounts.cash}
                        onChange={(e) => setSplitPaymentAmounts((p) => ({ ...p, cash: e.target.value }))}
                        placeholder="Cash"
                        className="w-full min-w-0 h-9 rounded-none border border-[#E5E7EB] px-2 text-xs text-center text-[#111827] focus:border-[#8B5CF6] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#8B5CF6] mb-1">Card</label>
                      <input
                        type="number"
                        value={splitPaymentAmounts.bank}
                        onChange={(e) => setSplitPaymentAmounts((p) => ({ ...p, bank: e.target.value }))}
                        placeholder="Card"
                        className="w-full min-w-0 h-9 rounded-none border border-[#E5E7EB] px-2 text-xs text-center text-[#111827] focus:border-[#8B5CF6] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#8B5CF6] mb-1">UPI</label>
                      <input
                        type="number"
                        value={splitPaymentAmounts.upi}
                        onChange={(e) => setSplitPaymentAmounts((p) => ({ ...p, upi: e.target.value }))}
                        placeholder="UPI"
                        className="w-full min-w-0 h-9 rounded-none border border-[#E5E7EB] px-2 text-xs text-center text-[#111827] focus:border-[#8B5CF6] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sub Total */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-sm font-semibold text-[#111827]">Sub Total</div>
                  <div className="text-xs text-[#9CA3AF]">(Tax inclusive)</div>
                </div>
                <span className="text-sm font-semibold text-[#111827]">₹ {totals.subTotal}</span>
              </div>

              {/* Tax Breakdown */}
              {totals.taxBreakdown.length > 0 && (
                <div className="space-y-1 bg-[#F9FAFB] p-2.5 rounded-none border border-[#E5E7EB]/50">
                  {totals.taxBreakdown.map((tax, idx) => {
                    if (tax.type === 'GST') {
                      const half = tax.amount / 2;
                      const halfPct = tax.rate / 2;
                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between text-[11px] text-[#6B7280]">
                            <span>CGST {halfPct}%</span>
                            <span>₹{half.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-[#6B7280]">
                            <span>SGST {halfPct}%</span>
                            <span>₹{half.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="flex justify-between text-[11px] text-[#6B7280]">
                        <span>IGST {tax.rate}%</span>
                        <span>₹{tax.amount.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DISCOUNT */}
              <div className="rounded-none bg-[#F9FAFB] p-3 border border-[#E5E7EB]/60">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6] mb-2">
                  DISCOUNT
                </p>
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="number"
                    value={discount.value}
                    onChange={(e) => setDiscount((prev) => ({ ...prev, value: e.target.value }))}
                    placeholder="Enter discount"
                    className="flex-1 min-w-0 h-[42px] rounded-none border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#8B5CF6] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setDiscount((prev) => ({ ...prev, type: "₹" }))}
                    className={`h-[42px] w-10 shrink-0 flex items-center justify-center rounded-none border text-sm font-semibold transition-colors cursor-pointer ${
                      discount.type === "₹"
                        ? "border-[#8B5CF6] bg-[#F5F3FF] text-[#7C3AED]"
                        : "border-[#E5E7EB] bg-white text-[#7C3AED] hover:bg-gray-50"
                    }`}
                  >
                    ₹
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscount((prev) => ({ ...prev, type: "%" }))}
                    className={`h-[42px] w-10 shrink-0 flex items-center justify-center rounded-none border text-sm font-semibold transition-colors cursor-pointer ${
                      discount.type === "%"
                        ? "border-[#8B5CF6] bg-[#F5F3FF] text-[#7C3AED]"
                        : "border-[#E5E7EB] bg-white text-[#7C3AED] hover:bg-gray-50"
                    }`}
                  >
                    %
                  </button>
                </div>
                {parseFloat(totals.discountAmount) > 0 && (
                  <div className="flex justify-end mt-1.5">
                    <span className="text-xs font-semibold text-red-500">- ₹{totals.discountAmount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM SECTION: Total and Save Button pinned to bottom */}
            <div className="space-y-4 pt-4 border-t border-[#F3F4F6]">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#111827]">Total</span>
                <span className="text-xl font-bold text-[#16A34A]">₹ {totals.finalTotal}</span>
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={() => handleSaveInvoice("sent")}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-none bg-[#8B5CF6] py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#7C3AED] active:bg-[#6D28D9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
              >
                {isSaving ? "Saving..." : "Save & Send to Whatsapp"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Person Modal */}
      {showSalesPersonModal && (
        <SalesPersonModal
          onClose={() => {
            setShowSalesPersonModal(false);
            setNewSalesPerson({
              firstName: "",
              lastName: "",
              employeeId: "",
              phone: "",
              email: "",
            });
          }}
          onAdd={handleAddSalesPerson}
          newSalesPerson={newSalesPerson}
          setNewSalesPerson={setNewSalesPerson}
        />
      )}

      {/* Add Items in Bulk Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-7xl max-h-[90vh] rounded-none border border-[#e1e5f5] bg-white shadow-[0_25px_80px_-45px_rgba(15,23,42,0.35)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b-2 border-[#e2e8f0] px-8 py-5 bg-gradient-to-r from-white to-[#f8fafc]">
              <div>
                <h2 className="text-2xl font-bold text-[#0f172a] mb-1">Add Items in Bulk</h2>
                <p className="text-[13px] text-[#64748b] font-medium">Select items with available stock to add to invoice</p>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkSearchTerm("");
                  setBulkResults([]);
                  setSelectedBulkItems([]);
                }}
                className="rounded-none p-2.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#1e293b] transition-all active:scale-95"
                aria-label="Close"
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex flex-1 min-h-0">
              {/* Left side - Search and Results */}
              <div className="flex-1 border-r border-[#e7ebf8] flex flex-col">
                <div className="p-6 border-b-2 border-[#e2e8f0] bg-white">
                  <div className="relative">
                    <Search size={22} className="absolute left-5 top-1/2 transform -translate-y-1/2 text-[#64748b]" strokeWidth={2} />
                    <input
                      type="text"
                      value={bulkSearchTerm}
                      onChange={(e) => {
                        setBulkSearchTerm(e.target.value);
                        handleBulkSearch(e.target.value);
                      }}
                      placeholder="Type to search or scan the barcode of the item"
                      className="w-full pl-14 pr-5 py-4 text-[14px] font-medium border-2 border-[#cbd5e1] rounded-none focus:border-[#9ca3af] focus:outline-none focus:ring-4 focus:ring-[#9ca3af]/20 transition-all bg-white placeholder:text-[#94a3b8]"
                      autoFocus
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {isScanning && (
                    <div className="text-center py-12">
                      <div className="animate-spin w-8 h-8 border-2 border-[#9ca3af] border-t-transparent rounded-full mx-auto mb-4"></div>
                      <div className="text-sm text-[#6b7280]">Loading items...</div>
                    </div>
                  )}
                  
                  {!isScanning && bulkResults.length === 0 && bulkSearchTerm && (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">🔍</div>
                      <div className="text-lg font-medium text-[#1f2937] mb-2">No items found</div>
                      <div className="text-sm text-[#6b7280]">No items match "{bulkSearchTerm}"</div>
                    </div>
                  )}
                  
                  {!isScanning && bulkResults.length > 0 && (
                    <div className="grid gap-3">
                      {bulkResults.map((item) => {
                        const currentQuantity = getBulkItemQuantity(item._id);
                        const isSelected = currentQuantity > 0;
                        
                        // Calculate available stock using same logic as display
                        let availableStock = 0;
                        if (warehouse && item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
                          const targetWarehouseLower = warehouse.toLowerCase().trim();
                          
                          if (targetWarehouseLower === "warehouse") {
                            // Show total stock from all warehouses
                            availableStock = item.warehouseStocks.reduce((sum, ws) => {
                              const stock = parseFloat(ws.availableForSale) || parseFloat(ws.stockOnHand) || 0;
                              return sum + Math.max(0, stock);
                            }, 0);
                          } else {
                            // For specific warehouse, find matching warehouse stock
                            const normalizedTargetWarehouse = mapLocNameToWarehouse(warehouse);
                            const normalizedTargetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
                            
                            const matchingStock = item.warehouseStocks.find(ws => {
                              if (!ws.warehouse) return false;
                              const normalizedStockWarehouse = mapLocNameToWarehouse(ws.warehouse.toString());
                              const stockWarehouse = normalizedStockWarehouse.toLowerCase().trim();
                              
                              return stockWarehouse === normalizedTargetWarehouseLower || 
                                     stockWarehouse.includes(normalizedTargetWarehouseLower) ||
                                     normalizedTargetWarehouseLower.includes(stockWarehouse);
                            });
                            
                            if (matchingStock) {
                              availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
                            }
                          }
                        }
                        
                        const rate = item.sellingPrice || item.costPrice || 0;
                        const maxStock = Math.max(1, availableStock);
                        
                        return (
                          <div
                            key={item._id}
                            onClick={() => toggleBulkItemSelection(item)}
                            className={`group relative flex items-center gap-4 p-4 border-2 rounded-xl transition-all duration-200 cursor-pointer ${
                              isSelected 
                                ? 'border-[#374151] bg-[#f3f4f6] shadow-md' 
                                : 'border-[#e5e7eb] bg-white hover:border-[#cbd5e1] hover:shadow-sm'
                            }`}
                          >
                            {/* Checkbox */}
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected 
                                ? 'border-[#374151] bg-[#374151]' 
                                : 'border-[#d1d5db] bg-white group-hover:border-[#9ca3af]'
                            }`}>
                              {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                            </div>
                            
                            {/* Item Image Placeholder */}
                            <div className="w-12 h-12 bg-[#f8fafc] border border-[#e5e7eb] rounded-lg flex items-center justify-center flex-shrink-0">
                              <ImageIcon size={20} className="text-[#9ca3af]" />
                            </div>
                            
                            {/* Item Details */}
                            <div className="flex-1 min-w-0">
                              <div className={`font-semibold text-[15px] mb-1.5 truncate ${
                                isSelected ? 'text-[#1e40af]' : 'text-[#1f2937]'
                              }`}>
                                {item.itemName}
                              </div>
                              <div className="text-[13px] text-[#6b7280] mb-2">
                                <span className="font-medium">SKU:</span> {item.sku || 'N/A'} • 
                                <span className="font-medium ml-1">Rate:</span> ₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                                  stockOnHand > 0 
                                    ? 'bg-[#d1fae5] text-[#065f46]' 
                                    : 'bg-[#fee2e2] text-[#991b1b]'
                                }`}>
                                  Stock on Hand: {stockOnHand.toFixed(1)} pcs
                                </div>
                                {item.groupName && (
                                  <div className="text-xs text-[#9ca3af] bg-[#f1f5f9] px-2 py-1 rounded-md">
                                    Group: {item.groupName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {!isScanning && bulkResults.length === 0 && !bulkSearchTerm && (
                    <div className="text-center py-16">
                      <div className="text-7xl mb-5">📦</div>
                      <div className="text-2xl font-bold text-[#0f172a] mb-3">No items with stock available</div>
                      <div className="text-[14px] text-[#64748b] font-medium max-w-md mx-auto">
                        Only items with stock greater than 0 are shown here. Please check if items have stock in the warehouse or try selecting a different warehouse.
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right side - Selected Items */}
              <div className="w-96 bg-[#fafbff] flex flex-col">
                <div className="p-6 border-b border-[#e7ebf8] bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-[#1f2937]">Selected Items</h3>
                    <div className="bg-[#374151] text-white text-sm font-medium px-3 py-1 rounded-full">
                      {selectedBulkItems.length}
                    </div>
                  </div>
                  <div className="text-sm text-[#6b7280]">
                    Total Quantity: <span className="font-medium text-[#1f2937]">{selectedBulkItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedBulkItems.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">📋</div>
                      <div className="text-base font-medium text-[#1f2937] mb-2">No items selected</div>
                      <div className="text-sm text-[#6b7280]">
                        Select items from the left to add them here
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedBulkItems.map((item) => {
                        const itemRate = item.sellingPrice || item.costPrice || 0;
                        
                        // Calculate available stock using same logic as display
                        let availableStock = 0;
                        if (warehouse && item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
                          const targetWarehouseLower = warehouse.toLowerCase().trim();
                          
                          if (targetWarehouseLower === "warehouse") {
                            // Show total stock from all warehouses
                            availableStock = item.warehouseStocks.reduce((sum, ws) => {
                              const stock = parseFloat(ws.availableForSale) || parseFloat(ws.stockOnHand) || 0;
                              return sum + Math.max(0, stock);
                            }, 0);
                          } else {
                            // For specific warehouse, find matching warehouse stock
                            const normalizedTargetWarehouse = mapLocNameToWarehouse(warehouse);
                            const normalizedTargetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
                            
                            const matchingStock = item.warehouseStocks.find(ws => {
                              if (!ws.warehouse) return false;
                              const normalizedStockWarehouse = mapLocNameToWarehouse(ws.warehouse.toString());
                              const stockWarehouse = normalizedStockWarehouse.toLowerCase().trim();
                              
                              return stockWarehouse === normalizedTargetWarehouseLower || 
                                     stockWarehouse.includes(normalizedTargetWarehouseLower) ||
                                     normalizedTargetWarehouseLower.includes(stockWarehouse);
                            });
                            
                            if (matchingStock) {
                              availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
                            }
                          }
                        }
                        
                        const maxStock = Math.max(1, availableStock);
                        
                        return (
                          <div key={item._id} className="bg-white border border-[#e5e7eb] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[#1f2937] text-sm mb-1 truncate">
                                  {item.itemName}
                                </div>
                                <div className="text-xs text-[#6b7280] font-medium">
                                  [{item.sku}] • ₹{itemRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBulkItemSelection(item);
                                }}
                                className="text-[#ef4444] hover:text-[#dc2626] hover:bg-[#fef2f2] p-1.5 rounded-md transition-colors flex-shrink-0"
                                title="Remove item"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.quantity > 1) {
                                      updateBulkItemQuantity(item._id, item.quantity - 1);
                                    } else {
                                      toggleBulkItemSelection(item);
                                    }
                                  }}
                                  className="w-8 h-8 rounded-md border border-[#d1d5db] bg-white flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] hover:border-[#9ca3af] transition-colors font-bold text-lg leading-none"
                                  disabled={item.quantity <= 1}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 1;
                                    const qty = Math.min(Math.max(1, value), maxStock);
                                    updateBulkItemQuantity(item._id, qty);
                                  }}
                                  className="w-16 text-center text-sm font-semibold border border-[#e5e7eb] rounded-md py-1.5 focus:border-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]/20"
                                  min="1"
                                  max={maxStock}
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.quantity < maxStock) {
                                      updateBulkItemQuantity(item._id, item.quantity + 1);
                                    }
                                  }}
                                  className="w-8 h-8 rounded-md border border-[#d1d5db] bg-white flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] hover:border-[#9ca3af] transition-colors font-bold text-lg leading-none"
                                  disabled={item.quantity >= maxStock}
                                >
                                  +
                                </button>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-[#1f2937]">
                                  ₹{((itemRate * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 border-t border-[#e7ebf8] px-6 py-4 bg-[#fafbff]">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkSearchTerm("");
                  setBulkResults([]);
                  setSelectedBulkItems([]);
                }}
                className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBulkItems}
                disabled={selectedBulkItems.length === 0}
                className="rounded-md bg-[#374151] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f2937] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Items ({selectedBulkItems.length})
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Invoice Settings Modal */}
      {showInvoiceSettingsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-5 bg-gradient-to-r from-[#f8fafc] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#374151] to-[#1f2937] flex items-center justify-center shadow-lg">
                  <Settings size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Invoice Number Settings</h2>
                  <p className="text-xs text-[#6b7280] mt-0.5">Configure your invoice numbering preferences</p>
                </div>
              </div>
              <button
                onClick={() => setShowInvoiceSettingsModal(false)}
                className="no-blue-button rounded-lg p-2 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Branch Info Card */}
              <div className="bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] border border-[#d1d5db] p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#374151]">Branch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#374151]">Series</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#111827]">{branch}</span>
                  <span className="text-xs font-medium text-[#6b7280] bg-white px-3 py-1.5 rounded-full">Default Transaction Series</span>
                </div>
              </div>
              
              {/* Info Message */}
              <div className="flex items-start gap-3 p-4 bg-[#fef3c7] border border-[#fde047] rounded-xl">
                <div className="w-5 h-5 rounded-full bg-[#fbbf24] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-[#78350f] leading-relaxed">
                  Your invoice numbers are set on <span className="font-semibold">auto-generate mode</span> to save your time. Are you sure about changing this setting?
                </p>
              </div>
              
              {/* Options */}
              <div className="space-y-4">
                {/* Auto-generate Option */}
                <label className="block cursor-pointer">
                  <div className={`p-5 rounded-xl border-2 transition-all ${
                    invoiceSettings.autoGenerate 
                      ? 'border-[#374151] bg-[#f3f4f6] shadow-md' 
                      : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db] hover:bg-[#f9fafb]'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="invoiceMode"
                        checked={invoiceSettings.autoGenerate}
                        onChange={() => setInvoiceSettings({...invoiceSettings, autoGenerate: true})}
                        className="mt-1 w-5 h-5 text-[#374151] focus:ring-2 focus:ring-[#9ca3af] cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-[#111827]">Continue auto-generating invoice numbers</span>
                          <span className="text-xs font-medium text-[#10b981] bg-[#d1fae5] px-2 py-0.5 rounded-full">Recommended</span>
                        </div>
                        <p className="text-xs text-[#6b7280] mb-3">Automatically generate sequential invoice numbers</p>
                        
                        {invoiceSettings.autoGenerate && (
                          <div className="mt-4 space-y-4 pt-4 border-t border-[#e5e7eb]">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-2">Prefix</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={invoiceSettings.prefix}
                                    onChange={(e) => setInvoiceSettings({...invoiceSettings, prefix: e.target.value})}
                                    className="flex-1 rounded-lg border-2 border-[#d1d5db] px-3 py-2.5 text-sm font-medium focus:border-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]/20 transition-all"
                                    placeholder="INV-"
                                  />
                                  <button 
                                    type="button"
                                    className="no-blue-button w-9 h-9 rounded-lg bg-[#374151] text-white flex items-center justify-center hover:bg-[#1f2937] transition-colors shadow-md"
                                    title="Add prefix"
                                  >
                                    <Plus size={16} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-2">Next Number</label>
                                <input
                                  type="text"
                                  value={invoiceSettings.nextNumber}
                                  onChange={(e) => setInvoiceSettings({...invoiceSettings, nextNumber: e.target.value})}
                                  className="w-full rounded-lg border-2 border-[#d1d5db] px-3 py-2.5 text-sm font-medium focus:border-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]/20 transition-all"
                                  placeholder="00001"
                                />
                              </div>
                            </div>
                            
                            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/50 transition-colors">
                              <input
                                type="checkbox"
                                checked={invoiceSettings.restartYearly}
                                onChange={(e) => setInvoiceSettings({...invoiceSettings, restartYearly: e.target.checked})}
                                className="mt-0.5 w-5 h-5 rounded border-[#d1d5db] text-[#374151] focus:ring-2 focus:ring-[#9ca3af] cursor-pointer"
                              />
                              <div>
                                <span className="text-sm font-medium text-[#111827] block">Restart numbering yearly</span>
                                <span className="text-xs text-[#6b7280] mt-1 block">Reset invoice numbers at the start of each fiscal year</span>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
                
                {/* Manual Option */}
                <label className="block cursor-pointer">
                  <div className={`p-5 rounded-xl border-2 transition-all ${
                    !invoiceSettings.autoGenerate 
                      ? 'border-[#374151] bg-[#f3f4f6] shadow-md' 
                      : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db] hover:bg-[#f9fafb]'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="invoiceMode"
                        checked={!invoiceSettings.autoGenerate}
                        onChange={() => setInvoiceSettings({...invoiceSettings, autoGenerate: false})}
                        className="mt-1 w-5 h-5 text-[#374151] focus:ring-2 focus:ring-[#9ca3af] cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-[#111827] block mb-1">Enter invoice numbers manually</span>
                        <p className="text-xs text-[#6b7280]">You'll need to enter invoice numbers for each transaction</p>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[#e5e7eb] px-6 py-4 bg-[#f9fafb]">
              <button
                onClick={() => setShowInvoiceSettingsModal(false)}
                className="no-blue-button rounded-lg border border-[#d1d5db] bg-white px-5 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#f3f4f6] hover:border-[#9ca3af] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInvoiceSettings}
                className="no-blue-button rounded-lg bg-gradient-to-r from-[#374151] to-[#1f2937] px-6 py-2.5 text-sm font-semibold text-white hover:from-[#1f2937] hover:to-[#111827] transition-all shadow-lg hover:shadow-xl"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Tax Modal */}
      {showNewTaxModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[#e1e5f5] bg-white shadow-[0_25px_80px_-45px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-[#e7ebf8] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#1f2937]">New Tax</h2>
              <button
                onClick={() => {
                  setShowNewTaxModal(false);
                  setNewTax({ name: "", rate: "", type: "" });
                }}
                className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f1f5f9] hover:text-[#475569] transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <Label required>Tax Name</Label>
                <Input
                  placeholder=""
                  value={newTax.name}
                  onChange={(e) => setNewTax({ ...newTax, name: e.target.value })}
                />
              </div>
              <div>
                <Label required>Rate (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder=""
                    value={newTax.rate}
                    onChange={(e) => setNewTax({ ...newTax, rate: e.target.value })}
                    className="flex-1"
                  />
                  <div className="rounded-md border border-[#d7dcf5] bg-white px-3 py-2.5 text-sm text-[#64748b]">
                    %
                  </div>
                </div>
              </div>
              <div>
                <Label>Tax Type</Label>
                <Select
                  value={newTax.type}
                  onChange={(e) => setNewTax({ ...newTax, type: e.target.value })}
                >
                  <option value="">Select a Tax Type</option>
                  <option value="GST">GST</option>
                  <option value="VAT">VAT</option>
                  <option value="Sales Tax">Sales Tax</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[#e7ebf8] px-6 py-4 bg-[#fafbff]">
              <button
                onClick={() => {
                  setShowNewTaxModal(false);
                  setNewTax({ name: "", rate: "", type: "" });
                }}
                className="rounded-md border border-[#d7dcf5] bg-white px-5 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewTax}
                className="rounded-md border border-[#d7dcf5] bg-white px-5 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#f8fafc] transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

     
      {/* Bulk Add Items Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h2 className="text-xl font-semibold text-[#1e293b]">Add Items in Bulk</h2>
              <button
                onClick={handleBulkAddClose}
                className="text-[#64748b] hover:text-[#1e293b] transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Content - Split Layout */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Side - Search & Results */}
              <div className="w-1/2 border-r border-[#e5e7eb] flex flex-col">
                {/* Search Input */}
                <div className="p-4 border-b border-[#e5e7eb]">
                  <input
                    ref={bulkScanInputRef}
                    type="text"
                    value={bulkScanInput}
                    onKeyDown={handleBulkScanKeyDown}
                    onChange={(e) => setBulkScanInput(e.target.value)}
                    placeholder="Type to search or scan the barcode of the item"
                    className="w-full px-4 py-2.5 text-sm border border-[#d1d5db] rounded-md focus:border-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#9ca3af]"
                    autoFocus
                  />
                </div>
                
                {/* Search Results - Show ALL items like Zoho Books */}
                <div className="flex-1 overflow-y-auto p-2">
                  {bulkItemsLoading ? (
                    <div className="flex items-center justify-center h-full text-sm text-[#9ca3af]">
                      Loading items...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {bulkItems
                        .filter(item => {
                          // Filter by search term if provided
                          if (bulkScanInput.length > 0) {
                            const searchLower = bulkScanInput.toLowerCase();
                            return (
                              item.itemName?.toLowerCase().includes(searchLower) ||
                              item.sku?.toLowerCase().includes(searchLower)
                            );
                          }
                          // Show all items if no search term
                          return true;
                        })
                        .map((item) => {
                          const isSelected = bulkScannedItems.some(s => s.item._id === item._id);
                          
                          // Calculate available stock
                          let availableStock = 0;
                          if (warehouse && item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
                            const targetWarehouseLower = warehouse.toLowerCase().trim();
                            
                            // If "Warehouse" is selected, show total stock from all warehouses
                            if (targetWarehouseLower === "warehouse") {
                              availableStock = item.warehouseStocks.reduce((sum, ws) => {
                                const stock = parseFloat(ws.availableForSale) || parseFloat(ws.stockOnHand) || 0;
                                return sum + Math.max(0, stock);
                              }, 0);
                            } else {
                              // For specific warehouse, find matching warehouse stock
                              // Use warehouse mapping to normalize target warehouse name
                              const normalizedTargetWarehouse = mapLocNameToWarehouse(warehouse);
                              const normalizedTargetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
                              
                              const matchingStock = item.warehouseStocks.find(ws => {
                                if (!ws.warehouse) return false;
                                
                                // Normalize the stock warehouse name using the same mapping
                                const normalizedStockWarehouse = mapLocNameToWarehouse(ws.warehouse.toString());
                                const stockWarehouse = normalizedStockWarehouse.toLowerCase().trim();
                                
                                return stockWarehouse === normalizedTargetWarehouseLower || 
                                       stockWarehouse.includes(normalizedTargetWarehouseLower) ||
                                       normalizedTargetWarehouseLower.includes(stockWarehouse);
                              });
                              
                              if (matchingStock) {
                                availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
                              }
                            }
                          } else if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
                            // No warehouse selected - show total stock
                            availableStock = item.warehouseStocks.reduce((sum, ws) => {
                              const stock = parseFloat(ws.availableForSale) || parseFloat(ws.stockOnHand) || 0;
                              return sum + Math.max(0, stock);
                            }, 0);
                          }
                          
                          return (
                            <div
                              key={item._id}
                              onClick={() => {
                                if (!isSelected && availableStock > 0) {
                                  setBulkScannedItems(prev => [...prev, {
                                    item: item,
                                    quantity: 1,
                                    sku: item.sku
                                  }]);
                                  setBulkScanInput("");
                                }
                              }}
                              className={`p-3 rounded-md transition-colors relative ${
                                availableStock <= 0
                                  ? 'bg-[#fef2f2] border border-[#fecaca] cursor-not-allowed opacity-75'
                                  : isSelected 
                                  ? 'bg-[#f0f9ff] border border-[#bae6fd] cursor-pointer' 
                                  : 'hover:bg-[#f9fafb] border border-transparent cursor-pointer'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 pr-8">
                                  <div className={`font-medium text-sm ${
                                    availableStock <= 0 
                                      ? 'text-[#991b1b]'
                                      : 'text-[#1e293b]'
                                  }`}>
                                    {item.itemName}
                                  </div>
                                  <div className="text-xs text-[#64748b] mt-1">
                                    SKU: {item.sku || 'N/A'}
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  <div className="text-xs text-[#64748b]">Stock on Hand</div>
                                  {availableStock <= 0 ? (
                                    <div className="text-sm font-medium text-[#ef4444]">
                                      No Stock
                                    </div>
                                  ) : (
                                    <div className="text-sm font-medium text-[#10b981]">
                                      {availableStock.toFixed(2)} pcs
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Green checkmark for selected items */}
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-[#10b981] rounded-full flex items-center justify-center">
                                  <Check size={14} className="text-white" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
              {/* Right Side - Selected Items */}
              <div className="w-1/2 flex flex-col bg-[#f9fafb]">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#e5e7eb] bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#374151]">Selected Items</span>
                      <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-[#e5e7eb] text-xs font-semibold text-[#374151] rounded-full">
                        {bulkScannedItems.length}
                      </span>
                    </div>
                    <div className="text-sm text-[#64748b]">
                      Total Quantity: <span className="font-semibold text-[#1e293b]">{bulkScannedItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Selected Items List */}
                <div className="flex-1 overflow-y-auto p-4">
                  {bulkScannedItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-[#9ca3af]">
                      No items selected yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bulkScannedItems.map((scanned, index) => (
                        <div key={index} className="bg-white rounded-md border border-[#e5e7eb] p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-[#1e293b]">
                                [{scanned.sku}] {scanned.item.itemName}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveBulkItem(index)}
                              className="text-[#ef4444] hover:bg-[#fee2e2] p-1 rounded transition-colors ml-2"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setBulkScannedItems(prev => {
                                  const updated = [...prev];
                                  updated[index] = {
                                    ...updated[index],
                                    quantity: Math.max(1, updated[index].quantity - 1)
                                  };
                                  return updated;
                                });
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-[#d1d5db] hover:bg-[#f3f4f6] transition-colors"
                            >
                              <span className="text-[#64748b]">−</span>
                            </button>
                            <input
                              type="number"
                              value={scanned.quantity}
                              onChange={(e) => {
                                const qty = parseInt(e.target.value) || 1;
                                
                                // Calculate available stock using same logic as display
                                let availableStock = 0;
                                if (warehouse && scanned.item.warehouseStocks && Array.isArray(scanned.item.warehouseStocks)) {
                                  const targetWarehouseLower = warehouse.toLowerCase().trim();
                                  
                                  if (targetWarehouseLower === "warehouse") {
                                    availableStock = scanned.item.warehouseStocks.reduce((sum, ws) => {
                                      const stock = parseFloat(ws.availableForSale) || parseFloat(ws.stockOnHand) || 0;
                                      return sum + Math.max(0, stock);
                                    }, 0);
                                  } else {
                                    const normalizedTargetWarehouse = mapLocNameToWarehouse(warehouse);
                                    const normalizedTargetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
                                    
                                    const matchingStock = scanned.item.warehouseStocks.find(ws => {
                                      if (!ws.warehouse) return false;
                                      const normalizedStockWarehouse = mapLocNameToWarehouse(ws.warehouse.toString());
                                      const stockWarehouse = normalizedStockWarehouse.toLowerCase().trim();
                                      
                                      return stockWarehouse === normalizedTargetWarehouseLower || 
                                             stockWarehouse.includes(normalizedTargetWarehouseLower) ||
                                             normalizedTargetWarehouseLower.includes(stockWarehouse);
                                    });
                                    
                                    if (matchingStock) {
                                      availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
                                    }
                                  }
                                }
                                
                                // Limit to available stock
                                const limitedQty = Math.min(Math.max(1, qty), availableStock);
                                
                                if (qty > availableStock) {
                                  showStockAlert(`⚠️ Only ${availableStock.toFixed(2)} pcs available`, 'warning');
                                }
                                
                                setBulkScannedItems(prev => {
                                  const updated = [...prev];
                                  updated[index] = {
                                    ...updated[index],
                                    quantity: limitedQty
                                  };
                                  return updated;
                                });
                              }}
                              className="w-16 h-8 text-center border border-[#d1d5db] rounded text-sm focus:border-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#9ca3af]"
                              min="1"
                            />
                            <button
                              onClick={() => {
                                // Calculate available stock using same logic as display
                                let availableStock = 0;
                                if (warehouse && scanned.item.warehouseStocks && Array.isArray(scanned.item.warehouseStocks)) {
                                  const targetWarehouseLower = warehouse.toLowerCase().trim();
                                  
                                  if (targetWarehouseLower === "warehouse") {
                                    availableStock = scanned.item.warehouseStocks.reduce((sum, ws) => {
                                      const stock = parseFloat(ws.availableForSale) || parseFloat(ws.stockOnHand) || 0;
                                      return sum + Math.max(0, stock);
                                    }, 0);
                                  } else {
                                    const normalizedTargetWarehouse = mapLocNameToWarehouse(warehouse);
                                    const normalizedTargetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
                                    
                                    const matchingStock = scanned.item.warehouseStocks.find(ws => {
                                      if (!ws.warehouse) return false;
                                      const normalizedStockWarehouse = mapLocNameToWarehouse(ws.warehouse.toString());
                                      const stockWarehouse = normalizedStockWarehouse.toLowerCase().trim();
                                      
                                      return stockWarehouse === normalizedTargetWarehouseLower || 
                                             stockWarehouse.includes(normalizedTargetWarehouseLower) ||
                                             normalizedTargetWarehouseLower.includes(stockWarehouse);
                                    });
                                    
                                    if (matchingStock) {
                                      availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
                                    }
                                  }
                                }
                                
                                if (scanned.quantity >= availableStock) {
                                  showStockAlert(`⚠️ Only ${availableStock.toFixed(2)} pcs available`, 'warning');
                                  return;
                                }
                                
                                setBulkScannedItems(prev => {
                                  const updated = [...prev];
                                  updated[index] = {
                                    ...updated[index],
                                    quantity: updated[index].quantity + 1
                                  };
                                  return updated;
                                });
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-[#d1d5db] hover:bg-[#f3f4f6] transition-colors"
                            >
                              <span className="text-[#64748b]">+</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e5e7eb] bg-white">
              <button
                onClick={handleBulkAddClose}
                className="px-4 py-2 text-sm font-medium text-[#64748b] hover:text-[#1e293b] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAddItems}
                disabled={bulkScannedItems.length === 0}
                className="px-6 py-2 text-sm font-medium bg-[#374151] text-white rounded-md hover:bg-[#1f2937] transition-colors disabled:bg-[#9ca3af] disabled:cursor-not-allowed"
              >
                Add Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// SalesPersonSelect Component - Clean dropdown design like the item selector
const SalesPersonSelect = ({ label, placeholder, value, onChange, options = [], onManageClick, onDeleteClick, disabled = false, required = false }) => {
  console.log("🔄 NEW SalesPersonSelect rendered with options:", options);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState(value || "");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
        // If user typed something, use it as the value
        if (inputValue.trim() && inputValue !== value) {
          onChange(inputValue.trim());
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, value, onChange]);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) => {
      if (typeof option === 'string') {
        return option.toLowerCase().includes(term);
      }
      return option.name?.toLowerCase().includes(term) || option.fullName?.toLowerCase().includes(term);
    });
  }, [options, search]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setOpen(true);
    onChange(newValue);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleOptionSelect = (optionName) => {
    setInputValue(optionName);
    onChange(optionName);
    setOpen(false);
    setSearch("");
    inputRef.current?.focus();
  };

  const handleDeleteClick = (optionId, optionName, e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("🗑️ DELETE BUTTON CLICKED for:", optionName, optionId);
    if (onDeleteClick) {
      onDeleteClick(optionId, optionName);
    }
  };

  return (
    <div className="relative flex w-full flex-col text-sm" ref={containerRef}>
      <label className="block text-xs font-medium text-[#374151] mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          className={`w-full h-[42px] rounded-none border px-3.5 pr-10 text-sm transition cursor-pointer ${
            open ? "border-[#8b5cf6]" : "border-[#e5e7eb]"
          } ${disabled ? "bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed" : "bg-white text-[#111827]"} placeholder:text-[#9ca3af] focus:outline-none`}
        />
        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              setOpen(!open);
              inputRef.current?.focus();
            }
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0 border-0 bg-transparent shadow-none cursor-pointer"
          disabled={disabled}
        >
          <ChevronDown
            size={16}
            className={`transition-transform text-[#6b7280] ${open ? "rotate-180" : "rotate-0"}`}
          />
        </button>
      </div>
      
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-none border border-[#e5e7eb] bg-white shadow-lg">
          {/* Search Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#f3f4f6]">
            <Search size={16} className="text-[#9ca3af]" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search sales persons..."
              className="flex-1 text-sm text-[#1f2937] placeholder:text-[#9ca3af] border-none outline-none bg-transparent"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#9ca3af]">
                No sales persons found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const optionName = typeof option === 'string' ? option : option.name || option.fullName;
                const optionId = typeof option === 'string' ? null : option.id;
                
                console.log("🎨 Rendering option:", optionName, "with ID:", optionId, "selected:", value === optionName);
                
                return (
                  <div
                    key={optionName}
                    className={`flex items-center justify-between px-4 py-2 text-sm border-b border-[#f8fafc] last:border-b-0 cursor-pointer transition-colors ${
                      value === optionName
                        ? "bg-[#f8fafc] text-[#1f2937]"
                        : "bg-white text-[#6b7280] hover:bg-[#f8fafc] hover:text-[#1f2937]"
                    }`}
                    onClick={() => handleOptionSelect(optionName)}
                  >
                    <span className="flex-1 text-left">
                      {optionName}
                    </span>
                    {optionId && onDeleteClick && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(optionId, optionName, e)}
                        className="ml-2 p-1 text-[#ef4444] hover:text-[#dc2626] hover:bg-[#fef2f2] rounded-none transition-colors"
                        title={`Delete ${optionName}`}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {/* Add New Sales Person Link */}
          {onManageClick && (
            <div className="border-t border-[#f3f4f6] px-4 py-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageClick();
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 text-sm text-[#6b7280] hover:text-[#1f2937] transition-colors"
              >
                <Plus size={14} />
                Add New Sales Person
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// SalesPersonModal Component
const SalesPersonModal = ({ onClose, onAdd, newSalesPerson, setNewSalesPerson }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md rounded-none bg-white shadow-2xl border border-[#e5e7eb]">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4 bg-gradient-to-r from-[#f8fafc] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-gradient-to-br from-[#374151] to-[#1f2937] flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">👤</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111827]">Add Sales Person</h2>
              <p className="text-xs text-[#6b7280] mt-0.5">Enter sales person details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="no-blue-button rounded-none p-2 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#374151]">
                Name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                value={newSalesPerson.firstName}
                onChange={(e) => setNewSalesPerson({ ...newSalesPerson, firstName: e.target.value })}
                placeholder="Enter full name"
                className="w-full rounded-lg border-2 border-[#d1d5db] px-4 py-3 text-sm font-medium text-[#111827] placeholder:text-[#9ca3af] focus:border-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]/20 transition-all"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#374151]">
                Employee ID <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                value={newSalesPerson.employeeId}
                onChange={(e) => setNewSalesPerson({ ...newSalesPerson, employeeId: e.target.value })}
                placeholder="Enter employee ID"
                className="w-full rounded-lg border-2 border-[#d1d5db] px-4 py-3 text-sm font-medium text-[#111827] placeholder:text-[#9ca3af] focus:border-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]/20 transition-all"
                required
              />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#e5e7eb]">
            <button
              type="button"
              onClick={onClose}
              className="no-blue-button rounded-lg border border-[#d1d5db] bg-white px-5 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#f3f4f6] hover:border-[#9ca3af] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newSalesPerson.firstName.trim() || !newSalesPerson.employeeId.trim()}
              className="no-blue-button rounded-lg bg-gradient-to-r from-[#374151] to-[#1f2937] px-6 py-2.5 text-sm font-semibold text-white hover:from-[#1f2937] hover:to-[#111827] transition-all shadow-lg hover:shadow-xl disabled:from-[#9ca3af] disabled:to-[#9ca3af] disabled:cursor-not-allowed disabled:shadow-none"
              title={(!newSalesPerson.firstName.trim() || !newSalesPerson.employeeId.trim()) 
                       ? "Please fill all required fields" : ""}
            >
              Add Sales Person
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, required, children }) => (
  <label className="flex flex-col gap-2 text-sm text-[#475569]">
    <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#8a94b0]">
      {label}
      {required && <span className="font-normal text-[#ef4444]">*</span>}
    </span>
    {children}
  </label>
);

export default SalesInvoiceCreate;


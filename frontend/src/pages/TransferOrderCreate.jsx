// import { useState, useEffect, useRef, useMemo } from "react";
// import { useEnterToSave } from "../hooks/useEnterToSave";
// import { createPortal } from "react-dom";
// import { Link, useNavigate, useParams } from "react-router-dom";
// import { Search, X, Plus, Trash2, ArrowLeftRight, Package } from "lucide-react";
// import Head from "../components/Head";
// import Header from "../components/Header";
// import baseUrl from "../api/api";
// import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
// import useSidebar from "../hooks/useSidebar";

// const Label = ({ children, required = false }) => (
//   <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${required ? "text-[#ef4444]" : "text-[#64748b]"}`}>
//     {children}
//     {required && <span className="ml-0.5">*</span>}
//   </span>
// );

// const Input = ({ placeholder = "", className = "", ...props }) => {
//   const baseClasses = "w-full rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors";
//   const tableInputClasses = "h-[36px] px-[10px] py-[6px]";
//   const defaultClasses = "px-3 py-2.5";
  
//   const isTableInput = className.includes("table-input");
//   const finalClasses = `${baseClasses} ${isTableInput ? tableInputClasses : defaultClasses} ${className}`;
  
//   return (
//     <input
//       {...props}
//       className={finalClasses}
//       placeholder={placeholder}
//     />
//   );
// };

// // Warehouse Dropdown Component
// const WarehouseDropdown = ({ value, onChange, options, placeholder = "Select warehouse...", required = false }) => {
//   const buttonRef = useRef(null);
//   const dropdownRef = useRef(null);
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

//   const updatePos = () => {
//     if (!buttonRef.current) return;
//     const rect = buttonRef.current.getBoundingClientRect();
//     const dropdownHeight = 250;
//     const spaceBelow = window.innerHeight - rect.bottom - 8;
//     const spaceAbove = rect.top - 8;
//     const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    
//     setDropdownPos({
//       top: openUpward ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4,
//       left: rect.left,
//       width: rect.width,
//     });
//   };

//   const toggleDropdown = (e) => {
//     e.stopPropagation();
//     if (!isOpen) updatePos();
//     setIsOpen((p) => !p);
//   };

//   useEffect(() => {
//     const handleClick = (e) => {
//       if (
//         dropdownRef.current &&
//         !dropdownRef.current.contains(e.target) &&
//         buttonRef.current &&
//         !buttonRef.current.contains(e.target)
//       ) {
//         setIsOpen(false);
//         setSearchTerm("");
//       }
//     };
//     document.addEventListener("mousedown", handleClick);
//     return () => document.removeEventListener("mousedown", handleClick);
//   }, []);

//   useEffect(() => {
//     if (isOpen) {
//       updatePos();
//       setTimeout(updatePos, 0);
//     }
//   }, [isOpen]);

//   useEffect(() => {
//     if (!isOpen) return;
//     const follow = () => updatePos();
//     window.addEventListener("scroll", follow, true);
//     window.addEventListener("resize", follow);
//     return () => {
//       window.removeEventListener("scroll", follow, true);
//       window.removeEventListener("resize", follow);
//     };
//   }, [isOpen]);

//   const filteredOptions = options.filter((opt) =>
//     opt.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const selectedLabel = value || placeholder;

//   const dropdownPortal = isOpen ? (
//     <div
//       ref={dropdownRef}
//       style={{
//         position: "fixed",
//         top: dropdownPos.top,
//         left: dropdownPos.left,
//         width: dropdownPos.width,
//         zIndex: 999999,
//       }}
//     >
//       <div className="rounded-lg shadow-lg bg-white border border-[#d7dcf5] overflow-hidden">
//         <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-2 py-1.5 bg-[#fafbff]">
//           <Search size={12} className="text-[#94a3b8]" />
//           <input
//             type="text"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             placeholder="Search..."
//             className="h-7 w-full border-none bg-transparent text-xs text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
//             onClick={(e) => e.stopPropagation()}
//             autoFocus
//           />
//         </div>
//         <div className="py-1 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d3d3d3 #f5f5f5' }}>
//           {filteredOptions.length === 0 ? (
//             <div className="px-3 py-2 text-xs text-[#64748b] text-center">No options found</div>
//           ) : (
//             filteredOptions.map((option) => {
//               const isSelected = option === value;
//               return (
//                 <div
//                   key={option}
//                   onMouseDown={(e) => {
//                     e.preventDefault();
//                     e.stopPropagation();
//                     onChange({ target: { value: option } });
//                     setIsOpen(false);
//                     setSearchTerm("");
//                   }}
//                   onClick={(e) => {
//                     e.preventDefault();
//                     e.stopPropagation();
//                     onChange({ target: { value: option } });
//                     setIsOpen(false);
//                     setSearchTerm("");
//                   }}
//                   className={`px-3 py-1.5 text-sm cursor-pointer transition-colors ${
//                     isSelected
//                       ? "bg-[#2563eb] text-white"
//                       : "text-[#1f2937] hover:bg-[#f1f5f9]"
//                   }`}
//                 >
//                   {option}
//                 </div>
//               );
//             })
//           )}
//         </div>
//       </div>
//     </div>
//   ) : null;

//   return (
//     <>
//       <div className="relative w-full">
//         <input
//           ref={buttonRef}
//           onClick={toggleDropdown}
//           type="text"
//           readOnly
//           value={selectedLabel}
//           placeholder={placeholder}
//           required={required}
//           className="w-full h-10 rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors cursor-pointer px-3 py-2.5 pr-8 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px_16px] bg-[right_0.5rem_center] bg-no-repeat"
//         />
//       </div>
//       {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
//     </>
//   );
// };

// // Shared helper to get stock on hand for an item or item group in a specific warehouse
// const getStockOnHand = (item, warehouse) => {
//   if (!item || !warehouse) return 0;
  
//   // Normalize warehouse names for matching
//   const normalizedWarehouse = mapWarehouse(warehouse);
//   const warehouseLower = (normalizedWarehouse || warehouse || "").toLowerCase().trim();
//   const warehouseBase = warehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();

//   // 1. Direct warehouseStocks array (standalone item or item group)
//   if (item.warehouseStocks && Array.isArray(item.warehouseStocks) && item.warehouseStocks.length > 0) {
//     let totalStock = 0;
//     let found = false;
//     for (const ws of item.warehouseStocks) {
//       if (!ws.warehouse) continue;
//       const wsWarehouseRaw = ws.warehouse.toString().trim();
//       const normalizedWs = mapWarehouse(wsWarehouseRaw);
//       const wsWarehouse = (normalizedWs || wsWarehouseRaw || "").toLowerCase().trim();
//       const wsBase = wsWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();

//       let matches = false;
//       if (wsWarehouse === warehouseLower) {
//         matches = true;
//       } else if (wsBase && warehouseBase && wsBase === warehouseBase) {
//         matches = true;
//       } else if (
//         (wsWarehouse.includes(warehouseLower) || warehouseLower.includes(wsWarehouse)) &&
//         !(warehouseLower === "warehouse" && wsWarehouse !== "warehouse") &&
//         !(wsWarehouse === "warehouse" && warehouseLower !== "warehouse")
//       ) {
//         matches = true;
//       }

//       if (matches) {
//         totalStock += (parseFloat(ws.stockOnHand) || 0);
//         found = true;
//       }
//     }
//     if (found) return totalStock;
//   }

//   // 2. Item group with itemsList or items array
//   const variants = Array.isArray(item.itemsList) ? item.itemsList : (Array.isArray(item.items) ? item.items : []);
//   if (variants.length > 0) {
//     let groupTotal = 0;
//     for (const variant of variants) {
//       if (variant.warehouseStocks && Array.isArray(variant.warehouseStocks)) {
//         for (const ws of variant.warehouseStocks) {
//           if (!ws.warehouse) continue;
//           const wsWarehouseRaw = ws.warehouse.toString().trim();
//           const normalizedWs = mapWarehouse(wsWarehouseRaw);
//           const wsWarehouse = (normalizedWs || wsWarehouseRaw || "").toLowerCase().trim();
//           const wsBase = wsWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();

//           let matches = false;
//           if (wsWarehouse === warehouseLower) {
//             matches = true;
//           } else if (wsBase && warehouseBase && wsBase === warehouseBase) {
//             matches = true;
//           } else if (
//             (wsWarehouse.includes(warehouseLower) || warehouseLower.includes(wsWarehouse)) &&
//             !(warehouseLower === "warehouse" && wsWarehouse !== "warehouse") &&
//             !(wsWarehouse === "warehouse" && warehouseLower !== "warehouse")
//           ) {
//             matches = true;
//           }

//           if (matches) {
//             groupTotal += (parseFloat(ws.stockOnHand) || 0);
//           }
//         }
//       }
//     }
//     return groupTotal;
//   }

//   return 0;
// };

// // ItemDropdown Component - filters items by warehouse (same logic as SalesInvoiceCreate)
// const ItemDropdown = ({ 
//   rowId, 
//   value, 
//   onChange, 
//   sourceWarehouse, 
//   destinationWarehouse, 
//   onSourceStockFetched, 
//   onDestStockFetched, 
//   isStoreUser = false, 
//   userWarehouse = "", 
//   onFocusChange, 
//   isEditMode = false, 
//   orderId = null,
//   requestedHint = "",
//   requestedGroupId = null
// }) => {
//   const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
//   const buttonRef = useRef(null);
//   const dropdownRef = useRef(null);
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [selectedItem, setSelectedItem] = useState(null);
//   const [dropdownPos, setDropdownPos] = useState({
//     top: 0,
//     left: 0,
//     width: 0,
//   });
//   const [displayedCount, setDisplayedCount] = useState(20); // Show 20 items initially
//   const ITEMS_PER_PAGE = 20;
  
//   // Barcode scanning state
//   const [inputValue, setInputValue] = useState("");
//   const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
//   const autoSelectTimerRef = useRef(null);

//   // Filter items by warehouse (for transfer orders, show ALL items regardless of stock)
//   const filterItemsByWarehouse = (itemsList, targetWarehouse) => {
//     if (!targetWarehouse) return itemsList;
    
//     const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
    
//     // If "Warehouse" is selected (main warehouse view), show ALL items - NO FILTERING
//     // This shows combined stock from all warehouses
//     if (targetWarehouseLower === "warehouse") {
//       console.log("🏢 Warehouse selected - showing ALL items without filtering (combined stock)");
//       console.log(`   Total items to show: ${itemsList.length}`);
//       return itemsList; // Return all items without any filtering
//     }
    
//     // For specific branches/stores, show ALL items that exist in that warehouse
//     // (regardless of stock availability - users might want to transfer zero-stock items)
//     const filtered = itemsList.filter(item => {
//       if (item.warehouseStocks && Array.isArray(item.warehouseStocks) && item.warehouseStocks.length > 0) {
//         const hasMatch = item.warehouseStocks.some(ws => {
//           if (!ws.warehouse) return false;
//           const stockWarehouseRaw = (ws.warehouse || "").toString().trim();
//           const stockWarehouse = stockWarehouseRaw.toLowerCase().trim();
          
//           // For store users - NEVER show warehouse stock (confidential)
//           if (isStoreUser && (stockWarehouse === "warehouse" || stockWarehouse.includes("warehouse"))) {
//             return false;
//           }
          
//           if (stockWarehouse === targetWarehouseLower) return true;
          
//           const stockBase = stockWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
//           const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
//           if (stockBase && targetBase && stockBase === targetBase) return true;
          
//           if (stockWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(stockWarehouse)) return true;
//           return false;
//         });
//         if (hasMatch) return true;
//       }
//       return false;
//     });
    
//     console.log(`🔍 Filtered items for "${targetWarehouse}": ${filtered.length} items`);
//     return filtered;
//   };

//   // Fetch items only (fetch all active items and filter client-side)
//   useEffect(() => {
//     const fetchItems = async () => {
//       setLoading(true);
//       try {
//         const response = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
//         if (!response.ok) throw new Error("Failed to fetch items");
//         const data = await response.json();
        
//         let itemsList = [];
//         if (Array.isArray(data)) {
//           itemsList = data;
//         } else if (data.items && Array.isArray(data.items)) {
//           itemsList = data.items;
//         } else if (data.data && Array.isArray(data.data)) {
//           itemsList = data.data;
//         }

//         const activeItems = itemsList
//           .filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false")
//           .map((item) => ({
//             _id: item._id || item.id,
//             id: item._id || item.id,
//             itemName: item.itemName || item.name || "",
//             sku: item.sku || "",
//             size: item.size || "",
//             costPrice: item.costPrice || 0,
//             sellingPrice: item.sellingPrice || 0,
//             warehouseStocks: item.warehouseStocks || [],
//             itemGroupId: item.itemGroupId || null,
//             groupName: item.itemGroupName || item.groupName || null,
//             isFromGroup: !!item.isFromGroup,
//             isGroup: false,
//             isActive: true,
//           }));

//         console.log(`📦 Fetched ${activeItems.length} active items`);

//         // Filter by warehouse if source warehouse is selected
//         const filteredItems = sourceWarehouse ? filterItemsByWarehouse(activeItems, sourceWarehouse) : [];
//         console.log(`🏢 Items after warehouse filter (${sourceWarehouse || 'none'}): ${filteredItems.length}`);

//         setItems(filteredItems);
//       } catch (error) {
//         console.error("Error fetching items:", error);
//         setItems([]);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchItems();
//   }, [sourceWarehouse, API_URL]);



//   useEffect(() => {
//     console.log(`🔄 ItemDropdown: value changed:`, value);
//     if (value) {
//       if (typeof value === 'object' && value !== null) {
//         console.log(`   Setting selectedItem to object:`, value);
//         setSelectedItem(value);
//       } else if (items.length > 0) {
//         const item = items.find((i) => i._id === value || i.itemName === value);
//         console.log(`   Found item by ID/name:`, item);
//         setSelectedItem(item || null);
//       } else {
//         console.log(`   Items not loaded yet, clearing selectedItem`);
//         setSelectedItem(null);
//       }
//     } else {
//       console.log(`   Value is empty, clearing selectedItem`);
//       setSelectedItem(null);
//     }
//   }, [value, items]);

//   // Store callbacks in refs to avoid infinite loops
//   const onSourceStockFetchedRef = useRef(onSourceStockFetched);
//   const onDestStockFetchedRef = useRef(onDestStockFetched);
//   useEffect(() => {
//     onSourceStockFetchedRef.current = onSourceStockFetched;
//     onDestStockFetchedRef.current = onDestStockFetched;
//   }, [onSourceStockFetched, onDestStockFetched]);

//   // Track previous values to prevent duplicate fetches
//   const prevItemRef = useRef(null);
//   const prevSourceWarehouseRef = useRef(null);
//   const prevDestWarehouseRef = useRef(null);

//   // Fetch stock for both warehouses when item or warehouses change
//   useEffect(() => {
//     const itemKey = selectedItem 
//       ? (selectedItem.isFromGroup 
//           ? `${selectedItem.itemGroupId}-${selectedItem.itemName}-${selectedItem.sku || ''}`
//           : selectedItem._id)
//       : null;
    
//     if (!selectedItem) {
//       console.log(`⚠️ No item selected, skipping stock fetch`);
//       prevItemRef.current = itemKey;
//       prevSourceWarehouseRef.current = sourceWarehouse;
//       prevDestWarehouseRef.current = destinationWarehouse;
//       return;
//     }
    
//     if (!sourceWarehouse || !destinationWarehouse) {
//       console.log(`⚠️ Warehouses not selected (source: "${sourceWarehouse}", dest: "${destinationWarehouse}"), skipping stock fetch`);
//       prevItemRef.current = itemKey;
//       prevSourceWarehouseRef.current = sourceWarehouse;
//       prevDestWarehouseRef.current = destinationWarehouse;
//       return;
//     }
    
//     console.log(`🔄 Triggering stock fetch for item "${selectedItem.itemName}" (source: "${sourceWarehouse}", dest: "${destinationWarehouse}")`);
    
//     // Skip if nothing changed
//     if (itemKey === prevItemRef.current && 
//         sourceWarehouse === prevSourceWarehouseRef.current && 
//         destinationWarehouse === prevDestWarehouseRef.current) {
//       return;
//     }
    
//     prevItemRef.current = itemKey;
//     prevSourceWarehouseRef.current = sourceWarehouse;
//     prevDestWarehouseRef.current = destinationWarehouse;
    
//     const fetchStock = async (warehouse, callback) => {
//       if (!warehouse) {
//         console.warn(`⚠️ No warehouse provided for stock fetch`);
//         if (callback) callback(0);
//         return;
//       }
      
//       const localStock = getStockOnHand(selectedItem, warehouse);

//       try {
//         const params = new URLSearchParams({ warehouse });
        
//         if (selectedItem.isGroup) {
//           params.append('itemGroupId', selectedItem.itemGroupId || selectedItem._id);
//           params.append('isGroup', 'true');
//         } else if (selectedItem.isFromGroup) {
//           params.append('itemGroupId', selectedItem.itemGroupId);
//           params.append('itemName', selectedItem.itemName);
//           if (selectedItem.sku) params.append('itemSku', selectedItem.sku);
//         } else {
//           params.append('itemId', selectedItem._id);
//         }
        
//         // Exclude current order ID when in edit mode to avoid counting its own draft quantity
//         if (isEditMode && orderId) {
//           params.append('excludeOrderId', orderId);
//         }
        
//         const fullUrl = `${API_URL}/api/inventory/transfer-orders/stock/item?${params}`;
//         console.log(`\n📡 Fetching stock for "${selectedItem.itemName}" in warehouse "${warehouse}"`);
//         console.log(`   URL: ${fullUrl}`);
        
//         const response = await fetch(fullUrl);
//         console.log(`   Response status: ${response.status} ${response.statusText}`);
        
//         if (response.ok) {
//           const stockData = await response.json();
//           console.log(`✅ Stock data received:`, stockData);
          
//           if (stockData && stockData.success) {
//             if (callback) callback(stockData);
//           } else {
//             console.log(`⚠️ API returned success: false for "${selectedItem.itemName}", falling back to local stock: ${localStock}`);
//             if (callback) callback({ success: true, stockOnHand: localStock, currentQuantity: localStock, availableStock: localStock });
//           }
//         } else {
//           console.error(`❌ Failed to fetch stock (${response.status}), falling back to local stock: ${localStock}`);
//           if (callback) {
//             callback({ success: true, stockOnHand: localStock, currentQuantity: localStock, availableStock: localStock });
//           }
//         }
//       } catch (error) {
//         console.error("❌ Error fetching stock:", error);
//         if (callback) callback({ success: true, stockOnHand: localStock, currentQuantity: localStock, availableStock: localStock });
//       }
//     };
    
//     // Fetch stock for both warehouses
//     console.log(`🚀 About to fetch stock - callbacks:`, {
//       onSourceStockFetched: !!onSourceStockFetchedRef.current,
//       onDestStockFetched: !!onDestStockFetchedRef.current
//     });
    
//     fetchStock(sourceWarehouse, onSourceStockFetchedRef.current);
//     fetchStock(destinationWarehouse, onDestStockFetchedRef.current);
//   }, [selectedItem, sourceWarehouse, destinationWarehouse, API_URL, isEditMode, orderId]);

//   const updatePos = () => {
//     if (!buttonRef.current) return;
//     const rect = buttonRef.current.getBoundingClientRect();
//     const viewportHeight = window.innerHeight;
//     const dropdownMaxHeight = 380;
//     const spaceBelow = viewportHeight - rect.bottom - 16;
//     const spaceAbove = rect.top - 16;
    
//     const dropdownWidth = Math.max(rect.width, 420);
//     const left = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownWidth - 16));
    
//     // Open upward if space below is too small and there is more space above
//     const openUpward = spaceBelow < 320 && spaceAbove > spaceBelow;
//     const availableHeight = openUpward ? spaceAbove : spaceBelow;
//     const computedMaxHeight = Math.max(160, Math.min(dropdownMaxHeight, availableHeight));
    
//     const top = openUpward 
//       ? Math.max(8, rect.top - computedMaxHeight - 4) 
//       : rect.bottom + 4;
    
//     setDropdownPos({
//       top: top,
//       left: left,
//       width: dropdownWidth,
//       maxHeight: computedMaxHeight,
//       openUpward: openUpward,
//     });
//   };

//   const toggleDropdown = (e) => {
//     e.stopPropagation();
//     if (!isOpen) updatePos();
//     setIsOpen((p) => !p);
//   };

//   useEffect(() => {
//     const handleClick = (e) => {
//       if (
//         dropdownRef.current &&
//         !dropdownRef.current.contains(e.target) &&
//         buttonRef.current &&
//         !buttonRef.current.contains(e.target)
//       ) {
//         setIsOpen(false);
//         setSearchTerm("");
//       }
//     };
//     document.addEventListener("mousedown", handleClick);
//     return () => document.removeEventListener("mousedown", handleClick);
//   }, []);

//   useEffect(() => {
//     if (isOpen) {
//       updatePos();
//       setTimeout(updatePos, 0);
//     }
//   }, [isOpen]);

//   useEffect(() => {
//     if (!isOpen) return;
//     const follow = () => updatePos();
//     window.addEventListener("scroll", follow, true);
//     window.addEventListener("resize", follow);
//     return () => {
//       window.removeEventListener("scroll", follow, true);
//       window.removeEventListener("resize", follow);
//     };
//   }, [isOpen]);

//   const isMatchRequested = (item) => {
//     if (!requestedHint && !requestedGroupId) return false;
//     if (requestedGroupId && item.itemGroupId && String(item.itemGroupId) === String(requestedGroupId)) return true;
//     if (requestedHint) {
//       const hintLower = requestedHint.toLowerCase().trim();
//       const groupName = (item.groupName || "").toLowerCase().trim();
//       const itemName = (item.itemName || "").toLowerCase().trim();
//       if (groupName && (groupName === hintLower || groupName.includes(hintLower) || hintLower.includes(groupName))) return true;
//       if (itemName && (itemName.includes(hintLower) || hintLower.includes(itemName))) return true;
//     }
//     return false;
//   };

//   const filteredItems = useMemo(() => {
//     let result = items;
//     if (searchTerm && searchTerm.trim() !== "") {
//       const searchLower = searchTerm.toLowerCase().trim();
//       result = items.filter((item) => {
//         const itemName = (item?.itemName || "").toLowerCase();
//         const sku = (item?.sku || "").toLowerCase();
//         const groupName = (item?.groupName || "").toLowerCase();
        
//         return itemName.includes(searchLower) || 
//                sku.includes(searchLower) || 
//                groupName.includes(searchLower);
//       });
//     }
    
//     // If requestedHint/groupId is present, sort matching items to the very top
//     if (requestedHint || requestedGroupId) {
//       const matching = [];
//       const others = [];
//       result.forEach(item => {
//         if (isMatchRequested(item)) {
//           matching.push(item);
//         } else {
//           others.push(item);
//         }
//       });
//       return [...matching, ...others];
//     }
    
//     return result;
//   }, [items, searchTerm, requestedHint, requestedGroupId]);

//   const handleSelectItem = (item) => {
//     console.log(`🎯 handleSelectItem called with:`, item);
//     setSelectedItem(item);
//     onChange(item);
//     setIsOpen(false);
//     setSearchTerm("");
//     setInputValue("");
//   };

//   // Auto-select when only one item matches (for barcode scanning)
//   useEffect(() => {
//     // Only auto-select if:
//     // 1. Dropdown is open
//     // 2. There's a search term (user typed/scanned something)
//     // 3. Exactly 1 filtered item
//     // 4. Not already processing
//     if (isOpen && searchTerm && searchTerm.length >= 3 && filteredItems.length === 1 && !isProcessingBarcode) {
//       console.log(`🎯 AUTO-SELECT: Only 1 item matches "${searchTerm}"`);
//       console.log(`   Item:`, filteredItems[0]);
      
//       // Auto-select after 300ms to ensure user finished typing
//       const timer = setTimeout(() => {
//         console.log(`✅ AUTO-SELECTING single match:`, filteredItems[0]);
//         setIsProcessingBarcode(true);
//         handleSelectItem(filteredItems[0]);
//         setTimeout(() => setIsProcessingBarcode(false), 300);
//       }, 300);
      
//       return () => clearTimeout(timer);
//     }
//   }, [isOpen, searchTerm, filteredItems, isProcessingBarcode]);

//   // Reset pagination when search term changes
//   useEffect(() => {
//     setDisplayedCount(ITEMS_PER_PAGE);
//   }, [searchTerm]);

//   // Debug: Log when filteredItems or displayedCount changes
//   useEffect(() => {
//     console.log(`📊 Dropdown state: displayedCount=${displayedCount}, filteredItems=${filteredItems.length}, showLoadMore=${displayedCount < filteredItems.length}`);
//   }, [displayedCount, filteredItems.length]);

//   const dropdownPortal = isOpen ? (
//     <div
//       ref={dropdownRef}
//       style={{
//         position: "fixed",
//         top: `${dropdownPos.top}px`,
//         left: `${dropdownPos.left}px`,
//         width: `${dropdownPos.width}px`,
//         maxHeight: `${dropdownPos.maxHeight || 380}px`,
//         zIndex: 999999,
//       }}
//     >
//       <div 
//         className="rounded-lg shadow-2xl bg-white border border-[#e5e7eb] flex flex-col overflow-hidden" 
//         style={{ width: '100%', maxHeight: `${dropdownPos.maxHeight || 380}px` }}
//       >
//         {/* Search input */}
//         <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-3 py-2 bg-white">
//           <Search size={16} className="text-[#9ca3af]" />
//           <input
//             type="text"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             placeholder={requestedHint ? `Search in "${requestedHint}" or all items...` : "Search items..."}
//             className="h-8 w-full border-none bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
//             onClick={(e) => e.stopPropagation()}
//             onMouseDown={(e) => e.stopPropagation()}
//             autoFocus
//           />
//         </div>

//         {/* Store Order Request Hint banner inside dropdown */}
//         {requestedHint && !searchTerm && (
//           <div className="px-3 py-1.5 bg-[#fbf5ff] border-b border-[#eedbf8] text-[11px] font-semibold text-[#862ea7] flex items-center justify-between">
//             <span>Requested Group: <strong>{requestedHint}</strong></span>
//             <span className="text-[10px] text-[#9333ea] bg-white px-1.5 py-0.5 rounded border border-[#eedbf8]">Items listed first</span>
//           </div>
//         )}

//         {/* List of items */}
//         <div 
//           className="py-1 overflow-y-auto overflow-x-hidden flex-1" 
//           style={{ 
//             scrollbarWidth: 'thin', 
//             scrollbarColor: '#d1d5db #f9fafb' 
//           }}
//         >
//           {loading ? (
//             <div className="px-3 py-6 text-center text-sm text-[#6b7280]">Loading items...</div>
//           ) : filteredItems.length === 0 ? (
//             <div className="px-3 py-6 text-center text-sm text-[#6b7280]">
//               {searchTerm 
//                 ? "No matches found" 
//                 : sourceWarehouse 
//                   ? `No items available in ${sourceWarehouse}` 
//                   : "No items available"}
//             </div>
//           ) : (
//             <>
//               {/* Render paginated items */}
//               {filteredItems.slice(0, displayedCount).map((item) => {
//                 try {
//                   const isSelected = selectedItem && (
//                     (selectedItem._id && selectedItem._id === item._id) ||
//                     (selectedItem.itemName && selectedItem.itemName === item.itemName && selectedItem.sku === item.sku)
//                   );
//                   const isMatchReq = isMatchRequested(item);
//                   // For store users, show stock from their warehouse (or source warehouse if selected)
//                   // For admin, show stock from source warehouse
//                   const displayWarehouse = (isStoreUser && userWarehouse) ? userWarehouse : (sourceWarehouse || "");
//                   const stockOnHand = getStockOnHand(item, displayWarehouse);
                  
//                   return (
//                     <div
//                       key={item._id || item.sku || item.itemName || Math.random()}
//                       onMouseDown={(e) => {
//                         e.preventDefault();
//                         e.stopPropagation();
//                         handleSelectItem(item);
//                       }}
//                       onClick={(e) => {
//                         e.preventDefault();
//                         e.stopPropagation();
//                         handleSelectItem(item);
//                       }}
//                       className={`px-3 py-2.5 cursor-pointer transition-colors border-b border-[#f3f4f6] last:border-b-0 ${
//                         isSelected
//                           ? "bg-[#eff6ff] text-[#1e40af]"
//                           : isMatchReq
//                             ? "bg-[#faf5ff] hover:bg-[#f3e8ff]"
//                             : "hover:bg-[#f9fafb]"
//                       }`}
//                     >
//                       <div className="flex items-start justify-between gap-3">
//                         <div className="flex-1 min-w-0">
//                           <div className={`font-medium text-sm ${isSelected ? "text-[#1e40af]" : "text-[#111827]"}`}>
//                             {item.itemName || "Unnamed Item"}
//                           </div>
//                           <div className={`text-xs mt-1 flex items-center gap-1.5 flex-wrap ${isSelected ? "text-[#1e40af]" : "text-[#64748b]"}`}>
//                             <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isSelected ? "bg-blue-200 text-blue-800" : "bg-blue-100 text-blue-700"}`}>
//                               ITEM
//                             </span>
//                             {item.groupName && (
//                               <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-purple-100 text-purple-700">
//                                 {item.groupName}
//                               </span>
//                             )}
//                             {item.size ? <span>• Size: {item.size}</span> : null}
//                             {item.sku ? <span>• SKU: {item.sku}</span> : null}
//                           </div>
//                         </div>
//                         <div className="flex flex-col items-end shrink-0">
//                           <div className={`text-[10px] uppercase tracking-wider ${isSelected ? "text-[#3b82f6]" : "text-[#9ca3af]"}`}>
//                             Current Stock
//                           </div>
//                           {Number(stockOnHand) > 0 ? (
//                             <div className={`text-sm font-semibold mt-0.5 ${isSelected ? "text-[#1e40af]" : "text-[#059669]"}`}>
//                               {(Number(stockOnHand) || 0).toFixed(2)} pcs
//                             </div>
//                           ) : (
//                             <div className={`text-sm font-semibold mt-0.5 ${isSelected ? "text-[#dc2626]" : "text-[#dc2626]"}`}>
//                               0.00 pcs
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 } catch (error) {
//                   console.error("Error rendering item:", error, item);
//                   return (
//                     <div
//                       key={item._id || item.itemName || Math.random()}
//                       className="px-3 py-2.5 text-red-500 text-sm"
//                     >
//                       Error loading item: {item.itemName || "Unknown"}
//                     </div>
//                   );
//                 }
//               })}
              
//             </>
//           )}
//         </div>
        
//         {/* Sticky Load More Button - Always visible at bottom */}
//         {!loading && filteredItems.length > 0 && displayedCount < filteredItems.length && (
//           <div className="sticky bottom-0 px-3 py-2 border-t border-[#e5e7eb] text-center bg-white">
//             <button
//               onMouseDown={(e) => {
//                 e.preventDefault();
//                 e.stopPropagation();
//                 console.log(`📄 Load More clicked: ${displayedCount} → ${displayedCount + ITEMS_PER_PAGE} of ${filteredItems.length}`);
//                 setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
//               }}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 console.log(`📄 Load More clicked: ${displayedCount} → ${displayedCount + ITEMS_PER_PAGE} of ${filteredItems.length}`);
//                 setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
//               }}
//               className="w-full px-3 py-2 text-xs font-medium text-[#2563eb] hover:bg-[#f3f4f6] rounded transition-colors"
//             >
//               Load More ({displayedCount} of {filteredItems.length})
//             </button>
//           </div>
//         )}
        
//         {/* Items count info - Sticky at bottom when all loaded */}
//         {!loading && displayedCount >= filteredItems.length && filteredItems.length > 0 && (
//           <div className="sticky bottom-0 px-3 py-1.5 border-t border-[#e5e7eb] text-center text-[10px] text-[#6b7280] bg-white">
//             Showing all {filteredItems.length} items
//           </div>
//         )}
//       </div>
//     </div>
//   ) : null;

//   // Handle barcode input in the text field
//   const handleInputChange = (e) => {
//     const value = e.target.value;
//     setInputValue(value);
    
//     // Clear any existing auto-select timer
//     if (autoSelectTimerRef.current) {
//       clearTimeout(autoSelectTimerRef.current);
//     }
    
//     // If user is typing normally, show dropdown with search
//     if (value.length > 0) {
//       setSearchTerm(value);
//       setIsOpen(true);
      
//       // Auto-select after 500ms of no input (barcode scanner finishes typing)
//       // Increased to 500ms to ensure scanner has finished
//       if (value.length >= 3) { // Reduced minimum length to 3
//         autoSelectTimerRef.current = setTimeout(() => {
//           console.log(`⏱️ ========== AUTO-SELECT TIMER FIRED ==========`);
//           console.log(`   Input value: "${value}"`);
//           console.log(`   Available items count:`, items.length);
//           console.log(`   Items sample:`, items.slice(0, 3).map(i => ({ sku: i.sku, name: i.itemName })));
          
//           // Try exact SKU match first
//           const exactMatch = items.find(item => 
//             item.sku && item.sku.toLowerCase() === value.toLowerCase()
//           );
          
//           if (exactMatch) {
//             console.log(`✅ ========== EXACT SKU MATCH FOUND ==========`);
//             console.log(`   Item:`, exactMatch);
//             setIsProcessingBarcode(true);
//             // Use handleSelectItem for consistent behavior
//             handleSelectItem(exactMatch);
//             setTimeout(() => setIsProcessingBarcode(false), 300);
//             return;
//           }
          
//           console.log(`   No exact SKU match, trying filtered search...`);
          
//           // If no exact match, try first filtered item
//           const filtered = items.filter((item) => {
//             const searchLower = value.toLowerCase().trim();
//             const itemName = (item?.itemName || "").toLowerCase();
//             const sku = (item?.sku || "").toLowerCase();
//             const groupName = (item?.groupName || "").toLowerCase();
            
//             return itemName.includes(searchLower) || 
//                    sku.includes(searchLower) || 
//                    groupName.includes(searchLower);
//           });
          
//           console.log(`   Filtered items count:`, filtered.length);
          
//           if (filtered.length > 0) {
//             console.log(`✅ ========== FIRST FILTERED MATCH FOUND ==========`);
//             console.log(`   Item:`, filtered[0]);
//             setIsProcessingBarcode(true);
//             // Use handleSelectItem for consistent behavior
//             handleSelectItem(filtered[0]);
//             setTimeout(() => setIsProcessingBarcode(false), 300);
//           } else {
//             console.log(`❌ ========== NO MATCHES FOUND ==========`);
//             console.log(`   Search value: "${value}"`);
//           }
//         }, 500); // Increased to 500ms
//       }
//     } else {
//       setIsOpen(false);
//     }
//   };

//   const handleKeyDown = async (e) => {
//     // Handle Enter key - select first item from filtered results
//     if (e.key === 'Enter') {
//       e.preventDefault();
//       e.stopPropagation();
      
//       console.log(`🔑 ENTER KEY PRESSED`);
//       console.log(`   Input value: "${inputValue}"`);
//       console.log(`   Is processing barcode: ${isProcessingBarcode}`);
      
//       // If we're already processing a barcode, ignore this Enter
//       if (isProcessingBarcode) {
//         console.log(`⏳ Already processing barcode, ignoring Enter`);
//         return;
//       }
      
//       const scannedCode = inputValue.trim();
//       console.log(`📱 Enter pressed with value: "${scannedCode}"`);
      
//       // If input is empty, don't do anything
//       if (!scannedCode || scannedCode.length < 3) {
//         console.log(`⚠️ Input too short, ignoring Enter`);
//         return;
//       }
      
//       setIsProcessingBarcode(true);
      
//       console.log(`🔍 Searching for item with code: "${scannedCode}"`);
//       console.log(`   Available items: ${items.length}`);
      
//       // First, try to find exact SKU match
//       const exactMatch = items.find(item => 
//         item.sku && item.sku.toLowerCase() === scannedCode.toLowerCase()
//       );
      
//       if (exactMatch) {
//         console.log(`✅ ENTER - Exact SKU match found:`, exactMatch);
//         handleSelectItem(exactMatch);
//         setTimeout(() => setIsProcessingBarcode(false), 300);
//         return;
//       }
      
//       console.log(`   No exact match, trying filtered items...`);
      
//       // Then try first item in filtered results
//       if (filteredItems && filteredItems.length > 0) {
//         const firstMatch = filteredItems[0];
//         console.log(`✅ ENTER - Selecting first match from dropdown:`, firstMatch);
        
//         // Call the item select handler
//         handleSelectItem(firstMatch);
//         setTimeout(() => setIsProcessingBarcode(false), 300);
//         return;
//       }
      
//       console.log(`   No filtered items, searching via API...`);
      
//       // If no dropdown results, search via API
//       console.log(`🔍 No dropdown results, searching via API: ${scannedCode}`);
//       await handleBarcodeScanned(scannedCode);
//       setTimeout(() => setIsProcessingBarcode(false), 300);
      
//       return;
//     }
//   };

//   // Handle barcode scanning for this specific row
//   const handleBarcodeScanned = async (scannedSku) => {
//     console.log(`🔍 Processing scanned SKU in row ${rowId}: "${scannedSku}"`);
    
//     try {
//       const itemsResponse = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
//       if (itemsResponse.ok) {
//         const data = await itemsResponse.json();
//         const itemsList = Array.isArray(data) ? data : (data.items || data.data || []);
//         const foundItem = itemsList.find(item => 
//           (item.sku && item.sku.toLowerCase() === scannedSku.toLowerCase()) || 
//           (item.itemName && item.itemName.toLowerCase().includes(scannedSku.toLowerCase())) ||
//           (item.name && item.name.toLowerCase().includes(scannedSku.toLowerCase()))
//         );
//         if (foundItem) {
//           const itemObj = {
//             _id: foundItem._id || foundItem.id,
//             id: foundItem._id || foundItem.id,
//             itemName: foundItem.itemName || foundItem.name,
//             sku: foundItem.sku || "",
//             size: foundItem.size || "",
//             itemGroupId: foundItem.itemGroupId || null,
//             groupName: foundItem.itemGroupName || foundItem.groupName || null,
//             isFromGroup: !!foundItem.isFromGroup,
//             isGroup: false,
//             warehouseStocks: foundItem.warehouseStocks || [],
//           };
          
//           console.log(`✅ Found item, calling onChange with:`, itemObj);
          
//           // Call onChange to populate the row - this triggers handleItemSelect
//           onChange(itemObj);
          
//           // Close dropdown and clear input
//           setIsOpen(false);
//           setInputValue("");
//           setSearchTerm("");
//           setSelectedItem(itemObj);
          
//           return;
//         }
//       }
      
//       // Item not found
//       console.log(`❌ Item not found for SKU: "${scannedSku}"`);
//       alert(`Item with SKU "${scannedSku}" not found`);
//       setInputValue("");
//       setSearchTerm("");
//     } catch (error) {
//       console.error("Error searching for item:", error);
//       alert("Error searching for item. Please try again.");
//       setInputValue("");
//       setSearchTerm("");
//     }
//   };

//   // Cleanup timer on unmount
//   useEffect(() => {
//     return () => {
//       if (autoSelectTimerRef.current) {
//         clearTimeout(autoSelectTimerRef.current);
//       }
//     };
//   }, []);

//   return (
//     <>
//       <div className="relative w-full overflow-visible m-0 p-0">
//         <input
//           ref={buttonRef}
//           onClick={toggleDropdown}
//           onChange={handleInputChange}
//           onKeyDown={handleKeyDown}
//           onFocus={() => {
//             console.log(`🎯 Input FOCUSED`);
//             onFocusChange && onFocusChange(true);
//           }}
//           onBlur={(e) => {
//             console.log(`👋 Input BLURRED, value: "${inputValue}"`);
            
//             // Small delay to allow click events to fire first
//             setTimeout(() => {
//               // If there's a value, no item selected yet, and dropdown is open, try to auto-select
//               if (!selectedItem && inputValue && inputValue.length >= 3 && isOpen) {
//                 console.log(`🔍 Blur auto-select triggered for: "${inputValue}"`);
                
//                 // Try exact SKU match
//                 const exactMatch = items.find(item => 
//                   item.sku && item.sku.toLowerCase() === inputValue.toLowerCase()
//                 );
                
//                 if (exactMatch) {
//                   console.log(`✅ BLUR - Exact match found:`, exactMatch);
//                   handleSelectItem(exactMatch);
//                 } else if (filteredItems && filteredItems.length > 0) {
//                   console.log(`✅ BLUR - First filtered match:`, filteredItems[0]);
//                   handleSelectItem(filteredItems[0]);
//                 }
//               }
              
//               onFocusChange && onFocusChange(false);
//             }, 150);
//           }}
//           type="text"
//           placeholder="Type or scan barcode to select item..."
//           value={selectedItem ? selectedItem.itemName : inputValue}
//           data-handle-enter="true"
//           className="w-full h-[36px] rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors cursor-text px-[10px] py-[6px]"
//         />
//       </div>
//       {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
//     </>
//   );
// };

// const TransferOrderCreate = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const isSidebarOpen = useSidebar();
//   const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
//   const isEditMode = !!id;
  
//   // Get user info
//   const userStr = localStorage.getItem("rootfinuser");
//   const user = userStr ? JSON.parse(userStr) : null;
//   const userId = user?.email || user?._id || user?.id || "";
//   const isAdmin = user?.power === "admin";
//   const userLocCode = user?.locCode || "";
  
//   // Fallback locations mapping
//   const fallbackLocations = [
//     { "locName": "Z-Edapally1", "locCode": "144" },
//     { "locName": "Warehouse", "locCode": "858" },
//     { "locName": "G-Edappally", "locCode": "702" },
//     { "locName": "HEAD OFFICE01", "locCode": "759" },
//     { "locName": "SG-Trivandrum", "locCode": "700" },
//     { "locName": "Z- Edappal", "locCode": "100" },
//     { "locName": "Z.Perinthalmanna", "locCode": "133" },
//     { "locName": "Z.Kottakkal", "locCode": "122" },
//     { "locName": "G.Kottayam", "locCode": "701" },
//     { "locName": "G.Perumbavoor", "locCode": "703" },
//     { "locName": "G.Thrissur", "locCode": "704" },
//     { "locName": "G.Chavakkad", "locCode": "706" },
//     { "locName": "G.Calicut ", "locCode": "712" },
//     { "locName": "G.Vadakara", "locCode": "708" },
//     { "locName": "G.Edappal", "locCode": "707" },
//     { "locName": "G.Perinthalmanna", "locCode": "709" },
//     { "locName": "G.Kottakkal", "locCode": "711" },
//     { "locName": "G.Manjeri", "locCode": "710" },
//     { "locName": "G.Palakkad ", "locCode": "705" },
//     { "locName": "G.Kalpetta", "locCode": "717" },
//     { "locName": "G.Kannur", "locCode": "716" },
//     { "locName": "G.Mg Road", "locCode": "718" },
//     { "locName": "Production", "locCode": "101" },
//     { "locName": "Office", "locCode": "102" },
//     { "locName": "WAREHOUSE", "locCode": "103" }
//   ];
  
//   // Get user's location name and warehouse
//   let userLocName = "";
//   if (user?.locCode) {
//     const location = fallbackLocations.find(loc => loc.locCode === user.locCode || loc.locCode === String(user.locCode));
//     if (location) {
//       userLocName = location.locName;
//     }
//   }
//   if (!userLocName) {
//     userLocName = user?.username || user?.locName || "";
//   }
//   const userWarehouse = mapWarehouse(userLocName);
  
//   const [loading, setLoading] = useState(isEditMode);
//   const [saving, setSaving] = useState(false);
//   const [transferOrderNumber, setTransferOrderNumber] = useState("");
//   const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
//   const [reason, setReason] = useState("");
//   const [sourceWarehouse, setSourceWarehouse] = useState("");
//   const [destinationWarehouse, setDestinationWarehouse] = useState("");
//   const [tableRows, setTableRows] = useState([{ 
//     id: 1, 
//     item: null, 
//     itemId: null, 
//     itemGroupId: null, 
//     itemName: "", 
//     itemSku: "", 
//     sourceQuantity: 0,
//     sourceInTransit: 0,
//     sourceDraft: 0,
//     sourceTotal: 0,
//     destQuantity: 0, 
//     quantity: "",
//     requestedGroupName: "",
//     requestedQuantity: "" 
//   }]);
//   const [storeOrderPrefillInfo, setStoreOrderPrefillInfo] = useState(null);
//   const [isItemInputFocused, setIsItemInputFocused] = useState(false);
  
//   // Bulk Add Items states
//   const [showBulkAddModal, setShowBulkAddModal] = useState(false);
//   const [bulkScanInput, setBulkScanInput] = useState("");
//   const [bulkScannedItems, setBulkScannedItems] = useState([]); // Array of {item, quantity, sku}
//   const [bulkItems, setBulkItems] = useState([]); // All items for bulk add modal
//   const [bulkItemsLoading, setBulkItemsLoading] = useState(false);
//   const bulkScanInputRef = useRef(null);
//   const bulkScanBufferRef = useRef("");
//   const bulkScanTimeoutRef = useRef(null);
  
//   // Warehouse options (same as branch options)
//   const warehouseOptions = [
//     "Calicut",
//     "Chavakkad Branch",
//     "Edapally Branch",
//     "Edappal Branch",
//     "Grooms Trivandrum",
//     "Head Office",
//     "Kalpetta Branch",
//     "Kannur Branch",
//     "Kottakkal Branch",
//     "Kottayam Branch",
//     "Manjery Branch",
//     "Palakkad Branch",
//     "Perinthalmanna Branch",
//     "Perumbavoor Branch",
//     "SuitorGuy MG Road",
//     "Thrissur Branch",
//     "Vadakara Branch",
//     "Warehouse",
//   ];
  
//   // Set default source warehouse for store users
//   useEffect(() => {
//     if (!isEditMode && !isAdmin && userWarehouse) {
//       setSourceWarehouse(userWarehouse);
//       console.log(`📍 Auto-setting source warehouse to user's warehouse: "${userWarehouse}"`);
//     }
//   }, [isEditMode, isAdmin, userWarehouse]);
  
//   // Check for pre-filled data from Store Order (Accept button)
//   useEffect(() => {
//     if (!isEditMode) {
//       const prefillData = sessionStorage.getItem('transferOrderPrefill');
//       if (prefillData) {
//         try {
//           const data = JSON.parse(prefillData);
//           console.log('📋 Pre-filling transfer order from store order:', data);
          
//           // Set warehouses first
//           const srcWarehouse = data.sourceWarehouse || "Warehouse";
//           const destWarehouse = data.destinationWarehouse || "";
          
//           setSourceWarehouse(srcWarehouse);
//           setDestinationWarehouse(destWarehouse);
//           setReason(data.reason || "");

//           const requestedList = (data.requestedItems && data.requestedItems.length > 0) 
//             ? data.requestedItems 
//             : (data.items && data.items.length > 0 ? data.items : []);
          
//           if (data.storeOrderNumber || requestedList.length > 0) {
//             setStoreOrderPrefillInfo({
//               orderNumber: data.storeOrderNumber || "",
//               storeOrderId: data.storeOrderId || "",
//               requestedItems: requestedList,
//             });
//           }
          
//           // Populate rows with requested items/group hints so user can manually select the specific item
//           setTimeout(() => {
//             if (requestedList.length > 0) {
//               setTableRows(requestedList.map((req, idx) => ({
//                 id: idx + 1,
//                 item: null,
//                 itemId: null,
//                 itemGroupId: req.itemGroupId || null,
//                 itemName: "",
//                 itemSku: "",
//                 requestedGroupName: req.itemName || "",
//                 requestedQuantity: req.quantity || "",
//                 sourceQuantity: 0,
//                 destQuantity: 0,
//                 sourceTotal: 0,
//                 quantity: req.quantity ? req.quantity.toString() : "",
//               })));
//             } else {
//               setTableRows([{
//                 id: 1,
//                 item: null,
//                 itemId: null,
//                 itemGroupId: null,
//                 itemName: "",
//                 itemSku: "",
//                 requestedGroupName: "",
//                 requestedQuantity: "",
//                 sourceQuantity: 0,
//                 destQuantity: 0,
//                 sourceTotal: 0,
//                 quantity: "",
//               }]);
//             }
//           }, 100);
          
//           // Clear the session storage after using it
//           sessionStorage.removeItem('transferOrderPrefill');
//         } catch (error) {
//           console.error('Error parsing prefill data:', error);
//           sessionStorage.removeItem('transferOrderPrefill');
//         }
//       }
//     }
//   }, [isEditMode]);
  
//   // Load transfer order data if in edit mode
//   useEffect(() => {
//     if (isEditMode && id) {
//       const loadTransferOrder = async () => {
//         setLoading(true);
//         try {
//           const response = await fetch(`${API_URL}/api/inventory/transfer-orders/${id}`);
//           if (!response.ok) throw new Error("Failed to load transfer order");
//           const data = await response.json();
          
//           setTransferOrderNumber(data.transferOrderNumber || "");
//           setDate(data.date ? new Date(data.date).toISOString().split('T')[0] : date);
//           setReason(data.reason || "");
//           setSourceWarehouse(data.sourceWarehouse || "");
//           setDestinationWarehouse(data.destinationWarehouse || "");
          
//           if (data.items && Array.isArray(data.items)) {
//             const rows = data.items.map((item, index) => ({
//               id: index + 1,
//               item: { 
//                 _id: item.itemId || item.itemGroupId, 
//                 id: item.itemId || item.itemGroupId,
//                 itemName: item.itemName, 
//                 sku: item.itemSku || "", 
//                 itemGroupId: item.itemGroupId, 
//                 isFromGroup: !!item.itemGroupId,
//                 isGroup: !item.itemId || item.itemId === item.itemGroupId,
//               },
//               itemId: item.itemId,
//               itemGroupId: item.itemGroupId,
//               itemName: item.itemName,
//               itemSku: item.itemSku || "",
//               sourceQuantity: item.sourceQuantity || 0,
//               destQuantity: item.destQuantity || 0,
//               quantity: item.quantity?.toString() || "",
//             }));
//             setTableRows(rows.length > 0 ? rows : [{ id: 1, item: null, itemId: null, itemGroupId: null, itemName: "", itemSku: "", sourceQuantity: 0, destQuantity: 0, quantity: "" }]);
//           }
//         } catch (error) {
//           console.error("Error loading transfer order:", error);
//           alert("Failed to load transfer order");
//           navigate("/inventory/transfer-orders");
//         } finally {
//           setLoading(false);
//         }
//       };
//       loadTransferOrder();
//     }
//   }, [isEditMode, id, API_URL, navigate, date]);
  
//   // Clear selected items when source warehouse changes (only in create mode when user actually modifies source warehouse)
//   const prevSourceWarehouseStateRef = useRef(sourceWarehouse);
//   useEffect(() => {
//     if (!isEditMode && prevSourceWarehouseStateRef.current && prevSourceWarehouseStateRef.current !== sourceWarehouse) {
//       // Reset all table rows to clear selected items
//       setTableRows([{ 
//         id: 1, 
//         item: null, 
//         itemId: null, 
//         itemGroupId: null, 
//         itemName: "", 
//         itemSku: "", 
//         sourceQuantity: 0, 
//         destQuantity: 0, 
//         quantity: "" 
//       }]);
//     }
//     prevSourceWarehouseStateRef.current = sourceWarehouse;
//   }, [sourceWarehouse, isEditMode]);

//   // Recalculate stock for existing rows when source or destination warehouse changes
//   useEffect(() => {
//     if (tableRows.length > 0 && (sourceWarehouse || destinationWarehouse)) {
//       setTableRows(prevRows =>
//         prevRows.map(row => {
//           if (!row.item) return row;
//           const srcStock = sourceWarehouse ? getStockOnHand(row.item, sourceWarehouse) : row.sourceQuantity;
//           const dstStock = destinationWarehouse ? getStockOnHand(row.item, destinationWarehouse) : row.destQuantity;
//           return {
//             ...row,
//             sourceQuantity: srcStock !== undefined ? srcStock : row.sourceQuantity,
//             destQuantity: dstStock !== undefined ? dstStock : row.destQuantity,
//             sourceTotal: srcStock !== undefined ? srcStock : row.sourceTotal,
//           };
//         })
//       );
//     }
//   }, [sourceWarehouse, destinationWarehouse]);
  
//   // Handle item selection
//   const handleItemSelect = (rowId, item) => {
//     console.log(`🎯 handleItemSelect called for row ${rowId} with item:`, item);
//     if (!item) return;

//     const srcStock = sourceWarehouse ? getStockOnHand(item, sourceWarehouse) : 0;
//     const dstStock = destinationWarehouse ? getStockOnHand(item, destinationWarehouse) : 0;

//     setTableRows(rows => {
//       const updated = rows.map(row => {
//         if (row.id === rowId) {
//           console.log(`   ✅ Updating row ${rowId} with item:`, item, `srcStock: ${srcStock}, dstStock: ${dstStock}`);
//           return {
//             ...row,
//             item: item,
//             itemId: item._id || item.id,
//             itemGroupId: item.itemGroupId || null,
//             itemName: item.itemName || "",
//             itemSku: item.sku || "",
//             sourceQuantity: srcStock,
//             destQuantity: dstStock,
//             sourceTotal: srcStock,
//           };
//         }
//         return row;
//       });
//       console.log(`   📊 Updated rows after item select:`, updated.map(r => ({ id: r.id, itemName: r.itemName, item: r.item, srcQty: r.sourceQuantity, dstQty: r.destQuantity })));
//       return updated;
//     });
//   };
  
//   // Handle source stock fetched
//   const handleSourceStockFetched = (rowId) => (stockData) => {
//     setTableRows(rows => {
//       const updated = rows.map(row => {
//         if (row.id === rowId) {
//           const availableQty = (stockData && stockData.success && (stockData.stockOnHand !== undefined || stockData.currentQuantity !== undefined))
//             ? (stockData.stockOnHand ?? stockData.currentQuantity ?? 0)
//             : (row.item && sourceWarehouse ? getStockOnHand(row.item, sourceWarehouse) : (stockData?.stockOnHand ?? stockData?.currentQuantity ?? 0));
          
//           console.log(`📦 Source stock fetched for row ${rowId}: ${availableQty}`);
//           return {
//             ...row,
//             sourceQuantity: availableQty,
//             sourceInTransit: 0,
//             sourceDraft: 0,
//             sourceTotal: availableQty,
//           };
//         }
//         return row;
//       });
//       return updated;
//     });
//   };
  
//   // Handle destination stock fetched
//   const handleDestStockFetched = (rowId) => (stockData) => {
//     setTableRows(rows => {
//       const updated = rows.map(row => {
//         if (row.id === rowId) {
//           const availableQty = (stockData && stockData.success && (stockData.currentQuantity !== undefined || stockData.availableStock !== undefined || stockData.stockOnHand !== undefined))
//             ? (stockData.currentQuantity ?? stockData.availableStock ?? stockData.stockOnHand ?? 0)
//             : (row.item && destinationWarehouse ? getStockOnHand(row.item, destinationWarehouse) : (stockData?.currentQuantity ?? stockData?.availableStock ?? 0));
          
//           console.log(`📦 Destination stock fetched for row ${rowId}: ${availableQty}`);
//           return {
//             ...row,
//             destQuantity: availableQty,
//           };
//         }
//         return row;
//       });
//       return updated;
//     });
//   };
  
//   // Handle quantity change
//   const handleQuantityChange = (rowId, value) => {
//     const numValue = parseFloat(value) || 0;
//     setTableRows(rows =>
//       rows.map(row => {
//         if (row.id === rowId) {
//           return {
//             ...row,
//             quantity: value,
//           };
//         }
//         return row;
//       })
//     );
//   };
  
//   // Handle add row
//   const handleAddRow = () => {
//     const newId = Math.max(...tableRows.map(r => r.id), 0) + 1;
//     setTableRows([...tableRows, { 
//       id: newId, 
//       item: null, 
//       itemId: null, 
//       itemGroupId: null, 
//       itemName: "", 
//       itemSku: "", 
//       sourceQuantity: 0, 
//       destQuantity: 0, 
//       quantity: "" 
//     }]);
//   };
  
//   // Handle remove row
//   const handleRemoveRow = (rowId) => {
//     if (tableRows.length > 1) {
//       setTableRows(tableRows.filter(row => row.id !== rowId));
//     }
//   };
  
//   // Bulk Add Items functions
//   const fetchBulkItems = async () => {
//     setBulkItemsLoading(true);
//     try {
//       const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
//       const response = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
//       if (!response.ok) throw new Error("Failed to fetch items");
//       const data = await response.json();
      
//       let itemsList = [];
//       if (Array.isArray(data)) {
//         itemsList = data;
//       } else if (data.items && Array.isArray(data.items)) {
//         itemsList = data.items;
//       }
      
//       // Filter active items
//       const activeItems = itemsList.filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false");
      
//       // Filter by source warehouse if selected
//       const filteredItems = sourceWarehouse ? filterItemsByWarehouse(activeItems, sourceWarehouse) : activeItems;
      
//       setBulkItems(filteredItems);
//     } catch (error) {
//       console.error("Error fetching bulk items:", error);
//       setBulkItems([]);
//     } finally {
//       setBulkItemsLoading(false);
//     }
//   };
  
//   const filterItemsByWarehouse = (itemsList, targetWarehouse) => {
//     if (!targetWarehouse) return itemsList;
    
//     const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
    
//     // Show all items if no specific warehouse selected
//     if (targetWarehouseLower === "warehouse") {
//       return itemsList;
//     }
    
//     // For specific warehouses, show items from that warehouse (including out of stock)
//     return itemsList.filter(item => {
//       if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) {
//         return false;
//       }
      
//       return item.warehouseStocks.some(ws => {
//         if (!ws.warehouse) return false;
//         const stockWarehouse = (ws.warehouse || "").toString().toLowerCase().trim();
//         const targetLower = targetWarehouseLower.toLowerCase().trim();
        
//         return stockWarehouse === targetLower || 
//                stockWarehouse.includes(targetLower) ||
//                targetLower.includes(stockWarehouse);
//       });
//     });
//   };
  
//   const handleBulkAddClose = () => {
//     setShowBulkAddModal(false);
//     setBulkScannedItems([]);
//     setBulkScanInput("");
//     bulkScanBufferRef.current = "";
//   };
  
//   const handleBulkScanKeyDown = async (e) => {
//     if (bulkScanTimeoutRef.current) {
//       clearTimeout(bulkScanTimeoutRef.current);
//     }
    
//     const char = e.key;
    
//     if (char === "Enter") {
//       e.preventDefault();
//       const scannedCode = bulkScanBufferRef.current.trim();
      
//       if (scannedCode.length > 0) {
//         await processBulkScan(scannedCode);
//         bulkScanBufferRef.current = "";
//         setBulkScanInput("");
//       }
//       return;
//     }
    
//     if (char.length > 1) {
//       return;
//     }
    
//     bulkScanBufferRef.current += char;
//     setBulkScanInput(bulkScanBufferRef.current);
    
//     bulkScanTimeoutRef.current = setTimeout(() => {
//       bulkScanBufferRef.current = "";
//     }, 100);
//   };
  
//   const processBulkScan = async (scannedCode) => {
//     console.log(`📱 Bulk scan: "${scannedCode}"`);
    
//     try {
//       if (bulkItems.length === 0) {
//         console.log("⚠️ No items loaded yet");
//         alert("Items are still loading. Please wait.");
//         return;
//       }
      
//       const foundItem = bulkItems.find(item => 
//         item.sku && item.sku.toLowerCase() === scannedCode.toLowerCase()
//       );
      
//       if (foundItem) {
//         console.log(`✅ Found item:`, foundItem);
        
//         // Get available stock for this item
//         let availableStock = 0;
//         if (sourceWarehouse && foundItem.warehouseStocks && Array.isArray(foundItem.warehouseStocks)) {
//           const targetWarehouseLower = sourceWarehouse.toLowerCase().trim();
//           const matchingStock = foundItem.warehouseStocks.find(ws => {
//             if (!ws.warehouse) return false;
//             const stockWarehouse = (ws.warehouse || "").toString().toLowerCase().trim();
//             return stockWarehouse === targetWarehouseLower || 
//                    stockWarehouse.includes(targetWarehouseLower) ||
//                    targetWarehouseLower.includes(stockWarehouse);
//           });
          
//           if (matchingStock) {
//             availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
//           }
//         }
        
//         console.log(`📊 Available stock for ${foundItem.itemName}: ${availableStock}`);
        
//         setBulkScannedItems(prev => {
//           const existingIndex = prev.findIndex(i => i.item._id === foundItem._id);
          
//           if (existingIndex >= 0) {
//             const currentQuantity = prev[existingIndex].quantity;
//             if (currentQuantity >= availableStock) {
//               alert(`❌ Cannot add more. Only ${availableStock} pcs available for ${foundItem.itemName}`);
//               return prev;
//             }
            
//             const updated = [...prev];
//             updated[existingIndex] = {
//               ...updated[existingIndex],
//               quantity: updated[existingIndex].quantity + 1
//             };
//             console.log(`📈 Incremented quantity for ${foundItem.itemName} to ${updated[existingIndex].quantity}`);
//             return updated;
//           } else {
//             if (availableStock <= 0) {
//               alert(`❌ No stock available for ${foundItem.itemName}`);
//               return prev;
//             }
            
//             console.log(`➕ Added new item ${foundItem.itemName}`);
//             return [...prev, {
//               item: foundItem,
//               quantity: 1,
//               sku: foundItem.sku
//             }];
//           }
//         });
//       } else {
//         console.log(`❌ Item not found for SKU: "${scannedCode}"`);
//         alert(`Item with SKU "${scannedCode}" not found`);
//       }
//     } catch (error) {
//       console.error("Error processing bulk scan:", error);
//       alert("Error finding item. Please try again.");
//     }
//   };
  
//   const handleBulkAddItems = () => {
//     if (bulkScannedItems.length === 0) {
//       alert("Please scan at least one item");
//       return;
//     }
    
//     // Remove blank row if exists
//     const filtered = tableRows.filter(row => row.itemName && row.itemName.trim() !== "");
    
//     // Add scanned items to table
//     const newRows = bulkScannedItems.map((scanned, idx) => {
//       const newId = Math.max(...filtered.map(r => r.id), 0) + idx + 1;
//       return {
//         id: newId,
//         item: scanned.item,
//         itemId: scanned.item._id,
//         itemGroupId: scanned.item.itemGroupId || null,
//         itemName: scanned.item.itemName,
//         itemSku: scanned.item.sku,
//         sourceQuantity: 0,
//         destQuantity: 0,
//         quantity: scanned.quantity.toString()
//       };
//     });
    
//     setTableRows([...filtered, ...newRows]);
//     handleBulkAddClose();
//   };
  
//   // Barcode scanning functions
  
//   // Check if any item has transfer quantity exceeding source stock
//   const hasInsufficientStock = () => {
//     return tableRows.some(row => {
//       if (!row.itemName || !row.quantity) return false;
//       const transferQty = parseFloat(row.quantity) || 0;
//       const sourceStock = parseFloat(row.sourceQuantity) || 0;
//       return transferQty > sourceStock;
//     });
//   };
  
//   // Handle save
//   const handleSave = async (status = "draft") => {
//     if (!transferOrderNumber || !date || !sourceWarehouse || !destinationWarehouse) {
//       alert("Please fill in all required fields");
//       return;
//     }
    
//     if (sourceWarehouse === destinationWarehouse) {
//       alert("Source and destination warehouses cannot be the same");
//       return;
//     }
    
//     if (tableRows.length === 0 || !tableRows.some(row => row.itemName && parseFloat(row.quantity) > 0)) {
//       alert("Please add at least one item with quantity");
//       return;
//     }
    
//     setSaving(true);
//     try {
//       const items = tableRows
//         .filter(row => row.itemName && parseFloat(row.quantity) > 0)
//         .map(row => ({
//           itemId: row.itemId,
//           itemGroupId: row.itemGroupId,
//           itemName: row.itemName,
//           itemSku: row.itemSku,
//           quantity: parseFloat(row.quantity) || 0,
//           sourceQuantity: row.sourceQuantity || 0,
//           destQuantity: row.destQuantity || 0,
//         }));
      
//       const transferData = {
//         transferOrderNumber,
//         date: date ? new Date(date).toISOString() : new Date().toISOString(),
//         reason,
//         sourceWarehouse,
//         destinationWarehouse,
//         items,
//         status,
//         userId,
//       };
      
//       const url = isEditMode 
//         ? `${API_URL}/api/inventory/transfer-orders/${id}`
//         : `${API_URL}/api/inventory/transfer-orders`;
//       const method = isEditMode ? "PUT" : "POST";
      
//       const response = await fetch(url, {
//         method,
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(transferData),
//       });
      
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || "Failed to save transfer order");
//       }
      
//       const statusLabel = status === "draft" ? "Draft" : status === "in_transit" ? "In Transit" : "Transferred";
//       alert(`Transfer order ${isEditMode ? "updated" : "saved"} successfully as ${statusLabel}`);
//       navigate("/inventory/transfer-orders");
//     } catch (error) {
//       console.error("Error saving transfer order:", error);
//       alert(error.message || "Failed to save transfer order. Please try again.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   // Enter key to save transfer order - DISABLED to allow barcode scanning
//   // Users can click the save buttons instead
//   // useEnterToSave(() => handleSave("transferred"), saving, { disabled: isItemInputFocused });
  
//   if (loading) {
//     return (
//       <div className={`transition-all duration-300 p-6 bg-[#f8f9fa] min-h-screen flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
//         <div className="text-[#64748b] text-sm">Loading transfer order...</div>
//       </div>
//     );
//   }

//   return (
//     <div className={`transition-all duration-300 min-h-screen bg-[#f8f9fa] ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>

//       <div className="px-8 py-6">

//         {/* ── Top header bar ── */}
//         <div className="flex items-start justify-between mb-5">
//           <div>
//             <h1 className="text-[15px] font-bold text-[#111827] uppercase tracking-wide">
//               {isEditMode ? "EDIT TRANSFER ORDER" : "NEW TRANSFER ORDER"}
//             </h1>
//             <p className="text-xs text-[#9ca3af] mt-0.5">
//               Populate the required fields to initiate a warehouse transfer.
//             </p>
//           </div>
//           <div className="flex items-center gap-2">
//             {/* Cancel */}
//             <button
//               onClick={() => navigate("/inventory/transfer-orders")}
//               disabled={saving}
//               className="h-8 px-4 text-xs font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md disabled:opacity-50 cursor-pointer"
//             >
//               Cancel
//             </button>
//             {/* Save as Draft */}
//             <button
//               onClick={() => handleSave("draft")}
//               disabled={saving}
//               className="h-8 px-4 text-xs font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
//             >
//               <span className="text-[#9B48D7]">✦</span>
//               Save as Draft
//             </button>
//             {/* Complete Transfer (admin only) */}
//             {isAdmin && (
//               <button
//                 onClick={() => handleSave("transferred")}
//                 disabled={saving || !transferOrderNumber || !date || !sourceWarehouse || !destinationWarehouse || hasInsufficientStock()}
//                 className="h-8 px-4 text-xs font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
//                 title={hasInsufficientStock() ? "Transfer quantity exceeds source stock" : ""}
//               >
//                 Complete Transfer
//               </button>
//             )}
//             {/* Initiate Transfer */}
//             <button
//               onClick={() => handleSave("in_transit")}
//               disabled={saving || !transferOrderNumber || !date || !sourceWarehouse || !destinationWarehouse || hasInsufficientStock()}
//               className="h-8 px-5 text-xs font-semibold text-white bg-[#9B48D7] border border-[#8637c3] rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
//               title={hasInsufficientStock() ? "Transfer quantity exceeds source stock" : ""}
//             >
//               {saving ? "Saving…" : "Initiate Transfer"}
//             </button>
//           </div>
//         </div>

//         {/* ── Form card ── */}
//         <div className="bg-white border border-[#e5e7eb] rounded-md p-6 mb-4">

//           {/* Row 1: Transfer Order # + Date */}
//           <div className="grid grid-cols-2 gap-6 mb-5">
//             {/* Transfer Order Number */}
//             <div>
//               <label className="block text-xs font-medium text-[#374151] mb-1.5">
//                 Transfer Order Number <span className="text-[#ef4444]">*</span>
//               </label>
//               <div className="flex items-center h-10 border border-[#e5e7eb] rounded-md overflow-hidden bg-white focus-within:ring-1 focus-within:ring-[#9B48D7] focus-within:border-[#9B48D7]">
//                 <input
//                   value={transferOrderNumber}
//                   onChange={(e) => setTransferOrderNumber(e.target.value)}
//                   placeholder="Enter order reference"
//                   className="flex-1 h-full px-3 text-sm text-[#111827] placeholder:text-[#9ca3af] border-0 outline-none bg-transparent"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setTransferOrderNumber(`TO-${Math.floor(Math.random() * 9000 + 1000)}`)}
//                   className="h-full px-4 text-xs font-semibold text-white bg-[#9B48D7] hover:bg-[#8637c3] transition shrink-0"
//                 >
//                   Auto
//                 </button>
//               </div>
//             </div>

//             {/* Date */}
//             <div>
//               <label className="block text-xs font-medium text-[#374151] mb-1.5">
//                 Date <span className="text-[#ef4444]">*</span>
//               </label>
//               <div className="flex items-center h-10 border border-[#e5e7eb] rounded-md overflow-hidden bg-white focus-within:ring-1 focus-within:ring-[#9B48D7] focus-within:border-[#9B48D7]">
//                 <input
//                   type="date"
//                   value={date}
//                   onChange={(e) => setDate(e.target.value)}
//                   className="flex-1 h-full px-3 text-sm text-[#111827] border-0 outline-none bg-transparent"
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Row 2: Source Warehouse + Swap + Destination Warehouse */}
//           <div className="grid grid-cols-[1fr_40px_1fr] items-end gap-3 mb-5">
//             {/* Source Warehouse */}
//             <div>
//               <label className="block text-xs font-medium text-[#374151] mb-1.5">
//                 Source Warehouse <span className="text-[#ef4444]">*</span>
//               </label>
//               {!isAdmin ? (
//                 <div className="h-10 flex items-center px-3 border border-[#e5e7eb] rounded-md bg-[#f9fafb] text-sm text-[#374151]">
//                   {sourceWarehouse || "—"}
//                 </div>
//               ) : (
//                 <WarehouseDropdown
//                   value={sourceWarehouse}
//                   onChange={(e) => setSourceWarehouse(e.target.value)}
//                   options={warehouseOptions}
//                   placeholder="Select Source Warehouse"
//                   required
//                 />
//               )}
//             </div>

//             {/* Swap button */}
//             <div className="flex items-end justify-center pb-0.5">
//               <button
//                 type="button"
//                 onClick={() => {
//                   setSourceWarehouse(destinationWarehouse);
//                   setDestinationWarehouse(sourceWarehouse);
//                 }}
//                 title="Swap warehouses"
//                 style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, maxWidth: 32, maxHeight: 32 }}
//                 className="flex items-center justify-center rounded bg-[#9B48D7] text-white cursor-pointer"
//               >
//                 <ArrowLeftRight size={13} strokeWidth={2.5} />
//               </button>
//             </div>

//             {/* Destination Warehouse */}
//             <div>
//               <label className="block text-xs font-medium text-[#374151] mb-1.5">
//                 Destination Warehouse <span className="text-[#ef4444]">*</span>
//               </label>
//               <WarehouseDropdown
//                 value={destinationWarehouse}
//                 onChange={(e) => setDestinationWarehouse(e.target.value)}
//                 options={warehouseOptions}
//                 placeholder="Select Destination Warehouse"
//                 required
//               />
//             </div>
//           </div>

//           {/* Row 3: Description */}
//           <div>
//             <label className="block text-xs font-medium text-[#374151] mb-1.5">Description</label>
//             <textarea
//               rows={4}
//               value={reason}
//               onChange={(e) => setReason(e.target.value)}
//               placeholder="Describe the transfer reason"
//               maxLength={500}
//               className="w-full border border-[#e5e7eb] rounded-md px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] resize-none focus:outline-none focus:ring-1 focus:ring-[#9B48D7] focus:border-[#9B48D7]"
//             />
//             <div className="text-right text-[10px] text-[#9ca3af] mt-1">Maximum 500 characters</div>
//           </div>
//         </div>

//         {/* ── Store Order Request Banner ── */}
//         {storeOrderPrefillInfo && (
//           <div className="mb-4 rounded-xl border border-[#e9d5ff] bg-[#fbf7ff] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
//             <div className="flex items-center gap-3">
//               <div className="w-9 h-9 rounded-lg bg-[#9B48D7] text-white flex items-center justify-center shrink-0 shadow-xs">
//                 <Package size={18} />
//               </div>
//               <div>
//                 <div className="text-xs font-bold uppercase tracking-wider text-[#9B48D7]">
//                   Store Order {storeOrderPrefillInfo.orderNumber ? `#${storeOrderPrefillInfo.orderNumber}` : ''} Requested Groups
//                 </div>
//                 <div className="text-xs text-[#4b5563] mt-0.5">
//                   Select the specific item/variant from each requested group below:
//                 </div>
//               </div>
//             </div>
//             <div className="flex flex-wrap items-center gap-2">
//               {(storeOrderPrefillInfo.requestedItems || []).map((req, idx) => (
//                 <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-[#7e22ce] border border-[#d8b4fe] shadow-xs">
//                   <span className="font-semibold">{req.itemName || "Item Group"}</span>
//                   <span className="text-[#9333ea] bg-[#f3e8ff] px-1.5 py-0.5 rounded font-bold">Qty: {req.quantity || 1}</span>
//                 </span>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* ── Item table card ── */}
//         <div className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden">
//           {/* Table header */}
//           <div className="bg-[#111827] grid grid-cols-[40px_1fr_260px_220px_48px] items-center px-4 py-3 gap-3">
//             <div>
//               <input type="checkbox" className="h-4 w-4 rounded accent-[#9B48D7] cursor-pointer" />
//             </div>
//             <div className="text-[10px] font-semibold tracking-widest text-[#9ca3af] uppercase">Item Details</div>
//             <div className="text-[10px] font-semibold tracking-widest text-[#9ca3af] uppercase">Current Available</div>
//             <div className="text-[10px] font-semibold tracking-widest text-[#9ca3af] uppercase">Transfer Quantity</div>
//             <div />
//           </div>

//           {/* Table rows */}
//           {tableRows.map((row) => {
//             const transferQty = parseFloat(row.quantity) || 0;
//             const sourceStock = parseFloat(row.sourceQuantity) || 0;
//             const exceedsStock = transferQty > 0 && transferQty > sourceStock;

//             return (
//               <div key={row.id} className="grid grid-cols-[40px_1fr_260px_220px_48px] items-center px-4 py-3 gap-3 border-t border-[#f3f4f6] hover:bg-[#fafafa]">
//                 {/* Checkbox */}
//                 <div>
//                   <input type="checkbox" className="h-4 w-4 rounded accent-[#9B48D7] cursor-pointer" />
//                 </div>

//                 {/* Item dropdown */}
//                 <div>
//                   <ItemDropdown
//                     rowId={row.id}
//                     value={row.item}
//                     onChange={(item) => handleItemSelect(row.id, item)}
//                     sourceWarehouse={sourceWarehouse}
//                     destinationWarehouse={destinationWarehouse}
//                     onSourceStockFetched={handleSourceStockFetched(row.id)}
//                     onDestStockFetched={handleDestStockFetched(row.id)}
//                     isStoreUser={!isAdmin}
//                     userWarehouse={userWarehouse}
//                     onFocusChange={setIsItemInputFocused}
//                     isEditMode={isEditMode}
//                     orderId={id}
//                     requestedHint={row.requestedGroupName}
//                     requestedGroupId={row.itemGroupId}
//                   />
//                   {row.requestedGroupName && !row.item && (
//                     <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#7c3aed] font-medium bg-[#f5f3ff] px-2 py-0.5 rounded border border-[#ddd6fe] inline-flex">
//                       <span>Requested: <strong>{row.requestedGroupName}</strong></span>
//                       {row.requestedQuantity && <span className="text-[#9333ea] font-bold">({row.requestedQuantity} pcs)</span>}
//                     </div>
//                   )}
//                 </div>

//                 {/* Stock availability */}
//                 <div className="flex gap-4">
//                   <div>
//                     <div className="text-[9px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-0.5">Source Stock</div>
//                     <div className={`text-sm font-semibold ${row.sourceQuantity === 0 ? 'text-[#ef4444]' : 'text-[#111827]'}`}>
//                       {Math.round(row.sourceQuantity)} Units
//                     </div>
//                   </div>
//                   <div>
//                     <div className="text-[9px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-0.5">Destination Stock</div>
//                     <div className="text-sm font-semibold text-[#111827]">
//                       {Math.round(row.destQuantity)} Units
//                     </div>
//                   </div>
//                 </div>

//                 {/* Transfer quantity */}
//                 <div>
//                   <div className={`flex items-center gap-1.5 h-9 border rounded-md px-2 ${exceedsStock ? 'border-[#ef4444] bg-[#fef2f2]' : 'border-[#e5e7eb] bg-white'}`}>
//                     <input
//                       type="number"
//                       value={row.quantity}
//                       onChange={(e) => handleQuantityChange(row.id, e.target.value)}
//                       placeholder="0"
//                       min="0"
//                       step="1"
//                       className={`flex-1 border-0 outline-none text-sm text-right bg-transparent ${exceedsStock ? 'text-[#ef4444]' : 'text-[#111827]'}`}
//                     />
//                     <span className={`text-xs shrink-0 ${exceedsStock ? 'text-[#ef4444]' : 'text-[#9ca3af]'}`}>Units</span>
//                   </div>
//                   {exceedsStock && (
//                     <p className="text-[10px] text-[#ef4444] mt-0.5">Exceeds stock ({Math.round(sourceStock)} avail.)</p>
//                   )}
//                 </div>

//                 {/* Delete */}
//                 <div className="flex justify-center">
//                   <button
//                     type="button"
//                     onClick={() => handleRemoveRow(row.id)}
//                     className="w-8 h-8 flex items-center justify-center rounded-md bg-[#fef2f2] text-[#ef4444] hover:bg-[#fee2e2] transition"
//                   >
//                     <Trash2 size={14} />
//                   </button>
//                 </div>
//               </div>
//             );
//           })}

//           {/* Add row / Bulk Add */}
//           <div className="flex items-center gap-3 px-4 py-3 border-t border-[#f3f4f6]">
//             <button
//               type="button"
//               onClick={handleAddRow}
//               className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-md hover:bg-[#f9fafb] transition cursor-pointer"
//             >
//               <Plus size={13} />
//               New Row
//             </button>
//             <button
//               type="button"
//               onClick={() => {
//                 if (!sourceWarehouse) { alert("Please select a source warehouse first"); return; }
//                 setShowBulkAddModal(true);
//                 fetchBulkItems();
//               }}
//               className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-md hover:bg-[#f9fafb] transition cursor-pointer"
//             >
//               <Plus size={13} />
//               Bulk Add Items
//             </button>
//           </div>
//         </div>

//       </div>

//       {/* Bulk Add Modal */}
//       {showBulkAddModal && createPortal(
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
//           <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-[#e5e7eb] max-h-[90vh] overflow-hidden flex flex-col">
//             {/* Header */}
//             <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4 bg-white">
//               <h2 className="text-lg font-semibold text-[#1f2937]">Add Items in Bulk</h2>
//               <button
//                 onClick={handleBulkAddClose}
//                 className="text-[#6b7280] hover:text-[#1f2937] hover:bg-[#f3f4f6] p-1 rounded-md transition-colors"
//               >
//                 <X size={20} />
//               </button>
//             </div>

//             {/* Content - Two Column Layout */}
//             <div className="flex-1 overflow-hidden flex">
//               {/* Left Column - Items List */}
//               <div className="flex-1 flex flex-col border-r border-[#e5e7eb]">
//                 {/* Search/Scan Input */}
//                 <div className="border-b border-[#e5e7eb] p-4 bg-[#f9fafb]">
//                   <input
//                     ref={bulkScanInputRef}
//                     type="text"
//                     value={bulkScanInput}
//                     onKeyDown={handleBulkScanKeyDown}
//                     placeholder="Type to search or scan the barcode of the item"
//                     className="w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-2.5 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
//                     autoFocus
//                   />
//                 </div>

//                 {/* Items List */}
//                 <div className="flex-1 overflow-y-auto">
//                   {bulkItemsLoading ? (
//                     <div className="text-center py-8 text-[#6b7280]">Loading items...</div>
//                   ) : bulkItems.length === 0 ? (
//                     <div className="text-center py-8 text-[#6b7280]">No items available in {sourceWarehouse}</div>
//                   ) : (
//                     <div className="p-3 space-y-2">
//                       {bulkItems.map((item) => {
//                         const isSelected = bulkScannedItems.some(s => s.item._id === item._id);
                        
//                         // Calculate available stock
//                         let availableStock = 0;
//                         if (sourceWarehouse && item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
//                           const targetWarehouseLower = sourceWarehouse.toLowerCase().trim();
//                           const matchingStock = item.warehouseStocks.find(ws => {
//                             if (!ws.warehouse) return false;
//                             const stockWarehouse = (ws.warehouse || "").toString().toLowerCase().trim();
//                             return stockWarehouse === targetWarehouseLower || 
//                                    stockWarehouse.includes(targetWarehouseLower) ||
//                                    targetWarehouseLower.includes(stockWarehouse);
//                           });
                          
//                           if (matchingStock) {
//                             availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
//                           }
//                         }
                        
//                         const isOutOfStock = availableStock <= 0;
                        
//                         return (
//                           <div
//                             key={item._id}
//                             onClick={() => !isOutOfStock && processBulkScan(item.sku)}
//                             className={`p-3 rounded-lg border transition-all ${
//                               isOutOfStock
//                                 ? 'border-[#fecaca] bg-[#fef2f2] cursor-not-allowed opacity-75'
//                                 : isSelected
//                                 ? 'border-[#2563eb] bg-[#eff6ff] cursor-pointer'
//                                 : 'border-[#e5e7eb] bg-white hover:border-[#2563eb] hover:bg-[#f0f9ff] cursor-pointer'
//                             }`}
//                           >
//                             <div className="flex items-start justify-between">
//                               <div className="flex-1 min-w-0">
//                                 <div className={`font-medium text-sm ${
//                                   isOutOfStock 
//                                     ? 'text-[#991b1b]' 
//                                     : isSelected 
//                                     ? 'text-[#1e40af]' 
//                                     : 'text-[#1f2937]'
//                                 }`}>
//                                   {item.itemName}
//                                 </div>
//                                 <div className="text-xs text-[#6b7280] mt-0.5">
//                                   SKU: {item.sku || 'N/A'}
//                                 </div>
//                               </div>
//                               <div className="text-right ml-2 flex-shrink-0">
//                                 <div className="text-xs text-[#6b7280]">Stock on Hand</div>
//                                 {isOutOfStock ? (
//                                   <div className="text-sm font-semibold text-[#ef4444]">
//                                     No Stock
//                                   </div>
//                                 ) : (
//                                   <div className="text-sm font-semibold text-[#10b981]">
//                                     {availableStock.toFixed(2)} pcs
//                                   </div>
//                                 )}
//                               </div>
//                             </div>
//                           </div>
//                         );
//                       })}
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Right Column - Selected Items */}
//               <div className="w-80 flex flex-col bg-[#f9fafb]">
//                 {/* Header */}
//                 <div className="border-b border-[#e5e7eb] px-4 py-3 bg-white">
//                   <div className="flex items-center justify-between mb-2">
//                     <span className="text-sm font-semibold text-[#1f2937]">Selected Items</span>
//                     <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-[#e5e7eb] text-xs font-semibold text-[#374151] rounded-full">
//                       {bulkScannedItems.length}
//                     </span>
//                   </div>
//                   <div className="flex items-center justify-between">
//                     <span className="text-xs text-[#6b7280]">Total Quantity</span>
//                     <span className="text-sm font-semibold text-[#1f2937]">{bulkScannedItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
//                   </div>
//                 </div>

//                 {/* Selected Items List */}
//                 <div className="flex-1 overflow-y-auto p-3">
//                   {bulkScannedItems.length === 0 ? (
//                     <div className="flex items-center justify-center h-full text-center">
//                       <div>
//                         <div className="text-4xl mb-2">📋</div>
//                         <div className="text-sm text-[#6b7280]">No items selected yet</div>
//                       </div>
//                     </div>
//                   ) : (
//                     <div className="space-y-2">
//                       {bulkScannedItems.map((scanned, idx) => (
//                         <div key={idx} className="bg-white border border-[#e5e7eb] rounded-lg p-3">
//                           <div className="flex items-start justify-between mb-2">
//                             <div className="flex-1 min-w-0">
//                               <div className="font-medium text-sm text-[#1f2937] truncate">
//                                 {scanned.item.itemName}
//                               </div>
//                               <div className="text-xs text-[#6b7280] mt-0.5">
//                                 SKU: {scanned.item.sku || 'N/A'}
//                               </div>
//                             </div>
//                             <button
//                               onClick={() => {
//                                 setBulkScannedItems(prev => prev.filter((_, i) => i !== idx));
//                               }}
//                               className="text-[#ef4444] hover:bg-[#fef2f2] p-1 rounded transition-colors flex-shrink-0"
//                             >
//                               <X size={16} />
//                             </button>
//                           </div>
                          
//                           {/* Quantity Controls */}
//                           <div className="flex items-center gap-2">
//                             <button
//                               onClick={() => {
//                                 if (scanned.quantity > 1) {
//                                   setBulkScannedItems(prev => {
//                                     const updated = [...prev];
//                                     updated[idx].quantity -= 1;
//                                     return updated;
//                                   });
//                                 }
//                               }}
//                               className="w-6 h-6 rounded border border-[#d1d5db] flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] transition-colors text-sm"
//                               disabled={scanned.quantity <= 1}
//                             >
//                               −
//                             </button>
//                             <input
//                               type="number"
//                               value={scanned.quantity}
//                               onChange={(e) => {
//                                 const qty = Math.max(1, parseInt(e.target.value) || 1);
//                                 setBulkScannedItems(prev => {
//                                   const updated = [...prev];
//                                   updated[idx].quantity = qty;
//                                   return updated;
//                                 });
//                               }}
//                               className="w-12 h-6 text-center text-sm border border-[#d1d5db] rounded focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]/20"
//                               min="1"
//                             />
//                             <button
//                               onClick={() => {
//                                 setBulkScannedItems(prev => {
//                                   const updated = [...prev];
//                                   updated[idx].quantity += 1;
//                                   return updated;
//                                 });
//                               }}
//                               className="w-6 h-6 rounded border border-[#d1d5db] flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] transition-colors text-sm"
//                             >
//                               +
//                             </button>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Footer */}
//             <div className="border-t border-[#e5e7eb] bg-white px-6 py-4 flex items-center justify-end gap-3">
//               <button
//                 onClick={handleBulkAddClose}
//                 className="rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleBulkAddItems}
//                 disabled={bulkScannedItems.length === 0}
//                 className="rounded-lg bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-6 py-2 text-sm font-medium text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 Add Items
//               </button>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}
//     </div>
//   );
// };

// export default TransferOrderCreate;



import { useState, useEffect, useRef, useMemo } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search, X, Plus, Trash2, ArrowLeftRight, Package } from "lucide-react";
import Head from "../components/Head";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";

const Label = ({ children, required = false }) => (
  <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${required ? "text-[#ef4444]" : "text-[#64748b]"}`}>
    {children}
    {required && <span className="ml-0.5">*</span>}
  </span>
);

const Input = ({ placeholder = "", className = "", ...props }) => {
  const baseClasses = "w-full rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors";
  const tableInputClasses = "h-[36px] px-[10px] py-[6px]";
  const defaultClasses = "px-3 py-2.5";

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

// Warehouse Dropdown Component
const WarehouseDropdown = ({ value, onChange, options, placeholder = "Select warehouse...", required = false }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 250;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    setDropdownPos({
      top: openUpward ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
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

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLabel = value || placeholder;

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
      <div className="rounded-lg shadow-lg bg-white border border-[#d7dcf5] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-2 py-1.5 bg-[#fafbff]">
          <Search size={12} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="h-7 w-full border-none bg-transparent text-xs text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="py-1 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d3d3d3 #f5f5f5' }}>
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#64748b] text-center">No options found</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option === value;
              return (
                <div
                  key={option}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange({ target: { value: option } });
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange({ target: { value: option } });
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`px-3 py-1.5 text-sm cursor-pointer transition-colors ${isSelected
                    ? "bg-[#2563eb] text-white"
                    : "text-[#1f2937] hover:bg-[#f1f5f9]"
                    }`}
                >
                  {option}
                </div>
              );
            })
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
          className="w-full h-10 rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors cursor-pointer px-3 py-2.5 pr-8 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px_16px] bg-[right_0.5rem_center] bg-no-repeat"
        />
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// Shared helper to get stock on hand for an item or item group in a specific warehouse
const getStockOnHand = (item, warehouse) => {
  if (!item || !warehouse) return 0;

  // Normalize warehouse names for matching
  const normalizedWarehouse = mapWarehouse(warehouse);
  const warehouseLower = (normalizedWarehouse || warehouse || "").toLowerCase().trim();
  const warehouseBase = warehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();

  // 1. Direct warehouseStocks array (standalone item or item group)
  if (item.warehouseStocks && Array.isArray(item.warehouseStocks) && item.warehouseStocks.length > 0) {
    let totalStock = 0;
    let found = false;
    for (const ws of item.warehouseStocks) {
      if (!ws.warehouse) continue;
      const wsWarehouseRaw = ws.warehouse.toString().trim();
      const normalizedWs = mapWarehouse(wsWarehouseRaw);
      const wsWarehouse = (normalizedWs || wsWarehouseRaw || "").toLowerCase().trim();
      const wsBase = wsWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();

      let matches = false;
      if (wsWarehouse === warehouseLower) {
        matches = true;
      } else if (wsBase && warehouseBase && wsBase === warehouseBase) {
        matches = true;
      } else if (
        (wsWarehouse.includes(warehouseLower) || warehouseLower.includes(wsWarehouse)) &&
        !(warehouseLower === "warehouse" && wsWarehouse !== "warehouse") &&
        !(wsWarehouse === "warehouse" && warehouseLower !== "warehouse")
      ) {
        matches = true;
      }

      if (matches) {
        totalStock += (parseFloat(ws.stockOnHand) || 0);
        found = true;
      }
    }
    if (found) return totalStock;
  }

  // 2. Item group with itemsList or items array
  const variants = Array.isArray(item.itemsList) ? item.itemsList : (Array.isArray(item.items) ? item.items : []);
  if (variants.length > 0) {
    let groupTotal = 0;
    for (const variant of variants) {
      if (variant.warehouseStocks && Array.isArray(variant.warehouseStocks)) {
        for (const ws of variant.warehouseStocks) {
          if (!ws.warehouse) continue;
          const wsWarehouseRaw = ws.warehouse.toString().trim();
          const normalizedWs = mapWarehouse(wsWarehouseRaw);
          const wsWarehouse = (normalizedWs || wsWarehouseRaw || "").toLowerCase().trim();
          const wsBase = wsWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();

          let matches = false;
          if (wsWarehouse === warehouseLower) {
            matches = true;
          } else if (wsBase && warehouseBase && wsBase === warehouseBase) {
            matches = true;
          } else if (
            (wsWarehouse.includes(warehouseLower) || warehouseLower.includes(wsWarehouse)) &&
            !(warehouseLower === "warehouse" && wsWarehouse !== "warehouse") &&
            !(wsWarehouse === "warehouse" && warehouseLower !== "warehouse")
          ) {
            matches = true;
          }

          if (matches) {
            groupTotal += (parseFloat(ws.stockOnHand) || 0);
          }
        }
      }
    }
    return groupTotal;
  }

  return 0;
};

// Helper to check if an item is already selected in another row
const isItemAlreadySelected = (item, selectedList = []) => {
  if (!item || !selectedList || selectedList.length === 0) return false;

  const itemId = item._id || item.id || item.itemId;
  const itemSku = (item.sku || item.itemSku || "").trim().toLowerCase();
  const itemName = (item.itemName || item.name || "").trim().toLowerCase();
  const itemGroupId = item.itemGroupId;

  return selectedList.some((selected) => {
    if (!selected) return false;
    const selId = selected._id || selected.id || selected.itemId;
    const selSku = (selected.sku || selected.itemSku || "").trim().toLowerCase();
    const selName = (selected.itemName || selected.name || "").trim().toLowerCase();
    const selGroupId = selected.itemGroupId;

    // Match by ID if both have valid ID
    if (itemId && selId && String(itemId) === String(selId)) {
      return true;
    }
    // Match by SKU if both have non-empty SKU
    if (itemSku && selSku && itemSku === selSku) {
      return true;
    }
    // Match by group and item name if same group
    if (itemGroupId && selGroupId && String(itemGroupId) === String(selGroupId) && itemName && selName && itemName === selName) {
      return true;
    }
    // Match by item name if neither has groupId and neither has SKU
    if (!itemGroupId && !selGroupId && !itemSku && !selSku && itemName && selName && itemName === selName) {
      return true;
    }

    return false;
  });
};

// ItemDropdown Component - filters items by warehouse (same logic as SalesInvoiceCreate)
const ItemDropdown = ({
  rowId,
  value,
  onChange,
  sourceWarehouse,
  destinationWarehouse,
  onSourceStockFetched,
  onDestStockFetched,
  isStoreUser = false,
  userWarehouse = "",
  onFocusChange,
  isEditMode = false,
  orderId = null,
  requestedHint = "",
  requestedGroupId = null,
  selectedItems = []
}) => {
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
  const [displayedCount, setDisplayedCount] = useState(20); // Show 20 items initially
  const ITEMS_PER_PAGE = 20;

  // Barcode scanning state
  const [inputValue, setInputValue] = useState("");
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
  const autoSelectTimerRef = useRef(null);

  // Filter items by warehouse (for transfer orders, show ALL items regardless of stock)
  const filterItemsByWarehouse = (itemsList, targetWarehouse) => {
    if (!targetWarehouse) return itemsList;

    const targetWarehouseLower = targetWarehouse.toLowerCase().trim();

    // If "Warehouse" is selected (main warehouse view), show ALL items - NO FILTERING
    // This shows combined stock from all warehouses
    if (targetWarehouseLower === "warehouse") {
      console.log("🏢 Warehouse selected - showing ALL items without filtering (combined stock)");
      console.log(`   Total items to show: ${itemsList.length}`);
      return itemsList; // Return all items without any filtering
    }

    // For specific branches/stores, show ALL items that exist in that warehouse
    // (regardless of stock availability - users might want to transfer zero-stock items)
    const filtered = itemsList.filter(item => {
      if (item.warehouseStocks && Array.isArray(item.warehouseStocks) && item.warehouseStocks.length > 0) {
        const hasMatch = item.warehouseStocks.some(ws => {
          if (!ws.warehouse) return false;
          const stockWarehouseRaw = (ws.warehouse || "").toString().trim();
          const stockWarehouse = stockWarehouseRaw.toLowerCase().trim();

          // For store users - NEVER show warehouse stock (confidential)
          if (isStoreUser && (stockWarehouse === "warehouse" || stockWarehouse.includes("warehouse"))) {
            return false;
          }

          if (stockWarehouse === targetWarehouseLower) return true;

          const stockBase = stockWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
          const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
          if (stockBase && targetBase && stockBase === targetBase) return true;

          if (stockWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(stockWarehouse)) return true;
          return false;
        });
        if (hasMatch) return true;
      }
      return false;
    });

    console.log(`🔍 Filtered items for "${targetWarehouse}": ${filtered.length} items`);
    return filtered;
  };

  // Fetch items only (fetch all active items and filter client-side)
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
        if (!response.ok) throw new Error("Failed to fetch items");
        const data = await response.json();

        let itemsList = [];
        if (Array.isArray(data)) {
          itemsList = data;
        } else if (data.items && Array.isArray(data.items)) {
          itemsList = data.items;
        } else if (data.data && Array.isArray(data.data)) {
          itemsList = data.data;
        }

        const activeItems = itemsList
          .filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false")
          .map((item) => ({
            _id: item._id || item.id,
            id: item._id || item.id,
            itemName: item.itemName || item.name || "",
            sku: item.sku || "",
            size: item.size || "",
            costPrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || 0,
            warehouseStocks: item.warehouseStocks || [],
            itemGroupId: item.itemGroupId || null,
            groupName: item.itemGroupName || item.groupName || null,
            isFromGroup: !!item.isFromGroup,
            isGroup: false,
            isActive: true,
          }));

        console.log(`📦 Fetched ${activeItems.length} active items`);

        // Filter by warehouse if source warehouse is selected
        const filteredItems = sourceWarehouse ? filterItemsByWarehouse(activeItems, sourceWarehouse) : [];
        console.log(`🏢 Items after warehouse filter (${sourceWarehouse || 'none'}): ${filteredItems.length}`);

        setItems(filteredItems);
      } catch (error) {
        console.error("Error fetching items:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [sourceWarehouse, API_URL]);



  useEffect(() => {
    console.log(`🔄 ItemDropdown: value changed:`, value);
    if (value) {
      if (typeof value === 'object' && value !== null) {
        console.log(`   Setting selectedItem to object:`, value);
        setSelectedItem(value);
      } else if (items.length > 0) {
        const item = items.find((i) => i._id === value || i.itemName === value);
        console.log(`   Found item by ID/name:`, item);
        setSelectedItem(item || null);
      } else {
        console.log(`   Items not loaded yet, clearing selectedItem`);
        setSelectedItem(null);
      }
    } else {
      console.log(`   Value is empty, clearing selectedItem`);
      setSelectedItem(null);
    }
  }, [value, items]);

  // Store callbacks in refs to avoid infinite loops
  const onSourceStockFetchedRef = useRef(onSourceStockFetched);
  const onDestStockFetchedRef = useRef(onDestStockFetched);
  useEffect(() => {
    onSourceStockFetchedRef.current = onSourceStockFetched;
    onDestStockFetchedRef.current = onDestStockFetched;
  }, [onSourceStockFetched, onDestStockFetched]);

  // Track previous values to prevent duplicate fetches
  const prevItemRef = useRef(null);
  const prevSourceWarehouseRef = useRef(null);
  const prevDestWarehouseRef = useRef(null);

  // Fetch stock for both warehouses when item or warehouses change
  useEffect(() => {
    const itemKey = selectedItem
      ? (selectedItem.isFromGroup
        ? `${selectedItem.itemGroupId}-${selectedItem.itemName}-${selectedItem.sku || ''}`
        : selectedItem._id)
      : null;

    if (!selectedItem) {
      console.log(`⚠️ No item selected, skipping stock fetch`);
      prevItemRef.current = itemKey;
      prevSourceWarehouseRef.current = sourceWarehouse;
      prevDestWarehouseRef.current = destinationWarehouse;
      return;
    }

    if (!sourceWarehouse || !destinationWarehouse) {
      console.log(`⚠️ Warehouses not selected (source: "${sourceWarehouse}", dest: "${destinationWarehouse}"), skipping stock fetch`);
      prevItemRef.current = itemKey;
      prevSourceWarehouseRef.current = sourceWarehouse;
      prevDestWarehouseRef.current = destinationWarehouse;
      return;
    }

    console.log(`🔄 Triggering stock fetch for item "${selectedItem.itemName}" (source: "${sourceWarehouse}", dest: "${destinationWarehouse}")`);

    // Skip if nothing changed
    if (itemKey === prevItemRef.current &&
      sourceWarehouse === prevSourceWarehouseRef.current &&
      destinationWarehouse === prevDestWarehouseRef.current) {
      return;
    }

    prevItemRef.current = itemKey;
    prevSourceWarehouseRef.current = sourceWarehouse;
    prevDestWarehouseRef.current = destinationWarehouse;

    const fetchStock = async (warehouse, callback) => {
      if (!warehouse) {
        console.warn(`⚠️ No warehouse provided for stock fetch`);
        if (callback) callback(0);
        return;
      }

      const localStock = getStockOnHand(selectedItem, warehouse);

      try {
        const params = new URLSearchParams({ warehouse });

        if (selectedItem.isGroup) {
          params.append('itemGroupId', selectedItem.itemGroupId || selectedItem._id);
          params.append('isGroup', 'true');
        } else if (selectedItem.isFromGroup) {
          params.append('itemGroupId', selectedItem.itemGroupId);
          params.append('itemName', selectedItem.itemName);
          if (selectedItem.sku) params.append('itemSku', selectedItem.sku);
        } else {
          params.append('itemId', selectedItem._id);
        }

        // Exclude current order ID when in edit mode to avoid counting its own draft quantity
        if (isEditMode && orderId) {
          params.append('excludeOrderId', orderId);
        }

        const fullUrl = `${API_URL}/api/inventory/transfer-orders/stock/item?${params}`;
        console.log(`\n📡 Fetching stock for "${selectedItem.itemName}" in warehouse "${warehouse}"`);
        console.log(`   URL: ${fullUrl}`);

        const response = await fetch(fullUrl);
        console.log(`   Response status: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const stockData = await response.json();
          console.log(`✅ Stock data received:`, stockData);

          if (stockData && stockData.success) {
            if (callback) callback(stockData);
          } else {
            console.log(`⚠️ API returned success: false for "${selectedItem.itemName}", falling back to local stock: ${localStock}`);
            if (callback) callback({ success: true, stockOnHand: localStock, currentQuantity: localStock, availableStock: localStock });
          }
        } else {
          console.error(`❌ Failed to fetch stock (${response.status}), falling back to local stock: ${localStock}`);
          if (callback) {
            callback({ success: true, stockOnHand: localStock, currentQuantity: localStock, availableStock: localStock });
          }
        }
      } catch (error) {
        console.error("❌ Error fetching stock:", error);
        if (callback) callback({ success: true, stockOnHand: localStock, currentQuantity: localStock, availableStock: localStock });
      }
    };

    // Fetch stock for both warehouses
    console.log(`🚀 About to fetch stock - callbacks:`, {
      onSourceStockFetched: !!onSourceStockFetchedRef.current,
      onDestStockFetched: !!onDestStockFetchedRef.current
    });

    fetchStock(sourceWarehouse, onSourceStockFetchedRef.current);
    fetchStock(destinationWarehouse, onDestStockFetchedRef.current);
  }, [selectedItem, sourceWarehouse, destinationWarehouse, API_URL, isEditMode, orderId]);

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownMaxHeight = 380;
    const spaceBelow = viewportHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;

    const dropdownWidth = Math.max(rect.width, 420);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownWidth - 16));

    // Open upward if space below is too small and there is more space above
    const openUpward = spaceBelow < 320 && spaceAbove > spaceBelow;
    const availableHeight = openUpward ? spaceAbove : spaceBelow;
    const computedMaxHeight = Math.max(160, Math.min(dropdownMaxHeight, availableHeight));

    const top = openUpward
      ? Math.max(8, rect.top - computedMaxHeight - 4)
      : rect.bottom + 4;

    setDropdownPos({
      top: top,
      left: left,
      width: dropdownWidth,
      maxHeight: computedMaxHeight,
      openUpward: openUpward,
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

  const isMatchRequested = (item) => {
    if (!requestedHint && !requestedGroupId) return false;
    if (requestedGroupId && item.itemGroupId && String(item.itemGroupId) === String(requestedGroupId)) return true;
    if (requestedHint) {
      const hintLower = requestedHint.toLowerCase().trim();
      const groupName = (item.groupName || "").toLowerCase().trim();
      const itemName = (item.itemName || "").toLowerCase().trim();
      if (groupName && (groupName === hintLower || groupName.includes(hintLower) || hintLower.includes(groupName))) return true;
      if (itemName && (itemName.includes(hintLower) || hintLower.includes(itemName))) return true;
    }
    return false;
  };

  const filteredItems = useMemo(() => {
    let result = items;

    // Filter out items already selected in other rows
    if (selectedItems && selectedItems.length > 0) {
      result = result.filter(item => !isItemAlreadySelected(item, selectedItems));
    }

    if (searchTerm && searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase().trim();
      result = result.filter((item) => {
        const itemName = (item?.itemName || "").toLowerCase();
        const sku = (item?.sku || "").toLowerCase();
        const groupName = (item?.groupName || "").toLowerCase();

        return itemName.includes(searchLower) ||
          sku.includes(searchLower) ||
          groupName.includes(searchLower);
      });
    }

    // If requestedHint/groupId is present, sort matching items to the very top
    if (requestedHint || requestedGroupId) {
      const matching = [];
      const others = [];
      result.forEach(item => {
        if (isMatchRequested(item)) {
          matching.push(item);
        } else {
          others.push(item);
        }
      });
      return [...matching, ...others];
    }

    return result;
  }, [items, searchTerm, requestedHint, requestedGroupId, selectedItems]);

  const handleSelectItem = (item) => {
    console.log(`🎯 handleSelectItem called with:`, item);
    setSelectedItem(item);
    onChange(item);
    setIsOpen(false);
    setSearchTerm("");
    setInputValue("");
  };

  // Auto-select when only one item matches (for barcode scanning)
  useEffect(() => {
    // Only auto-select if:
    // 1. Dropdown is open
    // 2. There's a search term (user typed/scanned something)
    // 3. Exactly 1 filtered item
    // 4. Not already processing
    if (isOpen && searchTerm && searchTerm.length >= 3 && filteredItems.length === 1 && !isProcessingBarcode) {
      console.log(`🎯 AUTO-SELECT: Only 1 item matches "${searchTerm}"`);
      console.log(`   Item:`, filteredItems[0]);

      // Auto-select after 300ms to ensure user finished typing
      const timer = setTimeout(() => {
        console.log(`✅ AUTO-SELECTING single match:`, filteredItems[0]);
        setIsProcessingBarcode(true);
        handleSelectItem(filteredItems[0]);
        setTimeout(() => setIsProcessingBarcode(false), 300);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isOpen, searchTerm, filteredItems, isProcessingBarcode]);

  // Reset pagination when search term changes
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [searchTerm]);

  // Debug: Log when filteredItems or displayedCount changes
  useEffect(() => {
    console.log(`📊 Dropdown state: displayedCount=${displayedCount}, filteredItems=${filteredItems.length}, showLoadMore=${displayedCount < filteredItems.length}`);
  }, [displayedCount, filteredItems.length]);

  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: `${dropdownPos.top}px`,
        left: `${dropdownPos.left}px`,
        width: `${dropdownPos.width}px`,
        maxHeight: `${dropdownPos.maxHeight || 380}px`,
        zIndex: 999999,
      }}
    >
      <div
        className="rounded-lg shadow-2xl bg-white border border-[#e5e7eb] flex flex-col overflow-hidden"
        style={{ width: '100%', maxHeight: `${dropdownPos.maxHeight || 380}px` }}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-3 py-2 bg-white">
          <Search size={16} className="text-[#9ca3af]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={requestedHint ? `Search in "${requestedHint}" or all items...` : "Search items..."}
            className="h-8 w-full border-none bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>

        {/* Store Order Request Hint banner inside dropdown */}
        {requestedHint && !searchTerm && (
          <div className="px-3 py-1.5 bg-[#fbf5ff] border-b border-[#eedbf8] text-[11px] font-semibold text-[#862ea7] flex items-center justify-between">
            <span>Requested Group: <strong>{requestedHint}</strong></span>
            <span className="text-[10px] text-[#9333ea] bg-white px-1.5 py-0.5 rounded border border-[#eedbf8]">Items listed first</span>
          </div>
        )}

        {/* List of items */}
        <div
          className="py-1 overflow-y-auto overflow-x-hidden flex-1"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db #f9fafb'
          }}
        >
          {loading ? (
            <div className="px-3 py-6 text-center text-sm text-[#6b7280]">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[#6b7280]">
              {searchTerm
                ? "No matches found"
                : sourceWarehouse
                  ? `No items available in ${sourceWarehouse}`
                  : "No items available"}
            </div>
          ) : (
            <>
              {/* Render paginated items */}
              {filteredItems.slice(0, displayedCount).map((item) => {
                try {
                  const isSelected = selectedItem && (
                    (selectedItem._id && selectedItem._id === item._id) ||
                    (selectedItem.itemName && selectedItem.itemName === item.itemName && selectedItem.sku === item.sku)
                  );
                  const isMatchReq = isMatchRequested(item);
                  // For store users, show stock from their warehouse (or source warehouse if selected)
                  // For admin, show stock from source warehouse
                  const displayWarehouse = (isStoreUser && userWarehouse) ? userWarehouse : (sourceWarehouse || "");
                  const stockOnHand = getStockOnHand(item, displayWarehouse);

                  return (
                    <div
                      key={item._id || item.sku || item.itemName || Math.random()}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectItem(item);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectItem(item);
                      }}
                      className={`px-3 py-2.5 cursor-pointer transition-colors border-b border-[#f3f4f6] last:border-b-0 ${isSelected
                        ? "bg-[#eff6ff] text-[#1e40af]"
                        : isMatchReq
                          ? "bg-[#faf5ff] hover:bg-[#f3e8ff]"
                          : "hover:bg-[#f9fafb]"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${isSelected ? "text-[#1e40af]" : "text-[#111827]"}`}>
                            {item.itemName || "Unnamed Item"}
                          </div>
                          <div className={`text-xs mt-1 flex items-center gap-1.5 flex-wrap ${isSelected ? "text-[#1e40af]" : "text-[#64748b]"}`}>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isSelected ? "bg-blue-200 text-blue-800" : "bg-blue-100 text-blue-700"}`}>
                              ITEM
                            </span>
                            {item.groupName && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-purple-100 text-purple-700">
                                {item.groupName}
                              </span>
                            )}
                            {item.size ? <span>• Size: {item.size}</span> : null}
                            {item.sku ? <span>• SKU: {item.sku}</span> : null}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <div className={`text-[10px] uppercase tracking-wider ${isSelected ? "text-[#3b82f6]" : "text-[#9ca3af]"}`}>
                            Current Stock
                          </div>
                          {Number(stockOnHand) > 0 ? (
                            <div className={`text-sm font-semibold mt-0.5 ${isSelected ? "text-[#1e40af]" : "text-[#059669]"}`}>
                              {(Number(stockOnHand) || 0).toFixed(2)} pcs
                            </div>
                          ) : (
                            <div className={`text-sm font-semibold mt-0.5 ${isSelected ? "text-[#dc2626]" : "text-[#dc2626]"}`}>
                              0.00 pcs
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } catch (error) {
                  console.error("Error rendering item:", error, item);
                  return (
                    <div
                      key={item._id || item.itemName || Math.random()}
                      className="px-3 py-2.5 text-red-500 text-sm"
                    >
                      Error loading item: {item.itemName || "Unknown"}
                    </div>
                  );
                }
              })}

            </>
          )}
        </div>

        {/* Sticky Load More Button - Always visible at bottom */}
        {!loading && filteredItems.length > 0 && displayedCount < filteredItems.length && (
          <div className="sticky bottom-0 px-3 py-2 border-t border-[#e5e7eb] text-center bg-white">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`📄 Load More clicked: ${displayedCount} → ${displayedCount + ITEMS_PER_PAGE} of ${filteredItems.length}`);
                setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
              }}
              onClick={(e) => {
                e.stopPropagation();
                console.log(`📄 Load More clicked: ${displayedCount} → ${displayedCount + ITEMS_PER_PAGE} of ${filteredItems.length}`);
                setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
              }}
              className="w-full px-3 py-2 text-xs font-medium text-[#2563eb] hover:bg-[#f3f4f6] rounded transition-colors"
            >
              Load More ({displayedCount} of {filteredItems.length})
            </button>
          </div>
        )}

        {/* Items count info - Sticky at bottom when all loaded */}
        {!loading && displayedCount >= filteredItems.length && filteredItems.length > 0 && (
          <div className="sticky bottom-0 px-3 py-1.5 border-t border-[#e5e7eb] text-center text-[10px] text-[#6b7280] bg-white">
            Showing all {filteredItems.length} items
          </div>
        )}
      </div>
    </div>
  ) : null;

  // Handle barcode input in the text field
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // Clear any existing auto-select timer
    if (autoSelectTimerRef.current) {
      clearTimeout(autoSelectTimerRef.current);
    }

    // If user is typing normally, show dropdown with search
    if (value.length > 0) {
      setSearchTerm(value);
      setIsOpen(true);

      // Auto-select after 500ms of no input (barcode scanner finishes typing)
      // Increased to 500ms to ensure scanner has finished
      if (value.length >= 3) { // Reduced minimum length to 3
        autoSelectTimerRef.current = setTimeout(() => {
          console.log(`⏱️ ========== AUTO-SELECT TIMER FIRED ==========`);
          console.log(`   Input value: "${value}"`);
          console.log(`   Available items count:`, items.length);
          console.log(`   Items sample:`, items.slice(0, 3).map(i => ({ sku: i.sku, name: i.itemName })));

          // Try exact SKU match first
          const exactMatch = items.find(item =>
            item.sku && item.sku.toLowerCase() === value.toLowerCase()
          );

          if (exactMatch) {
            if (isItemAlreadySelected(exactMatch, selectedItems)) {
              alert(`Item "${exactMatch.itemName}" (${exactMatch.sku}) is already selected in another row.`);
              setInputValue("");
              setSearchTerm("");
              setIsOpen(false);
              return;
            }
            console.log(`✅ ========== EXACT SKU MATCH FOUND ==========`);
            console.log(`   Item:`, exactMatch);
            setIsProcessingBarcode(true);
            // Use handleSelectItem for consistent behavior
            handleSelectItem(exactMatch);
            setTimeout(() => setIsProcessingBarcode(false), 300);
            return;
          }

          console.log(`   No exact SKU match, trying filtered search...`);

          // If no exact match, try first filtered item (which already excludes selectedItems)
          if (filteredItems.length > 0) {
            console.log(`✅ ========== FIRST FILTERED MATCH FOUND ==========`);
            console.log(`   Item:`, filteredItems[0]);
            setIsProcessingBarcode(true);
            // Use handleSelectItem for consistent behavior
            handleSelectItem(filteredItems[0]);
            setTimeout(() => setIsProcessingBarcode(false), 300);
          } else {
            console.log(`❌ ========== NO MATCHES FOUND ==========`);
            console.log(`   Search value: "${value}"`);
          }
        }, 500); // Increased to 500ms
      }
    } else {
      setIsOpen(false);
    }
  };

  const handleKeyDown = async (e) => {
    // Handle Enter key - select first item from filtered results
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      console.log(`🔑 ENTER KEY PRESSED`);
      console.log(`   Input value: "${inputValue}"`);
      console.log(`   Is processing barcode: ${isProcessingBarcode}`);

      // If we're already processing a barcode, ignore this Enter
      if (isProcessingBarcode) {
        console.log(`⏳ Already processing barcode, ignoring Enter`);
        return;
      }

      const scannedCode = inputValue.trim();
      console.log(`📱 Enter pressed with value: "${scannedCode}"`);

      // If input is empty, don't do anything
      if (!scannedCode || scannedCode.length < 3) {
        console.log(`⚠️ Input too short, ignoring Enter`);
        return;
      }

      setIsProcessingBarcode(true);

      console.log(`🔍 Searching for item with code: "${scannedCode}"`);
      console.log(`   Available items: ${items.length}`);

      // First, try to find exact SKU match
      const exactMatch = items.find(item =>
        item.sku && item.sku.toLowerCase() === scannedCode.toLowerCase()
      );

      if (exactMatch) {
        if (isItemAlreadySelected(exactMatch, selectedItems)) {
          alert(`Item "${exactMatch.itemName}" (${exactMatch.sku}) is already selected in another row.`);
          setInputValue("");
          setSearchTerm("");
          setIsOpen(false);
          setIsProcessingBarcode(false);
          return;
        }
        console.log(`✅ ENTER - Exact SKU match found:`, exactMatch);
        handleSelectItem(exactMatch);
        setTimeout(() => setIsProcessingBarcode(false), 300);
        return;
      }

      console.log(`   No exact match, trying filtered items...`);

      // Then try first item in filtered results
      if (filteredItems && filteredItems.length > 0) {
        const firstMatch = filteredItems[0];
        console.log(`✅ ENTER - Selecting first match from dropdown:`, firstMatch);

        // Call the item select handler
        handleSelectItem(firstMatch);
        setTimeout(() => setIsProcessingBarcode(false), 300);
        return;
      }

      console.log(`   No filtered items, searching via API...`);

      // If no dropdown results, search via API
      console.log(`🔍 No dropdown results, searching via API: ${scannedCode}`);
      await handleBarcodeScanned(scannedCode);
      setTimeout(() => setIsProcessingBarcode(false), 300);

      return;
    }
  };

  // Handle barcode scanning for this specific row
  const handleBarcodeScanned = async (scannedSku) => {
    console.log(`🔍 Processing scanned SKU in row ${rowId}: "${scannedSku}"`);

    try {
      const itemsResponse = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
      if (itemsResponse.ok) {
        const data = await itemsResponse.json();
        const itemsList = Array.isArray(data) ? data : (data.items || data.data || []);
        const foundItem = itemsList.find(item =>
          (item.sku && item.sku.toLowerCase() === scannedSku.toLowerCase()) ||
          (item.itemName && item.itemName.toLowerCase().includes(scannedSku.toLowerCase())) ||
          (item.name && item.name.toLowerCase().includes(scannedSku.toLowerCase()))
        );
        if (foundItem) {
          if (isItemAlreadySelected(foundItem, selectedItems)) {
            alert(`Item "${foundItem.itemName || foundItem.name}" (${foundItem.sku}) is already selected in another row.`);
            setInputValue("");
            setSearchTerm("");
            setIsOpen(false);
            return;
          }
          const itemObj = {
            _id: foundItem._id || foundItem.id,
            id: foundItem._id || foundItem.id,
            itemName: foundItem.itemName || foundItem.name,
            sku: foundItem.sku || "",
            size: foundItem.size || "",
            itemGroupId: foundItem.itemGroupId || null,
            groupName: foundItem.itemGroupName || foundItem.groupName || null,
            isFromGroup: !!foundItem.isFromGroup,
            isGroup: false,
            warehouseStocks: foundItem.warehouseStocks || [],
          };

          console.log(`✅ Found item, calling onChange with:`, itemObj);

          // Call onChange to populate the row - this triggers handleItemSelect
          onChange(itemObj);

          // Close dropdown and clear input
          setIsOpen(false);
          setInputValue("");
          setSearchTerm("");
          setSelectedItem(itemObj);

          return;
        }
      }

      // Item not found
      console.log(`❌ Item not found for SKU: "${scannedSku}"`);
      alert(`Item with SKU "${scannedSku}" not found`);
      setInputValue("");
      setSearchTerm("");
    } catch (error) {
      console.error("Error searching for item:", error);
      alert("Error searching for item. Please try again.");
      setInputValue("");
      setSearchTerm("");
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSelectTimerRef.current) {
        clearTimeout(autoSelectTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="relative w-full overflow-visible m-0 p-0">
        <input
          ref={buttonRef}
          onClick={toggleDropdown}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            console.log(`🎯 Input FOCUSED`);
            onFocusChange && onFocusChange(true);
          }}
          onBlur={(e) => {
            console.log(`👋 Input BLURRED, value: "${inputValue}"`);

            // Small delay to allow click events to fire first
            setTimeout(() => {
              // If there's a value, no item selected yet, and dropdown is open, try to auto-select
              if (!selectedItem && inputValue && inputValue.length >= 3 && isOpen) {
                console.log(`🔍 Blur auto-select triggered for: "${inputValue}"`);

                // Try exact SKU match
                const exactMatch = items.find(item =>
                  item.sku && item.sku.toLowerCase() === inputValue.toLowerCase()
                );

                if (exactMatch) {
                  if (!isItemAlreadySelected(exactMatch, selectedItems)) {
                    console.log(`✅ BLUR - Exact match found:`, exactMatch);
                    handleSelectItem(exactMatch);
                  } else {
                    alert(`Item "${exactMatch.itemName}" (${exactMatch.sku}) is already selected in another row.`);
                    setInputValue("");
                    setSearchTerm("");
                    setIsOpen(false);
                  }
                } else if (filteredItems && filteredItems.length > 0) {
                  console.log(`✅ BLUR - First filtered match:`, filteredItems[0]);
                  handleSelectItem(filteredItems[0]);
                }
              }

              onFocusChange && onFocusChange(false);
            }, 150);
          }}
          type="text"
          placeholder="Type or scan barcode to select item..."
          value={selectedItem ? selectedItem.itemName : inputValue}
          data-handle-enter="true"
          className="w-full h-[36px] rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors cursor-text px-[10px] py-[6px]"
        />
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

const TransferOrderCreate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isSidebarOpen = useSidebar();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const isEditMode = !!id;

  // Get user info
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.email || user?._id || user?.id || "";
  const isAdmin = user?.power === "admin";
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
  const [transferOrderNumber, setTransferOrderNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [sourceWarehouse, setSourceWarehouse] = useState("");
  const [destinationWarehouse, setDestinationWarehouse] = useState("");
  const [tableRows, setTableRows] = useState([{
    id: 1,
    item: null,
    itemId: null,
    itemGroupId: null,
    itemName: "",
    itemSku: "",
    sourceQuantity: 0,
    sourceInTransit: 0,
    sourceDraft: 0,
    sourceTotal: 0,
    destQuantity: 0,
    quantity: "",
    requestedGroupName: "",
    requestedQuantity: ""
  }]);
  const [storeOrderPrefillInfo, setStoreOrderPrefillInfo] = useState(null);
  const [isItemInputFocused, setIsItemInputFocused] = useState(false);

  // Bulk Add Items states
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkScanInput, setBulkScanInput] = useState("");
  const [bulkScannedItems, setBulkScannedItems] = useState([]); // Array of {item, quantity, sku}
  const [bulkItems, setBulkItems] = useState([]); // All items for bulk add modal
  const [bulkItemsLoading, setBulkItemsLoading] = useState(false);
  const bulkScanInputRef = useRef(null);
  const bulkScanBufferRef = useRef("");
  const bulkScanTimeoutRef = useRef(null);

  // Warehouse options (same as branch options)
  const warehouseOptions = [
    "Brides Berry",
    "Warehouse",
  ];

  // Set default source warehouse for store users
  useEffect(() => {
    if (!isEditMode && !isAdmin && userWarehouse) {
      setSourceWarehouse(userWarehouse);
      console.log(`📍 Auto-setting source warehouse to user's warehouse: "${userWarehouse}"`);
    }
  }, [isEditMode, isAdmin, userWarehouse]);

  // Check for pre-filled data from Store Order (Accept button)
  useEffect(() => {
    if (!isEditMode) {
      const prefillData = sessionStorage.getItem('transferOrderPrefill');
      if (prefillData) {
        try {
          const data = JSON.parse(prefillData);
          console.log('📋 Pre-filling transfer order from store order:', data);

          // Set warehouses first
          const srcWarehouse = data.sourceWarehouse || "Warehouse";
          const destWarehouse = data.destinationWarehouse || "";

          setSourceWarehouse(srcWarehouse);
          setDestinationWarehouse(destWarehouse);
          setReason(data.reason || "");

          const requestedList = (data.requestedItems && data.requestedItems.length > 0)
            ? data.requestedItems
            : (data.items && data.items.length > 0 ? data.items : []);

          if (data.storeOrderNumber || requestedList.length > 0) {
            setStoreOrderPrefillInfo({
              orderNumber: data.storeOrderNumber || "",
              storeOrderId: data.storeOrderId || "",
              requestedItems: requestedList,
            });
          }

          // Populate rows with requested items/group hints so user can manually select the specific item
          setTimeout(() => {
            if (requestedList.length > 0) {
              setTableRows(requestedList.map((req, idx) => ({
                id: idx + 1,
                item: null,
                itemId: null,
                itemGroupId: req.itemGroupId || null,
                itemName: "",
                itemSku: "",
                requestedGroupName: req.itemName || "",
                requestedQuantity: req.quantity || "",
                sourceQuantity: 0,
                destQuantity: 0,
                sourceTotal: 0,
                quantity: req.quantity ? req.quantity.toString() : "",
              })));
            } else {
              setTableRows([{
                id: 1,
                item: null,
                itemId: null,
                itemGroupId: null,
                itemName: "",
                itemSku: "",
                requestedGroupName: "",
                requestedQuantity: "",
                sourceQuantity: 0,
                destQuantity: 0,
                sourceTotal: 0,
                quantity: "",
              }]);
            }
          }, 100);

          // Clear the session storage after using it
          sessionStorage.removeItem('transferOrderPrefill');
        } catch (error) {
          console.error('Error parsing prefill data:', error);
          sessionStorage.removeItem('transferOrderPrefill');
        }
      }
    }
  }, [isEditMode]);

  // Load transfer order data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadTransferOrder = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/api/inventory/transfer-orders/${id}`);
          if (!response.ok) throw new Error("Failed to load transfer order");
          const data = await response.json();

          setTransferOrderNumber(data.transferOrderNumber || "");
          setDate(data.date ? new Date(data.date).toISOString().split('T')[0] : date);
          setReason(data.reason || "");
          setSourceWarehouse(data.sourceWarehouse || "");
          setDestinationWarehouse(data.destinationWarehouse || "");

          if (data.items && Array.isArray(data.items)) {
            const rows = data.items.map((item, index) => ({
              id: index + 1,
              item: {
                _id: item.itemId || item.itemGroupId,
                id: item.itemId || item.itemGroupId,
                itemName: item.itemName,
                sku: item.itemSku || "",
                itemGroupId: item.itemGroupId,
                isFromGroup: !!item.itemGroupId,
                isGroup: !item.itemId || item.itemId === item.itemGroupId,
              },
              itemId: item.itemId,
              itemGroupId: item.itemGroupId,
              itemName: item.itemName,
              itemSku: item.itemSku || "",
              sourceQuantity: item.sourceQuantity || 0,
              destQuantity: item.destQuantity || 0,
              quantity: item.quantity?.toString() || "",
            }));
            setTableRows(rows.length > 0 ? rows : [{ id: 1, item: null, itemId: null, itemGroupId: null, itemName: "", itemSku: "", sourceQuantity: 0, destQuantity: 0, quantity: "" }]);
          }
        } catch (error) {
          console.error("Error loading transfer order:", error);
          alert("Failed to load transfer order");
          navigate("/inventory/transfer-orders");
        } finally {
          setLoading(false);
        }
      };
      loadTransferOrder();
    }
  }, [isEditMode, id, API_URL, navigate, date]);

  // Clear selected items when source warehouse changes (only in create mode when user actually modifies source warehouse)
  const prevSourceWarehouseStateRef = useRef(sourceWarehouse);
  useEffect(() => {
    if (!isEditMode && prevSourceWarehouseStateRef.current && prevSourceWarehouseStateRef.current !== sourceWarehouse) {
      // Reset all table rows to clear selected items
      setTableRows([{
        id: 1,
        item: null,
        itemId: null,
        itemGroupId: null,
        itemName: "",
        itemSku: "",
        sourceQuantity: 0,
        destQuantity: 0,
        quantity: ""
      }]);
    }
    prevSourceWarehouseStateRef.current = sourceWarehouse;
  }, [sourceWarehouse, isEditMode]);

  // Recalculate stock for existing rows when source or destination warehouse changes
  useEffect(() => {
    if (tableRows.length > 0 && (sourceWarehouse || destinationWarehouse)) {
      setTableRows(prevRows =>
        prevRows.map(row => {
          if (!row.item) return row;
          const srcStock = sourceWarehouse ? getStockOnHand(row.item, sourceWarehouse) : row.sourceQuantity;
          const dstStock = destinationWarehouse ? getStockOnHand(row.item, destinationWarehouse) : row.destQuantity;
          return {
            ...row,
            sourceQuantity: srcStock !== undefined ? srcStock : row.sourceQuantity,
            destQuantity: dstStock !== undefined ? dstStock : row.destQuantity,
            sourceTotal: srcStock !== undefined ? srcStock : row.sourceTotal,
          };
        })
      );
    }
  }, [sourceWarehouse, destinationWarehouse]);

  // Handle item selection
  const handleItemSelect = (rowId, item) => {
    console.log(`🎯 handleItemSelect called for row ${rowId} with item:`, item);
    if (!item) return;

    // Check if this item is already selected in another row
    const otherRows = tableRows.filter(r => r.id !== rowId);
    const isDuplicate = otherRows.some(r => isItemAlreadySelected(item, [{
      _id: r.itemId || r.item?._id || r.item?.id,
      id: r.itemId || r.item?._id || r.item?.id,
      itemId: r.itemId || r.item?._id || r.item?.id,
      sku: r.itemSku || r.item?.sku,
      itemSku: r.itemSku || r.item?.sku,
      itemName: r.itemName || r.item?.itemName,
      name: r.itemName || r.item?.itemName,
      itemGroupId: r.itemGroupId || r.item?.itemGroupId,
    }]));

    if (isDuplicate) {
      alert(`Item "${item.itemName || item.name}" (${item.sku || ''}) is already selected in another row.`);
      return;
    }

    const srcStock = sourceWarehouse ? getStockOnHand(item, sourceWarehouse) : 0;
    const dstStock = destinationWarehouse ? getStockOnHand(item, destinationWarehouse) : 0;

    setTableRows(rows => {
      const updated = rows.map(row => {
        if (row.id === rowId) {
          console.log(`   ✅ Updating row ${rowId} with item:`, item, `srcStock: ${srcStock}, dstStock: ${dstStock}`);
          const defaultQty = row.quantity && parseFloat(row.quantity) > 0 
            ? row.quantity 
            : (row.requestedQuantity && parseFloat(row.requestedQuantity) > 0 ? row.requestedQuantity.toString() : "1");
          return {
            ...row,
            item: item,
            itemId: item._id || item.id,
            itemGroupId: item.itemGroupId || null,
            itemName: item.itemName || "",
            itemSku: item.sku || "",
            sourceQuantity: srcStock,
            destQuantity: dstStock,
            sourceTotal: srcStock,
            quantity: defaultQty,
          };
        }
        return row;
      });
      console.log(`   📊 Updated rows after item select:`, updated.map(r => ({ id: r.id, itemName: r.itemName, item: r.item, srcQty: r.sourceQuantity, dstQty: r.destQuantity, qty: r.quantity })));
      return updated;
    });
  };

  // Handle source stock fetched
  const handleSourceStockFetched = (rowId) => (stockData) => {
    setTableRows(rows => {
      const updated = rows.map(row => {
        if (row.id === rowId) {
          const availableQty = (stockData && stockData.success && (stockData.stockOnHand !== undefined || stockData.currentQuantity !== undefined))
            ? (stockData.stockOnHand ?? stockData.currentQuantity ?? 0)
            : (row.item && sourceWarehouse ? getStockOnHand(row.item, sourceWarehouse) : (stockData?.stockOnHand ?? stockData?.currentQuantity ?? 0));

          console.log(`📦 Source stock fetched for row ${rowId}: ${availableQty}`);
          return {
            ...row,
            sourceQuantity: availableQty,
            sourceInTransit: 0,
            sourceDraft: 0,
            sourceTotal: availableQty,
          };
        }
        return row;
      });
      return updated;
    });
  };

  // Handle destination stock fetched
  const handleDestStockFetched = (rowId) => (stockData) => {
    setTableRows(rows => {
      const updated = rows.map(row => {
        if (row.id === rowId) {
          const availableQty = (stockData && stockData.success && (stockData.currentQuantity !== undefined || stockData.availableStock !== undefined || stockData.stockOnHand !== undefined))
            ? (stockData.currentQuantity ?? stockData.availableStock ?? stockData.stockOnHand ?? 0)
            : (row.item && destinationWarehouse ? getStockOnHand(row.item, destinationWarehouse) : (stockData?.currentQuantity ?? stockData?.availableStock ?? 0));

          console.log(`📦 Destination stock fetched for row ${rowId}: ${availableQty}`);
          return {
            ...row,
            destQuantity: availableQty,
          };
        }
        return row;
      });
      return updated;
    });
  };

  // Handle quantity change
  const handleQuantityChange = (rowId, value) => {
    const numValue = parseFloat(value) || 0;
    setTableRows(rows =>
      rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            quantity: value,
          };
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
      sourceQuantity: 0,
      destQuantity: 0,
      quantity: ""
    }]);
  };

  // Handle remove row
  const handleRemoveRow = (rowId) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter(row => row.id !== rowId));
    }
  };

  // Bulk Add Items functions
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

      // Filter by source warehouse if selected
      const filteredItems = sourceWarehouse ? filterItemsByWarehouse(activeItems, sourceWarehouse) : activeItems;

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

    // Show all items if no specific warehouse selected
    if (targetWarehouseLower === "warehouse") {
      return itemsList;
    }

    // For specific warehouses, show items from that warehouse (including out of stock)
    return itemsList.filter(item => {
      if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) {
        return false;
      }

      return item.warehouseStocks.some(ws => {
        if (!ws.warehouse) return false;
        const stockWarehouse = (ws.warehouse || "").toString().toLowerCase().trim();
        const targetLower = targetWarehouseLower.toLowerCase().trim();

        return stockWarehouse === targetLower ||
          stockWarehouse.includes(targetLower) ||
          targetLower.includes(stockWarehouse);
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
    if (bulkScanTimeoutRef.current) {
      clearTimeout(bulkScanTimeoutRef.current);
    }

    const char = e.key;

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

    if (char.length > 1) {
      return;
    }

    bulkScanBufferRef.current += char;
    setBulkScanInput(bulkScanBufferRef.current);

    bulkScanTimeoutRef.current = setTimeout(() => {
      bulkScanBufferRef.current = "";
    }, 100);
  };

  const processBulkScan = async (scannedCode) => {
    console.log(`📱 Bulk scan: "${scannedCode}"`);

    try {
      if (bulkItems.length === 0) {
        console.log("⚠️ No items loaded yet");
        alert("Items are still loading. Please wait.");
        return;
      }

      const foundItem = bulkItems.find(item =>
        item.sku && item.sku.toLowerCase() === scannedCode.toLowerCase()
      );

      if (foundItem) {
        console.log(`✅ Found item:`, foundItem);

        // Get available stock for this item using standard helper
        const availableStock = sourceWarehouse ? getStockOnHand(foundItem, sourceWarehouse) : 0;

        console.log(`📊 Available stock for ${foundItem.itemName}: ${availableStock}`);

        if (availableStock <= 0) {
          alert(`❌ No stock available for "${foundItem.itemName}" in ${sourceWarehouse || "selected warehouse"}.`);
          return;
        }

        setBulkScannedItems(prev => {
          const existingIndex = prev.findIndex(i => 
            (i.item._id && foundItem._id && String(i.item._id) === String(foundItem._id)) ||
            (i.item.sku && foundItem.sku && i.item.sku.toLowerCase() === foundItem.sku.toLowerCase())
          );

          if (existingIndex >= 0) {
            const currentQuantity = prev[existingIndex].quantity;
            if (currentQuantity >= availableStock) {
              alert(`❌ Cannot add more. Only ${availableStock} pcs available for "${foundItem.itemName}".`);
              return prev;
            }

            return prev.map((item, idx) => {
              if (idx === existingIndex) {
                return {
                  ...item,
                  quantity: Math.min(availableStock, (item.quantity || 0) + 1)
                };
              }
              return item;
            });
          } else {
            console.log(`➕ Added new item ${foundItem.itemName}`);
            return [...prev, {
              item: foundItem,
              quantity: 1,
              sku: foundItem.sku
            }];
          }
        });
      } else {
        console.log(`❌ Item not found for SKU: "${scannedCode}"`);
        alert(`Item with SKU "${scannedCode}" not found`);
      }
    } catch (error) {
      console.error("Error processing bulk scan:", error);
      alert("Error finding item. Please try again.");
    }
  };

  const handleBulkAddItems = () => {
    if (bulkScannedItems.length === 0) {
      alert("Please scan at least one item");
      return;
    }

    // Keep existing non-empty rows
    const existingRows = [...tableRows.filter(row => row.itemName && row.itemName.trim() !== "")];

    // For each bulk scanned item, check if it already exists in existingRows
    const rowsToAdd = [];

    bulkScannedItems.forEach((scanned) => {
      const existingIdx = existingRows.findIndex(row =>
        (row.itemId && scanned.item._id && String(row.itemId) === String(scanned.item._id)) ||
        (row.itemSku && scanned.item.sku && row.itemSku.toLowerCase() === scanned.item.sku.toLowerCase()) ||
        (row.itemName && scanned.item.itemName && row.itemName.toLowerCase() === scanned.item.itemName.toLowerCase())
      );

      if (existingIdx >= 0) {
        // Merge quantity
        const existingQty = parseFloat(existingRows[existingIdx].quantity) || 0;
        const newQty = existingQty + scanned.quantity;
        existingRows[existingIdx] = {
          ...existingRows[existingIdx],
          quantity: newQty.toString(),
        };
      } else {
        rowsToAdd.push({
          item: scanned.item,
          itemId: scanned.item._id,
          itemGroupId: scanned.item.itemGroupId || null,
          itemName: scanned.item.itemName,
          itemSku: scanned.item.sku,
          sourceQuantity: sourceWarehouse ? getStockOnHand(scanned.item, sourceWarehouse) : 0,
          destQuantity: destinationWarehouse ? getStockOnHand(scanned.item, destinationWarehouse) : 0,
          quantity: scanned.quantity.toString()
        });
      }
    });

    let currentMaxId = existingRows.reduce((max, r) => Math.max(max, r.id || 0), 0);
    const newRows = rowsToAdd.map(row => {
      currentMaxId += 1;
      return {
        ...row,
        id: currentMaxId,
      };
    });

    const finalRows = [...existingRows, ...newRows];
    setTableRows(finalRows.length > 0 ? finalRows : [{
      id: 1,
      item: null,
      itemId: null,
      itemGroupId: null,
      itemName: "",
      itemSku: "",
      sourceQuantity: 0,
      destQuantity: 0,
      quantity: ""
    }]);
    handleBulkAddClose();
  };

  // Barcode scanning functions

  // Check if any item has transfer quantity exceeding source stock (including aggregated totals across rows)
  const hasInsufficientStock = () => {
    const itemTotals = {};
    for (const row of tableRows) {
      if (!row.itemName || !row.quantity) continue;
      const transferQty = parseFloat(row.quantity) || 0;
      const sourceStock = parseFloat(row.sourceQuantity) || 0;
      if (transferQty <= 0) continue;

      const key = (row.itemId || row.itemSku || row.itemName).toString().toLowerCase();
      if (!itemTotals[key]) {
        itemTotals[key] = {
          transferQty: 0,
          sourceStock: sourceStock,
          itemName: row.itemName,
        };
      }
      itemTotals[key].transferQty += transferQty;
      if (itemTotals[key].transferQty > itemTotals[key].sourceStock) {
        return true;
      }
    }
    return false;
  };

  // Handle save
  const handleSave = async (status = "draft") => {
    if (!transferOrderNumber || !date || !sourceWarehouse || !destinationWarehouse) {
      alert("Please fill in all required fields");
      return;
    }

    if (sourceWarehouse === destinationWarehouse) {
      alert("Source and destination warehouses cannot be the same");
      return;
    }

    if (tableRows.length === 0 || !tableRows.some(row => row.itemName && parseFloat(row.quantity) > 0)) {
      alert("Please add at least one item with quantity");
      return;
    }

    // Check for duplicate items across rows
    const seenItems = new Map();
    for (const row of tableRows) {
      if (row.itemName && parseFloat(row.quantity) > 0) {
        const itemKey = (row.itemId || row.itemSku || row.itemName).toString().toLowerCase();
        if (seenItems.has(itemKey)) {
          alert(`Duplicate item "${row.itemName}" found in transfer order. Please combine the quantities into a single row.`);
          return;
        }
        seenItems.set(itemKey, row.itemName);
      }
    }

    if (hasInsufficientStock()) {
      alert("Transfer quantity exceeds available stock in source warehouse for one or more items.");
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
          sourceQuantity: row.sourceQuantity || 0,
          destQuantity: row.destQuantity || 0,
        }));

      const transferData = {
        transferOrderNumber,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        reason,
        sourceWarehouse,
        destinationWarehouse,
        items,
        status,
        userId,
      };

      const url = isEditMode
        ? `${API_URL}/api/inventory/transfer-orders/${id}`
        : `${API_URL}/api/inventory/transfer-orders`;
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transferData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save transfer order");
      }

      const statusLabel = status === "draft" ? "Draft" : status === "in_transit" ? "In Transit" : "Transferred";
      alert(`Transfer order ${isEditMode ? "updated" : "saved"} successfully as ${statusLabel}`);
      navigate("/inventory/transfer-orders");
    } catch (error) {
      console.error("Error saving transfer order:", error);
      alert(error.message || "Failed to save transfer order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Enter key to save transfer order - DISABLED to allow barcode scanning
  // Users can click the save buttons instead
  // useEnterToSave(() => handleSave("transferred"), saving, { disabled: isItemInputFocused });

  if (loading) {
    return (
      <div className={`transition-all duration-300 p-6 bg-[#f8f9fa] min-h-screen flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="text-[#64748b] text-sm">Loading transfer order...</div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 min-h-screen bg-[#f8f9fa] ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>

      <div className="px-8 py-6">

        {/* ── Top header bar ── */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-[15px] font-bold text-[#111827] uppercase tracking-wide">
              {isEditMode ? "EDIT TRANSFER ORDER" : "NEW TRANSFER ORDER"}
            </h1>
            <p className="text-xs text-[#9ca3af] mt-0.5">
              Populate the required fields to initiate a warehouse transfer.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Cancel */}
            <button
              onClick={() => navigate("/inventory/transfer-orders")}
              disabled={saving}
              className="h-8 px-4 text-xs font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            {/* Save as Draft */}
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="h-8 px-4 text-xs font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-[#9B48D7]">✦</span>
              Save as Draft
            </button>
            {/* Complete Transfer (admin only) */}
            {isAdmin && (
              <button
                onClick={() => handleSave("transferred")}
                disabled={saving || !transferOrderNumber || !date || !sourceWarehouse || !destinationWarehouse || hasInsufficientStock()}
                className="h-8 px-4 text-xs font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title={hasInsufficientStock() ? "Transfer quantity exceeds source stock" : ""}
              >
                Complete Transfer
              </button>
            )}
            {/* Initiate Transfer */}
            <button
              onClick={() => handleSave("in_transit")}
              disabled={saving || !transferOrderNumber || !date || !sourceWarehouse || !destinationWarehouse || hasInsufficientStock()}
              className="h-8 px-5 text-xs font-semibold text-white bg-[#9B48D7] border border-[#8637c3] rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title={hasInsufficientStock() ? "Transfer quantity exceeds source stock" : ""}
            >
              {saving ? "Saving…" : "Initiate Transfer"}
            </button>
          </div>
        </div>

        {/* ── Form card ── */}
        <div className="bg-white border border-[#e5e7eb] rounded-md p-6 mb-4">

          {/* Row 1: Transfer Order # + Date */}
          <div className="grid grid-cols-2 gap-6 mb-5">
            {/* Transfer Order Number */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">
                Transfer Order Number <span className="text-[#ef4444]">*</span>
              </label>
              <div className="flex items-center h-10 border border-[#e5e7eb] rounded-md overflow-hidden bg-white focus-within:ring-1 focus-within:ring-[#9B48D7] focus-within:border-[#9B48D7]">
                <input
                  value={transferOrderNumber}
                  onChange={(e) => setTransferOrderNumber(e.target.value)}
                  placeholder="Enter order reference"
                  className="flex-1 h-full px-3 text-sm text-[#111827] placeholder:text-[#9ca3af] border-0 outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setTransferOrderNumber(`TO-${Math.floor(Math.random() * 9000 + 1000)}`)}
                  className="h-full px-4 text-xs font-semibold text-white bg-[#9B48D7] hover:bg-[#8637c3] transition shrink-0"
                >
                  Auto
                </button>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">
                Date <span className="text-[#ef4444]">*</span>
              </label>
              <div className="flex items-center h-10 border border-[#e5e7eb] rounded-md overflow-hidden bg-white focus-within:ring-1 focus-within:ring-[#9B48D7] focus-within:border-[#9B48D7]">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 h-full px-3 text-sm text-[#111827] border-0 outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Source Warehouse + Swap + Destination Warehouse */}
          <div className="grid grid-cols-[1fr_40px_1fr] items-end gap-3 mb-5">
            {/* Source Warehouse */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">
                Source Warehouse <span className="text-[#ef4444]">*</span>
              </label>
              {!isAdmin ? (
                <div className="h-10 flex items-center px-3 border border-[#e5e7eb] rounded-md bg-[#f9fafb] text-sm text-[#374151]">
                  {sourceWarehouse || "—"}
                </div>
              ) : (
                <WarehouseDropdown
                  value={sourceWarehouse}
                  onChange={(e) => setSourceWarehouse(e.target.value)}
                  options={warehouseOptions}
                  placeholder="Select Source Warehouse"
                  required
                />
              )}
            </div>

            {/* Swap button */}
            <div className="flex items-end justify-center pb-0.5">
              <button
                type="button"
                onClick={() => {
                  setSourceWarehouse(destinationWarehouse);
                  setDestinationWarehouse(sourceWarehouse);
                }}
                title="Swap warehouses"
                style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, maxWidth: 32, maxHeight: 32 }}
                className="flex items-center justify-center rounded bg-[#9B48D7] text-white cursor-pointer"
              >
                <ArrowLeftRight size={13} strokeWidth={2.5} />
              </button>
            </div>

            {/* Destination Warehouse */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">
                Destination Warehouse <span className="text-[#ef4444]">*</span>
              </label>
              <WarehouseDropdown
                value={destinationWarehouse}
                onChange={(e) => setDestinationWarehouse(e.target.value)}
                options={warehouseOptions}
                placeholder="Select Destination Warehouse"
                required
              />
            </div>
          </div>

          {/* Row 3: Description */}
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Description</label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the transfer reason"
              maxLength={500}
              className="w-full border border-[#e5e7eb] rounded-md px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] resize-none focus:outline-none focus:ring-1 focus:ring-[#9B48D7] focus:border-[#9B48D7]"
            />
            <div className="text-right text-[10px] text-[#9ca3af] mt-1">Maximum 500 characters</div>
          </div>
        </div>

        {/* ── Store Order Request Banner ── */}
        {storeOrderPrefillInfo && (
          <div className="mb-4 rounded-xl border border-[#e9d5ff] bg-[#fbf7ff] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#9B48D7] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Package size={18} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#9B48D7]">
                  Store Order {storeOrderPrefillInfo.orderNumber ? `#${storeOrderPrefillInfo.orderNumber}` : ''} Requested Groups
                </div>
                <div className="text-xs text-[#4b5563] mt-0.5">
                  Select the specific item/variant from each requested group below:
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(storeOrderPrefillInfo.requestedItems || []).map((req, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-[#7e22ce] border border-[#d8b4fe] shadow-xs">
                  <span className="font-semibold">{req.itemName || "Item Group"}</span>
                  <span className="text-[#9333ea] bg-[#f3e8ff] px-1.5 py-0.5 rounded font-bold">Qty: {req.quantity || 1}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Item table card ── */}
        <div className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden">
          {/* Table header */}
          <div className="bg-[#111827] grid grid-cols-[40px_1fr_260px_220px_48px] items-center px-4 py-3 gap-3">
            <div>
              <input type="checkbox" className="h-4 w-4 rounded accent-[#9B48D7] cursor-pointer" />
            </div>
            <div className="text-[10px] font-semibold tracking-widest text-[#9ca3af] uppercase">Item Details</div>
            <div className="text-[10px] font-semibold tracking-widest text-[#9ca3af] uppercase">Current Available</div>
            <div className="text-[10px] font-semibold tracking-widest text-[#9ca3af] uppercase">Transfer Quantity</div>
            <div />
          </div>

          {/* Table rows */}
          {tableRows.map((row) => {
            const transferQty = parseFloat(row.quantity) || 0;
            const sourceStock = parseFloat(row.sourceQuantity) || 0;
            const exceedsStock = transferQty > 0 && transferQty > sourceStock;

            return (
              <div key={row.id} className="grid grid-cols-[40px_1fr_260px_220px_48px] items-center px-4 py-3 gap-3 border-t border-[#f3f4f6] hover:bg-[#fafafa]">
                {/* Checkbox */}
                <div>
                  <input type="checkbox" className="h-4 w-4 rounded accent-[#9B48D7] cursor-pointer" />
                </div>

                {/* Item dropdown */}
                <div>
                  <ItemDropdown
                    rowId={row.id}
                    value={row.item}
                    onChange={(item) => handleItemSelect(row.id, item)}
                    sourceWarehouse={sourceWarehouse}
                    destinationWarehouse={destinationWarehouse}
                    onSourceStockFetched={handleSourceStockFetched(row.id)}
                    onDestStockFetched={handleDestStockFetched(row.id)}
                    isStoreUser={!isAdmin}
                    userWarehouse={userWarehouse}
                    onFocusChange={setIsItemInputFocused}
                    isEditMode={isEditMode}
                    orderId={id}
                    requestedHint={row.requestedGroupName}
                    requestedGroupId={row.itemGroupId}
                    selectedItems={tableRows
                      .filter(r => r.id !== row.id && (r.itemId || r.itemName || r.itemSku || r.item))
                      .map(r => ({
                        _id: r.itemId || r.item?._id || r.item?.id,
                        id: r.itemId || r.item?._id || r.item?.id,
                        itemId: r.itemId || r.item?._id || r.item?.id,
                        sku: r.itemSku || r.item?.sku,
                        itemSku: r.itemSku || r.item?.sku,
                        itemName: r.itemName || r.item?.itemName,
                        name: r.itemName || r.item?.itemName,
                        itemGroupId: r.itemGroupId || r.item?.itemGroupId,
                      }))}
                  />
                  {row.requestedGroupName && !row.item && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#7c3aed] font-medium bg-[#f5f3ff] px-2 py-0.5 rounded border border-[#ddd6fe] inline-flex">
                      <span>Requested: <strong>{row.requestedGroupName}</strong></span>
                      {row.requestedQuantity && <span className="text-[#9333ea] font-bold">({row.requestedQuantity} pcs)</span>}
                    </div>
                  )}
                </div>

                {/* Stock availability */}
                <div className="flex gap-4">
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-0.5">Source Stock</div>
                    <div className={`text-sm font-semibold ${row.sourceQuantity === 0 ? 'text-[#ef4444]' : 'text-[#111827]'}`}>
                      {Math.round(row.sourceQuantity)} Units
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-0.5">Destination Stock</div>
                    <div className="text-sm font-semibold text-[#111827]">
                      {Math.round(row.destQuantity)} Units
                    </div>
                  </div>
                </div>

                {/* Transfer quantity */}
                <div>
                  <div className={`flex items-center gap-1.5 h-9 border rounded-md px-2 ${exceedsStock ? 'border-[#ef4444] bg-[#fef2f2]' : 'border-[#e5e7eb] bg-white'}`}>
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className={`flex-1 border-0 outline-none text-sm text-right bg-transparent ${exceedsStock ? 'text-[#ef4444]' : 'text-[#111827]'}`}
                    />
                    <span className={`text-xs shrink-0 ${exceedsStock ? 'text-[#ef4444]' : 'text-[#9ca3af]'}`}>Units</span>
                  </div>
                  {exceedsStock && (
                    <p className="text-[10px] text-[#ef4444] mt-0.5">Exceeds stock ({Math.round(sourceStock)} avail.)</p>
                  )}
                </div>

                {/* Delete */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[#fef2f2] text-[#ef4444] hover:bg-[#fee2e2] transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add row / Bulk Add */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-[#f3f4f6]">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-md hover:bg-[#f9fafb] transition cursor-pointer"
            >
              <Plus size={13} />
              New Row
            </button>
            <button
              type="button"
              onClick={() => {
                if (!sourceWarehouse) { alert("Please select a source warehouse first"); return; }
                setShowBulkAddModal(true);
                fetchBulkItems();
              }}
              className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-md hover:bg-[#f9fafb] transition cursor-pointer"
            >
              <Plus size={13} />
              Bulk Add Items
            </button>
          </div>
        </div>

      </div>

      {/* Bulk Add Modal */}
      {showBulkAddModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-[#e5e7eb] max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4 bg-white">
              <h2 className="text-lg font-semibold text-[#1f2937]">Add Items in Bulk</h2>
              <button
                onClick={handleBulkAddClose}
                className="text-[#6b7280] hover:text-[#1f2937] hover:bg-[#f3f4f6] p-1 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content - Two Column Layout */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left Column - Items List */}
              <div className="flex-1 flex flex-col border-r border-[#e5e7eb]">
                {/* Search/Scan Input */}
                <div className="border-b border-[#e5e7eb] p-4 bg-[#f9fafb]">
                  <input
                    ref={bulkScanInputRef}
                    type="text"
                    value={bulkScanInput}
                    onKeyDown={handleBulkScanKeyDown}
                    placeholder="Type to search or scan the barcode of the item"
                    className="w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-2.5 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                    autoFocus
                  />
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto">
                  {bulkItemsLoading ? (
                    <div className="text-center py-8 text-[#6b7280]">Loading items...</div>
                  ) : bulkItems.length === 0 ? (
                    <div className="text-center py-8 text-[#6b7280]">No items available in {sourceWarehouse}</div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {bulkItems.map((item) => {
                        const isSelected = bulkScannedItems.some(s => 
                          (s.item._id && item._id && String(s.item._id) === String(item._id)) ||
                          (s.item.sku && item.sku && s.item.sku.toLowerCase() === item.sku.toLowerCase())
                        );

                        // Calculate available stock
                        const availableStock = sourceWarehouse ? getStockOnHand(item, sourceWarehouse) : 0;
                        const isOutOfStock = availableStock <= 0;

                        return (
                          <div
                            key={item._id}
                            onClick={() => !isOutOfStock && processBulkScan(item.sku)}
                            className={`p-3 rounded-lg border transition-all ${isOutOfStock
                              ? 'border-[#fecaca] bg-[#fef2f2] cursor-not-allowed opacity-75'
                              : isSelected
                                ? 'border-[#2563eb] bg-[#eff6ff] cursor-pointer'
                                : 'border-[#e5e7eb] bg-white hover:border-[#2563eb] hover:bg-[#f0f9ff] cursor-pointer'
                              }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium text-sm ${isOutOfStock
                                  ? 'text-[#991b1b]'
                                  : isSelected
                                    ? 'text-[#1e40af]'
                                    : 'text-[#1f2937]'
                                  }`}>
                                  {item.itemName}
                                </div>
                                <div className="text-xs text-[#6b7280] mt-0.5">
                                  SKU: {item.sku || 'N/A'}
                                </div>
                              </div>
                              <div className="text-right ml-2 flex-shrink-0">
                                <div className="text-xs text-[#6b7280]">Stock on Hand</div>
                                {isOutOfStock ? (
                                  <div className="text-sm font-semibold text-[#ef4444]">
                                    No Stock
                                  </div>
                                ) : (
                                  <div className="text-sm font-semibold text-[#10b981]">
                                    {availableStock.toFixed(2)} pcs
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Selected Items */}
              <div className="w-80 flex flex-col bg-[#f9fafb]">
                {/* Header */}
                <div className="border-b border-[#e5e7eb] px-4 py-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#1f2937]">Selected Items</span>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-[#e5e7eb] text-xs font-semibold text-[#374151] rounded-full">
                      {bulkScannedItems.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6b7280]">Total Quantity</span>
                    <span className="text-sm font-semibold text-[#1f2937]">{bulkScannedItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                </div>

                {/* Selected Items List */}
                <div className="flex-1 overflow-y-auto p-3">
                  {bulkScannedItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <div className="text-4xl mb-2">📋</div>
                        <div className="text-sm text-[#6b7280]">No items selected yet</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bulkScannedItems.map((scanned, idx) => {
                        const maxStock = sourceWarehouse ? getStockOnHand(scanned.item, sourceWarehouse) : (scanned.quantity || 1);

                        return (
                          <div key={idx} className="bg-white border border-[#e5e7eb] rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-[#1f2937] truncate">
                                  {scanned.item.itemName}
                                </div>
                                <div className="text-xs text-[#6b7280] mt-0.5">
                                  SKU: {scanned.item.sku || 'N/A'} • <span className="text-[#059669] font-medium">Max: {maxStock} pcs</span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setBulkScannedItems(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-[#ef4444] hover:bg-[#fef2f2] p-1 rounded transition-colors flex-shrink-0"
                              >
                                <X size={16} />
                              </button>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setBulkScannedItems(prev =>
                                    prev.map((item, i) => {
                                      if (i === idx && item.quantity > 1) {
                                        return { ...item, quantity: item.quantity - 1 };
                                      }
                                      return item;
                                    })
                                  );
                                }}
                                className="w-6 h-6 rounded border border-[#d1d5db] flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] transition-colors text-sm disabled:opacity-40"
                                disabled={scanned.quantity <= 1}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                value={scanned.quantity}
                                onChange={(e) => {
                                  const rawVal = parseInt(e.target.value) || 1;
                                  const limit = maxStock > 0 ? maxStock : 1;
                                  if (rawVal > limit) {
                                    alert(`❌ Cannot enter more than available stock (${limit} pcs).`);
                                  }
                                  const qty = Math.min(limit, Math.max(1, rawVal));
                                  setBulkScannedItems(prev =>
                                    prev.map((item, i) => {
                                      if (i === idx) {
                                        return { ...item, quantity: qty };
                                      }
                                      return item;
                                    })
                                  );
                                }}
                                className="w-12 h-6 text-center text-sm border border-[#d1d5db] rounded focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]/20"
                                min="1"
                                max={maxStock}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setBulkScannedItems(prev => {
                                    const currentItem = prev[idx];
                                    if (!currentItem) return prev;
                                    const max = sourceWarehouse ? getStockOnHand(currentItem.item, sourceWarehouse) : (currentItem.quantity || 1);
                                    if (currentItem.quantity >= max) {
                                      alert(`❌ Cannot add more. Only ${max} pcs available for "${currentItem.item.itemName}".`);
                                      return prev;
                                    }
                                    return prev.map((item, i) => {
                                      if (i === idx) {
                                        return {
                                          ...item,
                                          quantity: Math.min(max, (item.quantity || 0) + 1)
                                        };
                                      }
                                      return item;
                                    });
                                  });
                                }}
                                className="w-6 h-6 rounded border border-[#d1d5db] flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                disabled={scanned.quantity >= maxStock}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#e5e7eb] bg-white px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={handleBulkAddClose}
                className="rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAddItems}
                disabled={bulkScannedItems.length === 0}
                className="rounded-lg bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-6 py-2 text-sm font-medium text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Items
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TransferOrderCreate;

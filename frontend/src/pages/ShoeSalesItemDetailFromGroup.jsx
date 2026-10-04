import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Edit, X, Building2, Info, Camera, Settings, Star, Warehouse, ChevronDown, Plus, Copy, Pause, Trash2, ArrowUpRight, XCircle, ArrowLeft, Clock, Barcode } from "lucide-react";
import Header from "../components/Header";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import AttachmentDisplay from "../components/AttachmentDisplay";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

// Warehouse name mapping: actual names from API -> display names for Stocks page
const WAREHOUSE_NAME_MAPPING = {
  // Actual API names -> Display names
  "G.Palakkad": "Palakkad Branch",
  "G-Palakkad": "Palakkad Branch",
  "G.Palakkad ": "Palakkad Branch",
  "GPalakkad": "Palakkad Branch",
  "Palakkad Branch": "Palakkad Branch",
  "Warehouse": "Warehouse",
  "G.Calicut": "Calicut",
  "G-Calicut": "Calicut",
  "G.Calicut ": "Calicut",
  "GCalicut": "Calicut",
  "Calicut": "Calicut",
  "G.Manjeri": "Manjery Branch",
  "G-Manjeri": "Manjery Branch",
  "G.Manjery": "Manjery Branch",
  "G-Manjery": "Manjery Branch",
  "GManjeri": "Manjery Branch",
  "GManjery": "Manjery Branch",
  "Manjery Branch": "Manjery Branch",
  "G.Kannur": "Kannur Branch",
  "G-Kannur": "Kannur Branch",
  "GKannur": "Kannur Branch",
  "Kannur Branch": "Kannur Branch",
  "G.Edappal": "Edappal Branch",
  "G-Edappal": "Edappal Branch",
  "GEdappal": "Edappal Branch",
  "Edappal Branch": "Edappal Branch",
  "G.Kalpetta": "Kalpetta Branch",
  "G-Kalpetta": "Kalpetta Branch",
  "GKalpetta": "Kalpetta Branch",
  "Kalpetta Branch": "Kalpetta Branch",
  "G.Kottakkal": "Kottakkal Branch",
  "G-Kottakkal": "Kottakkal Branch",
  "GKottakkal": "Kottakkal Branch",
  "Kottakkal Branch": "Kottakkal Branch",
  "Z.Kottakkal": "Kottakkal Branch",
  "Z-Kottakkal": "Kottakkal Branch",
  "G.Perinthalmanna": "Perinthalmanna Branch",
  "G-Perinthalmanna": "Perinthalmanna Branch",
  "GPerinthalmanna": "Perinthalmanna Branch",
  "Perinthalmanna Branch": "Perinthalmanna Branch",
  "Z.Perinthalmanna": "Perinthalmanna Branch",
  "Z-Perinthalmanna": "Perinthalmanna Branch",
  // Trivandrum variations - fix typo and add correct mapping
  "Grooms Trivandum": "Grooms Trivandrum",
  "Grooms Trivandrum": "Grooms Trivandrum",
  "SG-Trivandrum": "Grooms Trivandrum",
  "SG.Trivandrum": "Grooms Trivandrum",
  "G.Chavakkad": "Chavakkad Branch",
  "G-Chavakkad": "Chavakkad Branch",
  "GChavakkad": "Chavakkad Branch",
  "Chavakkad Branch": "Chavakkad Branch",
  "G.Thrissur": "Thrissur Branch",
  "G-Thrissur": "Thrissur Branch",
  "GThrissur": "Thrissur Branch",
  "Thrissur Branch": "Thrissur Branch",
  "G.Perumbavoor": "Perumbavoor Branch",
  "G-Perumbavoor": "Perumbavoor Branch",
  "GPerumbavoor": "Perumbavoor Branch",
  "Perumbavoor Branch": "Perumbavoor Branch",
  "G.Kottayam": "Kottayam Branch",
  "G-Kottayam": "Kottayam Branch",
  "GKottayam": "Kottayam Branch",
  "Kottayam Branch": "Kottayam Branch",
  "G.Edappally": "Edapally Branch",
  "G-Edappally": "Edapally Branch",
  "GEdappally": "Edapally Branch",
  "Edapally Branch": "Edapally Branch",
  "Edapallyadmin Branch": "Edapally Branch",
  "Edapallyadmin": "Edapally Branch",
  "Z-Edapally1": "Edapally Branch",
  "Z-Edapally1 Branch": "Edapally Branch",
  "-Edapally1 Branch": "Edapally Branch",
  "-Edapally1": "Edapally Branch",
  "G.MG Road": "MG Road",
  "G-MG Road": "MG Road",
  "G.Mg Road": "MG Road",
  "G-Mg Road": "MG Road",
  "GMG Road": "MG Road",
  "GMg Road": "MG Road",
  "MG Road": "MG Road",
  "SuitorGuy MG Road": "MG Road",
  // Vadakara variations
  "G.Vadakara": "Vadakara Branch",
  "GVadakara": "Vadakara Branch",
  "Vadakara Branch": "Vadakara Branch"
};

// Display names for the Stocks page (what users see) - restricted to Warehouse and MG Road
const ALLOWED_WAREHOUSES_DISPLAY = [
  "Warehouse",
  "MG Road"
];

// Get all possible actual warehouse names that map to allowed warehouses
const getAllowedActualNames = () => {
  const actualNames = new Set();
  Object.keys(WAREHOUSE_NAME_MAPPING).forEach(actualName => {
    if (ALLOWED_WAREHOUSES_DISPLAY.includes(WAREHOUSE_NAME_MAPPING[actualName])) {
      actualNames.add(actualName);
    }
  });
  return Array.from(actualNames);
};

// Helper function to normalize warehouse name to display name
const normalizeWarehouseName = (warehouseName) => {
  if (!warehouseName) return null;
  const trimmed = warehouseName.toString().trim();
  
  // Check exact match first
  if (WAREHOUSE_NAME_MAPPING[trimmed]) {
    return WAREHOUSE_NAME_MAPPING[trimmed];
  }
  
  // Check case-insensitive match
  const lowerName = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(WAREHOUSE_NAME_MAPPING)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // If it's already a display name, return it
  if (ALLOWED_WAREHOUSES_DISPLAY.includes(trimmed)) {
    return trimmed;
  }
  
  return null;
};

const ShoeSalesItemDetailFromGroup = () => {
  const isSidebarOpen = useSidebar();
  const { id, itemId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [itemGroup, setItemGroup] = useState(null);
  const [item, setItem] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [stockType, setStockType] = useState("accounting"); // "accounting" or "physical"
  const [showInactiveWarehouses, setShowInactiveWarehouses] = useState(false);
  const [warehouseStocks, setWarehouseStocks] = useState([]);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allItemGroups, setAllItemGroups] = useState([]);
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);
  const moreMenuRef = useRef(null);

  // Fetch all warehouses from account settings and filter to only allowed ones
  const fetchAllWarehouses = useCallback(async () => {
    // Always use the display names for the Stocks page
    const sortedWarehouses = [...ALLOWED_WAREHOUSES_DISPLAY].sort((a, b) => {
      if (a === "Warehouse") return -1;
      if (b === "Warehouse") return 1;
      return a.localeCompare(b);
    });
    setAllWarehouses(sortedWarehouses);
  }, []);

  const fetchData = useCallback(async () => {
    if (!id || !itemId) return;
    
      try {
        const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
        const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch item group");
        }
        
        const data = await response.json();
        setItemGroup(data);
        
        // Find the specific item
        if (data.items && Array.isArray(data.items)) {
          const foundItem = data.items.find(i => (i._id || i.id) === itemId);
          if (foundItem) {
            console.log("📦 Item detail: Found item:", foundItem.name);
            console.log("📦 Item detail: Item warehouseStocks:", foundItem.warehouseStocks);
            if (foundItem.warehouseStocks && Array.isArray(foundItem.warehouseStocks)) {
              foundItem.warehouseStocks.forEach(ws => {
                console.log(`   - Warehouse: "${ws.warehouse}", Stock: ${ws.stockOnHand || 0}`);
              });
            }
            setItem(foundItem);
          } else {
            console.warn("📦 Item detail: Item not found in group items");
          }
        }
      } catch (error) {
        console.error("Error fetching item:", error);
        setItemGroup(null);
        setItem(null);
      }
  }, [id, itemId]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!id || !itemId) {
      console.log("Missing id or itemId for history fetch:", { id, itemId });
      return;
    }
    
    try {
      setLoadingHistory(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const url = `${API_URL}/api/shoe-sales/item-groups/${id}/items/${itemId}/history`;
      console.log("Fetching history from:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch history:", response.status, errorText);
        throw new Error("Failed to fetch history");
      }
      
      let data = await response.json();
      console.log("History data received:", data);
      
      // Ensure we have an array
      const historyArray = Array.isArray(data) ? data : [];
      
      // Check if we have a CREATE entry, if not and item exists, add one
      const hasCreateEntry = historyArray.some(entry => entry.changeType === "CREATE");
      if (!hasCreateEntry && item && (item.createdAt || itemGroup?.createdAt)) {
        // Add creation entry from item's or group's createdAt
        const createdAt = item.createdAt ? new Date(item.createdAt) : (itemGroup?.createdAt ? new Date(itemGroup.createdAt) : new Date());
        // Try to get createdBy from item, itemGroup, or history entries, or get current user, or use "System"
        let createdBy = item.createdBy || itemGroup?.changedBy || itemGroup?.createdBy;
        if (!createdBy) {
          // Try to get from history entries if available
          const createHistoryEntry = historyArray.find(entry => entry.changeType === "CREATE");
          if (createHistoryEntry && createHistoryEntry.changedBy) {
            createdBy = createHistoryEntry.changedBy;
          } else {
            // Get current user as fallback
            const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
            createdBy = currentUser.username || currentUser.locName || "System";
          }
        }
        const createEntry = {
          itemId: itemId.toString(),
          itemGroupId: id,
          changeType: "CREATE",
          details: "created",
          changedBy: createdBy,
          changedAt: createdAt,
          createdAt: createdAt,
          oldData: null,
          newData: item,
        };
        // Add at the end (will be sorted by changedAt)
        historyArray.push(createEntry);
      }
      
      // Sort by changedAt descending (most recent first)
      historyArray.sort((a, b) => {
        const dateA = new Date(a.changedAt || a.createdAt || 0);
        const dateB = new Date(b.changedAt || b.createdAt || 0);
        return dateB - dateA;
      });
      
      setHistory(historyArray);
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [id, itemId, item, itemGroup]);

  // Fetch all item groups for the move modal
  const fetchAllItemGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch item groups");
      }
      
      const data = await response.json();
      // Filter out the current group and only show active groups
      const filteredGroups = data.filter(group => {
        const groupIdStr = (group._id || group.id || "").toString();
        return groupIdStr !== id.toString() && (group.isActive !== false);
      });
      
      setAllItemGroups(filteredGroups);
    } catch (error) {
      console.error("Error fetching item groups:", error);
      alert("Failed to load item groups. Please try again.");
    } finally {
      setLoadingGroups(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    fetchAllWarehouses();
  }, [fetchData, fetchAllWarehouses]);

  useEffect(() => {
    if (activeTab === "History") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Fetch groups when move modal opens
  useEffect(() => {
    if (showMoveModal) {
      fetchAllItemGroups();
      setSelectedTargetGroupId("");
    }
  }, [showMoveModal, fetchAllItemGroups]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get user info for filtering
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  // User is admin if: power === 'admin' OR locCode === '858' (Warehouse) OR locCode === '103' (WAREHOUSE) OR email === 'officerootments@gmail.com'
  const userEmail = user?.email || user?.username || "";
  const adminEmails = ['officerootments@gmail.com'];
  const isAdminEmail = userEmail && adminEmails.some(email => userEmail.toLowerCase() === email.toLowerCase());
  const isAdmin = isAdminEmail ||
                  user?.power === "admin" || 
                  (user?.locCode && (user.locCode === '858' || user.locCode === '103'));
  
  // Fallback locations mapping (same as other pages)
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
  
  // Get location name - prioritize locCode lookup over username
  let userLocName = "";
  if (user?.locCode) {
    const location = fallbackLocations.find(loc => loc.locCode === user.locCode || loc.locCode === String(user.locCode));
    if (location) {
      userLocName = location.locName;
      console.log(`Item Detail: Found location by locCode ${user.locCode}: "${location.locName}"`);
    }
  }
  // Fallback to username/locName if locCode lookup didn't work
  if (!userLocName) {
    userLocName = user?.username || user?.locName || "";
    console.log(`Item Detail: Using username/locName fallback: "${userLocName}"`);
  }
  
  // Use the shared warehouse mapping utility
  const mapLocNameToWarehouse = (locName) => {
    if (!locName) return "";
    return mapWarehouse(locName);
  };
  
  const userWarehouse = mapLocNameToWarehouse(userLocName);
  console.log(`Item Detail: Mapped warehouse: "${userWarehouse}" (from locName: "${userLocName}")`);
  
  // Combine all warehouses with stock data
  useEffect(() => {
    console.log("📊 Stock Display: useEffect triggered");
    console.log("   allWarehouses.length:", allWarehouses.length);
    console.log("   item:", item ? { name: item.name, hasWarehouseStocks: !!item.warehouseStocks } : "null");
    console.log("   isAdmin:", isAdmin);
    console.log("   userWarehouse:", userWarehouse);
    
    if (allWarehouses.length > 0) {
      // Get item warehouse stocks if item exists
      const itemWarehouseStocks = item?.warehouseStocks || [];
      console.log("   itemWarehouseStocks:", itemWarehouseStocks);
      
      // Create a map of warehouse stocks by normalized display name
      const stockMap = new Map();
      itemWarehouseStocks.forEach(stock => {
        if (stock.warehouse) {
          // Normalize the warehouse name to display name
          const displayName = normalizeWarehouseName(stock.warehouse);
          console.log(`   Normalizing "${stock.warehouse}" -> "${displayName}"`);
          if (displayName && ALLOWED_WAREHOUSES_DISPLAY.includes(displayName)) {
            // Store with display name as key, but keep original stock data
            stockMap.set(displayName, {
              ...stock,
              warehouse: displayName // Use display name
            });
            console.log(`   ✅ Added to stockMap: "${displayName}" with stock: ${stock.stockOnHand || 0}`);
          } else {
            console.log(`   ❌ Skipped: displayName="${displayName}", in ALLOWED_WAREHOUSES_DISPLAY: ${displayName ? ALLOWED_WAREHOUSES_DISPLAY.includes(displayName) : false}`);
          }
        }
      });
      
      // Determine which warehouses to show
      let warehousesToShow = [...ALLOWED_WAREHOUSES_DISPLAY];
      
      // For non-admin users, filter to only show their warehouse
      if (!isAdmin && userWarehouse) {
        warehousesToShow = warehousesToShow.filter(wh => {
          const whLower = wh.toLowerCase();
          const userWhLower = userWarehouse.toLowerCase();
          return whLower === userWhLower || 
                 whLower.includes(userWhLower) ||
                 userWhLower.includes(whLower);
        });
      }
      
      // Sort warehouses: "Warehouse" first, then alphabetically
      const sortedWarehouses = warehousesToShow.sort((a, b) => {
        if (a === "Warehouse") return -1;
        if (b === "Warehouse") return 1;
        return a.localeCompare(b);
      });
      
      // Create combined list: ONLY warehouses that have actual stock entries (including 0 stock)
      // This shows only stores where stock was actually added at some point
      const combinedStocks = sortedWarehouses
        .map(displayName => {
          const existingStock = stockMap.get(displayName);
          
          if (existingStock) {
            return existingStock;
          }
          
          return null; // Don't create default entries for warehouses that never had stock
        })
        .filter(stock => stock !== null); // Remove null entries (warehouses that never had stock)
      
      console.log("   Final combinedStocks:", combinedStocks.map(s => `${s.warehouse}: ${s.stockOnHand || 0}`).join(", "));
      setWarehouseStocks(combinedStocks);
    } else if (item && item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
      console.log("   Using fallback: item has warehouseStocks but allWarehouses is empty");
      // If no warehouses from API but item has warehouse stocks, normalize and filter
      const stockMap = new Map();
      item.warehouseStocks.forEach(stock => {
        if (stock.warehouse) {
          const displayName = normalizeWarehouseName(stock.warehouse);
          if (displayName && ALLOWED_WAREHOUSES_DISPLAY.includes(displayName)) {
            stockMap.set(displayName, {
              ...stock,
              warehouse: displayName
            });
          }
        }
      });
      
      // Determine which warehouses to show
      let warehousesToShow = [...ALLOWED_WAREHOUSES_DISPLAY];
      
      // For non-admin users, filter to only show their warehouse
      if (!isAdmin && userWarehouse) {
        warehousesToShow = warehousesToShow.filter(wh => {
          const whLower = wh.toLowerCase();
          const userWhLower = userWarehouse.toLowerCase();
          return whLower === userWhLower || 
                 whLower.includes(userWhLower) ||
                 userWhLower.includes(whLower);
        });
      }
      
      const sortedWarehouses = warehousesToShow.sort((a, b) => {
        if (a === "Warehouse") return -1;
        if (b === "Warehouse") return 1;
        return a.localeCompare(b);
      });
      
      const combinedStocks = sortedWarehouses
        .map(displayName => {
          const existingStock = stockMap.get(displayName);
          if (existingStock) {
            return existingStock;
          }
          return null; // Don't create default entries for warehouses that never had stock
        })
        .filter(stock => stock !== null); // Remove null entries (warehouses that never had stock)
      
      setWarehouseStocks(combinedStocks);
    } else if (allWarehouses.length === 0 && !item) {
      // If no warehouses and no item, show empty array
      setWarehouseStocks([]);
    }
  }, [allWarehouses, item, isAdmin, userWarehouse]);

  // Check if returning from stock management page and refresh data
  useEffect(() => {
    const stocksUpdated = searchParams.get('stocksUpdated');
    const message = searchParams.get('message');
    
    if (stocksUpdated === 'true') {
      // Show success message if provided
      if (message) {
        alert(decodeURIComponent(message));
      }
      
      // Switch to Stocks tab
      setActiveTab("Stocks");
      // Refresh data
      fetchData();
      // Remove the query parameters after data is refreshed
      setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 100);
    }
  }, [searchParams, setSearchParams, fetchData]);

  // Listen for stock updates from purchase receive, bills, transfer orders, etc.
  useEffect(() => {
    const handleStockUpdated = (event) => {
      console.log("📦 Stock updated event received, refreshing item data...", event.detail);
      
      // Check if this item was affected by the stock update
      const updatedItems = event.detail?.items || event.detail?.updatedItems || [];
      const itemIds = event.detail?.itemIds || [];
      
      // Check if current item is in the updated items
      const isItemAffected = updatedItems.some(updatedItem => {
        const updatedItemId = updatedItem.itemId?._id || updatedItem.itemId || updatedItem.itemIdValue;
        const updatedItemGroupId = updatedItem.itemGroupId || updatedItem.itemGroupIdValue;
        const updatedItemName = updatedItem.itemName || updatedItem.name;
        const updatedItemSku = updatedItem.itemSku || updatedItem.sku;
        
        // Match by itemGroupId - if group ID matches, always refresh (any item in group might have been updated)
        if (id && updatedItemGroupId) {
          const groupIdMatch = id.toString() === updatedItemGroupId.toString();
          if (groupIdMatch) {
            // If we have a specific item, also check if name/SKU matches (more precise)
            if (item && item.name) {
              const nameMatch = item.name === updatedItemName || item.sku === updatedItemSku;
              if (nameMatch) {
                console.log(`✅ Group ID and item name match - refreshing`);
                return true;
              }
            } else {
              // Group ID matches but no specific item loaded - refresh anyway (group stock changed)
              console.log(`✅ Group ID matches - refreshing (group stock may have changed)`);
              return true;
            }
          }
        }
        
        // Match by itemId (for standalone items)
        if (itemId && updatedItemId) {
          if (itemId.toString() === updatedItemId.toString()) {
            console.log(`✅ Item ID matches - refreshing`);
            return true;
          }
        }
        
        // Match by itemIds array
        if (itemId && itemIds.includes(itemId.toString())) {
          console.log(`✅ Item ID in array matches - refreshing`);
          return true;
        }
        
        return false;
      });
      
      // If item is affected or no specific items specified (global update), refresh
      if (isItemAffected || updatedItems.length === 0) {
        console.log("✅ Item is affected by stock update, refreshing...");
        fetchData();
        fetchAllWarehouses(); // Also refresh warehouses to get latest stock
      } else {
        console.log("ℹ️ Stock updated but this item was not affected");
      }
    };
    
    // Listen for stockUpdated event
    window.addEventListener("stockUpdated", handleStockUpdated);
    
    // Also listen for receiveSaved event (purchase receive)
    // Always refresh when purchase receive is saved, as stock might have been updated
    const handleReceiveSaved = () => {
      console.log("📦 Purchase receive saved, refreshing item data...");
      // Small delay to ensure database has been updated
      setTimeout(() => {
        console.log("🔄 Refreshing after purchase receive saved...");
        fetchData();
        fetchAllWarehouses();
      }, 1000); // Increased delay to ensure backend has finished updating
    };
    window.addEventListener("receiveSaved", handleReceiveSaved);
    
    // Listen for transferOrderReceived event
    const handleTransferOrderReceived = (event) => {
      console.log("📦 Transfer order received, refreshing item data...", event.detail);
      // Check if this warehouse is affected
      const destinationWarehouse = event.detail?.destinationWarehouse;
      if (destinationWarehouse && userWarehouse) {
        const destLower = destinationWarehouse.toLowerCase();
        const userWhLower = userWarehouse.toLowerCase();
        if (destLower === userWhLower || destLower.includes(userWhLower) || userWhLower.includes(destLower)) {
          console.log("✅ Transfer order affects this warehouse, refreshing...");
          fetchData();
          fetchAllWarehouses();
        }
      } else {
        // If no specific warehouse, refresh anyway
        fetchData();
        fetchAllWarehouses();
      }
    };
    window.addEventListener("transferOrderReceived", handleTransferOrderReceived);
    
    // Also refresh when page becomes visible (user navigated back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("📦 Page became visible, refreshing item data...");
        // Small delay to ensure any pending updates are complete
        setTimeout(() => {
          fetchData();
          fetchAllWarehouses();
        }, 500);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("stockUpdated", handleStockUpdated);
      window.removeEventListener("receiveSaved", handleReceiveSaved);
      window.removeEventListener("transferOrderReceived", handleTransferOrderReceived);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData, fetchAllWarehouses, id, itemId, item, userWarehouse]);

  // Calculate stock totals
  const stockTotals = useMemo(() => {
    console.log("📊 Calculating stock totals from warehouseStocks:", warehouseStocks);
    console.log("📊 Current item:", item ? { name: item.name, stock: item.stock } : null);
    console.log("📊 isAdmin:", isAdmin);
    
    const totals = {
      accounting: {
        openingStock: 0,
        stockOnHand: 0,
        availableForSale: 0,
      },
      physical: {
        openingStock: 0,
        stockOnHand: 0,
        availableForSale: 0,
      },
    };
    
    if (warehouseStocks && Array.isArray(warehouseStocks)) {
      warehouseStocks.forEach(stock => {
        console.log(`   Processing warehouse: "${stock.warehouse}", stockOnHand: ${stock.stockOnHand || 0}`);
        const opening = parseFloat(stock.openingStock || 0);
        // Don't fallback to opening if stockOnHand is 0 - 0 is a valid value!
        const onHand = stock.stockOnHand !== undefined && stock.stockOnHand !== null
          ? parseFloat(stock.stockOnHand)
          : parseFloat(stock.openingStock || 0);
        const available = stock.availableForSale !== undefined && stock.availableForSale !== null
          ? parseFloat(stock.availableForSale)
          : parseFloat(onHand);
        
        totals.accounting.openingStock += opening;
        totals.accounting.stockOnHand += onHand;
        totals.accounting.availableForSale += available;

        // Physical totals read from dedicated fields when present
        const pOpening = parseFloat(stock.physicalOpeningStock || 0);
        // Don't fallback to pOpening if physicalStockOnHand is 0 - 0 is a valid value!
        const pOnHand = stock.physicalStockOnHand !== undefined && stock.physicalStockOnHand !== null 
          ? parseFloat(stock.physicalStockOnHand) 
          : parseFloat(pOpening || 0);
        const pAvailable = stock.physicalAvailableForSale !== undefined && stock.physicalAvailableForSale !== null
          ? parseFloat(stock.physicalAvailableForSale)
          : parseFloat(pOnHand || 0);
        totals.physical.openingStock += isNaN(pOpening) ? 0 : pOpening;
        totals.physical.stockOnHand += isNaN(pOnHand) ? 0 : pOnHand;
        totals.physical.availableForSale += isNaN(pAvailable) ? 0 : pAvailable;
      });
    }
    
    console.log("📊 Calculated totals BEFORE fallback:", totals);
    
    // Fallback to item.stock if no warehouse stocks - but NOT for store users who should only see their warehouse
    if (totals.accounting.stockOnHand === 0 && typeof item?.stock === 'number' && isAdmin) {
      console.log("📊 Using fallback item.stock (admin only):", item.stock);
      totals.accounting.stockOnHand = item.stock;
      totals.accounting.openingStock = item.stock;
      totals.accounting.availableForSale = item.stock;
    } else if (!isAdmin) {
      console.log("📊 Store user - not using fallback item.stock, showing warehouse-specific totals");
    }
    
    console.log("📊 Final calculated totals:", totals);
    
    // Physical totals are independent; rely only on physical fields
    return totals;
  }, [warehouseStocks, item, isAdmin]);

  if (!itemGroup || !item) {
    return (
      <div className="invoice-page-wrapper min-h-screen bg-[#F9FAFB] text-[#111827]">
        <Header title="Item Details" />
        <div className={`transition-all duration-300 p-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="bg-white border border-[#E5E7EB] rounded-none p-12 text-center shadow-xs">
            <p className="text-base font-bold text-[#111827] uppercase tracking-wide">Item not found</p>
            <Link
              to={`/shoe-sales/item-groups/${id}`}
              className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Item Group</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Extract attribute values from item name or attributeCombination
  const getAttributeValue = (attributeName) => {
    if (item.attributeCombination && Array.isArray(item.attributeCombination)) {
      // Try to match attribute name with the combination
      if (itemGroup.attributeRows && Array.isArray(itemGroup.attributeRows)) {
        const attrRow = itemGroup.attributeRows.find(row => 
          row.attribute && row.attribute.toLowerCase() === attributeName.toLowerCase()
        );
        if (attrRow) {
          const index = itemGroup.attributeRows.indexOf(attrRow);
          return item.attributeCombination[index] || "";
        }
      }
    }
    return "";
  };

  // Handler functions for More menu options
  const handleCloneItem = async () => {
    try {
      setLoading(true);
      setShowMoreMenu(false);
      
      if (!itemGroup || !item) {
        alert("Item data not available.");
        return;
      }

      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      // Create a copy of the item with a new name
      const clonedItem = {
        ...item,
        name: `${item.name} (Copy)`,
        sku: item.sku ? `${item.sku}-COPY` : "",
        _id: undefined, // Remove _id so it creates a new item
        id: undefined,
      };

      // Add the cloned item to the group
      const updatedItems = [...(itemGroup.items || []), clonedItem];
      
      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      const updatePayload = {
        name: itemGroup.name,
        sku: itemGroup.sku || "",
        itemType: itemGroup.itemType || "goods",
        unit: itemGroup.unit || "",
        manufacturer: itemGroup.manufacturer || "",
        brand: itemGroup.brand || "",
        taxPreference: itemGroup.taxPreference || "taxable",
        intraStateTaxRate: itemGroup.intraStateTaxRate || "",
        interStateTaxRate: itemGroup.interStateTaxRate || "",
        inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
        createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
        attributeRows: itemGroup.attributeRows || [],
        sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
        purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
        trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
        items: updatedItems,
        stock: itemGroup.stock || 0,
        reorder: itemGroup.reorder || "",
        isActive: itemGroup.isActive !== undefined ? itemGroup.isActive : true,
        changedBy: changedBy,
      };

      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error("Failed to clone item");
      }

      alert("Item cloned successfully!");
      // Refresh the page to show the new item
      window.location.reload();
    } catch (error) {
      console.error("Error cloning item:", error);
      alert("Failed to clone item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsInactive = async () => {
    try {
      setLoading(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      if (!itemGroup || !item) {
        alert("Item data not available.");
        return;
      }

      // Mark the item as inactive instead of removing it
      const updatedItems = itemGroup.items.map(i => {
        const itemIdStr = (i._id?.toString() || i.id || "").toString();
        if (itemIdStr === itemId.toString()) {
          return {
            ...i,
            isActive: false
          };
        }
        return i;
      });

      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      const updatePayload = {
        name: itemGroup.name,
        sku: itemGroup.sku || "",
        itemType: itemGroup.itemType || "goods",
        unit: itemGroup.unit || "",
        manufacturer: itemGroup.manufacturer || "",
        brand: itemGroup.brand || "",
        taxPreference: itemGroup.taxPreference || "taxable",
        intraStateTaxRate: itemGroup.intraStateTaxRate || "",
        interStateTaxRate: itemGroup.interStateTaxRate || "",
        inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
        createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
        attributeRows: itemGroup.attributeRows || [],
        sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
        purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
        trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
        items: updatedItems,
        stock: itemGroup.stock || 0,
        reorder: itemGroup.reorder || "",
        isActive: itemGroup.isActive !== undefined ? itemGroup.isActive : true,
        changedBy: changedBy,
      };

      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error("Failed to mark item as inactive");
      }

      setShowInactiveModal(false);
      alert("Item has been marked as inactive.");
      navigate(`/shoe-sales/inactive-items`);
    } catch (error) {
      console.error("Error marking item as inactive:", error);
      alert("Failed to mark item as inactive. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      if (!itemGroup || !item) {
        alert("Item data not available.");
        return;
      }

      // Remove the item from the items array
      const updatedItems = itemGroup.items.filter(i => {
        const itemIdStr = (i._id?.toString() || i.id || "").toString();
        return itemIdStr !== itemId.toString();
      });

      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      const updatePayload = {
        name: itemGroup.name,
        sku: itemGroup.sku || "",
        itemType: itemGroup.itemType || "goods",
        unit: itemGroup.unit || "",
        manufacturer: itemGroup.manufacturer || "",
        brand: itemGroup.brand || "",
        taxPreference: itemGroup.taxPreference || "taxable",
        intraStateTaxRate: itemGroup.intraStateTaxRate || "",
        interStateTaxRate: itemGroup.interStateTaxRate || "",
        inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
        createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
        attributeRows: itemGroup.attributeRows || [],
        sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
        purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
        trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
        items: updatedItems,
        stock: itemGroup.stock || 0,
        reorder: itemGroup.reorder || "",
        isActive: itemGroup.isActive !== undefined ? itemGroup.isActive : true,
        itemId: itemId,
        changedBy: changedBy,
      };

      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      setShowDeleteModal(false);
      alert("Item deleted successfully.");
      navigate(`/shoe-sales/item-groups/${id}`);
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleMoveToGroup = async () => {
    if (!selectedTargetGroupId) {
      alert("Please select a target group.");
      return;
    }

    if (!itemGroup || !item) {
      alert("Item data not available.");
      return;
    }

    try {
      setLoading(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      // Fetch the target group
      const targetGroupResponse = await fetch(`${API_URL}/api/shoe-sales/item-groups/${selectedTargetGroupId}`);
      if (!targetGroupResponse.ok) {
        throw new Error("Failed to fetch target group");
      }
      const targetGroup = await targetGroupResponse.json();

      // Prepare the item to move (preserve all properties)
      const itemToMove = {
        ...item,
        _id: undefined, // Remove _id so it gets a new one in the target group
        id: undefined,
      };

      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      // Remove item from current group
      const updatedCurrentGroupItems = itemGroup.items.filter(i => {
        const itemIdStr = (i._id?.toString() || i.id || "").toString();
        return itemIdStr !== itemId.toString();
      });

      const currentGroupPayload = {
        name: itemGroup.name,
        sku: itemGroup.sku || "",
        itemType: itemGroup.itemType || "goods",
        unit: itemGroup.unit || "",
        manufacturer: itemGroup.manufacturer || "",
        brand: itemGroup.brand || "",
        taxPreference: itemGroup.taxPreference || "taxable",
        intraStateTaxRate: itemGroup.intraStateTaxRate || "",
        interStateTaxRate: itemGroup.interStateTaxRate || "",
        inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
        createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
        attributeRows: itemGroup.attributeRows || [],
        sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
        purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
        trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
        items: updatedCurrentGroupItems,
        stock: itemGroup.stock || 0,
        reorder: itemGroup.reorder || "",
        isActive: itemGroup.isActive !== undefined ? itemGroup.isActive : true,
        itemId: itemId,
        changedBy: changedBy,
      };

      // Add item to target group
      const updatedTargetGroupItems = [...(targetGroup.items || []), itemToMove];

      const targetGroupPayload = {
        name: targetGroup.name,
        sku: targetGroup.sku || "",
        itemType: targetGroup.itemType || "goods",
        unit: targetGroup.unit || "",
        manufacturer: targetGroup.manufacturer || "",
        brand: targetGroup.brand || "",
        taxPreference: targetGroup.taxPreference || "taxable",
        intraStateTaxRate: targetGroup.intraStateTaxRate || "",
        interStateTaxRate: targetGroup.interStateTaxRate || "",
        inventoryValuationMethod: targetGroup.inventoryValuationMethod || "",
        createAttributes: targetGroup.createAttributes !== undefined ? targetGroup.createAttributes : true,
        attributeRows: targetGroup.attributeRows || [],
        sellable: targetGroup.sellable !== undefined ? targetGroup.sellable : true,
        purchasable: targetGroup.purchasable !== undefined ? targetGroup.purchasable : true,
        trackInventory: targetGroup.trackInventory !== undefined ? targetGroup.trackInventory : false,
        items: updatedTargetGroupItems,
        stock: targetGroup.stock || 0,
        reorder: targetGroup.reorder || "",
        isActive: targetGroup.isActive !== undefined ? targetGroup.isActive : true,
        changedBy: changedBy,
      };

      // Update both groups
      const [currentGroupResponse, targetGroupResponse2] = await Promise.all([
        fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentGroupPayload),
        }),
        fetch(`${API_URL}/api/shoe-sales/item-groups/${selectedTargetGroupId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(targetGroupPayload),
        }),
      ]);

      if (!currentGroupResponse.ok || !targetGroupResponse2.ok) {
        throw new Error("Failed to move item");
      }

      setShowMoveModal(false);
      alert(`Item "${item.name}" has been moved successfully!`);
      navigate(`/shoe-sales/item-groups/${selectedTargetGroupId}`);
    } catch (error) {
      console.error("Error moving item:", error);
      alert("Failed to move item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invoice-page-wrapper min-h-screen bg-[#F9FAFB] text-[#111827]">
      <Header title="Item Details" />

      <div className={`transition-all duration-300 p-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Action Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/shoe-sales/item-groups/${id}`)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft size={14} className="text-[#111827]" />
              <span>Item Group</span>
            </button>
            {(() => {
              const itemImg = item.image || (item.images && item.images[0]?.data) || (item.images && typeof item.images[0] === 'string' && item.images[0]) || (itemGroup.image) || (itemGroup.images && itemGroup.images[0]) || "";
              if (itemImg) {
                return (
                  <div className="w-12 h-12 rounded-none border border-[#E5E7EB] bg-white shrink-0 overflow-hidden flex items-center justify-center p-0.5 shadow-xs">
                    <img src={itemImg} alt="" className="w-full h-full object-contain" />
                  </div>
                );
              }
              return null;
            })()}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#111827] uppercase font-mono truncate">
                  {item.name || "Item Detail"} {searchParams.get("unitIndex") && <span className="text-sm font-bold text-purple-600 lowercase">(unit {searchParams.get("unitIndex")})</span>}
                </h1>
                {(searchParams.get("pieceSku") || item.sku) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-none bg-purple-50 text-purple-800 border border-purple-200 uppercase tracking-wider font-mono shadow-2xs">
                    <Barcode size={12} className="text-purple-600" />
                    SKU: {searchParams.get("pieceSku") || item.sku}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                Group: <span className="font-semibold text-[#111827]">{itemGroup.name}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <>
                <Link
                  to={`/shoe-sales/item-groups/${id}/items/${itemId}/edit${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Edit size={13} className="text-white" />
                  <span>Edit</span>
                </Link>

                <div className="relative" ref={moreMenuRef}>
                  <button 
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer"
                  >
                    <span>More</span>
                    <ChevronDown 
                      size={14} 
                      className={`text-[#6B7280] transition-transform ${showMoreMenu ? "rotate-180" : ""}`} 
                    />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 mt-1 w-56 rounded-none border border-[#E5E7EB] bg-white shadow-lg z-50 py-1 divide-y divide-[#E5E7EB]">
                      <div className="py-0.5">
                        <button
                          onClick={handleCloneItem}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2.5 cursor-pointer"
                        >
                          <Copy size={14} className="text-[#6B7280]" />
                          <span>Clone Item</span>
                        </button>
                      </div>
                      
                      <div className="py-0.5">
                        <button
                          onClick={() => {
                            setShowInactiveModal(true);
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2.5 cursor-pointer"
                        >
                          <Pause size={14} className="text-[#6B7280]" />
                          <span>Mark as Inactive</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowMoveModal(true);
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2.5 cursor-pointer"
                        >
                          <ArrowUpRight size={14} className="text-[#6B7280]" />
                          <span>Move to another group</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowRemoveModal(true);
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2.5 cursor-pointer"
                        >
                          <XCircle size={14} className="text-[#6B7280]" />
                          <span>Remove from Group</span>
                        </button>
                      </div>

                      <div className="py-0.5">
                        <button
                          onClick={() => {
                            setShowDeleteModal(true);
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                        >
                          <Trash2 size={14} className="text-red-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  to={`/shoe-sales/item-groups/${id}`}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-none border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-[#6B7280] shadow-xs transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={15} />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs overflow-hidden">
          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 px-6 border-b border-[#E5E7EB] bg-[#F9FAFB]/70">
            {[
              { id: "Overview", label: "Overview", icon: Info },
              { id: "Stocks", label: "Stocks", icon: Warehouse, badge: warehouseStocks.length },
              ...(isAdmin || user?.power === 'warehouse' ? [{ id: "History", label: "History", icon: Clock }] : [])
            ].map(({ id: tabId, label, icon: TabIcon, badge }) => {
              const isActive = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setActiveTab(tabId)}
                  className={`inline-flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[1px] outline-none ${
                    isActive
                      ? "border-[#8B5CF6] text-[#7C3AED] bg-white font-bold"
                      : "border-transparent text-[#6B7280] hover:text-[#111827] hover:border-[#D1D5DB]"
                  }`}
                  style={{
                    color: isActive ? "#7C3AED" : undefined,
                  }}
                >
                  <TabIcon size={15} className={isActive ? "text-[#8B5CF6]" : "text-[#9CA3AF]"} />
                  <span>{label}</span>
                  {badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-none font-mono font-bold border ${
                        isActive
                          ? "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]"
                          : "bg-white text-[#6B7280] border-[#E5E7EB]"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            {activeTab === "Overview" && (
              <div className="space-y-8">
                {/* Stock Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6" key={`stock-summary-${warehouseStocks.length}-${JSON.stringify(stockTotals)}`}>
                  <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-none p-5 shadow-2xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#3B82F6] mb-1.5">Stock on Hand</p>
                    <p className="text-3xl font-extrabold text-[#1E3A8A] font-mono">{searchParams.get("pieceSku") ? "1" : stockTotals.accounting.stockOnHand.toFixed(0)}</p>
                  </div>
                  <div className="bg-[#ECFDF5] border border-[#D1FAE5] rounded-none p-5 shadow-2xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#10B981] mb-1.5">Available for Sale</p>
                    <p className="text-3xl font-extrabold text-[#065F46] font-mono">{searchParams.get("pieceSku") ? "1" : stockTotals.accounting.availableForSale.toFixed(0)}</p>
                  </div>
                  <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-none p-5 shadow-2xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#D97706] mb-1.5">Reorder Point</p>
                    <p className="text-3xl font-extrabold text-[#92400E] font-mono">{item.reorderPoint || "—"}</p>
                  </div>
                </div>

                {/* Images Section */}
                {itemGroup.groupImages && itemGroup.groupImages.length > 0 && (
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-4 rounded-none">
                    <AttachmentDisplay attachments={itemGroup.groupImages} />
                  </div>
                )}

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Pricing */}
                    <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs">
                      <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Pricing</h3>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">Cost Price</span>
                          <span className="text-sm font-bold text-[#111827] font-mono">₹{typeof item.costPrice === 'number' ? item.costPrice.toFixed(2) : (item.costPrice || "0.00")}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">Selling Price</span>
                          <span className="text-sm font-bold text-[#10B981] font-mono">₹{typeof item.sellingPrice === 'number' ? item.sellingPrice.toFixed(2) : (item.sellingPrice || "0.00")}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">MRP</span>
                          <span className="text-sm font-bold text-[#7C3AED] font-mono">₹{parseFloat(item.mrp) > 0 ? parseFloat(item.mrp).toFixed(2) : (parseFloat(item.sellingPrice) || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">HSN Code</span>
                          <span className="text-xs font-bold text-[#111827] font-mono">{item.hsnCode || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tax */}
                    <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs">
                      <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Tax</h3>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">Tax Preference</span>
                          <span className="text-xs font-bold text-[#111827]">{itemGroup.taxPreference === "taxable" ? "Taxable" : "Non-Taxable"}</span>
                        </div>
                        {itemGroup.intraStateTaxRate && (
                          <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                            <span className="text-xs font-medium text-[#6B7280]">Intra State Tax</span>
                            <span className="text-xs font-bold text-[#111827] font-mono">{itemGroup.intraStateTaxRate}</span>
                          </div>
                        )}
                        {itemGroup.interStateTaxRate && (
                          <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                            <span className="text-xs font-medium text-[#6B7280]">Inter State Tax</span>
                            <span className="text-xs font-bold text-[#111827] font-mono">{itemGroup.interStateTaxRate}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs">
                      <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Status</h3>
                      </div>
                      <div className="p-5 flex flex-wrap gap-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold uppercase tracking-wider border ${itemGroup.sellable !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-none ${itemGroup.sellable !== false ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          Sellable
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold uppercase tracking-wider border ${itemGroup.purchasable !== false ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-none ${itemGroup.purchasable !== false ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                          Purchasable
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold uppercase tracking-wider border ${item.returnable === true ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-none ${item.returnable === true ? 'bg-purple-500' : 'bg-gray-400'}`}></span>
                          {item.returnable === true ? 'Returnable' : 'Non-Returnable'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Details */}
                    <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs">
                      <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Details</h3>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">Item Group</span>
                          <span className="text-xs font-bold text-[#111827] uppercase">{itemGroup.name}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">Item Type</span>
                          <span className="text-xs font-bold text-[#111827] uppercase">{itemGroup.itemType === "goods" ? "Inventory Item" : "Service"}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">SKU</span>
                          <span className="text-xs font-bold text-[#111827] font-mono">{searchParams.get("pieceSku") || item.sku || "—"}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">Unit</span>
                          <span className="text-xs font-bold text-[#111827] uppercase">{itemGroup.unit || "pcs"}</span>
                        </div>
                        {itemGroup.attributeRows && itemGroup.attributeRows.map((attrRow, idx) => {
                          const attrValue = item.attributeCombination && item.attributeCombination[idx] 
                            ? item.attributeCombination[idx] 
                            : getAttributeValue(attrRow.attribute);
                          return attrRow.attribute ? (
                            <div key={idx} className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                              <span className="text-xs font-medium text-[#6B7280]">{attrRow.attribute}</span>
                              <span className="text-xs font-bold text-[#111827]">{attrValue || "—"}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>

                    {/* Inventory */}
                    <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs">
                      <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Inventory</h3>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">Inventory Account</span>
                          <span className="text-xs font-bold text-[#111827]">Inventory Asset</span>
                        </div>
                        {itemGroup.inventoryValuationMethod && (
                          <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                            <span className="text-xs font-medium text-[#6B7280]">Valuation Method</span>
                            <span className="text-xs font-bold text-[#111827] uppercase">{itemGroup.inventoryValuationMethod}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">Track Inventory</span>
                          <span className={`text-xs font-bold uppercase tracking-wider ${itemGroup.trackInventory ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {itemGroup.trackInventory ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Accounts */}
                    <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs">
                      <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Accounts</h3>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">Sales Account</span>
                          <span className="text-xs font-bold text-[#111827]">Sales</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                          <span className="text-xs font-medium text-[#6B7280]">Purchase Account</span>
                          <span className="text-xs font-bold text-[#111827]">Cost of Goods Sold</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Stocks" && (
              <div className="space-y-6">
                {/* Stock Location Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
                  <button
                    onClick={() => {
                      navigate(`/shoe-sales/item-groups/${id}/items/${itemId}/stocks?type=${stockType}`);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
                  >
                    <Plus size={16} className="text-[#8B5CF6]" />
                    <span>Add Stock</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStockType("accounting")}
                      className={`h-8 px-3.5 text-xs font-bold uppercase tracking-wider rounded-none border transition-colors cursor-pointer ${
                        stockType === "accounting"
                          ? "bg-[#8B5CF6] text-white border-[#8B5CF6]"
                          : "bg-[#EEEEEE] text-[#4B5563] border-[#E5E7EB] hover:bg-[#E2E2E2]"
                      }`}
                    >
                      Accounting Stock
                    </button>
                    <button
                      onClick={() => setStockType("physical")}
                      className={`h-8 px-3.5 text-xs font-bold uppercase tracking-wider rounded-none border transition-colors cursor-pointer ${
                        stockType === "physical"
                          ? "bg-[#8B5CF6] text-white border-[#8B5CF6]"
                          : "bg-[#EEEEEE] text-[#4B5563] border-[#E5E7EB] hover:bg-[#E2E2E2]"
                      }`}
                    >
                      Physical Stock
                    </button>
                  </div>
                </div>

                {/* Warehouses Table */}
                {allWarehouses.length > 0 || warehouseStocks.length > 0 ? (
                  <div className="overflow-x-auto border border-[#E5E7EB] rounded-none shadow-xs">
                    <table className="min-w-full divide-y divide-[#E5E7EB]">
                      <thead>
                        <tr className="bg-[#1e1e1e] text-white">
                          <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider">
                            Warehouse Name
                          </th>
                          <th colSpan={3} className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider border-l border-[#333333]">
                            {stockType === "accounting" ? "Accounting Stock" : "Physical Stock"}
                          </th>
                        </tr>
                        <tr className="bg-[#2a2a2a] text-gray-200 border-t border-[#333333]">
                          <th className="px-5 py-2"></th>
                          <th className="px-5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-300 border-l border-[#333333]">
                            Stock on Hand
                          </th>
                          <th className="px-5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-300 border-l border-[#333333]">
                            Committed Stock
                          </th>
                          <th className="px-5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-300 border-l border-[#333333]">
                            Available for Sale
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#E5E7EB]">
                        {warehouseStocks
                          .filter((stock) => true)
                          .map((stock, idx) => {
                          const accountingOnHand = stock.stockOnHand !== undefined && stock.stockOnHand !== null
                            ? parseFloat(stock.stockOnHand)
                            : parseFloat(stock.openingStock || 0);
                          const accountingCommitted = parseFloat(stock.committedStock || 0);
                          const accountingAvailable = stock.availableForSale !== undefined && stock.availableForSale !== null
                            ? parseFloat(stock.availableForSale)
                            : parseFloat(accountingOnHand - accountingCommitted);

                          const physicalOnHand = stock.physicalStockOnHand !== undefined && stock.physicalStockOnHand !== null
                            ? parseFloat(stock.physicalStockOnHand)
                            : parseFloat(stock.physicalOpeningStock || 0);
                          const physicalCommitted = parseFloat(stock.physicalCommittedStock || 0);
                          const physicalAvailable = stock.physicalAvailableForSale !== undefined && stock.physicalAvailableForSale !== null
                            ? parseFloat(stock.physicalAvailableForSale)
                            : parseFloat(physicalOnHand - physicalCommitted || 0);

                          const stockOnHandValue = stockType === "accounting" ? accountingOnHand : (isNaN(physicalOnHand) ? 0 : physicalOnHand);
                          const committedStockValue = stockType === "accounting" ? accountingCommitted : (isNaN(physicalCommitted) ? 0 : physicalCommitted);
                          const availableForSaleValue = stockType === "accounting" ? accountingAvailable : (isNaN(physicalAvailable) ? 0 : physicalAvailable);
                          const isMainWarehouse = stock.warehouse === "Warehouse";
                          
                          return (
                            <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                              <td className="px-5 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {isMainWarehouse && (
                                    <Star size={14} className="text-amber-500 fill-amber-500 shrink-0" />
                                  )}
                                  <span className="text-xs font-bold text-[#111827] uppercase">
                                    {stock.warehouse}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap text-xs font-mono font-semibold text-[#111827] border-l border-[#E5E7EB]">
                                {stockOnHandValue.toFixed(2)}
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap text-xs font-mono font-medium text-[#6B7280] border-l border-[#E5E7EB]">
                                {committedStockValue.toFixed(2)}
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap text-xs font-mono font-bold text-emerald-600 border-l border-[#E5E7EB]">
                                {availableForSaleValue.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-none border border-[#E5E7EB] bg-white p-12 text-center">
                    <Warehouse size={40} className="mx-auto mb-3 text-[#9CA3AF]" />
                    <p className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">No stock locations added yet</p>
                    <p className="text-xs text-[#6B7280] mb-4">Click "Stock Locations" above to add stocks to warehouses</p>
                    <button
                      onClick={() => navigate(`/shoe-sales/item-groups/${id}/items/${itemId}/stocks?type=${stockType}`)}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus size={14} className="text-[#6B7280]" />
                      <span>Add Stock Locations</span>
                    </button>
                  </div>
                )}

                {/* Show Inactive Warehouses Link */}
                {warehouseStocks.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setShowInactiveWarehouses(!showInactiveWarehouses)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer"
                    >
                      <span>Show Inactive Warehouses</span>
                      <ChevronDown 
                        size={14} 
                        className={`text-[#6B7280] transition-transform duration-200 ${
                          showInactiveWarehouses ? "rotate-180" : "rotate-0"
                        }`} 
                      />
                    </button>
                  </div>
                )}

                {/* Inactive Warehouses (if shown) */}
                {showInactiveWarehouses && warehouseStocks.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-none border border-[#E5E7EB] bg-white">
                    <table className="min-w-full divide-y divide-[#E5E7EB]">
                      <thead>
                        <tr className="bg-[#1e1e1e] text-white">
                          <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider">
                            Warehouse Name
                          </th>
                          <th colSpan={3} className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider border-l border-[#333333]">
                            {stockType === "accounting" ? "Accounting Stock" : "Physical Stock"}
                          </th>
                        </tr>
                        <tr className="bg-[#2a2a2a] text-gray-200 border-t border-[#333333]">
                          <th className="px-5 py-2"></th>
                          <th className="px-5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-300 border-l border-[#333333]">
                            Stock on Hand
                          </th>
                          <th className="px-5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-300 border-l border-[#333333]">
                            Committed Stock
                          </th>
                          <th className="px-5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-300 border-l border-[#333333]">
                            Available for Sale
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#E5E7EB]">
                        <tr className="opacity-60 hover:bg-[#F9FAFB]">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Warehouse size={14} className="text-gray-400" />
                              <span className="text-xs font-bold text-gray-500 uppercase">Inactive Warehouse</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-xs font-mono text-gray-500 border-l border-[#E5E7EB]">0.00</td>
                          <td className="px-5 py-3 whitespace-nowrap text-xs font-mono text-gray-500 border-l border-[#E5E7EB]">0.00</td>
                          <td className="px-5 py-3 whitespace-nowrap text-xs font-mono font-medium text-gray-500 border-l border-[#E5E7EB]">0.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "History" && (isAdmin || user?.power === 'warehouse') && (
              <div className="py-2">
                {loadingHistory ? (
                  <div className="py-12 text-center text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    Loading history...
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-12 text-center text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    No history available
                  </div>
                ) : (
                  <div className="rounded-none border border-[#E5E7EB] bg-white overflow-hidden shadow-xs">
                    <table className="min-w-full divide-y divide-[#E5E7EB]">
                      <thead className="bg-[#1e1e1e] text-white">
                        <tr>
                          <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider">
                            DATE
                          </th>
                          <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-l border-[#333333]">
                            DETAILS
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#E5E7EB]">
                        {history.map((entry, idx) => {
                          const dateValue = entry.changedAt || entry.createdAt || new Date();
                          const date = new Date(dateValue);
                          
                          if (isNaN(date.getTime())) {
                            console.error("Invalid date for history entry:", entry);
                          }
                          
                          const formattedDate = date.toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });
                          const formattedTime = date.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          });
                          let detailsText = entry.details || "updated";
                          if (entry.changedBy) {
                            if (entry.changeType === "CREATE") {
                              detailsText = `created by - ${entry.changedBy}`;
                            } else {
                              detailsText = entry.details && entry.details !== "updated" 
                                ? `${entry.details} - ${entry.changedBy}`
                                : `updated by - ${entry.changedBy}`;
                            }
                          }
                          
                          return (
                            <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                              <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono font-bold text-[#111827]">
                                {formattedDate} {formattedTime}
                              </td>
                              <td className="px-5 py-3.5 text-xs text-[#374151] border-l border-[#E5E7EB]">
                                {detailsText}
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

            {activeTab !== "Overview" && activeTab !== "Stocks" && activeTab !== "History" && (
              <div className="py-12 text-center text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                {activeTab} content coming soon...
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="relative w-full max-w-md rounded-none border border-[#E5E7EB] bg-white shadow-2xl">
              <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827]">Delete Item</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-[#111827]">"{item?.name}"</span>? This action cannot be undone.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                  className="h-9 px-4 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="h-9 px-4 rounded-none bg-red-600 hover:bg-red-700 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mark as Inactive Confirmation Modal */}
        {showInactiveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="relative w-full max-w-md rounded-none border border-[#E5E7EB] bg-white shadow-2xl">
              <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827]">Mark as Inactive</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  Are you sure you want to mark <span className="font-bold text-[#111827]">"{item?.name}"</span> as inactive? This will remove the item from the group.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowInactiveModal(false)}
                  disabled={loading}
                  className="h-9 px-4 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsInactive}
                  disabled={loading}
                  className="h-9 px-4 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Mark as Inactive"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Move to Another Group Modal */}
        {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="relative w-full max-w-md rounded-none border border-[#E5E7EB] bg-white shadow-2xl">
              <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827]">Move to Another Group</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-xs text-[#4B5563] mb-3">
                  Select a target group to move <span className="font-bold text-[#111827]">"{item?.name}"</span> to:
                </p>
                {loadingGroups ? (
                  <div className="text-center py-4 text-xs font-bold uppercase tracking-wider text-[#6B7280]">Loading groups...</div>
                ) : allItemGroups.length === 0 ? (
                  <div className="text-center py-4 text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    No other item groups available.
                  </div>
                ) : (
                  <select
                    value={selectedTargetGroupId}
                    onChange={(e) => setSelectedTargetGroupId(e.target.value)}
                    className="w-full rounded-none border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-bold text-[#111827] focus:border-[#8B5CF6] focus:outline-none"
                  >
                    <option value="">Select a group...</option>
                    {allItemGroups.map((group) => (
                      <option key={group._id || group.id} value={group._id || group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-end gap-2.5">
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setSelectedTargetGroupId("");
                  }}
                  disabled={loading}
                  className="h-9 px-4 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMoveToGroup}
                  disabled={loading || !selectedTargetGroupId || loadingGroups || allItemGroups.length === 0}
                  className="h-9 px-4 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Moving..." : "Move"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove from Item Group Modal */}
        {showRemoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="relative w-full max-w-md rounded-none border border-[#E5E7EB] bg-white shadow-2xl">
              <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827]">Remove from Item Group</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  Are you sure you want to remove <span className="font-bold text-[#111827]">"{item?.name}"</span> from this item group? This action cannot be undone.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowRemoveModal(false)}
                  disabled={loading}
                  className="h-9 px-4 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsInactive}
                  disabled={loading}
                  className="h-9 px-4 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoeSalesItemDetailFromGroup;


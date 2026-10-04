import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, X, Building2, ChevronDown, Package } from "lucide-react";
import Header from "../components/Header";
import ImageUpload from "../components/ImageUpload";
import AttachmentDisplay from "../components/AttachmentDisplay";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

// All warehouses/stores in the system - restricted to Warehouse and MG Road
const ALL_WAREHOUSES = [
  "Warehouse",
  "MG Road",
];

const ShoeSalesItemGroupDetail = () => {
  const isSidebarOpen = useSidebar();
  const { id } = useParams();
  const navigate = useNavigate();
  const [itemGroup, setItemGroup] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupImages, setGroupImages] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingStock, setEditingStock] = useState({});
  const [savingStock, setSavingStock] = useState(false);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const moreMenuRef = useRef(null);

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

  // Get user info for warehouse filtering
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userEmail = user?.email || user?.username || "";
  const adminEmails = ['officerootments@gmail.com'];
  const isAdminEmail = userEmail && adminEmails.some(email => userEmail.toLowerCase() === email.toLowerCase());
  const isAdmin = isAdminEmail ||
                  user?.power === "admin" || 
                  (user?.locCode && (user.locCode === '858' || user.locCode === '103'));
  
  // Fallback locations mapping
  const fallbackLocations = [
    { "locName": "Warehouse", "locCode": "858" },
    { "locName": "G.Kottayam", "locCode": "701" },
    { "locName": "G.Kannur", "locCode": "716" },
    { "locName": "G.Calicut ", "locCode": "712" },
    { "locName": "G.Manjeri", "locCode": "710" },
    { "locName": "G.Thrissur", "locCode": "704" },
    { "locName": "G.Perumbavoor", "locCode": "703" },
    { "locName": "G.Palakkad ", "locCode": "705" },
    { "locName": "G.Edappal", "locCode": "707" },
    { "locName": "G-Edappally", "locCode": "702" },
    { "locName": "SG-Trivandrum", "locCode": "700" },
    { "locName": "G.Kalpetta", "locCode": "717" },
    { "locName": "G.Chavakkad", "locCode": "706" },
    { "locName": "G.Perinthalmanna", "locCode": "709" },
    { "locName": "G.Kottakkal", "locCode": "711" },
    { "locName": "G.Mg Road", "locCode": "718" },
    { "locName": "WAREHOUSE", "locCode": "103" }
  ];
  
  // Get user's warehouse name
  const getUserWarehouse = () => {
    if (!user?.locCode) return "Warehouse";
    const location = fallbackLocations.find(loc => loc.locCode === user.locCode || loc.locCode === String(user.locCode));
    const locName = location?.locName || user?.username || user?.locName || "";
    if (!locName) return "Warehouse";
    return mapWarehouse(locName) || "Warehouse";
  };
  
  const userWarehouse = getUserWarehouse();
  // Filter by warehouse only for non-admin users OR when admin is viewing a specific store
  const shouldFilterByWarehouse = !isAdmin || (isAdmin && userWarehouse !== "Warehouse");

  // Initialize all warehouses list
  useEffect(() => {
    // Sort warehouses: "Warehouse" first, then alphabetically
    const sortedWarehouses = [...ALL_WAREHOUSES].sort((a, b) => {
      if (a === "Warehouse") return -1;
      if (b === "Warehouse") return 1;
      return a.localeCompare(b);
    });
    setAllWarehouses(sortedWarehouses);
  }, []);

  useEffect(() => {
    const fetchItemGroup = async () => {
      try {
        const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
        
        // Build query params - filter by warehouse for branch users
        const queryParams = new URLSearchParams();
        if (userWarehouse) queryParams.append('warehouse', userWarehouse);
        queryParams.append('isAdmin', isAdmin.toString());
        // Filter by warehouse for:
        // 1. Non-admin users viewing a specific branch
        // 2. Admin users who have switched to a specific store (not Warehouse)
        if (userWarehouse && userWarehouse !== "Warehouse") {
          queryParams.append('filterByWarehouse', 'true');
        }
        
        const url = `${API_URL}/api/shoe-sales/item-groups/${id}?${queryParams.toString()}`;
        console.log(`📡 Fetching item group: ${url}`);
        console.log(`📡 User locCode: ${user?.locCode}, userWarehouse: ${userWarehouse}, isAdmin: ${isAdmin}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Failed to fetch item group");
        }
        
        const data = await response.json();
        setItemGroup(data);
      } catch (error) {
        console.error("Error fetching item group:", error);
        setItemGroup(null);
      }
    };

    if (id) {
      fetchItemGroup();
    }
  }, [id, userWarehouse, isAdmin]);

  const handleMarkAsInactive = async () => {
    try {
      setLoading(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      // Prepare update payload with all fields preserved
      const updatePayload = {
        name: itemGroup.name,
        sku: itemGroup.sku || "",
        itemType: itemGroup.itemType || "goods",
        unit: itemGroup.unit || "",
        manufacturer: itemGroup.manufacturer || "",
        brand: itemGroup.brand || "",
        category: itemGroup.category || "other",
        taxPreference: itemGroup.taxPreference || "taxable",
        intraStateTaxRate: itemGroup.intraStateTaxRate || "",
        interStateTaxRate: itemGroup.interStateTaxRate || "",
        inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
        createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
        attributeRows: itemGroup.attributeRows || [],
        sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
        purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
        trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
        items: itemGroup.items || [],
        stock: itemGroup.stock || 0,
        reorder: itemGroup.reorder || "",
        isActive: false, // Set to inactive
      };
      
      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || payload?.errors?.join(", ") || "Failed to mark group as inactive");
      }

      const updatedGroup = await response.json();
      setItemGroup(updatedGroup);
      setShowInactiveModal(false);
      setShowMoreMenu(false);
      alert("Item group has been marked as inactive.");
    } catch (error) {
      console.error("Error marking group as inactive:", error);
      alert(error.message || "Failed to mark group as inactive. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete item group");
      }

      setShowDeleteModal(false);
      setShowMoreMenu(false);
      alert("Item group has been deleted successfully.");
      navigate("/shoe-sales/item-groups");
    } catch (error) {
      console.error("Error deleting item group:", error);
      alert("Failed to delete item group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!itemGroup) {
    return (
      <div className="invoice-page-wrapper min-h-screen bg-[#F9FAFB] text-[#111827]">
        <Header title="Item Groups" />
        <div className={`transition-all duration-300 p-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="rounded-none border border-[#E5E7EB] bg-white shadow-xs p-8 text-center max-w-md mx-auto mt-12">
            <p className="text-base font-bold text-[#111827] uppercase">Item Group Not Found</p>
            <Link
              to="/shoe-sales/item-groups"
              className="mt-4 inline-block px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
            >
              Back to Item Groups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get items from the item group (saved items from database) - filter out inactive items
  const allItems = itemGroup.items && Array.isArray(itemGroup.items) ? itemGroup.items : [];
  const items = allItems.filter(item => item.isActive !== false);

  // Calculate stock totals from items - sum of all item stocks
  // Example: If 9 items each have 10 stock, total = 90
  const calculateStock = () => {
    // Sum up all stock values from items in the group
    const totalStock = items.reduce((sum, item) => {
      // Handle both number and string stock values
      let itemStock = 0;
      
      // First try direct stock property
      if (typeof item.stock === 'number') {
        itemStock = item.stock;
      } else if (typeof item.stock === 'string') {
        itemStock = parseFloat(item.stock) || 0;
      } else if (item.stock !== null && item.stock !== undefined) {
        itemStock = Number(item.stock) || 0;
      }
      
      // If stock is 0 or not available, check warehouseStocks
      if (itemStock === 0 && item.warehouseStocks && Array.isArray(item.warehouseStocks) && item.warehouseStocks.length > 0) {
        // Sum up stock from all warehouses
        const warehouseTotal = item.warehouseStocks.reduce((warehouseSum, warehouse) => {
          const openingStock = typeof warehouse.openingStock === 'number' ? warehouse.openingStock : (parseFloat(warehouse.openingStock) || 0);
          const stockOnHand = typeof warehouse.stockOnHand === 'number' ? warehouse.stockOnHand : (parseFloat(warehouse.stockOnHand) || 0);
          // Use stockOnHand if available, otherwise openingStock
          return warehouseSum + (stockOnHand > 0 ? stockOnHand : openingStock);
        }, 0);
        if (warehouseTotal > 0) {
          itemStock = warehouseTotal;
        }
      }
      
      console.log(`Item: ${item.name}, Stock: ${itemStock}, Direct stock: ${item.stock}, Warehouse stocks:`, item.warehouseStocks);
      
      return sum + itemStock;
    }, 0);
    
    console.log(`Total stock calculated: ${totalStock} from ${items.length} items`);
    
    return {
      openingStock: totalStock, // Sum of all item stocks (e.g., 9 items × 10 stock = 90)
      stockOnHand: totalStock, // Sum of all item stocks
      committedStock: 0, // This would come from pending orders/transactions
      totalStock: totalStock
    };
  };

  const stockInfo = calculateStock();

  // Prepare opening stock distribution data for modal
  const getOpeningStockDistribution = () => {
    const distribution = [];
    
    // Get warehouses that have stock data from items
    const warehousesWithStock = new Set();
    items.forEach(item => {
      if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
        item.warehouseStocks.forEach(ws => {
          if (ws.warehouse) {
            // Filter out corrupted warehouse names
            const warehouseName = ws.warehouse.toString().trim();
            if (warehouseName !== "arehouse Branch" && warehouseName !== "arehouse") {
              warehousesWithStock.add(ws.warehouse);
            }
          }
        });
      }
    });
    
    // Combine all warehouses from the system with warehouses that have stock
    // This ensures we show all stores, even if they don't have stock yet
    const warehousesToShow = allWarehouses.length > 0 ? allWarehouses : ALL_WAREHOUSES;
    const allWarehousesSet = new Set([
      ...warehousesToShow,
      ...warehousesWithStock
    ]);
    // Sort: "Warehouse" first, then alphabetically
    const sortedWarehouses = Array.from(allWarehousesSet).sort((a, b) => {
      if (a === "Warehouse") return -1;
      if (b === "Warehouse") return 1;
      return a.localeCompare(b);
    });
    
    // Process each item
    items.forEach(item => {
      const itemName = item.name || "Unnamed Item";
      // For group items, create a SKU from the item name or use existing SKU
      let itemSku = "N/A";
      
      if (item.sku) {
        itemSku = item.sku;
      } else if (item.itemSku) {
        itemSku = item.itemSku;
      } else if (item.code) {
        itemSku = item.code;
      } else if (itemName && itemName.includes(' - ')) {
        // Extract SKU-like info from name: "Aurora test - green/30" -> "green/30"
        const parts = itemName.split(' - ');
        if (parts.length > 1) {
          itemSku = parts[parts.length - 1]; // Get the last part (color/size)
        }
      } else if (item.attributeCombination && Array.isArray(item.attributeCombination)) {
        itemSku = item.attributeCombination.join('-');
      }
      
      const itemId = item._id || item.id;
      const itemWarehouseStocks = item.warehouseStocks || [];
      const itemSellingPrice = parseFloat(item.sellingPrice) || 0;
      
      // Calculate totals for this item
      let totalOpeningStock = 0;
      let totalOpeningStockValue = 0;
      
      // Create warehouse entries for this item
      const warehouseEntries = sortedWarehouses
        .filter(warehouse => {
          // Filter out corrupted warehouse names
          const warehouseName = warehouse.toString().trim();
          return warehouseName !== "arehouse Branch" && warehouseName !== "arehouse";
        })
        .map(warehouse => {
        const ws = itemWarehouseStocks.find(ws => 
          ws.warehouse && ws.warehouse.toString().trim() === warehouse.toString().trim()
        );
        
        // Get monthly opening stock if available
        const monthlyEntry = ws?.monthlyOpeningStock?.find(m => m.month === selectedMonth);
        
        // Get current month for comparison
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const isCurrentMonth = selectedMonth === currentMonth;
        
        // For current month, show closing stock (actual current stock after sales)
        // For past/future months, show opening stock (historical value)
        let openingStock = 0;
        let openingStockValue = 0;
        
        if (monthlyEntry) {
          if (isCurrentMonth) {
            // Current month: use actual stockOnHand (source of truth) instead of closingStock
            // This ensures we always show the real current stock, even if monthly entry is out of sync
            const actualStock = ws ? (parseFloat(ws.stockOnHand) || 0) : 0;
            const monthlyClosingStock = parseFloat(monthlyEntry.closingStock) || 0;
            
            // Use actual stock if it differs from monthly closing stock (monthly entry might be outdated)
            openingStock = actualStock > 0 ? actualStock : monthlyClosingStock;
            
            // Calculate value as quantity × selling price
            openingStockValue = openingStock * itemSellingPrice;
          } else {
            // Past/future month: show opening stock (historical value)
            openingStock = parseFloat(monthlyEntry.openingStock) || 0;
            // Calculate value as quantity × selling price
            openingStockValue = openingStock * itemSellingPrice;
          }
        } else {
          // No monthly entry: use current stockOnHand (actual stock)
          if (ws) {
            // Don't fallback to openingStock if stockOnHand is 0 - 0 is a valid value!
            openingStock = ws.stockOnHand !== undefined && ws.stockOnHand !== null
              ? parseFloat(ws.stockOnHand)
              : parseFloat(ws.openingStock || 0);
            // Calculate value as quantity × selling price
            openingStockValue = openingStock * itemSellingPrice;
          }
        }
        
        // Get editing values if in edit mode
        const editKey = `${itemId}-${warehouse}`;
        const editValue = editingStock[editKey];
        
        // If editing, recalculate value based on edited quantity
        const finalOpeningStock = editValue ? parseFloat(editValue.openingStock) || 0 : openingStock;
        const finalOpeningStockValue = finalOpeningStock * itemSellingPrice;
        
        totalOpeningStock += finalOpeningStock;
        totalOpeningStockValue += finalOpeningStockValue;
        
        return {
          warehouse,
          openingStock: finalOpeningStock,
          openingStockValue: finalOpeningStockValue,
          hasStock: finalOpeningStock > 0 || finalOpeningStockValue > 0,
          itemId,
          itemSellingPrice,
        };
      });
      
      // Add total row
      distribution.push({
        itemName,
        itemSku,
        itemId,
        isTotal: false,
        warehouse: null,
        openingStock: totalOpeningStock,
        openingStockValue: totalOpeningStockValue,
        warehouseEntries
      });
    });
    
    return distribution;
  };

  const openingStockData = getOpeningStockDistribution();

  // Handle stock input change
  const handleStockChange = (itemId, warehouse, field, value, itemSellingPrice) => {
    const key = `${itemId}-${warehouse}`;
    
    if (field === 'openingStock') {
      // When quantity changes, recalculate the value
      const quantity = parseFloat(value) || 0;
      const calculatedValue = quantity * (itemSellingPrice || 0);
      
      setEditingStock(prev => ({
        ...prev,
        [key]: {
          openingStock: value,
          openingStockValue: calculatedValue,
        }
      }));
    }
  };

  // Save monthly opening stock
  const handleSaveMonthlyStock = async () => {
    try {
      setSavingStock(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      // Prepare data for saving - include all items with their current or edited values
      const itemsToSave = [];
      openingStockData.forEach(itemData => {
        itemData.warehouseEntries.forEach(whEntry => {
          const editKey = `${whEntry.itemId}-${whEntry.warehouse}`;
          const editValue = editingStock[editKey];
          
          // Include item if it has been edited OR if it has existing stock
          if (editValue || whEntry.openingStock > 0 || whEntry.openingStockValue > 0) {
            // Ensure itemId is a string
            const itemIdStr = whEntry.itemId?.toString ? whEntry.itemId.toString() : String(whEntry.itemId || '');
            
            itemsToSave.push({
              itemId: itemIdStr,
              warehouse: whEntry.warehouse,
              openingStock: editValue ? (parseFloat(editValue.openingStock) || 0) : whEntry.openingStock,
              openingStockValue: editValue ? (parseFloat(editValue.openingStockValue) || 0) : whEntry.openingStockValue,
            });
          }
        });
      });

      if (itemsToSave.length === 0) {
        alert("No changes to save. Please edit at least one opening stock value.");
        setSavingStock(false);
        return;
      }

      console.log(`Saving ${itemsToSave.length} item updates for month ${selectedMonth}`);

      console.log("Saving monthly opening stock:", {
        month: selectedMonth,
        itemsCount: itemsToSave.length,
        items: itemsToSave
      });

      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}/monthly-opening-stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          items: itemsToSave,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("Error response:", errorData);
        throw new Error(errorData.message || errorData.error || "Failed to save monthly opening stock");
      }

      // Refresh item group data
      const fetchItemGroup = async () => {
        const queryParams = new URLSearchParams();
        if (userWarehouse) queryParams.append('warehouse', userWarehouse);
        queryParams.append('isAdmin', isAdmin.toString());
        if (userWarehouse && userWarehouse !== "Warehouse") {
          queryParams.append('filterByWarehouse', 'true');
        }
        
        const url = `${API_URL}/api/shoe-sales/item-groups/${id}?${queryParams.toString()}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setItemGroup(data);
        }
      };

      await fetchItemGroup();
      setEditingStock({});
      alert("Monthly opening stock saved successfully!");
    } catch (error) {
      console.error("Error saving monthly opening stock:", error);
      alert(error.message || "Failed to save monthly opening stock. Please try again.");
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <div className="invoice-page-wrapper min-h-screen bg-[#F9FAFB] text-[#111827]">
      <Header title="Item Groups" />

      <div className={`transition-all duration-300 p-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Action Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/shoe-sales/item-groups")}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft size={14} className="text-[#111827]" />
              <span>Item Groups</span>
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#111827] uppercase font-mono truncate">
                {itemGroup.name}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] uppercase tracking-wider">
                {Array.isArray(items) ? items.length : 0} Items
              </span>
              {itemGroup.isActive === false && (
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none bg-red-50 text-red-700 border border-red-200 uppercase tracking-wider">
                  Inactive
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/shoe-sales/item-groups/${id}/edit`}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-colors cursor-pointer"
            >
              <Edit size={13} className="text-white" />
              <span>Edit</span>
            </Link>

            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer"
              >
                <span>More</span>
                <ChevronDown size={14} className="text-[#6B7280]" />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 mt-1 w-48 rounded-none border border-[#E5E7EB] bg-white shadow-lg z-50 py-1">
                  <button
                    onClick={() => {
                      setShowInactiveModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-[#374151] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  >
                    Mark as Inactive
                  </button>
                  <div className="h-px bg-[#E5E7EB] my-1" />
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            <Link
              to="/shoe-sales/item-groups"
              className="inline-flex items-center justify-center h-9 w-9 rounded-none border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-[#6B7280] shadow-xs transition-colors cursor-pointer"
              title="Close"
            >
              <X size={15} />
            </Link>
          </div>
        </div>

        {/* Inactive Banner */}
        {itemGroup.isActive === false && (
          <div className="mb-6 rounded-none border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-none bg-red-500"></div>
              <p className="text-xs font-bold text-red-700 uppercase tracking-wider">
                This item group is currently inactive and will not appear in active lists.
              </p>
            </div>
          </div>
        )}

        {/* Main Grid: Details on Left, Upload & Metrics on Right */}
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          {/* Left Column - Primary Details & Items */}
          <div className="space-y-6">
            {/* Primary Details Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs">
              <div className="px-6 py-4 border-b border-[#E5E7EB]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Primary Details
                </h3>
              </div>
              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                      Item Group Name
                    </label>
                    <p className="text-base font-extrabold text-[#111827] uppercase font-mono">{itemGroup.name}</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                      Item Type
                    </label>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                      {itemGroup.itemType === "goods" ? "Inventory Items" : "Service Items"}
                    </p>
                  </div>

                  {Array.isArray(itemGroup.attributeRows) && itemGroup.attributeRows.length > 0 && (
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                        Attributes
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {itemGroup.attributeRows
                          .filter((row) => row?.attribute)
                          .map((row, idx) => (
                            <div
                              key={`${row.attribute}-${idx}`}
                              className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-none p-4 shadow-2xs"
                            >
                              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2.5">
                                {row.attribute}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(row.options || []).map((opt, optIdx) => (
                                  <span
                                    key={`${row.attribute}-${opt}-${optIdx}`}
                                    className="inline-flex items-center px-3 py-1 bg-white border border-[#E5E7EB] text-xs font-bold text-[#111827] rounded-none shadow-2xs"
                                  >
                                    {opt}
                                  </span>
                                ))}
                                {(!row.options || row.options.length === 0) && (
                                  <span className="text-xs text-[#9CA3AF]">No options added</span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                      Unit
                    </label>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#111827]">{itemGroup.unit || "PCS"}</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                      Tax Preference
                    </label>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#111827]">Taxable</p>
                  </div>

                  {itemGroup.inventoryValuation && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                        Inventory Valuation Method
                      </label>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#111827]">{itemGroup.inventoryValuation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Attached Images Gallery */}
            {itemGroup.groupImages && itemGroup.groupImages.length > 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-4">
                  Attached Images
                </h3>
                <AttachmentDisplay attachments={itemGroup.groupImages} />
              </div>
            )}

            {/* Items Table Card */}
            {items.length > 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-[#8B5CF6]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                      Items in Group
                    </h3>
                    <span className="text-[10px] font-bold text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 border border-[#E5E7EB]">
                      {items.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowOpeningStockModal(true)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-xs transition-colors cursor-pointer"
                  >
                    <Building2 size={13} className="text-[#111827]" />
                    <span>Opening Stock</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#E5E7EB]">
                    <thead className="bg-[#1e1e1e] text-white">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider border-r border-[#333333]">
                          Item Details
                        </th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider border-r border-[#333333]">
                          Cost Price
                        </th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider border-r border-[#333333]">
                          Selling Price
                        </th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider border-r border-[#333333]">
                          MRP
                        </th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider border-r border-[#333333]">
                          Stock on Hand
                        </th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider border-r border-[#333333]">
                          Reorder Point
                        </th>
                        <th className="px-6 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] bg-white">
                      {items.map((item, idx) => {
                        let itemStock = 0;
                        if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
                          itemStock = item.warehouseStocks.reduce((total, ws) => {
                            const stockOnHand = parseFloat(ws.stockOnHand) || 0;
                            return total + stockOnHand;
                          }, 0);
                        } else if (typeof item.stock === 'number') {
                          itemStock = item.stock;
                        } else if (item.stock) {
                          itemStock = parseFloat(item.stock) || 0;
                        }
                        
                        return (
                          <tr 
                            key={item._id || item.id || idx} 
                            className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                            onClick={() => navigate(`/shoe-sales/item-groups/${id}/items/${item._id || item.id}`)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-none border border-[#E5E7EB] bg-[#F9FAFB] shrink-0">
                                  <Package size={18} className="text-[#6B7280]" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-[#111827] uppercase">{item.name || "Unnamed Item"}</p>
                                  <p className="text-[11px] font-mono text-[#6B7280] mt-0.5">[{item.sku || "N/A"}]</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono font-bold text-[#111827]">
                              ₹{typeof item.costPrice === 'number' ? item.costPrice.toFixed(2) : (item.costPrice || "0.00")}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono font-bold text-[#10B981]">
                              ₹{typeof item.sellingPrice === 'number' ? item.sellingPrice.toFixed(2) : (item.sellingPrice || "0.00")}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono font-bold text-[#7C3AED]">
                              ₹{parseFloat(item.mrp) > 0 ? parseFloat(item.mrp).toFixed(2) : (parseFloat(item.sellingPrice) || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono font-bold text-[#111827]">{Math.round(itemStock)}</td>
                            <td className="px-6 py-4 text-xs font-mono text-[#6B7280]">{item.reorderPoint || "—"}</td>
                            <td className="px-6 py-4 text-right">
                              <Link
                                to={`/shoe-sales/item-groups/${id}/items/${item._id || item.id}/edit`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] shadow-2xs transition-colors"
                                title="Edit Variant"
                              >
                                Edit Variant
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Image Upload & Stock Metrics */}
          <div className="space-y-6">
            {/* Image Upload Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-4">
                Product Images
              </h3>
              <ImageUpload
                onImagesSelect={(images) => setGroupImages(images)}
                existingImages={groupImages}
                onRemoveImage={(index) => {
                  setGroupImages(groupImages.filter((_, i) => i !== index));
                }}
                multiple={true}
              />
            </div>

            {/* Opening Stock & Accounting Metrics Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-none shadow-xs overflow-hidden">
              {/* Opening Stock Section */}
              <div className="bg-[#F9FAFB] px-6 py-6 border-b border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-[#8B5CF6]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Opening Stock
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#6B7280] bg-white px-2 py-0.5 border border-[#E5E7EB] uppercase">
                    Total
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-extrabold text-[#111827] font-mono leading-none">
                    {Math.round(stockInfo.openingStock)}
                  </p>
                  <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                    Units
                  </span>
                </div>
              </div>
              
              {/* Accounting Stock Section */}
              <div className="p-6 bg-white space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                  Accounting Stock
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between py-2.5 px-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-none">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-none"></div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Stock on Hand</span>
                    </div>
                    <span className="text-sm font-bold font-mono text-[#111827]">
                      {Math.round(stockInfo.stockOnHand)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-none">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 bg-amber-500 rounded-none"></div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Committed Stock</span>
                    </div>
                    <span className="text-sm font-bold font-mono text-[#111827]">
                      {Math.round(stockInfo.committedStock)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="relative w-full max-w-md rounded-none border border-[#E5E7EB] bg-white shadow-2xl">
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827]">Delete Item Group</h2>
            </div>
            <div className="p-6">
              <p className="text-xs font-medium text-[#4B5563] leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-[#111827]">"{itemGroup?.name}"</span>? This action cannot be undone and will delete all items in this group.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                className="h-9 px-4 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="h-9 px-4 rounded-none bg-[#EF4444] hover:bg-[#DC2626] text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Deleting..." : "Delete Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Inactive Confirmation Modal */}
      {showInactiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="relative w-full max-w-md rounded-none border border-[#E5E7EB] bg-white shadow-2xl">
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827]">Mark as Inactive</h2>
            </div>
            <div className="p-6">
              <p className="text-xs font-medium text-[#4B5563] leading-relaxed">
                Are you sure you want to mark <span className="font-bold text-[#111827]">"{itemGroup?.name}"</span> as inactive? This will hide the group from active lists.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowInactiveModal(false)}
                disabled={loading}
                className="h-9 px-4 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsInactive}
                disabled={loading}
                className="h-9 px-4 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Updating..." : "Mark as Inactive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opening Stock Distribution Modal */}
      {showOpeningStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-white rounded-none border border-[#E5E7EB] shadow-2xl my-8">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827]">
                  Distribution of Opening Stock
                </h2>
                {/* Month Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Month:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setEditingStock({});
                    }}
                    className="px-2.5 py-1 border border-[#E5E7EB] rounded-none text-xs font-bold bg-[#F9FAFB] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOpeningStockModal(false);
                  setEditingStock({});
                }}
                className="h-8 w-8 inline-flex items-center justify-center border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 max-h-[calc(100vh-220px)] overflow-y-auto">
              <div className="border border-[#E5E7EB] rounded-none overflow-hidden">
                <table className="min-w-full divide-y divide-[#E5E7EB]">
                  <thead className="bg-[#1e1e1e] text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-r border-[#333333]">
                        ITEM NAME
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-r border-[#333333]">
                        WAREHOUSE
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider border-r border-[#333333]">
                        OPENING STOCK
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">
                        OPENING STOCK VALUE
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E5E7EB]">
                    {openingStockData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-xs font-semibold text-[#6B7280]">
                          No opening stock data available
                        </td>
                      </tr>
                    ) : (
                      openingStockData.flatMap((itemData) => {
                        const rows = [];
                        
                        // First row: Item name with total
                        rows.push(
                          <tr key={`${itemData.itemId}-total`} className="bg-[#F5F3FF]">
                            <td className="px-4 py-2.5 text-xs font-bold text-[#111827] border-r border-[#E5E7EB]">
                              <div>
                                <div className="font-extrabold uppercase">{itemData.itemName}</div>
                                <div className="text-[11px] font-mono text-[#6B7280] mt-0.5">SKU: {itemData.itemSku || "No SKU"}</div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#7C3AED] border-r border-[#E5E7EB]">
                              Warehouse (total)
                            </td>
                            <td className="px-4 py-2.5 text-xs font-mono font-bold text-[#111827] text-right border-r border-[#E5E7EB]">
                              {Math.round(itemData.openingStock)}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-mono font-bold text-[#7C3AED] text-right">
                              ₹{itemData.openingStockValue.toFixed(2)}
                            </td>
                          </tr>
                        );
                        
                        // Add warehouse rows for this item
                        itemData.warehouseEntries.forEach((warehouseEntry, whIdx) => {
                          const isInactive = warehouseEntry.warehouse.toLowerCase().includes('inactive');
                          const editKey = `${warehouseEntry.itemId}-${warehouseEntry.warehouse}`;
                          const isEditing = editingStock[editKey];
                          
                          rows.push(
                            <tr key={`${itemData.itemId}-${warehouseEntry.warehouse}-${whIdx}`} className="hover:bg-[#F9FAFB]">
                              <td className="px-4 py-2 text-xs text-[#6B7280] border-r border-[#E5E7EB]"></td>
                              <td className={`px-4 py-2 text-xs border-r border-[#E5E7EB] ${isInactive ? 'text-[#9CA3AF] italic' : 'text-[#374151] font-medium'}`}>
                                {warehouseEntry.warehouse}
                                {isInactive && <span className="ml-2 text-[10px] text-red-500 font-bold uppercase">(INACTIVE)</span>}
                              </td>
                              <td className="px-4 py-2 text-xs text-right border-r border-[#E5E7EB]">
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={isEditing ? (isEditing.openingStock || '') : Math.round(warehouseEntry.openingStock)}
                                  onChange={(e) => handleStockChange(warehouseEntry.itemId, warehouseEntry.warehouse, 'openingStock', e.target.value, warehouseEntry.itemSellingPrice)}
                                  className="w-24 px-2 py-1 text-right border border-[#E5E7EB] rounded-none text-xs font-mono font-bold bg-[#F9FAFB] focus:bg-white focus:outline-none focus:border-[#8B5CF6]"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-2 text-xs text-right font-mono font-semibold text-[#111827]">
                                ₹{(isEditing ? (isEditing.openingStockValue || 0) : warehouseEntry.openingStockValue).toFixed(2)}
                              </td>
                            </tr>
                          );
                        });
                        
                        return rows;
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-[#F9FAFB] border-t border-[#E5E7EB] px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowOpeningStockModal(false);
                  setEditingStock({});
                }}
                className="h-9 px-4 rounded-none border border-[#E5E7EB] bg-[#EEEEEE] hover:bg-[#E2E2E2] text-xs font-bold uppercase tracking-wider text-[#111827] transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleSaveMonthlyStock}
                disabled={savingStock || Object.keys(editingStock).length === 0}
                className="h-9 px-4 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {savingStock ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Opening Stock</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoeSalesItemGroupDetail;


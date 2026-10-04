import { useState, useEffect, useRef } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search, ChevronLeft, Plus, ChevronDown, Trash2, RefreshCw, Calendar, FileText } from "lucide-react";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";
import Header from "../components/Header";

// Compact Custom Dropdown Component
const CompactDropdown = ({ value, onChange, options, placeholder = "Select...", required = false }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 2,
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
      <div className="rounded-none shadow-lg bg-white border border-gray-300 overflow-hidden animate-in fade-in duration-100">
        <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 bg-gray-50">
          <Search size={13} className="text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="h-7 w-full border-none bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="py-1 max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 text-center">No options found</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option === value;
              return (
                <div
                  key={option}
                  onClick={() => {
                    onChange({ target: { value: option } });
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`px-3.5 py-2.5 text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-purple-50 text-purple-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
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
        <div
          ref={buttonRef}
          onClick={toggleDropdown}
          className="w-full h-[42px] rounded-none border border-gray-300 bg-white text-xs text-gray-800 focus-within:border-purple-600 focus-within:ring-1 focus-within:ring-purple-600 transition-colors cursor-pointer px-3.5 flex items-center justify-between"
        >
          <span className={`truncate ${!value ? "text-gray-400" : "text-gray-900 font-medium"}`}>
            {selectedLabel}
          </span>
          <ChevronDown size={15} className="text-gray-400 shrink-0 pointer-events-none" />
        </div>
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// ItemDropdown Component
const ItemDropdown = ({ rowId, value, onChange, warehouse, onStockFetched, userWarehouse, isAdmin, selectedWarehouse }) => {
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [itemGroups, setItemGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  // Fetch items and item groups
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const targetWarehouse = selectedWarehouse || warehouse || (isAdmin ? null : userWarehouse);
        
        const itemsParams = new URLSearchParams({
          page: "1",
          limit: "100",
        });
        if (targetWarehouse) {
          itemsParams.append("warehouse", targetWarehouse);
          itemsParams.append("isAdmin", isAdmin ? "true" : "false");
        }
        
        const itemsResponse = await fetch(`${API_URL}/api/shoe-sales/items?${itemsParams}`);
        let itemsList = [];
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          itemsList = Array.isArray(itemsData) ? itemsData : (itemsData.items || []);
        }
        
        const groupsParams = new URLSearchParams({
          page: "1",
          limit: "100",
        });
        if (targetWarehouse) {
          groupsParams.append("warehouse", targetWarehouse);
          groupsParams.append("isAdmin", isAdmin ? "true" : "false");
        }
        
        const groupsResponse = await fetch(`${API_URL}/api/shoe-sales/item-groups?${groupsParams}`);
        let groupsList = [];
        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json();
          groupsList = Array.isArray(groupsData) ? groupsData : (groupsData.groups || groupsData.itemGroups || []);
        }
        
        const groupItems = [];
        groupsList.forEach(group => {
          if (group.items && Array.isArray(group.items)) {
            group.items.forEach(item => {
              if (item) {
                groupItems.push({
                  _id: item._id || `${group._id}_${item.name}`,
                  ...item,
                  itemName: item.name || item.itemName,
                  itemGroupId: group._id,
                  groupName: group.name,
                  isFromGroup: true,
                });
              }
            });
          }
        });
        
        setItems([...itemsList, ...groupItems]);
        setItemGroups(groupsList);
      } catch (error) {
        console.error("Error fetching items:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [API_URL, userWarehouse, isAdmin, selectedWarehouse, warehouse]);

  useEffect(() => {
    if (value) {
      if (typeof value === "object" && value !== null) {
        setSelectedItem(value);
      } else if (items.length > 0) {
        const item = items.find((i) => i._id === value || i.itemName === value || i.name === value);
        setSelectedItem(item || null);
      }
    } else {
      setSelectedItem(null);
    }
  }, [value, items]);

  const onStockFetchedRef = useRef(onStockFetched);
  useEffect(() => {
    onStockFetchedRef.current = onStockFetched;
  }, [onStockFetched]);

  const prevItemRef = useRef(null);
  const prevWarehouseRef = useRef(null);

  useEffect(() => {
    const itemKey = selectedItem 
      ? (selectedItem.isFromGroup 
          ? `${selectedItem.itemGroupId}-${selectedItem.itemName || selectedItem.name}-${selectedItem.sku || ""}`
          : selectedItem._id)
      : null;
    
    if (!selectedItem || !warehouse) {
      prevItemRef.current = itemKey;
      prevWarehouseRef.current = warehouse;
      return;
    }
    
    if (itemKey === prevItemRef.current && warehouse === prevWarehouseRef.current) {
      return;
    }
    
    prevItemRef.current = itemKey;
    prevWarehouseRef.current = warehouse;
    
    const fetchStock = async () => {
      try {
        const params = new URLSearchParams({
          warehouse: warehouse,
        });
        
        if (selectedItem.isFromGroup) {
          params.append("itemGroupId", selectedItem.itemGroupId);
          params.append("itemName", selectedItem.itemName || selectedItem.name);
          if (selectedItem.sku) params.append("itemSku", selectedItem.sku);
        } else {
          params.append("itemId", selectedItem._id);
        }
        
        const response = await fetch(`${API_URL}/api/inventory/adjustments/stock/item?${params}`);
        if (response.ok) {
          const stockData = await response.json();
          let availableStock = 0;
          
          if (stockData.warehouseStocks && Array.isArray(stockData.warehouseStocks)) {
            const normalizedWarehouse = mapWarehouse(warehouse || "");
            const warehouseLower = normalizedWarehouse.toLowerCase().trim();
            
            const matchingStock = stockData.warehouseStocks.find(ws => {
              if (!ws.warehouse) return false;
              const normalizedStockWarehouse = mapWarehouse(ws.warehouse.toString());
              const wsLower = normalizedStockWarehouse.toLowerCase().trim();
              return wsLower === warehouseLower || wsLower.includes(warehouseLower) || warehouseLower.includes(wsLower);
            });
            
            if (matchingStock) {
              const stockOnHand = parseFloat(matchingStock.stockOnHand) || 0;
              availableStock = stockOnHand;
            }
          }
          
          if (onStockFetchedRef.current) {
            onStockFetchedRef.current(availableStock);
          }
        }
      } catch (error) {
        console.error("Error fetching stock:", error);
      }
    };
    
    fetchStock();
  }, [selectedItem, warehouse, API_URL]);

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 2,
      left: rect.left,
      width: Math.max(rect.width, 360),
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

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    onChange(item);
    setIsOpen(false);
    setSearchTerm("");
  };

  const filteredItems = items.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const itemName = (item.itemName || item.name || "").toLowerCase();
    const sku = (item.sku || "").toLowerCase();
    const groupName = (item.groupName || "").toLowerCase();
    return itemName.includes(searchLower) || sku.includes(searchLower) || groupName.includes(searchLower);
  });

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
      <div className="rounded-none shadow-lg bg-white border border-gray-300 overflow-hidden animate-in fade-in duration-100">
        <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 bg-gray-50">
          <Search size={13} className="text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type or search item..."
            className="h-7 w-full border-none bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="py-1 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {loading ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">
              {searchTerm ? "No matching items found" : "No items available"}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = (typeof value === "object" && value?._id === item._id) || 
                                 (typeof value === "string" && value === (item.itemName || item.name || item._id));
              
              return (
                <div
                  key={item._id}
                  onClick={() => handleSelectItem(item)}
                  className={`px-3.5 py-2.5 cursor-pointer transition-colors border-b border-gray-100 flex items-center justify-between ${
                    isSelected ? "bg-purple-50 text-purple-900" : "hover:bg-gray-50 text-gray-800"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-gray-900">
                      {item.itemName || item.name || "Unnamed Item"}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {item.isFromGroup && <span className="text-purple-600 font-medium">[{item.groupName}] </span>}
                      SKU: {item.sku || "—"}
                    </div>
                  </div>
                  {item.costPrice !== undefined && (
                    <div className="text-xs font-semibold text-gray-600">
                      ₹{parseFloat(item.costPrice || 0).toFixed(2)}
                    </div>
                  )}
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
          placeholder="Type of click to select an item"
          value={selectedItem ? (selectedItem.itemName || selectedItem.name || "") : ""}
          className="w-full h-[42px] rounded-none border border-gray-300 bg-white text-xs text-gray-800 placeholder:text-gray-400 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 transition-colors cursor-pointer px-3.5"
        />
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

const InventoryAdjustmentCreate = () => {
  const navigate = useNavigate();
  const isSidebarOpen = useSidebar();
  const { id } = useParams();
  const isEditMode = !!id;
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.email || user?._id || user?.id || "";
  const isAdmin = user?.power === "admin";
  
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
  
  const [adjustmentType, setAdjustmentType] = useState("quantity");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceNumberLoading, setReferenceNumberLoading] = useState(false);
  const [date, setDate] = useState(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${year}-${month}-${day}`;
  });
  const [account, setAccount] = useState("Cost of Goods Sold");
  const [reason, setReason] = useState("");
  const [branch, setBranch] = useState("Head Office");
  const [warehouse, setWarehouse] = useState(() => {
    if (!isAdmin && userWarehouse) {
      return userWarehouse;
    }
    return "Warehouse";
  });
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  
  const [tableRows, setTableRows] = useState([
    {
      id: 1,
      item: null,
      itemId: null,
      itemGroupId: null,
      itemName: "",
      itemSku: "",
      currentQuantity: 0,
      currentValue: 0,
      quantityAdjusted: "",
      newQuantity: "",
      unitCost: "",
      valueAdjusted: "",
      newValue: "",
    },
  ]);
  
  const accountOptions = [
    "Cost of Goods Sold",
    "Inventory Write-Offs",
    "Inventory Adjustments",
    "Expense",
    "Other Expenses",
  ];
  
  const reasonOptions = [
    "Stock Taking",
    "Damage",
    "Loss",
    "Theft",
    "Sales Return",
    "Inventory Revaluation",
    "Other",
  ];
  
  const warehouseOptions = [
    "Warehouse",
  ];
  
  const branchOptions = [
    "Calicut",
    "Chavakkad Branch",
    "Edapally Branch",
    "Edappal Branch",
    "Grooms Trivandrum",
    "Head Office",
    "Kalpetta Branch",
    "Kannur Branch",
    "Kottakkal Branch",
    "Kottayam Branch",
    "Manjery Branch",
    "Palakkad Branch",
    "Perinthalmanna Branch",
    "Perumbavoor Branch",
    "SuitorGuy MG Road",
    "Thrissur Branch",
    "Vadakara Branch",
    "Warehouse",
  ];

  const handleRegenerateReferenceNumber = async () => {
    setReferenceNumberLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/inventory/adjustments/next-ref`);
      if (response.ok) {
        const data = await response.json();
        setReferenceNumber(data.referenceNumber || `IA-${String(Math.floor(1000 + Math.random() * 9000)).padStart(5, "0")}`);
      } else {
        setReferenceNumber(`IA-${String(Math.floor(1000 + Math.random() * 9000)).padStart(5, "0")}`);
      }
    } catch (error) {
      console.error("Error generating reference number:", error);
      setReferenceNumber(`IA-${String(Math.floor(1000 + Math.random() * 9000)).padStart(5, "0")}`);
    } finally {
      setReferenceNumberLoading(false);
    }
  };

  useEffect(() => {
    if (!isEditMode && !referenceNumber) {
      handleRegenerateReferenceNumber();
    }
  }, [isEditMode]);

  useEffect(() => {
    if (isEditMode && id && id !== "undefined") {
      const loadAdjustment = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/api/inventory/adjustments/${id}`);
          if (!response.ok) throw new Error("Failed to load adjustment");
          const data = await response.json();
          
          setAdjustmentType(data.adjustmentType || "quantity");
          setReferenceNumber(data.referenceNumber || "");
          setDate(data.date ? new Date(data.date).toISOString().split("T")[0] : date);
          setAccount(data.account || "Cost of Goods Sold");
          setReason(data.reason || "");
          setBranch(data.branch || "Head Office");
          setWarehouse(data.warehouse || "Warehouse");
          setDescription(data.description || "");
          
          if (data.items && Array.isArray(data.items)) {
            const rows = data.items.map((item, index) => {
              const originalQuantity = item.currentQuantity || 0;
              const quantityAdjusted = parseFloat(item.quantityAdjusted) || 0;
              const calculatedNewQuantity = originalQuantity + quantityAdjusted;
              
              return {
                id: index + 1,
                item: { _id: item.itemId, itemName: item.itemName },
                itemId: item.itemId,
                itemGroupId: item.itemGroupId,
                itemName: item.itemName,
                itemSku: item.itemSku || "",
                currentQuantity: originalQuantity,
                currentValue: item.currentValue || 0,
                quantityAdjusted: item.quantityAdjusted?.toString() || "",
                newQuantity: calculatedNewQuantity.toString(),
                unitCost: item.unitCost?.toString() || "",
                valueAdjusted: item.valueAdjusted?.toString() || "",
                newValue: item.newValue?.toString() || "",
              };
            });
            setTableRows(rows.length > 0 ? rows : [{ id: 1, item: null, itemId: null, itemGroupId: null, itemName: "", itemSku: "", currentQuantity: 0, currentValue: 0, quantityAdjusted: "", newQuantity: "", unitCost: "", valueAdjusted: "", newValue: "" }]);
          }
        } catch (error) {
          console.error("Error loading adjustment:", error);
          alert("Failed to load adjustment");
          navigate("/inventory/adjustments");
        } finally {
          setLoading(false);
        }
      };
      loadAdjustment();
    }
  }, [isEditMode, id, API_URL, navigate, date]);

  const handleItemSelect = (rowId, selectedItem) => {
    if (!selectedItem) {
      setTableRows(rows => rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            item: null,
            itemId: null,
            itemGroupId: null,
            itemName: "",
            itemSku: "",
            currentQuantity: 0,
            currentValue: 0,
            quantityAdjusted: "",
            newQuantity: "",
            unitCost: "",
            valueAdjusted: "",
            newValue: "",
          };
        }
        return row;
      }));
      return;
    }
    
    setTableRows(rows => rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          item: selectedItem,
          itemId: selectedItem.isFromGroup ? null : selectedItem._id,
          itemGroupId: selectedItem.itemGroupId || null,
          itemName: selectedItem.itemName || selectedItem.name || "",
          itemSku: selectedItem.sku || "",
          unitCost: selectedItem.costPrice ? String(selectedItem.costPrice) : "",
        };
      }
      return row;
    }));
  };

  const handleStockFetched = (rowId) => (stock) => {
    setTableRows(rows => rows.map(row => {
      if (row.id === rowId) {
        const currentQty = stock;
        const unitCostNum = parseFloat(row.unitCost) || 0;
        const currentVal = currentQty * unitCostNum;
        
        let newQty = row.newQuantity;
        let qtyAdj = row.quantityAdjusted;
        
        if (qtyAdj !== "" && qtyAdj !== undefined) {
          const adj = parseFloat(qtyAdj) || 0;
          newQty = (currentQty + adj).toString();
        } else if (newQty !== "" && newQty !== undefined) {
          const nQty = parseFloat(newQty) || 0;
          qtyAdj = (nQty - currentQty).toString();
        }
        
        return {
          ...row,
          currentQuantity: currentQty,
          currentValue: currentVal,
          newQuantity: newQty,
          quantityAdjusted: qtyAdj,
        };
      }
      return row;
    }));
  };

  const handleQuantityAdjustedChange = (rowId, value) => {
    setTableRows(rows => rows.map(row => {
      if (row.id === rowId) {
        const adj = parseFloat(value) || 0;
        const newQty = (row.currentQuantity + adj).toFixed(2);
        return {
          ...row,
          quantityAdjusted: value,
          newQuantity: value === "" ? "" : newQty,
        };
      }
      return row;
    }));
  };

  const handleNewQuantityChange = (rowId, value) => {
    setTableRows(rows => rows.map(row => {
      if (row.id === rowId) {
        const nQty = parseFloat(value) || 0;
        const adj = (nQty - row.currentQuantity).toFixed(2);
        const uCost = parseFloat(row.unitCost) || 0;
        const nVal = (nQty * uCost).toFixed(2);
        const valAdj = ((nQty - row.currentQuantity) * uCost).toFixed(2);
        
        return {
          ...row,
          newQuantity: value,
          quantityAdjusted: value === "" ? "" : adj,
          newValue: value === "" ? "" : nVal,
          valueAdjusted: value === "" ? "" : valAdj,
        };
      }
      return row;
    }));
  };

  const handleUnitCostChange = (rowId, value) => {
    setTableRows(rows => rows.map(row => {
      if (row.id === rowId) {
        const uCost = parseFloat(value) || 0;
        const nQty = parseFloat(row.newQuantity) || row.currentQuantity || 0;
        const nVal = (nQty * uCost).toFixed(2);
        const valAdj = ((nQty - row.currentQuantity) * uCost).toFixed(2);
        
        return {
          ...row,
          unitCost: value,
          newValue: nVal,
          valueAdjusted: valAdj,
        };
      }
      return row;
    }));
  };

  const handleAddRow = () => {
    setTableRows(rows => [
      ...rows,
      {
        id: Date.now(),
        item: null,
        itemId: null,
        itemGroupId: null,
        itemName: "",
        itemSku: "",
        currentQuantity: 0,
        currentValue: 0,
        quantityAdjusted: "",
        newQuantity: "",
        unitCost: "",
        valueAdjusted: "",
        newValue: "",
      },
    ]);
  };

  const handleDeleteRow = (rowId) => {
    if (tableRows.length <= 1) {
      setTableRows([{
        id: Date.now(),
        item: null,
        itemId: null,
        itemGroupId: null,
        itemName: "",
        itemSku: "",
        currentQuantity: 0,
        currentValue: 0,
        quantityAdjusted: "",
        newQuantity: "",
        unitCost: "",
        valueAdjusted: "",
        newValue: "",
      }]);
      return;
    }
    setTableRows(rows => rows.filter(row => row.id !== rowId));
  };

  const handleSave = async (status = "draft") => {
    if (!date || !warehouse || !account || !reason) {
      alert("Please fill in all required fields (Date, Warehouse, Account, Reason)");
      return;
    }
    
    if (tableRows.length === 0 || !tableRows.some(row => row.itemName)) {
      alert("Please add at least one item");
      return;
    }
    
    setSaving(true);
    try {
      const items = tableRows
        .filter(row => row.itemName)
        .map(row => ({
          itemId: row.itemId,
          itemGroupId: row.itemGroupId,
          itemName: row.itemName,
          itemSku: row.itemSku,
          currentQuantity: row.currentQuantity,
          currentValue: row.currentValue,
          quantityAdjusted: adjustmentType === "quantity" ? parseFloat(row.quantityAdjusted) || 0 : 0,
          newQuantity: parseFloat(row.newQuantity) || row.currentQuantity,
          unitCost: adjustmentType === "value" ? parseFloat(row.unitCost) || 0 : 0,
          valueAdjusted: adjustmentType === "value" ? parseFloat(row.valueAdjusted) || 0 : 0,
          newValue: adjustmentType === "value" ? parseFloat(row.newValue) || 0 : row.currentValue,
        }));
      
      const adjustmentData = {
        adjustmentType,
        referenceNumber,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        account,
        reason,
        branch,
        warehouse,
        description,
        items: items.filter(item => item.itemName),
        status,
        userId,
      };
      
      const url = isEditMode 
        ? `${API_URL}/api/inventory/adjustments/${id}`
        : `${API_URL}/api/inventory/adjustments`;
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(adjustmentData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save adjustment");
      }
      
      const savedAdjustment = await response.json();
      
      if (status === "adjusted") {
        const itemIds = items.filter(item => item.itemId).map(item => item.itemId);
        const itemNames = items.filter(item => item.itemName).map(item => item.itemName);
        
        window.dispatchEvent(new CustomEvent("stockUpdated", {
          detail: {
            itemIds,
            items: itemNames,
            warehouse,
            source: "inventory-adjustment",
            adjustmentId: savedAdjustment.id || savedAdjustment._id,
          }
        }));
      }
      
      alert(`Adjustment ${isEditMode ? "updated" : "saved"} successfully as ${status === "draft" ? "Draft" : "Adjusted"}`);
      navigate("/inventory/adjustments");
    } catch (error) {
      console.error("Error saving adjustment:", error);
      alert(error.message || "Failed to save adjustment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  useEnterToSave(() => handleSave("adjusted"), saving);
  
  if (loading) {
    return (
      <div className={`transition-all duration-300 p-8 bg-[#f8f9fa] min-h-screen flex items-center justify-center ${isSidebarOpen ? "ml-64" : "ml-0"}`}>
        <div className="text-gray-500 text-sm flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin text-purple-600" />
          <span>Loading adjustment...</span>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Header title="Inventory Adjustments" />
      <div className={`inventory-adjustment-wrapper transition-all duration-300 min-h-screen bg-[#f8f9fa] p-8 ${isSidebarOpen ? "ml-64" : "ml-0"}`}>

      {/* Top Header Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            type="button"
            onClick={() => navigate("/inventory/adjustments")}
            className="h-[42px] px-4 border border-gray-300 text-gray-700 bg-[#f3f4f6] rounded-none text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-none"
          >
            <ChevronLeft size={16} />
            <span>Back to Inventory List</span>
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/inventory/adjustments")}
            className="h-[42px] px-5 border border-gray-300 text-gray-700 bg-[#f3f4f6] rounded-none text-xs font-semibold cursor-pointer shadow-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="h-[42px] px-5 border border-gray-300 text-gray-700 bg-[#f3f4f6] rounded-none text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-none"
          >
            <FileText size={15} className="text-gray-600" />
            <span>Save as Draft</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave("adjusted")}
            disabled={saving}
            className="h-[42px] px-6 bg-[#9333ea] text-white rounded-none text-xs font-semibold cursor-pointer disabled:opacity-50 shadow-none"
          >
            {saving ? "Saving..." : "Convert to Adjusted"}
          </button>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-none border border-gray-200 shadow-sm p-7 space-y-6 mb-6">
        {/* Mode of Adjustment Selector */}
        <div className="flex items-center gap-6 text-xs text-gray-700 font-medium">
          <span className="font-semibold text-gray-800">Mode of Adjustment :</span>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="adjustmentType"
              value="quantity"
              checked={adjustmentType === "quantity"}
              onChange={(e) => setAdjustmentType(e.target.value)}
              className="accent-purple-600 cursor-pointer w-4 h-4"
            />
            <span>Quantity Adjustment</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="adjustmentType"
              value="value"
              checked={adjustmentType === "value"}
              onChange={(e) => setAdjustmentType(e.target.value)}
              className="accent-purple-600 cursor-pointer w-4 h-4"
            />
            <span>Value Adjustment</span>
          </label>
        </div>

        {/* Form Fields: Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Reference Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Reference Number
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={referenceNumberLoading ? "Generating..." : (referenceNumber || "")}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="IA-00043"
                disabled={referenceNumberLoading}
                className="w-full h-[42px] rounded-none border border-gray-300 bg-white pl-3.5 pr-10 text-xs text-gray-900 font-semibold tracking-wide focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 transition-colors"
              />
              <button
                type="button"
                onClick={handleRegenerateReferenceNumber}
                disabled={referenceNumberLoading}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-2 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 border border-purple-200 group"
                title="Generate new reference number"
              >
                <RefreshCw
                  size={14}
                  className={`transition-transform duration-300 group-hover:rotate-180 ${
                    referenceNumberLoading ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-[42px] rounded-none border border-gray-300 bg-white px-3.5 text-xs text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Account <span className="text-red-500">*</span>
            </label>
            <CompactDropdown
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              options={accountOptions}
              placeholder="Select Account"
              required
            />
          </div>
        </div>

        {/* Form Fields: Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <CompactDropdown
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              options={reasonOptions}
              placeholder="Select Reason"
              required
            />
          </div>

          {/* Branch */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Branch <span className="text-red-500">*</span>
            </label>
            <CompactDropdown
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              options={branchOptions}
              placeholder="Select Branch"
              required
            />
          </div>

          {/* Warehouse */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Warehouse <span className="text-red-500">*</span>
            </label>
            <CompactDropdown
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              options={warehouseOptions}
              placeholder="Select Warehouse"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-none border border-gray-300 bg-white p-3.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
            placeholder="Enter description"
            maxLength={500}
          />
          <div className="text-[11px] text-gray-400 text-right mt-1">
            Maximum 500 characters
          </div>
        </div>
      </div>

      {/* Items Details Table Card */}
      <div className="bg-white rounded-none border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#181920] text-white">
                <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">
                  ITEM DETAILS
                </th>
                <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider">
                  QUANTITY AVAILABLE
                </th>
                {adjustmentType === "quantity" ? (
                  <>
                    <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider">
                      NEW QUANTITY ON HAND
                    </th>
                    <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider">
                      QUANTITY ADJUSTED
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider">
                      NEW QUANTITY ON HAND
                    </th>
                    <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider">
                      UNIT COST
                    </th>
                    <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider">
                      NEW VALUE
                    </th>
                    <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider">
                      VALUE ADJUSTED
                    </th>
                  </>
                )}
                <th className="px-3 py-3.5 w-14 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tableRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                  {/* ITEM DETAILS */}
                  <td className="px-4 py-3 align-middle min-w-[280px]">
                    <ItemDropdown
                      rowId={row.id}
                      value={row.item}
                      onChange={(item) => handleItemSelect(row.id, item)}
                      warehouse={warehouse}
                      onStockFetched={handleStockFetched(row.id)}
                      userWarehouse={userWarehouse}
                      isAdmin={isAdmin}
                      selectedWarehouse={warehouse}
                    />
                  </td>

                  {/* QUANTITY AVAILABLE */}
                  <td className="px-4 py-3 text-center align-middle text-xs font-semibold text-gray-800">
                    {row.currentQuantity !== undefined ? row.currentQuantity : 0}
                  </td>

                  {adjustmentType === "quantity" ? (
                    <>
                      {/* NEW QUANTITY ON HAND */}
                      <td className="px-4 py-3 align-middle">
                        <input
                          type="number"
                          value={row.newQuantity !== undefined ? row.newQuantity : ""}
                          onChange={(e) => handleNewQuantityChange(row.id, e.target.value)}
                          placeholder="0"
                          className="w-full max-w-[140px] mx-auto block h-[42px] rounded-none border border-gray-300 bg-white text-center text-xs text-gray-900 font-medium focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                        />
                      </td>

                      {/* QUANTITY ADJUSTED */}
                      <td className="px-4 py-3 align-middle">
                        <input
                          type="number"
                          value={row.quantityAdjusted !== undefined ? row.quantityAdjusted : ""}
                          onChange={(e) => handleQuantityAdjustedChange(row.id, e.target.value)}
                          placeholder="0"
                          className="w-full max-w-[140px] mx-auto block h-[42px] rounded-none border border-gray-300 bg-white text-center text-xs text-gray-900 font-medium focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      {/* NEW QUANTITY ON HAND */}
                      <td className="px-4 py-3 align-middle">
                        <input
                          type="number"
                          value={row.newQuantity !== undefined ? row.newQuantity : ""}
                          onChange={(e) => handleNewQuantityChange(row.id, e.target.value)}
                          placeholder="0"
                          className="w-full max-w-[120px] mx-auto block h-[42px] rounded-none border border-gray-300 bg-white text-center text-xs text-gray-900 font-medium focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                        />
                      </td>

                      {/* UNIT COST */}
                      <td className="px-4 py-3 align-middle">
                        <input
                          type="number"
                          value={row.unitCost !== undefined ? row.unitCost : ""}
                          onChange={(e) => handleUnitCostChange(row.id, e.target.value)}
                          placeholder="0.00"
                          className="w-full max-w-[120px] mx-auto block h-[42px] rounded-none border border-gray-300 bg-white text-center text-xs text-gray-900 font-medium focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                        />
                      </td>

                      {/* NEW VALUE */}
                      <td className="px-4 py-3 text-center align-middle text-xs font-semibold text-gray-700">
                        {row.newValue || "0.00"}
                      </td>

                      {/* VALUE ADJUSTED */}
                      <td className="px-4 py-3 text-center align-middle text-xs font-semibold text-gray-700">
                        {row.valueAdjusted || "0.00"}
                      </td>
                    </>
                  )}

                  {/* ACTIONS */}
                  <td className="px-3 py-3 align-middle text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(row.id)}
                      className="w-[38px] h-[38px] rounded-none bg-red-50 text-red-500 flex items-center justify-center mx-auto cursor-pointer"
                      title="Delete Row"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Below Table Actions */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAddRow}
            className="h-[42px] px-4 border border-gray-300 bg-white text-gray-700 rounded-none text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-none"
          >
            <Plus size={15} className="text-gray-600" />
            <span>New Row</span>
          </button>
          <span className="text-xs text-gray-400 font-normal">
            All price exclude local tax
          </span>
        </div>
      </div>
      </div>
    </>
  );
};

export default InventoryAdjustmentCreate;

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  MoreHorizontal,
  ClipboardList,
  ShoppingCart,
  PackageSearch,
  Activity,
  Calendar,
  Warehouse,
  Settings,
  ChevronDown,
  Plus,
  Star,
  Info,
  Copy,
  X,
  Package,
  Box,
  Pencil,
} from "lucide-react";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import ImageUpload from "../components/ImageUpload";
import AttachmentDisplay from "../components/AttachmentDisplay";
import useSidebar from "../hooks/useSidebar";

const API_ROOT = (baseUrl?.baseUrl || "").replace(/\/$/, "");

const unitOptions = [
  "box",
  "cm",
  "dz",
  "ft",
  "g",
  "in",
  "kg",
  "km",
  "lb",
  "mg",
  "ml",
  "m",
  "pcs",
  "PCS",
];

// Warehouse name mapping: actual names from API -> display names for Stocks page
const WAREHOUSE_NAME_MAPPING = {
  "G.Palakkad": "Palakkad Branch",
  "G.Palakkad ": "Palakkad Branch",
  "GPalakkad": "Palakkad Branch",
  "Palakkad Branch": "Palakkad Branch",
  "Warehouse": "Warehouse",
  "G.Calicut": "Calicut",
  "G.Calicut ": "Calicut",
  "GCalicut": "Calicut",
  "Calicut": "Calicut",
  "G.Manjeri": "Manjery Branch",
  "G.Manjery": "Manjery Branch",
  "GManjeri": "Manjery Branch",
  "GManjery": "Manjery Branch",
  "Manjery Branch": "Manjery Branch",
  "G.Kannur": "Kannur Branch",
  "GKannur": "Kannur Branch",
  "Kannur Branch": "Kannur Branch",
  "G.Edappal": "Edappal Branch",
  "GEdappal": "Edappal Branch",
  "Edappal Branch": "Edappal Branch",
  "G.Kalpetta": "Kalpetta Branch",
  "GKalpetta": "Kalpetta Branch",
  "Kalpetta Branch": "Kalpetta Branch",
  "G.Kottakkal": "Kottakkal Branch",
  "GKottakkal": "Kottakkal Branch",
  "Kottakkal Branch": "Kottakkal Branch",
  "G.Perinthalmanna": "Perinthalmanna Branch",
  "GPerinthalmanna": "Perinthalmanna Branch",
  "Perinthalmanna Branch": "Perinthalmanna Branch",
  "Grooms Trivandum": "Grooms Trivandum",
  "SG-Trivandrum": "Grooms Trivandum",
  "g-tvm":"Grooms Trivandum",
  "G.Chavakkad": "Chavakkad Branch",
  "GChavakkad": "Chavakkad Branch",
  "Chavakkad Branch": "Chavakkad Branch",
  "G.Thrissur": "Thrissur Branch",
  "GThrissur": "Thrissur Branch",
  "Thrissur Branch": "Thrissur Branch",
  "G.Perumbavoor": "Perumbavoor Branch",
  "GPerumbavoor": "Perumbavoor Branch",
  "Perumbavoor Branch": "Perumbavoor Branch",
  "G.Kottayam": "Kottayam Branch",
  "GKottayam": "Kottayam Branch",
  "Kottayam Branch": "Kottayam Branch",
  "G.Edappally": "Edapally Branch",
  "GEdappally": "Edapally Branch",
  "Edapally Branch": "Edapally Branch",
  "Edapallyadmin Branch": "Edapally Branch",
  "Edapallyadmin": "Edapally Branch",
  "Z-Edapally1": "Edapally Branch",
  "Z-Edapally1 Branch": "Edapally Branch",
  "-Edapally1 Branch": "Edapally Branch",
  "-Edapally1": "Edapally Branch",
  // MG Road variations
  "SuitorGuy MG Road": "MG Road",
  "G.MG Road": "MG Road",
  "G.Mg Road": "MG Road",
  "GMG Road": "MG Road",
  "GMg Road": "MG Road",
  "MG Road": "MG Road",
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

// Helper function to normalize warehouse name to display name
const normalizeWarehouseName = (warehouseName) => {
  if (!warehouseName) return null;
  // Check exact match first
  if (WAREHOUSE_NAME_MAPPING[warehouseName]) {
    return WAREHOUSE_NAME_MAPPING[warehouseName];
  }
  // Check case-insensitive match
  const lowerName = warehouseName.toLowerCase().trim();
  for (const [key, value] of Object.entries(WAREHOUSE_NAME_MAPPING)) {
    if (key.toLowerCase().trim() === lowerName) {
      return value;
    }
  }
  // If it's already a display name, return it
  if (ALLOWED_WAREHOUSES_DISPLAY.includes(warehouseName)) {
    return warehouseName;
  }
  return null;
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return "—";
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(numberValue);
};

const ShoeSalesItemDetail = () => {
  const isSidebarOpen = useSidebar();
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [item, setItem] = useState(null);
  const [itemsList, setItemsList] = useState([]);
  const [loadingItem, setLoadingItem] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [stockType, setStockType] = useState("accounting"); // "accounting" or "physical"
  const [showInactiveWarehouses, setShowInactiveWarehouses] = useState(false);
  const [warehouseStocks, setWarehouseStocks] = useState([]);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Get user info for filtering (must be defined before useEffects that use it)
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.power === "admin";
  
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
  
  // Get location name - prioritize locCode lookup over username
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
  
  // Helper function to map locName to warehouse name
  // Use the shared warehouse mapping utility
  const mapLocNameToWarehouse = (locName) => {
    if (!locName) return "";
    return mapWarehouse(locName);
  };
  
  const userWarehouse = mapLocNameToWarehouse(userLocName);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [showReturnableModal, setShowReturnableModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allItemGroups, setAllItemGroups] = useState([]);
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupOption, setGroupOption] = useState("create"); // "create" or "existing"
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupUnit, setNewGroupUnit] = useState("");
  const [createAttributes, setCreateAttributes] = useState(true);
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

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isModalOpen = showDeleteModal || showInactiveModal || showAddToGroupModal || showReturnableModal;
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showDeleteModal, showInactiveModal, showAddToGroupModal, showReturnableModal]);

  // Fetch all item groups for "Add to group" functionality
  const fetchAllItemGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch item groups");
      }
      
      const data = await response.json();
      // Ensure data is an array before filtering
      const groupsArray = Array.isArray(data) ? data : [];
      // Filter to only active groups
      const activeGroups = groupsArray.filter(group => group.isActive !== false);
      setAllItemGroups(activeGroups);
    } catch (error) {
      console.error("Error fetching item groups:", error);
      setAllItemGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // Handler functions for More menu options
  const handleCloneItem = async () => {
    try {
      setLoading(true);
      setShowMoreMenu(false);
      
      if (!item) {
        alert("Item data not available.");
        return;
      }

      // Create a copy of the item with a new name
      const clonedItem = {
        ...item,
        itemName: `${item.itemName} (Copy)`,
        sku: item.sku ? `${item.sku}-COPY` : "",
        _id: undefined, // Remove _id so it creates a new item
      };

      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      const response = await fetch(`${API_ROOT}/api/shoe-sales/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...clonedItem,
          changedBy: changedBy,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to clone item");
      }

      const newItem = await response.json();
      alert("Item cloned successfully!");
      navigate(`/shoe-sales/items/${newItem._id || newItem.id}`);
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
      
      if (!item) {
        alert("Item data not available.");
        return;
      }

      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      // Update item with isActive: false
      const updatePayload = {
        ...item,
        isActive: false,
        changedBy: changedBy,
        // This will trigger history logging in the backend
      };

      const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error("Failed to mark item as inactive");
      }

      setShowInactiveModal(false);
      alert("Item has been marked as inactive.");
      navigate("/shoe-sales/inactive-items");
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
      
      if (!item) {
        alert("Item data not available.");
        return;
      }

      const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      setShowDeleteModal(false);
      alert("Item deleted successfully.");
      navigate("/shoe-sales/items");
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToGroup = async () => {
    try {
      setLoading(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      if (!item) {
        alert("Item data not available.");
        return;
      }

      // Convert standalone item to group item format
      const itemToAdd = {
        name: item.itemName,
        sku: item.sku || "",
        costPrice: item.costPrice || 0,
        sellingPrice: item.sellingPrice || 0,
        upc: item.upc || "",
        hsnCode: item.hsnCode || "",
        isbn: item.isbn || "",
        reorderPoint: item.reorderPoint || "",
        stock: 0,
        warehouseStocks: item.warehouseStocks || [],
        attributeCombination: [],
      };

      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      if (groupOption === "create") {
        // Create a new item group
        if (!newGroupName.trim()) {
          alert("Item Group Name is required.");
          return;
        }
        if (!newGroupUnit.trim()) {
          alert("Unit is required.");
          return;
        }

        const newGroupPayload = {
          name: newGroupName.trim(),
          itemType: "goods",
          unit: newGroupUnit.trim(),
          createAttributes: createAttributes,
          attributeRows: createAttributes ? [{ id: 1, attribute: "", options: [], optionInput: "" }] : [],
          sellable: true,
          purchasable: true,
          trackInventory: false,
          items: [itemToAdd],
          stock: 0,
          reorder: "",
          isActive: true,
          changedBy: changedBy,
        };

        const createResponse = await fetch(`${API_URL}/api/shoe-sales/item-groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newGroupPayload),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          if (createResponse.status === 409) {
            throw new Error(`Item group "${newGroupName.trim()}" already exists. Please choose a different name.`);
          }
          throw new Error(errorData.message || "Failed to create item group");
        }

        const newGroup = await createResponse.json();
        const newGroupId = newGroup._id || newGroup.id;

        // Log history before deleting standalone item - item moved to new group
        try {
          const historyLogResponse = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movedToGroupId: newGroupId,
              targetGroupName: newGroupName.trim(),
              changedBy: changedBy,
            }),
          });
          // History is logged in the backend, we can ignore response
        } catch (historyError) {
          console.error("Error logging history before move:", historyError);
        }

        // Delete the standalone item
        const deleteResponse = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (!deleteResponse.ok) {
          console.warn("Item added to group but failed to delete standalone item");
        }

        setShowAddToGroupModal(false);
        setNewGroupName("");
        setNewGroupUnit("");
        setCreateAttributes(true);
        setGroupOption("create");
        alert(`Item "${item.itemName}" has been added to the new group successfully!`);
        navigate(`/shoe-sales/item-groups/${newGroupId}`);
      } else {
        // Add to existing group
        if (!selectedTargetGroupId) {
          alert("Please select a group.");
          return;
        }

        // Fetch the target group
        const groupResponse = await fetch(`${API_URL}/api/shoe-sales/item-groups/${selectedTargetGroupId}`);
        if (!groupResponse.ok) {
          throw new Error("Failed to fetch target group");
        }
        const targetGroup = await groupResponse.json();

        // Add item to target group
        const updatedTargetGroupItems = [...(targetGroup.items || []), itemToAdd];

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

        // Update target group
        const updateResponse = await fetch(`${API_URL}/api/shoe-sales/item-groups/${selectedTargetGroupId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(targetGroupPayload),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to add item to group");
        }

        // Log history before deleting standalone item - item moved to existing group
        const targetGroupName = targetGroup.name || "Unknown Group";
        try {
          const historyLogResponse = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movedToGroupId: selectedTargetGroupId,
              targetGroupName: targetGroupName,
              changedBy: changedBy,
            }),
          });
          // History is logged in the backend, we can ignore response
        } catch (historyError) {
          console.error("Error logging history before move:", historyError);
        }

        // Delete the standalone item
        const deleteResponse = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (!deleteResponse.ok) {
          console.warn("Item added to group but failed to delete standalone item");
        }

        setShowAddToGroupModal(false);
        setSelectedTargetGroupId("");
        setGroupOption("create");
        alert(`Item "${item.itemName}" has been added to the group successfully!`);
        navigate(`/shoe-sales/item-groups/${selectedTargetGroupId}`);
      }
    } catch (error) {
      console.error("Error adding item to group:", error);
      alert(error.message || "Failed to add item to group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReturnable = async () => {
    try {
      setLoading(true);
      
      if (!item) {
        alert("Item data not available.");
        return;
      }

      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      // Only update the returnable field - don't send entire item to avoid overwriting other fields
      const updatePayload = {
        returnable: !item.returnable,
        changedBy: changedBy,
      };

      console.log("Sending update payload:", { returnable: updatePayload.returnable, itemId });

      const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update returnable status");
      }

      setShowReturnableModal(false);
      const updatedItem = await response.json();
      console.log("Updated item returnable status:", updatedItem.returnable);
      setItem(updatedItem);
      alert(`Item has been marked as ${updatedItem.returnable ? "returnable" : "non-returnable"}.`);
    } catch (error) {
      console.error("Error updating returnable status:", error);
      alert("Failed to update returnable status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const fetchItem = async () => {
      setLoadingItem(true);
      setError(null);
      try {
        const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Item not found.");
          }
          throw new Error("Unable to load item.");
        }
        const data = await response.json();
        if (!ignore) {
          // If item is from a group, redirect to the group item detail page
          if (data.isFromGroup && data.itemGroupId) {
            navigate(`/shoe-sales/item-groups/${data.itemGroupId}/items/${itemId}`, { replace: true });
            return;
          }
          setItem(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to fetch item.");
        }
      } finally {
        if (!ignore) {
          setLoadingItem(false);
        }
      }
    };

    if (itemId) {
      fetchItem();
    }

    return () => {
      ignore = true;
    };
  }, [itemId, navigate]);

  // Listen for stock update events (when purchase receive is saved)
  useEffect(() => {
    const handleStockUpdate = (event) => {
      console.log("🎯 STOCK UPDATE EVENT RECEIVED:", {
        eventType: event.type,
        eventDetail: event.detail,
        currentItemId: item?._id || item?.id,
        currentItemName: item?.itemName
      });
      
      // Refresh item data if this item's stock was updated
      const updatedItems = event.detail?.items || event.detail?.updatedItems || [];
      const currentItemId = item?._id || item?.id;
      
      // Convert both IDs to strings for comparison
      const currentItemIdStr = currentItemId?.toString();
      
      // Check if any updated item matches this item
      const itemMatches = updatedItems.some(i => {
        const updatedItemId = (i.itemId?._id || i.itemId)?.toString();
        const updatedItemName = i.itemName || i.itemSku;
        const currentItemName = item?.itemName;
        
        // Match by ID first
        if (updatedItemId && updatedItemId === currentItemIdStr) {
          console.log(`✅ Item matched by ID: ${updatedItemId}`);
          return true;
        }
        
        // Fallback: match by name if ID matching fails
        if (updatedItemName && currentItemName && updatedItemName === currentItemName) {
          console.log(`✅ Item matched by name: ${updatedItemName}`);
          return true;
        }
        
        return false;
      });
      
      // Also refresh if event detail has itemIds array
      const eventItemIds = event.detail?.itemIds || [];
      const idMatches = eventItemIds.some(id => id?.toString() === currentItemIdStr);
      
      if (currentItemId && (itemMatches || idMatches)) {
        console.log("✅ Stock updated for this item, refreshing...", {
          currentItemId: currentItemIdStr,
          updatedItems: updatedItems,
          eventItemIds: eventItemIds,
          eventDetail: event.detail
        });
        // Refresh item data
        console.log(`🔄 Fetching updated item data from: ${API_ROOT}/api/shoe-sales/items/${itemId}`);
        fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`)
          .then(res => res.json())
          .then(data => {
            console.log("✅ Item data refreshed after stock update:");
            console.log("   - Item name:", data.itemName);
            console.log("   - Warehouse stocks:", data.warehouseStocks);
            if (data.warehouseStocks && Array.isArray(data.warehouseStocks)) {
              data.warehouseStocks.forEach(ws => {
                console.log(`     * ${ws.warehouse}: ${ws.stockOnHand || 0} stock`);
              });
            }
            setItem(data);
          })
          .catch(err => console.error("❌ Error refreshing item:", err));
      } else {
        console.log("ℹ️ Stock update event received but not for this item:", {
          currentItemId: currentItemIdStr,
          updatedItems: updatedItems.map(i => ({ itemId: i.itemId, itemName: i.itemName })),
          eventItemIds: eventItemIds
        });
      }
    };

    window.addEventListener("stockUpdated", handleStockUpdate);
    return () => {
      window.removeEventListener("stockUpdated", handleStockUpdate);
    };
  }, [itemId, item]);

  useEffect(() => {
    let ignore = false;

    const fetchList = async () => {
      setLoadingList(true);
      try {
        // Build query params
        const params = new URLSearchParams({
          page: "1",
          limit: "50",
        });
        
        // Add warehouse filter for non-admin users
        if (!isAdmin && userWarehouse) {
          params.append("warehouse", userWarehouse);
        }
        params.append("isAdmin", isAdmin.toString());
        
        // Fetch limited items for sidebar (first 50 items)
        const response = await fetch(`${API_ROOT}/api/shoe-sales/items?${params}`);
        if (!response.ok) {
          throw new Error("Unable to load items.");
        }
        const data = await response.json();
        if (!ignore) {
          // Handle both old format (array) and new format (object with items and pagination)
          const list = Array.isArray(data) ? data : (data.items || []);
          const activeOnly = list.filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false");
          setItemsList(activeOnly);
        }
      } catch {
        if (!ignore) {
          setItemsList([]);
        }
      } finally {
        if (!ignore) {
          setLoadingList(false);
        }
      }
    };

    fetchList();
    return () => {
      ignore = true;
    };
  }, [isAdmin, userWarehouse]);

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

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!itemId) {
      console.log("Missing itemId for history fetch:", { itemId });
      return;
    }
    
    try {
      setLoadingHistory(true);
      const url = `${API_ROOT}/api/shoe-sales/items/${itemId}/history`;
      console.log("Fetching history from:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch history:", response.status, errorText);
        // If endpoint doesn't exist, just set empty array
        setHistory([]);
        return;
      }
      
      let data = await response.json();
      console.log("History data received:", data);
      
      // Ensure we have an array
      const historyArray = Array.isArray(data) ? data : [];
      
      // Check if we have a CREATE entry, if not and item exists, add one
      const hasCreateEntry = historyArray.some(entry => entry.changeType === "CREATE");
      if (!hasCreateEntry && item && item.createdAt) {
        // Add creation entry from item's createdAt
        const createdAt = new Date(item.createdAt);
        // Try to get createdBy from item, or get current user as fallback, or use "System"
        let createdBy = item.createdBy;
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
          itemId: itemId,
          itemGroupId: null,
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
  }, [itemId, item]);

  // Combine all warehouses with stock data
  useEffect(() => {
    if (allWarehouses.length > 0) {
      // Get item warehouse stocks if item exists
      const itemWarehouseStocks = item?.warehouseStocks || [];
      
      // Create a map of warehouse stocks by normalized display name
      const stockMap = new Map();
      console.log(`\n📦 Processing warehouse stocks for item "${item?.itemName || itemId}"`);
      console.log(`  Raw warehouse stocks from API:`, itemWarehouseStocks.map(ws => ({
        warehouse: ws.warehouse,
        stockOnHand: ws.stockOnHand,
        openingStock: ws.openingStock
      })));
      
      itemWarehouseStocks.forEach(stock => {
        if (stock.warehouse) {
          // Normalize the warehouse name to display name
          const displayName = normalizeWarehouseName(stock.warehouse);
          console.log(`  Normalizing "${stock.warehouse}" -> "${displayName}"`);
          if (displayName && ALLOWED_WAREHOUSES_DISPLAY.includes(displayName)) {
            // Store with display name as key, but keep original stock data
            stockMap.set(displayName, {
              ...stock,
              warehouse: displayName // Use display name
            });
            console.log(`    ✅ Added to stockMap: ${displayName} with stockOnHand: ${stock.stockOnHand || stock.openingStock || 0}`);
          } else {
            console.log(`    ❌ Skipped: "${displayName}" not in ALLOWED_WAREHOUSES_DISPLAY`);
          }
        }
      });
      
      console.log(`  Final stockMap entries:`, Array.from(stockMap.entries()).map(([name, stock]) => ({
        warehouse: name,
        stockOnHand: stock.stockOnHand || stock.openingStock || 0,
        hasStockEntry: true
      })));
      
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
      
      console.log(`  Warehouses to show:`, sortedWarehouses);
      console.log(`  Missing warehouses (will get default 0 stock):`, 
        sortedWarehouses.filter(wh => !stockMap.has(wh))
      );
      
      // Create combined list: ONLY warehouses that have actual stock entries (including 0 stock)
      // This shows only stores where stock was actually added at some point
      const combinedStocks = sortedWarehouses
        .map(displayName => {
          const existingStock = stockMap.get(displayName);
          
          if (existingStock) {
            console.log(`  ✅ Using existing stock for ${displayName}:`, existingStock);
            return existingStock;
          }
          
          return null; // Don't create default entries for warehouses that never had stock
        })
        .filter(stock => stock !== null); // Remove null entries (warehouses that never had stock)
      
      console.log(`  📊 Final combined stocks:`, combinedStocks.map(s => `${s.warehouse}: ${s.stockOnHand || 0}`).join(", "));
      setWarehouseStocks(combinedStocks);
    } else if (item && item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
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

  useEffect(() => {
    fetchAllWarehouses();
  }, [fetchAllWarehouses]);

  useEffect(() => {
    fetchAllItemGroups();
  }, [fetchAllItemGroups]);

  useEffect(() => {
    if (activeTab === "History") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

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
      // Refresh item data
      if (itemId) {
        fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`)
          .then(res => res.json())
          .then(data => {
            console.log("✅ Item data refreshed after stock update:", data.warehouseStocks);
            setItem(data);
            // Remove the query parameters after data is set
            setTimeout(() => {
              setSearchParams({}, { replace: true });
            }, 100);
          })
          .catch(err => {
            console.error("Error refreshing item:", err);
            // Still remove query params even if fetch fails
            setSearchParams({}, { replace: true });
          });
      } else {
        // Remove the query parameters if no itemId
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, setSearchParams, itemId]);

  // Listen for transfer order received events
  useEffect(() => {
    const handleTransferOrderReceived = (event) => {
      console.log("📦 Transfer order received event:", event.detail);
      // Refresh item data if this item is in the destination warehouse
      if (itemId && item) {
        const destinationWarehouse = event.detail?.destinationWarehouse;
        const userWarehouseLower = userWarehouse?.toLowerCase();
        const destWarehouseLower = destinationWarehouse?.toLowerCase();
        
        // Check if this item's warehouse matches the transfer destination
        const itemHasStockInWarehouse = item.warehouseStocks?.some(ws => {
          const wsWarehouse = (ws.warehouse || "").toString().toLowerCase();
          return wsWarehouse === userWarehouseLower || 
                 wsWarehouse === destWarehouseLower ||
                 wsWarehouse.includes(userWarehouseLower) ||
                 userWarehouseLower.includes(wsWarehouse);
        });
        
        if (itemHasStockInWarehouse || destWarehouseLower === userWarehouseLower) {
          console.log("🔄 Refreshing item data after transfer order received...");
          fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`)
            .then(res => res.json())
            .then(data => {
              console.log("✅ Item data refreshed after transfer:", data.warehouseStocks);
              setItem(data);
            })
            .catch(err => console.error("Error refreshing item after transfer:", err));
        }
      }
    };
    
    window.addEventListener('transferOrderReceived', handleTransferOrderReceived);
    return () => {
      window.removeEventListener('transferOrderReceived', handleTransferOrderReceived);
    };
  }, [itemId, item, userWarehouse, API_ROOT]);

  // Calculate stock totals from warehouse stocks
  const stockTotals = useMemo(() => {
    const totals = {
      accounting: {
        stockOnHand: 0,
        availableForSale: 0
      },
      physical: {
        stockOnHand: 0,
        availableForSale: 0
      }
    };

    console.log(`\n📊 Calculating stock totals for item "${item?.itemName || itemId}"`);
    console.log(`  User warehouse: "${userWarehouse}" (isAdmin: ${isAdmin})`);
    console.log(`  Warehouse stocks to sum:`, warehouseStocks.map(ws => ({
      warehouse: ws.warehouse,
      stockOnHand: ws.stockOnHand !== undefined && ws.stockOnHand !== null ? ws.stockOnHand : (ws.openingStock || 0)
    })));

    warehouseStocks.forEach(stock => {
      // Don't fallback to openingStock if stockOnHand is 0 - 0 is a valid value!
      const stockOnHand = stock.stockOnHand !== undefined && stock.stockOnHand !== null
        ? parseFloat(stock.stockOnHand)
        : parseFloat(stock.openingStock || 0);
      const availableForSale = stock.availableForSale !== undefined && stock.availableForSale !== null
        ? parseFloat(stock.availableForSale)
        : stockOnHand;

      console.log(`  Adding stock from "${stock.warehouse}": ${stockOnHand} (Stock On Hand)`);

      // Accounting stock reflects the maintained warehouse stocks
      totals.accounting.stockOnHand += stockOnHand;
      totals.accounting.availableForSale += availableForSale;

      // Physical stock reads from dedicated fields when present
      const pOnHand = stock.physicalStockOnHand !== undefined && stock.physicalStockOnHand !== null
        ? parseFloat(stock.physicalStockOnHand)
        : parseFloat(stock.physicalOpeningStock || 0);
      const pAvailable = stock.physicalAvailableForSale !== undefined && stock.physicalAvailableForSale !== null
        ? parseFloat(stock.physicalAvailableForSale)
        : pOnHand;
      totals.physical.stockOnHand += isNaN(pOnHand) ? 0 : pOnHand;
      totals.physical.availableForSale += isNaN(pAvailable) ? 0 : pAvailable;
    });

    console.log(`  Total Stock On Hand: ${totals.accounting.stockOnHand}`);
    console.log(`📊 End stock totals calculation\n`);

    return totals;
  }, [warehouseStocks, item?.itemName, itemId, userWarehouse, isAdmin]);

  if (loadingItem) {
    return (
      <div className={`transition-all duration-300 flex min-h-screen items-center justify-center bg-[#f5f7fb] p-6 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#cbd5f5] border-t-[#3762f9]" />
          <p className="text-sm font-medium text-[#475569]">Loading item details…</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className={`transition-all duration-300 flex min-h-screen items-center justify-center bg-[#f5f7fb] p-6 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-[#1f2937]">We couldn&apos;t find the item.</h2>
          <p className="mt-2 text-sm text-[#6b7280]">{error || "Please try again or pick a different item."}</p>
          <button
            onClick={() => navigate("/shoe-sales/items")}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#3762f9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2748c9]"
          >
            <ArrowLeft size={16} />
            Back to Items
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] p-6 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
      <div className="flex gap-6">
        <aside className="w-72 shrink-0 rounded-3xl border border-[#e1e5f5] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#edf1ff] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#1f2937]">All Items</h2>
            {isAdmin && (
              <Link
                to="/shoe-sales/items/new"
                className="inline-flex h-8 items-center justify-center rounded-md bg-[#3762f9] px-2 text-xs font-semibold text-white transition hover:bg-[#2748c9]"
              >
                + New
              </Link>
            )}
          </div>
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
            {loadingList ? (
              <div className="space-y-3 px-4 py-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="space-y-2 rounded-xl border border-[#eef2ff] p-3">
                    <div className="h-3.5 w-32 animate-pulse rounded-full bg-[#e6ebff]" />
                    <div className="h-3 w-20 animate-pulse rounded-full bg-[#f0f2ff]" />
                  </div>
                ))}
              </div>
            ) : itemsList.length === 0 ? (
              <div className="px-4 py-5 text-sm text-[#6b7280]">No items available.</div>
            ) : (
              <ul className="divide-y divide-[#edf1ff]">
                {itemsList.map((entry) => {
                  const isActive = entry._id === itemId;
                  return (
                    <li key={entry._id}>
                      <Link
                        to={`/shoe-sales/items/${entry._id}`}
                        className={`flex items-center justify-between px-4 py-3 text-sm transition ${
                          isActive ? "bg-[#eef2ff] font-semibold text-[#1f2937]" : "text-[#475569] hover:bg-[#f6f8ff]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {(() => {
                            const entryImg = entry.image || (entry.images && entry.images[0]?.data) || (entry.images && typeof entry.images[0] === 'string' && entry.images[0]) || "";
                            if (entryImg) {
                              return (
                                <div className="w-8 h-8 rounded border border-gray-200 bg-white shrink-0 overflow-hidden flex items-center justify-center p-0.5">
                                  <img src={entryImg} alt="" className="w-full h-full object-contain" />
                                </div>
                              );
                            }
                            return (
                              <div className="w-8 h-8 rounded bg-gray-100 text-gray-600 font-bold text-xs shrink-0 flex items-center justify-center">
                                {(entry.itemName || "?")[0]}
                              </div>
                            );
                          })()}
                          <div className="flex flex-col truncate">
                            <span className="truncate">{entry.itemName || "Untitled Item"}</span>
                            <span className="text-xs text-[#94a3b8]">{entry.sku || "No SKU"}</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#1f2937] shrink-0 ml-2">
                          {formatCurrency(entry.sellingPrice || 0)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <header className="flex flex-col gap-6">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
              <Link
                to="/shoe-sales/items"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
              >
                <ArrowLeft size={16} /> Back to Items
              </Link>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <Link
                      to={`/shoe-sales/items/${itemId}/edit${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d7dcf5] bg-white px-4 text-sm font-medium text-[#1f2937] transition hover:bg-[#f8fafc] hover:border-[#cbd5f5]"
                    >
                      <Pencil size={16} />
                      Edit
                    </Link>
                    <div className="relative" ref={moreMenuRef}>
                      <button 
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className={`inline-flex h-10 items-center justify-center rounded-lg border border-[#d7dcf5] bg-white px-3 text-[#64748b] transition hover:bg-[#f8fafc] hover:border-[#cbd5f5] ${
                          showMoreMenu ? "bg-[#f8fafc] border-[#cbd5f5]" : ""
                        }`}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {showMoreMenu && (
                        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[#d7dcf5] bg-white shadow-lg z-50 overflow-hidden">
                          <button
                            onClick={() => {
                              setShowInactiveModal(true);
                              setShowMoreMenu(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-[#1f2937] hover:bg-[#f8fafc] transition-colors"
                          >
                            Mark as Inactive
                          </button>
                          <div className="h-px bg-[#e7ebf8]"></div>
                          <button
                            onClick={() => {
                              setShowDeleteModal(true);
                              setShowMoreMenu(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-[#ef4444] hover:bg-[#fef2f2] transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Item Header Card */}
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-5">
                {(() => {
                  const itemImg = item.image || (item.images && item.images[0]?.data) || (item.images && typeof item.images[0] === 'string' && item.images[0]) || "";
                  if (itemImg) {
                    return (
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-white flex items-center justify-center shrink-0 shadow-sm p-1">
                        <img
                          src={itemImg}
                          alt={item.itemName}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    );
                  }
                  return null;
                })()}
                <div>
                  <h1 className="text-3xl font-bold text-[#1a1a2e] tracking-tight">{item.itemName}</h1>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <p className="text-base text-[#64748b]">
                      SKU: <span className="font-mono font-bold text-gray-900">{searchParams.get("pieceSku") || item.sku || "N/A"}</span> {item.brand && `• ${item.brand}`}
                    </p>
                    {searchParams.get("pieceSku") && (
                      <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded shadow-2xs">
                        Unit {searchParams.get("unitIndex") || "1"} Piece Tag
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#64748b] mb-1">Selling Price</p>
                <p className="text-3xl font-bold text-[#10b981]">{formatCurrency(item.sellingPrice)}</p>
              </div>
            </div>
            
            {/* Stock Metrics */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Package size={20} className="text-blue-600" />
                  <span className="text-sm font-medium text-[#64748b]">Stock on Hand</span>
                </div>
                <p className="text-3xl font-bold text-[#1a1a2e]">
                  {searchParams.get("pieceSku") ? "1" : stockTotals.accounting.stockOnHand.toFixed(0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <ShoppingCart size={20} className="text-emerald-600" />
                  <span className="text-sm font-medium text-[#64748b]">Available for Sale</span>
                </div>
                <p className="text-3xl font-bold text-[#1a1a2e]">
                  {searchParams.get("pieceSku") ? "1" : stockTotals.accounting.availableForSale.toFixed(0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Box size={20} className="text-amber-600" />
                  <span className="text-sm font-medium text-[#64748b]">Reorder Point</span>
                </div>
                <p className="text-3xl font-bold text-[#1a1a2e]">{item.reorderPoint || "—"}</p>
              </div>
            </div>
          </div>

          {/* Tabs - Clean Underline Style */}
          <div>
            <div className="flex items-center gap-8">
              {["Overview", "Stocks", ...(isAdmin || user?.power === 'warehouse' ? ["History"] : [])].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`no-blue-button pb-3 text-sm font-medium transition-all ${
                    activeTab === tab
                      ? "text-[#1a1a2e] font-semibold"
                      : "text-[#94a3b8] hover:text-[#64748b]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-8">
              {activeTab === "Overview" && (
                <div className="space-y-10">
                  {/* Images Section */}
                  {item.images && item.images.length > 0 && (
                    <div>
                      <AttachmentDisplay attachments={item.images} />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-16 gap-y-10">
                  {/* Left Column */}
                  <div className="space-y-10">
                    {/* Pricing */}
                    <div>
                      <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Pricing</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Cost Price</span>
                          <span className="text-sm font-semibold text-[#1a1a2e]">{formatCurrency(item.costPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Selling Price</span>
                          <span className="text-sm font-semibold text-[#10b981]">{formatCurrency(item.sellingPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">MRP</span>
                          <span className="text-sm font-semibold text-[#7C3AED]">{formatCurrency(item.mrp ?? item.sellingPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">HSN Code</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.hsnCode || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tax Information */}
                    <div>
                      <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Tax</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Tax Preference</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.taxPreference === "non-taxable" ? "Tax Exempt" : "Taxable"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Interstate Tax</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.taxRateInter || "—"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Intrastate Tax</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.taxRateIntra || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Status</h3>
                      <div className="flex flex-wrap gap-3">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${item.sellable !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${item.sellable !== false ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          Sellable
                        </span>
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${item.purchasable !== false ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${item.purchasable !== false ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                          Purchasable
                        </span>
                        {item.returnable && (
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            Returnable
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-10">
                    {/* Item Details */}
                    <div>
                      <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Details</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Item Type</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.type === "service" ? "Service" : "Inventory Item"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Unit</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.unit || "—"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Brand</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.brand || "—"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Manufacturer</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.manufacturer || "—"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Created</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inventory */}
                    <div>
                      <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Inventory</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Inventory Account</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.inventoryAccount || "Inventory Asset"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Valuation Method</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.inventoryValuation || item.inventoryValuationMethod || "FIFO"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Track Inventory</span>
                          <span className={`text-sm font-medium ${item.trackInventory ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {item.trackInventory ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-[#64748b]">Tracking Method</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{mapTrackingMethod(item.trackingMethod)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Accounts */}
                    <div>
                      <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Accounts</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                          <span className="text-sm text-[#64748b]">Sales Account</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.salesAccount || "Sales"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                          <span className="text-sm text-[#64748b]">Purchase Account</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{item.costAccount || "Cost of Goods Sold"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              )}

              {activeTab === "Stocks" && (
                <div className="space-y-6">
                  {/* Stock Location Header - Only for Admin and Warehouse */}
                  {(isAdmin || user?.power === 'warehouse') && (
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e4e6f2]">
                      <button
                        onClick={() => {
                          navigate(`/shoe-sales/items/${itemId}/stocks?type=${stockType}`);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
                      >
                        <Plus size={16} className="text-[#8B5CF6]" />
                        <span>Add Stock</span>
                      </button>
                      
                      {/* Manual Refresh Button for Testing */}
                      <button
                        onClick={() => {
                          console.log("🔄 Manual refresh clicked");
                          fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`)
                            .then(res => res.json())
                            .then(data => {
                              console.log("✅ Manual refresh - Item data:", data.warehouseStocks);
                              setItem(data);
                            })
                            .catch(err => console.error("❌ Manual refresh error:", err));
                        }}
                        className="flex items-center gap-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <Activity size={14} />
                        Refresh Stock
                      </button>
                    </div>
                  )}

                  {/* Warehouses Table */}
                  {allWarehouses.length > 0 || warehouseStocks.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                              Warehouse Name
                            </th>
                            <th colSpan={3} className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 border-l border-gray-200">
                              {stockType === "accounting" ? "Accounting Stock" : "Physical Stock"}
                            </th>
                          </tr>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-2"></th>
                            <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 border-l border-gray-200">
                              Stock on Hand
                            </th>
                            <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                              Available for Sale
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {warehouseStocks
                            .filter((stock) => {
                              // IMPORTANT: Always show ALL warehouse stocks, including those with 0 stock
                              // This allows users to see which stores they've sent stock to, even if it's now 0
                              // This is the user's requirement - don't hide stores with 0 stock
                              return true;
                            })
                            .map((stock, idx) => {
                            // For accounting stock, show actual values from item warehouses
                            // Don't fallback to openingStock if stockOnHand is 0 - 0 is a valid value!
                            const accountingStockOnHand = stock.stockOnHand !== undefined && stock.stockOnHand !== null
                              ? parseFloat(stock.stockOnHand)
                              : parseFloat(stock.openingStock || 0);
                            const accountingAvailable = stock.availableForSale !== undefined && stock.availableForSale !== null
                              ? parseFloat(stock.availableForSale)
                              : accountingStockOnHand;

                            const isMainWarehouse = stock.warehouse === "Warehouse";
                            
                            return (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {isMainWarehouse && (
                                      <Star size={16} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                    )}
                                    <span className="text-sm font-medium text-gray-900">
                                      {stock.warehouse}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-l border-gray-100">
                                  {accountingStockOnHand.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {accountingAvailable.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[#e4e6f2] bg-white p-12 text-center">
                      <Warehouse size={48} className="mx-auto mb-4 text-[#94a3b8]" />
                      <p className="text-sm font-medium text-[#475569] mb-2">No stock locations added yet</p>
                      <p className="text-xs text-[#64748b] mb-4">Click "Stock Locations" above to add stocks to warehouses</p>
                      {(isAdmin || user?.power === 'warehouse') && (
                        <button
                          onClick={() => navigate(`/shoe-sales/items/${itemId}/stocks`)}
                          className="no-blue-button inline-flex items-center gap-2 rounded-lg border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#475569] shadow-sm transition-all duration-200 hover:bg-[#f8fafc] hover:border-[#cbd5f5] hover:shadow-md"
                        >
                          <Plus size={16} className="text-[#64748b]" />
                          <span>Add Stock Locations</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "History" && (isAdmin || user?.power === 'warehouse') && (
                <div className="py-6">
                  {loadingHistory ? (
                    <div className="py-12 text-center text-sm text-[#64748b]">
                      Loading history...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[#64748b]">
                      No history available
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[#e4e6f2] bg-white overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                              DATE
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                              DETAILS
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {history.map((entry, idx) => {
                            // Use changedAt, createdAt, or current date as fallback
                            const dateValue = entry.changedAt || entry.createdAt || new Date();
                            const date = new Date(dateValue);
                            
                            // Check if date is valid
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
                            // Format details to match expected format: "updated by - [Entity]" or "created by - [Entity]"
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
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formattedDate} {formattedTime}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
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
            </div>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1f2937]">Delete Item</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-[#64748b] hover:text-[#1f2937]"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-[#475569] mb-6">
              Are you sure you want to delete "{item?.itemName}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="no-blue-button px-4 py-2 text-sm font-medium text-[#475569] bg-white border border-[#d7dcf5] rounded-lg hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Inactive Confirmation Modal */}
      {showInactiveModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1f2937]">Mark as Inactive</h2>
              <button
                onClick={() => setShowInactiveModal(false)}
                className="text-[#64748b] hover:text-[#1f2937]"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-[#475569] mb-6">
              Are you sure you want to mark "{item?.itemName}" as inactive? This item will no longer be available for selection.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowInactiveModal(false)}
                className="no-blue-button px-4 py-2 text-sm font-medium text-[#475569] bg-white border border-[#d7dcf5] rounded-lg hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsInactive}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? "Updating..." : "Mark as Inactive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Group Modal */}
      {showAddToGroupModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#1f2937]">Grouping of Items</h2>
              <button
                onClick={() => {
                  setShowAddToGroupModal(false);
                  setSelectedTargetGroupId("");
                  setNewGroupName("");
                  setNewGroupUnit("");
                  setCreateAttributes(true);
                  setGroupOption("create");
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Would you like to section */}
            <div className="mb-6">
              <p className="text-sm font-medium text-[#475569] mb-3">Would you like to</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="groupOption"
                    value="create"
                    checked={groupOption === "create"}
                    onChange={(e) => setGroupOption(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-[#1f2937]">Create a new Item Group</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="groupOption"
                    value="existing"
                    checked={groupOption === "existing"}
                    onChange={(e) => setGroupOption(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-[#1f2937]">Add them to an existing Item Group</span>
                </label>
              </div>
            </div>

            {/* Create new group fields */}
            {groupOption === "create" && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#475569] mb-2">
                    Item Group Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter item group name"
                    className="w-full px-4 py-2 border border-[#d7dcf5] rounded-lg text-sm text-[#1f2937] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#475569] mb-2">
                    <span>Unit</span>
                    <span className="text-red-500">*</span>
                    <Info size={14} className="inline ml-1 text-[#94a3b8]" />
                  </label>
                  <select
                    value={newGroupUnit}
                    onChange={(e) => setNewGroupUnit(e.target.value)}
                    className="w-full px-4 py-2 border border-[#d7dcf5] rounded-lg text-sm text-[#1f2937] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="">Select or type to add</option>
                    {unitOptions.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createAttributes}
                      onChange={(e) => setCreateAttributes(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-[#d7dcf5] focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="text-sm text-[#1f2937]">
                      Create Attributes and Options<span className="text-red-500">*</span>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Add to existing group field */}
            {groupOption === "existing" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Select Group
                </label>
                <select
                  value={selectedTargetGroupId}
                  onChange={(e) => setSelectedTargetGroupId(e.target.value)}
                  className="w-full px-4 py-2 border border-[#d7dcf5] rounded-lg text-sm text-[#1f2937] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingGroups || loading}
                >
                  <option value="">-- Select a group --</option>
                  {allItemGroups.map((group) => (
                    <option key={group._id || group.id} value={group._id || group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {loadingGroups && (
                  <p className="text-xs text-[#64748b] mt-2">Loading groups...</p>
                )}
              </div>
            )}

            {/* Items to be grouped section */}
            <div className="mb-6 border-t border-[#e4e6f2] pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-600">ITEMS TO BE GROUPED</h3>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-blue-600">SKU</span>
                  <Info size={14} className="text-[#94a3b8]" />
                </div>
              </div>
              {item && (
                <div className="bg-[#f8f9ff] rounded-lg p-3 border border-[#e4e6f2]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1f2937]">{item.itemName}</span>
                    <span className="text-sm text-[#64748b]">{item.sku || "—"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e4e6f2]">
              <button
                onClick={() => {
                  setShowAddToGroupModal(false);
                  setSelectedTargetGroupId("");
                  setNewGroupName("");
                  setNewGroupUnit("");
                  setCreateAttributes(true);
                  setGroupOption("create");
                }}
                className="no-blue-button px-5 py-2 text-sm font-medium text-[#475569] bg-white border border-[#d7dcf5] rounded-lg hover:bg-[#f8fafc] transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddToGroup}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  loading ||
                  loadingGroups ||
                  (groupOption === "create" && (!newGroupName.trim() || !newGroupUnit.trim())) ||
                  (groupOption === "existing" && !selectedTargetGroupId)
                }
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Returnable Modal */}
      {showReturnableModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1f2937]">Mark as Returnable</h2>
              <button
                onClick={() => setShowReturnableModal(false)}
                className="text-[#64748b] hover:text-[#1f2937]"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-[#475569] mb-6">
              {item?.returnable 
                ? `Are you sure you want to mark "${item?.itemName}" as non-returnable?`
                : `Are you sure you want to mark "${item?.itemName}" as returnable?`
              }
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReturnableModal(false)}
                className="no-blue-button px-4 py-2 text-sm font-medium text-[#475569] bg-white border border-[#d7dcf5] rounded-lg hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsReturnable}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? "Updating..." : item?.returnable ? "Mark as Non-Returnable" : "Mark as Returnable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoeSalesItemDetail;

const DetailCard = ({ title, children, actions }) => (
  <div className="rounded-3xl border border-[#e1e5f5] bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-[#1f2937]">{title}</h2>
      {actions}
    </div>
    <div className="mt-5 space-y-4 text-sm text-[#475569]">{children}</div>
  </div>
);

const DetailItem = ({ label, value }) => (
  <div>
    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">{label}</span>
    <p className="mt-1 text-sm font-medium text-[#1f2937]">{value || "—"}</p>
  </div>
);

const SummaryRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between rounded-2xl border border-[#eef2ff] bg-[#f8f9ff] px-4 py-3 text-sm">
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5]">
        <Icon size={18} />
      </span>
      <span className="font-semibold text-[#475569]">{label}</span>
    </div>
    <span className="font-semibold text-[#1f2937]">{value}</span>
  </div>
);

const ActivityRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-[#eef2ff] bg-[#f8f9ff] px-4 py-3 text-sm">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5]">
      <Icon size={18} />
    </span>
    <div>
      <p className="text-sm font-semibold text-[#1f2937]">{label}</p>
      <p className="text-xs text-[#6b7280]">{value}</p>
    </div>
  </div>
);

const StatusIndicator = ({ label, active }) => (
  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
    <span
      className={`flex h-4 w-4 items-center justify-center rounded border ${
        active ? "border-[#2563eb] bg-[#2563eb]" : "border-[#cbd5f5] bg-white"
      }`}
    >
      {active && <span className="h-2 w-2 rounded-full bg-white" />}
    </span>
    <span className={active ? "text-[#1f2937]" : "text-[#94a3b8]"}>{label}</span>
  </span>
);

const mapTrackingMethod = (value) => {
  switch (value) {
    case "serial":
      return "Track Serial Number";
    case "batch":
      return "Track Batches";
    default:
      return "None";
  }
};

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4.5L6 7.5L9 4.5" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UploadPlaceholder = () => (
  <>
    <p className="text-sm font-medium">Drag image(s) here or browse images</p>
    <p className="mt-2 text-xs leading-5">
      You can add up to 15 images, each not exceeding 5 MB in size and 7000 x 7000 pixels resolution.
    </p>
    <button className="mt-4 rounded-full border border-[#cbd5f5] px-4 py-2 text-sm font-medium text-[#3762f9] hover:bg-[#eef2ff]">
      Upload
    </button>
  </>
);


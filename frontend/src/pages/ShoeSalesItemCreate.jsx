import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search, Check, Settings, X, Package, DollarSign, ShoppingCart, Warehouse, Image, Info, AlertCircle } from "lucide-react";
import Header from "../components/Header";
import ImageUpload from "../components/ImageUpload";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const API_ROOT = (baseUrl?.baseUrl || "").replace(/\/$/, "");
const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

const STORAGE_KEYS = {
  manufacturers: "shoeSalesManufacturers",
  brands: "shoeSalesBrands",
};

const loadStoredList = (key) => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error(`Failed to parse ${key} from localStorage`, error);
  }
  return [];
};

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

const inventoryAccountGroups = [
  {
    group: "Stock",
    options: [
      { label: "Finished Goods", value: "Finished Goods" },
      { label: "Inventory Asset", value: "Inventory Asset" },
      { label: "Work In Progress", value: "Work In Progress" },
    ],
  },
  {
    group: "Expenses",
    options: [
      { label: "Cost of Goods Sold", value: "Cost of Goods Sold" },
      { label: "Inventory Adjustments", value: "Inventory Adjustments" },
    ],
  },
];

const inventoryValuationGroups = [
  {
    group: "Standard Methods",
    options: [
      { label: "FIFO (First In First Out)", value: "FIFO (First In First Out)" },
      { label: "WAC (Weighted Average Costing)", value: "WAC (Weighted Average Costing)" },
      { label: "LIFO (Last In First Out)", value: "LIFO (Last In First Out)" },
    ],
  },
];

const taxPreferenceGroups = [
  {
    group: "Standard",
    options: [
      { label: "Taxable", value: "taxable" },
      { label: "Non-Taxable", value: "non-taxable" },
    ],
  },
  {
    group: "Special",
    options: [
      { label: "Out of Scope", value: "out-of-scope" },
      { label: "Non-GST Supply", value: "non-gst-supply" },
      { label: "Exempt", value: "exempt" },
    ],
  },
];

const initialFormData = {
  type: "goods",
  itemName: "",
  sku: "",
  unit: "pcs",
  hsnCode: "",
  manufacturer: "",
  brand: "",
  returnable: true,
  sellable: true,
  purchasable: true,
  taxPreference: "taxable",
  dimensions: "",
  weight: "",
  upc: "",
  mpn: "",
  ean: "",
  isbn: "",
  size: "",
  inventoryValuationMethod: "",
  sellingPrice: "",
  salesAccount: "",
  salesDescription: "",
  costPrice: "",
  costAccount: "",
  preferredVendor: "",
  purchaseDescription: "",
  taxRateIntra: "",
  taxRateInter: "",
  inventoryAccount: "",
  reorderPoint: "",
  exemptionReason: "",
  sac: "",
  images: [],
};

const ShoeSalesItemCreate = () => {
  const isSidebarOpen = useSidebar();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pieceSkuParam = searchParams.get("pieceSku");
  const unitIndexParam = searchParams.get("unitIndex");
  const { id: groupId, itemId } = useParams(); // Get groupId and itemId from URL
  const isEditMode = !!itemId; // If itemId exists, we're in edit mode
  const isStandaloneItem = isEditMode && !groupId; // Editing standalone item (has itemId but no groupId)
  const [formData, setFormData] = useState(initialFormData);
  const [status, setStatus] = useState({ loading: false, error: null });
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [trackInventory, setTrackInventory] = useState(true);
  const [trackBin, setTrackBin] = useState(false);
  const [trackingMethod, setTrackingMethod] = useState("none");
  const [itemGroup, setItemGroup] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [standaloneItem, setStandaloneItem] = useState(null);
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [showManufacturerModal, setShowManufacturerModal] = useState(false);
  const [newManufacturer, setNewManufacturer] = useState("");
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [category, setCategory] = useState("other");
  const [attributeValues, setAttributeValues] = useState([]);
  const [priceIncludesGST, setPriceIncludesGST] = useState(true);

  // Fetch manufacturers from backend
  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await fetch(`${API_ROOT}/api/shoe-sales/manufacturers?isActive=true`);
        if (response.ok) {
          const data = await response.json();
          const manufacturerNames = data.map((m) => m.name);
          setManufacturers(manufacturerNames);
          // Also update localStorage as cache
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.manufacturers, JSON.stringify(manufacturerNames));
          }
        } else {
          // Fallback to localStorage if API fails
          const stored = loadStoredList(STORAGE_KEYS.manufacturers);
          setManufacturers(stored);
        }
      } catch (error) {
        console.error("Error fetching manufacturers:", error);
        // Fallback to localStorage if API fails
        const stored = loadStoredList(STORAGE_KEYS.manufacturers);
        setManufacturers(stored);
      }
    };
    fetchManufacturers();
  }, []);

  // Fetch brands from backend
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch(`${API_ROOT}/api/shoe-sales/brands?isActive=true`);
        if (response.ok) {
          const data = await response.json();
          const brandNames = data.map((b) => b.name);
          setBrands(brandNames);
          // Also update localStorage as cache
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.brands, JSON.stringify(brandNames));
          }
        } else {
          // Fallback to localStorage if API fails
          const stored = loadStoredList(STORAGE_KEYS.brands);
          setBrands(stored);
        }
      } catch (error) {
        console.error("Error fetching brands:", error);
        // Fallback to localStorage if API fails
        const stored = loadStoredList(STORAGE_KEYS.brands);
        setBrands(stored);
      }
    };
    fetchBrands();
  }, []);

  // Fetch standalone item data if editing a standalone item
  useEffect(() => {
    if (isStandaloneItem && itemId) {
      const fetchStandaloneItem = async () => {
        try {
          setLoadingGroup(true);
          const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`);
          
          if (!response.ok) {
            throw new Error("Failed to fetch item");
          }
          
          const data = await response.json();
          setStandaloneItem(data);
          
          // Prefill form with item data
          setFormData((prev) => ({
            ...prev,
            type: data.type || "goods",
            itemName: data.itemName || "",
            sku: pieceSkuParam || data.sku || "",
            unit: data.unit || "",
            hsnCode: data.hsnCode || "",
            manufacturer: data.manufacturer || "",
            brand: data.brand || "",
            returnable: data.returnable !== undefined ? data.returnable : true,
            sellable: data.sellable !== undefined ? data.sellable : true,
            purchasable: data.purchasable !== undefined ? data.purchasable : true,
            taxPreference: data.taxPreference || "taxable",
            dimensions: data.dimensions || "",
            weight: data.weight || "",
            upc: data.upc || "",
            mpn: data.mpn || "",
            ean: data.ean || "",
            isbn: data.isbn || "",
            size: data.size || "",
            inventoryValuationMethod: data.inventoryValuationMethod || data.inventoryValuation || "",
            sellingPrice: data.sellingPrice?.toString() || "",
            salesAccount: data.salesAccount || "",
            salesDescription: data.salesDescription || "",
            costPrice: data.costPrice?.toString() || "",
            costAccount: data.costAccount || "",
            preferredVendor: data.preferredVendor || "",
            purchaseDescription: data.purchaseDescription || "",
            taxRateIntra: data.taxRateIntra || "",
            taxRateInter: data.taxRateInter || "",
            inventoryAccount: data.inventoryAccount || "",
            reorderPoint: data.reorderPoint || "",
            exemptionReason: data.exemptionReason || "",
            sac: data.sac || "",
            images: data.images || [],
          }));
          setAttributeValues(data.attributeCombination || []);
          setSelectedManufacturer(data.manufacturer || "");
          setSelectedBrand(data.brand || "");
          // Note: Manufacturers and brands are now fetched from backend, 
          // so we don't need to add them to state here
          
          setTrackInventory(data.trackInventory !== undefined ? data.trackInventory : true);
          setTrackBin(data.trackBin !== undefined ? data.trackBin : false);
          setTrackingMethod(data.trackingMethod || "none");
          setSkuManuallyEdited(!!(pieceSkuParam || data.sku));
        } catch (error) {
          console.error("Error fetching standalone item:", error);
          alert("Failed to load item data. Please try again.");
          navigate(`/shoe-sales/items/${itemId}`);
        } finally {
          setLoadingGroup(false);
        }
      };
      
      fetchStandaloneItem();
    }
  }, [isStandaloneItem, itemId, navigate, pieceSkuParam]);

  // Fetch item group data if adding to a group or editing an item
  useEffect(() => {
    if (groupId) {
      const fetchItemGroup = async () => {
        try {
          setLoadingGroup(true);
          const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${groupId}`);
          
          if (!response.ok) {
            throw new Error("Failed to fetch item group");
          }
          
          const data = await response.json();
          setItemGroup(data);
          
          // Prefill form fields with group data
          setFormData((prev) => ({
            ...prev,
            type: data.itemType || "goods",
            unit: data.unit || "",
            manufacturer: data.manufacturer || "",
            brand: data.brand || "",
            taxPreference: data.taxPreference || "taxable",
            taxRateIntra: data.intraStateTaxRate || data.taxRateIntra || "",
            taxRateInter: data.interStateTaxRate || data.taxRateInter || "",
            inventoryValuationMethod: data.inventoryValuationMethod || "",
            returnable: data.returnable !== undefined ? data.returnable : true,
            sellable: data.sellable !== undefined ? data.sellable : true,
            purchasable: data.purchasable !== undefined ? data.purchasable : true,
            exemptionReason: data.exemptionReason || "",
            sac: data.sac || "",
          }));
          setSelectedManufacturer(data.manufacturer || "");
          setSelectedBrand(data.brand || "");
          // Note: Manufacturers and brands are now fetched from backend, 
          // so we don't need to add them to state here
          
          setTrackInventory(data.trackInventory !== undefined ? data.trackInventory : true);
          
          // If in edit mode, find and load the specific item
          if (isEditMode && itemId && data.items && Array.isArray(data.items)) {
            const foundItem = data.items.find(i => {
              const itemIdStr = (i._id?.toString() || i.id || "").toString();
              return itemIdStr === itemId.toString();
            });
            
            if (foundItem) {
              setCurrentItem(foundItem);
              
              // Check if "size" is one of the attributes and extract it
              let sizeValue = "";
              if (data.attributeRows && Array.isArray(data.attributeRows) && foundItem.attributeCombination) {
                const sizeIndex = data.attributeRows.findIndex(row => 
                  row?.attribute?.toLowerCase() === "size"
                );
                if (sizeIndex !== -1 && foundItem.attributeCombination[sizeIndex]) {
                  sizeValue = foundItem.attributeCombination[sizeIndex];
                }
              }
              
              // Prefill form with item data
              setFormData((prev) => ({
                ...prev,
                itemName: foundItem.name || "",
                sku: pieceSkuParam || foundItem.sku || "",
                costPrice: foundItem.costPrice?.toString() || "",
                sellingPrice: foundItem.sellingPrice?.toString() || "",
                upc: foundItem.upc || "",
                hsnCode: foundItem.hsnCode || "",
                isbn: foundItem.isbn || "",
                reorderPoint: foundItem.reorderPoint || "",
                sac: foundItem.sac || "",
                size: sizeValue || "", // Set size from attributes
              }));
              setSkuManuallyEdited(!!(pieceSkuParam || foundItem.sku));
              setAttributeValues(foundItem.attributeCombination || []);
            } else {
              alert("Item not found. Redirecting to item group.");
              navigate(`/shoe-sales/item-groups/${groupId}/items/${itemId}`);
            }
          }
        } catch (error) {
          console.error("Error fetching item group:", error);
          alert("Failed to load item group data. Please try again.");
          if (isEditMode && itemId) {
            navigate(`/shoe-sales/item-groups/${groupId}/items/${itemId}`);
          } else {
            navigate(groupId ? `/shoe-sales/item-groups/${groupId}` : "/shoe-sales/item-groups");
          }
        } finally {
          setLoadingGroup(false);
        }
      };
      
      fetchItemGroup();
    }
  }, [groupId, itemId, isEditMode, navigate, pieceSkuParam]);

  useEffect(() => {
    if (!trackInventory) {
      setTrackBin(false);
      setTrackingMethod("none");
      setFormData((prev) => ({
        ...prev,
        inventoryAccount: "",
        inventoryValuationMethod: "",
      }));
    }
  }, [trackInventory]);

  const extractGSTPercentage = useCallback((taxRate) => {
    if (!taxRate) return null;
    const match = taxRate.match(/\[(\d+(?:\.\d+)?)%\]/);
    if (match) {
      const parsed = parseFloat(match[1]);
      return Number.isNaN(parsed) ? null : parsed;
    }
    const fallback = parseFloat(taxRate);
    return Number.isNaN(fallback) ? null : fallback;
  }, []);

  const calculateGSTDetails = useCallback((amount, taxRate, isInclusive = false) => {
    if (!amount || !taxRate) return null;
    const price = parseFloat(amount);
    if (!Number.isFinite(price) || price === 0) return null;

    const percentage = extractGSTPercentage(taxRate);
    if (percentage === null) return null;

    let basePrice = 0;
    let gstAmount = 0;
    let finalPrice = 0;

    if (isInclusive) {
      basePrice = price / (1 + percentage / 100);
      gstAmount = price - basePrice;
      finalPrice = price;
    } else {
      basePrice = price;
      gstAmount = price * (percentage / 100);
      finalPrice = price + gstAmount;
    }

    return {
      basePrice: basePrice.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      percentage,
    };
  }, [extractGSTPercentage]);

  const generateSkuPreview = useCallback((name = "", size = "") => {
    const words = name
      .replace(/[^a-zA-Z0-9\s-]/g, " ")
      .split(/[\s-_,]+/)
      .filter(Boolean);

    if (words.length === 0) {
      return "";
    }

    const alphaWords = words.filter((word) => /[A-Za-z]/.test(word));
    const numericWords = words.filter((word) => /^\d+$/.test(word));

    let letters = alphaWords.map((word) => word[0].toUpperCase()).join("");

    if (!letters && alphaWords.length > 0) {
      letters = alphaWords[0].slice(0, 3).toUpperCase();
    }

    if (!letters) {
      letters = words[0].slice(0, 3).toUpperCase();
    }

    let base = letters || "ITEM";
    const digits = numericWords.join("");
    if (digits) {
      base += `-${digits}`;
    }

    // Add size to SKU if provided
    if (size && size.trim()) {
      base += `-${size.trim()}`;
    }

    return base;
  }, []);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if ((field === "itemName" || field === "size") && !skuManuallyEdited) {
        const itemName = field === "itemName" ? value : prev.itemName;
        const size = field === "size" ? value : prev.size;
        next.sku = generateSkuPreview(itemName, size);
      }
      if (field === "type") {
        if (value === "service") {
          next.hsnCode = "";
        } else {
          next.sac = "";
        }
      }
      return next;
    });
  };

  const handleSkuChange = (event) => {
    const value = event.target.value;
    setSkuManuallyEdited(true);
    setFormData((prev) => ({ ...prev, sku: value.toUpperCase() }));
  };

const handleCheckboxChange = (field) => (event) => {
  const checked = event.target.checked;
  setFormData((prev) => {
    const next = { ...prev, [field]: checked };

    if (field === "sellable" && !checked) {
      next.sellingPrice = "";
      next.salesAccount = "";
      next.salesDescription = "";
    }

    if (field === "purchasable" && !checked) {
      next.costPrice = "";
      next.costAccount = "";
      next.preferredVendor = "";
      next.purchaseDescription = "";
    }

    return next;
  });
};

  const handleSelectChange = (field) => (value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "taxPreference" && value === "taxable") {
        next.exemptionReason = "";
      }
      return next;
    });
  };

  // Allow editing of per-attribute values (e.g., color, size) for a single group item
  const handleAttributeValueChange = (attrIndex, attrLabel) => (event) => {
    const value = event.target.value;
    setAttributeValues((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      next[attrIndex] = value;
      // Keep dedicated size field synchronized if this attribute is "size"
      if (typeof attrLabel === "string" && attrLabel.toLowerCase() === "size") {
        setFormData((p) => ({ ...p, size: value }));
      }
      return next;
    });
  };

  const handleManufacturerSelect = (value) => {
    setSelectedManufacturer(value);
    setFormData((prev) => ({ ...prev, manufacturer: value }));
  };

  const handleBrandSelect = (value) => {
    setSelectedBrand(value);
    setFormData((prev) => ({ ...prev, brand: value }));
  };

  const handleCategorySelect = (value) => {
    setCategory(value);
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const handleRadioChange = (field, value) => () => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Check if SKU already exists
  const checkSkuExists = async (sku) => {
    if (!sku || !sku.trim()) return false;
    try {
      const response = await fetch(`${API_ROOT}/api/shoe-sales/items?sku=${encodeURIComponent(sku.trim().toUpperCase())}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out current item if editing
        const items = Array.isArray(data) ? data : (data.items || []);
        if (isEditMode && itemId) {
          // When editing, exclude the current item from the check
          return items.some(item => {
            const itemIdStr = (item._id?.toString() || item.id || "").toString();
            return item.sku?.toUpperCase() === sku.trim().toUpperCase() && itemIdStr !== itemId.toString();
          });
        }
        return items.some(item => item.sku?.toUpperCase() === sku.trim().toUpperCase());
      }
      return false;
    } catch (error) {
      console.error("Error checking SKU:", error);
      return false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: null });

    try {
      // Check SKU uniqueness for standalone items
      if (!groupId && formData.sku && formData.sku.trim()) {
        const skuExists = await checkSkuExists(formData.sku);
        if (skuExists) {
          setStatus({ loading: false, error: "SKU already exists. Please use a different SKU." });
          alert("SKU already exists. Please use a different SKU.");
          return;
        }
      }

      // If adding to a group or editing an item in a group
      if (groupId && itemGroup) {
        // Validate required fields
        if (!formData.itemName || formData.itemName.trim() === "") {
          setStatus({ loading: false, error: "Item name is required." });
          return;
        }

        // Create/update the item object matching the group's item schema
        const itemData = {
          name: formData.itemName.trim(),
          sku: formData.sku || "",
          costPrice: formData.costPrice ? Number(formData.costPrice) : 0,
          sellingPrice: formData.sellingPrice ? Number(formData.sellingPrice) : 0,
          upc: formData.upc || "",
          hsnCode: formData.hsnCode || "",
          isbn: formData.isbn || "",
          reorderPoint: formData.reorderPoint || "",
          sac: formData.type === "service" ? (formData.sac || "") : "",
          returnable: formData.returnable !== undefined ? formData.returnable : true,
        };

        let updatedItems;
        // Track per-attribute changes (e.g., size/color) to update group-level options conditionally
        const attrRows = Array.isArray(itemGroup.attributeRows) ? itemGroup.attributeRows : [];
        const changedPrevValues = new Map(); // index -> previous
        const changedNextValues = new Map(); // index -> next
        if (isEditMode && currentItem) {
          // Update existing item - preserve _id, id, stock, warehouseStocks, and attributeCombination
          updatedItems = itemGroup.items.map(i => {
            const itemIdStr = (i._id?.toString() || i.id || "").toString();
            if (itemIdStr === itemId.toString()) {
              // Update attributeCombination with size value if size attribute exists
              let updatedAttributeCombination = [...(i.attributeCombination || [])];
              // Prefer values from editable attributeValues; fallback to existing
              for (let ai = 0; ai < attrRows.length; ai++) {
                const label = (attrRows[ai]?.attribute || "").toLowerCase();
                const prevVal = updatedAttributeCombination[ai] || "";
                let newVal = (attributeValues && attributeValues[ai] !== undefined) ? attributeValues[ai] : prevVal;
                // Keep dedicated size field in sync
                if (label === "size") {
                  if (formData.size) newVal = formData.size;
                }
                if (newVal !== prevVal) {
                  changedPrevValues.set(ai, prevVal);
                  changedNextValues.set(ai, newVal);
                }
                updatedAttributeCombination[ai] = newVal;
              }
              
              // Regenerate item name from updated attributeCombination
              let updatedItemName = itemData.name.trim();
              if (updatedAttributeCombination.length > 0) {
                const optionsStr = updatedAttributeCombination.join("/");
                updatedItemName = `${itemGroup.name} - ${optionsStr}`;
                console.log(`Regenerated item name: "${updatedItemName}" from combination:`, updatedAttributeCombination);
              }
              
              return {
                ...i,
                _id: i._id || i.id, // Preserve _id
                id: i.id || i._id, // Preserve id
                ...itemData,
                name: updatedItemName, // Use regenerated name with updated attributes
                stock: i.stock !== undefined ? i.stock : 0, // Preserve stock
                warehouseStocks: i.warehouseStocks || [], // Preserve warehouse stocks
                attributeCombination: updatedAttributeCombination, // Update attribute combination with size
              };
            }
            return i;
          });
        } else {
          // Add new item - initialize with user's warehouse
          const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
          const userLocName = currentUser.username || currentUser.locName || "";
          
          // Helper function to map locName to warehouse name
          const mapLocNameToWarehouse = (locName) => {
            if (!locName) return "Warehouse";
            // Remove prefixes like "G.", "Z.", "SG."
            let warehouse = locName.replace(/^[A-Z]\.?\s*/i, "").trim();
            // Add "Branch" if not already present and not "Warehouse"
            if (warehouse && warehouse.toLowerCase() !== "warehouse" && !warehouse.toLowerCase().includes("branch")) {
              warehouse = `${warehouse} Branch`;
            }
            return warehouse || "Warehouse";
          };
          
          const userWarehouse = mapLocNameToWarehouse(userLocName);
          
          const newItem = {
            ...itemData,
            stock: 0,
            attributeCombination: [],
            warehouseStocks: [{
              warehouse: userWarehouse,
              openingStock: 0,
              openingStockValue: 0,
              stockOnHand: 0,
              committedStock: 0,
              availableForSale: 0,
              physicalOpeningStock: 0,
              physicalStockOnHand: 0,
              physicalCommittedStock: 0,
              physicalAvailableForSale: 0,
            }],
          };
          updatedItems = [...(itemGroup.items || []), newItem];
        }
        
        // Get current user for history tracking
        const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
        const changedBy = currentUser.username || currentUser.locName || "System";
        const userLocName = currentUser.username || currentUser.locName || "";
        
        // Helper function to map locName to warehouse name
        const mapLocNameToWarehouse = (locName) => {
          if (!locName) return "Warehouse";
          // Remove prefixes like "G.", "Z.", "SG."
          let warehouse = locName.replace(/^[A-Z]\.?\s*/i, "").trim();
          // Add "Branch" if not already present and not "Warehouse"
          if (warehouse && warehouse.toLowerCase() !== "warehouse" && !warehouse.toLowerCase().includes("branch")) {
            warehouse = `${warehouse} Branch`;
          }
          return warehouse || "Warehouse";
        };
        
        const userWarehouse = mapLocNameToWarehouse(userLocName);

        // Conditionally update group-level attribute options for the specific attribute changed:
        // - If a new size value was introduced, add it to the "size" options (if not already there)
        // - If the old size value is no longer used by any item in the group, remove it
        let updatedAttributeRows = Array.isArray(itemGroup.attributeRows)
          ? itemGroup.attributeRows.map((r) => ({ ...r, options: Array.isArray(r.options) ? [...r.options] : [] }))
          : [];
        if (isEditMode && currentItem && updatedAttributeRows.length > 0 && changedNextValues.size > 0) {
          // For each changed attribute, add new option if missing and remove old if unused
          changedNextValues.forEach((newVal, idx) => {
            const row = updatedAttributeRows[idx];
            if (!row) return;
            if (newVal && !row.options.includes(newVal)) {
              row.options.push(newVal);
              row.options.sort((a, b) => {
                const na = parseFloat(a), nb = parseFloat(b);
                if (!isNaN(na) && !isNaN(nb)) return na - nb;
                return a.toString().localeCompare(b.toString());
              });
            }
            const oldVal = changedPrevValues.get(idx);
            if (oldVal && oldVal !== newVal) {
              const usedElsewhere = updatedItems.some((it) => {
                const combo = it?.attributeCombination || [];
                return combo[idx] === oldVal;
              });
              if (!usedElsewhere) {
                row.options = row.options.filter((opt) => opt !== oldVal);
              }
            }
          });
        }

        // Prepare update payload with all group fields preserved
        const updatePayload = {
          name: itemGroup.name,
          sku: itemGroup.sku || "",
          itemType: itemGroup.itemType || "goods",
          unit: itemGroup.unit || "",
          manufacturer: itemGroup.manufacturer || "",
          brand: itemGroup.brand || "",
          taxPreference: formData.taxPreference || "taxable",
          exemptionReason: formData.taxPreference === "non-taxable" ? (formData.exemptionReason || "") : "",
          intraStateTaxRate: formData.taxPreference === "taxable" ? (formData.taxRateIntra || "") : "",
          interStateTaxRate: formData.taxPreference === "taxable" ? (formData.taxRateInter || "") : "",
          inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
          createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
          attributeRows: updatedAttributeRows,
          sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
          purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
          trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
          items: updatedItems,
          stock: itemGroup.stock || 0,
          reorder: itemGroup.reorder || "",
          isActive: itemGroup.isActive !== undefined ? itemGroup.isActive : true,
          itemId: isEditMode ? itemId : undefined, // Include itemId for history tracking
          changedBy: changedBy,
          userWarehouse: userWarehouse,
          userLocName: userLocName,
        };
        
        console.log("Saving item group with updated items:", {
          updatedItems: updatedItems.map(i => ({ name: i.name, returnable: i.returnable, attributeCombination: i.attributeCombination })),
          updatedAttributeRows: updatedAttributeRows.map(r => ({ attribute: r.attribute, options: r.options }))
        });
        
        const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${groupId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || payload?.errors?.join(", ") || (isEditMode ? "Failed to update item." : "Failed to add item to group."));
        }

        // Navigate back to the item detail page if editing, or group detail page if creating
        if (isEditMode && itemId) {
          const targetSku = formData.sku || pieceSkuParam;
          const nextParams = new URLSearchParams();
          if (targetSku) nextParams.set("pieceSku", targetSku);
          if (unitIndexParam) nextParams.set("unitIndex", unitIndexParam);
          const queryStr = nextParams.toString() ? `?${nextParams.toString()}` : "";
          navigate(`/shoe-sales/item-groups/${groupId}/items/${itemId}${queryStr}`);
        } else {
          navigate(`/shoe-sales/item-groups/${groupId}`);
        }
      } else if (isStandaloneItem) {
        // Update standalone item
        // Process images: extract base64 data and format properly
        const processedImages = formData.images.map(img => {
          // Check if it's already a processed image object
          if (img.filename && img.contentType && img.data) {
            return img;
          }
          let base64Data = img.base64 || img;
          // Remove data URL prefix if present
          if (typeof base64Data === "string" && base64Data.startsWith("data:")) {
            base64Data = base64Data.split(",")[1] || base64Data;
          }
          return {
            filename: img.name || "image",
            contentType: img.type || "image/jpeg",
            data: base64Data,
          };
        });
        
        const updatePayload = {
          ...formData,
          images: processedImages,
          trackInventory,
          trackBin,
          trackingMethod,
          sellingPrice: formData.sellingPrice ? Number(formData.sellingPrice) : 0,
          costPrice: formData.costPrice ? Number(formData.costPrice) : 0,
          warehouseStocks: standaloneItem?.warehouseStocks || [], // Preserve warehouse stocks
        };

        console.log("Updating standalone item with payload:", { returnable: updatePayload.returnable, itemId });

        const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || "Failed to update item.");
        }

        const targetSku = formData.sku || pieceSkuParam;
        const nextParams = new URLSearchParams();
        if (targetSku) nextParams.set("pieceSku", targetSku);
        if (unitIndexParam) nextParams.set("unitIndex", unitIndexParam);
        const queryStr = nextParams.toString() ? `?${nextParams.toString()}` : "";
        navigate(`/shoe-sales/items/${itemId}${queryStr}`);
      } else {
        // Create standalone item (original behavior)
        // Get current user for history tracking
        const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
        const changedBy = currentUser.username || currentUser.locName || "System";
        const userLocName = currentUser.username || currentUser.locName || "";
        
        // Helper function to map locName to warehouse name
        const mapLocNameToWarehouse = (locName) => {
          if (!locName) return "Warehouse";
          // Remove prefixes like "G.", "Z.", "SG."
          let warehouse = locName.replace(/^[A-Z]\.?\s*/i, "").trim();
          // Add "Branch" if not already present and not "Warehouse"
          if (warehouse && warehouse.toLowerCase() !== "warehouse" && !warehouse.toLowerCase().includes("branch")) {
            warehouse = `${warehouse} Branch`;
          }
          return warehouse || "Warehouse";
        };
        
        const userWarehouse = mapLocNameToWarehouse(userLocName);
        
        // Process images: extract base64 data and format properly
        const processedImages = formData.images.map(img => {
          let base64Data = img.base64 || img;
          // Remove data URL prefix if present
          if (typeof base64Data === "string" && base64Data.startsWith("data:")) {
            base64Data = base64Data.split(",")[1] || base64Data;
          }
          return {
            filename: img.name || "image",
            contentType: img.type || "image/jpeg",
            data: base64Data,
          };
        });
        
        const response = await fetch(`${API_ROOT}/api/shoe-sales/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            images: processedImages,
            trackInventory,
            trackBin,
            trackingMethod,
            sellingPrice: formData.sellingPrice ? Number(formData.sellingPrice) : 0,
            costPrice: formData.costPrice ? Number(formData.costPrice) : 0,
            changedBy: changedBy,
            createdBy: changedBy,
            userWarehouse: userWarehouse,
            userLocName: userLocName,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || "Failed to save item.");
        }

        setFormData(initialFormData);
        setAttributeValues([]);
        setSkuManuallyEdited(false);
        setTrackInventory(true);
        setTrackBin(false);
        setTrackingMethod("none");
        navigate("/shoe-sales/items");
      }
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Something went wrong." });
      return;
    }

    setStatus({ loading: false, error: null });
  };

  // Enter key to save item
  useEnterToSave((e) => {
    const syntheticEvent = e || { preventDefault: () => {} };
    handleSubmit(syntheticEvent);
  }, status.loading);

  // Calculate attribute summary BEFORE any early returns (hooks must be called unconditionally)
  // Filter out "size" since it has its own dedicated field
  const attributeSummary = useMemo(() => {
    if (!itemGroup || !Array.isArray(itemGroup.attributeRows)) return [];
    return itemGroup.attributeRows
      .map((row, idx) => ({
        label: row.attribute,
        value: attributeValues[idx] || "",
        originalIndex: idx
      }))
      .filter((item) => item.label && item.label.toLowerCase() !== "size");
  }, [itemGroup, attributeValues]);

  // Early return for loading state - AFTER all hooks
  if (loadingGroup) {
    return (
      <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] p-6 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-lg p-8 text-center">
          <p className="text-lg font-medium text-[#475569]">Loading item group...</p>
        </div>
      </div>
    );
  }

  const backUrl = isStandaloneItem && itemId
    ? `/shoe-sales/items/${itemId}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    : (isEditMode && itemId
      ? `/shoe-sales/item-groups/${groupId}/items/${itemId}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
      : (groupId ? `/shoe-sales/item-groups/${groupId}` : "/shoe-sales/items"));
  const backText = isStandaloneItem
    ? "Back to Item"
    : (isEditMode 
      ? "Back to Item"
      : (groupId ? "Back to Group" : "Back to Items"));
  const pageTitle = isStandaloneItem
    ? `Edit Item${unitIndexParam ? ` (Unit ${unitIndexParam})` : ""}`
    : (isEditMode
      ? `Edit Item - ${currentItem?.name || "Item"}${unitIndexParam ? ` (Unit ${unitIndexParam})` : ""}` 
      : (groupId ? `Add Item to ${itemGroup?.name || "Group"}` : "New Item"));
  const pageDescription = isEditMode
    ? "Edit item details for sales, purchasing, and inventory tracking."
    : (groupId 
      ? "Add a new item to this item group." 
      : "Capture product details for sales, purchasing, and inventory tracking.");

  const selectedTaxRate = formData.taxRateIntra || formData.taxRateInter;
  const shouldShowGSTSummary = !!(formData.sellable && formData.sellingPrice && selectedTaxRate);
  const gstDetails = shouldShowGSTSummary
    ? calculateGSTDetails(formData.sellingPrice, selectedTaxRate, priceIncludesGST)
    : null;

  return (
    <div className="invoice-page-wrapper min-h-screen bg-[#F8FAFC] text-gray-900">
      <Header title={isEditMode ? "Edit Item" : (groupId ? "Add Item to Group" : "Create Item")} />

      <div className={`transition-all duration-300 p-6 md:p-8 max-w-7xl mx-auto ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Action Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3.5 min-w-0">
            <Link
              to={backUrl}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-xs hover:border-purple-200 hover:text-purple-600 transition cursor-pointer shrink-0"
            >
              <ArrowLeft size={14} className="text-gray-500 group-hover:text-purple-600" />
              <span>{backText}</span>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 truncate">
                {pageTitle}
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {pageDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {status.error && (
            <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 shadow-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-xs font-semibold text-red-800">{status.error}</p>
            </div>
          )}

          {/* Card 1: Basic Information */}
          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/80 shadow-2xs">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Basic Information</h2>
                  <p className="text-[11px] text-gray-500">Configure the fundamental details of your item</p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8">
              <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
                {/* Core Fields Column */}
                <div className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <FloatingField
                      label="Item Name"
                      placeholder="Enter item name"
                      required
                      name="itemName"
                      value={formData.itemName}
                      onChange={handleChange("itemName")}
                      disabled={status.loading}
                    />
                    <FloatingField
                      label="Size"
                      placeholder="Select size"
                      name="size"
                      value={formData.size}
                      onChange={handleChange("size")}
                      disabled={status.loading}
                    />
                    <FloatingField
                      label="SKU"
                      placeholder="Auto-generated or enter manually"
                      name="sku"
                      value={formData.sku}
                      onChange={handleSkuChange}
                      disabled={status.loading}
                      hint={
                        <div className="flex items-center gap-1 text-[11px] font-medium text-purple-600">
                          <Info className="w-3.5 h-3.5 text-purple-500" />
                          Auto-generated
                        </div>
                      }
                    />
                    <UnitSelect
                      label="Unit"
                      placeholder="Select or type to add"
                      required
                      value={formData.unit}
                      onChange={(value) => setFormData((prev) => ({ ...prev, unit: value }))}
                      options={unitOptions}
                    />
                    <FloatingField
                      label="HSN Code"
                      placeholder="Enter HSN code"
                      name="hsnCode"
                      value={formData.hsnCode}
                      onChange={handleChange("hsnCode")}
                      disabled={status.loading}
                    />
                  </div>

                  {/* Brand & Manufacturer */}
                  <div className="grid gap-5 md:grid-cols-2">
                    <ManufacturerSelect
                      label="Manufacturer"
                      placeholder="Select or add manufacturer"
                      value={selectedManufacturer}
                      onChange={handleManufacturerSelect}
                      options={manufacturers}
                      onManageClick={() => setShowManufacturerModal(true)}
                      disabled={status.loading}
                    />
                    <BrandSelect
                      label="Brand"
                      placeholder="Select or add brand"
                      value={selectedBrand}
                      onChange={handleBrandSelect}
                      options={brands}
                      onManageClick={() => setShowBrandModal(true)}
                      disabled={status.loading}
                    />
                  </div>

                  {/* Variant Attributes */}
                  {itemGroup && Array.isArray(itemGroup.attributeRows) && itemGroup.attributeRows.length > 0 && (
                    <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-purple-600" />
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Variant Attributes</h3>
                          <p className="text-[11px] text-gray-500">Configure attributes for this item variant</p>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {itemGroup.attributeRows.map((row, idx) => {
                          const label = row?.attribute || `Attribute ${idx + 1}`;
                          const currentVal = (attributeValues && attributeValues[idx]) || "";
                          const options = Array.isArray(row?.options) ? row.options : [];
                          const optionsHint = options.length > 0 ? `Available: ${options.join(", ")}` : "Enter custom value";
                          return (
                            <div key={`${label}-${idx}`} className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-gray-700">
                                {label}
                              </label>
                              <input
                                type="text"
                                value={currentVal}
                                onChange={handleAttributeValueChange(idx, label)}
                                placeholder={options.length ? `e.g. ${options[0]}` : "Enter value"}
                                className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition"
                                disabled={status.loading}
                              />
                              <p className="text-[10px] text-gray-500">{optionsHint}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Additional Settings */}
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="flex items-center">
                      <FloatingCheckbox
                        label="Returnable Item"
                        name="returnable"
                        checked={formData.returnable}
                        onChange={handleCheckboxChange("returnable")}
                        disabled={status.loading}
                      />
                    </div>
                    <div className="space-y-4">
                      <SearchableSelect
                        label="Tax Preference"
                        placeholder="Select tax preference"
                        value={formData.taxPreference}
                        onChange={handleSelectChange("taxPreference")}
                        groups={taxPreferenceGroups}
                        required
                        disabled={status.loading}
                      />
                      {formData.taxPreference === "non-taxable" && (
                        <div className="relative">
                          <FloatingField
                            label="Exemption Reason"
                            placeholder="Enter exemption reason"
                            name="exemptionReason"
                            value={formData.exemptionReason}
                            onChange={handleChange("exemptionReason")}
                            disabled={status.loading}
                            required
                          />
                          <div className="absolute top-2 right-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Images Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Image className="w-4 h-4 text-purple-600" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Product Images</h3>
                      <p className="text-[11px] text-gray-500">Upload images of your item</p>
                    </div>
                  </div>
                  <ImageUpload
                    onImagesSelect={(images) =>
                      setFormData((prev) => ({
                        ...prev,
                        images: images,
                      }))
                    }
                    existingImages={formData.images}
                    onRemoveImage={(index) => {
                      setFormData((prev) => ({
                        ...prev,
                        images: prev.images.filter((_, i) => i !== index),
                      }));
                    }}
                    multiple={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Sales & Purchase Information */}
          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shadow-2xs">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Sales & Purchase Information</h2>
                  <p className="text-[11px] text-gray-500">Configure pricing and procurement settings</p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Sales Information */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Sales Details</h3>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sellable"
                        checked={formData.sellable}
                        onChange={handleCheckboxChange("sellable")}
                        disabled={status.loading}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                      />
                      <span>Sellable</span>
                    </label>
                  </div>

                  {formData.taxPreference === "taxable" && (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <TaxRateSelect
                          label="Intra State Tax Rate"
                          value={formData.taxRateIntra}
                          onChange={(value) => setFormData((prev) => ({ ...prev, taxRateIntra: value }))}
                          type="intra"
                        />
                        <TaxRateSelect
                          label="Inter State Tax Rate"
                          value={formData.taxRateInter}
                          onChange={(value) => setFormData((prev) => ({ ...prev, taxRateInter: value }))}
                          type="inter"
                        />
                      </div>
                      <div>
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            name="priceIncludesGST"
                            checked={priceIncludesGST}
                            onChange={(event) => setPriceIncludesGST(event.target.checked)}
                            disabled={status.loading}
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                          />
                          <span>Price includes GST</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <FloatingField
                    label="Selling Price"
                    placeholder="0.00"
                    prefix="₹"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleChange("sellingPrice")}
                    disabled={!formData.sellable || status.loading}
                  />

                  {/* GST Summary */}
                  {shouldShowGSTSummary && gstDetails && (
                    <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/40 to-slate-50/60 p-4 shadow-xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-3">Price Breakdown</h4>
                      {priceIncludesGST ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                              Base Price (Excl. GST)
                            </label>
                            <div className="flex items-center rounded-xl border border-gray-200/80 bg-white px-3 py-2 font-mono shadow-2xs">
                              <span className="text-xs font-semibold text-gray-500">₹</span>
                              <span className="text-sm font-bold text-gray-900 ml-1.5">{gstDetails.basePrice}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                              GST Amount ({gstDetails.percentage}%)
                            </label>
                            <div className="flex items-center rounded-xl border border-gray-200/80 bg-white px-3 py-2 font-mono shadow-2xs">
                              <span className="text-xs font-semibold text-gray-500">₹</span>
                              <span className="text-sm font-bold text-gray-900 ml-1.5">{gstDetails.gstAmount}</span>
                            </div>
                          </div>
                          <div className="md:col-span-2 pt-2.5 border-t border-purple-100/80 flex items-center justify-between">
                            <span className="text-xs text-gray-600 font-medium">Total inclusive price:</span>
                            <span className="font-bold font-mono text-purple-900 text-sm">₹{gstDetails.finalPrice}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                              Price with GST
                            </label>
                            <div className="flex items-center rounded-xl border border-gray-200/80 bg-white px-3 py-2 font-mono shadow-2xs">
                              <span className="text-xs font-semibold text-gray-500">₹</span>
                              <span className="text-sm font-bold text-gray-900 ml-1.5">{gstDetails.finalPrice}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 font-medium">
                            GST Amount ({gstDetails.percentage}%): <span className="font-bold font-mono text-gray-900">₹{gstDetails.gstAmount}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Purchase Information */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Purchase Details</h3>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="purchasable"
                        checked={formData.purchasable}
                        onChange={handleCheckboxChange("purchasable")}
                        disabled={status.loading}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                      />
                      <span>Purchasable</span>
                    </label>
                  </div>

                  <FloatingField
                    label="Cost Price"
                    placeholder="0.00"
                    prefix="₹"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange("costPrice")}
                    disabled={!formData.purchasable || status.loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Inventory & Tracking */}
          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-2xs">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Inventory & Tracking</h2>
                  <p className="text-[11px] text-gray-500">Configure inventory management thresholds</p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8">
              <div className="grid gap-6 md:grid-cols-2">
                <FloatingField
                  label="Reorder Point"
                  placeholder="Enter quantity threshold"
                  name="reorderPoint"
                  value={formData.reorderPoint}
                  onChange={handleChange("reorderPoint")}
                  disabled={status.loading}
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-2xl shadow-lg p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-gray-500 font-medium">
              {groupId ? "This item will be saved in the selected group." : "A standalone item will be saved."}
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={backUrl}
                className="inline-flex items-center justify-center h-10 px-5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-xs transition-colors cursor-pointer"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={status.loading}
                className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-purple-500/20 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {status.loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  groupId ? (isEditMode ? "Update Item" : "Add to Group") : (isEditMode ? "Update Item" : "Save Item")
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showManufacturerModal && (
        <ManufacturerModal
          onClose={() => {
            setShowManufacturerModal(false);
            setNewManufacturer("");
          }}
          onAdd={async (name) => {
            if (name.trim()) {
              try {
                const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
                const createdBy = currentUser.username || currentUser.locName || "System";
                
                const response = await fetch(`${API_ROOT}/api/shoe-sales/manufacturers`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: name.trim(),
                    createdBy: createdBy,
                  }),
                });
                
                if (response.ok) {
                  const data = await response.json();
                  const manufacturerName = data.name;
                  
                  setManufacturers((prev) =>
                    prev.includes(manufacturerName) ? prev : [...prev, manufacturerName]
                  );
                  handleManufacturerSelect(manufacturerName);
                  setShowManufacturerModal(false);
                  setNewManufacturer("");
                } else {
                  const errorData = await response.json().catch(() => ({ message: "Failed to create manufacturer" }));
                  alert(errorData.message || "Failed to create manufacturer. Please try again.");
                }
              } catch (error) {
                console.error("Error creating manufacturer:", error);
                alert("Failed to create manufacturer. Please try again.");
              }
            }
          }}
          newManufacturer={newManufacturer}
          setNewManufacturer={setNewManufacturer}
        />
      )}

      {showBrandModal && (
        <BrandModal
          onClose={() => {
            setShowBrandModal(false);
            setNewBrand("");
          }}
          onAdd={async (name) => {
            if (name.trim()) {
              try {
                const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
                const createdBy = currentUser.username || currentUser.locName || "System";
                
                const response = await fetch(`${API_ROOT}/api/shoe-sales/brands`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: name.trim(),
                    createdBy: createdBy,
                  }),
                });
                
                if (response.ok) {
                  const data = await response.json();
                  const brandName = data.name;
                  
                  setBrands((prev) =>
                    prev.includes(brandName) ? prev : [...prev, brandName]
                  );
                  handleBrandSelect(brandName);
                  setShowBrandModal(false);
                  setNewBrand("");
                } else {
                  const errorData = await response.json().catch(() => ({ message: "Failed to create brand" }));
                  alert(errorData.message || "Failed to create brand. Please try again.");
                }
              } catch (error) {
                console.error("Error creating brand:", error);
                alert("Failed to create brand. Please try again.");
              }
            }
          }}
          newBrand={newBrand}
          setNewBrand={setNewBrand}
        />
      )}
    </div>
  );
};

export default ShoeSalesItemCreate;

const FloatingField = ({
  label,
  placeholder,
  required = false,
  inputType = "input",
  hint,
  prefix,
  name,
  value,
  onChange,
  disabled = false,
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="block text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <div className="shrink-0">{hint}</div>}
    </div>
    {inputType === "textarea" ? (
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 outline-none"
      />
    ) : inputType === "select" ? (
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 outline-none"
      >
        <option value="">{placeholder}</option>
      </select>
    ) : (
      <div className="relative">
        <div className={`flex items-center rounded-xl border border-gray-200 bg-white focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition overflow-hidden ${disabled ? "bg-gray-50" : ""}`}>
          {prefix && (
            <div className="flex items-center pl-3.5 pr-2.5 border-r border-gray-200 h-10 bg-gray-50/80 shrink-0">
              <span className="text-xs font-semibold text-gray-600">{prefix}</span>
            </div>
          )}
          <input
            type="text"
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full h-10 px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 bg-transparent"
          />
        </div>
      </div>
    )}
  </div>
);

const FloatingCheckbox = ({ label, name, checked, onChange, disabled = false }) => (
  <label className="inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 cursor-pointer hover:border-purple-200 hover:bg-purple-50/30 transition select-none shadow-2xs">
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed cursor-pointer accent-purple-600"
    />
    {label}
  </label>
);

const FloatingRadio = ({ name, label, value, checked, onChange, disabled = false }) => (
  <label className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer transition select-none ${checked ? "border-purple-500 bg-purple-50/60 text-purple-700 shadow-2xs" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="text-purple-600 focus:ring-purple-500 accent-purple-600 disabled:cursor-not-allowed cursor-pointer"
    />
    {label}
  </label>
);

const SearchableSelect = ({ label, placeholder, value, onChange, groups, disabled = false, required = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  const normalizedGroups = useMemo(
    () =>
      groups.map((group) => ({
        group: group.group,
        options: group.options.map((option) =>
          typeof option === "string" ? { label: option, value: option } : option
        ),
      })),
    [groups]
  );

  const optionMap = useMemo(() => {
    const map = new Map();
    normalizedGroups.forEach((group) => {
      group.options.forEach((option) => {
        map.set(option.value, option.label);
      });
    });
    return map;
  }, [normalizedGroups]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return groups;
    }
    return normalizedGroups
      .map((group) => ({
        group: group.group,
        options: group.options.filter((option) => option.label.toLowerCase().includes(term)),
      }))
      .filter((group) => group.options.length > 0);
  }, [normalizedGroups, search]);

  const displayValue = value ? optionMap.get(value) || value : "";

  return (
    <div className="relative flex w-full flex-col gap-1.5 text-sm" ref={containerRef}>
      <span className="text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <div
        className={`flex h-10 items-center justify-between rounded-xl border px-3.5 text-sm transition ${
          open ? "border-purple-500 ring-2 ring-purple-100" : "border-gray-200 hover:border-gray-300"
        } ${disabled ? "bg-gray-50 text-gray-400" : "bg-white text-gray-900"} ${disabled ? "" : "cursor-pointer"}`}
        onClick={() => !disabled && setOpen((prev) => !prev)}
      >
        <span className={value ? "text-gray-900 font-medium" : "text-gray-400"}>{displayValue || placeholder}</span>
        <ChevronDown
          size={16}
          className={`ml-3 text-gray-400 transition-transform duration-200 ${open ? "rotate-180 text-purple-600" : "rotate-0"}`}
        />
      </div>
      {open && (
        <div className="absolute top-full z-50 mt-1.5 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3.5 py-2.5 bg-gray-50/50">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              className="h-7 w-full border-none text-xs text-gray-900 outline-none placeholder:text-gray-400 bg-transparent"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredGroups.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-gray-400">No matching results</p>
            )}
            {filteredGroups.map((group) => (
              <div key={group.group}>
                <p className="px-3.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {group.group}
                </p>
                {group.options.map((option) => {
                  const isSelected = value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`flex w-full items-center px-3.5 py-2 text-left text-xs transition ${
                        isSelected
                          ? "bg-purple-50 font-bold text-purple-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const UnitSelect = ({ label, placeholder, value, onChange, options = [], required = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((o) => o.toLowerCase().includes(term));
  }, [options, search]);

  const displayValue = value || "";

  return (
    <div className="relative flex w-full flex-col gap-1.5 text-sm" ref={containerRef}>
      <span className="text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <div
        className={`flex h-10 items-center justify-between rounded-xl border px-3.5 text-sm transition ${
          open ? "border-purple-500 ring-2 ring-purple-100" : "border-gray-200 hover:border-gray-300"
        } bg-white text-gray-900 cursor-pointer`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={value ? "text-gray-900 font-medium" : "text-gray-400"}>{displayValue || placeholder}</span>
        <ChevronDown
          size={16}
          className={`ml-3 text-gray-400 transition-transform duration-200 ${open ? "rotate-180 text-purple-600" : "rotate-0"}`}
        />
      </div>
      {open && (
        <div className="absolute top-full z-50 mt-1.5 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3.5 py-2.5 bg-gray-50/50">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim() && !filteredOptions.includes(search.trim())) {
                  e.preventDefault();
                  onChange(search.trim());
                  setOpen(false);
                  setSearch("");
                }
              }}
              placeholder="Select or type to add..."
              className="h-7 w-full border-none bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 && search.trim() ? (
              <div
                onClick={() => {
                  onChange(search.trim());
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center px-3.5 py-2.5 text-left text-xs cursor-pointer transition font-bold text-purple-600 hover:bg-purple-50"
              >
                + Add "{search.trim()}"
              </div>
            ) : filteredOptions.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">No matching results</p>
            ) : (
              <>
                {search.trim() && !filteredOptions.includes(search.trim()) && (
                  <div
                    onClick={() => {
                      onChange(search.trim());
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex w-full items-center px-3.5 py-2.5 text-left text-xs cursor-pointer transition font-bold text-purple-600 hover:bg-purple-50 border-b border-gray-100"
                  >
                    + Add "{search.trim()}"
                  </div>
                )}
                {filteredOptions.map((option) => {
                  const isSelected = value === option;
                  return (
                    <div
                      key={option}
                      onClick={() => {
                        onChange(option);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`flex w-full items-center px-3.5 py-2 text-left text-xs cursor-pointer transition ${
                        isSelected
                          ? "bg-purple-50 font-bold text-purple-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {option}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TaxRateSelect = ({ label, value, onChange, type }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  const taxRateOptions = type === "intra" 
    ? [
        "GST0 [0%]",
        "GST5 [5%]",
        "GST12 [12%]",
        "GST18 [18%]",
        "GST28 [28%]",
      ]
    : [
        "IGST0 [0%]",
        "IGST5 [5%]",
        "IGST12 [12%]",
        "IGST18 [18%]",
        "IGST28 [28%]",
      ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return taxRateOptions;
    }
    return taxRateOptions.filter((o) => o.toLowerCase().includes(term));
  }, [search, taxRateOptions]);

  const displayValue = value || "";

  return (
    <div className="relative flex w-full flex-col gap-1.5 text-sm" ref={containerRef}>
      <label className="text-xs font-semibold text-gray-700">
        {label}
      </label>
      <div
        className={`flex h-10 items-center justify-between rounded-xl border px-3.5 text-sm transition ${
          open ? "border-purple-500 ring-2 ring-purple-100" : "border-gray-200 hover:border-gray-300"
        } bg-white text-gray-900 cursor-pointer`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={value ? "text-gray-900 font-medium" : "text-gray-400"}>
          {displayValue || "Select tax rate"}
        </span>
        <ChevronDown
          size={16}
          className={`ml-3 text-gray-400 transition-transform duration-200 ${open ? "rotate-180 text-purple-600" : "rotate-0"}`}
        />
      </div>
      {open && (
        <div className="absolute top-full z-50 mt-1.5 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3.5 py-2.5 bg-gray-50/50">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tax rate..."
              className="h-7 w-full border-none bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">No matching results</p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value === option;
                return (
                  <div
                    key={option}
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`flex items-center justify-between px-3.5 py-2 text-xs cursor-pointer transition ${
                      isSelected
                        ? "bg-purple-50 font-bold text-purple-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{option}</span>
                    {isSelected && <Check size={14} className="text-purple-600" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ManufacturerSelect = ({ label, placeholder, value, onChange, options = [], onManageClick, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(term));
  }, [options, search]);

  const displayValue = value || "";

  return (
    <div className="relative flex w-full flex-col gap-1.5 text-sm" ref={containerRef}>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <div
        className={`flex h-10 items-center justify-between rounded-xl border px-3.5 text-sm transition ${
          open ? "border-purple-500 ring-2 ring-purple-100" : "border-gray-200 hover:border-gray-300"
        } ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white text-gray-900 cursor-pointer"}`}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
      >
        <span className={displayValue ? "text-gray-900 font-medium" : "text-gray-400"}>{displayValue || placeholder}</span>
        <ChevronDown
          size={16}
          className={`ml-3 text-gray-400 transition-transform duration-200 ${open ? "rotate-180 text-purple-600" : "rotate-0"}`}
        />
      </div>
      {open && (
        <div className="absolute top-full z-50 mt-1.5 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3.5 py-2.5 bg-gray-50/50">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search manufacturer..."
              className="h-7 w-full border-none bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">No matching results</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center px-3.5 py-2 text-left text-xs transition ${
                    value === option
                      ? "bg-purple-50 font-bold text-purple-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option}
                </button>
              ))
            )}
          </div>
          {onManageClick && (
            <div className="border-t border-gray-100 px-3.5 py-2 bg-gray-50/50">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageClick();
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 text-xs font-semibold text-purple-600 hover:text-purple-700 transition"
              >
                <Settings size={13} />
                Manage Manufacturers
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const BrandSelect = ({ label, placeholder, value, onChange, options = [], onManageClick, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(term));
  }, [options, search]);

  const displayValue = value || "";

  return (
    <div className="relative flex w-full flex-col gap-1.5 text-sm" ref={containerRef}>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <div
        className={`flex h-10 items-center justify-between rounded-xl border px-3.5 text-sm transition ${
          open ? "border-purple-500 ring-2 ring-purple-100" : "border-gray-200 hover:border-gray-300"
        } ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white text-gray-900 cursor-pointer"}`}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
      >
        <span className={displayValue ? "text-gray-900 font-medium" : "text-gray-400"}>{displayValue || placeholder}</span>
        <ChevronDown
          size={16}
          className={`ml-3 text-gray-400 transition-transform duration-200 ${open ? "rotate-180 text-purple-600" : "rotate-0"}`}
        />
      </div>
      {open && (
        <div className="absolute top-full z-50 mt-1.5 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3.5 py-2.5 bg-gray-50/50">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search brand..."
              className="h-7 w-full border-none bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">No matching results</p>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center px-3.5 py-2 text-left text-xs cursor-pointer transition ${
                    value === option
                      ? "bg-purple-50 font-bold text-purple-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option}
                </div>
              ))
            )}
          </div>
          {onManageClick && (
            <div className="border-t border-gray-100 px-3.5 py-2 bg-gray-50/50">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageClick();
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 text-xs font-semibold text-purple-600 hover:text-purple-700 transition"
              >
                <Settings size={13} />
                Manage Brands
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ManufacturerModal = ({ onClose, onAdd, newManufacturer, setNewManufacturer }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (newManufacturer.trim()) {
      onAdd(newManufacturer.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-gray-50/80 to-white">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Add Manufacturer</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              Manufacturer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newManufacturer}
              onChange={(e) => setNewManufacturer(e.target.value)}
              placeholder="Enter manufacturer name"
              className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition outline-none"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newManufacturer.trim()}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white transition hover:from-purple-700 hover:to-indigo-700 shadow-sm shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Manufacturer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BrandModal = ({ onClose, onAdd, newBrand, setNewBrand }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (newBrand.trim()) {
      onAdd(newBrand.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-gray-50/80 to-white">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Add Brand</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="Enter brand name"
              className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition outline-none"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newBrand.trim()}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white transition hover:from-purple-700 hover:to-indigo-700 shadow-sm shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Brand
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
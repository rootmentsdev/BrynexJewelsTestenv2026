import { useState, useEffect, useRef } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { X, ChevronDown, ArrowUp, Calendar, Search, Check, Plus, Pencil } from "lucide-react";
import ImageUpload from "../components/ImageUpload";
import Header from "../components/Header";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const Label = ({ children, required = false }) => (
  <span className={`text-[10px] font-bold uppercase tracking-wider ${required ? "text-[#EF4444]" : "text-[#6B7280]"}`}>
    {children}
    {required && <span className="ml-0.5">*</span>}
  </span>
);

const Input = ({ placeholder = "", className = "", ...props }) => {
  const baseClasses = "rounded-none border border-[#E5E7EB] bg-white text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#8B5CF6] focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/20 transition-colors";
  const tableInputClasses = "h-[34px] px-[10px] py-[6px]";
  const defaultClasses = "w-full h-9 px-3";

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

const Select = ({ className = "", ...props }) => {
  const baseClasses = "w-full rounded-none border border-[#E5E7EB] bg-white text-xs text-[#111827] focus:border-[#8B5CF6] focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/20 transition-colors cursor-pointer";
  const defaultClasses = "h-9 px-3";
  const finalClasses = `${baseClasses} ${defaultClasses} ${className}`;

  return (
    <select
      {...props}
      className={finalClasses}
    />
  );
};

// VendorDropdown Component
const VendorDropdown = ({ value, onChange, onNewVendor }) => {
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    const loadVendors = async () => {
      setLoading(true);
      try {
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.email || null;
        const userPower = user?.power || "";

        let vendorsFromAPI = [];

        if (userId) {
          try {
            const response = await fetch(`${API_URL}/api/purchase/vendors?userId=${encodeURIComponent(userId)}${userPower ? `&userPower=${encodeURIComponent(userPower)}` : ""}`);
            if (response.ok) {
              const data = await response.json();
              vendorsFromAPI = Array.isArray(data) ? data : [];
            }
          } catch (apiError) {
            console.warn("API fetch failed, trying localStorage:", apiError);
          }
        }

        let vendorsFromLocalStorage = [];
        try {
          const savedVendors = JSON.parse(localStorage.getItem("vendors") || "[]");
          vendorsFromLocalStorage = Array.isArray(savedVendors) ? savedVendors : [];
        } catch (localError) {
          console.warn("Error reading localStorage:", localError);
        }

        const vendorMap = new Map();
        vendorsFromAPI.forEach(vendor => {
          const key = vendor.displayName || vendor.companyName || vendor._id || vendor.id;
          if (key) vendorMap.set(key, vendor);
        });
        vendorsFromLocalStorage.forEach(vendor => {
          const key = vendor.displayName || vendor.companyName || vendor.id;
          if (key && !vendorMap.has(key)) vendorMap.set(key, vendor);
        });

        const allVendors = Array.from(vendorMap.values()).map(v => ({
          ...v,
          id: v.id || v._id || v.displayName || v.companyName,
        }));
        setVendors(allVendors);
      } catch (error) {
        console.error("Error loading vendors:", error);
        try {
          const savedVendors = JSON.parse(localStorage.getItem("vendors") || "[]");
          setVendors(Array.isArray(savedVendors) ? savedVendors : []);
        } catch {
          setVendors([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadVendors();
    
    const handleVendorSaved = () => {
      loadVendors();
    };
    
    const handleStorageChange = (e) => {
      if (e.key === "vendors") {
        loadVendors();
      }
    };
    
    window.addEventListener("vendorSaved", handleVendorSaved);
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("vendorSaved", handleVendorSaved);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [API_URL]);

  useEffect(() => {
    if (value) {
      if (typeof value === 'object' && value !== null) {
        setSelectedVendor(value);
      } else if (vendors.length > 0) {
        const vendor = vendors.find((v) => 
          v._id === value || 
          v.id === value || 
          v.displayName === value || 
          v.companyName === value
        );
        setSelectedVendor(vendor || null);
      }
    } else {
      setSelectedVendor(null);
    }
  }, [value, vendors]);

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 400),
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

  const filteredVendors = vendors.filter((vendor) => {
    const searchLower = searchTerm.toLowerCase();
    const displayName = (vendor.displayName || "").toLowerCase();
    const companyName = (vendor.companyName || "").toLowerCase();
    const email = (vendor.email || "").toLowerCase();
    return displayName.includes(searchLower) || companyName.includes(searchLower) || email.includes(searchLower);
  });

  const handleSelectVendor = (vendor) => {
    onChange(vendor);
    setIsOpen(false);
    setSearchTerm("");
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
      <div className="rounded-none shadow-xl bg-white border border-[#E5E7EB] w-full overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-3 py-2 bg-[#F9FAFB]">
          <Search size={13} className="text-[#9CA3AF] flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vendors..."
            className="h-8 w-full border-none bg-transparent text-xs text-[#111827] outline-none placeholder:text-[#9CA3AF]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="flex-shrink-0 text-[#9CA3AF] hover:text-[#6B7280]">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-6 text-center">
              <div className="inline-block h-4 w-4 animate-spin rounded-none border-2 border-[#8B5CF6] border-t-transparent mb-1" />
              <p className="text-xs text-[#6B7280]">Loading vendors...</p>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs font-medium text-[#6B7280]">
                {searchTerm ? `No vendors matching "${searchTerm}"` : "No vendors found. Add one below."}
              </p>
            </div>
          ) : (
            filteredVendors.map((vendor) => (
              <div
                key={vendor._id || vendor.id || vendor.displayName}
                onClick={() => handleSelectVendor(vendor)}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-[#F3F4F6] last:border-0 ${
                  selectedVendor && (selectedVendor._id === vendor._id || selectedVendor.id === vendor.id)
                    ? "bg-[#F5F3FF]"
                    : "hover:bg-[#FAFAFA]"
                }`}
              >
                <div className="w-7 h-7 rounded-none bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-[#7C3AED]">
                    {(vendor.displayName || vendor.companyName || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#111827] truncate">
                    {vendor.displayName || vendor.companyName || "Unnamed Vendor"}
                  </p>
                  {vendor.email && (
                    <p className="text-[10px] text-[#6B7280] truncate">{vendor.email}</p>
                  )}
                </div>
                {selectedVendor && (selectedVendor._id === vendor._id || selectedVendor.id === vendor.id) && (
                  <Check size={13} className="text-[#8B5CF6] shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
        <div
          onClick={() => { onNewVendor(); setIsOpen(false); }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#8B5CF6] hover:bg-[#F5F3FF] cursor-pointer transition-colors border-t border-[#E5E7EB]"
        >
          <Plus size={13} />
          <span>Add New Vendor</span>
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
          className={`flex items-center justify-between w-full h-9 px-3 rounded-none border cursor-pointer transition-colors ${
            isOpen ? "border-[#8B5CF6] ring-1 ring-[#8B5CF6]/20" : "border-[#E5E7EB] hover:border-[#9CA3AF]"
          } bg-white`}
        >
          <span className={`text-xs truncate ${selectedVendor ? "text-[#111827] font-medium" : "text-[#9CA3AF]"}`}>
            {selectedVendor
              ? (selectedVendor.displayName || selectedVendor.companyName)
              : "Click to select a vendor..."}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {selectedVendor && (
              <button
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
                className="p-0.5 text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
              >
                <X size={12} />
              </button>
            )}
            <ChevronDown size={13} className={`text-[#9CA3AF] transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </div>
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

const PurchaseReceiveCreate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const isSidebarOpen = useSidebar();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  // Initial form state - only show first 2 fields
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderData, setSelectedOrderData] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  
  // Rest of the form fields (shown after first 2 are filled)
  const [purchaseReceiveNumber, setPurchaseReceiveNumber] = useState("");
  
  // Get today's date in DD/MM/YYYY format
  const getTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  // Helper functions for date conversion
  const formatDateForInput = (ddmmyyyy) => {
    if (!ddmmyyyy) return '';
    const parts = ddmmyyyy.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert DD/MM/YYYY to YYYY-MM-DD
    }
    return '';
  };
  
  const formatDateForDisplay = (yyyymmdd) => {
    if (!yyyymmdd) return '';
    const parts = yyyymmdd.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // Convert YYYY-MM-DD to DD/MM/YYYY
    }
    return '';
  };
  
  const [receivedDate, setReceivedDate] = useState(getTodayDate());
  const dateInputRef = useRef(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [pendingPurchaseOrderId, setPendingPurchaseOrderId] = useState(null); // Store PO ID to select after orders load
  const [loadingNextNumber, setLoadingNextNumber] = useState(false);
  const [attachments, setAttachments] = useState([]);
  
  // Check if both initial fields are filled (or if in edit mode, always show form)
  const showRestOfForm = selectedVendor && purchaseOrder;

  // Fetch purchase orders from API
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      if (!selectedVendor) {
        setPurchaseOrders([]);
        return;
      }

      setLoadingOrders(true);
      try {
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        // Use email as primary identifier (e.g., officerootments@gmail.com)
        const userId = user?.email || user?._id || user?.id || user?.locCode || null;
        const locCode = user?.locCode || "";

        if (!userId) {
          setPurchaseOrders([]);
          setLoadingOrders(false);
          return;
        }

        const userPower = user?.power || "";
        const response = await fetch(`${API_URL}/api/purchase/orders?userId=${encodeURIComponent(userId)}${userPower ? `&userPower=${encodeURIComponent(userPower)}` : ""}`);
        if (response.ok) {
          const data = await response.json();
          const orders = Array.isArray(data) ? data : [];
          
          // Filter orders by selected vendor
          const vendorId = selectedVendor._id || selectedVendor.id;
          const vendorName = selectedVendor.displayName || selectedVendor.companyName;
          
          const filteredOrders = orders.filter(order => {
            const orderVendorId = order.vendorId?._id || order.vendorId || order.vendorId?.toString();
            const orderVendorName = order.vendorName || "";
            
            return (
              orderVendorId === vendorId ||
              orderVendorId === vendorId?.toString() ||
              orderVendorName === vendorName
            );
          });
          
          setPurchaseOrders(filteredOrders);
          
          // If we have a pending purchase order ID to select (from edit mode), select it now
          if (pendingPurchaseOrderId && filteredOrders.length > 0) {
            const pendingIdStr = pendingPurchaseOrderId.toString();
            let orderToSelect = null;
            
            // First try to match by ID
            orderToSelect = filteredOrders.find(order => {
              const orderId = (order._id?.toString() || order.id?.toString() || order._id || order.id || "").toString();
              return orderId === pendingIdStr;
            });
            
            // If not found by ID, try to match by order number (in case we only have the number)
            if (!orderToSelect) {
              orderToSelect = filteredOrders.find(order => {
                const orderNumber = order.orderNumber || "";
                return orderNumber === pendingIdStr || orderNumber === pendingPurchaseOrderId;
              });
            }
            
            if (orderToSelect) {
              const orderId = (orderToSelect._id?.toString() || orderToSelect.id?.toString() || orderToSelect._id || orderToSelect.id || "").toString();
              console.log("✅ Auto-selecting purchase order in edit mode:", {
                selectedOrderId: orderId,
                selectedOrderNumber: orderToSelect.orderNumber,
                fromPending: pendingPurchaseOrderId,
                allOrders: filteredOrders.map(o => ({ id: o._id || o.id, number: o.orderNumber }))
              });
              setPurchaseOrder(orderId);
              setPendingPurchaseOrderId(null); // Clear pending ID
            } else {
              console.warn("❌ Could not find purchase order to select:", {
                pendingId: pendingPurchaseOrderId,
                availableOrders: filteredOrders.map(o => ({ id: o._id || o.id, number: o.orderNumber }))
              });
            }
          }
        } else {
          setPurchaseOrders([]);
        }
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
        setPurchaseOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchPurchaseOrders();

    // Listen for order saved events
    const handleOrderSaved = () => {
      fetchPurchaseOrders();
    };

    window.addEventListener("orderSaved", handleOrderSaved);

    return () => {
      window.removeEventListener("orderSaved", handleOrderSaved);
    };
  }, [selectedVendor, API_URL]);

  // Clear purchase order selection when vendor changes (only for new receives, not in edit mode)
  useEffect(() => {
    // In edit mode, don't clear the purchase order when vendor is set (it's the same vendor)
    if (!isEditMode && selectedVendor) {
      // Only clear if we don't have a pending purchase order ID (which means we're setting up for edit)
      if (!pendingPurchaseOrderId) {
        setPurchaseOrder("");
        setSelectedOrderData(null);
        setOrderItems([]);
      }
    }
  }, [selectedVendor, isEditMode, pendingPurchaseOrderId]);

  // Fetch purchase order details when a purchase order is selected
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!purchaseOrder) {
        setSelectedOrderData(null);
        setOrderItems([]);
        return;
      }

      setLoadingOrderDetails(true);
      try {
        const response = await fetch(`${API_URL}/api/purchase/orders/${purchaseOrder}`);
        if (response.ok) {
          const orderData = await response.json();
          setSelectedOrderData(orderData);
          
          // Map order items to receive items format (only if items not already loaded in edit mode)
          if (orderData.items && orderData.items.length > 0) {
            // In edit mode, only set items if they're not already loaded
            if (isEditMode && orderItems.length > 0) {
              // Preserve existing items, just update the order data reference
              console.log("Edit mode: preserving existing receive items");
            } else {
              const items = orderData.items.map((item, index) => {
                // Handle itemId - could be ObjectId string or populated object
                const itemIdValue = item.itemId?._id || item.itemId || null;
                return {
                  id: index + 1,
                  itemId: itemIdValue,
                  itemName: item.itemName || "",
                  itemSku: item.itemSku || item.sku || "", // Include SKU for better matching
                  itemDescription: item.itemDescription || "",
                  ordered: item.quantity || 0,
                  received: 0,
                  inTransit: 0,
                  quantityToReceive: item.quantity || 0,
                  // Include itemGroupId if available (for items from groups)
                  itemGroupId: item.itemGroupId || null,
                };
              });
              console.log("Mapped order items for receive:", items);
              setOrderItems(items);
            }
          } else if (!isEditMode) {
            // Only clear items if not in edit mode
            setOrderItems([]);
          }
        } else {
          setSelectedOrderData(null);
          setOrderItems([]);
        }
      } catch (error) {
        console.error("Error fetching purchase order details:", error);
        setSelectedOrderData(null);
        setOrderItems([]);
      } finally {
        setLoadingOrderDetails(false);
      }
    };

    fetchOrderDetails();
  }, [purchaseOrder, API_URL]);

  // Auto-select purchase order when orders list loads (for edit mode)
  useEffect(() => {
    if (pendingPurchaseOrderId && purchaseOrders.length > 0) {
      // Check if the current purchaseOrder matches the pending one
      const currentOrderId = purchaseOrder?.toString() || "";
      const pendingIdStr = pendingPurchaseOrderId.toString();
      
      // If already set correctly, clear pending
      if (currentOrderId === pendingIdStr) {
        setPendingPurchaseOrderId(null);
        return;
      }
      
      // Try to find and select the order
      let orderToSelect = null;
      
      // Try to match by ID
      orderToSelect = purchaseOrders.find(order => {
        const orderId = (order._id?.toString() || order.id?.toString() || order._id || order.id || "").toString();
        return orderId === pendingIdStr;
      });
      
      // If not found by ID, try to match by order number
      if (!orderToSelect) {
        orderToSelect = purchaseOrders.find(order => {
          return order.orderNumber === pendingIdStr || order.orderNumber === pendingPurchaseOrderId;
        });
      }
      
      if (orderToSelect) {
        const orderId = (orderToSelect._id?.toString() || orderToSelect.id?.toString() || orderToSelect._id || orderToSelect.id || "").toString();
        console.log("✅ Auto-selecting purchase order after orders loaded:", {
          selectedOrderId: orderId,
          selectedOrderNumber: orderToSelect.orderNumber,
          fromPending: pendingPurchaseOrderId
        });
        setPurchaseOrder(orderId);
        setPendingPurchaseOrderId(null);
      } else {
        console.warn("❌ Could not find purchase order after orders loaded:", {
          pendingId: pendingPurchaseOrderId,
          availableOrders: purchaseOrders.map(o => ({ id: o._id || o.id, number: o.orderNumber }))
        });
      }
    }
  }, [purchaseOrders, pendingPurchaseOrderId, purchaseOrder]);

  // Handle item quantity changes
  const handleItemChange = (itemId, field, value) => {
    setOrderItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item };
          const numValue = value === "" || value === null || value === undefined ? 0 : parseFloat(value) || 0;
          updatedItem[field] = numValue;
          
          // Auto-calculate quantityToReceive when received or inTransit changes
          if (field === "received" || field === "inTransit") {
            const received = field === "received" ? numValue : (updatedItem.received || 0);
            const inTransit = field === "inTransit" ? numValue : (updatedItem.inTransit || 0);
            const ordered = updatedItem.ordered || 0;
            updatedItem.quantityToReceive = Math.max(0, ordered - received - inTransit);
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Handle date picker icon click
  const handleCalendarIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dateInputRef.current) {
      const input = dateInputRef.current;
      
      // The input is now positioned over the icon, so clicking the icon area will trigger the date picker
      // Try showPicker if available (modern browsers - Chrome/Edge)
      if (typeof input.showPicker === 'function') {
        input.showPicker().catch(() => {
          // If showPicker fails, use click method
          input.click();
        });
      } else {
        // For browsers without showPicker, use click directly
        input.focus();
        input.click();
      }
    }
  };

  // Handle date change from date input
  const handleDateInputChange = (e) => {
    const yyyymmdd = e.target.value;
    if (yyyymmdd) {
      setReceivedDate(formatDateForDisplay(yyyymmdd));
    }
  };

  // Fetch next receive number when creating a new receive (not in edit mode)
  useEffect(() => {
    if (!isEditMode) {
      // Only fetch if we don't already have a number
      if (purchaseReceiveNumber) {
        return;
      }
      
      const fetchNextNumber = async () => {
        setLoadingNextNumber(true);
        try {
          const response = await fetch(`${API_URL}/api/purchase/receives/next-number`);
          if (response.ok) {
            const data = await response.json();
            if (data.receiveNumber) {
              setPurchaseReceiveNumber(data.receiveNumber);
              console.log("✅ Auto-generated receive number:", data.receiveNumber);
            } else {
              console.warn("⚠️ No receive number in response:", data);
            }
          } else {
            const errorText = await response.text();
            console.error("❌ Failed to fetch next receive number:", response.status, errorText);
            // Backend will auto-generate it when saving
          }
        } catch (error) {
          console.error("❌ Error fetching next receive number:", error);
          // If fetching fails, backend will auto-generate it anyway
        } finally {
          setLoadingNextNumber(false);
        }
      };
      fetchNextNumber();
    }
  }, [isEditMode, API_URL]); // Only depend on isEditMode and API_URL

  // Load purchase receive data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchReceive = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/api/purchase/receives/${id}`);
          if (!response.ok) {
            throw new Error("Failed to fetch purchase receive for editing");
          }
          const receiveData = await response.json();
          
          // Set vendor
          if (receiveData.vendorId || receiveData.vendorName) {
            const vendorObj = {
              id: receiveData.vendorId || null,
              _id: receiveData.vendorId || null,
              displayName: receiveData.vendorName || "",
              companyName: receiveData.vendorName || "",
            };
            setSelectedVendor(vendorObj);
          }
          
          // Set purchase order - store it to be selected once orders list loads
          if (receiveData.purchaseOrderId || receiveData.purchaseOrderNumber) {
            // Handle both populated and non-populated purchaseOrderId
            let poId = null;
            let poNumber = null;
            
            if (receiveData.purchaseOrderId) {
              if (typeof receiveData.purchaseOrderId === 'object' && receiveData.purchaseOrderId._id) {
                // Populated ObjectId - get both ID and order number
                poId = receiveData.purchaseOrderId._id.toString();
                poNumber = receiveData.purchaseOrderId.orderNumber || receiveData.purchaseOrderNumber;
              } else {
                // String or ObjectId - convert to string
                poId = receiveData.purchaseOrderId.toString();
                poNumber = receiveData.purchaseOrderNumber;
              }
            } else if (receiveData.purchaseOrderNumber) {
              // If we only have the order number, store it to search later
              poNumber = receiveData.purchaseOrderNumber;
            }
            
            console.log("Edit mode - Purchase Order Info:", {
              purchaseOrderId: receiveData.purchaseOrderId,
              purchaseOrderNumber: receiveData.purchaseOrderNumber,
              extractedId: poId,
              extractedNumber: poNumber,
              fullReceiveData: receiveData
            });
            
            // Store both ID and number for matching
            if (poId) {
              setPendingPurchaseOrderId(poId);
              setPurchaseOrder(poId.toString());
            } else if (poNumber) {
              // If no ID, use order number as fallback
              setPendingPurchaseOrderId(poNumber);
            }
          }
          
          // Set receive number
          if (receiveData.receiveNumber) {
            setPurchaseReceiveNumber(receiveData.receiveNumber);
          }
          
          // Set date
          if (receiveData.receivedDate) {
            const date = new Date(receiveData.receivedDate);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            setReceivedDate(`${day}/${month}/${year}`);
          }
          
          // Set notes
          if (receiveData.notes) {
            setNotes(receiveData.notes);
          }
          
          // Set items (will be set when purchase order is loaded, or use existing items from receive)
          if (receiveData.items && receiveData.items.length > 0 && orderItems.length === 0) {
            const items = receiveData.items.map((item, index) => {
              const itemIdValue = item.itemId?._id || item.itemId || null;
              return {
                id: index + 1,
                itemId: itemIdValue,
                itemName: item.itemName || "",
                itemSku: item.itemSku || item.sku || "", // Include SKU for better matching
                itemDescription: item.itemDescription || "",
                ordered: parseFloat(item.ordered) || 0,
                received: parseFloat(item.received) || 0,
                inTransit: parseFloat(item.inTransit) || 0,
                quantityToReceive: parseFloat(item.quantityToReceive) || 0,
                // Include itemGroupId if available (for items from groups)
                itemGroupId: item.itemGroupId || null,
              };
            });
            setOrderItems(items);
          }
        } catch (error) {
          console.error("Error fetching purchase receive for edit:", error);
          alert("Failed to load purchase receive for editing.");
          navigate("/purchase/receives");
        } finally {
          setLoading(false);
        }
      };
      
      fetchReceive();
    }
  }, [id, isEditMode, navigate, API_URL]);

  // Save purchase receive to MongoDB
  const handleSavePurchaseReceive = async (status) => {
    // Validate required fields
    if (!purchaseOrder || !selectedVendor || !receivedDate) {
      alert("Please fill in all required fields: Purchase Order, Vendor, and Received Date");
      return;
    }

    // Receive number will be auto-generated by backend if not provided
    // No need to validate it here

    if (orderItems.length === 0) {
      alert("No items to receive. Please select a purchase order with items.");
      return;
    }

    setSaving(true);
    try {
      // Get user info
      const userStr = localStorage.getItem("rootfinuser");
      const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.email || null;
      const locCode = user?.locCode || "";

      if (!userId) {
        alert("User not logged in. Please log in to save purchase receives.");
        setSaving(false);
        return;
      }

      // Convert date from dd/MM/yyyy to Date object
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        return new Date(dateStr);
      };

      const receivedDateObj = parseDate(receivedDate);

      // Prepare items array - ensure all fields are preserved
      const items = orderItems.map(item => {
        // Handle itemId - could be ObjectId string or populated object
        const itemIdValue = item.itemId?._id || item.itemId || null;
        
        // Ensure received is a valid number (not null, undefined, or empty string)
        let receivedQty = 0;
        if (item.received !== null && item.received !== undefined && item.received !== "") {
          receivedQty = parseFloat(item.received);
          if (isNaN(receivedQty)) {
            receivedQty = 0;
          }
        }
        
        const itemGroupId = item.itemGroupId || null;
        const itemSku = item.itemSku || item.sku || "";
        const itemName = item.itemName || "";
        
        console.log(`Preparing receive item - itemId: ${itemIdValue}, itemName: ${itemName}, itemSku: ${itemSku}, itemGroupId: ${itemGroupId}, received: ${receivedQty}, original received value: ${item.received}`);
        
        // Always include all items - backend will handle validation
        // Don't filter out items here, as the backend needs to see all items to properly update stock
        
        return {
          itemId: itemIdValue,
          itemName: itemName,
          itemSku: itemSku, // Include SKU for better matching
          itemDescription: item.itemDescription || "",
          ordered: parseFloat(item.ordered) || 0,
          received: receivedQty,
          inTransit: parseFloat(item.inTransit) || 0,
          quantityToReceive: parseFloat(item.quantityToReceive) || 0,
          // Include itemGroupId if available (for items from groups)
          itemGroupId: itemGroupId,
        };
      });
      
      console.log("Items being saved to purchase receive:", items);
      console.log(`Total items: ${items.length}, Items with received > 0: ${items.filter(i => i.received > 0).length}`);
      console.log("Items breakdown:", items.map(i => ({ 
        itemName: i.itemName, 
        received: i.received, 
        itemId: i.itemId, 
        itemGroupId: i.itemGroupId,
        itemSku: i.itemSku 
      })));

      // Prepare purchase receive data
      const receiveData = {
        purchaseOrderId: purchaseOrder,
        purchaseOrderNumber: selectedOrderData?.orderNumber || "",
        vendorId: selectedVendor._id || selectedVendor.id || null,
        vendorName: selectedVendor.displayName || selectedVendor.companyName || "",
        receiveNumber: purchaseReceiveNumber || "", // Backend will auto-generate if empty
        receivedDate: receivedDateObj,
        items: items,
        notes: notes || "",
        attachments: attachments.map(att => {
          // Extract base64 data - handle both data URL format and plain base64
          let base64Data = att.base64 || att;
          if (typeof base64Data === "string" && base64Data.startsWith("data:")) {
            // Extract the base64 part from data URL (after the comma)
            base64Data = base64Data.split(",")[1] || base64Data;
          }
          return {
            filename: att.name || "attachment",
            contentType: att.type || "application/octet-stream",
            data: base64Data,
          };
        }),
        userId: userId,
        locCode: locCode,
        status: status, // "draft" or "received"
      };

      console.log(`📦 Saving purchase receive with status: "${status}"`);
      console.log(`📦 Receive data:`, { 
        status: receiveData.status, 
        locCode: receiveData.locCode, 
        itemsCount: receiveData.items.length,
        items: receiveData.items.map(i => ({ name: i.itemName, received: i.received, itemId: i.itemId, itemGroupId: i.itemGroupId }))
      });

      // Save to MongoDB
      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode ? `${API_URL}/api/purchase/receives/${id}` : `${API_URL}/api/purchase/receives`;
      console.log(`${isEditMode ? "Updating" : "Saving"} purchase receive to MongoDB:`, receiveData.receiveNumber, "userId:", userId);
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(receiveData),
      });

      if (!response.ok) {
        let errorMessage = "Failed to save purchase receive";
        let existingReceive = null;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          existingReceive = errorData.existingReceive;
          
          // If receive already exists, navigate to it instead of showing error (only for create mode)
          if (!isEditMode && response.status === 409 && existingReceive && existingReceive._id) {
            alert(`Purchase Receive ${receiveData.receiveNumber} already exists. Redirecting to existing receive...`);
            navigate(`/purchase/receives/${existingReceive._id}`);
            setSaving(false);
            return;
          }
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        console.error("Failed to save purchase receive:", errorMessage);
        throw new Error(errorMessage);
      }

      const savedReceive = await response.json();
      console.log(`Purchase receive ${isEditMode ? "updated" : "saved"} successfully to MongoDB:`, savedReceive._id);
      console.log(`Stock update summary:`, savedReceive.stockUpdateSummary);
      
      // Dispatch custom event to notify other components (including items page)
      window.dispatchEvent(new Event("receiveSaved"));
      
      // If status is "received", also dispatch event to refresh item stock
      if (status === "received") {
        const updatedItems = items.filter(i => (i.itemId || i.itemGroupId || i.itemName) && i.received > 0);
        const itemIds = updatedItems.map(i => i.itemId?._id || i.itemId).filter(Boolean);
        
        // Include itemGroupId and itemName for group items
        const updatedItemsWithGroupInfo = updatedItems.map(i => ({
          ...i,
          itemGroupId: i.itemGroupId || i.itemGroupIdValue,
          itemName: i.itemName || i.name,
          itemSku: i.itemSku || i.sku,
          itemId: i.itemId?._id || i.itemId || i.itemIdValue
        }));
        
        console.log("Dispatching stockUpdated event", { updatedItems: updatedItemsWithGroupInfo, itemIds });
        window.dispatchEvent(new CustomEvent("stockUpdated", { 
          detail: { 
            items: updatedItemsWithGroupInfo,
            itemIds: itemIds // Also send itemIds array for easier matching
          }
        }));
      }
      
      // Show detailed alert with stock update information
      let alertMessage = `Purchase Receive ${isEditMode ? "updated" : "saved"} successfully as ${status === "draft" ? "Draft" : "Received"}.`;
      if (status === "received" && savedReceive.stockUpdateSummary) {
        const summary = savedReceive.stockUpdateSummary;
        if (summary.status === 'completed') {
          alertMessage += `\n\nStock Update: ${summary.processed} item(s) updated in "${summary.warehouse}"`;
          if (summary.skipped > 0) {
            alertMessage += `\n${summary.skipped} item(s) skipped`;
          }
        } else {
          alertMessage += `\n\nStock Update: ${summary.reason || 'Not updated'}`;
        }
      }
      
      alert(alertMessage);
      navigate(`/purchase/receives/${savedReceive._id}`);
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "saving"} purchase receive:`, error);
      alert(error.message || `Failed to ${isEditMode ? "update" : "save"} purchase receive. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  // Enter key to save purchase receive
  useEnterToSave(() => handleSavePurchaseReceive("received"), saving);

  // Show loading state while fetching receive data in edit mode
  if (loading && isEditMode) {
    return (
      <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="text-center text-[#64748b]">Loading purchase receive...</div>
      </div>
    );
  }

  return (
    <>
      <Header title={isEditMode ? "Edit Purchase Receive" : "New Purchase Receive"} />
      <div className={`transition-all duration-300 min-h-screen bg-slate-50 flex flex-col ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>

        {/* Form Content */}
        <div className="mx-auto max-w-4xl w-full px-6 py-8">
          <div className="space-y-6">
            {/* Initial Fields - Always Visible */}
            <div className="bg-white rounded-none border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-5 pb-3 border-b border-[#E5E7EB]">Receive Details</h2>
              <div className="grid gap-6 md:grid-cols-2">
            {/* Vendor Name */}
            <div className="space-y-2">
              <Label>Vendor Name</Label>
              <VendorDropdown
                value={selectedVendor}
                onChange={(vendor) => setSelectedVendor(vendor)}
                onNewVendor={() => navigate("/purchase/vendors/new")}
              />
            </div>

            {/* Purchase Order# */}
            <div className="space-y-2">
              <Label required>Purchase Order#</Label>
              <div className="relative">
                <Select
                  value={purchaseOrder}
                  onChange={(e) => setPurchaseOrder(e.target.value)}
                  disabled={!selectedVendor || loadingOrders}
                >
                  <option value="">
                    {loadingOrders 
                      ? "Loading purchase orders..." 
                      : !selectedVendor 
                        ? "Select a vendor first" 
                        : purchaseOrders.length === 0 
                          ? "No purchase orders found for this vendor"
                          : "Select a Purchase Order"}
                  </option>
                  {purchaseOrders.map((order) => {
                    const formatDate = (date) => {
                      if (!date) return "";
                      const d = new Date(date);
                      const day = String(d.getDate()).padStart(2, "0");
                      const month = String(d.getMonth() + 1).padStart(2, "0");
                      const year = d.getFullYear();
                      return `${day}/${month}/${year}`;
                    };
                    
                    const orderDate = formatDate(order.date);
                    const displayText = orderDate 
                      ? `${order.orderNumber} - ${orderDate}` 
                      : order.orderNumber;
                    
                    return (
                      <option key={order._id || order.id} value={order._id || order.id}>
                        {displayText}
                      </option>
                    );
                  })}
                </Select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown size={16} className="text-[#9ca3af]" />
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Details Section - Show when vendor is selected */}
          {selectedVendor && (
            <div className="space-y-4 border-t border-[#e6eafb] pt-6">
              {/* Billing Address */}
              {(selectedVendor.billingAddress || selectedVendor.billingCity || selectedVendor.billingState) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>BILLING ADDRESS</Label>
                    <span
                      onClick={() => {
                        const vendorId = selectedVendor._id || selectedVendor.id;
                        if (vendorId) {
                          navigate(`/purchase/vendors/${vendorId}/edit`);
                        }
                      }}
                      className="cursor-pointer text-[#64748b] hover:text-[#1f2937] transition-colors"
                      title="Edit billing address"
                    >
                      <Pencil size={14} />
                    </span>
                  </div>
                  <div className="rounded-lg border border-[#d7dcf5] bg-[#fafbff] p-4 text-sm leading-relaxed text-[#1f2937]">
                    {selectedVendor.billingAttention && (
                      <div className="font-semibold mb-1">{selectedVendor.billingAttention}</div>
                    )}
                    {selectedVendor.billingAddress && <div>{selectedVendor.billingAddress}</div>}
                    {selectedVendor.billingAddress2 && <div>{selectedVendor.billingAddress2}</div>}
                    {(selectedVendor.billingCity || selectedVendor.billingState || selectedVendor.billingPinCode) && (
                      <div>
                        {[selectedVendor.billingCity, selectedVendor.billingState, selectedVendor.billingPinCode]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                    {selectedVendor.billingCountry && <div>{selectedVendor.billingCountry}</div>}
                    {selectedVendor.billingPhone && <div>Phone: {selectedVendor.billingPhone}</div>}
                  </div>
                </div>
              )}
              
              {/* GST Details */}
              <div className="grid gap-4 md:grid-cols-2">
                {selectedVendor.gstTreatment && (
                  <div className="flex items-center justify-between">
                    <Label>GST Treatment:</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#1f2937]">{selectedVendor.gstTreatment}</span>
                      <span
                        onClick={() => {
                          const vendorId = selectedVendor._id || selectedVendor.id;
                          if (vendorId) {
                            navigate(`/purchase/vendors/${vendorId}/edit`);
                          }
                        }}
                        className="cursor-pointer text-[#64748b] hover:text-[#1f2937] transition-colors"
                        title="Edit GST treatment"
                      >
                        <Pencil size={14} />
                      </span>
                    </div>
                  </div>
                )}
                {selectedVendor.gstin && (
                  <div className="flex items-center justify-between">
                    <Label>GSTIN:</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#1f2937]">{selectedVendor.gstin}</span>
                      <span
                        onClick={() => {
                          const vendorId = selectedVendor._id || selectedVendor.id;
                          if (vendorId) {
                            navigate(`/purchase/vendors/${vendorId}/edit`);
                          }
                        }}
                        className="cursor-pointer text-[#64748b] hover:text-[#1f2937] transition-colors"
                        title="Edit GSTIN"
                      >
                        <Pencil size={14} />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rest of Form - Conditionally Rendered */}
          {showRestOfForm && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Purchase Receive# */}
                <div className="space-y-2">
                  <Label required>Purchase Receive#</Label>
                  <div className="relative">
                    <Input
                      value={loadingNextNumber ? "Generating..." : purchaseReceiveNumber || ""}
                      onChange={(e) => {
                        if (!isEditMode && !loadingNextNumber) {
                          setPurchaseReceiveNumber(e.target.value);
                        }
                      }}
                      placeholder={loadingNextNumber ? "Generating..." : "Will be auto-generated"}
                      readOnly={isEditMode || loadingNextNumber}
                      className={(isEditMode || loadingNextNumber) ? "bg-[#f5f7fb] cursor-not-allowed" : ""}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 rounded border border-[#d7dcf5] bg-[#f5f7fb] flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-[#9ca3af]"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Received Date */}
                <div className="space-y-2">
                  <Label required>Received Date</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={receivedDate}
                      onChange={(e) => setReceivedDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                    />
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={formatDateForInput(receivedDate)}
                      onChange={handleDateInputChange}
                      style={{ 
                        position: 'absolute',
                        width: '20px',
                        height: '20px',
                        opacity: 0,
                        cursor: 'pointer',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 2
                      }}
                      tabIndex={-1}
                    />
                    <span
                      onClick={handleCalendarIconClick}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#64748b] hover:text-[#1f2937] transition-colors flex items-center justify-center"
                      aria-label="Open date picker"
                      style={{ zIndex: 1 }}
                    >
                      <Calendar size={16} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Items & Description Table */}
              <div className="space-y-3">
                <Label>ITEMS & DESCRIPTION</Label>
                <div className="rounded-xl border border-[#e6eafb] bg-white overflow-hidden">
                  <table className="min-w-full divide-y divide-[#e6eafb]">
                    <thead className="bg-[#f9fafb]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
                          ITEMS & DESCRIPTION
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
                          ORDERED
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
                          RECEIVED
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
                          IN TRANSIT
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
                          QUANTITY TO RECEIVE
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e6eafb] bg-white">
                      {loadingOrderDetails ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-sm text-[#64748b]">
                            Loading items from purchase order...
                          </td>
                        </tr>
                      ) : orderItems.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-sm text-[#64748b]">
                            {purchaseOrder 
                              ? "No items found in this purchase order" 
                              : "Items will be loaded from the selected Purchase Order"}
                          </td>
                        </tr>
                      ) : (
                        orderItems.map((item) => (
                          <tr key={item.id} className="hover:bg-[#f9fafb]">
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-[#1f2937]">
                                  {item.itemName || "Unnamed Item"}
                                </div>
                                {item.itemDescription && (
                                  <div className="text-xs text-[#64748b] mt-1">
                                    {item.itemDescription}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-[#1f2937]">
                              {item.ordered.toFixed(2)} pcs
                            </td>
                            <td className="px-6 py-4">
                              <Input
                                type="number"
                                value={item.received || ""}
                                onChange={(e) => handleItemChange(item.id, "received", e.target.value)}
                                className="w-24 table-input"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <Input
                                type="number"
                                value={item.inTransit || ""}
                                onChange={(e) => handleItemChange(item.id, "inTransit", e.target.value)}
                                className="w-24 table-input"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <Input
                                type="number"
                                value={item.quantityToReceive || ""}
                                onChange={(e) => handleItemChange(item.id, "quantityToReceive", e.target.value)}
                                className="w-24 table-input"
                                min="0"
                                step="0.01"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-2">
                <Label>Notes (For Internal Use)</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-[#d7dcf5] bg-white px-3 py-2.5 text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors resize-y"
                  placeholder="Add internal notes..."
                />
              </div>

              {/* File Attachment Section */}
              <div className="space-y-3">
                <Label>Attach File(s) to Purchase Receive</Label>
                <ImageUpload
                  onImagesSelect={(files) => setAttachments(files)}
                  existingImages={attachments}
                  onRemoveImage={(index) => {
                    setAttachments(attachments.filter((_, i) => i !== index));
                  }}
                  multiple={true}
                />
                <p className="text-xs text-[#64748b]">
                  You can upload a maximum of 15 files, 5MB each
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-[#e7ebf8] bg-[#fafbff] px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          {showRestOfForm ? (
            <>
              <button 
                onClick={() => handleSavePurchaseReceive("draft")}
                disabled={saving}
                className="rounded-md border border-[#d7dcf5] bg-white px-5 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (isEditMode ? "Updating..." : "Saving...") : (isEditMode ? "Update Draft" : "Save as Draft")}
              </button>
              <button 
                onClick={() => handleSavePurchaseReceive("received")}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md border border-[#d7dcf5] bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{saving ? (isEditMode ? "Updating..." : "Saving...") : (isEditMode ? "Update as Received" : "Save as Received")}</span>
                <ChevronDown size={16} />
              </button>
              <Link
                to={isEditMode ? `/purchase/receives/${id}` : "/purchase/receives"}
                className="rounded-md border border-[#d7dcf5] bg-white px-5 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
              >
                Cancel
              </Link>
            </>
          ) : (
            <Link
              to="/purchase/receives"
              className="rounded-md border border-[#d7dcf5] bg-white px-5 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
            >
              Cancel
            </Link>
          )}
        </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default PurchaseReceiveCreate;

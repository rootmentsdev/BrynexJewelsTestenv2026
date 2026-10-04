import { useState, useEffect, useRef } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import Head from "../components/Head";
import ImageUpload from "../components/ImageUpload";
import { X, Pencil, Trash2, Plus, Settings, Search, Check, ChevronDown, Image as ImageIcon } from "lucide-react";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const Label = ({ children, required = false }) => (
  <span className="block text-xs font-semibold text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </span>
);

const Input = ({ placeholder = "", className = "", ...props }) => {
  const baseClasses = "w-full rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 hover:border-gray-300 focus:border-[#9333ea] focus:outline-none transition-colors";
  const tableInputClasses = "h-[42px] px-3";
  const defaultClasses = "h-[42px] px-3.5";
  
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
  const baseClasses = "w-full rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-300 focus:border-[#9333ea] focus:outline-none transition-colors cursor-pointer";
  const tableInputClasses = "h-[42px] px-3";
  const defaultClasses = "h-[42px] px-3.5";
  
  const isTableInput = className.includes("table-input");
  const finalClasses = `${baseClasses} ${isTableInput ? tableInputClasses : defaultClasses} ${className}`;
  
  return (
    <select
      {...props}
      className={finalClasses}
    />
  );
};

// Compact Custom Dropdown Component matching the mockup image
const CompactDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  className = "",
  buttonClassName = "",
}) => {
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
      width: Math.max(rect.width, 180),
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

  const filteredOptions = options.filter((opt) => {
    const label = typeof opt === "object" ? opt.label || opt.name || opt.value : opt;
    return String(label).toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getDisplayLabel = () => {
    if (!value) return placeholder;
    const found = options.find((opt) => (typeof opt === "object" ? opt.value === value : opt === value));
    if (found && typeof found === "object") return found.label || found.name || found.value;
    return value;
  };

  const isPlaceholder = !value || value === "" || value === placeholder;

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
      <div className="rounded-xl shadow-xl bg-white border border-gray-200 overflow-hidden animate-in fade-in duration-100">
        {options.length > 5 && (
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 bg-gray-50/70">
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
        )}
        <div className="py-1 max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-gray-400">No options found</div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const optVal = typeof opt === "object" ? opt.value : opt;
              const optLabel = typeof opt === "object" ? opt.label || opt.name || opt.value : opt;
              const isSelected = value === optVal;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onChange(optVal);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-medium cursor-pointer transition-colors ${
                    isSelected ? "bg-purple-50 text-[#9333ea]" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate">{optLabel}</span>
                  {isSelected && <Check size={14} className="text-[#9333ea] shrink-0" />}
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
      <div className={`relative w-full ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          className={`w-full h-[42px] px-3.5 rounded-xl border border-gray-200 bg-white text-sm flex items-center justify-between transition-colors hover:border-gray-300 focus:border-[#9333ea] focus:outline-none cursor-pointer ${
            isPlaceholder ? "text-gray-400" : "text-gray-700"
          } ${buttonClassName}`}
        >
          <span className="truncate text-left">{getDisplayLabel()}</span>
          <ChevronDown
            size={16}
            className={`text-gray-500 shrink-0 ml-2 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

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

  useEffect(() => {
    if (value) {
      const tax = [...taxOptions, ...nonTaxableOptions].find((t) => t.id === value);
      setSelectedTax(tax);
    } else {
      setSelectedTax(null);
    }
  }, [value, taxOptions, nonTaxableOptions]);

  /** ⭐ Position Calculator */
  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  /** ⭐ Handle Open */
  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  /** Close on outside click */
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

  /** Re-align dropdown on render */
  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  /** Follow scroll + resize */
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

  /** ⭐ Final Dropdown UI */
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
      <div className="rounded-xl shadow-xl bg-white border border-[#d7dcf5] w-[280px] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2.5 bg-[#fafbff]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="h-8 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="py-2 max-h-[400px] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d3d3d3 #f5f5f5' }}>
          <div className="px-4 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
            NON-TAXABLE
          </div>
          {nonTaxableOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => handleSelectTax(option.id)}
              className={`px-4 py-2.5 text-xs cursor-pointer transition-colors ${
                value === option.id
                  ? "bg-purple-50 text-[#9333ea] font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="font-medium">{option.name}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{option.description}</div>
            </div>
          ))}
          <div className="px-4 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            TAX GROUP
          </div>
          {filteredTaxOptions.map((tax) => (
            <div
              key={tax.id}
              onClick={() => handleSelectTax(tax.id)}
              className={`flex items-center justify-between px-4 py-2.5 text-xs cursor-pointer transition-colors ${
                value === tax.id
                  ? "bg-purple-50 text-[#9333ea] font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>{tax.display}</span>
              {value === tax.id && <Check size={14} className="text-[#9333ea]" />}
            </div>
          ))}
          <div
            onClick={() => {
              onNewTax();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#9333ea] hover:bg-purple-50 cursor-pointer transition-colors border-t border-gray-100 mt-2"
          >
            <Plus size={14} />
            <span>New Tax</span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* ⭐ Tax Button */}
      <div className="relative w-full overflow-visible m-0 p-0">
        <button
          ref={buttonRef}
          onClick={toggleDropdown}
          type="button"
          className="w-full h-[42px] rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-300 focus:border-[#9333ea] focus:outline-none transition-colors cursor-pointer flex items-center justify-between px-3 m-0"
        >
          {/* Text and X icon */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`truncate text-left min-w-0 ${selectedTax ? "text-gray-700 font-medium" : "text-gray-400"}`}>
              {selectedTax ? selectedTax.display || selectedTax.name : "Select a Tax"}
            </span>
            {selectedTax && (
              <span
                onClick={handleClearTax}
                className="text-gray-400 hover:text-red-500 transition-colors inline-flex items-center bg-transparent border-none p-0.5 rounded hover:bg-red-50 shrink-0 m-0 cursor-pointer"
                title="Clear selection"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <X size={13} strokeWidth={2} />
              </span>
            )}
          </div>
          {/* Chevron icon */}
          <ChevronDown 
            size={15} 
            className={`text-gray-400 transition-transform shrink-0 ml-1.5 ${isOpen ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Portal */}
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

const ItemDropdown = ({ rowId, value, description, onDescriptionChange, onChange, onNewItem }) => {
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

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        // Fetch items with a higher limit for dropdown (100 items should be enough for most cases)
        const response = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=100`);
        if (!response.ok) throw new Error("Failed to fetch items");
        const data = await response.json();
        
        // Handle both old format (array) and new format (object with items and pagination)
        let itemsList = [];
        if (Array.isArray(data)) {
          // Old format - direct array
          itemsList = data;
        } else if (data.items && Array.isArray(data.items)) {
          // New format - paginated response
          itemsList = data.items;
        }
        
        // Filter active items
        const activeItems = itemsList.filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false");
        setItems(activeItems);
      } catch (error) {
        console.error("Error fetching items:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  // Set selected item from value
  useEffect(() => {
    if (value) {
      // If value is an object (full item), use it directly
      if (typeof value === 'object' && value !== null) {
        setSelectedItem(value);
      } else if (items.length > 0) {
        // If value is a string (itemName or _id), find the item
        const item = items.find((i) => i._id === value || i.itemName === value);
        setSelectedItem(item || null);
      }
    } else {
      setSelectedItem(null);
    }
  }, [value, items]);

  /** ⭐ Position Calculator */
  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 500), // Minimum width for item details
    });
  };

  /** ⭐ Handle Open */
  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  /** Close on outside click */
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

  /** Re-align dropdown on render */
  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  /** Follow scroll + resize */
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

  // Filter items based on search term
  const filteredItems = items.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const itemName = (item.itemName || "").toLowerCase();
    const sku = (item.sku || "").toLowerCase();
    return itemName.includes(searchLower) || sku.includes(searchLower);
  });

  const handleSelectItem = (item) => {
    // Pass the full item object
    onChange(item);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearItem = (e) => {
    e.stopPropagation();
    onChange("");
    setSelectedItem(null);
  };

  // Calculate stock on hand (sum of all warehouse stocks)
  const getStockOnHand = (item) => {
    if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks)) return 0;
    return item.warehouseStocks.reduce((sum, ws) => {
      const stock = typeof ws.stockOnHand === 'number' ? ws.stockOnHand : 0;
      return sum + stock;
    }, 0);
  };

  /** ⭐ Final Dropdown UI */
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
      <div className="rounded-xl shadow-xl bg-white border border-[#d7dcf5] overflow-hidden" style={{ width: '500px', maxWidth: '90vw' }}>
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
        <div className="py-2 max-h-[400px] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d3d3d3 #f5f5f5' }}>
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">
              {searchTerm ? "No items found" : "No items available"}
            </div>
          ) : (
            filteredItems.map((item) => {
              const stockOnHand = getStockOnHand(item);
              const purchaseRate = typeof item.sellingPrice === 'number' ? item.sellingPrice : (typeof item.costPrice === 'number' ? item.costPrice : 0);
              const isSelected = (typeof value === 'object' && value?._id === item._id) || 
                                 (typeof value === 'string' && value === (item.itemName || item._id));
              
              return (
                <div
                  key={item._id}
                  onClick={() => handleSelectItem(item)}
                  className={`px-4 py-3 cursor-pointer transition-colors border-b border-[#f1f5f9] ${
                    isSelected
                      ? "bg-[#2563eb] text-white"
                      : "text-[#1f2937] hover:bg-[#f8fafc]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${isSelected ? "text-white" : "text-[#1f2937]"}`}>
                        {item.itemName || "Unnamed Item"}
                      </div>
                      <div className={`text-xs mt-1 ${isSelected ? "text-white/80" : "text-[#64748b]"}`}>
                        SKU: {item.sku || "N/A"} • Purchase Rate: ₹{purchaseRate.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <div className={`text-xs ${isSelected ? "text-white/80" : "text-[#64748b]"}`}>
                        Stock on Hand
                      </div>
                      <div className={`text-sm font-medium mt-0.5 ${isSelected ? "text-white" : "text-[#10b981]"}`}>
                        {stockOnHand.toFixed(2)} pcs
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div
            onClick={() => {
              onNewItem();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#2563eb] hover:bg-[#f8fafc] cursor-pointer transition-colors border-t border-[#e2e8f0] mt-2"
          >
            <Plus size={16} />
            <span>Add New Item</span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {selectedItem ? (
        /* ⭐ Detailed Item View */
        <div className="relative w-full overflow-visible m-0 p-0">
          <div className="space-y-2">
            {/* Item Name */}
            <div className="font-medium text-sm text-[#1f2937]">
              {selectedItem.itemName || "Unnamed Item"}
            </div>
            
            {/* SKU */}
            <div className="text-xs text-[#64748b]">
              SKU: {selectedItem.sku || "N/A"}
            </div>
            
            {/* Description */}
            <textarea
              placeholder="Add a description to your item"
              value={description || ""}
              onChange={(e) => {
                if (onDescriptionChange) {
                  onDescriptionChange(e.target.value);
                }
              }}
              className="w-full min-h-[60px] rounded-md border border-[#d7dcf5] bg-white text-xs text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors px-2 py-1.5 resize-none"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Item Type Tag and HSN Code */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#2563eb] text-white">
                {(selectedItem.type || "goods").toUpperCase()}
              </span>
              {selectedItem.hsnCode && (
                <div className="flex items-center gap-1 text-xs text-[#64748b]">
                  <span>HSN Code: {selectedItem.hsnCode}</span>
                  <button
                    type="button"
                    className="text-[#64748b] hover:text-[#1f2937] transition-colors p-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle HSN code edit - can be implemented later
                    }}
                    title="Edit HSN Code"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
            </div>
            
            {/* Click to change item */}
            <button
              ref={buttonRef}
              onClick={toggleDropdown}
              type="button"
              className="text-xs text-[#2563eb] hover:text-[#1d4ed8] hover:underline transition-colors mt-1"
            >
              Change item
            </button>
          </div>
        </div>
      ) : (
        /* ⭐ Item Input - Styled like mockup */
        <div className="relative w-full overflow-visible m-0 p-0">
          <input
            ref={buttonRef}
            onClick={toggleDropdown}
            type="text"
            readOnly
            placeholder="Type of click to select an item"
            className="w-full h-[42px] rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 hover:border-gray-300 focus:border-[#9333ea] focus:outline-none transition-colors cursor-pointer px-3.5"
          />
        </div>
      )}

      {/* Portal */}
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// VendorDropdown Component (reused from Bills.jsx)
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
        // Use email as primary identifier (e.g., officerootments@gmail.com)
        const userId = user?.email || user?._id || user?.id || user?.locCode || null;
        
        let vendorsFromAPI = [];
        
        if (userId) {
          try {
            const response = await fetch(`${API_URL}/api/purchase/vendors?userId=${userId}`);
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
          if (key && !vendorMap.has(key)) {
            vendorMap.set(key, vendor);
          }
        });
        
        setVendors(Array.from(vendorMap.values()));
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
      <div className="rounded-xl shadow-xl bg-white border border-[#d7dcf5] w-full overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2.5 bg-[#fafbff]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vendors"
            className="h-8 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="py-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">Loading vendors...</div>
          ) : filteredVendors.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">
              {searchTerm ? "No vendors found" : "No vendors available"}
            </div>
          ) : (
            <>
              {filteredVendors.map((vendor) => (
                <div
                  key={vendor._id || vendor.id || vendor.displayName}
                  onClick={() => handleSelectVendor(vendor)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f8fafc] cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1f2937] truncate">
                      {vendor.displayName || vendor.companyName || "Unnamed Vendor"}
                    </p>
                    {vendor.email && (
                      <p className="text-xs text-[#64748b] truncate mt-0.5">{vendor.email}</p>
                    )}
                  </div>
                  {selectedVendor && (selectedVendor._id === vendor._id || selectedVendor.id === vendor.id) && (
                    <Check size={16} className="text-[#2563eb] shrink-0" />
                  )}
                </div>
              ))}
              <div
                onClick={() => {
                  onNewVendor();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#2563eb] hover:bg-[#f8fafc] cursor-pointer transition-colors border-t border-[#e2e8f0] mt-2"
              >
                <Plus size={16} />
                <span>New Vendor</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative w-full">
        <div className="flex items-center gap-2">
          <input
            ref={buttonRef}
            onClick={toggleDropdown}
            type="text"
            readOnly
            value={selectedVendor ? (selectedVendor.displayName || selectedVendor.companyName) : ""}
            placeholder="Search a vendors"
            className="flex-1 h-[42px] rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 hover:border-gray-300 focus:border-[#9333ea] focus:outline-none transition-colors cursor-pointer px-3.5"
          />
          <button
            type="button"
            onClick={toggleDropdown}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
            className="h-[42px] w-[42px] rounded-xl bg-[#9333ea] hover:bg-[#7e22ce] text-white transition-colors shrink-0 cursor-pointer shadow-sm"
            title="Search"
          >
            <Search size={18} className="shrink-0" />
          </button>
        </div>
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

const PurchaseOrderCreate = () => {
  const isSidebarOpen = useSidebar();
  const { id } = useParams(); // Get id from URL if editing
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  // Safely get user from localStorage
  let currentuser = null;
  try {
    const userStr = localStorage.getItem("rootfinuser");
    if (userStr) {
      currentuser = JSON.parse(userStr);
    }
  } catch (e) {
    console.error("Error parsing user from localStorage:", e);
  }
  
  // Use email as primary identifier (e.g., officerootments@gmail.com)
  const userId = currentuser?.email || currentuser?._id || currentuser?.id || currentuser?.locCode || null;

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showNewAddressModal, setShowNewAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderDataLoaded, setOrderDataLoaded] = useState(false); // Track if order data has been loaded
  const [savedDeliveryAddress, setSavedDeliveryAddress] = useState(null); // Store delivery address from order
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [branch, setBranch] = useState("Warehouse");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderNumberLoading, setOrderNumberLoading] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  });
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Due on Receipt");
  const [shipmentPreference, setShipmentPreference] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [saving, setSaving] = useState(false);
  const [discountType, setDiscountType] = useState("At Transaction Level");
  const [discount, setDiscount] = useState({ value: "0", type: "%" }); // { value: "0", type: "%" or "₹" }
  const [applyDiscountAfterTax, setApplyDiscountAfterTax] = useState(false);
  const [tableDiscountAccount, setTableDiscountAccount] = useState(""); // For "At Line Item Level" - discount account in table header
  const [transactionDiscountAccount, setTransactionDiscountAccount] = useState(""); // For "At Line Item Level and at Transaction Level" - discount account in subtotal
  const [totalTaxAmount, setTotalTaxAmount] = useState("");
  const [tdsTcsType, setTdsTcsType] = useState("TDS"); // "TDS" or "TCS"
  const [tdsTcsTax, setTdsTcsTax] = useState("");
  const [adjustment, setAdjustment] = useState("0.00");
  const [tableRows, setTableRows] = useState([
    {
      id: 1,
      item: "",
      itemData: null, // Store full item object
      itemDescription: "", // Store item description
      account: "",
      size: "",
      quantity: "1.00",
      rate: "0.00",
      tax: "",
      amount: "0.00",
      // GST calculation fields
      baseAmount: "0.00",
      discountedAmount: "0.00",
      cgstAmount: "0.00",
      sgstAmount: "0.00",
      igstAmount: "0.00",
      lineTaxTotal: "0.00",
      lineTotal: "0.00",
      taxCode: "",
      taxPercent: 0,
      cgstPercent: 0,
      sgstPercent: 0,
      igstPercent: 0,
      isInterState: false, // true for IGST, false for CGST+SGST
      // Line item discount fields
      lineDiscount: { value: "0", type: "%" }, // Discount at line item level
      lineDiscountAccount: "", // Discount account for this line item
    },
  ]);
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
  
  // Discount Account Options
  const discountAccountOptions = [
    "Expense",
    "Advertising And Marketing",
    "Automobile Expense",
    "Bad Debt",
    "Bank Fees and Charges",
    "Consultant Expense",
    "Contract Assets",
    "Credit Card Charges",
    "Depreciation And Amortisation",
    "Depreciation Expense",
    "IT and Internet Expenses",
    "Janitorial Expense",
    "Lodging",
    "Meals and Entertainment",
    "Merchandise",
    "Office Supplies",
    "Other Expenses",
    "Postage",
    "Printing and Stationery",
    "Purchase Discounts",
    "Raw Materials And Consumables",
    "Rent Expense",
    "Repairs and Maintenance",
    "Salaries and Employee Wages",
    "Telephone Expense",
    "Transportation Expense",
    "Travel Expense",
    "Uncategorized",
    "Cost Of Goods Sold",
    "Cost of Goods Sold",
    "Job Costing",
    "Labor",
    "Materials",
    "Subcontractor"
  ];

  const discountOptions = [
    "At Transaction Level",
    "At Line Item Level",
    "At Line Item Level and at Transaction Level",
  ];

  const branchOptions = ["Warehouse", "Branch 1", "Main Branch"];
  const warehouseSelectOptions = ["Select a warehouse", "Warehouse", "Main Warehouse", "Secondary Warehouse"];
  const paymentTermOptions = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 60"];
  const shipmentPreferenceOptions = [
    "Choose the shipment preference or type to add",
    "Standard",
    "Express",
    "Overnight",
    "In-Store Pickup",
  ];
  const accountOptions = [
    "Select an account",
    "Cost of Goods Sold",
    "Inventory Asset",
    "Purchase Account",
    "Raw Materials",
    "Operating Expense",
    "General Expense",
  ];
  const [newAddress, setNewAddress] = useState({
    attention: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    phone: "",
  });
  const [attachments, setAttachments] = useState([]);

  const selectedAddress = addresses.find((addr) => addr && (addr._id || addr.id) === selectedAddressId) || (addresses.length > 0 ? addresses[0] : null);

  // Fetch addresses from backend on mount
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/purchase/addresses?userId=${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch addresses");
        }
        const data = await response.json();
        
        // Transform backend data to match frontend format
        const transformedAddresses = Array.isArray(data) ? data.map(addr => ({
          ...addr,
          id: addr._id || addr.id,
        })) : [];
        
        setAddresses(transformedAddresses);
        
        // Set default selected address
        if (transformedAddresses.length > 0 && !selectedAddressId) {
          setSelectedAddressId(transformedAddresses[0]._id || transformedAddresses[0].id);
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
        // If no addresses exist, create a default one
        const defaultAddress = {
          id: "default",
          attention: "Warehouse",
          street1: "",
          street2: "",
          city: "Kerala",
          state: "",
          zip: "",
          country: "India",
          phone: "7593838720",
        };
        setAddresses([defaultAddress]);
        setSelectedAddressId("default");
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [userId]);

  // Fetch next order number when creating a new order (not in edit mode)
  useEffect(() => {
    const fetchNextOrderNumber = async () => {
      // Only fetch if not in edit mode and order number is not set
      if (isEditMode || orderNumber) return;
      
      try {
        setOrderNumberLoading(true);
        const response = await fetch(`${API_URL}/api/purchase/orders/next-number`);
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
        setOrderNumber("PO-00001");
      } finally {
        setOrderNumberLoading(false);
      }
    };

    fetchNextOrderNumber();
  }, [isEditMode, API_URL, orderNumber]);

  // Auto-fetch TDS from vendor when vendor is selected
  useEffect(() => {
    if (selectedVendor && selectedVendor.tds) {
      // Find matching TDS option by name or display string
      const vendorTds = selectedVendor.tds;
      const matchedTds = tdsOptions.find(option => {
        // Match by exact name, display string, or partial match
        return option.name === vendorTds || 
               option.display === vendorTds ||
               vendorTds.includes(option.name) ||
               option.name.includes(vendorTds);
      });
      
      if (matchedTds) {
        setTdsTcsType("TDS");
        setTdsTcsTax(matchedTds.id);
      }
    } else if (selectedVendor && !selectedVendor.tds) {
      // Clear TDS if vendor doesn't have one
      setTdsTcsTax("");
    }
  }, [selectedVendor, tdsOptions]);

  // Load order data if in edit mode - wait for addresses to be loaded first
  useEffect(() => {
    const loadOrderData = async () => {
      // Prevent multiple loads - wait for addresses to be loaded (loading === false)
      if (!isEditMode || !id || orderDataLoaded) return;
      if (loading) return; // Still loading addresses

      try {
        const response = await fetch(`${API_URL}/api/purchase/orders/${id}`);
        if (!response.ok) {
          throw new Error("Failed to load purchase order");
        }
        const order = await response.json();

        // Format date from Date object to dd/MM/yyyy
        const formatDateForInput = (dateValue) => {
          if (!dateValue) return "";
          const d = new Date(dateValue);
          const day = String(d.getDate()).padStart(2, "0");
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        };

        // Pre-fill form fields
        setOrderNumber(order.orderNumber || "");
        setReferenceNumber(order.referenceNumber || "");
        setDate(formatDateForInput(order.date));
        setDeliveryDate(formatDateForInput(order.deliveryDate));
        setPaymentTerms(order.paymentTerms || "Due on Receipt");
        setShipmentPreference(order.shipmentPreference || "");
        setCustomerNotes(order.customerNotes || "");
        setTermsAndConditions(order.termsAndConditions || "");
        setBranch(order.branch || "Warehouse");
        setDiscountType(order.discountType || "At Transaction Level");
        setDiscount(order.discount || { value: "0", type: "%" });
        setApplyDiscountAfterTax(order.applyDiscountAfterTax || false);
        setTotalTaxAmount(String(order.totalTaxAmount || ""));
        setTdsTcsType(order.tdsTcsType || "TDS");
        setTdsTcsTax(order.tdsTcsTax || "");
        setAdjustment(String(order.adjustment || "0.00"));

        // Load vendor if vendorId exists
        if (order.vendorId) {
          try {
            const vendorResponse = await fetch(`${API_URL}/api/purchase/vendors/${order.vendorId}`);
            if (vendorResponse.ok) {
              const vendorData = await vendorResponse.json();
              setSelectedVendor(vendorData);
            }
          } catch (error) {
            console.error("Error loading vendor:", error);
            // Fallback: use vendorName from order
            if (order.vendorName) {
              setSelectedVendor({
                _id: order.vendorId,
                displayName: order.vendorName,
                companyName: order.vendorName,
              });
            }
          }
        }

        // Pre-fill table rows from order items
        if (order.items && order.items.length > 0) {
          const rows = order.items.map((item, index) => ({
            id: index + 1,
            item: item.itemName || "",
            itemData: item.itemId ? { _id: item.itemId, itemName: item.itemName } : null,
            itemDescription: item.itemDescription || "",
            account: item.account || "",
            size: item.size || "",
            quantity: String(item.quantity || "1.00"),
            rate: String(item.rate || "0.00"),
            tax: item.tax || "",
            amount: String(item.amount || "0.00"),
            baseAmount: String(item.baseAmount || "0.00"),
            discountedAmount: String(item.discountedAmount || "0.00"),
            cgstAmount: String(item.cgstAmount || "0.00"),
            sgstAmount: String(item.sgstAmount || "0.00"),
            igstAmount: String(item.igstAmount || "0.00"),
            lineTaxTotal: String(item.lineTaxTotal || "0.00"),
            lineTotal: String(item.lineTotal || "0.00"),
            taxCode: item.taxCode || "",
            taxPercent: item.taxPercent || 0,
            cgstPercent: item.cgstPercent || 0,
            sgstPercent: item.sgstPercent || 0,
            igstPercent: item.igstPercent || 0,
            isInterState: item.isInterState || false,
          }));
          setTableRows(rows);
        }

        // Store delivery address to set later (after addresses are loaded)
        if (order.deliveryAddress) {
          setSavedDeliveryAddress({
            attention: order.deliveryAddress.attention || "",
            street1: order.deliveryAddress.street1 || "",
            street2: order.deliveryAddress.street2 || "",
            city: order.deliveryAddress.city || "",
            state: order.deliveryAddress.state || "",
            zip: order.deliveryAddress.zip || "",
            country: order.deliveryAddress.country || "",
            phone: order.deliveryAddress.phone || "",
          });
        }
        
        setOrderDataLoaded(true);
      } catch (error) {
        console.error("Error loading purchase order:", error);
        alert("Failed to load purchase order. Redirecting...");
        navigate("/purchase/orders");
      }
    };

    // Only load if addresses have been fetched (loading === false) and order data hasn't been loaded yet
    if (!loading && !orderDataLoaded && isEditMode && id) {
      loadOrderData();
    }
  }, [isEditMode, id, API_URL, navigate, loading, orderDataLoaded, addresses]);

  // Set delivery address after both addresses and order data are loaded
  useEffect(() => {
    if (!savedDeliveryAddress || !orderDataLoaded || addresses.length === 0) return;
    if (selectedAddressId) return; // Already set

    const deliveryAddr = savedDeliveryAddress;
    
    // Check if this address exists in addresses list
    const existingAddr = addresses.find(addr => 
      addr && (
        (addr.street1 === deliveryAddr.street1 && addr.city === deliveryAddr.city) ||
        (addr.street1 && deliveryAddr.street1 && addr.street1.trim() === deliveryAddr.street1.trim() && 
         addr.city && deliveryAddr.city && addr.city.trim() === deliveryAddr.city.trim())
      )
    );
    
    if (existingAddr) {
      setSelectedAddressId(existingAddr._id || existingAddr.id);
    } else {
      // Add as temporary address
      const tempAddr = { ...deliveryAddr, id: `temp-${Date.now()}`, _id: `temp-${Date.now()}` };
      setAddresses(prev => [...prev, tempAddr]);
      setSelectedAddressId(tempAddr.id);
    }
  }, [savedDeliveryAddress, orderDataLoaded, addresses, selectedAddressId]);

  const formatAddress = (address) => {
    // More robust check for undefined, null, or non-object values
    if (!address || typeof address !== 'object') return [];
    
    const lines = [];
    // Don't include attention in the address box - it goes in the input field above
    if (address.street1) lines.push(address.street1);
    if (address.street2) lines.push(address.street2);
    if (address.city) lines.push(address.city);
    if (address.state) lines.push(address.state);
    if (address.country) {
      lines.push(`${address.country} ,`);
    }
    if (address.zip && !address.country) lines.push(address.zip);
    if (address.phone) lines.push(address.phone);
    
    // Default fallback
    if (lines.length === 0) {
      if (address.city) lines.push(address.city);
      if (address.country) lines.push(`${address.country} ,`);
    }
    
    return lines;
  };

  const handleSelectAddress = (addressId) => {
    setSelectedAddressId(addressId);
    setShowAddressModal(false);
  };

  const handleAddAddress = async () => {
    if (!newAddress.city || !newAddress.country) {
      alert("Please fill in at least City and Country");
      return;
    }

    if (!userId) {
      alert("User not logged in. Please log in to save addresses.");
      console.error("UserId not found. Current user:", currentuser);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/purchase/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newAddress,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save address");
      }

      const savedAddress = await response.json();
      const transformedAddress = {
        ...savedAddress,
        id: savedAddress._id || savedAddress.id,
      };

      setAddresses([...addresses, transformedAddress]);
      setSelectedAddressId(transformedAddress.id);
      setNewAddress({
        attention: "",
        street1: "",
        street2: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        phone: "",
      });
      setShowNewAddressModal(false);
    } catch (error) {
      console.error("Error saving address:", error);
      alert("Failed to save address. Please try again.");
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress({ ...address });
    setShowAddressModal(false);
    setShowNewAddressModal(true);
  };

  const handleUpdateAddress = async () => {
    if (!editingAddress.city || !editingAddress.country) {
      alert("Please fill in at least City and Country");
      return;
    }

    if (!userId) {
      alert("User not logged in. Please log in to update addresses.");
      return;
    }

    const addressId = editingAddress._id || editingAddress.id;
    if (!addressId) {
      alert("Invalid address ID");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/purchase/addresses/${addressId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editingAddress,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update address");
      }

      const updatedAddress = await response.json();
      const transformedAddress = {
        ...updatedAddress,
        id: updatedAddress._id || updatedAddress.id,
      };

      setAddresses(addresses.map((addr) => 
        (addr._id || addr.id) === addressId ? transformedAddress : addr
      ));
      setEditingAddress(null);
      setShowNewAddressModal(false);
    } catch (error) {
      console.error("Error updating address:", error);
      alert("Failed to update address. Please try again.");
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (addresses.length === 1) {
      alert("You must have at least one address");
      return;
    }

    if (!userId) {
      alert("User not logged in. Please log in to delete addresses.");
      return;
    }

    // Skip deletion for default address (not saved in backend)
    if (addressId === "default") {
      alert("Cannot delete default address");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/purchase/addresses/${addressId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete address");
      }

      setAddresses(addresses.filter((addr) => (addr._id || addr.id) !== addressId));
      if (selectedAddressId === addressId) {
        const remainingAddresses = addresses.filter((addr) => (addr._id || addr.id) !== addressId);
        setSelectedAddressId(remainingAddresses[0]?._id || remainingAddresses[0]?.id || null);
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      alert(error.message || "Failed to delete address. Please try again.");
    }
  };

  const handleNewAddressClick = () => {
    setEditingAddress(null);
    setNewAddress({
      attention: "",
      street1: "",
      street2: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      phone: "",
    });
    setShowAddressModal(false);
    setShowNewAddressModal(true);
  };

  const handleAddNewRow = () => {
    const newId = Math.max(...tableRows.map(r => r.id), 0) + 1;
    const newRow = {
      id: newId,
      item: "",
      itemData: null,
      itemDescription: "",
      account: "",
      size: "",
      quantity: "1.00",
      rate: "0.00",
      tax: "",
      amount: "0.00",
      baseAmount: "0.00",
      discountedAmount: "0.00",
      cgstAmount: "0.00",
      sgstAmount: "0.00",
      igstAmount: "0.00",
      lineTaxTotal: "0.00",
      lineTotal: "0.00",
      taxCode: "",
      taxPercent: 0,
      cgstPercent: 0,
      sgstPercent: 0,
      igstPercent: 0,
      isInterState: false,
      lineDiscount: { value: "0", type: "%" }, // Initialize line discount
      lineDiscountAccount: "", // Initialize discount account
    };
    setTableRows([...tableRows, newRow]);
  };

  const handleDeleteRow = (rowId) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter((row) => row.id !== rowId));
    }
  };

  const handleUpdateRow = (rowId, field, value) => {
    setTableRows(
      tableRows.map((row) => {
        if (row.id === rowId) {
          const updated = { ...row, [field]: value };
          
          // If updating item, also store the full item object and auto-fill all related fields
          if (field === "item" && typeof value === 'object' && value !== null) {
            updated.itemData = value;
            updated.item = value.itemName || value._id || "";
            
            // Auto-fill rate from item's sellingPrice (only if rate is empty or 0)
            if (value.sellingPrice !== undefined && value.sellingPrice !== null && (!updated.rate || updated.rate === "0.00" || updated.rate === "0")) {
              updated.rate = value.sellingPrice.toString();
            }
            
            // Auto-fill account from item's salesAccount (only if account is empty)
            if (value.salesAccount && !updated.account) {
              updated.account = value.salesAccount;
            }
            
            // Auto-fill size from item's size (only if size is empty)
            if (value.size && !updated.size) {
              updated.size = value.size;
            }
            
            // Auto-fill tax/GST based on item's tax settings (exact tax selected during item creation)
            // Always use the item's tax when an item is selected
            // Priority: taxRateIntra > taxRateInter > taxPreference
            let matchedTaxId = null;
            
            // Helper function to extract tax rate from various formats
            const extractTaxRate = (taxRateValue) => {
              if (!taxRateValue) return null;
              
              // Handle different formats: "5", "5%", "5.0", "5.0%", "GST5 [5%]", etc.
              const taxRateStr = String(taxRateValue);
              
              // Try to extract from bracket format first: "GST5 [5%]" -> 5
              const bracketMatch = taxRateStr.match(/\[(\d+(?:\.\d+)?)%?\]/);
              if (bracketMatch) {
                return parseFloat(bracketMatch[1]);
              }
              
              // Otherwise, extract number directly
              const numberMatch = taxRateStr.replace(/[^\d.]/g, '');
              const taxRate = parseFloat(numberMatch);
              
              return isNaN(taxRate) ? null : taxRate;
            };
            
            // Helper function to match tax rate to dropdown options
            const matchTaxByRate = (taxRateValue) => {
              const taxRate = extractTaxRate(taxRateValue);
              if (taxRate === null) return null;
              
              // Find closest match by rate (handle both integer and decimal rates)
              // First try exact match
              const exactMatch = taxOptions.find(tax => tax.rate === taxRate);
              if (exactMatch) return exactMatch.id;
              
              // Then try rounded match (for decimal rates like 2.5 matching 5% GST)
              const roundedRate = Math.round(taxRate);
              const roundedMatch = taxOptions.find(tax => tax.rate === roundedRate);
              if (roundedMatch) return roundedMatch.id;
              
              // If no match found, return null (we'll use the item's tax data directly)
              return null;
            };
            
            // Check intra-state tax rate first (this is the primary tax rate selected during item creation)
            if (value.taxRateIntra) {
              matchedTaxId = matchTaxByRate(value.taxRateIntra);
            }
            
            // If no match from intra, check inter-state tax rate
            if (!matchedTaxId && value.taxRateInter) {
              matchedTaxId = matchTaxByRate(value.taxRateInter);
            }
            
            // If still no match and item is non-taxable, set to non-taxable option
            if (!matchedTaxId && value.taxPreference === "non-taxable") {
              matchedTaxId = nonTaxableOptions[0]?.id || "";
            }
            
            // Set the tax if we found a match (always use item's tax)
            if (matchedTaxId) {
              updated.tax = matchedTaxId;
            } else if (value.taxRateIntra || value.taxRateInter) {
              // If no dropdown match but item has tax data, try to create a dynamic tax entry
              // or use the closest available tax option
              const itemTaxRate = extractTaxRate(value.taxRateIntra || value.taxRateInter);
              if (itemTaxRate !== null) {
                // Find the closest tax option
                const closestTax = taxOptions.reduce((closest, tax) => {
                  if (!closest) return tax;
                  const currentDiff = Math.abs(tax.rate - itemTaxRate);
                  const closestDiff = Math.abs(closest.rate - itemTaxRate);
                  return currentDiff < closestDiff ? tax : closest;
                }, null);
                
                if (closestTax) {
                  updated.tax = closestTax.id;
                }
              }
            }
          }
          
          // If tax is manually changed (not when item is selected), prioritize the manually selected tax
          // Clear itemData tax preference so that manually selected tax is used instead
          if (field === "tax" && updated.itemData) {
            // When user manually changes tax, ignore item's default tax and use the manually selected one
            // Create a copy of itemData without tax info to force using selected tax
            updated.itemData = {
              ...updated.itemData,
              taxRateIntra: null,
              taxRateInter: null,
              taxPreference: null
            };
          }
          
          // Recalculate GST for this row whenever quantity, rate, tax, or discount changes
          // IMPORTANT: Always recalculate GST when any field changes to ensure totals are updated
          const allTaxOptions = [...taxOptions, ...nonTaxableOptions];
          const useLineDiscount = discountType === "At Line Item Level" || discountType === "At Line Item Level and at Transaction Level";
          const discountConfig = {
            value: discount.value,
            type: discount.type,
            applyAfterTax: applyDiscountAfterTax,
            useLineDiscount: useLineDiscount,
          };
          
          // Always recalculate GST with the updated row data (especially important when tax changes)
          const gstCalculation = calculateGSTLineItem(updated, discountConfig, allTaxOptions);
          
          // Update all GST calculation fields
          updated.baseAmount = gstCalculation.baseAmount;
          updated.discountedAmount = gstCalculation.discountedAmount;
          updated.cgstAmount = gstCalculation.cgstAmount;
          updated.sgstAmount = gstCalculation.sgstAmount;
          updated.igstAmount = gstCalculation.igstAmount;
          updated.lineTaxTotal = gstCalculation.lineTaxTotal;
          updated.lineTotal = gstCalculation.lineTotal;
          updated.taxCode = gstCalculation.taxCode;
          updated.taxPercent = gstCalculation.taxPercent;
          updated.cgstPercent = gstCalculation.cgstPercent;
          updated.sgstPercent = gstCalculation.sgstPercent;
          updated.igstPercent = gstCalculation.igstPercent;
          updated.isInterState = gstCalculation.isInterState;
          
          // Amount column shows base amount (quantity × rate) - does NOT include tax or discount
          // Discount only affects totals section, not individual line item amounts
          updated.amount = gstCalculation.baseAmount;
          
          return updated;
        }
        return row;
      })
    );
  };

  const handleSaveNewTax = () => {
    if (!newTax.name || !newTax.rate) {
      alert("Please fill in Tax Name and Rate");
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

  /**
   * ZOHO BOOKS GST CALCULATION HELPER
   * Calculates GST for a single line item following Zoho Books formula exactly
   * @param {Object} row - The table row object
   * @param {Object} discountConfig - { value: string, type: "%" | "₹", applyAfterTax: boolean }
   * @param {Array} allTaxOptions - Combined tax options and non-taxable options
   * @returns {Object} Calculated GST values
   */
  const calculateGSTLineItem = (row, discountConfig, allTaxOptions) => {
    // 1️⃣ Base Amount
    const quantity = parseFloat(row.quantity) || 0;
    const rate = parseFloat(row.rate) || 0;
    const baseAmount = quantity * rate;

    // Helper function to extract tax rate from various formats
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

    // Find selected tax from dropdown
    const selectedTax = allTaxOptions.find(t => t.id === row.tax);
    
    // Initialize tax values
    let taxPercent = 0;
    let cgstPercent = 0;
    let sgstPercent = 0;
    let igstPercent = 0;
    let isInterState = false;
    let taxCode = "";

    // Priority: Use item's tax data if available, otherwise use selected tax from dropdown
    const itemData = row.itemData;
    let itemTaxRate = null;
    let itemIsInterState = false;

    if (itemData) {
      // Check if item has tax rate data
      if (itemData.taxRateIntra) {
        itemTaxRate = extractTaxRate(itemData.taxRateIntra);
        itemIsInterState = false; // Intra-state uses CGST+SGST
      } else if (itemData.taxRateInter) {
        itemTaxRate = extractTaxRate(itemData.taxRateInter);
        itemIsInterState = true; // Inter-state uses IGST
      }
    }

    // Use item's tax rate if available, otherwise use selected tax from dropdown
    if (itemTaxRate !== null) {
      taxPercent = itemTaxRate;
      isInterState = itemIsInterState;
      taxCode = itemData.taxRateIntra || itemData.taxRateInter || row.tax || "";
    } else if (selectedTax && selectedTax.rate !== undefined && selectedTax.rate > 0) {
      taxPercent = selectedTax.rate;
      taxCode = selectedTax.id;
      // Determine if inter-state or intra-state
      // For now, assume intra-state (CGST+SGST). Can be enhanced with address-based logic
      isInterState = false; // TODO: Determine from vendor/supplier address
    }

    // Calculate CGST, SGST, or IGST based on state type
    if (taxPercent > 0) {
      if (isInterState) {
        // Inter-state: Full GST as IGST
        igstPercent = taxPercent;
      } else {
        // Intra-state: Split GST into CGST and SGST
        cgstPercent = taxPercent / 2;
        sgstPercent = taxPercent / 2;
      }
    }

    // 2️⃣ Apply Discount (if "Apply before tax")
    // Check if line item has its own discount (for "At Line Item Level" and "At Line Item Level and at Transaction Level")
    const lineItemDiscount = row.lineDiscount || { value: "0", type: "%" };
    const useLineDiscount = discountConfig.useLineDiscount && lineItemDiscount && parseFloat(lineItemDiscount.value || "0") > 0;
    
    // If "Apply after tax": calculate tax on baseAmount, discount applied at invoice level
    // If "Apply before tax": calculate tax on discountedAmount
    let discountedAmount = baseAmount;
    let amountForTaxCalculation = baseAmount; // Amount to use for tax calculation
    
    // Apply line item discount if enabled
    if (useLineDiscount && !discountConfig.applyAfterTax) {
      if (lineItemDiscount.type === "%") {
        const discountPercent = parseFloat(lineItemDiscount.value || "0");
        discountedAmount = baseAmount - (baseAmount * discountPercent / 100);
      } else {
        // Fixed amount discount (₹)
        const discountAmount = parseFloat(lineItemDiscount.value || "0");
        discountedAmount = baseAmount - discountAmount;
      }
      discountedAmount = Math.max(0, discountedAmount);
      amountForTaxCalculation = discountedAmount;
    } else if (!useLineDiscount && !discountConfig.applyAfterTax && discountConfig.value && parseFloat(discountConfig.value) > 0) {
      // Apply transaction-level discount (for "At Transaction Level")
      if (discountConfig.type === "%") {
        const discountPercent = parseFloat(discountConfig.value);
        discountedAmount = baseAmount - (baseAmount * discountPercent / 100);
      } else {
        // Fixed amount discount (₹) - Note: For line-level, we'd need to distribute this
        discountedAmount = baseAmount;
      }
      discountedAmount = Math.max(0, discountedAmount);
      amountForTaxCalculation = discountedAmount;
    } else {
      // Apply after tax: tax calculated on base amount
      amountForTaxCalculation = baseAmount;
    }

    // 3️⃣ Calculate Tax Components (round to 2 decimals per line item)
    // Tax is calculated on amountForTaxCalculation (baseAmount or discountedAmount)
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isInterState && igstPercent > 0) {
      // Inter-state: IGST
      igstAmount = Math.round((amountForTaxCalculation * igstPercent / 100) * 100) / 100;
    } else if (!isInterState && (cgstPercent > 0 || sgstPercent > 0)) {
      // Intra-state: CGST + SGST
      cgstAmount = Math.round((amountForTaxCalculation * cgstPercent / 100) * 100) / 100;
      sgstAmount = Math.round((amountForTaxCalculation * sgstPercent / 100) * 100) / 100;
    }

    // 5️⃣ Total Tax Amount (line level)
    const lineTaxTotal = cgstAmount + sgstAmount + igstAmount;

    // 6️⃣ Final Line Total
    const lineTotal = discountedAmount + lineTaxTotal;

    return {
      baseAmount: baseAmount.toFixed(2),
      discountedAmount: discountedAmount.toFixed(2),
      cgstAmount: cgstAmount.toFixed(2),
      sgstAmount: sgstAmount.toFixed(2),
      igstAmount: igstAmount.toFixed(2),
      lineTaxTotal: lineTaxTotal.toFixed(2),
      lineTotal: lineTotal.toFixed(2),
      taxCode,
      taxPercent,
      cgstPercent,
      sgstPercent,
      igstPercent,
      isInterState,
    };
  };

  // Calculate totals from table rows (Zoho Books formula)
  // NOTE: This function is called on every render, so when tax changes in any row,
  // the totals are automatically recalculated with the new tax values
  const calculateTotals = () => {
    const allTaxOptions = [...taxOptions, ...nonTaxableOptions];
    const useLineDiscount = discountType === "At Line Item Level" || discountType === "At Line Item Level and at Transaction Level";
    const discountConfig = {
      value: discount.value,
      type: discount.type,
      applyAfterTax: applyDiscountAfterTax,
      useLineDiscount: useLineDiscount, // Flag to indicate if line-item discounts should be used
    };

    // Recalculate all rows to ensure they're up to date
    // This ensures that when tax changes in any row, the totals are recalculated correctly
    // Each row's tax value is read from row.tax, which is updated when tax changes
    const recalculatedRows = tableRows.map(row => {
      // Always recalculate GST using the current row data (including current tax value from row.tax)
      // This ensures tax changes are immediately reflected in totals
      const gstCalculation = calculateGSTLineItem(row, discountConfig, allTaxOptions);
      return {
        ...row,
        ...gstCalculation,
        // Amount column shows base amount (quantity × rate) - does NOT change with discount
        amount: gstCalculation.baseAmount,
      };
    });

    // 7️⃣ Invoice Summary Totals (Zoho Books formula)
    
    // Subtotal = sum of all baseAmount or discountedAmount (depending on discount timing)
    let subTotal = 0;
    if (applyDiscountAfterTax) {
      // If discount applies after tax, subtotal is sum of baseAmount
      subTotal = recalculatedRows.reduce((sum, row) => {
        return sum + (parseFloat(row.baseAmount) || 0);
      }, 0);
    } else {
      // If discount applies before tax, subtotal is sum of discountedAmount
      subTotal = recalculatedRows.reduce((sum, row) => {
        return sum + (parseFloat(row.discountedAmount) || 0);
      }, 0);
    }

    // Aggregate tax breakdown by CGST/SGST rate separately (for display)
    // Group CGST by rate, SGST by rate, and IGST by rate separately
    const cgstMap = new Map(); // cgstRate -> { rate, amount }
    const sgstMap = new Map(); // sgstRate -> { rate, amount }
    const igstMap = new Map(); // igstRate -> { rate, amount }
    
    recalculatedRows.forEach((row) => {
      if (row.taxPercent > 0) {
        // Aggregate CGST by rate
        if (row.cgstPercent > 0 && parseFloat(row.cgstAmount) > 0) {
          const cgstRate = row.cgstPercent;
          if (cgstMap.has(cgstRate)) {
            cgstMap.get(cgstRate).amount += parseFloat(row.cgstAmount) || 0;
          } else {
            cgstMap.set(cgstRate, {
              rate: cgstRate,
              amount: parseFloat(row.cgstAmount) || 0,
            });
          }
        }
        
        // Aggregate SGST by rate
        if (row.sgstPercent > 0 && parseFloat(row.sgstAmount) > 0) {
          const sgstRate = row.sgstPercent;
          if (sgstMap.has(sgstRate)) {
            sgstMap.get(sgstRate).amount += parseFloat(row.sgstAmount) || 0;
          } else {
            sgstMap.set(sgstRate, {
              rate: sgstRate,
              amount: parseFloat(row.sgstAmount) || 0,
            });
          }
        }
        
        // Aggregate IGST by rate
        if (row.igstPercent > 0 && parseFloat(row.igstAmount) > 0) {
          const igstRate = row.igstPercent;
          if (igstMap.has(igstRate)) {
            igstMap.get(igstRate).amount += parseFloat(row.igstAmount) || 0;
          } else {
            igstMap.set(igstRate, {
              rate: igstRate,
              amount: parseFloat(row.igstAmount) || 0,
            });
          }
        }
      }
    });

    // Convert maps to arrays and combine for display
    const taxBreakdown = [
      ...Array.from(cgstMap.values()).map(item => ({ type: 'CGST', rate: item.rate, amount: item.amount })),
      ...Array.from(sgstMap.values()).map(item => ({ type: 'SGST', rate: item.rate, amount: item.amount })),
      ...Array.from(igstMap.values()).map(item => ({ type: 'IGST', rate: item.rate, amount: item.amount })),
    ].sort((a, b) => {
      // Sort by type (CGST first, then SGST, then IGST), then by rate
      const typeOrder = { 'CGST': 0, 'SGST': 1, 'IGST': 2 };
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.rate - b.rate;
    });
    
    // Total Tax = sum of all lineTaxTotal values (initial calculation)
    let calculatedTotalTax = recalculatedRows.reduce((sum, row) => {
      return sum + (parseFloat(row.lineTaxTotal) || 0);
    }, 0);
    
    // Calculate discount amounts
    // For "At Line Item Level": discount is already in subtotal (no transaction-level discount)
    // For "At Transaction Level": discount at transaction level
    // For "At Line Item Level and at Transaction Level": both line-item (in subtotal) and transaction-level discounts
    const hasLineItemDiscount = discountType === "At Line Item Level" || discountType === "At Line Item Level and at Transaction Level";
    const hasTransactionDiscount = discountType === "At Transaction Level" || discountType === "At Line Item Level and at Transaction Level";
    
    // Calculate line-item discount total (sum of all line-item discounts)
    let lineItemDiscountTotal = 0;
    if (hasLineItemDiscount) {
      recalculatedRows.forEach(row => {
        const baseAmount = parseFloat(row.baseAmount) || 0;
        const lineDiscount = row.lineDiscount || { value: "0", type: "%" };
        if (lineDiscount.value && parseFloat(lineDiscount.value) > 0) {
          if (lineDiscount.type === "%") {
            lineItemDiscountTotal += (baseAmount * parseFloat(lineDiscount.value)) / 100;
          } else {
            lineItemDiscountTotal += parseFloat(lineDiscount.value) || 0;
          }
        }
      });
    }
    
    // Calculate transaction-level discount
    let transactionDiscountAmount = 0;
    if (hasTransactionDiscount && discount.value && parseFloat(discount.value) > 0) {
      // For transaction-level discount, calculate on subtotal (which may already include line-item discounts)
      const discountBase = hasLineItemDiscount ? subTotal : recalculatedRows.reduce((sum, row) => sum + (parseFloat(row.baseAmount) || 0), 0);
      
      if (applyDiscountAfterTax) {
        // Will calculate after tax is determined
        transactionDiscountAmount = 0;
      } else {
        // Discount applied before tax - calculate now
        if (discount.type === "%") {
          transactionDiscountAmount = (discountBase * parseFloat(discount.value)) / 100;
        } else {
          transactionDiscountAmount = parseFloat(discount.value) || 0;
        }
      }
    }

    // RECALCULATE TAX if transaction discount is applied before tax (Zoho behavior)
    // In Zoho, when transaction discount is before tax, tax is calculated on the amount AFTER transaction discount
    let totalTax = calculatedTotalTax;
    let finalTaxBreakdown = taxBreakdown;
    
    if (discountType === "At Line Item Level and at Transaction Level" && 
        hasTransactionDiscount && 
        discount.value && 
        parseFloat(discount.value) > 0 && 
        !applyDiscountAfterTax &&
        subTotal > 0) {
      
      // Recalculate tax on the amount after transaction discount (Zoho behavior)
      // Distribute transaction discount proportionally to each line item
      const cgstMapRecalc = new Map();
      const sgstMapRecalc = new Map();
      const igstMapRecalc = new Map();
      
      recalculatedRows.forEach((row) => {
        const rowSubtotal = parseFloat(row.discountedAmount) || 0;
        // Calculate proportional transaction discount for this row
        const rowDiscountRatio = subTotal > 0 ? (rowSubtotal / subTotal) : 0;
        const rowTransactionDiscount = transactionDiscountAmount * rowDiscountRatio;
        const rowAmountAfterTransactionDiscount = Math.max(0, rowSubtotal - rowTransactionDiscount);
        
        // Recalculate tax on the new amount after transaction discount
        if (row.taxPercent > 0 && rowAmountAfterTransactionDiscount > 0) {
          let cgstPercent = 0;
          let sgstPercent = 0;
          let igstPercent = 0;
          
          if (row.isInterState) {
            igstPercent = row.taxPercent;
          } else {
            cgstPercent = row.taxPercent / 2;
            sgstPercent = row.taxPercent / 2;
          }
          
          // Calculate tax on amount after transaction discount
          if (row.isInterState && igstPercent > 0) {
            const igstAmount = Math.round((rowAmountAfterTransactionDiscount * igstPercent / 100) * 100) / 100;
            if (igstAmount > 0) {
              if (igstMapRecalc.has(igstPercent)) {
                igstMapRecalc.get(igstPercent).amount += igstAmount;
              } else {
                igstMapRecalc.set(igstPercent, { rate: igstPercent, amount: igstAmount });
              }
            }
          } else if (!row.isInterState && (cgstPercent > 0 || sgstPercent > 0)) {
            const cgstAmount = Math.round((rowAmountAfterTransactionDiscount * cgstPercent / 100) * 100) / 100;
            const sgstAmount = Math.round((rowAmountAfterTransactionDiscount * sgstPercent / 100) * 100) / 100;
            
            if (cgstAmount > 0) {
              if (cgstMapRecalc.has(cgstPercent)) {
                cgstMapRecalc.get(cgstPercent).amount += cgstAmount;
              } else {
                cgstMapRecalc.set(cgstPercent, { rate: cgstPercent, amount: cgstAmount });
              }
            }
            
            if (sgstAmount > 0) {
              if (sgstMapRecalc.has(sgstPercent)) {
                sgstMapRecalc.get(sgstPercent).amount += sgstAmount;
              } else {
                sgstMapRecalc.set(sgstPercent, { rate: sgstPercent, amount: sgstAmount });
              }
            }
          }
        }
      });
      
      // Convert maps to arrays for tax breakdown
      finalTaxBreakdown = [
        ...Array.from(cgstMapRecalc.values()).map(item => ({ type: 'CGST', rate: item.rate, amount: parseFloat(item.amount.toFixed(2)) })),
        ...Array.from(sgstMapRecalc.values()).map(item => ({ type: 'SGST', rate: item.rate, amount: parseFloat(item.amount.toFixed(2)) })),
        ...Array.from(igstMapRecalc.values()).map(item => ({ type: 'IGST', rate: item.rate, amount: parseFloat(item.amount.toFixed(2)) })),
      ].sort((a, b) => {
        const typeOrder = { 'CGST': 0, 'SGST': 1, 'IGST': 2 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
          return typeOrder[a.type] - typeOrder[b.type];
        }
        return a.rate - b.rate;
      });
      
      // Recalculate total tax
      calculatedTotalTax = finalTaxBreakdown.reduce((sum, tax) => sum + tax.amount, 0);
      calculatedTotalTax = parseFloat(calculatedTotalTax.toFixed(2));
      totalTax = calculatedTotalTax;
    }

    // Use manual override if set, otherwise use calculated value
    totalTax = (totalTaxAmount && parseFloat(totalTaxAmount) > 0) 
      ? parseFloat(totalTaxAmount) 
      : totalTax;
    
    // Recalculate transaction discount if applied after tax
    if (hasTransactionDiscount && discount.value && parseFloat(discount.value) > 0 && applyDiscountAfterTax) {
      if (discount.type === "%") {
        transactionDiscountAmount = ((subTotal + totalTax) * parseFloat(discount.value)) / 100;
      } else {
        transactionDiscountAmount = parseFloat(discount.value) || 0;
      }
    }
    
    // Total discount amount to display
    // For "At Line Item Level and at Transaction Level": show transaction discount (line-item is already in subtotal)
    const discountAmount = hasLineItemDiscount && !hasTransactionDiscount 
      ? lineItemDiscountTotal 
      : transactionDiscountAmount;

    // Calculate TDS/TCS
    // Zoho Books TDS calculation: TDS is calculated on Subtotal (before tax)
    // If discount applies before tax, use discounted subtotal; if after tax, use original subtotal
    let tdsTcsAmount = 0;
    if (tdsTcsTax) {
      // Check both regular tax options and TDS options
      const allTdsTcsOptions = [...taxOptions, ...tdsOptions];
      const selectedTdsTcsTax = allTdsTcsOptions.find(t => t.id === tdsTcsTax);
      if (selectedTdsTcsTax && selectedTdsTcsTax.rate !== undefined) {
        // Calculate base amount for TDS calculation (Zoho calculates TDS on subtotal only)
        let baseAmountForTds = 0;
        
        if (applyDiscountAfterTax) {
          // Discount applied after tax: TDS base = subtotal (discount not applied to subtotal yet)
          baseAmountForTds = subTotal;
        } else {
          // Discount applied before tax: subtotal already includes discount
          // TDS base = discounted subtotal
          baseAmountForTds = subTotal;
        }
        
        // Calculate TDS amount: base amount × TDS rate / 100
        tdsTcsAmount = (baseAmountForTds * selectedTdsTcsTax.rate) / 100;
      }
    }

    // Calculate adjustment
    const adjustmentAmount = parseFloat(adjustment) || 0;

    // Calculate final total (Zoho Books formula)
    let finalTotal = 0;
    
    if (discountType === "At Line Item Level and at Transaction Level") {
      // Both line-item and transaction discounts
      // Subtotal already includes line-item discounts (row.discountedAmount)
      // Transaction-level discount needs to be applied separately
      if (applyDiscountAfterTax) {
        // Transaction discount applied after tax: (subtotal + tax) - transactionDiscount - tds/tcs + adjustment
        finalTotal = (subTotal + totalTax) - transactionDiscountAmount - tdsTcsAmount + adjustmentAmount;
      } else {
        // Transaction discount applied before tax: subtotal already has line-item discounts
        // Apply transaction discount to subtotal, then add tax
        // subtotal - transactionDiscount + tax - tds/tcs + adjustment
        const subtotalAfterTransactionDiscount = subTotal - transactionDiscountAmount;
        finalTotal = subtotalAfterTransactionDiscount + totalTax - tdsTcsAmount + adjustmentAmount;
      }
    } else if (applyDiscountAfterTax) {
      // Discount applied after tax: subtotal + tax - discount - tds/tcs + adjustment
      finalTotal = subTotal + totalTax - discountAmount - tdsTcsAmount + adjustmentAmount;
    } else {
      // Discount applied before tax: subtotal already includes discount, so just add tax
      // subtotal = sum of discountedAmount, so: subtotal + tax - tds/tcs + adjustment
      finalTotal = subTotal + totalTax - tdsTcsAmount + adjustmentAmount;
    }

    return {
      subTotal: subTotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxBreakdown: finalTaxBreakdown, // Use recalculated tax breakdown if transaction discount was applied before tax
      totalTax: totalTax,
      calculatedTotalTax: calculatedTotalTax, // For display in input field
      tdsTcsAmount: tdsTcsAmount.toFixed(2),
      adjustmentAmount: adjustmentAmount.toFixed(2),
      finalTotal: finalTotal.toFixed(2)
    };
  };

  // Recalculate all rows when discount changes (using useCallback to avoid infinite loop)
  useEffect(() => {
    if (tableRows.length === 0) return;
    
    const allTaxOptions = [...taxOptions, ...nonTaxableOptions];
    const useLineDiscount = discountType === "At Line Item Level" || discountType === "At Line Item Level and at Transaction Level";
    const discountConfig = {
      value: discount.value,
      type: discount.type,
      applyAfterTax: applyDiscountAfterTax,
      useLineDiscount: useLineDiscount,
    };

    setTableRows(prevRows => 
      prevRows.map(row => {
        const gstCalculation = calculateGSTLineItem(row, discountConfig, allTaxOptions);
        return {
          ...row,
          ...gstCalculation,
          // Amount column shows base amount (quantity × rate) - does NOT change with discount
          amount: gstCalculation.baseAmount,
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discount.value, discount.type, applyDiscountAfterTax, discountType]);

  // Ensure totals are recalculated when tableRows changes (especially when tax changes)
  // This is handled by calculateTotals() which is called on every render and uses tableRows
  // But we add a key or state update to ensure React detects the change

  const totals = calculateTotals();

  // Save purchase order to MongoDB
  const handleSavePurchaseOrder = async (status) => {
    // Validate required fields
    if (!orderNumber || !date || !selectedVendor) {
      alert("Please fill in all required fields: Purchase Order#, Date, and Vendor Name");
      return;
    }

    setSaving(true);
    try {
      const locCode = currentuser?.locCode || "";

      if (!userId) {
        alert("User not logged in. Please log in to save purchase orders.");
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

      const dateObj = parseDate(date);
      const deliveryDateObj = deliveryDate ? parseDate(deliveryDate) : null;

      // Prepare items array
      const items = tableRows.map(row => ({
        itemId: row.itemData?._id || null,
        itemName: row.itemData?.itemName || row.item || "",
        itemSku: row.itemData?.sku || row.itemData?.itemSku || "", // Include SKU for better matching
        itemDescription: row.itemDescription || "",
        account: row.account || "",
        size: row.size || "",
        quantity: parseFloat(row.quantity) || 0,
        rate: parseFloat(row.rate) || 0,
        tax: row.tax || "",
        amount: parseFloat(row.amount) || 0,
        baseAmount: parseFloat(row.baseAmount) || 0,
        discountedAmount: parseFloat(row.discountedAmount) || 0,
        cgstAmount: parseFloat(row.cgstAmount) || 0,
        sgstAmount: parseFloat(row.sgstAmount) || 0,
        igstAmount: parseFloat(row.igstAmount) || 0,
        // Include itemGroupId if available (for items from groups)
        itemGroupId: row.itemData?.itemGroupId || null,
        lineTaxTotal: parseFloat(row.lineTaxTotal) || 0,
        lineTotal: parseFloat(row.lineTotal) || 0,
        taxCode: row.taxCode || "",
        taxPercent: row.taxPercent || 0,
        cgstPercent: row.cgstPercent || 0,
        sgstPercent: row.sgstPercent || 0,
        igstPercent: row.igstPercent || 0,
        isInterState: row.isInterState || false,
        // Line item discount fields
        lineDiscount: row.lineDiscount || { value: "0", type: "%" },
        lineDiscountAccount: row.lineDiscountAccount || "",
      }));

      // Format delivery address from selectedAddress
      const deliveryAddress = selectedAddress ? {
        attention: selectedAddress.attention || "",
        street1: selectedAddress.street1 || selectedAddress.street || "",
        street2: selectedAddress.street2 || "",
        city: selectedAddress.city || "",
        state: selectedAddress.state || "",
        zip: selectedAddress.zip || selectedAddress.pinCode || "",
        country: selectedAddress.country || "",
        phone: selectedAddress.phone || "",
      } : {};

      // Prepare purchase order data
      const orderData = {
        vendorId: selectedVendor._id || selectedVendor.id || null,
        vendorName: selectedVendor.displayName || selectedVendor.companyName || "",
        branch: branch,
        orderNumber: orderNumber,
        referenceNumber: referenceNumber || "",
        date: dateObj,
        deliveryDate: deliveryDateObj,
        paymentTerms: paymentTerms,
        shipmentPreference: shipmentPreference || "",
        deliveryAddress: deliveryAddress,
        items: items,
        discountType: discountType,
        discount: {
          value: discount.value,
          type: discount.type,
        },
        tableDiscountAccount: tableDiscountAccount || "", // For "At Line Item Level"
        transactionDiscountAccount: transactionDiscountAccount || "", // For "At Line Item Level and at Transaction Level"
        applyDiscountAfterTax: applyDiscountAfterTax,
        totalTaxAmount: parseFloat(totalTaxAmount) || parseFloat(totals.totalTax) || 0,
        tdsTcsType: tdsTcsType,
        tdsTcsTax: tdsTcsTax || "",
        tdsTcsAmount: parseFloat(totals.tdsTcsAmount) || 0,
        adjustment: parseFloat(adjustment) || 0,
        subTotal: parseFloat(totals.subTotal) || 0,
        discountAmount: parseFloat(totals.discountAmount) || 0,
        totalTax: parseFloat(totals.totalTax) || 0,
        finalTotal: parseFloat(totals.finalTotal) || 0,
        customerNotes: customerNotes || "",
        termsAndConditions: termsAndConditions || "",
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
        status: status, // "draft" or "sent"
      };

      // Save to MongoDB ONLY - no localStorage
      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode ? `${API_URL}/api/purchase/orders/${id}` : `${API_URL}/api/purchase/orders`;
      console.log(`${isEditMode ? "Updating" : "Saving"} purchase order to MongoDB:`, orderData.orderNumber, "userId:", userId);
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        let errorMessage = "Failed to save purchase order";
        let existingOrder = null;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          existingOrder = errorData.existingOrder;
          
          // If order already exists, navigate to it instead of showing error
          if (response.status === 409 && existingOrder && existingOrder._id) {
            alert(`Purchase Order ${orderNumber} already exists. Redirecting to existing order...`);
            navigate(`/purchase/orders/${existingOrder._id}`);
            setSaving(false);
            return;
          }
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        console.error("Failed to save purchase order:", errorMessage);
        throw new Error(errorMessage);
      }

      const savedOrder = await response.json();
      console.log(`Purchase order ${isEditMode ? "updated" : "saved"} successfully to MongoDB:`, savedOrder._id);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event("orderSaved"));
      
      alert(`Purchase Order ${isEditMode ? "updated" : "saved"} successfully as ${status === "draft" ? "Draft" : "Sent"}`);
      if (isEditMode) {
        navigate(`/purchase/orders/${id}`);
      } else {
        navigate("/purchase/orders");
      }
    } catch (error) {
      console.error("Error saving purchase order:", error);
      alert(error.message || "Failed to save purchase order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Enter key to save purchase order
  useEnterToSave(() => handleSavePurchaseOrder("sent"), saving);

  return (
    <div className={`transition-all duration-300 min-h-screen bg-[#f8f9fa] p-6 overflow-visible relative ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            {isEditMode ? "Edit Purchase Order" : "New Purchase Order"}
          </h1>
        </div>
        <Link
          to={isEditMode ? `/purchase/orders/${id}` : "/purchase/orders"}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#9333ea] bg-white border border-[#e9d5ff] rounded-lg hover:bg-[#faf5ff] transition-colors shadow-sm"
        >
          <X size={14} className="text-[#9333ea]" />
          Close
        </Link>
      </div>

      {/* ── Main white card ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7 space-y-6 overflow-visible mb-6">
        {/* ── Two-column form ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Vendor Name + Branch */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Vendor Name</Label>
                <VendorDropdown
                  value={selectedVendor}
                  onChange={(vendor) => setSelectedVendor(vendor)}
                  onNewVendor={() => navigate("/purchase/vendors/new")}
                />
              </div>
              <div>
                <Label required>Branch</Label>
                <CompactDropdown
                  value={branch}
                  onChange={setBranch}
                  options={branchOptions}
                  placeholder="Warehouse"
                />
              </div>
            </div>

            {/* Bill Summary */}
            <div className="pt-2">
              <div className="text-xs font-bold text-[#a855f7] tracking-wider uppercase mb-2.5">
                BILL SUMMARY
              </div>
              <div className="flex items-center gap-6 mb-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="deliveryTo" defaultChecked className="accent-[#9333ea] h-4 w-4" />
                  Warehouse
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="deliveryTo" className="accent-[#9333ea] h-4 w-4" />
                  Customer
                </label>
              </div>

              {/* Branch dropdown */}
              <div className="mb-3">
                <Label required>Branch</Label>
                <CompactDropdown
                  options={warehouseSelectOptions}
                  placeholder="Select a warehouse"
                />
              </div>

              {/* Address display + Change button */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-[42px] border border-gray-200 rounded-xl px-3.5 flex items-center text-sm text-gray-700 bg-white truncate">
                  {loading ? "Loading..." : selectedAddress && formatAddress(selectedAddress).length > 0
                    ? formatAddress(selectedAddress)[0]
                    : "Kerala, India, 7593838720"}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="h-[42px] px-5 text-xs font-semibold text-white bg-[#9333ea] hover:bg-[#7e22ce] rounded-xl cursor-pointer whitespace-nowrap shadow-sm transition-colors"
                >
                  Change Designation to Deliver
                </button>
              </div>
            </div>

            {/* GST details (if vendor selected) */}
            {selectedVendor && (selectedVendor.gstTreatment || selectedVendor.gstin) && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                {selectedVendor.gstTreatment && (
                  <div>
                    <Label>GST Treatment</Label>
                    <div className="h-[42px] border border-gray-200 rounded-xl px-3.5 flex items-center text-sm text-gray-700 bg-gray-50">
                      {selectedVendor.gstTreatment}
                    </div>
                  </div>
                )}
                {selectedVendor.gstin && (
                  <div>
                    <Label>GSTIN</Label>
                    <div className="h-[42px] border border-gray-200 rounded-xl px-3.5 flex items-center text-sm text-gray-700 bg-gray-50">
                      {selectedVendor.gstin}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-3.5">
            {/* Purchase Order # */}
            <div>
              <Label required>Purchase Order</Label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={orderNumberLoading ? "Generating..." : orderNumber}
                  onChange={(e) => { if (!isEditMode) return; setOrderNumber(e.target.value); }}
                  readOnly={!isEditMode}
                  disabled={orderNumberLoading}
                  className="flex-1 h-[42px] px-3.5 text-sm text-gray-800 rounded-xl border border-gray-200 bg-white focus:border-[#9333ea] focus:outline-none transition-colors"
                  placeholder="PO-00017"
                />
                <button
                  type="button"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                  className="h-[42px] w-[42px] rounded-xl text-white bg-[#9333ea] hover:bg-[#7e22ce] shrink-0 shadow-sm transition-colors cursor-pointer"
                  disabled={orderNumberLoading}
                  title="Settings"
                >
                  <Settings size={18} className="shrink-0" />
                </button>
              </div>
            </div>

            {/* Reference # */}
            <div>
              <Label>Reference #</Label>
              <CompactDropdown
                value={referenceNumber}
                onChange={setReferenceNumber}
                options={["Warehouse", "REF-001", "REF-002"]}
                placeholder="Warehouse"
              />
            </div>

            {/* Date */}
            <div>
              <Label required>Date</Label>
              <div className="flex items-center h-[42px] border border-gray-200 rounded-xl bg-white px-3.5 focus-within:border-[#9333ea] transition-colors">
                <input
                  type="text"
                  placeholder="28-08-2026"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 h-full text-sm text-gray-800 border-0 outline-none bg-transparent"
                />
                <svg className="w-4 h-4 text-gray-500 shrink-0 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
            </div>

            {/* Delivery Date */}
            <div>
              <Label required>Delivery Date</Label>
              <div className="flex items-center h-[42px] border border-gray-200 rounded-xl bg-white px-3.5 focus-within:border-[#9333ea] transition-colors">
                <input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="flex-1 h-full text-sm text-gray-800 placeholder:text-gray-400 border-0 outline-none bg-transparent"
                />
                <svg className="w-4 h-4 text-gray-500 shrink-0 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <Label required>Payment Terms</Label>
              <CompactDropdown
                value={paymentTerms}
                onChange={setPaymentTerms}
                options={paymentTermOptions}
                placeholder="Due on Receipt"
              />
            </div>

            {/* Shipment Preference */}
            <div>
              <Label required>Shipment Preference</Label>
              <CompactDropdown
                value={shipmentPreference}
                onChange={setShipmentPreference}
                options={shipmentPreferenceOptions}
                placeholder="Choose the shipment preference or type to add"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Warehouse / discount toolbar ── */}
      <div className="flex items-center gap-3 my-4">
        <CompactDropdown
          className="w-36"
          options={branchOptions}
          placeholder="Warehouse"
          value="Warehouse"
        />
        <CompactDropdown
          className="w-48"
          options={warehouseSelectOptions}
          placeholder="Select a Warehouse"
        />
        <CompactDropdown
          className="w-52"
          value={discountType}
          onChange={setDiscountType}
          options={discountOptions}
          placeholder="At Transaction Level"
        />
        {discountType === "At Line Item Level" && (
          <CompactDropdown
            className="w-56"
            value={tableDiscountAccount}
            onChange={setTableDiscountAccount}
            options={discountAccountOptions}
            placeholder="Select Discount Account"
          />
        )}
      </div>

      {/* ── Item table ── */}
      <div className="bg-white border border-gray-200 rounded-none overflow-visible shadow-sm">
        {/* Dark table header */}
        <div className="bg-[#181920] flex items-center px-4 py-3 text-white text-[11px] font-bold uppercase tracking-wider">
          <div className="w-9 shrink-0 flex items-center justify-center">
            <input type="checkbox" className="h-4 w-4 rounded accent-[#9333ea] cursor-pointer" />
          </div>
          <div className="flex-1 min-w-[200px] px-2 text-left">ITEM DETAILS</div>
          <div className="w-36 px-2 text-left">ACCOUNT</div>
          <div className="w-28 px-2 text-center">SIZE</div>
          <div className="w-28 px-2 text-center">QUANTITY</div>
          <div className="w-28 px-2 text-center">RATE</div>
          <div className="w-36 px-2 text-left">TAX</div>
          <div className="w-28 px-2 text-right">AMOUNT</div>
          <div className="w-12 shrink-0" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100 overflow-visible bg-white">
          {tableRows.map((row) => (
            <div key={row.id} className="flex items-center px-4 py-3 gap-0 overflow-visible hover:bg-gray-50/50 transition-colors">
              {/* Checkbox */}
              <div className="w-9 shrink-0 flex items-center justify-center">
                <input type="checkbox" className="h-4 w-4 rounded accent-[#9333ea] cursor-pointer" />
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-[200px] px-2 relative overflow-visible">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-gray-200 overflow-hidden">
                    <ImageIcon size={16} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <ItemDropdown
                      rowId={row.id}
                      value={row.itemData || row.item}
                      description={row.itemDescription || ""}
                      onDescriptionChange={(desc) => handleUpdateRow(row.id, "itemDescription", desc)}
                      onChange={(value) => handleUpdateRow(row.id, "item", value)}
                      onNewItem={() => navigate("/shoe-sales/items/new")}
                    />
                  </div>
                </div>
              </div>

              {/* Account */}
              <div className="w-36 px-2 relative overflow-visible">
                <CompactDropdown
                  value={row.account}
                  onChange={(val) => handleUpdateRow(row.id, "account", val)}
                  options={accountOptions}
                  placeholder="Select an account"
                />
              </div>

              {/* Size */}
              <div className="w-28 px-2">
                <div className="h-[42px] px-2.5 rounded-xl border border-gray-200 bg-white flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(row.size) || 0;
                      handleUpdateRow(row.id, "size", Math.max(0, cur - 1));
                    }}
                    className="text-gray-400 hover:text-gray-700 px-1 text-sm font-medium cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    value={row.size || 0}
                    onChange={(e) => handleUpdateRow(row.id, "size", e.target.value)}
                    className="w-8 text-center text-sm font-medium text-gray-700 bg-transparent border-none outline-none p-0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(row.size) || 0;
                      handleUpdateRow(row.id, "size", cur + 1);
                    }}
                    className="text-gray-400 hover:text-gray-700 px-1 text-sm font-medium cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="w-28 px-2">
                <input
                  type="text"
                  value={row.quantity}
                  onChange={(e) => handleUpdateRow(row.id, "quantity", e.target.value)}
                  placeholder="0.00"
                  className="w-full h-[42px] rounded-xl border border-gray-200 bg-white text-sm text-gray-700 text-center focus:border-[#9333ea] focus:outline-none transition-colors"
                />
              </div>

              {/* Rate */}
              <div className="w-28 px-2">
                <input
                  type="text"
                  value={row.rate}
                  onChange={(e) => handleUpdateRow(row.id, "rate", e.target.value)}
                  placeholder="0.00"
                  className="w-full h-[42px] rounded-xl border border-gray-200 bg-white text-sm text-gray-700 text-center focus:border-[#9333ea] focus:outline-none transition-colors"
                />
              </div>

              {/* Tax */}
              <div className="w-36 px-2 relative overflow-visible">
                <TaxDropdown
                  rowId={row.id}
                  value={row.tax}
                  onChange={(value) => handleUpdateRow(row.id, "tax", value)}
                  taxOptions={taxOptions}
                  nonTaxableOptions={nonTaxableOptions}
                  onNewTax={() => setShowNewTaxModal(true)}
                />
              </div>

              {/* Amount */}
              <div className="w-28 px-2 text-right text-sm font-bold text-gray-800">
                ₹{row.amount || "0.00"}
              </div>

              {/* Delete */}
              <div className="w-12 shrink-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleDeleteRow(row.id)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                  className="w-[38px] h-[38px] rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 transition-colors cursor-pointer"
                  title="Delete Row"
                >
                  <Trash2 size={15} className="shrink-0" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add row buttons */}
        <div className="flex items-center gap-3 p-4 bg-white border-t border-gray-100">
          <button
            type="button"
            onClick={handleAddNewRow}
            className="h-[38px] px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Add Row
          </button>
          <button
            type="button"
            className="h-[38px] px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Add Bulk Items
          </button>
        </div>
      </div>

      {/* Totals section */}
          <div className="mt-8 overflow-visible">
            <div className="flex justify-end">
              <div className="w-full max-w-[400px]">
                <div className="rounded-2xl border border-[#edf1ff] bg-white p-6">
                {/* Sub Total */}
                <div className="flex items-center justify-between text-base font-semibold text-[#111827] mb-4">
                  <span>Sub Total</span>
                  <span>{totals.subTotal}</span>
                </div>

                {/* Discount Section - Show for "At Transaction Level" and "At Line Item Level and at Transaction Level" */}
                {(discountType === "At Transaction Level" || discountType === "At Line Item Level and at Transaction Level") && (
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#111827]">Discount</span>
                      <div className="flex items-center gap-2">
                        <Input 
                          className="w-20 text-sm text-right" 
                          value={discount.value}
                          onChange={(e) => setDiscount({ ...discount, value: e.target.value })}
                        />
                        <Select 
                          className="w-16 text-sm"
                          value={discount.type}
                          onChange={(e) => setDiscount({ ...discount, type: e.target.value })}
                        >
                          <option>%</option>
                          <option>₹</option>
                        </Select>
                      </div>
                      <span className="text-sm text-[#64748b] w-20 text-right">{totals.discountAmount}</span>
                    </div>
                    {/* Show Discount Account dropdown for "At Line Item Level and at Transaction Level" */}
                    {discountType === "At Line Item Level and at Transaction Level" && (
                      <div className="space-y-2">
                        <Label>Discount Account*</Label>
                        <Select
                          value={transactionDiscountAccount}
                          onChange={(e) => setTransactionDiscountAccount(e.target.value)}
                          className="w-full text-sm"
                        >
                          <option value="">Select Discount Account</option>
                          {discountAccountOptions.map((account) => (
                            <option key={account} value={account}>
                              {account}
                            </option>
                          ))}
                        </Select>
                        <p className="text-xs text-[#64748b]">You can create a new account with type as Expense or Other Expense.</p>
                      </div>
                    )}
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setApplyDiscountAfterTax(!applyDiscountAfterTax)}
                        className={`text-xs ${applyDiscountAfterTax ? 'text-[#2563eb] font-medium' : 'text-[#64748b]'} hover:text-[#2563eb] hover:underline underline-offset-4 transition-colors`}
                      >
                        Apply after tax
                      </button>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-[#eef2ff] my-4"></div>

                {/* Tax Details - CGST & SGST (Aggregated by rate) */}
                {totals.taxBreakdown.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {totals.taxBreakdown.map((tax, idx) => {
                      const taxType = tax.type; // 'CGST', 'SGST', or 'IGST'
                      const taxRate = tax.rate;
                      const taxAmount = tax.amount;
                      
                      // Format rate display (handle decimal rates like 2.5, 9, etc.)
                      const rateDisplay = taxRate % 1 === 0 ? taxRate.toFixed(0) : taxRate.toFixed(1);
                      
                      return (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm text-[#64748b]">
                            {taxType}{rateDisplay} [{rateDisplay}%]
                          </span>
                          <span className="text-sm text-[#111827]">{taxAmount.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Total Tax Amount */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-[#111827]">Total Tax Amount</span>
                  <div className="flex items-center gap-2">
                    <Input 
                      className="w-24 text-sm text-right" 
                      value={totalTaxAmount || (totals.calculatedTotalTax > 0 ? totals.calculatedTotalTax.toFixed(2) : "")}
                      onChange={(e) => setTotalTaxAmount(e.target.value)}
                    />
                    <button
                      type="button"
                      className="text-xs text-[#2563eb] hover:text-[#1d4ed8] hover:underline underline-offset-4 transition-colors"
                      title="Edit tax amount"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-[#eef2ff] my-4"></div>

                {/* TDS/TCS Section */}
                <div className="space-y-3 mb-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tdsTcsType"
                          value="TDS"
                          checked={tdsTcsType === "TDS"}
                          onChange={(e) => {
                            setTdsTcsType(e.target.value);
                            setTdsTcsTax(""); // Reset tax selection when switching type
                          }}
                          className="text-[#2563eb] focus:ring-[#2563eb]"
                        />
                        <span className="text-sm text-[#111827]">TDS</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tdsTcsType"
                          value="TCS"
                          checked={tdsTcsType === "TCS"}
                          onChange={(e) => {
                            setTdsTcsType(e.target.value);
                            setTdsTcsTax(""); // Reset tax selection when switching type
                          }}
                          className="text-[#2563eb] focus:ring-[#2563eb]"
                        />
                        <span className="text-sm text-[#111827]">TCS</span>
                      </label>
                    </div>

                    {/* TDS/TCS Dropdown - Full Width */}
                    <div className="w-full mb-2">
                      <TaxDropdown
                        rowId="tds-tcs"
                        value={tdsTcsTax}
                        onChange={setTdsTcsTax}
                        taxOptions={tdsTcsType === "TDS" ? tdsOptions : taxOptions}
                        nonTaxableOptions={tdsTcsType === "TDS" ? [] : nonTaxableOptions}
                        onNewTax={() => setShowNewTaxModal(true)}
                      />
                    </div>

                    {/* TDS/TCS Amount - On separate line, right-aligned */}
                    <div className="flex items-center justify-end">
                      <span className="text-sm text-[#64748b] text-right whitespace-nowrap font-medium">
                        {totals.tdsTcsAmount > 0 ? `- ${totals.tdsTcsAmount}` : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Adjustment */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-sm font-medium text-[#111827]">Adjustment</span>
                  <div className="flex items-center gap-2">
                    <Input 
                      className="w-24 text-sm text-right border-dashed" 
                      value={adjustment}
                      onChange={(e) => setAdjustment(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <span className="text-sm text-[#64748b] w-20 text-right">{totals.adjustmentAmount}</span>
                </div>

                {/* Divider */}
                <div className="border-t border-[#eef2ff] my-4"></div>

                {/* Total */}
                <div className="flex items-center justify-between text-base font-semibold text-[#111827]">
                  <span>Total</span>
                  <span>{totals.finalTotal}</span>
                </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attach Files Section */}
          <div className="mt-8">
            <div className="rounded-xl border border-[#e6eafb] p-4">
              <div className="text-sm font-medium text-[#475569]">Attach Files to Purchase Order</div>
              <div className="mt-4">
                <ImageUpload
                  onImagesSelect={(files) => setAttachments(files)}
                  existingImages={attachments}
                  onRemoveImage={(index) => {
                    setAttachments(attachments.filter((_, i) => i !== index));
                  }}
                  multiple={true}
                />
              </div>
              <p className="mt-2 text-[11px] text-[#94a3b8]">You can upload a maximum of 15 files, 5MB each</p>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center gap-3 mt-6 bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
            <button 
              type="button"
              onClick={() => handleSavePurchaseOrder("draft")}
              disabled={saving}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? "Saving..." : "Save as Draft"}
            </button>
            <button 
              type="button"
              onClick={() => handleSavePurchaseOrder("sent")}
              disabled={saving}
              className="rounded-xl bg-[#9333ea] hover:bg-[#7e22ce] px-5 py-2.5 text-xs font-semibold text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? "Saving..." : "Save and Send"}
            </button>
            <Link
              to="/purchase/orders"
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>

      {/* Address Selection Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#e1e5f5] bg-white shadow-[0_25px_80px_-45px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-[#e7ebf8] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#1f2937]">Change destination to deliver</h2>
              <button
                onClick={() => setShowAddressModal(false)}
                className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f1f5f9] hover:text-[#475569] transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[450px] overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {addresses.filter(addr => addr).map((address) => {
                  const addressId = address._id || address.id;
                  if (!addressId) return null;
                  return (
                    <div
                      key={addressId}
                      onClick={() => handleSelectAddress(addressId)}
                      className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                        selectedAddressId === addressId
                          ? "border-[#d7dcf5] bg-[#f8fafc] shadow-sm"
                          : "border-[#d7dcf5] bg-white hover:border-[#d7dcf5] hover:bg-[#f8fafc] hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium leading-relaxed text-[#1f2937]">
                            {address && formatAddress(address).length > 0 ? (
                              <div className="space-y-0.5">
                                {formatAddress(address).map((line, index) => (
                                  <div key={index} className={index === 0 && address.attention ? "font-bold" : ""}>
                                    {line}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div>No address details</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAddress(address);
                            }}
                            className="rounded-md p-1.5 text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#1f2937] transition-colors"
                            aria-label="Edit address"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(addressId);
                            }}
                            className="rounded-md p-1.5 text-[#64748b] hover:bg-[#fee2e2] hover:text-[#ef4444] transition-colors"
                            aria-label="Delete address"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleNewAddressClick}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#d7dcf5] bg-[#fafbff] px-4 py-3 text-sm font-semibold text-[#475569] hover:border-[#d7dcf5] hover:bg-[#f8fafc] transition-all"
              >
                <Plus size={18} />
                New Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Address Modal */}
      {showNewAddressModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[#e1e5f5] bg-white shadow-[0_25px_80px_-45px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-[#e7ebf8] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#1f2937]">
                {editingAddress ? "Edit Address" : "New address"}
              </h2>
              <button
                onClick={() => {
                  setShowNewAddressModal(false);
                  setEditingAddress(null);
                }}
                className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f1f5f9] hover:text-[#475569] transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              <div className="space-y-5">
                <div>
                  <Label>Attention</Label>
                  <Input
                    placeholder=""
                    value={editingAddress ? editingAddress.attention : newAddress.attention}
                    onChange={(e) => {
                      if (editingAddress) {
                        setEditingAddress({ ...editingAddress, attention: e.target.value });
                      } else {
                        setNewAddress({ ...newAddress, attention: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>Street 1</Label>
                  <textarea
                    className="w-full rounded-md border border-[#d7dcf5] px-3 py-2.5 text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] min-h-[70px] resize-none"
                    placeholder="Enter street address"
                    value={editingAddress ? editingAddress.street1 : newAddress.street1}
                    onChange={(e) => {
                      if (editingAddress) {
                        setEditingAddress({ ...editingAddress, street1: e.target.value });
                      } else {
                        setNewAddress({ ...newAddress, street1: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>Street 2</Label>
                  <textarea
                    className="w-full rounded-md border border-[#d7dcf5] px-3 py-2.5 text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] min-h-[70px] resize-none"
                    placeholder="Enter additional address details"
                    value={editingAddress ? editingAddress.street2 : newAddress.street2}
                    onChange={(e) => {
                      if (editingAddress) {
                        setEditingAddress({ ...editingAddress, street2: e.target.value });
                      } else {
                        setNewAddress({ ...newAddress, street2: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    placeholder=""
                    value={editingAddress ? editingAddress.city : newAddress.city}
                    onChange={(e) => {
                      if (editingAddress) {
                        setEditingAddress({ ...editingAddress, city: e.target.value });
                      } else {
                        setNewAddress({ ...newAddress, city: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>State/Province</Label>
                  <Input
                    placeholder=""
                    value={editingAddress ? editingAddress.state : newAddress.state}
                    onChange={(e) => {
                      if (editingAddress) {
                        setEditingAddress({ ...editingAddress, state: e.target.value });
                      } else {
                        setNewAddress({ ...newAddress, state: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>ZIP/Postal Code</Label>
                  <Input
                    placeholder=""
                    value={editingAddress ? editingAddress.zip : newAddress.zip}
                    onChange={(e) => {
                      if (editingAddress) {
                        setEditingAddress({ ...editingAddress, zip: e.target.value });
                      } else {
                        setNewAddress({ ...newAddress, zip: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>Country/Region</Label>
                  <Select
                    value={editingAddress ? editingAddress.country : newAddress.country}
                    onChange={(e) => {
                      if (editingAddress) {
                        setEditingAddress({ ...editingAddress, country: e.target.value });
                      } else {
                        setNewAddress({ ...newAddress, country: e.target.value });
                      }
                    }}
                  >
                    <option value="">Select or type to add</option>
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                  </Select>
                </div>
                <div>
                  <Label>Phone</Label>
                  <div className="flex items-center gap-2">
                    <Select className="w-24">
                      <option>+91</option>
                      <option>+1</option>
                      <option>+44</option>
                    </Select>
                    <Input
                      placeholder=""
                      value={editingAddress ? editingAddress.phone : newAddress.phone}
                      onChange={(e) => {
                        if (editingAddress) {
                          setEditingAddress({ ...editingAddress, phone: e.target.value });
                        } else {
                          setNewAddress({ ...newAddress, phone: e.target.value });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[#e7ebf8] px-6 py-4 bg-[#fafbff]">
              <button
                onClick={() => {
                  setShowNewAddressModal(false);
                  setEditingAddress(null);
                }}
                className="rounded-md border border-[#d7dcf5] bg-white px-5 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingAddress ? handleUpdateAddress : handleAddAddress}
                className="rounded-md border border-[#d7dcf5] bg-white px-5 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#f8fafc] transition-colors shadow-sm"
              >
                Save
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
    </div>
  );
};

export default PurchaseOrderCreate;




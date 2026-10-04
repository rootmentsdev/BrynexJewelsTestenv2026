import { useState, useEffect, useMemo } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import usePreventNumberInputScroll from "../hooks/usePreventNumberInputScroll";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { X, Trash2, Plus, Copy, Package, Store, Check, ArrowLeft, Layers } from "lucide-react";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const API_ROOT = (baseUrl?.baseUrl || "").replace(/\/$/, "");

// Warehouse names for the dropdown - restricted to Warehouse and MG Road
const WAREHOUSES = [
  "Warehouse",
  "MG Road"
];

const StandaloneItemStockManagement = () => {
  const isSidebarOpen = useSidebar();
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stockType = (searchParams.get("type") || "accounting").toLowerCase();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [stockRows, setStockRows] = useState([
    { warehouse: "", openingStock: "0", openingStockValue: "0", physicalOpeningStock: "0" }
  ]);
  const [warehouses, setWarehouses] = useState([]);
  
  // Prevent mouse wheel from changing number input values
  usePreventNumberInputScroll();
  
  // Set warehouses to the specified list
  useEffect(() => {
    // Sort warehouses: "Warehouse" first, then alphabetically
    const sortedWarehouses = [...WAREHOUSES].sort((a, b) => {
      if (a === "Warehouse") return -1;
      if (b === "Warehouse") return 1;
      return a.localeCompare(b);
    });
    setWarehouses(sortedWarehouses);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}?_=${timestamp}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch item");
        }
        
        const data = await response.json();
        setItem(data);
        
        // Load existing warehouse stocks if available
        if (data.warehouseStocks && Array.isArray(data.warehouseStocks) && data.warehouseStocks.length > 0) {
          const existingRows = data.warehouseStocks
            .filter(stock => {
              if (!stock.warehouse || !WAREHOUSES.includes(stock.warehouse)) {
                return false;
              }
              const stockOnHand = parseFloat(stock.stockOnHand) || 0;
              const openingStock = parseFloat(stock.openingStock) || 0;
              const physicalStockOnHand = parseFloat(stock.physicalStockOnHand) || 0;
              const physicalOpeningStock = parseFloat(stock.physicalOpeningStock) || 0;
              
              return stockOnHand > 0 || openingStock > 0 || physicalStockOnHand > 0 || physicalOpeningStock > 0;
            })
            .map(stock => {
              const stockOnHandValue = parseFloat(stock.stockOnHand) || 0;
              const physicalStockOnHandValue = parseFloat(stock.physicalStockOnHand) || 0;
              
              return {
                warehouse: stock.warehouse || "",
                openingStock: stockOnHandValue.toString(),
                openingStockValue: stock.openingStockValue?.toString() || "0",
                physicalOpeningStock: physicalStockOnHandValue.toString()
              };
            });
          
          if (existingRows.length > 0) {
            setStockRows(existingRows);
          }
        }
      } catch (error) {
        console.error("Error fetching item:", error);
        setItem(null);
      }
    };

    if (itemId) {
      fetchData();
    }
  }, [itemId]);

  // Listen for stock update events
  useEffect(() => {
    const handleStockUpdate = (event) => {
      const itemIds = event.detail?.itemIds || [];
      const itemNames = event.detail?.items || [];
      
      const currentItemId = (item?._id || item?.id)?.toString();
      const currentItemName = item?.itemName;
      
      const isAffected = itemIds.some(id => id?.toString() === currentItemId) ||
                        itemNames.some(name => name === currentItemName);
      
      if (isAffected) {
        fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`)
          .then(res => res.json())
          .then(data => {
            setItem(data);
            if (data.warehouseStocks && Array.isArray(data.warehouseStocks) && data.warehouseStocks.length > 0) {
              const existingRows = data.warehouseStocks
                .filter(stock => {
                  if (!stock.warehouse || !WAREHOUSES.includes(stock.warehouse)) {
                    return false;
                  }
                  const stockOnHand = parseFloat(stock.stockOnHand) || 0;
                  const openingStock = parseFloat(stock.openingStock) || 0;
                  const physicalStockOnHand = parseFloat(stock.physicalStockOnHand) || 0;
                  const physicalOpeningStock = parseFloat(stock.physicalOpeningStock) || 0;
                  
                  return stockOnHand > 0 || openingStock > 0 || physicalStockOnHand > 0 || physicalOpeningStock > 0;
                })
                .map(stock => {
                  const stockOnHandValue = parseFloat(stock.stockOnHand) || 0;
                  const physicalStockOnHandValue = parseFloat(stock.physicalStockOnHand) || 0;
                  
                  return {
                    warehouse: stock.warehouse || "",
                    openingStock: stockOnHandValue.toString(),
                    openingStockValue: stock.openingStockValue?.toString() || "0",
                    physicalOpeningStock: physicalStockOnHandValue.toString()
                  };
                });
              
              if (existingRows.length > 0) {
                setStockRows(existingRows);
              }
            }
          })
          .catch(err => console.error("Error refreshing item after stock update:", err));
      }
    };

    window.addEventListener("stockUpdated", handleStockUpdate);
    return () => {
      window.removeEventListener("stockUpdated", handleStockUpdate);
    };
  }, [itemId, item]);

  const handleAddRow = () => {
    setStockRows([...stockRows, { warehouse: "", openingStock: "0", openingStockValue: "0", physicalOpeningStock: "0" }]);
  };

  const handleDeleteRow = (index) => {
    if (stockRows.length > 1) {
      const newRows = stockRows.filter((_, i) => i !== index);
      setStockRows(newRows);
    }
  };

  const handleInputChange = (index, field, value) => {
    const newRows = [...stockRows];
    newRows[index][field] = value;
    setStockRows(newRows);
  };

  const handleCopyToAll = (field) => {
    if (stockRows.length > 0) {
      const value = stockRows[0][field];
      const newRows = stockRows.map(row => ({ ...row, [field]: value }));
      setStockRows(newRows);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    }
  };

  // Quick stats calculations
  const totalStock = useMemo(() => {
    return stockRows.reduce((sum, r) => sum + (parseFloat(r.openingStock) || 0), 0);
  }, [stockRows]);

  const configuredBranchesCount = useMemo(() => {
    return stockRows.filter(r => r.warehouse && r.warehouse.trim() !== "").length;
  }, [stockRows]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const byWarehouse = new Map();

      stockRows
        .filter(row => row.warehouse && row.warehouse.trim() !== "")
        .forEach(row => {
          const opening = parseFloat(row.openingStock) || 0;
          
          if (opening > 0) {
            const current = { warehouse: row.warehouse };

            current.openingStock = opening;
            current.openingStockValue = 0;
            current.stockOnHand = opening;
            current.availableForSale = opening;
            current.physicalOpeningStock = opening;
            current.physicalStockOnHand = opening;
            current.physicalAvailableForSale = opening;

            byWarehouse.set(row.warehouse, current);
          }
        });

      const stockData = Array.from(byWarehouse.values());
      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      const updatePayload = {
        itemName: item.itemName || "",
        sku: item.sku || "",
        type: item.type || "goods",
        unit: item.unit || "",
        hsnCode: item.hsnCode || "",
        manufacturer: item.manufacturer || "",
        brand: item.brand || "",
        taxPreference: item.taxPreference || "taxable",
        taxRateInter: item.taxRateInter || "",
        taxRateIntra: item.taxRateIntra || "",
        inventoryAccount: item.inventoryAccount || "",
        inventoryValuation: item.inventoryValuation || item.inventoryValuationMethod || "",
        costPrice: item.costPrice || 0,
        costAccount: item.costAccount || "",
        preferredVendor: item.preferredVendor || "",
        purchaseDescription: item.purchaseDescription || "",
        sellingPrice: item.sellingPrice || 0,
        salesAccount: item.salesAccount || "",
        salesDescription: item.salesDescription || "",
        dimensions: item.dimensions || "",
        weight: item.weight || "",
        reorderPoint: item.reorderPoint || "",
        trackingMethod: item.trackingMethod || "none",
        trackInventory: item.trackInventory !== undefined ? item.trackInventory : true,
        trackBin: item.trackBin !== undefined ? item.trackBin : false,
        returnable: item.returnable !== undefined ? item.returnable : true,
        sellable: item.sellable !== undefined ? item.sellable : true,
        purchasable: item.purchasable !== undefined ? item.purchasable : true,
        warehouseStocks: stockData,
        changedBy: changedBy,
      };

      const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to save stock data";
        try {
          const payload = JSON.parse(errorText);
          errorMessage = payload?.message || payload?.errors?.join(", ") || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const successMsg = "Stock data saved successfully!";
      navigate(`/shoe-sales/items/${itemId}?stocksUpdated=true&message=${encodeURIComponent(successMsg)}`, { replace: true });
    } catch (error) {
      console.error("Error saving stock:", error);
      alert(error.message || "Failed to save stock data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEnterToSave(() => handleSave(), loading);

  if (!item) {
    return (
      <div className={`transition-all duration-300 p-8 bg-[#f8fafc] min-h-screen ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Package size={24} />
          </div>
          <p className="text-base font-semibold text-slate-800">Item not found</p>
          <p className="text-sm text-slate-500 mt-1">Unable to load item stock details.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-all"
          >
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 p-6 md:p-8 bg-[#f8fafc] min-h-screen ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Main Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_-15px_rgba(0,0,0,0.06)] overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 sm:px-8 py-5 bg-gradient-to-r from-white via-white to-slate-50/50">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Store size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {item.itemName || "Item Stock Management"}
                  </h1>
                  {item.sku && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60">
                      SKU: {item.sku}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  {item.brand && <span>Brand: <strong className="text-slate-700 font-medium">{item.brand}</strong></span>}
                  {item.category && (
                    <>
                      <span>•</span>
                      <span>Category: <strong className="text-slate-700 font-medium">{item.category}</strong></span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/shoe-sales/items/${itemId}`)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs hover:bg-slate-100 hover:text-slate-800 transition-all"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 sm:px-8 py-4 bg-slate-50/60 border-b border-slate-100">
            <div className="bg-white rounded-xl p-3.5 border border-slate-200/70 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Configured Locations</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{configuredBranchesCount} / {warehouses.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Store size={16} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200/70 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Total Stock</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{totalStock} <span className="text-xs font-normal text-slate-400">units</span></p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Package size={16} />
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="p-6 sm:p-8">
            <div className="overflow-hidden rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/90">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 w-1/2">
                        Store / Warehouse
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        <div className="flex items-center justify-between gap-2">
                          <span>Opening Stock</span>
                          <button
                            type="button"
                            onClick={() => handleCopyToAll("openingStock")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all active:scale-95"
                          >
                            {copiedField === "openingStock" ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} className="text-slate-400" />
                                <span>Copy All</span>
                              </>
                            )}
                          </button>
                        </div>
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 w-16">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {stockRows.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <select
                            value={row.warehouse}
                            onChange={(e) => handleInputChange(index, "warehouse", e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-3 focus:ring-slate-100 transition-all shadow-2xs"
                          >
                            <option value="">Select Store</option>
                            {warehouses.map((wh, idx) => (
                              <option key={idx} value={wh}>{wh}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3.5">
                          <input
                            type="number"
                            value={row.openingStock}
                            onChange={(e) => handleInputChange(index, "openingStock", e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-3 focus:ring-slate-100 transition-all shadow-2xs"
                            placeholder="0"
                            step="1"
                          />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {stockRows.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(index)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors mx-auto"
                              title="Delete Row"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add New Row Button */}
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99]"
              >
                <Plus size={16} className="text-slate-500" />
                <span>Add Store Row</span>
              </button>
            </div>

            {/* Footer Actions */}
            <div className="mt-8 flex items-center justify-start gap-3 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-slate-800 hover:shadow disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/shoe-sales/items/${itemId}`)}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandaloneItemStockManagement;


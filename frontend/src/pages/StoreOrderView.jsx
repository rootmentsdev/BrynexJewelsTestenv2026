import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Head from "../components/Head";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";

const StoreOrderView = () => {
  const isSidebarOpen = useSidebar();
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  
  const [loading, setLoading] = useState(true);
  const [storeOrder, setStoreOrder] = useState(null);
  const [error, setError] = useState(null);
  const [itemStocks, setItemStocks] = useState({});
  const [processing, setProcessing] = useState(false);
  
  // Get user info to check if admin
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.power === "admin";
  const isWarehouseUser = user?.power === "warehouse";
  
  useEffect(() => {
    const loadStoreOrder = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/inventory/store-orders/${id}`);
        if (!response.ok) throw new Error("Failed to load store order");
        const data = await response.json();
        setStoreOrder(data);
        
        // Fetch current stock for each item
        if (data.items && data.items.length > 0 && data.storeWarehouse) {
          const stockPromises = data.items.map(async (item) => {
            try {
              const params = new URLSearchParams({ warehouse: data.storeWarehouse });
              
              if (item.itemGroupId) {
                params.append('itemGroupId', item.itemGroupId);
                params.append('itemName', item.itemName);
                if (item.itemSku) params.append('itemSku', item.itemSku);
              } else if (item.itemId) {
                params.append('itemId', item.itemId);
              }
              
              const stockResponse = await fetch(`${API_URL}/api/inventory/store-orders/stock/item?${params}`);
              if (stockResponse.ok) {
                const stockData = await stockResponse.json();
                return {
                  itemKey: item.itemId || `${item.itemGroupId}-${item.itemName}`,
                  stock: stockData.currentQuantity ?? stockData.stockOnHand ?? 0
                };
              }
            } catch (err) {
              console.error(`Error fetching stock for ${item.itemName}:`, err);
            }
            return {
              itemKey: item.itemId || `${item.itemGroupId}-${item.itemName}`,
              stock: 0
            };
          });
          
          const stockResults = await Promise.all(stockPromises);
          const stockMap = {};
          stockResults.forEach(result => {
            stockMap[result.itemKey] = result.stock;
          });
          setItemStocks(stockMap);
        }
      } catch (err) {
        console.error("Error loading store order:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      loadStoreOrder();
    }
  }, [id, API_URL]);
  
  // Listen for status changes from other pages (like StoreOrders list)
  useEffect(() => {
    const handleStatusChange = (event) => {
      console.log("📦 Store order status changed event received in StoreOrderView", event.detail);
      
      const { orderId, status } = event.detail;
      const currentOrderId = storeOrder?._id || storeOrder?.id;
      
      // Check if this is the current order
      if (currentOrderId && orderId?.toString() === currentOrderId?.toString()) {
        console.log("🔄 This store order was updated, refreshing...");
        
        // Refetch the store order data
        fetch(`${API_URL}/api/inventory/store-orders/${id}`)
          .then(res => res.json())
          .then(data => {
            setStoreOrder(data);
            console.log("✅ Store order data refreshed", { newStatus: data.status });
          })
          .catch(err => console.error("Error refreshing store order:", err));
      }
    };

    window.addEventListener("storeOrderStatusChanged", handleStatusChange);
    return () => {
      window.removeEventListener("storeOrderStatusChanged", handleStatusChange);
    };
  }, [id, storeOrder, API_URL]);
  
  // Handle Manual Status Change
  const handleManualStatusChange = async (newStatus) => {
    if (!storeOrder) return;
    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/inventory/store-orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...storeOrder,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update store order status');
      }

      setStoreOrder(prev => ({ ...prev, status: newStatus }));

      // Dispatch event to notify other pages
      window.dispatchEvent(new CustomEvent("storeOrderStatusChanged", {
        detail: {
          orderId: id,
          status: newStatus,
          source: "store-order-view"
        }
      }));
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.message || 'Failed to update status. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Create Transfer Order
  const handleCreateTransferOrder = () => {
    if (!storeOrder) return;
    
    const mappedDestinationWarehouse = mapLocNameToWarehouse(storeOrder.storeWarehouse) || storeOrder.storeWarehouse;
    
    // Store the store order data in sessionStorage to pre-fill transfer order without auto-selecting item groups
    const transferOrderData = {
      sourceWarehouse: "Warehouse", // Always from main warehouse
      destinationWarehouse: mappedDestinationWarehouse,
      reason: `Store Order: ${storeOrder.orderNumber}${storeOrder.reason ? ` - ${storeOrder.reason}` : ''}`,
      storeOrderId: storeOrder._id || storeOrder.id,
      storeOrderNumber: storeOrder.orderNumber,
      requestedItems: (storeOrder.items || []).map(item => ({
        itemId: item.itemId,
        itemGroupId: item.itemGroupId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        quantity: item.quantity,
      })),
    };
    
    sessionStorage.setItem('transferOrderPrefill', JSON.stringify(transferOrderData));
    navigate('/inventory/transfer-orders/new');
  };

  // Handle Reject
  const handleReject = async () => {
    if (!storeOrder) return;
    
    const confirmReject = window.confirm(
      `Are you sure you want to reject Store Order ${storeOrder.orderNumber}?`
    );
    
    if (!confirmReject) return;
    
    await handleManualStatusChange('rejected');
  };
  
  if (loading) {
    return (
      <div className={`transition-all duration-300 p-6 bg-[#f5f7fb] min-h-screen flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="text-[#64748b]">Loading store order...</div>
      </div>
    );
  }
  
  if (error || !storeOrder) {
    return (
      <div className={`transition-all duration-300 p-6 bg-[#f5f7fb] min-h-screen flex items-center justify-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="text-[#64748b]">{error || "Store order not found"}</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#f7f9ff]">
      <Head
        title="Store Order Details"
        description="View store order details and manage status."
        actions={
          <div className="flex items-center gap-3">
            <Link
              to="/inventory/store-orders"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cbd5f5] px-4 text-sm font-medium text-[#1f2937] transition hover:bg-white"
            >
              Back to Store Orders
            </Link>
            <button
              onClick={handleCreateTransferOrder}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#9B48D7] px-4 text-sm font-semibold text-white transition hover:bg-[#8637c3]"
            >
              Create Transfer Order
            </button>
          </div>
        }
      />
      
      <div className={`transition-all duration-300 px-10 pb-16 pt-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="rounded-3xl border border-[#e6ebfa] bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf1ff] px-10 py-6">
            <div className="space-y-1">
              <h1 className="text-[20px] font-semibold text-[#101828]">
                Store Order: {storeOrder.orderNumber || "N/A"}
              </h1>
              <p className="text-sm text-[#6c728a]">
                View and manage store order details
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Status:</span>
              <select
                value={storeOrder.status || 'pending'}
                onChange={(e) => handleManualStatusChange(e.target.value)}
                disabled={processing}
                className={`text-xs font-semibold rounded-lg px-3 py-1.5 border transition cursor-pointer outline-none ${
                  storeOrder.status === 'draft' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                  storeOrder.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-300' :
                  storeOrder.status === 'approved' ? 'bg-green-50 text-green-800 border-green-300' :
                  storeOrder.status === 'rejected' ? 'bg-red-50 text-red-800 border-red-300' :
                  'bg-blue-50 text-blue-800 border-blue-300'
                }`}
              >
                <option value="draft">DRAFT</option>
                <option value="pending">PENDING</option>
                <option value="approved">APPROVED</option>
                <option value="rejected">REJECTED</option>
                <option value="transferred">TRANSFERRED</option>
              </select>
            </div>
          </div>
          
          <div className="px-10 py-12">
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b] mb-2">Order Number</p>
                  <p className="text-sm text-[#101828]">{storeOrder.orderNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b] mb-2">Date</p>
                  <p className="text-sm text-[#101828]">{storeOrder.date ? new Date(storeOrder.date).toLocaleDateString() : "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b] mb-2">Store Warehouse</p>
                  <p className="text-sm text-[#101828]">{storeOrder.storeWarehouse || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b] mb-2">Status</p>
                  <select
                    value={storeOrder.status || 'pending'}
                    onChange={(e) => handleManualStatusChange(e.target.value)}
                    disabled={processing}
                    className={`text-xs font-semibold rounded-lg px-3 py-1.5 border transition cursor-pointer outline-none ${
                      storeOrder.status === 'draft' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                      storeOrder.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-300' :
                      storeOrder.status === 'approved' ? 'bg-green-50 text-green-800 border-green-300' :
                      storeOrder.status === 'rejected' ? 'bg-red-50 text-red-800 border-red-300' :
                      'bg-blue-50 text-blue-800 border-blue-300'
                    }`}
                  >
                    <option value="draft">DRAFT</option>
                    <option value="pending">PENDING</option>
                    <option value="approved">APPROVED</option>
                    <option value="rejected">REJECTED</option>
                    <option value="transferred">TRANSFERRED</option>
                  </select>
                </div>
              </div>
              
              {storeOrder.reason && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b] mb-2">Reason</p>
                  <p className="text-sm text-[#101828]">{storeOrder.reason}</p>
                </div>
              )}
              
              {storeOrder.items && storeOrder.items.length > 0 && (
                <div className="rounded-2xl border border-[#edf1ff] bg-[#fcfdff]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ff] px-8 py-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8a94b0]">Items</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-fixed border-collapse text-sm text-[#111827]">
                      <thead className="bg-white text-[11px] uppercase tracking-[0.28em] text-[#9aa2bd]">
                        <tr>
                          <th className="px-6 py-3 text-left font-semibold text-[#6b7280]">Item Name</th>
                          <th className="px-6 py-3 text-left font-semibold text-[#6b7280]">SKU</th>
                          <th className="px-6 py-3 text-left font-semibold text-[#6b7280]">Current Stock</th>
                          <th className="px-6 py-3 text-left font-semibold text-[#6b7280]">Quantity Requested</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storeOrder.items.map((item, index) => {
                          const itemKey = item.itemId || `${item.itemGroupId}-${item.itemName}`;
                          const currentStock = itemStocks[itemKey] ?? 0;
                          
                          return (
                            <tr key={index} className="border-t border-[#f0f3ff]">
                              <td className="px-6 py-4">{item.itemName || "N/A"}</td>
                              <td className="px-6 py-4">{item.itemSku || "N/A"}</td>
                              <td className="px-6 py-4">
                                <span className={`font-medium ${currentStock > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                                  {Math.round(currentStock)} units
                                </span>
                              </td>
                              <td className="px-6 py-4">{item.quantity || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-[#edf1ff] bg-[#fbfcff] px-10 py-6">
            {storeOrder.status !== 'rejected' && (
              <button
                onClick={handleReject}
                disabled={processing}
                className="rounded-lg border border-[#ef4444] bg-white px-6 py-2.5 text-sm font-semibold text-[#ef4444] transition hover:bg-[#fef2f2] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            )}
            <button
              onClick={handleCreateTransferOrder}
              disabled={processing}
              className="rounded-lg bg-[#9B48D7] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8637c3] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Transfer Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreOrderView;

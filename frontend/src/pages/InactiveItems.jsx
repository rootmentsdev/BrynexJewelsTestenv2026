import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import useSidebar from "../hooks/useSidebar";
import Header from "../components/Header";

const API_ROOT = (baseUrl?.baseUrl || "").replace(/\/$/, "");

const InactiveItems = () => {
  const isSidebarOpen = useSidebar();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Get user info for filtering
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

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Build query params with warehouse filtering
      const groupsParams = new URLSearchParams({
        page: "1",
        limit: "100",
      });
      const itemsParams = new URLSearchParams({
        page: "1",
        limit: "100",
      });

      // Pass warehouse for both non-admin users AND admins viewing a specific store
      if (userWarehouse) {
        groupsParams.append("warehouse", userWarehouse);
        itemsParams.append("warehouse", userWarehouse);
      }
      groupsParams.append("isAdmin", isAdmin.toString());
      itemsParams.append("isAdmin", isAdmin.toString());
      if (user?.power) groupsParams.append("userPower", user.power);
      if (user?.locCode) groupsParams.append("locCode", user.locCode);
      if (user?.power) itemsParams.append("userPower", user.power);
      if (user?.locCode) itemsParams.append("locCode", user.locCode);

      const [groupsRes, itemsRes, vendorsRes] = await Promise.all([
        fetch(`${API_ROOT}/api/shoe-sales/item-groups?${groupsParams}`),
        fetch(`${API_ROOT}/api/shoe-sales/items?${itemsParams}`),
        fetch(`${API_ROOT}/api/purchase/vendors?userId=${encodeURIComponent(userEmail)}${user?.power ? `&userPower=${encodeURIComponent(user.power)}` : ""}`),
      ]);
      if (!groupsRes.ok) throw new Error("Failed to load item groups");
      if (!itemsRes.ok) throw new Error("Failed to load items");
      if (!vendorsRes.ok) throw new Error("Failed to load vendors");

      const groupsData = await groupsRes.json();
      const itemsData = await itemsRes.json();
      const vendorsData = await vendorsRes.json();

      // Handle paginated response for groups
      let groupsList = [];
      if (Array.isArray(groupsData)) {
        groupsList = groupsData;
      } else if (groupsData.groups && Array.isArray(groupsData.groups)) {
        groupsList = groupsData.groups;
      }

      // Fetch full details for each group to get items with isActive status
      const fullGroupsPromises = groupsList.map(async (group) => {
        const groupId = group._id || group.id;
        try {
          const fullRes = await fetch(`${API_ROOT}/api/shoe-sales/item-groups/${groupId}`);
          if (fullRes.ok) {
            return await fullRes.json();
          }
          return group;
        } catch {
          return group;
        }
      });
      const fullGroupsList = await Promise.all(fullGroupsPromises);

      // Handle paginated response for items
      let itemsList = [];
      if (Array.isArray(itemsData)) {
        itemsList = itemsData;
      } else if (itemsData.items && Array.isArray(itemsData.items)) {
        itemsList = itemsData.items;
      }

      setGroups(fullGroupsList);
      setItems(itemsList);
      setVendors(vendorsData || []);
      console.log("Vendors loaded:", vendorsData?.length || 0);
      console.log("Inactive vendors found:", (vendorsData || []).filter(v => v.isActive === false || v.status === 'inactive').length);
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const inactiveGroups = useMemo(
    () => groups.filter((g) => (g?.isActive === false) || (String(g?.isActive).toLowerCase() === "false")),
    [groups]
  );
  const inactiveItems = useMemo(
    () => {
      // Get set of all group item IDs for filtering
      const groupItemIds = new Set();
      groups.forEach((group) => {
        if (Array.isArray(group.items)) {
          group.items.forEach((item) => {
            const itemId = item._id?.toString() || item.id?.toString();
            if (itemId) {
              groupItemIds.add(itemId);
            }
          });
        }
      });
      
      return items.filter((i) => {
        // Only include items that are inactive AND are truly standalone (not from groups)
        const isInactive = (i?.isActive === false) || (String(i?.isActive).toLowerCase() === "false");
        const itemId = i._id?.toString() || i.id?.toString();
        const isFromGroup = i?.isFromGroup || i?.itemGroupId || (itemId && groupItemIds.has(itemId));
        return isInactive && !isFromGroup;
      });
    },
    [items, groups]
  );
  const inactiveVendors = useMemo(
    () => vendors.filter((v) => (v?.isActive === false) || (v?.status === 'inactive')),
    [vendors]
  );
  const activeGroups = useMemo(
    () => groups.filter((g) => !(g?.isActive === false || String(g?.isActive).toLowerCase() === "false")),
    [groups]
  );

  // Extract inactive items from all groups (both active and inactive)
  const inactiveItemsFromGroups = useMemo(() => {
    const result = [];
    groups.forEach((group) => {
      if (Array.isArray(group.items)) {
        group.items.forEach((item) => {
          if ((item?.isActive === false) || (String(item?.isActive).toLowerCase() === "false")) {
            result.push({
              ...item,
              groupId: group._id || group.id,
              groupName: group.name,
              isFromGroup: true,
            });
          }
        });
      }
    });
    return result;
  }, [groups]);

  const activateGroup = async (groupId) => {
    try {
      setSaving(true);

      // IMPORTANT: The list API returns summarized groups (no full items).
      // Fetch the full item group by id before updating.
      const fullRes = await fetch(`${API_ROOT}/api/shoe-sales/item-groups/${groupId}`);
      if (!fullRes.ok) throw new Error("Failed to load item group");
      const fullGroup = await fullRes.json();

      const payload = {
        name: fullGroup.name,
        sku: fullGroup.sku || "",
        itemType: fullGroup.itemType || "goods",
        unit: fullGroup.unit || "",
        manufacturer: fullGroup.manufacturer || "",
        brand: fullGroup.brand || "",
        taxPreference: fullGroup.taxPreference || "taxable",
        intraStateTaxRate: fullGroup.intraStateTaxRate || "",
        interStateTaxRate: fullGroup.interStateTaxRate || "",
        inventoryValuationMethod: fullGroup.inventoryValuationMethod || "",
        createAttributes: fullGroup.createAttributes !== undefined ? fullGroup.createAttributes : true,
        attributeRows: fullGroup.attributeRows || [],
        sellable: fullGroup.sellable !== undefined ? fullGroup.sellable : true,
        purchasable: fullGroup.purchasable !== undefined ? fullGroup.purchasable : true,
        trackInventory: fullGroup.trackInventory !== undefined ? fullGroup.trackInventory : false,
        items: Array.isArray(fullGroup.items) ? fullGroup.items : [],
        stock: fullGroup.stock || 0,
        reorder: fullGroup.reorder || "",
        isActive: true,
      };

      const res = await fetch(`${API_ROOT}/api/shoe-sales/item-groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to activate group");
      await fetchData();
    } catch (e) {
      alert(e.message || "Failed to activate group");
    } finally {
      setSaving(false);
    }
  };

  const activateItem = async (itemId) => {
    try {
      setSaving(true);
      const item = items.find((i) => (i._id || i.id) === itemId);
      if (!item) {
        alert("Item not found");
        return;
      }
      
      // Fetch full item details first to ensure we have all fields
      const fullItemRes = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`);
      if (!fullItemRes.ok) throw new Error("Failed to load item details");
      const fullItem = await fullItemRes.json();
      
      // Prepare payload with all required fields
      const payload = {
        ...fullItem,
        isActive: true,
      };
      
      const res = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to activate item");
      }
      
      await fetchData();
      alert("Item activated successfully");
    } catch (e) {
      alert(e.message || "Failed to activate item");
    } finally {
      setSaving(false);
    }
  };

  const activateVendor = async (vendorId) => {
    try {
      setSaving(true);
      const vendor = vendors.find((v) => (v._id || v.id) === vendorId);
      if (!vendor) return;

      const res = await fetch(`${API_ROOT}/api/purchase/vendors/${vendorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...vendor, isActive: true, status: 'active' }),
      });
      if (!res.ok) throw new Error("Failed to activate vendor");

      // Update localStorage if it exists
      try {
        const savedVendors = JSON.parse(localStorage.getItem("vendors") || "[]");
        const updatedVendorsList = savedVendors.map(v => {
          if ((v._id || v.id) === vendorId) {
            return { ...v, isActive: true, status: 'active' };
          }
          return v;
        });
        localStorage.setItem("vendors", JSON.stringify(updatedVendorsList));
      } catch (localErr) {
        console.warn("Failed to update localStorage:", localErr);
      }

      await fetchData();
    } catch (e) {
      alert(e.message || "Failed to activate vendor");
    } finally {
      setSaving(false);
    }
  };

  const activateItemFromGroup = async (itemId, groupId) => {
    try {
      setSaving(true);

      // Fetch the full group
      const groupRes = await fetch(`${API_ROOT}/api/shoe-sales/item-groups/${groupId}`);
      if (!groupRes.ok) throw new Error("Failed to load group");
      const group = await groupRes.json();

      // Find and activate the item in the group
      const updatedItems = group.items.map((i) => {
        const iId = i._id?.toString() || i.id?.toString() || "";
        if (iId === itemId.toString()) {
          return { ...i, isActive: true };
        }
        return i;
      });

      const payload = {
        name: group.name,
        sku: group.sku || "",
        itemType: group.itemType || "goods",
        unit: group.unit || "",
        manufacturer: group.manufacturer || "",
        brand: group.brand || "",
        taxPreference: group.taxPreference || "taxable",
        intraStateTaxRate: group.intraStateTaxRate || "",
        interStateTaxRate: group.interStateTaxRate || "",
        inventoryValuationMethod: group.inventoryValuationMethod || "",
        createAttributes: group.createAttributes !== undefined ? group.createAttributes : true,
        attributeRows: group.attributeRows || [],
        sellable: group.sellable !== undefined ? group.sellable : true,
        purchasable: group.purchasable !== undefined ? group.purchasable : true,
        trackInventory: group.trackInventory !== undefined ? group.trackInventory : false,
        items: updatedItems,
        stock: group.stock || 0,
        reorder: group.reorder || "",
        isActive: group.isActive !== undefined ? group.isActive : true,
      };

      const res = await fetch(`${API_ROOT}/api/shoe-sales/item-groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to activate item");
      await fetchData();
    } catch (e) {
      alert(e.message || "Failed to activate item");
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return (
      <div className={`transition-all duration-300 flex min-h-screen items-center justify-center bg-slate-50 p-6 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-6 w-6 animate-spin rounded-none border-2 border-[#3b82f6] border-t-transparent" />
          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`transition-all duration-300 p-6 ${isSidebarOpen ? 'ml-64' : 'ml-0'} bg-slate-50 min-h-screen`}>
        <div className="rounded-none border border-red-200 bg-red-50 p-4 text-red-700 text-sm font-medium">{error}</div>
      </div>
    );
  }

  return (
    <>
      <Header title="Inactive Items Management" />
      <div className={`transition-all duration-300 min-h-screen bg-slate-50 flex flex-col ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>

        {/* Summary Bar */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Inactive Groups:</span>
                <span className="text-sm font-bold text-[#111827]">{inactiveGroups.length}</span>
              </div>
              <div className="w-px h-4 bg-[#E5E7EB]" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Inactive Items:</span>
                <span className="text-sm font-bold text-[#111827]">{inactiveItems.length}</span>
              </div>
              <div className="w-px h-4 bg-[#E5E7EB]" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Items in Groups:</span>
                <span className="text-sm font-bold text-[#111827]">{inactiveItemsFromGroups.length}</span>
              </div>
              <div className="w-px h-4 bg-[#E5E7EB]" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Inactive Vendors:</span>
                <span className="text-sm font-bold text-[#111827]">{inactiveVendors.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          
          <div className="rounded-none border border-[#E5E7EB] bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Inactive Item Groups</h2>
              <Link to="/shoe-sales/item-groups" className="text-[10px] font-bold uppercase tracking-wider text-[#3b82f6] hover:text-[#2563eb] hover:underline">Go to Groups</Link>
            </div>

            {inactiveGroups.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center font-medium">No inactive groups.</p>
            ) : (
              <div className="overflow-x-auto rounded-none border border-[#E5E7EB]">
                <table className="min-w-full divide-y divide-[#E5E7EB]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Group Name</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">SKU</th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E5E7EB]">
                    {inactiveGroups.map((grp) => {
                      const id = grp._id || grp.id;
                      return (
                        <tr key={id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-6 py-3 text-sm font-semibold text-[#111827]">{grp.name || "Untitled"}</td>
                          <td className="px-6 py-3 text-sm text-[#6B7280]">{grp.sku || "-"}</td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => activateGroup(id)}
                              disabled={saving}
                              className="inline-flex h-8 items-center px-4 rounded-none bg-[#10b981] text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                              {saving ? "ACTIVATING..." : "ACTIVATE"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-none border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#111827]">Inactive Standalone Items</h2>
              <Link to="/shoe-sales/items" className="text-xs font-bold uppercase tracking-wider text-[#3b82f6] hover:text-[#2563eb] hover:underline">Go to Items</Link>
            </div>
            {inactiveItems.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center font-medium">No inactive items.</p>
            ) : (
              <div className="overflow-x-auto rounded-none border border-[#E5E7EB]">
                <table className="min-w-full divide-y divide-[#E5E7EB]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Item</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">SKU</th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E5E7EB]">
                    {inactiveItems.map((it) => {
                      const id = it._id || it.id;
                      return (
                        <tr key={id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-6 py-3 text-sm font-semibold text-[#111827]">{it.itemName || "Untitled"}</td>
                          <td className="px-6 py-3 text-sm text-[#6B7280]">{it.sku || "-"}</td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => activateItem(id)}
                              disabled={saving}
                              className="inline-flex h-8 items-center px-4 rounded-none bg-[#10b981] text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                              {saving ? "ACTIVATING..." : "ACTIVATE"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-none border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#111827]">Inactive Items from Groups</h2>
              <Link to="/shoe-sales/item-groups" className="text-xs font-bold uppercase tracking-wider text-[#3b82f6] hover:text-[#2563eb] hover:underline">Go to Groups</Link>
            </div>
            {inactiveItemsFromGroups.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center font-medium">No inactive items in groups.</p>
            ) : (
              <div className="overflow-x-auto rounded-none border border-[#E5E7EB]">
                <table className="min-w-full divide-y divide-[#E5E7EB]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Item</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">SKU</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Group</th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E5E7EB]">
                    {inactiveItemsFromGroups.map((it) => {
                      const id = it._id || it.id;
                      return (
                        <tr key={id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-6 py-3 text-sm font-semibold text-[#111827]">{it.name || it.itemName || "Untitled"}</td>
                          <td className="px-6 py-3 text-sm text-[#6B7280]">{it.sku || "-"}</td>
                          <td className="px-6 py-3 text-sm text-[#6B7280]">{it.groupName}</td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => activateItemFromGroup(id, it.groupId)}
                              disabled={saving}
                              className="inline-flex h-8 items-center px-4 rounded-none bg-[#10b981] text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                              {saving ? "ACTIVATING..." : "ACTIVATE"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-none border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#111827]">Inactive Vendors</h2>
              <Link to="/purchase/vendors" className="text-xs font-bold uppercase tracking-wider text-[#3b82f6] hover:text-[#2563eb] hover:underline">Go to Vendors</Link>
            </div>
            {inactiveVendors.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center font-medium">No inactive vendors.</p>
            ) : (
              <div className="overflow-x-auto rounded-none border border-[#E5E7EB]">
                <table className="min-w-full divide-y divide-[#E5E7EB]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Vendor</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Contact</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Phone</th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E5E7EB]">
                    {inactiveVendors.map((v) => {
                      const id = v._id || v.id;
                      return (
                        <tr key={id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-6 py-3 text-sm font-semibold text-[#111827]">{v.companyName || "Untitled"}</td>
                          <td className="px-6 py-3 text-sm text-[#6B7280]">{v.contactPerson || "-"}</td>
                          <td className="px-6 py-3 text-sm text-[#6B7280]">{v.phone || "-"}</td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => activateVendor(id)}
                              disabled={saving}
                              className="inline-flex h-8 items-center px-4 rounded-none bg-[#10b981] text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                              {saving ? "ACTIVATING..." : "ACTIVATE"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InactiveItems;

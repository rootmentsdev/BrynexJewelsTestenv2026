const fs = require('fs');
let code = fs.readFileSync('InactiveItems.jsx', 'utf8');

const loadingIndex = code.indexOf('if (loading) {');
if (loadingIndex === -1) throw new Error("Could not find if (loading)");

const correctEnd = `  if (loading) {
    return (
      <div className={\`transition-all duration-300 flex min-h-screen items-center justify-center bg-[#F9FAFB] p-6 \${isSidebarOpen ? 'ml-64' : 'ml-0'}\`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
          <p className="text-xs font-medium text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={\`transition-all duration-300 p-6 \${isSidebarOpen ? 'ml-64' : 'ml-0'} bg-[#F9FAFB] min-h-screen\`}>
        <div className="rounded-none border border-red-200 bg-red-50 p-4 text-red-700 text-sm font-medium">{error}</div>
      </div>
    );
  }

  return (
    <>
      <Header title="Inactive Items Management" />
      <div className={\`transition-all duration-300 min-h-screen bg-[#F9FAFB] flex flex-col \${isSidebarOpen ? 'ml-64' : 'ml-0'}\`}>
        <div className="px-6 py-6 space-y-6">
          
          <div className="rounded-none border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#111827]">Inactive Item Groups</h2>
              <Link to="/shoe-sales/item-groups" className="text-xs font-bold uppercase tracking-wider text-[#3b82f6] hover:text-[#2563eb] hover:underline">Go to Groups</Link>
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
`;

const newCode = code.substring(0, loadingIndex) + correctEnd;
fs.writeFileSync('InactiveItems.jsx', newCode);
console.log('Fixed file');

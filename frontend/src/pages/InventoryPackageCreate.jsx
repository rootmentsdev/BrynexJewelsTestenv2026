import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Head from "../components/Head";
import useSidebar from "../hooks/useSidebar";

const InventoryPackageCreate = () => {
  const isSidebarOpen = useSidebar();
  const [customer, setCustomer] = useState("");
  const [salesOrder, setSalesOrder] = useState("");

  const isDetailsVisible = useMemo(() => customer && salesOrder, [customer, salesOrder]);

  return (
    <div className={`transition-all duration-300 p-6 bg-[#f5f7fb] min-h-screen ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
      <Head
        title="New Package"
        description="Create a shipment-ready package for your customer."
        actions={
          <Link
            to="/inventory/packages"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cbd5f5] px-4 text-sm font-medium text-[#1f2937] transition hover:bg-white"
          >
            Back to Packages
          </Link>
        }
      />

      <div className="rounded-3xl border border-[#e1e4ec] bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.25)]">
        <div className="flex items-center gap-3 border-b border-[#e2e8f5] bg-[#f8f9fc] px-8 py-6">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e4ecff] text-[#2d3b8f] text-lg font-semibold">
            📦
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-[#1f2937]">New Package</h2>
            <p className="text-sm text-[#6b7280]">Populate the essentials to begin packing.</p>
          </div>
        </div>

        <div className="space-y-8 px-8 py-8">
          <section className="grid gap-6 md:grid-cols-2">
            <Field label="Customer Name" required>
              <select
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#94a3b8] focus:outline-none"
              >
                <option value="">Select Customer</option>
                <option value="Acme Inc.">Acme Inc.</option>
                <option value="Globex">Globex</option>
                <option value="Initech">Initech</option>
              </select>
            </Field>
            <Field label="Sales Order" required>
              <select
                value={salesOrder}
                onChange={(event) => setSalesOrder(event.target.value)}
                className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#94a3b8] focus:outline-none"
              >
                <option value="">Select Sales Order</option>
                <option value="SO-1007">SO-1007</option>
                <option value="SO-1008">SO-1008</option>
                <option value="SO-1010">SO-1010</option>
              </select>
            </Field>
          </section>

          {isDetailsVisible ? (
            <>
              <section className="grid gap-6 md:grid-cols-2">
                <Field label="Package Slip">
                  <div className="flex items-center gap-2 rounded-lg border border-[#d7dcf5] bg-[#f9fafc] px-3 py-2 text-sm text-[#6b7280]">
                    <span>Auto-generated</span>
                    <button className="ml-auto text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8]">
                      Create
                    </button>
                  </div>
                </Field>
                <Field label="Date" required>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#94a3b8] focus:outline-none"
                  />
                </Field>
              </section>

              <div className="rounded-2xl border border-[#fbe8c8] bg-[#fffbf5] px-4 py-3 text-sm text-[#6b7280]">
                You can also select or scan the items to be included from the sales order.
                <span className="ml-2 cursor-pointer font-medium text-[#2563eb] hover:text-[#1d4ed8]">
                  Select or Scan items
                </span>
              </div>

              <section className="rounded-2xl border border-[#e5e7f1] bg-[#f9fafc]">
                <table className="w-full table-fixed border-collapse text-sm text-[#1f2937]">
                  <thead className="text-xs uppercase tracking-[0.18em] text-[#6b7280]">
                    <tr className="border-b border-[#e2e8f0]">
                      <th className="px-5 py-3 text-left font-semibold">Items & Description</th>
                      <th className="px-5 py-3 text-left font-semibold w-[18%]">Ordered</th>
                      <th className="px-5 py-3 text-left font-semibold w-[18%]">Packed</th>
                      <th className="px-5 py-3 text-left font-semibold w-[22%]">Quantity to Pack</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-[#9ca3af]">Add items from the sales order to begin packing.</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="space-y-3">
                <Field label="Internal Notes">
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#94a3b8] focus:outline-none"
                    placeholder="Add notes for your warehouse team..."
                  />
                </Field>
              </section>
            </>
          ) : (
            <div className="rounded-2xl border border-[#dfe4f5] bg-[#f7f8ff] px-6 py-6 text-sm text-[#6b7280]">
              Select the customer and sales order to unlock package details.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#e2e8f5] bg-[#f9fafc] px-8 py-4">
          <Link
            to="/inventory/packages"
            className="rounded-md border border-[#d7dcf5] px-5 py-2 text-sm font-medium text-[#475569] transition hover:bg-white"
          >
            Cancel
          </Link>
          <button
            disabled={!isDetailsVisible}
            className="rounded-md bg-[#3762f9] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2748c9] disabled:cursor-not-allowed disabled:bg-[#a5b4fc]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, required, children }) => (
  <label className="flex flex-col gap-2 text-sm text-[#475569]">
    <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${required ? "text-[#ef4444]" : "text-[#64748b]"}`}>
      {label}
      {required && <span> *</span>}
    </span>
    {children}
  </label>
);

export default InventoryPackageCreate;


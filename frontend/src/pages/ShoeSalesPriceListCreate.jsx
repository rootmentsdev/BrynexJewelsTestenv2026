import { useState } from "react";
import { Link } from "react-router-dom";
import Head from "../components/Head";
import useSidebar from "../hooks/useSidebar";

const ShoeSalesPriceListCreate = () => {
  const isSidebarOpen = useSidebar();
  const [showExamples, setShowExamples] = useState(false);

  return (
    <div className={`transition-all duration-300 p-6 bg-[#f5f7fb] min-h-screen ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
      <Head
        title="New Price List"
        description="Set pricing rules that automatically apply across sales or purchase workflows."
        actions={
          <Link
            to="/shoe-sales/price-lists"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cbd5f5] px-4 text-sm font-medium text-[#1f2937] transition hover:bg-white"
          >
            Back to Price Lists
          </Link>
        }
      />

      <div className="rounded-3xl border border-[#e1e5f5] bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.25)]">
        <div className="px-8 py-8 space-y-8">
          <FieldGroup
            label="Name*"
            renderInput={() => (
              <input
                type="text"
                className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#94a3b8] focus:outline-none"
                placeholder="Enter price list name"
              />
            )}
          />

          <div className="grid gap-8 md:grid-cols-2">
            <FieldGroup
              label="Transaction Type"
              renderInput={() => (
                <div className="flex flex-wrap gap-6 text-sm font-medium text-[#1f2937]">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="transactionType" defaultChecked className="text-[#4b5563]" />
                    Sales
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="transactionType" className="text-[#4b5563]" />
                    Purchase
                  </label>
                </div>
              )}
            />
            <FieldGroup
              label="Price List Type"
              renderInput={() => (
                <div className="grid gap-4 md:grid-cols-2">
                  <TypeCard
                    title="All Items"
                    subtitle="Mark up or mark down the rates of all items"
                    defaultChecked
                    group="priceType"
                  />
                  <TypeCard
                    title="Individual Items"
                    subtitle="Customize the rate of each item"
                    group="priceType"
                  />
                </div>
              )}
            />
          </div>

          <FieldGroup
            label="Description"
            renderInput={() => (
              <textarea
                rows={3}
                placeholder="Enter the description"
                 className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#94a3b8] focus:outline-none"
              />
            )}
          />

          <div className="space-y-6">
            <FieldGroup
              label="Percentage*"
              renderInput={() => (
                <div className="flex items-center gap-2">
                  <select className="w-32 rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#94a3b8] focus:outline-none">
                    <option>Markup</option>
                    <option>Markdown</option>
                  </select>
                  <div className="flex items-center rounded-lg border border-[#d7dcf5] focus-within:border-[#94a3b8]">
                    <input
                      type="number"
                      className="w-24 rounded-lg px-3 py-2 text-sm text-[#1f2937] focus:outline-none"
                      placeholder="0.00"
                    />
                    <span className="px-3 text-sm font-semibold text-[#64748b]">%</span>
                  </div>
                </div>
              )}
            />
            <FieldGroup
              label="Round Off To*"
              renderInput={() => <RoundOffSelect />}
            />
            <div className="flex items-center gap-2 text-sm text-[#2563eb]">
              <span
                role="button"
                tabIndex={0}
                onClick={() => setShowExamples(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setShowExamples(true);
                  }
                }}
                className="cursor-pointer font-medium hover:text-[#1d4ed8]"
              >
                View Examples
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#e8ebf5] bg-[#f9faff] px-8 py-4">
          <button className="rounded-md border border-[#d7dcf5] px-5 py-2 text-sm font-medium text-[#475569] transition hover:bg-white">
            Cancel
          </button>
          <button className="rounded-md bg-[#3762f9] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2748c9]">
            Save
          </button>
        </div>
      </div>

      {showExamples && <ExamplesModal onClose={() => setShowExamples(false)} />}
    </div>
  );
};

export default ShoeSalesPriceListCreate;

const FieldGroup = ({ label, renderInput }) => (
  <label className="flex flex-col gap-2 text-sm text-[#475569]">
    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">{label}</span>
    {renderInput()}
  </label>
);

const TypeCard = ({ title, subtitle, defaultChecked = false, group }) => (
   <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-[#d7dcf5] bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#94a3b8]">
    <div className="flex items-center gap-2 text-sm font-medium text-[#1f2937]">
       <input type="radio" name={group} defaultChecked={defaultChecked} className="text-[#4b5563]" />
      {title}
    </div>
    <p className="text-xs text-[#6b7280]">{subtitle}</p>
  </label>
);

const RoundOffSelect = () => {
  return (
    <select className="w-56 rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#94a3b8] focus:ring-2 focus:ring-[#c7d7ff] focus:outline-none">
      <option>Never mind</option>
      <option>Nearest whole number</option>
      <option>0.99</option>
      <option>0.50</option>
      <option>0.49</option>
      <option disabled className="text-[#9ca3af]">
        Decimal Places
      </option>
    </select>
  );
};

const ExamplesModal = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="relative w-full max-w-3xl rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
        <h2 className="text-lg font-semibold text-[#1f2937]">Rounding Examples</h2>
        <button
          onClick={onClose}
          className="rounded-full border border-[#fbcfe8] bg-[#fee2f2] px-3 py-1 text-sm font-semibold text-[#db2777] transition hover:bg-[#fbcfe8]"
        >
          ✕
        </button>
      </div>
      <div className="px-6 py-4">
        <table className="w-full table-auto border-collapse text-sm text-[#1f2937]">
          <thead className="text-left text-xs uppercase tracking-[0.15em] text-[#6b7280]">
            <tr>
              <th className="border-b border-[#e2e8f0] px-3 py-2">Round Off To</th>
              <th className="border-b border-[#e2e8f0] px-3 py-2">Input Value</th>
              <th className="border-b border-[#e2e8f0] px-3 py-2">Rounded Value</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Never mind", "1000.678", "1000.678"],
              ["Nearest whole number", "1000.678", "1001"],
              ["0.99", "1000.678", "1000.99"],
              ["0.50", "1000.678", "1000.50"],
              ["0.49", "1000.678", "1000.49"]
            ].map(([label, input, output]) => (
              <tr key={label} className="hover:bg-[#f8fafc]">
                <td className="border-b border-[#e2e8f0] px-3 py-2 text-[#2563eb]">{label}</td>
                <td className="border-b border-[#e2e8f0] px-3 py-2">{input}</td>
                <td className="border-b border-[#e2e8f0] px-3 py-2">{output}</td>
              </tr>
            ))}
            <tr>
              <td className="px-3 py-3 text-[#2563eb]">Decimal Places</td>
              <td className="px-3 py-3 text-[#6b7280]" colSpan={2}>
                Use decimal rounding to set precision such as 2 decimal places (1000.68).
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end border-t border-[#e2e8f0] px-6 py-4">
        <button
          onClick={onClose}
          className="rounded-md border border-[#d7dcf5] px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-white"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);


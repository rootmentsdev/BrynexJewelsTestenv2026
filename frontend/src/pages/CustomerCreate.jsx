import { useState } from "react";
import Head from "../components/Head";
import useSidebar from "../hooks/useSidebar";

const tabs = [
  "Other Details",
  "Address",
  "Contact Persons",
  "Custom Fields",
  "Reporting Tags",
  "Remarks",
];

const countries = ["India", "United States", "United Kingdom"];
const states = ["Kerala", "Karnataka", "Tamil Nadu"];
const paymentTerms = ["Due on Receipt", "Net 15", "Net 30", "Net 45"];
const currencies = ["INR- Indian Rupee", "USD- US Dollar", "EUR- Euro"];

const CustomerCreate = () => {
  const isSidebarOpen = useSidebar();
  const [customerType, setCustomerType] = useState("business");
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "Other Details":
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1f2937]">
                  GST Treatment<span className="text-red-500">*</span>
                </label>
                <select className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none">
                  <option value="">Select a GST treatment</option>
                  <option value="consumer">Consumer</option>
                  <option value="registered">Registered Business</option>
                  <option value="composition">Composition</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1f2937]">
                  Place of Supply<span className="text-red-500">*</span>
                </label>
                <select className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none">
                  <option value="">Select</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1f2937]">PAN</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none"
                  placeholder="Enter PAN number"
                />
              </div>
            </div>

            <div className="space-y-4">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-[#1f2937]">Tax Preference<span className="text-red-500">*</span></legend>
                <div className="flex gap-6 text-sm">
                  <label className="flex items-center gap-2 text-[#4b5563]">
                    <input
                      type="radio"
                      name="taxPreference"
                      defaultChecked
                      className="h-4 w-4 text-[#4f46e5] focus:ring-[#4338ca]"
                    />
                    Taxable
                  </label>
                  <label className="flex items-center gap-2 text-[#4b5563]">
                    <input type="radio" name="taxPreference" className="h-4 w-4 text-[#4f46e5] focus:ring-[#4338ca]" />
                    Tax Exempt
                  </label>
                </div>
              </fieldset>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1f2937]">Currency</label>
                <select className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none">
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1f2937]">Payment Terms</label>
                <select className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none">
                  {paymentTerms.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 text-sm text-[#4b5563]">
                <input type="checkbox" className="h-4 w-4 rounded border-[#d1d9f2] text-[#4f46e5] focus:ring-[#4338ca]" />
                Allow portal access for this customer
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#1f2937]">Documents</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-dashed border-[#94a3b8] px-4 py-2 text-sm font-medium text-[#4b5563] transition hover:border-[#4f46e5] hover:text-[#4f46e5]"
                >
                  Upload File
                </button>
                <p className="text-xs text-[#6b7280]">You can upload a maximum of 10 files, 10MB each</p>
              </div>
              <button type="button" className="mt-3 text-sm font-medium text-[#3366ff] hover:underline">
                Add more details
              </button>
            </div>
          </div>
        );

      case "Address":
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            {["Billing Address", "Shipping Address"].map((title) => (
              <div key={title} className="rounded-2xl border border-[#e4e9fb] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#1f2937]">{title}</h3>
                  {title === "Shipping Address" && (
                    <button type="button" className="text-sm font-medium text-[#3366ff] hover:underline">
                      Copy billing address
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#1f2937]">Attention</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#1f2937]">Country/Region</label>
                    <select className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none">
                      <option value="">Select</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#1f2937]">Address</label>
                    <input
                      type="text"
                      placeholder="Street 1"
                      className="mb-3 w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Street 2"
                      className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#1f2937]">City</label>
                      <input type="text" className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#1f2937]">State</label>
                      <select className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none">
                        <option value="">Select or type to add</option>
                        {states.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#1f2937]">Pin Code</label>
                      <input type="text" className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#1f2937]">Phone</label>
                      <input type="text" className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#1f2937]">Fax Number</label>
                    <input type="text" className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case "Contact Persons":
        return (
          <div className="rounded-2xl border border-[#e4e9fb]">
            <div className="overflow-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#f9fbff] text-left text-xs font-semibold uppercase tracking-[0.24em] text-[#8a94b0]">
                  <tr>
                    <th className="px-6 py-3">Salutation</th>
                    <th className="px-6 py-3">First Name</th>
                    <th className="px-6 py-3">Last Name</th>
                    <th className="px-6 py-3">Email Address</th>
                    <th className="px-6 py-3">Work Phone</th>
                    <th className="px-6 py-3">Mobile</th>
                    <th className="px-6 py-3 text-right">⋯</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#edf1ff] text-[#4b5563]">
                    <td className="px-6 py-4">
                      <select className="w-full rounded-lg border border-[#d7def4] bg-white px-2 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none">
                        <option value="">Select</option>
                        <option value="Mr">Mr</option>
                        <option value="Ms">Ms</option>
                        <option value="Mrs">Mrs</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input type="text" className="w-full rounded-lg border border-[#d7def4] bg-white px-2 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none" />
                    </td>
                    <td className="px-6 py-4">
                      <input type="text" className="w-full rounded-lg border border-[#d7def4] bg-white px-2 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none" />
                    </td>
                    <td className="px-6 py-4">
                      <input type="email" className="w-full rounded-lg border border-[#d7def4] bg-white px-2 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none" />
                    </td>
                    <td className="px-6 py-4">
                      <input type="text" className="w-full rounded-lg border border-[#d7def4] bg-white px-2 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none" />
                    </td>
                    <td className="px-6 py-4">
                      <input type="text" className="w-full rounded-lg border border-[#d7def4] bg-white px-2 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none" />
                    </td>
                    <td className="px-6 py-4 text-right text-lg">⋯</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="border-t border-[#edf1ff] px-6 py-4">
              <button type="button" className="inline-flex items-center gap-2 rounded-md border border-dashed border-[#94a3b8] px-4 py-2 text-sm font-medium text-[#4b5563] transition hover:border-[#4f46e5] hover:text-[#4f46e5]">
                ＋ Add Contact Person
              </button>
            </div>
          </div>
        );

      case "Custom Fields":
        return (
          <div className="rounded-2xl border border-[#e4e9fb] bg-[#f9fbff] px-6 py-10 text-center text-sm text-[#6b7280]">
            Start adding custom fields for your Customers and Vendors by going to <span className="font-medium text-[#1f2937]">Settings ➜ Preferences ➜ Customers and Vendors</span>. You can also refine the address format of your Customers and Vendors from there.
          </div>
        );

      case "Reporting Tags":
        return (
          <div className="rounded-2xl border border-[#e4e9fb] bg-[#f9fbff] px-6 py-10 text-center text-sm text-[#6b7280]">
            You&apos;ve not created any Reporting Tags. Start creating reporting tags by going to <span className="font-medium text-[#1f2937]">More Settings ➜ Reporting Tags</span>.
          </div>
        );

      case "Remarks":
        return (
          <div>
            <label className="mb-2 block text-sm font-medium text-[#1f2937]">Remarks (For Internal Use)</label>
            <textarea className="h-40 w-full resize-none rounded-lg border border-[#d7def4] bg-white px-3 py-3 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none" placeholder="Add remarks here"></textarea>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8ff]">
      <Head title="New Customer" />

      <div className={`transition-all duration-300 flex min-h-[calc(100vh-6rem)] flex-col gap-6 px-10 pb-20 pt-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="rounded-3xl border border-[#e1e6f5] bg-white shadow-sm">
          <div className="border-b border-[#edf1ff] px-8 py-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-[#111827]">New Customer</h1>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Prefill customer details from the GST portal using the customer&apos;s GSTIN.
                  <button type="button" className="ml-1 text-sm font-semibold text-[#3366ff] hover:underline">
                    Prefill
                  </button>
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium text-[#4b5563]">
                <span>Customer Type</span>
                <div className="flex overflow-hidden rounded-full border border-[#d7def4] bg-[#f9fbff]">
                  <button
                    type="button"
                    className={`px-4 py-2 transition ${customerType === "business" ? "bg-[#3366ff] text-white" : "text-[#4b5563]"}`}
                    onClick={() => setCustomerType("business")}
                  >
                    Business
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 transition ${customerType === "individual" ? "bg-[#3366ff] text-white" : "text-[#4b5563]"}`}
                    onClick={() => setCustomerType("individual")}
                  >
                    Individual
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-8">
            <section className="mb-10 space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-[#1f2937]">Primary Contact</label>
                  <div className="grid grid-cols-3 gap-3">
                    <select className="col-span-1 rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm text-[#4b5563] shadow-sm focus:border-[#4f46e5] focus:outline-none">
                      <option value="">Salutation</option>
                      <option value="Mr">Mr</option>
                      <option value="Ms">Ms</option>
                      <option value="Mrs">Mrs</option>
                    </select>
                    <input
                      type="text"
                      placeholder="First Name"
                      className="col-span-1 rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm text-[#4b5563] shadow-sm focus:border-[#4f46e5] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      className="col-span-1 rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm text-[#4b5563] shadow-sm focus:border-[#4f46e5] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#1f2937]">Company Name</label>
                  <input type="text" className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#1f2937]">
                    Display Name<span className="text-red-500">*</span>
                  </label>
                  <select className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none">
                    <option>Select or type to add</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#1f2937]">Email Address</label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none"
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <span className="block text-sm font-medium text-[#1f2937]">Phone</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm">
                      <span className="text-[#6b7280]">📞</span>
                      <input type="text" placeholder="Work Phone" className="w-full border-none text-sm text-[#4b5563] outline-none" />
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm">
                      <span className="text-[#6b7280]">📱</span>
                      <input type="text" placeholder="Mobile" className="w-full border-none text-sm text-[#4b5563] outline-none" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#1f2937]">Customer Language</label>
                  <select className="w-full rounded-lg border border-[#d7def4] bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4f46e5] focus:outline-none">
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Malayalam</option>
                  </select>
                </div>
              </div>
            </section>

            <div className="mb-10 border-b border-[#edf1ff]" />

            <section>
              <div className="flex flex-wrap gap-3">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      activeTab === tab ? "bg-[#3366ff] text-white" : "bg-[#f1f4ff] text-[#4b5563]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="mt-8">{renderTabContent()}</div>
            </section>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-[#d7def4] bg-white px-6 py-2 text-sm font-semibold text-[#4b5563] shadow-sm transition hover:bg-[#f0f3ff]"
          >
            Cancel
          </button>
          <button type="button" className="rounded-lg border border-transparent bg-[#3366ff] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#244fd6]">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerCreate;


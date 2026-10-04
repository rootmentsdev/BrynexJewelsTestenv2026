import { Link } from "react-router-dom";
import Head from "../components/Head";
import useSidebar from "../hooks/useSidebar";

const columns = [
  "Name",
  "Company Name",
  "Email",
  "Work Phone",
  "GST Treatment",
  "Receivables (BCY)",
];

const customers = [
  { id: 1, name: "AFSAL", gstTreatment: "Consumer", receivables: "₹0.00" },
  { id: 2, name: "SADIQE", gstTreatment: "Consumer", receivables: "₹0.00" },
  { id: 3, name: "Anandhu", gstTreatment: "Consumer", receivables: "₹0.00" },
  { id: 4, name: "ASWIN", gstTreatment: "Consumer", receivables: "₹0.00" },
  { id: 5, name: "GOKUL BABU,", gstTreatment: "Consumer", receivables: "₹0.00" },
  { id: 6, name: "HINU FAVAS,", gstTreatment: "Consumer", receivables: "₹0.00" },
  { id: 7, name: "HINU FAVAS,", gstTreatment: "Consumer", receivables: "₹0.00" },
  { id: 8, name: "IJAS", gstTreatment: "Consumer", receivables: "₹0.00" },
];

const formatValue = (value) => (value ? value : "—");

const Customers = () => {
  const isSidebarOpen = useSidebar();
  return (
    <div className="min-h-screen bg-[#f6f8ff]">
      <Head title="Customers" />

      <div className={`transition-all duration-300 flex min-h-[calc(100vh-6rem)] flex-col gap-6 px-10 pb-16 pt-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[#111827]">All Customers</h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d7def4] bg-white text-[#4b5563] shadow-sm transition hover:bg-[#eff2ff]"
              aria-label="Adjust filters"
            >
              <span className="text-lg leading-none">⚙</span>
            </button>
            <Link
              to="/sales/customers/new"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-transparent bg-[#3366ff] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#244fd6]"
            >
              <span className="text-lg leading-none">＋</span>
              New
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d7def4] bg-white text-[#4b5563] shadow-sm transition hover:bg-[#eff2ff]"
              aria-label="More options"
            >
              ⋯
            </button>
          </div>
        </header>

        <section className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-[#e1e6f5] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#edf1ff] px-6 py-4">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d7def4] bg-white text-[#4b5563] shadow-sm transition hover:bg-[#eff2ff]"
              aria-label="Open filter sidebar"
            >
              <span className="text-base leading-none">☰</span>
            </button>
            <span className="text-sm font-medium text-[#4b5563]">Filter & sort your customer list</span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#f9fbff] text-left text-xs font-semibold uppercase tracking-[0.24em] text-[#8a94b0]">
                  <th className="w-12 px-6 py-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#d1d9f2] text-[#4f46e5] focus:ring-[#4338ca]"
                      aria-label="Select all customers"
                    />
                  </th>
                  {columns.map((column) => (
                    <th key={column} className="px-6 py-4">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#edf1ff]">
                {customers.map((customer) => (
                  <tr key={customer.id} className="text-sm text-[#4b5563]">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#d1d9f2] text-[#4f46e5] focus:ring-[#4338ca]"
                        aria-label={`Select ${customer.name}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="cursor-pointer font-medium text-[#3366ff] hover:underline">
                        {customer.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6b7280]">{formatValue(customer.companyName)}</td>
                    <td className="px-6 py-4 text-[#6b7280]">{formatValue(customer.email)}</td>
                    <td className="px-6 py-4 text-[#6b7280]">{formatValue(customer.workPhone)}</td>
                    <td className="px-6 py-4">{customer.gstTreatment}</td>
                    <td className="px-6 py-4 font-medium text-[#111827]">{customer.receivables}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Customers;


import { Link } from "react-router-dom";
import Head from "../components/Head";
import useSidebar from "../hooks/useSidebar";

const columns = [
  "Date",
  "Payment #",
  "Reference Number",
  "Customer Name",
  "Invoice#",
  "Mode",
  "Amount",
];

const PaymentsReceived = () => {
  const isSidebarOpen = useSidebar();
  return (
    <div className="min-h-screen bg-[#f6f8ff]">
      <Head title="Payments Received" />

      <div className={`transition-all duration-300 px-10 pb-16 pt-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[#111827]">All Received Payments</h1>
          <div className="flex items-center gap-2">
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d7def4] bg-white text-[#4b5563] shadow-sm transition hover:bg-[#eff2ff]">
              <span className="text-lg">☰</span>
            </button>
            <Link
              to="/sales/invoices"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-transparent bg-[#3366ff] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#244fd6]"
            >
              <span className="text-lg leading-none">＋</span>
              New
            </Link>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d7def4] bg-white text-[#4b5563] shadow-sm transition hover:bg-[#eff2ff]">
              ⋯
            </button>
          </div>
        </header>

        <section className="rounded-3xl border border-[#e1e6f5] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#edf1ff] px-6 py-4">
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d7def4] bg-white text-[#4b5563] shadow-sm transition hover:bg-[#eff2ff]">
              <span className="text-sm">⚙</span>
            </button>
            <span className="text-sm font-medium text-[#4b5563]">Filter & sort your payments</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#f9fbff] text-left text-xs font-semibold uppercase tracking-[0.24em] text-[#8a94b0]">
                  <th className="w-12 px-6 py-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#d1d9f2] text-[#4f46e5] focus:ring-[#4338ca]"
                    />
                  </th>
                  {columns.map((column) => (
                    <th key={column} className="px-6 py-4">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#edf1ff] text-sm text-[#6b7280]">
                  <td className="px-6 py-10 text-center" colSpan={columns.length + 1}>
                    No payments recorded yet. Capture a payment to see it listed here.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PaymentsReceived;


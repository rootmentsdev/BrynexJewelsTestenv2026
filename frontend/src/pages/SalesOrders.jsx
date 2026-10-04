import { Link } from "react-router-dom";
import Head from "../components/Head";
import useSidebar from "../hooks/useSidebar";

const SalesOrders = () => {
  const isSidebarOpen = useSidebar();
  return (
    <div className="min-h-screen bg-[#f6f8ff]">
      <Head title="Sales Orders" />

      <div className={`transition-all duration-300 flex min-h-[calc(100vh-6rem)] flex-col gap-16 px-10 pb-16 pt-10 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[#111827]">All Sales Orders</h1>
          <div className="flex items-center gap-3">
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d4dbf4] bg-white px-4 text-sm font-medium text-[#4b5563] shadow-sm transition hover:bg-[#f0f3ff]">
              <span className="text-[#9aa4c2]">ⓘ</span>
              View Order Stats
            </button>
            <Link
              to="/sales/orders/new"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-transparent bg-[#3366ff] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#244fd6]"
            >
              <span className="text-lg leading-none">＋</span>
              New
            </Link>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d4dbf4] bg-white text-[#4b5563] shadow-sm transition hover:bg-[#f0f3ff]">
              ⋯
            </button>
          </div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-2xl font-semibold text-[#0f172a]">Start Managing Your Sales Activities!</h2>
          <p className="max-w-xl text-sm text-[#6b7280]">
            Create, customize and send professional sales orders. When you start entering orders, they will show up here for quick access and tracking.
          </p>
          <Link
            to="/sales/orders/new"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#3366ff] px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-[#244fd6]"
          >
            Create Sales Order
          </Link>
        </section>
      </div>
    </div>
  );
};

export default SalesOrders;


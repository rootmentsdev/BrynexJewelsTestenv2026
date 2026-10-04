import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import Head from "../components/Head";
import useSidebar from "../hooks/useSidebar";

const columns = [
  {
    title: "Packages, Not Shipped",
    color: "bg-[#def4fa]",
    border: "border-[#9dd6e7]",
  },
  {
    title: "Shipped Packages",
    color: "bg-[#fdf7d7]",
    border: "border-[#f0dc8c]",
  },
  {
    title: "Delivered Packages",
    color: "bg-[#def8cc]",
    border: "border-[#a6dc7e]",
  },
];

const InventoryPackages = () => {
  const isSidebarOpen = useSidebar();
  return (
    <div className={`transition-all duration-300 p-6 bg-[#f5f7fb] min-h-screen ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
      <Head
        title="All Packages"
        description="Track package progress from staging to delivery."
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle />
            <Link
              to="/inventory/packages/new"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#3762f9] px-4 text-sm font-medium text-white transition hover:bg-[#2748c9]"
            >
              <Plus size={16} />
              New
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {columns.map((column) => (
          <div
            key={column.title}
            className="rounded-3xl border border-[#e4e7ef] bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] transition hover:shadow-[0_24px_60px_-30px_rgba(15,23,42,0.22)]"
          >
            <div className={`flex items-center justify-between rounded-t-3xl px-5 py-4 ${column.color}`}>
              <h2 className="text-lg font-semibold text-[#1f2937]">{column.title}</h2>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#7b8599] text-[#475569]">
                <span className="text-lg font-bold">≡</span>
              </div>
            </div>
            <div className="px-5 pb-6 pt-4">
              <div
                className={`flex h-48 items-center justify-center rounded-2xl border border-dashed bg-[#f9fafc] ${column.border}`}
              >
                <p className="text-sm font-medium text-[#94a3b8]">No Records Found</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ViewToggle = () => (
  <div className="inline-flex h-9 items-center rounded-lg border border-[#d7dcf5] bg-white text-[#475569]">
    <button className="flex h-full w-9 items-center justify-center rounded-l-lg bg-[#eff2ff] text-sm font-semibold">
      ☰
    </button>
    <button className="flex h-full w-9 items-center justify-center rounded-r-lg text-sm font-semibold">
      ☐
    </button>
  </div>
);

export default InventoryPackages;
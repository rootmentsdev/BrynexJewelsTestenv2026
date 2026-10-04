import { Link } from "react-router-dom";
import { ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import Head from "../components/Head";
import useSidebar from "../hooks/useSidebar";

const ShoeSalesPriceLists = () => {
  const isSidebarOpen = useSidebar();
  return (
    <div className={`transition-all duration-300 p-6 bg-[#f5f7fb] min-h-screen ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
      <Head
        title="All Price Lists"
        description="Create and manage multiple price lists tailored to different customer segments."
        actions={
          <div className="flex items-center gap-3 text-sm">
            <Link className="text-[#2563eb] hover:text-[#1d4ed8]" to="#">
              Default Price List for Retail Transactions
            </Link>
            <div className="flex items-center gap-2">
              <ActionButton to="/shoe-sales/price-lists/new">
                <Plus size={16} />
                <span>New</span>
              </ActionButton>
              <MutedButton>
                <MoreHorizontal size={16} />
              </MutedButton>
            </div>
          </div>
        }
      />

      <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#e4e6f2] px-6 py-4">
          <button className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#1f2533]">
            All Price Lists
            <ChevronDown size={14} className="text-[#336ad6]" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center gap-6 px-6 py-20 text-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-[#0f172a]">Customize Your Item Pricing with Flexibility</h2>
            <p className="text-base text-[#6b7280]">
              Create and manage multiple price lists tailored to different customer segments.
        </p>
          </div>
          <Link
            to="/shoe-sales/price-lists/new"
            className="inline-flex items-center rounded-lg bg-[#4285f4] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#3367d6]"
          >
            CREATE PRICE LIST
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ShoeSalesPriceLists;

const ActionButton = ({ children, to }) => {
  const Component = to ? Link : "button";
  return (
    <Component
      to={to}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#4285f4] px-4 text-sm font-medium text-white transition hover:bg-[#3367d6] active:bg-[#2851a3]"
    >
      {children}
    </Component>
  );
};

const MutedButton = ({ children }) => (
  <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d2d8e4] bg-white text-[#2f3445] transition hover:bg-[#eef1f7] active:bg-[#e2e6f0]">
    {children}
  </button>
);
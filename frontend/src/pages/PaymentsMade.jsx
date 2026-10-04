import { Link } from "react-router-dom";
import { ChevronDown, Plus, MoreHorizontal } from "lucide-react";
import useSidebar from "../hooks/useSidebar";

const PaymentsMade = () => {
  const isSidebarOpen = useSidebar();
  return (
    <div className={`transition-all duration-300 min-h-screen bg-[#f5f7fb] p-6 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-[#1f2937] leading-tight">
            All Payments
          </h1>
          <button className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-md bg-[#3762f9] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2748c9]">
            <Plus size={16} />
            <span>New</span>
          </button>
          <button className="rounded-md border border-[#d7dcf5] bg-white px-3 py-1.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold text-[#1f2937] mb-2">
            You haven't made any payments yet.
          </h2>
          <p className="text-sm text-[#64748b] mb-8">
            Receipts of your bill payments will show up here.
          </p>
          
          <div className="flex flex-col items-center gap-4">
            <Link
              to="/purchase/bills"
              className="inline-flex items-center justify-center rounded-md bg-[#3762f9] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2748c9] w-full max-w-xs"
            >
              GO TO UNPAID BILLS
            </Link>
            <button className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
              Import Payments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsMade;


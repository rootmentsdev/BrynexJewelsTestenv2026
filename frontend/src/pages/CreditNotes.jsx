import { Link } from "react-router-dom";
import Head from "../components/Head";
import useSidebar from "../hooks/useSidebar";

const CreditNotes = () => {
  const isSidebarOpen = useSidebar();
  return (
    <div className="min-h-screen bg-[#f7f9ff]">
      <Head title="Credit Notes" />

      <div className={`transition-all duration-300 flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center gap-6 px-10 text-center ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-[#0f172a]">All Credit Notes</h1>
          <p className="text-sm text-[#6b7280]">
            Create, organize, and track credit notes for your customers. Begin by creating a new credit note or import
            existing records.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Link
            to="/credit-notes/new"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#3366ff] px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-[#244fd6]"
          >
            Create New Credit Note
          </Link>
          <button className="text-sm font-medium text-[#3366ff] hover:text-[#244fd6]">
            Import Credit Notes
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditNotes;


import Head from "../components/Head";
import useSidebar from "../hooks/useSidebar";

const DeliveryChallans = () => {
  const isSidebarOpen = useSidebar();
  return (
    <div className={`transition-all duration-300 p-6 bg-[#f5f7fb] min-h-screen ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
      <Head
        title="Delivery Challans"
        description="Track dispatch documentation and proof of delivery."
      />
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-[#1f2937]">Delivery Challans</h1>
        <p className="text-[#4b5563]">
          Use this canvas to monitor goods-in-transit, attach PODs, and reconcile delivery notes.
        </p>
        <div className="border border-dashed border-[#cbd5f5] rounded-lg p-4 text-[#6366f1] bg-[#eef2ff]">
          Placeholder area – integrate carrier feeds, signature capture, or route analytics here.
        </div>
      </div>
    </div>
  );
};

export default DeliveryChallans;


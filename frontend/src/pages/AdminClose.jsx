import React, { useState, useEffect } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import Select from "react-select";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { Helmet } from "react-helmet";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useSidebar } from "../hooks/useSidebar.js";

// Function to format location names with proper spacing
const formatLocationName = (name) => {
  if (!name) return name;
  let formatted = name.trim();
  formatted = formatted.replace(/^([A-Z])([A-Z][a-z])/g, "$1 $2");
  formatted = formatted.replace(/^([A-Z])([a-z])/g, "$1 $2");
  return formatted;
};

// Fallback locations for backward compatibility
const fallbackLocations = [
  { value: "Production", locCode: "101" },
  { value: "Office", locCode: "102" },
  { value: "WAREHOUSE", locCode: "103" },
  { value: "Z-Edapally1", locCode: "144" },
  { value: "G-Edappally", locCode: "702" },
  { value: "SG-Trivandrum", locCode: "700" },
  { value: "Z- Edappal", locCode: "100" },
  { value: "Z.Perinthalmanna", locCode: "133" },
  { value: "Z.Kottakkal", locCode: "122" },
  { value: "G.Kottayam", locCode: "701" },
  { value: "G.Perumbavoor", locCode: "703" },
  { value: "G.Thrissur", locCode: "704" },
  { value: "G.Chavakkad", locCode: "706" },
  { value: "G.Calicut ", locCode: "712" },
  { value: "G.Vadakara", locCode: "708" },
  { value: "G.Edappal", locCode: "707" },
  { value: "G.Perinthalmanna", locCode: "709" },
  { value: "G.Kottakkal", locCode: "711" },
  { value: "G.Manjeri", locCode: "710" },
  { value: "G.Palakkad ", locCode: "705" },
  { value: "G.Kalpetta", locCode: "717" },
  { value: "G.Kannur", locCode: "716" },
  { value: "G.MG Road", locCode: "718" },
  { value: "Dappr Squad", locCode: "555" },
];

// Custom React-Select styles for clean modern UI
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "#ffffff",
    borderColor: state.isFocused ? "#9333ea" : "#d1d5db",
    borderRadius: "0.5rem",
    padding: "2px 4px",
    minHeight: "42px",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(147, 51, 234, 0.2)" : "none",
    "&:hover": {
      borderColor: "#9ca3af",
    },
    fontSize: "0.875rem",
    color: "#1f2937",
    cursor: "pointer",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "#9333ea"
      : state.isFocused
      ? "#f3e8ff"
      : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#374151",
    fontSize: "0.875rem",
    cursor: "pointer",
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: "0.5rem",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    zIndex: 50,
  }),
};

const AdminClose = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [cashDate, setCashDate] = useState("");
  const [cash, setCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [bank, setBank] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [AllLocations, setAllLocations] = useState(
    fallbackLocations.map((loc) => ({
      ...loc,
      label: formatLocationName(loc.value),
    }))
  );

  const isSidebarOpen = useSidebar();
  const currentUser = JSON.parse(localStorage.getItem("rootfinuser") || "{}");
  const email = currentUser?.email;
  const isOfficeUser = currentUser?.locCode === "102";

  // Office users (locCode 102) can only close Office, Production, and Warehouse
  const officeAllowedLocCodes = ["101", "102", "103"];

  useEffect(() => {
    const locs = fallbackLocations
      .filter((loc) => !isOfficeUser || officeAllowedLocCodes.includes(loc.locCode))
      .map((loc) => ({
        ...loc,
        label: formatLocationName(loc.value),
      }));
    setAllLocations(locs);
  }, []);

  // Load existing closing data when location and date are selected
  useEffect(() => {
    const loadExistingData = async () => {
      if (!selectedLocation || !cashDate) {
        setCash("");
        setClosingCash("");
        setBank("");
        setIsEditMode(false);
        return;
      }

      setLoadingData(true);
      try {
        const response = await fetch(
          `${baseUrl.baseUrl}user/getsaveCashBank?locCode=${selectedLocation.locCode}&date=${cashDate}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setCash(data.data.cash?.toString() || "");
            setClosingCash(data.data.Closecash?.toString() || "");
            setBank(data.data.bank?.toString() || "");
            setIsEditMode(true);
          }
        } else if (response.status === 404) {
          setCash("");
          setClosingCash("");
          setBank("");
          setIsEditMode(false);
        }
      } catch (error) {
        console.error("Error loading existing data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    loadExistingData();
  }, [selectedLocation, cashDate]);

  const apiUrl5 = `${baseUrl.baseUrl}user/saveCashBank`;

  const handleSubmit = async () => {
    if (!selectedLocation || !cashDate || !cash || !closingCash || !bank) {
      alert("Please fill in all fields.");
      return;
    }

    const payload = {
      totalAmount: closingCash,
      totalCash: cash,
      totalBankAmount: bank,
      date: cashDate,
      locCode: selectedLocation.locCode,
      email,
    };

    try {
      setLoading(true);
      const res = await fetch(apiUrl5, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      alert(data.message || `Data ${isEditMode ? "updated" : "saved"} successfully!`);

      if (isEditMode) {
        const reloadResponse = await fetch(
          `${baseUrl.baseUrl}user/getsaveCashBank?locCode=${selectedLocation.locCode}&date=${cashDate}`
        );
        if (reloadResponse.ok) {
          const reloadData = await reloadResponse.json();
          console.log("Data after update:", reloadData.data);
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEnterToSave((e) => {
    handleSubmit();
  }, loading);

  return (
    <>
      <Helmet>
        <title>Admin Close | RootFin</title>
      </Helmet>

      <div className="min-h-screen bg-[#f8f9fa]">
        <Header title="Admin Close" />

        <div
          className={`transition-all duration-300 ${
            isSidebarOpen ? "ml-[240px]" : "ml-0"
          }`}
        >
          <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
            {/* Page Header */}
            <div>
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                Admin Close
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Record and manage daily cash &amp; bank closing summaries by store location
              </p>
            </div>

            {/* Edit Mode Alert Banner */}
            {isEditMode && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Edit Mode Active
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Updating existing closing data for{" "}
                    <span className="font-semibold">{selectedLocation?.label}</span> on{" "}
                    <span className="font-semibold">{cashDate}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Main Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 md:p-8 space-y-6">
              {/* Location Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
                  Location
                </label>
                <Select
                  options={AllLocations}
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  placeholder="Select a location..."
                  styles={customSelectStyles}
                  isSearchable
                />
              </div>

              {/* Grid Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cash Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
                    Cash Date
                  </label>
                  <input
                    type="date"
                    value={cashDate}
                    onChange={(e) => setCashDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all"
                  />
                </div>

                {loadingData ? (
                  <div className="col-span-1 md:col-span-2 py-8 flex flex-col items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    <p className="text-sm">Loading existing closing data...</p>
                  </div>
                ) : (
                  <>
                    {/* Cash (Calculated Closing) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
                        Cash (Calculated Closing)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={cash}
                          onChange={(e) => setCash(e.target.value)}
                          placeholder="Enter calculated closing cash"
                          className="w-full pl-8 pr-3.5 py-2.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Opening + Day's transactions (for next day opening)
                      </p>
                    </div>

                    {/* Closing Cash (Physical Count) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
                        Closing Cash (Physical Count)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={closingCash}
                          onChange={(e) => setClosingCash(e.target.value)}
                          placeholder="Enter physical cash counted"
                          className="w-full pl-8 pr-3.5 py-2.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Actual cash counted from physical denominations
                      </p>
                    </div>

                    {/* Bank */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
                        Bank
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={bank}
                          onChange={(e) => setBank(e.target.value)}
                          placeholder="Enter bank amount"
                          className="w-full pl-8 pr-3.5 py-2.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-start">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || loadingData}
                  className="px-8 py-3 rounded-lg bg-[#9333ea] hover:bg-[#7e22ce] active:bg-[#6b21a8] text-white text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isEditMode ? "Update Close" : "Save Close"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminClose;

import React, { useState } from "react";
import Headers from "../components/Header.jsx";
import SingleImageUpload from "../components/SingleImageUpload";
import baseUrl from "../api/api";
import { BsBank2 } from "react-icons/bs";
import { MdCurrencyRupee } from "react-icons/md";
import { ChevronDown, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet";
import { useSidebar } from "../hooks/useSidebar.js";

const baseExpenseCats = [
  { value: "dry cleaning",          label: "Dry Cleaning",           subs: ["Dry cleaning"] },
  { value: "altration",             label: "Altration",              subs: ["Altration"] },
  { value: "material",              label: "Material",               subs: ["Material"] },
  { value: "courier charges",       label: "Courier Charges",        subs: ["Courier charges"] },
  { value: "maintenance expenses",  label: "Repairs & Maintenance",  subs: ["Ac service", "Interior Maintenance", "Glass Cleaning", "Electrical work"] },
  { value: "travel exp",            label: "Travel Exp",             subs: ["Travel exp"] },
  { value: "fuel exp",              label: "Fuel Exp",               subs: ["Fuel exp"] },
  { value: "petty expenses",        label: "Office Expense",         subs: ["Air freshner", "Grooming Kit", "Cleaning Products", "Parking charge"] },
  { value: "telephone internet",    label: "Internet Expense",       subs: ["Telephone/wifi"] },
  { value: "utility bill",          label: "Electricity Charges",    subs: ["Electricity Charges"] },
  { value: "waste management",      label: "Waste Management",       subs: ["Waste management"] },
  { value: "water charges",         label: "Water Charges",          subs: ["Water charges"] },
  { value: "salary",                label: "Salary/Salary Advance",  subs: ["Salary/salary advance"] },
  { value: "printing stationary",   label: "Printing & Stationary",  subs: ["Printout", "Books/pen/Checklist/Register/Bill Book/Voucher", "Stationary Items"] },
  { value: "staff welfare",         label: "Staff Welfare",          subs: ["Cake purchase", "Food allowance on Special Occassion", "Other Refreshment"] },
  { value: "staff reimbursement",   label: "Staff Accommodation",    subs: ["Staff room rent/Electricity"] },
  { value: "rent",                  label: "Rent",                   subs: ["Store Rent"] },
  { value: "asset purchase",        label: "Asset Purchase",         subs: ["Steamer", "Chairs", "Electronic Items", "Any other Furniture items"] },
  { value: "spot incentive",        label: "Incentive",              subs: ["Spot incentive", "Weekly incentive"] },
  { value: "other expenses",        label: "Refund",                 subs: ["Security Refund", "Cancellation Refund", "Compensation"] },
  { value: "bulk amount transfer",  label: "Cash to Bank",           subs: ["Cash Deposit"] },
];

const Expenses = () => {
  const isSidebarOpen = useSidebar();
  const currentusers = JSON.parse(localStorage.getItem("rootfinuser")) || {};
  const cats = baseExpenseCats;

  const [selectedCategory, setSelectedCategory] = useState(cats[0]);
  const [subCategory, setSubCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCategoryChange = (val) => {
    const cat = cats.find((c) => c.value === val);
    setSelectedCategory(cat);
    if (cat.value === "bulk amount transfer") {
      setPaymentMethod("cash");
      setSplitPayment(false);
    }
    setSubCategory("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (splitPayment) {
      const total =
        parseFloat(cashAmount || 0) + parseFloat(bankAmount || 0) + parseFloat(upiAmount || 0);
      if (Math.abs(total - parseFloat(amount || 0)) > 0.01) {
        alert("Sum of cash, bank, and UPI must equal the total amount.");
        setIsSubmitting(false);
        return;
      }
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount.");
      setIsSubmitting(false);
      return;
    }
    if (!remark.trim()) {
      alert("Please enter a remark.");
      setIsSubmitting(false);
      return;
    }
    if (!attachmentFile) {
      alert("Attachment is required for Expense.");
      setIsSubmitting(false);
      return;
    }

    const data = {
      type: "expense",
      category: selectedCategory.value,
      subCategory: subCategory || undefined,
      remark,
      locCode: currentusers.locCode,
      amount: `-${amount}`,
      cash: splitPayment ? `-${cashAmount || "0"}` : paymentMethod === "cash" ? `-${amount}` : "0",
      bank: splitPayment ? `-${bankAmount || "0"}` : paymentMethod === "bank" ? `-${amount}` : "0",
      upi:  splitPayment ? `-${upiAmount  || "0"}` : paymentMethod === "upi"  ? `-${amount}` : "0",
      paymentMethod: splitPayment ? "split" : paymentMethod,
      date: new Date().toISOString().split("T")[0],
      attachment: attachmentFile?.base64 || null,
    };

    try {
      const res = await fetch(`${baseUrl.baseUrl}user/createPayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        alert("Error: " + (json?.message || "Unknown error"));
      } else {
        alert("Expense recorded successfully!");
        setAmount("");
        setCashAmount("");
        setBankAmount("");
        setUpiAmount("");
        setRemark("");
        setAttachmentFile(null);
        setSubCategory("");
      }
    } catch {
      alert("Failed to create transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setAmount("");
    setRemark("");
    setAttachmentFile(null);
    setSubCategory("");
    setCashAmount("");
    setBankAmount("");
    setUpiAmount("");
    setPaymentMethod("cash");
    setSplitPayment(false);
    setSelectedCategory(cats[0]);
  };

  return (
    <>
      <Helmet>
        <title>Record Expense | RootFin</title>
      </Helmet>

      <div className="min-h-screen bg-[#f8f9fa]">
        <Headers title={"Expenses"} />

        <div
          className={`transition-all duration-300 ${
            isSidebarOpen ? "ml-[240px]" : "ml-0"
          }`}
        >
          <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
            {/* Page Header */}
            <div>
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                Expenses
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Record &amp; Track your business transactions
              </p>
            </div>

            {/* Main Form Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Row 1: Category + Amount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCategory.value}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm pr-10 transition-all"
                      >
                        {cats.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={18}
                        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
                      Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        className="w-full rounded-lg border border-gray-300 bg-white pl-8 pr-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-category tags */}
                {selectedCategory.subs?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs font-medium text-gray-500 mr-1">Subcategories:</span>
                    {selectedCategory.subs.map((sub) => (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => setSubCategory(subCategory === sub ? "" : sub)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          subCategory === sub
                            ? "bg-[#9333ea] text-white shadow-xs"
                            : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-100 my-4" />

                {/* Way of Payment */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-600 tracking-wide uppercase block">
                    Way of Payment
                  </label>
                  <div className="flex flex-wrap items-center gap-6">
                    {[
                      { id: "cash", label: "Cash", icon: <MdCurrencyRupee size={18} /> },
                      ...(selectedCategory.value !== "bulk amount transfer"
                        ? [
                            { id: "bank", label: "Bank", icon: <BsBank2 size={16} /> },
                            {
                              id: "upi",
                              label: "UPI",
                              icon: <span className="font-black italic text-xs">UPI</span>,
                            },
                          ]
                        : []),
                    ].map(({ id, label, icon }) => {
                      const active = !splitPayment && paymentMethod === id;
                      return (
                        <label
                          key={id}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border cursor-pointer select-none transition-all ${
                            active
                              ? "bg-purple-50/80 border-purple-300 text-purple-900 shadow-xs"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={id}
                            checked={active}
                            onChange={() => {
                              setPaymentMethod(id);
                              setSplitPayment(false);
                            }}
                            className="w-4 h-4 accent-[#9333ea]"
                          />
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            {icon} {label}
                          </span>
                        </label>
                      );
                    })}

                    {selectedCategory.value !== "bulk amount transfer" && (
                      <label
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border cursor-pointer select-none transition-all ${
                          splitPayment
                            ? "bg-purple-50/80 border-purple-300 text-purple-900 shadow-xs"
                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={splitPayment}
                          onChange={() => setSplitPayment(!splitPayment)}
                          className="w-4 h-4 rounded accent-[#9333ea]"
                        />
                        <span className="text-sm font-medium">
                          Split Payment (Cash + Bank + UPI)
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Split Inputs */}
                  {splitPayment && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
                      {[
                        ["Cash", cashAmount, setCashAmount],
                        ["Bank", bankAmount, setBankAmount],
                        ["UPI", upiAmount, setUpiAmount],
                      ].map(([lbl, val, setVal]) => (
                        <div key={lbl} className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-600">
                            {lbl} Amount
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              ₹
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={val}
                              onChange={(e) => setVal(e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 my-4" />

                {/* Remarks + Attachment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Remarks */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
                      Remarks
                    </label>
                    <textarea
                      rows={5}
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      required
                      placeholder="Enter your transaction details here..."
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm resize-none transition-all"
                    />
                  </div>

                  {/* Attachment (Required) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
                      Attachment <span className="text-red-500">*</span>
                    </label>
                    <SingleImageUpload
                      onImageSelect={setAttachmentFile}
                      existingImage={attachmentFile}
                      required
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all cursor-pointer shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2.5 rounded-lg bg-[#9333ea] hover:bg-[#7e22ce] active:bg-[#6b21a8] text-white text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{isSubmitting ? "Submitting..." : "Submit Expense"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Expenses;

import { useState, useRef } from "react";
import Header from "../components/Header";
import SingleImageUpload from "../components/SingleImageUpload";
import baseUrl from "../api/api";
import { useEnterToSave } from "../hooks/useEnterToSave";
import useSidebar from "../hooks/useSidebar";

const SecurityPending = () => {
  const isSidebarOpen = useSidebar();
    const currentusers = JSON.parse(localStorage.getItem("rootfinuser"));

    const [selectedOption, setSelectedOption] = useState("radioDefault01");
    const [remark, setRemark] = useState("");
    const [amount, setAmount] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentDate = new Date().toISOString().split("T")[0];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return; // Prevent multiple submissions

        setIsSubmitting(true);

        try {
            const parsedAmount = parseFloat(amount) || 0;
            if (parsedAmount <= 0) {
                alert("Please enter a valid amount.");
                setIsSubmitting(false);
                return;
            }

            const transactionData = {
                type: "money transfer",
                category: selectedOption === "radioDefault01" ? "Cash to Bank" : "Bank to Cash",
                remark: remark,
                locCode: currentusers.locCode,
                amount: `${parsedAmount}`,
                bank: 0,
                upi: 0,
                cash: selectedOption === "radioDefault01" ? `-${parsedAmount}` : `${parsedAmount}`,
                paymentMethod: selectedOption === "radioDefault01" ? "cash" : "bank",
                date: currentDate,
                isSecurityReturn: selectedOption === "radioDefault01" || selectedOption === "radioDefault02",
                attachment: selectedOption === "radioDefault01" && attachment ? attachment.base64 : ""
            };

            const response = await fetch(`${baseUrl.baseUrl}user/createPayment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(transactionData)
            });

            const result = await response.json();

            if (response.ok) {
                alert("Transaction successfully created!");
                console.log("Success:", result);

                // ✅ Reset all fields
                setAmount("");
                setRemark("");
                setSelectedOption("radioDefault01");
                setAttachment(null);
            } else {
                alert("Error: " + result.message);
                console.error("Error:", result);
            }

            console.log(transactionData);
        } catch (error) {
            console.error("Error submitting transaction:", error);
            alert("An error occurred while submitting the transaction.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Enter key to submit form (works alongside form onSubmit)
    useEnterToSave(() => {
        if (!isSubmitting) {
            const syntheticEvent = { preventDefault: () => {} };
            handleSubmit(syntheticEvent);
        }
    }, isSubmitting);

    return (
        <>
            <Header title="Cash Bank Ledger" />
            <div>
                <div className="ml-[290px] mt-[80px]">
                    <form onSubmit={handleSubmit}>
                        {/* Radio Buttons */}
                        <div className="flex gap-[50px]">
                            <div className="mb-2 flex items-center gap-2">
                                <input
                                    className="w-5 h-5 accent-blue-500"
                                    type="radio"
                                    name="flexRadioDefault"
                                    id="radioDefault01"
                                    value="radioDefault01"
                                    checked={selectedOption === "radioDefault01"}
                                    onChange={(e) => setSelectedOption(e.target.value)}
                                />
                                <label htmlFor="radioDefault01" className="cursor-pointer">
                                    Cash to Bank
                                </label>
                            </div>

                            {currentusers.power === "admin" && (
                                <div className="mb-2 flex items-center gap-2">
                                    <input
                                        className="w-5 h-5 accent-blue-500"
                                        type="radio"
                                        name="flexRadioDefault"
                                        id="radioDefault02"
                                        value="radioDefault02"
                                        checked={selectedOption === "radioDefault02"}
                                        onChange={(e) => setSelectedOption(e.target.value)}
                                    />
                                    <label htmlFor="radioDefault02" className="cursor-pointer">
                                        Bank to Cash
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Amount & Remarks */}
                        <div className="mt-4 flex flex-col gap-[50px]">
                            <div className="flex flex-col">
                                <div className="flex flex-col">
                                    <label htmlFor="amount">Amount</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="border border-gray-500 p-2 px-8 w-[250px] rounded-md"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="Enter Amount"
                                    />
                                </div>

                                <div className="flex flex-col w-[250px] rounded-md mt-[50px]">
                                    <label htmlFor="remark">Remarks</label>
                                    <input
                                        type="text"
                                        className="border border-gray-500 p-2 py-10 px-8 rounded-md"
                                        placeholder="Enter your remarks"
                                        value={remark}
                                        onChange={(e) => setRemark(e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Optional Attachment for Cash to Bank */}
                                {selectedOption === "radioDefault01" && (
                                    <div className="flex flex-col w-[300px] rounded-md mt-[50px]">
                                        <label className="mb-3 font-medium text-gray-700">Attachment (optional)</label>
                                        <SingleImageUpload
                                            onImageSelect={setAttachment}
                                            existingImage={attachment}
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`text-white px-6 py-2 rounded-md mt-4 transition flex items-center gap-2 ${
                                        isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                                    }`}
                                >
                                    {isSubmitting && (
                                        <svg
                                            className="animate-spin h-5 w-5 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                    )}
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default SecurityPending;

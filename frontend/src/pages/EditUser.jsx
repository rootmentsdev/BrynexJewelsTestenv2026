import { useState, useEffect } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const EditUser = () => {
  const isSidebarOpen = useSidebar();
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const storeFromState = location.state?.store;

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [locCode, setLocCode] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [gst, setGst] = useState("");
    const [power, setPower] = useState("normal");
    const [role, setRole] = useState("");
    const [allowedLocCodes, setAllowedLocCodes] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (storeFromState) {
            setUsername(storeFromState.username);
            setEmail(storeFromState.email);
            setLocCode(storeFromState.locCode || "");
            setAddress(storeFromState.address || "");
            setPhone(storeFromState.phone || "");
            setGst(storeFromState.gst || "");
            setPower(storeFromState.power);
            setRole(storeFromState.role || "");
            setAllowedLocCodes(storeFromState.allowedLocCodes || []);
        }
    }, [storeFromState]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !email) {
            alert("Please fill in all required fields.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        const payload = {
            username,
            email,
            locCode,
            address,
            phone,
            gst,
            power,
            role: role || undefined,
            allowedLocCodes: role === "cluster_manager" ? allowedLocCodes : [],
        };

        if (password) {
            payload.password = password;
        }

        try {
            setLoading(true);
            
            const response = await fetch(`${baseUrl.baseUrl}user/updateUser/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || "User updated successfully!");
                navigate("/manage-users/existing-users");
            } else {
                alert(data.message || "Failed to update user. Please try again.");
            }
        } catch (error) {
            console.error("Error updating user:", error);
            alert("An error occurred while updating the user. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header title="Edit User" />
            <div className="ml-[290px] mt-[80px] p-4">
                <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-8">
                    <h2 className="text-2xl font-semibold text-center mb-6 text-[#016E5B]">
                        Edit User
                    </h2>
                    
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            Editing: <span className="font-semibold">{username}</span>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block mb-2 font-semibold text-gray-700">
                                Store Name (Username) *
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g., G.MG Road"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#016E5B] focus:border-none outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold text-gray-700">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="e.g., store@example.com"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#016E5B] focus:border-none outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold text-gray-700">
                                Password (Leave blank to keep current)
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password (optional)"
                                    className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#016E5B] focus:border-none outline-none"
                                />
                                <span
                                    className="absolute right-4 top-3 text-[#016E5B] text-xl cursor-pointer"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold text-gray-700">
                                Location Code
                            </label>
                            <input
                                type="text"
                                value={locCode}
                                onChange={(e) => setLocCode(e.target.value)}
                                placeholder="e.g., 718"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#016E5B] focus:border-none outline-none"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold text-gray-700">
                                Store Address
                            </label>
                            <textarea
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="e.g., MG Road, Kochi, Kerala - 682016"
                                rows="3"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#016E5B] focus:border-none outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold text-gray-700">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="e.g., +91 9876543210"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#016E5B] focus:border-none outline-none"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold text-gray-700">
                                GST Number
                            </label>
                            <input
                                type="text"
                                value={gst}
                                onChange={(e) => setGst(e.target.value)}
                                placeholder="e.g., 29ABCDE1234F1Z5"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#016E5B] focus:border-none outline-none"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold text-gray-700">
                                User Type *
                            </label>
                            <select
                                value={power}
                                onChange={(e) => setPower(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#016E5B] focus:border-none outline-none"
                                required
                            >
                                <option value="normal">Normal</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold text-gray-700">
                                Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => { setRole(e.target.value); setAllowedLocCodes([]); }}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#016E5B] focus:border-none outline-none"
                            >
                                <option value="">— None —</option>
                                <option value="store_user">Store User</option>
                                <option value="store_manager">Store Manager</option>
                                <option value="cluster_manager">Cluster Manager</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Super Admin</option>
                            </select>
                        </div>

                        {role === "cluster_manager" && (
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700">
                                    Allowed Stores (Loc Codes)
                                </label>
                                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                                    {[
                                        { locName: "Z-Edapally1", locCode: "144" },
                                        { locName: "Warehouse", locCode: "858" },
                                        { locName: "G-Edappally", locCode: "702" },
                                        { locName: "HEAD OFFICE01", locCode: "759" },
                                        { locName: "SG-Trivandrum", locCode: "700" },
                                        { locName: "Z- Edappal", locCode: "100" },
                                        { locName: "Z.Perinthalmanna", locCode: "133" },
                                        { locName: "Z.Kottakkal", locCode: "122" },
                                        { locName: "G.Kottayam", locCode: "701" },
                                        { locName: "G.Perumbavoor", locCode: "703" },
                                        { locName: "G.Thrissur", locCode: "704" },
                                        { locName: "G.Chavakkad", locCode: "706" },
                                        { locName: "G.Calicut", locCode: "712" },
                                        { locName: "G.Vadakara", locCode: "708" },
                                        { locName: "G.Edappal", locCode: "707" },
                                        { locName: "G.Perinthalmanna", locCode: "709" },
                                        { locName: "G.Kottakkal", locCode: "711" },
                                        { locName: "G.Manjeri", locCode: "710" },
                                        { locName: "G.Palakkad", locCode: "705" },
                                        { locName: "G.Kalpetta", locCode: "717" },
                                        { locName: "G.Kannur", locCode: "716" },
                                        { locName: "G.MG Road", locCode: "718" },
                                        { locName: "WAREHOUSE", locCode: "103" },
                                    ].map(s => (
                                        <label key={s.locCode} className="flex items-center gap-2 cursor-pointer text-sm">
                                            <input
                                                type="checkbox"
                                                checked={allowedLocCodes.includes(s.locCode)}
                                                onChange={(e) => {
                                                    setAllowedLocCodes(prev =>
                                                        e.target.checked
                                                            ? [...prev, s.locCode]
                                                            : prev.filter(c => c !== s.locCode)
                                                    );
                                                }}
                                            />
                                            {s.locName} ({s.locCode})
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{allowedLocCodes.length} store(s) selected</p>
                            </div>
                        )}

                        <div className="flex justify-center gap-4 mt-6">
                            <button
                                type="button"
                                onClick={() => navigate("/manage-users/existing-users")}
                                className="w-[40%] py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`w-[40%] py-2 rounded-lg text-white ${
                                    loading
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-[#016E5B] hover:bg-[#014f42]"
                                }`}
                                disabled={loading}
                            >
                                {loading ? "Updating..." : "Update User"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default EditUser;

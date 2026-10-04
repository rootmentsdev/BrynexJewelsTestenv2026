import { useState, useEffect, useRef } from "react";
import { FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import { UserPlus } from "lucide-react";
import baseUrl from "../api/api";
import { useSidebar } from "../hooks/useSidebar.js";

const AddNewUser = () => {
    const isSidebarOpen = useSidebar();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [power, setPower] = useState("normal");
    const [role, setRole] = useState("");
    const [allowedLocCodes, setAllowedLocCodes] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showStoreDropdown, setShowStoreDropdown] = useState(false);
    const [storeSearchTerm, setStoreSearchTerm] = useState("");
    const [takenLocCodes, setTakenLocCodes] = useState(new Set());
    const dropdownRef = useRef(null);

    const fetchTakenStores = () => {
        fetch(`${baseUrl.baseUrl}user/getAllUsers`)
            .then(r => r.ok ? r.json() : {})
            .then(data => {
                const taken = new Set();
                (data.users || []).forEach(u => {
                    if ((u.role || "").toLowerCase() === "cluster_manager") {
                        (u.allowedLocCodes || []).forEach(c => taken.add(c));
                    }
                });
                setTakenLocCodes(taken);
            })
            .catch(() => {});
    };

    // Fetch all cluster managers to know which stores are already taken
    useEffect(() => {
        fetchTakenStores();
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowStoreDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const availableStores = [
        { locName: "Z-Edapally", locCode: "144" },
        { locName: "Z-Edappal", locCode: "100" },
        { locName: "Z-Perinthalmanna", locCode: "133" },
        { locName: "Z-Kottakkal", locCode: "122" },
        { locName: "Warehouse", locCode: "858" },
        { locName: "G-Edappally", locCode: "702" },
        { locName: "HEAD OFFICE01", locCode: "759" },
        { locName: "SG-Trivandrum", locCode: "700" },
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
    ];

    const filteredStores = availableStores.filter(store => 
        store.locName.toLowerCase().includes(storeSearchTerm.toLowerCase()) &&
        !allowedLocCodes.includes(store.locCode)
    );

    const handleStoreSelect = (locCode) => {
        if (takenLocCodes.has(locCode)) return; // block taken stores
        if (!allowedLocCodes.includes(locCode)) {
            setAllowedLocCodes([...allowedLocCodes, locCode]);
        }
        setStoreSearchTerm("");
        setShowStoreDropdown(false);
    };

    const handleRemoveStore = (locCode) => {
        setAllowedLocCodes(allowedLocCodes.filter(code => code !== locCode));
    };

    const getStoreName = (locCode) => {
        const store = availableStores.find(s => s.locCode === locCode);
        return store ? store.locName : locCode;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !email || !role) {
            alert("Please fill in all required fields.");
            return;
        }

        if (!password) {
            alert("Password is required for new users.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        if (role === "cluster_manager" && allowedLocCodes.length === 0) {
            alert("Please assign at least one store for Cluster Manager role.");
            return;
        }

        const payload = {
            username,
            email,
            locCode: "",
            power,
            role: role || undefined,
            allowedLocCodes: role === "cluster_manager" ? allowedLocCodes : [],
            password,
        };

        try {
            setLoading(true);
            
            const response = await fetch(`${baseUrl.baseUrl}user/signin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || "User created successfully!");
                // Reset form
                setUsername("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setPower("normal");
                setRole("");
                setAllowedLocCodes([]);
                setStoreSearchTerm("");
                // Refresh taken stores so newly assigned ones show immediately
                fetchTakenStores();
            } else {
                alert(data.message || "Failed to create user. Please try again.");
            }
        } catch (error) {
            console.error("Error creating user:", error);
            alert("An error occurred while creating the user. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bg-white min-h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-[240px]' : 'ml-0'}`}>
            {/* Header Section */}
            <div className="bg-white px-8 py-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-4 rounded-xl">
                        <UserPlus className="text-white" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">ADD NEW USER</h1>
                        <p className="text-gray-500 text-sm">Add and manage new users</p>
                    </div>
                </div>
            </div>

            {/* Form Section */}
            <div className="bg-white px-8 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Row 1: Role, Username, User Type */}
                    <div className="grid grid-cols-3 gap-8">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-600 uppercase">
                                User Role *
                            </label>
                            <select
                                value={role}
                                onChange={(e) => { setRole(e.target.value); setAllowedLocCodes([]); }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-700"
                                required
                            >
                                <option value="">Select Role</option>
                                <option value="store_user">Store User</option>
                                <option value="store_manager">Store Manager</option>
                                <option value="cluster_manager">Cluster Manager</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Super Admin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-600 uppercase">
                                User Name *
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g., G.MG Road"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-600 uppercase">
                                User Type *
                            </label>
                            <select
                                value={power}
                                onChange={(e) => setPower(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-700"
                                required
                            >
                                <option value="normal">Normal</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Assign Stores & Email */}
                    <div className="grid grid-cols-2 gap-8">
                        {role === "cluster_manager" && (
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-600 uppercase">
                                    Assign Stores *
                                </label>
                                <div className="relative" ref={dropdownRef}>
                                    <input
                                        type="text"
                                        value={storeSearchTerm}
                                        onChange={(e) => {
                                            setStoreSearchTerm(e.target.value);
                                            setShowStoreDropdown(true);
                                        }}
                                        onFocus={() => setShowStoreDropdown(true)}
                                        placeholder="e.g., Z Edappally"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                    
                                    {/* Dropdown */}
                                    {showStoreDropdown && filteredStores.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {filteredStores.map((store) => {
                                                const isTaken = takenLocCodes.has(store.locCode);
                                                return (
                                                    <div
                                                        key={store.locCode}
                                                        onClick={() => !isTaken && handleStoreSelect(store.locCode)}
                                                        className={`px-4 py-2 text-sm flex items-center justify-between ${
                                                            isTaken
                                                                ? "text-gray-400 bg-gray-50 cursor-not-allowed"
                                                                : "hover:bg-blue-50 cursor-pointer text-gray-700"
                                                        }`}
                                                    >
                                                        <span>{store.locName}</span>
                                                        {isTaken && <span className="text-xs text-red-400 ml-2">Already assigned</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Selected Stores Tags */}
                                {allowedLocCodes.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {allowedLocCodes.map((locCode) => (
                                            <span
                                                key={locCode}
                                                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                                            >
                                                {getStoreName(locCode)}
                                                <FaTimes
                                                    className="cursor-pointer hover:text-blue-900"
                                                    size={12}
                                                    onClick={() => handleRemoveStore(locCode)}
                                                />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={role === "cluster_manager" ? "" : "col-span-2"}>
                            <label className="block mb-2 text-sm font-medium text-gray-600 uppercase">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="e.g., store@example.com"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Row 3: Password & Confirm Password */}
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-600 uppercase">
                                Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    required
                                />
                                <span
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 cursor-pointer hover:text-blue-700"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-600 uppercase">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm Password"
                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    required
                                />
                                <span
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 cursor-pointer hover:text-blue-700"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => {
                                setUsername("");
                                setEmail("");
                                setPassword("");
                                setConfirmPassword("");
                                setPower("normal");
                                setRole("");
                                setAllowedLocCodes([]);
                            }}
                            className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-8 py-3 rounded-lg font-medium text-white transition-colors ${
                                loading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700"
                            }`}
                        >
                            {loading ? "SAVING..." : "SAVE USER"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddNewUser;

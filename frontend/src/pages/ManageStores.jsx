import { useState, useEffect } from "react";
import { FaEye, FaEyeSlash, FaEdit, FaTrash } from "react-icons/fa";
import Header from "../components/Header";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const ManageStores = () => {
  const isSidebarOpen = useSidebar();
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
    
    // Edit mode states
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [stores, setStores] = useState([]);
    const [loadingStores, setLoadingStores] = useState(false);
    
    // Password reset states
    const [showResetForm, setShowResetForm] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    
    // Check if user is admin
    const userInfo = JSON.parse(localStorage.getItem("rootfinuser") || "{}");
    const isAdmin = userInfo.power === "admin";

    // Fetch all stores on component mount
    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            setLoadingStores(true);
            const response = await fetch(`${baseUrl.baseUrl}user/getAllUsers`);
            const data = await response.json();
            
            if (response.ok) {
                setStores(data.users || []);
            }
        } catch (error) {
            console.error("Error fetching stores:", error);
        } finally {
            setLoadingStores(false);
        }
    };

    const handleEdit = (store) => {
        setIsEditMode(true);
        setEditingUserId(store._id);
        setUsername(store.username);
        setEmail(store.email);
        setLocCode(store.locCode);
        setAddress(store.address || "");
        setPhone(store.phone || "");
        setGst(store.gst || "");
        setPower(store.power);
        setRole(store.role || "");
        setAllowedLocCodes(store.allowedLocCodes || []);
        setPassword(""); // Don't populate password for security
        
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditingUserId(null);
        setUsername("");
        setEmail("");
        setPassword("");
        setLocCode("");
        setAddress("");
        setPhone("");
        setGst("");
        setPower("normal");
        setRole("");
        setAllowedLocCodes([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !email) {
            alert("Please fill in all required fields.");
            return;
        }

        // Password is required for new stores, optional for edit
        if (!isEditMode && !password) {
            alert("Password is required for new stores.");
            return;
        }

        // Basic email validation
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

        // Only include password if provided
        if (password) {
            payload.password = password;
        }

        try {
            setLoading(true);
            
            const url = isEditMode 
                ? `${baseUrl.baseUrl}user/updateUser/${editingUserId}`
                : `${baseUrl.baseUrl}user/signin`;
            
            const method = isEditMode ? "PUT" : "POST";
            
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || (isEditMode ? "Store updated successfully!" : "Store created successfully!"));
                // Reset form
                handleCancelEdit();
                // Refresh stores list
                fetchStores();
            } else {
                alert(data.message || `Failed to ${isEditMode ? 'update' : 'create'} store. Please try again.`);
            }
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} store:`, error);
            alert(`An error occurred while ${isEditMode ? 'updating' : 'creating'} the store. Please try again.`);
        } finally {
            setLoading(false);
        }
    };
    
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        
        if (!resetEmail || !newPassword || !confirmPassword) {
            alert("Please fill in all fields.");
            return;
        }
        
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        
        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(resetEmail)) {
            alert("Please enter a valid email address.");
            return;
        }
        
        try {
            setResetLoading(true);
            const response = await fetch(`${baseUrl.baseUrl}user/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: resetEmail,
                    newPassword: newPassword,
                }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(data.message || "Password reset successfully!");
                setResetEmail("");
                setNewPassword("");
                setConfirmPassword("");
                setShowResetForm(false);
            } else {
                alert(data.message || "Failed to reset password. Please try again.");
            }
        } catch (error) {
            console.error("Error resetting password:", error);
            alert("An error occurred while resetting the password. Please try again.");
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <>
            <Header title="Manage Stores" />
            <div className="ml-[290px] mt-[80px] p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Add New Store Section */}
                    <div className="bg-white shadow-lg rounded-lg p-8">
                        <h2 className="text-2xl font-semibold text-center mb-6 text-[#016E5B]">
                            {isEditMode ? "Edit Store" : "Add New Store"}
                        </h2>
                        
                        {isEditMode && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    Editing: <span className="font-semibold">{username}</span>
                                </p>
                            </div>
                        )}

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
                                    Password {isEditMode ? "(Leave blank to keep current)" : "*"}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={isEditMode ? "Enter new password (optional)" : "Enter password"}
                                        className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#016E5B] focus:border-none outline-none"
                                        required={!isEditMode}
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
                                {isEditMode && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="w-[40%] py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className={`${isEditMode ? 'w-[40%]' : 'w-[50%]'} py-2 rounded-lg text-white ${
                                        loading
                                            ? "bg-gray-400 cursor-not-allowed"
                                            : "bg-[#016E5B] hover:bg-[#014f42]"
                                    }`}
                                    disabled={loading}
                                >
                                    {loading ? (isEditMode ? "Updating..." : "Creating Store...") : (isEditMode ? "Update Store" : "Create Store")}
                                </button>
                            </div>
                        </form>
                    </div>
                    
                    {/* Password Reset Section - Admin Only */}
                    {isAdmin && (
                        <div className="bg-white shadow-lg rounded-lg p-8">
                            <h2 className="text-2xl font-semibold text-center mb-6 text-[#d97706]">
                                Reset User Password
                            </h2>
                            <p className="text-sm text-gray-600 text-center mb-6">
                                Admin only: Reset password for any user account
                            </p>

                            <form onSubmit={handlePasswordReset} className="space-y-4">
                                <div>
                                    <label className="block mb-2 font-semibold text-gray-700">
                                        User Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder="e.g., user@example.com"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d97706] focus:border-none outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 font-semibold text-gray-700">
                                        New Password *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password"
                                            className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d97706] focus:border-none outline-none"
                                            required
                                        />
                                        <span
                                            className="absolute right-4 top-3 text-[#d97706] text-xl cursor-pointer"
                                            onClick={() => setShowNewPassword((prev) => !prev)}
                                        >
                                            {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-2 font-semibold text-gray-700">
                                        Confirm Password *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                            className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d97706] focus:border-none outline-none"
                                            required
                                        />
                                        <span
                                            className="absolute right-4 top-3 text-[#d97706] text-xl cursor-pointer"
                                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        >
                                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-center mt-6">
                                    <button
                                        type="submit"
                                        className={`w-[50%] py-2 rounded-lg text-white ${
                                            resetLoading
                                                ? "bg-gray-400 cursor-not-allowed"
                                                : "bg-[#d97706] hover:bg-[#b45309]"
                                        }`}
                                        disabled={resetLoading}
                                    >
                                        {resetLoading ? "Resetting..." : "Reset Password"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
                
                {/* Existing Stores List */}
                <div className="mt-8 bg-white shadow-lg rounded-lg p-8">
                    <h2 className="text-2xl font-semibold mb-6 text-[#016E5B]">
                        Existing Stores
                    </h2>
                    
                    {loadingStores ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600">Loading stores...</p>
                        </div>
                    ) : stores.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600">No stores found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border p-3 text-left">Store Name</th>
                                        <th className="border p-3 text-left">Email</th>
                                        <th className="border p-3 text-left">Location Code</th>
                                        <th className="border p-3 text-left">Phone</th>
                                        <th className="border p-3 text-left">GST</th>
                                        <th className="border p-3 text-left">Address</th>
                                        <th className="border p-3 text-left">User Type</th>
                                        <th className="border p-3 text-left">Role</th>
                                        <th className="border p-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stores.map((store) => (
                                        <tr key={store._id} className="hover:bg-gray-50">
                                            <td className="border p-3">{store.username}</td>
                                            <td className="border p-3">{store.email}</td>
                                            <td className="border p-3">{store.locCode}</td>
                                            <td className="border p-3">
                                                {store.phone ? (
                                                    <span className="text-sm">{store.phone}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">-</span>
                                                )}
                                            </td>
                                            <td className="border p-3">
                                                {store.gst ? (
                                                    <span className="text-sm">{store.gst}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">-</span>
                                                )}
                                            </td>
                                            <td className="border p-3">
                                                {store.address ? (
                                                    <span className="text-sm">{store.address}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">-</span>
                                                )}
                                            </td>
                                            <td className="border p-3">
                                                <span className={`px-2 py-1 rounded text-xs ${
                                                    store.power === 'admin' 
                                                        ? 'bg-purple-100 text-purple-800' 
                                                        : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {store.power}
                                                </span>
                                            </td>
                                            <td className="border p-3">
                                                {store.role === 'cluster_manager' ? (
                                                    <div>
                                                        <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">cluster manager</span>
                                                        {store.allowedLocCodes?.length > 0 && (
                                                            <div className="text-xs text-gray-500 mt-1">{store.allowedLocCodes.join(', ')}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">{store.role || '-'}</span>
                                                )}
                                            </td>
                                            <td className="border p-3 text-center">
                                                <button
                                                    onClick={() => handleEdit(store)}
                                                    className="text-blue-600 hover:text-blue-800 p-2"
                                                    title="Edit Store"
                                                >
                                                    <FaEdit size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ManageStores;

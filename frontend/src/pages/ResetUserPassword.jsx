import { useState, useEffect, useRef } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { ShieldCheck, ChevronDown } from "lucide-react";
import baseUrl from "../api/api";
import { useSidebar } from "../hooks/useSidebar.js";

const ResetUserPassword = () => {
    const isSidebarOpen = useSidebar();
    const [users, setUsers] = useState([]);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${baseUrl.baseUrl}user/getAllUsers`);
                const data = await response.json();
                if (response.ok) setUsers(data.users || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchUsers();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowUserDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredUsers = userSearch.trim() === "" || selectedUser
        ? users
        : users.filter(u =>
            u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.username.toLowerCase().includes(userSearch.toLowerCase())
        );

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setUserSearch(`${user.username} — ${user.email}`);
        setShowUserDropdown(false);
    };

    const handleReset = async (e) => {
        e.preventDefault();

        if (!selectedUser) { alert("Please select a user."); return; }
        if (!newPassword || !confirmPassword) { alert("Please fill in all fields."); return; }
        if (newPassword !== confirmPassword) { alert("Passwords do not match."); return; }
        if (newPassword.length < 6) { alert("Password must be at least 6 characters."); return; }

        try {
            setLoading(true);
            const response = await fetch(`${baseUrl.baseUrl}user/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: selectedUser.email, newPassword }),
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message || "Password reset successfully!");
                setSelectedUser(null);
                setUserSearch("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                alert(data.message || "Failed to reset password.");
            }
        } catch (err) {
            alert("An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bg-white min-h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-[240px]' : 'ml-0'}`}>
            {/* Header */}
            <div className="bg-white px-10 py-7 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-4 rounded-xl">
                        <ShieldCheck className="text-white" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">RESET USER PASSWORD</h1>
                        <p className="text-gray-400 text-sm">Only admin can reset password for any user</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="px-10 py-10">
                <form onSubmit={handleReset} className="max-w-lg space-y-6" autoComplete="off">
                    {/* Select User */}
                    <div ref={dropdownRef}>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                            Select User / Store *
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={userSearch}
                                onChange={(e) => {
                                    setUserSearch(e.target.value);
                                    setSelectedUser(null);
                                    setShowUserDropdown(true);
                                }}
                                onFocus={() => setShowUserDropdown(true)}
                                placeholder="Enter mail id or username..."
                                autoComplete="off"
                                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            {showUserDropdown && filteredUsers.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                    {filteredUsers.map((u) => (
                                        <div
                                            key={u._id}
                                            onMouseDown={(e) => { e.preventDefault(); handleSelectUser(u); }}
                                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-gray-700 text-sm border-b border-gray-100 last:border-0"
                                        >
                                            <span className="font-semibold text-gray-800">{u.username}</span>
                                            <span className="text-gray-400 ml-2 text-xs">— {u.email}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                            New Password *
                        </label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                autoComplete="new-password"
                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 cursor-pointer">
                                {showNewPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                            </span>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                            Confirm Password *
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                autoComplete="new-password"
                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 cursor-pointer">
                                {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                            </span>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-between items-center pt-4">
                        <button type="button"
                            onClick={() => { setSelectedUser(null); setUserSearch(""); setNewPassword(""); setConfirmPassword(""); }}
                            className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold">
                            CANCEL
                        </button>
                        <button type="submit" disabled={loading}
                            className={`px-8 py-3 rounded-xl font-semibold text-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                            {loading ? "RESETTING..." : "RESET PASSWORD"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetUserPassword;

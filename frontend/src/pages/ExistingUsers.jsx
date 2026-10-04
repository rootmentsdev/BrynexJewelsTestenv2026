import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, ChevronRight, ChevronDown, ChevronLeft, Pencil, Trash2, Mail, Phone, MapPin, ShieldCheck, Eye } from "lucide-react";
import baseUrl from "../api/api";
import { useSidebar } from "../hooks/useSidebar.js";

const ROLE_GROUPS = [
    { key: "admin",           label: "ADMIN" },
    { key: "store_manager",   label: "STORE MANAGER" },
    { key: "cluster_manager", label: "CLUSTER MANAGER" },
    { key: "store_user",      label: "STORE USER" },
    { key: "superadmin",      label: "SUPER ADMIN" },
];

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

const getStoreName = (code) => {
    const s = availableStores.find(s => s.locCode === code);
    return s ? s.locName : code;
};

const ExistingUsers = () => {
    const isSidebarOpen = useSidebar();
    const [stores, setStores] = useState([]);
    const [loadingStores, setLoadingStores] = useState(false);
    const [openGroups, setOpenGroups] = useState({});

    // View panel state
    const [viewUser, setViewUser] = useState(null);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editUsername, setEditUsername] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editGst, setEditGst] = useState("");
    const [editLocCode, setEditLocCode] = useState("");
    const [editAddress, setEditAddress] = useState("");
    const [editPower, setEditPower] = useState("normal");
    const [editRole, setEditRole] = useState("");
    const [editAllowedLocCodes, setEditAllowedLocCodes] = useState([]);
    const [editLoading, setEditLoading] = useState(false);
    const [editStoreSearch, setEditStoreSearch] = useState("");
    const [showEditStoreDropdown, setShowEditStoreDropdown] = useState(false);
    const [takenLocCodes, setTakenLocCodes] = useState(new Set());

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => { fetchStores(); }, []);

    const fetchStores = async () => {
        try {
            setLoadingStores(true);
            const response = await fetch(`${baseUrl.baseUrl}user/getAllUsers`);
            const data = await response.json();
            if (response.ok) setStores(data.users || []);
        } catch (error) {
            console.error("Error fetching stores:", error);
        } finally {
            setLoadingStores(false);
        }
    };

    const toggleGroup = (key) => {
        setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const getUsersForRole = (roleKey) => {
        return stores.filter(u => {
            const role = (u.role || "").toLowerCase().trim();
            const power = (u.power || "").toLowerCase().trim();

            if (roleKey === "admin")           return (power === "admin" || role === "admin") && role !== "superadmin" && role !== "cluster_manager" && role !== "store_manager";
            if (roleKey === "superadmin")      return role === "superadmin";
            if (roleKey === "cluster_manager") return role === "cluster_manager";
            if (roleKey === "store_manager")   return role === "store_manager";
            // store_user: everything else (null role, normal power)
            if (roleKey === "store_user")      return !role && power === "normal";
            return false;
        });
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setEditUsername(user.username);
        setEditEmail(user.email);
        setEditPhone(user.phone || "");
        setEditGst(user.gst || "");
        setEditLocCode(user.locCode || "");
        setEditAddress(user.address || "");
        setEditPower(user.power);
        setEditRole(user.role || "");
        setEditAllowedLocCodes(user.allowedLocCodes || []);
        const taken = new Set();
        stores.forEach(u => {
            if (u._id !== user._id && (u.role || "").toLowerCase() === "cluster_manager") {
                (u.allowedLocCodes || []).forEach(c => taken.add(c));
            }
        });
        setTakenLocCodes(taken);
        setShowEditModal(true);
    };

    const openDeleteModal = (user) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const handleEditSave = async () => {
        try {
            setEditLoading(true);
            const payload = {
                username: editUsername,
                email: editEmail,
                phone: editPhone,
                gst: editGst,
                locCode: editLocCode,
                address: editAddress,
                power: editPower,
                role: editRole || undefined,
                allowedLocCodes: editRole === "cluster_manager" ? editAllowedLocCodes : [],
            };
            const response = await fetch(`${baseUrl.baseUrl}user/updateUser/${selectedUser._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (response.ok) {
                alert("User updated successfully!");
                setShowEditModal(false);
                fetchStores();
            } else {
                alert(data.message || "Failed to update user.");
            }
        } catch (err) {
            alert("An error occurred.");
        } finally {
            setEditLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setDeleteLoading(true);
            const response = await fetch(`${baseUrl.baseUrl}user/deleteUser/${selectedUser._id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                alert("User deleted successfully!");
                setShowDeleteModal(false);
                setSelectedUser(null);
                fetchStores();
            } else {
                const data = await response.json();
                alert(data.message || "Failed to delete user.");
            }
        } catch (err) {
            alert("An error occurred.");
        } finally {
            setDeleteLoading(false);
        }
    };

    const editFilteredStores = availableStores.filter(store =>
        store.locName.toLowerCase().includes(editStoreSearch.toLowerCase()) &&
        !editAllowedLocCodes.includes(store.locCode)
    );

    return (
        <div className={`bg-[#EEF2F7] min-h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-[240px]' : 'ml-0'}`}>
            {/* Header */}
            <div className="bg-white px-10 py-7 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-4 rounded-xl">
                        <Users className="text-white" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">MANAGE EXISTING USERS</h1>
                        <p className="text-gray-400 text-sm">Detailed overview of Income &amp; Expense Report</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate("/manage-users/add-user")}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-700 text-white rounded-xl hover:bg-blue-800 font-semibold transition-all"
                >
                    ADD NEW USER <Plus size={18} />
                </button>
            </div>

            {/* Table */}
            <div className="p-6">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[2fr_2fr_3fr_2fr_1.5fr_1.5fr] bg-[#f1f5fb] border-b border-gray-200 px-6 py-3">
                        {["ROLE", "USER", "EMAIL", "PHONE", "USER TYPE", "ACTION"].map(h => (
                            <div key={h} className="text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</div>
                        ))}
                    </div>

                    {loadingStores ? (
                        <div className="p-10 text-center text-gray-400">Loading...</div>
                    ) : (
                        ROLE_GROUPS.map(({ key, label }) => {
                            const users = getUsersForRole(key);
                            const isOpen = !!openGroups[key];

                            return (
                                <div key={key} className="border-b border-gray-100 last:border-b-0">
                                    {/* Group Header Row */}
                                    <div
                                        onClick={() => toggleGroup(key)}
                                        className="grid grid-cols-[2fr_2fr_3fr_2fr_1.5fr_1.5fr] px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors items-center"
                                    >
                                        <div className="flex items-center gap-2 col-span-5">
                                            <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">{label}</span>
                                            {users.length > 0 && (
                                                <span className="text-xs text-gray-400 font-normal">({users.length})</span>
                                            )}
                                        </div>
                                        <div className="flex justify-end items-center">
                                            {isOpen
                                                ? <ChevronDown size={18} className="text-gray-500" />
                                                : <ChevronRight size={18} className="text-gray-500" />
                                            }
                                        </div>
                                    </div>

                                    {/* User Rows */}
                                    {isOpen && (
                                        users.length === 0 ? (
                                            <div className="px-6 py-3 text-sm text-gray-400 bg-gray-50">No users in this role.</div>
                                        ) : (
                                            users.map((user) => (
                                                <div
                                                    key={user._id}
                                                    className="grid grid-cols-[2fr_2fr_3fr_2fr_1.5fr_1.5fr] px-6 py-3 bg-[#f8faff] border-t border-gray-100 hover:bg-blue-50 transition-colors items-center"
                                                >
                                                    {/* Role column — show role label */}
                                                    <div className="text-sm text-gray-500 capitalize">{(user.role || "—").replace(/_/g, " ")}</div>
                                                    {/* User */}
                                                    <div className="text-sm font-medium text-gray-700">{user.username}</div>
                                                    {/* Email */}
                                                    <div className="text-sm text-gray-500 truncate pr-2">{user.email}</div>
                                                    {/* Phone */}
                                                    <div className="text-sm text-gray-500">{user.phone || "—"}</div>
                                                    {/* User Type */}
                                                    <div>
                                                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-600">
                                                            {user.power === "admin" ? "Admin" : "Normal"}
                                                        </span>
                                                    </div>
                                                    {/* Action */}
                                                    <div className="flex items-center">
                                                        <button
                                                            onClick={() => setViewUser(user)}
                                                            className="no-blue-button text-blue-600 hover:text-blue-800 transition-colors"
                                                            title="View details"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* User Detail Panel (slide-in from right) */}
            {viewUser && (
                <div className="fixed inset-0 z-40 flex justify-end">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/30" onClick={() => setViewUser(null)} />
                    {/* Panel */}
                    <div className="relative bg-white w-[400px] h-full shadow-2xl flex flex-col z-50 overflow-y-auto">
                        {/* Header */}
                        <div className="px-6 pt-7 pb-5 border-b border-gray-100">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setViewUser(null)} className="text-gray-500 hover:text-gray-800 mt-0.5">
                                        <ChevronLeft size={22} />
                                    </button>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                                            {viewUser.username}
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wider">
                                            ROLE :&nbsp;
                                            <span className="font-semibold text-gray-700 capitalize">
                                                {viewUser.role ? viewUser.role.replace(/_/g, ' ') : "—"}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                                    viewUser.power === "admin" ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600"
                                }`}>
                                    {viewUser.power === "admin" ? "Admin" : "Normal User"}
                                </span>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 px-6 py-6 space-y-5">
                            {/* Email */}
                            <div className="flex items-start gap-4">
                                <div className="bg-blue-600 p-2.5 rounded-lg flex-shrink-0">
                                    <Mail size={16} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Email :</p>
                                    <p className="text-gray-800 font-medium mt-0.5">{viewUser.email}</p>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="flex items-start gap-4">
                                <div className="bg-blue-600 p-2.5 rounded-lg flex-shrink-0">
                                    <Phone size={16} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Phone Number</p>
                                    <p className="text-gray-800 font-medium mt-0.5">{viewUser.phone || "—"}</p>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="flex items-start gap-4">
                                <div className="bg-blue-600 p-2.5 rounded-lg flex-shrink-0">
                                    <MapPin size={16} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Address :</p>
                                    <p className="text-gray-800 font-medium mt-0.5">{viewUser.address || "—"}</p>
                                </div>
                            </div>

                            {/* GST */}
                            <div className="flex items-start gap-4">
                                <div className="bg-blue-600 p-2.5 rounded-lg flex-shrink-0">
                                    <ShieldCheck size={16} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Tax Registration (GST)</p>
                                    <p className="text-gray-800 font-medium mt-0.5">{viewUser.gst || "—"}</p>
                                </div>
                            </div>

                            {/* Assigned Stores */}
                            {viewUser.allowedLocCodes?.length > 0 && (
                                <div className="pt-2">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Assigned Stores</p>
                                    <div className="flex flex-wrap gap-2">
                                        {viewUser.allowedLocCodes.map((code) => (
                                            <span key={code} className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200">
                                                {getStoreName(code)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="px-6 pb-8 pt-4 border-t border-gray-100 flex items-center gap-3">
                            <button
                                onClick={() => { setViewUser(null); openEditModal(viewUser); }}
                                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors"
                            >
                                Edit User <Pencil size={15} />
                            </button>
                            <button
                                onClick={() => { setViewUser(null); openDeleteModal(viewUser); }}
                                className="flex items-center justify-center w-12 h-12 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-[680px] p-8 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">EDIT USER</h2>
                        <div className="space-y-5">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">User Role</label>
                                    <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700">
                                        <option value="">Select Role</option>
                                        <option value="store_user">Store User</option>
                                        <option value="store_manager">Store Manager</option>
                                        <option value="cluster_manager">Cluster Manager</option>
                                        <option value="admin">Admin</option>
                                        <option value="superadmin">Super Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Store Name</label>
                                    <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)}
                                        placeholder="G.MG Road"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">User Type</label>
                                    <select value={editPower} onChange={(e) => setEditPower(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700">
                                        <option value="normal">Normal</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Email Address</label>
                                    <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                                        placeholder="store@example.com"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Phone Number</label>
                                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                                        placeholder="+91 98765 43210"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">GST Number</label>
                                    <input value={editGst} onChange={(e) => setEditGst(e.target.value)}
                                        placeholder="123450000AAz5"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Loc Code</label>
                                    <input value={editLocCode} onChange={(e) => setEditLocCode(e.target.value)}
                                        placeholder="102"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Store Address</label>
                                    <textarea value={editAddress} onChange={(e) => setEditAddress(e.target.value)}
                                        placeholder="Address"
                                        rows="2"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                </div>
                            </div>

                            {editRole === "cluster_manager" && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Assign Stores</label>
                                    <div className="relative mb-2">
                                        <input
                                            type="text"
                                            value={editStoreSearch}
                                            onChange={(e) => { setEditStoreSearch(e.target.value); setShowEditStoreDropdown(true); }}
                                            onFocus={() => setShowEditStoreDropdown(true)}
                                            placeholder="Search and add stores..."
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        {showEditStoreDropdown && editFilteredStores.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                {editFilteredStores.map((store) => {
                                                    const isTaken = takenLocCodes.has(store.locCode);
                                                    return (
                                                        <div
                                                            key={store.locCode}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                if (isTaken) return;
                                                                if (!editAllowedLocCodes.includes(store.locCode)) {
                                                                    setEditAllowedLocCodes([...editAllowedLocCodes, store.locCode]);
                                                                }
                                                                setEditStoreSearch("");
                                                                setShowEditStoreDropdown(false);
                                                            }}
                                                            className={`px-3 py-2 text-sm flex items-center justify-between ${
                                                                isTaken ? "text-gray-400 bg-gray-50 cursor-not-allowed" : "hover:bg-blue-50 cursor-pointer text-gray-700"
                                                            }`}
                                                        >
                                                            <span>{store.locName} ({store.locCode})</span>
                                                            {isTaken && <span className="text-xs text-red-400 ml-2">Already assigned</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {editAllowedLocCodes.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {editAllowedLocCodes.map((code) => (
                                                <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                                    {getStoreName(code)}
                                                    <button
                                                        type="button"
                                                        className="no-blue-button text-blue-500 hover:text-blue-800"
                                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setEditAllowedLocCodes(editAllowedLocCodes.filter(c => c !== code));
                                                        }}
                                                    >×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between mt-8">
                            <button onClick={() => setShowDeleteModal(true)}
                                className="flex items-center gap-2 px-5 py-3 border border-red-300 text-red-500 rounded-xl hover:bg-red-50 font-semibold">
                                <Trash2 size={16} /> DELETE
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => setShowEditModal(false)}
                                    className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold">
                                    CANCEL
                                </button>
                                <button onClick={handleEditSave} disabled={editLoading}
                                    className={`px-8 py-3 rounded-xl font-semibold text-white ${editLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                                    {editLoading ? "SAVING..." : "SAVE CHANGES"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedUser && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-8 text-center">
                        <h2 className="text-xl font-bold text-gray-900 mb-3">DELETE USER</h2>
                        <p className="text-gray-500 mb-8">
                            Are you sure you want to delete <strong>{selectedUser.username}</strong>?<br />
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setShowDeleteModal(false)}
                                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold">
                                CANCEL
                            </button>
                            <button onClick={handleDelete} disabled={deleteLoading}
                                className={`px-8 py-3 rounded-xl font-semibold text-white ${deleteLoading ? "bg-gray-400" : "bg-red-500 hover:bg-red-600"}`}>
                                {deleteLoading ? "DELETING..." : "DELETE"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExistingUsers;

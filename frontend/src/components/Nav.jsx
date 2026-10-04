import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    FileText,
    ChevronDown,
    ShoppingBag,
    LineChart,
    DollarSign,
    FolderClosed,
    Notebook,
    Store,
    Package,
    Box,
    SlidersHorizontal,
    ArrowLeftRight,
    List,
    Layers,
    ShoppingCart,
    ClipboardList,
    FileText as FileTextIcon,
    Truck,
    RotateCcw,
    ReceiptText,
    Users,
    PackageCheck,
    AlertTriangle,
    ShoppingBasket,
    UserPlus,
    UserCog,
    KeyRound,
    Menu,
    ChevronLeft
} from "lucide-react";
import salesInventoryAccessConfig from "../config/salesInventoryAccess.json";

const Nav = () => {
    const location = useLocation();
    const currentuser = JSON.parse(localStorage.getItem("rootfinuser")); // Convert back to an object

    // Check if user has access to Sales and Inventory sections
    // Admin users always have access, regular users need to be in the allowed list
    const userEmail = currentuser?.email?.toLowerCase() || "";
    const isAdmin = currentuser?.power === 'admin';
    const isClusterManager = (currentuser?.role || "").toLowerCase() === "cluster_manager";
    const isInAllowedList = salesInventoryAccessConfig.allowedEmails
        .map(email => email.toLowerCase())
        .includes(userEmail);
    const hasSalesInventoryAccess = isAdmin || isInAllowedList;

    const activePath = location.pathname;

    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("sidebar-open");
            document.body.classList.remove("sidebar-closed");
        } else {
            document.body.classList.add("sidebar-closed");
            document.body.classList.remove("sidebar-open");
        }
        window.dispatchEvent(new CustomEvent("sidebar-changed", { detail: { isOpen } }));
    }, [isOpen]);

    useEffect(() => {
        const handleToggle = () => setIsOpen((prev) => !prev);
        window.addEventListener("toggle-sidebar", handleToggle);
        return () => window.removeEventListener("toggle-sidebar", handleToggle);
    }, []);
    const [isHovered, setIsHovered] = useState(false);
    const [isPinned, setIsPinned] = useState(() => localStorage.getItem("rootfin_sidebar_pinned") !== "false");

    const showSidebar = isPinned || isHovered;

    const getInitialSection = useMemo(() => {
        if (activePath === "/reports/sales" || activePath === "/reports/sales-by-invoice" || activePath === "/reports/inventory" || activePath === "/reports/income-expense" || activePath === "/securityReport" || activePath === "/Revenuereport" || activePath === "/BookingReport" || activePath === "/RentOutReport" || activePath === "/reports/sales-by-group") {
            return "reports";
        }
        if (activePath.startsWith("/inventory") ||
            activePath.startsWith("/shoe-sales/items") ||
            activePath.startsWith("/shoe-sales/item-groups") ||
            activePath.startsWith("/shoe-sales/inactive")) {
            return "inventory";
        }
        if (activePath.startsWith("/sales")) {
            return "sales";
        }
        if (activePath.startsWith("/purchase")) {
            return "purchase";
        }
        if (activePath.startsWith("/manage-users")) {
            return "manageUsers";
        }
        return null;
    }, [activePath]);

    const [openSection, setOpenSection] = useState(getInitialSection);

    useEffect(() => {
        setOpenSection(getInitialSection);
    }, [getInitialSection]);

    const isReportsOpen = openSection === "reports";
    const isInventoryOpen = openSection === "inventory";
    const isSalesOpen = openSection === "sales";
    const isPurchaseOpen = openSection === "purchase";
    const isManageUsersOpen = openSection === "manageUsers";

    const inventoryLinks = [
        { to: "/shoe-sales/items", label: "Items", Icon: List },
        // Only show these for admin and warehouse users
        ...(currentuser.power === 'admin' || currentuser.power === 'warehouse' ? [
            { to: "/shoe-sales/item-groups", label: "Item Groups", Icon: Layers },
            { to: "/inventory/adjustments", label: "Inventory Adjustments", Icon: SlidersHorizontal },
        ] : []),
        { to: "/inventory/transfer-orders", label: "Transfer Orders", Icon: ArrowLeftRight },
        { to: "/inventory/store-orders", label: "Store Orders", Icon: ShoppingBasket },
        // Only show these for admin and warehouse users
        ...(currentuser.power === 'admin' || currentuser.power === 'warehouse' ? [
            { to: "/inventory/reorder-alerts", label: "Reorder Alerts", Icon: AlertTriangle },
            { to: "/shoe-sales/inactive", label: "Inactive", Icon: FolderClosed }
        ] : [])
    ];
    const salesLinks = [
        { to: "/sales/invoices", label: "Invoices", Icon: FileTextIcon },
        { to: "/sales/returns", label: "Invoice Return", Icon: RotateCcw }
    ];
    const isInventoryActive = inventoryLinks.some((link) => link.to === activePath) ||
                               activePath.startsWith("/shoe-sales/items") ||
                               (currentuser.power === 'admin' || currentuser.power === 'warehouse') && activePath.startsWith("/shoe-sales/item-groups") ||
                               (currentuser.power === 'admin' || currentuser.power === 'warehouse') && activePath.startsWith("/shoe-sales/inactive") ||
                               activePath.startsWith("/inventory/store-orders");
    const isSalesActive = salesLinks.some((link) => link.to === activePath);
    const purchaseLinks = [
        { to: "/purchase/orders", label: "Purchase Orders", Icon: ClipboardList },
        { to: "/purchase/receives", label: "Purchase Receives", Icon: PackageCheck },
        { to: "/purchase/bills", label: "Bills", Icon: ReceiptText },
        { to: "/purchase/vendor-credits", label: "Purchase Return", Icon: ReceiptText },
        { to: "/purchase/vendors", label: "Vendors", Icon: Users },
    ];
    const isPurchaseActive = purchaseLinks.some((link) => link.to === activePath);
    
    const manageUsersLinks = [
        { to: "/manage-users/add-store", label: "Add New Store", Icon: Store },
        { to: "/manage-users/add-user", label: "Add New User", Icon: UserPlus },
        { to: "/manage-users/existing-users", label: "Existing Users", Icon: UserCog },
        { to: "/manage-users/reset-password", label: "Reset Password", Icon: KeyRound },
    ];
    const isManageUsersActive = manageUsersLinks.some((link) => link.to === activePath);

    const isReportsActive = [
        "/securityReport", 
        "/Revenuereport", 
        "/BookingReport", 
        "/RentOutReport",
        "/reports/income-expense",
        "/reports/sales-by-group",
        ...(hasSalesInventoryAccess ? ["/reports/sales", "/reports/sales-by-invoice", "/reports/inventory"] : [])
    ].includes(activePath);

    const groupButtonClasses = (isActive) =>
        `sidebar-button flex items-center justify-between w-full px-4 py-2.5 text-[12px] font-normal transition-all text-[#a1a1aa] hover:text-white`;

    const subLinkClasses = (path) =>
        `block w-full pl-[24px] pr-4 py-2.5 text-[11px] whitespace-nowrap truncate transition-colors ${
            activePath === path
                ? "bg-[#a855f7] text-white font-medium"
                : "text-[#a1a1aa] font-normal hover:text-white"
        }`;

    const singleLinkClasses = (path) =>
        `flex items-center gap-3 px-4 py-2.5 text-[12px] whitespace-nowrap truncate transition-colors ${
            activePath === path
                ? "text-white font-medium"
                : "text-[#a1a1aa] font-normal hover:text-white"
        }`;

    // alert(location.pathname)
    const isInvoiceCreatePage = activePath === "/sales/invoices/new" || activePath.startsWith("/sales/invoices/edit");
    const sidebarWidth = isInvoiceCreatePage ? "w-56" : "w-64";
    const sidebarTranslate = isInvoiceCreatePage ? "-translate-x-56" : "-translate-x-64";

    return (
        <div className={`flex ${location.pathname === "/login" ? "hidden" : "block"}`}>
            {/* Floating button to open sidebar when closed */}
            {!isOpen && (
                <button
                    onClick={() => {
                        setIsOpen(true);
                        window.dispatchEvent(new CustomEvent("sidebar-changed", { detail: { isOpen: true } }));
                    }}
                    title="Open Sidebar Menu"
                    className="fixed top-3 left-3 z-[99999] p-2 rounded-xl bg-white text-[#1e293b] border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-md flex items-center justify-center cursor-pointer active:scale-95 no-print"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#1e293b]">
                        <line x1="5" y1="4" x2="5" y2="20"/>
                        <line x1="10" y1="4" x2="10" y2="20"/>
                        <path d="M15 8l4 4-4 4"/>
                    </svg>
                </button>
            )}


            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 h-full ${sidebarWidth} z-[99999] transform flex flex-col justify-between bg-[#18181b] text-white transition-transform duration-300 shadow-2xl ${
                    isOpen ? "translate-x-0" : sidebarTranslate
                }`}
            >
                <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="px-6 pt-6 pb-8 flex items-center justify-between">
                        <span className="text-white font-bold text-[22px] tracking-wide flex items-center">
                            ROOT<span className="text-[#a855f7] flex items-center"><LineChart size={20} className="mx-0.5" strokeWidth={3} />FIN</span>
                        </span>
                        <button
                            onClick={() => setIsOpen(false)}
                            title="Close Sidebar"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                            <ChevronLeft size={18} />
                        </button>
                    </div>
                    <nav className="space-y-5 px-3 overflow-y-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">

                    {/* ── CLUSTER MANAGER: only Financial Summary + Reports ── */}
                    {isClusterManager ? (
                        <>
                            <Link to="/datewisedaybook" className={singleLinkClasses("/datewisedaybook")}>
                                <FileTextIcon size={18} />
                                <span>Financial Summary</span>
                            </Link>

                            <div>
                                <button
                                    onClick={() => setOpenSection(isReportsOpen ? null : "reports")}
                                    className={groupButtonClasses(isReportsActive || isReportsOpen)}
                                >
                                    <div className="flex w-full items-center gap-4">
                                        <LineChart size={18} className="shrink-0" />
                                        <span className="flex-1 text-left">Reports</span>
                                        <ChevronDown size={16} className={`shrink-0 transition-transform ${isReportsOpen ? "rotate-180" : "rotate-0"}`} />
                                    </div>
                                </button>
                                {isReportsOpen && (
                                    <div className="mt-1 space-y-0.5 border-l border-[#27272a] ml-[25px]">
                                        <Link to="/BookingReport" className={subLinkClasses('/BookingReport')}><span>Booking Report</span></Link>
                                        <Link to="/RentOutReport" className={subLinkClasses('/RentOutReport')}><span>Rent Out Report</span></Link>
                                        <Link to="/securityReport" className={subLinkClasses('/securityReport')}><span>Security Report</span></Link>
                                        <Link to="/Revenuereport" className={subLinkClasses('/Revenuereport')}><span>Revenue Report</span></Link>
                                        <Link to="/reports/sales-by-invoice" className={subLinkClasses('/reports/sales-by-invoice')}><span>Sales by Invoice</span></Link>
                                        <Link to="/reports/sales" className={subLinkClasses('/reports/sales')}><span>Sales Report</span></Link>
                                        <Link to="/reports/sales-by-group" className={subLinkClasses('/reports/sales-by-group')}><span>Sales by Group</span></Link>
                                        <Link to="/reports/inventory" className={subLinkClasses('/reports/inventory')}><span>Inventory Report</span></Link>
                                        <Link to="/reports/aging" className={subLinkClasses('/reports/aging')}><span>Aging Report</span></Link>
                                        <Link to="/reports/income-expense" className={subLinkClasses('/reports/income-expense')}><span>Income &amp; Expense</span></Link>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Day Book - Standalone */}
                            <Link to="/" className={singleLinkClasses("/")}>
                                <FileText size={16} />
                                <span>Day Book</span>
                            </Link>

                            {/* Financial Summary - Standalone */}
                            <Link to="/datewisedaybook" className={singleLinkClasses("/datewisedaybook")}>
                                <FileTextIcon size={16} />
                                <span>Financial Summary</span>
                            </Link>

                            {/* Sales */}
                            {hasSalesInventoryAccess && (
                                <div>
                                    <button onClick={() => setOpenSection(isSalesOpen ? null : "sales")} className={groupButtonClasses(isSalesActive || isSalesOpen)}>
                                        <div className="flex w-full items-center gap-3">
                                            <ShoppingCart size={16} className="shrink-0" />
                                            <span className="flex-1 text-left whitespace-nowrap truncate">Sales</span>
                                            <ChevronDown size={14} className={`shrink-0 transition-transform ${isSalesOpen ? "rotate-180" : "rotate-0"}`} />
                                        </div>
                                    </button>
                                    {isSalesOpen && (
                                        <div className="mt-1 space-y-0.5 border-l border-[#27272a] ml-[25px]">
                                            {salesLinks.map(({ to, label }) => (
                                                <Link key={to} to={to} className={subLinkClasses(to)}><span>{label}</span></Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Inventory */}
                            {hasSalesInventoryAccess && (
                                <div>
                                    <button onClick={() => setOpenSection(isInventoryOpen ? null : "inventory")} className={groupButtonClasses(isInventoryActive || isInventoryOpen)}>
                                        <div className="flex w-full items-center gap-3">
                                            <Box size={16} className="shrink-0" />
                                            <span className="flex-1 text-left whitespace-nowrap truncate">Inventory</span>
                                            <ChevronDown size={14} className={`shrink-0 transition-transform ${isInventoryOpen ? "rotate-180" : "rotate-0"}`} />
                                        </div>
                                    </button>
                                    {isInventoryOpen && (
                                        <div className="mt-1 space-y-0.5 border-l border-[#27272a] ml-[25px]">
                                            {inventoryLinks.map(({ to, label }) => (
                                                <Link key={to} to={to} className={subLinkClasses(to)}><span>{label}</span></Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Purchase */}
                            {(currentuser.power === 'admin' || currentuser.power === 'warehouse') && (
                                <div>
                                    <button onClick={() => setOpenSection(isPurchaseOpen ? null : "purchase")} className={groupButtonClasses(isPurchaseActive || isPurchaseOpen)}>
                                        <div className="flex w-full items-center gap-3">
                                            <Truck size={16} className="shrink-0" />
                                            <span className="flex-1 text-left whitespace-nowrap truncate">Purchase</span>
                                            <ChevronDown size={14} className={`shrink-0 transition-transform ${isPurchaseOpen ? "rotate-180" : "rotate-0"}`} />
                                        </div>
                                    </button>
                                    {isPurchaseOpen && (
                                        <div className="mt-1 space-y-0.5 border-l border-[#27272a] ml-[25px]">
                                            {purchaseLinks.map(({ to, label }) => (
                                                <Link key={to} to={to} className={subLinkClasses(to)}><span>{label}</span></Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Reports */}
                            <div>
                                <button onClick={() => setOpenSection(isReportsOpen ? null : "reports")} className={groupButtonClasses(isReportsActive || isReportsOpen)}>
                                    <div className="flex w-full items-center gap-3">
                                        <LineChart size={16} className="shrink-0" />
                                        <span className="flex-1 text-left whitespace-nowrap truncate">Reports</span>
                                        <ChevronDown size={14} className={`shrink-0 transition-transform ${isReportsOpen ? "rotate-180" : "rotate-0"}`} />
                                    </div>
                                </button>
                                {isReportsOpen && (
                                    <div className="mt-1 space-y-0.5 border-l border-[#27272a] ml-[25px]">
                                        <Link to="/BookingReport" className={subLinkClasses('/BookingReport')}><span>Booking Report</span></Link>
                                        <Link to="/RentOutReport" className={subLinkClasses('/RentOutReport')}><span>Rent Out Report</span></Link>
                                        <Link to="/securityReport" className={subLinkClasses('/securityReport')}><span>Security Report</span></Link>
                                        <Link to="/Revenuereport" className={subLinkClasses('/Revenuereport')}><span>Revenue Report</span></Link>
                                        {hasSalesInventoryAccess && (
                                            <>
                                                <Link to="/reports/sales-by-invoice" className={subLinkClasses('/reports/sales-by-invoice')}><span>Sales by Invoice</span></Link>
                                                <Link to="/reports/sales" className={subLinkClasses('/reports/sales')}><span>Sales Report</span></Link>
                                                <Link to="/reports/sales-by-group" className={subLinkClasses('/reports/sales-by-group')}><span>Sales by Group</span></Link>
                                                <Link to="/reports/inventory" className={subLinkClasses('/reports/inventory')}><span>Inventory Report</span></Link>
                                                <Link to="/reports/aging" className={subLinkClasses('/reports/aging')}><span>Aging Report</span></Link>
                                            </>
                                        )}
                                        <Link to="/reports/income-expense" className={subLinkClasses('/reports/income-expense')}><span>Income &amp; Expense</span></Link>
                                    </div>
                                )}
                            </div>

                            {/* Income & Expenses */}
                            <Link to="/income" className={singleLinkClasses("/income")}><DollarSign size={16} /><span>Income</span></Link>
                            <Link to="/expenses" className={singleLinkClasses("/expenses")}><DollarSign size={16} /><span>Expenses</span></Link>

                            {/* Admin only */}
                            {(currentuser.power === 'admin' || currentuser.locCode === '102') && (
                                <>
                                    {currentuser.power === 'admin' && (
                                        <Link to="/CloseReport" className={singleLinkClasses("/CloseReport")}><FolderClosed size={16} /><span>Close Report</span></Link>
                                    )}
                                    <Link to="/AdminClose" className={singleLinkClasses("/AdminClose")}><Notebook size={16} /><span>Admin Close</span></Link>
                                    
                                    {/* Manage Users — admin only */}
                                    {currentuser.power === 'admin' && (
                                    <div>
                                        <button onClick={() => setOpenSection(isManageUsersOpen ? null : "manageUsers")} className={groupButtonClasses(isManageUsersActive || isManageUsersOpen)}>
                                            <div className="flex w-full items-center gap-3">
                                                <Users size={16} className="shrink-0" />
                                                <span className="flex-1 text-left whitespace-nowrap truncate">Manage Users</span>
                                                <ChevronDown size={14} className={`shrink-0 transition-transform ${isManageUsersOpen ? "rotate-180" : "rotate-0"}`} />
                                            </div>
                                        </button>
                                        {isManageUsersOpen && (
                                            <div className="mt-1 space-y-0.5 border-l border-[#27272a] ml-[25px]">
                                                {manageUsersLinks.map(({ to, label }) => (
                                                    <Link key={to} to={to} className={subLinkClasses(to)}><span>{label}</span></Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                    </nav>
                </div>
                
                {/* Fixed User Profile at bottom */}
                <div className="p-4 border-t border-[#27272a]/50">
                    <div className="flex items-center gap-3 bg-[#27272a]/50 hover:bg-[#27272a] transition-colors p-2.5 rounded-[20px] cursor-pointer">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#9d4edd] to-[#c77dff] flex items-center justify-center shrink-0 shadow-inner">
                            <span className="text-white font-bold text-sm">
                                {(currentuser?.name || currentuser?.power || "A").charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-[13px] font-semibold text-white truncate">
                                {currentuser?.name || "Admin Name"}
                            </span>
                            <span className="text-[11px] text-[#a1a1aa] truncate">
                                {currentuser?.email || "admin@gmail.com"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Nav





// import { IoPersonCircleOutline } from "react-icons/io5";










import { Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import usePreventNumberInputScroll from "./hooks/usePreventNumberInputScroll";
import DayBookInc from "./pages/BillWiseIncome.jsx";
import Datewisedaybook from "./pages/Datewisedaybook.jsx";
import Booking from "./pages/Booking.jsx";
import DayBook from "./pages/DayBook.jsx";
import SecurityReturn from "./pages/SecurityReturn";
import SecurityPending from "./pages/SecurityPending";
import Nav from "./components/Nav.jsx";
import Login from "./pages/Login.jsx";
import Security from "./pages/Security.jsx";
import CloseReport from "./pages/CloseReport.jsx";
import Revenuereport from "./pages/Revenuereport.jsx";
import AdminClose from "./pages/AdminClose.jsx";
import ManageStores from "./pages/ManageStores.jsx";
import AddNewStore from "./pages/AddNewStore.jsx";
import AddNewUser from "./pages/AddNewUser.jsx";
import ExistingUsers from "./pages/ExistingUsers.jsx";
import EditUser from "./pages/EditUser.jsx";
import ResetUserPassword from "./pages/ResetUserPassword.jsx";
import ShoeSalesItems from "./pages/ShoeSalesItems.jsx";
import ShoeSalesItemGroups from "./pages/ShoeSalesItemGroups.jsx";
import ShoeSalesItemGroupCreate from "./pages/ShoeSalesItemGroupCreate.jsx";
import ShoeSalesItemGroupDetail from "./pages/ShoeSalesItemGroupDetail.jsx";
import ShoeSalesItemCreate from "./pages/ShoeSalesItemCreate.jsx";
import ShoeSalesItemDetail from "./pages/ShoeSalesItemDetail.jsx";
import ShoeSalesItemDetailFromGroup from "./pages/ShoeSalesItemDetailFromGroup.jsx";
import ItemStockManagement from "./pages/ItemStockManagement.jsx";
import StandaloneItemStockManagement from "./pages/StandaloneItemStockManagement.jsx";
import ShoeSalesPriceLists from "./pages/ShoeSalesPriceLists.jsx";
import ShoeSalesPriceListCreate from "./pages/ShoeSalesPriceListCreate.jsx";
import InventoryAdjustments from "./pages/InventoryAdjustments.jsx";
import InventoryAdjustmentCreate from "./pages/InventoryAdjustmentCreate.jsx";
import InventoryAdjustmentDetail from "./pages/InventoryAdjustmentDetail.jsx";
import InventoryPackages from "./pages/InventoryPackages.jsx";
import InventoryPackageCreate from "./pages/InventoryPackageCreate.jsx";
import TransferOrders from "./pages/TransferOrders.jsx";
import TransferOrderCreate from "./pages/TransferOrderCreate.jsx";
import TransferOrderView from "./pages/TransferOrderView.jsx";
import StoreOrders from "./pages/StoreOrders.jsx";
import StoreOrderCreate from "./pages/StoreOrderCreate.jsx";
import StoreOrderView from "./pages/StoreOrderView.jsx";
import SalesOrders from "./pages/SalesOrders.jsx";
import SalesInvoices from "./pages/SalesInvoices.jsx";
import SalesInvoiceReturns from "./pages/SalesInvoiceReturns.jsx";
import SalesInvoiceCreate from "./pages/SalesInvoiceCreate.jsx";
import SalesInvoiceDetail from "./pages/SalesInvoiceDetail.jsx";
import DeliveryChallans from "./pages/DeliveryChallans.jsx";
import PaymentsReceived from "./pages/PaymentsReceived.jsx";
import SalesReturns from "./pages/SalesReturns.jsx";
import CreditNotes from "./pages/CreditNotes.jsx";
import Customers from "./pages/Customers.jsx";
import CustomerCreate from "./pages/CustomerCreate.jsx";
import InactiveItems from "./pages/InactiveItems.jsx";
import PurchaseVendors from "./pages/PurchaseVendors.jsx";
import PurchaseVendorCreate from "./pages/PurchaseVendorCreate.jsx";
import PurchaseVendorDetail from "./pages/PurchaseVendorDetail.jsx";
import PurchaseOrders from "./pages/PurchaseOrders.jsx";
import PurchaseOrderCreate from "./pages/PurchaseOrderCreate.jsx";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail.jsx";
import PurchaseReceives from "./pages/PurchaseReceives.jsx";
import PurchaseReceiveCreate from "./pages/PurchaseReceiveCreate.jsx";
import PurchaseReceiveDetail from "./pages/PurchaseReceiveDetail.jsx";
import Bills from "./pages/Bills.jsx";
import BillDetail from "./pages/BillDetail.jsx";
import PaymentsMade from "./pages/PaymentsMade.jsx";
import VendorCredits from "./pages/VendorCredits.jsx";
import VendorCreditDetail from "./pages/VendorCreditDetail.jsx";
import SalesReport from "./pages/SalesReport.jsx";
import SalesByInvoiceReport from "./pages/SalesByInvoiceReport.jsx";
import SalesByGroupReport from "./pages/SalesByGroupReport.jsx";
import InventoryReport from "./pages/InventoryReport.jsx";
import InventoryAgingReport from "./pages/InventoryAgingReport.jsx";
import ReorderAlerts from "./pages/ReorderAlerts.jsx";
import Income from "./pages/Income.jsx";
import Expenses from "./pages/Expenses.jsx";
import IncomeExpenseReport from "./pages/IncomeExpenseReport.jsx";

const App = () => {
  const location = useLocation();
  console.log(location.pathname);
  const navigate = useNavigate();

  // Prevent mouse wheel from changing number input values globally
  usePreventNumberInputScroll();

  // Retrieve the current user from localStorage
  const currentuser = JSON.parse(localStorage.getItem("rootfinuser")); // Convert back to an object
  const isClusterManager = (currentuser?.role || "").toLowerCase() === "cluster_manager";

  // Allowed routes for cluster managers
  const clusterAllowedRoutes = ["/datewisedaybook", "/BookingReport", "/RentOutReport", "/securityReport", "/Revenuereport", "/reports/income-expense", "/reports/inventory", "/reports/sales", "/reports/sales-by-invoice", "/reports/sales-by-group"];
  const ClusterGuard = ({ children }) => {
    if (isClusterManager && !clusterAllowedRoutes.includes(location.pathname)) {
      return <Navigate to="/datewisedaybook" />;
    }
    return children;
  };

  // Global keyboard shortcut: C then R (sequential) to open invoice creation page
  const keySequenceRef = useRef('');
  const sequenceTimeoutRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if not in an input field
      const target = e.target;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.tagName === 'SELECT' ||
                          target.isContentEditable;
      
      if (isInputField) {
        // Reset sequence if user is typing in a field
        keySequenceRef.current = '';
        if (sequenceTimeoutRef.current) {
          clearTimeout(sequenceTimeoutRef.current);
          sequenceTimeoutRef.current = null;
        }
        return;
      }

      // Only process if user is logged in
      if (!currentuser) return;

      const key = e.key.toLowerCase();

      // Clear timeout if it exists
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
        sequenceTimeoutRef.current = null;
      }

      // Build sequence: first 'c', then 'r'
      if (key === 'c' && keySequenceRef.current === '') {
        keySequenceRef.current = 'c';
        // Reset sequence after 1 second if 'r' is not pressed
        sequenceTimeoutRef.current = setTimeout(() => {
          keySequenceRef.current = '';
        }, 1000);
      } else if (key === 'r' && keySequenceRef.current === 'c') {
        // Sequence complete: C then R
        e.preventDefault();
        e.stopPropagation();
        keySequenceRef.current = '';
        navigate("/sales/invoices/new");
      } else {
        // Reset sequence if wrong key is pressed
        keySequenceRef.current = '';
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
        sequenceTimeoutRef.current = null;
      }
    };
  }, [navigate, currentuser]);

  return (
    <div className="">
      {currentuser && <Nav />} {/* Show Nav only if user is logged in */}
      <div className="w-full">
        <Routes>
          {/* Login Route */}
          <Route path="/login" element={!currentuser ? <Login /> : <Navigate to="/" />} />

          {/* Protected Routes (Redirect to Login if Not Authenticated) */}
          <Route path="/" element={currentuser ? (isClusterManager ? <Navigate to="/datewisedaybook" /> : <DayBookInc />) : <Navigate to="/login" />} />
          <Route path="/datewisedaybook" element={currentuser ? <Datewisedaybook /> : <Navigate to="/login" />} />
          <Route path="/BookingReport" element={currentuser ? <Booking /> : <Navigate to="/login" />} />
          <Route path="/RentOutReport" element={currentuser ? <DayBook /> : <Navigate to="/login" />} />
          <Route path="/Income&Expenses" element={currentuser ? <ClusterGuard><SecurityReturn /></ClusterGuard> : <Navigate to="/login" />} />
          <Route path="/income" element={currentuser ? <ClusterGuard><Income /></ClusterGuard> : <Navigate to="/login" />} />
          <Route path="/expenses" element={currentuser ? <ClusterGuard><Expenses /></ClusterGuard> : <Navigate to="/login" />} />
          <Route path="/CashBankLedger" element={currentuser ? <ClusterGuard><SecurityPending /></ClusterGuard> : <Navigate to="/login" />} />
          <Route path="/securityReport" element={currentuser ? <Security /> : <Navigate to='/login' />} />
          <Route path="/CloseReport" element={currentuser?.power === 'admin' ? <CloseReport /> : <Navigate to='/' />} />
          <Route path="/AdminClose" element={currentuser?.power === 'admin' || currentuser?.locCode === '102' ? <AdminClose /> : <Navigate to='/' />} />
          <Route path="/ManageStores" element={currentuser?.power === 'admin' ? <ManageStores /> : <Navigate to='/' />} />
          
          {/* Manage Users Routes */}
          <Route path="/manage-users/add-store" element={currentuser?.power === 'admin' ? <AddNewStore /> : <Navigate to='/' />} />
          <Route path="/manage-users/add-user" element={currentuser?.power === 'admin' ? <AddNewUser /> : <Navigate to='/' />} />
          <Route path="/manage-users/existing-users" element={currentuser?.power === 'admin' ? <ExistingUsers /> : <Navigate to='/' />} />
          <Route path="/manage-users/edit-user/:id" element={currentuser?.power === 'admin' ? <EditUser /> : <Navigate to='/' />} />
          <Route path="/manage-users/reset-password" element={currentuser?.power === 'admin' ? <ResetUserPassword /> : <Navigate to='/' />} />
          
          <Route path="/shoe-sales/items" element={currentuser ? <ShoeSalesItems /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/inactive-items" element={currentuser ? <InactiveItems /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/items/:itemId/stocks" element={(currentuser?.power === 'admin' || currentuser?.power === 'warehouse') ? <StandaloneItemStockManagement /> : <Navigate to="/" />} />
          <Route path="/shoe-sales/items/:itemId/edit" element={currentuser ? <ShoeSalesItemCreate /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/items/:itemId" element={currentuser ? <ShoeSalesItemDetail /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/items/new" element={currentuser ? <ShoeSalesItemCreate /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/item-groups" element={currentuser ? <ShoeSalesItemGroups /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/item-groups/new" element={currentuser ? <ShoeSalesItemGroupCreate /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/item-groups/:id/items/new" element={currentuser ? <ShoeSalesItemCreate /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/item-groups/:id/items/:itemId/edit" element={currentuser ? <ShoeSalesItemCreate /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/item-groups/:id/items/:itemId/stocks" element={(currentuser?.power === 'admin' || currentuser?.power === 'warehouse') ? <ItemStockManagement /> : <Navigate to="/" />} />
          <Route path="/shoe-sales/item-groups/:id/items/:itemId" element={currentuser ? <ShoeSalesItemDetailFromGroup /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/item-groups/:id/edit" element={currentuser ? <ShoeSalesItemGroupCreate /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/item-groups/:id" element={currentuser ? <ShoeSalesItemGroupDetail /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/price-lists" element={currentuser ? <ShoeSalesPriceLists /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/price-lists/new" element={currentuser ? <ShoeSalesPriceListCreate /> : <Navigate to="/login" />} />
          <Route path="/inventory/adjustments" element={currentuser ? <InventoryAdjustments /> : <Navigate to="/login" />} />
          <Route path="/inventory/adjustments/new" element={currentuser ? <InventoryAdjustmentCreate /> : <Navigate to="/login" />} />
          <Route path="/inventory/adjustments/:id" element={currentuser ? <InventoryAdjustmentDetail /> : <Navigate to="/login" />} />
          <Route path="/inventory/adjustments/:id/edit" element={currentuser ? <InventoryAdjustmentCreate /> : <Navigate to="/login" />} />
          <Route path="/inventory/packages" element={currentuser ? <InventoryPackages /> : <Navigate to="/login" />} />
          <Route path="/inventory/packages/new" element={currentuser ? <InventoryPackageCreate /> : <Navigate to="/login" />} />
          <Route path="/inventory/transfer-orders" element={currentuser ? <TransferOrders /> : <Navigate to="/login" />} />
          <Route path="/inventory/transfer-orders/new" element={currentuser ? <TransferOrderCreate /> : <Navigate to="/login" />} />
          <Route path="/inventory/transfer-orders/:id" element={currentuser ? <TransferOrderView /> : <Navigate to="/login" />} />
          <Route path="/inventory/transfer-orders/:id/edit" element={currentuser ? <TransferOrderCreate /> : <Navigate to="/login" />} />
          <Route path="/inventory/store-orders" element={currentuser ? <StoreOrders /> : <Navigate to="/login" />} />
          <Route path="/inventory/store-orders/new" element={currentuser ? <StoreOrderCreate /> : <Navigate to="/login" />} />
          <Route path="/inventory/store-orders/:id" element={currentuser ? <StoreOrderView /> : <Navigate to="/login" />} />
          <Route path="/inventory/store-orders/:id/edit" element={currentuser ? <StoreOrderCreate /> : <Navigate to="/login" />} />
          <Route path="/sales/customers" element={currentuser ? <Customers /> : <Navigate to="/login" />} />
          <Route path="/sales/customers/new" element={currentuser ? <CustomerCreate /> : <Navigate to="/login" />} />
          <Route path="/sales/orders" element={currentuser ? <SalesOrders /> : <Navigate to="/login" />} />
          <Route path="/sales/invoices" element={currentuser ? <SalesInvoices /> : <Navigate to="/login" />} />
          <Route path="/sales/invoices/returns" element={currentuser ? <SalesInvoiceReturns /> : <Navigate to="/login" />} />
          <Route path="/sales/invoices/new" element={currentuser ? <SalesInvoiceCreate /> : <Navigate to="/login" />} />
          <Route path="/sales/invoices/:id/edit" element={currentuser ? <SalesInvoiceCreate /> : <Navigate to="/login" />} />
          <Route path="/sales/invoices/:id" element={currentuser ? <SalesInvoiceDetail /> : <Navigate to="/login" />} />
          <Route path="/sales/delivery-challans" element={currentuser ? <DeliveryChallans /> : <Navigate to="/login" />} />
          <Route path="/sales/payments-received" element={currentuser ? <PaymentsReceived /> : <Navigate to="/login" />} />
          <Route path="/sales/returns" element={currentuser ? <SalesReturns /> : <Navigate to="/login" />} />
          <Route path="/sales/credit-notes" element={currentuser ? <CreditNotes /> : <Navigate to="/login" />} />

          <Route path="/Revenuereport" element={currentuser ? <Revenuereport /> : <Navigate to="/login" />} />
          <Route path="/shoe-sales/inactive" element={currentuser ? <InactiveItems /> : <Navigate to="/login" />} />

          {/* Purchase */}
          <Route path="/purchase/orders" element={currentuser ? <PurchaseOrders /> : <Navigate to="/login" />} />
          <Route path="/purchase/orders/new" element={currentuser ? <PurchaseOrderCreate /> : <Navigate to="/login" />} />
          <Route path="/purchase/orders/:id/edit" element={currentuser ? <PurchaseOrderCreate /> : <Navigate to="/login" />} />
          <Route path="/purchase/orders/:id" element={currentuser ? <PurchaseOrderDetail /> : <Navigate to="/login" />} />
          <Route path="/purchase/receives" element={currentuser ? <PurchaseReceives /> : <Navigate to="/login" />} />
          <Route path="/purchase/receives/new" element={currentuser ? <PurchaseReceiveCreate /> : <Navigate to="/login" />} />
          <Route path="/purchase/receives/:id/edit" element={currentuser ? <PurchaseReceiveCreate /> : <Navigate to="/login" />} />
          <Route path="/purchase/receives/:id" element={currentuser ? <PurchaseReceiveDetail /> : <Navigate to="/login" />} />
          <Route path="/purchase/bills/new" element={currentuser ? <Bills /> : <Navigate to="/login" />} />
          <Route path="/purchase/bills/:id/edit" element={currentuser ? <Bills /> : <Navigate to="/login" />} />
          <Route path="/purchase/bills/:id" element={currentuser ? <BillDetail /> : <Navigate to="/login" />} />
          <Route path="/purchase/bills" element={currentuser ? <Bills /> : <Navigate to="/login" />} />
          <Route path="/purchase/payments" element={currentuser ? <PaymentsMade /> : <Navigate to="/login" />} />
          <Route path="/purchase/vendor-credits/new" element={currentuser ? <VendorCredits /> : <Navigate to="/login" />} />
          <Route path="/purchase/vendor-credits/:id/edit" element={currentuser ? <VendorCredits /> : <Navigate to="/login" />} />
          <Route path="/purchase/vendor-credits/:id" element={currentuser ? <VendorCreditDetail /> : <Navigate to="/login" />} />
          <Route path="/purchase/vendor-credits" element={currentuser ? <VendorCredits /> : <Navigate to="/login" />} />
          <Route path="/purchase/vendors" element={currentuser ? <PurchaseVendors /> : <Navigate to="/login" />} />
          <Route path="/purchase/vendors/new" element={currentuser ? <PurchaseVendorCreate /> : <Navigate to="/login" />} />
          <Route path="/purchase/vendors/:id/edit" element={currentuser ? <PurchaseVendorCreate /> : <Navigate to="/login" />} />
          <Route path="/purchase/vendors/:id" element={currentuser ? <PurchaseVendorDetail /> : <Navigate to="/login" />} />

          {/* Reports */}
          <Route path="/reports/sales-by-invoice" element={currentuser ? <SalesByInvoiceReport /> : <Navigate to="/login" />} />
          <Route path="/reports/sales-by-group" element={currentuser ? <SalesByGroupReport /> : <Navigate to="/login" />} />
          <Route path="/reports/sales" element={currentuser ? <SalesReport /> : <Navigate to="/login" />} />
          <Route path="/reports/inventory" element={currentuser ? <InventoryReport /> : <Navigate to="/login" />} />
          <Route path="/reports/aging" element={currentuser ? <InventoryAgingReport /> : <Navigate to="/login" />} />
          <Route path="/reports/income-expense" element={currentuser ? <IncomeExpenseReport /> : <Navigate to="/login" />} />
          
          {/* Reorder Alerts */}
          <Route path="/inventory/reorder-alerts" element={currentuser ? <ReorderAlerts /> : <Navigate to="/login" />} />

        </Routes>
      </div>
    </div>
  );
};

export default App;

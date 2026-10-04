import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import Select from 'react-select';
import Headers from '../components/Headers';
import OptimizedTable from '../components/OptimizedTable';
import { useFinancialData } from '../hooks/useFinancialData';
import { categories, subCategories } from '../data/categories';
import { baseUrl } from '../api/api';
import useSidebar from "../hooks/useSidebar";

const OptimizedFinancialSummary = () => {
  const isSidebarOpen = useSidebar();
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(subCategories[0]);
  const [selectedStore, setSelectedStore] = useState("current");

  const currentUser = JSON.parse(localStorage.getItem("rootfinuser"));
  const { data, fetchFinancialData, getFilteredData, loading, error } = useFinancialData(currentUser, baseUrl.baseUrl);

  // Memoized filtered transactions
  const filteredTransactions = useMemo(() => {
    return getFilteredData(selectedCategory?.value, selectedSubCategory?.value);
  }, [getFilteredData, selectedCategory?.value, selectedSubCategory?.value]);

  // Memoized table columns
  const tableColumns = useMemo(() => [
    {
      key: 'date',
      title: 'Date',
      width: 120,
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'invoiceNo',
      title: 'Invoice No.',
      width: 150,
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'customerName',
      title: 'Customer Name',
      width: 200,
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'Category',
      title: 'Category',
      width: 120,
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'SubCategory',
      title: 'Sub Category',
      width: 150,
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'billValue',
      title: 'Bill Value',
      width: 120,
      align: 'text-right',
      sortable: true,
      render: (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
    },
    {
      key: 'cash',
      title: 'Cash',
      width: 100,
      align: 'text-right',
      sortable: true,
      render: (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
    },
    {
      key: 'rbl',
      title: 'RBL',
      width: 100,
      align: 'text-right',
      sortable: true,
      render: (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
    },
    {
      key: 'bank',
      title: 'Bank',
      width: 100,
      align: 'text-right',
      sortable: true,
      render: (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
    },
    {
      key: 'upi',
      title: 'UPI',
      width: 100,
      align: 'text-right',
      sortable: true,
      render: (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
    },
    {
      key: 'amount',
      title: 'Total Amount',
      width: 120,
      align: 'text-right',
      sortable: true,
      render: (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
    }
  ], []);

  // Optimized fetch handler
  const handleFetch = useCallback(async () => {
    if (!fromDate || !toDate) {
      alert('Please select both from and to dates');
      return;
    }

    await fetchFinancialData(fromDate, toDate);
  }, [fromDate, toDate, fetchFinancialData]);

  // Memoized export data
  const exportData = useMemo(() => {
    const openingRow = {
      date: "OPENING BALANCE",
      invoiceNo: "",
      customerName: "",
      Category: "",
      SubCategory: "",
      billValue: "",
      cash: data.openingBalance.cash,
      rbl: data.openingBalance.rbl,
      bank: 0,
      upi: 0,
      amount: data.openingBalance.cash + data.openingBalance.rbl
    };

    return [openingRow, ...filteredTransactions];
  }, [data.openingBalance, filteredTransactions]);

  // CSV Export handler
  const handleExport = useCallback(() => {
    const csvContent = [
      // Header
      tableColumns.map(col => col.title).join(','),
      // Data rows
      ...exportData.map(row => 
        tableColumns.map(col => {
          const value = row[col.key];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-summary-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [exportData, tableColumns, fromDate, toDate]);

  // Print handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <>
      <Helmet>
        <title>Financial Summary | RootFin</title>
      </Helmet>

      <div>
        <style>{`
          @media print {
            @page { size: tabloid landscape; margin: 5mm; }
            body { font-family: Arial, sans-serif !important; }
            .no-print { display: none !important; }
            .ml-\\[240px\\] { margin-left: 0 !important; }
            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { border: 1px solid black !important; padding: 4px !important; font-size: 8px !important; }
          }
        `}</style>

        <Headers title={"Financial Summary Report"} />
        
        <div className='ml-[240px]'>
          <div className="p-6 bg-gray-100 min-h-screen">
            
            {/* Controls */}
            <div className="flex gap-4 mb-6 w-full max-w-6xl no-print">
              <div className='flex flex-col'>
                <label htmlFor="fromDate">From *</label>
                <input
                  type="date"
                  id="fromDate"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  max="2099-12-31"
                  min="2000-01-01"
                  className="border border-gray-300 py-2 px-3 rounded"
                />
              </div>
              
              <div className='flex flex-col'>
                <label htmlFor="toDate">To *</label>
                <input
                  type="date"
                  id="toDate"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  max="2099-12-31"
                  min="2000-01-01"
                  className="border border-gray-300 py-2 px-3 rounded"
                />
              </div>

              <div className='flex flex-col'>
                <label>Category</label>
                <Select
                  options={categories}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  className="min-w-[200px]"
                  menuPortalTarget={document.body}
                  styles={{
                    control: base => ({
                      ...base,
                      minHeight: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem'
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                />
              </div>

              <div className='flex flex-col'>
                <label>Sub Category</label>
                <Select
                  options={subCategories}
                  value={selectedSubCategory}
                  onChange={setSelectedSubCategory}
                  className="min-w-[200px]"
                  menuPortalTarget={document.body}
                  styles={{
                    control: base => ({
                      ...base,
                      minHeight: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem'
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                />
              </div>

              <div className='flex flex-col justify-end'>
                <button
                  onClick={handleFetch}
                  disabled={loading || !fromDate || !toDate}
                  className={`h-[40px] rounded-md text-white px-6 transition duration-150 ${
                    loading || !fromDate || !toDate
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Fetching...</span>
                    </div>
                  ) : (
                    'Fetch'
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6 no-print">
              <button
                onClick={handleExport}
                disabled={loading || filteredTransactions.length === 0}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                disabled={loading || filteredTransactions.length === 0}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Print Report
              </button>
            </div>

            {/* Summary Cards */}
            {!loading && data.transactions.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 no-print">
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-600">Total Cash</div>
                  <div className="text-xl font-bold text-green-600">
                    ₹{data.totals.cash.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-600">Total RBL</div>
                  <div className="text-xl font-bold text-blue-600">
                    ₹{data.totals.rbl.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-600">Total Bank</div>
                  <div className="text-xl font-bold text-purple-600">
                    ₹{data.totals.bank.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-600">Total UPI</div>
                  <div className="text-xl font-bold text-orange-600">
                    ₹{data.totals.upi.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-600">Grand Total</div>
                  <div className="text-xl font-bold text-gray-800">
                    ₹{data.totals.amount.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Optimized Table */}
            <OptimizedTable
              data={filteredTransactions}
              columns={tableColumns}
              height={500}
              rowHeight={50}
              loading={loading}
              error={error ? new Error(error) : null}
              showPagination={filteredTransactions.length > 100}
              pageSize={100}
            />

            {/* Footer Summary for Print */}
            <div className="mt-8 print-only" style={{ display: 'none' }}>
              <div className="grid grid-cols-3 gap-4">
                <div className="border p-4">
                  <h3 className="font-bold mb-2">Cash Summary</h3>
                  <div>Opening: ₹{data.openingBalance.cash.toLocaleString()}</div>
                  <div>Closing: ₹{data.totals.cash.toLocaleString()}</div>
                </div>
                <div className="border p-4">
                  <h3 className="font-bold mb-2">Digital Payments</h3>
                  <div>RBL: ₹{data.totals.rbl.toLocaleString()}</div>
                  <div>Bank: ₹{data.totals.bank.toLocaleString()}</div>
                  <div>UPI: ₹{data.totals.upi.toLocaleString()}</div>
                </div>
                <div className="border p-4">
                  <h3 className="font-bold mb-2">Grand Total</h3>
                  <div className="text-xl font-bold">₹{data.totals.amount.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(OptimizedFinancialSummary);
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useOptimizedFetch, useOptimizedDataProcessing } from './useOptimizedFetch';

export const useFinancialData = (currentUser, baseUrl) => {
  const [data, setData] = useState({
    transactions: [],
    totals: { cash: 0, rbl: 0, bank: 0, upi: 0, amount: 0 },
    openingBalance: { cash: 0, rbl: 0 },
    loading: false,
    error: null
  });

  const { fetchMultiple, loading: fetchLoading, error: fetchError } = useOptimizedFetch();
  const { processInChunks, deduplicateEfficiently } = useOptimizedDataProcessing();
  const processingRef = useRef(false);

  // Memoized API URLs generator
  const generateApiUrls = useCallback((fromDate, toDate, locCode) => {
    const twsBase = "https://rentalapi.rootments.live/api/GetBooking";
    return {
      booking: `${twsBase}/GetBookingList?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`,
      rentout: `${twsBase}/GetRentoutList?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`,
      return: `${twsBase}/GetReturnList?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`,
      cancel: `${twsBase}/GetDeleteList?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`,
      mongo: `${baseUrl}user/Getpayment?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`,
      opening: `${baseUrl}user/getsaveCashBank?locCode=${locCode}&date=${getPreviousDate(fromDate)}`,
      edited: `${baseUrl}api/tws/getEditedTransactions?fromDate=${fromDate}&toDate=${toDate}&locCode=${locCode}`
    };
  }, [baseUrl]);

  // Helper function to get previous date
  const getPreviousDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return date < new Date("2025-01-01") ? "2025-01-01" : date.toISOString().split("T")[0];
  }, []);

  // Optimized data processors
  const processBookingData = useCallback((rawData) => {
    return (rawData?.dataSet?.data || []).map(item => ({
      ...item,
      date: item.bookingDate?.split("T")[0],
      invoiceNo: item.invoiceNo,
      customerName: item.customerName,
      Category: "Booking",
      SubCategory: "Advance",
      billValue: Number(item.invoiceAmount || 0),
      cash: Number(item.bookingCashAmount || 0),
      rbl: Number(item.rblRazorPay || 0),
      bank: Number(item.bookingBankAmount || 0),
      upi: Number(item.bookingUPIAmount || 0),
      amount: Number(item.bookingCashAmount || 0) + Number(item.rblRazorPay || 0) + 
              Number(item.bookingBankAmount || 0) + Number(item.bookingUPIAmount || 0),
      source: "booking"
    }));
  }, []);

  const processRentoutData = useCallback((rawData) => {
    return (rawData?.dataSet?.data || []).map(item => {
      const advance = Number(item.advanceAmount || 0);
      const security = Number(item.securityAmount || 0);
      const balancePayable = Number(item.invoiceAmount || 0) - advance;
      const totalSplit = security + balancePayable;

      return {
        ...item,
        date: (item.rentOutDate || "").split("T")[0],
        invoiceNo: item.invoiceNo,
        customerName: item.customerName,
        Category: "RentOut",
        SubCategory: "Security",
        SubCategory1: "Balance Payable",
        securityAmount: security,
        Balance: balancePayable,
        billValue: Number(item.invoiceAmount || 0),
        cash: Number(item.rentoutCashAmount || 0),
        rbl: Number(item.rblRazorPay || 0),
        bank: Number(item.rentoutBankAmount || 0),
        upi: Number(item.rentoutUPIAmount || 0),
        amount: totalSplit,
        totalTransaction: totalSplit,
        source: "rentout"
      };
    });
  }, []);

  const processReturnData = useCallback((rawData) => {
    return (rawData?.dataSet?.data || []).map(item => {
      const returnCashAmount = -Math.abs(Number(item.returnCashAmount || 0));
      const returnRblAmount = -Math.abs(Number(item.rblRazorPay || 0));
      const returnBankAmount = returnRblAmount !== 0 ? 0 : -Math.abs(Number(item.returnBankAmount || 0));
      const returnUPIAmount = returnRblAmount !== 0 ? 0 : -Math.abs(Number(item.returnUPIAmount || 0));

      return {
        ...item,
        date: (item.returnedDate || item.returnDate || "").split("T")[0],
        customerName: item.customerName || "",
        invoiceNo: item.invoiceNo,
        Category: "Return",
        SubCategory: "Security Refund",
        billValue: Number(item.invoiceAmount || 0),
        cash: returnCashAmount,
        rbl: returnRblAmount,
        bank: returnBankAmount,
        upi: returnUPIAmount,
        amount: returnCashAmount + returnRblAmount + returnBankAmount + returnUPIAmount,
        source: "return"
      };
    });
  }, []);

  const processCancelData = useCallback((rawData) => {
    return (rawData?.dataSet?.data || []).map(item => {
      const deleteCashAmount = -Math.abs(Number(item.deleteCashAmount || 0));
      const deleteRblAmount = -Math.abs(Number(item.rblRazorPay || 0));
      const deleteBankAmount = deleteRblAmount !== 0 ? 0 : -Math.abs(Number(item.deleteBankAmount || 0));
      const deleteUPIAmount = deleteRblAmount !== 0 ? 0 : -Math.abs(Number(item.deleteUPIAmount || 0));

      return {
        ...item,
        date: item.cancelDate?.split("T")[0],
        invoiceNo: item.invoiceNo,
        customerName: item.customerName,
        Category: "Cancel",
        SubCategory: "Cancellation Refund",
        billValue: Number(item.invoiceAmount || 0),
        cash: deleteCashAmount,
        rbl: deleteRblAmount,
        bank: deleteBankAmount,
        upi: deleteUPIAmount,
        amount: deleteCashAmount + deleteRblAmount + deleteBankAmount + deleteUPIAmount,
        source: "cancel"
      };
    });
  }, []);

  const processMongoData = useCallback((rawData) => {
    return (rawData?.data || []).map(tx => {
      const cash = Number(tx.cash || 0);
      const rbl = Number(tx.rbl || tx.rblRazorPay || 0);
      const bank = Number(tx.bank || 0);
      const upi = Number(tx.upi || 0);
      const total = cash + rbl + bank + upi;

      return {
        ...tx,
        date: tx.date?.split("T")[0] || "",
        Category: tx.type,
        SubCategory: tx.subCategory || tx.category,
        customerName: tx.customerName || "",
        billValue: Number(tx.billValue ?? tx.invoiceAmount ?? tx.amount),
        cash,
        rbl,
        bank,
        upi,
        amount: total,
        totalTransaction: total,
        source: "mongo"
      };
    });
  }, []);

  // Main fetch function with optimized processing
  const fetchFinancialData = useCallback(async (fromDate, toDate, locCode = currentUser?.locCode) => {
    if (processingRef.current) return; // Prevent concurrent requests
    
    processingRef.current = true;
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const urls = generateApiUrls(fromDate, toDate, locCode);
      const urlArray = Object.values(urls);

      // Fetch all data in parallel
      const results = await fetchMultiple(urlArray);
      
      if (!results) {
        throw new Error('Request was cancelled');
      }

      const [bookingData, rentoutData, returnData, cancelData, mongoData, openingData, editedData] = results;

      // Process data in chunks to avoid blocking UI
      const [
        bookingTransactions,
        rentoutTransactions, 
        returnTransactions,
        cancelTransactions,
        mongoTransactions
      ] = await Promise.all([
        processInChunks(bookingData ? [bookingData] : [], processBookingData),
        processInChunks(rentoutData ? [rentoutData] : [], processRentoutData),
        processInChunks(returnData ? [returnData] : [], processReturnData),
        processInChunks(cancelData ? [cancelData] : [], processCancelData),
        processInChunks(mongoData ? [mongoData] : [], processMongoData)
      ]);

      // Flatten results
      const allTransactions = [
        ...bookingTransactions.flat(),
        ...rentoutTransactions.flat(),
        ...returnTransactions.flat(),
        ...cancelTransactions.flat(),
        ...mongoTransactions.flat()
      ];

      // Apply edits if available
      let finalTransactions = allTransactions;
      if (editedData?.data) {
        const editedMap = new Map();
        editedData.data.forEach(edit => {
          const key = `${edit.invoiceNo}-${edit.type?.toLowerCase()}`;
          editedMap.set(key, edit);
        });

        finalTransactions = allTransactions.map(tx => {
          const key = `${tx.invoiceNo}-${tx.Category?.toLowerCase()}`;
          const edit = editedMap.get(key);
          return edit ? { ...tx, ...edit } : tx;
        });
      }

      // Efficient deduplication
      const deduplicatedTransactions = deduplicateEfficiently(
        finalTransactions,
        (tx) => tx._id || `${tx.invoiceNo}-${tx.date}-${tx.Category}-${tx.source}`
      );

      // Calculate totals
      const openingBalance = {
        cash: Number(openingData?.data?.cash ?? openingData?.data?.Closecash ?? 0),
        rbl: Number(openingData?.data?.rbl ?? 0)
      };

      const totals = deduplicatedTransactions.reduce(
        (acc, tx) => ({
          cash: acc.cash + Number(tx.cash || 0),
          rbl: acc.rbl + Number(tx.rbl || 0),
          bank: acc.bank + Number(tx.bank || 0),
          upi: acc.upi + Number(tx.upi || 0)
        }),
        { ...openingBalance, bank: 0, upi: 0 }
      );

      totals.amount = totals.cash + totals.rbl + totals.bank + totals.upi;

      setData({
        transactions: deduplicatedTransactions,
        totals,
        openingBalance,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching financial data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch data'
      }));
    } finally {
      processingRef.current = false;
    }
  }, [currentUser, generateApiUrls, fetchMultiple, processInChunks, deduplicateEfficiently,
      processBookingData, processRentoutData, processReturnData, processCancelData, processMongoData]);

  // Memoized filtered data
  const getFilteredData = useCallback((categoryFilter = 'all', subCategoryFilter = 'all') => {
    return data.transactions.filter(tx => {
      const category = (tx.Category || tx.type || '').toLowerCase();
      const subCategory = (tx.SubCategory || '').toLowerCase();
      const subCategory1 = (tx.SubCategory1 || '').toLowerCase();

      const matchesCategory = categoryFilter === 'all' || category === categoryFilter.toLowerCase();
      const matchesSubCategory = subCategoryFilter === 'all' || 
                                 subCategory === subCategoryFilter.toLowerCase() ||
                                 subCategory1 === subCategoryFilter.toLowerCase();

      return matchesCategory && matchesSubCategory;
    });
  }, [data.transactions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processingRef.current = false;
    };
  }, []);

  return {
    data,
    fetchFinancialData,
    getFilteredData,
    loading: data.loading || fetchLoading,
    error: data.error || fetchError
  };
};
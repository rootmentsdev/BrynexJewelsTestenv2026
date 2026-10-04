import { useRef, useState, useMemo } from 'react';
import Headers from '../components/Header';
import baseUrl from '../api/api';
import { useSidebar } from '../hooks/useSidebar.js';

const CloseReport = () => {
  const isSidebarOpen = useSidebar();
  const AllLoation = [
    { "locName": "Z-Edapally1", "locCode": "144" },
    { "locName": "G-Edappally", "locCode": "702" },
    { "locName": "SG-Trivandrum", "locCode": "700" },
    { "locName": "Z- Edappal", "locCode": "100" },
    { "locName": "Z.Perinthalmanna", "locCode": "133" },
    { "locName": "Z.Kottakkal", "locCode": "122" },
    { "locName": "G.Kottayam", "locCode": "701" },
    { "locName": "G.Perumbavoor", "locCode": "703" },
    { "locName": "G.Thrissur", "locCode": "704" },
    { "locName": "G.Chavakkad", "locCode": "706" },
    { "locName": "G.Calicut ", "locCode": "712" },
    { "locName": "G.Vadakara", "locCode": "708" },
    { "locName": "G.Edappal", "locCode": "707" },
    { "locName": "G.Perinthalmanna", "locCode": "709" },
    { "locName": "G.Kottakkal", "locCode": "711" },
    { "locName": "G.Manjeri", "locCode": "710" },
    { "locName": "G.Palakkad ", "locCode": "705" },
    { "locName": "G.Kalpetta", "locCode": "717" },
    { "locName": "G.Kannur", "locCode": "716" },
    { "locName": "G.MG Road", "locCode": "718" }
  ];

  const [fromDate, setFromDate] = useState("");
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const printRef = useRef(null);

  const currentuser = JSON.parse(localStorage.getItem("rootfinuser"));

  const formatDate = (inputDate) => {
    const [year, month, day] = inputDate.split("-");
    return `${year}-${month}-${day}`;
  };

  const handleFetch = async () => {
    if (!fromDate) return alert("Please select a date first.");

    setIsLoading(true);
    const formattedDate = formatDate(fromDate);
    const updatedApiUrl = `${baseUrl?.baseUrl}user/AdminColseView?date=${formattedDate}&role=${currentuser?.power}`;

    try {
      const response = await fetch(updatedApiUrl);
      if (response.status === 401) {
        setIsLoading(false);
        return alert("Error: Data already saved for today.");
      } else if (!response.ok) {
        setIsLoading(false);
        return alert("Error: Failed to fetch data.");
      }

      const result = await response.json();
      
      const processDataInChunks = (data, chunkSize = 50) => {
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
      };

      const rawData = result?.data || [];
      const dataChunks = processDataInChunks(rawData);
      
      let mappedData = [];
      
      for (const chunk of dataChunks) {
        const processedChunk = chunk.map((transaction) => {
          const foundLoc = AllLoation.find(item => item.locCode === transaction.locCode);
          const storeName = foundLoc ? foundLoc.locName : "Unknown";

          const calculatedClosingCash = Number(transaction.cash || 0);
          const physicalCash = Number(transaction.Closecash || 0);
          const difference = calculatedClosingCash - physicalCash;
          const match = difference === 0 ? 'Match' : 'Mismatch';

          const bankAmount = parseInt(transaction.bank || 0);
          const upiAmount = parseInt(transaction.upi || 0);
          const bankPlusUpi = bankAmount + upiAmount;

          return { 
            ...transaction,
            cash: calculatedClosingCash,
            Closecash: physicalCash,
            difference,
            match,
            storeName,
            bankPlusUpi
          };
        });
        
        mappedData = [...mappedData, ...processedChunk];
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      setData({ ...result, data: mappedData });
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
      alert("An unexpected error occurred.");
    }
  };

  const counts = useMemo(() => {
    const transactions = data?.data || [];
    const matchCount = transactions.filter(t => t.match === 'Match').length;
    const mismatchCount = transactions.filter(t => t.match === 'Mismatch').length;
    const notClosedCount = AllLoation.filter(loc => !transactions.some(t => t.storeName === loc.locName)).length;
    return { matchCount, mismatchCount, notClosedCount };
  }, [data?.data]);

  const combinedData = useMemo(() => {
    let combined = (data?.data || []).map(txn => ({
      ...txn,
      displayStatus: txn.match
    }));

    const notClosed = AllLoation.filter(loc => 
      !combined.some(txn => txn.storeName === loc.locName)
    ).map(loc => ({
      storeName: loc.locName,
      locCode: loc.locCode,
      bankPlusUpi: '',
      cash: '',
      Closecash: '',
      difference: '',
      displayStatus: 'Not Closed'
    }));

    combined = [...combined, ...notClosed];

    if (filter !== "All") {
       combined = combined.filter(item => item.displayStatus === filter);
    }

    return combined;
  }, [data?.data, filter]);

  const handleExportCSV = () => {
    if (!combinedData || combinedData.length === 0) return;
    const headers = ['NO.', 'NO.OF BILLS', 'LOC CODE', 'BANK', 'CASH', 'CLOSE CASH', 'DIFFERENCE', 'STATUS'];
    const csvRows = [headers.join(',')];
    combinedData.forEach((row, i) => {
      csvRows.push([
        i + 1,
        row.storeName,
        row.locCode,
        row.bankPlusUpi || 0,
        row.cash || 0,
        row.Closecash || 0,
        row.difference || 0,
        row.displayStatus
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Close_Report_${fromDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    return Number(num).toLocaleString('en-IN');
  };

  return (
    <div className="close-report-wrapper bg-[#fcfcfc] min-h-screen pb-10">
      <Headers title={'Close Report'} />
      <div className={`transition-all duration-300 pl-[10px] pr-8 pt-8 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        
        {/* Top Controls Area */}
        <div className="flex justify-between items-end mb-8">
          <div className="flex items-end gap-3">
            <div className="flex flex-col">
              <label className="text-[13px] text-gray-500 mb-1 ml-1">Select Date</label>
              <div className="relative">
                 <input
                   type="date"
                   value={fromDate}
                   onChange={(e) => setFromDate(e.target.value)}
                   className="border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 w-[160px] h-[40px] shadow-sm"
                 />
              </div>
            </div>
            
            <button
              onClick={handleFetch}
              disabled={!fromDate || isLoading}
              className={`px-6 rounded-md text-[14px] font-medium h-[40px] flex items-center justify-center gap-2 transition-colors ${!fromDate || isLoading ? 'bg-[#d8b4fe] cursor-not-allowed text-white' : 'bg-[#a855f7] hover:bg-[#9333ea] text-white shadow-sm'}`}
            >
              {isLoading ? 'Loading...' : 'Fetch Data'}
            </button>
            
            <button
              onClick={handleExportCSV}
              className="bg-[#f1f5f9] hover:bg-gray-200 text-gray-800 px-5 rounded-md text-[14px] font-medium h-[40px] flex items-center justify-center gap-2 transition-colors shadow-sm border border-gray-200"
            >
              Export CSV 
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
          </div>
          
          <div className="flex bg-[#eceef0] rounded-full p-1 items-center">
            <button 
              onClick={() => setFilter("All")} 
              style={{ display: 'inline-flex' }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors items-center justify-center ${filter === 'All' ? 'bg-[#222222] text-white shadow-sm' : 'text-gray-800 hover:bg-gray-200 bg-transparent'}`}
            >
              All Status
            </button>
            <button 
              onClick={() => setFilter("Not Closed")} 
              style={{ display: 'inline-flex' }}
              className={`items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${filter === 'Not Closed' ? 'bg-[#222222] text-white shadow-sm' : 'text-gray-800 hover:bg-gray-200 bg-transparent'}`}
            >
              <span>Not Closed</span>
              {counts.notClosedCount > 0 && (
                <span className="bg-[#ef4444] text-white text-[11px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {counts.notClosedCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setFilter("Match")} 
              style={{ display: 'inline-flex' }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors items-center justify-center ${filter === 'Match' ? 'bg-[#222222] text-white shadow-sm' : 'text-gray-800 hover:bg-gray-200 bg-transparent'}`}
            >
              Match
            </button>
            <button 
              onClick={() => setFilter("Mismatch")} 
              style={{ display: 'inline-flex' }}
              className={`items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${filter === 'Mismatch' ? 'bg-[#222222] text-white shadow-sm' : 'text-gray-800 hover:bg-gray-200 bg-transparent'}`}
            >
              <span>Mismatch</span>
              {counts.mismatchCount > 0 && (
                <span className="bg-[#ef4444] text-white text-[11px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {counts.mismatchCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#222222] text-white text-[12px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold w-16">NO.</th>
                <th className="px-6 py-4 font-semibold">NO.OF BILLS</th>
                <th className="px-6 py-4 font-semibold text-center">LOC CODE</th>
                <th className="px-6 py-4 font-semibold text-center">BANK</th>
                <th className="px-6 py-4 font-semibold text-center">CASH</th>
                <th className="px-6 py-4 font-semibold text-center">CLOSE CASH</th>
                <th className="px-6 py-4 font-semibold text-center">DIFFERENCE</th>
                <th className="px-6 py-4 font-semibold text-center w-40">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-16">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                      <span className="text-gray-600 text-[14px]">Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : combinedData.length > 0 ? (
                combinedData.map((row, index) => (
                  <tr key={index} className={`border-b border-gray-100 text-[14px] hover:bg-gray-50 transition-colors ${row.displayStatus === 'Not Closed' ? 'bg-[#ffe4e6]' : 'bg-white'}`}>
                    <td className="px-6 py-4 text-gray-500">{String(index + 1).padStart(2, '0')}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{row.storeName}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{row.locCode}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{formatNumber(row.bankPlusUpi)}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{formatNumber(row.cash)}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{formatNumber(row.Closecash)}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{formatNumber(row.difference)}</td>
                    <td className="px-6 py-4 text-center">
                      {row.displayStatus === 'Match' && <span className="bg-[#dcfce7] text-[#16a34a] px-3 py-1 rounded-md text-[12px] font-semibold inline-block">Match</span>}
                      {row.displayStatus === 'Mismatch' && <span className="bg-[#fee2e2] text-[#ef4444] px-3 py-1 rounded-md text-[12px] font-semibold inline-block">Mismatch</span>}
                      {row.displayStatus === 'Not Closed' && <span className="bg-[#ef4444] text-white px-3 py-1 rounded-md text-[12px] font-semibold inline-block">Not Closed</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-16 text-gray-500 text-[14px]">
                    {!fromDate ? "Please select a date to view reports" : "No reports found for selected filter"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CloseReport;

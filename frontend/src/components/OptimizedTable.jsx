import React, { useMemo, useState, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

const OptimizedTable = ({ 
  data = [], 
  columns = [], 
  height = 400, 
  rowHeight = 50,
  onRowClick,
  loading = false,
  error = null,
  showPagination = false,
  pageSize = 100
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Memoized sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // Memoized pagination
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    
    const start = currentPage * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const displayData = showPagination ? paginatedData : sortedData;

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const TableRow = useCallback(({ index, style }) => {
    const row = displayData[index];
    if (!row) return null;

    return (
      <div 
        style={style} 
        className={`flex border-b hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
        onClick={() => onRowClick?.(row, index)}
      >
        {columns.map((column, colIndex) => (
          <div
            key={colIndex}
            className={`px-4 py-2 flex-shrink-0 ${column.align || 'text-left'}`}
            style={{ width: column.width || 'auto', minWidth: column.minWidth || 100 }}
          >
            {column.render ? column.render(row[column.key], row, index) : row[column.key]}
          </div>
        ))}
      </div>
    );
  }, [displayData, columns, onRowClick]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <div className="text-gray-600">Loading data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-red-600">
          Error loading data: {error.message}
        </div>
      </div>
    );
  }

  if (displayData.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex bg-gray-700 text-white sticky top-0 z-10">
        {columns.map((column, index) => (
          <div
            key={index}
            className={`px-4 py-3 font-semibold flex-shrink-0 ${
              column.sortable ? 'cursor-pointer hover:bg-gray-600' : ''
            } ${column.align || 'text-left'}`}
            style={{ width: column.width || 'auto', minWidth: column.minWidth || 100 }}
            onClick={() => column.sortable && handleSort(column.key)}
          >
            <div className="flex items-center gap-2">
              {column.title}
              {column.sortable && sortConfig.key === column.key && (
                <span className="text-xs">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Virtual Scrolling Table Body */}
      <List
        height={height}
        itemCount={displayData.length}
        itemSize={rowHeight}
        width="100%"
      >
        {TableRow}
      </List>

      {/* Pagination */}
      {showPagination && (
        <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, sortedData.length)} of {sortedData.length} entries
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {currentPage + 1} of {Math.ceil(sortedData.length / pageSize)}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(sortedData.length / pageSize) - 1, prev + 1))}
              disabled={currentPage >= Math.ceil(sortedData.length / pageSize) - 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(OptimizedTable);
import React, { useState, useMemo } from 'react';
import { FaSort, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const DynamicTable = ({
  data = [],
  columns = [],
  onEdit,
  onDelete,
  onView,
  onRowClick, // new: row click handler
  showActions = true,
  className = '',
  emptyMessage = 'No data available',
  containerWidth = '100%',
  containerHeight = '450px',
  actionsColumn = { title: 'Actions', width: '120px' },
  renderCustomActions,
  itemsPerPage = 10,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  const sortedData = useMemo(() => {
    let sortableData = [...data];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, itemsPerPage]);

  const getRankBackgroundColor = (value) => {
    if (typeof value !== 'string') return '';
    if (value.toLowerCase().includes('no. 1')) return 'bg-yellow-100';
    if (value.toLowerCase().includes('no. 2')) return 'bg-red-100';
    if (value.toLowerCase().includes('no. 3')) return 'bg-green-100';
    return '';
  };

  const renderCellContent = (column, item) => {
    const value = item[column.key];
    if (column.render) return column.render(value, item);
    if (column.key === 'rank') {
      return (
        <span className={`px-2 py-1 rounded-full ${getRankBackgroundColor(value)}`}>
          {value}
        </span>
      );
    }
    return value || 'N/A';
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page < 1 ? 1 : page > totalPages ? totalPages : page);
  };

  if (data.length === 0) {
    return (
      <div
        className="text-center py-8 text-gray-500 bg-white rounded-lg shadow-sm"
        style={{ width: containerWidth, height: containerHeight, maxWidth: '100%' }}
        role="region"
        aria-live="polite"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={`${className} overflow-x-auto font-roboto`}
      style={{ width: containerWidth, height: containerHeight, maxWidth: '100%' }}
    >
      <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                style={{ width: column.width || 'auto' }}
                onClick={() => handleSort(column.key)}
                aria-sort={
                  sortConfig.key === column.key
                    ? sortConfig.direction
                    : 'none'
                }
              >
                <div className="flex items-center gap-1">
                  {column.title}
                  {sortConfig.key === column.key && (
                    <FaSort
                      className={`h-3 w-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''
                        }`}
                    />
                  )}
                </div>
              </th>
            ))}
            {showActions && (
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: actionsColumn.width }}
              >
                {actionsColumn.title}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedData.map((item, index) => (
            <tr
              key={item.id || index}
              className={`hover:bg-indigo-50 transition-colors duration-200 animate-fade-in ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              {columns.map((column) => (
                <td
                  key={`${item.id || index}-${column.key}`}
                  className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                  style={{ width: column.width || 'auto' }}
                  title={item[column.key]}
                >
                  {renderCellContent(column, item)}
                </td>
              ))}
              {showActions && (
                <td
                  className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium"
                  style={{ width: actionsColumn.width }}
                >
                  {renderCustomActions ? (
                    renderCustomActions(item)
                  ) : (
                    <div className="flex space-x-2 justify-end">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          aria-label="Edit"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          aria-label="Delete"
                        >
                          Delete
                        </button>
                      )}
                      {onView && (
                        <button
                          onClick={() => onView(item)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          aria-label="View"
                        >
                          View
                        </button>
                      )}
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <FaChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            Next
            <FaChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        .font-roboto {
          font-family: 'Roboto', sans-serif;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DynamicTable;
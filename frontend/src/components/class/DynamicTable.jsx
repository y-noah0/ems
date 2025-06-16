import React, { useState, useMemo } from 'react';
import { FiEdit } from 'react-icons/fi';
import { FiTrash2 } from 'react-icons/fi';

const DynamicTable = ({
  data,
  columns,
  onEdit,
  onDelete,
  onView,
  showActions = true,
  className = '',
  emptyMessage = 'No data available',
  containerWidth = '1040px', 
  containerHeight = '450px',
  actionsColumn = {
    title: 'Actions',
    width: '120px'
  },
  renderCustomActions = null 
}) => {
  // Function to render background color based on rank value
  const getRankBackgroundColor = (value) => {
    if (typeof value !== 'string') return '';
    
    if (value.toLowerCase().includes('no. 1')) return 'bg-yellow-100';
    if (value.toLowerCase().includes('no. 2')) return 'bg-red-100';
    if (value.toLowerCase().includes('no. 3')) return 'bg-green-100';
    return '';
  };

  // Function to render custom cell content
  const renderCellContent = (column, item) => {
    const value = item[column.key];
    
    // Check if column has a custom renderer
    if (column.render) {
      return column.render(value, item);
    }
    
    // Handle rank styling
    if (column.key === 'rank') {
      return (
        <span className={`px-2 py-1 rounded-full ${getRankBackgroundColor(value)}`}>
          {value}
        </span>
      );
    }
    
    return value;
  };

  if (data.length === 0) {
    return (
      <div 
        className="text-center py-8 text-gray-500 bg-white rounded-lg shadow-sm"
        style={{ 
          width: containerWidth, 
          height: containerHeight,
          maxWidth: '100%'
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div 
      className={`${className} overflow-hidden bg-white rounded-lg shadow-sm w-full mx-auto`}
      style={{ 
        width: containerWidth, 
        height: containerHeight,
        maxWidth: '100%' // Ensures table doesn't overflow on smaller screens
      }}
    >
      {/* Header section - fixed at the top */}
      <div className="overflow-hidden w-full">
        <table className="w-full table-fixed">
          <thead className="bg-white z-10">
            <tr className="border-b border-gray-200">
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className="px-6 py-3 text-left text-sm font-medium text-gray-700 truncate"
                  style={{ width: column.width || 'auto' }}
                >
                  {column.title}
                </th>
              ))}
              {showActions && (
                <th 
                  className="px-6 py-3 text-right text-sm font-medium text-gray-700"
                  style={{ width: actionsColumn.width }}
                >
                  {actionsColumn.title}
                </th>
              )}
            </tr>
          </thead>
        </table>
      </div>

      {/* Scrollable body section */}
      <div 
        className="overflow-y-auto w-full" 
        style={{ 
          height: `calc(${containerHeight} - 41px)` // Subtract header height
        }}
      >
        <table className="w-full table-fixed">
          <tbody>
            {data.map((item, index) => (
              <tr 
                key={item.id || index}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                {columns.map((column) => (
                  <td 
                    key={`${item.id || index}-${column.key}`} 
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 truncate"
                    style={{ width: column.width || 'auto' }}
                    title={item[column.key]} // Add tooltip for truncated content
                  >
                    {renderCellContent(column, item)}
                  </td>
                ))}
                {showActions && (
                  <td 
                    className="px-6 py-4 whitespace-nowrap text-right text-sm"
                    style={{ width: actionsColumn.width }}
                  >
                    {renderCustomActions ? (
                      renderCustomActions(item)
                    ) : (
                      <div className="flex space-x-2 justify-end">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="text-white bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-600"
                            aria-label="Edit"
                          >
                            <FiEdit size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="text-white bg-red-500 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                            aria-label="Delete"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                        {onView && (
                          <button
                            onClick={() => onView(item)}
                            className="text-blue-500 hover:text-blue-700 font-medium"
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
      </div>
    </div>
  );
};

export default DynamicTable;
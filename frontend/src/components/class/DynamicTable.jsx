import React, { useState, useMemo } from 'react';

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
        className="text-center py-8 text-gray-500"
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
      className={`${className} overflow-x-auto`}
      style={{ 
        width: containerWidth, 
        height: containerHeight,
        maxWidth: '100%'
      }}
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th 
                key={column.key} 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: column.width || 'auto' }}
              >
                {column.title}
              </th>
            ))}
            {showActions && (
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: actionsColumn.width }}
              >
                {actionsColumn.title}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr 
              key={item.id || index}
              className="hover:bg-gray-50"
            >
              {columns.map((column) => (
                <td 
                  key={`${item.id || index}-${column.key}`} 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  style={{ width: column.width || 'auto' }}
                  title={item[column.key]}
                >
                  {renderCellContent(column, item)}
                </td>
              ))}
              {showActions && (
                <td 
                  className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                  style={{ width: actionsColumn.width }}
                >
                  {renderCustomActions ? (
                    renderCustomActions(item)
                  ) : (
                    <div className="flex space-x-2 justify-end">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
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
    </div>
  );
};

export default DynamicTable;
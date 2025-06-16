// components/ui/StatCard.js
import React from 'react';

const StatCard = ({ title, value, icon, trend, className = '' }) => {
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500';
  const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        {icon && (
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            {icon}
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className={`mt-2 text-sm ${trendColor}`}>
          <span>{trendIcon} {Math.abs(trend)}% from last term</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
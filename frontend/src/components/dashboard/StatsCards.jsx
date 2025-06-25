import React from 'react';
import { Building2, Users, GraduationCap, FileText } from 'lucide-react';

const StatsCards = ({ stats }) => {
  const cards = [
    {
      title: 'Classes',
      value: stats.classCount || 0,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    },
    {
      title: 'Students',
      value: stats.studentCount || 0,
      icon: Users,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-100'
    },
    {
      title: 'Teachers',
      value: stats.teacherCount || 0,
      icon: GraduationCap,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-100'
    },
    {
      title: 'Exams',
      value: stats.examCount || 0,
      icon: FileText,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className={`
            bg-white rounded-lg p-6 
            border-1 ${card.borderColor}
            shadow-md hover:shadow-lg
            transition-all duration-200
            relative
            flex
            gap-5
          `}
          aria-label={`${card.title} statistics card`}
        >
          
          <div className={`w-14 h-14 ${card.bgColor} rounded-lg flex items-center justify-center mb-4 border ${card.borderColor}`}>
            <card.icon className={`w-7 h-7 ${card.color}`} aria-hidden="true" />
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{card.title}</h3>
            <p className="text-3xl font-semibold text-gray-900 mt-1">
              {card.value.toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
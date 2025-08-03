import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend  
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const RiskZones = ({ 
  students = [], 
  totalAtRisk = 254,
  belowThresholdPercentage = 60,
  aboveThresholdPercentage = 40 
}) => {
  // Chart data configuration
  const chartData = {
    labels: ['Below 50%', 'Above 50%'],
    datasets: [{
      data: [belowThresholdPercentage, aboveThresholdPercentage],
      backgroundColor: ['#3b82f6', '#A53100'],
      borderWidth: 0,
      hoverOffset: 10
    }]
  };

  const chartOptions = {
    cutout: '70%',
    plugins: { 
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.raw}%`
        }
      }
    },
    maintainAspectRatio: false
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Chart Section */}
        <div className="flex flex-col items-center md:items-start border-r-0 md:border-r border-gray-200 pr-0 md:pr-8">
          <div className="w-40 h-40 relative">
            <Doughnut data={chartData} options={chartOptions} />
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold text-gray-800">{totalAtRisk}</span>
              <span className="text-xs text-gray-500">Total at Risk</span>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-md px-3 py-2">
              <span className="w-3 h-3 bg-[#A53100] rounded-full"></span>
              <span>Below : {belowThresholdPercentage}%</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-md px-3 py-2">
              <span className="w-3 h-3 bg-[#3b82f6] rounded-full"></span>
              <span>Above : {aboveThresholdPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
            <h3 className="text-lg font-semibold text-gray-900">Risk Zones</h3>
            <span className="bg-[#A53100] text-white text-sm px-3 py-1 rounded-md font-medium border border-[#A53100]">
              {totalAtRisk} Students
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-sm text-gray-500 font-medium">
                  <th className="pb-3 pl-2 border-b border-gray-200">Student Name</th>
                  <th className="pb-3 pr-2 border-b border-gray-200 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pl-2 text-gray-800 font-medium border-b border-gray-100">
                      {student.name}
                    </td>
                    <td className="py-3 pr-2 text-right border-b border-gray-100">
                      <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${
                        parseFloat(student.marks) < 50 
                          ? 'bg-[#A53100]/10 text-[#A53100] border-[#A53100]/20' 
                          : 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20'
                      }`}>
                        {student.marks}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

RiskZones.defaultProps = {
  students: [
    { name: 'Mukabatari Immacule', marks: '23%' },
    { name: 'Nsengiyumva guy', marks: '34%' },
    { name: 'Muremy Jerry', marks: '80%' },
  ],
  totalAtRisk: 254,
  belowThresholdPercentage: 50,
  aboveThresholdPercentage: 50
};

export default RiskZones;
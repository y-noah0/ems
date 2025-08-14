import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { ChartBarIcon, ChartPieIcon, ArrowUpIcon, ArrowDownIcon, CalendarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { FiChevronDown } from 'react-icons/fi';
import DynamicTable from '../class/DynamicTable';
import deanService from '../../services/deanService';

const ClassPerformance = () => {
  // Mock data to avoid runtime errors if deanService fails
  const mockClasses = [
    { _id: '1', level: 'L3', trade: { code: 'SOD' } },
    { _id: '2', level: 'L4', trade: { code: 'NIT' } },
    { _id: '3', level: 'L3', trade: { code: 'ELC' } },
  ];

  const mockStudentData = [
    { name: 'John Doe', assessment1: 80, assessment2: 75, test: 70, exams: 85, total: 77.5 },
    { name: 'Jane Smith', assessment1: 85, assessment2: 80, test: 75, exams: 90, total: 82.5 },
  ];

  // Chart data calculated from API or mock
  const [chartData, setChartData] = useState([]);
  // Performance data for selected class table
  const [performanceData, setPerformanceData] = useState([]);
  // Search queries
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [chartSearchQuery, setChartSearchQuery] = useState('');
  // Chart states
  const [metric, setMetric] = useState('averageScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dropdown options
  const academicYearOptions = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
  const termOptions = ['Term 1', 'Term 2', 'Term 3'];
  // Class options from backend or mock
  const [classOptionsData, setClassOptionsData] = useState([]);
  // Currently selected filters
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [term, setTerm] = useState('Term 1');
  const [selectedClass, setSelectedClass] = useState('');

  // Dropdown visibility states
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showTermDropdown, setShowTermDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  // Refs for dropdown containers
  const yearDropdownRef = useRef(null);
  const termDropdownRef = useRef(null);
  const classDropdownRef = useRef(null);

  // Metric options for chart
  const metricOptions = [
    { value: 'averageScore', label: 'Average Score', icon: ChartBarIcon },
    { value: 'competencyRate', label: 'Competency Rate', icon: ChartPieIcon },
  ];

  // Term map for API
  const termMap = {
    'Term 1': 'term1',
    'Term 2': 'term2',
    'Term 3': 'term3',
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setShowYearDropdown(false);
      }
      if (termDropdownRef.current && !termDropdownRef.current.contains(event.target)) {
        setShowTermDropdown(false);
      }
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target)) {
        setShowClassDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch class list on component mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setIsLoading(true);
        const classes = (await deanService.getAllClasses()) || mockClasses;
        setClassOptionsData(classes);
        if (classes.length) setSelectedClass(`${classes[0].level} ${classes[0].trade.code}`);
      } catch (err) {
        console.error('Error loading classes:', err);
        setError('Failed to load classes. Using mock data.');
        setClassOptionsData(mockClasses);
        if (mockClasses.length) setSelectedClass(`${mockClasses[0].level} ${mockClasses[0].trade.code}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadClasses();
  }, []);

  // Fetch performance data for all classes (for chart) when filters change
  useEffect(() => {
    const loadAllPerformance = async () => {
      if (!classOptionsData.length) return;
      setIsLoading(true);
      setError(null);
      try {
        const allReports = await Promise.all(
          classOptionsData.map(async (cls) => {
            try {
              const report = await deanService.generateClassReport(cls._id, termMap[term]);
              const students = report.students || mockStudentData;
              const totalStudents = students.length;
              const averageScore = totalStudents ? students.reduce((sum, s) => sum + (s.total || 0), 0) / totalStudents : 0;
              const competencyRate = totalStudents ? (students.filter(s => s.total >= 50).length / totalStudents) * 100 : 0;
              return {
                classId: cls._id,
                className: `${cls.level} ${cls.trade.code}`,
                totalStudents,
                averageScore,
                competencyRate,
                termId: termMap[term],
                academicYear,
              };
            } catch (err) {
              console.error(`Error loading report for class ${cls._id}:`, err);
              return {
                classId: cls._id,
                className: `${cls.level} ${cls.trade.code}`,
                totalStudents: mockStudentData.length,
                averageScore: mockStudentData.reduce((sum, s) => sum + s.total, 0) / mockStudentData.length,
                competencyRate: (mockStudentData.filter(s => s.total >= 50).length / mockStudentData.length) * 100,
                termId: termMap[term],
                academicYear,
              };
            }
          })
        );
        setChartData(allReports);
      } catch (err) {
        console.error('Error loading all class performance:', err);
        setError('Failed to load class performance data. Using mock data.');
        const mockChartData = mockClasses.map(cls => ({
          classId: cls._id,
          className: `${cls.level} ${cls.trade.code}`,
          totalStudents: mockStudentData.length,
          averageScore: mockStudentData.reduce((sum, s) => sum + s.total, 0) / mockStudentData.length,
          competencyRate: (mockStudentData.filter(s => s.total >= 50).length / mockStudentData.length) * 100,
          termId: termMap[term],
          academicYear,
        }));
        setChartData(mockChartData);
      } finally {
        setIsLoading(false);
      }
    };
    loadAllPerformance();
  }, [academicYear, term, classOptionsData]);

  // Fetch performance data for selected class (for table)
  useEffect(() => {
    const loadSelectedPerformance = async () => {
      if (!selectedClass) return;
      try {
        const cls = classOptionsData.find(c => `${c.level} ${c.trade.code}` === selectedClass);
        if (!cls) return;
        const report = await deanService.generateClassReport(cls._id, termMap[term]);
        setPerformanceData(report.students || mockStudentData);
      } catch (err) {
        console.error('Error loading selected class performance:', err);
        setPerformanceData(mockStudentData);
      }
    };
    loadSelectedPerformance();
  }, [selectedClass, term, classOptionsData]);

  // View student details handler
  const handleViewDetails = (student) => {
    console.log('View student details:', student);
    // Add navigation logic here (e.g., using react-router)
  };

  // Filter and sort chart data
  const filteredChartData = chartData
    .filter(item =>
      item.className.toLowerCase().includes(chartSearchQuery.toLowerCase()) &&
      item.termId === termMap[term] &&
      item.academicYear === academicYear
    )
    .sort((a, b) => {
      const valueA = a[metric] || 0;
      const valueB = b[metric] || 0;
      return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
    });

  // Calculate percentages for chart
  const total = filteredChartData.reduce((sum, item) => sum + (item[metric] || 0), 0);
  const dataWithPercentages = filteredChartData.map(item => ({
    ...item,
    percentage: total ? ((item[metric] / total) * 100).toFixed(1) : 0,
  }));

  // Filter table data
  const filteredPerformanceData = performanceData.filter(student =>
    student.name.toLowerCase().includes(tableSearchQuery.toLowerCase())
  );

  // Export chart data to CSV
  const exportChartToCSV = () => {
    const headers = ['Class Name', 'Total Students', 'Average Score', 'Competency Rate', 'Term', 'Academic Year'];
    const rows = dataWithPercentages.map(item => [
      item.className,
      item.totalStudents,
      item.averageScore.toFixed(2),
      item.competencyRate.toFixed(2),
      term,
      item.academicYear,
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `class_performance_${term}_${academicYear}.csv`;
    link.click();
  };

  // Export table data to CSV
  const exportTableToCSV = () => {
    const headers = ['Name', 'Ass I', 'Ass II', 'Test', 'Exams', 'Total'];
    const rows = filteredPerformanceData.map(student => [
      student.name,
      student.assessment1 || 0,
      student.assessment2 || 0,
      student.test || 0,
      student.exams || 0,
      student.total || 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `student_performance_${selectedClass}_${term}_${academicYear}.csv`;
    link.click();
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 border border-gray-200 rounded-lg shadow-lg p-4 backdrop-blur-sm">
          <p className="text-gray-900 font-bold mb-2">{data.className}</p>
          <p className="text-gray-700 text-sm">{metricOptions.find(opt => opt.value === metric).label}: {data[metric].toFixed(2)}</p>
          <p className="text-gray-700 text-sm">Percentage: {data.percentage}%</p>
          <p className="text-gray-700 text-sm">Students: {data.totalStudents}</p>
          <p className="text-gray-700 text-sm">Term: {term}</p>
          <p className="text-gray-700 text-sm">Year: {data.academicYear}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Class Performance Monitor</h1>

        <div className="flex flex-wrap justify-end gap-3 mb-3">
          {/* Academic Year Dropdown */}
          <div ref={yearDropdownRef} className="relative">
            <button
              className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[140px] hover:bg-gray-50 transition-all"
              onClick={() => setShowYearDropdown(!showYearDropdown)}
            >
              {academicYear}
              <FiChevronDown className={`transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showYearDropdown && (
              <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20">
                {academicYearOptions.map((year) => (
                  <button
                    key={year}
                    className={`block w-full text-left px-4 py-2 text-sm ${year === academicYear ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                    onClick={() => {
                      setAcademicYear(year);
                      setShowYearDropdown(false);
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Term Dropdown */}
          <div ref={termDropdownRef} className="relative">
            <button
              className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[100px] hover:bg-gray-50 transition-all"
              onClick={() => setShowTermDropdown(!showTermDropdown)}
            >
              {term}
              <FiChevronDown className={`transition-transform ${showTermDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showTermDropdown && (
              <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20">
                {termOptions.map((termOption) => (
                  <button
                    key={termOption}
                    className={`block w-full text-left px-4 py-2 text-sm ${termOption === term ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                    onClick={() => {
                      setTerm(termOption);
                      setShowTermDropdown(false);
                    }}
                  >
                    {termOption}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Class Dropdown */}
          <div ref={classDropdownRef} className="relative">
            <button
              className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[100px] hover:bg-gray-50 transition-all"
              onClick={() => setShowClassDropdown(!showClassDropdown)}
            >
              {selectedClass || 'Select class'}
              <FiChevronDown className={`transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showClassDropdown && (
              <div className="absolute right-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-20">
                {classOptionsData.map((cls) => {
                  const label = `${cls.level} ${cls.trade.code}`;
                  return (
                    <button
                      key={cls._id}
                      className={`block w-full text-left px-4 py-2 text-sm ${label === selectedClass ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                      onClick={() => {
                        setSelectedClass(label);
                        setShowClassDropdown(false);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 mb-8 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Class Performance Trends</h2>
          <div className="flex gap-3">
            <button
              onClick={exportChartToCSV}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-all duration-200 text-sm"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Export Chart CSV
            </button>
          </div>
        </div>

        {/* Chart Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-gray-700 font-medium text-sm">Metric:</label>
            <div className="relative">
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="appearance-none border border-gray-300 rounded-md pl-10 pr-8 py-1.5 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {metricOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {(() => {
                const Icon = metricOptions.find(opt => opt.value === metric).icon;
                return <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />;
              })()}
            </div>
          </div>
          <input
            type="text"
            placeholder="Search classes..."
            value={chartSearchQuery}
            onChange={(e) => setChartSearchQuery(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 max-w-xs"
          />
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-all duration-200 text-sm"
          >
            {sortOrder === 'desc' ? (
              <ArrowDownIcon className="w-4 h-4" />
            ) : (
              <ArrowUpIcon className="w-4 h-4" />
            )}
            Sort {sortOrder === 'desc' ? 'Asc' : 'Desc'}
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="border-4 border-gray-200 border-t-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64 text-red-500">{error}</div>
        ) : dataWithPercentages.length === 0 ? (
          <div className="flex justify-center items-center h-64 text-gray-500">No data available for selected filters</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dataWithPercentages} margin={{ top: 20, right: 30, left: 0, bottom: 100 }}>
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="className" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{
                  value: metricOptions.find(opt => opt.value === metric).label,
                  angle: -90,
                  position: 'insideLeft',
                  offset: -5,
                  style: { fontSize: 12, fill: '#374151', fontWeight: 'bold' },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              <Line
                type="monotone"
                dataKey={metric}
                stroke="url(#lineGradient)"
                strokeWidth={3}
                name={metricOptions.find(opt => opt.value === metric).label}
                dot={{ r: 5, fill: '#2563eb' }}
                activeDot={{ r: 8, fill: '#10b981' }}
                animationDuration={1000}
                animationEasing="ease-in-out"
              >
                <LabelList dataKey="percentage" position="top" formatter={(value) => `${value}%`} style={{ fontSize: 10, fill: '#374151', fontWeight: 'bold' }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table Section for Selected Class */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Student Performance in {selectedClass}</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search students..."
              value={tableSearchQuery}
              onChange={(e) => setTableSearchQuery(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={exportTableToCSV}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-all duration-200 text-sm"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Export Table CSV
            </button>
          </div>
        </div>
        <DynamicTable
          data={filteredPerformanceData}
          columns={[
            { key: 'name', title: 'Names', width: '25%' },
            { key: 'assessment1', title: 'Ass I', width: '12%' },
            { key: 'assessment2', title: 'Ass II', width: '12%' },
            { key: 'test', title: 'Test', width: '12%' },
            { key: 'exams', title: 'Exams', width: '12%' },
            { key: 'total', title: 'Total', width: '12%' },
          ]}
          showActions={true}
          containerWidth="100%"
          containerHeight="450px"
          actionsColumn={{
            title: 'Actions',
            width: '15%',
          }}
          renderCustomActions={(item) => (
            <button
              onClick={() => handleViewDetails(item)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View
            </button>
          )}
        />
      </div>
    </div>
  );
};

export default ClassPerformance;
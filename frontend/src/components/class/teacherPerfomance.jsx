import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { ChartBarIcon, ChartPieIcon, ArrowUpIcon, ArrowDownIcon, CalendarIcon } from '@heroicons/react/24/outline';

const TeacherPerformanceBarChart = ({
    data = [
        { teacher: "1", teacherName: "John Doe", totalStudents: 50, averageScore: 75.23, competencyRate: 80.0, rank: 0.1, termId: "term1", academicYear: "2024-2025" },
        { teacher: "2", teacherName: "Jane Smith", totalStudents: 45, averageScore: 70.45, competencyRate: 75.0, rank: 0.2, termId: "term1", academicYear: "2024-2025" },
        { teacher: "3", teacherName: "Emily Johnson", totalStudents: 60, averageScore: 82.10, competencyRate: 85.0, rank: 0.3, termId: "term1", academicYear: "2024-2025" },
        { teacher: "4", teacherName: "Michael Brown", totalStudents: 55, averageScore: 65.80, competencyRate: 70.0, rank: 0.4, termId: "term1", academicYear: "2024-2025" },
        { teacher: "5", teacherName: "Sarah Davis", totalStudents: 40, averageScore: 78.90, competencyRate: 82.5, rank: 0.5, termId: "term1", academicYear: "2024-2025" },
        { teacher: "6", teacherName: "David Wilson", totalStudents: 48, averageScore: 72.15, competencyRate: 77.5, rank: 0.1, termId: "term2", academicYear: "2024-2025" },
        { teacher: "7", teacherName: "Laura Martinez", totalStudents: 52, averageScore: 80.35, competencyRate: 83.0, rank: 0.2, termId: "term2", academicYear: "2024-2025" },
        { teacher: "8", teacherName: "James Taylor", totalStudents: 47, averageScore: 68.50, competencyRate: 72.0, rank: 0.3, termId: "term2", academicYear: "2024-2025" },
        { teacher: "9", teacherName: "Anna Lee", totalStudents: 53, averageScore: 77.60, competencyRate: 81.0, rank: 0.4, termId: "term2", academicYear: "2024-2025" },
        { teacher: "10", teacherName: "Robert Clark", totalStudents: 49, averageScore: 73.20, competencyRate: 78.0, rank: 0.5, termId: "term2", academicYear: "2024-2025" },
        { teacher: "11", teacherName: "Lisa Adams", totalStudents: 42, averageScore: 79.50, competencyRate: 84.0, rank: 0.1, termId: "term3", academicYear: "2024-2025" },
        { teacher: "12", teacherName: "Mark Thompson", totalStudents: 51, averageScore: 71.80, competencyRate: 76.5, rank: 0.2, termId: "term3", academicYear: "2024-2025" },
        { teacher: "13", teacherName: "Nancy White", totalStudents: 46, averageScore: 74.25, competencyRate: 79.0, rank: 0.3, termId: "term3", academicYear: "2024-2025" },
        { teacher: "14", teacherName: "Paul Green", totalStudents: 54, averageScore: 67.90, competencyRate: 71.5, rank: 0.4, termId: "term3", academicYear: "2024-2025" },
        { teacher: "15", teacherName: "Karen Black", totalStudents: 44, averageScore: 76.30, competencyRate: 80.5, rank: 0.5, termId: "term3", academicYear: "2024-2025" },
        { teacher: "16", teacherName: "Tom Harris", totalStudents: 48, averageScore: 69.50, competencyRate: 73.0, rank: 0.6, termId: "term3", academicYear: "2023-2024" },
        { teacher: "17", teacherName: "Susan Lewis", totalStudents: 50, averageScore: 78.40, competencyRate: 82.0, rank: 0.7, termId: "term3", academicYear: "2023-2024" },
        { teacher: "18", teacherName: "George Walker", totalStudents: 47, averageScore: 70.60, competencyRate: 74.5, rank: 0.8, termId: "term3", academicYear: "2023-2024" },
    ],
    title = 'Teacher Performance Report',
    barColor = '#2563eb',
}) => {
    const [metric, setMetric] = useState('averageScore');
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('term1');
    const [selectedYear, setSelectedYear] = useState('2024-2025');
    const [isLoading, setIsLoading] = useState(true);

    // Simulate loading
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Metric, term, and year options
    const metricOptions = [
        { value: 'averageScore', label: 'Average Score', icon: ChartBarIcon },
        { value: 'competencyRate', label: 'Competency Rate', icon: ChartPieIcon },
    ];
    const termOptions = [
        { value: 'term1', label: 'Term 1' },
        { value: 'term2', label: 'Term 2' },
        { value: 'term3', label: 'Term 3' },
    ];
    const academicYearOptions = [
        { value: '2023-2024', label: '2023-2024' },
        { value: '2024-2025', label: '2024-2025' },
    ];

    // Filter and sort data
    const filteredData = data
        .filter(item =>
            item.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) &&
            item.termId === selectedTerm &&
            item.academicYear === selectedYear
        )
        .sort((a, b) => {
            const valueA = a[metric] || 0;
            const valueB = b[metric] || 0;
            return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
        });

    // Calculate percentages
    const total = filteredData.reduce((sum, item) => sum + (item[metric] || 0), 0);
    const dataWithPercentages = filteredData.map(item => ({
        ...item,
        percentage: total ? ((item[metric] / total) * 100).toFixed(1) : 0,
    }));

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white/95 border border-gray-200 rounded-lg shadow-lg p-4 backdrop-blur-sm">
                    <p className="text-gray-900 font-bold mb-2">{data.teacherName}</p>
                    <p className="text-gray-700 text-sm">{metricOptions.find(opt => opt.value === metric).label}: {data[metric].toFixed(2)}</p>
                    <p className="text-gray-700 text-sm">Percentage: {data.percentage}%</p>
                    <p className="text-gray-700 text-sm">Rank: {(data.rank * 10).toFixed(1)}/10</p>
                    <p className="text-gray-700 text-sm">Students: {data.totalStudents}</p>
                    <p className="text-gray-700 text-sm">Term: {termOptions.find(opt => opt.value === data.termId).label}</p>
                    <p className="text-gray-700 text-sm">Year: {data.academicYear}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-[90vw] sm:max-w-[1200px] bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-4 sm:p-6 flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)]">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 text-center tracking-tight">{title}</h1>

                {/* Filters */}
                <div className="flex flex-col gap-4 sm:gap-3 sm:flex-row sm:flex-wrap justify-between items-center mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <label htmlFor="metric-select" className="text-gray-700 font-medium text-sm sm:text-base">Metric:</label>
                            <div className="relative w-full sm:w-40">
                                <select
                                    id="metric-select"
                                    value={metric}
                                    onChange={(e) => setMetric(e.target.value)}
                                    className="appearance-none border border-gray-300 rounded-md pl-8 pr-6 py-1.5 sm:pl-10 sm:pr-8 sm:py-2 bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 w-full"
                                >
                                    {metricOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                {(() => {
                                    const Icon = metricOptions.find(opt => opt.value === metric).icon;
                                    return <Icon className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
                                })()}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <label htmlFor="term-select" className="text-gray-700 font-medium text-sm sm:text-base">Term:</label>
                            <div className="relative w-full sm:w-32">
                                <select
                                    id="term-select"
                                    value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(e.target.value)}
                                    className="appearance-none border border-gray-300 rounded-md pl-8 pr-6 py-1.5 sm:pl-10 sm:pr-8 sm:py-2 bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 w-full"
                                >
                                    {termOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <CalendarIcon className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <label htmlFor="year-select" className="text-gray-700 font-medium text-sm sm:text-base">Year:</label>
                            <div className="relative w-full sm:w-36">
                                <select
                                    id="year-select"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="appearance-none border border-gray-300 rounded-md pl-8 pr-6 py-1.5 sm:pl-10 sm:pr-8 sm:py-2 bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 w-full"
                                >
                                    {academicYearOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <CalendarIcon className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="Search teachers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 sm:px-4 py-1.5 sm:py-2 w-full sm:w-48 bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                        />
                        <button
                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                            className="flex items-center gap-1 sm:gap-2 bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-blue-700 transition-all duration-200 text-sm sm:text-base"
                        >
                            {sortOrder === 'desc' ? (
                                <ArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
                            ) : (
                                <ArrowUpIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
                            )}
                            Sort {sortOrder === 'desc' ? 'Asc' : 'Desc'}
                        </button>
                    </div>
                </div>

                {/* Chart or No Data */}
                {isLoading ? (
                    <div className="flex flex-1 justify-center items-center">
                        <div className="border-4 border-gray-200 border-t-blue-600 rounded-full w-10 h-10 sm:w-12 sm:h-12 animate-spin"></div>
                    </div>
                ) : dataWithPercentages.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4">
                        <ChartBarIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                        <p className="text-gray-500 text-base sm:text-lg text-center">No data available for the selected term and year. Please adjust the filters.</p>
                    </div>
                ) : (
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={dataWithPercentages}
                                margin={{ top: 40, right: 20, left: 10, bottom: 100 }}
                            >
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2563eb" />
                                        <stop offset="100%" stopColor="#10b981" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="teacherName"
                                    stroke="#374151"
                                    tick={{ fontSize: 10, angle: -45, textAnchor: 'end', dy: 10 }}
                                    height={80}
                                    interval={0}
                                />
                                <YAxis
                                    stroke="#374151"
                                    label={{
                                        value: metricOptions.find(opt => opt.value === metric).label,
                                        angle: -90,
                                        position: 'insideLeft',
                                        offset: -5,
                                        style: { fontSize: 12, fill: '#374151', fontWeight: 'bold' },
                                    }}
                                    domain={[0, 100]}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" height={36} />
                                <Bar
                                    dataKey={metric}
                                    fill="url(#barGradient)"
                                    name={metricOptions.find(opt => opt.value === metric).label}
                                    barSize={20}
                                    radius={[4, 4, 0, 0]}
                                    animationDuration={1000}
                                    animationEasing="ease-in-out"
                                    onMouseEnter={(e) => {
                                        if (e.target instanceof SVGElement) {
                                            e.target.style.transform = 'scale(1.05)';
                                            e.target.style.transition = 'transform 0.2s ease-in-out';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (e.target instanceof SVGElement) {
                                            e.target.style.transform = 'scale(1)';
                                        }
                                    }}
                                >
                                    <LabelList
                                        dataKey="percentage"
                                        position="top"
                                        formatter={(value) => `${value}%`}
                                        style={{ fontSize: 10, fill: '#374151', fontWeight: 'bold' }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherPerformanceBarChart;
import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

const examsCreatedData = [
    { month: "Jan", examsCreated: 3 },
    { month: "Feb", examsCreated: 5 },
    { month: "Mar", examsCreated: 2 },
    { month: "Apr", examsCreated: 6 },
    { month: "May", examsCreated: 4 },
    { month: "Jun", examsCreated: 7 },
];

const examStatusData = [
    { name: "Draft", value: 8 },
    { name: "Scheduled", value: 12 },
    { name: "Active", value: 5 },
    { name: "Completed", value: 20 },
];

const COLORS = ["#facc15", "#3b82f6", "#22c55e", "#6b7280"];

const PerformanceChart = () => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-10 w-full mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Teacher Performance Overview
            </h2>

            <div className="flex flex-col lg:flex-row gap-12">
                {/* Line Chart: Exams Created Over Months */}
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">
                        Exams Created Per Month
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={examsCreatedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="examsCreated" stroke="#4f46e5" strokeWidth={3} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart: Exam Status Distribution */}
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Exam Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={examStatusData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                                {examStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Legend verticalAlign="bottom" height={36} />
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default PerformanceChart;

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";

// Register the required chart components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function ClassCard({ classItem }) {
    const navigate = useNavigate();

    // Format data for Chart.js
    const chartData = {
        labels: ["Below 50%", "Above 50%"],
        datasets: [
            {
                data: [
                    classItem.belowThresholdPercentage,
                    classItem.aboveThresholdPercentage,
                ],
                backgroundColor: ["#ECBE3F", "#3b82f6"],
                borderWidth: 0,
            },
        ],
    };

    const chartOptions = {
        cutout: "60%",
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.label}: ${context.raw}%`,
                },
            },
        },
        maintainAspectRatio: false,
    };

    const handlePerformanceClick = () => {
        navigate(`/dean/performance`);
    };

    const handleReportsClick = () => {
        navigate(`/dean/class/${classItem.classId}/reports`);
    };

    return (
        <div className="bg-white rounded-lg p-6 shadow-lg w-fit max-w-xs border border-black/10">
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-800">
                    {classItem.className}
                </h1>
                <p className="text-gray-600 font-bold text-xs">
                    {classItem.studentsCount} students
                </p>
            </div>

            <div className="flex items-center">
                <div className="w-20 h-20 relative">
                    <Doughnut data={chartData} options={chartOptions} />
                </div>

                <div className="space-y-3 w-full mt-4 ml-4">
                    <button
                        className="bg-amber-300 text-white font-bold text-xs py-2 px-4 rounded-lg w-full"
                        onClick={handlePerformanceClick}
                    >
                        Performance
                    </button>
                    <button
                        className="bg-blue-500 text-white font-bold text-xs py-2 px-4 rounded-lg w-full"
                        onClick={handleReportsClick}
                    >
                        Reports
                    </button>
                </div>
            </div>

            <div className="mt-6 flex flex-col space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-3 h-3 bg-[#ECBE3F] rounded-xs"></span>
                    <span>Below : {classItem.belowThresholdPercentage}%</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-3 h-3 bg-[#3b82f6] rounded-xs"></span>
                    <span>Above : {classItem.aboveThresholdPercentage}%</span>
                </div>
            </div>
        </div>
    );
}

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {

FiBookOpen,
FiUser,
FiClock,
FiTarget,
FiList,
FiPlayCircle,
} from "react-icons/fi";

// Helper functions for status and formatting
const getStatusInfo = (exam) => {
if (!exam) return { label: "Unknown", color: "gray" };
const now = new Date();
const start = exam.startTime ? new Date(exam.startTime) : null;
const end = exam.endTime ? new Date(exam.endTime) : null;
if (exam.status === "draft") {
    return { label: "Draft", color: "gray" };
} else if (exam.status === "scheduled") {
    if (!start || start > now) {
        return { label: "Upcoming", color: "blue" };
    } else if (start <= now && end >= now) {
        return { label: "In Progress", color: "green" };
    } else {
        return { label: "Past", color: "gray" };
    }
} else if (exam.status === "active") {
    return { label: "Active", color: "green" };
} else if (exam.status === "completed") {
    return { label: "Completed", color: "purple" };
}
return { label: "Unknown", color: "gray" };
};

const formatDate = (dateString) => {
if (!dateString) return "Not scheduled";
const date = new Date(dateString);
return date.toLocaleString();
};

const ExamCard = ({
examId,
title,
subject,
classCode,
description,
status,
startTime,
endTime,
questions,
totalPoints,
progress = 0,
teacher,
type,
instructions,
schedule,
}) => {
const user = useAuth();
const userRole = user.currentUser.role;
const navigate = useNavigate();

const exam = {
    _id: examId,
    title,
    subject: typeof subject === "string" ? { name: subject } : subject,
    classCode,
    description,
    status,
    startTime,
    endTime,
    questions,
    totalPoints,
    progress,
    teacher,
    type,
    instructions,
    schedule: schedule || {
        start: startTime,
        end: endTime,
        duration: schedule?.duration || "-",
    },
};

const statusInfo = getStatusInfo(exam);

const handleViewClick = (e) => {
    e.stopPropagation();
    if (userRole === "teacher") {
        navigate(`/teacher/exams/${examId}`);
    } else if (userRole === "dean") {
        navigate(`/dean/exams/${examId}`);
    } else {
        navigate(`/student/exams/${examId}`);
    }
};

return (
    <div
        className="overflow-hidden rounded-2xl shadow-xl bg-white flex flex-col h-full cursor-pointer transition hover:shadow-2xl"
        style={{ minWidth: 340, maxWidth: 440, width: "100%" }}
        tabIndex={0}
        role="button"
        onClick={handleViewClick}
    >
        {/* Status gradient */}
        <div
            className={`h-2 rounded-t-xl`}
            style={{
                background: `linear-gradient(to right, var(--tw-gradient-from, ${
                    statusInfo.color === "green"
                        ? "#22c55e"
                        : statusInfo.color === "blue"
                        ? "#3b82f6"
                        : statusInfo.color === "purple"
                        ? "#a855f7"
                        : "#9ca3af"
                }), var(--tw-gradient-to, ${
                    statusInfo.color === "green"
                        ? "#16a34a"
                        : statusInfo.color === "blue"
                        ? "#2563eb"
                        : statusInfo.color === "purple"
                        ? "#7c3aed"
                        : "#6b7280"
                }))`,
            }}
        />
        <div className="p-6 flex flex-col flex-1">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 tracking-tight select-none">
                <FiBookOpen className="text-blue-600 text-2xl" /> {title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700 mb-4 select-none">
                <div className="flex items-center gap-2">
                    <FiBookOpen className="text-blue-500 text-lg" />
                    <span className="font-semibold">Subject:</span>
                    <span className="ml-auto font-medium">
                        {exam.subject?.name || "N/A"}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <FiList className="text-green-500 text-lg" />
                    <span className="font-semibold">Type:</span>
                    <span className="ml-auto font-medium">{type || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                    <FiUser className="text-purple-500 text-lg" />
                    <span className="font-semibold">Teacher:</span>
                    <span className="ml-auto font-medium">
                        {teacher?.fullName || "N/A"}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <FiClock className="text-yellow-500 text-lg" />
                    <span className="font-semibold">Start:</span>
                    <span className="ml-auto font-medium">
                        {formatDate(exam.schedule?.start)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <FiClock className="text-yellow-500 text-lg" />
                    <span className="font-semibold">End:</span>
                    <span className="ml-auto font-medium">
                        {formatDate(exam.schedule?.end)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <FiTarget className="text-red-500 text-lg" />
                    <span className="font-semibold">Duration:</span>
                    <span className="ml-auto font-medium">
                        {exam.schedule?.duration || "-"} mins
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <FiTarget className="text-red-500 text-lg" />
                    <span className="font-semibold">Total Points:</span>
                    <span className="ml-auto font-medium">
                        {totalPoints || "-"}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <FiPlayCircle
                        className={`${
                            statusInfo.color === "green"
                                ? "text-green-500"
                                : statusInfo.color === "blue"
                                ? "text-blue-500"
                                : statusInfo.color === "purple"
                                ? "text-purple-500"
                                : "text-gray-500"
                        } text-lg`}
                    />
                    <span className="font-semibold">Status:</span>
                    <span
                        className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold select-text`}
                        style={{
                            backgroundColor:
                                statusInfo.color === "green"
                                    ? "#bbf7d0"
                                    : statusInfo.color === "blue"
                                    ? "#dbeafe"
                                    : statusInfo.color === "purple"
                                    ? "#ede9fe"
                                    : "#f3f4f6",
                            color:
                                statusInfo.color === "green"
                                    ? "#166534"
                                    : statusInfo.color === "blue"
                                    ? "#1e40af"
                                    : statusInfo.color === "purple"
                                    ? "#6d28d9"
                                    : "#374151",
                        }}
                    >
                        {statusInfo.label}
                    </span>
                </div>
            </div>
            {instructions && (
                <div className="mt-2 prose max-w-none text-gray-600 line-clamp-2">
                    <div dangerouslySetInnerHTML={{ __html: instructions }} />
                </div>
            )}
            <div
                className="w-full h-2 rounded bg-gray-200 mt-4 mb-2"
                style={{ overflow: "hidden" }}
            >
                <div
                    className="h-full rounded"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: "#2563eb",
                        transition: "width 0.3s",
                    }}
                />
            </div>
            <button
                onClick={handleViewClick}
                style={{
                    backgroundColor: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "6px 28px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    alignSelf: "flex-start",
                    marginTop: "10px",
                    maxHeight: "36px",
                }}
            >
                View
            </button>
        </div>
    </div>
);
};

export default ExamCard;
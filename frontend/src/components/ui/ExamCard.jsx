import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "./Button";
import examService from '../../services/examService';

// Helper functions for status
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

// (removed unused date formatting helper)

const ExamCard = ({
    examId,
    title,
    subject,
    classCode,
    description,
    status,
    startTime,
    endTime,
    questions = [],
    totalPoints,
    progress = 0,
    teacher,
    type,
    instructions,
    schedule,
}) => {
    const { currentUser } = useAuth();
    const userRole = currentUser.role;
    const { pathname } = useLocation();
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

// Map Upcoming label to Pending to match UI wording
const displayStatusLabel = statusInfo.label === "Upcoming" ? "Pending" : statusInfo.label;

// Tinted background for status using existing status color
const statusColorMap = {
    green: { bg: "#22c55e1A", dot: "#22c55e", text: "#166534" },
    blue: { bg: "#3b82f61A", dot: "#1e40af", text: "#1e3a8a" },
    purple: { bg: "#a855f71A", dot: "#7c3aed", text: "#6d28d9" },
    gray: { bg: "#6b72801A", dot: "#6b7280", text: "#374151" },
};
const statusColors = statusColorMap[statusInfo.color] || statusColorMap.gray;

// Gold color specified for Pending (ECBE3F)
if (displayStatusLabel === "Pending") {
    statusColors.bg = "#ECBE3F1A"; // /10
    statusColors.dot = "#ECBE3F";
    statusColors.text = "#B38700";
}

return (
    <div
        className="bg-white flex flex-col cursor-pointer transition container"
        style={{
            width: 440,
            height: 240,
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 10,
            padding: 24,
        }}
        tabIndex={0}
        role="button"
        onClick={handleViewClick}
    >
        <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
                <h2 className="text-[18px] leading-snug font-semibold text-gray-900 mb-1 truncate" title={title}>{title}</h2>
                <div className="flex items-center text-[13px] text-gray-600 gap-2 mb-3">
                    <span>{exam.subject?.name || "N/A"}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-400 inline-block" />
                    <span>{classCode || ""}</span>
                </div>
            </div>
            <div
                className="flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium select-none"
                style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
            >
                <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: statusColors.dot }}
                />
                <span>{displayStatusLabel}</span>
            </div>
        </div>

        <div className="flex flex-1 gap-4 overflow-hidden">
            <div className="flex-1 min-w-0">
                <p className="text-[13px] leading-snug text-gray-700 line-clamp-3 pr-2">
                    {description || instructions?.replace(/<[^>]+>/g, "") || ""}
                </p>
                <div className="absolute" />
            </div>
            <div
                className="shrink-0 flex flex-col justify-start text-[13px] rounded-xl"
                style={{
                    width: 170,
                    backgroundColor: "#F9FAFB",
                    border: "1px solid rgba(0,0,0,0.05)",
                    padding: "12px 14px",
                }}
            >
                <div className="text-gray-900 font-medium text-[13px] mb-2 leading-none">
                    {exam.schedule?.start ? new Date(exam.schedule.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    {" - "}
                    {exam.schedule?.end ? new Date(exam.schedule.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </div>
                <div className="flex items-center justify-between text-gray-700">
                    <span>{questions?.length || 0} questions</span>
                    <span className="font-semibold">/{totalPoints || 0}</span>
                </div>
            </div>
        </div>

        <div className="mt-4">
            <div className="w-full h-1.5 bg-[#ECF2FD] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, backgroundColor: "#2563eb", transition: "width .3s" }}
                />
            </div>
            <div className="flex items-center justify-between mt-3">
                <div className="flex space-x-2">
                    {(() => {
                        // Determine buttons based on role and URL
                        let list = [];
                        const isDetail = /^\/teacher\/exams\/[\w-]+$/.test(pathname);
                        if (userRole === 'teacher' && isDetail) {
                            if (status === 'scheduled') {
                                list = [
                                    { label: 'Activate', onClick: async (exam) => { await examService.activateExam(exam._id, currentUser.school); } },
                                    { label: 'Cancel', onClick: async (exam) => { await examService.deleteExam(exam._id, currentUser.school); navigate('/teacher/exams'); } }
                                ];
                            } else if (status === 'active') {
                                list = [
                                    { label: 'Complete', onClick: async (exam) => { await examService.completeExam(exam._id, currentUser.school); } }
                                ];
                            }
                            // if completed or none match, list stays empty
                        } else if (userRole === 'student') {
                            list = [{ label: 'View', onClick: () => handleViewClick() }];
                        }
                        return list.map((btn, idx) => (
                            <Button
                                key={idx}
                                size={btn.size || 'sm'}
                                onClick={(e) => { e.stopPropagation(); btn.onClick(exam); }}
                                className={btn.className || '!bg-blue-600 hover:!bg-blue-700 !rounded-[10px] !px-5 !py-2 text-[13px] font-semibold'}
                            >
                                {btn.label}
                            </Button>
                        ));
                    })()}
                </div>
                <span className="text-[12px] text-gray-500">--:--</span>
            </div>
        </div>
    </div>
);
};

export default ExamCard;
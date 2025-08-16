import React, { useEffect, useState, useRef, useMemo } from "react";
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
        return { label: "Upcoming", color: "yellow" };
    } else if (start <= now && end >= now) {
        return { label: "In Progress", color: "green" };
    } else {
        return { label: "Past", color: "gray" };
    }
} else if (exam.status === "active") {
    return { label: "Active", color: "blue" };
} else if (exam.status === "completed") {
    return { label: "Completed", color: "green" };
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
    progress, // if provided externally, overrides auto progress
    teacher,
    type,
    instructions,
    schedule,
    onClickOverride,
    autoProgress = true, // allow disabling internal time-based progress
    tickIntervalMs = 1000, // customizable for tests
}) => {
    const { currentUser } = useAuth();
    const userRole = currentUser.role;
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [now, setNow] = useState(() => new Date());
    const intervalRef = useRef(null);

// Derive start & end using schedule (model stores start + duration only) memoized
const derivedStart = useMemo(() => schedule?.start || startTime, [schedule?.start, startTime]);
const derivedDurationMinutes = useMemo(() => {
    if (schedule?.duration) return schedule.duration;
    if (schedule?.end && derivedStart) {
        return Math.max(1, Math.round((new Date(schedule.end) - new Date(derivedStart)) / 60000));
    }
    return null;
}, [schedule?.duration, schedule?.end, derivedStart]);
const derivedEnd = useMemo(() => {
    if (schedule?.end) return schedule.end;
    if (endTime) return endTime;
    if (derivedStart && derivedDurationMinutes) {
        return new Date(new Date(derivedStart).getTime() + derivedDurationMinutes * 60000);
    }
    return null;
}, [schedule?.end, endTime, derivedStart, derivedDurationMinutes]);

const exam = {
    _id: examId,
    title,
    subject: typeof subject === "string" ? { name: subject } : subject,
    classCode,
    description,
    status,
    startTime: derivedStart,
    endTime: derivedEnd,
    questions,
    totalPoints,
    progress,
    teacher,
    type,
    instructions,
    schedule: schedule || {
        start: derivedStart,
        end: derivedEnd,
        duration: derivedDurationMinutes || schedule?.duration || "-",
    },
};

const statusInfo = getStatusInfo(exam);

// Live timer + auto progress
const [autoProgressPct, setAutoProgressPct] = useState(0);
const [countdownLabel, setCountdownLabel] = useState("--:--");

useEffect(() => {
    if (!autoProgress) return; // skip if disabled
    // Clear existing
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
        setNow(new Date());
    }, tickIntervalMs);
    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
}, [autoProgress, tickIntervalMs, derivedStart, derivedEnd, status]);

useEffect(() => {
    if (!autoProgress) return;
    const startDate = derivedStart ? new Date(derivedStart) : null;
    const endDate = derivedEnd ? new Date(derivedEnd) : (startDate && derivedDurationMinutes ? new Date(startDate.getTime() + derivedDurationMinutes * 60000) : null);
    if (!startDate) {
        setCountdownLabel("No schedule");
        setAutoProgressPct(0);
        return;
    }
    const nowTs = now.getTime();
    const startTs = startDate.getTime();
    const endTs = endDate ? endDate.getTime() : startTs; // fallback

    if (nowTs < startTs) {
        // Starts in
        const diff = startTs - nowTs;
        setCountdownLabel(`Starts in ${formatDuration(diff)}`);
        setAutoProgressPct(0);
    } else if (nowTs >= startTs && nowTs <= endTs) {
        const total = endTs - startTs;
        const elapsed = nowTs - startTs;
        const pct = total > 0 ? (elapsed / total) * 100 : 0;
        setAutoProgressPct(Math.min(100, Math.max(0, pct)));
        const remaining = endTs - nowTs;
        setCountdownLabel(`Time left ${formatDuration(remaining)}`);
    } else {
        setAutoProgressPct(100);
        setCountdownLabel("Completed");
    }
}, [now, autoProgress, derivedStart, derivedEnd, derivedDurationMinutes]);

// Format ms -> HH:MM:SS (omit hours if zero)
function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
}

// Decide which progress value to render
const progressToRender = progress !== undefined && progress !== null ? progress : autoProgressPct;

const handleViewClick = (e) => {
    e.stopPropagation();
    if (userRole === "teacher") {
        navigate(`/teacher/exams/${examId}`);
    } else if (userRole === "dean") {
        navigate(`/dean/exams/${examId}`);
    } else {
        // Use existing plural route defined in App.jsx
        navigate(`/student/exams/${examId}`);
    }
};

// Map Upcoming label to Pending to match UI wording
const displayStatusLabel = statusInfo.label === "Upcoming" ? "Pending" : statusInfo.label;

// Tinted background for status using existing status color
const statusColorMap = {
    // Completed -> main-green palette
    green: { bg: "rgba(1,102,48,0.10)", dot: "#016630", text: "#016630" },
    // Active -> main-blue palette
    blue: { bg: "rgba(21,93,252,0.10)", dot: "#155DFC", text: "#155DFC" },
    yellow: {},
    gray: { bg: "rgba(107,114,128,0.10)", dot: "#6b7280", text: "#374151" },
};
const statusColors = statusColorMap[statusInfo.color] || statusColorMap.gray;

// Gold color specified for Pending (ECBE3F)
if (displayStatusLabel === "scheduled") {
    statusColors.bg = "#ECBE3F1A"; // /10
    statusColors.dot = "#ECBE3F";
    statusColors.text = "#B38700";
}

return (
    <div
        className="bg-white flex flex-col cursor-pointer transition container"
        style={{
            width: 420,
            height: 240,
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 10,
            padding: 24,
        }}
        tabIndex={0}
        role="button"
    onClick={onClickOverride ? (e)=>{ e.stopPropagation(); onClickOverride(exam);} : handleViewClick}
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
                className="flex items-center gap-2 px-4 py-0.5 rounded-full text-[12px] font-medium select-none"
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
            <div
                className="relative w-full h-[5px] border border-main-blue rounded-full select-none"
                aria-label="exam progress bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(100, Math.max(0, progressToRender)))}
            >
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-[4px] rounded-full"
                    style={{
                        width: `${Math.min(100, Math.max(0, progressToRender))}%`,
                        background: '#155DFC',
                        transition: 'width .5s linear',
                    }}
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
                <span className="text-[12px] text-gray-500" aria-live="polite">{countdownLabel}</span>
            </div>
        </div>
    </div>
);
};

export default ExamCard;
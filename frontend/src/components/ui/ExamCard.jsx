import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

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
}) => {
    const user = useAuth()
    const userRole = user.currentUser.role
    
    const navigate = useNavigate();

    const getStatusColor = () => {
        switch (status) {
            case "active":
                return { bg: "#e6f0ff", text: "#0066ff" };
            case "completed":
                return { bg: "#e6ffe6", text: "#00cc00" };
            case "upcoming":
            default:
                return { bg: "#fff4e6", text: "#ff9933" };
        }
    };

    const handleViewClick = () => {
        console.log('ExamCard: handleViewClick called');
        console.log('ExamCard: userRole:', userRole);
        console.log('ExamCard: examId:', examId);
        
        if (userRole === 'teacher') {
            // Navigate to teacher exam view with tabs for exam details and submissions
            console.log('ExamCard: Navigating to teacher route:', `/teacher/exams/${examId}`);
            navigate(`/teacher/exams/${examId}`);
        } else if (userRole === 'dean') {
            // Navigate to dean exam view
            console.log('ExamCard: Navigating to dean route:', `/dean/exams/${examId}`);
            navigate(`/dean/exams/${examId}`);
        } else {
            // Navigate to student exam view
            console.log('ExamCard: Navigating to student route:', `/student/exams/${examId}`);
            navigate(`/student/exams/${examId}`);
        }
    };

    const statusColor = getStatusColor();

    return (
        <div
            style={{
                background: "white",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.05)",
                display: "flex",
                flexDirection: "column",
                minWidth: "440px",
                maxWidth: "440px",
                maxHeight: "240px",
                width: "100%",
                border: "1px solid rgba(0, 0, 0, 0.1)",
            }}
        >
            <div>
                <div className="flex justify-between items-center">
                    <h2
                        style={{
                            fontSize: "16px",
                            color: "#333",
                            margin: 0,
                            marginBottom: "5px",
                            fontWeight: 600,
                        }}
                    >
                        {title}
                    </h2>
                    <div
                        style={{
                            backgroundColor: statusColor.bg,
                            color: statusColor.text,
                            padding: "4px 15px",
                            borderRadius: "20px",
                            display: "inline-flex",
                            alignItems: "center",
                            fontWeight: 500,
                            fontSize: "14px",
                        }}
                    >
                        <span
                            style={{
                                display: "inline-block",
                                width: "4px",
                                height: "4px",
                                backgroundColor: "currentColor",
                                borderRadius: "50%",
                                marginRight: "8px",
                            }}
                        ></span>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        color: "#666",
                        gap: "8px",
                        fontSize: "14px",
                    }}
                >
                    {subject}{" "}
                    <span
                        style={{
                            fontSize: "20px",
                            lineHeight: 0,
                            height: "2px",
                        }}
                    >
                        •
                    </span>{" "}
                    {classCode}
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: '6px'
                }}
            >
                <p
                    style={{
                        color: "#666",
                        fontSize: "14px",
                        margin: 0,
                        fontWeight: 500,
                        width: "50%",
                    }}
                >
                    {description || `An exam on ${title.toLowerCase()}`}
                </p>
                <div style={{ display: "flex", alignItems: "center" }}></div>
                <div
                    style={{
                        border: "1px solid #e0e0e0",
                        borderRadius: "10px",
                        padding: "20px",
                    }}
                >
                    <div style={{ fontSize: "14px", marginBottom: "10px" }}>
                        {startTime} - {endTime}
                    </div>
                    <div
                        style={{
                            fontSize: "14px",
                            display: "flex",
                            justifyContent: "space-between",
                        }}
                    >
                        <span>{questions} questions </span>
                        <span> /{totalPoints}</span>
                    </div>
                </div>
            </div>

            <div
                style={{
                    width: "100%",
                    height: "6px",
                    backgroundColor: "#e0e0e0",
                    borderRadius: "3px",

                }}
            >
                <div
                    style={{
                        height: "100%",
                        width: `${progress}%`,
                        backgroundColor: "#0066ff",
                        borderRadius: "3px",
                    }}
                ></div>
            </div>

            <button
                onClick={handleViewClick}
                style={{
                    backgroundColor: "#0066ff",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "4px 24px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    alignSelf: "flex-start",
                    marginTop: "10px",
                    maxHeight: "30px",
                }}
            >
                View
            </button>
        </div>
    );
};

export default ExamCard;

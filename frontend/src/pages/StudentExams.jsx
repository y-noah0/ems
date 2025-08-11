/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/layout/Layout";
import examService from "../services/examService";
import { useAuth } from "../context/AuthContext";
import {
  FaFilter,
  FaFileAlt,
  FaCalendarAlt,
  FaPlay,
  FaCheckCircle,
  FaClipboardList,
} from "react-icons/fa";

const StudentExams = () => {
  const { currentUser } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchExams = async () => {
    setLoading(true);
    setError("");
    try {
      if (!currentUser?.school) {
        throw new Error(
          "School ID not found. Please ensure you are logged in correctly."
        );
      }
      const schoolId = currentUser.school;
      const examsData = await examService.getStudentClassExams(schoolId);
      if (!Array.isArray(examsData)) {
        throw new Error("Invalid response: exams is not an array");
      }
      const updatedExams = examsData.map((exam) => {
        if (exam?.schedule?.start && exam?.schedule?.duration) {
          const start = new Date(exam.schedule.start);
          const end = new Date(
            start.getTime() + exam.schedule.duration * 60 * 1000
          );
          return { ...exam, schedule: { ...exam.schedule, end } };
        }
        return exam;
      });
      // Filter for scheduled or active exams only
      const filteredExams = updatedExams.filter((exam) => {
        const now = new Date();
        const start = new Date(exam.schedule?.start);
        const end = new Date(exam.schedule?.end);
        return (
          exam.status === "scheduled" ||
          (exam.status === "active" && start <= now && end >= now)
        );
      });
      setExams(filteredExams);
    } catch (error) {
      setError(error.message || "Failed to load exams. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchExams();
    } else {
      setLoading(false);
      setError("User not authenticated. Please log in.");
    }
  }, [currentUser]);

  const filteredExams = () => {
    const now = new Date();
    switch (filter) {
      case "upcoming":
        return exams.filter((exam) => {
          const start = new Date(exam.schedule?.start);
          return exam.status === "scheduled" && start > now;
        });
      case "current":
        return exams.filter((exam) => {
          const start = new Date(exam.schedule?.start);
          const end = new Date(exam.schedule?.end);
          return exam.status === "active" && start <= now && end >= now;
        });
      default:
        return exams; // Only scheduled or active exams are already in the exams state
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "scheduled":
        return { label: "Scheduled", color: "blue" };
      case "active":
        return { label: "Active", color: "green" };
      default:
        return { label: "Unknown", color: "gray" };
    }
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-8 px-4 md:px-8 lg:px-12 py-6">
        {/* Left Column - Exam Cards */}
        <div className="flex-1 space-y-8">
          {/* Header with Icon */}
          <div className="flex items-center gap-4 mb-6 select-none">
            <FaClipboardList className="text-4xl text-blue-600 animate-pulse" />
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide">
              Class Exams
            </h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-14 w-14 border-4 border-b-4 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-300 text-red-700 px-6 py-4 rounded-lg font-medium shadow-sm">
              {error}
            </div>
          ) : filteredExams().length === 0 ? (
            <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500 font-semibold tracking-wide">
              No scheduled or active exams found.
            </div>
          ) : (
            filteredExams().map((exam, i) => {
              const statusInfo = getStatusInfo(exam.status);
              return (
                <div
                  key={exam._id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300 p-7 flex flex-col animate-fadeScale cursor-pointer"
                  style={{ animationFillMode: "forwards", animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3 tracking-tight">
                      <FaFileAlt className="text-blue-500 text-xl" />
                      {exam.title || "Untitled Exam"}
                    </h2>
                    <span
                      className={`inline-block px-4 py-1 rounded-full text-sm font-semibold bg-${statusInfo.color}-100 text-${statusInfo.color}-900 select-none`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Subject */}
                  <p className="text-lg text-gray-700 mb-1 font-semibold tracking-wide">
                    {exam.subject?.name || "No subject"}
                  </p>

                  {/* Teacher Info */}
                  {exam.teacher && (
                    <div className="text-sm text-gray-500 mb-4 flex flex-col space-y-0.5">
                      <span className="font-semibold text-gray-600">Teacher Info:</span>
                      <span>
                        <strong>Name:</strong> {exam.teacher.fullName || "N/A"}
                      </span>
                      <span>
                        <strong>Email:</strong> {exam.teacher.email || "N/A"}
                      </span>
                      <span>
                        <strong>Phone:</strong> {exam.teacher.phoneNumber || "N/A"}
                      </span>
                    </div>
                  )}

                  {/* Instructions */}
                  {exam.instructions && (
                    <div className="mb-6">
                      <p className="font-semibold text-gray-600 mb-1">Instructions:</p>
                      <p className="text-sm text-gray-500 italic leading-relaxed line-clamp-3">
                        {exam.instructions}
                      </p>
                    </div>
                  )}

                  {/* Schedule */}
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 mb-8 grid grid-cols-3 gap-6 font-medium">
                    <div>
                      <p className="font-semibold text-gray-600 mb-1">Start:</p>
                      <div className="flex items-center gap-3">
                        <FaCalendarAlt className="text-gray-400 text-lg" />
                        <span>{formatDate(exam.schedule?.start)}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-600 mb-1">End:</p>
                      <div className="flex items-center gap-3">
                        <FaCalendarAlt className="text-gray-400 text-lg" />
                        <span>{formatDate(exam.schedule?.end)}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-600 mb-1">Questions:</p>
                      <div className="flex items-center gap-3">
                        <FaFileAlt className="text-gray-400 text-lg" />
                        <span>{exam.questions?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex justify-end">
                    <Link
                      to={`/student/exams/${exam._id}`}
                      className="inline-block px-7 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-md hover:bg-blue-700 transition duration-300 ease-in-out select-none"
                    >
                      View Exam
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column - Filters */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow p-5 space-y-3 sticky top-5">
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-3 text-blue-600 tracking-wide select-none">
              <FaFilter className="text-2xl" /> Filters
            </h3>
            {[
              { key: "all", label: "All", icon: <FaFilter /> },
              { key: "upcoming", label: "Scheduled", icon: <FaCalendarAlt /> },
              { key: "current", label: "Active", icon: <FaPlay /> },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left text-lg font-medium transition ${filter === f.key
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Animation CSS */}
      <style>
        {`
          @keyframes fadeScale {
            0% { opacity: 0; transform: translateY(20px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-fadeScale {
            animation: fadeScale 0.35s ease forwards;
          }
        `}
      </style>
    </Layout>
  );
};

export default StudentExams;
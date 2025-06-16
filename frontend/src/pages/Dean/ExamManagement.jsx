import React, { useEffect, useState } from "react";
import Layout from "../../components/layout/Layout";
import ExamCard from "../../components/ui/ExamCard";
import examDataJson from "./examData.json";

export default function ExamManagement() {
    const [examData, setExamData] = useState(null);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line no-unused-vars
    const [error, setError] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState("All");

    const getUniqueSubjects = (data) => {
        if (!data || !data.exams) return [];
        const subjects = data.exams.map((exam) => exam.subject);
        return ["All", ...new Set(subjects)];
    };

    const getFilteredExams = () => {
        if (!examData || !examData.exams) return [];

        if (selectedSubject === "All") {
            return examData.exams;
        }

        return examData.exams.filter(
            (exam) => exam.subject === selectedSubject
        );
    };

    const handleSubjectChange = (e) => {
        setSelectedSubject(e.target.value);
    };

    useEffect(() => {
        setExamData(examDataJson);
        setLoading(false);
    }, []);

    return (
        <Layout>
            <div className="flex justify-between h-[30px]">
                <h1 className="font-bold text-xl h-full">Exam Management</h1>
                <div className="flex gap-4">
                    <select
                    name="Class"
                    id=""
                    className="border border-gray-300 rounded-xl px-1 h-full"
                >
                    <option value="L4sod">
                        L4sod
                    </option>
                </select>
                <select
                    name="Subject"
                    id="subjectSelect"
                    className="border border-gray-300 rounded-xl px-1 h-full"
                    onChange={handleSubjectChange}
                    value={selectedSubject}
                >
                    {examData &&
                        getUniqueSubjects(examData).map((subject) => (
                            <option
                                key={subject}
                                value={subject}
                                className="text-md h-full"
                            >
                                {subject}
                            </option>
                        ))}
                </select>
                </div>
            </div>
            <div className="flex mt-10">
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "20px",
                        width: "90%",
                    }}
                >
                    {loading ? (
                        <p>Loading exam data...</p>
                    ) : error ? (
                        <p>Error: {error}</p>
                    ) : examData && examData.exams ? (
                        getFilteredExams().length > 0 ? (
                            getFilteredExams().map((exam) => (
                                <div>
                                    <ExamCard
                                        key={exam.id}
                                        title={exam.title}
                                        subject={exam.subject}
                                        classCode={exam.classCode}
                                        description={exam.description}
                                        status={exam.status}
                                        startTime={exam.startTime || "TBD"}
                                        endTime={exam.endTime || "TBD"}
                                        questions={exam.questions.length}
                                        totalPoints={exam.totalPoints}
                                        progress={
                                            exam.status === "active"
                                                ? 75
                                                : exam.status === "completed"
                                                ? 100
                                                : 0
                                        }
                                    />
                                </div>
                            ))
                        ) : (
                            <p>No exams found for {selectedSubject}</p>
                        )
                    ) : (
                        <p>No exam data found</p>
                    )}
                </div>
                <div className="w-fit flex flex-col gap-4">
                    <button className="bg-blue-600/10 py-1 px-6 w-full text-blue-600 font-medium rounded-lg">
                        Active
                    </button>
                    <button className="bg-green-600/10 py-1 px-6 w-fit text-green-600 font-medium rounded-lg">
                        Completed
                    </button>
                    <button className="bg-yellow-600/10 py-1 px-6 w-full text-yellow-600 font-medium rounded-lg">
                        Pending
                    </button>
                    <button className="bg-gray-600/10 py-1 px-6 w-full text-gray-600 font-medium rounded-lg">
                        Draft
                    </button>
                </div>
            </div>
        </Layout>
    );
}

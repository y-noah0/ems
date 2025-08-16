import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import Button from "../components/ui/Button";
import ExamCard from "../components/ui/ExamCard";
import examService from "../services/examService";
import { FaChevronLeft, FaSpinner } from "react-icons/fa";
import submissionService from "../services/submissionService";
import DynamicTable from "../components/class/DynamicTable";

const ExamView = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("exam"); // 'exam' | 'submissions' | 'submission'
    const [submissions, setSubmissions] = useState([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [submissionsError, setSubmissionsError] = useState(null);
    const [submissionFilter, setSubmissionFilter] = useState("all"); // all | completed | auto | pending | graded
    const [selectedSubmission, setSelectedSubmission] = useState(null); // full detail
    const [submissionDetailLoading, setSubmissionDetailLoading] =
        useState(false);
    const [submissionDetailError, setSubmissionDetailError] = useState(null);
    // Grading state (for open-ended questions only)
    const [gradeMode, setGradeMode] = useState(false);
    const [regradeMode, setRegradeMode] = useState(false);
    const [gradeScores, setGradeScores] = useState({}); // questionId => score
    const [gradeSaving, setGradeSaving] = useState(false);
    const [gradeError, setGradeError] = useState(null);
    const [gradeSuccess, setGradeSuccess] = useState(false);
    const [gradeFeedback, setGradeFeedback] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser?.school) {
                setError("No school associated with your account.");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const examData = await examService.getExamById(
                    examId,
                    currentUser.school
                );
                setExam(examData);
            } catch (err) {
                setError(err.message || "Failed to load exam.");
                toast.error(err.message || "Failed to load exam.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [examId, currentUser]);

    // Fetch submissions only when submissions tab activated
    useEffect(() => {
        const fetchSubs = async () => {
            if (activeTab !== "submissions") return;
            if (!currentUser?.school) return;
            if (submissions.length > 0 || submissionsLoading) return;
            try {
                setSubmissionsLoading(true);
                const subs = await examService.getExamSubmissions(
                    examId,
                    currentUser.school
                );
                setSubmissions(Array.isArray(subs) ? subs : []);
            } catch (err) {
                setSubmissionsError(
                    err.message || "Failed to load submissions"
                );
                toast.error(err.message || "Failed to load submissions");
            } finally {
                setSubmissionsLoading(false);
            }
        };
        fetchSubs();
    }, [
        activeTab,
        examId,
        currentUser,
        submissions.length,
        submissionsLoading,
    ]);

    // Placeholder actions (activate/complete) could be re-added if needed in this compact view

    const totalPoints = useMemo(() => {
        return Array.isArray(exam?.questions)
            ? exam.questions.reduce(
                  (sum, q) => sum + (parseInt(q.maxScore) || 0),
                  0
              )
            : 0;
    }, [exam]);

    const timeProgress = useMemo(() => {
        if (!exam?.schedule?.start || !exam?.schedule?.end) return 0;
        const start = new Date(exam.schedule.start).getTime();
        const end = new Date(exam.schedule.end).getTime();
        const now = Date.now();
        if (now <= start) return 0;
        if (now >= end) return 100;
        return Math.min(
            100,
            Math.max(0, ((now - start) / (end - start)) * 100)
        );
    }, [exam]);

    // Animation variants removed (simplified static layout)

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center py-32">
                    <FaSpinner className="h-12 w-12 text-blue-600 animate-spin" />
                </div>
            </Layout>
        );
    }

    if (error || !exam) {
        return (
            <Layout>
                <div className="p-10 text-center text-sm text-red-600">
                    {error || "Exam not found"}
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="m-0 py-4 bg-white">
                {/* Tabs */}
                <div className="flex justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            size="sm"
                            variant={
                                activeTab === "exam" ? "primary" : "outline"
                            }
                            onClick={() => setActiveTab("exam")}
                            aria-pressed={activeTab === "exam"}
                        >
                            Exam
                        </Button>
                        <Button
                            size="sm"
                            variant={
                                activeTab === "submissions"
                                    ? "primary"
                                    : "outline"
                            }
                            onClick={() => setActiveTab("submissions")}
                            aria-pressed={activeTab === "submissions"}
                        >
                            Submissions
                        </Button>
                        {activeTab === "submission" && (
                            <Button size="sm" variant="primary" aria-pressed>
                                Submission
                            </Button>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex gap-2"
                        onClick={() => navigate(-1)}
                    >
                        <FaChevronLeft />
                        Back
                    </Button>
                </div>
                {(activeTab === "exam" || activeTab === "submissions") && (
                    <div className="flex flex-col lg:flex-row gap-8 my-5">
                        {/* Left panel: questions or submissions */}
                        <div className="w-full lg:w-[550px] shrink-0  rounded-xl border border-black/10 p-6 min-h-[520px] overflow-y-auto">
                            {activeTab === "exam" ? (
                                exam.questions?.length ? (
                                    <ol className="space-y-8 list-decimal list-inside">
                                        {exam.questions.map((q, idx) => (
                                            <li
                                                key={q._id || idx}
                                                className="text-sm leading-relaxed text-gray-800"
                                            >
                                                <div className="mb-3 font-medium">
                                                    {q.text || "Question text"}
                                                </div>
                                                {Array.isArray(q.options) &&
                                                    q.options.length > 0 && (
                                                        <div className="border border-black/10 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {q.options
                                                                .slice(0, 4)
                                                                .map(
                                                                    (
                                                                        opt,
                                                                        oIdx
                                                                    ) => (
                                                                        <label
                                                                            key={
                                                                                oIdx
                                                                            }
                                                                            className="flex items-center gap-2 text-gray-700 text-sm"
                                                                        >
                                                                            <span className="inline-block w-3 h-3 rounded-full border border-gray-400" />
                                                                            <span className="truncate">
                                                                                {opt.text ||
                                                                                    "Option"}
                                                                            </span>
                                                                        </label>
                                                                    )
                                                                )}
                                                        </div>
                                                    )}
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <div className="text-sm text-gray-500">
                                        No questions added.
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm font-medium text-gray-700">
                                            Submitted:{" "}
                                            {
                                                submissions.filter(
                                                    (s) =>
                                                        (
                                                            s.status ||
                                                            "pending"
                                                        ).toLowerCase() !==
                                                        "pending"
                                                ).length
                                            }
                                            /
                                            {submissions.length ||
                                                submissions.length}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-gray-500">
                                                Filter:
                                            </label>
                                            <select
                                                value={submissionFilter}
                                                onChange={(e) =>
                                                    setSubmissionFilter(
                                                        e.target.value
                                                    )
                                                }
                                                className="border border-gray-300 rounded-md text-xs px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="all">All</option>
                                                <option value="graded">
                                                    Graded
                                                </option>
                                                <option value="completed">
                                                    Completed
                                                </option>
                                                <option value="auto">
                                                    Auto submit
                                                </option>
                                                <option value="pending">
                                                    Pending
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                    {submissionsLoading && (
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <FaSpinner className="h-4 w-4 animate-spin" />{" "}
                                            Loading submissions...
                                        </div>
                                    )}
                                    {submissionsError && (
                                        <div className="text-sm text-red-600">
                                            {submissionsError}
                                        </div>
                                    )}
                                    {!submissionsLoading &&
                                        !submissionsError &&
                                        submissions.length === 0 && (
                                            <div className="text-sm text-gray-500">
                                                No submissions yet.
                                            </div>
                                        )}
                                    {!submissionsLoading &&
                                        submissions.length > 0 && (
                                            <DynamicTable
                                                data={submissions.filter(
                                                    (s) => {
                                                        if (
                                                            submissionFilter ===
                                                            "all"
                                                        )
                                                            return true;
                                                        const status = (
                                                            s.status ||
                                                            "pending"
                                                        ).toLowerCase();
                                                        if (
                                                            submissionFilter ===
                                                            "auto"
                                                        )
                                                            return status.includes(
                                                                "auto"
                                                            );
                                                        if (
                                                            submissionFilter ===
                                                            "graded"
                                                        )
                                                            return (
                                                                status ===
                                                                "graded"
                                                            );
                                                        return (
                                                            status ===
                                                            submissionFilter
                                                        ); // completed | pending
                                                    }
                                                )}
                                                onRowClick={async (row) => {
                                                    const id =
                                                        row._id || row.id;
                                                    if (
                                                        !id ||
                                                        !currentUser?.school
                                                    )
                                                        return;
                                                    setSubmissionDetailError(
                                                        null
                                                    );
                                                    setSubmissionDetailLoading(
                                                        true
                                                    );
                                                    setGradeMode(false);
                                                    setGradeScores({});
                                                    setGradeError(null);
                                                    try {
                                                        const detail =
                                                            await examService.getSubmissionById(
                                                                id,
                                                                currentUser.school
                                                            );
                                                        setSelectedSubmission(
                                                            detail
                                                        );
                                                        setActiveTab(
                                                            "submission"
                                                        );
                                                    } catch (e) {
                                                        setSubmissionDetailError(
                                                            e.message ||
                                                                "Failed to load submission"
                                                        );
                                                    } finally {
                                                        setSubmissionDetailLoading(
                                                            false
                                                        );
                                                    }
                                                }}
                                                columns={[
                                                    {
                                                        key: "student",
                                                        title: "Student",
                                                        width: "40%",
                                                        render: (val, row) => {
                                                            const dateTxt =
                                                                row.submittedAt
                                                                    ? new Date(
                                                                          row.submittedAt
                                                                      )
                                                                    : null;
                                                            return (
                                                                <div className="flex flex-col">
                                                                    <span className="text-gray-800 font-medium">
                                                                        {row
                                                                            .student
                                                                            ?.name ||
                                                                            row
                                                                                .student
                                                                                ?.fullName ||
                                                                            "Unknown"}
                                                                    </span>
                                                                    <span className="text-[11px] text-gray-500">
                                                                        Submitted:{" "}
                                                                        {dateTxt
                                                                            ? `${dateTxt.toLocaleDateString(
                                                                                  undefined,
                                                                                  {
                                                                                      day: "2-digit",
                                                                                      month: "2-digit",
                                                                                      year: "numeric",
                                                                                  }
                                                                              )}  ${dateTxt.toLocaleTimeString(
                                                                                  [],
                                                                                  {
                                                                                      hour: "2-digit",
                                                                                      minute: "2-digit",
                                                                                  }
                                                                              )}`
                                                                            : "--/--/----  --:--"}
                                                                    </span>
                                                                </div>
                                                            );
                                                        },
                                                    },
                                                    {
                                                        key: "score",
                                                        title: "Score",
                                                        width: "15%",
                                                        render: (val, row) => (
                                                            <span className="text-gray-700">
                                                                {row.totalScore ??
                                                                    row.score ??
                                                                    "--"}{" "}
                                                                / {totalPoints}
                                                            </span>
                                                        ),
                                                    },
                                                    {
                                                        key: "violations",
                                                        title: "Violations",
                                                        width: "15%",
                                                        render: (val, row) => {
                                                            const count =
                                                                row.violations ??
                                                                (Array.isArray(
                                                                    row.violationLogs
                                                                )
                                                                    ? row
                                                                          .violationLogs
                                                                          .length
                                                                    : 0);
                                                            const color =
                                                                count > 0
                                                                    ? "bg-red-100 text-red-600"
                                                                    : "bg-gray-100 text-gray-500";
                                                            return (
                                                                <span
                                                                    className={`px-2 py-1 rounded-full text-[11px] font-medium ${color}`}
                                                                >
                                                                    {count}
                                                                </span>
                                                            );
                                                        },
                                                    },
                                                    {
                                                        key: "status",
                                                        title: "Status",
                                                        width: "30%",
                                                        render: (val, row) => {
                                                            const raw = (
                                                                row.status ||
                                                                "pending"
                                                            ).toLowerCase();
                                                            const label =
                                                                raw === "graded"
                                                                    ? "Graded"
                                                                    : raw.includes(
                                                                          "auto"
                                                                      )
                                                                    ? "Auto submit"
                                                                    : raw ===
                                                                      "completed"
                                                                    ? "Completed"
                                                                    : "Pending";
                                                            const styles =
                                                                label ===
                                                                    "Completed" ||
                                                                label ===
                                                                    "Graded"
                                                                    ? "bg-green-100 text-green-700"
                                                                    : label ===
                                                                      "Auto submit"
                                                                    ? "bg-pink-100 text-pink-700"
                                                                    : "bg-yellow-100 text-yellow-700";
                                                            const dotColor =
                                                                label ===
                                                                    "Completed" ||
                                                                label ===
                                                                    "Graded"
                                                                    ? "bg-green-500"
                                                                    : label ===
                                                                      "Auto submit"
                                                                    ? "bg-pink-500"
                                                                    : "bg-yellow-500";
                                                            return (
                                                                <span
                                                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium ${styles}`}
                                                                >
                                                                    <span
                                                                        className={`w-2 h-2 rounded-full ${dotColor}`}
                                                                    ></span>
                                                                    {label}
                                                                </span>
                                                            );
                                                        },
                                                    },
                                                ]}
                                                showActions={false}
                                                containerHeight="100%"
                                                itemsPerPage={8}
                                            />
                                        )}
                                </div>
                            )}
                        </div>
                        {/* Right: Exam summary / placeholder */}
                        <div className="w-full lg:w-[460px]">
                            {activeTab === "exam" && (
                                <div className="relative">
                                    <ExamCard
                                        examId={exam._id}
                                        title={exam.title}
                                        subject={exam.subject}
                                        classCode={
                                            exam.classes?.[0]?.className || ""
                                        }
                                        description={
                                            exam.description ||
                                            exam.instructions
                                        }
                                        status={exam.status}
                                        startTime={exam.schedule?.start}
                                        endTime={exam.schedule?.end}
                                        questions={exam.questions}
                                        totalPoints={totalPoints}
                                        progress={timeProgress}
                                        teacher={exam.teacher}
                                        type={exam.type}
                                        instructions={exam.instructions}
                                        schedule={exam.schedule}
                                    />
                                    
                                </div>
                            )}
                            {activeTab === "submissions" && (
                                <div className="rounded-xl border border-black/10 p-6 text-xs text-gray-500">
                                    Select a submission to view details.
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === "submission" && selectedSubmission && (
                    <div className="flex flex-col lg:flex-row gap-8 my-5">
                        <div className="flex-1 shrink-0  rounded-lg border border-black/10 px-6 py-8 min-h-[520px] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-800">
                                    Submission
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-3">
                                        {gradeSuccess && (
                                            <span className="text-[11px] text-green-600">
                                                Saved
                                            </span>
                                        )}
                                        {gradeError && (
                                            <span className="text-[11px] text-red-600">
                                                {gradeError}
                                            </span>
                                        )}
                                                                                {gradeMode || regradeMode ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                                                                        disabled={gradeSaving}
                                                    onClick={() => {
                                                                                                                setGradeMode(false);
                                                                                                                setRegradeMode(false);
                                                        setGradeScores({});
                                                        setGradeError(null);
                                                        setGradeFeedback("");
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={gradeSaving}
                                                    onClick={async () => {
                                                        if (
                                                            !currentUser?.school ||
                                                            !selectedSubmission?._id
                                                        )
                                                            return;
                                                        setGradeSaving(true);
                                                        setGradeError(null);
                                                        setGradeSuccess(
                                                            false
                                                        );
                                                        try {
                                                            // Build grades payload: only open-ended questions
                                                            const grades = Object.entries(gradeScores).map(([questionId, score]) => ({
                                                                questionId,
                                                                score: parseFloat(score) || 0
                                                            }));
                                                            if (grades.length === 0) {
                                                                                                                                setGradeMode(false);
                                                                                                                                setRegradeMode(false);
                                                                return;
                                                            }
                                                                                                                        if (gradeMode) {
                                                                                                                            await submissionService.gradeOpenQuestions(
                                                                                                                                selectedSubmission._id,
                                                                                                                                grades,
                                                                                                                                currentUser.school,
                                                                                                                                gradeFeedback
                                                                                                                            );
                                                                                                                            toast.success('Graded successfully');
                                                                                                                        } else if (regradeMode) {
                                                                                                                            await examService.regradeSubmission(
                                                                                                                                selectedSubmission._id,
                                                                                                                                grades,
                                                                                                                                currentUser.school
                                                                                                                            );
                                                                                                                            toast.success('Regraded successfully');
                                                                                                                        }
                                                            setGradeSuccess(true);
                                                                                                                        setGradeMode(false);
                                                                                                                        setRegradeMode(false);
                                                            setGradeScores({});
                                                            // Refresh submission detail
                                                            try {
                                                                const detail = await examService.getSubmissionById(selectedSubmission._id, currentUser.school);
                                                                setSelectedSubmission(detail);
                                                            } catch {
                                                                // ignore refresh error
                                                            }
                                                        } catch (e) {
                                                            setGradeError(
                                                                e.message ||
                                                                    "Save failed"
                                                            );
                                                        } finally {
                                                            setGradeSaving(
                                                                false
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {gradeSaving
                                                                                                                ? "Saving..."
                                                                                                                : (gradeMode ? "Save grade" : "Update grades")}
                                                </Button>
                                            </>
                                        ) : (
                                            (() => {
                                                const hasOpen = exam?.questions?.some(q => ['short-answer','essay'].includes(q.type));
                                                const alreadyGraded = selectedSubmission?.status === 'graded';
                                                                                                if (hasOpen && !alreadyGraded) {
                                                                                                    return (
                                                                                                        <Button
                                                                                                            size="sm"
                                                                                                            variant="outline"
                                                                                                            onClick={() => {
                                                                                                                setGradeMode(true);
                                                                                                                setGradeSuccess(false);
                                                                                                            }}
                                                                                                        >Grade</Button>
                                                                                                    );
                                                                                                }
                                                                        if (hasOpen && alreadyGraded) {
                                                                                                    return (
                                                                                                        <Button
                                                                                                            size="sm"
                                                                                                            variant="outline"
                                                                                                            onClick={() => {
                                                                                                                // preload existing scores for regrade
                                                                                                                const preload = {};
                                                                                                                selectedSubmission.answers.forEach(ans => {
                                                                                                                    const q = exam.questions.find(q => (q._id || q.id) === (ans.questionId || ans.question?._id));
                                                                                                                    if (q && ['short-answer','essay'].includes(q.type)) {
                                                                                                                        preload[q._id] = ans.score || 0;
                                                                                                                    }
                                                                                                                });
                                                                                                                setGradeScores(preload);
                                                                            setGradeFeedback(selectedSubmission.feedback || '');
                                                                                                                setRegradeMode(true);
                                                                                                                setGradeSuccess(false);
                                                                                                            }}
                                                                                                        >Regrade</Button>
                                                                                                    );
                                                                                                }
                                                                                                return null;
                                            })()
                                        )}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setActiveTab("submissions");
                                            setSelectedSubmission(null);
                                        }}
                                    >
                                        Back
                                    </Button>
                                </div>
                            </div>
                            {submissionDetailLoading && (
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <FaSpinner className="h-4 w-4 animate-spin" />{" "}
                                    Loading submission...
                                </div>
                            )}
                            {submissionDetailError && (
                                <div className="text-sm text-red-600">
                                    {submissionDetailError}
                                </div>
                            )}
                            {!submissionDetailLoading && !submissionDetailError && selectedSubmission.answers && selectedSubmission.answers.length > 0 && (
                                <ol className="space-y-3 list-decimal list-inside">
                                    {selectedSubmission.answers.map((ans, idx) => {
                                        const answerId = ans._id || ans.id || String(idx);
                                        const question = exam?.questions?.find(q => (q._id || q.id) === (ans.questionId || ans.question?._id)) || {};
                                        const maxScore = parseInt(question.maxScore || ans.maxScore || ans.points || ans.score || 0) || 0;
                                        const existingScore = ans.score ?? ans.points ?? 0;
                                        const isObjective = ['multiple-choice','true-false'].includes(question.type);
                                        const bg = isObjective ? (existingScore === maxScore && maxScore>0 ? 'bg-main-green/10' : 'bg-main-red/10') : 'bg-gray-50';
                                        return (
                                            <li key={answerId} className={`p-4 rounded-lg border border-black/5 ${bg}`}>
                                                <div className="text-[13px] font-medium text-gray-800 mb-2">Q{idx + 1}. {question.text || ans.questionText || 'Question'}</div>
                                                {ans.answer && typeof ans.answer === 'string' && ans.answer.trim() !== '' && (
                                                    <div className="text-[12px] text-gray-700 mb-1 break-words">Answer: {ans.answer}</div>
                                                )}
                                                {Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0 && (
                                                    <div className="text-[12px] text-gray-700 mb-1">Selected: {ans.selectedOptions.join(', ')}</div>
                                                )}
                                                <div className="flex items-center gap-2 text-[11px] text-gray-600">
                                                    <span>
                                                        Points:{' '}
                                                        {(gradeMode || regradeMode) && !isObjective ? (
                                                            <input
                                                                type="number"
                                                                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                min={0}
                                                                max={maxScore || undefined}
                                                                step="0.5"
                                                                value={gradeScores[question._id] ?? existingScore}
                                                                onChange={(e) => setGradeScores(prev => ({ ...prev, [question._id]: e.target.value }))}
                                                            />
                                                        ) : (
                                                            <strong className="text-gray-800">{existingScore}</strong>
                                                        )} {' / '}{maxScore || '--'}
                                                    </span>
                                                    {question.correctAnswer && (
                                                        <span className="ml-2">Correct: {question.correctAnswer}</span>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                            {!submissionDetailLoading &&
                                !submissionDetailError &&
                                (!selectedSubmission.answers ||
                                    selectedSubmission.answers.length ===
                                        0) && (
                                    <p className="text-xs text-gray-500">
                                        No answers recorded.
                                    </p>
                                )}
                        </div>
                        <div className=" space-y-4">
                            <div className="rounded-xl border border-black/10 p-5">
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                                    Student
                                </h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                                    <div className="col-span-2">
                                        <span className="text-gray-500">
                                            Name:
                                        </span>{" "}
                                        <span className="font-medium text-gray-800">
                                            {selectedSubmission.student?.name ||
                                                selectedSubmission.student
                                                    ?.fullName ||
                                                "Unknown"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Status:
                                        </span>{" "}
                                        <span className="capitalize">
                                            {selectedSubmission.status}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Score:
                                        </span>{" "}
                                        {selectedSubmission.totalScore ??
                                            selectedSubmission.score ??
                                            "--"}{" "}
                                        / {totalPoints}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Violations:
                                        </span>{" "}
                                        {selectedSubmission.violations ??
                                            (selectedSubmission.violationLogs
                                                ?.length ||
                                                0)}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Started:
                                        </span>{" "}
                                        {selectedSubmission.startedAt
                                            ? new Date(
                                                  selectedSubmission.startedAt
                                              ).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                              })
                                            : "--"}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Submitted:
                                        </span>{" "}
                                        {selectedSubmission.submittedAt
                                            ? new Date(
                                                  selectedSubmission.submittedAt
                                              ).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                              })
                                            : "--"}
                                    </div>
                                    {selectedSubmission.gradedAt && (
                                        <div>
                                            <span className="text-gray-500">
                                                Graded:
                                            </span>{" "}
                                            {new Date(
                                                selectedSubmission.gradedAt
                                            ).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {Array.isArray(selectedSubmission.violationLogs) &&
                                selectedSubmission.violationLogs.length > 0 && (
                                    <div className="rounded-xl border border-red-200 p-5">
                                        <h4 className="text-sm font-semibold text-red-700 mb-3">
                                            Violations
                                        </h4>
                                        <ul className="space-y-2 max-h-48 overflow-y-auto pr-1 text-[12px]">
                                            {selectedSubmission.violationLogs.map(
                                                (v, i) => (
                                                    <li
                                                        key={v._id || i}
                                                        className="flex justify-between gap-4 p-2 bg-red-50 rounded"
                                                    >
                                                        <span className="text-red-700 truncate">
                                                            {v.type ||
                                                                "Violation"}
                                                        </span>
                                                        <span className="text-gray-500 ml-auto">
                                                            {v.time
                                                                ? new Date(
                                                                      v.time
                                                                  ).toLocaleTimeString(
                                                                      [],
                                                                      {
                                                                          hour: "2-digit",
                                                                          minute: "2-digit",
                                                                      }
                                                                  )
                                                                : ""}
                                                        </span>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                )}
                            {(gradeMode || regradeMode) && (
                                <div className="rounded-xl border border-black/10 p-5">
                                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Feedback (optional)</h4>
                                    <textarea
                                        className="w-full text-[12px] border border-gray-300 rounded-md p-2 h-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Enter overall feedback for the student"
                                        value={gradeFeedback}
                                        onChange={(e) => setGradeFeedback(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ExamView;

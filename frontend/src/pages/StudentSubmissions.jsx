import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import submissionService from '../services/submissionService';
import DynamicTable from '../components/class/DynamicTable';
import Button from '../components/ui/Button';
import { FaSpinner, FaChevronLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';
// Rich content rendering (math & code)
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import katex from 'katex';
import hljs from 'highlight.js';

const StudentSubmissions = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [activeView, setActiveView] = useState('list'); // list | detail
    const [selected, setSelected] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [reviewMode, setReviewMode] = useState(false);
    const [selectedQuestions, setSelectedQuestions] = useState({});
    const [sendingReview, setSendingReview] = useState(false);

    // Render math & code when a submission detail is shown or changes
    useEffect(() => {
        if (activeView !== 'detail' || !selected) return;
        try {
            const container = document.querySelectorAll('.answer-html');
            // Render formulas
            container.forEach(scope => {
                scope.querySelectorAll('.ql-formula').forEach(el => {
                    if (el.querySelector('.katex')) return; // already rendered
                    const tex = el.getAttribute('data-value') || el.textContent;
                    if (tex) {
                        try { katex.render(tex, el, { throwOnError: false, output: 'html' }); } catch {/* ignore */}
                    }
                });
                // Highlight code blocks
                scope.querySelectorAll('pre.ql-syntax').forEach(block => {
                    try { hljs.highlightElement(block); } catch {/* ignore */}
                });
            });
        } catch {/* swallow */ }
    }, [activeView, selected]);

    // Fetch submissions
    useEffect(() => {
        const load = async () => {
            if (!currentUser?.school) {
                setError('Missing school context');
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const subs = await submissionService.getStudentSubmissions(currentUser.school);
                setSubmissions(Array.isArray(subs) ? subs : []);
            } catch (e) {
                setError(e.message || 'Failed to load submissions');
                toast.error(e.message || 'Failed to load submissions');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser]);

    // Precompute total points per exam (if questions present)
    const totalPointsCache = useMemo(() => {
        const map = {};
        submissions.forEach(s => {
            const exam = s.exam || {};
            if (exam._id && Array.isArray(exam.questions)) {
                map[exam._id] = exam.questions.reduce((sum, q) => sum + (parseInt(q.maxScore) || 0), 0);
            } else if (exam._id && typeof exam.totalPoints === 'number') {
                map[exam._id] = exam.totalPoints;
            }
        });
        return map;
    }, [submissions]);

    const filteredSubmissions = useMemo(() => {
        if (filter === 'all') return submissions;
        return submissions.filter(s => (s.status || 'pending').toLowerCase().includes(filter));
    }, [submissions, filter]);

    const columns = [
        {
            key: 'exam',
            title: 'Exam',
            width: '35%',
            render: (val, row) => (
                <div className="flex flex-col">
                    <span className="text-gray-800 font-medium truncate">{row.exam?.title || 'Untitled Exam'}</span>
                    <span className="text-[11px] text-gray-500">{row.exam?.subject?.name || row.exam?.subject || ''}</span>
                </div>
            )
        },
        {
            key: 'score',
            title: 'Score',
            width: '15%',
            render: (val, row) => {
                const tp = totalPointsCache[row.exam?._id] || row.exam?.totalPoints || row.totalPoints || '--';
                const sc = row.totalScore ?? row.score ?? '--';
                return <span>{sc} / {tp}</span>;
            }
        },
        {
            key: 'status',
            title: 'Status',
            width: '20%',
            render: (val, row) => {
                const raw = (row.status || 'pending').toLowerCase();
                const label = raw === 'graded' ? 'Graded' : raw.includes('auto') ? 'Auto' : raw === 'completed' ? 'Completed' : 'Pending';
                const styles = label === 'Graded' || label === 'Completed' ? 'bg-green-100 text-green-700' : label === 'Auto' ? 'bg-pink-100 text-pink-600' : 'bg-yellow-100 text-yellow-700';
                return <span className={`px-2 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1 ${styles}`}>{label}</span>;
            }
        },
        {
            key: 'submittedAt',
            title: 'Submitted',
            width: '30%',
            render: (val, row) => row.submittedAt ? new Date(row.submittedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' }) : '--'
        }
    ];

    const fetchDetail = async (submission) => {
        if (!submission?._id || !currentUser?.school) return;
        try {
            setDetailError(null);
            setDetailLoading(true);
            const detail = await submissionService.getSubmissionDetails(submission._id, currentUser.school);
            setSelected(detail);
            setActiveView('detail');
        } catch (e) {
            setDetailError(e.message || 'Failed to load details');
        } finally {
            setDetailLoading(false);
        }
    };

    const renderList = () => (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">My Submissions ({submissions.length})</h2>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Filter:</label>
                    <select value={filter} onChange={e => setFilter(e.target.value)} className="border border-gray-300 rounded-md text-xs px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="all">All</option>
                        <option value="graded">Graded</option>
                        <option value="completed">Completed</option>
                        <option value="auto">Auto</option>
                        <option value="pending">Pending</option>
                    </select>
                </div>
            </div>
            <DynamicTable
                data={filteredSubmissions}
                columns={columns}
                onRowClick={fetchDetail}
                showActions={false}
                itemsPerPage={8}
                containerHeight="540px"
                emptyMessage="No submissions yet"
            />
        </div>
    );

    const renderDetail = () => {
        if (!selected) return null;
        const exam = selected.exam || {};
        const totalPoints = Array.isArray(exam.questions) ? exam.questions.reduce((s, q) => s + (parseInt(q.maxScore) || 0), 0) : (exam.totalPoints || 0);

        return (
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Answers */}
                <div className="flex-1 rounded-lg border border-black/10 px-6 py-8 min-h-[520px] overflow-y-auto">
                    {detailLoading && <div className="flex items-center gap-3 text-sm text-gray-600"><FaSpinner className="h-4 w-4 animate-spin" /> Loading submission...</div>}
                    {detailError && <div className="text-sm text-red-600">{detailError}</div>}
                    {!detailLoading && !detailError && Array.isArray(selected.answers) && selected.answers.length > 0 && (
                        <ol className="space-y-3 list-decimal list-inside">
                            {selected.answers.map((ans, idx) => {
                                const question = exam.questions?.find(q => (q._id || q.id) === (ans.questionId || ans.question?._id)) || {};
                                const maxScore = parseInt(question.maxScore || ans.maxScore || 0) || 0;
                                const existingScore = ans.score ?? ans.points ?? 0;
                                const isObjective = ['multiple-choice','true-false'].includes(question.type);
                                const bg = isObjective ? (existingScore === maxScore && maxScore>0 ? 'bg-main-green/10' : 'bg-main-red/10') : 'bg-gray-50';
                                const qId = question._id || question.id || ans.questionId || String(idx);
                                const checked = !!selectedQuestions[qId];
                                return (
                                    <li key={ans._id || idx} className={`relative p-4 rounded-lg border border-black/5 ${bg}`}>
                                        {reviewMode && (
                                            <label className="absolute top-2 right-2 flex items-center gap-1 text-[11px] cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="h-3 w-3"
                                                    checked={checked}
                                                    onChange={(e) => setSelectedQuestions(prev => {
                                                        const copy = { ...prev };
                                                        if (e.target.checked) copy[qId] = true; else delete copy[qId];
                                                        return copy;
                                                    })}
                                                />
                                                <span>Review</span>
                                            </label>
                                        )}
                                        <div className="text-[13px] font-medium text-gray-800 mb-2">Q{idx + 1}. {question.text || ans.questionText || 'Question'}</div>
                                        {ans.answer && typeof ans.answer === 'string' && ans.answer.trim() !== '' && (
                                            <div className="text-[12px] text-gray-700 mb-1 break-words">
                                                <span className="font-medium">Answer:</span>
                                                <div
                                                    className="mt-1 answer-html prose prose-sm max-w-none"
                                                    // Render stored rich HTML (may include math/code) safely. Assume backend sanitizes.
                                                    dangerouslySetInnerHTML={{ __html: ans.answer }}
                                                />
                                            </div>
                                        )}
                                        {Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0 && (
                                            <div className="text-[12px] text-gray-700 mb-1">Selected: {ans.selectedOptions.join(', ')}</div>
                                        )}
                                        <div className="flex items-center gap-2 text-[11px] text-gray-600">
                                            <span><strong className="text-gray-800">{existingScore}</strong> / {maxScore || '--'}</span>
                                            {question.correctAnswer && <span className="ml-2">Correct: {question.correctAnswer}</span>}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                    {!detailLoading && !detailError && (!selected.answers || selected.answers.length === 0) && (
                        <p className="text-xs text-gray-500">No answers recorded.</p>
                    )}
                </div>
                {/* Side panel */}
                <div className="space-y-4 w-full lg:w-[360px]">
                    <div className="rounded-xl border border-black/10 p-5">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Exam</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                            <div className="col-span-2"><span className="text-gray-500">Title:</span> <span className="font-medium text-gray-800">{exam.title}</span></div>
                            <div><span className="text-gray-500">Subject:</span> {exam.subject?.name || exam.subject || '--'}</div>
                            <div><span className="text-gray-500">Type:</span> {exam.type || '--'}</div>
                            <div><span className="text-gray-500">Status:</span> {selected.status}</div>
                            <div><span className="text-gray-500">Score:</span> {selected.totalScore ?? selected.score ?? '--'} / {totalPoints}</div>
                            <div><span className="text-gray-500">Started:</span> {selected.startedAt ? new Date(selected.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</div>
                            <div><span className="text-gray-500">Submitted:</span> {selected.submittedAt ? new Date(selected.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</div>
                            {selected.gradedAt && (
                                <div><span className="text-gray-500">Graded:</span> {new Date(selected.gradedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            )}
                        </div>
                    </div>
                    {Array.isArray(selected.violationLogs) && selected.violationLogs.length > 0 && (
                        <div className="rounded-xl border border-red-200 p-5">
                            <h4 className="text-sm font-semibold text-red-700 mb-3">Violations</h4>
                            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1 text-[12px]">
                                {selected.violationLogs.map((v, i) => (
                                    <li key={v._id || i} className="flex justify-between gap-4 p-2 bg-red-50 rounded">
                                        <span className="text-red-700 truncate">{v.type || 'Violation'}</span>
                                        <span className="text-gray-500 ml-auto">{v.time ? new Date(v.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {selected.feedback && (
                        <div className="rounded-xl border border-black/10 p-5">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Feedback</h4>
                            <p className="text-[12px] text-gray-600 whitespace-pre-wrap">{selected.feedback}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Layout>
            <div className="m-0 py-4 bg-white min-h-[620px]">
                <div className="flex justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {activeView === 'list' ? (
                            <h1 className="text-base font-semibold text-gray-800">Submissions</h1>
                        ) : (
                            <h1 className="text-base font-semibold text-gray-800">Submission Detail</h1>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mr-4">
                        {activeView === 'detail' && !detailLoading && !detailError && !reviewMode && (
                            <Button size="sm" variant="outline" onClick={() => { setReviewMode(true); setSelectedQuestions({}); }}>Request Review</Button>
                        )}
                        {activeView === 'detail' && reviewMode && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={sendingReview || Object.keys(selectedQuestions).length === 0}
                                    onClick={async () => {
                                        if (!selected?._id) return;
                                        try {
                                            setSendingReview(true);
                                            await submissionService.requestReview(selected._id, Object.keys(selectedQuestions), currentUser.school);
                                            setReviewMode(false);
                                            setSelectedQuestions({});
                                        } catch { /* toast already */ } finally {
                                            setSendingReview(false);
                                        }
                                    }}
                                >{sendingReview ? 'Sending...' : 'Send Review'}</Button>
                                <Button size="sm" variant="outline" onClick={() => { setReviewMode(false); setSelectedQuestions({}); }}>Cancel</Button>
                            </>
                        )}
                        <Button size="sm" variant="outline" className="flex gap-2" onClick={() => setActiveView('list')}><FaChevronLeft /> Back</Button>
                    </div>
                </div>
                {loading && (
                    <div className="flex justify-center items-center py-32"><FaSpinner className="h-10 w-10 text-blue-600 animate-spin" /></div>
                )}
                {error && !loading && (
                    <div className="p-10 text-center text-sm text-red-600">{error}</div>
                )}
                {!loading && !error && activeView === 'list' && renderList()}
                {!loading && !error && activeView === 'detail' && renderDetail()}
            </div>
        </Layout>
    );
};

export default StudentSubmissions;

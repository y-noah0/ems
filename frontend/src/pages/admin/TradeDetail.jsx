import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Layout from "../../components/layout/Layout";
import { ToastContext } from "../../context/ToastContext";
import tradeService from "../../services/tradeService";
import subjectService from "../../services/subjectService";

export default function TradeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useContext(ToastContext);
    const [trade, setTrade] = useState(null);
    const [allSubjects, setAllSubjects] = useState([]);
    const [tradeSubjects, setTradeSubjects] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [showAddSubject, setShowAddSubject] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const tradeData = await tradeService.getTradeById(id);
                setTrade(tradeData);
                const subjectsList = await subjectService.getAllSubjects();
                setAllSubjects(subjectsList);
                // Assigned subjects
                const assigned = subjectsList.filter(s =>
                    Array.isArray(s.trades) && s.trades.map(t => t.toString()).includes(tradeData._id)
                );
                setTradeSubjects(assigned);
                // Available subjects
                const available = subjectsList.filter(s =>
                    !Array.isArray(s.trades) || !s.trades.map(t => t.toString()).includes(tradeData._id)
                );
                setAvailableSubjects(available);
            } catch (error) {
                console.error(error);
                showToast("Trade not found", "error");
                navigate("/admin/trades");
            }
        };
        fetchData();
    }, [id, navigate, showToast]);

    // Filter available subjects based on search
    const filteredAvailableSubjects = availableSubjects.filter(subject =>
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddSubject = () => {
        if (!selectedSubject) {
            showToast("Please select a subject", "warning");
            return;
        }

        const subject = allSubjects.find(s => s._id === selectedSubject);
        if (subject) {
            // TODO: API call to update subject trades array
            setTradeSubjects([...tradeSubjects, subject]);
            setAvailableSubjects(availableSubjects.filter(s => s._id !== selectedSubject));
            setSelectedSubject("");
            setShowAddSubject(false);
            
            showToast(`${subject.name} added to ${trade.name}`, "success");
        }
    };

    const handleRemoveSubject = (subjectId) => {
        const subject = allSubjects.find(s => s._id === subjectId);
        if (subject) {
            // TODO: API call to update subject trades array
            setTradeSubjects(tradeSubjects.filter(s => s._id !== subjectId));
            setAvailableSubjects([...availableSubjects, subject]);
            
            showToast(`${subject.name} removed from ${trade.name}`, "success");
        }
    };

    if (!trade) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="px-6 py-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="outline"
                            onClick={() => navigate("/admin/trades")}
                            className="flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Back to Trades</span>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{trade.name}</h1>
                            <p className="text-sm text-gray-500">
                                {trade.code} • {trade.level} • {trade.type}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">{trade.fullName}</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowAddSubject(true)}
                        disabled={availableSubjects.length === 0}
                    >
                        Add Subject
                    </Button>
                </div>

                {/* Subjects Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Subjects ({tradeSubjects.length})
                        </h2>
                    </div>
                    
                    {tradeSubjects.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Subject
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tradeSubjects.map((subject) => (
                                        <tr key={subject._id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {subject.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {subject.code}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">
                                                    {subject.description}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleRemoveSubject(subject._id)}
                                                    className="text-red-600 hover:text-red-900 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-gray-500 mb-4">
                                No subjects assigned to this trade yet.
                            </div>
                            {availableSubjects.length > 0 && (
                                <Button onClick={() => setShowAddSubject(true)}>
                                    Add First Subject
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Add Subject Modal */}
                {showAddSubject && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Add Subject to {trade.name}</h3>
                                <button
                                    onClick={() => setShowAddSubject(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            {/* Search */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Search subjects..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            {/* Available Subjects */}
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                                {filteredAvailableSubjects.length > 0 ? (
                                    filteredAvailableSubjects.map((subject) => (
                                        <div
                                            key={subject.id}
                                            className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                                                selectedSubject === subject.id ? 'bg-blue-50 border-blue-200' : ''
                                            }`}
                                            onClick={() => setSelectedSubject(subject.id)}
                                        >
                                            <div className="flex items-center">
                                                <input
                                                    type="radio"
                                                    checked={selectedSubject === subject._id}
                                                    onChange={() => setSelectedSubject(subject._id)}
                                                    className="mr-3"
                                                />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {subject.name} ({subject.code})
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {subject.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center text-gray-500">
                                        {searchTerm ? "No subjects found matching your search." : "No available subjects."}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-end space-x-3 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAddSubject(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleAddSubject}
                                    disabled={!selectedSubject}
                                >
                                    Add Subject
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

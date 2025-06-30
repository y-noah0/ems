import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Layout from "../../components/layout/Layout";
import { ToastContext } from "../../context/ToastContext";
import tradesData from "../../data/mockTrades.json";
import subjectsData from "../../data/mockSubjects.json";

export default function SubjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useContext(ToastContext);
    const [subject, setSubject] = useState(null);
    const [subjectTrades, setSubjectTrades] = useState([]);
    const [availableTrades, setAvailableTrades] = useState([]);
    const [showAddTrade, setShowAddTrade] = useState(false);
    const [selectedTrade, setSelectedTrade] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        // Find the subject by ID (try both subjects and subjectCatalog)
        const foundSubject = subjectsData.subjects.find(s => s._id === id) || 
                           subjectsData.subjectCatalog.find(s => s._id === id);
        
        if (foundSubject) {
            setSubject(foundSubject);
            
            // Get all available trades
            const allTrades = tradesData.trades;
            
            // Get trades for this subject
            const tradesForSubject = allTrades.filter(trade => 
                foundSubject.trades && foundSubject.trades.includes(trade.code) ||
                foundSubject.trade === trade.code
            );
            setSubjectTrades(tradesForSubject);
            
            // Get available trades (not already assigned to this subject)
            const availableTradesForSubject = allTrades.filter(trade => 
                (!foundSubject.trades || !foundSubject.trades.includes(trade.code)) &&
                foundSubject.trade !== trade.code
            );
            setAvailableTrades(availableTradesForSubject);
        } else {
            showToast("Subject not found", "error");
            navigate("/admin/subjects");
        }
    }, [id, navigate, showToast]);

    // Filter available trades based on search
    const filteredAvailableTrades = availableTrades.filter(trade =>
        trade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddTrade = () => {
        if (!selectedTrade) {
            showToast("Please select a trade", "warning");
            return;
        }

        const trade = availableTrades.find(t => t._id === selectedTrade);
        if (trade) {
            // Add subject to trade's subjects array (this would be an API call in real app)
            const _updatedSubject = {
                ...subject,
                trades: [...(subject.trades || []), trade.code]
            };
            
            // Update local state
            setSubjectTrades([...subjectTrades, trade]);
            setAvailableTrades(availableTrades.filter(t => t._id !== selectedTrade));
            setSelectedTrade("");
            setShowAddTrade(false);
            
            showToast(`${trade.name} added to ${subject.name}`, "success");
        }
    };

    const handleRemoveTrade = (tradeId) => {
        const trade = subjectTrades.find(t => t._id === tradeId);
        if (trade) {
            // Remove subject from trade's subjects array (this would be an API call in real app)
            const _updatedSubject = {
                ...subject,
                trades: (subject.trades || []).filter(tCode => tCode !== trade.code)
            };
            
            // Update local state
            setSubjectTrades(subjectTrades.filter(t => t._id !== tradeId));
            setAvailableTrades([...availableTrades, trade]);
            
            showToast(`${trade.name} removed from ${subject.name}`, "success");
        }
    };

    if (!subject) {
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
                            onClick={() => navigate("/admin/subjects")}
                            className="flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Back to Subjects</span>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
                            <p className="text-sm text-gray-500">
                                Code: {subject.code} • ID: {subject.id}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">{subject.description}</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowAddTrade(true)}
                        disabled={availableTrades.length === 0}
                    >
                        Add Trade
                    </Button>
                </div>

                {/* Trades Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Assigned Trades ({subjectTrades.length})
                        </h2>
                    </div>
                    
                    {subjectTrades.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Trade/Combination
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Level
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {subjectTrades.map((trade) => (
                                        <tr key={trade._id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {trade.name}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {trade.fullName}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {trade.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {trade.category}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {trade.level}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{trade.type}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleRemoveTrade(trade._id)}
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
                                No trades assigned to this subject yet.
                            </div>
                            {availableTrades.length > 0 && (
                                <Button onClick={() => setShowAddTrade(true)}>
                                    Add First Trade
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Add Trade Modal */}
                {showAddTrade && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Add Trade to {subject.name}</h3>
                                <button
                                    onClick={() => setShowAddTrade(false)}
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
                                    placeholder="Search trades..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            {/* Available Trades */}
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                                {filteredAvailableTrades.length > 0 ? (
                                    filteredAvailableTrades.map((trade) => (
                                        <div
                                            key={trade._id}
                                            className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                                                selectedTrade === trade._id ? 'bg-blue-50 border-blue-200' : ''
                                            }`}
                                            onClick={() => setSelectedTrade(trade._id)}
                                        >
                                            <div className="flex items-center">
                                                <input
                                                    type="radio"
                                                    checked={selectedTrade === trade._id}
                                                    onChange={() => setSelectedTrade(trade._id)}
                                                    className="mr-3"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {trade.name} ({trade.code})
                                                        </div>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            {trade.category}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {trade.level} • {trade.type}
                                                        {trade.fullName && ` • ${trade.fullName}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center text-gray-500">
                                        {searchTerm ? "No trades found matching your search." : "No available trades."}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-end space-x-3 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAddTrade(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleAddTrade}
                                    disabled={!selectedTrade}
                                >
                                    Add Trade
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

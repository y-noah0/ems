import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Layout from "../../components/layout/Layout";
import { ToastContext } from "../../context/ToastContext";
import subjectService from "../../services/subjectService";
import tradeService from "../../services/tradeService";

export default function SubjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useContext(ToastContext);
    const [subject, setSubject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subjectTrades, setSubjectTrades] = useState([]);
    const [availableTrades, setAvailableTrades] = useState([]);
    const [showAddTrade, setShowAddTrade] = useState(false);
    const [selectedTrades, setSelectedTrades] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchSubjectDetails = async () => {
            try {
                setLoading(true);
                
                // Fetch subject details
                const subjectData = await subjectService.getSubjectById(id);
                setSubject(subjectData);
                
                // Fetch all trades
                const allTrades = await tradeService.getAllTrades();
                
                // Get trades for this subject (already populated from backend)
                if (subjectData.trades && subjectData.trades.length) {
                    // Ensure we have full trade objects (in case backend only sent IDs)
                    const populatedTrades = await Promise.all(
                        subjectData.trades.map(trade =>
                            // if the trade is already populated (has a name), skip fetching
                            trade.name
                                ? Promise.resolve(trade)
                                : tradeService.getTradeById(trade._id || trade)
                        )
                    );

                    setSubjectTrades(populatedTrades);

                    // Get available trades (not already assigned to this subject)
                    const assignedIds = populatedTrades.map(t => t._id);
                    const availableTradesForSubject = allTrades.filter(
                        t => !assignedIds.includes(t._id)
                    );
                    setAvailableTrades(availableTradesForSubject);

                } else {
                    setSubjectTrades([]);
                    setAvailableTrades(allTrades);
                }
                
            } catch (error) {
                showToast(`Failed to load subject details: ${error.message}`, "error");
                navigate("/admin/subjects");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchSubjectDetails();
        }
    }, [id, navigate, showToast]);

    // Filter available trades based on search
    const filteredAvailableTrades = availableTrades.filter(trade =>
        trade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trade.code && trade.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (trade.category && trade.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleAddTrade = async () => {
        if (!selectedTrades.length) {
            showToast("Please select at least one trade", "warning");
            return;
        }

        try {
            // Get the selected trade objects
            const tradesToAdd = availableTrades.filter(t => selectedTrades.includes(t._id));
            
            if (tradesToAdd.length > 0) {
                // Update subject with new trades
                const updatedTrades = [...(subject.trades || []).map(t => t._id), ...selectedTrades];
                const updatedSubject = await subjectService.updateSubject(subject._id, {
                    ...subject,
                    trades: updatedTrades,
                    school: subject.school._id || subject.school // Ensure we send the ID
                });
                
                // Update local state
                setSubject(updatedSubject);
                setSubjectTrades([...subjectTrades, ...tradesToAdd]);
                setAvailableTrades(availableTrades.filter(t => !selectedTrades.includes(t._id)));
                handleCloseModal();
                
                const tradeNames = tradesToAdd.map(t => t.name).join(', ');
                showToast(`${tradeNames} added to ${subject.name}`, "success");
            }
        } catch (error) {
            showToast(`Failed to add trades: ${error.message}`, "error");
        }
    };

    const handleRemoveTrade = async (tradeId) => {
        try {
            const trade = subjectTrades.find(t => t._id === tradeId);
            if (trade) {
                // Update subject by removing the trade
                const updatedTrades = (subject.trades || [])
                    .map(t => t._id)
                    .filter(id => id !== tradeId);
                    
                const updatedSubject = await subjectService.updateSubject(subject._id, {
                    ...subject,
                    trades: updatedTrades,
                    school: subject.school._id || subject.school // Ensure we send the ID
                });
                
                // Update local state
                setSubject(updatedSubject);
                setSubjectTrades(subjectTrades.filter(t => t._id !== tradeId));
                setAvailableTrades([...availableTrades, trade]);
                
                showToast(`${trade.name} removed from ${subject.name}`, "success");
            }
        } catch (error) {
            showToast(`Failed to remove trade: ${error.message}`, "error");
        }
    };

    const handleTradeSelection = (tradeId) => {
        setSelectedTrades(prev => 
            prev.includes(tradeId)
                ? prev.filter(id => id !== tradeId)
                : [...prev, tradeId]
        );
    };

    const handleSelectAllTrades = () => {
        const allTradeIds = filteredAvailableTrades.map(trade => trade._id);
        setSelectedTrades(allTradeIds);
    };

    const handleClearAllTrades = () => {
        setSelectedTrades([]);
    };

    const handleOpenAddTradeModal = () => {
        setSelectedTrades([]);
        setSearchTerm("");
        setShowAddTrade(true);
    };

    const handleCloseModal = () => {
        setShowAddTrade(false);
        setSelectedTrades([]);
        setSearchTerm("");
    };

    if (loading || !subject) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">
                        {loading ? "Loading..." : "Subject not found"}
                    </div>
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
                            size='md'
                            onClick={() => navigate("/admin/subjects")}
                            className="flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 20 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Back</span>
                        </Button>
                        
                    </div><div>
                            <h1 className="text-xl font-bold text-gray-900 m-0">{subject.name}</h1>
                            <p className="text-sm text-gray-600 mt-1">{subject.description} </p>
                            
                        </div>
                    <div className="flex space-x-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/subjects/edit/${subject._id}`)}
                        >
                            Edit Subject
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleOpenAddTradeModal}
                            disabled={availableTrades.length === 0}
                        >
                            Add Trade
                        </Button>
                    </div>
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
                                            Trade Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
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
                                    {subjectTrades && subjectTrades.map((trade) => (
                                        <tr key={trade._id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {trade.name}
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
                                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                                {trade.description || 'No description'}
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
                                <Button onClick={handleOpenAddTradeModal}>
                                    Add First Trade
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Add Trade Modal */}
                {showAddTrade && (
                    <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Add Trades to {subject.name}</h3>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            {/* Search and Controls */}
                            <div className="mb-4 space-y-3">
                                <input
                                    type="text"
                                    placeholder="Search trades..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-600">
                                        {selectedTrades.length} of {filteredAvailableTrades.length} trades selected
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllTrades}
                                            disabled={filteredAvailableTrades.length === 0}
                                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClearAllTrades}
                                            disabled={selectedTrades.length === 0}
                                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Available Trades */}
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                                {filteredAvailableTrades.length > 0 ? (
                                    filteredAvailableTrades.map((trade) => (
                                        <div
                                            key={trade._id}
                                            className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                                                selectedTrades.includes(trade._id) ? 'bg-blue-50 border-blue-200' : ''
                                            }`}
                                            onClick={() => handleTradeSelection(trade._id)}
                                        >
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTrades.includes(trade._id)}
                                                    onChange={() => handleTradeSelection(trade._id)}
                                                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                                                    {trade.description && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {trade.description}
                                                        </div>
                                                    )}
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
                                    onClick={handleCloseModal}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleAddTrade}
                                    disabled={selectedTrades.length === 0}
                                >
                                    Add Selected Trades
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

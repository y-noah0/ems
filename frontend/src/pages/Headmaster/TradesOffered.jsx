import React, { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Layout from "../../components/layout/Layout";
import { ToastContext } from "../../context/ToastContext";
import tradeService from "../../services/tradeService";
import subjectService from "../../services/subjectService";
import schoolService from "../../services/schoolService";
import { useAuth } from "../../context/AuthContext";

export default function TradesOffered() {
    const user = useAuth();
    const schoolId = user?.currentUser.school || '';
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);
    const [undoTimeout, setUndoTimeout] = useState(null); // for undo
    const [trades, setTrades] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [lastDeleted, setLastDeleted] = useState(null); // for undo
    const [schoolInfo, setSchoolInfo] = useState(null);
    const [allTrades, setAllTrades] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedTradeIds, setSelectedTradeIds] = useState([]);
    const navigate = useNavigate();
    const { showToast } = useContext(ToastContext);

    // Fetch trades and subjects from backend
    useEffect(() => {
        const fetchData = async () => {
            try {
                const tradesRes = await tradeService.getTradesBySchool(schoolId);
                setTrades(tradesRes);
                const subjectsRes = await subjectService.getSubjects(schoolId);
                setSubjects(subjectsRes);
                // load school info and all trades for modal
                const schoolRes = await schoolService.getSchoolById(schoolId);
                setSchoolInfo(schoolRes);
                const all = await tradeService.getAllTrades();
                setAllTrades(all);
            } catch (error) {
                showToast("Failed to load data: " + error.message, "error");
            }
        };
        fetchData();
    }, [showToast, schoolId]);

    // Category grouping (derived from trades for this school)
    const [activeCategory, setActiveCategory] = useState('All');
    const categories = useMemo(() => {
        const uniqueCats = Array.from(new Set(trades.map(t => t.category).filter(Boolean)));
        return ['All', ...uniqueCats];
    }, [trades]);

    // Get subject count for a trade
    const getSubjectCount = (tradeId) => {
        return subjects.filter(subject => 
            subject.trades && subject.trades.map(t => t.toString()).includes(tradeId)
        ).length;
    };

    // Get all trades for table display
    const getAllTrades = () => filterTrades(trades);

    // Handle trade click to navigate to detail page
    const handleTradeClick = (trade) => {
        navigate(`/headmaster/trade/${trade._id}`);
    };

    // Handle edit
    const handleEdit = (trade, e) => {
        e.stopPropagation();
        navigate(`/headmaster/trade/edit/${trade._id}`);
    };

    // Handle delete with confirmation
    const handleDelete = (trade, e) => {
        e.stopPropagation();
        setDeleteConfirmation({
            id: trade.id,
            name: trade.name,
            action: () => confirmDelete(trade)
        });
    };

    // Confirm delete
    const confirmDelete = (trade) => {
        // remove from UI immediately and allow undo
        setLastDeleted(trade);
        setTrades(prev => prev.filter(t => t._id !== trade._id));
        showToast(`${trade.name} deleted (undo available)`, 'success');
        // schedule permanent deletion from school's offerings
        const timeout = setTimeout(async () => {
            try {
                await schoolService.removeTradeFromSchool(schoolId, trade._id);
            } catch (err) {
                showToast(err.message || 'Failed to remove trade from school', 'error');
            } finally {
                setLastDeleted(null);
                setUndoTimeout(null);
            }
        }, 5000);
        setUndoTimeout(timeout);
        setDeleteConfirmation(null);
    };

    // Handle undo
    const handleUndo = () => {
        if (undoTimeout && lastDeleted) {
            clearTimeout(undoTimeout);
            setUndoTimeout(null);
            // restore deleted trade
            setTrades(prev => [lastDeleted, ...prev]);
            setLastDeleted(null);
            showToast("Deletion undone", 'info');
        }
    };

    // Handle search and category filter
    const filterTrades = (tradesList) => {
        let filtered = tradesList;
        if (activeCategory && activeCategory !== 'All') {
            filtered = filtered.filter(trade => trade.category === activeCategory);
        }
        if (!searchTerm) return filtered;
        return filtered.filter((trade) =>
            trade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trade.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (trade.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    };


    // Handle adding selected trades to school
    const handleAddSelected = async () => {
        if (!schoolInfo || selectedTradeIds.length === 0) {
            setShowAddModal(false);
            setSelectedTradeIds([]);
            return;
        }
        try {
            // Add each selected trade via dedicated endpoint
            await Promise.all(selectedTradeIds.map(tradeId =>
                schoolService.addTradeToSchool(schoolId, tradeId)
            ));
            const toAdd = allTrades.filter(t => selectedTradeIds.includes(t._id));
            setTrades(prev => [...prev, ...toAdd]);
            showToast('Trades added successfully', 'success');
        } catch (err) {
            showToast('Failed to add trades: ' + err.message, 'error');
        } finally {
            setShowAddModal(false);
            setSelectedTradeIds([]);
        }
    };

    return (
        <Layout>
            <div className="px-6 py-4">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-2">
                        {categories.map(cat => (
                            <Button
                                key={cat}
                                size="xs"
                                variant={activeCategory === cat ? 'primary' : 'outline'}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                    {/* Search */}
                    <div className="relative w-64">
                        <input
                            type="text"
                            placeholder="Search trades..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    </div>
                    <Button onClick={() => setShowAddModal(true)} size="sm">
                        Add Trade
                    </Button>
                </div>

                {/* Trades Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {activeCategory === 'All' ? 'Trades Catalog' : `${activeCategory} Trades Catalog`}
                        </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Trade (Name / Code)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                            </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Subjects
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {getAllTrades().map((trade) => (
                                    <tr
                                        key={trade._id}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => handleTradeClick(trade)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {trade.name}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {trade.code} - {trade.fullName}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {trade.description || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                                {getSubjectCount(trade._id)} subjects
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={(e) => handleEdit(trade, e)}
                                                className="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(trade, e)}
                                                className="text-red-600 hover:text-red-900 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {getAllTrades().length === 0 && (
                            <div className="text-center py-12">
                                <div className="text-gray-500">
                                    {searchTerm ? "No trades found matching your search." : "No trades available."}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirmation && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <div className="flex items-center mb-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">Delete Trade</h3>
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to delete "{deleteConfirmation.name}"? This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteConfirmation(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={deleteConfirmation.action}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Undo Toast */}
                {undoTimeout && (
                    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg flex items-center space-x-3 z-50">
                        <span>Trade deleted successfully</span>
                        <Button
                            size="sm"
                            onClick={handleUndo}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Undo
                        </Button>
                    </div>
                )}

                {/* Add Trade Modal */}
                {showAddModal && schoolInfo && (
                    <div className="fixed inset-0 bg-black/10 bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-xl w-full mx-4">
                            <h3 className="text-lg font-semibold mb-4">Select Trades to Add</h3>
                            {(() => {
                                const candidates = allTrades.filter(t =>
                                    t.category === schoolInfo.category && !trades.some(off => off._id === t._id)
                                );
                                if (candidates.length === 0) {
                                    return <div className="text-center text-gray-500 py-4">No other trades found.</div>;
                                }
                                return (
                                    <ul className="max-h-60 overflow-y-auto mb-4">
                                        {candidates.map(trade => (
                                            <li key={trade._id} className="flex items-center p-2">
                                                <input
                                                    type="checkbox"
                                                    className="mr-2"
                                                    checked={selectedTradeIds.includes(trade._id)}
                                                    onChange={() => {
                                                        setSelectedTradeIds(prev =>
                                                            prev.includes(trade._id)
                                                                ? prev.filter(id => id !== trade._id)
                                                                : [...prev, trade._id]
                                                        );
                                                    }}
                                                />
                                                <span>{trade.name} ({trade.code})</span>
                                            </li>
                                        ))}
                                    </ul>
                                );
                            })()}
                            <div className="flex justify-end space-x-3">
                                <Button
                                    variant="secondary"
                                    size='sm'
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setSelectedTradeIds([]);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    size='sm'
                                    onClick={handleAddSelected}
                                    disabled={selectedTradeIds.length === 0}
                                >
                                    Add Selected
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

import React, { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Layout from "../../components/layout/Layout";
import { ToastContext } from "../../context/ToastContext";
import tradeService from "../../services/tradeService";
import subjectService from "../../services/subjectService";
import schoolService from "../../services/schoolService";
import { useAuth } from "../../context/AuthContext";
import {
    FaBook,
    FaSearch,
    FaPlus,
    FaTrash,
    FaUndo,
    FaCheckCircle,
} from "react-icons/fa";

export default function TradesOffered() {
    const user = useAuth();
    const schoolId = user?.currentUser?.school || "";
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);
    const [undoTimeout, setUndoTimeout] = useState(null);
    const [trades, setTrades] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [lastDeleted, setLastDeleted] = useState(null);
    const [schoolInfo, setSchoolInfo] = useState(null);
    const [allTrades, setAllTrades] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedTradeIds, setSelectedTradeIds] = useState([]);
    const navigate = useNavigate();
    const { showToast } = useContext(ToastContext);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const tradesRes = await tradeService.getTradesBySchool(
                    schoolId
                );
                setTrades(tradesRes || []);
                const subjectsRes = await subjectService.getSubjects(schoolId);
                setSubjects(subjectsRes || []);
                const schoolRes = await schoolService.getSchoolById(schoolId);
                setSchoolInfo(schoolRes);
                const all = await tradeService.getAllTrades();
                setAllTrades(all || []);
            } catch (error) {
                showToast(
                    "Failed to load data: " +
                        (error.message || "Unknown error"),
                    "error"
                );
            }
        };
        fetchData();
    }, [showToast, schoolId]);

    const [activeCategory, setActiveCategory] = useState("All");
    const categories = useMemo(() => {
        const uniqueCats = Array.from(
            new Set(trades.map((t) => t.category).filter(Boolean))
        );
        return ["All", ...uniqueCats];
    }, [trades]);

    const getSubjectCount = (tradeId) => {
        return subjects.filter(
            (subject) =>
                subject.trades &&
                subject.trades.map((t) => t.toString()).includes(tradeId)
        ).length;
    };

    const getAllTrades = () => filterTrades(trades);

    const handleTradeClick = (trade) => {
        navigate(`/headmaster/trade/${trade._id}`);
    };

    const handleEdit = (trade, e) => {
        e.stopPropagation();
        navigate(`/headmaster/trade/edit/${trade._id}`);
    };

    const handleDelete = (trade, e) => {
        e.stopPropagation();
        setDeleteConfirmation({
            id: trade._id,
            name: trade.name,
            action: () => confirmDelete(trade),
        });
    };

    const confirmDelete = (trade) => {
        setLastDeleted(trade);
        setTrades((prev) => prev.filter((t) => t._id !== trade._id));
        showToast(`${trade.name} deleted (undo available for 5s)`, "success");
        const timeout = setTimeout(async () => {
            try {
                await schoolService.removeTradeFromSchool(schoolId, trade._id);
            } catch (err) {
                showToast(
                    err.message || "Failed to remove trade from school",
                    "error"
                );
                setTrades((prev) => [...prev, trade]); // Revert on failure
            } finally {
                setLastDeleted(null);
                setUndoTimeout(null);
            }
        }, 5000);
        setUndoTimeout(timeout);
        setDeleteConfirmation(null);
    };

    const handleUndo = () => {
        if (undoTimeout && lastDeleted) {
            clearTimeout(undoTimeout);
            setUndoTimeout(null);
            setTrades((prev) => [lastDeleted, ...prev]);
            setLastDeleted(null);
            showToast("Deletion undone", "info");
        }
    };

    const filterTrades = (tradesList) => {
        let filtered = tradesList;
        if (activeCategory && activeCategory !== "All") {
            filtered = filtered.filter(
                (trade) => trade.category === activeCategory
            );
        }
        if (!searchTerm) return filtered;
        return filtered.filter(
            (trade) =>
                trade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trade.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (trade.description || "")
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
        );
    };

    const handleAddSelected = async () => {
        if (!schoolInfo || selectedTradeIds.length === 0) {
            setShowAddModal(false);
            setSelectedTradeIds([]);
            return;
        }
        try {
            await Promise.all(
                selectedTradeIds.map((tradeId) =>
                    schoolService.addTradeToSchool(schoolId, tradeId)
                )
            );
            const toAdd = allTrades.filter((t) =>
                selectedTradeIds.includes(t._id)
            );
            setTrades((prev) => [...prev, ...toAdd]);
            showToast("Trades added successfully", "success");
        } catch (err) {
            showToast(
                "Failed to add trades: " + (err.message || "Unknown error"),
                "error"
            );
        } finally {
            setShowAddModal(false);
            setSelectedTradeIds([]);
        }
    };

    return (
        <Layout>
            <div className="px-4 sm:px-6 py-4 w-full max-w-7xl mx-auto font-roboto">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
                    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                        {categories.map((cat) => (
                            <Button
                                key={cat}
                                size="sm"
                                variant={
                                    activeCategory === cat
                                        ? "primary"
                                        : "outline"
                                }
                                onClick={() => setActiveCategory(cat)}
                                className="whitespace-nowrap transition-all duration-200 hover:shadow-md"
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                    <div className="relative px-4 w-full sm:w-64 max-h-8 flex justify-between items-center border border-black/25 rounded-lg">
                            <input
                                type="text"
                                placeholder="Search subjects..."
                                className="py-2 w-full  text-sm placeholder:text-sm sm:text-sm text-gray-900 focus:outline-none duration-200"
                                onChange={(e) => setSearchTerm(e.target.value)}
                                aria-label="Search Trades"
                            />
                            <FaSearch className="h-4 sm:h-4 w-4 sm:w-4 text-main-gray" />
                        </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        

                        <Button
                            onClick={() => setShowAddModal(true)}
                            size="sm"
                            
                        >
                            Add Trade
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {activeCategory === "All"
                                ? "Trades Catalog"
                                : `${activeCategory} Trades Catalog`}
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
                            <tbody className="bg-white divide-y divide-gray-100">
                                {getAllTrades().map((trade) => (
                                    <tr
                                        key={trade._id}
                                        className="hover:bg-indigo-50 cursor-pointer transition-colors duration-200 animate-fade-in"
                                        onClick={() => handleTradeClick(trade)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {trade.name}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {trade.code} -{" "}
                                                    {trade.fullName || "N/A"}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {trade.description || "—"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                                                {getSubjectCount(trade._id)}{" "}
                                                subjects
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={(e) =>
                                                    handleEdit(trade, e)
                                                }
                                                className="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) =>
                                                    handleDelete(trade, e)
                                                }
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
                            <div className="text-center py-12 text-gray-500 bg-gray-50">
                                {searchTerm
                                    ? "No trades found matching your search."
                                    : "No trades available."}
                            </div>
                        )}
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirmation && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 border-2 border-gradient-to-r from-red-600 to-red-800 animate-scale-in">
                            <div className="flex items-center mb-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <FaTrash className="w-6 h-6 text-red-600" />
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Delete Trade
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to delete "
                                        {deleteConfirmation.name}"? This action
                                        cannot be undone.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteConfirmation(null)}
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={deleteConfirmation.action}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Undo Toast */}
                {undoTimeout && (
                    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg flex items-center space-x-3 z-50 animate-fade-in">
                        <span>
                            {lastDeleted?.name} deleted (undo available for 5s)
                        </span>
                        <Button
                            size="sm"
                            onClick={handleUndo}
                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                        >
                            <FaUndo className="h-4 w-4" /> Undo
                        </Button>
                    </div>
                )}

                {/* Add Trade Modal */}
                {showAddModal && schoolInfo && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-xl w-full mx-4 border-2 border-gradient-to-r from-indigo-600 to-indigo-800 animate-scale-in">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <FaPlus className="h-5 w-5 text-indigo-600" />
                                Select Trades to Add
                            </h3>
                            {(() => {
                                const candidates = allTrades.filter(
                                    (t) =>
                                        t.category === schoolInfo.category &&
                                        !trades.some((off) => off._id === t._id)
                                );
                                if (candidates.length === 0) {
                                    return (
                                        <div className="text-center text-gray-500 py-4">
                                            No other trades found.
                                        </div>
                                    );
                                }
                                return (
                                    <ul className="max-h-60 overflow-y-auto mb-4 border border-gray-200 rounded bg-gray-50/50 p-2">
                                        {candidates.map((trade) => (
                                            <li
                                                key={trade._id}
                                                className="flex items-center p-2 hover:bg-gray-100 transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                    checked={selectedTradeIds.includes(
                                                        trade._id
                                                    )}
                                                    onChange={() => {
                                                        setSelectedTradeIds(
                                                            (prev) =>
                                                                prev.includes(
                                                                    trade._id
                                                                )
                                                                    ? prev.filter(
                                                                          (
                                                                              id
                                                                          ) =>
                                                                              id !==
                                                                              trade._id
                                                                      )
                                                                    : [
                                                                          ...prev,
                                                                          trade._id,
                                                                      ]
                                                        );
                                                    }}
                                                />
                                                <span className="text-sm text-gray-900">
                                                    {trade.name} ({trade.code})
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                );
                            })()}
                            <div className="flex justify-end space-x-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setSelectedTradeIds([]);
                                    }}
                                    className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleAddSelected}
                                    disabled={selectedTradeIds.length === 0}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    <FaCheckCircle className="h-4 w-4 mr-1" />{" "}
                                    Add Selected
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style jsx>{`
                @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap");
                .font-roboto {
                    font-family: "Roboto", sans-serif;
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-in;
                }
                .animate-scale-in {
                    animation: scaleIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .border-gradient-to-r {
                    border-image: linear-gradient(to right, #4b5eaa, #6b46c1) 1;
                }
            `}</style>
        </Layout>
    );
}

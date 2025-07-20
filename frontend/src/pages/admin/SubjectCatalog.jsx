import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Layout from "../../components/layout/Layout";
import { ToastContext } from "../../context/ToastContext";
import subjectService from "../../services/subjectService";

export default function SubjectCatalog() {
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);
    const [undoTimeout, setUndoTimeout] = useState(null);
    const [subjectsList, setSubjectsList] = useState([]);
    const navigate = useNavigate();
    const { showToast } = useContext(ToastContext);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const subjectsRes = await subjectService.getAllSubjects();
                setSubjectsList(subjectsRes);
            } catch (error) {
                showToast("Failed to load subjects", "error");
            }
        };
        fetchData();
    }, [showToast]);

    // Handle search filter
    const filterSubjects = (list) => {
        if (!searchTerm) return list;
        return list.filter((subject) =>
            subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            subject.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    // Get trade count for a subject
    const getTradeCount = (subject) => {
        return subject.trades ? subject.trades.length : 0;
    };

    // Handle subject click to navigate to detail page
    const handleSubjectClick = (subject) => {
        navigate(`/admin/subjects/${subject._id}`);
    };

    // Handle edit
    const handleEdit = (subject, e) => {
        e.stopPropagation();
        navigate(`/admin/subjects/edit/${subject._id}`);
    };

    // Handle delete with confirmation
    const handleDelete = (subject, e) => {
        e.stopPropagation();
        setDeleteConfirmation({
            id: subject._id,
            name: subject.name,
            action: () => confirmDelete(subject)
        });
    };

    // Confirm delete
    const confirmDelete = (subject) => {
        // Here you would typically make an API call to delete the subject
        console.log("Deleting subject:", subject.id);
        
        showToast(`${subject.name} deleted successfully`, 'success');
        
        // Show undo option
        const timeout = setTimeout(() => {
            // Final deletion after timeout
            console.log("Subject permanently deleted:", subject.id);
        }, 5000);
        
        setUndoTimeout(timeout);
        setDeleteConfirmation(null);
    };

    // Handle undo
    const handleUndo = () => {
        if (undoTimeout) {
            clearTimeout(undoTimeout);
            setUndoTimeout(null);
            showToast("Deletion cancelled", 'info');
        }
    };

    const filteredSubjects = filterSubjects(subjectsList);

    return (
        <Layout>
            <div className="px-6 py-4">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Subject Catalog</h1>

                    </div>
                    
                    {/* Search */}
                    <div className="relative w-64">
                        <input
                            type="text"
                            placeholder="Search subjects..."
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
                    
                    <Button to="/admin/subjects/add" size="sm">
                        Add Subject
                    </Button>
                </div>

                {/* Subjects Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            All Subjects ({filteredSubjects.length})
                        </h2>
                    </div>
                    
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Trades
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredSubjects.map((subject) => (
                                    <tr
                                        key={subject._id}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => handleSubjectClick(subject)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {subject.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {subject.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 max-w-xs truncate">
                                                {subject.description}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                                {getTradeCount(subject)} trades
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={(e) => handleEdit(subject, e)}
                                                className="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(subject, e)}
                                                className="text-red-600 hover:text-red-900 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {filteredSubjects.length === 0 && (
                            <div className="text-center py-12">
                                <div className="text-gray-500">
                                    {searchTerm ? "No subjects found matching your search." : "No subjects available."}
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Subject</h3>
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
                        <span>Subject deleted successfully</span>
                        <Button
                            size="sm"
                            onClick={handleUndo}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Undo
                        </Button>
                    </div>
                )}
            </div>
        </Layout>
    );
}

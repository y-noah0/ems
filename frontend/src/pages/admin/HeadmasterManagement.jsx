import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import HeadmasterForm from "../../components/forms/HeadmasterForm";
import userService from "../../services/userService";
import { ToastContext } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import Layout from "../../components/layout/Layout";

export default function HeadmasterManagement() {
    const navigate = useNavigate();
    const { showToast } = useContext(ToastContext);

    const [headmasters, setHeadmasters] = useState([]);
    const [filteredHeadmasters, setFilteredHeadmasters] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingHeadmaster, setEditingHeadmaster] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [deletionTimeout, setDeletionTimeout] = useState(null);
    const [deletionPending, setDeletionPending] = useState(null);

    const fetchHeadmasters = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await userService.getHeadmasters();
            
            // Ensure data is an array
            const headmastersArray = Array.isArray(data) ? data : data.headmasters || [];
            setHeadmasters(headmastersArray);
            setFilteredHeadmasters(headmastersArray);
        } catch (error) {
            console.error('Error fetching headmasters:', error);
            setError(error.message || 'Failed to fetch headmasters');
            showToast(`Failed to fetch headmasters: ${error.message}`, "error");
            // Set empty arrays on error to prevent crashes
            setHeadmasters([]);
            setFilteredHeadmasters([]);
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchHeadmasters();
    }, [fetchHeadmasters]);

    // Search filtering
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredHeadmasters(headmasters);
        } else {
            const filtered = headmasters.filter(headmaster =>
                headmaster.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                headmaster.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                headmaster.phoneNumber?.includes(searchTerm) ||
                headmaster.school?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredHeadmasters(filtered);
        }
    }, [searchTerm, headmasters]);

    const handleAddHeadmaster = () => {
        setEditingHeadmaster(null);
        setShowForm(true);
    };

    const handleEditHeadmaster = (headmaster) => {
        setEditingHeadmaster(headmaster);
        setShowForm(true);
    };

    const handleDeleteHeadmaster = async (headmasterId) => {
        const headmaster = headmasters.find(h => h._id === headmasterId);
        if (!headmaster) return;

        // Set pending deletion state
        setDeletionPending({
            id: headmasterId,
            name: headmaster.fullName
        });

        // Show warning toast
        showToast(
            `${headmaster.fullName} will be deleted in 5 seconds. Click Undo to cancel.`,
            "warning"
        );

        // Set timeout for actual deletion
        const timeoutId = setTimeout(async () => {
            try {
                setDeletingId(headmasterId);
                await userService.deleteUser(headmasterId);
                showToast("Headmaster deleted successfully", "success");
                fetchHeadmasters();
            } catch (error) {
                showToast(
                    `Failed to delete headmaster: ${error.message}`,
                    "error"
                );
            } finally {
                setDeletingId(null);
                setDeletionPending(null);
                setDeletionTimeout(null);
            }
        }, 5000);

        setDeletionTimeout(timeoutId);
    };

    const handleUndoDelete = () => {
        if (deletionTimeout) {
            clearTimeout(deletionTimeout);
            setDeletionTimeout(null);
            setDeletionPending(null);
            showToast("Deletion cancelled", "info");
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (deletionTimeout) {
                clearTimeout(deletionTimeout);
            }
        };
    }, [deletionTimeout]);

    const handleFormClose = () => {
        setShowForm(false);
        setEditingHeadmaster(null);
    };

    const handleHeadmasterCreated = () => {
        fetchHeadmasters();
    };

    const handleHeadmasterUpdated = () => {
        fetchHeadmasters();
    };

    return (
        <Layout>
            {/* Deletion Banner */}
            {deletionPending && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-yellow-800 font-medium">
                                {deletionPending.name} will be deleted in a few seconds
                            </span>
                        </div>
                        <button
                            onClick={handleUndoDelete}
                            className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                            Undo Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <p className="text-xl font-medium">Headmaster Management</p>
                {/* Search */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search headmasters..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-64 placeholder:text-sm text-sm"
                    />
                    <svg
                        className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>

                <div className="flex items-center space-x-4">
                    {/* Refresh Button */}
                    <Button
                        onClick={fetchHeadmasters}
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isLoading ? 'Loading...' : 'Refresh'}
                    </Button>
                    
                    {/* Add Headmaster Button */}
                    <Button
                        onClick={handleAddHeadmaster}
                        size="sm"
                        variant="primary"
                    >
                        Add Headmaster
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {error ? (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading headmasters</h3>
                        <p className="mt-1 text-sm text-gray-500">{error}</p>
                        <div className="mt-4">
                            <Button onClick={fetchHeadmasters} size="sm" variant="primary">
                                Try Again
                            </Button>
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-gray-600">
                            Loading headmasters...
                        </span>
                    </div>
                ) : filteredHeadmasters.length === 0 ? (
                    <div className="text-center py-12">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                            />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            No headmasters found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm
                                ? "Try adjusting your search criteria."
                                : "Get started by adding a new headmaster."}
                        </p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Headmaster Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Number
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    School
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredHeadmasters.map((headmaster) => (
                                <tr
                                    key={headmaster._id}
                                    className={`hover:bg-gray-50 transition-colors ${
                                        deletionPending?.id === headmaster._id
                                            ? "bg-red-50 border-red-200"
                                            : ""
                                    }`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-blue-700">
                                                        {headmaster.profilePicture ? (
                                                            <img
                                                                src={headmaster.profilePicture}
                                                                alt={headmaster.fullName}
                                                                className="h-10 w-10 rounded-full"
                                                            />
                                                        ) : (
                                                            headmaster.fullName
                                                                ?.charAt(0)
                                                                ?.toUpperCase() || "H"
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {headmaster.fullName ||
                                                        "N/A"}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {headmaster.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {headmaster.phoneNumber || "N/A"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {headmaster.school?.name ||
                                            "No school assigned"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() =>
                                                    handleEditHeadmaster(
                                                        headmaster
                                                    )
                                                }
                                                disabled={deletionPending?.id === headmaster._id}
                                                className="text-blue-600 hover:text-blue-900 transition-colors disabled:opacity-50"
                                            >
                                                Edit
                                            </button>
                                            
                                            {deletionPending?.id === headmaster._id ? (
                                                <button
                                                    onClick={handleUndoDelete}
                                                    className="text-green-600 hover:text-green-900 transition-colors font-medium"
                                                >
                                                    Undo
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() =>
                                                        handleDeleteHeadmaster(
                                                            headmaster._id
                                                        )
                                                    }
                                                    disabled={
                                                        deletingId === headmaster._id
                                                    }
                                                    className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                                                >
                                                    {deletingId === headmaster._id
                                                        ? "Deleting..."
                                                        : "Delete"}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <HeadmasterForm
                    headmasterId={editingHeadmaster?._id}
                    onClose={handleFormClose}
                    onCreate={handleHeadmasterCreated}
                    onUpdate={handleHeadmasterUpdated}
                />
            )}
        </Layout>
    );
}

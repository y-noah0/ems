import React, { useEffect, useState, useMemo } from "react";
import Layout from "../../components/layout/Layout";
import Button from "../../components/ui/Button1";
import DynamicTable from "../../components/class/DynamicTable";
import { Navigate, useNavigate } from "react-router-dom";
import schoolService from "../../services/schoolService";
import { toast } from "react-toastify";

export default function SchoolManagement() {
    const [schools, setSchools] = useState([]);
    // Category grouping
    const [activeCategory, setActiveCategory] = useState('All');
    const categories = useMemo(() => {
        const unique = Array.from(new Set(schools.map(s => s.category).filter(Boolean)));
        return ['All', ...unique];
    }, [schools]);
    // Filter schools by category
    const filteredSchools = useMemo(() => {
        return activeCategory === 'All'
            ? schools
            : schools.filter(school => school.category === activeCategory);
    }, [schools, activeCategory]);
    const navigate = useNavigate();
    
    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const list = await schoolService.getAllSchools();
                setSchools(list);
            } catch (err) {
                console.error("Error loading schools:", err);
                toast.error("Failed to load schools");
            }
        };
        fetchSchools();
    }, []);

    const handleEdit = (school) => {
        navigate(`/admin/school/${school._id}/edit`);
    };

    const handleDelete = async (school) => {
        if (window.confirm(`Are you sure you want to delete ${school.name}?`)) {
            try {
                await schoolService.deleteSchool(school._id);
                setSchools(prev => prev.filter(s => s._id !== school._id));
                toast.success("School deleted successfully");
            } catch (err) {
                console.error("Error deleting school:", err);
                toast.error("Failed to delete school");
            }
        }
    };

    const handleView = (school) => {
        navigate(`/admin/school/${school._id}`);
    };

    // Schools table columns
    const schoolsColumns = [
        { 
            key: 'name', 
            title: 'School',
            render: (value, record) => (
                <button
                    onClick={() => handleView(record)}
                    className="text-sm font-medium text-blue-600 hover:underline"
                >
                    {value}
                </button>
            )
        },
        { 
            key: 'code', 
            title: 'School Code',
            render: (value) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {value}
                </span>
            )
        },
        { 
            key: 'tradesOffered', 
            title: 'Trades Offered',
            render: (value) => (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                    {value?.length || 0} trades
                </span>
            )
        },
        { 
            key: 'category', 
            title: 'System',
            render: (value) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    value === "TVET"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                }`}>
                    {value}
                </span>
            )
        },
        { 
            key: 'address', 
            title: 'Address',
            render: (value) => (
                <span className="text-sm text-gray-900">
                    {value}
                </span>
            )
        }
    ];

    return (
        <div className="">
            <Layout>
                <div className="px-6 py-4 overflow-hidden">
                    <div className="flex justify-between border-b pb-2 border-b-black/10">
                        <div className="flex flex-wrap gap-2">
                            {categories.map(category => (
                                <Button
                                    key={category}
                                    size="sm"
                                    onClick={() => setActiveCategory(category)}
                                    variant={activeCategory === category ? 'primary' : 'outline'}
                                >
                                    {category}
                                </Button>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="Search schools..."
                            className="border border-black/10 px-4 rounded-lg text-sm h-8 w-64 focus-visible:border-black/10"
                        />
                        <Button to="/admin/schools/add" size="sm">Add School</Button>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">All Schools ({schools.length})</h2>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <DynamicTable
                                data={filteredSchools}
                                columns={schoolsColumns}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onRowClick={handleView}
                                showActions={true}
                                emptyMessage="No schools available."
                                renderCustomActions={(school) => (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(school);
                                            }}
                                            className="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(school);
                                            }}
                                            className="text-red-600 hover:text-red-900 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}
                            />
                        </div>
                    </div>
                </div>
            </Layout>
        </div>
    );
}

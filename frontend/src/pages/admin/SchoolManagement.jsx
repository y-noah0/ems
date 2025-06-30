import React, { useEffect, useState } from "react";
import Layout from "../../components/layout/Layout";
import Button from "../../components/ui/Button1";
import DynamicTable from "../../components/class/DynamicTable";
import { Navigate, useNavigate } from "react-router-dom";
import data from "../../data/schools.json";

export default function SchoolManagement() {
    const [schools, setSchools] = useState([]);
    const navigate = useNavigate();
    
    useEffect(() => {
        setSchools(data.schools || []);
    }, []);

    const handleEdit = (school) => {
        navigate(`/admin/school/${school._id}/edit`);
    };

    const handleDelete = (school) => {
        // Add delete functionality here
        console.log("Delete school:", school._id);
    };

    const handleView = (school) => {
        navigate(`/admin/school/${school._id}`);
    };

    // Schools table columns
    const schoolsColumns = [
        { 
            key: 'name', 
            title: 'School',
            render: (value) => (
                <span className="text-sm font-medium text-gray-900">{value}</span>
            )
        },
        { 
            key: 'shortName', 
            title: 'School Code',
            render: (value) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {value}
                </span>
            )
        },
        { 
            key: 'levels', 
            title: 'Levels Offered',
            render: (value) => (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                    {value?.length} levels
                </span>
            )
        },
        { 
            key: 'type', 
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
            key: 'location', 
            title: 'Location',
            render: (value) => (
                <span className="text-sm text-gray-900">{value?.district}, {value?.province}</span>
            )
        }
    ];

    return (
        <div className="">
            <Layout>
                <div className="px-6 py-4 overflow-hidden">
                    <div className="flex justify-between border-b pb-2 border-b-black/10">
                        <h1 className="title">Manage schools</h1>
                        <input
                            type="text"
                            placeholder="Search schools..."
                            className="border border-black/10 px-4 rounded-lg text-sm h-8 w-64 focus-visible::border-black/10 "
                        />
                        <Button to={"/admin/schools/add"} size="sm">Add School</Button>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">All Schools ({schools.length})</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <DynamicTable
                                data={schools}
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

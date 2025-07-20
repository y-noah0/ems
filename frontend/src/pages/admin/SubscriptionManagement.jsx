import React from "react";
import Layout from "../../components/layout/Layout";
import Button from "../../components/ui/Button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import data from "../../data/mockSchools.json";
import DynamicTable from "../../components/class/DynamicTable";

export default function SubscriptionManagement() {
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
            key: "name",
            title: "School",
            render: (value) => (
                <span className="text-sm font-medium text-gray-900">
                    {value}
                </span>
            ),
        },
        
        {
            key: "levels",
            title: "Levels Offered",
            render: (value) => (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                    {value?.length} levels
                </span>
            ),
        },
        {
            key: "type",
            title: "System",
            render: (value) => (
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        value === "TVET"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                    }`}
                >
                    {value}
                </span>
            ),
        },
        {
            key: "location",
            title: "Location",
            render: (value) => (
                <span className="text-sm text-gray-900">
                    {value?.district}, {value?.province}
                </span>
            ),
        },
        {
            key: "status",
            title: "Status",
            render: (value) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value=='active'? ' bg-blue-100 text-blue-800': 'text-main-red bg-main-red/10'}`}>
                    {value}
                </span>
            ),
        },
    ];
    return (
        <Layout>
            <div className="flex justify-between border-b pb-2 border-b-black/10">
                <h1 className="title">Manage Subscriptions</h1>

                <Button to={"/admin/schools/add"} variant="outline" size="sm">
                    back
                </Button>
            </div>
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
                            Notify
                        </button>
                        
                    </>
                )}
            />
        </Layout>
    );
}

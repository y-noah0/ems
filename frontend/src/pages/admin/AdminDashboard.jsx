import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/layout/Layout";
import StatsCards from "../../components/dashboard/StatsCards";
import DynamicTable from "../../components/class/DynamicTable";
import Button from "../../components/ui/Button1";
import adminService from "../../services/adminService";
import schoolService from "../../services/schoolService";

const AdminDashboard = () => {
    const { currentUser, loading } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ classCount:0, teacherCount:0, studentCount:0, examCount:0 });
    const [topSchools, setTopSchools] = useState([]);

    useEffect(() => {
        // Only redirect if we're not loading and user is not admin
        if (!loading && (!currentUser || currentUser.role !== "admin")) {
            navigate("/login");
        }
    }, [currentUser, loading, navigate]);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const classes = await adminService.getAllClasses(currentUser.school);
                const teachers = await adminService.getAllTeachers();
                // sum students per class
                let studentCount = 0;
                for (const cls of classes) {
                    const students = await adminService.getStudentsByClass(cls.id);
                    studentCount += students.length;
                }
                // examCount placeholder
                const examCount = 0;
                setStats({
                    classCount: classes.length,
                    teacherCount: teachers.length,
                    studentCount,
                    examCount
                });
            } catch (err) {
                console.error('Error loading dashboard stats:', err);
            }
        };
        if (currentUser && currentUser.role === "admin") fetchDashboard();
    }, [currentUser]);

    // Fetch top schools
    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const schools = await schoolService.getAllSchools();
                setTopSchools(schools);
            } catch (err) {
                console.error('Error loading schools:', err);
            }
        };
        fetchSchools();
    }, []);

    // Show loading while authentication state is being determined
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render admin content if user is not admin
    if (!currentUser || currentUser.role !== "admin") {
        return null; // Will redirect in useEffect
    }

    const payments = [
        {
            id: 1,
            name: "mather marry",
            status: "active",
        },
        {
            id: 2,
            name: "john doe",
            status: "pending"
        },
        {
            id: 3,
            name: "jane smith",
            status: "suspended"
        },
    ];

    // Top Schools table columns
    const topSchoolsColumns = [
        { 
            key: 'name', 
            title: 'School',
            render: (value) => (
                <span className="text-sm font-medium text-gray-900">{value}</span>
            )
        },
        { 
            key: 'students', 
            title: 'Students',
            render: (value) => (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                    {value}
                </span>
            )
        }
    ];

    // Payments table columns
    const paymentsColumns = [
        { 
            key: 'name', 
            title: 'School',
            render: (value) => (
                <span className="text-sm font-medium text-gray-900">{value}</span>
            )
        },
        { 
            key: 'status', 
            title: 'Status',
            render: (value) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    value === "active" 
                        ? "bg-green-100 text-green-800" 
                        : value === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                }`}>
                    {value}
                </span>
            )
        }
    ];

    return (
        <Layout>
            <div className="px-10 py-6">
                <div className="h-fit">
                    <StatsCards stats={stats} />
                </div>
                <div className="flex justify-between gap-6">
                    <div className="w-1/2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Top Schools</h2>
                            <Button to={"/admin/schools"} size="sm">
                                Manage
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <DynamicTable
                                data={topSchools}
                                columns={topSchoolsColumns}
                                emptyMessage="No schools available"
                            />
                        </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Payment Statuses</h2>
                            <Button to={"/admin/schools"} size="sm">
                                Manage
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <DynamicTable
                                data={payments}
                                columns={paymentsColumns}
                                emptyMessage="No payment data available"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AdminDashboard;

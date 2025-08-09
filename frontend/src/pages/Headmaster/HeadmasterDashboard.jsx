import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/layout/Layout";
import Button from "../../components/ui/Button1";
import schoolService from "../../services/schoolService";
import userService from "../../services/userService";
import { getClasses } from "../../services/classService";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

export default function HeadmasterDashboard() {
    const currentUser = useAuth();
    const schoolId = currentUser.currentUser.school;
    
    const navigate = useNavigate();
    const [school, setSchool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        students: 0,
        teachers: 0,
        classes: 0,
        exams: 0,
    });

    useEffect(() => {
        const fetchSchoolData = async () => {
            try {
                setLoading(true);

                // Fetch school details
                const schoolData = await schoolService.getSchoolById(schoolId);
                setSchool(schoolData);

                // Fetch statistics
                await fetchStatistics(schoolId);
            } catch (err) {
                console.error("Error loading school data:", err);
                toast.error("Failed to load school information");
            } finally {
                setLoading(false);
            }
        };

        if (schoolId) {
            fetchSchoolData();
        }
    }, [schoolId]);
    

    const fetchStatistics = async (schoolId) => {
        try {
            let teacherCount = 0;
            let studentCount = 0;
            let classCount = 0;
            let examCount = 0;

            // Get all staff to filter teachers for this school
            try {
                const allStaff = await userService.getAllStaff();
                const schoolTeachers = allStaff.filter(
                    (staff) =>
                        staff.schoolId === schoolId && staff.role === "teacher"
                );
                teacherCount = schoolTeachers.length;
            } catch (staffErr) {
                console.log("Could not fetch staff count:", staffErr);
            }

            // Get classes for this school
            try {
                const classesData = await getClasses(schoolId);
                const classes = Array.isArray(classesData.classes)
                    ? classesData.classes
                    : [];
                classCount = classes.length;

                // Calculate total students from all classes
                studentCount = classes.reduce((total, classItem) => {
                    return (
                        total +
                        (classItem.students ? classItem.students.length : 0)
                    );
                }, 0);
            } catch (classErr) {
                console.log("Could not fetch class data:", classErr);
            }

            // For exams, we'll use a placeholder since we don't have a school-specific endpoint
            // This could be enhanced in the future with a proper backend endpoint
            try {
                // This is a simplified approach - in a real scenario, you'd have a school-specific exam endpoint
                examCount = 0; // Placeholder - could be enhanced with proper backend endpoint
            } catch (examErr) {
                console.log("Could not fetch exam count:", examErr);
            }

            setStats({
                students: studentCount,
                teachers: teacherCount,
                classes: classCount,
                exams: examCount,
            });
        } catch (err) {
            console.error("Error fetching statistics:", err);
            // Set default stats on error
            setStats({
                students: 0,
                teachers: 0,
                classes: 0,
                exams: 0,
            });
        }
    };

    const handleEdit = () => {
        navigate(`/admin/school/${schoolId}/edit`);
    };

    const handleBack = () => {
        navigate("/admin/schools");
    };

    if (loading) {
        return (
            <Layout>
                <div className="px-6 py-4">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-lg text-gray-600">
                            Loading school information...
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!school) {
        return (
            <Layout>
                <div className="px-6 py-4">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-lg text-gray-600">
                            School not found
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="py-4 px-6">
                <div className="max-w-4xl">
                    {/* Header with logo and name */}
                    
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                        <div className="flex items-center space-x-6">
                            {/* School Logo */}
                            <div className="flex-shrink-0">
                                {school.logo ? (
                                    <>
                                        <img
                                            src={`http://localhost:5000${school.logo}`}
                                            alt={`${school.name} logo`}
                                            className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                            crossOrigin="anonymous"
                                            onError={(e) => {
                                                console.error('Failed to load school logo:', e.target.src);
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center" style={{display: 'none'}}>
                                            <span className="text-2xl font-bold text-gray-400">
                                                {school.name
                                                    ? school.name
                                                          .charAt(0)
                                                          .toUpperCase()
                                                    : "S"}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-400">
                                            {school.name
                                                ? school.name
                                                      .charAt(0)
                                                      .toUpperCase()
                                                : "S"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* School Name and Basic Info */}
                            <div className="flex-1 space-y-2">
                                <h1 className="text-xl font-bold text-gray-900 mb-2">
                                    {school.name}
                                </h1>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            school.category === "TVET"
                                                ? "bg-green-100 text-green-800"
                                                : school.category === "REB"
                                                ? "bg-blue-100 text-blue-800"
                                                : "bg-yellow-100 text-yellow-800"
                                        }`}
                                    >
                                        {school.category}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        {school.code}
                                    </span>
                                </div>
                                <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {school.address || "No address"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg
                                            className="w-6 h-6 text-blue-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">
                                        Students
                                    </p>
                                    <p className="text-2xl font-semibold text-gray-900">
                                        {stats.students}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg
                                            className="w-6 h-6 text-green-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">
                                        Teachers
                                    </p>
                                    <p className="text-2xl font-semibold text-gray-900">
                                        {stats.teachers}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <svg
                                            className="w-6 h-6 text-purple-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">
                                        Classes
                                    </p>
                                    <p className="text-2xl font-semibold text-gray-900">
                                        {stats.classes}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <svg
                                            className="w-6 h-6 text-orange-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">
                                        Exams
                                    </p>
                                    <p className="text-2xl font-semibold text-gray-900">
                                        {stats.exams}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* School Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contact Information */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Contact Information
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">
                                        Phone
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {school.contactPhone || "Not provided"}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">
                                        Email
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {school.contactEmail || "Not provided"}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">
                                        Address
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {school.address || "Not provided"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Academic Information */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Academic Information
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">
                                        Headmaster
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {school.headmaster.fullName ||
                                            "Not assigned"}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">
                                        System Type
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {school.category}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">
                                        Trades Offered
                                    </label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {school.tradesOffered &&
                                        school.tradesOffered.length > 0 ? (
                                            school.tradesOffered.map(
                                                (trade, index) => (
                                                    <span
                                                        key={index}
                                                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                                                    >
                                                        {typeof trade ===
                                                        "object"
                                                            ? trade.name
                                                            : trade}
                                                    </span>
                                                )
                                            )
                                        ) : (
                                            <span className="text-sm text-gray-500">
                                                No trades assigned
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

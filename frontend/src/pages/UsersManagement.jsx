import React, { useState, useEffect } from "react";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import adminService from "../services/adminService";
import authService from "../services/authService";

const UsersManagement = () => {
    const [activeTab, setActiveTab] = useState("teachers");
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showTeacherForm, setShowTeacherForm] = useState(false);
    const [showStudentForm, setShowStudentForm] = useState(false);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");
    const [teacherFormData, setTeacherFormData] = useState({
        fullName: "",
        email: "",
        registrationNumber: "",
        password: "",
    });

    const [studentFormData, setStudentFormData] = useState({
        fullName: "",
        email: "",
        registrationNumber: "",
        password: "",
        classId: "",
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const classesData = await adminService.getAllClasses();
                setClasses(classesData);

                if (classesData.length > 0) {
                    setSelectedClass(classesData[0]._id);
                }

                // Load teachers
                const teachersData = await adminService.getAllTeachers();
                setTeachers(teachersData);
            } catch (error) {
                console.error("Error fetching initial data:", error);
                setError("Failed to load initial data");
            }
        };

        fetchInitialData();
    }, []);
    const fetchStudentsByClass = React.useCallback(async () => {
        if (!selectedClass) return;

        setLoading(true);
        try {
            const studentsData = await adminService.getStudentsByClass(
                selectedClass
            );
            setStudents(studentsData);
        } catch (error) {
            console.error("Error fetching students:", error);
            setError("Failed to load students");
        } finally {
            setLoading(false);
        }
    }, [selectedClass]);
    useEffect(() => {
        if (selectedClass && activeTab === "students") {
            fetchStudentsByClass();
        }
    }, [selectedClass, activeTab, fetchStudentsByClass]);
    

    const handleTeacherFormChange = (e) => {
        const { name, value } = e.target;
        setTeacherFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };    const handleTeacherFormSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");

        try {
            // Ensure registration number is present
            if (!teacherFormData.registrationNumber) {
                // Generate a registration number if not provided
                const prefix = "TEACH";
                const randomDigits = Math.floor(Math.random() * 9000) + 1000;
                const year = new Date().getFullYear().toString().substr(2, 2);
                const registrationNumber = `${prefix}${year}${randomDigits}`;
                teacherFormData.registrationNumber = registrationNumber;
            }
            
            // Create teacher user
            await authService.register({
                ...teacherFormData,
                role: "teacher",
            });

            setFormSuccess("Teacher created successfully!");

            // Reset form and refresh teachers
            setTeacherFormData({
                fullName: "",
                email: "",
                registrationNumber: "",
                password: "",
            });
            setShowTeacherForm(false);

            // Refresh teachers list
            const teachersData = await adminService.getAllTeachers();
            setTeachers(teachersData);
        } catch (error) {
            console.error("Error creating teacher:", error);
            setFormError(error.message || "Failed to create teacher");
        }
    };
    const handleCancel = (formType = "teacher") => {
        if (formType === "teacher") {
            setTeacherFormData({
                fullName: "",
                email: "",
                registrationNumber: "",
                password: "",
            });
            setShowTeacherForm(false);
        } else {
            setStudentFormData({
                fullName: "",
                email: "",
                registrationNumber: "",
                password: "",
                classId: selectedClass,
            });
            setShowStudentForm(false);
        }
        setFormError("");
        setFormSuccess("");
    };

    const handleClassChange = (e) => {
        setSelectedClass(e.target.value);
    };    const generateRegistrationNumber = (type = "teacher") => {
        const prefix = type === "teacher" ? "TEACH" : "STUD";
        const randomDigits = Math.floor(Math.random() * 9000) + 1000;
        const year = new Date().getFullYear().toString().substr(2, 2);
        const registrationNumber = `${prefix}${year}${randomDigits}`;

        if (type === "teacher") {
            setTeacherFormData((prev) => ({
                ...prev,
                registrationNumber,
            }));
        } else {
            setStudentFormData((prev) => ({
                ...prev,
                registrationNumber,
                password: registrationNumber, // Set password same as registration number for students
            }));
        }
    };

    const handleStudentFormChange = (e) => {
        const { name, value } = e.target;
        setStudentFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleStudentFormSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");

        try {
            // Create student user
            await authService.register({
                ...studentFormData,
                role: "student",
            });

            setFormSuccess("Student created successfully!");

            // Reset form and refresh students
            setStudentFormData({
                fullName: "",
                email: "",
                registrationNumber: "",
                password: "",
                classId: selectedClass,
            });
            setShowStudentForm(false);

            // Refresh students list
            fetchStudentsByClass();
        } catch (error) {
            console.error("Error creating student:", error);
            setFormError(error.message || "Failed to create student");
        }
    };

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    Manage Users
                </h1>
            </div>

            {formSuccess && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                    {formSuccess}
                </div>
            )}

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    {error}
                </div>
            )}

            <div className="mb-6 flex border-b">
                <button
                    className={`py-2 px-4 ${
                        activeTab === "teachers"
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-500"
                    }`}
                    onClick={() => setActiveTab("teachers")}
                >
                    Teachers
                </button>
                <button
                    className={`py-2 px-4 ${
                        activeTab === "students"
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-500"
                    }`}
                    onClick={() => setActiveTab("students")}
                >
                    Students
                </button>
            </div>

            {activeTab === "teachers" && (
                <div>
                    <div className="mb-4 flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Teachers</h2>
                        {!showTeacherForm && (
                            <Button
                                onClick={() => setShowTeacherForm(true)}
                                variant="primary"
                            >
                                Add New Teacher
                            </Button>
                        )}
                    </div>

                    {showTeacherForm && (
                        <Card className="mb-6">
                            <h3 className="text-lg font-medium mb-4">
                                Add New Teacher
                            </h3>

                            {formError && (
                                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                                    {formError}
                                </div>
                            )}

                            <form onSubmit={handleTeacherFormSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Full Name
                                        </label>
                                        <Input
                                            name="fullName"
                                            value={teacherFormData.fullName}
                                            onChange={handleTeacherFormChange}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email
                                        </label>
                                        <Input
                                            type="email"
                                            name="email"
                                            value={teacherFormData.email}
                                            onChange={handleTeacherFormChange}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Registration Number
                                            <button
                                                type="button"
                                                onClick={
                                                    generateRegistrationNumber
                                                }
                                                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                                            >
                                                Generate
                                            </button>
                                        </label>
                                        <Input
                                            name="registrationNumber"
                                            value={
                                                teacherFormData.registrationNumber
                                            }
                                            onChange={handleTeacherFormChange}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Password
                                        </label>
                                        <Input
                                            type="password"
                                            name="password"
                                            value={teacherFormData.password}
                                            onChange={handleTeacherFormChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleCancel}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" variant="primary">
                                        Create Teacher
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    )}

                    <Card>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Name
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Email
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Registration Number
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {teachers.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="4"
                                                className="px-6 py-4 text-center text-sm text-gray-500"
                                            >
                                                No teachers found
                                            </td>
                                        </tr>
                                    ) : (
                                        teachers.map((teacher) => (
                                            <tr key={teacher._id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {teacher.fullName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {teacher.email}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {teacher.registrationNumber}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                    >
                                                        View Details
                                                    </Button>
                                                    {/* Additional actions can be added here */}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === "students" && (
                <div>
                    <div className="mb-4 flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Students</h2>
                        <div className="space-x-2">
                            <Button
                                onClick={() => setShowStudentForm(true)}
                                variant="primary"
                            >
                                Add Student
                            </Button>
                            <Button
                                as="a"
                                href="/dean/import-students"
                                variant="secondary"
                            >
                                Import Students
                            </Button>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Class
                        </label>
                        <select
                            value={selectedClass}
                            onChange={handleClassChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            {classes.map((cls) => (
                                <option key={cls._id} value={cls._id}>
                                    {cls.level}
                                    {cls.trade} - Term {cls.term} ({cls.year})
                                </option>
                            ))}
                        </select>
                    </div>

                    {showStudentForm && (
                        <Card className="mb-6">
                            <h3 className="text-lg font-medium mb-4">
                                Add New Student
                            </h3>

                            {formError && (
                                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                                    {formError}
                                </div>
                            )}

                            <form onSubmit={handleStudentFormSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Full Name
                                        </label>
                                        <Input
                                            name="fullName"
                                            value={studentFormData.fullName}
                                            onChange={handleStudentFormChange}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email
                                        </label>
                                        <Input
                                            type="email"
                                            name="email"
                                            value={studentFormData.email}
                                            onChange={handleStudentFormChange}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Registration Number
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    generateRegistrationNumber(
                                                        "student"
                                                    )
                                                }
                                                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                                            >
                                                Generate
                                            </button>
                                        </label>
                                        <Input
                                            name="registrationNumber"
                                            value={
                                                studentFormData.registrationNumber
                                            }
                                            onChange={handleStudentFormChange}
                                            required
                                        />
                                    </div>                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Password
                                            <span className="ml-2 text-xs text-gray-500">(Same as registration number)</span>
                                        </label>
                                        <Input
                                            type="text"
                                            name="password"
                                            value={studentFormData.password}
                                            onChange={handleStudentFormChange}
                                            required
                                            readOnly
                                            className="bg-gray-50"
                                            placeholder="Generated automatically from registration number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Class
                                        </label>
                                        <select
                                            name="classId"
                                            value={
                                                studentFormData.classId ||
                                                selectedClass
                                            }
                                            onChange={handleStudentFormChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        >
                                            {classes.map((cls) => (
                                                <option
                                                    key={cls._id}
                                                    value={cls._id}
                                                >
                                                    {cls.level}
                                                    {cls.trade} - Term{" "}
                                                    {cls.term} ({cls.year})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => handleCancel("student")}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" variant="primary">
                                        Create Student
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    )}

                    <Card>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Name
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Registration Number
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Email
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {students.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="4"
                                                    className="px-6 py-4 text-center text-sm text-gray-500"
                                                >
                                                    No students found in this
                                                    class
                                                </td>
                                            </tr>
                                        ) : (
                                            students.map((student) => (
                                                <tr key={student._id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {student.fullName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {
                                                            student.registrationNumber
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {student.email}
                                                    </td>{" "}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                                                        <Button
                                                            as="a"
                                                            href={`/dean/students/${student._id}/results`}
                                                            variant="secondary"
                                                            size="sm"
                                                        >
                                                            View Results
                                                        </Button>
                                                        <Button
                                                            as="a"
                                                            href={`/dean/students/${student._id}`}
                                                            variant="secondary"
                                                            size="sm"
                                                        >
                                                            View Profile
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </Layout>
    );
};

export default UsersManagement;

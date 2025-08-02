import React, { useState, useEffect } from "react";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import DynamicTable from "../components/class/DynamicTable";
import adminService from "../services/adminService";
import authService from "../services/authService";

// Utility function to validate if a string is a valid MongoDB ObjectId
const isValidObjectId = (id) => {
    return id && id.match(/^[0-9a-fA-F]{24}$/);
};

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
    });    const [studentFormData, setStudentFormData] = useState({
        fullName: "",
        email: "",
        registrationNumber: "",
        password: "",
        classId: "", // Will be set when classes are loaded
    });    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const classesData = await adminService.getAllClasses();
                setClasses(classesData);

                if (classesData.length > 0) {
                    const defaultClassId = classesData[0]._id;
                    setSelectedClass(defaultClassId);
                    
                    // Also initialize the student form with this class ID
                    setStudentFormData(prev => ({
                        ...prev,
                        classId: defaultClassId
                    }));
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
    };    const handleClassChange = (e) => {
        const newClassId = e.target.value;
        setSelectedClass(newClassId);
        
        // Also update the student form data with the new class ID
        setStudentFormData(prev => ({
            ...prev,
            classId: newClassId
        }));
    };const generateRegistrationNumber = (type = "teacher") => {
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
        setStudentFormData((prev) => {
            // If registration number is being changed, update password to match
            if (name === "registrationNumber") {
                return {
                    ...prev,
                    [name]: value,
                    password: value, // Keep password in sync with registration number
                };
            }
            // Otherwise, just update the changed field
            return {
                ...prev,
                [name]: value,
            };
        });
    };    // Utility function to validate if a string is a valid MongoDB ObjectId
    const isValidObjectId = (id) => {
        return id && id.match(/^[0-9a-fA-F]{24}$/);
    };
    
    const handleStudentFormSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");

        try {
            // Validate that the classId exists and is valid
            if (!studentFormData.classId) {
                // If no class is selected, use the currently selected class
                studentFormData.classId = selectedClass;
            }
            
            // Ensure classId is not an empty string and is a valid ObjectId
            if (!studentFormData.classId || !isValidObjectId(studentFormData.classId)) {
                setFormError("Please select a valid class for the student");
                return;
            }
            
            // Create student user with validated data
            const dataToSubmit = {
                ...studentFormData,
                role: "student",
            };
            
            console.log("Submitting student data:", dataToSubmit);
            await authService.register(dataToSubmit);

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
            fetchStudentsByClass();        } catch (error) {
            console.error("Error creating student:", error);
            
            // Check for specific error related to class ID
            if (error.message && (
                error.message.includes("Class ID") || 
                error.message.includes("class") ||
                error.message.includes("Cast to ObjectId failed")
            )) {
                setFormError("Please select a valid class for the student. The class field is required.");
            } else {
                setFormError(error.message || "Failed to create student");
            }
        }
    };

    // Table column definitions
    const teacherColumns = [
        { 
            key: 'fullName', 
            title: 'Name',
            render: (value) => (
                <div className="text-sm font-medium text-gray-900">
                    {value}
                </div>
            )
        },
        { key: 'email', title: 'Email' },
        { 
            key: 'registrationNumber', 
            title: 'Registration Number',
            render: (value) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {value}
                </span>
            )
        }
    ];

    const studentColumns = [
        { 
            key: 'fullName', 
            title: 'Name',
            render: (value) => (
                <div className="text-sm font-medium text-gray-900">
                    {value}
                </div>
            )
        },
        { key: 'email', title: 'Email' },
        { 
            key: 'registrationNumber', 
            title: 'Registration Number',
            render: (value) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {value}
                </span>
            )
        }
    ];

    // Action handlers
    const handleEditTeacher = (teacher) => {
        console.log('Edit teacher:', teacher);
        // Add edit logic here
    };

    const handleDeleteTeacher = async (teacher) => {
        if (!window.confirm(`Are you sure you want to delete ${teacher.fullName}?`)) return;
        
        try {
            await adminService.deleteTeacher(teacher._id);
            // Reload teachers data
            const teachersData = await adminService.getAllTeachers();
            setTeachers(teachersData);
            setFormSuccess('Teacher deleted successfully!');
            setTimeout(() => setFormSuccess(''), 3000);
        } catch (error) {
            console.error('Error deleting teacher:', error);
            setFormError('Failed to delete teacher');
            setTimeout(() => setFormError(''), 3000);
        }
    };

    const handleEditStudent = (student) => {
        console.log('Edit student:', student);
        // Add edit logic here
    };

    const handleDeleteStudent = async (student) => {
        if (!window.confirm(`Are you sure you want to delete ${student.fullName}?`)) return;
        
        try {
            await adminService.deleteStudent(student._id);
            // Reload students for selected class
            if (selectedClass) {
                const studentsData = await adminService.getStudentsByClass(selectedClass);
                setStudents(studentsData);
            }
            setFormSuccess('Student deleted successfully!');
            setTimeout(() => setFormSuccess(''), 3000);
        } catch (error) {
            console.error('Error deleting student:', error);
            setFormError('Failed to delete student');
            setTimeout(() => setFormError(''), 3000);
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
                            <DynamicTable
                                data={teachers}
                                columns={teacherColumns}
                                onEdit={handleEditTeacher}
                                onDelete={handleDeleteTeacher}
                                showActions={true}
                                emptyMessage="No teachers found"
                                containerWidth="100%"
                                containerHeight="auto"
                            />
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
                                        </label>                                        <select
                                            name="classId"
                                            value={
                                                studentFormData.classId ||
                                                selectedClass ||
                                                ""
                                            }
                                            onChange={handleStudentFormChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        >
                                            <option value="">Select a class</option>
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
                                        <div className="text-xs text-gray-500 mt-1">
                                            A class is required for all student accounts
                                        </div>
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
                                <DynamicTable
                                    data={students}
                                    columns={studentColumns}
                                    onEdit={handleEditStudent}
                                    onDelete={handleDeleteStudent}
                                    showActions={true}
                                    emptyMessage="No students found in this class"
                                    containerWidth="100%"
                                    containerHeight="auto"
                                />
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </Layout>
    );
};

export default UsersManagement;

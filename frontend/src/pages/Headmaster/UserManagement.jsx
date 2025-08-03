import React, { useState, useEffect } from "react";
import DynamicTable from "../../components/class/DynamicTable";
import Layout from "../../components/layout/Layout";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Card from "../../components/ui/Card";
import systemAdminService from "../../services/systemAdminService";

export default function UserManagement() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        role: "teacher",
    });
    const [formError, setFormError] = useState("");
    const [isClosing, setIsClosing] = useState(false);
    const [editUser, setEditUser] = useState(null);

    const handleCloseModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowForm(false);
            setIsClosing(false);
            setFormError("");
            setEditUser(null);
        }, 300);
    };

    // Fetch staff
    useEffect(() => {
        const fetchStaff = async () => {
            setLoading(true);
            try {
                const data = await systemAdminService.getAllStaff();
                const staffData = data.staff;

                setStaff(staffData);
            } catch (err) {
                setError(err.message || "Failed to load users");
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, []);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdate = (user) => {
        setEditUser(user);
        setFormData({ fullName: user.fullName, email: user.email, password: '', role: user.role });
        setShowForm(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        try {
            if (editUser) {
                // Update existing user
                await systemAdminService.updateUser(editUser._id, formData);
            } else {
                // Only one dean allowed on create
                if (formData.role === 'dean' && staff.some(u => u.role === 'dean')) {
                    throw new Error('A dean already exists');
                }
                await systemAdminService.createStaff(formData);
            }
             // Refresh
             const staffData = await systemAdminService.getAllStaff();
             setStaff(staffData.staff);
             setShowForm(false);
             setFormData({
                 fullName: "",
                 email: "",
                 password: "",
                 role: "teacher",
             });
            setEditUser(null);
         } catch (err) {
             setFormError(err.message || "Failed to create/update user");
         }
     };

    const handleDelete = async (user) => {
        if (!window.confirm(`Delete ${user.fullName}?`)) return;
        try {
            await systemAdminService.deleteUser(user._id);
            // Refresh
            const staffData = await systemAdminService.getAllStaff();
            setStaff(staffData.staff);
        } catch (err) {
            setError(err.message || "Failed to delete user");
        }
    };

    const columns = [
        { key: "fullName", title: "Name" },
        { key: "email", title: "Email" },
        {key: "subjects", title: "Subjects", render: (subjects)=> subjects.length || '--'},
        { 
            key: "role", 
            title: "Role",
            render: (role) => {
                const baseClasses = 'inline-block px-2 py-0.5 rounded-lg text-xs font-medium';
                if (role === 'dean') {
                    return <span className={`${baseClasses} text-main-green bg-main-green/10`}>Dean</span>;
                } else if (role === 'teacher') {
                    return <span className={`${baseClasses} text-main-blue bg-main-blue/10`}>Teacher</span>;
                }
                return <span className={baseClasses}>{role}</span>;
            }
        }
    ];

    return (
        <Layout>
            <div className="px-8">
                <div className="mb-6 flex justify-between items-center ">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Manage Staff
                    </h1>
                    {!showForm && (
                        <div className="space-x-2">
                            <Button
                                onClick={() => setShowForm(true)}
                                variant="secondary"
                                size="xs"
                            >
                                Add User
                            </Button>
                        </div>
                    )}
                </div>
                <div className="container">
                    {formError && (
                        <div className="mb-4 text-red-600">{formError}</div>
                    )}

                    {(showForm || isClosing) && (
                        <div>
                            {/* Backdrop */}
                            <div
                                className={`fixed inset-0 bg-black/10 bg-opacity-40 transition-opacity duration-300 z-40 ${
                                    showForm && !isClosing
                                        ? "opacity-100"
                                        : "opacity-0"
                                }`}
                                onClick={handleCloseModal}
                            />
                            {/* Modal */}
                            <div
                                className={`fixed top-1/5 left-1/2 transform -translate-x-1/2 w-full max-w-2xl transition-all duration-300 z-50 ${showForm && !isClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                            >
                                <Card className="mb-6">
                                    <h3 className="text-lg font-medium mb-4">{editUser ? 'Update User' : 'Add User'}</h3>
                                    <form
                                        onSubmit={handleFormSubmit}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                    >
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Full Name
                                            </label>
                                            <Input
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleFormChange}
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
                                                value={formData.email}
                                                onChange={handleFormChange}
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
                                                value={formData.password}
                                                onChange={handleFormChange}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Role
                                            </label>
                                            <select
                                                name="role"
                                                value={formData.role}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        role: e.target.value,
                                                    }))
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="teacher">Teacher</option>
                                                <option
                                                    value='dean'
                                                    disabled={staff.some(u => u.role === 'dean') && (!editUser || editUser.role !== 'dean')}
                                                >Dean</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 flex justify-end space-x-6 mt-2">
                                            <Button
                                                variant="secondary"
                                                onClick={handleCloseModal}
                                                size="sm"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                variant="primary"
                                                size="sm"
                                            >
                                                Create
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>
                        </div>
                    )}

                    {error && <div className="mb-4 text-red-600">{error}</div>}

                    <DynamicTable
                        data={staff}
                        columns={columns}
                        onDelete={handleDelete}
                        renderCustomActions={(user) => (
                            <div className="flex space-x-2">
                                <p
                                    className="text-blue-600 cursor-pointer text-xs"
                                    onClick={() => handleUpdate(user)}
                                >
                                    Update
                                </p>
                                <p
                                    className="text-main-red cursor-pointer text-xs"
                                    onClick={() => handleDelete(user)}
                                >
                                    Delete
                                </p>
                            </div>
                        )}
                        showActions={true}
                    />
                    <div />
                </div>
            </div>
        </Layout>
    );
}

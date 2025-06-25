import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/layout/Layout";
import StatsCards from "../../components/dashboard/StatsCards";
import Button from "../../components/ui/Button1";

const AdminDashboard = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({});

    useEffect(() => {
        if (!currentUser || currentUser.role !== "admin") {
            navigate("/login");
        }
    }, [currentUser, navigate]);
    useEffect(() => {
        if (currentUser && currentUser.role === "admin") {
            setStats({
                classCount: 23,
                teacherCount: 244,
                studentCount: 26532,
                examCount: 23,
            });
        }
    }, [currentUser]);

    if (!currentUser || currentUser.role !== "admin") {
        return (
            <div className="flex justify-center items-center py-5">
                Loading...
            </div>
        );
    }
    const topSchools = [
        {
            id: 1,
            name: "mather marry",
            students: 322,
        },
        {
            id: 2,
            name: "john doe",
            students: 422,
        },
        {
            id: 3,
            name: "jane smith",
            students: 522,
        },
    ];
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
    return (
        <Layout>
            <div className="px-10 py-6">
                <div className="h-fit">
                    <StatsCards stats={stats} />
                </div>
                <div className="flex justify-between gap-6">
                    <div className="w-1/2 border rounded-lg border-black/10 px-6 py-4">
                        <div className="flex justify-between mb-4 border-b border-b-black/10">
                            <h1 className="title mb-4">Top schools</h1>
                            <Button to={"/admin/schools"} size="sm" className="h-8">
                                Manage
                            </Button>
                        </div>
                        <table className="w-full bg-black/1">
                            <tr className="flex justify-between border-b-black/10 border-b bg-main-blue/10 px-4 py-2 rounded-t-lg">
                                <td className="">School</td>
                                <td className="">Students</td>
                            </tr>
                            {topSchools.map((school) => (
                                <tr
                                    key={school.id}
                                    className="flex justify-between border-b-black/10 border-b  px-4 py-2"
                                >
                                    <td className="">{school.name}</td>
                                    <td className="">{school.students}</td>
                                </tr>
                            ))}
                        </table>
                    </div>
                    <div className="w-1/2 border rounded-lg border-black/10 px-6 py-4">
                        <div className="flex justify-between mb-4 border-b border-b-black/10">
                            <h1 className="title mb-4">Payment Statuses</h1>
                            <Button to={"/admin/schools"} size="sm" className="h-8">
                                Manage
                            </Button>
                        </div>
                        <table className="w-full bg-black/1">
                            <tr className="flex justify-between border-b-black/10 border-b bg-main-blue/10 px-4 py-2 rounded-t-lg">
                                <td className="">School</td>
                                <td className="">Status</td>
                            </tr>
                            {payments.map((school) => (
                                <tr
                                    key={school.id}
                                    className="flex justify-between border-b-black/10 border-b  px-4 py-2"
                                >
                                    <td className="">{school.name}</td>
                                    <td className={school.status=="active"? 'bg-main-green/10':school.status=="pending"?'bg-yellow-400/10':'bg-main-red/10'}>{school.status}</td>
                                </tr>
                            ))}
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AdminDashboard;

import React, { useEffect, useState } from "react";
import Layout from "../../components/layout/Layout";
import Button from "../../components/ui/Button1";
import { Navigate, useNavigate } from "react-router-dom";
import data from "../../data/schools.json";

export default function SchoolManagement() {
    const [schools, setSchools] = useState([]);
    const navigate = useNavigate();
    
    useEffect(() => {
        setSchools(data);
    }, []);
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
                    <div className="bg-white h-108 mt-6 rounded-lg shadow-sm border border-black/10 overflow-x-auto p-2">
                        <table className="w-full text-left  border-collapse">
                            <thead>
                                <tr className="bg-main-blue/8 border-b border-black/10 sticky -top-2 backdrop-blur-3xl">
                                    <th className="py-3 px-6 text-sm font-medium">
                                        School
                                    </th>
                                    <th className="py-3 px-6 text-sm font-medium">
                                        School code
                                    </th>
                                    <th className="py-3 px-6 text-sm font-medium">
                                        Levels Offered
                                    </th>
                                    <th className="py-3 px-6 text-sm font-medium">
                                        System
                                    </th>
                                    <th className="py-3 px-6 text-sm font-medium">
                                        location
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {schools.map((school, index) => (
                                    <tr
                                        key={index}
                                        onClick={() => navigate(`/admin/school/${school.school_id}`)}
                                        className="border-b bg-white border-gray-100 hover:shadow-lg hover:shadow-black/10 hover:border hover:rounded-lg transition duration-200 hover:cursor-pointer"
                                    >
                                        <td className="py-3 px-6 text-sm">
                                            {school.school_name}
                                        </td>

                                        <td className="py-3 px-6 text-sm">
                                            {school.school_id}
                                        </td>
                                        <td className="py-3 px-6 text-sm">
                                            {school.level_offered.length}
                                        </td>
                                        <td className="py-3 px-6 text-sm">
                                            <span
                                                className={`py-1 px-2 rounded-full text-xs ${
                                                    school.education_system ===
                                                    "TVET"
                                                        ? "bg-main-green/10 text-green-700"
                                                        : "bg-yellow-400/10 text-yellow-700"
                                                }`}
                                            >
                                                {school.education_system}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 text-sm">
                                            {school.location}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Layout>
        </div>
    );
}

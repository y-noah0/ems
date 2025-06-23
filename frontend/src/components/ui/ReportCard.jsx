import React from "react";
import logo from "../../assets/logo.png";

export default function ReportCard({ student, hideLogo }) {
    // Calculate total for each subject and determine if competent
    const calculateResults = (subject) => {
        const total = subject.assI + subject.assII + subject.test + subject.exam;
        const percentage = total;
        const decision = percentage >= 50 ? "Competent" : "Not Competent";
        return { total, percentage, decision };
    };

    // Group subjects by type
    const coreSubjects = Object.entries(student.subjects)
        .filter(([, subject]) => subject.type === "core")
        .map(([name, subject]) => ({ name, ...subject, ...calculateResults(subject) }));

    const complementarySubjects = Object.entries(student.subjects)
        .filter(([, subject]) => subject.type === "complementary")
        .map(([name, subject]) => ({ name, ...subject, ...calculateResults(subject) }));

    // Calculate subtotals
    const coreSubtotal = coreSubjects.reduce((sum, subject) => sum + subject.percentage, 0) / coreSubjects.length;
    const complementarySubtotal = complementarySubjects.reduce((sum, subject) => sum + subject.percentage, 0) / complementarySubjects.length;
    
    // Calculate overall percentage
    const overallPercentage = Math.round((coreSubtotal + complementarySubtotal) / 2);

    return (
        <div className="flex flex-col items-center p-5 w-full h-auto gap-1 text-[8px] bg-white">
            <div className="border flex justify-center w-full">
                <h1>Trainee's Termly Assessment Report</h1>
            </div>
            <div className="border flex justify-between w-full font-bold px-4 py-2">
                <div>
                    {!hideLogo && <img src={logo} alt="" className="w-12.5 h-12.5" />}
                    <p className="">World Mission High School</p>
                </div>
                <div className="flex flex-col">
                    <p>
                        Qualification Code: <span>ICTG45678</span>
                    </p>
                    <p>
                        Mail:{" "}
                        <span className="font-light">
                            worldmissionhighschool@gmail.com
                        </span>
                    </p>
                    <p>
                        Tel: <span className="font-light">07883327287</span>
                    </p>
                    <p>
                        School Code: <span className="font-light">45672</span>
                    </p>
                    <p>Term II</p>
                </div>
            </div>
            <div className="border flex justify-between w-full px-4 py-2">
                <div className="flex flex-col">
                    <p className="font-bold">{student.fullNames}</p>
                    <p>
                        <span className="font-light">{student.class}</span>
                    </p>
                </div>
                <div className="flex flex-col">
                    <p className="font-bold">Code: {student.code}</p>
                    <p>Date: {new Date(student.date).toLocaleDateString()}</p>
                </div>
            </div>
            
            {/* Core Modules Section */}
            <div className="flex flex-col w-full">
                <div className="border flex w-full bg-black/10 border-b-0">
                    <p>Core modules</p>
                </div>
                <table className="border w-full border-black border-collapse">
                    <thead>
                        <tr>
                            <th className="border border-black">Subject</th>
                            <th className="border border-black">
                                Ass I <br />
                                /15
                            </th>
                            <th className="border border-black">
                                Ass II <br />
                                /15
                            </th>
                            <th className="border border-black">
                                Test
                                <br />
                                /10
                            </th>
                            <th className="border border-black">
                                Exams <br />
                                /60
                            </th>
                            <th className="border border-black">
                                Total <br />
                                /%
                            </th>
                            <th className="border border-black">Decision</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coreSubjects.map((subject, index) => (
                            <tr key={index}>
                                <td className="border border-black">{subject.name}</td>
                                <td className="border border-black">{subject.assI}</td>
                                <td className="border border-black">{subject.assII}</td>
                                <td className="border border-black">{subject.test}</td>
                                <td className="border border-black">{subject.exam}</td>
                                <td className="border border-black">{subject.percentage}</td>
                                <td className="border border-black">{subject.decision}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="border flex w-full justify-between font-bold">
                    <p>Sub total</p>
                    <p>{Math.round(coreSubtotal)}%</p>
                </div>
            </div>
            
            {/* Complementary Modules Section */}
            <div className="flex flex-col w-full">
                <div className="border flex w-full bg-black/10 border-b-0">
                    <p>Complementary modules</p>
                </div>
                <table className="border w-full border-black border-collapse">
                    <thead>
                        <tr>
                            <th className="border border-black">Subject</th>
                            <th className="border border-black">
                                Ass I <br />
                                /15
                            </th>
                            <th className="border border-black">
                                Ass II <br />
                                /15
                            </th>
                            <th className="border border-black">
                                Test
                                <br />
                                /10
                            </th>
                            <th className="border border-black">
                                Exams <br />
                                /60
                            </th>
                            <th className="border border-black">
                                Total <br />
                                /%
                            </th>
                            <th className="border border-black">Decision</th>
                        </tr>
                    </thead>
                    <tbody>
                        {complementarySubjects.map((subject, index) => (
                            <tr key={index}>
                                <td className="border border-black">{subject.name}</td>
                                <td className="border border-black">{subject.assI}</td>
                                <td className="border border-black">{subject.assII}</td>
                                <td className="border border-black">{subject.test}</td>
                                <td className="border border-black">{subject.exam}</td>
                                <td className="border border-black">{subject.percentage}</td>
                                <td className="border border-black">{subject.decision}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="border flex w-full justify-between font-bold">
                    <p>Sub total</p>
                    <p>{Math.round(complementarySubtotal)}%</p>
                </div>
            </div>
            
            {/* Overall Results */}
            <div className="border flex w-full justify-between font-bold">
                <div className="flex flex-col">
                    <p>Percentage</p>
                    <p>Position</p>
                </div>
                <div className="flex flex-col">
                    <p>{overallPercentage}%</p>
                    <p>-</p>
                </div>
            </div>

            <div className="border flex w-full py-1">
                <p>School Remarks and signature</p>
            </div>
            <div className="border flex w-full py-4">
                <p>School Manager remarks</p>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../../../components/layout/Layout'
import ReportCard from '../../../components/ui/ReportCard'
import { jsPDF } from 'jspdf'

export default function ClassReports() {
    const [selectedYear, setSelectedYear] = useState('2024-2025');
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');    // PDF generation doesn't need modal state anymore
    
    const studentsData = useMemo(() => [
        {
          "fullNames": "Alice Uwase",
          "class": "L3SOD",
          "code": "STU2025001",
          "date": "2025-06-17",
          "subjects": {
            "Mathematics": { "type": "core", "assI": 13, "assII": 14, "test": 9, "exam": 52 },
            "English": { "type": "complementary", "assI": 12, "assII": 13, "test": 8, "exam": 50 },
            "Physics": { "type": "core", "assI": 11, "assII": 10, "test": 7, "exam": 45 },
            "Computer Science": { "type": "core", "assI": 14, "assII": 15, "test": 10, "exam": 58 }
          }
        },
        {
          "fullNames": "Jean Claude Nshimiyimana",
          "class": "L3NIT",
          "code": "STU2025002",
          "date": "2025-06-17",
          "subjects": {
            "Mathematics": { "type": "core", "assI": 10, "assII": 12, "test": 8, "exam": 47 },
            "English": { "type": "complementary", "assI": 13, "assII": 14, "test": 9, "exam": 55 },
            "Networking": { "type": "core", "assI": 14, "assII": 13, "test": 9, "exam": 56 },
            "ICT": { "type": "complementary", "assI": 13, "assII": 14, "test": 9, "exam": 54 }
          }
        },
        {
          "fullNames": "Sandrine Mukamana",
          "class": "L3MMP",
          "code": "STU2025003",
          "date": "2025-06-17",
          "subjects": {
            "Graphics Design": { "type": "core", "assI": 12, "assII": 13, "test": 9, "exam": 57 },
            "English": { "type": "complementary", "assI": 13, "assII": 14, "test": 10, "exam": 58 },
            "Multimedia Tools": { "type": "core", "assI": 15, "assII": 14, "test": 10, "exam": 59 },
            "Kinyarwanda": { "type": "complementary", "assI": 11, "assII": 12, "test": 9, "exam": 50 }
          }
        },
        {
          "fullNames": "Eric Habimana",
          "class": "L3SOD",
          "code": "STU2025004",
          "date": "2025-06-17",
          "subjects": {
            "Mathematics": { "type": "core", "assI": 12, "assII": 12, "test": 9, "exam": 48 },
            "English": { "type": "complementary", "assI": 14, "assII": 13, "test": 10, "exam": 55 },
            "Physics": { "type": "core", "assI": 13, "assII": 12, "test": 9, "exam": 53 },
            "Computer Science": { "type": "core", "assI": 15, "assII": 15, "test": 10, "exam": 60 }
          }
        },
        {
          "fullNames": "Aline Ishimwe",
          "class": "L3MMP",
          "code": "STU2025005",
          "date": "2025-06-17",
          "subjects": {
            "Graphics Design": { "type": "core", "assI": 14, "assII": 14, "test": 10, "exam": 59 },
            "English": { "type": "complementary", "assI": 12, "assII": 13, "test": 9, "exam": 52 },
            "Multimedia Tools": { "type": "core", "assI": 14, "assII": 15, "test": 10, "exam": 60 },
            "Religion": { "type": "complementary", "assI": 13, "assII": 13, "test": 8, "exam": 49 }
          }
        },
        {
          "fullNames": "Patrick Niyonsenga",
          "class": "L3NIT",
          "code": "STU2025006",
          "date": "2025-06-17",
          "subjects": {
            "Mathematics": { "type": "core", "assI": 11, "assII": 12, "test": 8, "exam": 44 },
            "English": { "type": "complementary", "assI": 13, "assII": 13, "test": 9, "exam": 51 },
            "Networking": { "type": "core", "assI": 14, "assII": 13, "test": 9, "exam": 55 },
            "Business": { "type": "complementary", "assI": 15, "assII": 14, "test": 10, "exam": 58 }
          }
        },
        {
          "fullNames": "Divine Umutoni",
          "class": "L3MMP",
          "code": "STU2025007",
          "date": "2025-06-17",
          "subjects": {
            "Graphics Design": { "type": "core", "assI": 13, "assII": 13, "test": 9, "exam": 53 },
            "English": { "type": "complementary", "assI": 14, "assII": 14, "test": 10, "exam": 56 },
            "Multimedia Tools": { "type": "core", "assI": 15, "assII": 15, "test": 10, "exam": 60 },
            "Kinyarwanda": { "type": "complementary", "assI": 12, "assII": 13, "test": 8, "exam": 50 }
          }
        },
        {
          "fullNames": "Eric Tuyishime",
          "class": "L3SOD",
          "code": "STU2025008",
          "date": "2025-06-17",
          "subjects": {
            "Mathematics": { "type": "core", "assI": 13, "assII": 14, "test": 10, "exam": 55 },
            "English": { "type": "complementary", "assI": 13, "assII": 12, "test": 9, "exam": 50 },
            "Physics": { "type": "core", "assI": 12, "assII": 12, "test": 8, "exam": 48 },
            "Computer Science": { "type": "core", "assI": 15, "assII": 15, "test": 10, "exam": 60 }
          }
        },
        {
          "fullNames": "Nadine Uwera",
          "class": "L3MMP",
          "code": "STU2025009",
          "date": "2025-06-17",
          "subjects": {
            "Graphics Design": { "type": "core", "assI": 14, "assII": 13, "test": 9, "exam": 56 },
            "English": { "type": "complementary", "assI": 14, "assII": 14, "test": 10, "exam": 57 },
            "Multimedia Tools": { "type": "core", "assI": 15, "assII": 14, "test": 10, "exam": 58 },
            "Religion": { "type": "complementary", "assI": 13, "assII": 12, "test": 8, "exam": 48 }
          }
        },
        {
          "fullNames": "Kevin Mugisha",
          "class": "L3NIT",
          "code": "STU2025010",
          "date": "2025-06-17",
          "subjects": {
            "Mathematics": { "type": "core", "assI": 12, "assII": 13, "test": 9, "exam": 50 },
            "English": { "type": "complementary", "assI": 12, "assII": 14, "test": 9, "exam": 53 },
            "ICT": { "type": "complementary", "assI": 14, "assII": 15, "test": 10, "exam": 59 },
            "Networking": { "type": "core", "assI": 13, "assII": 13, "test": 9, "exam": 54 }
          }        }
      ], []);
    
    // Handle academic year selection change
    const handleYearChange = (e) => {
        setSelectedYear(e.target.value);
    };

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    useEffect(() => {
        let filtered = studentsData;
        
        // Filter by search term if one exists
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(student => 
                student.fullNames.toLowerCase().includes(term) || 
                student.code.toLowerCase().includes(term)
            );
        }
        
        setFilteredStudents(filtered);
    }, [searchTerm, studentsData]);
    
    // Handle back button click
    const handleBackClick = () => {
        // Navigate back or to a specific route
        window.history.back();
    };

    // Function to calculate student decision based on their grades
    const getStudentDecision = (student) => {
        // Calculate for each subject
        const subjects = Object.values(student.subjects);
        const totalScores = subjects.map(subject => 
            subject.assI + subject.assII + subject.test + subject.exam
        );
        
        // Calculate average score
        const averageScore = totalScores.reduce((sum, score) => sum + score, 0) / subjects.length;
        const percentage = Math.round(averageScore);
        
        if (percentage >= 70) return "Pass with Distinction";
        if (percentage >= 50) return "Pass";
        return "Fail";
    };

    // Calculate percentage for display
    const getStudentPercentage = (student) => {
        const subjects = Object.values(student.subjects);
        const totalScores = subjects.map(subject => 
            subject.assI + subject.assII + subject.test + subject.exam
        );
        
        const averageScore = totalScores.reduce((sum, score) => sum + score, 0) / subjects.length;
        return Math.round(averageScore) + "%";
    };    // Enhanced PDF generation to match ReportCard design even more closely
    const handlePrintReport = (student) => {
        try {
            // Create PDF with A4 dimensions
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Helper function for drawing bordered boxes
            const drawBox = (x, y, width, height, text, options = {}) => {
                // Draw rectangle border
                pdf.rect(x, y, width, height);
                
                if (options.fillColor) {
                    pdf.setFillColor(options.fillColor[0], options.fillColor[1], options.fillColor[2]);
                    pdf.rect(x, y, width, height, 'F');
                    pdf.setFillColor(255, 255, 255); // Reset fill color
                }
                
                if (text) {
                    const fontSize = options.fontSize || 10;
                    const fontStyle = options.fontStyle || 'normal';
                    const align = options.align || 'left';
                    const textX = align === 'center' ? x + width/2 : x + 3;
                    const textY = y + (options.textYOffset || height/2);
                    
                    pdf.setFontSize(fontSize);
                    pdf.setFont("helvetica", fontStyle);
                    
                    if (align === 'center') {
                        pdf.text(text, textX, textY, { align: 'center' });
                    } else {
                        pdf.text(text, textX, textY);
                    }
                }
            };

            // Define margins and usable page area
            const margin = 15;
            const pageWidth = 210 - 2 * margin;
            const startX = margin;
            let startY = margin;
            const colWidths = [70, 15, 15, 15, 15, 15, 35]; // Column widths for table
            const rowHeight = 8;            // Total width should match pageWidth
            // Confirming that our column widths add up correctly
            const totalWidth = colWidths.reduce((a, b) => a + b, 0);
            if (Math.abs(totalWidth - pageWidth) > 0.1) {
                console.log(`Width mismatch: columns=${totalWidth}, page=${pageWidth}`);
            }

            // Title box
            drawBox(startX, startY, pageWidth, rowHeight, "Trainee's Termly Assessment Report", {
                fontSize: 12, fontStyle: 'bold', align: 'center', textYOffset: 5
            });
            startY += rowHeight;

            // School info header box
            drawBox(startX, startY, pageWidth, rowHeight * 4, null);
            
            // Left side - School name and logo (text only)
            const infoBoxX = startX + 3;
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.text("World Mission High School", infoBoxX, startY + 10);
            
            // Right side - School info
            const infoX = startX + pageWidth - 80;
            pdf.text("Qualification Code:", infoX, startY + 8);
            pdf.setFont("helvetica", "normal");
            pdf.text("ICTG45678", infoX + 35, startY + 8);
            
            pdf.setFont("helvetica", "bold");
            pdf.text("Mail:", infoX, startY + 13);
            pdf.setFont("helvetica", "normal");
            pdf.text("worldmissionhighschool@gmail.com", infoX + 15, startY + 13);
            
            pdf.setFont("helvetica", "bold");
            pdf.text("Tel:", infoX, startY + 18);
            pdf.setFont("helvetica", "normal");
            pdf.text("07883327287", infoX + 15, startY + 18);
            
            pdf.setFont("helvetica", "bold");
            pdf.text("School Code:", infoX, startY + 23);
            pdf.setFont("helvetica", "normal");
            pdf.text("45672", infoX + 30, startY + 23);
            
            pdf.setFont("helvetica", "bold");
            pdf.text("Term II", infoX, startY + 28);
            
            startY += rowHeight * 4;
            
            // Student info box
            drawBox(startX, startY, pageWidth, rowHeight * 2, null);
            
            // Left side - Student name and class
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.text(student.fullNames, infoBoxX, startY + 8);
            
            pdf.setFont("helvetica", "normal");
            pdf.text(student.class, infoBoxX, startY + 14);
            
            // Right side - Student code and date
            pdf.setFont("helvetica", "bold");
            pdf.text("Code:", infoX, startY + 8);
            pdf.text(student.code, infoX + 15, startY + 8);
            
            pdf.setFont("helvetica", "normal");
            pdf.text(`Date: ${new Date(student.date).toLocaleDateString()}`, infoX, startY + 14);
            
            startY += rowHeight * 2;
            
            // Core modules header
            drawBox(startX, startY, pageWidth, rowHeight, "Core modules", {
                fillColor: [240, 240, 240], textYOffset: 5.5, fontSize: 10
            });
            startY += rowHeight;
            
            // Table header row for core modules
            let currentX = startX;
            const headerTexts = ["Subject", "Ass I /15", "Ass II /15", "Test /10", "Exam /60", "Total /%", "Decision"];
            
            for (let i = 0; i < headerTexts.length; i++) {
                drawBox(currentX, startY, colWidths[i], rowHeight, headerTexts[i], {
                    fontStyle: 'bold', fontSize: 9, textYOffset: 5.5
                });
                currentX += colWidths[i];
            }
            startY += rowHeight;
            
            // Core subjects rows
            let coreTotal = 0;
            let coreCount = 0;
            
            Object.entries(student.subjects).forEach(([name, subject]) => {
                if (subject.type === "core") {
                    const total = subject.assI + subject.assII + subject.test + subject.exam;
                    const decision = total >= 50 ? "Competent" : "Not Competent";
                    
                    currentX = startX;
                    drawBox(currentX, startY, colWidths[0], rowHeight, name, { fontSize: 9, textYOffset: 5.5 });
                    currentX += colWidths[0];
                    
                    drawBox(currentX, startY, colWidths[1], rowHeight, subject.assI.toString(), { fontSize: 9, textYOffset: 5.5, align: 'center' });
                    currentX += colWidths[1];
                    
                    drawBox(currentX, startY, colWidths[2], rowHeight, subject.assII.toString(), { fontSize: 9, textYOffset: 5.5, align: 'center' });
                    currentX += colWidths[2];
                    
                    drawBox(currentX, startY, colWidths[3], rowHeight, subject.test.toString(), { fontSize: 9, textYOffset: 5.5, align: 'center' });
                    currentX += colWidths[3];
                    
                    drawBox(currentX, startY, colWidths[4], rowHeight, subject.exam.toString(), { fontSize: 9, textYOffset: 5.5, align: 'center' });
                    currentX += colWidths[4];
                    
                    drawBox(currentX, startY, colWidths[5], rowHeight, total.toString(), { fontSize: 9, textYOffset: 5.5, align: 'center' });
                    currentX += colWidths[5];
                    
                    drawBox(currentX, startY, colWidths[6], rowHeight, decision, { fontSize: 9, textYOffset: 5.5 });
                    
                    startY += rowHeight;
                    coreTotal += total;
                    coreCount++;
                }
            });
            
            // Core subtotal row
            const coreSubtotal = Math.round(coreTotal / coreCount);
            drawBox(startX, startY, pageWidth, rowHeight, null);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            pdf.text("Sub total", startX + 3, startY + 5.5);
            pdf.text(`${coreSubtotal}%`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 5, startY + 5.5);
            
            startY += rowHeight + 2;
            
            // Complementary modules header
            drawBox(startX, startY, pageWidth, rowHeight, "Complementary modules", {
                fillColor: [240, 240, 240], textYOffset: 5.5, fontSize: 10
            });
            startY += rowHeight;
            
            // Table header row for complementary modules
            currentX = startX;
            for (let i = 0; i < headerTexts.length; i++) {
                drawBox(currentX, startY, colWidths[i], rowHeight, headerTexts[i], {
                    fontStyle: 'bold', fontSize: 9, textYOffset: 5.5
                });
                currentX += colWidths[i];
            }
            startY += rowHeight;
            
            // Complementary subjects rows
            let compTotal = 0;
            let compCount = 0;
            
            Object.entries(student.subjects).forEach(([name, subject]) => {
                if (subject.type === "complementary") {
                    const total = subject.assI + subject.assII + subject.test + subject.exam;
                    const decision = total >= 50 ? "Competent" : "Not Competent";
                    
                    currentX = startX;
                    drawBox(currentX, startY, colWidths[0], rowHeight, name, { fontSize: 9, textYOffset: 5.5 });
                    currentX += colWidths[0];
                    
                    drawBox(currentX, startY, colWidths[1], rowHeight, subject.assI.toString(), { fontSize: 9, textYOffset: 5.5, align: 'center' });
                    currentX += colWidths[1];
                    
                    drawBox(currentX, startY, colWidths[2], rowHeight, subject.assII.toString(), { fontSize: 9, textYOffset: 5.5, align: 'center' });
                    currentX += colWidths[2];
                    
                    drawBox(currentX, startY, colWidths[3], rowHeight, subject.test.toString(), { fontSize: 9, textYOffset: 5.5, align: 'center' });
                    currentX += colWidths[3];
                    
                    drawBox(currentX, startY, colWidths[4], rowHeight, subject.exam.toString(), { fontSize: 9, textYOffset: 5.5, align: 'center' });
                    currentX += colWidths[4];
                    
                    drawBox(currentX, startY, colWidths[5], rowHeight, total.toString(), { fontSize: 9, textYOffset: 5.5, align: 'center' });
                    currentX += colWidths[5];
                    
                    drawBox(currentX, startY, colWidths[6], rowHeight, decision, { fontSize: 9, textYOffset: 5.5 });
                    
                    startY += rowHeight;
                    compTotal += total;
                    compCount++;
                }
            });
            
            // Complementary subtotal row
            const compSubtotal = Math.round(compTotal / compCount);
            drawBox(startX, startY, pageWidth, rowHeight, null);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            pdf.text("Sub total", startX + 3, startY + 5.5);
            pdf.text(`${compSubtotal}%`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 5, startY + 5.5);
            
            startY += rowHeight + 2;
            
            // Overall results
            const overallPercentage = Math.round((coreSubtotal + compSubtotal) / 2);
            drawBox(startX, startY, pageWidth, rowHeight * 2, null);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            pdf.text("Percentage", startX + 3, startY + 5.5);
            pdf.text(`${overallPercentage}%`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 5, startY + 5.5);
            
            pdf.text("Position", startX + 3, startY + rowHeight + 5.5);
            pdf.text("-", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 5, startY + rowHeight + 5.5);
            
            startY += rowHeight * 2;
            
            // School remarks
            drawBox(startX, startY, pageWidth, rowHeight, "School Remarks and signature", { fontSize: 9, textYOffset: 5.5 });
            startY += rowHeight;
            
            // Empty box for remarks
            drawBox(startX, startY, pageWidth, rowHeight * 3, null);
            startY += rowHeight * 3;
            
            // School manager remarks
            drawBox(startX, startY, pageWidth, rowHeight, "School Manager remarks", { fontSize: 9, textYOffset: 5.5 });
            startY += rowHeight;
            
            // Empty box for manager remarks
            drawBox(startX, startY, pageWidth, rowHeight * 3, null);
            
            // Open the PDF
            pdf.output('dataurlnewwindow', {filename: `${student.fullNames}_Report.pdf`});
        } catch (error) {
            console.error("PDF generation error:", error);
            alert("Could not generate PDF. Please try again.");
        }
    };

    return (
        <Layout>
            <div className="px-5">
                <div className="flex items-center justify-between h-7">
                    <h1 className='font-bold text-xl mb-8'>Class Reports</h1>
                    <input 
                        type="text" 
                        placeholder='Search for student' 
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="border border-gray-300 rounded-lg h-[30px] text-sm w-[200px] px-3"
                    />
                    <div className="flex justify-between gap-7 h-7">
                        <select 
                            value={selectedYear} 
                            onChange={handleYearChange}
                            className="border border-gray-300 rounded-lg h-[30px] text-sm w-fit px-3"
                        >
                            <option value="2024-2025">2024-2025</option>
                            <option value="2023-2024">2023-2024</option>
                        </select>
                        <button 
                            onClick={handleBackClick}
                            className='border border-gray-300 rounded-lg h-[30px] text-sm w-fit px-3'
                        >
                            Back
                        </button>
                    </div>
                </div>
                
                {/* Upper section - Report Cards (half the original) */}
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 mt-4 border border-gray-200 p-4 rounded-lg">
                    {filteredStudents.slice(0, Math.ceil(filteredStudents.length/2)).map((student, index) => (
                        <div key={index}>
                            <ReportCard student={student} />
                        </div>
                    ))}
                </div>
                
                {/* Bottom section - Student names, decisions, and print buttons */}
                <div className="mt-8 border border-gray-200 p-4 rounded-lg">
                    <h2 className="font-bold text-lg mb-4">Student Reports</h2>
                    
                    {filteredStudents.map((student, index) => (
                        <div key={index} className="mb-2 p-3 bg-white border border-gray-200 rounded-lg flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-gray-800">{student.fullNames}</h3>
                                <div className="flex gap-6 text-sm text-gray-600">
                                    <span>Class: {student.class}</span>
                                    <span>ID: {student.code}</span>
                                    <span>Decision: {getStudentDecision(student)}</span>
                                    <span>Performance: {getStudentPercentage(student)}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => handlePrintReport(student)}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Print
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    )
}
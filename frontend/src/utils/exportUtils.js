import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const exportUtils = {
  // Generate PDF performance report
  generatePerformanceReport: (studentData, results) => {
    // Create new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add school logo/header
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text('School Exam System', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('Performance Report', pageWidth / 2, 30, { align: 'center' });
    
    // Student information
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Student: ${studentData.fullName}`, 20, 45);
    doc.text(`Registration Number: ${studentData.registrationNumber}`, 20, 52);
    doc.text(`Class: ${studentData.class}`, 20, 59);
    doc.text(`Academic Year: ${studentData.year}`, 20, 66);
    doc.text(`Term: ${studentData.term}`, 20, 73);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 80);
    
    // Results table
    if (results && results.length > 0) {
      doc.setFontSize(14);
      doc.text('Subject Performance Summary', pageWidth / 2, 95, { align: 'center' });
      
      // Table header and data
      const tableColumn = ["Subject", "Average Score (%)", "Credits"];
      const tableRows = [];
      
      let totalWeightedScore = 0;
      let totalCredits = 0;
      
      results.forEach(subject => {
        tableRows.push([
          subject.subject,
          subject.averagePercentage.toFixed(2) + '%',
          subject.credits || 1
        ]);
        
        totalWeightedScore += subject.averagePercentage * subject.credits;
        totalCredits += subject.credits;
      });
      
      // Calculate GPA (assuming percentage/20 gives a GPA on 5.0 scale)
      const averagePercentage = totalWeightedScore / totalCredits;
      const gpa = (averagePercentage / 20).toFixed(2);
      
      // Generate the table
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 100,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 51, 102],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        }
      });
      
      // Add overall performance
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text(`Overall Average: ${averagePercentage.toFixed(2)}%`, 20, finalY);
      doc.text(`GPA Equivalent: ${gpa} / 5.0`, 20, finalY + 7);
      
      // Performance comment
      let comment = "";
      if (averagePercentage >= 90) {
        comment = "Excellent performance! Keep up the great work.";
      } else if (averagePercentage >= 80) {
        comment = "Very good performance. Continue to excel in your studies.";
      } else if (averagePercentage >= 70) {
        comment = "Good performance with room for improvement.";
      } else if (averagePercentage >= 60) {
        comment = "Satisfactory performance. Focus on weaker subjects.";
      } else if (averagePercentage >= 50) {
        comment = "Average performance. Needs improvement in most subjects.";
      } else {
        comment = "Below average performance. Requires immediate attention and improvement.";
      }
      
      doc.text('Comment:', 20, finalY + 17);
      doc.setTextColor(50, 50, 50);
      
      const splitComment = doc.splitTextToSize(comment, pageWidth - 40);
      doc.text(splitComment, 20, finalY + 24);
      
      // Detailed subject performance
      if (results.length > 0) {
        // Add a page break if we're already far down the page
        if (finalY + 80 > doc.internal.pageSize.getHeight()) {
          doc.addPage();
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.text('Detailed Subject Performance', pageWidth / 2, 20, { align: 'center' });
          var detailY = 40;
        } else {
          doc.setFontSize(14);
          doc.text('Detailed Subject Performance', pageWidth / 2, finalY + 40, { align: 'center' });
          var detailY = finalY + 60;
        }
        
        // For each subject, show the exam scores
        results.forEach((subject, index) => {
          if (detailY > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            detailY = 20;
          }
          
          doc.setFontSize(12);
          doc.setTextColor(0, 51, 102);
          doc.text(subject.subject, 20, detailY);
          detailY += 7;
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          
          if (subject.submissions && subject.submissions.length > 0) {
            subject.submissions.forEach(submission => {
              doc.text(
                `${submission.examTitle} (${submission.examType.toUpperCase()}): ${submission.score}/${submission.maxScore} (${submission.percentage.toFixed(1)}%)`, 
                30, 
                detailY
              );
              detailY += 7;
            });
          } else {
            doc.text('No exam data available', 30, detailY);
            detailY += 7;
          }
          
          detailY += 10;
        });
      }
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text('School Exam System - Performance Report', 20, doc.internal.pageSize.getHeight() - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      }
    } else {
      doc.setFontSize(12);
      doc.text('No performance data available for this term.', pageWidth / 2, 100, { align: 'center' });
    }
    
    return doc;
  }
};

export default exportUtils;

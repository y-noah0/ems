import React from 'react'
import Layout from '../../../components/layout/Layout'
import ClassCard from '../../../components/ui/ClassCard'

export default function ReportingPage() {
  const classData = [
          {
              className: "Class 1",
              students: [
                  { name: "John Doe", riskLevel: "Below 50%" },
                  { name: "Jane Smith", riskLevel: "Above 50%" },
                  { name: "Alice Johnson", riskLevel: "Below 50%" },
                  { name: "Bob Brown", riskLevel: "Above 50%" },
              ],
              studentsCount: 21,
              belowThresholdPercentage: 60,
              aboveThresholdPercentage: 40,
          },
          {
              className: "Class 2",
              students: [
                  { name: "Charlie White", riskLevel: "Below 50%" },
                  { name: "David Green", riskLevel: "Above 50%" },
                  { name: "Eve Black", riskLevel: "Below 50%" },
                  { name: "Frank Blue", riskLevel: "Above 50%" },
              ],
              studentsCount: 18,
              belowThresholdPercentage: 55,
              aboveThresholdPercentage: 45,
          },
      ];  return (
    <Layout>
      <div className="px-5">
        <h1 className='font-bold text-xl mb-8'>Reports</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
          {classData.map((classItem, index) => (
            <ClassCard key={index} classItem={{...classItem, classId: index}} />
          ))}
        </div>
      </div>
    </Layout>
  )
}

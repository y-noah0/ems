import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import deanService from '../../services/deanService';

const ExamsSection = () => {
  const [exams, setExams] = useState([])

  const getExams = async ()=>{
    const response = await deanService.getExams
    setExams(response )
  }
  useEffect(() => {
    // getExams();
  }, [])
  return (
    <div className="w-">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Exams</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          All Exams
        </button>
      </div>

      <div className="space-y-4">
        {exams.length==0? <Card> 
          <p className="text-gray-600 text-sm text-center">No exams right now</p>
        </Card>: exams.map((exam, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm hover:shadow-lg hover:border-blue-500 transition-all cursor-pointer group"
            tabIndex={0}
            role="button"
            aria-label={`View details for ${exam.title}`}
            onClick={() => alert(`Viewing exam: ${exam.title}`)}
            onKeyPress={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                alert(`Viewing exam: ${exam.title}`);
              }
            }}
            >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
              <div>
              <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">{exam.title}</h4>
              <p className="text-sm text-gray-600">{exam.subject} • {exam.code}</p>
              </div>
              <span className={`text-sm font-medium ${exam.statusColor}`}>
              • {exam.status}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">{exam.description}</p>
            
            <div className="flex flex-col sm:flex-row sm:justify-between text-sm text-gray-600 mb-3 gap-1">
              <div>{exam.time}</div>
              <div>{exam.questions} {exam.score}</div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: '75%' }}></div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <span className="text-sm text-gray-600">20:20</span>
              <button
              className="bg-blue-600 text-white px-4 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto"
              onClick={e => {
                  e.stopPropagation();
                  alert(`Viewing exam: ${exam.title}`);
                }}
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamsSection;
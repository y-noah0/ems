import React, { useState } from 'react';
import DynamicTable from './DynamicTable';
import { FiPlus, FiX, FiEdit } from 'react-icons/fi';

const ManageClasses = () => {
  // Sample data with more items to demonstrate scrolling
  const [classesData, setClassesData] = useState([
    { id: 1, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 2, className: 'L4MEN', rank: 'No. 2', students: '21 students' },
    { id: 3, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 4, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 5, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 6, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 7, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 8, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 9, className: 'L480D', rank: 'No. 3', students: '21 students' },
    { id: 10, className: 'L490D', rank: 'No. 1', students: '22 students' },
    { id: 11, className: 'L470D', rank: 'No. 2', students: '20 students' },
    { id: 12, className: 'L460D', rank: 'No. 3', students: '19 students' },
    { id: 13, className: 'L450D', rank: 'No. 1', students: '23 students' },
    { id: 14, className: 'L440D', rank: 'No. 2', students: '20 students' },
  ]);

  // Define columns for the classes table
  const classesColumns = [
    { key: 'className', title: 'Class' },
    { key: 'rank', title: 'Rank' },
    { key: 'students', title: 'Students' }
  ];

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // New class form state
  const [newClass, setNewClass] = useState({
    year: '',
    trade: ''
  });
  
  // Edit class form state
  const [editClass, setEditClass] = useState({
    id: null,
    year: '',
    trade: '',
    students: '',
    rank: ''
  });

  // Function to extract year and trade from class name
  const parseClassName = (className) => {
    // This is a simple parsing logic - adjust based on your actual naming pattern
    let year = '';
    let trade = '';
    
    // Assuming format like "L4SOD" where L4 is the year and SOD is the trade
    if (className) {
      // Find where numbers end and letters begin again for trade
      const match = className.match(/^([A-Z]+\d+)([A-Z].*)$/);
      
      if (match) {
        year = match[1]; // e.g., "L4"
        trade = match[2]; // e.g., "SOD"
      }
    }
    
    return { year, trade };
  };

  // Handler functions
  const handleEdit = (item) => {
    const { year, trade } = parseClassName(item.className);
    
    setEditClass({
      id: item.id,
      year: year,
      trade: trade,
      students: item.students,
      rank: item.rank
    });
    
    setShowEditModal(true);
  };

  const handleDelete = (item) => {
    console.log('Delete class:', item);
    // Add your delete logic here
    if (window.confirm(`Are you sure you want to delete ${item.className}?`)) {
      setClassesData(classesData.filter(cls => cls.id !== item.id));
    }
  };

  const handleAddClass = () => {
    setNewClass({
      year: '',
      trade: ''
    });
    setShowAddModal(true);
  };
  
  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };
  
  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };
  
  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setNewClass(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditClass(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddSubmit = (e) => {
    e.preventDefault();
    
    // Add validation here
    if (!newClass.year || !newClass.trade) {
      alert('Please fill in all fields');
      return;
    }
    
    // Create class name from form data
    const className = `${newClass.year}${newClass.trade}`;
    
    // Add new class to the list
    const newClassData = {
      id: classesData.length + 1,
      className: className,
      rank: 'No. 3', // Default rank for new classes
      students: '0 students' // New class starts with 0 students
    };
    
    setClassesData(prev => [...prev, newClassData]);
    setShowAddModal(false);
  };
  
  const handleEditSubmit = (e) => {
    e.preventDefault();
    
    // Add validation here
    if (!editClass.year || !editClass.trade) {
      alert('Please fill in all fields');
      return;
    }
    
    // Create updated class name from form data
    const className = `${editClass.year}${editClass.trade}`;
    
    // Update class in the list
    setClassesData(prev => 
      prev.map(cls => 
        cls.id === editClass.id 
          ? { ...cls, className: className }
          : cls
      )
    );
    
    setShowEditModal(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-gray-800">Manage Classes</h1>
        <button 
          onClick={handleAddClass}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1"
        >
          <FiPlus size={18} />
          <span>Add class</span>
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <DynamicTable
          data={classesData}
          columns={classesColumns}
            containerWidth="1040px" // Set exact width
          containerHeight="450px" 
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
      
      {/* Add Class Modal */}
      {showAddModal && (
        <>
          {/* Modal Backdrop */}
          <div 
            className="fixed inset-0 backdrop-blur-sm bg-opacity-30 flex items-center justify-center z-50"
            onClick={handleCloseAddModal}
          >
            {/* Modal Content */}
            <div 
              className="bg-white rounded-lg w-full max-w-sm p-6 relative"
              onClick={e => e.stopPropagation()} // Prevent clicks inside from closing modal
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-800">Add class</h2>
                {/* Close Button */}
                <button 
                  className="text-gray-500 hover:text-gray-700 bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center"
                  onClick={handleCloseAddModal}
                >
                  <FiX size={18} />
                </button>
              </div>
              
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                    Year (Academic)
                  </label>
                  <input
                    type="text"
                    id="year"
                    name="year"
                    value={newClass.year}
                    onChange={handleAddInputChange}
                    placeholder="example: L4, S6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="trade" className="block text-sm font-medium text-gray-700 mb-1">
                    Trade
                  </label>
                  <input
                    type="text"
                    id="trade"
                    name="trade"
                    value={newClass.trade}
                    onChange={handleAddInputChange}
                    placeholder="example: SOD, B"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="pt-2">
                  <button 
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
      
      {/* Edit Class Modal */}
      {showEditModal && (
        <>
          {/* Modal Backdrop */}
          <div 
            className="fixed inset-0 backdrop-blur-sm  bg-opacity-30 flex items-center justify-center z-50"
            onClick={handleCloseEditModal}
          >
            {/* Modal Content */}
            <div 
              className="bg-white rounded-lg w-full max-w-sm p-6 relative"
              onClick={e => e.stopPropagation()} // Prevent clicks inside from closing modal
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-800">Edit class</h2>
                {/* Close Button */}
                <button 
                  className="text-gray-500 hover:text-gray-700 bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center"
                  onClick={handleCloseEditModal}
                >
                  <FiX size={18} />
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label htmlFor="editYear" className="block text-sm font-medium text-gray-700 mb-1">
                    Year (Academic)
                  </label>
                  <input
                    type="text"
                    id="editYear"
                    name="year"
                    value={editClass.year}
                    onChange={handleEditInputChange}
                    placeholder="example: L4, S6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="editTrade" className="block text-sm font-medium text-gray-700 mb-1">
                    Trade
                  </label>
                  <input
                    type="text"
                    id="editTrade"
                    name="trade"
                    value={editClass.trade}
                    onChange={handleEditInputChange}
                    placeholder="example: SOD, B"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="pt-2">
                  <button 
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
                  >
                    <FiEdit size={18} />
                    Save Edits
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ManageClasses;
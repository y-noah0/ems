import React, { useState, useEffect } from 'react';
import DynamicTable from './DynamicTable';
import { FiPlus, FiX, FiEdit } from 'react-icons/fi';
import deanService from '../../services/deanService';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';
import { toast } from 'react-toastify';

const ManageClasses = () => {
  const [classesData, setClassesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Fetch classes data from backend
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const classes = await deanService.getAllClasses();
        
        // Process each class to get student count
        const processedClasses = await Promise.all(classes.map(async (classItem) => {
          try {
            const students = await deanService.getStudentsByClass(classItem._id);
            // Format the class data to match our table structure
            return {
              id: classItem._id,
              className: classItem.name,
              rank: classItem.rank || 'Not ranked',
              students: `${students.length} students`
            };
          } catch (err) {
            console.error(`Error fetching students for class ${classItem._id}:`, err);
            return {
              id: classItem._id,
              className: classItem.name,
              rank: classItem.rank || 'Not ranked',
              students: '0 students'
            };
          }
        }));
        
        setClassesData(processedClasses);
        setError('');
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError('Failed to load classes data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClasses();
  }, []);

  // Function to extract year and trade from class name
  const parseClassName = (className) => {
    let year = '';
    let trade = '';
    
    if (className) {
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

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete ${item.className}?`)) {
      try {
        await deanService.deleteClass(item.id);
        setClassesData(classesData.filter(cls => cls.id !== item.id));
        toast.success(`Class ${item.className} deleted successfully`);
      } catch (err) {
        console.error('Error deleting class:', err);
        toast.error('Failed to delete class');
      }
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
  
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    // Add validation here
    if (!newClass.year || !newClass.trade) {
      toast.error('Please fill in all fields');
      return;
    }
    
    // Create class name from form data
    const className = `${newClass.year}${newClass.trade}`;
    
    try {
      // Add new class to the backend
      const classData = await deanService.createClass({ name: className });
      
      // Add new class to the local state
      const newClassData = {
        id: classData._id,
        className: classData.name,
        rank: classData.rank || 'Not ranked',
        students: '0 students'
      };
      
      setClassesData(prev => [...prev, newClassData]);
      setShowAddModal(false);
      toast.success(`Class ${className} created successfully`);
    } catch (err) {
      console.error('Error creating class:', err);
      toast.error('Failed to create class');
    }
  };
  
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    // Add validation here
    if (!editClass.year || !editClass.trade) {
      toast.error('Please fill in all fields');
      return;
    }
    
    // Create updated class name from form data
    const className = `${editClass.year}${editClass.trade}`;
    
    try {
      // Update class in the backend
      await deanService.updateClass(editClass.id, { name: className });
      
      // Update class in the local state
      setClassesData(prev => 
        prev.map(cls => 
          cls.id === editClass.id 
            ? { ...cls, className: className }
            : cls
        )
      );
      
      setShowEditModal(false);
      toast.success(`Class updated successfully`);
    } catch (err) {
      console.error('Error updating class:', err);
      toast.error('Failed to update class');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

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
        {classesData.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No classes found. Click "Add class" to create one.</div>
        ) : (
          <DynamicTable
            data={classesData}
            columns={classesColumns}
            containerWidth="1040px"
            containerHeight="450px" 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
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
            className="fixed inset-0 backdrop-blur-sm bg-opacity-30 flex items-center justify-center z-50"
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
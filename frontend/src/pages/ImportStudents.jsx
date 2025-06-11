import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import adminService from '../services/adminService';

const ImportStudents = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesData = await adminService.getAllClasses();
        setClasses(classesData);
        if (classesData.length > 0) {
          setSelectedClass(classesData[0]._id);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setError('Failed to load classes');
      }
    };

    fetchClasses();
  }, []);

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type !== 'text/csv') {
      setError('Please upload a CSV file');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a CSV file to upload');
      return;
    }

    if (!selectedClass) {
      setError('Please select a class for the students');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setImportErrors([]);
    
    try {
      const result = await adminService.importStudentsFromCSV(file, selectedClass);
      setSuccess(`Successfully imported ${result.message}`);
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors);
      }
    } catch (error) {
      console.error('Error importing students:', error);
      setError(error.message || 'Failed to import students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Import Students</h1>
        <Button onClick={() => navigate(-1)} variant="secondary">
          Back
        </Button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      <Card>
        <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            To import students, please upload a CSV file with the following columns:
          </p>
          <ul className="list-disc list-inside text-gray-600 text-sm">
            <li>fullName - The full name of the student</li>
            <li>email - A unique email address for the student</li>
            <li>registrationNumber - A unique registration number</li>
          </ul>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Class for Students
            </label>
            <select
              value={selectedClass}
              onChange={handleClassChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.level}{cls.trade} - Term {cls.term} ({cls.year})
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              The default password for imported students will be their registration number
            </p>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Importing...' : 'Import Students'}
            </Button>
          </div>
        </form>
      </Card>

      {importErrors.length > 0 && (
        <Card className="mt-6">
          <h3 className="text-lg font-medium mb-2 text-yellow-700">Import Warnings</h3>
          <p className="mb-2 text-sm text-gray-600">
            The following issues were encountered during import:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-800">
            {importErrors.map((err, index) => (
              <li key={index} className="py-1 border-b border-gray-100">
                {err}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <h3 className="text-lg font-medium mb-2">Example CSV Format</h3>
        <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
          fullName,email,registrationNumber{'\n'}
          John Doe,john.doe@example.com,STU2023001{'\n'}
          Jane Smith,jane.smith@example.com,STU2023002
        </pre>
      </Card>
    </Layout>
  );
};

export default ImportStudents;

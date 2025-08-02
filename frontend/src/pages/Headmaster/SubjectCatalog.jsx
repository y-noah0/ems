import React, { useState, useEffect, useContext, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { ToastContext } from '../../context/ToastContext';
import headmasterService from '../../services/headmasterService';
import DynamicTable from '../../components/class/DynamicTable';

export default function HeadmasterSubjectCatalog() {
  const { showToast } = useContext(ToastContext);
  const [subjects, setSubjects] = useState([]);
  const [trades, setTrades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: '',
    description: '',
    trades: [],
    credits: 1
  });

  const refetchData = useCallback(async () => {
    try {
      const [subjectsData, tradesData] = await Promise.all([
        headmasterService.getSubjectsCatalog(),
        headmasterService.getTradesOffered()
      ]);
      setSubjects(subjectsData);
      setTrades(tradesData);
    } catch {
      showToast('Failed to reload data', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subjectsData, tradesData] = await Promise.all([
          headmasterService.getSubjectsCatalog(),
          headmasterService.getTradesOffered()
        ]);
        setSubjects(subjectsData);
        setTrades(tradesData);
      } catch {
        showToast('Failed to load data', 'error');
      }
    };
    fetchData();
  }, [showToast, refetchData]);

  const handleCreateSubject = async () => {
    if (!newSubject.name || newSubject.trades.length === 0) {
      showToast('Please fill in subject name and select at least one trade', 'error');
      return;
    }
    try {
      await headmasterService.createSubject(newSubject);
      showToast('Subject created successfully', 'success');
      setShowModal(false);
      setNewSubject({ name: '', description: '', trades: [], credits: 1 });
      refetchData();
    } catch {
      showToast('Failed to create subject', 'error');
    }
  };

  const columns = [
    { key: 'name', title: 'Subject Name', width: '200px' },
    { key: 'description', title: 'Description', width: '300px' },
    { 
      key: 'trades', 
      title: 'Trades', 
      width: '200px',
      render: (trades) => trades.map(t => t.name).join(', ')
    },
    { key: 'credits', title: 'Credits', width: '80px' }
  ];

  return (
    <Layout>
      <div className="px-6 py-4">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Subject Catalog</h1>
            <p className="text-gray-600">View subjects for your school's trades and add custom subjects</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            Add Custom Subject
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Available Subjects ({subjects.length})
            </h2>
          </div>
          <div className="p-6">
            <DynamicTable
              data={subjects}
              columns={columns}
              showActions={false}
              emptyMessage="No subjects available for your school's trades."
              containerWidth="100%"
              containerHeight="500px"
            />
          </div>
        </div>

        {/* Create Subject Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Subject</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    value={newSubject.name}
                    onChange={e => setNewSubject({...newSubject, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter subject name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newSubject.description}
                    onChange={e => setNewSubject({...newSubject, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter subject description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Applicable Trades *
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                    {trades.map(trade => (
                      <label key={trade._id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newSubject.trades.includes(trade._id)}
                          onChange={e => {
                            const updatedTrades = e.target.checked
                              ? [...newSubject.trades, trade._id]
                              : newSubject.trades.filter(id => id !== trade._id);
                            setNewSubject({...newSubject, trades: updatedTrades});
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{trade.name} ({trade.code})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newSubject.credits}
                    onChange={e => setNewSubject({...newSubject, credits: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setNewSubject({ name: '', description: '', trades: [], credits: 1 });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateSubject}>
                  Create Subject
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

import React, { useState, useEffect, useContext, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { ToastContext } from '../../context/ToastContext';
import DynamicTable from '../../components/class/DynamicTable';
import { useAuth } from '../../context/AuthContext';
import tradeService from '../../services/tradeService';
import subjectService from '../../services/subjectService';

export default function HeadmasterSubjectCatalog() {
  const user = useAuth();
  const schoolId = user?.currentUser.school;
  
  const { showToast } = useContext(ToastContext);

  const [subjects, setSubjects] = useState([]);
  const [trades, setTrades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [newSubject, setNewSubject] = useState({
    name: '',
    description: '',
    trades: [],
    credits: 1
  });

  const refetchData = useCallback(async () => {
    try {
      const [subjectsData, tradesData] = await Promise.all([
        subjectService.getSubjects(schoolId),
        tradeService.getTradesBySchool(schoolId),
      ]);
      setSubjects(subjectsData);
      setTrades(tradesData);
    } catch {
      showToast('Failed to reload data', 'error');
    }
  }, [showToast, schoolId]);

  useEffect(() => {
    refetchData();
  }, [refetchData]);

  // handle create or update
  const handleSubmitSubject = async () => {
    if (!newSubject.name || newSubject.trades.length === 0) {
      showToast('Please fill in subject name and select at least one trade', 'error');
      return;
    }
    try {
      if (editingSubjectId) {
        await subjectService.updateSubject(editingSubjectId, { ...newSubject, schoolId });
        showToast('Subject updated successfully', 'success');
      } else {
        await subjectService.createSubject({ ...newSubject, schoolId });
        showToast('Subject created successfully', 'success');
      }
      setShowModal(false);
      setEditingSubjectId(null);
      setNewSubject({ name: '', description: '', trades: [], credits: 1 });
      refetchData();
    } catch (err) {
      console.error('Error saving subject:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save subject';
      showToast(msg, 'error');
    }
  };

  const handleEdit = (subject) => {
    setEditingSubjectId(subject._id);
    setNewSubject({
      name: subject.name,
      description: subject.description || '',
      trades: subject.trades.map(t => t._id),
      credits: subject.credits
    });
    setShowModal(true);
  };

  const handleDelete = async (subject) => {
    if (!window.confirm(`Delete subject "${subject.name}"? This cannot be undone.`)) return;
    try {
      await subjectService.deleteSubject(subject._id, { schoolId });
      showToast('Subject deleted', 'success');
      refetchData();
    } catch (err) {
      console.error('Error deleting subject:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete subject';
      showToast(msg, 'error');
    }
  };

  const columns = [
    { key: 'name', title: 'Subject Name', width: '200px' },
    { key: 'description', title: 'Description', width: '300px' },
    { 
      key: 'trades', 
      title: 'Trades', 
      width: '200px',
      render: (trades) => (
        <div className='flex flex-wrap gap-2 bg-gray-800/20 w-fit px-3 rounded items-center'>
          {trades.map(t => <span key={t._id} className="text-sm">{t.code.toLowerCase()}</span>)}
        </div>
      )
    },
    { key: 'credits', title: 'Credits', width: '80px' }
  ];

  return (
    <Layout>
      <div className="px-6 py-4">
        <div className="mb-6 flex justify-between items-start">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Subject Catalog</h1>
          <Button onClick={() => { setShowModal(true); setEditingSubjectId(null); }} size='sm'>
            Add Subject
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <DynamicTable
              data={subjects}
              columns={columns}
              showActions={true}
              onEdit={handleEdit}
              onDelete={handleDelete}
              emptyMessage="No subjects available for your school's trades."
              containerWidth="100%"
              containerHeight="500px"
            />
          </div>
        </div>

        {/* Create / Edit Subject Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingSubjectId ? 'Edit Subject' : 'Add Subject'}
              </h3>
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
                <Button variant="outline" onClick={() => {
                  setShowModal(false);
                  setEditingSubjectId(null);
                  setNewSubject({ name: '', description: '', trades: [], credits: 1 });
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitSubject}>
                  {editingSubjectId ? 'Save Changes' : 'Create Subject'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

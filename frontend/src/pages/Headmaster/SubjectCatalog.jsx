import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { ToastContext } from '../../context/ToastContext';
import DynamicTable from '../../components/class/DynamicTable';
import { useAuth } from '../../context/AuthContext';
import tradeService from '../../services/tradeService';
import subjectService from '../../services/subjectService';
import { FaBook, FaSearch, FaFilter, FaPlus, FaChevronDown, FaSpinner } from 'react-icons/fa';

export default function HeadmasterSubjectCatalog() {
  const user = useAuth();
  const schoolId = user?.currentUser?.school; // Safe navigation

  const { showToast } = useContext(ToastContext);

  const [subjects, setSubjects] = useState([]);
  const [trades, setTrades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [newSubject, setNewSubject] = useState({
    name: '',
    description: '',
    trades: [],
    credits: 1,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrade, setFilterTrade] = useState(null);
  const [showTradeDropdown, setShowTradeDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const tradeDropdownRef = useRef(null);

  const refetchData = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      showToast('No school associated with your account. Please log in again.', 'error');
      return;
    }
    setLoading(true);
    try {
      const [subjectsData, tradesData] = await Promise.all([
        subjectService.getSubjects(schoolId),
        tradeService.getTradesBySchool(schoolId),
      ]);
      setSubjects(subjectsData || []);
      setTrades(tradesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load data', 'error');
      setSubjects([]);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [showToast, schoolId]);

  useEffect(() => {
    refetchData();
  }, [refetchData]);

  // Handle click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tradeDropdownRef.current && !tradeDropdownRef.current.contains(event.target)) {
        setShowTradeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search handler
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };
  const debouncedSetSearchTerm = debounce((value) => setSearchTerm(value), 300);

  // Filter subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch =
        searchTerm === '' ||
        (subject.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (subject.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTrade = !filterTrade || subject.trades.some((t) => t._id === filterTrade.value);
      return matchesSearch && matchesTrade;
    });
  }, [subjects, searchTerm, filterTrade]);

  // Handle create or update
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
      trades: subject.trades.map((t) => t._id),
      credits: subject.credits,
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
        <div className="flex flex-wrap gap-2 bg-indigo-50/50 w-fit px-3 rounded items-center">
          {trades.map((t) => (
            <span key={t._id} className="text-sm text-indigo-700 font-medium">
              {t.code.toLowerCase()}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'credits', title: 'Credits', width: '80px' },
  ];

  const tradeOptions = trades.map((trade) => ({ value: trade._id, label: `${trade.name} (${trade.code})` }));

  return (
    <Layout>
      <div className="px-4 sm:px-6 py-4 w-full max-w-7xl mx-auto font-roboto">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg p-4 sm:p-6 shadow-lg animate-fade-in">
          <div className="flex items-center gap-3 sm:gap-4">
            <FaBook className="h-8 sm:h-10 w-8 sm:w-10 text-white" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Subject Catalog</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-white/70" />
              <input
                type="text"
                placeholder="Search subjects..."
                className="pl-10 pr-4 py-2 w-full bg-white/90 border border-indigo-300 rounded-full text-sm sm:text-base text-gray-900 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition duration-200 placeholder-gray-500"
                onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                aria-label="Search subjects"
              />
            </div>
            <div ref={tradeDropdownRef} className="relative w-full sm:w-auto">
              <button
                className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-white/90 border border-indigo-300 rounded-md text-sm sm:text-base text-gray-900 w-full sm:min-w-[140px] hover:bg-indigo-50 transition duration-200"
                onClick={() => setShowTradeDropdown(!showTradeDropdown)}
                aria-label="Select trade filter"
                aria-expanded={showTradeDropdown}
              >
                <FaFilter className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                {filterTrade?.label || 'Filter by Trade'}
                <FaChevronDown
                  className={`h-4 sm:h-5 w-4 sm:w-5 text-indigo-600 transition-transform ${showTradeDropdown ? 'rotate-180' : ''}`}
                />
              </button>
              {showTradeDropdown && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-indigo-200 rounded-lg shadow-xl z-20 overflow-hidden animate-slide-down">
                  <button
                    className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${!filterTrade ? 'bg-indigo-50 text-indigo-600 font-medium' : 'hover:bg-indigo-50'}`}
                    onClick={() => {
                      setFilterTrade(null);
                      setShowTradeDropdown(false);
                    }}
                  >
                    <FaFilter className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                    All Trades
                  </button>
                  {tradeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={`block w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base flex items-center gap-2 ${filterTrade?.value === opt.value ? 'bg-indigo-50 text-indigo-600 font-medium' : 'hover:bg-indigo-50'}`}
                      onClick={() => {
                        setFilterTrade(opt);
                        setShowTradeDropdown(false);
                      }}
                    >
                      <FaFilter className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={() => { setShowModal(true); setEditingSubjectId(null); }}
              size="sm"
              className="flex items-center gap-2 bg-indigo-600  text-indigo-600 hover:bg-indigo-500 border border-indigo-300 rounded-md px-3 sm:px-4 py-2 transition duration-200"
            >
              <FaPlus className="h-4 sm:h-5 w-4 sm:w-5" />
              Add Subject
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12 min-h-[450px]">
                <FaSpinner className="h-10 w-10 text-indigo-600 animate-spin" aria-hidden="true" />
              </div>
            ) : (
              <DynamicTable
                data={filteredSubjects}
                columns={columns}
                showActions={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
                emptyMessage="No subjects available for your school's trades."
                containerWidth="100%"
                containerHeight="500px"
                className="hover:shadow-xl transition-shadow duration-300"
              />
            )}
          </div>
        </div>

        {/* Create / Edit Subject Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 border-2 border-gradient-to-r from-indigo-600 to-indigo-800 animate-scale-in">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaBook className="h-5 w-5 text-indigo-600" />
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
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 placeholder-gray-400"
                    placeholder="Enter subject name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newSubject.description}
                    onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 placeholder-gray-400"
                    rows={3}
                    placeholder="Enter subject description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Applicable Trades *
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50/50">
                    {trades.map((trade) => (
                      <label key={trade._id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newSubject.trades.includes(trade._id)}
                          onChange={(e) => {
                            const updatedTrades = e.target.checked
                              ? [...newSubject.trades, trade._id]
                              : newSubject.trades.filter((id) => id !== trade._id);
                            setNewSubject({ ...newSubject, trades: updatedTrades });
                          }}
                          className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-900">{trade.name} ({trade.code})</span>
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
                    onChange={(e) => setNewSubject({ ...newSubject, credits: parseInt(e.target.value) || 1 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSubjectId(null);
                    setNewSubject({ name: '', description: '', trades: [], credits: 1 });
                  }}
                  className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition duration-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitSubject}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white transition duration-200"
                >
                  {editingSubjectId ? 'Save Changes' : 'Create Subject'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        .font-roboto {
          font-family: 'Roboto', sans-serif;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .border-gradient-to-r {
          border-image: linear-gradient(to right, #4B5EAA, #6B46C1) 1;
        }
      `}</style>
    </Layout>
  );
}
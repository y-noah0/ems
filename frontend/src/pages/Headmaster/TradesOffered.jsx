import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { ToastContext } from '../../context/ToastContext';
import headmasterService from '../../services/headmasterService';

export default function TradesCatalog() {
  const navigate = useNavigate();
  const { showToast } = useContext(ToastContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [undoTimeout, setUndoTimeout] = useState(null);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [trades, setTrades] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = useMemo(() => {
    const uniqueCats = Array.from(new Set(trades.map(t => t.category).filter(Boolean)));
    return ['All', ...uniqueCats];
  }, [trades]);

  useEffect(() => { 
    const fetchData = async () => {
      try {
        const offered = await headmasterService.getTradesOffered();
        setTrades(offered);
      } catch (error) {
        showToast('Failed to load trades: ' + error.message, 'error');
      }
    };
    fetchData();
  }, [showToast]);
  const filterTrades = (list) => {
    let filtered = list;
    if (activeCategory && activeCategory !== "All") {
      filtered = filtered.filter(t => t.category === activeCategory);
    }
    if (!searchTerm) return filtered;
    return filtered.filter(
      t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  const getAllTrades = () => filterTrades(trades);

  const handleAdd = async () => {
    if (!selected) return;
    try {
      const updated = await headmasterService.addTradeOffered(selected);
      setOffered(updated);
      setSelected('');
      showToast('Trade added', 'success');
    } catch {
      showToast('Failed to add trade', 'error');
    }
  };

  // Initiate removal with confirmation
  const handleRemove = (trade, e) => {
    e.stopPropagation();
    setDeleteConfirmation({
      id: trade._id,
      name: trade.name,
      action: () => confirmRemove(trade)
    });
  };

  // Confirm removal, allow undo
  const confirmRemove = (trade) => {
    setLastDeleted(trade);
    setOffered(prev => prev.filter(t => t._id !== trade._id));
    showToast(`${trade.name} removed (undo available)`, 'success');
    const timeout = setTimeout(async () => {
      try {
        await headmasterService.removeTradeOffered(trade._id);
      } catch (err) {
        showToast(err.message || 'Failed to remove trade', 'error');
      } finally {
        setLastDeleted(null);
        setUndoTimeout(null);
      }
    }, 5000);
    setUndoTimeout(timeout);
    setDeleteConfirmation(null);
  };

  // Undo removal
  const handleUndo = () => {
    if (undoTimeout && lastDeleted) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
      setOffered(prev => [lastDeleted, ...prev]);
      setLastDeleted(null);
      showToast('Removal undone', 'info');
    }
  };

  return (
    <Layout>
      <div className="px-6 py-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Trades Management</h1>
          <p className="text-gray-600">Manage trades offered by your school</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Add New Trade</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-grow">
                <input
                  type="text"
                  placeholder="Search trades to add..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-shrink-0 min-w-[200px]">
                <select
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select trade to add</option>
                  {filteredAvailable.map(t => (
                    <option key={t._id} value={t._id}>{`${t.name} (${t.code})`}</option>
                  ))}
                </select>
              </div>
              <Button 
                onClick={handleAdd}
                disabled={!selected}
                className="flex-shrink-0"
              >
                Add Trade
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Current Trades ({offered.length})
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trade Name / Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {offered.map(trade => (
                    <tr key={trade._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{trade.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{trade.code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.level}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={(e) => handleRemove(trade, e)} className="text-red-600 hover:text-red-900 transition-colors">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {offered.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No trades offered yet. Add trades from above.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Remove Trade</h3>
                  <p className="text-sm text-gray-500">
                    Are you sure you want to remove "{deleteConfirmation.name}"? This action can be undone within 5 seconds.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setDeleteConfirmation(null)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={deleteConfirmation.action} className="bg-red-600 hover:bg-red-700">
                  Remove
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Undo Toast */}
        {undoTimeout && (
          <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg flex items-center space-x-3 z-50">
            <span>Trade removed successfully</span>
            <Button size="sm" onClick={handleUndo} className="bg-blue-600 hover:bg-blue-700">
              Undo
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

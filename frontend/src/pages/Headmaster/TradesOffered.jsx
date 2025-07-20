import React, { useState, useEffect, useContext } from 'react';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { ToastContext } from '../../context/ToastContext';
import headmasterService from '../../services/headmasterService';
import tradeService from '../../services/tradeService';
import DynamicTable from '../../components/class/DynamicTable';

export default function TradesOffered() {
  const { showToast } = useContext(ToastContext);
  const [offered, setOffered] = useState([]);
  const [allTrades, setAllTrades] = useState([]);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tOff = await headmasterService.getTradesOffered();
        setOffered(tOff);
        const tAll = await tradeService.getAllTrades();
        setAllTrades(tAll);
      } catch {
        showToast('Failed to load trades', 'error');
      }
    };
    fetchData();
  }, [showToast]);

  const available = allTrades.filter(t => !offered.some(o => o._id === t._id));
  const filteredAvailable = available.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase())
  );

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

  const handleRemove = async (id) => {
    try {
      const updated = await headmasterService.removeTradeOffered(id);
      setOffered(updated);
      showToast('Trade removed', 'info');
    } catch {
      showToast('Failed to remove trade', 'error');
    }
  };

  // Define table columns
  const columns = [
    { key: 'name', title: 'Trade Name', width: '200px' },
    { key: 'code', title: 'Code', width: '100px' },
    { key: 'type', title: 'Type', width: '120px' },
    { key: 'level', title: 'Level', width: '100px' }
  ];

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
            <DynamicTable
              data={offered}
              columns={columns}
              onDelete={item => handleRemove(item._id)}
              showActions={true}
              emptyMessage="No trades offered yet. Add trades from the catalog above."
              containerWidth="100%"
              containerHeight="400px"
              renderCustomActions={(item) => (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(item._id)}
                  className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                >
                  Remove
                </Button>
              )}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

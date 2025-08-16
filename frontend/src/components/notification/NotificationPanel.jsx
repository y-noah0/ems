import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { FaBell, FaFilter, FaTimes, FaCheckDouble, FaTrashAlt, FaSearch } from 'react-icons/fa';

// Revamped notification panel (design language: subtle borders, small fonts, rounded, utility classes)
const NotificationPanel = ({ onClose }) => {
  const panelRef = useRef(null);
  // Notification context (assumes provider present)
  const {
    notifications = [],
    removeNotification = () => {},
    handleNotificationClick = () => {},
    markAllAsRead = () => {},
    markAsRead = () => {},
  } = useNotifications();

  // UI state
  const [filter, setFilter] = useState('all'); // all | unread | review | system
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Determine relative day grouping
  const groupLabel = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = now.setHours(0,0,0,0) - d.setHours(0,0,0,0);
    if (diff === 0) return 'Today';
    if (diff === 86400000) return 'Yesterday';
    return d.toLocaleDateString();
  };

  // Badge color mapping (tailwind utility style classes consistent w/ design)
  const typeBadge = (type) => {
    const map = {
      review_request: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      grade: 'bg-green-100 text-green-700 border-green-200',
      exam: 'bg-blue-100 text-blue-700 border-blue-200',
      system: 'bg-gray-200 text-gray-700 border-gray-300'
    };
    const cls = map[type] || 'bg-gray-100 text-gray-600 border-gray-200';
    const label = (type || 'other').replace(/_/g,' ');
    return <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
  };

  // Filter + search
  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'unread' && n.read) return false;
      if (filter === 'review' && n.type !== 'review_request') return false;
      if (filter === 'system' && n.type !== 'system') return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (n.title || '').toLowerCase().includes(q) || (n.message || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [notifications, filter, search]);

  // Group by date label
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(n => {
      const label = groupLabel(n.timestamp || n.createdAt || Date.now());
      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    });
    // Preserve chronological: Today, Yesterday, then others
    const order = Object.keys(groups).sort((a,b) => {
      // Put Today first, then Yesterday, then by date desc
      if (a === 'Today') return -1; if (b === 'Today') return 1;
      if (a === 'Yesterday') return -1; if (b === 'Yesterday') return 1;
      // Parse dates fallback
      const da = new Date(a).getTime();
      const db = new Date(b).getTime();
      return db - da;
    });
    return order.map(label => ({ label, items: groups[label] }));
  }, [filtered]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleItemClick = (n) => {
    if (!n.read) markAsRead(n.id);
    handleNotificationClick(n);
  };

  return (
    <div ref={panelRef} className="absolute -right-20 top-4 mt-2 w-[380px] h-140 flex flex-col z-50 rounded-xl shadow-lg border border-black/10 bg-white overflow-hidden" style={{ fontSize: '13px' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-black/10 bg-gradient-to-r from-white to-gray-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
          <FaBell className="text-blue-500" /> Notifications
          {unreadCount > 0 && <span className="ml-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">{unreadCount} new</span>}
        </div>
        <div className="flex items-center gap-2">
          <button className="text-[11px] px-2 py-1 rounded-md border border-black/10 hover:bg-gray-100 text-gray-600 flex items-center gap-1" onClick={() => setShowFilters(p=>!p)}>
            <FaFilter className="text-gray-500" /> {showFilters ? 'Hide' : 'Filters'}
          </button>
          <button className="text-[11px] px-2 py-1 rounded-md border border-black/10 hover:bg-gray-100 text-gray-600 flex items-center gap-1" onClick={markAllAsRead} disabled={!unreadCount}>
            <FaCheckDouble className="text-green-600" /> Read
          </button>
          <button className="text-[11px] px-2 py-1 rounded-md border border-black/10 hover:bg-gray-100 text-gray-600 flex items-center" onClick={onClose} aria-label="Close panel">
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-black/10 bg-white space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <button onClick={()=>setFilter('all')} className={`px-2.5 py-1 rounded-full border text-[11px] ${filter==='all'?'bg-blue-600 text-white border-blue-600':'border-black/10 text-gray-600 hover:bg-gray-100'}`}>All</button>
            <button onClick={()=>setFilter('unread')} className={`px-2.5 py-1 rounded-full border text-[11px] ${filter==='unread'?'bg-blue-600 text-white border-blue-600':'border-black/10 text-gray-600 hover:bg-gray-100'}`}>Unread</button>
            <button onClick={()=>setFilter('review')} className={`px-2.5 py-1 rounded-full border text-[11px] ${filter==='review'?'bg-blue-600 text-white border-blue-600':'border-black/10 text-gray-600 hover:bg-gray-100'}`}>Review</button>
            <button onClick={()=>setFilter('system')} className={`px-2.5 py-1 rounded-full border text-[11px] ${filter==='system'?'bg-blue-600 text-white border-blue-600':'border-black/10 text-gray-600 hover:bg-gray-100'}`}>System</button>
          </div>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3 w-3" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search notifications..." className="w-full pl-8 pr-3 py-2 rounded-md border border-black/10 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 text-[12px] outline-none" />
            {search && <button onClick={()=>setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><FaTimes /></button>}
          </div>
        </div>
      )}

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {grouped.length === 0 && (
          <div className="py-16 text-center text-gray-500 text-[12px]">
            <div className="mb-2 text-xl">📭</div>
            {search ? 'No matches for your search.' : 'No notifications'}
          </div>
        )}
        {grouped.map(section => (
          <div key={section.label} className="px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
              <span>{section.label}</span>
              <span className="h-px flex-1 bg-gradient-to-r from-gray-300/60 to-transparent" />
            </div>
            <div className="space-y-2">
              {section.items.map(n => {
                const unread = !n.read;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`group relative border border-black/10 rounded-lg px-4 py-3 bg-white hover:bg-gray-50 transition shadow-sm ${unread ? 'ring-1 ring-blue-100' : ''}`}
                  >
                    {/* Unread indicator bar */}
                    {unread && <span className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-l-lg" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition text-xs"
                      aria-label="Remove notification"
                    ><FaTrashAlt /></button>
                    <div className="flex items-start gap-3 pr-6">
                      <div className="flex flex-col items-center pt-0.5">
                        {/* Icon / dot placeholder */}
                        <div className={`h-2.5 w-2.5 rounded-full ${unread ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <div className="text-[12px] font-semibold text-gray-800 truncate max-w-[180px]">{n.title || 'Notification'}</div>
                          {typeBadge(n.type)}
                          {n.priority === 'high' && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">HIGH</span>}
                        </div>
                        <div className="text-[11px] leading-relaxed text-gray-700 break-words">
                          {n.message || ''}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-[10px] text-gray-400">{formatTime(n.timestamp || n.createdAt)}</div>
                          {unread && <button onClick={(e)=>{e.stopPropagation(); markAsRead(n.id);}} className="text-[10px] text-blue-600 hover:underline">Mark read</button>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer quick actions */}
      <div className="px-4 py-2 border-t border-black/10 flex items-center justify-between bg-gray-50 text-[11px]">
        <div className="text-gray-500">{notifications.length} total</div>
        <div className="flex items-center gap-3">
          <button onClick={markAllAsRead} disabled={!unreadCount} className={`hover:text-blue-600 ${!unreadCount ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500'}`}>Mark all read</button>
          <button onClick={()=>notifications.forEach(n=>removeNotification(n.id))} className="text-gray-500 hover:text-red-600">Clear</button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;

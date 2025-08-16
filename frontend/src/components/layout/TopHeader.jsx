import React, { useRef, useEffect, useState } from 'react';
import { FaSearch, FaRegBell, FaChevronDown } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import NotificationPanel from '../notification/NotificationPanel';
import { useNotifications } from '../../context/NotificationContext';

const TopHeader = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount = 0 } = useNotifications();
  const [showMenu, setShowMenu] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationCount = unreadCount;

  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    console.log(`Searching for: ${searchValue}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="bg-white border-b border-black/10 p-1 sm:p-2 md:px-10">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className='flex'></div>
          <form className="max-w-2xl w-100" onSubmit={handleSearch}>
            <div className="flex items-center border border-black/10 rounded-[10px] bg-white hover:shadow-sm transition-all focus:shadow-sm p-[1.5px]">
              <input
                type="text"
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex-1 px-3 py-2 text-sm text-gray-700 bg-transparent focus:outline-none"
                aria-label="Search"
              />
              <button type="submit" className="p-2 mr-[1.5px] border border-black/10 rounded-[10px] hover:bg-main-gray/5 transition" aria-label="Submit search">
                <FaSearch className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="flex items-center space-x-3 ml-30">
            <div className="relative" ref={notifRef}>
              <button
                className="p-2 rounded-[10px]  hover:bg-black/5 text-main-gray border border-black/10 focus:ring-2 focus:ring-blue-400 transition"
                aria-label="Notifications"
                onClick={() => setShowNotifications(v => !v)}
              >
                <FaRegBell className="h-5 w-5 text-black" strokeWidth={0.5} />
              </button>
              {notificationCount > 0 && !showNotifications && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full px-1.5 shadow-sm">
                  {notificationCount}
                </span>
              )}
              {showNotifications && (
                <div className="absolute right-0">
                  <NotificationPanel onClose={() => setShowNotifications(false)} />
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                className="flex h-[50px] items-center px-2 py-2 border border-black/10 rounded-[10px] space-x-2 hover:bg-black/5 transition"
                onClick={() => setShowMenu(v => !v)}
                aria-label="User menu"
              >
                <img
                  src={currentUser?.avatar || 'https://i.pravatar.cc/40'}
                  alt="User avatar"
                  className="w-10 h-10 rounded-[10px] object-cover border border-black/10 "
                />
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-bold truncate max-w-[100px]">
                    {currentUser?.fullName || 'Robert Allen'}
                  </div>
                  <div className="text-sm text-main-gray   truncate">
                    {currentUser?.role || 'Admin'}
                  </div>
                </div>
                <FaChevronDown className="h-3 w-3 text-black" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-36 p-4 bg-white border border-blue-100 rounded-lg shadow-lg z-10">
                  <Button className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-500">Profile</Button>
                  <br />
                  <Button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-500">Logout</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopHeader;

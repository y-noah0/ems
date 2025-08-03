import React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const TopHeader = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  // Close dropdown on outside click
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search logic here
    alert(`Searching for: ${searchValue}`);
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
    <div className="bg-white border-b border-gray-200 pr-8 sm:px-4 md:px-2 lg:px-30 py-2 sm:py-3">
      <div className="flex items-center justify-between ">
        {/* Search Input with Right-Aligned Icon */}
        <form
          className="flex-1 max-w-3/4 pl-14  md:max-w-xl"
          onSubmit={handleSearch}
        >
          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
            <input
              type="text"
              placeholder="Search"
              className="flex-1 px-2 py-2 text-xs sm:text-sm focus:outline-none min-w-0"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              style={{ minWidth: 0 }}
            />
            <button
              type="submit"
              className="p-2 pr-3 text-gray-500 hover:text-gray-700"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Right side */}
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 ml-0 md:ml-6">
          {/* Bell Icon */}
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600" />
          </button>

          {/* User Info Box */}
          <div className="relative" ref={menuRef}>
            <button
              className="flex items-center px-1 sm:px-2 md:px-3 py-1 bg-white border border-gray-200 rounded-md space-x-1 sm:space-x-2 shadow-sm focus:outline-none"
              onClick={() => setShowMenu((v) => !v)}
              aria-haspopup="true"
              aria-expanded={showMenu}
            >
              <img
                src={currentUser?.avatar || 'https://i.pravatar.cc/40'}
                alt="avatar"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
              />
              <div className="hidden xs:block text-left">
                <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[60px] sm:max-w-[120px]">
                  {currentUser?.fullName || 'Robert Allen'}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 truncate">{currentUser?.role || 'Admin'}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-32 sm:w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <button className="block w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-gray-100">Profile</button>
                <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-gray-100">Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopHeader;

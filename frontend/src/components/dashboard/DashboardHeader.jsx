import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './DashboardHeader.css';
import ThemeToggle from "../common/ThemeToggle";

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const displayName =
    user?.name ||
    localStorage.getItem('userName') ||
    user?.email?.split('@')[0] ||
    'Account';

  return (
    <header className="dash-header">
      <div className="dash-header-container">
        <Link to="/dashboard" className="dash-logo">
          <div className="dash-logo-icon">
            <FileText size={18} />
          </div>
          <span>CraftResume</span>
        </Link>

        <div className="dash-header-right">
          <div className="user-profile-badge">
            <div className="user-avatar">
              <User size={13} />
            </div>
            <span className="user-name">{displayName}</span>
          </div>

          <button onClick={handleLogout} className="btn-logout" title="Sign out">
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
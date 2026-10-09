import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import './PublicNavbar.css';

export default function PublicNavbar() {
  return (
    <header className="public-navbar">
      <div className="public-navbar-container">
        <Link to="/" className="public-navbar-brand">
          <div className="brand-icon-box">
            <FileText size={20} />
          </div>
          <span>CraftResume</span>
        </Link>

        <nav className="public-navbar-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#templates">Templates</a>
        </nav>

        <div className="public-navbar-actions">
          <Link to="/login" className="btn-nav-login">Sign In</Link>
          <Link to="/register" className="btn-nav-register">Get Started</Link>
        </div>
      </div>
    </header>
  );
}
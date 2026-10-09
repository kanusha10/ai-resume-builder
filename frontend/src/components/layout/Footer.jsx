import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="public-footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand-col">
            <Link to="/" className="footer-brand">
              <div className="footer-icon-box">
                <FileText size={18} />
              </div>
              <span>CraftResume</span>
            </Link>
            <p className="footer-tagline">
              Empowering engineers and professionals to create recruiter-ready resumes without formatting hurdles.
            </p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#templates">Templates</a>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Create Account</Link>
              <Link to="/dashboard">Dashboard</Link>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Security</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} CraftResume. All rights reserved.</p>
          <p className="footer-subtext">Designed for modern job seekers.</p>
        </div>
      </div>
    </footer>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './FinalCTA.css';

export default function FinalCTA() {
  return (
    <section className="final-cta-section">
      <div className="section-container">
        <div className="final-cta-card">
          <h2>Ready to build your resume?</h2>
          <p>
            Create an account and start entering your details in minutes.
          </p>
          <Link to="/register" className="btn-cta-primary">
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
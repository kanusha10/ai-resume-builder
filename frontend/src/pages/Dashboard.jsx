import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Upload, FileText, DownloadCloud, Sparkles, X } from 'lucide-react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import ResumeCard from '../components/dashboard/ResumeCard';
import EmptyState from '../components/dashboard/EmptyState';
import { useAuth } from '../context/AuthContext';
import { getResumes, deleteResume, downloadResume } from '../api/resumeApi';
import './Dashboard.css';

export default function Dashboard() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New Resume Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  const userName =
    user?.name ||
    localStorage.getItem('userName') ||
    user?.email?.split('@')[0] ||
    '';

  const fetchResumes = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getResumes();
      setResumes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
      setError('Could not load resumes. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    try {
      await deleteResume(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete resume:', err);
      alert('Failed to delete resume. Please try again.');
    }
  };

  const handleDownload = async (id, title) => {
    try {
      const blob = await downloadResume(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'resume'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Could not download PDF. Please check your network connection.');
    }
  };

  const handleStartCreate = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Save initial selection in session for the editor to read immediately
    sessionStorage.setItem('pendingResumeName', newTitle.trim());
    sessionStorage.setItem('pendingResumeRole', newRole.trim() || 'Software Engineer');

    setShowCreateModal(false);
    navigate('/resume/new');
  };

  return (
    <div className="dashboard-page">
      <DashboardHeader />

      <main className="dashboard-main">
        {/* Top Header Card */}
        <section className="dash-hero-card">
          <div className="dash-hero-text">
            <span className="dash-hero-badge">Workspace</span>
            <h1 className="dash-title">
              Welcome back{userName ? `, ${userName}` : ''}
            </h1>
            <p className="dash-subtitle">
              Manage your saved drafts, edit sections in real time, and download clean vector PDFs.
            </p>
          </div>

          <div className="dash-top-buttons">
            <Link to="/resume/upload" className="btn-dash-import">
              <Upload size={16} />
              <span>Upload Resume</span>
            </Link>
            <button
              onClick={() => {
                setNewTitle('');
                setNewRole('');
                setShowCreateModal(true);
              }}
              className="btn-dash-new"
            >
              <Plus size={16} />
              <span>Create Resume</span>
            </button>
          </div>
        </section>

        {/* 3 Metric Summary Boxes */}
        <div className="dash-metrics-grid">
          <div className="metric-box box-indigo">
            <div className="metric-icon-sphere bg-indigo">
              <FileText size={20} />
            </div>
            <div className="metric-details">
              <span className="metric-number">{resumes.length}</span>
              <span className="metric-name">Saved Documents</span>
            </div>
          </div>

          <div className="metric-box box-cyan">
            <div className="metric-icon-sphere bg-cyan">
              <DownloadCloud size={20} />
            </div>
            <div className="metric-details">
              <span className="metric-number">PDF & DOCX</span>
              <span className="metric-name">Print & Word Exports</span>
            </div>
          </div>

          <div className="metric-box box-violet">
            <div className="metric-icon-sphere bg-violet">
              <Sparkles size={20} />
            </div>
            <div className="metric-details">
              <span className="metric-number">ATS-Optimized</span>
              <span className="metric-name">Clean Document Formatting</span>
            </div>
          </div>
        </div>

        {/* Section Bar */}
        <div className="dash-section-bar">
          <div>
            <h2 className="section-heading-text">Your Resumes</h2>
            <p className="section-sub-text">Saved drafts and customized job applications</p>
          </div>
          <span className="dash-count-tag">{resumes.length} Total</span>
        </div>

        {/* Grid or Rectangle Empty State */}
        {loading ? (
          <div className="dashboard-loading-box">
            <div className="loading-spinner"></div>
            <p>Loading your documents...</p>
          </div>
        ) : error ? (
          <div className="dashboard-loading-box error-box">
            <p>{error}</p>
          </div>
        ) : resumes.length === 0 ? (
          <EmptyState onOpenCreate={() => setShowCreateModal(true)} />
        ) : (
          <div className="resumes-grid">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </main>

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Resume</h3>
              <button className="btn-modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStartCreate} className="modal-form">
              <div className="modal-input-group">
                <label>Resume Name</label>
                <input
                  type="text"
                  placeholder="e.g., Software Engineer Resume 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="modal-input-group">
                <label>Target Job Role</label>
                <input
                  type="text"
                  placeholder="e.g., Backend Developer / Data Engineer"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Continue to Editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
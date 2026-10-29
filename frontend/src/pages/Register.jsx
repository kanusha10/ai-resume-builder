
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, verifyRegistration } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      setOtpSent(true);
      setSuccess(
        response.message ||
          'Verification code sent. Please check your email.'
      );
    } catch (err) {
      console.error('OTP request error:', err);
      setError(
        err?.message || 'Could not send OTP. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await verifyRegistration({
        email: formData.email.trim(),
        otp: otp.trim(),
      });

      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(
        err?.message || 'OTP verification failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setOtpSent(false);
    setOtp('');
    setError('');
    setSuccess('');
  };

  return (
    <AuthLayout
      title={otpSent ? 'Verify your email' : 'Get started'}
      subtitle={
        otpSent
          ? `Enter the 6-digit code sent to ${formData.email}`
          : 'Create an account to manage your resumes'
      }
    >
      {error && (
        <div className="auth-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="auth-success-banner" role="status">
          <ShieldCheck size={16} />
          <span>{success}</span>
        </div>
      )}

      {!otpSent ? (
        <form onSubmit={handleRequestOtp} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name
            </label>
            <div className="input-wrapper">
              <User size={16} className="input-icon" />
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Alex Morgan"
                className="form-input"
                maxLength={100}
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="alex@domain.dev"
                className="form-input"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="form-input"
                minLength={6}
                maxLength={100}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              'Sending verification code...'
            ) : (
              <>
                Send verification code <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="otp">
              6-digit verification code
            </label>
            <div className="input-wrapper">
              <ShieldCheck size={16} className="input-icon" />
              <input
                id="otp"
                type="text"
                name="otp"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="Enter 6-digit code"
                className="form-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={submitting || otp.length !== 6}
          >
            {submitting ? (
              'Verifying...'
            ) : (
              <>
                Verify and create account <ArrowRight size={16} />
              </>
            )}
          </button>

          <button
            type="button"
            className="auth-btn-primary"
            onClick={handleBack}
            disabled={submitting}
          >
            <ArrowLeft size={16} /> Back to registration
          </button>
        </form>
      )}

      <div className="auth-footer-prompt">
        Already have an account?{' '}
        <Link to="/login" className="auth-link">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}

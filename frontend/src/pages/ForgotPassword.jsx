
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  KeyRound,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

import AuthLayout from '../components/auth/AuthLayout';
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} from '../utils/authApi';

export default function ForgotPassword() {
  const [step, setStep] = useState('email');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  // STEP 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const response = await requestPasswordResetOtp(email.trim());

      setMessage(
        response.message ||
          'If an account exists for this email, a reset code will be sent.'
      );

      setStep('verify');
    } catch (err) {
      setError(err.message || 'Unable to send the reset code.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const response = await verifyPasswordResetOtp({
        email: email.trim(),
        otp,
      });

      setMessage(
        response.message || 'Email verified successfully.'
      );

      setStep('reset');
    } catch (err) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await resetPassword({
        email: email.trim(),
        otp,
        newPassword,
      });

      setMessage(
        response.message ||
          'Password reset successfully. Please sign in.'
      );

      setStep('success');
    } catch (err) {
      setError(err.message || 'Unable to reset your password.');
    } finally {
      setSubmitting(false);
    }
  };

  const pageDetails = {
    email: {
      title: 'Forgot Password?',
      subtitle: 'Enter your registered email to receive a reset code.',
    },
    verify: {
      title: 'Verify Your Email',
      subtitle: 'Enter the six-digit code sent to your email.',
    },
    reset: {
      title: 'Create New Password',
      subtitle: 'Your email is verified. Choose a new password.',
    },
    success: {
      title: 'Password Reset Successful',
      subtitle: 'Your password has been updated successfully.',
    },
  };

  return (
    <AuthLayout
      title={pageDetails[step].title}
      subtitle={pageDetails[step].subtitle}
    >
      {error && (
        <div className="auth-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            background: '#eaf8ef',
            color: '#176534',
            fontSize: '14px',
          }}
        >
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* STEP 1: Email */}
      {step === 'email' && (
        <form onSubmit={handleRequestOtp} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>

            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      )}

      {/* STEP 2: Verify OTP */}
      {step === 'verify' && (
        <form onSubmit={handleVerifyOtp} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="verifyEmail">
              Registered Email
            </label>

            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="verifyEmail"
                type="email"
                value={email}
                className="form-input"
                readOnly
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="otp">
              Six-Digit OTP
            </label>

            <div className="input-wrapper">
              <KeyRound size={16} className="input-icon" />
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(
                    e.target.value.replace(/\D/g, '').slice(0, 6)
                  )
                }
                placeholder="Enter OTP"
                className="form-input"
                autoComplete="one-time-code"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={submitting || otp.length !== 6}
          >
            {submitting ? 'Verifying...' : 'Verify OTP'}
          </button>

          <button
            type="button"
            className="auth-btn-primary"
            style={{ marginTop: '10px' }}
            disabled={submitting}
            onClick={handleRequestOtp}
          >
            Resend OTP
          </button>
        </form>
      )}

      {/* STEP 3: New password */}
      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="newPassword">
              New Password
            </label>

            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="form-input"
                autoComplete="new-password"
                minLength={6}
                maxLength={100}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Confirm New Password
            </label>

            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Enter password again"
                className="form-input"
                autoComplete="new-password"
                minLength={6}
                maxLength={100}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}

      {/* STEP 4: Success — only ONE login button */}
      {step === 'success' && (
        <button
          type="button"
          className="auth-btn-primary"
          onClick={() => navigate('/login', { replace: true })}
        >
          Go to Sign In
        </button>
      )}

      {/* Hide the extra login link on the success screen */}
      {step !== 'success' && (
        <div className="auth-footer-prompt">
          <Link to="/login" className="auth-link">
            <ArrowLeft
              size={14}
              style={{
                display: 'inline',
                verticalAlign: 'middle',
              }}
            />{' '}
            Back to Sign In
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}

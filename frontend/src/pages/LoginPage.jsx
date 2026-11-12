import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';

export function LoginPage() {
  const { login, forgotPassword } = useAuth();
  
  // Modes: 'login' | 'forgot'
  const [mode, setMode] = useState('login');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Forgot password form state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: identify, 2: reset
  const [forgotVerifiedUser, setForgotVerifiedUser] = useState(null);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const switchMode = (newMode) => {
    resetMessages();
    setMode(newMode);
    setForgotStep(1);
    setForgotVerifiedUser(null);
  };

  // Submit Sign In
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Forgot Password Step 1 (Verify) or Step 2 (Reset)
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      if (forgotStep === 1) {
        // Step 1: verify account
        const res = await forgotPassword({ identifier: forgotIdentifier });
        if (res.verified) {
          setForgotVerifiedUser(res.username);
          setForgotStep(2);
          setSuccess(res.message || 'Account found! Enter your new password.');
        } else {
          setError(res.error || 'Account could not be verified.');
        }
      } else {
        // Step 2: set new password
        if (forgotNewPassword !== forgotConfirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (forgotNewPassword.length < 4) {
          setError('Password must be at least 4 characters.');
          setLoading(false);
          return;
        }

        const res = await forgotPassword({
          identifier: forgotVerifiedUser || forgotIdentifier,
          new_password: forgotNewPassword,
        });

        if (res.completed) {
          setSuccess(res.message || 'Password reset successfully! Please sign in.');
          setTimeout(() => {
            setUsername(forgotVerifiedUser || forgotIdentifier);
            setPassword('');
            switchMode('login');
          }, 1800);
        } else {
          setError(res.error || 'Password reset failed.');
        }
      }
    } catch (err) {
      setError(err.message || 'Password recovery error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-slate-50 overflow-y-auto px-4 sm:px-6 lg:px-8">
      <div className="min-h-full flex flex-col justify-center py-10 sm:py-14 sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="flex items-center justify-center">
            {mode === 'forgot' ? (
              <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-md">
                <KeyRound className="w-6 h-6" />
              </div>
            ) : (
              <div className="px-5 py-3 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center">
                <img src="/vdart-logo.png" alt="VDart Academy ERP System" className="h-14 sm:h-16 w-auto object-contain" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'forgot' ? 'Reset Password' : 'VDart Academy ERP'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {mode === 'forgot'
              ? 'Recover your portal access credentials'
              : 'A Global Entity of VDart Inc. · Institutional Finance, Fees & HR'}
          </p>
        </div>

        <div className="mt-6 w-full">
          <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            {/* VIEW 1: SIGN IN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email / Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or faculty@vdart.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Enterprise accounts are provisioned by Administration</span>
                </div>
              </form>
            )}

            {/* VIEW 2: FORGOT PASSWORD FORM */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {forgotStep === 1 ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Email or Username
                    </label>
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="Enter email or username"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      We'll verify your university credentials to enable password reset.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
                      Resetting password for: <strong>{forgotVerifiedUser || forgotIdentifier}</strong>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>
                    {loading
                      ? 'Processing...'
                      : forgotStep === 1
                      ? 'Verify & Continue'
                      : 'Set New Password'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

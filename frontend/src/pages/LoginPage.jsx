import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  UserPlus,
  KeyRound,
  ArrowLeft
} from 'lucide-react';

export function LoginPage() {
  const { login, register, forgotPassword } = useAuth();
  
  // Modes: 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState('login');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState('Employee');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

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

  // Submit Create Account
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (regPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: regFullName,
        email: regEmail,
        username: regUsername || regEmail.split('@')[0],
        role: regRole,
        password: regPassword,
      });
    } catch (err) {
      setError(err.message || 'Account registration failed.');
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center mx-auto shadow-md">
          {mode === 'register' ? (
            <UserPlus className="w-6 h-6" />
          ) : mode === 'forgot' ? (
            <KeyRound className="w-6 h-6" />
          ) : (
            <Building2 className="w-6 h-6" />
          )}
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {mode === 'register' ? 'Create an Account' : mode === 'forgot' ? 'Reset Password' : 'Apex University ERP'}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          {mode === 'register' 
            ? 'Register new staff or student portal access'
            : mode === 'forgot'
            ? 'Recover your portal access credentials'
            : 'Institutional Finance, General Ledger & Faculty HR'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4">
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
                  placeholder="e.g. admin or faculty@apex.edu"
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

              <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
                <span>Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                >
                  Create an account
                </button>
              </div>

              {/* SYSTEM ACCESS CREDENTIALS REFERENCE TABLE */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Institutional Login Credentials
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Click any to Auto-Fill
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {[
                    { role: 'Finance Admin', user: 'finance', pass: 'password123', color: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50' },
                    { role: 'Finance User', user: 'financeuser', pass: 'password123', color: 'border-cyan-200 bg-cyan-50/50 hover:bg-cyan-50' },
                    { role: 'Accountant', user: 'accountant', pass: 'password123', color: 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50' },
                    { role: 'Super Admin', user: 'SuperAdmin', pass: 'password123', color: 'border-purple-200 bg-purple-50/50 hover:bg-purple-50' },
                    { role: 'HR Admin', user: 'HrAdmin', pass: 'password123', color: 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50' },
                    { role: 'Employee / Faculty', user: 'empl', pass: 'password123', color: 'border-teal-200 bg-teal-50/50 hover:bg-teal-50' },
                    { role: 'Student / Parent', user: 'student', pass: 'password123', color: 'border-sky-200 bg-sky-50/50 hover:bg-sky-50' },
                  ].map((acc) => (
                    <button
                      key={acc.user}
                      type="button"
                      onClick={() => {
                        setUsername(acc.user);
                        setPassword(acc.pass);
                      }}
                      className={`p-2.5 rounded-xl border transition text-left cursor-pointer group ${acc.color}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{acc.role}</span>
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                          Fill ⚡
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                        User: <strong className="text-slate-900">@{acc.user}</strong>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Pass: <strong className="text-slate-700">{acc.pass}</strong>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* VIEW 2: CREATE AN ACCOUNT FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@apex.edu"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. rajesh_k"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Super Admin">⭐ Super Admin (Full Access)</option>
                  <option value="Finance Admin">Finance Officer</option>
                  <option value="HR Admin">HR Administrator</option>
                  <option value="Employee">Faculty / Employee</option>
                  <option value="Student/Parent">Student / Parent</option>
                </select>
                {regRole === 'Super Admin' && (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5 font-semibold">
                    ⚠️ Super Admin has unrestricted access to all Finance, HR, Payroll, and Student records.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm</label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: FORGOT PASSWORD FORM */}
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
  );
}

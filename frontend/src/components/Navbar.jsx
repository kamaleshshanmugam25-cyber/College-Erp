import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ChevronDown, Check, Loader2 } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, switchRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(null);
  const dropdownRef = useRef(null);

  const roleBadgeColor = {
    'Super Admin': 'bg-purple-100 text-purple-800 border-purple-200',
    'Finance Admin': 'bg-blue-100 text-blue-800 border-blue-200',
    'Finance User': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Accountant': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'HR Admin': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Employee': 'bg-teal-100 text-teal-800 border-teal-200',
    'Employee / Faculty': 'bg-teal-100 text-teal-800 border-teal-200',
    'Student/Parent': 'bg-sky-100 text-sky-800 border-sky-200',
    'Student / Parent': 'bg-sky-100 text-sky-800 border-sky-200',
  };

  const ROLES_LIST = [
    { name: 'Super Admin', username: 'SuperAdmin', badge: 'bg-purple-100 text-purple-800 border-purple-200', desc: 'Full System & Engine Control', defaultTab: 'finance-dashboard' },
    { name: 'Finance Admin', username: 'finance', badge: 'bg-blue-100 text-blue-800 border-blue-200', desc: 'Tuition Demands & Fiscal Control', defaultTab: 'finance-dashboard' },
    { name: 'Finance User', username: 'financeuser', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', desc: 'Billing Invoices & Counter Receipts', defaultTab: 'invoices-receipts' },
    { name: 'Accountant', username: 'accountant', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', desc: 'General Ledger & Journal Vouchers', defaultTab: 'general-ledger' },
    { name: 'HR Admin', username: 'HrAdmin', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', desc: 'Staff Directory, Leaves & Holidays', defaultTab: 'employee-lifecycle' },
    { name: 'Employee / Faculty', username: 'empl', badge: 'bg-teal-100 text-teal-800 border-teal-200', desc: 'Self-Service, Attendance & Payslips', defaultTab: 'employee-details' },
    { name: 'Student / Parent', username: 'student', badge: 'bg-sky-100 text-sky-800 border-sky-200', desc: 'Student Portal, Dues & Official Receipts', defaultTab: 'student-portal' },
  ];

  const getPrimaryRole = () => {
    if (!user) return 'User';
    if (user.role) return user.role;
    if (user.is_superuser || user.roles?.includes('Super Admin')) return 'Super Admin';
    if (user.roles?.includes('Finance Admin')) return 'Finance Admin';
    if (user.roles?.includes('Finance User')) return 'Finance User';
    if (user.roles?.includes('Accountant')) return 'Accountant';
    if (user.roles?.includes('HR Admin')) return 'HR Admin';
    if (user.roles?.includes('Employee')) return 'Employee';
    if (user.roles?.includes('Student/Parent') || user.roles?.includes('Student / Parent')) return 'Student/Parent';
    return user.roles?.[0] || 'User';
  };

  const primaryRole = getPrimaryRole();

  const isCurrentRole = (r) => {
    if (r.username === 'student') {
      return primaryRole === 'Student/Parent' || primaryRole === 'Student / Parent' || user?.username === 'student';
    }
    return primaryRole === r.name || user?.username === r.username;
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSwitch = async (roleObj) => {
    if (switchingRole) return;
    setSwitchingRole(roleObj.name);
    try {
      const updatedUser = await switchRole(roleObj.name);
      if (updatedUser && setActiveTab && roleObj.defaultTab) {
        setActiveTab(roleObj.defaultTab);
      }
    } catch (err) {
      console.error('Role switch failed:', err);
    } finally {
      setSwitchingRole(null);
      setIsOpen(false);
    }
  };

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-200 sticky top-0 z-50 flex items-center justify-between px-3 md:px-6 shadow-xs">
      <div className="flex items-center gap-2.5 md:gap-3.5">
        <div className="h-9 md:h-10 w-9 md:w-10 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0 p-1">
          <img src="/vdart-logo.png" alt="VDart Academy Logo" className="h-5 md:h-6 w-auto object-contain" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="font-extrabold text-slate-900 tracking-tight text-xs md:text-base">VDART ACADEMY</span>
            <span className="hidden sm:inline-block text-[10px] md:text-xs uppercase tracking-wider font-bold px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded border border-teal-200">
              ERP
            </span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium hidden sm:block">A Global Entity of VDart Inc.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Interactive Role Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 text-xs transition cursor-pointer select-none group shadow-2xs"
            title="Click to Switch Role"
          >
            <span className="hidden sm:inline text-slate-400 text-[11px] font-semibold">Role:</span>
            <span className={`px-2 py-0.5 rounded-lg border text-[10px] md:text-[11px] font-bold ${roleBadgeColor[primaryRole] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
              {primaryRole === 'Student/Parent' ? 'Student / Parent' : primaryRole}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Role Switcher Menu */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl py-2.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3.5 pb-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Switch System Role</div>
                  <div className="text-[10px] text-slate-400">Select any role to test workflows</div>
                </div>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Instant
                </span>
              </div>

              {/* UNIFIED ROLES LIST WITH STUDENT / PARENT AT LAST */}
              <div className="py-1 px-1">
                {ROLES_LIST.map((r) => {
                  const isCurrent = isCurrentRole(r);
                  const isBusy = switchingRole === r.name;
                  return (
                    <button
                      key={r.username}
                      type="button"
                      disabled={switchingRole !== null}
                      onClick={() => handleRoleSwitch(r)}
                      className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-left transition cursor-pointer hover:bg-slate-50 ${
                        isCurrent ? 'bg-slate-100/80 font-bold' : ''
                      }`}
                    >
                      <div className="space-y-0.5 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${r.badge}`}>
                            {r.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">@{r.username}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{r.desc}</p>
                      </div>
                      <div className="shrink-0">
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        ) : isCurrent ? (
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="px-3.5 pt-2 pb-0.5 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                Permissions and accessible modules reload dynamically.
              </div>
            </div>
          )}
        </div>

        {/* User Identity Info & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900">{user?.name || user?.username}</div>
            <div className="text-[10px] text-slate-500 font-mono">@{user?.username}</div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition cursor-pointer text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

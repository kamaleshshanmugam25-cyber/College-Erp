import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, LogOut } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  const roleBadgeColor = {
    'Super Admin': 'bg-purple-100 text-purple-800 border-purple-200',
    'Finance Admin': 'bg-blue-100 text-blue-800 border-blue-200',
    'Finance User': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Accountant': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'HR Admin': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Employee': 'bg-teal-100 text-teal-800 border-teal-200',
    'Student/Parent': 'bg-sky-100 text-sky-800 border-sky-200',
    'Student / Parent': 'bg-sky-100 text-sky-800 border-sky-200',
  };

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

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-200 sticky top-0 z-50 flex items-center justify-between px-3 md:px-6 shadow-xs">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-sm shrink-0">
          <Building2 className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="font-extrabold text-slate-900 tracking-tight text-xs md:text-base">APEX ERP</span>
            <span className="hidden sm:inline-block text-[10px] md:text-xs uppercase tracking-wider font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
              System
            </span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium hidden sm:block">Finance, Fees & HR Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Static Role Display (Non-interactive) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs select-none">
          <span className="hidden sm:inline text-slate-400 text-[11px] font-semibold">Role:</span>
          <span className={`px-2 py-0.5 rounded-lg border text-[10px] md:text-[11px] font-bold ${roleBadgeColor[primaryRole] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
            {primaryRole === 'Student/Parent' ? 'Student / Parent' : primaryRole}
          </span>
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

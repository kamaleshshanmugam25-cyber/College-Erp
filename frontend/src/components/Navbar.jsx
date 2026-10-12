import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  LogOut
} from 'lucide-react';

export function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  const roleBadgeColor = {
    'Super Admin': 'bg-purple-100 text-purple-800 border-purple-200',
    'Finance Admin': 'bg-blue-100 text-blue-800 border-blue-200',
    'HR Admin': 'bg-amber-100 text-amber-800 border-amber-200',
    'Employee': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Student/Parent': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  const primaryRole = (!user?.is_superuser && user?.roles?.[0])
    ? user.roles[0]
    : (user?.is_superuser ? 'Super Admin' : (user?.roles?.[0] || 'User'));

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-200 sticky top-0 z-50 flex items-center justify-between px-3 md:px-6 shadow-xs">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-sm shrink-0">
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

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* User Role Badge */}
        <div className="flex items-center gap-1.5 px-2 md:px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50">
          <span className="hidden sm:inline text-slate-400 text-[11px]">Role:</span>
          <span className={`px-1.5 py-0.5 rounded border text-[10px] md:text-[11px] font-bold ${roleBadgeColor[primaryRole] || 'bg-slate-100 text-slate-800'}`}>
            {primaryRole}
          </span>
        </div>

        {/* User Profile Info */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-900">{user?.name || user?.username}</div>
            <div className="text-[11px] text-slate-500">{user?.username}</div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

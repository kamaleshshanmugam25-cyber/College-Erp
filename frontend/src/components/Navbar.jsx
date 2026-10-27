import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  LogOut,
  ChevronDown,
  Check,
  ShieldCheck,
  Landmark,
  Users,
  Briefcase,
  GraduationCap,
  ArrowRightLeft,
  Loader2
} from 'lucide-react';

const ROLES = [
  {
    id: 'Super Admin',
    demoRole: 'Super Admin',
    label: 'Super Admin',
    description: 'Full institutional access & system administration',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    iconColor: 'text-purple-600 bg-purple-50 border-purple-200',
    icon: ShieldCheck,
    defaultTab: 'finance-dashboard',
  },
  {
    id: 'Finance Admin',
    demoRole: 'Finance Admin',
    label: 'Finance Admin',
    description: 'Full financial authority, user management & access control',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: Landmark,
    defaultTab: 'finance-dashboard',
  },
  {
    id: 'Finance User',
    demoRole: 'Finance User',
    label: 'Finance User',
    description: 'Desk fee collections, receipt generation & accounts inquiry',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    iconColor: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    icon: Landmark,
    defaultTab: 'finance-dashboard',
  },
  {
    id: 'Accountant',
    demoRole: 'Accountant',
    label: 'Accountant',
    description: 'Fee payments, transactions, vouchers & ledger accounting',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    icon: Landmark,
    defaultTab: 'finance-dashboard',
  },
  {
    id: 'HR Admin',
    demoRole: 'HR Admin',
    label: 'HR Admin',
    description: 'Staff records, attendance logs & payroll runs',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    icon: Users,
    defaultTab: 'attendance-leaves',
  },

  {
    id: 'Employee',
    demoRole: 'Employee',
    label: 'Employee / Faculty',
    description: 'Self-service attendance, leave requests & payslips',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    iconColor: 'text-teal-600 bg-teal-50 border-teal-200',
    icon: Briefcase,
    defaultTab: 'employee-details',
  },
  {
    id: 'Student/Parent',
    demoRole: 'Student/Parent',
    label: 'Student / Parent',
    description: 'Tuition fees, dues, payment receipts & calendar',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    iconColor: 'text-sky-600 bg-sky-50 border-sky-200',
    icon: GraduationCap,
    defaultTab: 'student-portal',
  },
];

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

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleRoleSelect = async (roleItem) => {
    if (switchingRole) return;
    if (roleItem.id === primaryRole) {
      setIsOpen(false);
      return;
    }

    setSwitchingRole(roleItem.id);
    try {
      if (switchRole) {
        await switchRole(roleItem.demoRole);
      }
      if (setActiveTab) {
        setActiveTab(roleItem.defaultTab);
      }
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to switch role:', err);
    } finally {
      setSwitchingRole(null);
    }
  };

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
        {/* Role Display / Role Switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-haspopup="true"
            title="Click to switch live simulated role"
            className={`flex items-center gap-1.5 px-2 md:px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer select-none group focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
              isOpen
                ? 'border-blue-400 bg-blue-50/60 shadow-xs ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <span className="hidden sm:inline text-slate-400 text-[11px] group-hover:text-slate-600 transition">Role:</span>
            <span className={`px-1.5 py-0.5 rounded border text-[10px] md:text-[11px] font-bold transition ${roleBadgeColor[primaryRole] || 'bg-slate-100 text-slate-800'}`}>
              {primaryRole === 'Student/Parent' ? 'Student / Parent' : primaryRole}
            </span>
            {switchingRole ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            ) : (
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-slate-600'
                }`}
              />
            )}
          </button>

          {/* Role Switcher Menu Popup */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-92 bg-white rounded-2xl shadow-xl border border-slate-200 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Menu Header */}
              <div className="px-3.5 pb-2.5 pt-1 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-none">Switch Role</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Simulate institutional permissions</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Role Switcher
                </span>
              </div>

              {/* Roles List */}
              <div className="p-1.5 space-y-1">
                {ROLES.map((item) => {
                  const Icon = item.icon;
                  const isActive = primaryRole === item.id;
                  const isCurrentSwitching = switchingRole === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={switchingRole !== null}
                      onClick={() => handleRoleSelect(item)}
                      className={`w-full text-left p-2.5 rounded-xl transition flex items-center gap-3 cursor-pointer group ${
                        isActive
                          ? 'bg-blue-50/70 border border-blue-200/80 shadow-2xs'
                          : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition ${item.iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.label}
                          </span>
                          <span className={`text-[9px] font-semibold px-1 py-0.2 rounded border ${item.badgeClass}`}>
                            {item.id === 'Student/Parent' ? 'Student' : item.id.split(' ')[0]}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      </div>

                      {/* Active or Loading Indicator */}
                      <div className="shrink-0 flex items-center">
                        {isCurrentSwitching ? (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : isActive ? (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-blue-400 transition" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Menu Footer */}
              <div className="px-3.5 pt-2 pb-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>Active account: <strong className="text-slate-600 font-semibold">{user?.username}</strong></span>
                <span className="text-[9px] text-slate-400">Updates live session</span>
              </div>
            </div>
          )}
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

import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarCheck2,
  Award,
  Receipt,
  Scale,
  Calendar,
  TrendingUp,
  Calculator,
  UserCheck
} from 'lucide-react';

export function MobileBottomNav({ activeTab, setActiveTab }) {
  const { user, hasRole } = useAuth();

  const isSuper = hasRole('Super Admin');
  const isFinance = isSuper || hasRole('Finance Admin');
  const isHR = isSuper || hasRole('HR Admin');
  const isStudent = isSuper || hasRole('Student/Parent');
  const isEmployee = isSuper || hasRole('Employee');

  // Direct tabs based on what the active login wants/needs
  let navItems = [];
  if (isSuper) {
    navItems = [
      { id: 'finance-dashboard', label: 'Finance', icon: LayoutDashboard },
      { id: 'employee-lifecycle', label: 'Staff HR', icon: Users },
      { id: 'student-portal', label: 'Students', icon: GraduationCap },
      { id: 'attendance-leaves', label: 'Attendance', icon: CalendarCheck2 },
      { id: 'fee-structures', label: 'Fees', icon: Calculator },
    ];
  } else if (isFinance && !isHR) {
    navItems = [
      { id: 'finance-dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'fee-structures', label: 'Fee Calc', icon: Calculator },
      { id: 'invoices-receipts', label: 'Invoices', icon: Receipt },
      { id: 'scholarships', label: 'Waivers', icon: Award },
      { id: 'general-ledger', label: 'Ledger', icon: Scale },
    ];
  } else if (isHR && !isFinance) {
    navItems = [
      { id: 'attendance-leaves', label: 'Attendance', icon: CalendarCheck2 },
      { id: 'employee-lifecycle', label: 'Staff Dir', icon: Users },
      { id: 'holidays', label: 'Holidays', icon: Calendar },
      { id: 'performance-appraisal', label: 'Appraisals', icon: TrendingUp },
    ];
  } else if (isStudent) {
    navItems = [
      { id: 'student-portal', label: 'My Dues', icon: Receipt },
      { id: 'student-scholarships', label: 'Waivers', icon: Award },
      { id: 'academic-calendar', label: 'Calendar', icon: Calendar },
    ];
  } else if (isEmployee) {
    navItems = [
      { id: 'employee-details', label: 'Details', icon: UserCheck },
      { id: 'employee-leaves', label: 'Leaves', icon: CalendarCheck2 },
      { id: 'employee-appraisal', label: 'Appraisal', icon: Award },
    ];
  } else {
    navItems = [
      { id: 'finance-dashboard', label: 'Overview', icon: LayoutDashboard },
    ];
  }

  return (
    <nav
      aria-label="Mobile Navigation"
      className="shrink-0 h-14 w-full bg-white border-t border-slate-200 z-40 md:hidden flex items-center justify-around px-1 shadow-lg"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex-1 h-full flex flex-col items-center justify-center relative transition cursor-pointer ${
              isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {/* Active Top Line Indicator */}
            {isActive && (
              <span className="absolute top-0 inset-x-3 h-0.5 bg-blue-600 rounded-full shadow-xs" />
            )}
            
            <Icon className={`w-4.5 h-4.5 transition-transform ${isActive ? 'scale-105 text-blue-600 stroke-[2.25]' : 'stroke-[1.75]'}`} />
            <span className={`text-[10px] tracking-tight mt-1 text-center leading-none px-0.5 ${isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

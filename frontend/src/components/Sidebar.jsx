import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calculator,
  CreditCard,
  Receipt,
  Award,
  Users,
  CalendarCheck2,
  TrendingUp,
  Scale,
  Calendar,
  Building,
  GraduationCap,
  ShieldCheck,
  UserCircle2
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab }) {
  const { hasRole, user } = useAuth();

  const isSuper = hasRole('Super Admin');
  const isFinance = isSuper || hasRole('Finance Admin');
  const isHR = isSuper || hasRole('HR Admin');
  const isStudent = isSuper || hasRole('Student/Parent');
  const isEmployee = isSuper || hasRole('Employee');

  const primaryRole = (!user?.is_superuser && user?.roles?.[0])
    ? user.roles[0]
    : (user?.is_superuser ? 'Super Admin' : (user?.roles?.[0] || 'User'));

  const navSections = [
    {
      title: 'Fee & Financial Management',
      visible: isFinance,
      items: [
        { id: 'finance-dashboard', label: 'Financial Overview', icon: LayoutDashboard },
        { id: 'fee-structures', label: 'Fee Structures & Calculator', icon: Calculator },
        { id: 'invoices-receipts', label: 'Invoices & Receipts', icon: Receipt },
        { id: 'scholarships', label: 'Scholarships & Waivers', icon: Award },
        { id: 'general-ledger', label: 'General & Journal Ledger', icon: Scale },
      ],
    },
    {
      title: 'HR & Payroll Management',
      visible: isHR,
      items: [
        { id: 'employee-lifecycle', label: 'Employee Lifecycle', icon: Users },
        { id: 'attendance-leaves', label: 'Attendance & Leaves', icon: CalendarCheck2 },
        { id: 'holidays', label: 'Declared Holidays', icon: Calendar },
        { id: 'performance-appraisal', label: 'Performance Appraisals', icon: TrendingUp },
      ],
    },
    {
      title: 'Student Management & Services',
      visible: isStudent,
      items: [
        { id: 'student-portal', label: 'My Dues & Receipts', icon: Receipt },
        { id: 'student-scholarships', label: 'Scholarships & Concessions', icon: Award },
        { id: 'academic-calendar', label: 'Academic Holiday Calendar', icon: Calendar },
      ],
    },
    {
      title: 'Employee Self-Service',
      visible: isEmployee,
      items: [
        { id: 'employee-leaves', label: 'Apply Leave / My Attendance', icon: Calendar },
        { id: 'employee-appraisal', label: 'My Appraisals', icon: Award },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0 h-full select-none">
      <div className="p-3 space-y-5 overflow-y-auto flex-1">
        {navSections.filter((s) => s.visible).map((section, idx) => (
          <div key={section.title} className={idx > 0 ? "pt-3 border-t border-slate-100" : ""}>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              {section.title}
            </div>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-xs shadow-blue-500/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate text-left">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}

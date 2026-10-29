import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calculator,
  Receipt,
  Award,
  Users,
  CalendarCheck2,
  TrendingUp,
  Scale,
  Calendar,
  UserCheck,
  ShieldCheck,
  Clock,
  UserPlus,
  FileText
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab }) {
  const { hasRole, canAccessModule } = useAuth();
  const [holidayCount, setHolidayCount] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHolidayCount = async () => {
      try {
        const res = await api.getHolidays();
        const count = res?.count ?? (Array.isArray(res) ? res.length : (res?.results?.length ?? 0));
        if (isMounted) setHolidayCount(count);
      } catch (err) {
        // fallback
      }
    };

    fetchHolidayCount();

    const handleHolidayUpdate = (e) => {
      if (e?.detail?.count !== undefined) {
        setHolidayCount(e.detail.count);
      } else {
        fetchHolidayCount();
      }
    };

    window.addEventListener('holidays_updated', handleHolidayUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('holidays_updated', handleHolidayUpdate);
    };
  }, []);

  const isSuper = hasRole('Super Admin');
  const isAdmin = hasRole('Super Admin', 'Finance Admin');
  const isHR = isSuper || hasRole('HR Admin');
  const isStudent = isSuper || hasRole('Student/Parent');
  const isEmployee = isSuper || hasRole('Employee');

  const navSections = [
    {
      title: 'Fee & Financial Management',
      items: [
        { id: 'finance-dashboard', label: 'Financial Overview', icon: LayoutDashboard },
        { id: 'fee-structures', label: 'Fee Structures & Calculator', icon: Calculator },
        { id: 'invoices-receipts', label: 'Invoices & Receipts', icon: Receipt },
        { id: 'scholarships', label: 'Scholarships & Waivers', icon: Award },
        { id: 'general-ledger', label: 'General & Journal Ledger', icon: Scale },
        { id: 'financial-reports', label: 'Financial Reports', icon: TrendingUp },
      ],
    },
    {
      title: 'Administration & Security',
      visible: isSuper || isAdmin,
      items: [
        { id: 'user-management', label: 'Finance Users & Roles', icon: Users, adminOnly: true },
        { id: 'role-permissions', label: 'Role & Permissions', icon: ShieldCheck, superOnly: true },
      ],
    },
    {
      title: 'HR & Payroll Management',
      visible: isHR,
      items: [
        { id: 'employee-lifecycle', label: 'Employee Lifecycle', icon: Users },
        { id: 'attendance-leaves', label: 'Attendance & Leaves', icon: CalendarCheck2 },
        {
          id: 'holidays',
          label: `Declared Holidays${holidayCount !== null ? ` (${holidayCount})` : ''}`,
          icon: Calendar
        },
        { id: 'performance-appraisal', label: 'Performance Appraisals', icon: TrendingUp },
      ],
    },
    {
      title: 'Student Management & Services',
      visible: isStudent,
      items: [
        { id: 'student-portal', label: 'My Dues & Receipts', icon: Receipt },
        { id: 'student-scholarships', label: 'Scholarships & Concessions', icon: Award },
        {
          id: 'academic-calendar',
          label: `Academic Holiday Calendar${holidayCount !== null ? ` (${holidayCount})` : ''}`,
          icon: Calendar
        },
      ],
    },
    {
      title: 'Employee Self-Service',
      visible: isEmployee,
      items: [
        { id: 'employee-details', label: 'Employee Details', icon: UserCheck },
        { id: 'employee-leaves', label: 'Apply Leave / My Attendance', icon: Calendar },
        { id: 'employee-appraisal', label: 'My Appraisals', icon: Award },
      ],
    },
  ];

  // Dynamically filter sections and items according to declared access permissions
  const visibleSections = navSections
    .filter((section) => section.visible !== false)
    .map((section) => {
      const allowedItems = section.items.filter((item) => {
        if (item.superOnly) return isSuper;
        if (item.adminOnly) return isAdmin;
        return canAccessModule(item.id);
      });

      return {
        ...section,
        items: allowedItems,
        visible: allowedItems.length > 0,
      };
    })
    .filter((s) => s.visible);

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0 h-full select-none justify-between">
      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        {visibleSections.map((section, idx) => (
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

      {/* Clean Sidebar Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] text-slate-400">
        <span>Apex ERP v2.4</span>
        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Live
        </span>
      </div>
    </aside>
  );
}
export default Sidebar;

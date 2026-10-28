import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { FinanceDashboard } from './pages/FinanceDashboard';
import { FeeCalculator } from './pages/FeeCalculator';
import { StudentPortal } from './pages/StudentPortal';
import { HRManagement } from './pages/HRManagement';
import { EmployeePortal } from './pages/EmployeePortal';
import { EmployeeDetailsView } from './components/EmployeeDetailsView';
import { RolePermissionView } from './pages/RolePermissionView';
import { UserManagementView } from './pages/UserManagementView';
import { AuditLogsView } from './pages/AuditLogsView';
import { AccessDeniedView } from './components/AccessDeniedView';
import { LedgerView } from './components/LedgerView';
import { ScholarshipsView } from './components/ScholarshipsView';
import { InvoicesReceiptsView } from './pages/InvoicesReceiptsView';
import { ModuleView } from './pages/ModuleView';
import { LoginPage } from './pages/LoginPage';
import { Building2, RefreshCw } from 'lucide-react';
import { MobileBottomNav } from './components/MobileBottomNav';

function getSavedTab() {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash ? window.location.hash.replace('#', '') : null;
    if (hash) return hash;
    const saved = localStorage.getItem('apex_active_tab');
    if (saved) return saved;
  }
  return null;
}

function MainApp() {
  const { user, loading, hasRole, canAccessModule } = useAuth();
  const [activeTab, setActiveTabState] = useState(() => getSavedTab() || 'finance-dashboard');
  const [lastUsername, setLastUsername] = useState(null);

  const isSuper = hasRole('Super Admin');
  const isAdmin = hasRole('Super Admin', 'Finance Admin');

  const handleTabChange = (newTab) => {
    setActiveTabState(newTab);
    localStorage.setItem('apex_active_tab', newTab);
    if (window.location.hash !== `#${newTab}`) {
      window.history.pushState(null, '', `#${newTab}`);
    }
  };

  // Sync browser back/forward buttons and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash.replace('#', '');
      if (currentHash && currentHash !== activeTab) {
        setActiveTabState(currentHash);
        localStorage.setItem('apex_active_tab', currentHash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  // Set appropriate tab when user or role changes
  useEffect(() => {
    if (!user) return;
    if (user.username !== lastUsername) {
      setLastUsername(user.username);
      const isSuper = hasRole('Super Admin');
      const isFinance = isSuper || hasRole('Finance Admin', 'Finance User', 'Accountant');
      const isHR = isSuper || hasRole('HR Admin');
      const isStudent = hasRole('Student/Parent');
      const isEmployee = hasRole('Employee');

      let targetTab = getSavedTab() || activeTab;

      // Ensure target tab is accessible for the authenticated role
      if (!isSuper) {
        if (user.accessible_modules && Array.isArray(user.accessible_modules) && user.accessible_modules.length > 0) {
          if (!user.accessible_modules.includes(targetTab)) {
            if (isStudent && user.accessible_modules.includes('student-portal')) {
              targetTab = 'student-portal';
            } else if (isEmployee && user.accessible_modules.includes('employee-details')) {
              targetTab = 'employee-details';
            } else if (isHR && user.accessible_modules.includes('attendance-leaves')) {
              targetTab = 'attendance-leaves';
            } else if (isFinance && user.accessible_modules.includes('finance-dashboard')) {
              targetTab = 'finance-dashboard';
            } else {
              targetTab = user.accessible_modules[0];
            }
          }
        } else {
          if (isStudent && !isFinance && !isHR) {
            const studentTabs = ['student-portal', 'student-details', 'student-scholarships', 'academic-calendar'];
            if (!studentTabs.includes(targetTab)) targetTab = 'student-portal';
          } else if (isEmployee && !isFinance && !isHR) {
            const employeeTabs = ['employee-details', 'employee-leaves', 'employee-appraisal', 'employee-payslips'];
            if (!employeeTabs.includes(targetTab)) targetTab = 'employee-details';
          } else if (isHR && !isFinance) {
            const hrTabs = ['employee-lifecycle', 'attendance-leaves', 'holidays', 'performance-appraisal', 'payroll-processing'];
            if (!hrTabs.includes(targetTab)) targetTab = 'attendance-leaves';
          } else if (isFinance) {
            const financeTabs = ['finance-dashboard', 'financial-reports', 'fee-structures', 'invoices-receipts', 'scholarships', 'general-ledger', 'user-management', 'finance-users'];
            if (!financeTabs.includes(targetTab)) targetTab = 'finance-dashboard';
          }
        }
      }

      handleTabChange(targetTab);
    }
  }, [user?.username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-md animate-pulse">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Connecting to ERP Backend Service...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'finance-dashboard':
      case 'financial-reports':
        return <FinanceDashboard />;
      case 'fee-structures':
        return <FeeCalculator />;
      case 'scholarships':
      case 'student-scholarships':
        return <ScholarshipsView />;
      case 'general-ledger':
        if (!isAdmin && !hasRole('Accountant')) {
          return (
            <AccessDeniedView
              requiredRole="Finance Admin or Accountant"
              reason="General & Journal Ledger functions are restricted to authorized financial personnel."
              onGoHome={() => handleTabChange('finance-dashboard')}
            />
          );
        }
        return <LedgerView />;
      case 'invoices-receipts':
        if (!canAccessModule('invoices-receipts')) {
          return (
            <AccessDeniedView
              requiredRole="Finance Admin or Accountant"
              reason="Invoices & Receipts access is restricted to authorized financial personnel."
              onGoHome={() => handleTabChange('fee-structures')}
            />
          );
        }
        return <InvoicesReceiptsView />;
      case 'user-management':
      case 'finance-users':
        if (!isSuper && !isAdmin) {
          return (
            <AccessDeniedView
              requiredRole="Finance Admin or Super Admin"
              reason="Finance User & Role Management is restricted to Finance Admin."
              onGoHome={() => handleTabChange('finance-dashboard')}
            />
          );
        }
        return <UserManagementView />;
      case 'role-permissions':
      case 'access-matrix':
        if (!isSuper) {
          return (
            <AccessDeniedView
              requiredRole="Super Admin"
              reason="Administration & Security configuration is restricted to Super Admin."
              onGoHome={() => handleTabChange('finance-dashboard')}
            />
          );
        }
        return <RolePermissionView />;
      case 'audit-logs':
        if (!isSuper) {
          return (
            <AccessDeniedView
              requiredRole="Super Admin"
              reason="Security Audit Logs are restricted to Super Admin."
              onGoHome={() => handleTabChange('finance-dashboard')}
            />
          );
        }
        return <AuditLogsView />;
      case 'student-details':
      case 'student-portal':
        return <StudentPortal />;
      case 'attendance-leaves':
      case 'payroll-processing':
        return <HRManagement />;
      case 'employee-details':
        return <EmployeeDetailsView setActiveTab={handleTabChange} />;
      case 'employee-payslips':
      case 'employee-leaves':
        return <EmployeePortal />;
      default:
        if (!canAccessModule(activeTab) && !isAdmin) {
          return (
            <AccessDeniedView
              reason="Your role does not have authorization to view this module."
              onGoHome={() => handleTabChange('finance-dashboard')}
            />
          );
        }
        return <ModuleView moduleId={activeTab} />;
    }
  };

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
      <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        <main className="flex-1 p-3.5 sm:p-5 md:p-8 pb-4 md:pb-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      <MobileBottomNav activeTab={activeTab} setActiveTab={handleTabChange} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

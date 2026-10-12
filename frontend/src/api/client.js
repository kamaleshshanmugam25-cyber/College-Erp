// API client for communicating with Django backend
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export async function apiRequest(endpoint, options = {}) {
  const csrfToken = getCookie('csrftoken');
  const headers = {
    'Content-Type': 'application/json',
    ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  const response = await fetch(endpoint, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

// Auth API
export const api = {
  getCsrf: () => apiRequest('/api/auth/csrf/'),
  getMe: () => apiRequest('/api/auth/me/'),
  getDemoUsers: () => apiRequest('/api/auth/demo-users/'),
  login: (credentials) => apiRequest('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  register: (data) => apiRequest('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  forgotPassword: (data) => apiRequest('/api/auth/forgot-password/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  logout: () => apiRequest('/api/auth/logout/', {
    method: 'POST',
  }),

  // Finance API
  getFinanceDashboard: () => apiRequest('/api/finance/dashboard/'),
  getFinanceMeta: () => apiRequest('/api/finance/meta/'),
  createCourse: (data) => apiRequest('/api/finance/courses/create/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createQuota: (data) => apiRequest('/api/finance/quotas/create/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  calculateFee: (params) => apiRequest('/api/finance/calculator/', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  allocateFee: (payload) => apiRequest('/api/fees/allocate/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Student / Fees API
  getMyDues: () => apiRequest('/api/portal/dues/'),
  initiatePayment: (feeId, payload) => apiRequest(`/api/fees/${feeId}/pay/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getReceipts: () => apiRequest('/api/receipts/'),

  // HR API
  getLeaves: () => apiRequest('/api/leaves/'),
  approveLeave: (leaveId) => apiRequest(`/api/leaves/${leaveId}/approve/`, {
    method: 'POST',
  }),
  rejectLeave: (leaveId) => apiRequest(`/api/leaves/${leaveId}/reject/`, {
    method: 'POST',
  }),
  getAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/attendance/${query ? `?${query}` : ''}`);
  },
  getAttendanceSummary: () => apiRequest('/api/attendance/summary/'),
  clockInAttendance: (payload = {}) => apiRequest('/api/attendance/clock_in/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  clockOutAttendance: (payload = {}) => apiRequest('/api/attendance/clock_out/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getMyPayslips: () => apiRequest('/api/portal/payslips/'),
  runPayroll: (year, month) => apiRequest('/api/payroll/run/', {
    method: 'POST',
    body: JSON.stringify({ year, month }),
  }),

  // Employee Lifecycle API
  getEmployees: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/hr/employees/${query ? `?${query}` : ''}`);
  },
  getEmployeeStats: () => apiRequest('/api/hr/employees/stats/'),
  createEmployee: (data) => apiRequest('/api/hr/employees/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateEmployee: (id, data) => apiRequest(`/api/hr/employees/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  confirmEmployee: (id) => apiRequest(`/api/hr/employees/${id}/confirm/`, {
    method: 'POST',
  }),
  transitionEmployeeStatus: (id, status) => apiRequest(`/api/hr/employees/${id}/transition_status/`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  }),
  appraiseEmployee: (id, payload) => apiRequest(`/api/hr/employees/${id}/appraise/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getAppraisals: () => apiRequest('/api/hr/employees/appraisals/'),

  // Holidays API
  getHolidays: () => apiRequest('/api/holidays/'),
  createHoliday: (data) => apiRequest('/api/holidays/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Ledger & Double-Entry Accounting API
  getGeneralLedger: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/ledger/general/${query ? `?${query}` : ''}`);
  },
  getAccountBalances: () => apiRequest('/api/ledger/general/account_balances/'),
  getJournalVouchers: () => apiRequest('/api/ledger/vouchers/'),
  createJournalVoucher: (payload) => apiRequest('/api/ledger/vouchers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Additional Sidebar Module APIs
  getInvoicesList: () => apiRequest('/api/invoices/'),
  getTaxCompliance: () => apiRequest('/api/finance/tax-compliance/'),
  getMyScholarships: () => apiRequest('/api/portal/my-scholarships/'),
  getStatutoryCompliance: () => apiRequest('/api/hr/statutory-compliance/'),
  getSystemInfo: () => apiRequest('/api/system/info/'),
};




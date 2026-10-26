import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Clipboard,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const SAMPLE_DATA = [
  {
    'Staff ID': 'FAC101',
    'Employee Name': 'Dr. K. Vignesh',
    'Department': 'Computer Science',
    'Designation': 'Associate Professor',
    'Email': 'vignesh.k@apex.edu',
    'Basic Salary': 48000
  },
  {
    'Staff ID': 'FAC102',
    'Employee Name': 'Dr. Meera Nambiar',
    'Department': 'Electronics & Communication',
    'Designation': 'Professor',
    'Email': 'meera.nambiar@apex.edu',
    'Basic Salary': 55000
  },
  {
    'Staff ID': 'FAC103',
    'Employee Name': 'Prof. Arun Sundaram',
    'Department': 'Mechanical Engineering',
    'Designation': 'Assistant Professor',
    'Email': 'arun.sundaram@apex.edu',
    'Basic Salary': 42000
  },
  {
    'Staff ID': 'STF101',
    'Employee Name': 'Kavitha Ramachandran',
    'Department': 'Administration',
    'Designation': 'Senior Administrative Officer',
    'Email': 'kavitha.r@apex.edu',
    'Basic Salary': 34000
  },
  {
    'Staff ID': 'STF102',
    'Employee Name': 'Ganesh Murugan',
    'Department': 'Accounts & Finance',
    'Designation': 'Accounts Officer',
    'Email': 'ganesh.m@apex.edu',
    'Basic Salary': 32000
  }
];

const DEFAULT_DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical & Electronics',
  'Business Administration',
  'Mathematics & Sciences',
  'Administration',
  'Accounts & Finance'
];

export function BulkStaffOnboardingModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'manual'
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [parsingError, setParsingError] = useState('');

  // Manual entry table state
  const [manualRows, setManualRows] = useState([
    { staff_id: '', name: '', department: 'Computer Science', designation: 'Assistant Professor', email: '', basic_salary: 40000 },
    { staff_id: '', name: '', department: 'Electronics & Communication', designation: 'Assistant Professor', email: '', basic_salary: 40000 },
    { staff_id: '', name: '', department: 'Mechanical Engineering', designation: 'Assistant Professor', email: '', basic_salary: 40000 },
  ]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Normalizer helper for row dictionary
  const normalizeRow = (rawRow, idx) => {
    const keys = Object.keys(rawRow);
    const getVal = (...matches) => {
      for (const m of matches) {
        for (const k of keys) {
          const cleanKey = k.trim().toLowerCase().replace(/[\s_-]+/g, '');
          const cleanMatch = m.toLowerCase().replace(/[\s_-]+/g, '');
          if (cleanKey === cleanMatch || cleanKey.includes(cleanMatch)) {
            const val = rawRow[k];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return String(val).trim();
            }
          }
        }
      }
      return '';
    };

    const staff_id = getVal('staff_id', 'staff id', 'empid', 'emp_id', 'employee_id', 'id');
    const name = getVal('name', 'employee_name', 'employee name', 'staff_name', 'full_name', 'fullname');
    const department = getVal('department', 'dept') || 'Computer Science';
    const designation = getVal('designation', 'role', 'title', 'position') || 'Assistant Professor';
    const email = getVal('email', 'email_address', 'mail');
    const basic_salary = parseFloat(getVal('basic_salary', 'basic', 'salary', 'gross') || 40000) || 40000;

    return {
      _uid: `parsed_${Date.now()}_${idx}`,
      staff_id,
      name,
      department,
      designation,
      email,
      basic_salary,
      isValid: Boolean(name && name.length >= 2)
    };
  };

  // Parse Excel / CSV file buffer
  const handleProcessFile = (file) => {
    setParsingError('');
    setSubmitError('');
    setResultData(null);
    setFileName(file.name);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');

    if (!isExcel && !isCsv) {
      setParsingError('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (!jsonRows || jsonRows.length === 0) {
          setParsingError('The spreadsheet contains no data rows.');
          setParsedRows([]);
          return;
        }

        const normalized = jsonRows.map((r, i) => normalizeRow(r, i));
        setParsedRows(normalized);
      } catch (err) {
        setParsingError(`Failed to parse file: ${err.message || 'Corrupt file structure'}`);
        setParsedRows([]);
      }
    };
    reader.onerror = () => {
      setParsingError('Failed to read file. Please try again.');
    };
    reader.readAsArrayBuffer(file);
  };

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Sample template downloads
  const handleDownloadSampleExcel = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 28 },
      { wch: 25 },
      { wch: 28 },
      { wch: 14 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'StaffTemplate');
    XLSX.writeFile(wb, 'Staff_Bulk_Onboarding_Template.xlsx');
  };

  const handleDownloadSampleCSV = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA);
    const csvStr = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Staff_Bulk_Onboarding_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Manual grid actions
  const handleAddManualRow = () => {
    setManualRows((prev) => [
      ...prev,
      {
        staff_id: '',
        name: '',
        department: 'Computer Science',
        designation: 'Assistant Professor',
        email: '',
        basic_salary: 40000
      }
    ]);
  };

  const handleRemoveManualRow = (index) => {
    setManualRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleManualRowChange = (index, field, value) => {
    setManualRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Paste from clipboard in manual mode
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        alert('Clipboard is empty.');
        return;
      }
      const lines = text.trim().split(/\r?\n/);
      const newRows = lines.map((line) => {
        const cols = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
        return {
          staff_id: cols[0]?.trim() || '',
          name: cols[1]?.trim() || cols[0]?.trim() || '',
          department: cols[2]?.trim() || 'Computer Science',
          designation: cols[3]?.trim() || 'Assistant Professor',
          email: cols[4]?.trim() || '',
          basic_salary: parseFloat(cols[5]?.trim() || 40000) || 40000
        };
      });
      setManualRows((prev) => [...prev, ...newRows]);
    } catch (err) {
      alert(`Could not read clipboard: ${err.message}.`);
    }
  };

  // Update a field in the parsed list
  const handleParsedRowChange = (index, field, val) => {
    setParsedRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      if (field === 'name') {
        copy[index].isValid = Boolean(val && val.trim().length >= 2);
      }
      return copy;
    });
  };

  // Remove row from parsed list
  const handleRemoveParsedRow = (index) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear file & reset
  const handleResetFile = () => {
    setFileName('');
    setParsedRows([]);
    setParsingError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submission handler
  const handleSubmitOnboard = async () => {
    setSubmitError('');
    setResultData(null);

    let candidates = [];
    if (activeTab === 'upload') {
      candidates = parsedRows.filter((r) => r.isValid);
      if (candidates.length === 0) {
        setSubmitError('No valid employee records to onboard. Employee Name is required.');
        return;
      }
    } else {
      candidates = manualRows
        .filter((r) => r.name && r.name.trim().length >= 2)
        .map((r) => ({
          ...r,
          basic_salary: parseFloat(r.basic_salary || 40000) || 40000
        }));
      if (candidates.length === 0) {
        setSubmitError('Please enter at least one employee with a valid Employee Name.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        employees: candidates.map((c) => ({
          staff_id: c.staff_id?.trim() || '',
          name: c.name?.trim() || '',
          department: c.department?.trim() || 'Computer Science',
          designation: c.designation?.trim() || 'Assistant Professor',
          email: c.email?.trim() || '',
          basic_salary: c.basic_salary || 40000
        }))
      };

      const res = await api.bulkUploadEmployees(payload);
      setResultData(res);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to bulk onboard staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validParsedCount = parsedRows.filter((r) => r.isValid).length;
  const validManualCount = manualRows.filter((r) => r.name && r.name.trim().length >= 2).length;
  const currentCount = activeTab === 'upload' ? validParsedCount : validManualCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        
        {/* Clean Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Bulk Staff Onboarding
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload Excel (.xlsx, .xls) or CSV file with employee records
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Segmented Switch */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => { setActiveTab('upload'); setResultData(null); }}
                className={`px-3 py-1.2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('manual'); setResultData(null); }}
                className={`px-3 py-1.2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Manual Entry
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Success Banner if Completed */}
          {resultData && (
            <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">
                      Successfully Onboarded {resultData.created_count} Staff Member(s)
                    </h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      User accounts and SSO credentials created. Directory refreshed.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Done
                </button>
              </div>

              {/* Newly Created Badges */}
              {resultData.created && resultData.created.length > 0 && (
                <div className="pt-2 border-t border-emerald-100 flex flex-wrap gap-1.5">
                  {resultData.created.map((c) => (
                    <span
                      key={c.id || c.staff_id}
                      className="px-2.5 py-1 rounded-md bg-white border border-emerald-200 text-slate-800 text-[11px] font-medium flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="font-bold text-emerald-700">{c.staff_id}</span>
                      <span>{c.name}</span>
                      <span className="text-slate-400">· {c.department}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Skipped Details if Any */}
              {resultData.skipped && resultData.skipped.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs">
                  <div
                    onClick={() => setShowSkippedDetails(!showSkippedDetails)}
                    className="flex items-center justify-between font-semibold text-amber-900 cursor-pointer select-none"
                  >
                    <span>⚠️ {resultData.skipped.length} existing record(s) skipped</span>
                    {showSkippedDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                  {showSkippedDetails && (
                    <div className="mt-2 text-[11px] text-amber-800 space-y-1">
                      {resultData.skipped.map((s, idx) => (
                        <div key={idx}>
                          <span className="font-bold">{s.staff_id}</span> ({s.name}): {s.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'upload' && !resultData && (
            <div className="space-y-4">
              
              {/* Dropzone or Compact Loaded File Bar */}
              {!fileName ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center cursor-pointer ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/40'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProcessFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    Click to browse or drop your Excel / CSV file here
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)
                  </div>

                  {/* Clean Template Links Inside Dropzone */}
                  <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center gap-3 text-[11px]" onClick={(e) => e.stopPropagation()}>
                    <span className="text-slate-400">Download Template:</span>
                    <button
                      type="button"
                      onClick={handleDownloadSampleExcel}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Excel (.xlsx)
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={handleDownloadSampleCSV}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      CSV (.csv)
                    </button>
                  </div>
                </div>
              ) : (
                /* Sleek, Compact File Loaded Header (takes minimal height!) */
                <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">{fileName}</span>
                    <span className="text-[11px] text-slate-500">
                      • {parsedRows.length} record(s) detected ({validParsedCount} valid)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadSampleExcel}
                      className="text-[11px] font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      Template
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      type="button"
                      onClick={handleResetFile}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Change File
                    </button>
                  </div>
                </div>
              )}

              {/* Parsing Error */}
              {parsingError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parsingError}</span>
                </div>
              )}

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">
                      Record Preview ({parsedRows.length} rows)
                    </span>
                    <span className="text-[11px]">
                      Edit fields directly or remove rows before confirming
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="max-h-72 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] sticky top-0 z-10 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3 w-8 text-center text-slate-400">#</th>
                            <th className="py-2 px-3 font-semibold">Staff ID</th>
                            <th className="py-2 px-3 font-semibold">Employee Name *</th>
                            <th className="py-2 px-3 font-semibold">Department</th>
                            <th className="py-2 px-3 font-semibold">Designation</th>
                            <th className="py-2 px-3 font-semibold">Email</th>
                            <th className="py-2 px-3 font-semibold">Basic Salary</th>
                            <th className="py-2 px-2 w-8 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedRows.map((row, idx) => (
                            <tr
                              key={row._uid}
                              className={`transition ${!row.isValid ? 'bg-rose-50/40' : 'hover:bg-slate-50/70'}`}
                            >
                              <td className="py-1.5 px-3 text-center text-[10px] text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-1 px-2">
                                <input
                                  type="text"
                                  value={row.staff_id}
                                  placeholder="Auto"
                                  onChange={(e) => handleParsedRowChange(idx, 'staff_id', e.target.value)}
                                  className="w-24 px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md focus:outline-none focus:bg-white bg-transparent transition font-mono"
                                />
                              </td>
                              <td className="py-1 px-2">
                                <input
                                  type="text"
                                  value={row.name}
                                  placeholder="Full Name"
                                  onChange={(e) => handleParsedRowChange(idx, 'name', e.target.value)}
                                  className={`w-40 px-2 py-1 text-xs rounded-md focus:outline-none transition font-medium ${
                                    !row.isValid
                                      ? 'border border-rose-300 bg-rose-50/50 text-rose-900 focus:ring-1 focus:ring-rose-400'
                                      : 'border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white text-slate-900'
                                  }`}
                                />
                              </td>
                              <td className="py-1 px-2">
                                <input
                                  type="text"
                                  value={row.department}
                                  onChange={(e) => handleParsedRowChange(idx, 'department', e.target.value)}
                                  className="w-36 px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md focus:outline-none focus:bg-white bg-transparent transition"
                                />
                              </td>
                              <td className="py-1 px-2">
                                <input
                                  type="text"
                                  value={row.designation}
                                  onChange={(e) => handleParsedRowChange(idx, 'designation', e.target.value)}
                                  className="w-36 px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md focus:outline-none focus:bg-white bg-transparent transition"
                                />
                              </td>
                              <td className="py-1 px-2">
                                <input
                                  type="email"
                                  value={row.email}
                                  placeholder="staff@apex.edu"
                                  onChange={(e) => handleParsedRowChange(idx, 'email', e.target.value)}
                                  className="w-36 px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md focus:outline-none focus:bg-white bg-transparent transition"
                                />
                              </td>
                              <td className="py-1 px-2">
                                <input
                                  type="number"
                                  value={row.basic_salary}
                                  onChange={(e) => handleParsedRowChange(idx, 'basic_salary', e.target.value)}
                                  className="w-24 px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md focus:outline-none focus:bg-white bg-transparent transition text-right"
                                />
                              </td>
                              <td className="py-1 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveParsedRow(idx)}
                                  className="p-1 text-slate-300 hover:text-rose-600 rounded transition cursor-pointer"
                                  title="Delete row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL ENTRY */}
          {activeTab === 'manual' && !resultData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Enter employee details directly or paste from clipboard
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    <Clipboard className="w-3 h-3 text-slate-500" />
                    Paste Clipboard
                  </button>
                  <button
                    type="button"
                    onClick={handleAddManualRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Row
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="max-h-80 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-8 text-center text-slate-400">#</th>
                        <th className="py-2 px-3 font-semibold">Staff ID</th>
                        <th className="py-2 px-3 font-semibold">Employee Name *</th>
                        <th className="py-2 px-3 font-semibold">Department</th>
                        <th className="py-2 px-3 font-semibold">Designation</th>
                        <th className="py-2 px-3 font-semibold">Email</th>
                        <th className="py-2 px-3 font-semibold">Basic Salary</th>
                        <th className="py-2 px-2 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {manualRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-1.5 px-3 text-center text-[10px] text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              value={row.staff_id}
                              placeholder="Auto"
                              onChange={(e) => handleManualRowChange(idx, 'staff_id', e.target.value)}
                              className="w-24 px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md focus:outline-none focus:bg-white bg-transparent transition font-mono"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              value={row.name}
                              placeholder="Full Name"
                              onChange={(e) => handleManualRowChange(idx, 'name', e.target.value)}
                              className="w-40 px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md focus:outline-none focus:bg-white bg-transparent transition font-medium"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <select
                              value={row.department}
                              onChange={(e) => handleManualRowChange(idx, 'department', e.target.value)}
                              className="w-36 px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md focus:outline-none focus:bg-white bg-transparent transition cursor-pointer"
                            >
                              {DEFAULT_DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              value={row.designation}
                              placeholder="Assistant Professor"
                              onChange={(e) => handleManualRowChange(idx, 'designation', e.target.value)}
                              className="w-36 px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md focus:outline-none focus:bg-white bg-transparent transition"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="email"
                              value={row.email}
                              placeholder="staff@apex.edu"
                              onChange={(e) => handleManualRowChange(idx, 'email', e.target.value)}
                              className="w-36 px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md focus:outline-none focus:bg-white bg-transparent transition"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="number"
                              value={row.basic_salary}
                              onChange={(e) => handleManualRowChange(idx, 'basic_salary', e.target.value)}
                              className="w-24 px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md focus:outline-none focus:bg-white bg-transparent transition text-right"
                            />
                          </td>
                          <td className="py-1 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveManualRow(idx)}
                              disabled={manualRows.length <= 1}
                              className="p-1 text-slate-300 hover:text-rose-600 rounded transition disabled:opacity-20 cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clean Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            {resultData ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Import Complete
              </span>
            ) : (
              <span>
                Ready to onboard: <strong className="text-slate-800">{currentCount}</strong> employee(s)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.8 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              {resultData ? 'Close' : 'Cancel'}
            </button>

            {!resultData && (
              <button
                type="button"
                onClick={handleSubmitOnboard}
                disabled={isSubmitting || currentCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Onboarding...</span>
                  </>
                ) : (
                  <span>Confirm & Onboard ({currentCount})</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

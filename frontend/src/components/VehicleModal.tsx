import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, ShieldCheck, Car, User, Upload, Download, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import axios from 'axios'
import ExcelJS from 'exceljs'
import { Vehicle } from '../types'
import { useAuth } from '../contexts/AuthContext'



interface VehicleModalProps {
  vehicle: Vehicle | null
  onClose: () => void
  onSuccess: (newVehicle?: Vehicle) => void
}

const VehicleModal = ({ vehicle, onClose, onSuccess }: VehicleModalProps) => {
  // --- State ---
  const [activeTab, setActiveTab] = useState('static-info');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const labelStyle = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5";
  const inputStyle = "w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";

  const FieldLabel = ({ children, required = false, optional = false }: { children: React.ReactNode; required?: boolean; optional?: boolean }) => (
    <label className={labelStyle}>
      {children}
      {required && <span className="text-red-600 ml-1">*</span>}
      {optional && <span className="ml-2 text-xs text-gray-400">(optional)</span>}
    </label>
  );

  const DRAFT_KEY = 'vehicle_modal_draft_v1';

  const { user } = useAuth();
const isSupervisor = user?.role === 'SUPERVISOR';

  // --- Form State ---
  const [draft, setDraft] = useState<Record<string, any>>({
    vehicle_registration_number: '',
    vehicle_type: '',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_status: 'Active',
    manufacturing_year: '',
    fuel_type: 'Diesel',
    seating_capacity: '',
    gps_device_id: '',
    fire_extinguisher_available: false,
    first_aid_kit_available: false,
    emergency_support_number: '',
    rc_number: '',
    registration_date: '',
    registration_expiry: '',
    insurance_number: '',
    insurance_date: '',
    insurance_expiry: '',
    insurance_copy_name: '',
    policy_certificate_name: '',
    registration_certificate_name: '',
    pollution_certificate_name: '',
    assignedDriverId: '',
    service_expiry: '',
    puc_expiry: '',
  });

  // Track actual File objects for uploads (not saved to localStorage)
  const [files, setFiles] = useState<{
    insurance_copy?: File | null;
    policy_certificate?: File | null;
    registration_certificate?: File | null;
    pollution_certificate?: File | null;
  }>({
    insurance_copy: null,
    policy_certificate: null,
    registration_certificate: null,
    pollution_certificate: null
  });

  // --- Alert State ---
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'success' | 'error';
    title: string;
    message: string;
    onConfirm?: () => void;
    onClose?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  const [validationErrors] = useState<Record<string, string>>({});

  const showAlert = (title: string, message: string, type: 'alert' | 'success' | 'error' = 'alert', onCloseCallback?: () => void) => {
    setAlertState({ isOpen: true, type, title, message, onConfirm: undefined, onClose: onCloseCallback });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAlertState({ isOpen: true, type: 'confirm', title, message, onConfirm });
  };

  const closeAlert = () => {
    const callback = alertState.onClose;
    setAlertState(prev => ({ ...prev, isOpen: false }));
    if (callback) callback();
  };

  // --- Effects ---
  useEffect(() => {
    // Load saved draft only when NOT in edit mode (no vehicle prop)
    if (!vehicle) {
      // Clear any existing form data when opening in create mode
      clearDraft();
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          setDraft(prev => ({ ...prev, ...JSON.parse(saved) }));
        }
      } catch (e) {
        // ignore
      }
    }
  }, [vehicle]);

  useEffect(() => {
    // If a vehicle prop is passed (edit mode), populate draft with vehicle data
    if (!vehicle) return;
    const v: any = vehicle as any;
    const mapped: Record<string, any> = {
      vehicle_registration_number: v.vehicle_registration_number || '',
      vehicle_type: v.vehicle_type || '',
      vehicle_brand: v.vehicle_brand || '',
      vehicle_model: v.vehicle_model || '',
      vehicle_status: v.vehicle_status || 'Active',
      manufacturing_year: v.manufacturing_year ? String(v.manufacturing_year) : '',
      fuel_type: v.fuel_type || 'Diesel',
      seating_capacity: v.seating_capacity ? String(v.seating_capacity) : '',
      gps_device_id: v.gps_device_id || '',
      fire_extinguisher_available: !!v.fire_extinguisher_available,
      first_aid_kit_available: !!v.first_aid_kit_available,
      emergency_support_number: v.emergency_support_number || '',
      rc_number: v.rc_number || '',
      registration_date: v.registration_date ? v.registration_date.split('T')[0] : '',
      registration_expiry: v.registration_expiry ? v.registration_expiry.split('T')[0] : '',
      insurance_number: v.insurance_number || '',
      insurance_date: v.insurance_date ? v.insurance_date.split('T')[0] : '',
      insurance_expiry: v.insurance_expiry ? v.insurance_expiry.split('T')[0] : '',
      insurance_copy_name: v.insurance_copy || '',
      policy_certificate_name: v.policy_certificate || '',
      registration_certificate_name: v.registration_certificate || '',
      pollution_certificate_name: v.pollution_certificate || '',
      assignedDriverId: v.assigned_driver_id || '',
      service_expiry: v.service_expiry ? v.service_expiry.split('T')[0] : '',
      puc_expiry: v.puc_expiry ? v.puc_expiry.split('T')[0] : '',
    };
    setDraft(prev => ({ ...prev, ...mapped }));
  }, [vehicle]);

  // --- Handlers ---
  const saveDraft = useCallback((patch: Partial<Record<string, any>>) => {
    setDraft(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch (e) { }
      return next;
    });
  }, []);

  const clearDraft = () => {
    setDraft({
      vehicle_registration_number: '',
      vehicle_type: '',
      vehicle_brand: '',
      vehicle_model: '',
      vehicle_status: 'Active',
      manufacturing_year: '',
      fuel_type: 'Diesel',
      seating_capacity: '',
      gps_device_id: '',
      fire_extinguisher_available: false,
      first_aid_kit_available: false,
      emergency_support_number: '',
      rc_number: '',
      registration_date: '',
      registration_expiry: '',
      insurance_number: '',
      insurance_date: '',
      insurance_expiry: '',
      insurance_copy_name: '',
      policy_certificate_name: '',
      registration_certificate_name: '',
      pollution_certificate_name: '',
      assignedDriverId: '',
      service_expiry: '',
      puc_expiry: '',
    });
    // Reset file states
    setFiles({
      insurance_copy: null,
      policy_certificate: null,
      registration_certificate: null,
      pollution_certificate: null
    });
    // Reset to first tab
    setActiveTab('static-info');
    try { localStorage.removeItem(DRAFT_KEY) } catch (e) { }
  };

  const downloadTemplate = async () => {
    const headers = [
      'Registration Number', 'Brand', 'Model', 'Type', 'Status', 'Fuel Type', 
      'RC Number', 'Registration Expiry', 'Service Expiry', 'PUC Expiry', 
      'Insurance Expiry', 'Year', 'Seating Capacity', 'GPS ID'
    ];
    const sampleRow = [
      'TN01AB1234', 'Toyota', 'Innova', 'SUV', 'Active', 'Diesel', 
      'RC123456789', '2030-12-31', '2024-12-31', '2024-12-31', 
      '2025-12-31', '2023', '7', 'GPS-001'
    ];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');
    worksheet.addRow(headers);
    worksheet.addRow(sampleRow);
    await workbook.xlsx.writeFile('Vehicle_Upload_Template.xlsx');
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      
      // Convert worksheet to JSON format
      const jsonData: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        const rowValues: any = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          const headerValue = cell.value?.toString() || `Column${colNumber}`;
          rowValues[headerValue] = row.getCell(colNumber).value;
        });
        jsonData.push(rowValues);
      });

      if (jsonData.length === 0) {
        showAlert('Empty File', 'The file appears to be empty.', 'error');
        return;
      }

      // Validate headers
      const requiredHeaders = ['Registration Number', 'Brand', 'Model'];
      const firstRow = jsonData[0];
      const isValidFormat = requiredHeaders.every(header => Object.prototype.hasOwnProperty.call(firstRow, header));

      if (!isValidFormat) {
        showAlert('Invalid Format', "Your Excel/Google Sheet format not matching our template. Please download our standard format.", 'error');
        return;
      }

      showConfirm('Confirm Upload', `Found ${jsonData.length} records. Proceed with upload?`, async () => {
        let successCount = 0;
        let failCount = 0;

        for (const row of jsonData) {
          try {
            const formData = new FormData();
            formData.append('vehicle_registration_number', row['Registration Number'] || '');
            formData.append('vehicle_brand', row['Brand'] || '');
            formData.append('vehicle_model', row['Model'] || '');
            formData.append('vehicle_type', row['Type'] || 'Sedan');
            formData.append('vehicle_status', row['Status'] || 'Active');
            formData.append('fuel_type', row['Fuel Type'] || 'Diesel');
            formData.append('rc_number', row['RC Number'] || '');
            
            if(row['Registration Expiry']) formData.append('registration_expiry', row['Registration Expiry']);
            if(row['Service Expiry']) formData.append('service_expiry', row['Service Expiry']);
            if(row['PUC Expiry']) formData.append('puc_expiry', row['PUC Expiry']);
            if(row['Insurance Expiry']) formData.append('insurance_expiry', row['Insurance Expiry']);
            
            formData.append('manufacturing_year', String(row['Year'] || new Date().getFullYear()));
            formData.append('seating_capacity', String(row['Seating Capacity'] || 4));
            if(row['GPS ID']) formData.append('gps_device_id', row['GPS ID']);

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/vehicles/`, formData);
            successCount++;
          } catch (err) {
            failCount++;
          }
        }
        showAlert('Upload Complete', `Success: ${successCount}\nFailed: ${failCount}`, 'success', () => {
          onSuccess(); // For bulk upload, we don't pass specific vehicle data
          onClose();
        });
      });
    } catch (error) {
      showAlert('Error', 'Failed to process file', 'error');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Validate mandatory fields (all fields except Insurance Copy, Registration Certificate, Pollution Certificate)
    if (!draft.vehicle_registration_number?.trim()) {
      errors.vehicle_registration_number = 'Vehicle registration number is required';
    }
    
    if (!draft.vehicle_type?.trim()) {
      errors.vehicle_type = 'Vehicle type is required';
    }
    
    if (!draft.vehicle_brand?.trim()) {
      errors.vehicle_brand = 'Vehicle brand is required';
    }
    
    if (!draft.vehicle_model?.trim()) {
      errors.vehicle_model = 'Vehicle model is required';
    }
    
    if (!draft.rc_number?.trim()) {
      errors.rc_number = 'RC number is required';
    }
    
    if (!draft.registration_expiry) {
      errors.registration_expiry = 'Registration expiry date is required';
    } else if (new Date(draft.registration_expiry) <= new Date()) {
      errors.registration_expiry = 'Registration expiry date must be in the future';
    }
    
    if (!draft.service_expiry) {
      errors.service_expiry = 'Next service date is required';
    } else if (new Date(draft.service_expiry) <= new Date()) {
      errors.service_expiry = 'Service date must be in the future';
    }
    
    if (!draft.insurance_expiry) {
      errors.insurance_expiry = 'Insurance expiry date is required';
    } else if (new Date(draft.insurance_expiry) <= new Date()) {
      errors.insurance_expiry = 'Insurance expiry date must be in the future';
    }
    
    if (!draft.puc_expiry) {
      errors.puc_expiry = 'PUC expiry date is required';
    } else if (new Date(draft.puc_expiry) <= new Date()) {
      errors.puc_expiry = 'PUC expiry date must be in the future';
    }
    
    if (!draft.fuel_type?.trim()) {
      errors.fuel_type = 'Fuel type is required';
    }
    
    // Validate newly mandatory fields
    if (!draft.registration_date) {
      errors.registration_date = 'Registration date is required';
    }
    
    if (!draft.insurance_number?.trim()) {
      errors.insurance_number = 'Insurance number is required';
    }
    
    if (!draft.insurance_date) {
      errors.insurance_date = 'Insurance date is required';
    }
    
    return errors;
  };

  const checkUniqueConstraints = async () => {
    const errors: Record<string, string> = {};
    
    try {
      // Check vehicle registration number uniqueness
      if (draft.vehicle_registration_number?.trim()) {
        const regResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/vehicles/check-registration/${draft.vehicle_registration_number}`);
        if (regResponse.data.exists && (!vehicle || regResponse.data.vehicle_id !== vehicle.id)) {
          errors.vehicle_registration_number = 'Vehicle registration number already exists';
        }
      }
      
      // Check RC number uniqueness
      if (draft.rc_number?.trim()) {
        const rcResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/vehicles/check-rc/${draft.rc_number}`);
        if (rcResponse.data.exists && (!vehicle || rcResponse.data.vehicle_id !== vehicle.id)) {
          errors.rc_number = 'RC number already exists';
        }
      }
    } catch (error) {
      console.error('Error checking unique constraints:', error);
      // Don't block submission if unique check fails, let backend handle it
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      showAlert('Validation Error', Object.values(validationErrors).join('\n'), 'error');
      return;
    }
    
    // Check unique constraints
    const uniqueErrors = await checkUniqueConstraints();
    if (Object.keys(uniqueErrors).length > 0) {
      showAlert('Duplicate Entry', Object.values(uniqueErrors).join('\n'), 'error');
      return;
    }
    
    try {
      // Build FormData to match backend Form/File expectations
      const formData = new FormData();
      formData.append('vehicle_registration_number', draft.vehicle_registration_number || '');
      formData.append('vehicle_type', draft.vehicle_type || '');
      formData.append('vehicle_brand', draft.vehicle_brand || '');
      formData.append('vehicle_model', draft.vehicle_model || '');
      formData.append('vehicle_status', draft.vehicle_status || '');
      formData.append('manufacturing_year', String(parseInt(draft.manufacturing_year) || new Date().getFullYear()));
      formData.append('fuel_type', draft.fuel_type || 'Diesel');
      formData.append('seating_capacity', String(parseInt(draft.seating_capacity) || 0));
      if (draft.gps_device_id) formData.append('gps_device_id', draft.gps_device_id);
      formData.append('fire_extinguisher_available', String(Boolean(draft.fire_extinguisher_available)));
      formData.append('first_aid_kit_available', String(Boolean(draft.first_aid_kit_available)));
      if (draft.emergency_support_number) formData.append('emergency_support_number', draft.emergency_support_number);
      if (draft.rc_number) formData.append('rc_number', draft.rc_number);
      if (draft.registration_date) formData.append('registration_date', draft.registration_date);
      if (draft.registration_expiry) formData.append('registration_expiry', draft.registration_expiry);
      if (draft.insurance_number) formData.append('insurance_number', draft.insurance_number);
      if (draft.insurance_date) formData.append('insurance_date', draft.insurance_date);
      if (draft.insurance_expiry) formData.append('insurance_expiry', draft.insurance_expiry);
      if (draft.assignedDriverId) formData.append('assigned_driver_id', draft.assignedDriverId);
      if (draft.service_expiry) formData.append('service_expiry', draft.service_expiry);
      if (draft.puc_expiry) formData.append('puc_expiry', draft.puc_expiry);

      // Attach files if present
      if (files.insurance_copy) formData.append('insurance_copy', files.insurance_copy);
      if (files.policy_certificate) formData.append('policy_certificate', files.policy_certificate);
      if (files.registration_certificate) formData.append('registration_certificate', files.registration_certificate);
      if (files.pollution_certificate) formData.append('pollution_certificate', files.pollution_certificate);

      // Log auth header and FormData entries for debug
      try {
        console.log('Auth header before submit:', axios.defaults.headers?.common?.Authorization);
      } catch (e) { }
      for (const pair of (formData as any).entries()) {
        console.log('FormData:', pair[0], pair[1]);
      }

      // For edit mode: use PUT; for create mode: use POST
      let response;
      if (vehicle?.id) {
        response = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/vehicles/${vehicle.id}`, formData);
      } else {
        response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/vehicles/`, formData);
      }

      clearDraft();
      onSuccess(response.data);
      onClose();
    } catch (error: any) {
      console.error('Failed to save vehicle:', error);
      // Better error extraction to help debug
      let message = 'Failed to save vehicle. Please check your input and try again.';
      if (error.response) {
        try {
          const status = error.response.status;
          const data = error.response.data;

          // Try to extract a meaningful error message from the response
          if (typeof data === 'string') {
            message = `Request failed (${status}): ${data}`;
          } else if (data && typeof data === 'object') {
            // Check for common error response formats
            if (data.detail) {
              message = `Request failed (${status}): ${data.detail}`;
            } else if (data.message) {
              message = `Request failed (${status}): ${data.message}`;
            } else if (data.error) {
              message = `Request failed (${status}): ${data.error}`;
            } else {
              // Fallback: try to stringify
              try {
                message = `Request failed (${status}): ${JSON.stringify(data)}`;
              } catch (e) {
                message = `Request failed (${status}): Unable to parse error details`;
              }
            }
          } else {
            message = `Request failed (${status}): An unexpected error occurred`;
          }
        } catch (e) {
          message = `Request failed: ${error.response.statusText || 'Unknown error'}`;
        }
      } else if (error.request) {
        message = 'No response received from server. Check server status and network.';
      } else {
        message = error.message || message;
      }
      showAlert('Submission Failed', message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-200 dark:border-gray-800">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center">
  <Car className="mr-3 text-blue-600" size={28} />
  Vehicle Specifications

  {isSupervisor && (
    <span className="ml-4 px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
      View Only Mode
    </span>
  )}
</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage fleet asset details and compliance records</p>
            <p className="text-xs text-gray-500 mt-2"><span className="text-red-600 font-bold">*</span> Required fields — fields labeled <span className="text-gray-400">(optional)</span> are not mandatory.</p>
          </div>
          <div className="flex items-center gap-2">
            {!vehicle && !isSupervisor && (
              <>
                <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Download Template">
                  <Download size={18} />
                  <span className="hidden sm:inline">Template</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleBulkUpload} className="hidden" accept=".xlsx,.xls,.csv" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Bulk Upload">
                  <Upload size={18} />
                  <span className="hidden sm:inline">Bulk Upload</span>
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Navigation - Logic Based on Static vs Dynamic Data */}
        <div className="px-6 py-4 bg-white dark:bg-gray-900">
          <div className="flex p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl space-x-1">
            {[
              { id: 'static-info', label: 'Static Identity', icon: <Car size={16} /> },
              { id: 'ownership', label: 'Ownership & Assignment', icon: <User size={16} /> },
              { id: 'dynamic-records', label: 'Dynamic Records', icon: <ShieldCheck size={16} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form 
  onSubmit={!isSupervisor ? handleSubmit : undefined} 
  className="p-8 pt-2"
>
  <fieldset disabled={isSupervisor}>
          <div className="min-h-[380px]">
            {/* TAB 1: STATIC DATA (Core Identity) */}
            {activeTab === 'static-info' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Vehicle Registration Number</FieldLabel>
                    <input required type="text" placeholder="TN60AB4654" className={`${inputStyle} ${validationErrors.vehicle_registration_number ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.vehicle_registration_number} onChange={e => saveDraft({ vehicle_registration_number: e.target.value })} />
                    {validationErrors.vehicle_registration_number && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.vehicle_registration_number}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>Vehicle Brand</FieldLabel>
                    <input required type="text" placeholder="e.g. Suzuki" className={`${inputStyle} ${validationErrors.vehicle_brand ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.vehicle_brand} onChange={e => saveDraft({ vehicle_brand: e.target.value })} />
                    {validationErrors.vehicle_brand && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.vehicle_brand}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>Vehicle Model</FieldLabel>
                    <input required type="text" placeholder="Dezire" className={`${inputStyle} ${validationErrors.vehicle_model ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.vehicle_model} onChange={e => saveDraft({ vehicle_model: e.target.value })} />
                    {validationErrors.vehicle_model && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.vehicle_model}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>RC Number</FieldLabel>
                    <input required type="text" placeholder="RC12345" className={`${inputStyle} ${validationErrors.rc_number ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.rc_number} onChange={e => saveDraft({ rc_number: e.target.value })} />
                    {validationErrors.rc_number && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.rc_number}</p>
                    )}
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                    <FieldLabel required><span className="text-red-600">Registration Expiry</span></FieldLabel>
                    <input required type="date" className={`${inputStyle} ${validationErrors.registration_expiry ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.registration_expiry} onChange={e => saveDraft({ registration_expiry: e.target.value })} />
                    {validationErrors.registration_expiry && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.registration_expiry}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Vehicle Type</FieldLabel>
                    <select required className={`${inputStyle} ${validationErrors.vehicle_type ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.vehicle_type} onChange={e => saveDraft({ vehicle_type: e.target.value })}>
                      <option>Mini Bus</option>
                      <option>Commercial Load Vehicle</option>
                      <option>Passenger Van</option>
                      <option>Sedan</option>
                      <option>SUV</option>
                      <option>MUV</option>
                      <option>Hatch back</option>
                      <option>Truck</option>
                    </select>
                    {validationErrors.vehicle_type && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.vehicle_type}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>Vehicle Status</FieldLabel>
                    <select required className={inputStyle + " text-green-600 font-bold"} value={draft.vehicle_status} onChange={e => saveDraft({ vehicle_status: e.target.value })}>
                      <option>Active</option>
                      <option>In Maintenance</option>
                      <option>Idle</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel optional>Manufacturing Year</FieldLabel>
                    <input type="number" placeholder="2024" className={inputStyle} value={draft.manufacturing_year} onChange={e => saveDraft({ manufacturing_year: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>Fuel Type</FieldLabel>
                    <select required className={`${inputStyle} ${validationErrors.fuel_type ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.fuel_type} onChange={e => saveDraft({ fuel_type: e.target.value })}>
                      <option>Diesel</option>
                      <option>Petrol</option>
                      <option>Electric</option>
                      <option>CNG</option>
                    </select>
                    {validationErrors.fuel_type && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.fuel_type}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel optional>Seating Capacity</FieldLabel>
                    <input type="number" className={inputStyle} value={draft.seating_capacity} onChange={e => saveDraft({ seating_capacity: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: OWNERSHIP & STATUS (Mixed Static/Dynamic) */}
            {activeTab === 'ownership' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div>
                    <FieldLabel optional>GPS Device ID</FieldLabel>
                    <input type="text" placeholder="IMEI-990021..." className={inputStyle} value={draft.gps_device_id} onChange={e => saveDraft({ gps_device_id: e.target.value })} />
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                    <FieldLabel required><span className="text-red-600">Next Service Date</span></FieldLabel>
                    <input required type="date" className={`${inputStyle} ${validationErrors.service_expiry ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.service_expiry} onChange={e => saveDraft({ service_expiry: e.target.value })} />
                    {validationErrors.service_expiry && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.service_expiry}</p>
                    )}
                  </div>

                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium text-red-500">Fire Extinguisher Available</span>
                    <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={draft.fire_extinguisher_available} onChange={e => saveDraft({ fire_extinguisher_available: e.target.checked })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium text-red-500">First Aid Kit Available</span>
                    <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={draft.first_aid_kit_available} onChange={e => saveDraft({ first_aid_kit_available: e.target.checked })} />
                  </div>
                  <div>
                    <FieldLabel optional>Ownership Type</FieldLabel>
                    <select className={inputStyle} value={draft.ownershipType} onChange={e => saveDraft({ ownershipType: e.target.value })}>
                      <option>Leased</option>
                      <option>Owned</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DYNAMIC RECORDS (Frequently Changing) */}
            {activeTab === 'dynamic-records' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">

                  <div>
                    <FieldLabel required>Registration Date</FieldLabel>
                    <input required type="date" className={`${inputStyle} ${validationErrors.registration_date ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.registration_date} onChange={e => saveDraft({ registration_date: e.target.value })} />
                    {validationErrors.registration_date && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.registration_date}</p>
                    )}
                  </div>

                  <div>
                    <FieldLabel required>Insurance Number</FieldLabel>
                    <input required type="text" placeholder="INS-2025-334" className={`${inputStyle} ${validationErrors.insurance_number ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.insurance_number} onChange={e => saveDraft({ insurance_number: e.target.value })} />
                    {validationErrors.insurance_number && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.insurance_number}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>Insurance Date</FieldLabel>
                    <input required type="date" className={`${inputStyle} ${validationErrors.insurance_date ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.insurance_date} onChange={e => saveDraft({ insurance_date: e.target.value })} />
                    {validationErrors.insurance_date && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.insurance_date}</p>
                    )}
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                    <FieldLabel required><span className="text-red-600">Insurance Expiry</span></FieldLabel>
                    <input required type="date" className={`${inputStyle} ${validationErrors.insurance_expiry ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.insurance_expiry} onChange={e => saveDraft({ insurance_expiry: e.target.value })} />
                    {validationErrors.insurance_expiry && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.insurance_expiry}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <FieldLabel optional>Insurance Copy</FieldLabel>
                    <input type="file" onChange={e => { const file = e.target.files?.[0] || null; setFiles(prev => ({ ...prev, insurance_copy: file })); saveDraft({ insurance_copy_name: file?.name || '' }) }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200" />
                    {draft.insurance_copy_name && <p className="text-xs text-gray-400 mt-2">Selected: {draft.insurance_copy_name}</p>}
                  </div>
                  <div>
                    <FieldLabel optional>Registration Certificate</FieldLabel>
                    <input type="file" onChange={e => { const file = e.target.files?.[0] || null; setFiles(prev => ({ ...prev, registration_certificate: file })); saveDraft({ registration_certificate_name: file?.name || '' }) }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200" />
                    {draft.registration_certificate_name && <p className="text-xs text-gray-400 mt-2">Selected: {draft.registration_certificate_name}</p>}
                  </div>
                  <div>
                    <FieldLabel optional>Pollution Certificate</FieldLabel>
                    <input type="file" onChange={e => { const file = e.target.files?.[0] || null; setFiles(prev => ({ ...prev, pollution_certificate: file })); saveDraft({ pollution_certificate_name: file?.name || '' }) }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200" />
                    {draft.pollution_certificate_name && <p className="text-xs text-gray-400 mt-2">Selected: {draft.pollution_certificate_name}</p>}
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                    <FieldLabel required><span className="text-red-600">PUC Expiry</span></FieldLabel>
                    <input required type="date" className={`${inputStyle} ${validationErrors.puc_expiry ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.puc_expiry} onChange={e => saveDraft({ puc_expiry: e.target.value })} />
                    {validationErrors.puc_expiry && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.puc_expiry}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          </fieldset>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="button" onClick={clearDraft} className="px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Clear Draft
            </button>
            {!isSupervisor && (
  <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
    Submit Record
  </button>
)}
          </div>
        </form>
      </div>

      {/* Custom Alert/Confirm Modal */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 dark:border-gray-700 transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-4">
              {alertState.type === 'error' && <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><AlertTriangle className="text-red-600 dark:text-red-400" size={24} /></div>}
              {alertState.type === 'success' && <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full"><CheckCircle className="text-green-600 dark:text-green-400" size={24} /></div>}
              {(alertState.type === 'alert' || alertState.type === 'confirm') && <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><Info className="text-blue-600 dark:text-blue-400" size={24} /></div>}
              
              <h3 className={`text-lg font-bold ${
                alertState.type === 'error' ? 'text-red-600 dark:text-red-400' :
                alertState.type === 'success' ? 'text-green-600 dark:text-green-400' :
                'text-gray-900 dark:text-white'
              }`}>
                {alertState.title}
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed whitespace-pre-line pl-1">
              {alertState.message}
            </p>

            <div className="flex justify-end gap-3">
              {alertState.type === 'confirm' ? (
                <>
                  <button onClick={closeAlert} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => { if (alertState.onConfirm) alertState.onConfirm(); closeAlert(); }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-500/30 transition-colors">
                    Confirm
                  </button>
                </>
              ) : (
                <button onClick={closeAlert} className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 rounded-lg transition-colors">
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VehicleModal;

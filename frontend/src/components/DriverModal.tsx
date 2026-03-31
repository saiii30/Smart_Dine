import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { X, Upload, Download, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { Driver } from '../types'
import { useAuth } from '../contexts/AuthContext'
interface DriverModalProps {
  driver: Driver | null
  onClose: () => void
  onSuccess: () => void
}

const DriverModal = ({ driver, onClose, onSuccess }: DriverModalProps) => {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isAdmin = user?.role === 'ADMIN'
  const isSupervisor = user?.role === 'SUPERVISOR'
  const labelStyle = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5";
  const isReadOnly = isSupervisor
  const inputStyle = `
  w-full p-2.5 border border-gray-300 dark:border-gray-600 
  rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
  focus:ring-2 focus:ring-blue-500 focus:border-transparent 
  outline-none transition-all
  ${isReadOnly ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}
`
  


  const FieldLabel = ({ children, required = false, optional = false }: { children: React.ReactNode; required?: boolean; optional?: boolean }) => (
    <label className={labelStyle}>
      {children}
      {required && <span className="text-red-600 ml-1">*</span>}
      {optional && <span className="ml-2 text-xs text-gray-400">(optional)</span>}
    </label>
  );


  const [activeTab, setActiveTab] = useState('static-info');
  const [isEditing] = useState(!!(driver as any)?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  const DRAFT_KEY = 'driver_modal_draft_v1';

  const [draft, setDraft] = useState<Record<string, any>>({
    full_name: '',
    phone_number: '',
    password: '',
    has_existing_password: false, // Track if driver has existing password
    date_of_birth: '',
    gender: '',
    aadhar_number: '',
    aadhar_document_name: '',
    driving_license_number: '',
    license_expiry_date: '',
    driver_photo_name: '',
    police_verification_certificate_name: '',
    medical_fitness_certificate_name: '',
    verification_status: 'Pending',
    current_address: '',
    city: '',
    state: '',
    pincode: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    blood_group: '',
    previous_employer_experience: '',
    languages_spoken: '',
    shift_preference: '',
    status: 'Active',
    assigned_vehicle_id: '',
    showPassword: false
  });

  // Track actual File objects for uploads (not saved to localStorage)
  const [files, setFiles] = useState<{
    aadhar_document?: File | null;
    driver_photo?: File | null;
    police_verification_certificate?: File | null;
    medical_fitness_certificate?: File | null
  }>({
    aadhar_document: null,
    driver_photo: null,
    police_verification_certificate: null,
    medical_fitness_certificate: null
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

  useEffect(() => {
    // Only load draft if we're editing an existing driver
    if (driver) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) setDraft(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) { }
    } else {
      // Clear draft when opening new driver form to ensure empty fields
      clearDraft();
    }
  }, [driver]);

  useEffect(() => {
    if (!driver) return;
    const d: any = driver as any;
    const mapped: Record<string, any> = {
      full_name: d.full_name || d.user?.name || '',
      phone_number: d.phone_number || d.user?.contact_number || '',
      password: '', // Never load existing password for security
      date_of_birth: d.date_of_birth ? new Date(d.date_of_birth).toISOString().split('T')[0] : '',
      gender: d.gender || '',
      aadhar_number: d.aadhar_number || '',
      aadhar_document_name: d.aadhar_document || '',
      driving_license_number: d.driving_license_number || '',
      license_expiry_date: d.license_expiry_date ? new Date(d.license_expiry_date).toISOString().split('T')[0] : '',
      driver_photo_name: d.driver_photo || '',
      police_verification_certificate_name: d.police_verification_certificate || '',
      medical_fitness_certificate_name: d.medical_fitness_certificate || '',
      verification_status: d.verification_status || 'Pending',
      current_address: d.current_address || '',
      city: d.city || '',
      state: d.state || '',
      pincode: d.pincode || '',
      emergency_contact_name: d.emergency_contact_name || '',
      emergency_contact_number: d.emergency_contact_number || '',
      blood_group: d.blood_group || '',
      previous_employer_experience: d.previous_employer_experience || '',
      languages_spoken: d.languages_spoken || '',
      shift_preference: d.shift_preference || '',
      status: d.status || 'Active',
      assigned_vehicle_id: d.assigned_vehicle_id || '',
      showPassword: false, // Reset password visibility when editing
    };
    setDraft(prev => ({ ...prev, ...mapped, has_existing_password: !!(driver as any)?.user?.password_hash, showPassword: false }));
  }, [driver]);

  // Clear password when switching between different drivers
  useEffect(() => {
    saveDraft({ password: '', showPassword: false, has_existing_password: !!(driver as any)?.user?.password_hash });
  }, [driver?.id]);
    // --- Handlers ---
  
  const downloadTemplate = () => {
    const headers = [
      'Full Name', 'Phone Number', 'Date of Birth', 'Gender', 'Aadhar Number',
      'License Number', 'License Expiry', 'Blood Group', 'Status', 'Shift Preference',
      'Current Address', 'City', 'State', 'Pincode', 'Emergency Contact Name', 'Emergency Contact Number',
      'Previous Employer Experience', 'Languages Spoken'
    ];
    const sampleRow = [
      'John Doe', '9876543210', '1990-01-01', 'Male', '123456789012',
      'DL1234567890', '2030-12-31', 'O+', 'Active', 'Morning',
      '123 Main St', 'Chennai', 'Tamil Nadu', '600001', 'Jane Doe', '9876543211',
      '2 years at ABC Transport', 'English, Tamil'
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Driver_Upload_Template.xlsx");
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        showAlert('Empty File', 'The file appears to be empty.', 'error');
        return;
      }

      const requiredHeaders = ['Full Name', 'Phone Number', 'License Number', 'License Expiry'];
      const firstRow = jsonData[0];
      const isValidFormat = requiredHeaders.every(header => Object.prototype.hasOwnProperty.call(firstRow, header));

      if (!isValidFormat) {
        showAlert('Invalid Format', "Your Excel/Google Sheet format not matching our template. Please download our standard format.", 'error');
        return;
      }

      // Validate required fields for each row
      const validationErrors: string[] = [];
      jsonData.forEach((row, index) => {
        const rowNum = index + 2; // Excel row numbers start from 2 (after header)
        if (!row['Full Name']?.trim()) validationErrors.push(`Row ${rowNum}: Full Name is required`);
        if (!row['Phone Number']?.trim()) validationErrors.push(`Row ${rowNum}: Phone Number is required`);
        if (!row['License Number']?.trim()) validationErrors.push(`Row ${rowNum}: License Number is required`);
        if (!row['License Expiry']?.trim()) validationErrors.push(`Row ${rowNum}: License Expiry is required`);
      });

      if (validationErrors.length > 0) {
        showAlert('Validation Errors', validationErrors.slice(0, 10).join('\n') + (validationErrors.length > 10 ? '\n...and more' : ''), 'error');
        return;
      }

      showConfirm('Confirm Upload', `Found ${jsonData.length} records. Proceed with upload?`, async () => {
        let successCount = 0;
        let failCount = 0;
        const errorDetails: string[] = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowNum = i + 2;
          
          try {
            const formData = new FormData();
            
            // Required fields
            formData.append('full_name', String(row['Full Name'] || '').trim());
            formData.append('phone_number', String(row['Phone Number'] || '').trim());
            formData.append('driving_license_number', String(row['License Number'] || '').trim());
            formData.append('license_expiry_date', String(row['License Expiry'] || '').trim());
            
            // Generate auto password for bulk upload
            const autoPassword = generatePassword();
            formData.append('password', autoPassword);
            
            // Optional fields
            if (row['Date of Birth']) formData.append('date_of_birth', String(row['Date of Birth']).trim());
            formData.append('gender', String(row['Gender'] || 'Male').trim());
            if (row['Aadhar Number']) formData.append('aadhar_number', String(row['Aadhar Number']).trim());
            if (row['Blood Group']) formData.append('blood_group', String(row['Blood Group']).trim());
            if (row['Status']) formData.append('status', String(row['Status'] || 'Active').trim());
            if (row['Shift Preference']) formData.append('shift_preference', String(row['Shift Preference']).trim());
            if (row['Current Address']) formData.append('current_address', String(row['Current Address']).trim());
            if (row['City']) formData.append('city', String(row['City']).trim());
            if (row['State']) formData.append('state', String(row['State']).trim());
            if (row['Pincode']) formData.append('pincode', String(row['Pincode']).trim());
            if (row['Emergency Contact Name']) formData.append('emergency_contact_name', String(row['Emergency Contact Name']).trim());
            if (row['Emergency Contact Number']) formData.append('emergency_contact_number', String(row['Emergency Contact Number']).trim());
            if (row['Previous Employer Experience']) formData.append('previous_employer_experience', String(row['Previous Employer Experience']).trim());
            if (row['Languages Spoken']) formData.append('languages_spoken', String(row['Languages Spoken']).trim());

            await axios.post('http://127.0.0.1:8000/api/drivers/', formData);
            successCount++;
          } catch (err: any) {
            failCount++;
            const errorMessage = err?.response?.data?.detail || err?.message || 'Unknown error';
            errorDetails.push(`Row ${rowNum} (${row['Full Name'] || 'Unknown'}): ${errorMessage}`);
          }
        }
        
        const message = `Upload Complete!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`;
        const fullMessage = errorDetails.length > 0 
          ? message + '\n\nError Details:\n' + errorDetails.slice(0, 5).join('\n') + (errorDetails.length > 5 ? '\n...and more' : '')
          : message;
        
        showAlert(
          failCount > 0 ? 'Upload Completed with Errors' : 'Upload Successful', 
          fullMessage, 
          failCount > 0 ? 'error' : 'success', 
          () => {
            onSuccess();
            onClose();
          }
        );
      });
    } catch (error) {
      console.error('Bulk upload error:', error);
      showAlert('Error', 'Failed to process file. Please ensure it\'s a valid Excel file.', 'error');
    }
  };


  const saveDraft = (patch: Partial<Record<string, any>>) => {
    setDraft(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch (e) { }
      return next;
    });
  };

  const clearDraft = () => {
    setDraft({
      full_name: '',
      phone_number: '',
      password: '', // Clear password when resetting draft
      has_existing_password: false,
      date_of_birth: '',
      gender: '',
      aadhar_number: '',
      aadhar_document_name: '',
      driving_license_number: '',
      license_expiry_date: '',
      driver_photo_name: '',
      police_verification_certificate_name: '',
      medical_fitness_certificate_name: '',
      verification_status: 'Pending',
      current_address: '',
      city: '',
      state: '',
      pincode: '',
      emergency_contact_name: '',
      emergency_contact_number: '',
      blood_group: '',
      previous_employer_experience: '',
      languages_spoken: '',
      shift_preference: '',
      status: 'Active',
      assigned_vehicle_id: '',
      showPassword: false, // Reset password visibility
    });
    try { localStorage.removeItem(DRAFT_KEY) } catch (e) { }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof files, nameKey: keyof typeof draft) => {
    const file = e.target.files?.[0] || null
    setFiles(prev => ({ ...prev, [key]: file }))
    saveDraft({ [nameKey]: file?.name || '' })
  }

  // Function to generate a secure random password
  const generatePassword = useCallback((length = 12) => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';

    const allChars = uppercase + lowercase + numbers + special;
    let password = '';

    // Use crypto API for better randomness
    const getRandomChar = (charset: string) => {
      const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % charset.length;
      return charset[randomIndex];
    };

    // Ensure at least one character from each set
    password += getRandomChar(uppercase);
    password += getRandomChar(lowercase);
    password += getRandomChar(numbers);
    password += getRandomChar(special);

    // Fill the rest of the password
    for (let i = 4; i < length; i++) {
      password += getRandomChar(allChars);
    }

    // Shuffle the password using Fisher-Yates algorithm
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
      [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }

    return passwordArray.join('');
  }, []);

  // Function to copy password to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Password copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy password: ', err);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = new FormData();

      // Only include password in payload if it's a new driver or if it was changed
      const { showPassword, ...draftWithoutShowPassword } = draft;
      Object.entries(draftWithoutShowPassword).forEach(([k, v]) => {
        if (v !== undefined && v !== null) payload.append(k, String(v))
      });
      // Add files to form data
      if (files.aadhar_document) payload.append('aadhar_document', files.aadhar_document);
      if (files.driver_photo) payload.append('driver_photo', files.driver_photo);
      if (files.police_verification_certificate) payload.append('police_verification_certificate', files.police_verification_certificate);
      if (files.medical_fitness_certificate) payload.append('medical_fitness_certificate', files.medical_fitness_certificate);

      if (isEditing) {
        // For updates, only include password if it was changed
        if (!draft.password) {
          payload.delete('password'); // Don't update password if field is empty
        }
        await axios.put(`http://127.0.0.1:8000/api/drivers/${(driver as any).id}`, payload);
      } else {
        // For new drivers, require a password
        if (!draft.password) {
          alert('Please enter a password');
          return;
        }
        await axios.post('http://127.0.0.1:8000/api/drivers/', payload);
      }

      clearDraft();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save driver:', error);
      showAlert('Submission Failed', typeof error.response?.data === 'string' ? error.response.data : 'Failed to save driver', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center">
              <svg className="mr-3 text-blue-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-3-3.87"></path><path d="M4 21v-2a4 4 0 0 1 3-3.87"></path><path d="M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path></svg>
              Driver Details
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage driver identity, documents and assignments</p>
            {isSupervisor && (
  <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
    View Only Mode
  </span>
)}
            <p className="text-xs text-gray-500 mt-2"><span className="text-red-600 font-bold">*</span> Required fields — fields labeled <span className="text-gray-400">(optional)</span> are not mandatory.</p>
          </div>
          <div className="flex items-center gap-2">
            {!driver && !isSupervisor && (
              <>
                <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Download Template">
                  <Download size={18} />
                  <span className="hidden sm:inline">Template</span>
                </button>
                <input
  disabled={isReadOnly}  type="file" ref={fileInputRef} onChange={handleBulkUpload} className="hidden" accept=".xlsx,.xls,.csv" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Bulk Upload">
                  <Upload size={18} />
                  <span className="hidden sm:inline">Bulk Upload</span>
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400"><X size={24} /></button>
          </div>
        </div>

        <div className="px-6 py-4 bg-white dark:bg-gray-900">
          <div className="flex p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl space-x-1">
            {[{ id: 'static-info', label: 'Identity', icon: 'user' }, { id: 'documents', label: 'Documents', icon: 'file' }, { id: 'assignment', label: 'Assignment', icon: 'shield' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-2">
          <div className="min-h-[360px]">
            {activeTab === 'static-info' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Full Name</FieldLabel>
                    <input
  disabled={isReadOnly} required type="text" className={inputStyle} value={draft.full_name} onChange={e => saveDraft({ full_name: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>Phone Number</FieldLabel>
                    <input disabled={isReadOnly} required type="tel" maxLength={10} placeholder="10-digit number" className={inputStyle} value={draft.phone_number} onChange={e => saveDraft({ phone_number: e.target.value.replace(/\D/g, '') })} />
                  </div>
                  <div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <FieldLabel required={!isEditing}>Password</FieldLabel>
                        {!isEditing && (
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => saveDraft({ password: generatePassword() })}
                              className="px-3 py-1 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                            >
                              Generate
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="relative">
                      <input
  disabled={isReadOnly}
                          type={draft.showPassword ? 'text' : 'password'}
                          required={!isEditing}
                          placeholder={isEditing 
                            ? (draft.has_existing_password ? 'Enter new password to change' : 'Set a password for this driver')
                            : 'Password will be auto-generated'
                          }
                          className={`${inputStyle} pr-20`}
                          value={draft.password || ''}
                          onChange={e => saveDraft({ password: e.target.value })}
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              copyToClipboard(draft.password);
                            }}
                            className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-1"
                            title="Copy to clipboard"
                            disabled={!draft.password}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => saveDraft({ showPassword: !draft.showPassword })}
                            className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-1"
                            title={draft.showPassword ? 'Hide password' : 'Show password'}
                          >
                            {draft.showPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    {!isEditing && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        This will be the driver's initial password
                      </p>
                    )}
                    {isEditing && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {draft.has_existing_password 
                          ? 'Leave empty to keep current password, or enter new password to change it'
                          : 'Set a password for this driver'
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>Date of Birth</FieldLabel>
                    <input
  disabled={isReadOnly} type="date" className={inputStyle} value={draft.date_of_birth} onChange={e => saveDraft({ date_of_birth: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>Gender</FieldLabel>
                    <select className={inputStyle} value={draft.gender} onChange={e => saveDraft({ gender: e.target.value })}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Blood Group</FieldLabel>
                    <select className={inputStyle} value={draft.blood_group} onChange={e => saveDraft({ blood_group: e.target.value })}>
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel >Languages Spoken</FieldLabel>
                    <input disabled={isReadOnly} type="text" placeholder="e.g. English, Tamil" className={inputStyle} value={draft.languages_spoken} onChange={e => saveDraft({ languages_spoken: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Shift Preference</FieldLabel>
                    <select disabled={isReadOnly} className={inputStyle} value={draft.shift_preference} onChange={e => saveDraft({ shift_preference: e.target.value })}>
                      <option value="">Select</option>
                      <option value="morning">Morning</option>
                      <option value="night">Night</option>
                      <option value="rotational">Rotational</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Status</FieldLabel>
                    <select disabled={isReadOnly} className={inputStyle} value={draft.status} onChange={e => saveDraft({ status: e.target.value })}>
                      <option>Active</option>
                      <option>Inactive</option>
                      <option>Suspended</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

             {activeTab === 'documents' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Aadhar Number</FieldLabel>
                    <input disabled={isReadOnly} type="text" maxLength={12} placeholder="12-digit Aadhar number" className={inputStyle} value={draft.aadhar_number} onChange={e => saveDraft({ aadhar_number: e.target.value.replace(/\D/g, '') })} />
                  </div>
                  <div>
                    <FieldLabel required>Aadhar Document</FieldLabel>
                    <input
  disabled={isReadOnly} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFile(e, 'aadhar_document', 'aadhar_document_name')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200" />
                    {draft.aadhar_document_name && <p className="text-xs text-gray-400 mt-2">Selected: {draft.aadhar_document_name}</p>}
                  </div>
                  <div>
                    <FieldLabel required>Driving License Number</FieldLabel>
                    <input disabled={isReadOnly} type="text" className={inputStyle} value={draft.driving_license_number} onChange={e => saveDraft({ driving_license_number: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>License Expiry Date</FieldLabel>
                    <input disabled={isReadOnly} type="date" className={inputStyle} value={draft.license_expiry_date} onChange={e => saveDraft({ license_expiry_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Driver Photo</FieldLabel>
                    <input disabled={isReadOnly} type="file" accept="image/*" onChange={e => handleFile(e, 'driver_photo', 'driver_photo_name')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200" />
                    {draft.driver_photo_name && <p className="text-xs text-gray-400 mt-2">Selected: {draft.driver_photo_name}</p>}
                  </div>
                  <div>
                    <FieldLabel required>Police Verification Certificate</FieldLabel>
                    <input disabled={isReadOnly}   type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFile(e, 'police_verification_certificate', 'police_verification_certificate_name')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200" />
                    {draft.police_verification_certificate_name && <p className="text-xs text-gray-400 mt-2">Selected: {draft.police_verification_certificate_name}</p>}
                  </div>
                  <div>
                    <FieldLabel required>Medical Fitness Certificate</FieldLabel>
                    <input disabled={isReadOnly} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFile(e, 'medical_fitness_certificate', 'medical_fitness_certificate_name')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200" />
                    {draft.medical_fitness_certificate_name && <p className="text-xs text-gray-400 mt-2">Selected: {draft.medical_fitness_certificate_name}</p>}
                  </div>
                  <div>
                    <FieldLabel required>Verification Status</FieldLabel>
                    <select disabled={isReadOnly} className={inputStyle} value={draft.verification_status} onChange={e => saveDraft({ verification_status: e.target.value })}>
                      <option>Pending</option>
                      <option>Verified</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'assignment' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">

                  <div>
                    <FieldLabel required>Emergency Contact Name</FieldLabel>
                    <input disabled={isReadOnly} type="text" className={inputStyle} value={draft.emergency_contact_name} onChange={e => saveDraft({ emergency_contact_name: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>Emergency Contact Number</FieldLabel>
                    <input disabled={isReadOnly} type="tel" maxLength={10} placeholder="10-digit number" className={inputStyle} value={draft.emergency_contact_number} onChange={e => saveDraft({ emergency_contact_number: e.target.value.replace(/\D/g, '') })} />
                  </div>
                  <div>
                    <FieldLabel>Previous Employer Experience</FieldLabel>
                    <textarea disabled={isReadOnly} rows={3} className={inputStyle} value={draft.previous_employer_experience} onChange={e => saveDraft({ previous_employer_experience: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Current Address</FieldLabel>
                    <textarea disabled={isReadOnly} rows={2} className={inputStyle} value={draft.current_address} onChange={e => saveDraft({ current_address: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>City</FieldLabel>
                    <input disabled={isReadOnly} type="text" className={inputStyle} value={draft.city} onChange={e => saveDraft({ city: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>State</FieldLabel>
                    <input disabled={isReadOnly} type="text" className={inputStyle} value={draft.state} onChange={e => saveDraft({ state: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>Pincode</FieldLabel>
                    <input disabled={isReadOnly} type="text" maxLength={6} placeholder="6-digit pincode" className={inputStyle} value={draft.pincode} onChange={e => saveDraft({ pincode: e.target.value.replace(/\D/g, '') })} />
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
            {!isSupervisor && (
            <button type="button" onClick={clearDraft} className="px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Clear Draft</button>
            )}
            {!isSupervisor && (
            <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">Submit Record</button>
            )}
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
        </form>
      </div>
    </div>
  );
};

export default DriverModal;

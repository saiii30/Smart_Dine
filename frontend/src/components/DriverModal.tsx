import { useState, useEffect, useRef, useCallback } from 'react'
import {api} from '../api/api'
import ExcelJS from 'exceljs'
import { X, Upload, Download, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { Driver } from '../types'
import { useAuth } from '../contexts/AuthContext'
import FileUpload from './FileUpload'
interface DriverModalProps {
  driver: Driver | null
  onClose: () => void
  onSuccess: () => void
}

const DriverModal = ({ driver, onClose, onSuccess }: DriverModalProps) => {
  const { user } = useAuth()
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
    employee_id: '',
    phone_number: '',
    password: '',
    has_existing_password: false, // Track if driver has existing password
    password_modified: false, // Track if password was modified
    date_of_birth: '',
    gender: '',
    aadhar_number: '',
    aadhar_document_name: '',
    pan_card_number: '',
    pan_card_name: '',
    driving_license_number: '',
    driving_license_document_name: '',
    license_expiry_date: '',
    personal_resume_name: '',
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
    pan_card?: File | null;
    driving_license_document?: File | null;
    personal_resume?: File | null;
    driver_photo?: File | null;
    police_verification_certificate?: File | null;
    medical_fitness_certificate?: File | null
  }>({
    aadhar_document: null,
    pan_card: null,
    driving_license_document: null,
    personal_resume: null,
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

  // --- Submit Confirmation State ---
  const [submitConfirmState, setSubmitConfirmState] = useState<{
    isOpen: boolean;
    isEditing: boolean;
    driverName: string;
  }>({ isOpen: false, isEditing: false, driverName: '' });

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

   const validateRow = (row: any, index: number) => {
  const errors: string[] = [];

  if (!row['Pincode']) {
    errors.push(`Row ${index}: Pincode is missing`);
  }

   if (!row['State']) {
    errors.push(`Row ${index}: State is missing`);
  }

  if(!row['City']) {
    errors.push(`Row ${index}: City is missing`);
  }

  if(!row['Current Address'])
  {
    errors.push(`Row ${index}: Current Address is missing`);
  }

  if(!row['Emergency Contact Number'])
  {
    errors.push(`Row ${index}: Emergency Contact Number is missing`);
  }

  if(!row['Emergency Contact Name'])
  {
    errors.push(`Row ${index}: PUC Emergency Contact Name is missing`);
  }


  if(!row['License Expiry'])
  {
    errors.push(`Row ${index}: License Expiry is missing`)
  }

  if (!row['License Number']) {
    errors.push(`Row ${index}: License Number is missing`);
  }

  if (!row['Gender']) {
    errors.push(`Row ${index}: Gender is missing`);
  }

  if(!row['Date of Birth'])
  {
    errors.push(`Row ${index}: Date of Birth is missing`);
  }

  if (!row['Password']) {
    errors.push(`Row ${index}: Password is missing`);
  }

  if(!row["Phone Number"])
  {
    errors.push(`Row ${index}: Phone Number is missing`);
  }

  if (!row['Blood Group']) {
    errors.push(`Row ${index}: Blood Group is missing`);
  }

  if (!row['Full Name']) {
    errors.push(`Row ${index}: Full Name is missing`);
  }

  return errors;
};

  useEffect(() => {
    if (!driver) return;
    const d: any = driver as any;
    const mapped: Record<string, any> = {
      full_name: d.full_name || d.user?.name || '',
      employee_id: d.employee_id || '',
      phone_number: d.phone_number || d.user?.contact_number || '',
      password: '', // Never load existing password for security
      date_of_birth: d.date_of_birth ? new Date(d.date_of_birth).toISOString().split('T')[0] : '',
      gender: d.gender || '',
      aadhar_number: d.aadhar_number || '',
      aadhar_document_name: d.aadhar_document || '',
      pan_card_number: d.pan_card_number || '',
      pan_card_name: d.pan_card || '',
      driving_license_number: d.driving_license_number || '',
      driving_license_document_name: d.driving_license_document || '',
      license_expiry_date: d.license_expiry_date ? new Date(d.license_expiry_date).toISOString().split('T')[0] : '',
      personal_resume_name: d.personal_resume || '',
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
    setDraft(prev => ({ ...prev, ...mapped, has_existing_password: !!(driver as any)?.user?.password_hash, showPassword: false, password_modified: false }));
  }, [driver]);

  // Clear password when switching between different drivers
  useEffect(() => {
    saveDraft({ password: '', showPassword: false, has_existing_password: !!(driver as any)?.user?.password_hash, password_modified: false });
  }, [driver?.id]);
    // --- Handlers ---


  
  const downloadTemplate = async () => {
    const headers = [
      'Full Name', 'Phone Number', 'Date of Birth', 'Gender', 'Aadhar Number',
      'License Number', 'License Expiry', 'Blood Group', 'Status', 'Shift Preference',
      'Current Address', 'City', 'State', 'Pincode', 'Emergency Contact Name', 'Emergency Contact Number',
      'Previous Employer Experience', 'Languages Spoken', 'Password'
    ];
    const sampleRow = [
      'John Doe', '9876543210', '1990-01-01', 'Male', '123456789012',
      'DL1234567890', '2030-12-31', 'O+', 'Active', 'Morning',
      '123 Main St', 'Chennai', 'Tamil Nadu', '600001', 'Jane Doe', '9876543211',
      '2 years at ABC Transport', 'English, Tamil', '********'
    ];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');
    worksheet.addRow(headers);
    worksheet.addRow(sampleRow);
    await workbook.xlsx.writeFile('Driver_Upload_Template.xlsx');
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

       const allErrors: string[] = [];

jsonData.forEach((row, index) => {
  const rowErrors = validateRow(row, index + 2);
  allErrors.push(...rowErrors);
});

// ✅ NEW CLEAN ALERT
if (allErrors.length > 0) {
  showAlert(
    'Validation Error',
    `Total Errors: ${allErrors.length}\n\nFirst 5 Errors:\n${allErrors.slice(0, 5).join('\n')}`,
    'error'
  );
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

            await api.post("/drivers/", formData);
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
      employee_id: '',
      phone_number: '',
      password: '', // Clear password when resetting draft
      has_existing_password: false,
      password_modified: false, // Reset password modification flag
      date_of_birth: '',
      gender: '',
      aadhar_number: '',
      aadhar_document_name: '',
      pan_card_number: '',
      pan_card_name: '',
      driving_license_number: '',
      driving_license_document_name: '',
      license_expiry_date: '',
      personal_resume_name: '',
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



  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Validate mandatory fields (all fields except Aadhar Document, Driver Photo, Police Verification, Medical Fitness)
    if (!draft.full_name?.trim()) {
      errors.full_name = 'Full name is required';
    }
    
    if (!draft.phone_number?.trim()) {
      errors.phone_number = 'Phone number is required';
    } else if (!/^\d{10}$/.test(draft.phone_number.replace(/\D/g, ''))) {
      errors.phone_number = 'Phone number must be 10 digits';
    }
    
    if (!isEditing && !draft.password?.trim()) {
      errors.password = 'Password is required for new drivers';
    } else if (draft.password_modified && draft.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    // Aadhar number is required but optional validation (only validate if provided)
    if (draft.aadhar_number?.trim()) {
      if (!/^\d{12}$/.test(draft.aadhar_number.replace(/\D/g, ''))) {
        errors.aadhar_number = 'Aadhar number must be 12 digits';
      }
    }
    
    // PAN card number validation (only validate if provided)
    if (draft.pan_card_number?.trim()) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(draft.pan_card_number)) {
        errors.pan_card_number = 'PAN card number must be in format: ABCDE1234F';
      }
    }
    
    if (!draft.driving_license_number?.trim()) {
      errors.driving_license_number = 'Driving license number is required';
    }
    
    if (!draft.license_expiry_date) {
      errors.license_expiry_date = 'License expiry date is required';
    } else if (new Date(draft.license_expiry_date) <= new Date()) {
      errors.license_expiry_date = 'License expiry date must be in the future';
    }
    
    // Validate other mandatory fields
    if (!draft.date_of_birth) {
      errors.date_of_birth = 'Date of birth is required';
    }
    
    if (!draft.gender) {
      errors.gender = 'Gender is required';
    }
    
    if (!draft.blood_group) {
      errors.blood_group = 'Blood group is required';
    }
    
    if (!draft.emergency_contact_name?.trim()) {
      errors.emergency_contact_name = 'Emergency contact name is required';
    }
    
    if (!draft.emergency_contact_number?.trim()) {
      errors.emergency_contact_number = 'Emergency contact number is required';
    } else if (!/^\d{10}$/.test(draft.emergency_contact_number.replace(/\D/g, ''))) {
      errors.emergency_contact_number = 'Emergency contact number must be 10 digits';
    }
    
    if (!draft.current_address?.trim()) {
      errors.current_address = 'Current address is required';
    }
    
    if (!draft.city?.trim()) {
      errors.city = 'City is required';
    }
    
    if (!draft.state?.trim()) {
      errors.state = 'State is required';
    }
    
    if (!draft.pincode?.trim()) {
      errors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(draft.pincode.replace(/\D/g, ''))) {
      errors.pincode = 'Pincode must be 6 digits';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkUniqueConstraints = async () => {
    const errors: Record<string, string> = {};
    
    try {
      // Check phone number uniqueness
      if (draft.phone_number?.trim()) {
        const phoneResponse = await api.get(`/drivers/check-phone/${draft.phone_number.replace(/\D/g, '')}`);
        if (phoneResponse.data.exists && (!isEditing || phoneResponse.data.driver_id !== (driver as any)?.id)) {
          errors.phone_number = 'Phone number already exists';
        }
      }
      
      // Check Aadhar number uniqueness (only if provided)
      if (draft.aadhar_number?.trim()) {
        const aadharResponse = await api.get(`/drivers/check-aadhar/${draft.aadhar_number.replace(/\D/g, '')}`);
        if (aadharResponse.data.exists && (!isEditing || aadharResponse.data.driver_id !== (driver as any)?.id)) {
          errors.aadhar_number = 'Aadhar number already exists';
        }
      }
      
      // Check PAN card number uniqueness (only if provided)
      if (draft.pan_card_number?.trim()) {
        const panResponse = await api.get(`/drivers/check-pan/${draft.pan_card_number}`);
        if (panResponse.data.exists && (!isEditing || panResponse.data.driver_id !== (driver as any)?.id)) {
          errors.pan_card_number = 'PAN card number already exists';
        }
      }
      
      // Check driving license uniqueness
      if (draft.driving_license_number?.trim()) {
        const licenseResponse = await api.get(`/drivers/check-license/${draft.driving_license_number}`);
        if (licenseResponse.data.exists && (!isEditing || licenseResponse.data.driver_id !== (driver as any)?.id)) {
          errors.driving_license_number = 'Driving license number already exists';
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
    if (!validateForm()) {
      showAlert('Validation Error', 'Please fill in all required fields correctly.', 'error');
      return;
    }
    
    // Check unique constraints
    const uniqueErrors = await checkUniqueConstraints();
    if (Object.keys(uniqueErrors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...uniqueErrors }));
      showAlert('Duplicate Entry', Object.values(uniqueErrors).join('\n'), 'error');
      return;
    }
    
    // Show confirmation dialog
    setSubmitConfirmState({
      isOpen: true,
      isEditing,
      driverName: draft.full_name || 'this driver'
    });
  };

  const confirmSubmit = async () => {
    setSubmitConfirmState({ isOpen: false, isEditing: false, driverName: '' });
    
    try {
      const payload = new FormData();

      // Only include password in payload if it's a new driver or if it was changed
      const { showPassword, ...draftWithoutShowPassword } = draft;
      Object.entries(draftWithoutShowPassword).forEach(([k, v]) => {
        if (v !== undefined && v !== null) payload.append(k, String(v))
      });
      // Add files to form data (only if provided)
      if (files.aadhar_document) payload.append('aadhar_document', files.aadhar_document);
      if (files.pan_card) payload.append('pan_card', files.pan_card);
      if (files.driving_license_document) payload.append('driving_license_document', files.driving_license_document);
      if (files.personal_resume) payload.append('personal_resume', files.personal_resume);
      if (files.driver_photo) payload.append('driver_photo', files.driver_photo);
      if (files.police_verification_certificate) payload.append('police_verification_certificate', files.police_verification_certificate);
      if (files.medical_fitness_certificate) payload.append('medical_fitness_certificate', files.medical_fitness_certificate);

      if (isEditing) {
        // For updates, only include password if it was modified
        if (!draft.password_modified) {
          payload.delete('password'); // Don't update password if it wasn't modified
        }
        await api.put(`/drivers/${(driver as any).id}`, payload);
      } else {
        // For new drivers, require a password
        if (!draft.password) {
          alert('Please enter a password');
          return;
        }
        await api.post("/drivers/", payload);
      }

      clearDraft();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save driver:', error);
      
      let errorMessage = 'Failed to save driver';
      
      if (error.response) {
        // Server responded with error status - this is the key path we want
        const status = error.response.status;
        const data = error.response.data;
        
        console.log('Error response:', { status, data }); // Debug log
        
        if (status === 400) {
          // Validation errors and duplicate entries
          if (typeof data === 'object' && data.detail) {
            if (Array.isArray(data.detail)) {
              // FastAPI validation errors come as array
              errorMessage = data.detail.map((err: any) => {
                if (typeof err === 'object' && err.msg && err.loc) {
                  return `${err.loc.join('.')}: ${err.msg}`;
                }
                return err.msg || err;
              }).join('\n');
            } else if (typeof data.detail === 'string') {
              // Direct string message - this is what we want for duplicate errors
              errorMessage = data.detail;
            }
          } else if (typeof data === 'string') {
            // Direct string response
            errorMessage = data;
          } else if (data && typeof data === 'object') {
            // Handle other error formats
            const errorMessages = [];
            for (const [field, message] of Object.entries(data)) {
              if (Array.isArray(message)) {
                errorMessages.push(`${field}: ${message.join(', ')}`);
              } else {
                errorMessages.push(`${field}: ${message}`);
              }
            }
            errorMessage = errorMessages.join('\n');
          }
        } else if (status === 409) {
          // Conflict errors (duplicate entries)
          errorMessage = 'Duplicate entry detected. This driver information already exists:\n';
          if (typeof data === 'object' && data.detail) {
            errorMessage += data.detail;
          } else {
            errorMessage += 'Aadhar number, driving license, or phone number may already be registered.';
          }
        } else if (status === 422) {
          // Unprocessable entity (validation failed)
          if (typeof data === 'object' && data.detail) {
            if (Array.isArray(data.detail)) {
              errorMessage = 'Validation errors:\n';
              data.detail.forEach((err: any) => {
                if (err.field && err.message) {
                  errorMessage += `${err.field}: ${err.message}\n`;
                } else if (err.msg && err.loc) {
                  errorMessage += `${err.loc.join('.')}: ${err.msg}\n`;
                }
              });
            } else {
              errorMessage = data.detail;
            }
          }
        } else if (status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else {
          errorMessage = `Request failed (${status}): ${data?.detail || data?.message || 'Unknown error'}`;
        }
      } else if (error.request) {
        // Network error - no response received
        console.log('Network error detected'); // Debug log
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        // Other errors
        errorMessage = error.message;
      }
      
      console.log('Final error message:', errorMessage); // Debug log
      showAlert('Submission Failed', errorMessage, 'error');
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
          <div className="max-h-[60vh] overflow-y-auto pr-2">
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
                    <input 
                      disabled={isReadOnly} 
                      required 
                      type="tel" 
                      maxLength={10} 
                      placeholder="10-digit number" 
                      className={`${inputStyle} ${validationErrors.phone_number ? 'border-red-500 focus:ring-red-500' : ''}`}
                      value={draft.phone_number} 
                      onChange={e => saveDraft({ phone_number: e.target.value.replace(/\D/g, '') })} 
                    />
                    {validationErrors.phone_number && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.phone_number}</p>
                    )}
                  </div>
                  <div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <FieldLabel required={!isEditing}>Password</FieldLabel>
                        {!isEditing && (
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => saveDraft({ password: generatePassword(), password_modified: true })}
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
                          className={`${inputStyle} pr-20 ${validationErrors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                          value={draft.password || ''}
                          onChange={e => saveDraft({ password: e.target.value, password_modified: true })}
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
                      <>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          This will be the driver's initial password
                        </p>
                        {validationErrors.password && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
                        )}
                      </>
                    )}
                    {isEditing && (
                      <>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {draft.has_existing_password 
                            ? 'Enter new password to change it'
                            : 'Set a password for this driver'
                          }
                        </p>
                        {validationErrors.password && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>Date of Birth</FieldLabel>
                    <input
  disabled={isReadOnly} type="date" className={`${inputStyle} ${validationErrors.date_of_birth ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.date_of_birth} onChange={e => saveDraft({ date_of_birth: e.target.value })} />
                    {validationErrors.date_of_birth && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.date_of_birth}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>Gender</FieldLabel>
                    <select className={`${inputStyle} ${validationErrors.gender ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.gender} onChange={e => saveDraft({ gender: e.target.value })}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {validationErrors.gender && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.gender}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <FieldLabel optional>Employee ID</FieldLabel>
                    <input
  disabled={isReadOnly} type="text" placeholder="EMP-001" className={inputStyle} value={draft.employee_id} onChange={e => saveDraft({ employee_id: e.target.value })} />
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
                   <div>
                    <FieldLabel required>Blood Group</FieldLabel>
                    <select className={`${inputStyle} ${validationErrors.blood_group ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.blood_group} onChange={e => saveDraft({ blood_group: e.target.value })}>
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                    {validationErrors.blood_group && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.blood_group}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

             {activeTab === 'documents' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in duration-300">
                
                <div className="space-y-4">
                  {/* Additional Identity Documents */}
                  <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                    <h4 className="text-sm font-semibold text-orange-600 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Additional Documents
                    </h4>
                    <div className="space-y-3">
                     
                      <div>
                        <FileUpload
                          file={files.driver_photo}
                          fileName={draft.driver_photo_name}
                          onFileChange={(file) => setFiles(prev => ({ ...prev, driver_photo: file }))}
                          onFileNameChange={(name) => saveDraft({ driver_photo_name: name })}
                          accept="image/*"
                          disabled={isReadOnly}
                          label="Driver Photo"
                          optional
                        />
                      </div>
                     
                    </div>
                  </div>
                  {/* Identity Documents Group */}
                  <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30">
                    <h4 className="text-sm font-semibold text-purple-600 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      Identity Documents
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <FieldLabel optional>Aadhar Number</FieldLabel>
                        <input 
                          disabled={isReadOnly} 
                          type="text" 
                          maxLength={12} 
                          placeholder="12-digit Aadhar number" 
                          className={`${inputStyle} ${validationErrors.aadhar_number ? 'border-red-500 focus:ring-red-500' : ''}`}
                          value={draft.aadhar_number} 
                          onChange={e => saveDraft({ aadhar_number: e.target.value.replace(/\D/g, '') })} 
                        />
                        {validationErrors.aadhar_number && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.aadhar_number}</p>
                        )}
                      </div>
                      <div>
                        <FileUpload
                          file={files.aadhar_document}
                          fileName={draft.aadhar_document_name}
                          onFileChange={(file) => setFiles(prev => ({ ...prev, aadhar_document: file }))}
                          onFileNameChange={(name) => saveDraft({ aadhar_document_name: name })}
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={isReadOnly}
                          label="Aadhar Document"
                          optional
                        />
                      </div>
                      <div>
                        <FieldLabel optional>PAN Card Number</FieldLabel>
                        <input 
                          disabled={isReadOnly} 
                          type="text" 
                          maxLength={10} 
                          placeholder="10-digit PAN number (e.g., ABCDE1234F)" 
                          className={`${inputStyle} ${validationErrors.pan_card_number ? 'border-red-500 focus:ring-red-500' : ''}`}
                          value={draft.pan_card_number} 
                          onChange={e => saveDraft({ pan_card_number: e.target.value.toUpperCase() })} 
                        />
                        {validationErrors.pan_card_number && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.pan_card_number}</p>
                        )}
                      </div>
                       <div>
                        <FileUpload
                          file={files.pan_card}
                          fileName={draft.pan_card_name}
                          onFileChange={(file) => setFiles(prev => ({ ...prev, pan_card: file }))}
                          onFileNameChange={(name) => saveDraft({ pan_card_name: name })}
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={isReadOnly}
                          label="PAN Card Document"
                          optional
                        />
                      </div>
                    </div>
                  </div>
                   
                </div>

                
                <div className="space-y-4">


                  {/* Professional Documents Group */}
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <h4 className="text-sm font-semibold text-blue-600 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Professional Documents
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <FieldLabel required>Driving License Number</FieldLabel>
                        <input 
                          disabled={isReadOnly} 
                          type="text" 
                          className={`${inputStyle} ${validationErrors.driving_license_number ? 'border-red-500 focus:ring-red-500' : ''}`}
                          value={draft.driving_license_number} 
                          onChange={e => saveDraft({ driving_license_number: e.target.value })} 
                        />
                        {validationErrors.driving_license_number && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.driving_license_number}</p>
                        )}
                      </div>
                      <div>
                        <FieldLabel required>License Expiry Date</FieldLabel>
                        <input 
                          disabled={isReadOnly} 
                          type="date" 
                          className={`${inputStyle} ${validationErrors.license_expiry_date ? 'border-red-500 focus:ring-red-500' : ''}`}
                          value={draft.license_expiry_date} 
                          onChange={e => saveDraft({ license_expiry_date: e.target.value })} 
                        />
                        {validationErrors.license_expiry_date && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.license_expiry_date}</p>
                        )}
                      </div>
                      <div>
                        <FileUpload
                          file={files.driving_license_document}
                          fileName={draft.driving_license_document_name}
                          onFileChange={(file) => setFiles(prev => ({ ...prev, driving_license_document: file }))}
                          onFileNameChange={(name) => saveDraft({ driving_license_document_name: name })}
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={isReadOnly}
                          label="Driving License Document"
                          optional
                        />
                      </div>
                      <div>
                        <FileUpload
                          file={files.medical_fitness_certificate}
                          fileName={draft.medical_fitness_certificate_name}
                          onFileChange={(file) => setFiles(prev => ({ ...prev, medical_fitness_certificate: file }))}
                          onFileNameChange={(name) => saveDraft({ medical_fitness_certificate_name: name })}
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={isReadOnly}
                          label="Medical Fitness Certificate"
                          optional
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <FileUpload
                      file={files.personal_resume}
                      fileName={draft.personal_resume_name}
                      onFileChange={(file) => setFiles(prev => ({ ...prev, personal_resume: file }))}
                      onFileNameChange={(name) => saveDraft({ personal_resume_name: name })}
                      accept=".pdf,.doc,.docx"
                      disabled={isReadOnly}
                      label="Personal Resume"
                      optional
                    />
                  </div>
                  
              {/* Additional Documents */}
                 
                </div>
              </div>
            )}

            {activeTab === 'assignment' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">

                  <div>
                    <FieldLabel required>Emergency Contact Name</FieldLabel>
                    <input disabled={isReadOnly} type="text" className={`${inputStyle} ${validationErrors.emergency_contact_name ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.emergency_contact_name} onChange={e => saveDraft({ emergency_contact_name: e.target.value })} />
                    {validationErrors.emergency_contact_name && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.emergency_contact_name}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>Emergency Contact Number</FieldLabel>
                    <input disabled={isReadOnly} type="tel" maxLength={10} placeholder="10-digit number" className={`${inputStyle} ${validationErrors.emergency_contact_number ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.emergency_contact_number} onChange={e => saveDraft({ emergency_contact_number: e.target.value.replace(/\D/g, '') })} />
                    {validationErrors.emergency_contact_number && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.emergency_contact_number}</p>
                    )}
                  </div>
                   <div>
                    <FieldLabel required>Verification Status</FieldLabel>
                    <select disabled={isReadOnly} className={inputStyle} value={draft.verification_status} onChange={e => saveDraft({ verification_status: e.target.value })}>
                      <option>Pending</option>
                      <option>Verified</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Previous Employer Experience</FieldLabel>
                    <textarea disabled={isReadOnly} rows={3} className={inputStyle} value={draft.previous_employer_experience} onChange={e => saveDraft({ previous_employer_experience: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Current Address</FieldLabel>
                    <textarea disabled={isReadOnly} rows={2} className={`${inputStyle} ${validationErrors.current_address ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.current_address} onChange={e => saveDraft({ current_address: e.target.value })} />
                    {validationErrors.current_address && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.current_address}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>City</FieldLabel>
                    <input disabled={isReadOnly} type="text" className={`${inputStyle} ${validationErrors.city ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.city} onChange={e => saveDraft({ city: e.target.value })} />
                    {validationErrors.city && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.city}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>State</FieldLabel>
                    <input disabled={isReadOnly} type="text" className={`${inputStyle} ${validationErrors.state ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.state} onChange={e => saveDraft({ state: e.target.value })} />
                    {validationErrors.state && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.state}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>Pincode</FieldLabel>
                    <input disabled={isReadOnly} type="text" maxLength={6} placeholder="6-digit pincode" className={`${inputStyle} ${validationErrors.pincode ? 'border-red-500 focus:ring-red-500' : ''}`} value={draft.pincode} onChange={e => saveDraft({ pincode: e.target.value.replace(/\D/g, '') })} />
                    {validationErrors.pincode && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.pincode}</p>
                    )}
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
            <button 
              type="button" 
              onClick={handleSubmit} 
              className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            >
              Submit Record
            </button>
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

      {/* Submit Confirmation Modal */}
      {submitConfirmState.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <svg className="text-blue-600 dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4"></path>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Confirm {submitConfirmState.isEditing ? 'Update' : 'Creation'}
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed whitespace-pre-line pl-1">
              Are you sure you want to {submitConfirmState.isEditing ? 'update' : 'create'} the record for <span className="font-semibold">{submitConfirmState.driverName}</span>? 
              {submitConfirmState.isEditing 
                ? ' This will modify the existing driver information.' 
                : ' This will add a new driver to the system.'}
            </p>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setSubmitConfirmState({ isOpen: false, isEditing: false, driverName: '' })}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-500/30 transition-colors"
              >
                {submitConfirmState.isEditing ? 'Update' : 'Create'}
              </button>
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

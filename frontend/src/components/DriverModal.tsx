import { useState, useEffect } from 'react'
import axios from 'axios'
import { X } from 'lucide-react'
import { Driver } from '../types'




interface DriverModalProps {
  driver: Driver | null
  onClose: () => void
  onSuccess: () => void
}

const DriverModal = ({ driver, onClose, onSuccess }: DriverModalProps) => {


  const labelStyle = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5";
  const inputStyle = "w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";

  const FieldLabel = ({ children, required = false, optional = false }: { children: React.ReactNode; required?: boolean; optional?: boolean }) => (
    <label className={labelStyle}>
      {children}
      {required && <span className="text-red-600 ml-1">*</span>}
      {optional && <span className="ml-2 text-xs text-gray-400">(optional)</span>}
    </label>
  );


  const [activeTab, setActiveTab] = useState('static-info');

  const DRAFT_KEY = 'driver_modal_draft_v1';

  const [draft, setDraft] = useState<Record<string, any>>({
    full_name: '',
    phone_number: '',
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
  });

  // Track actual File objects for uploads (not saved to localStorage)
  const [files, setFiles] = useState<{ aadhar_document?: File | null; driver_photo?: File | null; police_verification_certificate?: File | null; medical_fitness_certificate?: File | null }>({ aadhar_document: null, driver_photo: null, police_verification_certificate: null, medical_fitness_certificate: null });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setDraft(prev => ({ ...prev, ...JSON.parse(saved) }));
    } catch (e) { }
  }, []);

  useEffect(() => {
    if (!driver) return;
    const d: any = driver as any;
    const mapped: Record<string, any> = {
      full_name: d.full_name || '',
      phone_number: d.phone_number || d.phone || '',
      date_of_birth: d.date_of_birth ? new Date(d.date_of_birth).toISOString().split('T')[0] : '',
      gender: d.gender || '',
      aadhar_number: d.aadhar_number || '',
      aadhar_document_name: d.aadhar_document || '',
      driving_license_number: d.driving_license_number || d.license_number || '',
      license_expiry_date: d.license_expiry_date ? new Date(d.license_expiry_date).toISOString().split('T')[0] : (d.license_expiry ? new Date(d.license_expiry).toISOString().split('T')[0] : ''),
      driver_photo_name: d.driver_photo || '',
      police_verification_certificate_name: d.police_verification_certificate || '',
      medical_fitness_certificate_name: d.medical_fitness_certificate || '',
      verification_status: d.verification_status || 'Pending',
      current_address: d.current_address || d.address || '',
      city: d.city || '',
      state: d.state || '',
      pincode: d.pincode || '',
      emergency_contact_name: d.emergency_contact_name || '',
      emergency_contact_number: d.emergency_contact_number || d.emergency_contact_phone || '',
      blood_group: d.blood_group || '',
      previous_employer_experience: d.previous_employer_experience || '',
      languages_spoken: d.languages_spoken || '',
      shift_preference: d.shift_preference || '',
      status: d.status || (d.is_active ? 'Active' : 'Inactive') || 'Active',
      assigned_vehicle_id: d.assigned_vehicle_id || '',
    };
    setDraft(prev => ({ ...prev, ...mapped }));
  }, [driver]);

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
    });
    try { localStorage.removeItem(DRAFT_KEY) } catch (e) { }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof files, nameKey: keyof typeof draft) => {
    const file = e.target.files?.[0] || null
    setFiles(prev => ({ ...prev, [key]: file }))
    saveDraft({ [nameKey]: file?.name || '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = new FormData();
      Object.entries(draft).forEach(([k, v]) => { if (v !== undefined && v !== null) payload.append(k, String(v)) });
      if (files.aadhar_document) payload.append('aadhar_document', files.aadhar_document);
      if (files.driver_photo) payload.append('driver_photo', files.driver_photo);
      if (files.police_verification_certificate) payload.append('police_verification_certificate', files.police_verification_certificate);
      if (files.medical_fitness_certificate) payload.append('medical_fitness_certificate', files.medical_fitness_certificate);

      if ((driver as any)?.id) {
        await axios.put(`/api/drivers/${(driver as any).id}`, payload);
      } else {
        await axios.post('/api/drivers/', payload);
      }

      clearDraft();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save driver:', error);
      alert(error.response?.data || 'Failed to save driver');
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
            <p className="text-xs text-gray-500 mt-2"><span className="text-red-600 font-bold">*</span> Required fields — fields labeled <span className="text-gray-400">(optional)</span> are not mandatory.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400"><X size={24} /></button>
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
                    <input required type="text" className={inputStyle} value={draft.full_name} onChange={e => saveDraft({ full_name: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>Phone Number</FieldLabel>
                    <input required type="tel" maxLength={10} placeholder="10-digit number" className={inputStyle} value={draft.phone_number} onChange={e => saveDraft({ phone_number: e.target.value.replace(/\D/g, '') })} />
                  </div>
                  <div>
                    <FieldLabel required>Date of Birth</FieldLabel>
                    <input type="date" className={inputStyle} value={draft.date_of_birth} onChange={e => saveDraft({ date_of_birth: e.target.value })} />
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
                    <input type="text" placeholder="e.g. English, Tamil" className={inputStyle} value={draft.languages_spoken} onChange={e => saveDraft({ languages_spoken: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Shift Preference</FieldLabel>
                    <select className={inputStyle} value={draft.shift_preference} onChange={e => saveDraft({ shift_preference: e.target.value })}>
                      <option value="">Select</option>
                      <option value="morning">Morning</option>
                      <option value="night">Night</option>
                      <option value="rotational">Rotational</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Status</FieldLabel>
                    <select className={inputStyle} value={draft.status} onChange={e => saveDraft({ status: e.target.value })}>
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
                    <input type="text" className={inputStyle} value={draft.aadhar_number} onChange={e => saveDraft({ aadhar_number: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>Aadhar Document</FieldLabel>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFile(e, 'aadhar_document', 'aadhar_document_name')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200" />
                    {draft.aadhar_document_name && <p className="text-xs text-gray-400 mt-2">Selected: {draft.aadhar_document_name}</p>}
                  </div>
                  <div>
                    <FieldLabel required>Driving License Number</FieldLabel>
                    <input type="text" className={inputStyle} value={draft.driving_license_number} onChange={e => saveDraft({ driving_license_number: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>License Expiry Date</FieldLabel>
                    <input type="date" className={inputStyle} value={draft.license_expiry_date} onChange={e => saveDraft({ license_expiry_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Driver Photo</FieldLabel>
                    <input type="file" accept="image/*" onChange={e => handleFile(e, 'driver_photo', 'driver_photo_name')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200" />
                    {draft.driver_photo_name && <p className="text-xs text-gray-400 mt-2">Selected: {draft.driver_photo_name}</p>}
                  </div>
                  <div>
                    <FieldLabel required>Police Verification Certificate</FieldLabel>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFile(e, 'police_verification_certificate', 'police_verification_certificate_name')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200" />
                    {draft.police_verification_certificate_name && <p className="text-xs text-gray-400 mt-2">Selected: {draft.police_verification_certificate_name}</p>}
                  </div>
                  <div>
                    <FieldLabel required>Medical Fitness Certificate</FieldLabel>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFile(e, 'medical_fitness_certificate', 'medical_fitness_certificate_name')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-200" />
                    {draft.medical_fitness_certificate_name && <p className="text-xs text-gray-400 mt-2">Selected: {draft.medical_fitness_certificate_name}</p>}
                  </div>
                  <div>
                    <FieldLabel required>Verification Status</FieldLabel>
                    <select className={inputStyle} value={draft.verification_status} onChange={e => saveDraft({ verification_status: e.target.value })}>
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
                    <input type="text" className={inputStyle} value={draft.emergency_contact_name} onChange={e => saveDraft({ emergency_contact_name: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>Emergency Contact Number</FieldLabel>
                    <input type="tel" className={inputStyle} value={draft.emergency_contact_number} onChange={e => saveDraft({ emergency_contact_number: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Previous Employer Experience</FieldLabel>
                    <textarea rows={3} className={inputStyle} value={draft.previous_employer_experience} onChange={e => saveDraft({ previous_employer_experience: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Current Address</FieldLabel>
                    <textarea rows={2} className={inputStyle} value={draft.current_address} onChange={e => saveDraft({ current_address: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>City</FieldLabel>
                    <input type="text" className={inputStyle} value={draft.city} onChange={e => saveDraft({ city: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>State</FieldLabel>
                    <input type="text" className={inputStyle} value={draft.state} onChange={e => saveDraft({ state: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel required>Pincode</FieldLabel>
                    <input type="text" className={inputStyle} value={draft.pincode} onChange={e => saveDraft({ pincode: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
            <button type="button" onClick={clearDraft} className="px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Clear Draft</button>
            <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">Submit Record</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DriverModal


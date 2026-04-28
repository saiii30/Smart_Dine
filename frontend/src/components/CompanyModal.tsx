import { Building2, X } from "lucide-react";

interface CompanyModalProps {
  isModalOpen: boolean;
  handleModalClose: () => void;
  selectedCompany: any;
  isSupervisor: boolean;
  stepTabs: any[];
  step: number;
  setStep: (step: number) => void;
  canGoNext: () => boolean;
  form: any;
  setForm: (form: any) => void;
  validateField: (name: string, value: any, isBlur?: boolean) => void;
  errors: any;
  isReadOnly: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  saveCompany: () => void;
  hasErrors: boolean;
  generatePassword: () => void;
  statusStyles: any;
}

export default function CompanyModal({
  isModalOpen,
  handleModalClose,
  selectedCompany,
  isSupervisor,
  stepTabs,
  step,
  setStep,
  canGoNext,
  form,
  setForm,
  validateField,
  errors,
  isReadOnly,
  isAdmin,
  isSuperAdmin,
  saveCompany,
  hasErrors,
  generatePassword,
}: CompanyModalProps) {
  if (!isModalOpen) return null;

   return (
    
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/80" onClick={handleModalClose} />

          {/* Modal Content */}
          <div className="relative z-50 w-full max-w-3xl mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedCompany
    ? isSupervisor
      ? "View Company"
      : "Edit Company"
    : "Company Specifications"}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage company details and contact information
                  </p>
                </div>
              </div>
              <button
                onClick={handleModalClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Required fields note */}
            <div className="px-6 pt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="text-red-500">*</span> Required fields — fields labeled{" "}
                <span className="text-gray-400">(optional)</span> are not mandatory.
              </p>
            </div>

            {/* Step Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mx-6 mt-4">
              {stepTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id < step || (tab.id === 2 && canGoNext()) || tab.id === 1) {
                      setStep(tab.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition ${
                    step === tab.id
                      ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <div className="p-6">
              {/* STEP 1: Business Info */}
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Name */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      COMPANY NAME <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.company_name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="e.g. Tech Solutions"
                      readOnly={isReadOnly}
                      value={form.company_name}
                      onChange={(e) => {
                        setForm({ ...form, company_name: e.target.value });
                        validateField("company_name", e.target.value);
                      }}
                      onBlur={(e) => validateField("company_name", e.target.value, true)}
                    />
                    {errors.company_name && <p className="text-red-500 text-xs">{errors.company_name}</p>}
                  </div>

                  {/* Company Phone */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      COMPANY PHONE <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.company_phone ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="1234567890"
                      readOnly={isReadOnly}
                      value={form.company_phone}
                      onChange={(e) => {
                        setForm({ ...form, company_phone: e.target.value });
                        validateField("company_phone", e.target.value);
                      }}
                      onBlur={(e) => validateField("company_phone", e.target.value, true)}
                    />
                    {errors.company_phone && <p className="text-red-500 text-xs">{errors.company_phone}</p>}
                  </div>

                  {/* Company Email */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      COMPANY EMAIL <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.company_email ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="info@company.com"
                      readOnly={isReadOnly}
                      value={form.company_email}
                      onChange={(e) => {
                        setForm({ ...form, company_email: e.target.value });
                        validateField("company_email", e.target.value);
                      }}
                      onBlur={(e) => validateField("company_email", e.target.value, true)}
                    />
                    {errors.company_email && <p className="text-red-500 text-xs">{errors.company_email}</p>}
                  </div>

                  {/* Company Branch */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      COMPANY BRANCH <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.company_branch ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="e.g. Chennai"
                      readOnly={isReadOnly}
                      value={form.company_branch}
                      onChange={(e) => {
                        setForm({ ...form, company_branch: e.target.value });
                        validateField("company_branch", e.target.value);
                      }}
                      onBlur={(e) => validateField("company_branch", e.target.value, true)}
                    />
                    {errors.company_branch && <p className="text-red-500 text-xs">{errors.company_branch}</p>}
                  </div>

                  {/* Company Address */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      COMPANY ADDRESS <span className="text-red-500">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      className={`w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none ${
                        errors.company_address ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="Enter company address"
                      value={form.company_address}
                      readOnly={isReadOnly}
                      onChange={(e) => {
                        setForm({ ...form, company_address: e.target.value });
                        validateField("company_address", e.target.value);
                      }}
                      onBlur={(e) => validateField("company_address", e.target.value, true)}
                    />
                    {errors.company_address && <p className="text-red-500 text-xs">{errors.company_address}</p>}
                  </div>



{selectedCompany && (
  <div className={`space-y-1 ${isReadOnly ? "pointer-events-none opacity-60" : ""}`}>
    
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      STATUS
    </label>

    <select
      disabled={isReadOnly}
      value={form.status}
      onChange={(e) => setForm({ ...form, status: e.target.value })}
      className="w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600"
    >
      <option value="Active">Active</option>
      <option value="Blocked">Blocked</option>
    </select>

  </div>
)}



                  {/* Description */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      DESCRIPTION <span className="text-red-500">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      className={`w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none ${
                        errors.description ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="Brief description of the company"
                      value={form.description}
                      readOnly={isReadOnly}
                      onChange={(e) => {
                        setForm({ ...form, description: e.target.value });
                        validateField("description", e.target.value);
                      }}
                      onBlur={(e) => validateField("description", e.target.value, true)}
                    />
                    {errors.description && <p className="text-red-500 text-xs">{errors.description}</p>}
                  </div>
                </div>
              )}

              {/* STEP 2: Contact Info */}
              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Name */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      CONTACT NAME <span className="text-red-500">*</span>
                    </label>
                    <input
                    readOnly={isReadOnly}
                      className={`w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.contact_name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="e.g. John Doe"
                      value={form.contact_name}
                      onChange={(e) => {
                        setForm({ ...form, contact_name: e.target.value });
                        validateField("contact_name", e.target.value);
                      }}
                      onBlur={(e) => validateField("contact_name", e.target.value, true)}
                    />
                    {errors.contact_name && <p className="text-red-500 text-xs">{errors.contact_name}</p>}
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      CONTACT PHONE <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.contact_phone ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      }`}
                      readOnly={isReadOnly}
                      placeholder="1234567890"
                      value={form.contact_phone}
                      onChange={(e) => {
                        setForm({ ...form, contact_phone: e.target.value });
                        validateField("contact_phone", e.target.value);
                      }}
                      onBlur={(e) => validateField("contact_phone", e.target.value, true)}
                    />
                    {errors.contact_phone && <p className="text-red-500 text-xs">{errors.contact_phone}</p>}
                  </div>

                  {/* Contact Email */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      CONTACT EMAIL <span className="text-red-500">*</span>
                    </label>
                    <input
                    readOnly={isReadOnly}
                      className={`w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.contact_email ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="contact@company.com"
                      value={form.contact_email}
                      onChange={(e) => {
                        setForm({ ...form, contact_email: e.target.value });
                        validateField("contact_email", e.target.value);
                      }}
                      onBlur={(e) => validateField("contact_email", e.target.value, true)}
                    />
                    {errors.contact_email && <p className="text-red-500 text-xs">{errors.contact_email}</p>}
                  </div>

                  {/* Password (only for new company) */}
                  {!selectedCompany && (
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        PASSWORD <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-3">
                        <input
                        readOnly={isReadOnly}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:bg-gray-700 dark:text-white"
                          value={form.password}
                        
                          placeholder="Click Generate to create password"
                        />
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition"
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Review */}
              {step === 3 && (
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">Review Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Company Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">{form.company_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Company Phone</p>
                      <p className="font-medium text-gray-900 dark:text-white">{form.company_phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Company Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">{form.company_email}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Company Branch</p>
                      <p className="font-medium text-gray-900 dark:text-white">{form.company_branch}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-gray-500 dark:text-gray-400">Company Address</p>
                      <p className="font-medium text-gray-900 dark:text-white">{form.company_address}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-gray-500 dark:text-gray-400">Description</p>
                      <p className="font-medium text-gray-900 dark:text-white">{form.description}</p>
                    </div>
                  </div>

                  <hr className="border-gray-200 dark:border-gray-600 my-4" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Contact Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">{form.contact_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Contact Phone</p>
                      <p className="font-medium text-gray-900 dark:text-white">{form.contact_phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-gray-500 dark:text-gray-400">Contact Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">{form.contact_email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleModalClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>

              <div className="flex gap-3">
                {step > 1 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    Back
                  </button>
                )}

                {step < 3 ? (
                  <button
                    disabled={!canGoNext()}
                    onClick={() => setStep(step + 1)}
                    className={`px-6 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg transition ${
                      !canGoNext() ? "opacity-50 cursor-not-allowed" : "hover:bg-primary-700 dark:hover:bg-primary-600"
                    }`}
                  >
                    Next
                  </button>
                ) : (
                  (isAdmin || isSuperAdmin) && (
                   <button
                    disabled={hasErrors}
                    onClick={saveCompany}
                    className={`px-6 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg transition ${
                      hasErrors ? "opacity-50 cursor-not-allowed" : "hover:bg-primary-700 dark:hover:bg-primary-600"
                    }`}
                  >
                    Submit Record
                  </button>
                 )
                )}
              </div>
            </div>
          </div>
        </div>
      )

     
}
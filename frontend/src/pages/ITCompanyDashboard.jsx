import { useState, useEffect } from "react";
import { getCompany, createCompany, updateCompany, updateCompanyWithAdmin, deleteCompany, getCompanyUser, createCompanyWithAdmin } from "../api/companiesApi";
import { Trash2, X, Building2, Briefcase, User, ClipboardCheck } from "lucide-react";
import Swal from "sweetalert2";
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState([]);
  const [theme, setTheme] = useState("dark");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [contactInfo, setContactInfo] = useState(null);

const { user } = useAuth();

const isSuperAdmin = user?.role === "SUPER_ADMIN";
const isAdmin = user?.role === "ADMIN";
const isSupervisor = user?.role === "SUPERVISOR";
const isItCompany = user?.role === "IT_COMPANY";
const isReadOnly = isSupervisor;

  useEffect(() => {
    loadCompanies();
  }, []);

  // const loadCompanies = async () => {
  //   try {
  //     const data = await getCompany();
  //     setCompanies(Array.isArray(data) ? data : []);
  //   } catch (err) {
  //     console.error("Failed to load companies", err);
  //     setCompanies([]);
  //   }
  // };
  const loadCompanies = async () => {
  try {
    const companiesData = await getCompany();

    const enriched = await Promise.all(
      companiesData.map(async (company) => {
        const users = await getCompanyUser(company.id);
        const contact = users?.[0] || {};

        return {
          ...company,
          contact_name: contact.name || "-",
          contact_phone: contact.contact_number || "-",
        };
      })
    );

    setCompanies(enriched);
  } catch (err) {
    console.error("Failed to load companies", err);
    setCompanies([]);
  }
};


const [form, setForm] = useState({
    company_name: "",
    company_phone: "",
    company_email: "",
    company_address: "",
    company_branch: "",
    description: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  const validateField = (name, value, isBlur = false) => {
    let error = "";

    switch (name) {
      case "company_name":
        if (!value && isBlur) {
          error = "Company name is required";
        } else if (value && !/^[A-Za-z\s]+$/.test(value)) {
          error = "Only letters allowed";
        }
        break;

      case "company_phone":
        if (!value && isBlur) {
          error = "Company contact number is required";
        } else if (value && !/^\d{10}$/.test(value)) {
          error = "Must be exactly 10 digits";
        }
        break;

      case "company_email":
        if (!value && isBlur) {
          error = "Email is required";
        } else if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = "Invalid email format";
        }
        break;

      case "company_address":
        if (!value && isBlur) {
          error = "Address is required";
        }
        break;

      case "company_branch":
        if (!value && isBlur) {
          error = "Company Branch is required";
        } else if (value && !/^[A-Za-z\s]+$/.test(value)) {
          error = "Only letters allowed";
        }
        break;

      case "description":
        if (!value && isBlur) {
          error = "Description is required";
        }
        break;

      case "contact_name":
        if (!value && isBlur) {
          error = "Full name is required";
        } else if (value && !/^[A-Za-z\s]+$/.test(value)) {
          error = "Only letters allowed";
        }
        break;

      case "contact_phone":
        if (!value && isBlur) {
          error = "Contact number is required";
        } else if (value && !/^\d{10}$/.test(value)) {
          error = "Must be exactly 10 digits";
        }
        break;

      case "contact_email":
        if (!value && isBlur) {
          error = "Email is required";
        } else if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = "Invalid email format";
        }
        break;

      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const canGoNext = () => {
    if (step === 1) {
      return (
        form.company_name &&
        !errors.company_name &&
        form.company_phone &&
        !errors.company_phone &&
        form.company_email &&
        !errors.company_email &&
        // form.company_address &&
        // !errors.company_address &&
        // form.description &&
        // !errors.description &&
        form.company_branch &&
        !errors.company_branch
      );
    }

    if (step === 2) {
      return (
        form.contact_name &&
        !errors.contact_name &&
        form.contact_phone &&
        !errors.contact_phone &&
        form.contact_email &&
        !errors.contact_email
      );
    }

    return true;
  };

  const handleDelete = async (company) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete ${company.company_name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      background: theme === "dark" ? "#1f2937" : "#ffffff",
      color: theme === "dark" ? "#ffffff" : "#111827",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteCompany(company.id);
      setCompanies((prev) => prev.filter((a) => a.id !== company.id));

      Swal.fire({
        title: "Deleted!",
        text: `${company.company_name} has been deleted.`,
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
        color: theme === "dark" ? "#ffffff" : "#111827",
      });
    } catch (error) {
      console.error("Delete failed:", error);
      Swal.fire("Error", "Delete failed", "error");
    }
  };

  const handleEditCompany = async (company) => {
    setSelectedCompany(company);

    const users = await getCompanyUser(company.id);
    const user = users[0] || {};

    setForm({
      company_name: company.company_name || "",
      company_phone: company.company_phone || "",
      company_email: company.company_email || "",
      company_address: company.company_address || "",
      company_branch: company.company_branch || "",
      description: company.description || "",
      contact_name: user.name || "",
      contact_phone: user.contact_number || "",
      contact_email: user.email || "",
      password: "",
      status: company.status || "Active",
    });

    setStep(1);
    setIsModalOpen(true);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!";
    let pass = "";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, password: pass });
  };

  const statusStyles = {
    Active: "bg-green-100 text-green-700",
    Inactive: "bg-red-100 text-red-700",
    Blocked: "bg-orange-100 text-orange-700",
  };

  const totalCount = Array.isArray(companies) ? companies.length : 0;
  const activeCount = Array.isArray(companies) ? companies.filter((a) => a.status === "Active").length : 0;
  const blockedCount = Array.isArray(companies) ? companies.filter((a) => a.status === "Blocked").length : 0;

  const saveCompany = async () => {
    try {
      if (selectedCompany && selectedCompany.id) {
        await updateCompanyWithAdmin(selectedCompany.id, {
          company_name: form.company_name,
          company_phone: form.company_phone,
          company_email: form.company_email,
          company_address: form.company_address,
          company_branch: form.company_branch,
          description: form.description,
          //status: selectedCompany.status || "Inactive",
           status: form.status,
          contact_name: form.contact_name,
          contact_phone: form.contact_phone,
          contact_email: form.contact_email,
        });

        await Swal.fire({
          title: "Updated",
          text: "Company updated successfully",
          icon: "success",
          confirmButtonText: "OK",
          background: theme === "dark" ? "#1f2937" : "#ffffff",
          color: theme === "dark" ? "#ffffff" : "#111827",
        });
      } else {
        await createCompanyWithAdmin({
          company_name: form.company_name,
          company_phone: form.company_phone,
          company_email: form.company_email,
          company_address: form.company_address,
          company_branch: form.company_branch,
          description: form.description,
          service_start_at: null,
          service_ended_at: null,
          contact_name: form.contact_name,
          contact_phone: form.contact_phone,
          contact_email: form.contact_email,
          password: form.password,
        });

        await Swal.fire({
          title: "Created",
          text: "Company created successfully",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          background: theme === "dark" ? "#1f2937" : "#ffffff",
          color: theme === "dark" ? "#ffffff" : "#111827",
        });
      }

      // const data = await getCompany();
      await loadCompanies();
      setCompanies(Array.isArray(data) ? data : []);

      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error("Save failed:", err);
      Swal.fire("Error", "Operation failed", "error");
    }
  };

  const resetForm = () => {
    setForm({
      company_name: "",
      company_phone: "",
      company_email: "",
      company_address: "",
      company_branch: "",
      description: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
      password: "",
      status: "Active"
    });
    setErrors({});
    setSelectedCompany(null);
    setStep(1);
  };

  const handleCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // const hasErrors = Object.values(errors).some((err) => err);
  const hasErrors =
  !form.company_name ||
  errors.company_name ||
  !form.company_phone ||
  errors.company_phone ||
  !form.company_branch ||
  errors.company_branch ||
  !form.contact_name ||
  errors.contact_name ||
  !form.contact_phone ||
  errors.contact_phone ||
  !form.contact_email ||
  errors.contact_email;


  const stepTabs = [
    { id: 1, label: "Business Info", icon: Briefcase },
    { id: 2, label: "Contact Info", icon: User },
    { id: 3, label: "Review", icon: ClipboardCheck },
  ];

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">IT Companies</h1>
      {
            (isAdmin || isSuperAdmin) && (
              <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600"
          >
            <span className="mr-2">+</span>
            Add Company
          </button>
             )

          }
      </div>

      {/* EMPTY STATE OR TABLE */}
      {companies.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No companies</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by adding your first company.</p>
          {
          (isAdmin || isSuperAdmin) && (
             <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors whitespace-nowrap"
        >
          <span className="mr-2">+</span>
          Add Company
        </button>

          )
        }
        </div>
      ) : (
        <>
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Companies</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{totalCount}</h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{activeCount}</h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Blocked</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{blockedCount}</h2>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
              Companies
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                <tr>
                  <th className="p-4 text-left">Company</th>
                  <th className="p-4 text-left">Contact Name</th>
                  <th className="p-4 text-left">Contact Phone</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                        {a.company_name ? a.company_name.charAt(0) : "?"}
                      </div>
                      <div>
                        <p
                          className="font-medium cursor-pointer text-indigo-600 dark:text-indigo-400 hover:underline"
                          onClick={() => handleEditCompany(a)}
                        >
                          {a.company_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{a.company_branch}</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">{a.contact_name}</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">{a.contact_phone}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusStyles[a.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDelete(a)}
                        title="Delete Company"
                        className="p-2 rounded-lg transition text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL POPUP */}
      {isModalOpen && (
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

                  {/* Status */}
{/* <div className="space-y-1">
  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
    STATUS
  </label>
  <select
    value={form.status}
    onChange={(e) => setForm({ ...form, status: e.target.value })}
    className="w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600"
  >
    <option value="Active">Active</option>
    <option value="Blocked">Blocked</option>
  </select>
</div> */}

{selectedCompany && (
  <div className="space-y-1" readOnly={isReadOnly}>
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      STATUS
    </label>
    <select
    readOnly={isReadOnly}
      value={form.status}
      onChange={(e) => setForm({ ...form, status: e.target.value })}
      className="w-full px-3 py-2 border rounded-lg bg-transparent dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600"
    >
      <option readOnly={isReadOnly} value="Active">Active</option>
      <option readOnly={isReadOnly} value="Blocked">Blocked</option>
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
                          readOnly
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
      )}
    </div>
  );
}

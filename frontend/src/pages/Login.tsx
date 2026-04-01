import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout from "../components/AuthLayout";

// Create an Axios instance with default config
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    agencyId: "",
    itCompanyId: "",
  });

  const [agencies, setAgencies] = useState<any[]>([]);
  const [filteredItCompanies, setFilteredItCompanies] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAgenciesLoading, setIsAgenciesLoading] = useState(true);
  // Account type switch: 'agency' or 'it'
  const [accountType, setAccountType] = useState<'agency' | 'it'>('agency');

  const { user, logout ,login} = useAuth()
  const navigate = useNavigate();

  // Fetch agencies on component mount
  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const response = await api.get("api/auth/agencies");
        setAgencies(response.data);
      } catch (err) {
        console.error("Error fetching agencies:", err);
        setError("Failed to load agencies. Please try again later.");
      } finally {
        setIsAgenciesLoading(false);
      }
    };

    fetchAgencies();
  }, []);

  // Fetch IT companies based on selected agency
  useEffect(() => {
    const fetchFilteredCompanies = async () => {
      if (!formData.agencyId) {
        setFilteredItCompanies([]);
        return;
      }

      try {
        const response = await api.get(`/companies/api/companies/trip/dropdown?agency_id=${formData.agencyId}`);
        setFilteredItCompanies(response.data);
      } catch (err) {
        console.error("Error fetching filtered companies:", err);
        setFilteredItCompanies([]);
      }
    };

    if (accountType === 'it') {
      fetchFilteredCompanies();
    }
  }, [formData.agencyId, accountType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if(name === 'agencyId') {
      localStorage.setItem('selectedAgencyId', value);
      // Clear IT company selection when agency changes
      if (accountType === 'it') {
        setFormData(prev => ({
          ...prev,
          itCompanyId: ""
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    let payload: any = {
      username: formData.username,
      password: formData.password,
      agency_id: formData.agencyId,
    };

    // If IT login add extra field
    if (accountType === "it") {
      payload.it_company_id = formData.itCompanyId;
    }

    console.log("Payload:", payload);

    const loggedInUser: any = await login(payload)

console.log("USER DATA:", loggedInUser)
console.log("AGENCY STATUS:", loggedInUser?.agency_status)

const role = loggedInUser?.role
const status = loggedInUser?.agency_status?.toLowerCase()

console.log("ROLE:", role)
console.log("STATUS:", status)

// 🔥 ONLY for SUPER_ADMIN
if (role === "SUPER_ADMIN") {
  if (status === "inactive") {
    navigate("/prices")
  } else {
    navigate("/dashboard")
  }
}

// 🔥 For ADMIN / SUPERVISOR / others
else {
  navigate("/dashboard")
}


  } catch (err: any) {
    console.error("Login error:", err);
    setError(err.response?.data?.detail || "Failed to login. Please check your credentials.");
  } finally {
    setLoading(false);
  }
};

  return (
    <AuthLayout title={accountType === 'agency' ? 'Agency Login' : 'IT Login'} subtitle={accountType === 'agency' ? 'Login to your account' : 'Login for IT company employees'}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Login Type</label>
          <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            <button
              type="button"
              onClick={() => setAccountType('agency')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${accountType === 'agency' ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
            >
              Agency Login
            </button>
            <button
              type="button"
              onClick={() => setAccountType('it')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${accountType === 'it' ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
            >
              IT Login
            </button>
          </div>

          {accountType === 'agency' ? (
            <div className="mt-4">
              <label htmlFor="agencyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Agency
              </label>
              <select
                id="agencyId"
                name="agencyId"
                value={formData.agencyId}
                onChange={handleChange}
                required
                disabled={isAgenciesLoading}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">{isAgenciesLoading ? "Loading agencies..." : "Select Agency"}</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.agency_name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="agencyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Agency
                </label>
                <select
                  id="agencyId"
                  name="agencyId"
                  value={formData.agencyId}
                  onChange={handleChange}
                  disabled={isAgenciesLoading}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">{isAgenciesLoading ? "Loading agencies..." : "Select Agency"}</option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.agency_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="itCompanyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  IT Company
                </label>
                <select
                  id="itCompanyId"
                  name="itCompanyId"
                  value={formData.itCompanyId}
                  onChange={handleChange}
                  required
                  disabled={!formData.agencyId}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">{!formData.agencyId ? "Select Agency first" : "Select IT Company"}</option>
                  {filteredItCompanies.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            value={formData.username}
            onChange={handleChange}
            className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Enter your username"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Enter your password"
          />
        </div>

        <div>
          {/* Disable submit when loading or when required selection is missing */}
          <button
            type="submit"
            disabled={
              loading ||
              (accountType === 'agency' && isAgenciesLoading) ||
              (accountType === 'agency' && !formData.agencyId) ||
              (accountType === 'it' && !formData.itCompanyId)
            }
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${
              loading || (accountType === 'agency' && isAgenciesLoading) || (accountType === 'agency' && !formData.agencyId) || (accountType === 'it' && !formData.itCompanyId)
                ? 'bg-red-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
            }`}
          >
            {loading ? "Signing in..." : "SIGN IN"}
          </button>
        </div>

        {accountType !== 'it' && (
          <div className="text-center text-sm">
            <Link
              to="/register"
              className="font-medium text-red-600 hover:text-red-500"
            >
              Don't have an account? Sign up
            </Link>
          </div>
        )}
      </form>
    </AuthLayout>
  );
};

export default Login;
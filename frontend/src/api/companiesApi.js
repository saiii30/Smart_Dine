// const API_URL = "http://localhost:8000/api";

// export async function createCompany(data) {
//   const res = await fetch(`${API_URL}/companies`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(data),
//   });
//   return res.json();
// }

// export async function getCompany() {
//   const res = await fetch(`${API_URL}/companies`);
//   return res.json();
// }

// export async function updateCompany(id, data) {
//   const res = await fetch(`${API_URL}/companies/${id}`, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(data),
//   });
//   return res.json();
// }

// export const deleteCompany = async (id) => {
//   await fetch(`http://localhost:8000/api/companies/${id}`, {
//     method: "DELETE",
//   });
// };

// export async function getCompanyUser(companyId) {
//   const res = await fetch(
//     `http://localhost:8000/api/users?parent_id=${agencyId}`  //or companyId
//   );
//   return res.json();
// }

// //NEW 
// /* ---------------- NEW (FOR ITCompanyDashboard) ---------------- */

// export async function createCompanyWithAdmin(payload) {
//   const res = await fetch(`${API_URL}/companies/with-admin`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     const err = await res.json();
//     throw new Error(err.detail || "Failed to create company");
//   }

//   return res.json();
// }


import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000/api",
});


API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // or sessionStorage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// GET ALL
export const getCompany = async () => {
  const res = await API.get("/companies/");
  return res.data;
};

// CREATE (company only)
export const createCompany = async (data) => {
  const res = await API.post("/companies/", data);
  return res.data;
};

export const createCompanyWithAdmin = async (data) => {
  const res = await API.post("/companies/with-admin", data, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
};


// UPDATE
export const updateCompany = async (id, data) => {
  const res = await API.put(`/companies/${id}`, data);
  return res.data;
};

// DELETE
export const deleteCompany = async (id) => {
  const res = await API.delete(`/companies/${id}`);
  return res.data;
};

// GET USERS BY COMPANY
export const getCompanyUser = async (companyId) => {
  const res = await API.get(`/companies/${companyId}/users`);
  return res.data;
};


// UPDATE company + contact person
export const updateCompanyWithAdmin = async (id, data) => {
  const res = await API.put(`/companies/${id}/with-admin`, data);
  return res.data;
};
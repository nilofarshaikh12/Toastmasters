import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api/members"; // backend URL

const api = {
  getMembers: () => axios.get(`${API_BASE_URL}/getMembers`),

  getMemberById: (id) => axios.get(`${API_BASE_URL}/getMemberById/${id}`),

  addMember: (memberData) =>
    axios.post(`${API_BASE_URL}/add`, memberData),

  updateMember: (id, memberData) =>
    axios.patch(`${API_BASE_URL}/updateMember/${id}`, memberData),

  deleteMember: (id) =>
    axios.delete(`${API_BASE_URL}/deleteMember/${id}`)
};

export default api;

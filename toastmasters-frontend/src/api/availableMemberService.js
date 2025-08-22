import axios from "axios";

const API_BASE_URL = "http://localhost:8080/available-members";

const availableMemberService = {
  getAllAvailableMembers: () => {
    return axios.get(`${API_BASE_URL}/getAllMembers`);
  },

  getAvailableMembersByMeeting: (meetingId) => {
    return axios.get(`${API_BASE_URL}/meeting/${meetingId}`);
  },

  getAvailableMemberById: (id) => {
    return axios.get(`${API_BASE_URL}/${id}`); // Assuming a new endpoint for fetching by ID
  },

  addAvailableMember: (availableMember) => {
    return axios.post(`${API_BASE_URL}/add`, availableMember);
  },

  updateAvailableMember: (id, availableMember) => {
    return axios.put(`${API_BASE_URL}/update/${id}`, availableMember);
  },

  deleteAvailableMember: (id) => {
    return axios.delete(`${API_BASE_URL}/delete/${id}`);
  },
};

export default availableMemberService;
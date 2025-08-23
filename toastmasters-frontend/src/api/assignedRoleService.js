// src/api/assignedRoleService.js
import axios from "axios";

const API_BASE_URL = "http://localhost:8080/assigned_roles";

const assignedRoleService = {
  getAssignedRolesByMeeting: (meetingId) => {
    return axios.get(`${API_BASE_URL}/meeting/${meetingId}`);
  },
  assignRole: (roleAssignment) => {
    console.log('Sending to backend:', JSON.stringify(roleAssignment, null, 2));
    return axios.post(API_BASE_URL, roleAssignment)
      .then(response => {
        console.log('Backend response:', response.data);
        return response;
      })
      .catch(error => {
        console.error('Error in assignRole:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        throw error;
      });
  },
  getMemberRoleHistory: (memberId) => {
    return axios.get(`${API_BASE_URL}/history/member/${memberId}?limit=3`);
  },
  getAvailableRolesForMeeting: (meetingId) => {
    return axios.get(`${API_BASE_URL}/available-roles/meeting/${meetingId}`);
  },
  deleteAssignedRole: async (assignmentId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${assignmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting assigned role:', error);
      throw error;
    }
  }
};

export default assignedRoleService;
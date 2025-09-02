// src/api/assignedRoleService.js
import axios from "axios";

const API_BASE_URL = "http://localhost:8080/assigned_roles";

const assignedRoleService = {
  getAssignedRolesByMeeting: (meetingId) => {
    return axios.get(`${API_BASE_URL}/meeting/${meetingId}`);
  },
  assignRole: async (roleAssignment) => {
    try {
      console.log('Sending to backend:', JSON.stringify(roleAssignment, null, 2));
      const response = await axios.post(API_BASE_URL, roleAssignment);
      console.log('Backend response:', response.data);
      return response;
    } catch (error) {
      const resp = error.response;
      const details = {
        message: error.message,
        status: resp?.status,
        statusText: resp?.statusText,
        url: resp?.config?.url,
        method: resp?.config?.method,
        responseData: resp?.data,
      };
      try {
        console.error('Error in assignRole (detailed):', JSON.stringify(details, null, 2));
      } catch (_) {
        console.error('Error in assignRole (raw):', details);
      }
      throw error;
    }
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
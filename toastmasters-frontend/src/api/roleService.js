import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/roles';

const roleService = {
  // Add a new role
  addRole: async (role) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/addRoles`, role);
      return response.data?.data ?? null;
    } catch (error) {
      console.error('Error adding role:', error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Get all roles
  getAllRoles: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/getRoles`);
      console.log('Roles API Response:', response.data);
      return response.data?.data ?? [];
    } catch (error) {
      console.error('Error fetching roles:', error.response ? error.response.data : error.message);
      return [];
    }
  },

  // Get roles by category
  getRolesByCategory: async (category) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/getRolesByCategory/${category}`);
      return response.data?.data ?? [];
    } catch (error) {
      console.error('Error fetching roles by category:', error.response ? error.response.data : error.message);
      return [];
    }
  },

  // Get role by ID
  getRoleById: async (roleId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/getRoleById/${roleId}`);
      return response.data?.data ?? null;
    } catch (error) {
      console.error('Error fetching role by ID:', error.response ? error.response.data : error.message);
      return null;
    }
  },

  // Update role
  updateRole: async (roleId, role) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/updateRole/${roleId}`, role);
      return response.data?.data ?? null;
    } catch (error) {
      console.error('Error updating role:', error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Delete role
  deleteRole: async (roleId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/deleteRole/${roleId}`);
      return response.data?.data ?? null;
    } catch (error) {
      console.error('Error deleting role:', error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Get roles for a specific meeting category
  getRolesForMeetingCategory: async (meetingCategory) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/getRolesForMeeting/${meetingCategory}`);
      return response.data?.data ?? [];
    } catch (error) {
      console.error('Error fetching roles for meeting category:', error.response ? error.response.data : error.message);
      return [];
    }
  },
};

export default roleService;

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/roles';

const roleService = {
  
  addRole: (role) => axios.post(`${API_BASE_URL}/addRoles`, role),

  getAllRoles: () => axios.get(`${API_BASE_URL}/getRoles`),

  getRolesByCategory: (category) => axios.get(`${API_BASE_URL}/getRolesByCategory/${category}`),

  getRoleById: (roleId) => axios.get(`${API_BASE_URL}/getRoleById/${roleId}`),

  updateRole: (roleId, role) => axios.patch(`${API_BASE_URL}/updateRole/${roleId}`, role),

  deleteRole: (roleId) => axios.delete(`${API_BASE_URL}/deleteRole/${roleId}`),

  // Get roles that are applicable for a specific meeting category
  getRolesForMeetingCategory: (meetingCategory) => axios.get(`${API_BASE_URL}/getRolesForMeeting/${meetingCategory}`),
};

export default roleService;
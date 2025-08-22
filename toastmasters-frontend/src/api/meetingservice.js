import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/meeting'; 

const meetingService = {

  addMeeting: (meeting) => axios.post(`${API_BASE_URL}/addMeeting`, meeting),

  getAllMeetings: () => axios.get(`${API_BASE_URL}/getMeetings`),

  getMeetingsByCategory: (category) => axios.get(`${API_BASE_URL}/getMeetingsByCategory/${category}`),

  getMeetingById: (meetingId) => axios.get(`${API_BASE_URL}/getMeetingById/${meetingId}`),

  updateMeeting: (meetingId, meeting) => axios.patch(`${API_BASE_URL}/updateMeeting/${meetingId}`, meeting),

  deleteMeeting: (meetingId) => axios.delete(`${API_BASE_URL}/deleteMeeting/${meetingId}`),
};

export default meetingService;
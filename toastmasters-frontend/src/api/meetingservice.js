import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/meeting'; 

const meetingService = {

  addMeeting: async (meeting) => {
    console.log('Sending meeting data:', JSON.stringify(meeting, null, 2));
    try {
      const response = await axios.post(`${API_BASE_URL}/addMeeting`, meeting);
      console.log('Meeting created successfully:', response.data);
      return response;
    } catch (error) {
      const errorData = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      };
      console.error('Error creating meeting:', JSON.stringify(errorData, null, 2));
      throw error;
    }
  },

  getAllMeetings: () => axios.get(`${API_BASE_URL}/getMeetings`),

  getMeetingsByCategory: (category) => axios.get(`${API_BASE_URL}/getMeetingsByCategory/${category}`),

  getMeetingById: (meetingId) => axios.get(`${API_BASE_URL}/getMeetingById/${meetingId}`),

  updateMeeting: (meetingId, meeting) => axios.patch(`${API_BASE_URL}/updateMeeting/${meetingId}`, meeting),

  deleteMeeting: (meetingId) => axios.delete(`${API_BASE_URL}/deleteMeeting/${meetingId}`),
};

export default meetingService;
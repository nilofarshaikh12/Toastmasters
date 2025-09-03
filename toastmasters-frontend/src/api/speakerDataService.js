import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api/speaker-data";

const speakerDataService = {
  add: (payload) => axios.post(`${API_BASE_URL}/add`, payload),
  update: (speakerId, payload) => axios.put(`${API_BASE_URL}/update/${speakerId}`, payload),
  delete: (speakerId) => axios.delete(`${API_BASE_URL}/delete/${speakerId}`),
  getById: async (speakerId) => {
    const urls = [
      `${API_BASE_URL}/getDataById/${speakerId}`,
      `${API_BASE_URL}/${speakerId}`,
    ];
    for (const u of urls) {
      try {
        const res = await axios.get(u);
        return res?.data?.data ?? res?.data;
      } catch (e) {
        if (e?.response?.status === 404) continue;
        // eslint-disable-next-line no-console
        console.warn('[speakerDataService] getById variant failed', u, e);
      }
    }
    throw new Error('Speaker data not found');
  },
  getAll: () => axios.get(`${API_BASE_URL}/get`),
  getByMember: (memberId) => axios.get(`${API_BASE_URL}/getByMemberId/member/${memberId}`),
  getByMeeting: (meetingId) => axios.get(`${API_BASE_URL}/getByMeetingId/meeting/${meetingId}`),
};

export default speakerDataService;

import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api/grammarian";

const ensureMId = (meetingId) => {
  const raw = String(meetingId ?? '').trim();
  if (!raw) return '';
  return raw.toUpperCase().startsWith('M') ? raw.toUpperCase() : `M${raw}`;
};

const grammarianService = {
  add: (payload) => axios.post(`${API_BASE_URL}/add`, payload),
  update: (grammarianId, payload) => axios.put(`${API_BASE_URL}/update/${grammarianId}`, payload),
  delete: (grammarianId) => axios.delete(`${API_BASE_URL}/delete/${grammarianId}`),
  getById: async (grammarianId) => {
    const urls = [
      `${API_BASE_URL}/getById/${grammarianId}`,
      `${API_BASE_URL}/${grammarianId}`,
    ];
    for (const u of urls) {
      try {
        const res = await axios.get(u);
        return res?.data?.data ?? res?.data;
      } catch (e) {
        if (e?.response?.status === 404) continue;
        // eslint-disable-next-line no-console
        console.warn('[grammarianService] getById variant failed', u, e);
      }
    }
    throw new Error('Grammarian data not found');
  },
  getAll: () => axios.get(`${API_BASE_URL}/getAll`),
  getByMember: (memberId) => axios.get(`${API_BASE_URL}/getByMemberId/member/${memberId}`),
  getByMeeting: (meetingId) => axios.get(`${API_BASE_URL}/getByMeetingId/meeting/${ensureMId(meetingId)}`),
};

export default grammarianService;

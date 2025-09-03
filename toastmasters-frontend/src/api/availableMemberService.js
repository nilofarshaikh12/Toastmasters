import axios from "axios";

const API_BASE_URL = "http://localhost:8080/available-members";

const availableMemberService = {
  getAllAvailableMembers: () => {
    return axios.get(`${API_BASE_URL}/getAllMembers`);
  },

  getAvailableMembersByMeeting: (meetingId) => {
    return axios.get(`${API_BASE_URL}/meeting/${meetingId}`);
  },

  // Robust variant: tries multiple ID formats and falls back to filtering all
  getAvailableMembersByMeetingRobust: async (meetingId) => {
    // Backend expects IDs in the form 'M12', 'M13', etc.
    const idM = String(meetingId).trim().toUpperCase().startsWith('M')
      ? String(meetingId).trim().toUpperCase()
      : `M${String(meetingId).trim()}`;

    try {
      const res = await axios.get(`${API_BASE_URL}/meeting/${idM}`);
      const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : null);
      if (Array.isArray(arr)) return arr;
    } catch (e) {
      if (e?.response?.status !== 404) {
        // eslint-disable-next-line no-console
        console.warn('[availableMemberService] meeting fetch failed for', idM, e);
      }
    }

    // Fallback: fetch all and filter by meetingId variations
    try {
      const allRes = await axios.get(`${API_BASE_URL}/getAllMembers`);
      const all = allRes?.data?.data ?? allRes?.data ?? [];
      const norm = (v) => String(v ?? '').trim().toUpperCase();
      const inputM = norm(idM);
      return (Array.isArray(all) ? all : []).filter(x => norm(x.meetingId) === inputM);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[availableMemberService] fallback getAllMembers failed', e);
      return [];
    }
  },

  // Robust fetch by ID: tries multiple endpoint shapes and normalizes response
  getAvailableMemberById: async (id) => {
    const candidates = [
      `${API_BASE_URL}/${id}`,
      `${API_BASE_URL}/getById/${id}`,
      `${API_BASE_URL}/id/${id}`,
    ];
    // Try direct endpoints first
    for (const url of candidates) {
      try {
        const res = await axios.get(url);
        const data = res?.data?.data ?? res?.data ?? null;
        if (data && typeof data === 'object') return data;
      } catch (e) {
        if (e?.response?.status === 404) continue;
        // eslint-disable-next-line no-console
        console.warn('[availableMemberService] getById variant failed for', url, e);
      }
    }
    // Fallback: fetch all and find by id (support various id key names)
    try {
      const allRes = await axios.get(`${API_BASE_URL}/getAllMembers`);
      const all = allRes?.data?.data ?? allRes?.data ?? [];
      const idMatches = (obj, target) => {
        const keys = ['id', 'availableMemberId', 'availabilityId', 'memberAvailabilityId'];
        return keys.some(k => obj && obj[k] !== undefined && String(obj[k]) === String(target));
      };
      const match = (Array.isArray(all) ? all : []).find(x => idMatches(x, id));
      if (match) return match;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[availableMemberService] fallback getAllMembers in getById failed', e);
    }
    throw new Error('Available member not found');
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
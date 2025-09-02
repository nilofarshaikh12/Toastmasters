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
    const candidates = [];
    const pushIf = (v) => { if (v !== undefined && v !== null && String(v).trim() !== '') candidates.push(String(v)); };
    pushIf(meetingId);
    const stripM = (v) => String(v).trim().replace(/^M/i, '');
    pushIf(stripM(meetingId));
    // dedupe
    const seen = new Set();
    const uniqueCandidates = candidates.filter(c => (seen.has(c) ? false : (seen.add(c), true)));

    // Try endpoint with candidates
    for (const c of uniqueCandidates) {
      try {
        const res = await axios.get(`${API_BASE_URL}/meeting/${c}`);
        const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : null);
        if (Array.isArray(arr)) return arr;
      } catch (e) {
        if (e?.response?.status === 404) {
          continue; // try next candidate
        }
        // log and try next
        // eslint-disable-next-line no-console
        console.warn('[availableMemberService] meeting fetch failed for', c, e);
      }
    }

    // Fallback: fetch all and filter by meetingId variations
    try {
      const allRes = await axios.get(`${API_BASE_URL}/getAllMembers`);
      const all = allRes?.data?.data ?? allRes?.data ?? [];
      const norm = (v) => String(v ?? '').trim();
      const input = norm(meetingId);
      const inputStripped = stripM(meetingId);
      const set = new Set([input, inputStripped]);
      return (Array.isArray(all) ? all : []).filter(x => {
        const mid = norm(x.meetingId);
        const midStripped = stripM(x.meetingId);
        return set.has(mid) || set.has(midStripped);
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[availableMemberService] fallback getAllMembers failed', e);
      return [];
    }
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
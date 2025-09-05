import axios from 'axios';

// Base URL for Speaker-Evaluator mappings
const API_BASE_URL = 'http://localhost:8080/api/semappings';

const seMappingService = {
  // POST /api/semappings/assign/{meetingId}/{speakerId}/{evaluatorId}
  assignEvaluator: async (meetingId, speakerId, evaluatorId) => {
    const url = `${API_BASE_URL}/assign/${encodeURIComponent(meetingId)}/${speakerId}/${evaluatorId}`;
    return axios.post(url);
  },

  // GET /api/semappings/meeting/{meetingId}
  getMappingsForMeeting: async (meetingId) => {
    const url = `${API_BASE_URL}/meeting/${encodeURIComponent(meetingId)}`;
    return axios.get(url);
  },

  // DELETE /api/semappings/unassign/{meetingId}/{speakerId}/{evaluatorId}
  unassignEvaluator: async (meetingId, speakerId, evaluatorId) => {
    const url = `${API_BASE_URL}/unassign/${encodeURIComponent(meetingId)}/${speakerId}/${evaluatorId}`;
    return axios.delete(url);
  },

  // DELETE /api/semappings/{speakerEvaluatorMappingId}
  deleteMapping: async (speakerEvaluatorMappingId) => {
    const url = `${API_BASE_URL}/${speakerEvaluatorMappingId}`;
    return axios.delete(url);
  },

  // DELETE /api/semappings/remove/{meetingId}/{speakerId}/{evaluatorId}
  removeEvaluator: async (meetingId, speakerId, evaluatorId) => {
    const url = `${API_BASE_URL}/remove/${encodeURIComponent(meetingId)}/${speakerId}/${evaluatorId}`;
    return axios.delete(url);
  },

  // Optional grouped endpoints if needed later
  getEvaluatorsGroupedBySpeaker: async (meetingId) => {
    const url = `${API_BASE_URL}/getEvaluators/meeting/${encodeURIComponent(meetingId)}/by-speaker`;
    return axios.get(url);
  },

  getSpeakersGroupedByEvaluator: async (meetingId) => {
    const url = `${API_BASE_URL}/getSpeakers/meeting/${encodeURIComponent(meetingId)}/by-evaluator`;
    return axios.get(url);
  },
};

export default seMappingService;


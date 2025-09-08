import axios from 'axios';

// Base URLs aligned with backend conventions
const AGENDA_BASE = 'http://localhost:8080/api/agenda';
const AGENDA_JOIN_BASE = 'http://localhost:8080/api/agenda-join';

const agendaService = {
    // Create new agenda item
    createAgenda: async (agendaData) => {
        try {
            // Expected backend endpoint: POST /api/agenda/add
            const response = await axios.post(`${AGENDA_BASE}/add`, agendaData);
            return response.data;
        } catch (error) {
            console.error('Error creating agenda:', error);
            throw error;
        }
    },

    // Get agenda item by ID
    getAgendaById: async (agendaId) => {
        try {
            // Expected backend endpoint: GET /api/agenda/getById/{agendaId}
            const response = await axios.get(`${AGENDA_BASE}/getById/${agendaId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching agenda by ID:', error);
            throw error;
        }
    },

    // Get all agenda items for a specific meeting
    getAgendaByMeeting: async (meetingId) => {
        try {
            // Expected backend endpoint: GET /api/agenda/getByMeeting/{meetingId}
            const response = await axios.get(`${AGENDA_BASE}/getByMeeting/${meetingId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching agenda by meeting:', error);
            throw error;
        }
    },

    // Get complete agenda data (AgendaJoinDTO) via AgendaJoinController
    getCompleteAgenda: async (meetingId) => {
        try {
            // Backend endpoint: /api/agenda-join/getAgenda/{meetingId}
            const response = await axios.get(`${AGENDA_JOIN_BASE}/getAgenda/${meetingId}`);
            return response.data; // Typically { message, statusCode, data }
        } catch (error) {
            console.error('Error fetching complete agenda:', error);
            throw error;
        }
    },

    // Save complete agenda data (AgendaJoinDTO) via AgendaJoinController
    saveCompleteAgenda: async (meetingId, agendaJoinData) => {
        try {
            // Backend endpoint: PUT /api/agenda-join/updateAgenda/{meetingId}
            const response = await axios.put(`${AGENDA_JOIN_BASE}/updateAgenda/${meetingId}`, agendaJoinData);
            return response.data;
        } catch (error) {
            console.error('Error saving complete agenda:', error);
            throw error;
        }
    },

    // Update agenda item
    updateAgenda: async (agendaId, agendaData) => {
        try {
            // Expected backend endpoint: PUT /api/agenda/update/{agendaId}
            const response = await axios.put(`${AGENDA_BASE}/update/${agendaId}`, agendaData);
            return response.data;
        } catch (error) {
            console.error('Error updating agenda:', error);
            throw error;
        }
    },

    // Delete agenda item
    deleteAgenda: async (agendaId) => {
        try {
            // Expected backend endpoint: DELETE /api/agenda/delete/{agendaId}
            const response = await axios.delete(`${AGENDA_BASE}/delete/${agendaId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting agenda:', error);
            throw error;
        }
    },

    // Additional methods can be added here as needed
};

export default agendaService;

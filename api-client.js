/**
 * Ask YaGuy API Client
 * Frontend JavaScript library for interacting with the backend API
 */

// Auto-detect API URL based on environment
const API_BASE_URL = (() => {
  // If running locally (localhost:8000), use local backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  // In production (Railway), API is on same origin
  return window.location.origin + '/api';
})();

// Utility to get auth token from localStorage
function getToken() {
  return localStorage.getItem('yaguy_token');
}

// Utility to save auth token
function saveToken(token) {
  localStorage.setItem('yaguy_token', token);
}

// Utility to clear auth token
function clearToken() {
  localStorage.removeItem('yaguy_token');
}

// Utility to get current user from token
function getCurrentUser() {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    return null;
  }
}

// API Client
const YaGuyAPI = {
  // Authentication
  auth: {
    async login(email, password) {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        saveToken(data.token);
      }

      return data;
    },

    async register(email, password, name) {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();

      if (response.ok) {
        saveToken(data.token);
      }

      return data;
    },

    async getProfile() {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return await response.json();
    },

    logout() {
      clearToken();
      window.location.href = '/index.html';
    },

    isLoggedIn() {
      return !!getToken();
    },

    getCurrentUser() {
      return getCurrentUser();
    }
  },

  // Questions
  questions: {
    async submit(questionData) {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json' };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(questionData)
      });

      return await response.json();
    },

    async confirmPayment(sessionId) {
      const response = await fetch(`${API_BASE_URL}/questions/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      return await response.json();
    },

    async getMyQuestions() {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/questions/my-questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return await response.json();
    },

    async getQuestion(id) {
      const token = getToken();
      const headers = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
        headers
      });

      return await response.json();
    }
  },

  // Admin
  admin: {
    async getAllQuestions(filters = {}) {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const queryParams = new URLSearchParams(filters).toString();
      const url = `${API_BASE_URL}/questions${queryParams ? '?' + queryParams : ''}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return await response.json();
    },

    async updateQuestionStatus(id, status) {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/questions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      return await response.json();
    },

    async publishAnswer(id, answerText) {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/questions/${id}/publish-answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answer_text: answerText })
      });

      return await response.json();
    },

    async getStats() {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/questions/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return await response.json();
    }
  }
};

// Export for use in HTML pages
if (typeof window !== 'undefined') {
  window.YaGuyAPI = YaGuyAPI;
  window.getToken = getToken;
  window.saveToken = saveToken;
  window.clearToken = clearToken;
  window.getCurrentUser = getCurrentUser;
}

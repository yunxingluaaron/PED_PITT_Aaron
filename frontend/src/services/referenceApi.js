// src/services/referenceApi.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const fetchPdf = async (fileName) => {
  console.log('📄 fetchPdf called with:', { fileName });

  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No authentication token found. Please login again.');
  }

  try {
    console.log('📤 Sending request to fetch PDF');
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/pdf/${encodeURIComponent(fileName)}`,
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true,
      // Add timeout and validate status
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 300
    });

    if (response.data) {
      return response.data;
    }
    throw new Error('No data received from server');
  } catch (error) {
    console.error('API Error:', error.response || error);
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      throw new Error('Session expired. Please login again.');
    }
    if (error.response?.status === 404) {
      throw new Error('PDF not found');
    }
    throw new Error(error.response?.data?.message || 'Failed to fetch PDF');
  }
};
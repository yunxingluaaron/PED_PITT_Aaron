// src/services/questionApi.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const generateAnswer = async ({ message, conversation_id = null }) => {
  const token = localStorage.getItem('auth_token');
  
  console.log('Attempting to send question with token:', token); // Debug log

  if (!token) {
    throw new Error('No authentication token found. Please login again.');
  }

  try {
    console.log('Making API request to:', `${API_BASE_URL}/chat`); // Debug log
    const response = await axios.post(`${API_BASE_URL}/chat`, {
      message,
      conversation_id,
      response_type: 'text'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });

    console.log('API Response:', response.data); // Debug log
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response || error); // Enhanced error logging
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Session expired. Please login again.');
    }
    throw new Error(error.response?.data?.message || 'Failed to generate answer');
  }
};

export const getConversationHistory = async (conversation_id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/conversations/${conversation_id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch conversation history');
  }
};
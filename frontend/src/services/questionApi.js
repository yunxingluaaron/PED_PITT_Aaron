import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const generateAnswer = async ({ 
  message, 
  options = {}, 
  conversation_id = null, 
  parameters = null 
}) => {
  console.log('🚀 generateAnswer called with:', { 
    message, 
    options, 
    conversation_id,
    parameters 
  });
  
  // Handle historical questions
  if (options.isHistoricalAnswer) {
    console.log('📜 Using historical answer, skipping API call');
    return {
      conversation_id: options.conversation_id,
      detailed_response: options.response,
      sources: options.source_data || [],
      metadata: {
        ...options.response_metadata,
        parameters: parameters || options.parameters
      },
      isHistoricalAnswer: true
    };
  }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No authentication token found. Please login again.');
  }

  try {
    const requestData = {
      message: typeof message === 'string' ? message : message.message,
      conversation_id,
      parameters: parameters || {
        tone: 'balanced',
        detailLevel: 'moderate',
        empathy: 'moderate',
        professionalStyle: 'clinicallyBalanced'
      },
      response_type: 'text'
    };

    console.log('📤 Request data being sent:', JSON.stringify(requestData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/chat`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });

    console.log('📥 Response received:', response.data);

    if (response.data) {
      if (!options.isHistoricalAnswer) {
        window.dispatchEvent(new CustomEvent('questionAdded', {
          detail: {
            parameters: parameters
          }
        }));
      }
      return {
        ...response.data,
        parameters: parameters
      };
    }
  } catch (error) {
    console.error('🔥 Detailed API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      details: error.response?.data?.error || error.response?.data?.message
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      throw new Error('Session expired. Please login again.');
    }
    
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        'Failed to generate answer';
    throw new Error(errorMessage);
  }
};

export const getQuestionHistory = async () => {
  console.log('🔴 getQuestionHistory called');
  const token = localStorage.getItem('auth_token');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/questions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('🔴 Question history response:', response.data);
    return response.data;
  } catch (error) {
    console.error('🔴 Failed to fetch question history:', error);
    throw error;
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

export const getVersionHistory = async (questionId) => {
  const token = localStorage.getItem('auth_token');
  try {
    const response = await axios.get(`${API_BASE_URL}/questions/${questionId}/versions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch version history:', error);
    throw error;
  }
};

export const deleteQuestion = async (questionId) => {
  const token = localStorage.getItem('auth_token');
  try {
    const response = await axios.delete(`${API_BASE_URL}/questions/${questionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to delete question:', error);
    throw error;
  }
};

export const getQuestionDetails = async (questionId) => {
  console.log('🔍 Fetching details for question:', questionId);
  const token = localStorage.getItem('auth_token');
  try {
    const response = await axios.get(`${API_BASE_URL}/questions/${questionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('📦 Received question details:', response.data);
    return response.data;
  } catch (error) {
    console.error('💥 Failed to fetch question details:', error);
    throw error;
  }
};
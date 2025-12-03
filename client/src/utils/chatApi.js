import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

/**
 * Generate a unique session ID for anonymous chat users
 */
export const generateSessionId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `session_${timestamp}_${random}`;
};

/**
 * Get session ID from localStorage or create a new one
 */
export const getSessionId = () => {
  let sessionId = localStorage.getItem('basira_chat_session_id');
  
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('basira_chat_session_id', sessionId);
  }
  
  return sessionId;
};

/**
 * Send a message to the AI chatbot
 */
export const sendMessage = async (message, sessionId = null) => {
  try {
    const sid = sessionId || getSessionId();
    
    const response = await axios.post(`${API_BASE_URL}/chat/message`, {
      message,
      sessionId: sid
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Send message error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to send message',
      message: "I'm having trouble connecting right now. Please try again in a moment."
    };
  }
};

/**
 * Get conversation history for the current session
 */
export const getConversationHistory = async (sessionId = null) => {
  try {
    const sid = sessionId || getSessionId();
    
    const response = await axios.get(`${API_BASE_URL}/chat/history/${sid}`);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Get conversation history error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to retrieve history',
      data: {
        messages: [],
        preferences: {},
        properties: [],
        launches: []
      }
    };
  }
};

/**
 * Get initial greeting from AI
 */
export const getGreeting = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/chat/greeting`);
    
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    console.error('Get greeting error:', error);
    return {
      success: true,
      message: "Hello! I'm Basera, your real estate assistant. How can I help you find your perfect property today?"
    };
  }
};

/**
 * Capture lead information from chat
 */
export const captureLead = async (leadData, sessionId = null) => {
  try {
    const sid = sessionId || getSessionId();
    
    const response = await axios.post(`${API_BASE_URL}/chat/capture-lead`, {
      ...leadData,
      sessionId: sid
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Capture lead error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to submit information',
      errors: error.response?.data?.errors || []
    };
  }
};

/**
 * Clear chat session (for starting fresh)
 */
export const clearSession = () => {
  localStorage.removeItem('basira_chat_session_id');
  localStorage.removeItem('basira_chat_messages');
  return generateSessionId();
};

/**
 * Save messages to localStorage for persistence
 */
export const saveMessagesToLocal = (messages) => {
  try {
    localStorage.setItem('basira_chat_messages', JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages to localStorage:', error);
  }
};

/**
 * Load messages from localStorage
 */
export const loadMessagesFromLocal = () => {
  try {
    const saved = localStorage.getItem('basira_chat_messages');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading messages from localStorage:', error);
    return [];
  }
};

/**
 * Format property for display in chat
 */
export const formatPropertyMessage = (property) => {
  return {
    _id: property._id,
    title: property.title,
    type: property.type,
    price: `${property.currency} ${property.price?.toLocaleString()}`,
    location: `${property.location?.city}, ${property.location?.state}`,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    image: property.images?.[0]?.url,
    link: `/property/${property._id}`
  };
};

/**
 * Format launch for display in chat
 */
export const formatLaunchMessage = (launch) => {
  return {
    _id: launch._id,
    title: launch.title,
    developer: launch.developer,
    propertyType: launch.propertyType,
    price: `${launch.currency} ${launch.startingPrice?.toLocaleString()}`,
    location: launch.location,
    bedrooms: launch.bedrooms,
    bathrooms: launch.bathrooms,
    area: launch.area,
    image: launch.image,
    status: launch.status,
    link: `/launches/${launch._id}`
  };
};

const chatApi = {
  sendMessage,
  getConversationHistory,
  getGreeting,
  captureLead,
  generateSessionId,
  getSessionId,
  clearSession,
  saveMessagesToLocal,
  loadMessagesFromLocal,
  formatPropertyMessage,
  formatLaunchMessage
};

export default chatApi;


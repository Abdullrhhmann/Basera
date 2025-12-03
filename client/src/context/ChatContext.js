import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as chatApi from '../utils/chatApi';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [recommendedProperties, setRecommendedProperties] = useState([]);
  const [recommendedLaunches, setRecommendedLaunches] = useState([]);
  const [userPreferences, setUserPreferences] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize chat session
  useEffect(() => {
    const initializeChat = async () => {
      // Get or create session ID
      const sid = chatApi.getSessionId();
      setSessionId(sid);

      // Load messages from localStorage first for instant display
      const savedMessages = chatApi.loadMessagesFromLocal();
      if (savedMessages.length > 0) {
        setMessages(savedMessages);
        setIsInitialized(true);
        return;
      }

      // If no saved messages, get greeting
      try {
        const greetingResponse = await chatApi.getGreeting();
        if (greetingResponse.success) {
          const greetingMessage = {
            role: 'assistant',
            content: greetingResponse.message,
            timestamp: new Date().toISOString()
          };
          setMessages([greetingMessage]);
          chatApi.saveMessagesToLocal([greetingMessage]);
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
      
      setIsInitialized(true);
    };

    initializeChat();
  }, []);

  // Load conversation history when chat opens for the first time
  useEffect(() => {
    const loadHistory = async () => {
      if (isOpen && sessionId && messages.length <= 1) {
        const historyResponse = await chatApi.getConversationHistory(sessionId);
        if (historyResponse.success && historyResponse.data.messages.length > 0) {
          setMessages(historyResponse.data.messages);
          setUserPreferences(historyResponse.data.preferences || {});
          chatApi.saveMessagesToLocal(historyResponse.data.messages);
        }
      }
    };
    
    loadHistory();
  }, [isOpen, sessionId, messages.length]);

  // Send message to AI
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    // Add user message immediately
    const userMessage = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    chatApi.saveMessagesToLocal(updatedMessages);
    setIsLoading(true);

    try {
      // Send to API
      const response = await chatApi.sendMessage(messageText, sessionId);

      if (response.success && response.data) {
        // Add AI response
        const aiMessage = {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date().toISOString(),
          properties: response.data.properties || [],
          launches: response.data.launches || []
        };

        const newMessages = [...updatedMessages, aiMessage];
        setMessages(newMessages);
        chatApi.saveMessagesToLocal(newMessages);

        // Update recommendations
        if (response.data.properties?.length > 0) {
          setRecommendedProperties(prev => [...prev, ...response.data.properties]);
        }
        if (response.data.launches?.length > 0) {
          setRecommendedLaunches(prev => [...prev, ...response.data.launches]);
        }

        // Update preferences
        if (response.data.preferences) {
          setUserPreferences(response.data.preferences);
        }

        // Show notification if chat is closed
        if (!isOpen) {
          setHasNewMessage(true);
        }
      } else {
        // Error response
        const errorMessage = {
          role: 'assistant',
          content: response.message || "I'm having trouble responding right now. Please try again.",
          timestamp: new Date().toISOString(),
          isError: true
        };
        const newMessages = [...updatedMessages, errorMessage];
        setMessages(newMessages);
        chatApi.saveMessagesToLocal(newMessages);
      }
    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage = {
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      const newMessages = [...updatedMessages, errorMessage];
      setMessages(newMessages);
      chatApi.saveMessagesToLocal(newMessages);
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionId, isLoading, isOpen]);

  // Capture lead from chat
  const captureLead = useCallback(async (leadData) => {
    const response = await chatApi.captureLead(leadData, sessionId);
    
    if (response.success) {
      // Add confirmation message
      const confirmMessage = {
        role: 'assistant',
        content: response.data.message || "Thank you! Our team will contact you shortly.",
        timestamp: new Date().toISOString(),
        isLeadCapture: true
      };
      
      const newMessages = [...messages, confirmMessage];
      setMessages(newMessages);
      chatApi.saveMessagesToLocal(newMessages);
    }
    
    return response;
  }, [messages, sessionId]);

  // Toggle chat window
  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setHasNewMessage(false);
    }
  }, [isOpen]);

  // Close chat
  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Open chat
  const openChat = useCallback(() => {
    setIsOpen(true);
    setHasNewMessage(false);
  }, []);

  // Clear conversation and start fresh
  const clearConversation = useCallback(async () => {
    const newSessionId = chatApi.clearSession();
    setSessionId(newSessionId);
    setMessages([]);
    setRecommendedProperties([]);
    setRecommendedLaunches([]);
    setUserPreferences({});
    
    // Get new greeting
    const greetingResponse = await chatApi.getGreeting();
    if (greetingResponse.success) {
      const greetingMessage = {
        role: 'assistant',
        content: greetingResponse.message,
        timestamp: new Date().toISOString()
      };
      setMessages([greetingMessage]);
      chatApi.saveMessagesToLocal([greetingMessage]);
    }
  }, []);

  const value = {
    isOpen,
    messages,
    isLoading,
    sessionId,
    hasNewMessage,
    recommendedProperties,
    recommendedLaunches,
    userPreferences,
    isInitialized,
    sendMessage,
    captureLead,
    toggleChat,
    closeChat,
    openChat,
    clearConversation
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;


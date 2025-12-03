import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  Minimize2, 
  RefreshCw,
  Bot,
  Sparkles
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';

const ChatWidget = () => {
  const {
    isOpen,
    messages,
    isLoading,
    hasNewMessage,
    sendMessage,
    captureLead,
    toggleChat,
    closeChat,
    clearConversation
  } = useChat();

  const [inputMessage, setInputMessage] = useState('');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [leadFormData, setLeadFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const message = inputMessage.trim();
    setInputMessage('');
    
    await sendMessage(message);
  };

  const handleLeadFormChange = (e) => {
    const { name, value } = e.target;
    setLeadFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLeadFormSubmit = async (e) => {
    e.preventDefault();
    
    const response = await captureLead(leadFormData);
    
    if (response.success) {
      setLeadSubmitted(true);
      setShowLeadForm(false);
      setLeadFormData({
        name: '',
        email: '',
        phone: '',
        message: ''
      });
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setLeadSubmitted(false);
      }, 3000);
    }
  };

  const handleClearChat = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmClear = () => {
    clearConversation();
    setShowLeadForm(false);
    setLeadSubmitted(false);
    setShowConfirmModal(false);
  };

  const handleCancelClear = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, type: 'spring' }}
            onClick={toggleChat}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50 backdrop-blur-2xl bg-transparent text-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 shadow-2xl hover:shadow-[#A88B32]/50 hover:scale-110 transition-all duration-500 group border-2 border-[#A88B32]/50 touch-manipulation"
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(168, 139, 50, 0.4), 0 0 0 2px rgba(168, 139, 50, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
              background: 'transparent'
            }}
          >
            {/* Modern AI Agent Icon */}
            <div className="relative">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-[#A88B32] group-hover:scale-110 transition-transform duration-300" />
              <Sparkles className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#A88B32] opacity-80 group-hover:opacity-100 group-hover:rotate-12 transition-all duration-300" />
            </div>
            
            {/* Notification Badge */}
            {hasNewMessage && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-[0.625rem] sm:text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center border-2 border-white shadow-lg"
              >
                1
              </motion.span>
            )}
            
            {/* Pulse Animation with gold theme - REMOVED */}
            {/* <span className="absolute inset-0 rounded-3xl border-2 border-[#A88B32] opacity-30 animate-ping"></span> */}
            
            {/* Glowing Ring Effect */}
            <span className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#A88B32]/20 to-[#C09C3D]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ duration: 0.3, type: 'spring' }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50 w-[calc(100vw-2rem)] sm:w-[380px] md:w-[400px] lg:w-[420px] max-w-[calc(100vw-2rem)] backdrop-blur-2xl bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.02] rounded-2xl sm:rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-2 border-[#A88B32]/30"
            style={{ 
              height: 'min(600px, calc(100vh - 8rem))',
              maxHeight: 'calc(100vh - 8rem)',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(168, 139, 50, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.03] backdrop-blur-xl text-white p-3 sm:p-4 flex items-center justify-between border-b border-[#A88B32]/40 sm:border-b-2" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)' }}>
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#A88B32]/40 to-[#A88B32]/30 rounded-full flex items-center justify-center backdrop-blur-xl border-2 border-[#A88B32]/60 shadow-lg shadow-[#A88B32]/40 relative overflow-hidden flex-shrink-0" style={{ boxShadow: '0 8px 32px rgba(168, 139, 50, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)' }}>
                  {/* AI Agent Icon */}
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[#A88B32] relative z-10 hover:scale-110 transition-transform duration-300" />
                  
                  {/* Sparkle Effect */}
                  <Sparkles className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2 h-2 sm:w-3 sm:h-3 text-[#A88B32] opacity-70 animate-pulse" />
                  
                  {/* Glowing Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#A88B32]/20 to-[#C09C3D]/20 rounded-full blur-sm"></div>
                  
                  {/* Subtle Animation Ring */}
                  <div className="absolute inset-0 rounded-full border border-[#A88B32]/30 animate-ping opacity-20"></div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-bold text-sm sm:text-base md:text-lg tracking-wide text-white truncate">Basera AI Assistant</h3>
                  <p className="text-[0.625rem] sm:text-xs text-[#A88B32] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] truncate">Property Expert</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                <button
                  onClick={handleClearChat}
                  className="p-1.5 sm:p-2 hover:bg-white/[0.1] rounded-lg transition-all duration-300 hover:rotate-180 backdrop-blur-sm border border-transparent hover:border-[#A88B32]/30 touch-manipulation"
                  title="Start new conversation"
                >
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A88B32]" />
                </button>
                <button
                  onClick={closeChat}
                  className="hidden sm:block p-1.5 sm:p-2 hover:bg-white/[0.1] rounded-lg transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-[#A88B32]/30 touch-manipulation"
                  title="Minimize"
                >
                  <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A88B32]" />
                </button>
                <button
                  onClick={closeChat}
                  className="p-1.5 sm:p-2 hover:bg-white/[0.1] rounded-lg transition-all duration-300 hover:rotate-90 backdrop-blur-sm border border-transparent hover:border-[#A88B32]/30 touch-manipulation"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A88B32]" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-xl" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)' }}>
              {messages.map((message, index) => (
                <ChatMessage 
                  key={index} 
                  message={message} 
                  index={index}
                />
              ))}
              
              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <TypingIndicator />
                </div>
              )}
              
              {/* Lead Submitted Success */}
              {leadSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4"
                >
                  <p className="text-green-800 text-sm font-medium">
                    ✓ Thank you! We'll contact you shortly.
                  </p>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>


            {/* Lead Capture Form */}
            {showLeadForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white border-t border-gray-200 p-3 sm:p-4"
              >
                <form onSubmit={handleLeadFormSubmit} className="space-y-2.5 sm:space-y-3">
                  <div>
                    <label className="block text-[0.625rem] sm:text-xs font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={leadFormData.name}
                      onChange={handleLeadFormChange}
                      required
                      className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent touch-manipulation"
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[0.625rem] sm:text-xs font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={leadFormData.email}
                      onChange={handleLeadFormChange}
                      required
                      className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent touch-manipulation"
                      placeholder="your@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[0.625rem] sm:text-xs font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={leadFormData.phone}
                      onChange={handleLeadFormChange}
                      required
                      className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent touch-manipulation"
                      placeholder="+20 XXX XXX XXXX"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[0.625rem] sm:text-xs font-medium text-gray-700 mb-1">
                      Message (Optional)
                    </label>
                    <textarea
                      name="message"
                      value={leadFormData.message}
                      onChange={handleLeadFormChange}
                      rows="2"
                      className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none touch-manipulation"
                      placeholder="Any additional details..."
                    />
                  </div>
                  
                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowLeadForm(false)}
                      className="flex-1 px-3 sm:px-4 py-2 border-2 border-[#202D46] rounded-lg text-xs sm:text-sm font-medium text-[#202D46] hover:bg-[#202D46] hover:text-white transition-colors touch-manipulation min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white rounded-lg text-xs sm:text-sm font-heading font-semibold uppercase tracking-wider hover:shadow-lg hover:from-[#C09C3D] hover:to-[#A88B32] transition-all duration-300 touch-manipulation min-h-[44px]"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Input Area */}
            <div className="bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.05] border-t border-[#A88B32]/30 sm:border-t-2 backdrop-blur-xl p-3 sm:p-4" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)' }}>
              <form onSubmit={handleSendMessage} className="flex items-center space-x-1.5 sm:space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about properties..."
                  disabled={isLoading}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-[#A88B32]/30 sm:border-2 rounded-xl sm:rounded-2xl text-sm text-white placeholder-gray-400 bg-white/[0.1] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-[#A88B32]/50 focus:border-[#A88B32] disabled:bg-white/[0.05] transition-all duration-300 touch-manipulation"
                  style={{ boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)', fontSize: '16px' }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl hover:shadow-xl hover:shadow-[#A88B32]/50 hover:scale-105 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 backdrop-blur-sm touch-manipulation min-w-[44px] min-h-[44px]"
                  style={{ boxShadow: '0 8px 32px rgba(168, 139, 50, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)' }}
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </form>
              
              {/* Powered by */}
              <p className="text-center text-[0.625rem] sm:text-xs text-gray-400 mt-2 sm:mt-3 font-medium tracking-wide">
                Powered by <span className="text-[#A88B32] font-bold">AI</span> • <span className="text-[#A88B32] font-bold">Basira Real Estate</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#131c2b]/50 backdrop-blur-sm"
              onClick={handleCancelClear}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.3, type: 'spring' }}
              className="relative w-full max-w-[90%] sm:max-w-md mx-auto backdrop-blur-xl bg-gradient-to-br from-[#131c2b]/90 via-gray-900/90 to-[#131c2b]/90 rounded-2xl sm:rounded-3xl border border-[#A88B32]/30 sm:border-2 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-[#A88B32]/20 via-[#A88B32]/10 to-transparent backdrop-blur-md p-4 sm:p-6 border-b border-[#A88B32]/40 sm:border-b-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#A88B32]/30 to-[#A88B32]/20 rounded-full flex items-center justify-center backdrop-blur-md border-2 border-[#A88B32]/50 shadow-lg shadow-[#A88B32]/30 flex-shrink-0">
                    <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-[#A88B32]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-bold text-base sm:text-lg md:text-xl text-white truncate">Start New Conversation</h3>
                    <p className="text-xs sm:text-sm text-[#A88B32] font-medium truncate">Clear chat history</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                <p className="text-gray-300 text-center mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                  Are you sure you want to start a new conversation? This will clear all your current chat history and cannot be undone.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleCancelClear}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border-2 border-[#A88B32]/40 bg-gradient-to-br from-white/[0.1] to-white/[0.05] text-white font-heading font-semibold uppercase tracking-[0.05em] sm:tracking-[0.1em] text-xs sm:text-sm hover:border-[#A88B32]/60 hover:bg-gradient-to-br hover:from-white/[0.15] hover:to-white/[0.08] transition-all duration-300 touch-manipulation min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmClear}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-heading font-semibold uppercase tracking-[0.05em] sm:tracking-[0.1em] text-xs sm:text-sm hover:shadow-xl hover:shadow-[#A88B32]/50 hover:scale-105 hover:-translate-y-1 transition-all duration-300 touch-manipulation min-h-[44px]"
                  >
                    Start New
                  </button>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-[#A88B32] rounded-full opacity-60 animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-1 h-1 bg-[#C09C3D] rounded-full opacity-40 animate-ping"></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;


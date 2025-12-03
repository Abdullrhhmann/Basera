import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import PropertyPreview from './PropertyPreview';

const ChatMessage = ({ message, index }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[85%] items-start space-x-2`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            isUser 
              ? 'bg-gradient-to-br from-[#A88B32] to-[#C09C3D] border-[#A88B32]/20 text-white' 
              : 'bg-gradient-to-br from-[#202D46] to-[#2a3a5a] border-[#202D46]/20 text-[#A88B32]'
          }`}>
            {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
        </div>

        {/* Message Content */}
        <div className="flex-1">
          {/* Text Message */}
          <div
            className={`rounded-2xl px-4 py-3 backdrop-blur-md ${
              isUser
                ? 'bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white rounded-tr-sm shadow-lg shadow-[#A88B32]/30'
                : isError
                ? 'bg-red-500/20 text-red-300 border border-red-500/30 rounded-tl-sm backdrop-blur-md'
                : 'bg-gradient-to-br from-white/[0.1] to-white/[0.05] text-white border border-[#A88B32]/20 rounded-tl-sm backdrop-blur-md'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          </div>

          {/* Property Previews */}
          {!isUser && message.properties && message.properties.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.properties.slice(0, 3).map((property, idx) => (
                <PropertyPreview 
                  key={property._id || idx} 
                  property={property}
                  isLaunch={false}
                />
              ))}
            </div>
          )}

          {/* Launch Previews */}
          {!isUser && message.launches && message.launches.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.launches.slice(0, 2).map((launch, idx) => (
                <PropertyPreview 
                  key={launch._id || idx} 
                  property={launch}
                  isLaunch={true}
                />
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;


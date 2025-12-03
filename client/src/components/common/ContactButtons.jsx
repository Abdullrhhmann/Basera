import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone } from 'lucide-react';
import { siteSettingsAPI } from '../../utils/api';

// WhatsApp SVG Icon Component
const WhatsAppIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const ContactButtons = () => {
  const [settings, setSettings] = useState({
    phoneNumbers: [],
    whatsappNumbers: [],
    whatsappMessage: '',
    showPhone: false,
    showWhatsApp: false
  });
  const [loading, setLoading] = useState(true);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('');
  const [selectedWhatsAppNumber, setSelectedWhatsAppNumber] = useState('');

  // Get random number from array
  const getRandomNumber = (numbers) => {
    if (!numbers || numbers.length === 0) return '';
    const randomIndex = Math.floor(Math.random() * numbers.length);
    return numbers[randomIndex];
  };

  // Format WhatsApp number (remove all non-digits, keep only numbers)
  const formatWhatsAppNumber = (number) => {
    // Remove all non-digit characters
    const cleaned = number.replace(/\D/g, '');
    console.log('WhatsApp number formatting:', { original: number, cleaned });
    return cleaned;
  };

  useEffect(() => {
    // Fetch site settings on mount
    const fetchSettings = async () => {
      try {
        const response = await siteSettingsAPI.getSettings();
        if (response.data?.settings) {
          const fetchedSettings = response.data.settings;
          setSettings(fetchedSettings);
          
          // Select random numbers once when settings are loaded
          if (fetchedSettings.phoneNumbers?.length > 0) {
            const randomPhone = getRandomNumber(fetchedSettings.phoneNumbers);
            setSelectedPhoneNumber(randomPhone);
            console.log('Selected phone number:', randomPhone);
          }
          
          if (fetchedSettings.whatsappNumbers?.length > 0) {
            const randomWhatsApp = getRandomNumber(fetchedSettings.whatsappNumbers);
            setSelectedWhatsAppNumber(randomWhatsApp);
            console.log('Selected WhatsApp number:', randomWhatsApp);
          }
        }
      } catch (error) {
        console.error('Failed to load contact settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Don't render anything while loading or if no buttons are enabled
  if (loading) return null;

  const showPhoneButton = settings.showPhone && settings.phoneNumbers?.length > 0 && selectedPhoneNumber;
  const showWhatsAppButton = settings.showWhatsApp && settings.whatsappNumbers?.length > 0 && selectedWhatsAppNumber;

  if (!showPhoneButton && !showWhatsAppButton) return null;

  // Create WhatsApp link with pre-filled message
  const whatsappLink = showWhatsAppButton && selectedWhatsAppNumber
    ? `https://wa.me/${formatWhatsAppNumber(selectedWhatsAppNumber)}?text=${encodeURIComponent(settings.whatsappMessage || '')}`
    : '';

  // Create phone link
  const phoneLink = showPhoneButton && selectedPhoneNumber ? `tel:${selectedPhoneNumber}` : '';
  
  console.log('Contact buttons render:', { 
    showPhoneButton, 
    showWhatsAppButton, 
    phoneLink, 
    whatsappLink,
    selectedPhoneNumber,
    selectedWhatsAppNumber
  });

  // Button base classes matching chatbot styling
  const buttonBaseClass = "fixed right-4 sm:right-6 md:right-8 z-[45] backdrop-blur-2xl bg-transparent text-white rounded-full p-3 sm:p-4 md:p-4 shadow-2xl hover:shadow-[#A88B32]/50 hover:scale-110 transition-all duration-300 group border-2 border-[#A88B32]/50 touch-manipulation flex items-center justify-center";

  const buttonStyle = {
    boxShadow: '0 25px 50px -12px rgba(168, 139, 50, 0.4), 0 0 0 2px rgba(168, 139, 50, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
    background: 'transparent',
    width: '56px',
    height: '56px'
  };

  return (
    <>
      {/* Phone Button - highest position */}
      <AnimatePresence>
        {showPhoneButton && (
          <motion.a
            href={phoneLink}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, type: 'spring', delay: 0.1 }}
            className={`${buttonBaseClass} ${showWhatsAppButton ? 'bottom-[200px] sm:bottom-[220px] md:bottom-[240px]' : 'bottom-[120px] sm:bottom-[140px] md:bottom-[160px]'}`}
            style={buttonStyle}
            title="Call us"
            aria-label="Call us"
          >
            <Phone className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#A88B32] group-hover:scale-110 transition-transform duration-300" />
            
            {/* Glowing Ring Effect */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#A88B32]/20 to-[#C09C3D]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></span>
          </motion.a>
        )}
      </AnimatePresence>

      {/* WhatsApp Button - middle position */}
      <AnimatePresence>
        {showWhatsAppButton && (
          <motion.a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, type: 'spring', delay: 0.2 }}
            className={`${buttonBaseClass} bottom-[120px] sm:bottom-[140px] md:bottom-[160px]`}
            style={buttonStyle}
            title="Chat on WhatsApp"
            aria-label="Chat on WhatsApp"
          >
            <WhatsAppIcon className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#A88B32] group-hover:scale-110 transition-transform duration-300" />
            
            {/* Glowing Ring Effect */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#A88B32]/20 to-[#C09C3D]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></span>
          </motion.a>
        )}
      </AnimatePresence>
    </>
  );
};

export default ContactButtons;


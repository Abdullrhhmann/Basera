import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiPhone, FiCheck, FiPlus, FiX, FiFacebook, FiInstagram, FiTwitter, FiLinkedin, FiLink, FiMail } from '../../icons/feather';
import { siteSettingsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { showSuccess, showError } from '../../utils/sonner';

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

const Settings = () => {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const [formData, setFormData] = useState({
    phoneNumbers: [''],
    whatsappNumbers: [''],
    whatsappMessage: '',
    showPhone: false,
    showWhatsApp: false,
    email: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
      tiktok: '',
      telegram: ''
    }
  });

  // Fetch current settings
  const { isLoading } = useQuery(
    'site-settings',
    async () => {
      const response = await siteSettingsAPI.getSettings();
      return response.data;
    },
    {
      onSuccess: (data) => {
        if (data?.settings) {
          setFormData({
            phoneNumbers: data.settings.phoneNumbers?.length > 0 ? data.settings.phoneNumbers : [''],
            whatsappNumbers: data.settings.whatsappNumbers?.length > 0 ? data.settings.whatsappNumbers : [''],
            whatsappMessage: data.settings.whatsappMessage || 'Hello! I\'m interested in your properties. Can you help me?',
            showPhone: data.settings.showPhone || false,
            showWhatsApp: data.settings.showWhatsApp || false,
            email: data.settings.email || '',
            socialMedia: data.settings.socialMedia || {
              facebook: '',
              instagram: '',
              twitter: '',
              linkedin: '',
              youtube: '',
              tiktok: '',
              telegram: ''
            }
          });
        }
      },
      onError: (error) => {
        console.error('Failed to load settings:', error);
        showError('Failed to load settings');
      }
    }
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    (data) => siteSettingsAPI.updateSettings(data),
    {
      onSuccess: () => {
        showSuccess('Settings updated successfully');
        queryClient.invalidateQueries('site-settings');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to update settings';
        showError(message);
      }
    }
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle phone number changes
  const handlePhoneChange = (index, value) => {
    const newPhoneNumbers = [...formData.phoneNumbers];
    newPhoneNumbers[index] = value;
    setFormData(prev => ({ ...prev, phoneNumbers: newPhoneNumbers }));
  };

  const addPhoneNumber = () => {
    if (formData.phoneNumbers.length < 10) {
      setFormData(prev => ({ ...prev, phoneNumbers: [...prev.phoneNumbers, ''] }));
    } else {
      showError('Maximum 10 phone numbers allowed');
    }
  };

  const removePhoneNumber = (index) => {
    if (formData.phoneNumbers.length > 1) {
      const newPhoneNumbers = formData.phoneNumbers.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, phoneNumbers: newPhoneNumbers }));
    }
  };

  // Handle WhatsApp number changes
  const handleWhatsAppChange = (index, value) => {
    const newWhatsAppNumbers = [...formData.whatsappNumbers];
    newWhatsAppNumbers[index] = value;
    setFormData(prev => ({ ...prev, whatsappNumbers: newWhatsAppNumbers }));
  };

  const addWhatsAppNumber = () => {
    if (formData.whatsappNumbers.length < 10) {
      setFormData(prev => ({ ...prev, whatsappNumbers: [...prev.whatsappNumbers, ''] }));
    } else {
      showError('Maximum 10 WhatsApp numbers allowed');
    }
  };

  const removeWhatsAppNumber = (index) => {
    if (formData.whatsappNumbers.length > 1) {
      const newWhatsAppNumbers = formData.whatsappNumbers.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, whatsappNumbers: newWhatsAppNumbers }));
    }
  };

  // Handle social media changes
  const handleSocialMediaChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  return (
    <>
      <Helmet>
        <title>Site Settings - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Site Settings" user={user} onLogout={logout}>
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white mb-2">Contact Settings</h2>
          <p className="text-slate-400">Configure phone and WhatsApp contact buttons for your website. Add multiple numbers for random distribution.</p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-slate-300">Loading settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Settings */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 sm:p-5 md:p-6 mx-1 sm:mx-0 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FiPhone className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Phone Contacts</h3>
                  <p className="text-xs text-slate-400">Add multiple phone numbers - a random one will be selected for each user</p>
                </div>
              </div>

              <div className="space-y-4">
                {formData.phoneNumbers.map((number, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="tel"
                      value={number}
                      onChange={(e) => handlePhoneChange(index, e.target.value)}
                      placeholder="+20 123 456 7890"
                      className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                    />
                    {formData.phoneNumbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhoneNumber(index)}
                        className="p-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                        title="Remove"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                
                {formData.phoneNumbers.length < 10 && (
                  <button
                    type="button"
                    onClick={addPhoneNumber}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Another Phone Number ({formData.phoneNumbers.length}/10)
                  </button>
                )}

                <p className="text-xs text-slate-400">
                  Include country code (e.g., +20 for Egypt). Each visitor will get a randomly selected number.
                </p>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="showPhone"
                    checked={formData.showPhone}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label className="ml-2 text-sm font-medium text-slate-300">
                    Show phone button on website
                  </label>
                </div>
              </div>
            </div>

            {/* Email Settings */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 sm:p-5 md:p-6 mx-1 sm:mx-0 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <FiMail className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Email Contact</h3>
                  <p className="text-xs text-slate-400">Primary email address for your business</p>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="info@basira.com"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                />
                <p className="mt-1 text-xs text-slate-400">
                  This email will be displayed throughout the website
                </p>
              </div>
            </div>

            {/* WhatsApp Settings */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 sm:p-5 md:p-6 mx-1 sm:mx-0 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <WhatsAppIcon className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white">WhatsApp Contacts</h3>
                  <p className="text-xs text-slate-400">Add multiple WhatsApp numbers - a random one will be selected for each user</p>
                </div>
              </div>

              <div className="space-y-4">
                {formData.whatsappNumbers.map((number, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="tel"
                      value={number}
                      onChange={(e) => handleWhatsAppChange(index, e.target.value)}
                      placeholder="+20 123 456 7890"
                      className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-400"
                    />
                    {formData.whatsappNumbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWhatsAppNumber(index)}
                        className="p-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                        title="Remove"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                
                {formData.whatsappNumbers.length < 10 && (
                  <button
                    type="button"
                    onClick={addWhatsAppNumber}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Another WhatsApp Number ({formData.whatsappNumbers.length}/10)
                  </button>
                )}

                <p className="text-xs text-slate-400">
                  Include country code (e.g., +20 for Egypt, no spaces or dashes). Each visitor will get a randomly selected number.
                </p>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                    Default Message Template
                  </label>
                  <textarea
                    name="whatsappMessage"
                    value={formData.whatsappMessage}
                    onChange={handleChange}
                    rows="3"
                    maxLength="500"
                    placeholder="Hello! I'm interested in your properties..."
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-400 resize-none"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {formData.whatsappMessage.length}/500 characters - This message will be pre-filled when users click WhatsApp
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="showWhatsApp"
                    checked={formData.showWhatsApp}
                    onChange={handleChange}
                    className="w-4 h-4 text-green-600 bg-slate-800 border-slate-600 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <label className="ml-2 text-sm font-medium text-slate-300">
                    Show WhatsApp button on website
                  </label>
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 sm:p-5 md:p-6 mx-1 sm:mx-0 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <FiLink className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Social Media Links</h3>
                  <p className="text-xs text-slate-400">Configure your social media profiles (leave empty to hide)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Facebook */}
                <div>
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-300 mb-2">
                    <FiFacebook className="w-4 h-4 text-blue-500" />
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={formData.socialMedia.facebook}
                    onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                  />
                </div>

                {/* Instagram */}
                <div>
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-300 mb-2">
                    <FiInstagram className="w-4 h-4 text-pink-500" />
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={formData.socialMedia.instagram}
                    onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-white placeholder-slate-400"
                  />
                </div>

                {/* Twitter */}
                <div>
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-300 mb-2">
                    <FiTwitter className="w-4 h-4 text-sky-500" />
                    Twitter / X
                  </label>
                  <input
                    type="url"
                    value={formData.socialMedia.twitter}
                    onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                    placeholder="https://twitter.com/yourhandle"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-white placeholder-slate-400"
                  />
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-300 mb-2">
                    <FiLinkedin className="w-4 h-4 text-blue-600" />
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={formData.socialMedia.linkedin}
                    onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/yourcompany"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-white placeholder-slate-400"
                  />
                </div>

                {/* YouTube */}
                <div>
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-300 mb-2">
                    <FiLink className="w-4 h-4 text-red-500" />
                    YouTube
                  </label>
                  <input
                    type="url"
                    value={formData.socialMedia.youtube}
                    onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-slate-400"
                  />
                </div>

                {/* TikTok */}
                <div>
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-300 mb-2">
                    <FiLink className="w-4 h-4 text-slate-400" />
                    TikTok
                  </label>
                  <input
                    type="url"
                    value={formData.socialMedia.tiktok}
                    onChange={(e) => handleSocialMediaChange('tiktok', e.target.value)}
                    placeholder="https://tiktok.com/@yourhandle"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-white placeholder-slate-400"
                  />
                </div>

                {/* Telegram */}
                <div>
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-300 mb-2">
                    <FiLink className="w-4 h-4 text-cyan-500" />
                    Telegram
                  </label>
                  <input
                    type="url"
                    value={formData.socialMedia.telegram}
                    onChange={(e) => handleSocialMediaChange('telegram', e.target.value)}
                    placeholder="https://t.me/yourchannel"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 sm:p-5 md:p-6 mx-1 sm:mx-0 shadow-xl">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Preview</h3>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-3">Buttons will appear on the website like this:</p>
                <div className="flex flex-col gap-3 items-end">
                  {formData.showPhone && formData.phoneNumbers.some(n => n.trim()) && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <span>Phone Button ({formData.phoneNumbers.filter(n => n.trim()).length} numbers)</span>
                      <div className="w-12 h-12 bg-[#A88B32]/20 border-2 border-[#A88B32]/50 rounded-full flex items-center justify-center">
                        <FiPhone className="w-5 h-5 text-[#A88B32]" />
                      </div>
                    </div>
                  )}
                  {formData.showWhatsApp && formData.whatsappNumbers.some(n => n.trim()) && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <span>WhatsApp Button ({formData.whatsappNumbers.filter(n => n.trim()).length} numbers)</span>
                      <div className="w-12 h-12 bg-[#A88B32]/20 border-2 border-[#A88B32]/50 rounded-full flex items-center justify-center">
                        <WhatsAppIcon className="w-5 h-5 text-[#A88B32]" />
                      </div>
                    </div>
                  )}
                  {(!formData.showPhone || !formData.phoneNumbers.some(n => n.trim())) && 
                   (!formData.showWhatsApp || !formData.whatsappNumbers.some(n => n.trim())) && (
                    <p className="text-sm text-slate-500 italic">No buttons will be shown (enable toggles and add numbers)</p>
                  )}
                </div>
                {(formData.phoneNumbers.filter(n => n.trim()).length > 1 || formData.whatsappNumbers.filter(n => n.trim()).length > 1) && (
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300">
                      💡 <strong>Random Distribution:</strong> Each visitor will see buttons that connect to a randomly selected number from your list. This helps distribute contacts across your team!
                    </p>
                  </div>
                )}

                {/* Social Media Preview */}
                {Object.entries(formData.socialMedia).some(([_, url]) => url.trim()) && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400 mb-3">Configured Social Media:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.socialMedia.facebook && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                          <FiFacebook className="w-3 h-3" /> Facebook
                        </div>
                      )}
                      {formData.socialMedia.instagram && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-pink-500/10 border border-pink-500/30 rounded text-xs text-pink-300">
                          <FiInstagram className="w-3 h-3" /> Instagram
                        </div>
                      )}
                      {formData.socialMedia.twitter && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-sky-500/10 border border-sky-500/30 rounded text-xs text-sky-300">
                          <FiTwitter className="w-3 h-3" /> Twitter
                        </div>
                      )}
                      {formData.socialMedia.linkedin && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-600/10 border border-blue-600/30 rounded text-xs text-blue-300">
                          <FiLinkedin className="w-3 h-3" /> LinkedIn
                        </div>
                      )}
                      {formData.socialMedia.youtube && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
                          <FiLink className="w-3 h-3" /> YouTube
                        </div>
                      )}
                      {formData.socialMedia.tiktok && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-slate-500/10 border border-slate-500/30 rounded text-xs text-slate-300">
                          <FiLink className="w-3 h-3" /> TikTok
                        </div>
                      )}
                      {formData.socialMedia.telegram && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs text-cyan-300">
                          <FiLink className="w-3 h-3" /> Telegram
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateSettingsMutation.isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiCheck className="w-5 h-5" />
                {updateSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </AdminLayout>
    </>
  );
};

export default Settings;

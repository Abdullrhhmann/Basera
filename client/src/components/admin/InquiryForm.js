import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiPlus, FiTrash2, FiCalendar } from '../../icons/feather';
import { inquiriesAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/shadcn';

const InquiryForm = ({ inquiry, onSave, onCancel, isEditing = false }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      status: 'new',
      priority: 'low',
      assignedTo: '',
      contactInfo: {
        name: '',
        email: '',
        phone: ''
      },
      message: ''
    }
  });

  // Initialize form with inquiry data if editing
  useEffect(() => {
    if (inquiry && isEditing) {
      setValue('status', inquiry.status || 'new');
      setValue('priority', inquiry.priority || 'low');
      setValue('assignedTo', inquiry.assignedTo || '');
      setValue('contactInfo.name', inquiry.contactInfo?.name || '');
      setValue('contactInfo.email', inquiry.contactInfo?.email || '');
      setValue('contactInfo.phone', inquiry.contactInfo?.phone || '');
      setValue('message', inquiry.message || '');
      
      if (inquiry.notes) setNotes(inquiry.notes);
    }
  }, [inquiry, isEditing, setValue]);

  const addNote = () => {
    if (newNote.trim()) {
      const note = {
        content: newNote.trim(),
        createdAt: new Date().toISOString(),
        createdBy: 'admin' // In a real app, this would be the current user ID
      };
      setNotes(prev => [...prev, note]);
      setNewNote('');
    }
  };

  const removeNote = (index) => {
    setNotes(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    try {
      const inquiryData = {
        ...data,
        notes,
        isRead: true
      };

      if (isEditing) {
        await inquiriesAPI.updateInquiry(inquiry._id, inquiryData);
        showSuccess('Inquiry updated successfully');
      } else {
        // This would be for creating new inquiries, but typically inquiries are created by users
        showError('Cannot create inquiries from admin panel');
        return;
      }

      onSave();
    } catch (error) {
      showError(`Failed to ${isEditing ? 'update' : 'create'} inquiry`);
      console.error('Save error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Inquiry Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inquiry Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
            <Select onValueChange={(value) => setValue('status', value)} defaultValue={inquiry?.status || 'new'}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="viewing-scheduled">Viewing Scheduled</SelectItem>
                <SelectItem value="follow-up">Follow Up</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
            <Select onValueChange={(value) => setValue('priority', value)} defaultValue={inquiry?.priority || 'low'}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            {errors.priority && <p className="text-red-500 text-sm mt-1">{errors.priority.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
            <input
              {...register('assignedTo')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter assigned user email or ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name *</label>
            <input
              {...register('contactInfo.name', { required: 'Contact name is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter contact name"
            />
            {errors.contactInfo?.name && <p className="text-red-500 text-sm mt-1">{errors.contactInfo.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email *</label>
            <input
              {...register('contactInfo.email', { 
                required: 'Contact email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter contact email"
            />
            {errors.contactInfo?.email && <p className="text-red-500 text-sm mt-1">{errors.contactInfo.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
            <input
              {...register('contactInfo.phone', {
                pattern: {
                  value: /^[+]?[1-9][\d]{0,15}$/,
                  message: 'Invalid phone number'
                }
              })}
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter contact phone"
            />
            {errors.contactInfo?.phone && <p className="text-red-500 text-sm mt-1">{errors.contactInfo.phone.message}</p>}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
          <textarea
            {...register('message', { required: 'Message is required' })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter inquiry message"
          />
          {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>}
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Add a note about this inquiry"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNote())}
          />
          <button
            type="button"
            onClick={addNote}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {notes.map((note, index) => (
            <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-gray-900">{note.content}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <FiCalendar className="w-3 h-3" />
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                  <span>•</span>
                  <span>{note.createdBy}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeNote(index)}
                className="text-red-600 hover:text-red-800 ml-2"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {notes.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No notes added yet</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {isEditing ? 'Update Inquiry' : 'Create Inquiry'}
        </button>
      </div>
    </form>
  );
};

export default InquiryForm;



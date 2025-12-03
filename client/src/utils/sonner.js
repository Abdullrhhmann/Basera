import { toast } from 'sonner';

// Success notifications
export const showSuccess = (message, description = null) => {
  return toast.success(message, {
    description,
    duration: 3000,
  });
};

// Error notifications
export const showError = (message, description = null) => {
  return toast.error(message, {
    description,
    duration: 5001,
  });
};

// Info notifications
export const showInfo = (message, description = null) => {
  return toast.info(message, {
    description,
    duration: 4000,
  });
};

// Warning notifications
export const showWarning = (message, description = null) => {
  return toast.warning(message, {
    description,
    duration: 4000,
  });
};

// Loading notifications with promise
export const showPromise = (promise, messages) => {
  return toast.promise(promise, messages);
};

// Default toast
export const showToast = (message, options = {}) => {
  return toast(message, {
    duration: 4000,
    ...options,
  });
};

// Dismiss all toasts
export const dismissAll = () => {
  toast.dismiss();
};

// Dismiss specific toast
export const dismiss = (toastId) => {
  toast.dismiss(toastId);
};

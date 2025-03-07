import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
  isVisible: boolean;
}

export default function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  isVisible
}: ToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => onClose(), 300); // Wait for exit animation
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !isAnimating) return null;

  const typeConfig = {
    success: {
      icon: <FiCheckCircle className="text-lg" />,
      classes: 'bg-green-50 border-green-500 text-green-800'
    },
    error: {
      icon: <FiAlertCircle className="text-lg" />,
      classes: 'bg-red-50 border-red-500 text-red-800'
    },
    info: {
      icon: <FiInfo className="text-lg" />,
      classes: 'bg-blue-50 border-blue-500 text-blue-800'
    },
    warning: {
      icon: <FiAlertCircle className="text-lg" />,
      classes: 'bg-yellow-50 border-yellow-500 text-yellow-800'
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${isAnimating ? 'animate-fade-in' : 'animate-fade-out'}`}>
      <div className={`flex items-center p-4 border-l-4 rounded shadow-md transition-all ${typeConfig[type].classes}`}>
        <div className="mr-3">
          {typeConfig[type].icon}
        </div>
        <div className="mr-8 text-sm font-medium">
          {message}
        </div>
        <button
          className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
          onClick={() => {
            setIsAnimating(false);
            setTimeout(() => onClose(), 300);
          }}
          aria-label="Close"
        >
          <FiX className="text-lg" />
        </button>
      </div>
    </div>
  );
} 
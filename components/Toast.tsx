
import React from 'react';
import { useToast } from '../hooks/useToast';
import { CheckCircleIcon, XCircleIcon } from './Icons';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {toasts.map((toast) => {
        const Icon = toast.type === 'success' ? CheckCircleIcon : XCircleIcon;
        const colors = {
          success: 'bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-600 dark:text-green-200',
          error: 'bg-red-100 border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-200',
          info: 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200',
        };
        
        return (
          <div
            key={toast.id}
            className={`flex items-center w-full max-w-xs p-4 rounded-lg shadow-lg border ${colors[toast.type]} animate-fade-in-up`}
            role="alert"
          >
            <Icon className={`w-6 h-6 mr-3`} />
            <div className="flex-1 text-sm font-normal">{toast.message}</div>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.onClick();
                  removeToast(toast.id);
                }}
                className="ml-4 -my-1.5 bg-transparent text-sm font-semibold rounded-lg p-1.5 hover:bg-white/20 focus:ring-2 focus:ring-white/50"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              className="ml-auto -mx-1.5 -my-1.5 bg-transparent rounded-lg focus:ring-2 focus:ring-white/50 p-1.5 hover:bg-white/20 inline-flex items-center justify-center h-8 w-8"
              onClick={() => removeToast(toast.id)}
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};

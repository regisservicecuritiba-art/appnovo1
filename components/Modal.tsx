import React from 'react';
import { X, AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-green-500" size={48} />;
      case 'warning':
        return <AlertCircle className="text-amber-500" size={48} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={48} />;
      case 'confirm':
        return <HelpCircle className="text-brand-blue" size={48} />;
      default:
        return <Info className="text-brand-blue" size={48} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">
            {title}
          </h2>
          <p className="text-gray-500 font-medium text-sm leading-relaxed">
            {message}
          </p>
        </div>
        <div className="p-4 bg-gray-50 flex gap-3">
          {type === 'confirm' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm?.();
                  onClose();
                }}
                className="flex-1 py-3 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all"
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

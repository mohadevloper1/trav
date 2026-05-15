import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export type DialogType = 'success' | 'error' | 'warning' | 'confirm' | 'info';

interface CustomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
}

const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="text-emerald-500" size={32} />;
      case 'error': return <X className="text-red-500" size={32} />;
      case 'warning': 
      case 'confirm': return <AlertTriangle className="text-yellow-500" size={32} />;
      default: return <Info className="text-cyan-500" size={32} />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'success': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'error': return 'bg-red-500 hover:bg-red-600';
      case 'confirm': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-cyan-500 hover:bg-cyan-600';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 p-8 rounded-3xl shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 p-3 bg-slate-800 dark:bg-slate-800 light:bg-slate-100 rounded-2xl">
                {getIcon()}
              </div>
              <h3 className="text-xl font-black text-slate-100 dark:text-slate-100 light:text-slate-900 italic tracking-tight mb-2">
                {title}
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-500 font-medium mb-8 leading-relaxed">
                {message}
              </p>

              <div className="flex gap-3 w-full">
                {type === 'confirm' && (
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-800 dark:bg-slate-800 light:bg-slate-100 rounded-xl text-xs font-black text-slate-400 dark:text-slate-400 light:text-slate-600 uppercase tracking-widest transition-all"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (onConfirm) onConfirm();
                    else onClose();
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-all shadow-lg active:scale-95",
                    getButtonClass()
                  )}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CustomDialog;

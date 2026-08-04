import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FormField } from './FormField';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithPassword } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const success = await loginWithPassword(username, password);
    setIsSubmitting(false);

    if (success) {
      onClose();
    } else {
      setError("Login yoki parol noto'g'ri. Qayta urinib ko'ring.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-outline dark:text-slate-400 hover:text-on-surface dark:hover:text-white p-1 rounded-full hover:bg-surface-container-high dark:hover:bg-slate-700 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary-container/15 dark:bg-sky-500/20 text-primary dark:text-sky-400 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[28px]">admin_panel_settings</span>
          </div>
          <h3 className="font-bold text-lg text-on-surface dark:text-slate-100">Admin Panelga Kirish</h3>
          <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1">
            Login va parolingizni kiriting
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <FormField
            label="Login"
            iconName="person"
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <FormField
            label="Parol"
            type="password"
            iconName="lock"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-xs text-error dark:text-red-400 mb-4 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary dark:bg-sky-500 text-on-primary font-semibold text-xs py-3 rounded-full hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50"
          >
            {isSubmitting ? 'Kirilmoqda...' : 'Tizimga kirish'}
          </button>
        </form>
      </div>
    </div>
  );
};

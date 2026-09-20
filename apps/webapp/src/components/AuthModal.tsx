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

    const success = await loginWithPassword(password);
    setIsSubmitting(false);

    if (success) {
      onClose();
    } else {
      setError("Login yoki parol noto'g'ri. Qayta urinib ko'ring.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-ios-card rounded-ios-lg p-6 w-full max-w-sm shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ios-label-secondary/70 active:opacity-50 p-1 rounded-full transition-opacity"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-ios-blue/10 text-ios-blue flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[28px]">admin_panel_settings</span>
          </div>
          <h3 className="font-semibold text-[17px] text-ios-label">Admin Panelga Kirish</h3>
          <p className="text-[13px] text-ios-label-secondary/70 mt-1">
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

          {error && <p className="text-[13px] text-ios-red mb-4 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-ios-blue active:opacity-70 text-white font-medium text-[15px] py-3.5 rounded-ios transition-opacity disabled:opacity-40"
          >
            {isSubmitting ? 'Kirilmoqda...' : 'Tizimga kirish'}
          </button>
        </form>
      </div>
    </div>
  );
};

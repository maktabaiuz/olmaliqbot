import React from 'react';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  iconName?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  iconName,
  className = '',
  ...props
}) => {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold uppercase tracking-wider text-outline dark:text-slate-400 mb-1.5">
        {label}
      </label>
      <div className="relative flex items-center">
        {iconName && (
          <span className="material-symbols-outlined absolute left-3 text-outline dark:text-slate-400 text-[20px] pointer-events-none">
            {iconName}
          </span>
        )}
        <input
          className={`w-full bg-surface-container-low dark:bg-slate-800/80 border border-outline-variant/60 dark:border-slate-700 rounded-lg py-2.5 ${
            iconName ? 'pl-10' : 'pl-3.5'
          } pr-3.5 text-sm text-on-surface dark:text-slate-100 placeholder:text-outline-variant focus:outline-none focus:border-primary dark:focus:border-sky-500 focus:ring-1 focus:ring-primary dark:focus:ring-sky-500 transition-all ${
            error ? 'border-error dark:border-red-500' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-error dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
};

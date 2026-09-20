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
      <label className="block text-[13px] font-medium text-ios-label-secondary/70 mb-1.5">
        {label}
      </label>
      <div className="relative flex items-center bg-ios-fill/[0.12] rounded-ios">
        {iconName && (
          <span className="material-symbols-outlined absolute left-3 text-ios-label-secondary/70 text-[18px] pointer-events-none">
            {iconName}
          </span>
        )}
        <input
          className={`w-full bg-transparent py-2.5 ${
            iconName ? 'pl-10' : 'pl-3.5'
          } pr-3.5 text-[15px] text-ios-label placeholder:text-ios-label-secondary/50 focus:outline-none ${
            error ? 'ring-1 ring-ios-red rounded-ios' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[12px] text-ios-red mt-1">{error}</p>}
    </div>
  );
};

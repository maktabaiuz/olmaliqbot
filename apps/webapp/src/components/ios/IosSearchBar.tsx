import React, { useState } from 'react';

interface IosSearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/** iOS UISearchBar — centered placeholder+icon when empty/unfocused, left-aligned when typing. */
export const IosSearchBar: React.FC<IosSearchBarProps> = ({ value, onChange, placeholder = 'Qidirish' }) => {
  const [focused, setFocused] = useState(false);
  const centered = !focused && !value;

  return (
    <div className="relative bg-ios-fill/[0.12] rounded-ios h-9 flex items-center px-2.5">
      <span
        className={`material-symbols-outlined text-[18px] text-ios-label-secondary/70 transition-all ${centered ? '' : 'mr-1.5'}`}
      >
        search
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={`bg-transparent outline-none text-[15px] text-ios-label placeholder:text-ios-label-secondary/70 flex-1 ${centered ? 'text-center' : 'text-left'}`}
      />
      {value && (
        <button onClick={() => onChange('')} className="text-ios-label-secondary/70 active:opacity-50">
          <span className="material-symbols-outlined text-[16px]">cancel</span>
        </button>
      )}
    </div>
  );
};

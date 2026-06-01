'use client';

import { useMemo } from 'react';

export type PhoneCountry = { name: string; iso: string; dialCode: string };

const priorityCountries: PhoneCountry[] = [
  { name: 'Singapore', iso: 'SG', dialCode: '+65' },
  { name: 'Malaysia', iso: 'MY', dialCode: '+60' },
  { name: 'China', iso: 'CN', dialCode: '+86' },
  { name: 'India', iso: 'IN', dialCode: '+91' }
];

const otherCountries: PhoneCountry[] = [
  { name: 'Australia', iso: 'AU', dialCode: '+61' },
  { name: 'Bangladesh', iso: 'BD', dialCode: '+880' },
  { name: 'Brunei', iso: 'BN', dialCode: '+673' },
  { name: 'Canada', iso: 'CA', dialCode: '+1' },
  { name: 'Germany', iso: 'DE', dialCode: '+49' },
  { name: 'Hong Kong', iso: 'HK', dialCode: '+852' },
  { name: 'Indonesia', iso: 'ID', dialCode: '+62' },
  { name: 'Japan', iso: 'JP', dialCode: '+81' },
  { name: 'Macau', iso: 'MO', dialCode: '+853' },
  { name: 'Philippines', iso: 'PH', dialCode: '+63' },
  { name: 'South Korea', iso: 'KR', dialCode: '+82' },
  { name: 'Taiwan', iso: 'TW', dialCode: '+886' },
  { name: 'Thailand', iso: 'TH', dialCode: '+66' },
  { name: 'United Kingdom', iso: 'GB', dialCode: '+44' },
  { name: 'United States', iso: 'US', dialCode: '+1' },
  { name: 'Vietnam', iso: 'VN', dialCode: '+84' }
].sort((a, b) => a.name.localeCompare(b.name));

export const phoneCountries = [...priorityCountries, ...otherCountries];

export function composePhoneNumber(countryCode: string, localNumber: string) {
  const number = localNumber.trim();
  if (!number) return '';
  return `${countryCode} ${number}`.trim();
}

type PhoneCountryCodeInputProps = {
  countryCode: string;
  onCountryCodeChange: (value: string) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  selectClassName?: string;
  autoComplete?: string;
  name?: string;
};

export function PhoneCountryCodeInput({
  countryCode,
  onCountryCodeChange,
  value,
  onChange,
  placeholder = 'Phone / WhatsApp / 手机或 WhatsApp',
  required = false,
  className = '',
  inputClassName = '',
  selectClassName = '',
  autoComplete = 'tel-national',
  name = 'phone_local'
}: PhoneCountryCodeInputProps) {
  const options = useMemo(() => phoneCountries, []);
  const baseControlClass = 'h-[48px] border border-slate-200 bg-adminBg text-sm font-semibold outline-none focus:border-activeBlue focus:ring-1 focus:ring-activeBlue/20';
  return (
    <div className={`grid w-full grid-cols-[40%_60%] gap-2 ${className}`}>
      <select
        aria-label="Country calling code / 国家区号"
        className={`${baseControlClass} min-w-0 rounded-2xl px-2 text-xs font-extrabold ${selectClassName}`}
        value={countryCode}
        onChange={(event) => onCountryCodeChange(event.target.value)}
      >
        {options.map((country) => (
          <option key={`${country.iso}-${country.dialCode}`} value={country.dialCode}>
            {country.name} {country.dialCode}
          </option>
        ))}
      </select>
      <input
        name={name}
        className={`${baseControlClass} min-w-0 rounded-2xl px-4 ${inputClassName}`}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        inputMode="tel"
        required={required}
      />
    </div>
  );
}

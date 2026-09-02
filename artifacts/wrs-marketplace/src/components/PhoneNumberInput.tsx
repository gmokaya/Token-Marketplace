import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

type PhoneCountry = {
  iso: string;
  name: string;
  dialCode: string;
};

const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "KE", name: "Kenya", dialCode: "+254" },
  { iso: "UG", name: "Uganda", dialCode: "+256" },
  { iso: "TZ", name: "Tanzania", dialCode: "+255" },
  { iso: "RW", name: "Rwanda", dialCode: "+250" },
  { iso: "BI", name: "Burundi", dialCode: "+257" },
  { iso: "ET", name: "Ethiopia", dialCode: "+251" },
  { iso: "SS", name: "South Sudan", dialCode: "+211" },
  { iso: "SO", name: "Somalia", dialCode: "+252" },
  { iso: "ZA", name: "South Africa", dialCode: "+27" },
  { iso: "NG", name: "Nigeria", dialCode: "+234" },
  { iso: "GH", name: "Ghana", dialCode: "+233" },
  { iso: "EG", name: "Egypt", dialCode: "+20" },
  { iso: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { iso: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { iso: "IN", name: "India", dialCode: "+91" },
  { iso: "CN", name: "China", dialCode: "+86" },
  { iso: "JP", name: "Japan", dialCode: "+81" },
  { iso: "GB", name: "United Kingdom", dialCode: "+44" },
  { iso: "DE", name: "Germany", dialCode: "+49" },
  { iso: "FR", name: "France", dialCode: "+33" },
  { iso: "NL", name: "Netherlands", dialCode: "+31" },
  { iso: "US", name: "United States", dialCode: "+1" },
  { iso: "CA", name: "Canada", dialCode: "+1" },
  { iso: "AU", name: "Australia", dialCode: "+61" },
  { iso: "NZ", name: "New Zealand", dialCode: "+64" },
  { iso: "BR", name: "Brazil", dialCode: "+55" },
  { iso: "MX", name: "Mexico", dialCode: "+52" },
  { iso: "SG", name: "Singapore", dialCode: "+65" },
  { iso: "MY", name: "Malaysia", dialCode: "+60" },
  { iso: "TR", name: "Türkiye", dialCode: "+90" },
  { iso: "CH", name: "Switzerland", dialCode: "+41" },
  { iso: "SE", name: "Sweden", dialCode: "+46" },
  { iso: "NO", name: "Norway", dialCode: "+47" },
  { iso: "DK", name: "Denmark", dialCode: "+45" },
  { iso: "ES", name: "Spain", dialCode: "+34" },
  { iso: "IT", name: "Italy", dialCode: "+39" },
  { iso: "BE", name: "Belgium", dialCode: "+32" },
  { iso: "PT", name: "Portugal", dialCode: "+351" },
  { iso: "RU", name: "Russia", dialCode: "+7" },
  { iso: "UA", name: "Ukraine", dialCode: "+380" },
  { iso: "PK", name: "Pakistan", dialCode: "+92" },
  { iso: "BD", name: "Bangladesh", dialCode: "+880" },
  { iso: "LK", name: "Sri Lanka", dialCode: "+94" },
  { iso: "NP", name: "Nepal", dialCode: "+977" },
  { iso: "PH", name: "Philippines", dialCode: "+63" },
  { iso: "ID", name: "Indonesia", dialCode: "+62" },
  { iso: "TH", name: "Thailand", dialCode: "+66" },
  { iso: "KR", name: "South Korea", dialCode: "+82" },
  { iso: "IL", name: "Israel", dialCode: "+972" },
  { iso: "QA", name: "Qatar", dialCode: "+974" },
  { iso: "KW", name: "Kuwait", dialCode: "+965" },
  { iso: "BH", name: "Bahrain", dialCode: "+973" },
  { iso: "OM", name: "Oman", dialCode: "+968" },
];

const DEFAULT_COUNTRY = PHONE_COUNTRIES[0];

function flagFor(iso: string) {
  return iso
    .toUpperCase()
    .replace(/./g, (character) =>
      String.fromCodePoint(127397 + character.charCodeAt(0)),
    );
}

function parsePhone(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return { iso: DEFAULT_COUNTRY.iso, localNumber: "" };
  }

  const country = [...PHONE_COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((item) => normalized.startsWith(item.dialCode));

  if (!country) {
    return { iso: DEFAULT_COUNTRY.iso, localNumber: normalized };
  }

  return {
    iso: country.iso,
    localNumber: normalized.slice(country.dialCode.length).trim(),
  };
}

function composePhone(dialCode: string, localNumber: string) {
  const digits = localNumber.replace(/\D/g, "").replace(/^0/, "");
  return digits ? `${dialCode}${digits}` : "";
}

type PhoneNumberInputProps = {
  value?: string;
  onChange: (value: string) => void;
};

export function PhoneNumberInput({
  value = "",
  onChange,
}: PhoneNumberInputProps) {
  const parsed = parsePhone(value);
  const [countryIso, setCountryIso] = useState(parsed.iso);
  const [localNumber, setLocalNumber] = useState(parsed.localNumber);
  const lastEmittedValue = useRef<string | null>(null);
  const selectedCountry =
    PHONE_COUNTRIES.find((country) => country.iso === countryIso) ??
    DEFAULT_COUNTRY;

  useEffect(() => {
    if (lastEmittedValue.current === value) {
      lastEmittedValue.current = null;
      return;
    }
    const next = parsePhone(value);
    setCountryIso(next.iso);
    setLocalNumber(next.localNumber);
  }, [value]);

  const handleCountryChange = (iso: string) => {
    const country = PHONE_COUNTRIES.find((item) => item.iso === iso) ?? DEFAULT_COUNTRY;
    const nextValue = composePhone(country.dialCode, localNumber);
    setCountryIso(country.iso);
    lastEmittedValue.current = nextValue;
    onChange(nextValue);
  };

  const handleNumberChange = (nextValue: string) => {
    const nextLocalNumber = nextValue.replace(/[^\d\s().-]/g, "");
    const composedValue = composePhone(selectedCountry.dialCode, nextLocalNumber);
    setLocalNumber(nextLocalNumber);
    lastEmittedValue.current = composedValue;
    onChange(composedValue);
  };

  return (
    <div className="phone-number-control">
      <Select value={countryIso} onValueChange={handleCountryChange}>
        <SelectTrigger
          aria-label="Phone country code"
          data-testid="phone-country-code"
          className="phone-number-country-trigger"
        >
          <span className="phone-number-country-value">
            <span aria-hidden="true">{flagFor(selectedCountry.iso)}</span>
            <span>{selectedCountry.dialCode}</span>
          </span>
        </SelectTrigger>
        <SelectContent className="phone-number-country-content">
          {PHONE_COUNTRIES.map((country) => (
            <SelectItem key={country.iso} value={country.iso}>
              <span className="phone-number-country-option">
                <span aria-hidden="true">{flagFor(country.iso)}</span>
                <span>{country.name}</span>
                <span className="phone-number-country-dial">
                  {country.dialCode}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={localNumber}
        onChange={(event) => handleNumberChange(event.target.value)}
        inputMode="tel"
        autoComplete="tel-national"
        className="phone-number-local-input"
        placeholder="712 345 678"
        data-testid="input-mobile-number"
      />
    </div>
  );
}
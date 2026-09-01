import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ISO_COUNTRY_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(" ");
const PINNED_CODES = ["KE", "UG", "TZ", "RW", "BI", "ET", "SS", "SO", "AE", "SA", "US", "GB", "DE", "NL", "CN", "IN", "JP"];
const regionNames = new (Intl as typeof Intl & { DisplayNames: typeof Intl.DisplayNames }).DisplayNames(["en"], { type: "region" });
const COUNTRIES = ISO_COUNTRY_CODES
  .map((code) => ({ code, name: regionNames.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));
const PINNED_COUNTRIES = PINNED_CODES.map((code) => COUNTRIES.find((country) => country.code === code)).filter(Boolean) as typeof COUNTRIES;
const OTHER_COUNTRIES = COUNTRIES.filter((country) => !PINNED_CODES.includes(country.code));

export function CountrySelect({ value, onChange }: { value?: string; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Destination country"
          data-testid="country-combobox"
          className="flex w-full items-center justify-between h-12 rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] px-4 font-normal text-[15px] transition-all hover:bg-white hover:border-[#606A5C] focus:bg-white focus:border-[#606A5C] focus:outline-none focus:ring-1 focus:ring-[#606A5C]/20 text-[#1d1d1f]"
        >
          {value ? value : <span className="text-[#86868b]">Select destination country</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#86868b]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl border-[#e5e5ea] shadow-sm bg-white" align="start">
        <Command className="bg-white rounded-xl">
          <CommandInput placeholder="Search country..." className="h-11 border-none focus:ring-0 text-[15px]" />
          <CommandList className="max-h-[280px]">
            <CommandEmpty className="py-4 text-center text-[14px] text-[#86868b]">No country found.</CommandEmpty>
            <CommandGroup heading="Major Markets & East Africa" className="text-[#86868b] [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium">
              {PINNED_COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.name);
                    setOpen(false);
                  }}
                  className="rounded-lg aria-selected:bg-[#f5f5f7] aria-selected:text-[#1d1d1f] cursor-pointer mx-1 my-0.5 px-3 py-2.5 text-[14px]"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-[#606A5C]",
                      value === country.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {country.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="All Countries" className="text-[#86868b] [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium">
              {OTHER_COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.name);
                    setOpen(false);
                  }}
                  className="rounded-lg aria-selected:bg-[#f5f5f7] aria-selected:text-[#1d1d1f] cursor-pointer mx-1 my-0.5 px-3 py-2.5 text-[14px]"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-[#606A5C]",
                      value === country.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {country.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

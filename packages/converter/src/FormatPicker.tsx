import { useState, type ReactElement } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Capability } from '@honeymelon/contracts';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@honeymelon/ui/components/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@honeymelon/ui/components/command';
import { Button } from './Button';

/**
 * Search available and unavailable formats through one keyboard-first picker.
 */
export function FormatPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Capability[];
  onChange: (value: string) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          role="combobox"
          aria-expanded={open}
          aria-label={t('ui.format')}
          className="w-full justify-between"
        >
          <span>{value.toUpperCase()}</span>
          <ChevronsUpDown size={15} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput
            placeholder={t('ui.search')}
            aria-label={t('ui.search')}
          />
          <CommandList>
            <CommandEmpty>{t('formats.empty')}</CommandEmpty>
            <CommandGroup heading={t('design.output')}>
              {options.map((option) => (
                <CommandItem
                  key={option.format}
                  value={option.format}
                  onSelect={() => {
                    if (!option.available) {
                      return;
                    }

                    onChange(option.format);
                    setOpen(false);
                  }}
                  disabled={!option.available}
                  {...(option.reason ? { title: option.reason } : {})}
                >
                  <Check
                    size={14}
                    className={value === option.format ? '' : 'opacity-0'}
                  />
                  {option.format.toUpperCase()}
                  {!option.available && (
                    <span className="ml-auto text-xs">
                      {t('ui.unavailable')}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

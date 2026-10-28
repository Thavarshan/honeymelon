import { useState, type ReactElement } from 'react';
import { Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@honeymelon/ui/components/dialog';
import {
  SelectControl,
  SelectOption,
} from '@honeymelon/ui/components/select-control';
import { locales, type Locale, type Theme } from '@honeymelon/contracts';
import { Button } from '@honeymelon/converter';

const names: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Русский',
};

/** Language and appearance; persisted by the host, never with media. */
export function Settings({
  locale,
  theme,
  onChange,
}: {
  locale: Locale;
  theme: Theme;
  onChange(change: { locale?: Locale; theme?: Theme }): void;
}): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon variant="ghost" aria-label={t('ui.settings')}>
          <Settings2 size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent
        closeLabel={t('ui.dismiss')}
        className="preferences-dialog"
      >
        <DialogTitle>{t('ui.settings')}</DialogTitle>
        <DialogDescription>{t('web.settingsHint')}</DialogDescription>
        <label className="inspector-field">
          {t('ui.language')}
          <SelectControl
            label={t('ui.language')}
            value={locale}
            onValueChange={(value) => onChange({ locale: value as Locale })}
          >
            {locales.map((value) => (
              <SelectOption key={value} value={value}>
                {names[value]}
              </SelectOption>
            ))}
          </SelectControl>
        </label>
        <label className="inspector-field">
          {t('ui.theme')}
          <SelectControl
            label={t('ui.theme')}
            value={theme}
            onValueChange={(value) => onChange({ theme: value as Theme })}
          >
            {(['light', 'dark', 'system'] as const).map((value) => (
              <SelectOption key={value} value={value}>
                {t(`ui.${value}`)}
              </SelectOption>
            ))}
          </SelectControl>
        </label>
        <div className="preferences-footer">
          <span>{t('ui.version', { version: __APP_VERSION__ })}</span>
          <Button onClick={() => setOpen(false)}>{t('ui.dismiss')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

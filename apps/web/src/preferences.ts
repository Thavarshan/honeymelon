import {
  conversionSchema,
  defaultConversion,
  formats,
  locales,
  mediaTypes,
  type ConversionSpec,
  type Locale,
  type MediaType,
  type Theme,
} from '@honeymelon/contracts';

/** Per-media output choice; the destination is always the browser download. */
export interface WebMediaPreference {
  format: string;
  spec?: ConversionSpec | undefined;
}

/** Settings persisted in this browser. Never contains file names or bytes. */
export interface WebPreferences {
  locale: Locale;
  theme: Theme;
  media: Record<MediaType, WebMediaPreference>;
}

export const preferencesKey = 'honeymelon-web:preferences:v1';

/** First-run defaults use outputs every supported browser can produce. */
export function defaultPreferences(language = 'en'): WebPreferences {
  const locale =
    locales.find((value) => language.toLowerCase().startsWith(value)) ?? 'en';

  return {
    locale,
    theme: 'system',
    media: {
      image: { format: 'jpg', spec: defaultConversion('image') },
      audio: { format: 'wav', spec: defaultConversion('audio') },
      video: { format: 'mp4', spec: defaultConversion('video') },
    },
  };
}

function mediaPreference(
  media: MediaType,
  value: unknown,
): WebMediaPreference | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const { format, spec } = value as { format?: unknown; spec?: unknown };
  const parsed =
    spec === undefined ? undefined : conversionSchema.safeParse(spec);
  if (parsed && !parsed.success) {
    return undefined;
  }

  const kind = parsed?.data.kind ?? media;
  if (
    typeof format !== 'string' ||
    (media !== 'video' && kind !== media) ||
    !formats[kind].includes(format)
  ) {
    return undefined;
  }

  return { format, spec: parsed?.data };
}

/**
 * Read stored settings, falling back field by field. Storage may be missing,
 * blocked or corrupt; none of those prevent the converter from loading.
 */
export function loadPreferences(
  storage: Pick<Storage, 'getItem'> | undefined,
  language?: string,
): WebPreferences {
  const defaults = defaultPreferences(language);
  let stored: Partial<WebPreferences> = {};
  try {
    stored =
      (JSON.parse(
        storage?.getItem(preferencesKey) ?? '{}',
      ) as Partial<WebPreferences> | null) ?? {};
  } catch {
    return defaults;
  }

  return {
    locale: locales.includes(stored.locale as Locale)
      ? (stored.locale as Locale)
      : defaults.locale,
    theme: ['light', 'dark', 'system'].includes(stored.theme as Theme)
      ? (stored.theme as Theme)
      : defaults.theme,
    media: Object.fromEntries(
      mediaTypes.map((media) => [
        media,
        mediaPreference(media, stored.media?.[media]) ?? defaults.media[media],
      ]),
    ) as WebPreferences['media'],
  };
}

/** Persist settings only; failures leave the session usable. */
export function savePreferences(
  storage: Pick<Storage, 'setItem'> | undefined,
  preferences: WebPreferences,
): void {
  try {
    storage?.setItem(preferencesKey, JSON.stringify(preferences));
  } catch {
    /* Private modes may reject storage; settings then last for the session. */
  }
}

/** Access localStorage without throwing where it is disabled. */
export function browserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

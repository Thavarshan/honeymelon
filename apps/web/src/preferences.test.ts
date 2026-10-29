import { describe, expect, it } from 'vitest';
import {
  defaultPreferences,
  loadPreferences,
  preferencesKey,
  savePreferences,
} from './preferences';

const storage = (value: string | null) => ({ getItem: () => value });

describe('web preferences', () => {
  it('starts from browser-encodable defaults in the visitor language', () => {
    const defaults = defaultPreferences('de-AT');
    expect(defaults.locale).toBe('de');
    expect(defaults.media.image.format).toBe('jpg');
    expect(defaults.media.audio.format).toBe('wav');
    expect(defaults.media.video).toMatchObject({
      format: 'mp4',
      spec: { kind: 'video' },
    });
    expect(defaultPreferences('pt-BR').locale).toBe('en');
  });

  it('keeps valid fields and replaces invalid ones independently', () => {
    const loaded = loadPreferences(
      storage(
        JSON.stringify({
          locale: 'fr',
          theme: 'neon',
          media: {
            image: { format: 'webp' },
            audio: { format: 'png' },
            video: {
              format: 'png',
              spec: { kind: 'image', quality: 900 },
            },
          },
        }),
      ),
      'en',
    );
    expect(loaded.locale).toBe('fr');
    expect(loaded.theme).toBe('system');
    expect(loaded.media.image).toEqual({ format: 'webp', spec: undefined });
    expect(loaded.media.audio.format).toBe('wav');
    expect(loaded.media.video.format).toBe('mp4');
  });

  it('survives corrupt, blocked or missing storage', () => {
    expect(loadPreferences(storage('{oops'), 'ru').locale).toBe('ru');
    expect(loadPreferences(undefined).locale).toBe('en');
    expect(() =>
      savePreferences(
        {
          setItem: () => {
            throw new DOMException('Quota', 'QuotaExceededError');
          },
        },
        defaultPreferences(),
      ),
    ).not.toThrow();
  });

  it('stores settings only, never file names or bytes', () => {
    const saved: Record<string, string> = {};
    savePreferences(
      { setItem: (key, value) => (saved[key] = value) },
      defaultPreferences(),
    );
    expect(Object.keys(saved)).toEqual([preferencesKey]);
    expect(Object.keys(JSON.parse(saved[preferencesKey]!))).toEqual([
      'locale',
      'theme',
      'media',
    ]);
  });
});

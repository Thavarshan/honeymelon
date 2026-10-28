import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { defaultPreferences } from '@honeymelon/contracts';
import { migrateProfile, legacyProfileNames } from './migrate-profile';

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'honeymelon-migration-'));
  roots.push(root);
  const source = path.join(root, legacyProfileNames[0]);
  const destination = path.join(root, 'Honeymelon');
  await mkdir(source);

  return { root, source, destination };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it('imports settings once without changing the old profile or replaying jobs', async () => {
  const { root, source, destination } = await fixture();
  const settings = {
    ...defaultPreferences(tmpdir()),
    locale: 'fr',
    theme: 'dark',
  };
  const original = JSON.stringify(settings);
  await writeFile(path.join(source, 'preferences-v1.json'), original);
  await writeFile(path.join(source, 'jobs.json'), '["old job"]');
  expect(await migrateProfile(root, destination)).toBe('imported');
  expect(
    await readFile(path.join(destination, 'preferences-v1.json'), 'utf8'),
  ).toBe(original);
  expect(await readFile(path.join(source, 'preferences-v1.json'), 'utf8')).toBe(
    original,
  );
  await expect(
    readFile(path.join(destination, 'jobs.json')),
  ).rejects.toMatchObject({ code: 'ENOENT' });
  expect(await migrateProfile(root, destination)).toBe('existing');
});

it('preserves destination settings even when an older profile differs', async () => {
  const { root, source, destination } = await fixture();
  await mkdir(destination);
  await writeFile(
    path.join(source, 'preferences-v1.json'),
    JSON.stringify(defaultPreferences(tmpdir())),
  );
  await writeFile(
    path.join(destination, 'preferences-v1.json'),
    'existing user settings',
  );
  expect(await migrateProfile(root, destination)).toBe('existing');
  expect(
    await readFile(path.join(destination, 'preferences-v1.json'), 'utf8'),
  ).toBe('existing user settings');
});

it('does not import malformed settings, oversized files or symbolic links', async () => {
  const { root, source, destination } = await fixture();
  const filename = path.join(source, 'preferences-v1.json');
  await writeFile(filename, '{broken');
  expect(await migrateProfile(root, destination)).toBe('absent');
  await writeFile(filename, ' '.repeat(1024 * 1024 + 1));
  expect(await migrateProfile(root, destination)).toBe('absent');
  await rm(filename);
  const elsewhere = path.join(root, 'external.json');
  await writeFile(elsewhere, JSON.stringify(defaultPreferences(tmpdir())));
  await symlink(elsewhere, filename);
  expect(await migrateProfile(root, destination)).toBe('absent');
});

it('supports lowercase historical profiles and clean first installs', async () => {
  const { root, destination } = await fixture();
  expect(await migrateProfile(root, destination)).toBe('absent');
  const lowercase = path.join(root, legacyProfileNames[1]);
  await mkdir(lowercase, { recursive: true });
  await writeFile(
    path.join(lowercase, 'preferences-v1.json'),
    JSON.stringify(defaultPreferences(tmpdir())),
  );
  expect(await migrateProfile(root, destination)).toBe('imported');
});

it('concurrent imports publish once without replacing newer settings', async () => {
  const { root, source, destination } = await fixture();
  const original = JSON.stringify(defaultPreferences(tmpdir()));
  await writeFile(path.join(source, 'preferences-v1.json'), original);
  const results = await Promise.all([
    migrateProfile(root, destination),
    migrateProfile(root, destination),
  ]);
  expect(results.sort()).toEqual(['existing', 'imported']);
  expect(
    await readFile(path.join(destination, 'preferences-v1.json'), 'utf8'),
  ).toBe(original);
});

it('falls back past an invalid profile and leaves no staging residue', async () => {
  const { root, source, destination } = await fixture();
  const invalid = path.join(source, 'preferences-v1.json');
  await writeFile(invalid, '{broken');
  const before = await stat(invalid);
  const lowercase = path.join(root, legacyProfileNames[1]);
  // Case-insensitive file systems resolve both legacy names to one directory.
  const distinct = !(await stat(lowercase).catch(() => undefined));
  if (distinct) {
    await mkdir(lowercase);
    const valid = JSON.stringify({
      ...defaultPreferences(tmpdir()),
      locale: 'de',
    });
    await writeFile(path.join(lowercase, 'preferences-v1.json'), valid);
    expect(await migrateProfile(root, destination)).toBe('imported');
    expect(
      await readFile(path.join(destination, 'preferences-v1.json'), 'utf8'),
    ).toBe(valid);
  } else {
    expect(await migrateProfile(root, destination)).toBe('absent');
  }

  expect(await readFile(invalid, 'utf8')).toBe('{broken');
  expect((await stat(invalid)).mtimeMs).toBe(before.mtimeMs);
  const residue = (await readdir(destination).catch(() => [])).filter((name) =>
    name.startsWith('.import-'),
  );
  expect(residue).toEqual([]);
  expect(await migrateProfile(root, destination)).toBe(
    distinct ? 'existing' : 'absent',
  );
});

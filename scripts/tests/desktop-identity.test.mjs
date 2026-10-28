import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { packagePaths } from '../lib/package-paths.mjs';
import { releaseAssetName, targets } from '../lib/release-policy.mjs';

const root = new URL('../../', import.meta.url);
const read = (name) => readFile(new URL(name, root), 'utf8');
const forgeConfig = new URL('apps/desktop/forge.config.ts', root);
const { version } = JSON.parse(await read('apps/desktop/package.json'));

/** Evaluate the real Forge config for one target without leaking the env. */
async function loadForgeConfig(target) {
  const previous = process.env.HONEYMELON_TARGET;
  process.env.HONEYMELON_TARGET = target;
  try {
    const url = new URL(forgeConfig);
    url.search = `target=${target}`;

    return (await import(url.href)).default;
  } finally {
    if (previous === undefined) {
      delete process.env.HONEYMELON_TARGET;
    } else {
      process.env.HONEYMELON_TARGET = previous;
    }
  }
}

const maker = (config, name) =>
  config.makers.find((entry) => entry.name === `@electron-forge/${name}`);

/** Rows of the ADR 0002 "Active identity" table keyed by surface. */
async function adrIdentity() {
  const adr = await read('docs/architecture/0002-honeymelon-identity.md');
  const rows = new Map();
  for (const line of adr.split('\n')) {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim().replace(/\\_/g, '_'));
    if (cells.length === 3 && !/^-+$/.test(cells[0])) {
      rows.set(cells[0], { previous: cells[1], current: cells[2] });
    }
  }

  return rows;
}

test('packaged identity matches ADR 0002 and never reuses Comet identifiers', async () => {
  const config = await loadForgeConfig('darwin-arm64');
  const adr = await adrIdentity();
  const packager = config.packagerConfig;

  assert.equal(packager.name, adr.get('Product and executable').current);
  assert.equal(packager.executableName, packager.name);
  assert.equal(packager.appBundleId, adr.get('macOS bundle ID').current);

  for (const kind of ['deb', 'rpm']) {
    const { options } = maker(config, `maker-${kind}`).config;
    assert.equal(options.name, adr.get('Linux package').current, kind);
    assert.equal(options.productName, packager.name, kind);
    assert.equal(options.bin, packager.executableName, kind);
  }

  const squirrel = maker(config, 'maker-squirrel').config;
  assert.equal(squirrel.name, packager.name);
  assert.equal(squirrel.exe, `${packager.executableName}.exe`);
  assert.equal(squirrel.noMsi, true);

  // Coexistence requires every OS-registered identifier to differ from the
  // previous release; matching any of them would make this an in-place
  // replacement, which ADR 0002 does not choose.
  const registered = [
    packager.name,
    packager.executableName,
    packager.appBundleId,
    squirrel.name,
    squirrel.exe,
    maker(config, 'maker-deb').config.options.name,
    maker(config, 'maker-rpm').config.options.name,
  ];
  for (const surface of [
    'Product and executable',
    'macOS bundle ID',
    'Linux package',
  ]) {
    const { previous } = adr.get(surface);
    assert.ok(
      registered.every(
        (value) =>
          value.toLowerCase() !== previous.toLowerCase() &&
          value.toLowerCase() !== `${previous}.exe`.toLowerCase(),
      ),
      `${surface} must not reuse ${previous}`,
    );
  }
});

test('every supported platform has a maker and the icons it references exist', async () => {
  const config = await loadForgeConfig('linux-x64');
  const platforms = (name) => maker(config, name).platforms;
  assert.deepEqual(platforms('maker-squirrel'), ['win32']);
  assert.deepEqual(platforms('maker-zip').sort(), ['darwin', 'win32']);
  assert.deepEqual(platforms('maker-deb'), ['linux']);
  assert.deepEqual(platforms('maker-rpm'), ['linux']);

  // Electron Packager appends the platform's extension to the base icon path.
  for (const extension of ['.icns', '.ico', '.png']) {
    assert.ok(
      existsSync(config.packagerConfig.icon + extension),
      `missing ${extension} application icon`,
    );
  }

  for (const icon of [
    maker(config, 'maker-squirrel').config.setupIcon,
    maker(config, 'maker-deb').config.options.icon,
    maker(config, 'maker-rpm').config.options.icon,
  ]) {
    assert.ok(existsSync(icon), icon);
  }
});

test('Windows installers are versioned, target-specific and Honeymelon-named', async () => {
  for (const target of targets.filter((entry) => entry.startsWith('win32'))) {
    const config = await loadForgeConfig(target);
    assert.equal(
      maker(config, 'maker-squirrel').config.setupExe,
      `honeymelon-${version}-${target}-setup.exe`,
    );
  }
});

test('runtime profile and legacy import names match ADR 0002', async () => {
  const adr = await adrIdentity();
  const userData = adr.get('User-data directory');
  const main = await read('apps/desktop/src/main/index.ts');
  assert.ok(
    main.includes(`path.join(app.getPath('appData'), '${userData.current}')`),
    'desktop must store its profile under the ADR user-data directory',
  );
  assert.match(main, new RegExp(`app\\.name = '${userData.current}'`));

  // Only the documented legacy profiles are read; the old directory name is
  // intentionally retained here and nowhere else in the main process.
  const migration = await read('apps/desktop/src/main/migrate-profile.ts');
  assert.match(
    migration,
    new RegExp(
      `legacyProfileNames = \\['${userData.previous}', '${userData.previous.toLowerCase()}'\\] as const`,
    ),
  );
});

test('packaging paths follow the Forge output name for this host', async () => {
  const config = await loadForgeConfig(`${process.platform}-${process.arch}`);
  const paths = packagePaths();
  assert.equal(
    path.basename(paths.directory),
    `${config.packagerConfig.name}-${paths.target}`,
  );
  assert.ok(
    path
      .basename(paths.relativeExecutable)
      .startsWith(config.packagerConfig.executableName),
  );
  assert.equal(
    path.relative(fileURLToPath(root), path.dirname(paths.directory)),
    path.join('apps', 'desktop', 'out'),
  );
});

test('release asset names are unique, download-safe and Honeymelon-prefixed', () => {
  // Representative maker outputs; the release name must stay unique even
  // when two targets emit identically named files.
  const outputs = {
    darwin: (target, arch) => [
      `make/zip/darwin/${arch}/Honeymelon-${target}-${version}.zip`,
    ],
    win32: (target, arch) => [
      `make/squirrel.windows/${arch}/honeymelon-${version}-${target}-setup.exe`,
      `make/zip/win32/${arch}/Honeymelon-${target}-${version}.zip`,
    ],
    linux: (target, arch) => [
      `make/deb/${arch}/honeymelon_${version.replace('-', '~')}_${arch}.deb`,
      `make/rpm/${arch}/honeymelon-${version.replace('-', '.')}-1.${arch}.rpm`,
      `make/portable/honeymelon-${version}-${target}.tar.gz`,
    ],
  };
  const names = new Set();
  for (const target of targets) {
    const [platform, arch] = target.split('-');
    const files = outputs[platform](target, arch);
    for (const file of files) {
      const name = releaseAssetName(version, target, file);
      assert.ok(name.startsWith(`honeymelon-${version}-${target}-`), name);
      assert.match(name, /^[A-Za-z0-9._-]+$/);
      assert.doesNotMatch(name, /^comet/i);
      assert.ok(!names.has(name), `duplicate ${name}`);
      names.add(name);
    }
  }

  assert.equal(names.size, 2 * 1 + 2 * 2 + 2 * 3);
});

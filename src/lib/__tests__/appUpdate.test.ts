import {
  compareVersions,
  formatSize,
  isSnoozed,
  NO_UPDATE_MARKER,
  parseVersion,
  pickUpdate,
  SNOOZE_MS,
  type GithubRelease,
} from '../appUpdate';

const release = (tag: string, extra: Partial<GithubRelease> = {}): GithubRelease => ({
  tag_name: tag,
  html_url: `https://github.com/x/y/releases/tag/${tag}`,
  draft: false,
  body: '',
  assets: [
    {
      name: `app-parejas-${tag}.apk`,
      browser_download_url: `https://github.com/x/y/releases/download/${tag}/app-parejas-${tag}.apk`,
      size: 111445124,
    },
  ],
  ...extra,
});

describe('parseVersion', () => {
  it('acepta con y sin "v"', () => {
    expect(parseVersion('v0.12.2')).toEqual([0, 12, 2]);
    expect(parseVersion('1.0.10')).toEqual([1, 0, 10]);
  });
  it('rechaza lo demás', () => {
    expect(parseVersion('v1.0')).toBeNull();
    expect(parseVersion('v1.0.0-beta')).toBeNull();
    expect(parseVersion(null)).toBeNull();
  });
});

describe('compareVersions', () => {
  it('compara numéricamente, no como texto', () => {
    expect(compareVersions([0, 12, 0], [0, 9, 0])).toBeGreaterThan(0);
    expect(compareVersions([0, 1, 2], [0, 1, 10])).toBeLessThan(0);
    expect(compareVersions([1, 2, 3], [1, 2, 3])).toBe(0);
  });
});

describe('pickUpdate', () => {
  const releases = [release('v0.12.2'), release('v0.13.0'), release('v0.12.1')];

  it('ofrece el release más nuevo', () => {
    expect(pickUpdate('0.12.2', releases)).toEqual({
      version: '0.13.0',
      apkUrl: 'https://github.com/x/y/releases/download/v0.13.0/app-parejas-v0.13.0.apk',
      releaseUrl: 'https://github.com/x/y/releases/tag/v0.13.0',
      sizeBytes: 111445124,
    });
  });

  it('nada si ya está al día o adelantada', () => {
    expect(pickUpdate('0.13.0', releases)).toBeNull();
    expect(pickUpdate('0.14.0', releases)).toBeNull();
  });

  it('nada en desarrollo (versión 0.0.0 o desconocida)', () => {
    expect(pickUpdate('0.0.0', releases)).toBeNull();
    expect(pickUpdate(null, releases)).toBeNull();
  });

  it('ignora borradores, marcados, sin APK y tags raros', () => {
    const skipped = [
      release('v0.20.0', { draft: true }),
      release('v0.19.0', { body: `Necesita deploy.\n${NO_UPDATE_MARKER}` }),
      release('v0.18.0', { assets: [] }),
      release('nightly'),
      release('v0.13.0'),
    ];
    expect(pickUpdate('0.12.2', skipped)?.version).toBe('0.13.0');
  });
});

describe('formatSize', () => {
  it('redondea a MB', () => {
    expect(formatSize(111445124)).toBe('106 MB');
    expect(formatSize(10)).toBe('1 MB');
  });
});

describe('isSnoozed', () => {
  const update = pickUpdate('0.12.2', [release('v0.13.0')])!;
  const now = Date.UTC(2026, 10, 3, 12);
  it('esconde la misma versión durante un día', () => {
    expect(isSnoozed({ version: '0.13.0', at: now - 1000 }, update, now)).toBe(true);
    expect(isSnoozed({ version: '0.13.0', at: now - SNOOZE_MS }, update, now)).toBe(false);
  });
  it('una versión distinta se muestra', () => {
    expect(isSnoozed({ version: '0.12.9', at: now }, update, now)).toBe(false);
    expect(isSnoozed(null, update, now)).toBe(false);
  });
});

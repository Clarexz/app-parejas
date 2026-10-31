import type { WidgetSnapshot } from '@/lib/widgets';
import { buildWidgetSnapshot } from '@/lib/widgets';

import { pickPartnerStory, storyToSnapshotInput, type PartnerStoryRow } from '../partnerStory';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const NOW = new Date('2026-10-30T18:00:00Z');

const row = (over: Partial<PartnerStoryRow> = {}): PartnerStoryRow => ({
  id: 's1',
  user_id: 'u2',
  kind: 'photo',
  created_at: '2026-10-30T16:00:00Z',
  expires_at: '2026-10-31T16:00:00Z',
  deleted_at: null,
  thumb_path: 'c/u2/a_thumb.jpg',
  text: null,
  bg: null,
  font: null,
  strokes: null,
  ...over,
});

const previousWith = (thumb: string | null): WidgetSnapshot =>
  buildWidgetSnapshot({
    anniversary: null,
    timezone: 'America/Mexico_City',
    me: null,
    partner: null,
    partnerMood: null,
    partnerStory: {
      id: 's1',
      kind: 'photo',
      created_at: '2026-10-30T16:00:00Z',
      expires_at: '2026-10-31T16:00:00Z',
      thumb,
    },
    now: NOW,
  });

describe('storyToSnapshotInput', () => {
  it('descarga la miniatura de una foto nueva', async () => {
    const download = jest.fn(async () => 'data:image/jpeg;base64,AAAA');
    const out = await storyToSnapshotInput(row(), null, download);
    expect(download).toHaveBeenCalledWith('c/u2/a_thumb.jpg');
    expect(out?.thumb).toBe('data:image/jpeg;base64,AAAA');
  });

  it('reutiliza la miniatura si la story no cambió', async () => {
    const download = jest.fn(async () => 'otra');
    const out = await storyToSnapshotInput(
      row(),
      previousWith('data:image/jpeg;base64,BBBB'),
      download,
    );
    expect(download).not.toHaveBeenCalled();
    expect(out?.thumb).toBe('data:image/jpeg;base64,BBBB');
  });

  it('baja de nuevo si cambió la story', async () => {
    const download = jest.fn(async () => 'nueva');
    const out = await storyToSnapshotInput(
      row({ id: 's2' }),
      previousWith('data:image/jpeg;base64,BBBB'),
      download,
    );
    expect(download).toHaveBeenCalledTimes(1);
    expect(out?.thumb).toBe('nueva');
  });

  it('si la descarga falla deja la miniatura en null', async () => {
    const out = await storyToSnapshotInput(row(), null, async () => null);
    expect(out?.thumb).toBeNull();
  });

  it('text y drawing no descargan nada', async () => {
    const download = jest.fn(async () => 'x');
    const text = await storyToSnapshotInput(
      row({ kind: 'text', thumb_path: null, text: 'Hola', bg: 'postit', font: 'hand' }),
      null,
      download,
    );
    expect(text).toMatchObject({ kind: 'text', text: 'Hola', bg: 'postit', thumb: null });
    const strokes = [{ c: 'ink', w: 8, p: [0, 0, 10, 10] }];
    const drawing = await storyToSnapshotInput(
      row({ kind: 'drawing', thumb_path: null, bg: 'paper', strokes }),
      null,
      download,
    );
    expect(drawing?.strokes).toEqual(strokes);
    expect(download).not.toHaveBeenCalled();
  });

  it('descarta un dibujo con trazos inválidos', async () => {
    const out = await storyToSnapshotInput(
      row({ kind: 'drawing', strokes: [{ c: 'rojo', w: 1, p: [1] }] }),
      null,
      async () => null,
    );
    expect(out).toBeNull();
  });
});

describe('pickPartnerStory', () => {
  it('elige la más nueva y activa de tu pareja', async () => {
    const rows = [
      row({ id: 'a', kind: 'text', text: 'vieja', created_at: '2026-10-30T10:00:00Z' }),
      row({ id: 'b', kind: 'text', text: 'nueva', created_at: '2026-10-30T15:00:00Z' }),
      row({
        id: 'c',
        kind: 'text',
        text: 'mía',
        user_id: 'yo',
        created_at: '2026-10-30T17:00:00Z',
      }),
      row({
        id: 'd',
        kind: 'text',
        text: 'caducada',
        created_at: '2026-10-30T17:30:00Z',
        expires_at: '2026-10-30T17:45:00Z',
      }),
    ];
    const out = await pickPartnerStory(rows, 'u2', null, NOW);
    expect(out?.id).toBe('b');
  });

  it('sin story activa devuelve null', async () => {
    expect(await pickPartnerStory([], 'u2', null, NOW)).toBeNull();
    expect(await pickPartnerStory([row()], null, null, NOW)).toBeNull();
  });
});

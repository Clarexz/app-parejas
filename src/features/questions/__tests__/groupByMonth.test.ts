import type { HistoryItem } from '@/lib/questions';

import { groupHistoryByMonth, monthLabel } from '../groupByMonth';

const item = (id: string, day: string | null, last: string): HistoryItem =>
  ({
    question: { id },
    day,
    last_activity: last,
    mine: null,
    partner: null,
    partner_answered: false,
    comment_count: 0,
  }) as unknown as HistoryItem;

describe('groupHistoryByMonth', () => {
  it('pone un encabezado por mes con su conteo', () => {
    const rows = groupHistoryByMonth(
      [
        item('a', '2026-11-02', '2026-11-02T10:00:00Z'),
        item('b', null, '2026-11-01T10:00:00Z'),
        item('c', '2026-10-30', '2026-10-30T10:00:00Z'),
      ],
      2026,
    );
    expect(rows.map((r) => r.kind)).toEqual(['month', 'item', 'item', 'month', 'item']);
    expect(rows[0]).toMatchObject({ label: 'noviembre', count: 2 });
    expect(rows[3]).toMatchObject({ label: 'octubre', count: 1 });
  });

  it('agrega el año cuando no es el actual', () => {
    expect(monthLabel('2025-12', 2026)).toBe('diciembre 2025');
  });
});

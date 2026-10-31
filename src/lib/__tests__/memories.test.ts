import {
  MEMORY_BODY_MAX,
  MEMORY_PHOTOS_MAX,
  MEMORY_PLACE_MAX,
  MEMORY_TITLE_MAX,
  exifDate,
  exifLocation,
  groupByMonth,
  indexFromOffset,
  memoryAgo,
  memoryCountLabel,
  memoryPhotoPaths,
  moveItem,
  offsetFromIndex,
  onThisDay,
  onThisDayLabel,
  photoCountLabel,
  validateMemoryDraft,
} from '../memories';

const TODAY = '2026-10-31';
const ok = { title: 'Playa', happenedOn: '2026-10-01', photoCount: 3 };

describe('memoryPhotoPaths', () => {
  it('arma ruta y miniatura', () => {
    expect(memoryPhotoPaths('c', 'u', 'f')).toEqual({
      path: 'c/u/f.jpg',
      thumb: 'c/u/f_thumb.jpg',
    });
  });
});

describe('validateMemoryDraft', () => {
  it('una memoria válida no tiene errores', () => {
    expect(validateMemoryDraft(ok, TODAY)).toBeNull();
    expect(MEMORY_PHOTOS_MAX).toBe(10);
  });

  it('título vacío, de espacios o muy largo', () => {
    expect(validateMemoryDraft({ ...ok, title: '' }, TODAY)?.title).toBe('empty');
    expect(validateMemoryDraft({ ...ok, title: '   ' }, TODAY)?.title).toBe('empty');
    expect(validateMemoryDraft({ ...ok, title: 'a'.repeat(MEMORY_TITLE_MAX) }, TODAY)).toBeNull();
    expect(validateMemoryDraft({ ...ok, title: 'a'.repeat(81) }, TODAY)?.title).toBe('too_long');
    // los espacios de los lados no cuentan
    expect(
      validateMemoryDraft({ ...ok, title: ` ${'a'.repeat(MEMORY_TITLE_MAX)} ` }, TODAY),
    ).toBeNull();
  });

  it('texto y lugar largos', () => {
    expect(validateMemoryDraft({ ...ok, body: 'a'.repeat(MEMORY_BODY_MAX) }, TODAY)).toBeNull();
    expect(validateMemoryDraft({ ...ok, body: 'a'.repeat(2001) }, TODAY)?.body).toBe('too_long');
    expect(
      validateMemoryDraft({ ...ok, placeName: 'a'.repeat(MEMORY_PLACE_MAX) }, TODAY),
    ).toBeNull();
    expect(validateMemoryDraft({ ...ok, placeName: 'a'.repeat(81) }, TODAY)?.place).toBe(
      'too_long',
    );
    expect(validateMemoryDraft({ ...ok, body: null, placeName: null }, TODAY)).toBeNull();
  });

  it('fotos: de 1 a 10', () => {
    expect(validateMemoryDraft({ ...ok, photoCount: 0 }, TODAY)?.photos).toBe('none');
    expect(validateMemoryDraft({ ...ok, photoCount: 1 }, TODAY)).toBeNull();
    expect(validateMemoryDraft({ ...ok, photoCount: 10 }, TODAY)).toBeNull();
    expect(validateMemoryDraft({ ...ok, photoCount: 11 }, TODAY)?.photos).toBe('too_many');
  });

  it('fecha inválida, antes de 1900 y futura (con un día de margen)', () => {
    expect(validateMemoryDraft({ ...ok, happenedOn: null }, TODAY)?.date).toBe('invalid');
    expect(validateMemoryDraft({ ...ok, happenedOn: '' }, TODAY)?.date).toBe('invalid');
    expect(validateMemoryDraft({ ...ok, happenedOn: '2026-02-30' }, TODAY)?.date).toBe('invalid');
    expect(validateMemoryDraft({ ...ok, happenedOn: '2025-02-29' }, TODAY)?.date).toBe('invalid');
    expect(validateMemoryDraft({ ...ok, happenedOn: '1899-12-31' }, TODAY)?.date).toBe('invalid');
    expect(validateMemoryDraft({ ...ok, happenedOn: '1900-01-01' }, TODAY)).toBeNull();
    expect(validateMemoryDraft({ ...ok, happenedOn: '2024-02-29' }, TODAY)).toBeNull();
    expect(validateMemoryDraft({ ...ok, happenedOn: TODAY }, TODAY)).toBeNull();
    expect(validateMemoryDraft({ ...ok, happenedOn: '2026-11-01' }, TODAY)).toBeNull();
    expect(validateMemoryDraft({ ...ok, happenedOn: '2026-11-02' }, TODAY)?.date).toBe('future');
  });

  it('acumula varios errores', () => {
    expect(validateMemoryDraft({ title: '', happenedOn: null, photoCount: 0 }, TODAY)).toEqual({
      title: 'empty',
      date: 'invalid',
      photos: 'none',
    });
  });
});

const mem = (id: string, happened_on: string, created_at = '2026-01-01T00:00:00Z') => ({
  id,
  happened_on,
  created_at,
});

describe('groupByMonth', () => {
  it('agrupa por mes, de lo más reciente a lo más viejo', () => {
    const groups = groupByMonth([
      mem('a', '2026-09-03'),
      mem('b', '2026-10-01'),
      mem('c', '2025-10-20'),
      mem('d', '2026-10-15'),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['2026-10', '2026-09', '2025-10']);
    expect(groups[0]).toMatchObject({ year: 2026, month: 10, label: 'octubre 2026' });
    expect(groups[0].items.map((m) => m.id)).toEqual(['d', 'b']);
    expect(groups[2].label).toBe('octubre 2025');
  });

  it('desempata por created_at (la más nueva primero) y omite fechas inválidas', () => {
    const groups = groupByMonth([
      mem('old', '2026-10-01', '2026-10-01T10:00:00Z'),
      mem('new', '2026-10-01', '2026-10-02T10:00:00Z'),
      mem('bad', 'nope'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((m) => m.id)).toEqual(['new', 'old']);
  });

  it('lista vacía y no muta la entrada', () => {
    expect(groupByMonth([])).toEqual([]);
    const input = [mem('a', '2020-01-01'), mem('b', '2021-01-01')];
    groupByMonth(input);
    expect(input.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('etiquetas de enero y diciembre', () => {
    const groups = groupByMonth([mem('a', '2026-01-05'), mem('b', '2025-12-25')]);
    expect(groups.map((g) => g.label)).toEqual(['enero 2026', 'diciembre 2025']);
  });
});

describe('onThisDay', () => {
  const list = [
    mem('a', '2025-10-31'),
    mem('b', '2023-10-31'),
    mem('c', '2026-10-31'), // este año: no cuenta
    mem('d', '2025-10-30'),
    mem('e', '2027-10-31'), // futuro: no cuenta
    mem('f', '2024-10-31'),
  ];

  it('mismo mes y día en años anteriores, de menos a más años', () => {
    const out = onThisDay(list, TODAY);
    expect(out.map((x) => [x.memory.id, x.yearsAgo])).toEqual([
      ['a', 1],
      ['f', 2],
      ['b', 3],
    ]);
  });

  it('sin coincidencias o con hoy inválido', () => {
    expect(onThisDay(list, '2026-01-01')).toEqual([]);
    expect(onThisDay(list, 'basura')).toEqual([]);
    expect(onThisDay([], TODAY)).toEqual([]);
  });

  it('29 de febrero: sale el 28-feb en años no bisiestos y el 29 en bisiestos', () => {
    const leap = [mem('x', '2020-02-29'), mem('y', '2022-02-28')];
    // 2026 no es bisiesto
    expect(onThisDay(leap, '2026-02-28').map((r) => r.memory.id)).toEqual(['y', 'x']);
    expect(onThisDay(leap, '2026-03-01')).toEqual([]);
    // 2028 es bisiesto: la del 29 sale el 29, y el 28 solo la del 28
    expect(onThisDay(leap, '2028-02-29').map((r) => r.memory.id)).toEqual(['x']);
    expect(onThisDay(leap, '2028-02-28').map((r) => r.memory.id)).toEqual(['y']);
    expect(onThisDay(leap, '2024-02-29').map((r) => r.memory.id)).toEqual(['x']);
  });

  it('una del 28-feb no sale el 29-feb de un año bisiesto', () => {
    expect(onThisDay([mem('y', '2022-02-28')], '2024-02-29')).toEqual([]);
  });

  it('empate de años: la más reciente primero', () => {
    const out = onThisDay(
      [
        mem('a', '2025-10-31', '2025-10-31T08:00:00Z'),
        mem('b', '2025-10-31', '2025-11-01T08:00:00Z'),
      ],
      TODAY,
    );
    expect(out.map((r) => r.memory.id)).toEqual(['b', 'a']);
  });
});

describe('etiquetas', () => {
  it('memoryAgo', () => {
    expect(memoryAgo(1)).toBe('hace 1 año');
    expect(memoryAgo(3)).toBe('hace 3 años');
    expect(memoryAgo(0)).toBe('hace 1 año');
    expect(onThisDayLabel(2)).toBe('Un día como hoy, hace 2 años');
  });
  it('conteos', () => {
    expect(photoCountLabel(1)).toBe('1 foto');
    expect(photoCountLabel(4)).toBe('4 fotos');
    expect(memoryCountLabel(1)).toBe('1 memoria');
    expect(memoryCountLabel(0)).toBe('0 memorias');
  });
});

describe('moveItem', () => {
  const list = ['a', 'b', 'c', 'd'];
  it('mueve hacia adelante y hacia atrás', () => {
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });
  it('mismo lugar, fuera de rango y lista vacía', () => {
    expect(moveItem(list, 1, 1)).toEqual(list);
    expect(moveItem(list, 0, 99)).toEqual(['b', 'c', 'd', 'a']);
    expect(moveItem(list, 2, -5)).toEqual(['c', 'a', 'b', 'd']);
    expect(moveItem(list, 9, 0)).toEqual(list);
    expect(moveItem(list, -1, 0)).toEqual(list);
    expect(moveItem([], 0, 1)).toEqual([]);
  });
  it('no muta la entrada', () => {
    const copy = [...list];
    const out = moveItem(copy, 0, 3);
    expect(copy).toEqual(list);
    expect(out).not.toBe(copy);
  });
});

describe('indexFromOffset / offsetFromIndex', () => {
  // 3 columnas, celdas de 100x80, 7 elementos (3 filas: 3 + 3 + 1)
  const grid = { columns: 3, cellWidth: 100, cellHeight: 80, count: 7 };

  it('encuentra la celda por columna y fila', () => {
    expect(indexFromOffset(0, 0, grid)).toBe(0);
    expect(indexFromOffset(99, 79, grid)).toBe(0);
    expect(indexFromOffset(100, 0, grid)).toBe(1);
    expect(indexFromOffset(250, 10, grid)).toBe(2);
    expect(indexFromOffset(10, 85, grid)).toBe(3);
    expect(indexFromOffset(150, 100, grid)).toBe(4);
    expect(indexFromOffset(10, 170, grid)).toBe(6);
  });

  it('acota fuera de la rejilla', () => {
    expect(indexFromOffset(-50, -50, grid)).toBe(0);
    expect(indexFromOffset(999, 0, grid)).toBe(2);
    expect(indexFromOffset(999, 999, grid)).toBe(6);
    // última fila incompleta: la celda vacía se acota al último elemento
    expect(indexFromOffset(250, 170, grid)).toBe(6);
  });

  it('casos degenerados', () => {
    expect(indexFromOffset(10, 10, { ...grid, count: 0 })).toBe(0);
    expect(indexFromOffset(10, 10, { ...grid, columns: 0 })).toBe(0);
    expect(indexFromOffset(10, 10, { ...grid, cellWidth: 0 })).toBe(0);
    expect(indexFromOffset(500, 500, { ...grid, count: 1 })).toBe(0);
  });

  it('offsetFromIndex es la inversa en la esquina de la celda', () => {
    for (let i = 0; i < grid.count; i++) {
      const { x, y } = offsetFromIndex(i, grid);
      expect(indexFromOffset(x, y, grid)).toBe(i);
      expect(indexFromOffset(x + 99, y + 79, grid)).toBe(i);
    }
    expect(offsetFromIndex(4, grid)).toEqual({ x: 100, y: 80 });
  });

  it('arrastrar la primera foto al final con moveItem', () => {
    const to = indexFromOffset(10, 170, grid);
    expect(moveItem([1, 2, 3, 4, 5, 6, 7], 0, to)).toEqual([2, 3, 4, 5, 6, 7, 1]);
  });
});

describe('exifLocation', () => {
  it('números con referencia', () => {
    expect(
      exifLocation({
        GPSLatitude: 19.4326,
        GPSLatitudeRef: 'N',
        GPSLongitude: 99.1332,
        GPSLongitudeRef: 'W',
      }),
    ).toEqual({ lat: 19.4326, lng: -99.1332 });
    expect(
      exifLocation({
        GPSLatitude: 33.8,
        GPSLatitudeRef: 'S',
        GPSLongitude: 151.2,
        GPSLongitudeRef: 'E',
      }),
    ).toEqual({ lat: -33.8, lng: 151.2 });
  });

  it('referencia en minúscula, con espacios y número ya negativo', () => {
    expect(
      exifLocation({
        GPSLatitude: -19.4,
        GPSLatitudeRef: ' s ',
        GPSLongitude: -99.1,
        GPSLongitudeRef: 'w',
      }),
    ).toEqual({ lat: -19.4, lng: -99.1 });
  });

  it('sin referencia respeta el signo', () => {
    expect(exifLocation({ GPSLatitude: -19.4, GPSLongitude: -99.1 })).toEqual({
      lat: -19.4,
      lng: -99.1,
    });
    expect(exifLocation({ GPSLatitude: 19.4, GPSLongitude: 99.1 })).toEqual({
      lat: 19.4,
      lng: 99.1,
    });
  });

  it('arrays en grados, minutos y segundos', () => {
    const loc = exifLocation({
      GPSLatitude: [41, 24, 12.2],
      GPSLatitudeRef: 'N',
      GPSLongitude: [2, 10, 26.5],
      GPSLongitudeRef: 'E',
    });
    expect(loc?.lat).toBeCloseTo(41.40339, 4);
    expect(loc?.lng).toBeCloseTo(2.17403, 4);
    const west = exifLocation({
      GPSLatitude: [19, 25, 57.4],
      GPSLatitudeRef: 'N',
      GPSLongitude: [99, 7, 59.5],
      GPSLongitudeRef: 'W',
    });
    expect(west?.lng).toBeLessThan(0);
    expect(west?.lng).toBeCloseTo(-99.13319, 4);
  });

  it('racionales como texto, sueltos, en array o separados por comas', () => {
    expect(
      exifLocation({
        GPSLatitude: ['41/1', '24/1', '1220/100'],
        GPSLatitudeRef: 'N',
        GPSLongitude: '2/1,10/1,2650/100',
        GPSLongitudeRef: 'E',
      })?.lat,
    ).toBeCloseTo(41.40339, 4);
    expect(
      exifLocation({
        GPSLatitude: '4140339/100000',
        GPSLatitudeRef: 'N',
        GPSLongitude: '217403/100000',
        GPSLongitudeRef: 'E',
      }),
    ).toEqual({ lat: 41.40339, lng: 2.17403 });
  });

  it('números como texto y arrays de un solo valor', () => {
    expect(
      exifLocation({ GPSLatitude: '19.5', GPSLongitude: '99.5', GPSLongitudeRef: 'W' }),
    ).toEqual({ lat: 19.5, lng: -99.5 });
    expect(
      exifLocation({ GPSLatitude: [19.5], GPSLongitude: [99.5], GPSLongitudeRef: 'W' }),
    ).toEqual({
      lat: 19.5,
      lng: -99.5,
    });
  });

  it('descarta (0, 0), fuera de rango y datos inválidos', () => {
    expect(exifLocation({ GPSLatitude: 0, GPSLongitude: 0 })).toBeNull();
    expect(exifLocation({ GPSLatitude: [0, 0, 0], GPSLongitude: '0/1' })).toBeNull();
    expect(exifLocation({ GPSLatitude: 91, GPSLongitude: 10 })).toBeNull();
    expect(exifLocation({ GPSLatitude: 10, GPSLongitude: 181 })).toBeNull();
    expect(exifLocation({ GPSLatitude: NaN, GPSLongitude: 10 })).toBeNull();
    expect(exifLocation({ GPSLatitude: 'abc', GPSLongitude: 10 })).toBeNull();
    expect(exifLocation({ GPSLatitude: '1/0', GPSLongitude: 10 })).toBeNull();
    expect(exifLocation({ GPSLatitude: [1, 2, 3, 4], GPSLongitude: 10 })).toBeNull();
    expect(exifLocation({ GPSLatitude: [], GPSLongitude: 10 })).toBeNull();
    expect(exifLocation({ GPSLatitude: ['x'], GPSLongitude: 10 })).toBeNull();
    expect(exifLocation({ GPSLatitude: 10 })).toBeNull();
    expect(exifLocation({})).toBeNull();
    expect(exifLocation(null)).toBeNull();
    expect(exifLocation(undefined)).toBeNull();
  });

  it('un solo cero es válido (ecuador o meridiano de Greenwich)', () => {
    expect(exifLocation({ GPSLatitude: 0, GPSLongitude: 10 })).toEqual({ lat: 0, lng: 10 });
  });
});

describe('exifDate', () => {
  it('lee DateTimeOriginal con formato EXIF', () => {
    expect(exifDate({ DateTimeOriginal: '2024:05:01 18:22:10' })).toBe('2024-05-01');
  });
  it('prefiere DateTimeOriginal y cae a DateTime', () => {
    expect(
      exifDate({ DateTime: '2023:01:02 00:00:00', DateTimeOriginal: '2024:05:01 18:22:10' }),
    ).toBe('2024-05-01');
    expect(exifDate({ DateTime: '2023:01:02 00:00:00' })).toBe('2023-01-02');
    expect(exifDate({ DateTimeDigitized: '2022:12:31 23:59:59' })).toBe('2022-12-31');
  });
  it('salta valores inválidos y usa el siguiente', () => {
    expect(
      exifDate({ DateTimeOriginal: '0000:00:00 00:00:00', DateTime: '2023:01:02 10:00:00' }),
    ).toBe('2023-01-02');
  });
  it('acepta guiones y T, y solo la fecha', () => {
    expect(exifDate({ DateTimeOriginal: '2024-05-01T18:22:10' })).toBe('2024-05-01');
    expect(exifDate({ DateTimeOriginal: '2024:05:01' })).toBe('2024-05-01');
  });
  it('valida bisiestos y rangos', () => {
    expect(exifDate({ DateTimeOriginal: '2024:02:29 10:00:00' })).toBe('2024-02-29');
    expect(exifDate({ DateTimeOriginal: '2023:02:29 10:00:00' })).toBeNull();
    expect(exifDate({ DateTimeOriginal: '2023:13:01 10:00:00' })).toBeNull();
    expect(exifDate({ DateTimeOriginal: '1850:01:01 10:00:00' })).toBeNull();
  });
  it('sin datos o de otro tipo', () => {
    expect(exifDate({})).toBeNull();
    expect(exifDate(null)).toBeNull();
    expect(exifDate(undefined)).toBeNull();
    expect(exifDate({ DateTimeOriginal: 12345 })).toBeNull();
    expect(exifDate({ DateTimeOriginal: 'ayer' })).toBeNull();
  });
});

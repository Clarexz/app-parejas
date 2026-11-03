import { fireEvent, render, screen } from '@testing-library/react-native';

import { FRUITS } from '@/lib/fruits';
import { LEGACY_STORY_BGS, STORY_BGS } from '@/lib/stories';
import { ThemeProvider } from '@/theme';

import { StoriesRowView } from '../components/StoriesRow';
import { StoryFrame, storyBgColor, storyFontSize, storyTextColor } from '../components/StoryFrame';

jest.mock('@/features/couple', () => ({ useCouple: () => ({ me: null, partner: null }) }));
jest.mock('@/features/profile', () => ({ useSignedUrl: () => null }));
jest.mock('../hooks', () => ({ useActiveStories: () => ({ stories: [], isLoading: false }) }));

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('colores de las stories de texto', () => {
  // WCAG: 4.5:1 para texto normal; 3:1 para texto grande (>= 24 dp). Las stories de texto usan
  // la fuente display a 40 dp (textos cortos), así que Uva y Arándano (Hueso encima) solo exigen 3:1
  // porque el tamaño real de letra del marco supera 24 dp. Si el tamaño fuera menor, se exige 4.5:1.
  const LARGE_TEXT_DP = 24;
  const shortTextSize = storyFontSize(40);

  it.each([...STORY_BGS, ...LEGACY_STORY_BGS])(
    'el texto sobre %s tiene contraste suficiente',
    (bg) => {
      const ratio = contrast(storyTextColor(bg), storyBgColor(bg));
      const min = shortTextSize >= LARGE_TEXT_DP ? 3 : 4.5;
      expect(ratio).toBeGreaterThanOrEqual(min);
    },
  );

  it('los fondos que no son Uva ni Arándano cumplen 4.5:1', () => {
    for (const bg of STORY_BGS.filter((b) => b !== 'uva' && b !== 'arandano')) {
      expect(contrast(storyTextColor(bg), storyBgColor(bg))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('las 7 frutas y Hueso son fondos; Uva y Arándano llevan texto Hueso', () => {
    expect(STORY_BGS).toHaveLength(8);
    expect(storyBgColor('uva')).toBe(FRUITS.uva.hex);
    expect(storyTextColor('uva')).toBe(FRUITS.uva.on);
    expect(storyBgColor('arandano')).toBe(FRUITS.arandano.hex);
    expect(storyTextColor('arandano')).toBe(FRUITS.arandano.on);
    expect(storyTextColor('bone')).toBe(storyTextColor(null));
  });

  it('los fondos con fruta usan su color y el texto `on` de la fruta', () => {
    expect(storyBgColor('cempasuchil')).toBe(FRUITS.mango.hex);
    expect(storyTextColor('cempasuchil')).toBe(FRUITS.mango.on);
    expect(storyTextColor('jamaica')).toBe(FRUITS.pitaya.on);
  });
});

const renderFrame = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('StoryFrame', () => {
  it('texto: muestra el texto y los stickers', async () => {
    await renderFrame(
      <StoryFrame
        width={300}
        story={{
          kind: 'text',
          text: 'Hay café',
          bg: 'postit',
          font: 'hand',
          stickers: [{ e: '☕', x: 0.5, y: 0.5, s: 1, r: 0 }],
        }}
      />,
    );
    expect(screen.getByText('Hay café')).toBeTruthy();
    expect(screen.getByText('☕')).toBeTruthy();
    expect(screen.getByLabelText('Story de texto: Hay café')).toBeTruthy();
  });

  it('foto: pone el pie y la describe', async () => {
    await renderFrame(
      <StoryFrame
        width={300}
        mediaUrl="https://ejemplo.mx/foto.jpg"
        story={{ kind: 'photo', text: 'Pan dulce' }}
      />,
    );
    expect(screen.getByText('Pan dulce')).toBeTruthy();
    expect(screen.getByLabelText('Pan dulce')).toBeTruthy();
  });

  it('dibujo: se describe como dibujo y no pinta texto', async () => {
    await renderFrame(
      <StoryFrame
        width={300}
        story={{
          kind: 'drawing',
          bg: 'paper',
          strokes: [{ c: 'jamaica', w: 8, p: [10, 10, 200, 300] }],
        }}
      />,
    );
    expect(screen.getByLabelText('Story con un dibujo')).toBeTruthy();
  });
});

describe('StoriesRowView', () => {
  const base = {
    myName: 'Alita',
    partnerName: 'Caleb',
    mineCount: 0,
    partnerCount: 0,
    partnerUnseen: 0,
    onPressMine: jest.fn(),
    onPressPartner: jest.fn(),
  };

  it('sin story tuya invita a crear y la pareja sin story se apaga', async () => {
    await renderFrame(<StoriesRowView {...base} />);
    expect(screen.getByRole('button', { name: 'Crear una story' })).toBeTruthy();
    expect(screen.getByText('Nada hoy')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Caleb no tiene story' })).toBeDisabled();
    expect(screen.queryByText('Nueva')).toBeNull();
  });

  it('con stories nuevas de tu pareja lo marca y abre el visor', async () => {
    const onPressPartner = jest.fn();
    await renderFrame(
      <StoriesRowView
        {...base}
        mineCount={1}
        partnerCount={2}
        partnerUnseen={1}
        onPressPartner={onPressPartner}
      />,
    );
    expect(screen.getByText('Nueva')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tu story, 1 activa' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Story nueva de Caleb' }));
    expect(onPressPartner).toHaveBeenCalled();
  });

  it('con todo visto no marca nada como nuevo', async () => {
    await renderFrame(<StoriesRowView {...base} partnerCount={1} partnerUnseen={0} />);
    expect(screen.queryByText('Nueva')).toBeNull();
    expect(screen.getByRole('button', { name: 'Story de Caleb' })).toBeTruthy();
  });
});

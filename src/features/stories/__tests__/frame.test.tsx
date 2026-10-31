import { fireEvent, render, screen } from '@testing-library/react-native';

import { STORY_BGS } from '@/lib/stories';
import { ThemeProvider, darkColors, lightColors } from '@/theme';

import { StoriesRowView } from '../components/StoriesRow';
import { StoryFrame, storyBgColor, storyTextColor } from '../components/StoryFrame';

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
  for (const [mode, palette] of [
    ['claro', lightColors],
    ['noche', darkColors],
  ] as const) {
    it.each(STORY_BGS)(`el texto sobre ${'%s'} tiene contraste >= 4.5:1 (${mode})`, (bg) => {
      const ratio = contrast(storyTextColor(bg, palette), storyBgColor(bg, palette));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }
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

  it('foto: pone el pie a mano y la describe', async () => {
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

  it('sin story tuya invita a pegar y la pareja sin story se apaga', async () => {
    await renderFrame(<StoriesRowView {...base} />);
    expect(screen.getByRole('button', { name: 'Pega una story' })).toBeTruthy();
    expect(screen.getByText('sin story')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Caleb no tiene story' })).toBeDisabled();
    expect(screen.queryByText('NUEVA')).toBeNull();
  });

  it('con stories nuevas de tu pareja muestra el sello NUEVA y abre el visor', async () => {
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
    expect(screen.getByText('NUEVA')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tu story, 1 activa' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Story nueva de Caleb' }));
    expect(onPressPartner).toHaveBeenCalled();
  });

  it('con todo visto no muestra NUEVA', async () => {
    await renderFrame(<StoriesRowView {...base} partnerCount={1} partnerUnseen={0} />);
    expect(screen.queryByText('NUEVA')).toBeNull();
    expect(screen.getByRole('button', { name: 'Story de Caleb' })).toBeTruthy();
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';

import { distanceView, type LocationRowLike } from '@/lib/distance';
import { ThemeProvider } from '@/theme';

import { DistanceCardView } from '../components/DistanceCard';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../hooks', () => ({ useDistance: jest.fn() }));

const NOW = new Date('2026-10-30T18:00:00Z');
const row = (id: string, lat: number, lng: number, city: string): LocationRowLike => ({
  user_id: id,
  lat,
  lng,
  city,
  updated_at: '2026-10-30T16:00:00Z',
});
const me = row('me', 19.43, -99.13, 'Ciudad de México');
const her = row('her', 25.67, -100.31, 'Monterrey');

const show = async (rows: LocationRowLike[], onPress = jest.fn()) => {
  await render(
    <ThemeProvider>
      <DistanceCardView
        view={distanceView(rows, 'me', 'her', NOW)}
        partnerName="Caleb"
        onPress={onPress}
      />
    </ThemeProvider>,
  );
  return onPress;
};

describe('DistanceCardView', () => {
  it('con los dos: km, ciudades y toca para abrir', async () => {
    const onPress = await show([me, her]);
    expect(await screen.findByText('704 km')).toBeTruthy();
    expect(screen.getByText('Ciudad de México ↔ Monterrey')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/Distancia: 704 kilómetros/));
    expect(onPress).toHaveBeenCalled();
  });

  it('sin nadie: invita a activar', async () => {
    await show([]);
    expect(await screen.findByText('Activar mi distancia')).toBeTruthy();
  });

  it('solo yo: espera a la pareja', async () => {
    await show([me]);
    expect(await screen.findByText(/Cuando Caleb active la suya/)).toBeTruthy();
  });

  it('solo mi pareja: me invita a activar la mía', async () => {
    await show([her]);
    expect(await screen.findByText(/Caleb ya comparte su distancia/)).toBeTruthy();
  });
});

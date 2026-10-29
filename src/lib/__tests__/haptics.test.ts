import * as Haptics from 'expo-haptics';

import { haptic } from '../haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.reject(new Error('sin motor'))),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

describe('haptic', () => {
  it('llama a expo-haptics y tolera errores', () => {
    expect(() => haptic.stick()).not.toThrow();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    haptic.success();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });
});

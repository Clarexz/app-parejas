import { onboardingStage, type OnboardingInput } from '../onboarding';

const base: OnboardingInput = {
  sessionLoading: false,
  hasSession: true,
  profileLoading: false,
  profileError: false,
  displayName: 'Ana',
  coupleLoading: false,
  coupleError: false,
  memberCount: 2,
};
const stage = (o: Partial<OnboardingInput>) => onboardingStage({ ...base, ...o });

describe('onboardingStage', () => {
  it('loading mientras carga sesión, perfil o pareja', () => {
    expect(stage({ sessionLoading: true })).toBe('loading');
    expect(stage({ profileLoading: true, displayName: undefined })).toBe('loading');
    expect(stage({ coupleLoading: true, memberCount: null })).toBe('loading');
  });
  it('signed_out sin sesión', () => {
    expect(stage({ hasSession: false })).toBe('signed_out');
  });
  it('error en perfil o pareja', () => {
    expect(stage({ profileError: true })).toBe('error');
    expect(stage({ coupleError: true, memberCount: null })).toBe('error');
  });
  it('profile sin nombre', () => {
    expect(stage({ displayName: null })).toBe('profile');
    expect(stage({ displayName: '  ' })).toBe('profile');
    expect(stage({ displayName: undefined })).toBe('profile');
  });
  it('couple sin pareja', () => {
    expect(stage({ memberCount: 0 })).toBe('couple');
    expect(stage({ memberCount: null })).toBe('couple');
  });
  it('waiting con 1 miembro y ready con 2', () => {
    expect(stage({ memberCount: 1 })).toBe('waiting');
    expect(stage({ memberCount: 2 })).toBe('ready');
  });
});

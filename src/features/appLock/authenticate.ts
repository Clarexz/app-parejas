import * as LocalAuthentication from 'expo-local-authentication';

/** Pide huella, o el PIN/patrón del celular como respaldo. `true` si pasó. */
export async function authenticate(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear ahorita',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

/** ¿El celular tiene huella o bloqueo de pantalla configurado? */
export async function canAuthenticate(): Promise<boolean> {
  try {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hardware && enrolled;
  } catch {
    return false;
  }
}

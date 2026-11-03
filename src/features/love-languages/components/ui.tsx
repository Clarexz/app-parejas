import { useRouter } from 'expo-router';

/** Volver; si se entró por un aviso (sin historial) cae en Más. */
export function useGoBack() {
  const router = useRouter();
  return () => {
    if (router.canGoBack?.() ?? true) router.back();
    else router.replace('/more');
  };
}

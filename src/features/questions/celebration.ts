import { create } from 'zustand';

type CelebrationState = {
  /** Sube cada vez que se pide una celebración. */
  nonce: number;
  celebrate: () => void;
};

/** Pide la celebración de "día completo"; la dibuja `QuestionsEvents` en la raíz de la app. */
export const useCelebrationStore = create<CelebrationState>((set) => ({
  nonce: 0,
  celebrate: () => set((s) => ({ nonce: s.nonce + 1 })),
}));

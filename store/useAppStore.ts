import { create } from 'zustand';
import type { Theme, Language, Screen, User } from '../types';

interface AppState {
  theme: Theme;
  language: Language;
  screen: Screen;
  currentDeckId: string | null;
  currentCardId: string | null;
  screenParams: Record<string, any> | null;
  isLoading: boolean;
  error: string | null;
  user: User | null;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setScreen: (screen: Screen, deckId?: string, cardId?: string, params?: Record<string, any>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  language: 'en',
  screen: 'login',
  currentDeckId: null,
  currentCardId: null,
  screenParams: null,
  isLoading: false,
  error: null,
  user: null,
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  setScreen: (screen, deckId, cardId, params) => set({ 
    screen, 
    currentDeckId: deckId !== undefined ? deckId : null,
    currentCardId: cardId !== undefined ? cardId : null,
    screenParams: params !== undefined ? params : null,
  }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  login: (user) => set({ user, screen: 'decks' }),
  logout: () => set({ user: null, screen: 'login', currentDeckId: null, currentCardId: null, screenParams: null }),
}));
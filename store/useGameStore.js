'use client';

import { create } from 'zustand';

export const useGameStore = create(set => ({
  slot: 'default',
  language: 'vi',
  playerName: 'V',
  gangName: 'SOLO',
  status: 'booting',
  message: 'BOOTING NIGHT CITY',
  lastSavedAt: null,
  setLanguage: language => set({ language }),
  setPlayerName: playerName => set({ playerName }),
  setGangName: gangName => set({ gangName }),
  setStatus: (status, message) => set({ status, message }),
  markSaved: () => set({ status: 'synced', message: 'CLOUD SAVE SYNCED', lastSavedAt: new Date().toISOString() }),
}));

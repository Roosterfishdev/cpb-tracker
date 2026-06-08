import { create } from 'zustand'

interface ToastState {
  message: string | null
  show: (message: string) => void
  dismiss: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  dismiss: () => set({ message: null }),
}))

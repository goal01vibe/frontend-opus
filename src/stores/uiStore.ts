import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarExpanded: boolean
  sidebarHovered: boolean
  theme: 'light' | 'dark' | 'system'
  searchOpen: boolean
  activeView: string
  drawerOpen: boolean
  selectedId: number | null
  devMode: boolean
  setSidebarExpanded: (expanded: boolean) => void
  setSidebarHovered: (hovered: boolean) => void
  setTheme: (theme: UIState['theme']) => void
  setSearchOpen: (open: boolean) => void
  setActiveView: (view: string) => void
  setDrawerOpen: (open: boolean) => void
  setSelectedId: (id: number | null) => void
  openDrawer: (id: number) => void
  closeDrawer: () => void
  setDevMode: (enabled: boolean) => void
  toggleDevMode: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarExpanded: false,
      sidebarHovered: false,
      theme: 'light',
      searchOpen: false,
      activeView: 'dashboard',
      drawerOpen: false,
      selectedId: null,
      devMode: false,
      setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
      setSidebarHovered: (hovered) => set({ sidebarHovered: hovered }),
      setTheme: (theme) => set({ theme }),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setActiveView: (view) => set({ activeView: view }),
      setDrawerOpen: (open) => set({ drawerOpen: open }),
      setSelectedId: (id) => set({ selectedId: id }),
      openDrawer: (id) => set({ drawerOpen: true, selectedId: id }),
      closeDrawer: () => set({ drawerOpen: false, selectedId: null }),
      setDevMode: (enabled) => set({ devMode: enabled }),
      toggleDevMode: () => set((state) => ({ devMode: !state.devMode })),
    }),
    {
      name: 'ui-storage',
      // Persister devMode pour que le choix soit conservé entre sessions
      partialize: (state) => ({
        sidebarExpanded: state.sidebarExpanded,
        theme: state.theme,
        activeView: state.activeView,
        devMode: state.devMode,
      }),
    }
  )
)

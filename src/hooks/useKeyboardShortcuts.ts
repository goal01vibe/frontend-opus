import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const { setSearchOpen, closeDrawer } = useUIStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input/textarea
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        if (e.key !== 'Escape') return
      }

      const isMod = e.ctrlKey || e.metaKey

      // Search - Ctrl/Cmd + K
      if (isMod && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        return
      }

      // Upload - Ctrl/Cmd + U
      if (isMod && e.key === 'u') {
        e.preventDefault()
        // Could open upload modal
        return
      }

      // Export - Ctrl/Cmd + E
      if (isMod && e.key === 'e') {
        e.preventDefault()
        navigate('/export')
        return
      }

      // Escape - close modals/drawers
      if (e.key === 'Escape') {
        setSearchOpen(false)
        closeDrawer()
        return
      }

      // Navigation shortcuts with numbers
      if (isMod && e.key === '1') {
        e.preventDefault()
        navigate('/')
      }
      if (isMod && e.key === '2') {
        e.preventDefault()
        navigate('/extractions')
      }
      if (isMod && e.key === '3') {
        e.preventDefault()
        navigate('/fournisseurs')
      }

      // Help - ?
      if (e.key === '?' && !isMod) {
        // Could show help modal
        console.log('Keyboard shortcuts:')
        console.log('Ctrl+K: Search')
        console.log('Ctrl+E: Export')
        console.log('Ctrl+1/2/3: Navigate')
        console.log('Escape: Close')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate, setSearchOpen, closeDrawer])
}

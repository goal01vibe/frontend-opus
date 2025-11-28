import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Building2,
  Puzzle,
  Settings,
  FileDown,
  Terminal,
  Server,
  BarChart3,
  Cog,
  LogOut,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface MenuItem {
  id: string
  icon: React.ElementType
  label: string
  path?: string
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
  { id: 'extractions', icon: FileText, label: 'Extractions', path: '/extractions' },
  { id: 'fournisseurs', icon: Building2, label: 'Fournisseurs', path: '/fournisseurs' },
  { id: 'templates', icon: Puzzle, label: 'Templates', path: '/templates' },
  {
    id: 'admin',
    icon: Settings,
    label: 'Administration',
    children: [
      { id: 'logs', icon: Terminal, label: 'Logs temps réel', path: '/admin/logs' },
      { id: 'workers', icon: Server, label: 'Workers Celery', path: '/admin/workers' },
      { id: 'metrics', icon: BarChart3, label: 'Métriques', path: '/admin/metrics' },
      { id: 'template-mgmt', icon: Cog, label: 'Gestion Templates', path: '/admin/templates' },
    ],
  },
  { id: 'export', icon: FileDown, label: 'Exports', path: '/export' },
]

export function Sidebar() {
  const [isHovered, setIsHovered] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['admin'])
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path?: string) => {
    if (!path) return false
    return location.pathname === path
  }

  const isParentActive = (item: MenuItem) => {
    if (item.children) {
      return item.children.some(child => isActive(child.path))
    }
    return isActive(item.path)
  }

  const toggleExpanded = (id: string) => {
    setExpandedMenus(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleClick = (item: MenuItem) => {
    if (item.children) {
      toggleExpanded(item.id)
    } else if (item.path) {
      navigate(item.path)
    }
  }

  return (
    <>
      {/* Placeholder to maintain layout - always 16px wide */}
      <div className="w-16 flex-shrink-0 hidden md:block" />

      {/* Actual sidebar - fixed position, overlays on expand */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full bg-slate-900 text-white shadow-xl',
          'flex flex-col border-r border-slate-700',
          'transition-[width] duration-300 ease-out',
          'hidden md:flex z-40',
          isHovered ? 'w-64' : 'w-16'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-700/50 mb-2 overflow-hidden whitespace-nowrap">
          <div className="w-8 flex justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <span
            className={cn(
              'ml-3 font-bold text-lg tracking-wider transition-all duration-300',
              isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            )}
          >
            PDF<span className="text-blue-500">Extract</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1 pt-4 overflow-hidden">
          {menuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => handleClick(item)}
                className={cn(
                  'w-full flex items-center px-3 py-3 rounded-lg transition-colors duration-200 group relative',
                  isParentActive(item)
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <div className="w-6 flex justify-center flex-shrink-0">
                  <item.icon
                    className={cn(
                      'w-5 h-5',
                      isParentActive(item) ? 'text-white' : 'group-hover:text-blue-400'
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'ml-3 text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden flex-1 text-left',
                    isHovered ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'
                  )}
                >
                  {item.label}
                </span>
                {item.children && isHovered && (
                  <div className="flex-shrink-0">
                    {expandedMenus.includes(item.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                )}

                {/* Tooltip when collapsed */}
                {!isHovered && (
                  <div className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap ml-2 shadow-lg border border-slate-700">
                    {item.label}
                  </div>
                )}
              </button>

              {/* Children */}
              {item.children && isHovered && expandedMenus.includes(item.id) && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => child.path && navigate(child.path)}
                      className={cn(
                        'w-full flex items-center px-3 py-2 rounded-lg transition-colors duration-200 group',
                        isActive(child.path)
                          ? 'bg-blue-600/50 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      )}
                    >
                      <div className="w-5 flex justify-center flex-shrink-0">
                        <child.icon className="w-4 h-4" />
                      </div>
                      <span className="ml-3 text-sm whitespace-nowrap">{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-slate-700/50 mt-auto overflow-hidden">
          <button className="w-full flex items-center px-3 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors group">
            <div className="w-6 flex justify-center flex-shrink-0">
              <Settings className="w-5 h-5 group-hover:text-gray-300" />
            </div>
            <span
              className={cn(
                'ml-3 text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden',
                isHovered ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'
              )}
            >
              Paramètres
            </span>
          </button>
          <button className="w-full flex items-center px-3 py-3 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors group mt-1">
            <div className="w-6 flex justify-center flex-shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <span
              className={cn(
                'ml-3 text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden',
                isHovered ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'
              )}
            >
              Déconnexion
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

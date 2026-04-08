import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

const TABS = [
  { to: '/',         icon: '🏎️', label: 'Garage'   },
  { to: '/discover', icon: '🔍', label: 'Discover'  },
  { to: '/search',   icon: '🔎', label: 'Search'    },
  { to: '/profile',  icon: '👤', label: 'Profile'   },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-2 pb-safe">
        {TABS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${
                isActive ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <motion.span
                  className="text-2xl leading-none"
                  animate={{ scale: isActive ? 1.15 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {icon}
                </motion.span>
                <span className={`text-xs font-medium ${isActive ? 'text-orange-500' : ''}`}>
                  {label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-1 w-1 h-1 bg-orange-500 rounded-full"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
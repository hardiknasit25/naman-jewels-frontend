import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut, SunMoon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { bottomNavItems, navItems, type NavItem } from '@/config/nav'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useAuth } from '@/features/auth/AuthContext'

const activeClasses = 'bg-primary text-primary-foreground hover:bg-primary/90'

function RailItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { label, path, icon: Icon } = item
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <NavLink
            to={path}
            aria-label={label}
            className={cn(
              'flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              isActive && activeClasses
            )}
          />
        }
      >
        <Icon className="size-5" />
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

/** Icon-only vertical rail shown on md+ screens. Profile pinned to the bottom. */
function DesktopSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <aside className="hidden w-16 shrink-0 flex-col items-center gap-2 border-r bg-sidebar py-4 md:flex">
      <div className="mb-4 flex size-9 items-center justify-center rounded-xl bg-primary font-heading text-sm font-semibold text-primary-foreground">
        NJ
      </div>
      <nav className="flex flex-col items-center gap-1">
        {navItems.map((item) => (
          <RailItem key={item.path} item={item} isActive={pathname.startsWith(item.path)} />
        ))}
      </nav>

      {/* Bottom-pinned items (theme toggle, Profile, logout). */}
      <nav className="mt-auto flex flex-col items-center gap-1 border-t pt-3">
        <ThemeToggle className="size-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground" />
        {bottomNavItems.map((item) => (
          <RailItem key={item.path} item={item} isActive={pathname.startsWith(item.path)} />
        ))}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label="Logout"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
                className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              />
            }
          >
            <LogOut className="size-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Logout</TooltipContent>
        </Tooltip>
      </nav>
    </aside>
  )
}

function MobileNavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const { label, path, icon: Icon } = item
  return (
    <NavLink
      to={path}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          isActive && activeClasses
        )
      }
    >
      <Icon className="size-5" />
      {label}
    </NavLink>
  )
}

/** Full menu with labels, shown inside the mobile Sheet. */
function MobileMenu({ onNavigate }: { onNavigate: () => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map((item) => (
          <MobileNavLink key={item.path} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t px-3 py-3">
        {/* Theme control inside the mobile sidebar. */}
        <div className="flex items-center justify-between rounded-xl px-3 py-1">
          <span className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <SunMoon className="size-5" /> Theme
          </span>
          <ThemeToggle />
        </div>

        {bottomNavItems.map((item) => (
          <MobileNavLink key={item.path} item={item} onNavigate={onNavigate} />
        ))}

        <button
          type="button"
          onClick={() => {
            logout()
            onNavigate()
            navigate('/login', { replace: true })
          }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-5" /> Logout
        </button>
      </div>
    </div>
  )
}

export function DashboardLayout() {
  const [open, setOpen] = useState(false)

  return (
    // h-screen + overflow-hidden lets the page area own its own scrolling,
    // so the grid can fill the remaining height.
    <div className="flex h-screen overflow-hidden bg-background">
      <DesktopSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar with hamburger (top-left). */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <span className="font-heading text-sm font-semibold">Naman Jewels</span>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="left" className="flex w-64 flex-col gap-4 p-0 pt-6">
              <SheetHeader className="px-6 pt-0 pb-2">
                <SheetTitle>Naman Jewels</SheetTitle>
              </SheetHeader>
              <MobileMenu onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

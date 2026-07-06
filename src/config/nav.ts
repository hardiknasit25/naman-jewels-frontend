import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  Layers,
  MessageSquareText,
  GalleryHorizontalEnd,
  FileText,
  CircleUser,
  History,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

// Main navigation (top of the sidebar).
export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', path: '/products', icon: Package },
  { label: 'Category', path: '/category', icon: Tags },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Customer Types', path: '/customer-types', icon: Layers },
  { label: 'Inquiries', path: '/inquiries', icon: MessageSquareText },
  { label: 'Banners', path: '/banners', icon: GalleryHorizontalEnd },
  { label: 'Pages', path: '/pages', icon: FileText },
  { label: 'Session Logs', path: '/session-logs', icon: History },
  { label: 'Audit Logs', path: '/audit-logs', icon: ScrollText },
]

// Pinned to the bottom of the sidebar.
export const bottomNavItems: NavItem[] = [
  { label: 'Profile', path: '/profile', icon: CircleUser },
]

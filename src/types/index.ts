// ---------------------------------------------------------------------------
// Domain types for the Naman Jewels admin panel.
// These mirror the fields captured in the requirement documents.
// ---------------------------------------------------------------------------

export type Id = number

export interface Timestamped {
  id: Id
  createdAt: string
}

// 4.5 Customer Types Management — configurable tiers with a hierarchy order.
export interface CustomerType extends Timestamped {
  name: string
  /** Lower number = lower tier. Drives the hierarchy (Public < Gold < Platinum). */
  order: number
  description?: string
}

export type CustomerStatus = 'pending' | 'active' | 'blocked' | 'rejected'

/** Preset session durations (4.4 Session Duration Settings). */
export type SessionDuration = '2h' | '4h' | '12h' | '1d' | '1w' | '1m'

export const SESSION_DURATION_LABELS: Record<SessionDuration, string> = {
  '2h': '2 Hours',
  '4h': '4 Hours',
  '12h': '12 Hours',
  '1d': '1 Day',
  '1w': '1 Week',
  '1m': '1 Month',
}

// 4.4 Customer (User) Management
export interface Customer extends Timestamped {
  companyName: string
  mobileNumber: string
  email: string
  address: string
  city: string
  referenceBy?: string
  /** References CustomerType.id. Empty while a registration is pending. */
  customerTypeId: Id | null
  status: CustomerStatus
  lastLogin: string | null
  sessionDuration: SessionDuration
}

export interface Category extends Timestamped {
  name: string
  /** null = top-level category; otherwise the parent category id (sub-category). */
  parentId: Id | null
  description?: string
}

// 3.5 Product Parameters / Specifications — note: no price/MRP field.
export interface Product extends Timestamped {
  name: string
  sku: string
  categoryId: Id
  grossWeight: number
  netWeight?: number | null
  size?: string
  purity: string
  stoneDetails?: string
  notes?: string
  /** Data URL (uploaded) or remote image URL. Empty when no image. */
  imageUrl?: string
}

// 4.8 App Content Management — home hero banners / images.
export interface Banner extends Timestamped {
  title: string
  imageUrl: string
  linkUrl?: string
  active: boolean
  order: number
}

// 4.8 App Content Management — static pages edited via a rich text editor.
export interface StaticPage extends Timestamped {
  title: string
  /** Rich HTML content. */
  content: string
  updatedAt: string
}

// Login sessions recorded by the backend (who signed in, when, from where).
export interface SessionLog extends Timestamped {
  adminId: Id | null
  email: string | null
  ip: string | null
  userAgent: string | null
  loginAt: string
  expiresAt: string | null
  logoutAt: string | null
  active: boolean
}

// Audit trail of state-changing actions (create/update/delete/login/logout).
export interface AuditLog extends Timestamped {
  adminId: Id | null
  adminEmail: string | null
  action: string
  entity: string
  entityId: Id | null
  changes: string | null
  ip: string | null
}

export type InquiryStatus = 'New' | 'Seen' | 'Responded' | 'Closed'

// 4.6 Inquiry Management
export interface Inquiry extends Timestamped {
  customerId: Id
  productId: Id
  quantity: number
  remark?: string
  status: InquiryStatus
}

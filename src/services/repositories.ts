import { collection } from '@/services/db'
import type {
  AuditLog,
  Banner,
  Category,
  Customer,
  CustomerType,
  Inquiry,
  Product,
  SessionLog,
  StaticPage,
} from '@/types'

// One repository per entity. These are the ONLY files that talk to the data
// source. Each maps to a REST resource served by the backend (see db.ts).
export const customerTypesRepo = collection<CustomerType>('customerTypes')
export const customersRepo = collection<Customer>('customers')
export const categoriesRepo = collection<Category>('categories')
export const productsRepo = collection<Product>('products')
export const inquiriesRepo = collection<Inquiry>('inquiries')
export const bannersRepo = collection<Banner>('banners')
export const staticPagesRepo = collection<StaticPage>('staticPages')

// Read-only audit/session trails.
export const sessionLogsRepo = collection<SessionLog>('sessionLogs')
export const auditLogsRepo = collection<AuditLog>('auditLogs')

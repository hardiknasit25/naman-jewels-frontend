import { useMemo, type ReactNode } from 'react'
import { MessageSquareText, Users, Package, UserCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/charts/StatCard'
import { BarList } from '@/components/charts/BarList'
import { ColumnChart } from '@/components/charts/ColumnChart'
import { Donut } from '@/components/charts/Donut'
import { colorAt } from '@/components/charts/colors'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import {
  useListBannersQuery,
  useListCategoriesQuery,
  useListCustomerTypesQuery,
  useListCustomersQuery,
  useListInquiriesQuery,
  useListProductsQuery,
} from '@/services/api'
import type { InquiryStatus } from '@/types'

const statusClass: Record<InquiryStatus, string> = {
  New: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  Seen: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  Responded: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  Closed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { data: customers = [], isLoading: loadingCustomers } = useListCustomersQuery()
  const { data: types = [], isLoading: loadingTypes } = useListCustomerTypesQuery()
  const { data: categories = [], isLoading: loadingCategories } = useListCategoriesQuery()
  const { data: products = [], isLoading: loadingProducts } = useListProductsQuery()
  const { data: inquiries = [], isLoading: loadingInquiries } = useListInquiriesQuery()
  const { data: banners = [], isLoading: loadingBanners } = useListBannersQuery()

  // Every tile on this page is derived from all six lists, so a partial load
  // would render believable-looking zeros. Hold the whole page until they land.
  const loading =
    loadingCustomers ||
    loadingTypes ||
    loadingCategories ||
    loadingProducts ||
    loadingInquiries ||
    loadingBanners

  const m = useMemo(() => {
    const categoryById = new Map(categories.map((c) => [c.id, c.name]))
    const productById = new Map(products.map((p) => [p.id, p]))
    const customerById = new Map(customers.map((c) => [c.id, c]))
    const typeById = new Map(types.map((t) => [t.id, t.name]))

    const activeCustomers = customers.filter((c) => c.status === 'active')
    const pending = customers.filter((c) => c.status === 'pending')

    const byCategory = new Map<string, number>()
    const byType = new Map<string, number>()
    const byProduct = new Map<string, number>()
    const byDay = new Map<string, number>()
    const usersByType = new Map<string, number>()

    for (const inq of inquiries) {
      const product = productById.get(inq.productId)
      const catName = product ? categoryById.get(product.categoryId) ?? '—' : '—'
      byCategory.set(catName, (byCategory.get(catName) ?? 0) + 1)

      const cust = customerById.get(inq.customerId)
      const typeName = cust?.customerTypeId ? typeById.get(cust.customerTypeId) ?? '—' : 'Unassigned'
      byType.set(typeName, (byType.get(typeName) ?? 0) + 1)

      byProduct.set(product ? product.name : '—', (byProduct.get(product ? product.name : '—') ?? 0) + 1)
      byDay.set(inq.createdAt.slice(0, 10), (byDay.get(inq.createdAt.slice(0, 10)) ?? 0) + 1)
    }
    for (const c of activeCustomers) {
      const typeName = c.customerTypeId ? typeById.get(c.customerTypeId) ?? '—' : 'Unassigned'
      usersByType.set(typeName, (usersByType.get(typeName) ?? 0) + 1)
    }

    const sortList = (map: Map<string, number>) =>
      [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)

    const recent = [...inquiries]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((inq) => ({
        id: inq.id,
        customer: customerById.get(inq.customerId)?.companyName ?? '—',
        product: productById.get(inq.productId)?.name ?? '—',
        status: inq.status,
        createdAt: inq.createdAt,
      }))

    return {
      totalInquiries: inquiries.length,
      activeCount: activeCustomers.length,
      pendingCount: pending.length,
      productCount: products.length,
      byCategory: sortList(byCategory).slice(0, 6).map((d, i) => ({ ...d, color: colorAt(i) })),
      byType: sortList(byType).map((d, i) => ({ ...d, color: colorAt(i) })),
      topProducts: sortList(byProduct).slice(0, 5),
      overTime: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, value]) => ({
          label: new Date(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          value,
        })),
      usersByType: sortList(usersByType).map((d, i) => ({ ...d, color: colorAt(i) })),
      recent,
    }
  }, [customers, types, categories, products, inquiries])

  const activeBanners = useMemo(
    () => [...banners].filter((b) => b.active).sort((a, b) => a.order - b.order),
    [banners]
  )

  // Skeleton mirrors the real layout, so the page doesn't jump when data lands.
  if (loading) {
    return (
      <div className="scrollbar-tw flex h-full flex-col gap-6 overflow-y-auto" aria-busy="true">
        <PageHeader title="Dashboard" description="Overview of inquiries, products and customers." />
        <span className="sr-only" role="status">
          Loading dashboard…
        </span>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="size-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-7 w-16 rounded-md" />
                  <Skeleton className="mt-2 h-4 w-24 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Inquiries Over Time" className="lg:col-span-2">
            <Skeleton className="h-56 w-full" />
          </ChartCard>
          <ChartCard title="Users by Customer Type">
            <Skeleton className="h-56 w-full" />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {['Inquiries by Category', 'Inquiries by Customer Type', 'Top Inquired Products'].map(
            (title) => (
              <ChartCard key={title} title={title}>
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full rounded-md" />
                  ))}
                </div>
              </ChartCard>
            )
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Recent Inquiries" className="lg:col-span-2">
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="mt-2 h-3 w-24 rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </ChartCard>
          <ChartCard title="Active Home Banners">
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-20 shrink-0 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded-md" />
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>
    )
  }

  return (
    <div className="scrollbar-tw flex h-full flex-col gap-6 overflow-y-auto">
      <PageHeader title="Dashboard" description="Overview of inquiries, products and customers." />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Inquiries"
          value={m.totalInquiries}
          icon={<MessageSquareText className="size-5" />}
          accentClassName="bg-blue-500/15 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="Active Users"
          value={m.activeCount}
          hint={`${m.pendingCount} pending approval`}
          icon={<UserCheck className="size-5" />}
          accentClassName="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Customers"
          value={customers.length}
          icon={<Users className="size-5" />}
          accentClassName="bg-violet-500/15 text-violet-600 dark:text-violet-400"
        />
        <StatCard
          label="Products"
          value={m.productCount}
          icon={<Package className="size-5" />}
          accentClassName="bg-amber-500/15 text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Primary row: trend (wide) + distribution */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Inquiries Over Time" className="lg:col-span-2">
          <ColumnChart data={m.overTime} />
        </ChartCard>
        <ChartCard title="Users by Customer Type">
          <Donut data={m.usersByType} />
        </ChartCard>
      </div>

      {/* Secondary row: three bar lists */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Inquiries by Category">
          <BarList data={m.byCategory} />
        </ChartCard>
        <ChartCard title="Inquiries by Customer Type">
          <BarList data={m.byType} />
        </ChartCard>
        <ChartCard title="Top Inquired Products">
          <BarList data={m.topProducts} />
        </ChartCard>
      </div>

      {/* Recent activity + active banners */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            {m.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No inquiries yet</p>
            ) : (
              <ul className="divide-y">
                {m.recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.customer}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.product}</p>
                    </div>
                    <Badge variant="ghost" className={statusClass[r.status]}>
                      {r.status}
                    </Badge>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                      {formatDateTime(r.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Home Banners</CardTitle>
          </CardHeader>
          <CardContent>
            {activeBanners.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No active banners</p>
            ) : (
              <div className="flex flex-col gap-2">
                {activeBanners.map((b) => (
                  <div key={b.id} className="flex items-center gap-3">
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="h-10 w-20 shrink-0 rounded-md object-cover ring-1 ring-border"
                    />
                    <span className="truncate text-sm">{b.title}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

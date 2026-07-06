import { PageHeader } from '@/components/shared/PageHeader'
import { CustomerTypesTab } from '@/features/customers/CustomerTypesTab'

export function CustomerTypesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Customer Types"
        description="Manage tiers and their hierarchy (Public, Gold, Platinum, …)."
      />
      <CustomerTypesTab />
    </div>
  )
}

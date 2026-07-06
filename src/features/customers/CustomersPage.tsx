import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { toast } from 'sonner'
import { Plus, Pencil, Ban, CheckCircle2, LogOut, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react'
import { DataGrid } from '@/components/data/DataGrid'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CustomerFormDialog } from '@/features/customers/CustomerFormDialog'
import { ApproveDialog } from '@/features/customers/ApproveDialog'
import { formatDateTime } from '@/lib/format'
import {
  useDeleteCustomerMutation,
  useListCustomerTypesQuery,
  useListCustomersQuery,
  useUpdateCustomerMutation,
} from '@/services/api'
import type { Customer, Id } from '@/types'

function StatusBadge({ status }: { status: Customer['status'] }) {
  const map: Record<Customer['status'], { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    blocked: { label: 'Blocked', className: 'bg-destructive/15 text-destructive' },
    pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    rejected: { label: 'Rejected', className: 'bg-muted text-muted-foreground' },
  }
  const { label, className } = map[status]
  return <Badge variant="ghost" className={className}>{label}</Badge>
}

export function CustomersPage() {
  const { data: customers, isLoading } = useListCustomersQuery()
  const { data: types } = useListCustomerTypesQuery()
  const [updateCustomer] = useUpdateCustomerMutation()
  const [deleteCustomer] = useDeleteCustomerMutation()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | undefined>()
  const [approving, setApproving] = useState<Customer | undefined>()
  const [toDelete, setToDelete] = useState<Customer | undefined>()

  const typeName = useMemo(() => {
    const m = new Map((types ?? []).map((t) => [t.id, t.name]))
    return (id: Id | null) => (id != null ? m.get(id) ?? '—' : '—')
  }, [types])

  const approved = useMemo(
    () => (customers ?? []).filter((c) => c.status === 'active' || c.status === 'blocked'),
    [customers]
  )
  const pending = useMemo(
    () => (customers ?? []).filter((c) => c.status === 'pending'),
    [customers]
  )

  const openEdit = (c: Customer) => {
    setEditing(c)
    setFormOpen(true)
  }

  const toggleBlock = async (c: Customer) => {
    const next = c.status === 'blocked' ? 'active' : 'blocked'
    await updateCustomer({ id: c.id, patch: { status: next } }).unwrap()
    toast.success(next === 'blocked' ? 'Customer blocked' : 'Customer unblocked')
  }

  const forceLogout = async (c: Customer) => {
    await updateCustomer({ id: c.id, patch: { lastLogin: null } }).unwrap()
    toast.success(`Session ended for ${c.companyName}`)
  }

  const reject = async (c: Customer) => {
    await updateCustomer({ id: c.id, patch: { status: 'rejected' } }).unwrap()
    toast.success('Registration rejected')
  }

  const approvedColumns = useMemo<ColDef<Customer>[]>(
    () => [
      { headerName: 'Company', field: 'companyName', minWidth: 180 },
      { headerName: 'Mobile', field: 'mobileNumber', minWidth: 140 },
      { headerName: 'Email', field: 'email', minWidth: 200 },
      { headerName: 'City', field: 'city' },
      {
        headerName: 'Type',
        colId: 'type',
        valueGetter: (p) => typeName(p.data?.customerTypeId ?? null),
        cellRenderer: (p: { value: string }) => <Badge variant="secondary">{p.value}</Badge>,
      },
      {
        headerName: 'Status',
        field: 'status',
        cellRenderer: (p: { data: Customer }) => <StatusBadge status={p.data.status} />,
      },
      {
        headerName: 'Last Login',
        field: 'lastLogin',
        minWidth: 170,
        valueFormatter: (p) => formatDateTime(p.value),
      },
      {
        headerName: 'Actions',
        pinned: 'right',
        width: 160,
        minWidth: 160,
        sortable: false,
        filter: false,
        resizable: false,
        cellClass: 'px-2!',
        headerClass: 'nj-center-header',
        cellRenderer: (p: { data: Customer }) => (
          <RowActions
            items={[
              { label: 'Edit', icon: <Pencil className="size-4" />, onClick: () => openEdit(p.data) },
              {
                label: p.data.status === 'blocked' ? 'Unblock' : 'Block',
                icon: p.data.status === 'blocked' ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />,
                onClick: () => toggleBlock(p.data),
              },
              { label: 'Force Logout', icon: <LogOut className="size-4" />, onClick: () => forceLogout(p.data) },
              {
                label: 'Delete',
                icon: <Trash2 className="size-4" />,
                destructive: true,
                separatorBefore: true,
                onClick: () => setToDelete(p.data),
              },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeName]
  )

  const pendingColumns = useMemo<ColDef<Customer>[]>(
    () => [
      { headerName: 'Company', field: 'companyName', minWidth: 180 },
      { headerName: 'Mobile', field: 'mobileNumber', minWidth: 140 },
      { headerName: 'Email', field: 'email', minWidth: 200 },
      { headerName: 'City', field: 'city' },
      { headerName: 'Reference By', field: 'referenceBy', valueFormatter: (p) => p.value || '—' },
      {
        headerName: 'Submitted',
        field: 'createdAt',
        minWidth: 170,
        valueFormatter: (p) => formatDateTime(p.value),
      },
      {
        headerName: 'Actions',
        pinned: 'right',
        width: 130,
        minWidth: 130,
        sortable: false,
        filter: false,
        resizable: false,
        cellClass: 'px-2!',
        headerClass: 'nj-center-header',
        cellRenderer: (p: { data: Customer }) => (
          <RowActions
            items={[
              { label: 'Approve', icon: <ThumbsUp className="size-4" />, onClick: () => setApproving(p.data) },
              { label: 'Reject', icon: <ThumbsDown className="size-4" />, onClick: () => reject(p.data) },
              { label: 'View / Edit', icon: <Pencil className="size-4" />, onClick: () => openEdit(p.data) },
            ]}
          />
        ),
      },
    ],
    []
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Customers"
        description="Registrations and approved customers."
        action={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Add Customer
          </Button>
        }
      />

      <Tabs defaultValue="approved" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger
            value="approved"
            className="data-active:bg-emerald-500/15 data-active:text-emerald-700 dark:data-active:bg-emerald-500/20 dark:data-active:text-emerald-300"
          >
            Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="data-active:bg-amber-500/15 data-active:text-amber-700 dark:data-active:bg-amber-500/20 dark:data-active:text-amber-300"
          >
            Pending ({pending.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approved" className="mt-3 flex min-h-0 flex-1 flex-col">
          <DataGrid rowData={approved} columnDefs={approvedColumns} loading={isLoading} />
        </TabsContent>

        <TabsContent value="pending" className="mt-3 flex min-h-0 flex-1 flex-col">
          <DataGrid rowData={pending} columnDefs={pendingColumns} loading={isLoading} />
        </TabsContent>
      </Tabs>

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        customerTypes={types ?? []}
      />
      <ApproveDialog
        open={Boolean(approving)}
        onOpenChange={(o) => !o && setApproving(undefined)}
        customer={approving}
        customerTypes={types ?? []}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title="Delete customer?"
        description={`${toDelete?.companyName} will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return
          await deleteCustomer(toDelete.id).unwrap()
          toast.success('Customer deleted')
          setToDelete(undefined)
        }}
      />
    </div>
  )
}

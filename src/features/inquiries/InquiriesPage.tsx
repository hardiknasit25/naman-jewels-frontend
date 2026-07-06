import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Eye, CheckCheck, MessageCircleReply } from 'lucide-react'
import type { ColDef } from 'ag-grid-community'
import { DataGrid } from '@/components/data/DataGrid'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Field } from '@/components/shared/Field'
import { SelectField } from '@/components/shared/SelectField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/responsive-dialog'
import { formatDateTime } from '@/lib/format'
import {
  useAddInquiryMutation,
  useDeleteInquiryMutation,
  useListCustomersQuery,
  useListInquiriesQuery,
  useListProductsQuery,
  useUpdateInquiryMutation,
} from '@/services/api'
import type { Id, Inquiry, InquiryStatus } from '@/types'

const STATUSES: InquiryStatus[] = ['New', 'Seen', 'Responded', 'Closed']

const statusClass: Record<InquiryStatus, string> = {
  New: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  Seen: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  Responded: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  Closed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

const schema = z.object({
  quantity: z.number({ message: 'Enter a valid quantity' }).int().positive('Enter a valid quantity'),
  remark: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Lookup {
  customerOptions: { value: string; label: string }[]
  productOptions: { value: string; label: string }[]
}

function InquiryFormDialog({
  open,
  onOpenChange,
  record,
  lookup,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  record?: Inquiry
  lookup: Lookup
}) {
  const [addInquiry, { isLoading: adding }] = useAddInquiryMutation()
  const [updateInquiry, { isLoading: updating }] = useUpdateInquiryMutation()
  const [customerId, setCustomerId] = useState('')
  const [productId, setProductId] = useState('')
  const [status, setStatus] = useState<InquiryStatus>('New')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    if (record) {
      reset({ quantity: record.quantity, remark: record.remark ?? '' })
      setCustomerId(String(record.customerId))
      setProductId(String(record.productId))
      setStatus(record.status)
    } else {
      reset({ quantity: 1, remark: '' })
      setCustomerId(lookup.customerOptions[0]?.value ?? '')
      setProductId(lookup.productOptions[0]?.value ?? '')
      setStatus('New')
    }
  }, [open, record, reset, lookup])

  const onSubmit = async (values: FormValues) => {
    if (!customerId || !productId) {
      toast.error('Select a customer and a product')
      return
    }
    const payload = {
      customerId: Number(customerId),
      productId: Number(productId),
      status,
      quantity: values.quantity,
      remark: values.remark,
    }
    try {
      if (record) {
        await updateInquiry({ id: record.id, patch: payload }).unwrap()
        toast.success('Inquiry updated')
      } else {
        await addInquiry(payload).unwrap()
        toast.success('Inquiry added')
      }
      onOpenChange(false)
    } catch {
      toast.error('Something went wrong')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit Inquiry' : 'Add Inquiry'}</DialogTitle>
          <DialogDescription>Link a customer to a product with a quantity and remark.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <Field label="Customer">
            <SelectField value={customerId} onValueChange={setCustomerId} options={lookup.customerOptions} placeholder="Select customer" />
          </Field>
          <Field label="Product">
            <SelectField value={productId} onValueChange={setProductId} options={lookup.productOptions} placeholder="Select product" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantity" htmlFor="i-qty" error={errors.quantity?.message}>
              <Input id="i-qty" type="number" min={1} {...register('quantity', { valueAsNumber: true })} />
            </Field>
            <Field label="Status">
              <SelectField
                value={status}
                onValueChange={(v) => setStatus(v as InquiryStatus)}
                options={STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </Field>
          </div>
          <Field label="Remark" htmlFor="i-remark" optional>
            <Input id="i-remark" {...register('remark')} />
          </Field>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={adding || updating}>
              {record ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function InquiriesPage() {
  const { data: inquiries, isLoading } = useListInquiriesQuery()
  const { data: customers } = useListCustomersQuery()
  const { data: products } = useListProductsQuery()
  const [updateInquiry] = useUpdateInquiryMutation()
  const [deleteInquiry] = useDeleteInquiryMutation()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Inquiry | undefined>()
  const [viewing, setViewing] = useState<Inquiry | undefined>()
  const [toDelete, setToDelete] = useState<Inquiry | undefined>()
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const customerName = useMemo(() => {
    const m = new Map((customers ?? []).map((c) => [c.id, c.companyName]))
    return (id?: Id) => (id != null ? m.get(id) ?? '—' : '—')
  }, [customers])
  const productLabel = useMemo(() => {
    const m = new Map((products ?? []).map((p) => [p.id, `${p.name} (${p.sku})`]))
    return (id?: Id) => (id != null ? m.get(id) ?? '—' : '—')
  }, [products])

  const lookup: Lookup = useMemo(
    () => ({
      customerOptions: (customers ?? []).map((c) => ({ value: String(c.id), label: c.companyName })),
      productOptions: (products ?? []).map((p) => ({ value: String(p.id), label: `${p.name} (${p.sku})` })),
    }),
    [customers, products]
  )

  const rows = useMemo(
    () =>
      (inquiries ?? []).filter((i) => statusFilter === 'all' || i.status === statusFilter),
    [inquiries, statusFilter]
  )

  const setStatus = async (i: Inquiry, status: InquiryStatus) => {
    await updateInquiry({ id: i.id, patch: { status } }).unwrap()
    toast.success(`Marked as ${status}`)
  }

  const columns = useMemo<ColDef<Inquiry>[]>(
    () => [
      {
        headerName: 'Customer',
        colId: 'customer',
        minWidth: 170,
        valueGetter: (p) => customerName(p.data?.customerId),
      },
      {
        headerName: 'Product',
        colId: 'product',
        minWidth: 200,
        valueGetter: (p) => productLabel(p.data?.productId),
      },
      { headerName: 'Qty', field: 'quantity', maxWidth: 100 },
      { headerName: 'Remark', field: 'remark', flex: 2, valueFormatter: (p) => p.value || '—' },
      {
        headerName: 'Status',
        field: 'status',
        cellRenderer: (p: { data: Inquiry }) => (
          <Badge variant="ghost" className={statusClass[p.data.status]}>
            {p.data.status}
          </Badge>
        ),
      },
      {
        headerName: 'Date / Time',
        field: 'createdAt',
        minWidth: 170,
        sort: 'desc',
        valueFormatter: (p) => formatDateTime(p.value),
      },
      {
        headerName: 'Actions',
        pinned: 'right',
        width: 232,
        minWidth: 232,
        sortable: false,
        filter: false,
        resizable: false,
        cellClass: 'px-2!',
        headerClass: 'nj-center-header',
        cellRenderer: (p: { data: Inquiry }) => (
          <RowActions
            items={[
              { label: 'View Details', icon: <Eye className="size-4" />, onClick: () => setViewing(p.data) },
              { label: 'Mark Seen', icon: <Eye className="size-4" />, onClick: () => setStatus(p.data, 'Seen') },
              { label: 'Mark Responded', icon: <MessageCircleReply className="size-4" />, onClick: () => setStatus(p.data, 'Responded') },
              { label: 'Mark Closed', icon: <CheckCheck className="size-4" />, onClick: () => setStatus(p.data, 'Closed') },
              { label: 'Edit', icon: <Pencil className="size-4" />, onClick: () => { setEditing(p.data); setFormOpen(true) } },
              { label: 'Delete', icon: <Trash2 className="size-4" />, destructive: true, onClick: () => setToDelete(p.data) },
            ]}
          />
        ),
      },
    ],
    [customerName, productLabel]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Inquiries"
        description="Customer inquiries received from the app."
        action={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Add Inquiry
          </Button>
        }
      />

      <div className="w-full sm:w-56">
        <SelectField
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[{ value: 'all', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
        />
      </div>

      <DataGrid rowData={rows} columnDefs={columns} loading={isLoading} />

      <InquiryFormDialog open={formOpen} onOpenChange={setFormOpen} record={editing} lookup={lookup} />

      {/* View details */}
      <Dialog open={Boolean(viewing)} onOpenChange={(o) => !o && setViewing(undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <dl className="grid grid-cols-3 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="col-span-2 font-medium">{customerName(viewing.customerId)}</dd>
              <dt className="text-muted-foreground">Product</dt>
              <dd className="col-span-2 font-medium">{productLabel(viewing.productId)}</dd>
              <dt className="text-muted-foreground">Quantity</dt>
              <dd className="col-span-2 font-medium">{viewing.quantity}</dd>
              <dt className="text-muted-foreground">Remark</dt>
              <dd className="col-span-2 font-medium">{viewing.remark || '—'}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="col-span-2">
                <Badge variant="ghost" className={statusClass[viewing.status]}>{viewing.status}</Badge>
              </dd>
              <dt className="text-muted-foreground">Received</dt>
              <dd className="col-span-2 font-medium">{formatDateTime(viewing.createdAt)}</dd>
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title="Delete inquiry?"
        description="This inquiry will be permanently removed."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return
          await deleteInquiry(toDelete.id).unwrap()
          toast.success('Inquiry deleted')
          setToDelete(undefined)
        }}
      />
    </div>
  )
}

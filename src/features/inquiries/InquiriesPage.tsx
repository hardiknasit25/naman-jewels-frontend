import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  MailOpen,
  CheckCheck,
  MessageCircleReply,
  ImageIcon,
} from 'lucide-react'
import type { ColDef } from 'ag-grid-community'
import { DataGrid } from '@/components/data/DataGrid'
import { optionsFilter } from '@/components/data/gridFilters'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Field } from '@/components/shared/Field'
import { SelectField } from '@/components/shared/SelectField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/responsive-dialog'
import { formatDateTime } from '@/lib/format'
import { resolveImageUrl } from '@/lib/imageUrl'
import {
  useAddInquiryMutation,
  useDeleteInquiryMutation,
  useListCaratsQuery,
  useListCategoriesQuery,
  useListCustomerTypesQuery,
  useListCustomersQuery,
  useListInquiriesQuery,
  useListProductsQuery,
  useUpdateInquiryMutation,
} from '@/services/api'
import type { Customer, Id, Inquiry, InquiryStatus, Product } from '@/types'

const STATUSES: InquiryStatus[] = ['New', 'Seen', 'Responded', 'Closed']

const statusClass: Record<InquiryStatus, string> = {
  New: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  Seen: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  Responded: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  Closed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

const customerStatusClass: Record<Customer['status'], string> = {
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  blocked: 'bg-destructive/15 text-destructive',
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  rejected: 'bg-muted text-muted-foreground',
}

/**
 * The status changes an admin can make on an inquiry. Declared once and rendered
 * both in the grid's Actions column and in the details dialog's footer, so the
 * two can't drift apart.
 */
const STATUS_ACTIONS: { status: InquiryStatus; label: string; icon: ReactNode }[] = [
  // Not an eye: that's "View Details" in the same row of icon buttons, and two
  // eyes side by side gave no clue which was which.
  { status: 'Seen', label: 'Mark Seen', icon: <MailOpen className="size-4" /> },
  { status: 'Responded', label: 'Mark Responded', icon: <MessageCircleReply className="size-4" /> },
  { status: 'Closed', label: 'Mark Closed', icon: <CheckCheck className="size-4" /> },
]

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
            <Button type="submit" loading={adding || updating}>
              {adding || updating ? 'Saving…' : record ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Round to milligrams — float sums of 0.001-precision weights drift. */
const round3 = (n: number) => Math.round(n * 1000) / 1000

/**
 * One specification on the bill's item line — label above value, so several fit
 * across the line's width. `wide` gives free text (stone details, notes) the
 * full row.
 */
function Spec({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  const empty = value === null || value === undefined || value === ''
  return (
    <div className={cn('min-w-0', wide && 'col-span-2 sm:col-span-3')}>
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={cn('font-medium', wide ? 'wrap-break-word' : 'truncate')}>
        {empty ? '—' : value}
      </dd>
    </div>
  )
}

/** A label above its value in the bill's header blocks. */
function BillField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 grid gap-0.5">{children}</div>
    </div>
  )
}

/**
 * The inquiry laid out as a bill: letterhead, who it came from, the item line
 * with its photo and specifications, and the weight totals for the quantity
 * asked for.
 *
 * The catalogue deliberately carries no price/MRP (3.5), so the totals are
 * weights rather than amounts — which is what the shop quotes against anyway.
 */
function InquiryBill({
  inquiry,
  customer,
  product,
  categoryName,
  tierName,
  caratName,
}: {
  inquiry: Inquiry
  customer?: Customer
  product?: Product
  categoryName: (id?: Id) => string
  tierName: (id: Id | null) => string
  caratName: (product?: Product) => string
}) {
  // Less weight = gross − net — the same rule the products grid and the
  // customer app use.
  const lessWeight =
    product && product.netWeight != null ? round3(product.grossWeight - product.netWeight) : null

  // Prefer the gallery, falling back to the legacy single imageUrl — the same
  // order the product form and the customer app use, so a product saved before
  // the gallery existed still shows its photo.
  const gallery = product?.images?.length
    ? product.images
    : product?.imageUrl
      ? [product.imageUrl]
      : []
  const primaryImage = gallery[0]

  const qty = inquiry.quantity
  const totalGross = product ? round3(product.grossWeight * qty) : null
  const totalLess = lessWeight != null ? round3(lessWeight * qty) : null
  const totalNet = product?.netWeight != null ? round3(product.netWeight * qty) : null

  return (
    <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Letterhead */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/40 px-4 py-3">
        <div className="min-w-0">
          <p className="font-heading text-base font-semibold">Naman Jewels</p>
          <p className="text-xs text-muted-foreground">Inquiry / Estimate</p>
        </div>
        <div className="sm:text-right">
          <p className="font-heading text-base font-semibold">#{inquiry.id}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(inquiry.createdAt)}</p>
        </div>
      </header>

      {/* Who it's from, and where the inquiry stands */}
      <div className="grid gap-4 border-b px-4 py-3 text-sm sm:grid-cols-[1fr_auto]">
        <BillField label="Inquiry From">
          {customer ? (
            <>
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {customer.companyName}
                {customer.customerTypeId != null && (
                  <Badge variant="secondary">{tierName(customer.customerTypeId)}</Badge>
                )}
              </p>
              {customer.mobileNumber && (
                <a
                  href={`tel:${customer.mobileNumber}`}
                  className="text-muted-foreground underline-offset-3 hover:underline"
                >
                  {customer.mobileNumber}
                </a>
              )}
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="wrap-break-word text-muted-foreground underline-offset-3 hover:underline"
                >
                  {customer.email}
                </a>
              )}
              <p className="wrap-break-word text-muted-foreground">
                {[customer.address, customer.city].filter(Boolean).join(', ') || '—'}
              </p>
              {customer.referenceBy && (
                <p className="text-muted-foreground">Reference by {customer.referenceBy}</p>
              )}
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <Badge variant="ghost" className={customerStatusClass[customer.status]}>
                  {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                </Badge>
                <span>Last login {formatDateTime(customer.lastLogin)}</span>
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              This customer (#{inquiry.customerId}) has been deleted.
            </p>
          )}
        </BillField>

        {/* Its own grid rather than a BillField: the status block hugs the
            right edge of the bill on wider screens. */}
        <div className="grid content-start gap-1 sm:justify-items-end sm:text-right">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Status
          </p>
          <Badge variant="ghost" className={statusClass[inquiry.status]}>
            {inquiry.status}
          </Badge>
          <p className="text-xs text-muted-foreground">
            Received {formatDateTime(inquiry.createdAt)}
          </p>
        </div>
      </div>

      {/* Item line — the piece as a horizontal card: photo, then specs */}
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        <span>Item</span>
        <span>Qty</span>
      </div>
      <div className="flex items-start gap-3 border-b px-4 py-3 sm:gap-4">
        {/* Fixed square, `object-contain`: product photos are cropped freely by
            the admin, so filling the panel would cut pieces off. The whole
            photo is shown, letterboxed against the muted panel. */}
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border sm:size-28">
          {primaryImage ? (
            <img
              src={resolveImageUrl(primaryImage)}
              alt={product?.name ?? 'Product'}
              className="size-full object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon className="size-6" />
            </div>
          )}
          {gallery.length > 1 && (
            <span className="absolute right-1 bottom-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
              +{gallery.length - 1}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-heading font-semibold">
              {product?.name ?? 'Product no longer in the catalogue'}
            </p>
            {product &&
              ((product.status ?? 'live') === 'private' ? (
                <Badge variant="outline" className="text-muted-foreground">
                  Private
                </Badge>
              ) : (
                <Badge variant="secondary">Live</Badge>
              ))}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {product ? `Code ${product.sku}` : `Product #${inquiry.productId}`}
          </p>

          {product ? (
            <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              <Spec label="Category" value={categoryName(product.categoryId)} />
              <Spec label="Carat" value={caratName(product)} />
              <Spec label="Size" value={product.size} />
              <Spec label="Gross" value={`${product.grossWeight} gm`} />
              <Spec label="Less" value={lessWeight != null ? `${lessWeight} gm` : null} />
              <Spec
                label="Net"
                value={product.netWeight != null ? `${product.netWeight} gm` : null}
              />
              <Spec label="Stone Details" value={product.stoneDetails} wide />
              <Spec label="Notes" value={product.notes} wide />
            </dl>
          ) : (
            <p className="mt-2.5 text-muted-foreground">
              This product has been deleted, so its specifications are no longer available.
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="font-heading text-base font-semibold">× {qty}</p>
        </div>
      </div>

      {/* Totals — weights for the quantity asked for, in place of amounts */}
      <div className="flex justify-end border-b px-4 py-3">
        <dl className="grid w-full max-w-xs grid-cols-2 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Gross weight</dt>
          <dd className="text-right font-medium">
            {totalGross != null ? `${totalGross} gm` : '—'}
          </dd>
          <dt className="text-muted-foreground">Less weight</dt>
          <dd className="text-right font-medium">
            {totalLess != null ? `${totalLess} gm` : '—'}
          </dd>
          <dt className="mt-1 border-t pt-1.5 font-medium">Total net weight</dt>
          <dd className="mt-1 border-t pt-1.5 text-right font-heading font-semibold">
            {totalNet != null ? `${totalNet} gm` : '—'}
          </dd>
          <dd className="col-span-2 text-right text-xs text-muted-foreground">
            for {qty} {qty === 1 ? 'piece' : 'pieces'}
          </dd>
        </dl>
      </div>

      {/* Remark */}
      <footer className="px-4 py-3 text-sm">
        <BillField label="Remark">
          <p className="wrap-break-word">{inquiry.remark || '—'}</p>
        </BillField>
      </footer>
    </article>
  )
}

/**
 * Everything recorded about one inquiry — the piece that was asked about, who
 * asked, and the inquiry itself — plus the same actions the grid's Actions
 * column offers, so an admin can act on what they're reading without closing
 * the dialog first.
 *
 * The inquiry is passed in fresh from the list on every render, so a status
 * changed from the footer is reflected here immediately.
 */
function InquiryDetailsDialog({
  inquiry,
  customer,
  product,
  categoryName,
  tierName,
  caratName,
  updating,
  onOpenChange,
  onStatus,
  onEdit,
  onDelete,
}: {
  inquiry?: Inquiry
  customer?: Customer
  product?: Product
  categoryName: (id?: Id) => string
  tierName: (id: Id | null) => string
  caratName: (product?: Product) => string
  updating: boolean
  onOpenChange: (open: boolean) => void
  onStatus: (inquiry: Inquiry, status: InquiryStatus) => void
  onEdit: (inquiry: Inquiry) => void
  onDelete: (inquiry: Inquiry) => void
}) {
  return (
    <Dialog open={Boolean(inquiry)} onOpenChange={onOpenChange}>
      {/* Wider than the form dialogs: the product card lays its image and
          specifications out side by side. */}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inquiry Details</DialogTitle>
          <DialogDescription>
            The inquiry as a bill — item, weights and the customer who raised it.
          </DialogDescription>
        </DialogHeader>

        {inquiry && (
          <>
            <div className="scrollbar-tw max-h-[55vh] overflow-y-auto pr-1 sm:max-h-[60vh]">
              <InquiryBill
                inquiry={inquiry}
                customer={customer}
                product={product}
                categoryName={categoryName}
                tierName={tierName}
                caratName={caratName}
              />
            </div>

            {/* The same actions the grid's Actions column offers, so they're
                available in both places. */}
            <DialogFooter className="flex-row flex-wrap items-center gap-2 sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_ACTIONS.map((action) => (
                  <Button
                    key={action.status}
                    type="button"
                    variant="outline"
                    disabled={updating || inquiry.status === action.status}
                    title={
                      inquiry.status === action.status
                        ? `Already marked ${action.status}`
                        : action.label
                    }
                    onClick={() => onStatus(inquiry, action.status)}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => onEdit(inquiry)}>
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button type="button" variant="destructive" onClick={() => onDelete(inquiry)}>
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function InquiriesPage() {
  const { data: inquiries, isLoading } = useListInquiriesQuery()
  const { data: customers } = useListCustomersQuery()
  const { data: products } = useListProductsQuery()
  // Master data the details dialog resolves the inquiry's ids against.
  const { data: categories } = useListCategoriesQuery()
  const { data: customerTypes } = useListCustomerTypesQuery()
  const { data: carats } = useListCaratsQuery()
  const [updateInquiry, { isLoading: updatingStatus }] = useUpdateInquiryMutation()
  const [deleteInquiry] = useDeleteInquiryMutation()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Inquiry | undefined>()
  // Held as an id rather than a copy of the row: a status changed from inside
  // the dialog then re-reads from the refreshed list instead of showing the
  // stale value it was opened with. A deleted inquiry simply closes the dialog.
  const [viewingId, setViewingId] = useState<Id | undefined>()
  const [toDelete, setToDelete] = useState<Inquiry | undefined>()

  const viewing = useMemo(
    () => (viewingId != null ? (inquiries ?? []).find((i) => i.id === viewingId) : undefined),
    [inquiries, viewingId]
  )

  const customerById = useMemo(
    () => new Map((customers ?? []).map((c) => [c.id, c])),
    [customers]
  )
  const productById = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products])

  const customerName = useMemo(
    () => (id?: Id) => (id != null ? customerById.get(id)?.companyName ?? '—' : '—'),
    [customerById]
  )
  const productLabel = useMemo(
    () => (id?: Id) => {
      const product = id != null ? productById.get(id) : undefined
      return product ? `${product.name} (${product.sku})` : '—'
    },
    [productById]
  )
  const categoryName = useMemo(() => {
    const m = new Map((categories ?? []).map((c) => [c.id, c.name]))
    return (id?: Id) => (id != null ? m.get(id) ?? '—' : '—')
  }, [categories])
  const tierName = useMemo(() => {
    const m = new Map((customerTypes ?? []).map((t) => [t.id, t.name]))
    return (id: Id | null) => (id != null ? m.get(id) ?? '—' : '—')
  }, [customerTypes])
  // Falls back to the product's stored purity text for products created before
  // the carat master (and for any whose carat has since been deleted).
  const caratName = useMemo(() => {
    const m = new Map((carats ?? []).map((c) => [c.id, c.name]))
    return (product?: Product) => {
      if (!product) return '—'
      return (product.caratId != null ? m.get(product.caratId) : undefined) ?? product.purity ?? '—'
    }
  }, [carats])

  const lookup: Lookup = useMemo(
    () => ({
      customerOptions: (customers ?? []).map((c) => ({ value: String(c.id), label: c.companyName })),
      productOptions: (products ?? []).map((p) => ({ value: String(p.id), label: `${p.name} (${p.sku})` })),
    }),
    [customers, products]
  )

  const setStatus = async (i: Inquiry, status: InquiryStatus) => {
    if (i.status === status) return
    try {
      await updateInquiry({ id: i.id, patch: { status } }).unwrap()
      toast.success(`Marked as ${status}`)
    } catch (err) {
      toast.error(
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Something went wrong'
      )
    }
  }

  // Shared by the grid's Actions column and the details dialog's footer. Editing
  // or deleting from the dialog closes it first, so two dialogs never stack.
  const editInquiry = (i: Inquiry) => {
    setViewingId(undefined)
    setEditing(i)
    setFormOpen(true)
  }
  const confirmDelete = (i: Inquiry) => {
    setViewingId(undefined)
    setToDelete(i)
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
        // Replaces the standalone status dropdown this page used to carry above
        // the grid — same four choices, now in the filter row with everything
        // else, and pickable in combination.
        ...optionsFilter<Inquiry>(
          STATUSES.map((s) => ({
            value: s,
            label: s,
            node: (
              <Badge variant="ghost" className={statusClass[s]}>
                {s}
              </Badge>
            ),
          })),
          'All statuses'
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
              { label: 'View Details', icon: <Eye className="size-4" />, onClick: () => setViewingId(p.data.id) },
              // Same three status actions the details dialog offers.
              ...STATUS_ACTIONS.map((action) => ({
                label: action.label,
                icon: action.icon,
                onClick: () => setStatus(p.data, action.status),
              })),
              { label: 'Edit', icon: <Pencil className="size-4" />, onClick: () => editInquiry(p.data) },
              { label: 'Delete', icon: <Trash2 className="size-4" />, destructive: true, onClick: () => confirmDelete(p.data) },
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

      <DataGrid
        stateKey="inquiries"
        searchPlaceholder="Search inquiries…"
        rowData={inquiries}
        columnDefs={columns}
        loading={isLoading}
      />

      <InquiryFormDialog open={formOpen} onOpenChange={setFormOpen} record={editing} lookup={lookup} />

      {/* View details — full product, customer and inquiry record, with the
          same actions as the grid's Actions column. */}
      <InquiryDetailsDialog
        inquiry={viewing}
        customer={viewing ? customerById.get(viewing.customerId) : undefined}
        product={viewing ? productById.get(viewing.productId) : undefined}
        categoryName={categoryName}
        tierName={tierName}
        caratName={caratName}
        updating={updatingStatus}
        onOpenChange={(o) => !o && setViewingId(undefined)}
        onStatus={setStatus}
        onEdit={editInquiry}
        onDelete={confirmDelete}
      />

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

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ImageIcon, X } from 'lucide-react'
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
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  useAddProductMutation,
  useDeleteProductMutation,
  useListCategoriesQuery,
  useListCustomerTypesQuery,
  useListProductsQuery,
  useUpdateProductMutation,
} from '@/services/api'
import { audienceFor, sortTiers } from '@/lib/tiers'
import type { CustomerType, Id, Product, ProductStatus } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'Product Code / SKU is required'),
  grossWeight: z.number({ message: 'Enter a valid weight in grams' }).positive('Enter a valid weight in grams'),
  netWeight: z.string().optional(),
  size: z.string().optional(),
  purity: z.string().min(1, 'Purity / metal is required'),
  stoneDetails: z.string().optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

/**
 * 2.2 Tier tagging — toggle a product into one or more customer types. Rendered as
 * toggle chips rather than a multi-select because tier lists are short and the
 * cumulative reach needs to stay readable while you pick.
 */
function TierPicker({
  tiers,
  value,
  onChange,
}: {
  tiers: CustomerType[]
  value: Id[]
  onChange: (ids: Id[]) => void
}) {
  const toggle = (id: Id) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  if (tiers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No customer types defined yet — add tiers under Customer Types first.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sortTiers(tiers).map((tier) => {
        const active = value.includes(tier.id)
        return (
          <button
            key={tier.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(tier.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:bg-muted'
            )}
          >
            {tier.name}
          </button>
        )
      })}
    </div>
  )
}

function ProductFormDialog({
  open,
  onOpenChange,
  record,
  categoryOptions,
  tiers,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  record?: Product
  categoryOptions: { value: string; label: string }[]
  tiers: CustomerType[]
}) {
  const [addProduct, { isLoading: adding }] = useAddProductMutation()
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation()
  const [categoryId, setCategoryId] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [status, setStatus] = useState<ProductStatus>('live')
  const [customerTypeIds, setCustomerTypeIds] = useState<Id[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openFilePicker = () => fileInputRef.current?.click()

  // Number of empty placeholder slots to always surface so the user can see
  // where images go. Real previews fill these first; a "+" tile handles the rest.
  const PLACEHOLDER_SLOTS = 3

  const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  // Encode and append any number of image files (from a picker or a drop). No limit.
  const addFiles = async (fileList: FileList | File[] | null) => {
    const files = Array.from(fileList ?? []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    const encoded = await Promise.all(files.map(readFile))
    setImages((current) => [...current, ...encoded])
  }

  const onImagesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    // Materialise the (live) FileList into an array BEFORE resetting the input —
    // clearing e.target.value empties e.target.files, so reading it afterwards
    // (inside the async addFiles) would find nothing.
    const files = Array.from(e.target.files ?? [])
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = ''
    await addFiles(files)
  }

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    await addFiles(e.dataTransfer.files)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!dragActive) setDragActive(true)
  }

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only clear when leaving the dropzone itself, not its children.
    if (e.currentTarget === e.target) setDragActive(false)
  }

  const removeImage = (index: number) =>
    setImages((current) => current.filter((_, i) => i !== index))

  // How many empty dashed placeholders to render after the existing previews.
  const emptySlots = Math.max(0, PLACEHOLDER_SLOTS - images.length)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    if (record) {
      reset({
        name: record.name,
        sku: record.sku,
        grossWeight: record.grossWeight,
        netWeight: record.netWeight != null ? String(record.netWeight) : '',
        size: record.size ?? '',
        purity: record.purity,
        stoneDetails: record.stoneDetails ?? '',
        notes: record.notes ?? '',
      })
      setCategoryId(String(record.categoryId))
      // Prefer the images array; fall back to the legacy single imageUrl.
      setImages(record.images?.length ? record.images : record.imageUrl ? [record.imageUrl] : [])
      setStatus(record.status ?? 'live')
      setCustomerTypeIds(record.customerTypeIds ?? [])
    } else {
      reset({ name: '', sku: '', grossWeight: undefined, netWeight: '', size: '', purity: '', stoneDetails: '', notes: '' })
      setCategoryId(categoryOptions[0]?.value ?? '')
      setImages([])
      setStatus('live')
      // No tags = visible to every tier, which matches the "Public" default.
      setCustomerTypeIds([])
    }
  }, [open, record, reset, categoryOptions])

  // Spell out the cumulative reach (2.2) as the admin tags tiers — tagging Gold
  // silently also exposes the product to Platinum, which is easy to miss.
  const audience = audienceFor(tiers, customerTypeIds)
  const audienceHint =
    status === 'private'
      ? 'Status is Private — no customer sees this product, whichever tiers are tagged.'
      : customerTypeIds.length === 0
        ? tiers.length === 0
          ? 'No customer types defined yet — every customer will see this product.'
          : 'Untagged — every customer type will see this product.'
        : audience.length === 0
          ? 'The tagged tiers no longer exist — no customer will see this product.'
          : `Visible to ${audience.map((t) => t.name).join(', ')} — higher tiers always see lower tiers' products.`

  const onSubmit = async (values: FormValues) => {
    if (!categoryId) {
      toast.error('Please select a category')
      return
    }
    const payload = {
      name: values.name,
      sku: values.sku,
      categoryId: Number(categoryId),
      grossWeight: values.grossWeight,
      netWeight: values.netWeight ? Number(values.netWeight) : null,
      size: values.size,
      purity: values.purity,
      stoneDetails: values.stoneDetails,
      notes: values.notes,
      images,
      // Keep the primary imageUrl in sync (first image) for list thumbnails / consumers.
      imageUrl: images[0] ?? '',
      status,
      customerTypeIds,
    }
    try {
      if (record) {
        await updateProduct({ id: record.id, patch: payload }).unwrap()
        toast.success('Product updated')
      } else {
        await addProduct(payload).unwrap()
        toast.success('Product added')
      }
      onOpenChange(false)
    } catch {
      toast.error('Something went wrong')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>Products are shown without a price.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <Field
            label="Product Images"
            optional
            hint="Drag & drop or click a slot to upload. The first image is used as the main thumbnail."
          >
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={cn(
                'rounded-xl border-2 border-dashed p-3 transition-colors',
                dragActive ? 'border-primary bg-primary/5' : 'border-border'
              )}
            >
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((src, i) => (
                  <div key={i} className="group relative aspect-square">
                    <img
                      src={src}
                      alt={`Product image ${i + 1}`}
                      className="h-full w-full rounded-lg border object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Remove image"
                      className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"
                      onClick={() => removeImage(i)}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}

                {/* Empty placeholder slots (at least 3) so users see where images go. */}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <button
                    key={`ph-${i}`}
                    type="button"
                    onClick={openFilePicker}
                    className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed bg-muted/40 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted"
                  >
                    <ImageIcon className="size-7" />
                    <span className="text-[11px]">Image {images.length + i + 1}</span>
                  </button>
                ))}

                {/* Once the placeholders are filled, an unlimited "add more" tile. */}
                {emptySlots === 0 && (
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed bg-muted/40 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted"
                  >
                    <Plus className="size-7" />
                    <span className="text-[11px]">Add more</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                id="p-image"
                type="file"
                accept="image/*"
                multiple
                onChange={onImagesChange}
                className="sr-only"
              />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {images.length === 0
                  ? 'Drag & drop images here, or click a slot to browse your device'
                  : `${images.length} image${images.length === 1 ? '' : 's'} added — drag & drop or use “Add more” to upload as many as you like`}
              </p>
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product Name" htmlFor="p-name" error={errors.name?.message}>
              <Input id="p-name" {...register('name')} />
            </Field>
            <Field label="Product Code / SKU" htmlFor="p-sku" error={errors.sku?.message}>
              <Input id="p-sku" placeholder="e.g. RG-1042" {...register('sku')} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <SelectField value={categoryId} onValueChange={setCategoryId} options={categoryOptions} placeholder="Select category" />
            </Field>
            <Field
              label="Status"
              hint={
                status === 'private'
                  ? 'Hidden from the customer app'
                  : 'Published to the customer app'
              }
            >
              <SelectField
                value={status}
                onValueChange={(v) => setStatus(v as ProductStatus)}
                options={[
                  { value: 'live', label: 'Live (published)' },
                  { value: 'private', label: 'Private (hidden)' },
                ]}
              />
            </Field>
          </div>

          <Field
            label="Visible to Customer Types"
            optional
            hint={audienceHint}
          >
            <TierPicker tiers={tiers} value={customerTypeIds} onChange={setCustomerTypeIds} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Gross Weight (gm)" htmlFor="p-gw" error={errors.grossWeight?.message}>
              <Input id="p-gw" type="number" step="0.01" {...register('grossWeight', { valueAsNumber: true })} />
            </Field>
            <Field label="Net Weight (gm)" htmlFor="p-nw" optional>
              <Input id="p-nw" type="number" step="0.01" {...register('netWeight')} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Size" htmlFor="p-size" optional hint="Ring size / chain length / diameter">
              <Input id="p-size" {...register('size')} />
            </Field>
            <Field label="Purity / Metal" htmlFor="p-purity" error={errors.purity?.message}>
              <Input id="p-purity" placeholder="e.g. 22K Gold" {...register('purity')} />
            </Field>
          </div>

          <Field label="Stone Details" htmlFor="p-stone" optional>
            <Input id="p-stone" placeholder="Type, weight/carat, quantity" {...register('stoneDetails')} />
          </Field>
          <Field label="Other Notes / Tags" htmlFor="p-notes" optional>
            <Input id="p-notes" {...register('notes')} />
          </Field>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={adding || updating}>
              {record ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ProductsPage() {
  const { data: products, isLoading } = useListProductsQuery()
  const { data: categories } = useListCategoriesQuery()
  const { data: customerTypes } = useListCustomerTypesQuery()
  const [deleteProduct] = useDeleteProductMutation()

  const tiers = useMemo(() => customerTypes ?? [], [customerTypes])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | undefined>()
  const [toDelete, setToDelete] = useState<Product | undefined>()

  const categoryName = useMemo(() => {
    const m = new Map((categories ?? []).map((c) => [c.id, c.name]))
    return (id?: Id) => (id != null ? m.get(id) ?? '—' : '—')
  }, [categories])

  const categoryOptions = useMemo(
    () => (categories ?? []).map((c) => ({ value: String(c.id), label: c.name })),
    [categories]
  )

  // Which customer types can actually see a given product, as a readable list.
  const audienceNames = useMemo(
    () => (product?: Product) => {
      if (!product) return '—'
      if ((product.status ?? 'live') === 'private') return 'Nobody (private)'
      const reach = audienceFor(tiers, product.customerTypeIds ?? [])
      if (reach.length === 0) return (product.customerTypeIds?.length ?? 0) > 0 ? 'Nobody' : '—'
      // Untagged products reach everyone; say so instead of listing every tier.
      if ((product.customerTypeIds?.length ?? 0) === 0) return 'All customer types'
      return reach.map((t) => t.name).join(', ')
    },
    [tiers]
  )

  const columns = useMemo<ColDef<Product>[]>(
    () => [
      {
        headerName: 'Image',
        colId: 'image',
        width: 88,
        minWidth: 88,
        maxWidth: 88,
        sortable: false,
        filter: false,
        resizable: false,
        cellClass: 'px-2!',
        headerClass: 'nj-center-header',
        cellRenderer: (p: { data: Product }) => (
          <div className="flex h-full w-full items-center justify-center">
            {p.data.imageUrl ? (
              <img
                src={p.data.imageUrl}
                alt={p.data.name}
                className="size-12 rounded-xl object-cover shadow-sm ring-1 ring-border transition-transform duration-150 hover:scale-105"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
                <ImageIcon className="size-5" />
              </div>
            )}
          </div>
        ),
      },
      { headerName: 'SKU', field: 'sku', minWidth: 120 },
      { headerName: 'Name', field: 'name', minWidth: 180 },
      {
        headerName: 'Category',
        colId: 'category',
        valueGetter: (p) => categoryName(p.data?.categoryId),
        cellRenderer: (p: { value: string }) => <Badge variant="secondary">{p.value}</Badge>,
      },
      {
        headerName: 'Status',
        colId: 'status',
        maxWidth: 120,
        valueGetter: (p) => p.data?.status ?? 'live',
        cellRenderer: (p: { value: string }) =>
          p.value === 'private' ? (
            <Badge variant="outline" className="text-muted-foreground">Private</Badge>
          ) : (
            <Badge variant="secondary">Live</Badge>
          ),
      },
      {
        headerName: 'Visible To',
        colId: 'visibleTo',
        minWidth: 170,
        // Show who can actually reach the product, not the raw tags — a product
        // tagged only Gold is also visible to Platinum (2.2 cumulative tiers).
        valueGetter: (p) => audienceNames(p.data),
        cellRenderer: (p: { value: string }) => <span className="text-sm">{p.value}</span>,
      },
      { headerName: 'Purity', field: 'purity' },
      { headerName: 'Gross (gm)', field: 'grossWeight', maxWidth: 130 },
      { headerName: 'Net (gm)', field: 'netWeight', maxWidth: 120, valueFormatter: (p) => (p.value != null ? p.value : '—') },
      { headerName: 'Size', field: 'size', valueFormatter: (p) => p.value || '—' },
      { headerName: 'Created', field: 'createdAt', valueFormatter: (p) => formatDate(p.value) },
      {
        headerName: 'Actions',
        pinned: 'right',
        width: 100,
        minWidth: 100,
        sortable: false,
        filter: false,
        resizable: false,
        cellClass: 'px-2!',
        headerClass: 'nj-center-header',
        cellRenderer: (p: { data: Product }) => (
          <RowActions
            items={[
              {
                label: 'Edit',
                icon: <Pencil className="size-4" />,
                onClick: () => {
                  setEditing(p.data)
                  setFormOpen(true)
                },
              },
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
    [categoryName, audienceNames]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Products"
        description="Manage your jewellery catalogue and specifications."
        action={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Add Product
          </Button>
        }
      />

      <DataGrid rowData={products} columnDefs={columns} loading={isLoading} rowHeight={64} />

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
        categoryOptions={categoryOptions}
        tiers={tiers}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title="Delete product?"
        description={`"${toDelete?.name}" (${toDelete?.sku}) will be removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return
          await deleteProduct(toDelete.id).unwrap()
          toast.success('Product deleted')
          setToDelete(undefined)
        }}
      />
    </div>
  )
}

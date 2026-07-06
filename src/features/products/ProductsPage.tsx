import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ImageIcon } from 'lucide-react'
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
import {
  useAddProductMutation,
  useDeleteProductMutation,
  useListCategoriesQuery,
  useListProductsQuery,
  useUpdateProductMutation,
} from '@/services/api'
import type { Id, Product } from '@/types'

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

function ProductFormDialog({
  open,
  onOpenChange,
  record,
  categoryOptions,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  record?: Product
  categoryOptions: { value: string; label: string }[]
}) {
  const [addProduct, { isLoading: adding }] = useAddProductMutation()
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation()
  const [categoryId, setCategoryId] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const onImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

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
      setImageUrl(record.imageUrl ?? '')
    } else {
      reset({ name: '', sku: '', grossWeight: undefined, netWeight: '', size: '', purity: '', stoneDetails: '', notes: '' })
      setCategoryId(categoryOptions[0]?.value ?? '')
      setImageUrl('')
    }
  }, [open, record, reset, categoryOptions])

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
      imageUrl,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>Products are shown without a price.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <Field label="Product Image" optional>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Product preview"
                  className="size-16 rounded-lg border object-cover"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <ImageIcon className="size-6" />
                </div>
              )}
              <div className="flex flex-col items-start gap-1">
                <input
                  id="p-image"
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                  className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:text-secondary-foreground"
                />
                {imageUrl && (
                  <button
                    type="button"
                    className="text-xs text-destructive"
                    onClick={() => setImageUrl('')}
                  >
                    Remove image
                  </button>
                )}
              </div>
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

          <Field label="Category">
            <SelectField value={categoryId} onValueChange={setCategoryId} options={categoryOptions} placeholder="Select category" />
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
  const [deleteProduct] = useDeleteProductMutation()

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
    [categoryName]
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

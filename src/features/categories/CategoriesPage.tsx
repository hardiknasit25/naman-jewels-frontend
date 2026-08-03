import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ImageIcon } from 'lucide-react'
import type { ColDef, RowDragEndEvent } from 'ag-grid-community'
import { DataGrid } from '@/components/data/DataGrid'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Field } from '@/components/shared/Field'
import { SelectField } from '@/components/shared/SelectField'
import { ImageCropperDialog } from '@/components/shared/ImageCropperDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/responsive-dialog'
import { formatDate } from '@/lib/format'
import { fileToDataUrl } from '@/lib/cropImage'
import {
  useAddCategoryMutation,
  useDeleteCategoryMutation,
  useListCategoriesQuery,
  useReorderCategoriesMutation,
  useUpdateCategoryMutation,
} from '@/services/api'
import type { Category, Id } from '@/types'

const NONE = 'none'

// Leading handle column — AG Grid renders the grip icon itself for `rowDrag`.
const DRAG_COLUMN: ColDef<Category> = {
  headerName: '',
  colId: 'drag',
  rowDrag: true,
  pinned: 'left',
  width: 56,
  minWidth: 56,
  maxWidth: 56,
  sortable: false,
  filter: false,
  resizable: false,
  cellClass: 'px-2!',
}
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function CategoryFormDialog({
  open,
  onOpenChange,
  record,
  categories,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  record?: Category
  categories: Category[]
}) {
  const [addCategory, { isLoading: adding }] = useAddCategoryMutation()
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation()
  const [parentId, setParentId] = useState<string>(NONE)
  const [imageUrl, setImageUrl] = useState('')
  // Non-empty while the picked image is being cropped; nothing is stored until
  // the crop is confirmed.
  const [cropQueue, setCropQueue] = useState<string[]>([])

  const onImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCropQueue([await fileToDataUrl(file)])
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  })

  useEffect(() => {
    if (!open) return
    reset(record ? { name: record.name, description: record.description ?? '' } : { name: '', description: '' })
    setParentId(record?.parentId != null ? String(record.parentId) : NONE)
    setImageUrl(record?.imageUrl ?? '')
    setCropQueue([])
  }, [open, record, reset])

  // A category cannot be its own parent.
  const parentOptions = [
    { value: NONE, label: 'None (top-level)' },
    ...categories
      .filter((c) => c.parentId === null && c.id !== record?.id)
      .map((c) => ({ value: String(c.id), label: c.name })),
  ]

  const onSubmit = async (values: FormValues) => {
    const patch = { ...values, parentId: parentId === NONE ? null : Number(parentId), imageUrl }
    try {
      if (record) {
        await updateCategory({ id: record.id, patch }).unwrap()
        toast.success('Category updated')
      } else {
        await addCategory(patch).unwrap()
        toast.success('Category added')
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
          <DialogTitle>{record ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <Field label="Category Image" optional>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Category preview"
                  className="size-16 rounded-lg border object-cover"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <ImageIcon className="size-6" />
                </div>
              )}
              <div className="flex flex-col items-start gap-1">
                <input
                  id="cat-image"
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                  className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:text-secondary-foreground"
                />
                <div className="flex gap-3">
                  {imageUrl && (
                    <>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setCropQueue([imageUrl])}
                      >
                        Re-crop
                      </button>
                      <button
                        type="button"
                        className="text-xs text-destructive"
                        onClick={() => setImageUrl('')}
                      >
                        Remove image
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Field>
          <Field label="Name" htmlFor="cat-name" error={errors.name?.message}>
            <Input id="cat-name" {...register('name')} />
          </Field>
          <Field label="Parent Category" hint="Leave as top-level or nest as a sub-category">
            <SelectField value={parentId} onValueChange={setParentId} options={parentOptions} />
          </Field>
          <Field label="Description" htmlFor="cat-desc" optional>
            <Input id="cat-desc" {...register('description')} />
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

        <ImageCropperDialog
          sources={cropQueue}
          aspect={1}
          onComplete={(images) => {
            setImageUrl(images[0] ?? '')
            setCropQueue([])
          }}
          onCancel={() => setCropQueue([])}
          title="Crop category image"
        />
      </DialogContent>
    </Dialog>
  )
}

export function CategoriesPage() {
  const { data: categories, isLoading, refetch } = useListCategoriesQuery()
  const [deleteCategory] = useDeleteCategoryMutation()
  const [reorderCategories, { isLoading: savingOrder }] = useReorderCategoriesMutation()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | undefined>()
  const [toDelete, setToDelete] = useState<Category | undefined>()

  // Managed dragging has already moved the row by the time this fires, so the
  // grid's own row order is the new order.
  const onRowDragEnd = useCallback(
    async (e: RowDragEndEvent<Category>) => {
      // Only the full, unfiltered list describes a complete order — saving the
      // order of a searched-down subset would drop every hidden category. AG Grid
      // already suppresses managed dragging while a filter is on; this makes sure
      // a stray event can't get through either.
      if (e.api.isAnyFilterPresent()) return

      const ids: Id[] = []
      e.api.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) ids.push(node.data.id)
      })
      // Dropping a row back where it started still fires this event — don't
      // spend a round trip (and an audit log entry) on an unchanged order.
      const current = (categories ?? []).map((c) => c.id)
      if (ids.length === current.length && ids.every((id, i) => id === current[i])) return

      try {
        await reorderCategories(ids).unwrap()
        toast.success('Category order saved')
      } catch {
        toast.error('Could not save the new order')
        // Put the grid back to the order the server still holds.
        refetch()
      }
    },
    [categories, reorderCategories, refetch]
  )

  const parentName = useMemo(() => {
    const m = new Map((categories ?? []).map((c) => [c.id, c.name]))
    return (id: Id | null) => (id != null ? m.get(id) ?? '—' : null)
  }, [categories])

  const columns = useMemo<ColDef<Category>[]>(
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
        cellRenderer: (p: { data: Category }) => (
          <div className="flex h-full w-full items-center justify-center">
            {p.data.imageUrl ? (
              <img
                src={p.data.imageUrl}
                alt={p.data.name}
                className="size-12 rounded-xl object-cover shadow-sm ring-1 ring-border"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
                <ImageIcon className="size-5" />
              </div>
            )}
          </div>
        ),
      },
      { headerName: 'Name', field: 'name', minWidth: 180 },
      {
        headerName: 'Parent',
        colId: 'parent',
        valueGetter: (p) => parentName(p.data?.parentId ?? null),
        cellRenderer: (p: { value: string | null }) =>
          p.value ? <Badge variant="secondary">{p.value}</Badge> : <span className="text-muted-foreground">Top-level</span>,
      },
      { headerName: 'Description', field: 'description', flex: 2, valueFormatter: (p) => p.value || '—' },
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
        cellRenderer: (p: { data: Category }) => (
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
    [parentName]
  )

  // The drag handle leads every row. Sorting and filtering are switched off on
  // this grid on purpose: AG Grid disables managed dragging while either is
  // active, so leaving them on would let one header click kill the handles.
  const gridColumns = useMemo<ColDef<Category>[]>(
    () => [DRAG_COLUMN, ...columns.map((c) => ({ ...c, sortable: false, filter: false }))],
    [columns]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Categories"
        description="Organise products into categories and sub-categories. Drag a row by its handle to set the order customers see."
        action={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Add Category
          </Button>
        }
      />

      {savingOrder && (
        <p className="text-sm text-muted-foreground">Saving new order…</p>
      )}

      {/* pagination={false} is required, not cosmetic: AG Grid silently drops the
          drag handle when managed dragging is combined with pagination. */}
      {/* Column filters stay off for the same reason sorting does — see gridColumns.
          The toolbar search is safe: dragging is suppressed while it's active. */}
      <DataGrid
        stateKey="categories"
        searchPlaceholder="Search categories…"
        filters={false}
        rowData={categories}
        columnDefs={gridColumns}
        loading={isLoading}
        rowHeight={64}
        pagination={false}
        rowDragManaged
        onRowDragEnd={onRowDragEnd}
      />

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
        categories={categories ?? []}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title="Delete category?"
        description={`"${toDelete?.name}" will be removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return
          await deleteCategory(toDelete.id).unwrap()
          toast.success('Category deleted')
          setToDelete(undefined)
        }}
      />
    </div>
  )
}

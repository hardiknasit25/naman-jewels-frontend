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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/responsive-dialog'
import { formatDate } from '@/lib/format'
import {
  useAddCategoryMutation,
  useDeleteCategoryMutation,
  useListCategoriesQuery,
  useUpdateCategoryMutation,
} from '@/services/api'
import type { Category, Id } from '@/types'

const NONE = 'none'
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

  const onImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
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
    defaultValues: { name: '', description: '' },
  })

  useEffect(() => {
    if (!open) return
    reset(record ? { name: record.name, description: record.description ?? '' } : { name: '', description: '' })
    setParentId(record?.parentId != null ? String(record.parentId) : NONE)
    setImageUrl(record?.imageUrl ?? '')
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
      </DialogContent>
    </Dialog>
  )
}

export function CategoriesPage() {
  const { data: categories, isLoading } = useListCategoriesQuery()
  const [deleteCategory] = useDeleteCategoryMutation()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | undefined>()
  const [toDelete, setToDelete] = useState<Category | undefined>()

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Categories"
        description="Organise products into categories and sub-categories."
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

      <DataGrid rowData={categories} columnDefs={columns} loading={isLoading} rowHeight={64} />

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

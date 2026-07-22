import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Eye, EyeOff, ImageIcon } from 'lucide-react'
import type { ColDef } from 'ag-grid-community'
import { DataGrid } from '@/components/data/DataGrid'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Field } from '@/components/shared/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  useAddBannerMutation,
  useDeleteBannerMutation,
  useListBannersQuery,
  useUpdateBannerMutation,
} from '@/services/api'
import type { Banner } from '@/types'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  linkUrl: z.string().optional(),
  order: z.number({ message: 'Order must be a number' }).int().min(1, 'Order must be 1 or more'),
})
type FormValues = z.infer<typeof schema>

function BannerFormDialog({
  open,
  onOpenChange,
  record,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  record?: Banner
}) {
  const [addBanner, { isLoading: adding }] = useAddBannerMutation()
  const [updateBanner, { isLoading: updating }] = useUpdateBannerMutation()
  const [imageUrl, setImageUrl] = useState('')
  const [active, setActive] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', linkUrl: '', order: 1 },
  })

  useEffect(() => {
    if (!open) return
    if (record) {
      reset({ title: record.title, linkUrl: record.linkUrl ?? '', order: record.order })
      setImageUrl(record.imageUrl)
      setActive(record.active)
    } else {
      reset({ title: '', linkUrl: '', order: 1 })
      setImageUrl('')
      setActive(true)
    }
  }, [open, record, reset])

  const onImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const onSubmit = async (values: FormValues) => {
    if (!imageUrl) {
      toast.error('Please upload a banner image')
      return
    }
    const payload = { ...values, imageUrl, active }
    try {
      if (record) {
        await updateBanner({ id: record.id, patch: payload }).unwrap()
        toast.success('Banner updated')
      } else {
        await addBanner(payload).unwrap()
        toast.success('Banner added')
      }
      onOpenChange(false)
    } catch {
      toast.error('Something went wrong')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scrollbar-tw max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
          <DialogDescription>Hero images shown on the app home screen.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <Field label="Banner Image">
            <div className="flex flex-col gap-2">
              {imageUrl ? (
                <img src={imageUrl} alt="Banner preview" className="h-28 w-full rounded-lg border object-cover" />
              ) : (
                <div className="flex h-28 w-full items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <ImageIcon className="size-7" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={onImageChange}
                className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:text-secondary-foreground"
              />
            </div>
          </Field>

          <Field label="Title" htmlFor="b-title" error={errors.title?.message}>
            <Input id="b-title" {...register('title')} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Link URL" htmlFor="b-link" optional hint="Where the banner links to">
              <Input id="b-link" placeholder="/products" {...register('linkUrl')} />
            </Field>
            <Field label="Order" htmlFor="b-order" error={errors.order?.message}>
              <Input id="b-order" type="number" min={1} {...register('order', { valueAsNumber: true })} />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="b-active" checked={active} onCheckedChange={(c) => setActive(Boolean(c))} />
            <Label htmlFor="b-active">Active (visible in app)</Label>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={adding || updating}>
              {record ? 'Save Changes' : 'Add Banner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BannersPage() {
  const { data: banners, isLoading } = useListBannersQuery()
  const [updateBanner] = useUpdateBannerMutation()
  const [deleteBanner] = useDeleteBannerMutation()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Banner | undefined>()
  const [toDelete, setToDelete] = useState<Banner | undefined>()

  const rows = useMemo(
    () => [...(banners ?? [])].sort((a, b) => a.order - b.order),
    [banners]
  )

  const toggleActive = async (b: Banner) => {
    await updateBanner({ id: b.id, patch: { active: !b.active } }).unwrap()
    toast.success(b.active ? 'Banner hidden' : 'Banner activated')
  }

  const columns = useMemo<ColDef<Banner>[]>(
    () => [
      {
        headerName: 'Preview',
        colId: 'image',
        width: 140,
        minWidth: 140,
        maxWidth: 140,
        sortable: false,
        filter: false,
        resizable: false,
        cellClass: 'px-2!',
        headerClass: 'nj-center-header',
        cellRenderer: (p: { data: Banner }) => (
          <div className="flex h-full w-full items-center justify-center">
            <img src={p.data.imageUrl} alt={p.data.title} className="h-10 w-24 rounded-md object-cover ring-1 ring-border" />
          </div>
        ),
      },
      { headerName: 'Title', field: 'title', minWidth: 180 },
      { headerName: 'Order', field: 'order', maxWidth: 110 },
      { headerName: 'Link', field: 'linkUrl', valueFormatter: (p) => p.value || '—' },
      {
        headerName: 'Status',
        field: 'active',
        cellRenderer: (p: { data: Banner }) =>
          p.data.active ? (
            <Badge variant="ghost" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Active</Badge>
          ) : (
            <Badge variant="ghost" className="bg-muted text-muted-foreground">Hidden</Badge>
          ),
      },
      { headerName: 'Created', field: 'createdAt', valueFormatter: (p) => formatDate(p.value) },
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
        cellRenderer: (p: { data: Banner }) => (
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
                label: p.data.active ? 'Hide' : 'Activate',
                icon: p.data.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />,
                onClick: () => toggleActive(p.data),
              },
              {
                label: 'Delete',
                icon: <Trash2 className="size-4" />,
                destructive: true,
                onClick: () => setToDelete(p.data),
              },
            ]}
          />
        ),
      },
    ],
    []
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Banners"
        description="Manage the home hero images / banners."
        action={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Add Banner
          </Button>
        }
      />

      <DataGrid rowData={rows} columnDefs={columns} loading={isLoading} rowHeight={56} />

      <BannerFormDialog open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title="Delete banner?"
        description={`"${toDelete?.title}" will be removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return
          await deleteBanner(toDelete.id).unwrap()
          toast.success('Banner deleted')
          setToDelete(undefined)
        }}
      />
    </div>
  )
}

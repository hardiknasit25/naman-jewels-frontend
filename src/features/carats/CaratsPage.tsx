import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import type { ColDef } from 'ag-grid-community'
import { DataGrid } from '@/components/data/DataGrid'
import { optionsFilter } from '@/components/data/gridFilters'
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
  useAddCaratMutation,
  useDeleteCaratMutation,
  useListCaratsQuery,
  useListProductsQuery,
  useUpdateCaratMutation,
} from '@/services/api'
import type { Carat } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  purity: z.string().optional(),
  order: z.number({ message: 'Order must be a number' }).int().min(1, 'Order must be 1 or more'),
  description: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function CaratFormDialog({
  open,
  onOpenChange,
  record,
  nextOrder,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  record?: Carat
  nextOrder: number
}) {
  const [addCarat, { isLoading: adding }] = useAddCaratMutation()
  const [updateCarat, { isLoading: updating }] = useUpdateCaratMutation()
  const [active, setActive] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', purity: '', order: 1, description: '' },
  })

  useEffect(() => {
    if (!open) return
    if (record) {
      reset({
        name: record.name,
        purity: record.purity ?? '',
        order: record.order,
        description: record.description ?? '',
      })
      setActive(record.active)
    } else {
      // New carats land at the end of the list by default.
      reset({ name: '', purity: '', order: nextOrder, description: '' })
      setActive(true)
    }
  }, [open, record, nextOrder, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = { ...values, active }
    try {
      if (record) {
        await updateCarat({ id: record.id, patch: payload }).unwrap()
        toast.success('Carat updated')
      } else {
        await addCarat(payload).unwrap()
        toast.success('Carat added')
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
          <DialogTitle>{record ? 'Edit Carat' : 'Add Carat'}</DialogTitle>
          <DialogDescription>
            The purity options products can be tagged with.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <Field label="Carat Name" htmlFor="ct-name" error={errors.name?.message}>
            <Input id="ct-name" placeholder="e.g. 22K Gold" {...register('name')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Purity / Fineness" htmlFor="ct-purity" optional hint="e.g. 916">
              <Input id="ct-purity" placeholder="916" {...register('purity')} />
            </Field>
            <Field
              label="Order"
              htmlFor="ct-order"
              hint="Lower shows first"
              error={errors.order?.message}
            >
              <Input id="ct-order" type="number" min={1} {...register('order', { valueAsNumber: true })} />
            </Field>
          </div>
          <Field label="Description" htmlFor="ct-desc" optional>
            <Input id="ct-desc" {...register('description')} />
          </Field>

          <div className="flex items-center gap-3">
            <Switch id="ct-active" checked={active} onCheckedChange={(c) => setActive(Boolean(c))} />
            <Label htmlFor="ct-active">Active (selectable on products)</Label>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={adding || updating}>
              {adding || updating ? 'Saving…' : record ? 'Save Changes' : 'Add Carat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Carat master — the purity list every product picks from (replaces free-text purity). */
export function CaratsPage() {
  const { data: carats, isLoading } = useListCaratsQuery()
  const { data: products } = useListProductsQuery()
  const [updateCarat] = useUpdateCaratMutation()
  const [deleteCarat] = useDeleteCaratMutation()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Carat | undefined>()
  const [toDelete, setToDelete] = useState<Carat | undefined>()

  const rows = useMemo(() => [...(carats ?? [])].sort((a, b) => a.order - b.order), [carats])
  const nextOrder = useMemo(
    () => rows.reduce((max, c) => Math.max(max, c.order), 0) + 1,
    [rows]
  )

  // How many products each carat is on — surfaced in the grid and used to warn
  // before deleting one that's still in use.
  const usageCount = useMemo(() => {
    const counts = new Map<number, number>()
    for (const p of products ?? []) {
      if (p.caratId == null) continue
      counts.set(p.caratId, (counts.get(p.caratId) ?? 0) + 1)
    }
    return counts
  }, [products])

  const toggleActive = async (c: Carat) => {
    await updateCarat({ id: c.id, patch: { active: !c.active } }).unwrap()
    toast.success(c.active ? 'Carat deactivated' : 'Carat activated')
  }

  const columns = useMemo<ColDef<Carat>[]>(
    () => [
      { headerName: 'Order', field: 'order', maxWidth: 110 },
      { headerName: 'Carat', field: 'name', minWidth: 160 },
      { headerName: 'Purity', field: 'purity', valueFormatter: (p) => p.value || '—' },
      {
        headerName: 'Products',
        colId: 'usage',
        maxWidth: 130,
        valueGetter: (p) => (p.data ? usageCount.get(p.data.id) ?? 0 : 0),
      },
      {
        headerName: 'Status',
        field: 'active',
        maxWidth: 130,
        // The cell value is the raw boolean, so the option values match it as text.
        ...optionsFilter<Carat>(
          [
            {
              value: 'true',
              label: 'Active',
              node: (
                <Badge variant="ghost" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Active
                </Badge>
              ),
            },
            {
              value: 'false',
              label: 'Inactive',
              node: (
                <Badge variant="ghost" className="bg-muted text-muted-foreground">
                  Inactive
                </Badge>
              ),
            },
          ],
          'All statuses'
        ),
        cellRenderer: (p: { data: Carat }) =>
          p.data.active ? (
            <Badge variant="ghost" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Active
            </Badge>
          ) : (
            <Badge variant="ghost" className="bg-muted text-muted-foreground">Inactive</Badge>
          ),
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
        cellRenderer: (p: { data: Carat }) => (
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
                label: p.data.active ? 'Deactivate' : 'Activate',
                icon: p.data.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />,
                onClick: () => toggleActive(p.data),
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
    [usageCount]
  )

  const inUse = toDelete ? usageCount.get(toDelete.id) ?? 0 : 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Carats"
        description="Manage the purity options products are tagged with (24K, 22K, 916, …)."
        action={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Add Carat
          </Button>
        }
      />

      <DataGrid
        stateKey="carats"
        searchPlaceholder="Search carats…"
        rowData={rows}
        columnDefs={columns}
        loading={isLoading}
      />

      <CaratFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
        nextOrder={nextOrder}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title="Delete carat?"
        description={
          inUse > 0
            ? `"${toDelete?.name}" is used by ${inUse} product${inUse === 1 ? '' : 's'}. Those products will be left without a carat and need reassigning — deactivate it instead if you only want to hide it from new products.`
            : `"${toDelete?.name}" will be removed.`
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return
          await deleteCarat(toDelete.id).unwrap()
          toast.success('Carat deleted')
          setToDelete(undefined)
        }}
      />
    </div>
  )
}

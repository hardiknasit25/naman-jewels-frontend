import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { ColDef } from 'ag-grid-community'
import { DataGrid } from '@/components/data/DataGrid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/responsive-dialog'
import { Field } from '@/components/shared/Field'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDate } from '@/lib/format'
import {
  useAddCustomerTypeMutation,
  useDeleteCustomerTypeMutation,
  useListCustomerTypesQuery,
  useUpdateCustomerTypeMutation,
} from '@/services/api'
import type { CustomerType } from '@/types'

const typeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  order: z.number({ message: 'Order must be a number' }).int().min(1, 'Order must be 1 or more'),
  description: z.string().optional(),
})
type TypeFormValues = z.infer<typeof typeSchema>

function TypeFormDialog({
  open,
  onOpenChange,
  record,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  record?: CustomerType
}) {
  const [addType, { isLoading: adding }] = useAddCustomerTypeMutation()
  const [updateType, { isLoading: updating }] = useUpdateCustomerTypeMutation()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TypeFormValues>({
    resolver: zodResolver(typeSchema),
    defaultValues: { name: '', order: 1, description: '' },
  })

  useEffect(() => {
    if (!open) return
    reset(
      record
        ? { name: record.name, order: record.order, description: record.description ?? '' }
        : { name: '', order: 1, description: '' }
    )
  }, [open, record, reset])

  const onSubmit = async (values: TypeFormValues) => {
    try {
      if (record) {
        await updateType({ id: record.id, patch: values }).unwrap()
        toast.success('Tier updated')
      } else {
        await addType(values).unwrap()
        toast.success('Tier added')
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
          <DialogTitle>{record ? 'Edit Tier' : 'Add Tier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <Field label="Tier Name" htmlFor="ct-name" error={errors.name?.message}>
            <Input id="ct-name" placeholder="e.g. Diamond" {...register('name')} />
          </Field>
          <Field
            label="Hierarchy Order"
            htmlFor="ct-order"
            hint="Higher number = higher tier"
            error={errors.order?.message}
          >
            <Input id="ct-order" type="number" min={1} {...register('order', { valueAsNumber: true })} />
          </Field>
          <Field label="Description" htmlFor="ct-desc" optional>
            <Input id="ct-desc" {...register('description')} />
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

export function CustomerTypesTab() {
  const { data: types, isLoading } = useListCustomerTypesQuery()
  const [deleteType] = useDeleteCustomerTypeMutation()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerType | undefined>()
  const [toDelete, setToDelete] = useState<CustomerType | undefined>()

  const rows = useMemo(
    () => [...(types ?? [])].sort((a, b) => a.order - b.order),
    [types]
  )

  const columns = useMemo<ColDef<CustomerType>[]>(
    () => [
      { headerName: 'Order', field: 'order', maxWidth: 110 },
      { headerName: 'Tier Name', field: 'name', minWidth: 160 },
      { headerName: 'Description', field: 'description', flex: 2 },
      {
        headerName: 'Created',
        field: 'createdAt',
        valueFormatter: (p) => formatDate(p.value),
      },
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
        cellRenderer: (p: { data: CustomerType }) => (
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
    []
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" /> Add Tier
        </Button>
      </div>

      <DataGrid rowData={rows} columnDefs={columns} loading={isLoading} />

      <TypeFormDialog open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title="Delete tier?"
        description={`"${toDelete?.name}" will be removed. Customers on this tier will need reassigning.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return
          await deleteType(toDelete.id).unwrap()
          toast.success('Tier deleted')
          setToDelete(undefined)
        }}
      />
    </div>
  )
}

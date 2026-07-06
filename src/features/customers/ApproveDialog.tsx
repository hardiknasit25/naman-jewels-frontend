import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/shared/Field'
import { SelectField } from '@/components/shared/SelectField'
import { useUpdateCustomerMutation } from '@/services/api'
import type { Customer, CustomerType } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer
  customerTypes: CustomerType[]
}

export function ApproveDialog({ open, onOpenChange, customer, customerTypes }: Props) {
  const [updateCustomer, { isLoading }] = useUpdateCustomerMutation()
  const defaultTypeId = String(
    customerTypes.find((t) => t.name === 'Public')?.id ?? customerTypes[0]?.id ?? ''
  )
  const [typeId, setTypeId] = useState(defaultTypeId)

  useEffect(() => {
    if (open) setTypeId(defaultTypeId)
  }, [open, defaultTypeId])

  const approve = async () => {
    if (!customer) return
    try {
      await updateCustomer({
        id: customer.id,
        patch: { status: 'active', customerTypeId: Number(typeId) },
      }).unwrap()
      toast.success(`${customer.companyName} approved`)
      onOpenChange(false)
    } catch {
      toast.error('Could not approve registration')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Registration</DialogTitle>
          <DialogDescription>
            Approve {customer?.companyName} and assign a customer type.
          </DialogDescription>
        </DialogHeader>

        <Field label="Customer Type" hint="Defaults to Public">
          <SelectField
            value={typeId}
            onValueChange={setTypeId}
            options={customerTypes.map((t) => ({ value: String(t.id), label: t.name }))}
          />
        </Field>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={approve} disabled={isLoading}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

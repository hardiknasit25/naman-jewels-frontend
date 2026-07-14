import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Input } from '@/components/ui/input'
import { Field } from '@/components/shared/Field'
import { SelectField } from '@/components/shared/SelectField'
import { customerSchema, type CustomerFormValues } from '@/features/customers/schema'
import {
  useAddCustomerMutation,
  useUpdateCustomerMutation,
} from '@/services/api'
import {
  SESSION_DURATION_LABELS,
  type Customer,
  type CustomerType,
  type SessionDuration,
} from '@/types'

const EMPTY: CustomerFormValues = {
  companyName: '',
  mobileNumber: '',
  email: '',
  password: '',
  address: '',
  city: '',
  referenceBy: '',
}

const sessionOptions = (Object.keys(SESSION_DURATION_LABELS) as SessionDuration[]).map(
  (v) => ({ value: v, label: SESSION_DURATION_LABELS[v] })
)

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer
  customerTypes: CustomerType[]
}

export function CustomerFormDialog({ open, onOpenChange, customer, customerTypes }: Props) {
  const isEdit = Boolean(customer)
  const [addCustomer, { isLoading: adding }] = useAddCustomerMutation()
  const [updateCustomer, { isLoading: updating }] = useUpdateCustomerMutation()

  const defaultTypeId = String(
    customerTypes.find((t) => t.name === 'Public')?.id ?? customerTypes[0]?.id ?? ''
  )
  const [typeId, setTypeId] = useState(defaultTypeId)
  const [session, setSession] = useState<SessionDuration>('1d')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY,
  })

  // Sync form + selects whenever the dialog opens or the target customer changes.
  useEffect(() => {
    if (!open) return
    if (customer) {
      reset({
        companyName: customer.companyName,
        mobileNumber: customer.mobileNumber,
        email: customer.email,
        // Never prefill the password hash; blank means "keep existing".
        password: '',
        address: customer.address,
        city: customer.city,
        referenceBy: customer.referenceBy ?? '',
      })
      setTypeId(customer.customerTypeId != null ? String(customer.customerTypeId) : defaultTypeId)
      setSession(customer.sessionDuration)
    } else {
      reset(EMPTY)
      setTypeId(defaultTypeId)
      setSession('1d')
    }
  }, [open, customer, defaultTypeId, reset])

  const onSubmit = async (values: CustomerFormValues) => {
    // Only send a password when one was actually entered; the backend rejects an
    // empty string (min 6) and a blank field means "keep the existing password".
    const { password, ...rest } = values
    const withPassword = password ? { ...rest, password } : rest
    try {
      if (customer) {
        await updateCustomer({
          id: customer.id,
          patch: { ...withPassword, customerTypeId: Number(typeId), sessionDuration: session },
        }).unwrap()
        toast.success('Customer updated')
      } else {
        await addCustomer({
          ...withPassword,
          customerTypeId: Number(typeId),
          sessionDuration: session,
          status: 'active',
          lastLogin: null,
        }).unwrap()
        toast.success('Customer added')
      }
      onOpenChange(false)
    } catch {
      toast.error('Something went wrong')
    }
  }

  const typeOptions = customerTypes.map((t) => ({ value: String(t.id), label: t.name }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update customer details, tier and session duration.'
              : 'Manually add a new (approved) customer.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <Field label="Company Name" htmlFor="companyName" error={errors.companyName?.message}>
            <Input id="companyName" {...register('companyName')} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile Number" htmlFor="mobileNumber" hint="Also used for login" error={errors.mobileNumber?.message}>
              <Input id="mobileNumber" {...register('mobileNumber')} />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} />
            </Field>
          </div>

          <Field
            label="Password"
            htmlFor="password"
            hint={isEdit ? 'Leave blank to keep the current password' : 'Used for customer app login'}
            error={errors.password?.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={isEdit ? '••••••••' : 'Min 6 characters'}
              {...register('password')}
            />
          </Field>

          <Field label="Address" htmlFor="address" error={errors.address?.message}>
            <Input id="address" {...register('address')} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" htmlFor="city" error={errors.city?.message}>
              <Input id="city" {...register('city')} />
            </Field>
            <Field label="Reference By" htmlFor="referenceBy" optional>
              <Input id="referenceBy" {...register('referenceBy')} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer Type" hint="Tier / hierarchy">
              <SelectField value={typeId} onValueChange={setTypeId} options={typeOptions} />
            </Field>
            <Field label="Session Duration" hint="Auto logout after">
              <SelectField
                value={session}
                onValueChange={(v) => setSession(v as SessionDuration)}
                options={sessionOptions}
              />
            </Field>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={adding || updating}>
              {isEdit ? 'Save Changes' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

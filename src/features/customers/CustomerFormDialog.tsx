import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
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
  password: '',
  confirmPassword: '',
  city: '',
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
        // Never prefill the password hash; blank means "keep existing".
        password: '',
        confirmPassword: '',
        city: customer.city,
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
    // confirmPassword only exists to validate the form (see schema.ts).
    const { password, confirmPassword: _confirmPassword, ...rest } = values
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
      <DialogContent className="scrollbar-tw max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
            <Field label="City" htmlFor="city" error={errors.city?.message}>
              <Input id="city" {...register('city')} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Password"
              htmlFor="password"
              hint={isEdit ? 'Leave blank to keep the current password' : 'Used for customer app login'}
              error={errors.password?.message}
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-9"
                  placeholder={isEdit ? '••••••••' : 'Min 6 characters'}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <Field
              label="Confirm Password"
              htmlFor="confirmPassword"
              error={errors.confirmPassword?.message}
            >
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-9"
                  placeholder={isEdit ? '••••••••' : 'Re-enter password'}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
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
            <Button type="submit" loading={adding || updating}>
              {adding || updating ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

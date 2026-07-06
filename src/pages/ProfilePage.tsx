import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Field } from '@/components/shared/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  mobile: z.string().min(7, 'Enter a valid mobile number'),
})
type ProfileValues = z.infer<typeof schema>

export function ProfilePage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: 'Naman Admin',
      email: 'admin@namanjewels.com',
      mobile: '9825000000',
    },
  })

  const onSubmit = (values: ProfileValues) => {
    // Wire to a real API later.
    console.log('profile saved', values)
    toast.success('Profile saved')
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      <PageHeader title="Profile" description="Manage your admin account details." />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <Field label="Name" htmlFor="name" error={errors.name?.message}>
              <Input id="name" {...register('name')} />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} />
            </Field>
            <Field label="Mobile" htmlFor="mobile" error={errors.mobile?.message}>
              <Input id="mobile" {...register('mobile')} />
            </Field>
            <div className="pt-2">
              <Button type="submit" disabled={!isDirty}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

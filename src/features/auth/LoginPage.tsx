import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/AuthContext'
import { Field } from '@/components/shared/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type LoginValues = z.infer<typeof schema>

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@namanjewels.com', password: '' },
  })

  // Already signed in → skip the login screen.
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const onSubmit = async (values: LoginValues) => {
    const ok = await login(values.email, values.password)
    if (ok) {
      toast.success('Welcome back')
      navigate('/dashboard', { replace: true })
    } else {
      toast.error('Invalid credentials')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary font-heading text-sm font-semibold text-primary-foreground">
            NJ
          </div>
          <CardTitle>Naman Jewels Admin</CardTitle>
          <CardDescription>Sign in to continue to your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
              <Input id="login-email" type="email" autoComplete="email" {...register('email')} />
            </Field>
            <Field label="Password" htmlFor="login-password" error={errors.password?.message}>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
            </Field>
            <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
              Sign in
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Default: admin@namanjewels.com / admin123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

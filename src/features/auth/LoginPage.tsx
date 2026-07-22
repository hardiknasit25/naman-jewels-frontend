import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthContext";
import { Field } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import logo from "@/assets/naman_jewels_logo.png";
import mark from "@/assets/naman_jewels_mark.png";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@namanjewels.com", password: "" },
  });

  // Already signed in → skip the login screen.
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const onSubmit = async (values: LoginValues) => {
    const ok = await login(values.email, values.password);
    if (ok) {
      toast.success("Welcome back");
      navigate("/dashboard", { replace: true });
    } else {
      toast.error("Invalid credentials");
    }
  };

  return (
    <div className="relative flex min-h-screen">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Brand sidebar — shown on large screens only. */}
      <aside className="hidden w-1/2 flex-col items-center justify-center bg-linear-to-br from-zinc-900 via-zinc-950 to-black p-12 lg:flex">
        <img
          src={logo}
          alt="Naman Jewels"
          className="w-full max-w-md object-contain"
        />
      </aside>

      {/* Login panel. */}
      <div className="flex flex-1 items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
        <CardHeader>
          <img
            src={mark}
            alt="Naman Jewels"
            className="mb-2 size-12 object-contain"
          />
          <CardTitle>Naman Jewels Admin</CardTitle>
          <CardDescription>
            Sign in to continue to your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <Field
              label="Email"
              htmlFor="login-email"
              error={errors.email?.message}
            >
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
            </Field>
            <Field
              label="Password"
              htmlFor="login-password"
              error={errors.password?.message}
            >
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-9"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </Field>
            <Button
              type="submit"
              className="mt-1 w-full"
              disabled={isSubmitting}
            >
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  /** May be async — the dialog shows a spinner until it settles. */
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)

  // The action runs here rather than in the caller's onClick so every confirm
  // gets the same treatment: a spinner while it's in flight, no double-submit,
  // and the dialog held open (with a toast) if it fails.
  const handleConfirm = async () => {
    if (pending) return
    setPending(true)
    try {
      await onConfirm()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      // Don't let a click-away or Esc abandon an action that's already running.
      onOpenChange={(next) => {
        if (pending && !next) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            loading={pending}
            onClick={handleConfirm}
          >
            {pending ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

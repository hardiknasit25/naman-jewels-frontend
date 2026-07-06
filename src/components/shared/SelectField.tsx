import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  id?: string
  className?: string
}

/** Thin wrapper over shadcn Select for simple value/label option lists. */
export function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  className,
}: SelectFieldProps) {
  // `items` lets SelectValue render the human label instead of the raw value.
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]))

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => onValueChange(String(v))}
    >
      <SelectTrigger id={id} className={className ?? 'w-full'}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

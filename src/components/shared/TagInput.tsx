import { useId, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface TagInputProps {
  id?: string
  value: string[]
  onChange: (tags: string[]) => void
  /** Tags already used elsewhere, offered as the admin types. */
  suggestions?: string[]
  placeholder?: string
}

/**
 * Free-form tag entry: type a tag and press Enter (or a comma) to add it as a
 * chip; × or Backspace on an empty box removes one. Duplicates are ignored
 * regardless of case, so "Bridal" and "bridal" never both end up on a product.
 */
export function TagInput({ id, value, onChange, suggestions = [], placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const listId = useId()
  const has = (tag: string) => value.some((t) => t.toLowerCase() === tag.toLowerCase())

  const add = (raw: string) => {
    const tag = raw.trim().replace(/,+$/, '').trim()
    if (tag && !has(tag)) onChange([...value, tag])
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="grid gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="outline" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        id={id}
        list={listId}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        // A tag typed but not yet Entered still counts once the admin moves on.
        onBlur={() => draft.trim() && add(draft)}
      />
      <datalist id={listId}>
        {suggestions.filter((s) => !has(s)).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}

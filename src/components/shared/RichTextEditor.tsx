import { useEffect, useRef } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface RichTextEditorProps {
  /** Initial HTML. The editor is uncontrolled after mount to keep the caret stable. */
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

// document.execCommand is deprecated but still universally supported and keeps
// this editor dependency-free. Fine for editing static content pages.
function exec(command: string, arg?: string) {
  document.execCommand(command, false, arg)
}

interface ToolButton {
  icon: typeof Bold
  label: string
  onClick: () => void
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Seed the initial HTML once (component is remounted via `key` when the
  // edited record changes, so this stays in sync without clobbering the caret).
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => onChange(ref.current?.innerHTML ?? '')

  const run = (command: string, arg?: string) => {
    ref.current?.focus()
    exec(command, arg)
    emit()
  }

  const addLink = () => {
    const url = window.prompt('Link URL')
    if (url) run('createLink', url)
  }

  const groups: ToolButton[][] = [
    [
      { icon: Bold, label: 'Bold', onClick: () => run('bold') },
      { icon: Italic, label: 'Italic', onClick: () => run('italic') },
      { icon: Underline, label: 'Underline', onClick: () => run('underline') },
    ],
    [
      { icon: Heading2, label: 'Heading 2', onClick: () => run('formatBlock', 'H2') },
      { icon: Heading3, label: 'Heading 3', onClick: () => run('formatBlock', 'H3') },
    ],
    [
      { icon: List, label: 'Bullet list', onClick: () => run('insertUnorderedList') },
      { icon: ListOrdered, label: 'Numbered list', onClick: () => run('insertOrderedList') },
      { icon: Link2, label: 'Link', onClick: addLink },
    ],
    [
      { icon: Undo2, label: 'Undo', onClick: () => run('undo') },
      { icon: Redo2, label: 'Redo', onClick: () => run('redo') },
    ],
  ]

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-background', className)}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1.5">
        {groups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5 border-r pr-1 last:border-r-0">
            {group.map((b) => (
              <Button
                key={b.label}
                type="button"
                variant="ghost"
                size="icon-sm"
                title={b.label}
                aria-label={b.label}
                // preventDefault keeps focus/selection in the editor on click.
                onMouseDown={(e) => e.preventDefault()}
                onClick={b.onClick}
              >
                <b.icon className="size-4" />
              </Button>
            ))}
          </div>
        ))}
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        className="rich-content max-h-[45vh] min-h-40 overflow-y-auto px-4 py-3"
      />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Eye, Save, FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { RichTextEditor } from '@/components/shared/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/responsive-dialog'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import {
  useListStaticPagesQuery,
  useUpdateStaticPageMutation,
} from '@/services/api'
import type { Id } from '@/types'

export function PagesPage() {
  const { data: pages = [], isLoading } = useListStaticPagesQuery()
  const [updatePage, { isLoading: saving }] = useUpdateStaticPageMutation()

  const [selectedId, setSelectedId] = useState<Id | null>(null)
  const [draft, setDraft] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const selected = useMemo(
    () => pages.find((p) => p.id === selectedId) ?? pages[0],
    [pages, selectedId]
  )

  // Default to the first page and load its content into the draft.
  useEffect(() => {
    if (!selected) return
    if (!selectedId) setSelectedId(selected.id)
    setDraft(selected.content)
  }, [selected, selectedId])

  const dirty = selected ? draft !== selected.content : false

  const save = async () => {
    if (!selected) return
    await updatePage({
      id: selected.id,
      patch: { content: draft, updatedAt: new Date().toISOString() },
    }).unwrap()
    toast.success(`${selected.title} saved`)
  }

  return (
    <div className="scrollbar-tw flex h-full flex-col gap-6 overflow-y-auto">
      <PageHeader
        title="Content Pages"
        description="Edit Contact, About Us and Terms with a rich text editor."
      />

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* Page selector */}
        <nav className="scrollbar-tw flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors lg:w-full',
                p.id === selected?.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <FileText className="size-4" />
              {p.title}
            </button>
          ))}
        </nav>

        {/* Editor */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-heading text-lg font-semibold">{selected?.title}</h2>
                {selected && (
                  <p className="text-xs text-muted-foreground">
                    Last updated {formatDateTime(selected.updatedAt)}
                    {dirty && ' · unsaved changes'}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                  <Eye className="size-4" /> Preview
                </Button>
                <Button onClick={save} disabled={!dirty || saving}>
                  <Save className="size-4" /> Save
                </Button>
              </div>
            </div>

            {isLoading || !selected ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <RichTextEditor
                key={selected.id}
                value={selected.content}
                onChange={setDraft}
                placeholder="Write page content…"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="scrollbar-tw max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview — {selected?.title}</DialogTitle>
          </DialogHeader>
          <div
            className="rich-content rounded-lg border bg-background p-4"
            dangerouslySetInnerHTML={{ __html: draft || '<p>Nothing to preview.</p>' }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

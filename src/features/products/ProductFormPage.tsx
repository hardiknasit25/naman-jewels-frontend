import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Plus, ImageIcon, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Field } from '@/components/shared/Field'
import { SelectField } from '@/components/shared/SelectField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  useAddProductMutation,
  useListCategoriesQuery,
  useListCustomerTypesQuery,
  useListProductsQuery,
  useUpdateProductMutation,
} from '@/services/api'
import { audienceFor, sortTiers } from '@/lib/tiers'
import type { CustomerType, Id, Product, ProductStatus } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'Product Code / SKU is required'),
  grossWeight: z.number({ message: 'Enter a valid weight in grams' }).positive('Enter a valid weight in grams'),
  netWeight: z.string().optional(),
  size: z.string().optional(),
  purity: z.string().min(1, 'Purity / metal is required'),
  stoneDetails: z.string().optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

/**
 * 2.2 Tier tagging — toggle a product into one or more customer types. Rendered as
 * toggle chips rather than a multi-select because tier lists are short and the
 * cumulative reach needs to stay readable while you pick.
 */
function TierPicker({
  tiers,
  value,
  onChange,
}: {
  tiers: CustomerType[]
  value: Id[]
  onChange: (ids: Id[]) => void
}) {
  const toggle = (id: Id) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  if (tiers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No customer types defined yet — add tiers under Customer Types first.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sortTiers(tiers).map((tier) => {
        const active = value.includes(tier.id)
        return (
          <button
            key={tier.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(tier.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:bg-muted'
            )}
          >
            {tier.name}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Full-page create/update product form. Edit mode is keyed off the `:id` route
 * param; create mode renders when there is no id. The image gallery sits in a
 * dedicated column that moves to the right on laptops (lg+) and stacks on top
 * on smaller screens.
 */
export function ProductFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  const { data: products, isLoading: productsLoading } = useListProductsQuery()
  const { data: categories } = useListCategoriesQuery()
  const { data: customerTypes } = useListCustomerTypesQuery()

  const tiers = useMemo(() => customerTypes ?? [], [customerTypes])
  const categoryOptions = useMemo(
    () => (categories ?? []).map((c) => ({ value: String(c.id), label: c.name })),
    [categories]
  )

  const isEdit = id != null
  const record = useMemo<Product | undefined>(
    () => (isEdit ? (products ?? []).find((p) => String(p.id) === id) : undefined),
    [isEdit, products, id]
  )

  const [addProduct, { isLoading: adding }] = useAddProductMutation()
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation()
  const [categoryId, setCategoryId] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [status, setStatus] = useState<ProductStatus>('live')
  const [customerTypeIds, setCustomerTypeIds] = useState<Id[]>([])
  // Itemized "less weight" breakdown. Weight kept as a string while editing so the
  // input can be empty / mid-typed; converted to a number on submit.
  const [lessFactors, setLessFactors] = useState<{ label: string; weight: string }[]>([])

  const addFactor = () => setLessFactors((rows) => [...rows, { label: '', weight: '' }])
  const updateFactor = (index: number, key: 'label' | 'weight', value: string) =>
    setLessFactors((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)))
  const removeFactor = (index: number) =>
    setLessFactors((rows) => rows.filter((_, i) => i !== index))
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openFilePicker = () => fileInputRef.current?.click()

  // Number of empty placeholder slots to always surface so the user can see
  // where images go. Real previews fill these first; a "+" tile handles the rest.
  const PLACEHOLDER_SLOTS = 3

  const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  // Encode and append any number of image files (from a picker or a drop). No limit.
  const addFiles = async (fileList: FileList | File[] | null) => {
    const files = Array.from(fileList ?? []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    const encoded = await Promise.all(files.map(readFile))
    setImages((current) => [...current, ...encoded])
  }

  const onImagesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    // Materialise the (live) FileList into an array BEFORE resetting the input —
    // clearing e.target.value empties e.target.files, so reading it afterwards
    // (inside the async addFiles) would find nothing.
    const files = Array.from(e.target.files ?? [])
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = ''
    await addFiles(files)
  }

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    await addFiles(e.dataTransfer.files)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!dragActive) setDragActive(true)
  }

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only clear when leaving the dropzone itself, not its children.
    if (e.currentTarget === e.target) setDragActive(false)
  }

  const removeImage = (index: number) =>
    setImages((current) => current.filter((_, i) => i !== index))

  // How many empty dashed placeholders to render after the existing previews.
  const emptySlots = Math.max(0, PLACEHOLDER_SLOTS - images.length)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // Hydrate the form once the record (edit) or category list (create) is ready.
  useEffect(() => {
    if (isEdit) {
      if (!record) return
      reset({
        name: record.name,
        sku: record.sku,
        grossWeight: record.grossWeight,
        netWeight: record.netWeight != null ? String(record.netWeight) : '',
        size: record.size ?? '',
        purity: record.purity,
        stoneDetails: record.stoneDetails ?? '',
        notes: record.notes ?? '',
      })
      setCategoryId(String(record.categoryId))
      // Prefer the images array; fall back to the legacy single imageUrl.
      setImages(record.images?.length ? record.images : record.imageUrl ? [record.imageUrl] : [])
      setStatus(record.status ?? 'live')
      setCustomerTypeIds(record.customerTypeIds ?? [])
      setLessFactors((record.lessFactors ?? []).map((r) => ({ label: r.label, weight: String(r.weight) })))
    } else {
      reset({ name: '', sku: '', grossWeight: undefined, netWeight: '', size: '', purity: '', stoneDetails: '', notes: '' })
      setCategoryId(categoryOptions[0]?.value ?? '')
      setImages([])
      setStatus('live')
      // No tags = visible to every tier, which matches the "Public" default.
      setCustomerTypeIds([])
      setLessFactors([])
    }
  }, [isEdit, record, reset, categoryOptions])

  // Spell out the cumulative reach (2.2) as the admin tags tiers — tagging Gold
  // silently also exposes the product to Platinum, which is easy to miss.
  const audience = audienceFor(tiers, customerTypeIds)
  const audienceHint =
    status === 'private'
      ? 'Status is Private — no customer sees this product, whichever tiers are tagged.'
      : customerTypeIds.length === 0
        ? tiers.length === 0
          ? 'No customer types defined yet — every customer will see this product.'
          : 'Untagged — every customer type will see this product.'
        : audience.length === 0
          ? 'The tagged tiers no longer exist — no customer will see this product.'
          : `Visible to ${audience.map((t) => t.name).join(', ')} — higher tiers always see lower tiers' products.`

  const goBack = () => navigate('/products')

  const onSubmit = async (values: FormValues) => {
    if (!categoryId) {
      toast.error('Please select a category')
      return
    }
    const payload = {
      name: values.name,
      sku: values.sku,
      categoryId: Number(categoryId),
      grossWeight: values.grossWeight,
      netWeight: values.netWeight ? Number(values.netWeight) : null,
      // Keep only complete rows (a label and a valid number), stored as numbers.
      lessFactors: lessFactors
        .map((r) => ({ label: r.label.trim(), weight: Number(r.weight) }))
        .filter((r) => r.label.length > 0 && Number.isFinite(r.weight)),
      size: values.size,
      purity: values.purity,
      stoneDetails: values.stoneDetails,
      notes: values.notes,
      images,
      // Keep the primary imageUrl in sync (first image) for list thumbnails / consumers.
      imageUrl: images[0] ?? '',
      status,
      customerTypeIds,
    }
    try {
      if (isEdit && record) {
        await updateProduct({ id: record.id, patch: payload }).unwrap()
        toast.success('Product updated')
      } else {
        await addProduct(payload).unwrap()
        toast.success('Product added')
      }
      goBack()
    } catch {
      toast.error('Something went wrong')
    }
  }

  // Edit route pointing at a product that doesn't exist (bad id / deleted).
  if (isEdit && !productsLoading && !record) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <PageHeader title="Product not found" description="This product no longer exists." />
        <div>
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="size-4" /> Back to Products
          </Button>
        </div>
      </div>
    )
  }

  const imageSection = (
    // Fills the right column's height on laptops so the gallery scrolls inside
    // the fixed panel instead of stretching the page.
    <div className="flex flex-col gap-1.5 lg:min-h-0 lg:flex-1">
      <Label htmlFor="p-image">
        Product Images
        <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
      </Label>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          'flex flex-col rounded-xl border-2 border-dashed p-3 transition-colors lg:min-h-0 lg:flex-1',
          dragActive ? 'border-primary bg-primary/5' : 'border-border'
        )}
      >
        {/* Full-width single column inside the right (laptop) section; multi-column
            only when the section is stacked full-bleed on tablet / mobile.
            On laptops it fills the remaining height and scrolls when overflowing. */}
        <div className="scrollbar-tw flex flex-wrap gap-3 lg:min-h-0 lg:flex-1 lg:content-start lg:overflow-y-auto lg:pr-1">
          {images.map((src, i) => (
            <div key={i} className="group relative aspect-square w-24">
              <img
                src={src}
                alt={`Product image ${i + 1}`}
                className="h-full w-full rounded-lg border bg-muted/40 object-contain"
              />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Main
                </span>
              )}
              <button
                type="button"
                aria-label="Remove image"
                className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"
                onClick={() => removeImage(i)}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}

          {/* Empty placeholder slots (at least 3) so users see where images go.
              Compact tiles so all three fit the panel height without scrolling. */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <button
              key={`ph-${i}`}
              type="button"
              onClick={openFilePicker}
              aria-label="Add image"
              className="flex aspect-square w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed bg-muted/40 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted"
            >
              <ImageIcon className="size-5" />
            </button>
          ))}

          {/* Once the placeholders are filled, an unlimited "add more" tile. */}
          {emptySlots === 0 && (
            <button
              type="button"
              onClick={openFilePicker}
              aria-label="Add more images"
              className="flex aspect-square w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed bg-muted/40 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted"
            >
              <Plus className="size-5" />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          id="p-image"
          type="file"
          accept="image/*"
          multiple
          onChange={onImagesChange}
          className="sr-only"
        />
        {images.length > 0 && (
          <p className="mt-3 shrink-0 text-center text-xs text-muted-foreground">
            {`${images.length} image${images.length === 1 ? '' : 's'} added — drag & drop or use “Add more” to upload as many as you like`}
          </p>
        )}
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">
        Drag & drop or click a slot to upload. The first image is used as the main thumbnail.
      </p>
    </div>
  )

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
    >
      {/* Header: back icon + title on the left, Cancel / Save actions on the right. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={goBack}
            aria-label="Back to Products"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="font-heading text-xl font-semibold sm:text-2xl">
              {isEdit ? 'Edit Product' : 'Add Product'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Products are shown without a price.</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={goBack}>
            Cancel
          </Button>
          <Button type="submit" disabled={adding || updating}>
            {isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </div>

      {/* Flex row on laptops: details fill the left, images are a fixed-width block
          pinned to the right. Stacks (images on top) on tablet / mobile. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Details */}
          <div className="order-2 grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6 lg:order-1 lg:min-h-[calc(100vh-2rem)] lg:min-w-0 lg:flex-1 lg:content-start">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product Name" htmlFor="p-name" error={errors.name?.message}>
                <Input id="p-name" {...register('name')} />
              </Field>
              <Field label="Product Code / SKU" htmlFor="p-sku" error={errors.sku?.message}>
                <Input id="p-sku" placeholder="e.g. RG-1042" {...register('sku')} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <SelectField value={categoryId} onValueChange={setCategoryId} options={categoryOptions} placeholder="Select category" />
              </Field>
              <Field
                label="Status"
                hint={
                  status === 'private'
                    ? 'Hidden from the customer app'
                    : 'Published to the customer app'
                }
              >
                <SelectField
                  value={status}
                  onValueChange={(v) => setStatus(v as ProductStatus)}
                  options={[
                    { value: 'live', label: 'Live (published)' },
                    { value: 'private', label: 'Private (hidden)' },
                  ]}
                />
              </Field>
            </div>

            <Field
              label="Visible to Customer Types"
              optional
              hint={audienceHint}
            >
              <TierPicker tiers={tiers} value={customerTypeIds} onChange={setCustomerTypeIds} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Gross Weight (gm)" htmlFor="p-gw" error={errors.grossWeight?.message}>
                <Input id="p-gw" type="number" step="0.01" {...register('grossWeight', { valueAsNumber: true })} />
              </Field>
              <Field label="Net Weight (gm)" htmlFor="p-nw" optional>
                <Input id="p-nw" type="number" step="0.01" {...register('netWeight')} />
              </Field>
            </div>

            <Field
              label="Less Weight Factors"
              optional
              hint="Itemized breakdown of the deducted (less) weight — add a row per factor (Stone, Kundan, Meena…). Shown on the product page; does not change Gross/Net."
            >
              <div className="grid gap-2">
                {lessFactors.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Factor (e.g. Stone)"
                      value={row.label}
                      onChange={(e) => updateFactor(i, 'label', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Weight (gm)"
                      value={row.weight}
                      onChange={(e) => updateFactor(i, 'weight', e.target.value)}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Remove factor"
                      onClick={() => removeFactor(i)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <div>
                  <Button type="button" variant="outline" size="sm" onClick={addFactor}>
                    <Plus className="size-4" /> Add factor
                  </Button>
                </div>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Size" htmlFor="p-size" optional hint="Ring size / chain length / diameter">
                <Input id="p-size" {...register('size')} />
              </Field>
              <Field label="Purity / Metal" htmlFor="p-purity" error={errors.purity?.message}>
                <Input id="p-purity" placeholder="e.g. 22K Gold" {...register('purity')} />
              </Field>
            </div>

            <Field label="Stone Details" htmlFor="p-stone" optional>
              <Input id="p-stone" placeholder="Type, weight/carat, quantity" {...register('stoneDetails')} />
            </Field>
            <Field label="Other Notes / Tags" htmlFor="p-notes" optional>
              <Input id="p-notes" {...register('notes')} />
            </Field>
          </div>

          {/* Images — fixed-width block on the right on laptops, sticky so it stays
              in view while scrolling the details. */}
          <div className="order-1 flex w-full flex-col rounded-xl border bg-card p-4 shadow-sm sm:p-6 lg:order-2 lg:w-90 lg:shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] xl:w-105">
            {imageSection}
          </div>
        </div>
    </form>
  )
}

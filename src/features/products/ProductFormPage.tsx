import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Plus, ImageIcon, X, Crop as CropIcon } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Field } from '@/components/shared/Field'
import { SelectField } from '@/components/shared/SelectField'
import { ImageCropperDialog } from '@/components/shared/ImageCropperDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { fileToDataUrl } from '@/lib/cropImage'
import {
  useAddProductMutation,
  useListCaratsQuery,
  useListCategoriesQuery,
  useListCustomerTypesQuery,
  useListProductsQuery,
  useUpdateProductMutation,
} from '@/services/api'
import { audienceFor, sortTiers } from '@/lib/tiers'
import type { CustomerType, Id, Product, ProductStatus } from '@/types'

const schema = z.object({
  // Optional: left blank, the product takes the name of its category on submit.
  name: z.string().optional(),
  sku: z.string().min(1, 'Product Code / SKU is required'),
  grossWeight: z.number({ message: 'Enter a valid weight in grams' }).positive('Enter a valid weight in grams'),
  netWeight: z.string().optional(),
  size: z.string().optional(),
  stoneDetails: z.string().optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

/**
 * Product images crop freely — `null` lets the admin cut any rectangle rather
 * than forcing the piece into a square. The customer app's tiles size the image
 * to fit, so mixed ratios still line up.
 */
const PRODUCT_ASPECT = null

/** Round to milligrams — floating point sums of 0.001-precision inputs drift. */
const round3 = (n: number) => Math.round(n * 1000) / 1000

/**
 * One titled block of the form. The page is long enough that a single flat card
 * made it hard to find anything; each concern gets its own panel and heading.
 */
function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

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
  const { data: carats } = useListCaratsQuery()

  const tiers = useMemo(() => customerTypes ?? [], [customerTypes])
  const categoryOptions = useMemo(
    () => (categories ?? []).map((c) => ({ value: String(c.id), label: c.name })),
    [categories]
  )

  // Only active carats are offered for new products (see the Carats master).
  const activeCaratOptions = useMemo(
    () =>
      [...(carats ?? [])]
        .sort((a, b) => a.order - b.order)
        .filter((c) => c.active)
        .map((c) => ({ value: String(c.id), label: c.purity ? `${c.name} (${c.purity})` : c.name })),
    [carats]
  )

  const isEdit = id != null
  const record = useMemo<Product | undefined>(
    () => (isEdit ? (products ?? []).find((p) => String(p.id) === id) : undefined),
    [isEdit, products, id]
  )

  const [addProduct, { isLoading: adding }] = useAddProductMutation()
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation()
  const [categoryId, setCategoryId] = useState('')
  const [caratId, setCaratId] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [status, setStatus] = useState<ProductStatus>('live')
  const [customerTypeIds, setCustomerTypeIds] = useState<Id[]>([])
  // Name of the selected category — the fallback for an empty product name, so a
  // piece is never saved untitled.
  const categoryLabel = useMemo(
    () => categoryOptions.find((o) => o.value === categoryId)?.label ?? '',
    [categoryOptions, categoryId]
  )
  // Itemized "less weight" breakdown. Weight kept as a string while editing so the
  // input can be empty / mid-typed; converted to a number on submit.
  const [lessFactors, setLessFactors] = useState<{ label: string; weight: string }[]>([])

  const addFactor = () => setLessFactors((rows) => [...rows, { label: '', weight: '' }])
  const updateFactor = (index: number, key: 'label' | 'weight', value: string) =>
    setLessFactors((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)))
  const removeFactor = (index: number) =>
    setLessFactors((rows) => rows.filter((_, i) => i !== index))
  const [dragActive, setDragActive] = useState(false)
  // Images waiting to go through the cropper. Non-empty opens the crop dialog,
  // which walks them one at a time before anything reaches `images`.
  const [cropQueue, setCropQueue] = useState<string[]>([])
  // Set when re-cropping an image already in the gallery — the result replaces
  // that slot instead of being appended.
  const [recropIndex, setRecropIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openFilePicker = () => fileInputRef.current?.click()

  // Number of empty placeholder slots to always surface so the user can see
  // where images go. Real previews fill these first; a "+" tile handles the rest.
  const PLACEHOLDER_SLOTS = 3

  // Queue any number of image files (from a picker or a drop) for cropping. No
  // limit. Nothing is added to the gallery until the crop dialog is confirmed.
  const addFiles = async (fileList: FileList | File[] | null) => {
    const files = Array.from(fileList ?? []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    const encoded = await Promise.all(files.map(fileToDataUrl))
    setRecropIndex(null)
    setCropQueue(encoded)
  }

  // Re-open the cropper for an image that's already in the gallery.
  const recropImage = (index: number) => {
    setRecropIndex(index)
    setCropQueue([images[index]])
  }

  const onCropDone = (cropped: string[]) => {
    setImages((current) =>
      recropIndex != null
        ? current.map((src, i) => (i === recropIndex ? cropped[0] ?? src : src))
        : [...current, ...cropped]
    )
    setRecropIndex(null)
    setCropQueue([])
  }

  const onCropCancel = () => {
    setRecropIndex(null)
    setCropQueue([])
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
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // ----- Net weight ---------------------------------------------------------
  // Net = Gross − the itemized less factors, recalculated as either side changes.
  // The field stays editable: the admin can type a measured net weight, which
  // sticks (and can be handed back to the formula via "Use calculated").
  const [netOverridden, setNetOverridden] = useState(false)
  const grossWeight = watch('grossWeight')
  const netWeight = watch('netWeight')

  const lessTotal = useMemo(
    () =>
      round3(
        lessFactors.reduce((sum, row) => {
          const weight = Number(row.weight)
          return Number.isFinite(weight) ? sum + weight : sum
        }, 0)
      ),
    [lessFactors]
  )

  const autoNet = useMemo(() => {
    if (grossWeight == null || !Number.isFinite(grossWeight)) return null
    return round3(grossWeight - lessTotal)
  }, [grossWeight, lessTotal])

  // Keep the field in step with the formula until the admin takes it over.
  useEffect(() => {
    if (netOverridden) return
    setValue('netWeight', autoNet != null ? String(autoNet) : '')
  }, [autoNet, netOverridden, setValue])

  const useCalculatedNet = () => {
    setNetOverridden(false)
    setValue('netWeight', autoNet != null ? String(autoNet) : '')
  }

  // The less factors can't add up to more than the piece weighs.
  const netError =
    autoNet != null && autoNet < 0
      ? `Less factors total ${lessTotal} gm, which is more than the gross weight.`
      : undefined

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
        stoneDetails: record.stoneDetails ?? '',
        notes: record.notes ?? '',
      })
      setCategoryId(String(record.categoryId))
      setCaratId(record.caratId != null ? String(record.caratId) : '')
      // Prefer the images array; fall back to the legacy single imageUrl.
      setImages(record.images?.length ? record.images : record.imageUrl ? [record.imageUrl] : [])
      setStatus(record.status ?? 'live')
      setCustomerTypeIds(record.customerTypeIds ?? [])
      setLessFactors((record.lessFactors ?? []).map((r) => ({ label: r.label, weight: String(r.weight) })))
      // A stored net that doesn't match Gross − Less was entered by hand; keep it
      // that way instead of silently recalculating it out from under the admin.
      const storedLess = round3(
        (record.lessFactors ?? []).reduce((sum, r) => sum + (Number(r.weight) || 0), 0)
      )
      const calculated = round3(record.grossWeight - storedLess)
      setNetOverridden(
        record.netWeight != null && Math.abs(record.netWeight - calculated) > 0.0005
      )
    } else {
      reset({ name: '', sku: '', grossWeight: undefined, netWeight: '', size: '', stoneDetails: '', notes: '' })
      setCategoryId(categoryOptions[0]?.value ?? '')
      setCaratId(activeCaratOptions[0]?.value ?? '')
      setImages([])
      setStatus('live')
      // No tags = visible to every tier, which matches the "Public" default.
      setCustomerTypeIds([])
      setLessFactors([])
      setNetOverridden(false)
    }
  }, [isEdit, record, reset, categoryOptions, activeCaratOptions])

  // A product may still point at a carat that has since been deactivated. Keep it
  // in the list (flagged) so opening the form doesn't silently change its purity.
  const caratOptions = useMemo(() => {
    if (!caratId || activeCaratOptions.some((o) => o.value === caratId)) return activeCaratOptions
    const own = (carats ?? []).find((c) => String(c.id) === caratId)
    if (!own) return activeCaratOptions
    const label = own.purity ? `${own.name} (${own.purity})` : own.name
    return [...activeCaratOptions, { value: String(own.id), label: `${label} — inactive` }]
  }, [activeCaratOptions, carats, caratId])

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
    if (!caratId) {
      toast.error('Please select a carat')
      return
    }
    if (netError) {
      toast.error(netError)
      return
    }
    // Blank name → use the category ("Rings", "Bangles"), which is how most of
    // the catalogue is described anyway.
    const name = values.name?.trim() || categoryLabel
    if (!name) {
      toast.error('Enter a product name — the selected category has no name to fall back on')
      return
    }
    const payload = {
      name,
      sku: values.sku,
      categoryId: Number(categoryId),
      caratId: Number(caratId),
      grossWeight: values.grossWeight,
      netWeight: values.netWeight ? Number(values.netWeight) : null,
      // Keep only complete rows (a label and a valid number), stored as numbers.
      lessFactors: lessFactors
        .map((r) => ({ label: r.label.trim(), weight: Number(r.weight) }))
        .filter((r) => r.label.length > 0 && Number.isFinite(r.weight)),
      size: values.size,
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
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      {/* Matches the heading style of the detail sections on the left. */}
      <div>
        <h2 className="font-heading text-base font-semibold">
          Product Images
          <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Drag &amp; drop or click a slot to upload. Crop each image to any shape you
          like — the first one is used as the main thumbnail.
        </p>
      </div>
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
                aria-label="Re-crop image"
                title="Re-crop"
                className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow ring-1 ring-border transition-opacity group-hover:opacity-100"
                onClick={() => recropImage(i)}
              >
                <CropIcon className="size-3.5" />
              </button>
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
          aria-label="Product images"
          className="sr-only"
        />
        {images.length > 0 && (
          <p className="mt-3 shrink-0 text-center text-xs text-muted-foreground">
            {`${images.length} image${images.length === 1 ? '' : 's'} added — there's no limit`}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
    >
      {/* Header: back icon + title. The Cancel / Save actions live in the sticky
          footer at the bottom of the form, where the eye ends up after filling it in. */}
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

      {/* Flex row on laptops: details fill the left, images are a fixed-width block
          pinned to the right. Stacks (images on top) on tablet / mobile. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Details — one card per concern rather than a single long slab, so the
              form reads as four short steps instead of eleven loose fields. */}
          <div className="order-2 flex flex-col gap-4 lg:order-1 lg:min-h-[calc(100vh-2rem)] lg:min-w-0 lg:flex-1">
            <Section
              title="Product Details"
              description="What the piece is and where it sits in the catalogue."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Product Name"
                  htmlFor="p-name"
                  optional
                  error={errors.name?.message}
                  hint={
                    categoryLabel
                      ? `Leave blank to use the category name — "${categoryLabel}".`
                      : 'Leave blank to use the category name.'
                  }
                >
                  <Input
                    id="p-name"
                    placeholder={categoryLabel || undefined}
                    {...register('name')}
                  />
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
                  label="Carat / Purity"
                  hint={
                    caratOptions.length === 0
                      ? 'No carats defined yet — add them under Carats first.'
                      : 'Managed in the Carats master'
                  }
                >
                  <SelectField
                    value={caratId}
                    onValueChange={setCaratId}
                    options={caratOptions}
                    placeholder="Select carat"
                  />
                </Field>
              </div>
            </Section>

            {/* Laid out as the calculation runs: Gross, what comes off it, what's left. */}
            <Section
              title="Weight"
              description="Gross weight, the factors deducted from it, and the net weight they leave."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Gross Weight (gm)" htmlFor="p-gw" error={errors.grossWeight?.message}>
                  <Input id="p-gw" type="number" step="0.01" {...register('grossWeight', { valueAsNumber: true })} />
                </Field>
              </div>

              <Field
                label="Less Weight Factors"
                optional
                hint="Itemized breakdown of the deducted (less) weight — add a row per factor (Stone, Kundan, Meena…). The total is subtracted from Gross to give the Net weight below."
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
                  <div className="flex items-center justify-between gap-3">
                    <Button type="button" variant="outline" size="sm" onClick={addFactor}>
                      <Plus className="size-4" /> Add factor
                    </Button>
                    {/* The running total is otherwise only visible buried in the
                        Net Weight hint. */}
                    {lessFactors.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Total less{' '}
                        <span className="font-medium text-foreground">{lessTotal} gm</span>
                      </p>
                    )}
                  </div>
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Net Weight (gm)"
                  htmlFor="p-nw"
                  error={netError}
                  hint={
                    autoNet == null
                      ? 'Calculated from Gross − Less factors once a gross weight is entered.'
                      : netOverridden
                        ? `Entered manually. Calculated value is ${autoNet} gm (Gross ${grossWeight} − Less ${lessTotal}).`
                        : `Auto-calculated: Gross ${grossWeight} − Less ${lessTotal}. Type here to override.`
                  }
                >
                  <div className="flex items-center gap-2">
                    <Input
                      id="p-nw"
                      type="number"
                      step="0.001"
                      className="flex-1"
                      {...register('netWeight', {
                        // Typing hands the field over to the admin; the formula stops
                        // writing to it until "Use calculated" hands it back.
                        onChange: () => setNetOverridden(true),
                      })}
                    />
                    {netOverridden && autoNet != null && String(autoNet) !== netWeight && (
                      <Button type="button" variant="outline" size="sm" onClick={useCalculatedNet}>
                        Use {autoNet}
                      </Button>
                    )}
                  </div>
                </Field>
              </div>
            </Section>

            <Section
              title="Specifications"
              description="Optional detail rows shown on the product page in the customer app."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Size" htmlFor="p-size" optional hint="Ring size / chain length / diameter">
                  <Input id="p-size" {...register('size')} />
                </Field>
                <Field label="Stone Details" htmlFor="p-stone" optional>
                  <Input id="p-stone" placeholder="Type, weight/carat, quantity" {...register('stoneDetails')} />
                </Field>
              </div>
              <Field label="Other Notes / Tags" htmlFor="p-notes" optional>
                <Input id="p-notes" {...register('notes')} />
              </Field>
            </Section>

            <Section title="Visibility" description="Who can see this product in the customer app.">
              <div className="grid gap-4 sm:grid-cols-2">
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

              <Field label="Visible to Customer Types" optional hint={audienceHint}>
                <TierPicker tiers={tiers} value={customerTypeIds} onChange={setCustomerTypeIds} />
              </Field>
            </Section>
          </div>

          {/* Images — fixed-width block on the right on laptops, sticky so it stays
              in view while scrolling the details. */}
          <div className="order-1 flex w-full flex-col rounded-xl border bg-card p-4 shadow-sm sm:p-6 lg:order-2 lg:w-90 lg:shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] xl:w-105">
            {imageSection}
          </div>
        </div>

      {/* Sticky action bar — pinned to the bottom of the scrolling form so Save is
          always within reach, however long the details column gets. */}
      <div className="sticky bottom-0 z-20 mt-auto flex items-center justify-between gap-3 border-t bg-background/90 py-3 backdrop-blur">
        <p className="hidden text-sm text-muted-foreground sm:block">
          {autoNet != null
            ? `Gross ${grossWeight} gm · Less ${lessTotal} gm · Net ${netWeight || '—'} gm`
            : 'Enter a gross weight to calculate the net weight.'}
        </p>
        <div className="flex shrink-0 gap-2 max-sm:w-full">
          <Button type="button" variant="outline" onClick={goBack} className="max-sm:flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={adding || updating} className="max-sm:flex-1">
            {isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </div>

      <ImageCropperDialog
        sources={cropQueue}
        aspect={PRODUCT_ASPECT}
        onComplete={onCropDone}
        onCancel={onCropCancel}
        title={recropIndex != null ? 'Re-crop image' : 'Crop product image'}
        description="Drag a box over the part you want to keep, then pull its corners or edges to any size and shape."
      />
    </form>
  )
}

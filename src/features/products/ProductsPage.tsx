import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ImageIcon } from 'lucide-react'
import type { ColDef } from 'ag-grid-community'
import { DataGrid } from '@/components/data/DataGrid'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import {
  useDeleteProductMutation,
  useListCategoriesQuery,
  useListCustomerTypesQuery,
  useListProductsQuery,
} from '@/services/api'
import { audienceFor } from '@/lib/tiers'
import type { Id, Product } from '@/types'

export function ProductsPage() {
  const navigate = useNavigate()
  const { data: products, isLoading } = useListProductsQuery()
  const { data: categories } = useListCategoriesQuery()
  const { data: customerTypes } = useListCustomerTypesQuery()
  const [deleteProduct] = useDeleteProductMutation()

  const tiers = useMemo(() => customerTypes ?? [], [customerTypes])

  const [toDelete, setToDelete] = useState<Product | undefined>()

  const categoryName = useMemo(() => {
    const m = new Map((categories ?? []).map((c) => [c.id, c.name]))
    return (id?: Id) => (id != null ? m.get(id) ?? '—' : '—')
  }, [categories])

  // Which customer types can actually see a given product, as a readable list.
  const audienceNames = useMemo(
    () => (product?: Product) => {
      if (!product) return '—'
      if ((product.status ?? 'live') === 'private') return 'Nobody (private)'
      const reach = audienceFor(tiers, product.customerTypeIds ?? [])
      if (reach.length === 0) return (product.customerTypeIds?.length ?? 0) > 0 ? 'Nobody' : '—'
      // Untagged products reach everyone; say so instead of listing every tier.
      if ((product.customerTypeIds?.length ?? 0) === 0) return 'All customer types'
      return reach.map((t) => t.name).join(', ')
    },
    [tiers]
  )

  const columns = useMemo<ColDef<Product>[]>(
    () => [
      {
        headerName: 'Image',
        colId: 'image',
        width: 88,
        minWidth: 88,
        maxWidth: 88,
        sortable: false,
        filter: false,
        resizable: false,
        cellClass: 'px-2!',
        headerClass: 'nj-center-header',
        cellRenderer: (p: { data: Product }) => (
          <div className="flex h-full w-full items-center justify-center">
            {p.data.imageUrl ? (
              <img
                src={p.data.imageUrl}
                alt={p.data.name}
                className="size-12 rounded-xl object-cover shadow-sm ring-1 ring-border transition-transform duration-150 hover:scale-105"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
                <ImageIcon className="size-5" />
              </div>
            )}
          </div>
        ),
      },
      { headerName: 'SKU', field: 'sku', minWidth: 120 },
      { headerName: 'Name', field: 'name', minWidth: 180 },
      {
        headerName: 'Category',
        colId: 'category',
        valueGetter: (p) => categoryName(p.data?.categoryId),
        cellRenderer: (p: { value: string }) => <Badge variant="secondary">{p.value}</Badge>,
      },
      {
        headerName: 'Status',
        colId: 'status',
        maxWidth: 120,
        valueGetter: (p) => p.data?.status ?? 'live',
        cellRenderer: (p: { value: string }) =>
          p.value === 'private' ? (
            <Badge variant="outline" className="text-muted-foreground">Private</Badge>
          ) : (
            <Badge variant="secondary">Live</Badge>
          ),
      },
      {
        headerName: 'Visible To',
        colId: 'visibleTo',
        minWidth: 170,
        // Show who can actually reach the product, not the raw tags — a product
        // tagged only Gold is also visible to Platinum (2.2 cumulative tiers).
        valueGetter: (p) => audienceNames(p.data),
        cellRenderer: (p: { value: string }) => <span className="text-sm">{p.value}</span>,
      },
      { headerName: 'Purity', field: 'purity' },
      { headerName: 'Gross (gm)', field: 'grossWeight', maxWidth: 130 },
      { headerName: 'Net (gm)', field: 'netWeight', maxWidth: 120, valueFormatter: (p) => (p.value != null ? p.value : '—') },
      { headerName: 'Size', field: 'size', valueFormatter: (p) => p.value || '—' },
      { headerName: 'Created', field: 'createdAt', valueFormatter: (p) => formatDate(p.value) },
      {
        headerName: 'Actions',
        pinned: 'right',
        width: 100,
        minWidth: 100,
        sortable: false,
        filter: false,
        resizable: false,
        cellClass: 'px-2!',
        headerClass: 'nj-center-header',
        cellRenderer: (p: { data: Product }) => (
          <RowActions
            items={[
              {
                label: 'Edit',
                icon: <Pencil className="size-4" />,
                onClick: () => navigate(`/products/${p.data.id}/edit`),
              },
              {
                label: 'Delete',
                icon: <Trash2 className="size-4" />,
                destructive: true,
                separatorBefore: true,
                onClick: () => setToDelete(p.data),
              },
            ]}
          />
        ),
      },
    ],
    [categoryName, audienceNames, navigate]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Products"
        description="Manage your jewellery catalogue and specifications."
        action={
          <Button onClick={() => navigate('/products/new')}>
            <Plus className="size-4" /> Add Product
          </Button>
        }
      />

      <DataGrid rowData={products} columnDefs={columns} loading={isLoading} rowHeight={64} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title="Delete product?"
        description={`"${toDelete?.name}" (${toDelete?.sku}) will be removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return
          await deleteProduct(toDelete.id).unwrap()
          toast.success('Product deleted')
          setToDelete(undefined)
        }}
      />
    </div>
  )
}

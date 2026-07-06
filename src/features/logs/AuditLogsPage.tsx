import { useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import { DataGrid } from '@/components/data/DataGrid'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import { useListAuditLogsQuery } from '@/services/api'
import type { AuditLog } from '@/types'

const actionClass: Record<string, string> = {
  create: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  update: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  delete: 'bg-destructive/15 text-destructive',
  login: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  logout: 'bg-muted text-muted-foreground',
}

export function AuditLogsPage() {
  const { data: logs, isLoading } = useListAuditLogsQuery()

  const columns = useMemo<ColDef<AuditLog>[]>(
    () => [
      {
        headerName: 'When',
        field: 'createdAt',
        minWidth: 180,
        sort: 'desc',
        valueFormatter: (p) => formatDateTime(p.value),
      },
      { headerName: 'User', field: 'adminEmail', minWidth: 200, valueFormatter: (p) => p.value || '—' },
      {
        headerName: 'Action',
        field: 'action',
        maxWidth: 130,
        cellRenderer: (p: { data: AuditLog }) => (
          <Badge variant="ghost" className={actionClass[p.data.action] ?? 'bg-muted text-muted-foreground'}>
            {p.data.action}
          </Badge>
        ),
      },
      { headerName: 'Entity', field: 'entity', minWidth: 140 },
      { headerName: 'Entity ID', field: 'entityId', maxWidth: 110, valueFormatter: (p) => (p.value ?? '—') },
      { headerName: 'Changes', field: 'changes', flex: 2, valueFormatter: (p) => p.value || '—' },
      { headerName: 'IP', field: 'ip', minWidth: 130, valueFormatter: (p) => p.value || '—' },
    ],
    []
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Audit Logs" description="Every create, update and delete across the system." />
      <DataGrid rowData={logs} columnDefs={columns} loading={isLoading} />
    </div>
  )
}

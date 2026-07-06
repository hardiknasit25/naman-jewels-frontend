import { useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import { DataGrid } from '@/components/data/DataGrid'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import { useListSessionLogsQuery } from '@/services/api'
import type { SessionLog } from '@/types'

export function SessionLogsPage() {
  const { data: logs, isLoading } = useListSessionLogsQuery()

  const columns = useMemo<ColDef<SessionLog>[]>(
    () => [
      { headerName: 'User', field: 'email', minWidth: 200 },
      {
        headerName: 'Logged In',
        field: 'loginAt',
        minWidth: 180,
        sort: 'desc',
        valueFormatter: (p) => formatDateTime(p.value),
      },
      { headerName: 'Expires', field: 'expiresAt', minWidth: 180, valueFormatter: (p) => formatDateTime(p.value) },
      {
        headerName: 'Logged Out',
        field: 'logoutAt',
        minWidth: 180,
        valueFormatter: (p) => (p.value ? formatDateTime(p.value) : '—'),
      },
      { headerName: 'IP', field: 'ip', minWidth: 130, valueFormatter: (p) => p.value || '—' },
      {
        headerName: 'Status',
        field: 'active',
        maxWidth: 130,
        cellRenderer: (p: { data: SessionLog }) =>
          p.data.active ? (
            <Badge variant="ghost" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Active</Badge>
          ) : (
            <Badge variant="ghost" className="bg-muted text-muted-foreground">Ended</Badge>
          ),
      },
    ],
    []
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Session Logs" description="Login sessions across the admin panel." />
      <DataGrid rowData={logs} columnDefs={columns} loading={isLoading} />
    </div>
  )
}

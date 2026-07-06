import { themeQuartz } from 'ag-grid-community'

// AG Grid 36 Theming API. Every value points at a shadcn CSS variable, so the
// grid automatically follows the active shadcn theme AND light/dark mode
// (those variables are redefined under `.dark`).
export const shadcnGridTheme = themeQuartz.withParams({
  fontFamily: 'var(--font-sans)',
  headerFontFamily: 'var(--font-heading)',
  fontSize: '13px',

  backgroundColor: 'var(--card)',
  foregroundColor: 'var(--foreground)',
  borderColor: 'var(--border)',
  wrapperBorderRadius: 'var(--radius)',

  headerBackgroundColor: 'var(--muted)',
  headerTextColor: 'var(--muted-foreground)',
  headerFontWeight: 600,
  headerColumnResizeHandleColor: 'var(--border)',

  oddRowBackgroundColor: 'transparent',
  rowHoverColor: 'var(--muted)',
  selectedRowBackgroundColor: 'var(--accent)',

  accentColor: 'var(--primary)',
  rangeSelectionBorderColor: 'var(--primary)',
  inputFocusBorder: '1px solid var(--ring)',

  cellHorizontalPadding: 14,
  headerHeight: 44,
  rowHeight: 46,
})

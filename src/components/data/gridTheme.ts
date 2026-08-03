import { themeQuartz } from 'ag-grid-community'

// AG Grid 36 Theming API. Every value points at a shadcn CSS variable, so the
// grid automatically follows the active shadcn theme AND light/dark mode
// (those variables are redefined under `.dark`).
//
// The goal is that a grid reads as another shadcn surface: same radii, same
// muted header, same input treatment in the filter row and pagination bar, same
// popover shadows. Anything the Theming API can't reach is finished off with the
// `.ag-*` rules at the bottom of index.css.
export const shadcnGridTheme = themeQuartz.withParams({
  fontFamily: 'var(--font-sans)',
  headerFontFamily: 'var(--font-heading)',
  fontSize: '13px',
  headerFontSize: '12px',
  // Native widgets (scrollbars, date pickers) follow the app's light/dark mode.
  browserColorScheme: 'inherit',

  backgroundColor: 'var(--card)',
  foregroundColor: 'var(--foreground)',
  textColor: 'var(--foreground)',
  subtleTextColor: 'var(--muted-foreground)',
  borderColor: 'var(--border)',
  borderRadius: 'var(--radius-md)',
  // The surrounding shell in DataGrid already draws the border and radius.
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  chromeBackgroundColor: 'var(--muted)',

  headerBackgroundColor: 'var(--muted)',
  headerTextColor: 'var(--muted-foreground)',
  headerFontWeight: 600,
  headerHeight: 44,
  headerRowBorder: true,
  headerColumnBorder: false,
  headerColumnResizeHandleColor: 'var(--border)',
  headerCellHoverBackgroundColor: 'var(--accent)',

  rowHeight: 46,
  rowBorder: true,
  oddRowBackgroundColor: 'transparent',
  rowHoverColor: 'var(--muted)',
  selectedRowBackgroundColor: 'var(--accent)',
  columnBorder: false,
  pinnedColumnBorder: true,

  accentColor: 'var(--primary)',
  rangeSelectionBorderColor: 'var(--primary)',
  iconColor: 'var(--muted-foreground)',

  // Inputs — the pagination page box and any grid-rendered field. The filter row
  // uses real shadcn components, so this is mostly about the leftovers matching.
  inputBackgroundColor: 'color-mix(in oklab, var(--input) 50%, transparent)',
  inputBorder: { color: 'transparent' },
  inputBorderRadius: 'var(--radius-lg)',
  inputTextColor: 'var(--foreground)',
  inputPlaceholderTextColor: 'var(--muted-foreground)',
  inputFocusBorder: { color: 'var(--ring)' },
  inputFocusShadow: '0 0 0 3px color-mix(in oklab, var(--ring) 30%, transparent)',

  // Popovers (column menu, tooltips) borrow the shadcn popover surface.
  menuBackgroundColor: 'var(--popover)',
  menuTextColor: 'var(--popover-foreground)',
  menuBorder: { color: 'var(--border)' },
  menuSeparatorColor: 'var(--border)',
  menuShadow: '0 10px 24px -8px color-mix(in oklab, var(--foreground) 22%, transparent)',
  popupShadow: '0 10px 24px -8px color-mix(in oklab, var(--foreground) 22%, transparent)',
  dropdownShadow: '0 10px 24px -8px color-mix(in oklab, var(--foreground) 22%, transparent)',
  cardShadow: '0 10px 24px -8px color-mix(in oklab, var(--foreground) 22%, transparent)',
  tooltipBackgroundColor: 'var(--popover)',
  tooltipTextColor: 'var(--popover-foreground)',
  tooltipBorder: { color: 'var(--border)' },

  cellHorizontalPadding: 14,
  paginationPanelHeight: 52,
})

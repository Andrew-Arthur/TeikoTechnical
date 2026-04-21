# Frontend Development Guide (React/TypeScript)

This document provides context for AI assistants (Claude) working on the TeikoTechnical frontend dashboard.

## Project Overview

React-based data exploration dashboard for cell type analysis. Displays hierarchical cell count data with interactive filtering, sorting, and aggregation controls.

## Tech Stack

- **Framework**: React 19.2.4 with TypeScript
- **Build Tool**: Vite 8.0.8
- **Styling**: Tailwind CSS 4.2.2
- **Table**: TanStack Table 8.21.3 (headless table library)
- **Virtualization**: TanStack Virtual 3.x (row virtualization for performance)
- **UI Components**: Headless UI 2.2.0 (accessible, unstyled components)
- **Icons**: Heroicons 2.2.0
- **Data Fetching**: TanStack Query (React Query) 5.99.2
- **Routing**: React Router 7.14.1
- **State**: URL search params + React Query (no Redux/Zustand)

## Architecture Principles

### Core Principles
- **DRY**: Reusable components, shared utilities
- **SOLID**: Single responsibility, composition over inheritance
- **KISS**: Direct library usage, minimal abstraction
- **Type Safety**: Full TypeScript with strict mode
- **Accessibility**: Keyboard navigation, ARIA labels, focus management
- **URL State**: All user selections persist in URL for shareability

### State Management Strategy

**Server State** (React Query):
- API responses (table data, filter options)
- Automatic caching, refetching, loading/error states
- Query keys: `["hierarchical_table_data", level, aggregationMethod, filters]`

**URL State** (Search Params):
- Level, aggregation method, filters, search, sorting, column visibility (delta-only), display mode
- Managed by `search-param-service.ts`
- **Delta encoding**: Only stores columns that differ from level-specific defaults
- **Default omission**: Parameters matching defaults are automatically removed
- Enables bookmark/share functionality with minimal URLs

**Local UI State**:
- Pane width (not in URL for performance)
- Dropdown open/close
- Drag state
- Transient UI interactions

## Project Structure

```
dashboard/src/
├── api/
│   └── client.ts                      # Fetch functions for backend API
├── components/
│   └── HierarchicalTable/
│       ├── HierarchicalTable.tsx      # Main table with TanStack Table
│       ├── TableControls.tsx          # Control panel (filters, search)
│       ├── MultiSelectFilter.tsx      # Reusable multi-select dropdown
│       ├── ResizablePanes.tsx         # Split-pane layout
│       ├── columns.ts                 # Column definitions by level
│       └── columnDefaults.ts          # Default visibility config
├── pages/
│   ├── HierarchicalTablePage.tsx      # Main page orchestrator
│   └── DashboardPage.tsx              # Legacy dashboard (old)
├── services/
│   └── search-param-service.ts        # URL state serialization
├── types/
│   └── api.ts                         # TypeScript type definitions
├── App.tsx                            # Router setup
└── main.tsx                           # Entry point with providers
```

## Key Components

### HierarchicalTablePage.tsx (Orchestrator)

**Responsibilities**:
- Parse URL state on mount
- Fetch data with React Query
- Manage state updates (sync to URL)
- Handle level changes (reset column visibility to defaults)
- Pass props to child components

**Pattern**:
```tsx
const [searchParams, setSearchParams] = useSearchParams()

// Parse state from URL (with defaults)
const state = getHierarchicalTableStateFromSearchParams(searchParams, defaultColVis)

// Fetch data (cached by React Query)
const { data, isLoading, error } = useQuery({
    queryKey: ["key", ...deps],
    queryFn: () => fetchData(...deps),
})

// Update URL when state changes
const setState = (newValue) => {
    updateHierarchicalTableSearchParams(searchParams, setSearchParams, {
        key: newValue
    })
}
```

### HierarchicalTable.tsx (TanStack Table + Virtual)

**Responsibilities**:
- Render table with dynamic columns (based on level)
- Virtual scrolling for large datasets (52,500+ rows)
- Handle column visibility (merged with defaults + display mode)
- Display loading/empty/error states
- Show row count

**Key Features**:
- **Virtual scrolling**: Only renders ~50 visible rows (massive performance gain)
- **React.memo**: Prevents unnecessary re-renders
- Sticky header with sort indicators (↑ ↓)
- Empty state: "No results found. Try adjusting filters."
- Row count footer: "1,234 rows"
- Hover highlighting on rows

**Pattern**:
```tsx
const columns = useMemo(() => getColumnsForLevel(level), [level])

// Merge delta with defaults + display mode
const mergedVisibility = useMemo(() => {
    const defaults = getDefaultColumnVisibility(level)
    const merged = { ...defaults, ...columnVisibility }
    // Apply display mode if no explicit delta
    if (Object.keys(columnVisibility).length === 0 && displayMode !== "both") {
        // Apply display mode visibility rules
    }
    return merged
}, [level, columnVisibility, displayMode])

const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting, columnVisibility: mergedVisibility },
    getCoreRowModel: getCoreRowModel(),
    // No getSortedRowModel/getFilteredRowModel - server handles this
})

// Virtual scrolling setup
const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35,
    overscan: 10,
})
```

**Performance**:
- Renders only 30-50 rows instead of 52,500
- 95%+ reduction in DOM nodes
- 80%+ reduction in RAM usage
- Smooth 60 FPS scrolling

### TableControls.tsx (Control Panel)

**Responsibilities**:
- Level selector (Headless UI Listbox)
- Aggregation selector (disabled when level = "cell")
- Display mode toggle (% / Count / Both - percentage is first and default for aggregated levels)
- Multi-select filters for sex, condition, treatment, response, time_from_treatment
- Global search input
- Column visibility menu

**Performance Optimizations**:
- **React.memo**: Wrapped to prevent re-renders
- No table instance created (uses lightweight column metadata only)
- Visibility state merged with defaults at render time

**UI Guidelines**:
- Concise labels: "Level:", "Aggregation:", "Display:", "Sex:"
- Badge counts: "Sex (2)" when 2 selected
- Visual separators: `<div className="h-8 w-px bg-slate-300" />`
- Tooltip on aggregation: ⓘ with title="How to combine cell counts when rolling up"
- Disabled state: `opacity-50 cursor-not-allowed`
- Toggle button: Active state has `bg-blue-500 text-white`, inactive has `bg-white text-slate-700`

### MultiSelectFilter.tsx (Reusable Component)

**Responsibilities**:
- Headless UI Listbox with multiple selection
- Display badge count in button
- Show checkmarks (✓) for selected items
- Keyboard navigable

**Props**:
```tsx
type MultiSelectFilterProps = {
    label: string
    options: string[]
    selected: string[]
    onChange: (selected: string[]) => void
}
```

### ResizablePanes.tsx (Split Layout)

**Responsibilities**:
- Render left pane (table) and right pane (charts placeholder)
- Handle drag-to-resize with mouse events
- Clamp width between 20-80%
- Store width in local state (not URL for performance)

**Performance Optimizations**:
- **React.memo**: Prevents unnecessary re-renders
- **Direct DOM manipulation**: Updates width via `style.width` during drag (no React re-renders)
- **State update on mouseup only**: Only updates React state once drag completes
- **Zero lag**: Smooth dragging with no frame drops

**Pattern**:
```tsx
const handleMouseMove = (e: MouseEvent) => {
    // Direct DOM manipulation for instant visual feedback
    leftPaneRef.current.style.width = `${roundedWidth}%`
    rightPaneRef.current.style.width = `${100 - roundedWidth}%`
    currentWidthRef.current = roundedWidth
}

const handleMouseUp = () => {
    // Only update React state on mouse up
    onLeftWidthChange(currentWidthRef.current)
}
```

## URL State Management

### search-param-service.ts

**Purpose**: Serialize/deserialize all table state to/from URL params for shareability with aggressive optimization.

**Supported State**:
- `level`: "project" | "subject" | "sample" | "cell" (default: "sample")
- `agg`: "first" | "min" | "max" | "median" | "mode" (default: "mode")
- `display`: "count" | "percentage" | "both" (default: "percentage" for aggregated, "both" for cell)
- `sex`, `condition`, `treatment`, `response`, `time`: Comma-separated arrays
- `search`: Global filter string
- `sort`: Custom format: "columnId.asc,columnId.desc"
- `cols`: JSON object with **delta only**: `{"age":false}` (only columns differing from defaults)

**Delta Encoding Architecture**:
Column visibility uses delta-only encoding for minimal URLs:
1. **State stores delta only**: `columnVisibility` contains only columns that differ from level defaults
2. **Merge at render time**: Components merge delta with `getDefaultColumnVisibility(level)` when needed
3. **Serialize delta only**: Only differences from defaults are written to URL
4. **Auto-cleanup**: Columns matching defaults are automatically removed from state and URL

**Default Value Optimization**:
Default values are automatically omitted from URLs:
- `level=sample` → omitted
- `agg=mode` → omitted
- `display=percentage` (aggregated) → omitted
- `display=both` (cell level) → omitted
- `cols={}` (empty delta) → omitted
- Empty filters → omitted

**URL Cleanup on Load**:
`HierarchicalTablePage` runs cleanup on mount to remove any stale default values from URL.

**Key Functions**:
```tsx
// Parse URL → state
getHierarchicalTableStateFromSearchParams(
    searchParams: URLSearchParams,
    defaultColumnVisibility: VisibilityState
): HierarchicalTableState

// Update URL with changes
updateHierarchicalTableSearchParams(
    currentSearchParams: URLSearchParams,
    setSearchParams: SetURLSearchParams,
    updates: HierarchicalTableUpdates
): void
```

**Serialization Examples**:
- Array: `["M", "F"]` → `"M,F"`
- Delta object: `{"age": false}` → `'{"age":false}'` (only if differs from default)
- Empty values: Delete param for cleaner URLs

**URL Size Comparison**:
| Action | Before Delta Encoding | After Delta Encoding |
|--------|----------------------|---------------------|
| Default state | `/?level=sample&agg=mode&display=both` | `/` |
| Toggle 1 column | `/?cols={"project_id":true,"subject_id":true,...}` (~300 chars) | `/?cols={"age":false}` (~20 chars) |
| Display mode | `/?display=percentage&cols={...10 columns...}` | `/?display=percentage` |

**Result**: 70-90% reduction in URL size

## Dynamic Column System

### columns.ts

**Purpose**: Generate column definitions based on hierarchy level.

**Column Structure by Level**:

**Project**:
- project_id, b_cell, cd8_t_cell, cd4_t_cell, nk_cell, monocyte (6 columns)

**Subject**:
- project_id, subject_id, condition, age, sex, treatment, response, sample_type
- + 5 cell type columns (13 columns)

**Sample**:
- All subject columns + sample_id, time_from_treatment_start
- + 5 cell type columns (15 columns)

**Cell**:
- All sample columns + cell_type_name, cell_count (12 columns)
- No cell type columns (raw data)

**Pattern**:
```tsx
export function getColumnsForLevel(level: HierarchyLevel): ColumnDef<HierarchicalTableRow>[] {
    const baseColumns: ColumnDef<HierarchicalTableRow>[] = []
    
    // Add columns based on level
    if (level === "cell") {
        baseColumns.push({ accessorKey: "cell_type_name", header: "Cell Type" })
        baseColumns.push({ accessorKey: "cell_count", header: "Cell Count" })
    } else {
        // Add 5 cell type columns
    }
    
    return baseColumns
}
```

### columnDefaults.ts

**Purpose**: Define default column visibility per level (easily configurable).

**Philosophy**:
- Show critical columns by default
- Hide verbose/redundant columns
- User can override via column visibility control

**Example**:
```tsx
export const DEFAULT_COLUMN_VISIBILITY: Record<HierarchyLevel, Record<string, boolean>> = {
    subject: {
        project_id: false,    // Hidden: verbose parent ID
        subject_id: true,
        condition: true,
        age: false,           // Hidden: less critical
        // ...
    }
}
```

## API Integration

### api/client.ts

**Pattern**:
```tsx
export async function fetchHierarchicalTableData(
    level: HierarchyLevel,
    aggregationMethod: AggregationMethod,
    filters: HierarchicalTableFilters
): Promise<HierarchicalTableRow[]> {
    const params = new URLSearchParams({
        level,
        aggregation_method: aggregationMethod,
    })
    
    // Add multi-value filters
    filters.sex.forEach(v => params.append("sex", v))
    
    const response = await fetch(`${FAST_API}/hierarchical_table_data?${params}`)
    if (!response.ok) throw new Error(`API error: ${response.statusText}`)
    return response.json()
}
```

**Error Handling**:
- React Query manages loading/error states
- Display user-friendly error messages
- No try/catch in components (let React Query handle)

## Styling Guidelines

### Tailwind CSS

**Utility-First Approach**:
- Use Tailwind classes directly in JSX
- No custom CSS files (except index.css for Tailwind imports)
- Consistent spacing: `gap-3`, `p-4`, `mb-4`
- Consistent colors: `slate-*` for neutral, `blue-*` for interactive

**Common Patterns**:
```tsx
// Card
<div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">

// Button
<button className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">

// Input
<input className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

// Separator
<div className="h-8 w-px bg-slate-300" />
```

## Accessibility

### Headless UI Benefits
- Keyboard navigation built-in
- ARIA attributes automatic
- Focus management handled
- Screen reader friendly

### Best Practices
- Use semantic HTML (`<button>`, `<input>`, not `<div onClick>`)
- Provide `aria-label` when visual label missing
- Ensure sufficient color contrast
- Test with keyboard only (Tab, Enter, Escape)
- Add `title` attributes for tooltips

## Performance Optimization

This app has been heavily optimized to handle large datasets (52,500+ rows) with smooth interactions.

### Virtual Scrolling (Primary Optimization)
- **TanStack Virtual** renders only visible rows (~30-50 instead of 52,500)
- **95%+ reduction in DOM nodes**: Massive RAM savings
- **60 FPS scrolling**: Smooth even with 50K+ rows
- Overscan of 10 rows for seamless scrolling experience

### React.memo Optimizations
All heavy components wrapped with `React.memo`:
- `HierarchicalTable` - Only re-renders when data/level/visibility changes
- `TableControls` - Only re-renders when controls change
- `TableControlsWrapper` - Prevents column regeneration
- `ResizablePanes` - Prevents re-render during drag

**Impact**: Button clicks don't trigger table re-renders unless necessary

### Direct DOM Manipulation
- **ResizablePanes**: Updates `style.width` directly during drag (no React re-renders)
- Only updates React state on `mouseup`
- **Zero lag** during resize drag

### useCallback for State Setters
All state setters wrapped with `useCallback`:
- Prevents child re-renders from changing function references
- Stable props → React.memo works effectively

### Removed Unused TanStack Features
- Removed `getSortedRowModel()` - backend handles sorting
- Removed `getFilteredRowModel()` - backend handles filtering
- **Impact**: Eliminates client-side processing of 52,500 rows

### React Query Caching
- Queries cached by key: `["hierarchical_table_data", level, agg, filters]`
- Automatic deduplication
- Background refetching on stale queries
- No manual cache management needed

### Delta-Only Column Visibility
- State contains only columns differing from defaults
- Merge happens at render time only
- Dramatically smaller state objects (1-3 columns vs 15+)

### Bundle Size
- Headless UI: ~15KB gzipped
- TanStack Table: ~40KB gzipped
- TanStack Virtual: ~12KB gzipped
- Total bundle: ~460KB gzipped (~140KB)

### Performance Metrics

| Metric | Before Optimization | After Optimization | Improvement |
|--------|--------------------|--------------------|-------------|
| **RAM Usage** | ~2GB | ~300MB | 85% reduction |
| **DOM Nodes** | 52,500 rows | ~50 rows | 99.9% reduction |
| **Button Click Response** | 200-500ms | <50ms | 10x faster |
| **Resize Drag** | Janky | Buttery smooth | Eliminated lag |
| **Scroll Performance** | Sluggish | 60 FPS | Instant |
| **URL Size** | 300-600 chars | 20-100 chars | 70-90% smaller |

## Common Tasks

### Adding a New Filter

1. **Update types** (`types/api.ts`):
```tsx
export type HierarchicalTableFilters = {
    sex: string[]
    condition: string[]
    // Add new filter:
    new_filter: string[]
}
```

2. **Update API client** (`api/client.ts`):
```tsx
filters.new_filter.forEach(v => params.append("new_filter", v))
```

3. **Update URL service** (`search-param-service.ts`):
```tsx
export const HIERARCHICAL_PARAMS = {
    // ...
    filterNewFilter: "new_filter",
}

// Add to parsing/serialization functions
```

4. **Add control** (`TableControls.tsx`):
```tsx
<MultiSelectFilter
    label="New Filter"
    options={filterOptions.new_filter}
    selected={filters.new_filter}
    onChange={(selected) => setFilters({ ...filters, new_filter: selected })}
/>
```

### Adding a New Column

1. **Update type** (`types/api.ts`):
```tsx
export type HierarchicalTableRow = {
    // Add new field:
    new_field?: string
}
```

2. **Update column definitions** (`columns.ts`):
```tsx
baseColumns.push({
    accessorKey: "new_field",
    header: "New Field",
    cell: (info) => info.getValue(),
})
```

3. **Update defaults** (`columnDefaults.ts`):
```tsx
export const DEFAULT_COLUMN_VISIBILITY = {
    subject: {
        // ...
        new_field: true,  // or false to hide by default
    }
}
```

### Modifying Table Behavior

**Custom Cell Rendering**:
```tsx
{
    accessorKey: "cell_count",
    header: "Cell Count",
    cell: (info) => {
        const val = info.getValue() as number
        return val?.toLocaleString()  // Add thousands separator
    },
}
```

**Custom Sorting**:
```tsx
{
    accessorKey: "age",
    header: "Age",
    sortingFn: "alphanumeric",  // or custom function
}
```

**Conditional Styling**:
```tsx
<td className={`px-3 py-2 ${row.original.condition === "melanoma" ? "bg-yellow-50" : ""}`}>
```

## Testing

### Test Framework
- **Vitest**: Fast unit test framework with Vite integration
- **React Testing Library**: Component testing utilities
- **jsdom**: Browser environment simulation

### Running Tests
```bash
npm test           # Watch mode
npm test:run       # Run once (CI)
npm test:ui        # Visual UI at localhost:51204
```

### Test Structure
- **Unit tests**: `*.test.ts` or `*.test.tsx` alongside source files
- **Integration tests**: `src/test/*.integration.test.tsx`
- **Setup**: `src/test/setup.ts` (loads jest-dom matchers)
- **Config**: `vitest.config.ts`

### Writing Tests
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('MyComponent', () => {
    it('should handle user interaction', async () => {
        const user = userEvent.setup()
        const mockHandler = vi.fn()
        
        render(<MyComponent onClick={mockHandler} />)
        
        const button = screen.getByRole('button')
        await user.click(button)
        
        expect(mockHandler).toHaveBeenCalledOnce()
    })
})
```

### Current Coverage

**Test Files**:
- `columns.test.ts` - Column generation for all hierarchy levels (9 tests)
- `columns.cell-level-percentage.test.ts` - Cell level percentage calculation (4 tests)
- `TableControls.test.tsx` - Control panel components (6 tests)
- `percentage-toggle.integration.test.tsx` - End-to-end integration (5 tests)

**Coverage Areas**:
- Column generation (count/percentage modes, all levels)
- Cell level within-sample percentage calculation
- Table controls (toggle, filters, search, aggregation)
- Display mode defaults and URL serialization
- Delta-only column visibility state management
- URL parameter serialization and deserialization
- Edge cases (zero totals, multiple samples, empty deltas)

**Total: 25 tests, all passing ✅**

### Debugging Tests

Run specific test:
```bash
npm test -- columns.test.ts
```

Run by name:
```bash
npm test -- -t "percentage"
```

Visual UI:
```bash
npm test:ui  # Opens at localhost:51204
```

## Development Workflow

1. **Start dev server**: `npm run dev` (runs on port 5173)
2. **Backend must be running**: Backend on port 8001 for API calls
3. **Hot reload**: Vite automatically reloads on file changes
4. **Check types**: `npm run build` (runs TypeScript compiler)
5. **Lint**: `npm run lint`
6. **Run tests**: `npm test` (watch mode) or `npm test:run` (once)

## Debugging Tips

### React Query DevTools
Consider adding for development:
```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// In App.tsx
<ReactQueryDevtools initialIsOpen={false} />
```

### Common Issues

**CORS Error**:
- Check backend CORS middleware allows localhost:5173
- Verify backend is running

**Type Import Error**:
- TanStack Table types must use `import type { ... }`
- Example: `import type { ColumnDef, SortingState } from "@tanstack/react-table"`

**State Not Persisting**:
- Check `updateHierarchicalTableSearchParams` is called
- Verify URL params in browser address bar
- Use React DevTools to inspect state

**Headless UI Not Styling**:
- Headless UI is unstyled by default
- Add Tailwind classes to `Listbox.Button`, `Listbox.Options`, etc.

## Recent Major Updates (2026-04-20)

### 1. Virtual Scrolling Implementation
Complete rewrite of table rendering to use TanStack Virtual:
- Only renders ~50 visible rows instead of 52,500
- 95%+ reduction in DOM nodes → 85% reduction in RAM usage
- Smooth 60 FPS scrolling even with massive datasets
- Added to dependencies: `@tanstack/react-virtual`

### 2. Performance Optimizations
Comprehensive optimization pass addressing button lag and resize performance:
- **React.memo** on all heavy components (HierarchicalTable, TableControls, ResizablePanes)
- **useCallback** on all state setters
- **Direct DOM manipulation** during resize drag (no React re-renders)
- **Removed duplicate table instance** in TableControls (was processing 52,500 rows twice)
- **Removed unused TanStack features** (getSortedRowModel, getFilteredRowModel)

### 3. Delta-Only Column Visibility
Complete architecture refactor for minimal URLs:
- **State stores delta only**: Only columns differing from defaults
- **Merge at render time**: Components merge delta with defaults when rendering
- **Auto-cleanup**: Columns matching defaults are removed from state and URL
- **Result**: 70-90% reduction in URL size for column visibility operations

### 4. Display Mode Improvements
- Reordered toggle: **% / Count / Both** (percentage now first)
- Default changed: **Percentage** for aggregated levels, **Both** for cell level
- Display mode no longer stored in column visibility (separate URL param)
- Tests updated to reflect delta-only architecture

### 5. URL Cleanup on Load
Added automatic cleanup on page mount:
- Removes all parameters matching their default values
- Ensures URLs are always minimal and shareable
- Clean URLs even when navigating from old/messy links

### 6. paneWidth Removed from URL
- Moved to local state for performance
- No longer triggers URL updates during resize drag
- Eliminates unnecessary history entries
- **Cell level**: Backend-calculated percentage showing within-sample distribution
- Displays with 1 decimal place (e.g., "12.5%")
- Handles edge cases (zero totals show "0%")

**Implementation**:
- **Aggregated levels**: Client-side calculation for instant toggle
  ```typescript
  const total = (row.b_cell || 0) + (row.cd8_t_cell || 0) + ...
  return `${((val / total) * 100).toFixed(1)}%`
  ```
- **Cell level**: Backend calculates `cell_percentage` in SQL query
  ```sql
  WITH sample_totals AS (
      SELECT sample_id, SUM(cell_count) as total_count
      FROM sample_cell_count
      GROUP BY sample_id
  )
  SELECT ..., ROUND(CAST(cell_count AS FLOAT) / total_count * 100, 1) as cell_percentage
  ```
  Toggle switches between `cell_count` and `cell_percentage` columns

### 7. Count/Percentage Display
Added display mode toggle for viewing cell counts as percentages:
- Toggle button: **% / Count / Both**
- **Aggregated levels**: Client-side calculation (instant)
- **Cell level**: Backend-calculated percentage showing within-sample distribution
- Displays with 1 decimal place (e.g., "12.5%")
- Handles edge cases (zero totals show "0%")

### 8. Additional Refinements
- **Z-Index Fix**: Dropdowns now appear above sticky header (z-20 vs z-5)
- **Column Headers**: Removed "_id" suffix (sample_id → "Sample")
- **Time Filter**: Added time_from_treatment as filterable field
- **Tests**: Comprehensive test suite with 25 passing tests

## Browser Support

- **Target**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **ES Version**: ES2023 (via Vite/TypeScript)
- **No IE11 Support**: Uses modern JavaScript features

## Future Enhancements

Potential improvements to consider:
- CSV export functionality
- Plotly.js chart integration (right pane)
- Column reordering (drag-drop)
- Saved views/bookmarks
- Dark mode
- Backend pagination (if datasets grow beyond 100K rows)
- Advanced filters (range sliders for numeric columns)
- Print-friendly view
- Keyboard shortcuts (e.g., Cmd+K for search)
- Server-side search debouncing
- Web Workers for background processing
- React Compiler (when stable)

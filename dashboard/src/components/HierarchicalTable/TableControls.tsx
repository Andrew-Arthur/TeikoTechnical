import { memo } from 'react'
import { Listbox, Menu } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import type { Column } from '@tanstack/react-table'
import type { HierarchyLevel, AggregationMethod, HierarchicalTableFilters, FilterOptions, HierarchicalTableRow } from '../../types/api'
import type { ComparisonColumn } from '../../types/charts'
import MultiSelectFilter from './MultiSelectFilter'

type TableControlsProps = {
    level: HierarchyLevel
    setLevel: (level: HierarchyLevel) => void
    aggregationMethod: AggregationMethod
    setAggregationMethod: (method: AggregationMethod) => void
    filters: HierarchicalTableFilters
    setFilters: (filters: HierarchicalTableFilters) => void
    filterOptions: FilterOptions
    allColumns: Column<HierarchicalTableRow, unknown>[]
    displayMode: "count" | "percentage"
    setDisplayMode: (mode: "count" | "percentage") => void
    comparisonColumn: ComparisonColumn
    setComparisonColumn: (column: ComparisonColumn) => void
    availableComparisonColumns: ComparisonColumn[]
}

const LEVEL_OPTIONS: { value: HierarchyLevel; label: string }[] = [
    { value: "project", label: "Project" },
    { value: "subject", label: "Subject" },
    { value: "sample", label: "Sample" },
    { value: "cell", label: "Cell" },
]

const SUBJECT_AGG_OPTIONS: { value: AggregationMethod; label: string }[] = [
    { value: "mean", label: "Mean" },
    { value: "median", label: "Median" },
    { value: "min", label: "Min" },
    { value: "max", label: "Max" },
    { value: "sum", label: "Sum" },
]

const PROJECT_AGG_OPTIONS: { value: AggregationMethod; label: string }[] = [
    { value: "mean", label: "Mean" },
    { value: "median", label: "Median" },
    { value: "min", label: "Min" },
    { value: "max", label: "Max" },
]

function formatComparisonLabel(col: ComparisonColumn): string {
    if (col === "none") return "None (All Data)"
    if (col === "cell_type_name") return "Cell Type"
    return col.replace(/_/g, ' ')
}

const TableControls = memo(function TableControls({
    level,
    setLevel,
    aggregationMethod,
    setAggregationMethod,
    filters,
    setFilters,
    filterOptions,
    allColumns,
    displayMode,
    setDisplayMode,
    comparisonColumn,
    setComparisonColumn,
    availableComparisonColumns,
}: TableControlsProps) {
    const visibleCount = allColumns.filter(col => col.getIsVisible()).length
    const totalCount = allColumns.length

    return (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">Level:</label>
                    <Listbox value={level} onChange={setLevel}>
                    <div className="relative">
                        <Listbox.Button className="relative w-[120px] rounded-md bg-white py-2 pl-3 pr-10 text-left border border-slate-300 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm hover:bg-slate-50">
                            <span className="block truncate">
                                {LEVEL_OPTIONS.find(o => o.value === level)?.label}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                            </span>
                        </Listbox.Button>
                        <Listbox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            {LEVEL_OPTIONS.map((option) => (
                                <Listbox.Option
                                    key={option.value}
                                    value={option.value}
                                    className={({ active }) =>
                                        `relative cursor-pointer select-none py-2 pl-3 pr-9 ${active ? 'bg-blue-50 text-blue-900' : 'text-slate-900'
                                        }`
                                    }
                                >
                                    {({ selected }) => (
                                        <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                            {option.label}
                                        </span>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </div>
                </Listbox>
            </div>

                {level === "subject" && (
                    <>
                        <div className="h-8 w-px bg-slate-300" />
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                Subject Agg:
                                <span className="text-slate-400 cursor-help" title="How to combine cell counts from multiple samples (day 0, 7, 14) within each subject. For example, 'Mean' averages the 3 samples, while 'Sum' adds them together.">
                                    ⓘ
                                </span>
                            </label>
                            <Listbox value={aggregationMethod} onChange={setAggregationMethod}>
                                <div className="relative">
                                    <Listbox.Button className="relative w-[120px] rounded-md bg-white py-2 pl-3 pr-10 text-left border border-slate-300 shadow-sm text-sm cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <span className="block truncate">
                                            {SUBJECT_AGG_OPTIONS.find(o => o.value === aggregationMethod)?.label}
                                        </span>
                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                        </span>
                                    </Listbox.Button>
                                    <Listbox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        {SUBJECT_AGG_OPTIONS.map((option) => (
                                            <Listbox.Option
                                                key={option.value}
                                                value={option.value}
                                                className={({ active }) =>
                                                    `relative cursor-pointer select-none py-2 pl-3 pr-9 ${active ? 'bg-blue-50 text-blue-900' : 'text-slate-900'}`
                                                }
                                            >
                                                {({ selected }) => (
                                                    <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                                        {option.label}
                                                    </span>
                                                )}
                                            </Listbox.Option>
                                        ))}
                                    </Listbox.Options>
                                </div>
                            </Listbox>
                        </div>
                    </>
                )}

                {level === "project" && (
                    <>
                        <div className="h-8 w-px bg-slate-300" />
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                Subject Agg:
                                <span className="text-slate-400 cursor-help" title="First step: How to combine cell counts from multiple samples (day 0, 7, 14) within each subject. For example, 'Mean' averages the 3 samples, while 'Sum' adds them together.">
                                    ⓘ
                                </span>
                            </label>
                            <Listbox value={aggregationMethod} onChange={setAggregationMethod}>
                                <div className="relative">
                                    <Listbox.Button className="relative w-[120px] rounded-md bg-white py-2 pl-3 pr-10 text-left border border-slate-300 shadow-sm text-sm cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <span className="block truncate">
                                            {SUBJECT_AGG_OPTIONS.find(o => o.value === aggregationMethod)?.label}
                                        </span>
                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                        </span>
                                    </Listbox.Button>
                                    <Listbox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        {SUBJECT_AGG_OPTIONS.map((option) => (
                                            <Listbox.Option
                                                key={option.value}
                                                value={option.value}
                                                className={({ active }) =>
                                                    `relative cursor-pointer select-none py-2 pl-3 pr-9 ${active ? 'bg-blue-50 text-blue-900' : 'text-slate-900'}`
                                                }
                                            >
                                                {({ selected }) => (
                                                    <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                                        {option.label}
                                                    </span>
                                                )}
                                            </Listbox.Option>
                                        ))}
                                    </Listbox.Options>
                                </div>
                            </Listbox>
                        </div>
                        <div className="h-8 w-px bg-slate-300" />
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                Project Agg:
                                <span className="text-slate-400 cursor-help" title="Second step: How to combine the aggregated values from all subjects into a single project value. For example, 'Mean' averages across all subjects, while 'Median' finds the middle value.">
                                    ⓘ
                                </span>
                            </label>
                            <Listbox value={aggregationMethod} onChange={setAggregationMethod}>
                                <div className="relative">
                                    <Listbox.Button className="relative w-[120px] rounded-md bg-white py-2 pl-3 pr-10 text-left border border-slate-300 shadow-sm text-sm cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <span className="block truncate">
                                            {PROJECT_AGG_OPTIONS.find(o => o.value === aggregationMethod)?.label}
                                        </span>
                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                        </span>
                                    </Listbox.Button>
                                    <Listbox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        {PROJECT_AGG_OPTIONS.map((option) => (
                                            <Listbox.Option
                                                key={option.value}
                                                value={option.value}
                                                className={({ active }) =>
                                                    `relative cursor-pointer select-none py-2 pl-3 pr-9 ${active ? 'bg-blue-50 text-blue-900' : 'text-slate-900'}`
                                                }
                                            >
                                                {({ selected }) => (
                                                    <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                                        {option.label}
                                                    </span>
                                                )}
                                            </Listbox.Option>
                                        ))}
                                    </Listbox.Options>
                                </div>
                            </Listbox>
                        </div>
                    </>
                )}

                <div className="h-8 w-px bg-slate-300" />

                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">Display:</label>
                    <div className="flex rounded-md border border-slate-300 overflow-hidden">
                        <button
                            onClick={() => setDisplayMode("percentage")}
                            className={`px-3 py-2 text-sm ${displayMode === "percentage"
                                    ? "bg-blue-500 text-white"
                                    : "bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            %
                        </button>
                        <button
                            onClick={() => setDisplayMode("count")}
                            className={`px-3 py-2 text-sm border-l border-slate-300 ${displayMode === "count"
                                    ? "bg-blue-500 text-white"
                                    : "bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            Count
                        </button>
                    </div>
                </div>

                <div className="h-8 w-px bg-slate-300" />
            </div>

            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Filters:</label>
                <MultiSelectFilter
                    label="Sex"
                    options={filterOptions.sex}
                    selected={filters.sex}
                    onChange={(selected) => setFilters({ ...filters, sex: selected })}
                />
            <MultiSelectFilter
                label="Condition"
                options={filterOptions.condition}
                selected={filters.condition}
                onChange={(selected) => setFilters({ ...filters, condition: selected })}
            />
            <MultiSelectFilter
                label="Treatment"
                options={filterOptions.treatment}
                selected={filters.treatment}
                onChange={(selected) => setFilters({ ...filters, treatment: selected })}
            />
            <MultiSelectFilter
                label="Response"
                options={filterOptions.response}
                selected={filters.response}
                onChange={(selected) => setFilters({ ...filters, response: selected })}
            />
            <MultiSelectFilter
                label="Sample Type"
                options={filterOptions.sample_type}
                selected={filters.sample_type}
                onChange={(selected) => setFilters({ ...filters, sample_type: selected })}
            />
            <MultiSelectFilter
                label="Time from Treatment"
                options={filterOptions.time_from_treatment.map(String)}
                selected={filters.time_from_treatment.map(String)}
                onChange={(selected) => setFilters({ ...filters, time_from_treatment: selected.map(v => parseInt(v, 10)) })}
            />

            <div className="h-8 w-px bg-slate-300" />

            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Columns:</label>
                <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-md text-sm bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <span>{visibleCount}/{totalCount}</span>
                        <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                    </Menu.Button>
                <Menu.Items className="absolute right-0 z-20 mt-1 w-56 max-h-96 overflow-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        {allColumns.map((column) => (
                            <Menu.Item key={column.id}>
                                {() => (
                                    <label className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={column.getIsVisible()}
                                            onChange={column.getToggleVisibilityHandler()}
                                            className="mr-3 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="truncate">{column.columnDef.header as string}</span>
                                    </label>
                                )}
                            </Menu.Item>
                        ))}
                    </div>
                </Menu.Items>
                </Menu>
            </div>

            <div className="h-8 w-px bg-slate-300" />

            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Compare by:</label>
                <Listbox value={comparisonColumn} onChange={setComparisonColumn}>
                    <div className="relative">
                        <Listbox.Button className="relative w-45 rounded-md bg-white py-2 pl-3 pr-10 text-left border border-slate-300 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm hover:bg-slate-50">
                            <span className="block truncate capitalize">
                                {formatComparisonLabel(comparisonColumn)}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                            </span>
                        </Listbox.Button>
                        <Listbox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            {availableComparisonColumns.map((col) => (
                                <Listbox.Option
                                    key={col}
                                    value={col}
                                    className={({ active }) =>
                                        `relative cursor-pointer select-none py-2 pl-3 pr-9 ${active ? 'bg-blue-50 text-blue-900' : 'text-slate-900'}`
                                    }
                                >
                                    {({ selected }) => (
                                        <span className={`block truncate capitalize ${selected ? 'font-semibold' : 'font-normal'}`}>
                                            {formatComparisonLabel(col)}
                                        </span>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </div>
                </Listbox>
            </div>
            </div>
        </div>
    )
})

export default TableControls

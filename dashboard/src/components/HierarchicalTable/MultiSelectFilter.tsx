import { Listbox } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid'

type MultiSelectFilterProps = {
    label: string
    options: string[]
    selected: string[]
    onChange: (selected: string[]) => void
}

export default function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
    const displayText = selected.length === 0
        ? `${label} (0)`
        : `${label} (${selected.length})`

    return (
        <Listbox value={selected} onChange={onChange} multiple>
            <div className="relative">
                <Listbox.Button className="relative w-full min-w-[140px] rounded-md bg-white py-2 pl-3 pr-10 text-left border border-slate-300 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm hover:bg-slate-50">
                    <span className="block truncate">{displayText}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDownIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </span>
                </Listbox.Button>

                <Listbox.Options className="absolute z-20 mt-1 max-h-60 w-full min-w-[200px] overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {options.length === 0 ? (
                        <div className="px-3 py-2 text-slate-500 italic">No options</div>
                    ) : (
                        options.map((option) => (
                            <Listbox.Option
                                key={option}
                                value={option}
                                className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-50 text-blue-900' : 'text-slate-900'
                                    }`
                                }
                            >
                                {({ selected: isSelected }) => (
                                    <>
                                        <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                                            {option}
                                        </span>
                                        {isSelected && (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                                <CheckIcon className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                        )}
                                    </>
                                )}
                            </Listbox.Option>
                        ))
                    )}
                </Listbox.Options>
            </div>
        </Listbox>
    )
}

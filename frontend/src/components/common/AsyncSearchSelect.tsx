import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, ChevronDown } from 'lucide-react';

export interface AsyncSearchSelectItem {
  id: number | string;
  label: string;
  subLabel?: string;
  badge?: string;
}

export interface AsyncSearchSelectProps {
  id?: string;
  value?: number | string | null;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  loadOptions: (query: string) => Promise<AsyncSearchSelectItem[]>;
  onChange: (value: number | string | null, selectedItem?: AsyncSearchSelectItem | null) => void;
  initialItem?: AsyncSearchSelectItem | null;
  className?: string;
}

export const AsyncSearchSelect: React.FC<AsyncSearchSelectProps> = ({
  id,
  value,
  placeholder = 'Seçiniz...',
  searchPlaceholder = 'Aramak için en az 2 karakter yazın...',
  disabled = false,
  required = false,
  loadOptions,
  onChange,
  initialItem = null,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<AsyncSearchSelectItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AsyncSearchSelectItem | null>(initialItem);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initialItem or selected item when value changes
  useEffect(() => {
    if (initialItem) {
      setSelectedItem(initialItem);
    } else if (value === null || value === undefined || value === '') {
      setSelectedItem(null);
    }
  }, [value, initialItem]);

  // Load options when opened or when query changes
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setIsLoading(true);
      loadOptions(query)
        .then((items) => {
          setOptions(items);
          setHighlightedIndex(items.length > 0 ? 0 : -1);
        })
        .catch((err) => {
          console.error('AsyncSearchSelect loadOptions error:', err);
          setOptions([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, query ? 300 : 0);

    return () => clearTimeout(timer);
  }, [isOpen, query, loadOptions]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: AsyncSearchSelectItem) => {
    setSelectedItem(item);
    onChange(item.id, item);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(null);
    onChange(null, null);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && options[highlightedIndex]) {
      e.preventDefault();
      handleSelect(options[highlightedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for HTML form requirement if needed */}
      {required && (
        <input
          type="text"
          value={value ?? ''}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Trigger Button */}
      <div
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm rounded-xl border transition-all cursor-pointer ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'border-blue-600 ring-2 ring-blue-100 bg-white'
            : 'border-slate-300 bg-white hover:border-slate-400 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {selectedItem ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-medium text-slate-800 truncate">{selectedItem.label}</span>
              {selectedItem.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
                  {selectedItem.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedItem && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
              title="Temizle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in-50 duration-150">
          {/* Search Input Box */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full text-xs bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
              autoFocus
            />
            {isLoading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0 mr-1" />}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50">
            {options.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {isLoading ? 'Sonuçlar aranıyor...' : query.length > 0 && query.length < 2 ? 'Aramak için en az 2 karakter girin' : 'Sonuç bulunamadı'}
              </div>
            ) : (
              options.map((item, idx) => {
                const isSelected = selectedItem?.id === item.id;
                const isHighlighted = highlightedIndex === idx;
                return (
                  <div
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-medium'
                        : isHighlighted
                        ? 'bg-slate-100 text-slate-800'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate">
                      <div className="truncate font-medium">{item.label}</div>
                      {item.subLabel && <div className="text-[11px] text-slate-400 truncate">{item.subLabel}</div>}
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

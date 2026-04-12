"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// SelectDropdown — a styled select replacement using a dropdown panel
// ---------------------------------------------------------------------------

export interface SelectOption {
  id: string;
  label: string;
}

interface SelectDropdownProps {
  value: string;
  onChange: (id: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Extra classes for the container (e.g. width). Default: "w-full" */
  className?: string;
}

export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = "— เลือก —",
  disabled = false,
  loading = false,
  className = "w-full",
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const isDisabled = disabled || loading;

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={isDisabled}
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex w-full items-center justify-between gap-2",
          "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-left outline-none transition",
          "focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100",
          open ? "border-emerald-400 bg-white ring-4 ring-emerald-100" : "",
          isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-slate-300",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className={selected ? "text-slate-900" : "text-slate-400"}>
          {loading ? "กำลังโหลด..." : (selected?.label ?? placeholder)}
        </span>
        {/* Chevron */}
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && !isDisabled && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-4 py-2 text-sm text-slate-400">— ไม่พบข้อมูล —</li>
          ) : (
            options.map((opt) => (
              <li
                key={opt.id}
                role="option"
                aria-selected={opt.id === value}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={[
                  "cursor-pointer px-4 py-2.5 text-sm transition",
                  opt.id === value
                    ? "bg-emerald-50 font-medium text-emerald-800"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export interface DropdownItem {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  /** Alignment of the menu. Default: "left" */
  align?: "left" | "right";
  /** Width of the menu. Default: "w-48" */
  width?: string;
}

export function Dropdown({ trigger, items, align = "left", width = "w-48" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen((v) => !v);
        }}
      >
        {trigger}
      </div>

      {/* Menu */}
      {open && (
        <ul
          role="menu"
          className={`absolute z-50 mt-1 ${width} bg-white rounded-xl border border-gray-100 shadow-lg py-1 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item, idx) =>
            item.href ? (
              <li key={idx} role="menuitem">
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2 text-sm transition ${
                    item.danger
                      ? "text-red-600 hover:bg-red-50"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ) : (
              <li key={idx} role="menuitem">
                <button
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                  disabled={item.disabled}
                  className={`w-full text-left px-4 py-2 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    item.danger
                      ? "text-red-600 hover:bg-red-50"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

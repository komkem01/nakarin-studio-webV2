"use client";

import { useEffect, useRef, useState } from "react";

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

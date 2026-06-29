"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  label: string;
  icon: ReactNode;
  shortcut?: string;
  active?: boolean;
  onClick?: () => void;
  isConfigButton?: boolean;
}

/**
 * Reusable navigation link component
 * Used in both Sidebar and MobileSidebar
 */
export function NavLink({
  href,
  label,
  icon,
  shortcut,
  active = false,
  onClick,
  isConfigButton = false,
}: NavLinkProps) {
  const baseStyles = `
    w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all border group
  `;

  const activeStyles = active
    ? "bg-brand text-default-50 border-brand-400"
    : "text-default-600 dark:text-default-400 border-transparent hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:text-foreground dark:hover:text-default-50";

  const Element = isConfigButton ? "button" : Link;

  return (
    <Element
      {...(isConfigButton
        ? { onClick, type: "button" }
        : { href, onClick })}
      className={`${baseStyles} ${activeStyles} justify-between`}
      aria-label={`Ver opciones de ${label}`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {shortcut && (
        <kbd
          className={`
            inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded flex-shrink-0 transition-colors
            ${
              active
                ? "bg-default-50 dark:bg-default-100/20 text-default-50"
                : "bg-default-200 dark:bg-default-700 text-default-500 dark:text-default-400 group-hover:bg-brand-200 group-hover:text-brand-600"
            }
          `}
        >
          {shortcut}
        </kbd>
      )}
    </Element>
  );
}

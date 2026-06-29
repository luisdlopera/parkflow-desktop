"use client";

import Link from "next/link";

interface ConfigNavLinkProps {
  href: string;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

/**
 * Reusable configuration navigation link component
 * Used in both Sidebar and MobileSidebar config submenu
 */
export function ConfigNavLink({
  href,
  label,
  isActive,
  onClick,
}: ConfigNavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all border group
        ${
          isActive
            ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border-brand-400"
            : "text-default-600 dark:text-default-400 border-transparent hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40"
        }
      `}
    >
      <span
        className={`w-1 h-1 rounded-full transition-colors ${
          isActive
            ? "bg-brand-600 dark:bg-brand-400"
            : "bg-default-300 group-hover:bg-brand-600"
        }`}
      />
      {label}
    </Link>
  );
}

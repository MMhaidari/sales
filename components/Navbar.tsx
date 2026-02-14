"use client";

import Link from "next/link";
import React from "react";
import { useLanguage } from "@/components/ui/LanguageProvider";

interface NavbarProps {
  links?: { label: string; href: string }[];
  rightContent?: React.ReactNode;
}

const Navbar: React.FC<NavbarProps> = ({ links, rightContent }) => {
  const { t } = useLanguage();
  const resolvedLinks =
    links ??
    [
      { label: t("nav.dashboard"), href: "/dashboard" },
      { label: t("nav.categories"), href: "/categories" },
      { label: t("nav.products"), href: "/products" },
      { label: t("nav.customers"), href: "/customers" },
      { label: t("debts.title"), href: "/debts" },
      { label: t("nav.stocks"), href: "/stocks" },
      { label: t("nav.bills"), href: "/bills" },
      { label: t("nav.payments"), href: "/payments" },
      { label: t("nav.reports"), href: "/reports" },
    ];
  return (
    <aside className="h-full w-full border-r border-slate-200 bg-white/95 backdrop-blur flex flex-col">
      
      {/* Logo / Brand */}
      <div className="px-6 py-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
            SD
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{t("brand.title")}</h1>
            <p className="text-xs text-slate-500">{t("brand.subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-1">
          {resolvedLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="group flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <span className="flex-1">{link.label}</span>

                {/* Optional indicator */}
                <span className="h-2 w-2 rounded-full bg-transparent group-hover:bg-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom / Right Content */}
      <div className="px-4 py-4 border-t border-slate-100">
        <Link
          href="/backup"
          className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          {t("nav.backupRestore")}
          <span className="text-xs text-slate-400">/backup</span>
        </Link>
      </div>
    </aside>
  );
};

export default Navbar;

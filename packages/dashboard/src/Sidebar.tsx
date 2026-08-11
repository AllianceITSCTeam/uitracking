import { useState } from "react";

type Page = "review" | "config" | "screens-config";

type Props = {
  page: Page;
  onNavigate: (page: Page) => void;
};

function navButtonClass(active: boolean): string {
  return `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
    active ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-50"
  }`;
}

export function Sidebar({ page, onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      aria-label="Điều hướng chính"
      className={`flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      <button
        type="button"
        data-testid="sidebar_toggle_button"
        aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center border-b border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
      >
        {collapsed ? "»" : "« Thu gọn"}
      </button>
      <nav className="flex flex-1 flex-col gap-4 p-2">
        <div className="flex flex-col gap-1">
          {!collapsed && (
            <span className="px-2 text-xs font-semibold uppercase text-slate-400">Configurations</span>
          )}
          <button
            type="button"
            data-testid="nav_config_button"
            aria-current={page === "config"}
            aria-label="Quản lý project"
            title="Quản lý project"
            onClick={() => onNavigate("config")}
            className={navButtonClass(page === "config")}
          >
            <span aria-hidden="true">⚙</span>
            {!collapsed && <span>Quản lý project</span>}
          </button>
          <button
            type="button"
            data-testid="nav_screens_config_button"
            aria-current={page === "screens-config"}
            aria-label="URL & Locators"
            title="URL & Locators"
            onClick={() => onNavigate("screens-config")}
            className={navButtonClass(page === "screens-config")}
          >
            <span aria-hidden="true">🔗</span>
            {!collapsed && <span>URL & Locators</span>}
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {!collapsed && <span className="px-2 text-xs font-semibold uppercase text-slate-400">Tools</span>}
          <button
            type="button"
            data-testid="nav_review_button"
            aria-current={page === "review"}
            aria-label="Review UI"
            title="Review UI"
            onClick={() => onNavigate("review")}
            className={navButtonClass(page === "review")}
          >
            <span aria-hidden="true">🛠</span>
            {!collapsed && <span>Review UI</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
}

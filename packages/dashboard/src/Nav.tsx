type Page = "review" | "config";

type Props = {
  page: Page;
  onNavigate: (page: Page) => void;
};

function navButtonClass(active: boolean): string {
  return active
    ? "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
    : "rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";
}

export function Nav({ page, onNavigate }: Props) {
  return (
    <nav aria-label="Điều hướng chính" className="flex gap-6 border-b border-slate-200 pb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase text-slate-400">Configurations</span>
        <button
          type="button"
          data-testid="nav_config_button"
          aria-current={page === "config"}
          onClick={() => onNavigate("config")}
          className={navButtonClass(page === "config")}
        >
          Quản lý project
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase text-slate-400">Tools</span>
        <button
          type="button"
          data-testid="nav_review_button"
          aria-current={page === "review"}
          onClick={() => onNavigate("review")}
          className={navButtonClass(page === "review")}
        >
          Review UI
        </button>
      </div>
    </nav>
  );
}

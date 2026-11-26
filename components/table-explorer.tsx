"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Enhances server-rendered tables without moving rows or replacing their actions. */
export function TableExplorer({ children, label = "records", pageSize = 10 }: {
  children: React.ReactNode;
  label?: string;
  pageSize?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [column, setColumn] = useState("all");
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.min(page, pages);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const apply = () => {
      const table = host.querySelector("table");
      if (!table) return;
      const headings = Array.from(table.querySelectorAll(":scope > thead tr:first-child th")).map((el) => el.textContent?.trim() || "Details");
      setColumns((old) => old.join("\0") === headings.join("\0") ? old : headings);
      const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>(":scope > tbody > tr"));
      const mainRows = rows.filter((row) => !row.hasAttribute("data-table-detail"));
      const term = query.trim().toLocaleLowerCase();
      const matches = mainRows.filter((row) => {
        let values: string[] = Array.from(row.cells).map((cell) => cell.textContent || "");
        if (row.dataset.tableColumns) {
          try { values = JSON.parse(row.dataset.tableColumns); } catch { /* Use visible cells for older rows. */ }
        }
        Array.from(row.cells).forEach((cell, index) => {
          if (cell.colSpan === 1) cell.dataset.columnLabel = headings[index] || "Details";
        });
        const text = column === "all" ? (row.dataset.tableSearch || values.join(" ")) : values[Number(column)] || "";
        return !term || text.toLocaleLowerCase().includes(term);
      });
      const safePage = Math.min(page, Math.max(1, Math.ceil(matches.length / pageSize)));
      const shown = new Set(matches.slice((safePage - 1) * pageSize, safePage * pageSize));
      let main: HTMLTableRowElement | undefined;
      for (const row of rows) {
        if (!row.hasAttribute("data-table-detail")) main = row;
        row.classList.toggle("table-filter-hidden", !main || !shown.has(main));
      }
      setTotal(mainRows.length);
      setCount(matches.length);
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(host, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [query, column, page, pageSize]);

  return (
    <section className="table-explorer min-w-0 max-w-full" aria-label={`${label} table`}>
      <div className="table-explorer-controls mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-52">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            aria-label={`Search ${label}`} placeholder={`Search ${label}…`}
            className="h-11 w-full min-w-0 rounded-xl border border-border bg-background pl-10 pr-3 text-base" />
        </div>
        <select value={column} onChange={(event) => { setColumn(event.target.value); setPage(1); }}
          aria-label={`Filter ${label} by column`} className="h-11 max-w-full rounded-xl border border-border bg-background px-3 text-sm">
          <option value="all">All columns</option>
          {columns.map((name, index) => <option key={index} value={index}>{name}</option>)}
        </select>
      </div>
      <div ref={root} className="table-explorer-body min-w-0 max-w-full overflow-x-auto">{children}</div>
      {count === 0 && total > 0 && <p className="table-explorer-controls py-6 text-center text-muted-foreground">No matching {label}. Try another search.</p>}
      <div className="table-explorer-controls mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" role="status">
          {count ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, count)}` : "0"} of {count}{query && count !== total ? ` (${total} total)` : ""}
        </p>
        {pages > 1 && <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
          <span className="text-sm">{currentPage} / {pages}</span>
          <Button type="button" variant="outline" size="sm" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button>
        </div>}
      </div>
    </section>
  );
}

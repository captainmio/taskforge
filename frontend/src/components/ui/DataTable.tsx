import type { ReactNode } from "react";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";

export type SortDirection = "ascending" | "descending";

export interface DataTableSort {
  columnId: string;
  direction: SortDirection;
}

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  hideHeader?: boolean;
  mobileFullWidth?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  ariaLabel: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string | number;
  emptyState: ReactNode;
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort) => void;
  onRowClick?: (row: T) => void;
}

const SortIcon = ({
  activeSort,
  columnId,
}: {
  activeSort?: DataTableSort | null;
  columnId: string;
}) => {
  if (activeSort?.columnId !== columnId) {
    return <FaSort className="text-gray-300" aria-hidden="true" />;
  }

  return activeSort.direction === "ascending" ? (
    <FaSortUp className="text-site-green" aria-hidden="true" />
  ) : (
    <FaSortDown className="text-site-green" aria-hidden="true" />
  );
};

const DataTable = <T,>({
  ariaLabel,
  rows,
  columns,
  getRowKey,
  emptyState,
  sort,
  onSortChange,
  onRowClick,
}: DataTableProps<T>) => {
  const sortableColumns = columns.filter((column) => column.sortable);

  const changeSort = (columnId: string): void => {
    const direction: SortDirection =
      sort?.columnId === columnId && sort.direction === "ascending"
        ? "descending"
        : "ascending";

    // A single sort object represents the active column. Replacing it here
    // automatically clears the direction previously shown by every other column.
    onSortChange?.({ columnId, direction });
  };

  if (rows.length === 0) return emptyState;

  return (
    <div>
      {sortableColumns.length > 0 ? (
        <div
          className="mb-4 flex flex-wrap gap-2 md:hidden"
          role="group"
          aria-label={`Sort ${ariaLabel}`}
        >
          {sortableColumns.map((column) => (
            <button
              key={column.id}
              type="button"
              onClick={() => changeSort(column.id)}
              className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:border-site-green hover:text-green-700"
            >
              {column.header}
              <SortIcon activeSort={sort} columnId={column.id} />
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-auto rounded-xl border border-gray-200">
        <table aria-label={ariaLabel} className="block w-full md:table">
          <thead className="hidden bg-emerald-50/70 md:table-header-group">
            <tr>
              {columns.map((column) => {
                const activeDirection =
                  sort?.columnId === column.id ? sort.direction : "none";

                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={column.sortable ? activeDirection : undefined}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 ${column.className ?? ""}`}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => changeSort(column.id)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left hover:text-gray-800"
                      >
                        <span>{column.header}</span>
                        <SortIcon activeSort={sort} columnId={column.id} />
                      </button>
                    ) : (
                      <span className={column.hideHeader ? "sr-only" : ""}>
                        {column.header}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="block divide-y divide-gray-100 md:table-row-group">
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={`block px-4 py-2 md:table-row md:px-0 md:py-0 ${
                  onRowClick
                    ? "cursor-pointer transition-colors hover:bg-emerald-50/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-site-green"
                    : ""
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={`flex items-center justify-between gap-4 py-2 text-sm text-gray-700 md:table-cell md:px-4 md:py-4 ${column.className ?? ""}`}
                  >
                    {!column.hideHeader ? (
                      <span className="shrink-0 text-xs font-semibold text-gray-400 md:hidden">
                        {column.header}
                      </span>
                    ) : null}
                    <div
                      className={`min-w-0 ${column.mobileFullWidth ? "w-full" : "md:w-full"}`}
                    >
                      {column.cell(row)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;

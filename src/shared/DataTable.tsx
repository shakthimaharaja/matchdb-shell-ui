/**
 * DataTable — Reusable Win97-styled data table component.
 *
 * Renders a panel with title bar + fixed-layout table.
 * Accepts columns, headers, widths, and number of rows dynamically.
 *
 * Mirrors the .matchdb-panel / .matchdb-table visual style from
 * the authenticated MatchDataTable component in matchdb-jobs-ui.
 *
 * Usage:
 *   <DataTable
 *     panelTitle="Job Openings"
 *     panelIcon="💼"
 *     columns={columns}
 *     data={jobs}
 *     rowCount={25}
 *     loading={loading}
 *     keyExtractor={(j) => j.id}
 *     flashIds={flashJobIds}
 *   />
 */
import React from "react";
import "./DataTable.css";

// ── Column definition ─────────────────────────────────────────────────────────

export interface DataTableColumnDef {
  /** Unique key for React reconciliation */
  key: string;
  /** Column header content (string or JSX) */
  header: React.ReactNode;
  /** CSS width for <col> element, e.g. "24%" or "120px" */
  colWidth?: string;
  /** Extra CSS class on <td> cells */
  tdClass?: string;
  /** Cell renderer — receives the row item, local index, and absolute index */
  render: (item: any, localIndex: number, absIndex: number) => React.ReactNode;
  /** Optional tooltip generator for <td title="…"> */
  tooltip?: (item: any) => string;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DataTableProps {
  /** Panel title bar text */
  panelTitle: string;
  /** Emoji / icon shown before the title */
  panelIcon: string;
  /** Array of row data */
  data: any[];
  /** Column definitions (headers, widths, renderers) */
  columns: DataTableColumnDef[];
  /** Whether data is currently loading (shows skeleton rows) */
  loading: boolean;
  /** Returns a unique string key for each row item */
  keyExtractor: (item: any) => string;
  /** Set of item keys whose rows should flash (gold animation) */
  flashIds?: Set<string>;
  /** CSS width for the row-number (#) column, default "3%" */
  rnColWidth?: string;
  /** Total rows to display — empty padding rows fill the gap. Default 25. */
  rowCount?: number;
}

// ── Internal: Padding rows ────────────────────────────────────────────────────

const PadRows: React.FC<{
  dataLen: number;
  cols: number;
  rowCount: number;
}> = ({ dataLen, cols, rowCount }) => {
  const remaining = rowCount - dataLen;
  if (remaining <= 0) return null;
  return (
    <>
      {Array.from({ length: remaining }).map((_, i) => (
        <tr key={`pad-${i}`} className="pub-empty-row" aria-hidden="true">
          <td className="pub-td-rn">{dataLen + i + 1}</td>
          {Array.from({ length: cols - 1 }).map((__, ci) => (
            <td key={ci}>&nbsp;</td>
          ))}
        </tr>
      ))}
    </>
  );
};

// ── DataTable component ───────────────────────────────────────────────────────

const DataTable: React.FC<DataTableProps> = ({
  panelTitle,
  panelIcon,
  data,
  columns,
  loading,
  keyExtractor,
  flashIds,
  rnColWidth = "3%",
  rowCount = 25,
}) => {
  const totalCols = columns.length + 1; // +1 for the # column

  return (
    <div className="matchdb-panel">
      {/* Panel title bar — gradient, W97 style */}
      <div className="matchdb-panel-title">
        <span className="matchdb-panel-title-icon">{panelIcon}</span>
        <span className="matchdb-panel-title-text">{panelTitle}</span>
        <span className="matchdb-panel-title-meta">
          {loading ? "Loading..." : `${data.length} rows`}
        </span>
      </div>

      {/* Table wrap — overflow hidden, no scroll */}
      <div className="matchdb-table-wrap">
        {loading ? (
          <table className="matchdb-table" aria-busy="true">
            <tbody>
              {Array.from({ length: 8 }).map((_, ri) => (
                <tr
                  key={`sk-${ri}`}
                  className="matchdb-skeleton-row"
                  aria-hidden="true"
                >
                  {Array.from({ length: totalCols }).map((_, ci) => (
                    <td key={ci}>
                      <span
                        className="w97-shimmer"
                        style={{ width: ci === 0 ? 22 : 60 }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="matchdb-table">
            <colgroup>
              <col style={{ width: rnColWidth }} />
              {columns.map((c) => (
                <col
                  key={c.key}
                  style={c.colWidth ? { width: c.colWidth } : undefined}
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="pub-th-rn" title="Row number">
                  #
                </th>
                {columns.map((c) => (
                  <th key={c.key}>{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => {
                const itemKey = keyExtractor(item);
                const isFlashing = flashIds?.has(itemKey) ?? false;
                return (
                  <tr
                    key={itemKey}
                    className={isFlashing ? "pub-row-flash" : undefined}
                  >
                    <td className="pub-td-rn">{i + 1}</td>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={c.tdClass}
                        title={c.tooltip ? c.tooltip(item) : undefined}
                      >
                        {c.render(item, i, i)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <PadRows
                dataLen={data.length}
                cols={totalCols}
                rowCount={rowCount}
              />
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DataTable;

// client/src/components/ui/ResponsiveTable.jsx
import React from "react";

/**
 * ResponsiveTable
 * - md+ : جدول عادي
 * - <md : Cards (label: value) لكل سطر
 *
 * props:
 *  - columns: [{ key: 'name', label: 'Name', className?: 'w-40 text-right', render?: (row)=>JSX }]
 *  - data:    Array of rows (objects)
 *  - keyField: string (e.g. 'id' أو 'username')
 *  - actions?: (row) => JSX (أزرار لكل سطر)
 *  - dense?: boolean (مسافات أضيق)
 */
export default function ResponsiveTable({
  columns = [],
  data = [],
  keyField = "id",
  actions,
  dense = false,
  emptyText = "No data",
}) {
  const tdPad = dense ? "px-2 py-2" : "px-3 py-2";
  const thPad = dense ? "px-2 py-2" : "px-3 py-2";

  return (
    <div className="w-full">
      {/* Desktop / Tablet ≥ md */}
      <div className="hidden md:block overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`${thPad} font-semibold whitespace-nowrap ${c.className || ""}`}
                >
                  {c.label}
                </th>
              ))}
              {actions && <th className={`${thPad} font-semibold text-right`}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td className={`${tdPad} text-gray-500`} colSpan={columns.length + (actions ? 1 : 0)}>
                  {emptyText}
                </td>
              </tr>
            )}
            {data.map((row) => (
              <tr
                key={String(row[keyField] ?? Math.random())}
                className="border-t hover:bg-gray-50"
              >
                {columns.map((c) => (
                  <td key={c.key} className={`${tdPad} align-top`}>
                    {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                  </td>
                ))}
                {actions && (
                  <td className={`${tdPad} text-right`}>
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile < md */}
      <div className="md:hidden space-y-3">
        {data.length === 0 && (
          <div className="rounded-lg border bg-white p-4 text-sm text-gray-500">{emptyText}</div>
        )}

        {data.map((row) => (
          <div
            key={String(row[keyField] ?? Math.random())}
            className="rounded-lg border bg-white p-4"
          >
            <div className="grid grid-cols-1 gap-2">
              {columns.map((c) => {
                const val = c.render ? c.render(row) : String(row[c.key] ?? "—");
                return (
                  <div key={c.key} className="flex items-start justify-between gap-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 min-w-[92px]">
                      {c.label}
                    </div>
                    <div className="text-sm text-gray-800">{val}</div>
                  </div>
                );
              })}
              {actions && (
                <div className="pt-2 flex justify-end">
                  {actions(row)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

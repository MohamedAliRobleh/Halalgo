import React from 'react';

interface Column<T> {
  key:     keyof T | string;
  label:   string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns:  Column<T>[];
  data:     T[];
  keyField: keyof T;
  loading?: boolean;
}

export function DataTable<T extends object>({ columns, data, keyField, loading }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th key={String(col.key)} className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase tracking-wide">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={String(row[keyField])} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={String(col.key)} className="py-3 px-4 text-gray-700">
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key as string] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                No data found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

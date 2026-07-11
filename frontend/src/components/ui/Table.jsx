import { Loader2 } from "lucide-react";

export default function Table({ columns = [], data = [], loading = false, emptyMessage = "No data found" }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-background">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-text-secondary border-b border-border"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12">
                <Loader2 size={20} className="animate-spin mx-auto text-primary" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-12 text-[15px] text-text-secondary"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id ?? i}
                className="bg-surface border-b border-border hover:bg-background/50 transition-colors"
                style={{ height: "64px" }}
              >
                {columns.map((col, j) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[15px] ${
                      j === 0
                        ? "font-medium text-text-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

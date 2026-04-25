import type { InventoryAdjustmentColumn } from "./types";

type TableRowSkeletonProps = {
  columns: InventoryAdjustmentColumn[];
};

export function TableRowSkeleton({ columns }: TableRowSkeletonProps) {
  return (
    <>
      {[...Array(8)].map((_, index) => (
        <tr key={index} className="animate-pulse border-b border-gray-50">
          <td className="w-16 px-4 py-3">
            <div className="mx-auto h-4 w-4 rounded bg-gray-100" />
          </td>
          {columns.map((column, columnIndex) => (
            <td
              key={column.key}
              className="px-4 py-3"
              style={{ width: column.width }}
            >
              <div
                className={`h-4 rounded bg-gray-100 ${
                  columnIndex === 0 ? "w-3/4" : "w-1/2"
                }`}
              />
            </td>
          ))}
          <td className="sticky right-0 w-12 bg-white px-4 py-3" />
        </tr>
      ))}
    </>
  );
}

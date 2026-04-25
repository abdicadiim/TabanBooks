import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { MIN_COLUMN_WIDTH } from "./constants";
import type { ColumnResizeState } from "./types";
import { loadColumnsFromStorage, persistColumns } from "./utils";

export function useInventoryAdjustmentColumns() {
  const [columns, setColumns] = useState(loadColumnsFromStorage);
  const resizingRef = useRef<ColumnResizeState | null>(null);

  useEffect(() => {
    persistColumns(columns);
  }, [columns]);

  useEffect(() => {
    const stopResizing = () => {
      resizingRef.current = null;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!resizingRef.current) {
        return;
      }

      const { col, startX, startWidth } = resizingRef.current;
      const delta = event.clientX - startX;

      setColumns((previousColumns) =>
        previousColumns.map((column) =>
          column.key === col
            ? {
                ...column,
                width: Math.max(MIN_COLUMN_WIDTH, startWidth + delta),
              }
            : column,
        ),
      );
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResizing);
      stopResizing();
    };
  }, []);

  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns],
  );

  const startResizing = (
    key: string,
    event: ReactMouseEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const column = columns.find((item) => item.key === key);
    if (!column) {
      return;
    }

    resizingRef.current = {
      col: key,
      startX: event.clientX,
      startWidth: column.width,
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return {
    visibleColumns,
    startResizing,
  };
}

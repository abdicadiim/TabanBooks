import { useEffect, useState } from "react";
import { getItemsFromAPI } from "../../salesModel";

export async function fetchItemsList() {
  return getItemsFromAPI();
}

export function useItemsListQuery() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const items = await getItemsFromAPI();
        if (!cancelled) {
          setData(Array.isArray(items) ? items : []);
        }
      } catch {
        if (!cancelled) {
          setData([]);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data };
}

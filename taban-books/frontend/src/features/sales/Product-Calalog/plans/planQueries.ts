import { useEffect, useState } from "react";
import { getPlansFromAPI } from "../../salesModel";

export function usePlansListQuery() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const plans = await getPlansFromAPI();
        if (!cancelled) {
          setData(Array.isArray(plans) ? plans : []);
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

import { useQuery } from "@tanstack/react-query";
import { getItemsFromAPI } from "../../salesModel";

export const fetchItemsList = async () => {
  const items = await getItemsFromAPI();
  return Array.isArray(items) ? items : [];
};

export const useItemsListQuery = () =>
  useQuery({
    queryKey: ["sales", "items", "list"],
    queryFn: fetchItemsList,
    staleTime: 60 * 1000,
  });

import { getCurrentUser } from "../../services/auth";

export function useUser() {
  return {
    user: getCurrentUser(),
  };
}

import { useEffect, useState } from "react";
import type { Role } from "../types";

export type StoredUser = { username: string; role: Role };

export function useStoredUser(): StoredUser | null {
  const read = () => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "null",
      ) as StoredUser | null;
    } catch {
      return null;
    }
  };
  const [user, setUser] = useState(read);

  useEffect(() => {
    const sync = () => setUser(read());
    window.addEventListener("auth:changed", sync);
    window.addEventListener("auth:expired", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth:changed", sync);
      window.removeEventListener("auth:expired", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return user;
}

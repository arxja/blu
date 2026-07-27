"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  fetch("/api/auth/me")
    .then(async (res) => {
      if (res.status === 401) {
        setUser(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      if (data.user) setUser(data.user);
    })
    .catch((error) => {
      console.error("Auth check failed:", error);
      setUser(null);
    })
    .finally(() => setIsLoading(false));
}, []);

  const signIn = async (email: string, password: string) => {
    const res = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      return { success: true };
    }
    return { success: false, error: "Invalid credentials" };
  };

  const signUp = async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      return { success: true };
    }
    return { success: false, error: "Sign up failed" };
  };

  const signOut = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    setUser(null);
  };

  return { user, isLoading, signIn, signUp, signOut };
}

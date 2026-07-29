"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me");

        if (res.status === 401) {
          if (isMounted) {
            setUser(null);
          }
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }

        const data = await res.json();

        if (isMounted) {
          setUser(data.user ?? null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user ?? null);
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
      setUser(data.user ?? null);
      return { success: true };
    }

    return { success: false, error: "Sign up failed" };
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      setUser(null);
    }
  };

  return createElement(
    AuthContext.Provider,
    { value: { user, isLoading, signIn, signUp, signOut } },
    children,
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

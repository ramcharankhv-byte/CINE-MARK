"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- AUTH WALL BYPASS START ---
const MOCK_USER: User = {
  id: "test-user-123",
  email: "test@example.com",
  name: "Test User",
  picture: "https://via.placeholder.com/150",
};
// --- AUTH WALL BYPASS END ---

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // --- AUTH WALL BYPASS START ---
    // Automatically log in as the mock user without hitting the backend
    setTimeout(() => {
      setUser(MOCK_USER);
      setIsLoading(false);
    }, 500);
    // --- AUTH WALL BYPASS END ---
  }, []);

  const login = async (idToken: string) => {
    setUser(MOCK_USER);
    queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
  };

  const logout = async () => {
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

"use client";
import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; mfa_required?: boolean; error?: string }>;
  logout: () => void;
  setAuth: (token: string, user: User) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificar si hay token guardado al cargar
    const token = localStorage.getItem("access_token");
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get("/auth/profile");
      setUser(response.data);
    } catch {
      localStorage.removeItem("access_token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post("/auth/login", { email, password });
      
      // Si requiere MFA, guardar token temporal y retornar flag
      if (response.data.mfa_required) {
        localStorage.setItem("access_token", response.data.access_token);
        return { success: true, mfa_required: true };
      }

      // Login normal
      localStorage.setItem("access_token", response.data.access_token);
      setUser(response.data.user);
      return { success: true, mfa_required: false };
    } catch (error: any) {
      return { 
        success: false, 
        error: error?.response?.data?.message || "Error de login" 
      };
    }
  };

  const setAuth = (token: string, userData: User) => {
    localStorage.setItem("access_token", token);
    setUser(userData);
  };

  const logout = () => {
    // Redirigir a la página de logout que maneja la limpieza completa
    router.push("/logout");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, setAuth, loading }}>
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

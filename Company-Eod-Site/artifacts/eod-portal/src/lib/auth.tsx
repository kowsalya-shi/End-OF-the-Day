import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const token = localStorage.getItem("auth_token");

  const { data, isLoading: isMeLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (isMeLoading) return;

    if (data) {
      setUser(data);
    } else if (error || !token) {
      setUser(null);
      localStorage.removeItem("auth_token");
    }
    setIsLoading(false);
  }, [data, isMeLoading, error, token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("auth_token", newToken);
    setUser(newUser);
    queryClient.setQueryData(getGetMeQueryKey(), newUser);
    
    // Redirect based on role
    if (newUser.role === "employee") setLocation("/employee/dashboard");
    else if (newUser.role === "tl") setLocation("/tl/dashboard");
    else if (newUser.role === "manager") setLocation("/manager/dashboard");
    else if (newUser.role === "ceo") setLocation("/ceo/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
    queryClient.clear();
    setLocation("/login");
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


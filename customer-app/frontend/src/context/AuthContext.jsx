import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionStorage.getItem("token")) {
      setLoading(false);
      return;
    }
    api
      .get("/api/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => sessionStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (customerId, password) => {
    const { data } = await api.post("/api/auth/login", {
      customer_id: customerId,
      password,
    });
    sessionStorage.setItem("token", data.access_token);
    const me = await api.get("/api/auth/me");
    setUser(me.data);
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
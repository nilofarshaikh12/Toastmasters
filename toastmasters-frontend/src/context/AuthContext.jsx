import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tm_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem("tm_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("tm_user");
      }
    } catch (_) {
      // ignore
    }
  }, [user]);

  const login = (role, name = "") => {
    setUser({ role, name });
  };

  const logout = () => setUser(null);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    isVPEducation: user?.role === "VP_EDUCATION",
    isMember: user?.role === "MEMBER",
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};



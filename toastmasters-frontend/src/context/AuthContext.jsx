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

  const value = useMemo(() => {
    // Normalize the role by converting to uppercase and replacing spaces with underscores
    const normalizedRole = user?.role ? user.role.toString().toUpperCase().replace(/\s+/g, '_') : '';
    
    return {
      user,
      login,
      logout,
      isVPEducation: normalizedRole === 'VP_EDUCATION',
      isMember: normalizedRole === 'MEMBER',
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};



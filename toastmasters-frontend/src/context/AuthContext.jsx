import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import apiService from "../api/api.js";

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

  // Backward compatible login: accepts either (role, name?) or a full user object
  const login = (payloadOrRole, name = "") => {
    if (typeof payloadOrRole === "object" && payloadOrRole !== null) {
      // Expected shape: { role, name?, email?, id?, userId?, memberId? }
      setUser(payloadOrRole);
    } else {
      const role = payloadOrRole;
      setUser({ role, name });
    }
  };

  const logout = () => setUser(null);

  // Auto-enrich user with memberId and proper name using email when available
  useEffect(() => {
    const tryLinkMember = async () => {
      if (!user) return;
      if (user.memberId) return; // already linked
      const email = user.email?.toString().trim();
      if (!email) return;
      try {
        const res = await apiService.getMembers();
        const members = res?.data?.data || [];
        const match = members.find((m) => m.email?.toLowerCase() === email.toLowerCase());
        if (match) {
          setUser((prev) => ({
            ...prev,
            memberId: match.memberId,
            name: prev?.name || match.memberName,
          }));
        }
      } catch (_) {
        // ignore errors; UI will handle missing mapping
      }
    };
    tryLinkMember();
    // Only re-run when email or memberId changes
  }, [user?.email, user?.memberId]);

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

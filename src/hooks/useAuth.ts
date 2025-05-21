// src/hooks/useAuth.ts
"use client";
import { useContext } from "react";
// This file is effectively replaced by the export in AuthContext.tsx
// but kept for structural reference if AuthContext becomes very large.
// For now, directly use useAuth from AuthContext.tsx.
// If you prefer a separate file:
// import { AuthContext, AuthContextType } from "@/contexts/AuthContext";
// export const useAuth = (): AuthContextType => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// };

// For this exercise, we will use the useAuth hook exported directly from AuthContext.tsx
// This file can be considered a placeholder or can be deleted if not strictly needed.
// To avoid issues with duplicate declarations, this file will be kept empty,
// and `useAuth` will be imported from `@/contexts/AuthContext`.
// If you want to use this file, uncomment the code above and remove the export from AuthContext.tsx.

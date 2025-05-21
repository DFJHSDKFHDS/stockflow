// src/components/auth/AuthGuard.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading) {
      if (!user && !AUTH_ROUTES.includes(pathname)) {
        router.push("/login");
      } else if (user && AUTH_ROUTES.includes(pathname)) {
        // Default to the main page (Generate Gate Pass) after login
        router.push("/"); 
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-12 rounded-full mb-4" />
        <Skeleton className="h-4 w-[250px] mb-2" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    );
  }

  if (!user && !AUTH_ROUTES.includes(pathname)) {
    return null; 
  }
  
  if (user && AUTH_ROUTES.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}

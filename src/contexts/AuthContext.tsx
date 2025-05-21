// src/contexts/AuthContext.tsx
"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import * as React from "react";
import { useRouter } from "next/navigation";

interface User extends FirebaseUser {} // Can extend with custom properties if needed

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<User | null>; // Simplified, replace with actual Firebase signInWithEmailAndPassword
  signUp: (email: string, pass: string) => Promise<User | null>; // Simplified, replace with actual Firebase createUserWithEmailAndPassword
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>; // Simplified
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser as User | null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Mocked auth functions, replace with actual Firebase calls
  const signIn = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    // Replace with: import { signInWithEmailAndPassword } from "firebase/auth";
    // await signInWithEmailAndPassword(auth, email, password);
    // For now, simulate login
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = { email, uid: "mock-uid", displayName: "Mock User" } as User;
        setUser(mockUser);
        setLoading(false);
        resolve(mockUser);
      }, 1000);
    });
  };

  const signUp = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    // Replace with: import { createUserWithEmailAndPassword } from "firebase/auth";
    // await createUserWithEmailAndPassword(auth, email, password);
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = { email, uid: "mock-uid-new", displayName: "New User" } as User;
        setUser(mockUser);
        setLoading(false);
        resolve(mockUser);
      }, 1000);
    });
  };

  const signOut = async () => {
    setLoading(true);
    // Replace with: await firebaseSignOut(auth);
    setUser(null);
    setLoading(false);
    router.push("/login");
  };
  
  const forgotPassword = async (email: string) => {
    // Replace with: import { sendPasswordResetEmail } from "firebase/auth";
    // await sendPasswordResetEmail(auth, email);
    alert(`Password reset link sent to ${email} (mocked)`);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// src/contexts/AuthContext.tsx
"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  EmailAuthProvider, // Added
  reauthenticateWithCredential // Added
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import * as React from "react";
import { useRouter } from "next/navigation";

interface User extends FirebaseUser {} 

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<User | null>;
  signUp: (email: string, pass: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  reauthenticateCurrentPassword: (password: string) => Promise<void>; // Added
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

  const signIn = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user as User;
    } catch (error) {
      throw error; 
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user as User;
    } catch (error) {
      throw error; 
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null); 
      router.push("/login");
    } catch (error: any) {
      console.error("Sign out error:", error);
      throw error; 
    } finally {
      setLoading(false);
    }
  };
  
  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw error; 
    } finally {
      setLoading(false);
    }
  };

  const reauthenticateCurrentPassword = async (password: string): Promise<void> => {
    if (!user || !user.email) {
      throw new Error("User not authenticated or email not available.");
    }
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    } catch (error) {
      throw error; // Re-throw to be caught by the calling component
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, forgotPassword, reauthenticateCurrentPassword }}>
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

// src/components/auth/PasswordConfirmationModal.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Loader2 } from "lucide-react";

interface PasswordConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>; // The action to perform after successful re-authentication
  actionDescription: string; // e.g., "delete this product", "save changes"
}

export function PasswordConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  actionDescription,
}: PasswordConfirmationModalProps) {
  const { reauthenticateCurrentPassword, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = React.useState("");
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    if (!password) {
      setError("Password is required.");
      return;
    }
    setIsConfirming(true);
    setError(null);
    try {
      await reauthenticateCurrentPassword(password);
      toast({ title: "Authentication Successful", description: "Proceeding with action..." });
      await onConfirm(); // Execute the protected action
      onClose(); // Close modal on success
    } catch (err: any) {
      console.error("Re-authentication error:", err);
      let errorMessage = "Failed to verify password. Please try again.";
      if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later.";
      }
      setError(errorMessage);
      toast({ title: "Authentication Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsConfirming(false);
      setPassword(""); // Clear password field
    }
  };

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setError(null);
      setIsConfirming(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" /> Secure Action Confirmation
          </DialogTitle>
          <DialogDescription>
            To {actionDescription}, please re-enter your password to confirm your identity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password-confirm">Password</Label>
            <Input
              id="password-confirm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isConfirming || authLoading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isConfirming || authLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleConfirm} disabled={isConfirming || authLoading || !password}>
            {isConfirming || authLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

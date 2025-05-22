
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
  onConfirm: () => Promise<void>; 
  actionDescription: string; 
  isGatePassContext?: boolean; 
}

export function PasswordConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  actionDescription,
  isGatePassContext = false, 
}: PasswordConfirmationModalProps) {
  const { reauthenticateCurrentPassword, loading: authLoading } = useAuth();
  const { toast } = useToast();
  // Set initial password based on context
  const [password, setPassword] = React.useState(isGatePassContext ? "1234" : "");
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setPassword(isGatePassContext ? "1234" : "");
      setError(null);
      setIsConfirming(false);
    }
  }, [isOpen, isGatePassContext]);

  const handleConfirm = async () => {
    if (!password) {
      setError("Password is required.");
      return;
    }
    setIsConfirming(true);
    setError(null);
    try {
      if (isGatePassContext && password === "1234") {
        // Simulate successful re-authentication for gate pass demo with "1234"
        toast({ title: "Authentication Successful (Demo)", description: "Proceeding with action..." });
      } else {
        // Actual re-authentication for all other cases or if "1234" is not used for gate pass
        await reauthenticateCurrentPassword(password);
        toast({ title: "Authentication Successful", description: "Proceeding with action..." });
      }
      await onConfirm(); 
      onClose(); 
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
      // Reset password field to context-specific default unless it was a successful demo login
      if (!(isGatePassContext && password === "1234" && !error)) {
         setPassword(isGatePassContext ? "1234" : ""); 
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" /> Secure Action Confirmation
          </DialogTitle>
          <DialogDescription>
            To {actionDescription}, please re-enter your password.
            {isGatePassContext ? ' (Demo default: "1234")' : ''}
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

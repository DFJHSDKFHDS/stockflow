// src/components/profile/ProfileForm.tsx
"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { UserProfileData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCircle, Save, Loader2, PlusCircle, MinusCircle, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref as databaseRef, get, set } from "firebase/database";
import { PasswordConfirmationModal } from "@/components/auth/PasswordConfirmationModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const profileSchema = z.object({
  shopName: z.string().min(2, "Shop name must be at least 2 characters.").max(100, "Shop name too long."),
  contactNo: z.string().regex(/^\+?[0-9\s-]{10,15}$/, "Invalid contact number format.").or(z.literal("")),
  address: z.string().max(250, "Address too long.").or(z.literal("")),
  employees: z.array(
    z.string().min(1, "Employee name cannot be empty.").max(100, "Employee name too long.")
  ).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [pendingFormValues, setPendingFormValues] = React.useState<ProfileFormValues | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      shopName: "",
      contactNo: "",
      address: "",
      employees: [],
    },
  });

  const { fields: employeeFields, append: appendEmployee, remove: removeEmployee } = useFieldArray({
    control: form.control,
    name: "employees",
  });

  React.useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setIsFetching(false);
      return;
    }

    const fetchProfileData = async () => {
      setIsFetching(true);
      try {
        const profileDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/profileData`);
        const snapshot = await get(profileDbRef);
        if (snapshot.exists()) {
          const data = snapshot.val() as UserProfileData;
          form.reset({
            shopName: data.shopName || "",
            contactNo: data.contactNo || "",
            address: data.address || "",
            employees: data.employees || [],
          });
        } else {
           form.reset({ // Reset to default if no data exists
            shopName: "",
            contactNo: "",
            address: "",
            employees: [],
          });
        }
      } catch (error: any) {
        console.error("Error fetching profile data:", error);
        toast({
          title: "Error Fetching Profile",
          description: error.message || "Could not load your profile data.",
          variant: "destructive",
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchProfileData();
  }, [user, authLoading, form, toast]);

  const triggerPasswordConfirmation = (values: ProfileFormValues) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    // Filter out any empty employee strings before submission, though Zod should catch this
    const cleanedValues = {
      ...values,
      employees: values.employees?.filter(emp => emp.trim() !== "") || [],
    };
    setPendingFormValues(cleanedValues);
    setIsPasswordModalOpen(true);
  };

  const processProfileUpdate = async () => {
    if (!user || !pendingFormValues) {
      toast({ title: "Error", description: "User or form data missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const valuesToSave = pendingFormValues;

    try {
      const profileDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/profileData`);
      await set(profileDbRef, valuesToSave);

      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully saved.",
      });
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update your profile.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setPendingFormValues(null);
    }
  };
  
  if (isFetching || authLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" /> User Profile
          </CardTitle>
          <CardDescription>Manage your shop, contact, and employee information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Separator />
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-10 w-32" />
          <div className="flex justify-end">
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PasswordConfirmationModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPendingFormValues(null);
        }}
        onConfirm={processProfileUpdate}
        actionDescription="update your profile information"
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" /> User Profile
          </CardTitle>
          <CardDescription>Manage your shop, contact, and employee information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(triggerPasswordConfirmation)} className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-3">Shop Details</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="shopName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client / Shop Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., My Awesome Store" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="e.g., +91 98765 43210" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter full shop or client address" {...field} rows={3} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium flex items-center gap-2"><Users className="h-5 w-5 text-muted-foreground"/> Manage Employees</h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendEmployee("")}
                        disabled={isSubmitting}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
                    </Button>
                </div>
                
                {employeeFields.length === 0 && (
                    <p className="text-sm text-muted-foreground">No employees added yet.</p>
                )}

                <div className="space-y-3">
                  {employeeFields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`employees.${index}`}
                      render={({ field: employeeNameField }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder={`Employee ${index + 1} Name`} {...employeeNameField} disabled={isSubmitting} />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEmployee(index)}
                              disabled={isSubmitting}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <MinusCircle className="h-5 w-5" />
                              <span className="sr-only">Remove Employee</span>
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end pt-6 border-t">
                <Button type="submit" disabled={isSubmitting || !user || authLoading}>
                  {isSubmitting || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isSubmitting ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}

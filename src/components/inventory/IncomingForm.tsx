// src/components/inventory/IncomingForm.tsx
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function IncomingForm() {
  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Construction className="h-6 w-6 text-primary" />
          Log Incoming Stock
        </CardTitle>
        <CardDescription>
          This section is currently being restructured. Please provide new requirements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground py-8">
          Incoming stock logging functionality is under revision.
        </p>
      </CardContent>
    </Card>
  );
}

// src/components/dashboard/DashboardClient.tsx
"use client";

import * as React from "react";
import { SummaryCard } from "./SummaryCard";
import { Package, ArrowDownToLine, ArrowUpFromLine, DollarSign, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import type { InventorySummary } from "@/types";

// Mock data - replace with actual data fetching
const mockSummary: InventorySummary = {
  totalProducts: 25,
  totalStockUnits: 1250,
  incomingToday: 150,
  outgoingToday: 75,
};

const mockStockData = [
  { name: "Laptops", stock: 300 },
  { name: "Monitors", stock: 450 },
  { name: "Keyboards", stock: 200 },
  { name: "Mice", stock: 300 },
];

export function DashboardClient() {
  const [summary, setSummary] = React.useState<InventorySummary>(mockSummary);
  const [stockData, setStockData] = React.useState(mockStockData);

  // Placeholder for data fetching logic
  React.useEffect(() => {
    // fetchSummaryData().then(setSummary);
    // fetchStockOverviewData().then(setStockData);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Products"
          value={summary.totalProducts}
          icon={Package}
          description="Distinct product types"
        />
        <SummaryCard
          title="Total Stock Units"
          value={summary.totalStockUnits.toLocaleString()}
          icon={BarChart3}
          description="Across all products"
        />
        <SummaryCard
          title="Incoming Today"
          value={summary.incomingToday.toLocaleString()}
          icon={ArrowDownToLine}
          description="Units received"
        />
        <SummaryCard
          title="Outgoing Today"
          value={summary.outgoingToday.toLocaleString()}
          icon={ArrowUpFromLine}
          description="Units shipped"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock Overview</CardTitle>
            <CardDescription>Current stock levels for top products.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockData}>
                <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Current Stock" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card data-ai-hint="activity feed">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest inventory movements.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <ArrowDownToLine className="h-5 w-5 text-green-500" /> 
                <div>
                  <p className="font-medium">Received 50 units of "Wireless Mouse"</p>
                  <p className="text-sm text-muted-foreground">2 hours ago</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <ArrowUpFromLine className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium">Shipped 10 units of "Mechanical Keyboard"</p>
                  <p className="text-sm text-muted-foreground">3 hours ago</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">New product "Ergonomic Chair" registered</p>
                  <p className="text-sm text-muted-foreground">1 day ago</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// src/components/layout/AppLayout.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/icons/Logo";
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine, 
  Settings,
  LogOut,
  FileText, 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  subItems?: NavItem[];
  badge?: string;
  exact?: boolean; // To match exact path for "/"
}

const navItems: NavItem[] = [
  { href: "/", label: "Generate Gate Pass", icon: FileText, exact: true },
  {
    href: "/products",
    label: "Products",
    icon: Package,
  },
  { href: "/incoming", label: "Incoming Stock", icon: ArrowDownToLine },
  { href: "/outgoing-logs", label: "Outgoing Stock", icon: ArrowUpFromLine }, 
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const getInitials = (email?: string | null) => {
    if (!email) return "SF";
    return email.substring(0, 2).toUpperCase();
  };
  
  const getActiveLabel = () => {
    for (const item of navItems) {
      if (item.exact && pathname === item.href) return item.label;
      if (!item.exact && pathname.startsWith(item.href) && item.href !== "/") return item.label;
      if (item.subItems) {
        for (const subItem of item.subItems) {
          if (pathname.startsWith(subItem.href)) return subItem.label;
        }
      }
    }
    const matchedItem = navItems.find(item => item.href === pathname || (item.exact && pathname === item.href));
    return matchedItem?.label || "StockFlow";
  }

  return (
    <SidebarProvider defaultOpen={true} collapsible="offcanvas"> 
      <Sidebar collapsible="offcanvas" variant="sidebar" className="border-r">
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-between">
             <Logo showText={true} /> 
          </div>
        </SidebarHeader>
        <ScrollArea className="flex-grow">
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)}
                    tooltip={{ children: item.label, side: 'right', className: 'ml-2' }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
                {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        </ScrollArea>
        <SidebarFooter className="p-4 mt-auto border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || user?.email || "User"} />
                  <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                </Avatar>
                <div className="ml-2 text-left group-data-[collapsible=icon]:hidden"> 
                  <p className="text-sm font-medium truncate">{user?.displayName || user?.email}</p>
                  <p className="text-xs text-muted-foreground">View Profile</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-2 ml-2">
              <DropdownMenuLabel>{user?.displayName || user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span> 
              </DropdownMenuItem> */}
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
            <SidebarTrigger className="md:flex"/> 
            <div className="flex-1">
              <h1 className="text-xl font-semibold">
                {getActiveLabel()}
              </h1>
            </div>
            <div className="md:hidden"> 
               <Logo showText={false} />
            </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

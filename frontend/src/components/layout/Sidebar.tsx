"use client";

import { cn } from "@/lib/utils";
import {
  ListVideo,
  Search,
  LogOut,
  Sun,
  Moon,
  PanelLeft,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/movies/search", label: "Search Movies", icon: Search },
  { href: "/watchlists", label: "My Watchlists", icon: ListVideo },
];

export function Sidebar({
  className,
  isCollapsed = false,
  onToggle,
}: {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col justify-between bg-transparent",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 py-5",
          isCollapsed ? "justify-center px-0" : "px-4",
        )}
      >
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-white/5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <PanelLeft className="size-5" />
        </button>
        {!isCollapsed && (
          <Link
            href="/watchlists"
            className="font-heading text-lg font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            CINE-MARK
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <nav
          className={cn(
            "flex flex-col gap-2",
            isCollapsed ? "px-2 items-center" : "px-4",
          )}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg transition-all hover:text-primary",
                  isActive
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:bg-muted",
                  isCollapsed
                    ? "justify-center p-3 w-10 h-10"
                    : "gap-3 px-3 py-2 text-sm font-medium",
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "flex-shrink-0",
                    isCollapsed ? "h-5 w-5" : "h-4 w-4",
                  )}
                />
                {!isCollapsed && item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {user && (
        <div
          className={cn(
            "mb-2 flex",
            isCollapsed
              ? "flex-col items-center gap-4 py-4"
              : "p-4 items-center gap-2",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex items-center rounded-lg transition-all hover:bg-muted outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                isCollapsed ? "justify-center p-1" : "flex-1 gap-3 p-2",
              )}
            >
              <Avatar
                className={cn(
                  "flex-shrink-0",
                  isCollapsed ? "h-9 w-9" : "h-8 w-8",
                )}
              >
                <AvatarImage src={user.picture} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col items-start overflow-hidden text-sm">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="right">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                <span>
                  {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

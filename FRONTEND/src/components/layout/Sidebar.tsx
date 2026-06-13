"use client";

import { cn } from "@/lib/utils";
import { Film, LayoutDashboard, ListVideo, PlusCircle, Search, Settings, LogOut, MessageSquare, ChevronDown, ChevronRight, Sun, Moon, PanelLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/movies/search", label: "Search Movies", icon: Search },
  { href: "/watchlists", label: "My Watchlists", icon: ListVideo },
];

export function Sidebar({ className, isCollapsed = false, onToggle }: { className?: string; isCollapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isRecentOpen, setIsRecentOpen] = useState(true);
  const { setTheme, theme } = useTheme();
  
  const [recentChats, setRecentChats] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/chats/recent");
        const data = await res.json();
        setRecentChats(data);
      } catch (err) {
        console.error("Failed to fetch recent chats:", err);
      }
    };
    fetchRecent();
  }, [pathname]);

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setRecentChats(prev => prev.filter(c => c.id !== id));
    
    try {
      await fetch(`http://localhost:8000/api/chat/${id}`, { method: 'DELETE' });
      if (pathname.includes(`/chat/${id}`)) {
        router.push('/chat');
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className={cn("flex h-full flex-col justify-between bg-transparent", className)}>
      <div className={cn("flex items-center gap-2 py-5", isCollapsed ? "justify-center px-0" : "px-4")}>
        <button 
          onClick={onToggle} 
          className="p-1.5 hover:bg-white/5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <PanelLeft className="size-5" />
        </button>
        {!isCollapsed && (
          <Link href="/chat" className="font-heading text-lg font-bold tracking-tight hover:opacity-80 transition-opacity">
            CINE-MARK
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        <nav className={cn("flex flex-col gap-2", isCollapsed ? "px-2 items-center" : "px-4")}>
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
                  isCollapsed ? "justify-center p-3 w-10 h-10" : "gap-3 px-3 py-2 text-sm font-medium"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("flex-shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                {!isCollapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {!isCollapsed && (
          <div className="mt-8 px-4">
            <button 
              onClick={() => setIsRecentOpen(!isRecentOpen)}
              className="flex w-full items-center justify-between px-3 py-1 mb-2 hover:bg-muted/50 rounded-md transition-colors group"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 group-hover:text-foreground transition-colors">
                Recent
              </h3>
              {isRecentOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
              )}
            </button>
            
            {isRecentOpen && (
              <div className="flex flex-col gap-1">
                {recentChats.length > 0 ? (
                  recentChats.map((chat) => (
                    <Link
                      key={chat.id}
                      href={`/chat/${chat.id}`}
                      className="group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all relative"
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-6">
                        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                        <span className="truncate">{chat.title}</span>
                      </div>
                      
                      <button 
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-md transition-all duration-200"
                        title="Delete chat"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-500 transition-colors" />
                      </button>
                    </Link>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-muted-foreground/60 italic">
                    No recent chats
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {user && (
        <div className={cn("mb-2 flex", isCollapsed ? "flex-col items-center gap-4 py-4" : "p-4 items-center gap-2")}>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn("flex items-center rounded-lg transition-all hover:bg-muted outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", isCollapsed ? "justify-center p-1" : "flex-1 gap-3 p-2")}>
              <Avatar className={cn("flex-shrink-0", isCollapsed ? "h-9 w-9" : "h-8 w-8")}>
                <AvatarImage src={user.picture} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col items-start overflow-hidden text-sm">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="right">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
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

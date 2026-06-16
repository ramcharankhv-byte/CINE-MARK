'use client';

import React from 'react';
import { Film, MenuIcon, SearchIcon, PlaySquare } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SearchModal } from '@/components/ui/search-modal';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Moon, Sun, LogOut, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
	const [open, setOpen] = React.useState(false);
    const { user, logout } = useAuth();
    const { setTheme, theme } = useTheme();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

	const links = [
		{
			label: 'Home',
			href: '/',
		},
		{
			label: 'Watchlists',
			href: '/watchlists',
		},
		{
			label: 'Discover',
			href: '/movies/search',
		},
	];

	return (
		<header className="sticky top-0 z-50 w-full p-4 pointer-events-none">
			<nav className="pointer-events-auto flex h-16 w-full items-center justify-between px-4 rounded-full bg-background/70 backdrop-blur-xl border border-border/50 shadow-md">
				<Link href="/" className="flex items-center gap-2 group">
					<div className="bg-primary/10 text-primary p-1.5 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                        <PlaySquare className="size-5" />
                    </div>
					<p className="font-heading text-lg font-bold tracking-tight">CINE-MARK</p>
				</Link>
				<div className="flex items-center gap-2">
					<div className="hidden items-center gap-1 md:flex mr-4">
						{links.map((link) => (
							<Link
								key={link.href}
								className={cn(buttonVariants({ variant: 'ghost' }), "text-sm font-medium")}
								href={link.href}
							>
								{link.label}
							</Link>
						))}
					</div>
					{/* Search removed as per user request */}
					<Sheet open={open} onOpenChange={setOpen}>
						<Button
							size="icon"
							variant="ghost"
							onClick={onMenuClick || (() => setOpen(!open))}
							className="md:hidden"
						>
							<MenuIcon className="size-5" />
						</Button>
						<SheetContent
							className="bg-background/95 supports-[backdrop-filter]:bg-background/80 gap-0 backdrop-blur-lg"
							showClose={true}
							side="left"
						>
                            <div className="flex items-center gap-2 px-4 pt-6 pb-2">
                                <div className="bg-primary/10 text-primary p-1.5 rounded-md">
                                    <PlaySquare className="size-5" />
                                </div>
                                <p className="font-heading text-xl font-bold tracking-tight">CINE-MARK</p>
                            </div>
							<div className="grid gap-y-2 overflow-y-auto px-4 pt-8 pb-5">
								{links.map((link) => (
									<Link
                                        key={link.href}
										className={cn(buttonVariants({
											variant: 'ghost',
											className: 'justify-start text-lg py-6',
										}))}
										href={link.href}
                                        onClick={() => setOpen(false)}
									>
										{link.label}
									</Link>
								))}
							</div>
						</SheetContent>
					</Sheet>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                        className="hidden md:flex"
                        >
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle Theme</span>
                    </Button>

                    {/* User profile removed as per user request (moved to sidebar) */}
				</div>
			</nav>
		</header>
	);
}

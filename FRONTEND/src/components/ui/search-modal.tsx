'use client';

import React from 'react';
import {
	Modal,
	ModalContent,
	ModalTitle,
	ModalTrigger,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';

import { SearchIcon, Film, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useMovieSearch } from '@/lib/queries/hooks';
import Image from 'next/image';

export function SearchModal({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
    const [debouncedQuery, setDebouncedQuery] = React.useState('');
    const router = useRouter();

    React.useEffect(() => {
      const timer = setTimeout(() => setDebouncedQuery(query), 300);
      return () => clearTimeout(timer);
    }, [query]);

    const { data, isLoading } = useMovieSearch(debouncedQuery, 1);
    const movies = data?.movies || [];

	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

    const handleSelectMovie = (imdbID: string) => {
        setOpen(false);
        router.push(`/movies/${imdbID}`);
    };

    const handleSearchSubmit = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query.trim()) {
            setOpen(false);
            router.push(`/movies/search?query=${encodeURIComponent(query)}`);
        }
    };

	return (
		<Modal open={open} onOpenChange={setOpen}>
			<ModalTrigger asChild>{children}</ModalTrigger>
			<ModalContent className="p-1">
				<ModalTitle className="sr-only">Search</ModalTitle>
				<Command className="bg-background md:bg-card rounded-md md:border" shouldFilter={false}>
					<CommandInput
						className={cn(
							'placeholder:text-muted-foreground flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
						)}
						placeholder="Search movies..."
						value={query}
						onValueChange={setQuery}
                        onKeyDown={handleSearchSubmit}
					/>
					<CommandList className="max-h-[380px] min-h-[380px] px-2 md:px-0">
                        {isLoading && query ? (
                            <div className="flex h-full min-h-[280px] flex-col items-center justify-center">
                                <Loader2 className="animate-spin text-muted-foreground mb-2 size-6" />
                                <p className="text-muted-foreground text-xs">Searching...</p>
                            </div>
                        ) : movies.length === 0 && query ? (
                            <CommandEmpty className="flex min-h-[280px] flex-col items-center justify-center">
                                <SearchIcon className="text-muted-foreground mb-2 size-6" />
                                <p className="text-muted-foreground mb-1 text-xs">
                                    No movies found for "{query}"
                                </p>
                                <Button onClick={() => setQuery('')} variant="ghost" size="sm" className="mt-2">
                                    Clear search
                                </Button>
                            </CommandEmpty>
                        ) : movies.length > 0 ? (
                            <CommandGroup heading="Movies">
                                {movies.map((movie) => (
                                    <CommandItem
                                        key={movie.imdbID}
                                        className="flex cursor-pointer items-center gap-3 py-2"
                                        value={movie.imdbID}
                                        onSelect={() => handleSelectMovie(movie.imdbID)}
                                    >
                                        <div className="relative h-12 w-8 overflow-hidden rounded bg-muted flex shrink-0 items-center justify-center">
                                            {movie.poster && movie.poster !== "N/A" ? (
                                                <Image src={movie.poster} alt={movie.title} fill sizes="32px" className="object-cover" />
                                            ) : (
                                                <Film className="size-4 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <p className="truncate text-sm font-medium">
                                                {movie.title}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {movie.year} {movie.type !== "movie" ? `• ${movie.type}` : ""}
                                            </p>
                                        </div>
                                    </CommandItem>
                                ))}
                                <CommandItem 
                                    onSelect={() => {
                                        setOpen(false);
                                        router.push(`/movies/search?query=${encodeURIComponent(query)}`);
                                    }}
                                    className="justify-center text-primary font-medium mt-2"
                                >
                                    View all results for "{query}"
                                </CommandItem>
                            </CommandGroup>
                        ) : (
                            <div className="flex min-h-[280px] flex-col items-center justify-center opacity-50">
                                <Film className="mb-2 size-8 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">Type a movie name to search</p>
                            </div>
                        )}
					</CommandList>
				</Command>
			</ModalContent>
		</Modal>
	);
}

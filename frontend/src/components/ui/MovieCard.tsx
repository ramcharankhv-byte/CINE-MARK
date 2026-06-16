import React from 'react';
import { Play, Star, Calendar, Clapperboard, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MovieProps {
  title: string;
  year: string;
  genre: string;
  pitch: string;
  poster?: string;
}

export const MovieCard = ({ movie }: { movie: MovieProps }) => {
  // mesh: we now have real posters from OMDB, but we still need a fallback just in case!
  const fallbackPoster = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80";
  const posterUrl = movie.poster && movie.poster !== "N/A" ? movie.poster : fallbackPoster;

  return (
    <div className="group relative w-[240px] md:w-[280px] h-[400px] rounded-3xl overflow-hidden shrink-0 snap-center transition-all duration-500 hover:scale-[1.02] shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url(${posterUrl})` }}
      />
      
      {/* Premium Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content Container */}
      <div className="absolute inset-0 p-5 flex flex-col justify-end">
        {/* Top Badges */}
        <div className="absolute top-4 right-4 flex gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          <button className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/20 transition-colors">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Info Area */}
        <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
          <div className="flex items-center gap-2 mb-2 text-white/70 text-xs font-medium tracking-wider uppercase">
            <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10">
              <Calendar className="w-3 h-3" />
              {movie.year}
            </span>
            <span className="flex items-center gap-1 bg-primary/20 text-primary-foreground px-2 py-1 rounded-md backdrop-blur-sm border border-primary/30">
              <Clapperboard className="w-3 h-3" />
              {movie.genre}
            </span>
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2 leading-tight drop-shadow-lg group-hover:text-primary transition-colors duration-300">
            {movie.title}
          </h3>
          
          <p className="text-white/70 text-sm font-light leading-relaxed line-clamp-3 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
            {movie.pitch}
          </p>
          
          <button className="w-full py-3 bg-white hover:bg-white/90 text-black font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            <Play className="w-4 h-4 fill-black" />
            Watch Trailer
          </button>
        </div>
      </div>
    </div>
  );
};

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { 
  Sparkles, Mic, Star, Compass, Flame, ArrowUp, Infinity, X, 
  Search, Hash, CornerDownLeft, Tag, Film, Loader2,
  Play, Plus, Check, ChevronLeft, ChevronRight, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Fuse from "fuse.js";
import { toast } from "sonner";
import { api } from "@/lib/api";

const PLACEHOLDERS = [
  "e.g. A sci-fi movie about time travel that bends your mind...",
  "e.g. An action thriller with intense car chases in Tokyo...",
  "e.g. A heartwarming indie drama about finding yourself...",
  "e.g. A terrifying horror movie set in an isolated cabin...",
  "e.g. A visually stunning fantasy epic with dragons...",
  "e.g. A dark comedy that will make me laugh and cry...",
  "e.g. A classic 90s romance with a killer soundtrack...",
  "e.g. A gripping murder mystery with a shocking twist...",
  "e.g. An animated masterpiece perfect for a rainy day...",
  "e.g. A cyberpunk dystopia with rogue AI..."
];

const FUZZY_SEARCH_ITEMS = [
  { label: "Action & Adventure", type: "Tag", value: "Action & Adventure" },
  { label: "Critically Acclaimed", type: "Tag", value: "Critically Acclaimed" },
  { label: "Sci-Fi Masterpieces", type: "Tag", value: "Sci-Fi Masterpieces" },
  { label: "Hidden Gems", type: "Tag", value: "Hidden Gems" },
  { label: "Mind-Bending", type: "Tag", value: "Mind-Bending" },
  
  { label: "Action", type: "Genre", value: "Action" },
  { label: "Adventure", type: "Genre", value: "Adventure" },
  { label: "Sci-Fi", type: "Genre", value: "Sci-Fi" },
  { label: "Comedy", type: "Genre", value: "Comedy" },
  { label: "Drama", type: "Genre", value: "Drama" },
  { label: "Horror", type: "Genre", value: "Horror" },
  { label: "Romance", type: "Genre", value: "Romance" },
  { label: "Thriller", type: "Genre", value: "Thriller" },
  
  { label: "Space Exploration", type: "Theme", value: "space exploration" },
  { label: "Time Travel", type: "Theme", value: "time travel" },
  { label: "Cyberpunk Dystopia", type: "Theme", value: "cyberpunk dystopia" },
  { label: "Artificial Intelligence", type: "Theme", value: "rogue AI" },
  { label: "Murder Mystery", type: "Theme", value: "murder mystery" },
  { label: "Mind-Bending Thriller", type: "Theme", value: "mind-bending thriller" },
  
  { label: "Inception", type: "Movie", value: "Inception" },
  { label: "Interstellar", type: "Movie", value: "Interstellar" },
  { label: "The Matrix", type: "Movie", value: "The Matrix" },
  { label: "The Dark Knight", type: "Movie", value: "The Dark Knight" },
  { label: "Blade Runner 2049", type: "Movie", value: "Blade Runner 2049" },
  { label: "Parasite", type: "Movie", value: "Parasite" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [suggestedMovies, setSuggestedMovies] = useState<any[]>([]);
  const [isFetchingMovies, setIsFetchingMovies] = useState(false);
  const params = useParams();
  const slug = params.slug as string[] | undefined;
  const initialRoute = slug ? slug[0] : 'landing';
  const urlSessionId = slug && slug[0] === 'chat' ? slug[1] : undefined;
  
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(urlSessionId);

  useEffect(() => {
    setCurrentSessionId(urlSessionId);
  }, [urlSessionId]);

  const [selectedTags, setSelectedTags] = useState<{label: string, icon: any, colorClass: string}[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  const [isFullMode, setIsFullMode] = useState(initialRoute === 'chat');
  const [activeTab, setActiveTab] = useState<"gallery" | "chat">(initialRoute === 'chat' ? "chat" : "gallery");
  const [isSubmitted, setIsSubmitted] = useState(initialRoute === 'dashboard' || initialRoute === 'chat');
  
  // Sync internal state if URL changes natively
  useEffect(() => {
    if (initialRoute === 'landing') {
      setIsSubmitted(false);
    } else if (initialRoute === 'dashboard') {
      setIsSubmitted(true);
      setIsFullMode(false);
      setActiveTab("gallery");
    } else if (initialRoute === 'chat') {
      setIsSubmitted(true);
      setIsFullMode(true);
      setActiveTab("chat");
    }
  }, [initialRoute]);

  // Watchlist (bookmark) states
  const [bookmarkedIds, setBookmarkedIds] = useState<(number | string)[]>([]);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "ai", text: string, timestamp: Date, movies?: any[] }[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const toggleBookmark = (id: number | string, title: string) => {
    if (bookmarkedIds.includes(id)) {
      setBookmarkedIds(bookmarkedIds.filter(item => item !== id));
      toast.info(`Removed "${title}" from watchlist`);
    } else {
      setBookmarkedIds([...bookmarkedIds, id]);
      toast.success(`Added "${title}" to watchlist!`);
    }
  };

  // Load session history if a currentSessionId is present in URL
  useEffect(() => {
    if (currentSessionId && chatMessages.length === 0 && !isFetchingMovies) {
      setIsFetchingMovies(true);
      fetch(`http://localhost:8000/api/chat/${currentSessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const history: { sender: "user" | "ai", text: string, timestamp: Date, movies?: any[] }[] = [];
            let lastMovies: any[] = [];
            
            data.forEach((turn: any) => {
               // Strip out the hidden genre context for the UI display
               const cleanUserQuery = turn.user_query ? turn.user_query.split('\n[GENRES:')[0].trim() : "";
               let turnMovies = undefined;
               
               if (turn.metadata.movies) {
                  try {
                    const m = JSON.parse(turn.metadata.movies);
                    if (m && m.length > 0) {
                       lastMovies = m;
                       turnMovies = m;
                    }
                  } catch (e) {}
               }
               
               history.push({ sender: "user", text: cleanUserQuery, timestamp: new Date(turn.metadata.timestamp * 1000) });
               history.push({ sender: "ai", text: turn.metadata.ai_reply, timestamp: new Date(turn.metadata.timestamp * 1000), movies: turnMovies });
            });
            
            setChatMessages(history);
            
            if (lastMovies.length > 0) {
                const gradients = [
                  { g: "from-pink-500 to-rose-500", gl: "rgba(244,63,94,0.15)" },
                  { g: "from-purple-500 to-indigo-500", gl: "rgba(99,102,241,0.15)" },
                  { g: "from-cyan-500 to-blue-500", gl: "rgba(6,182,212,0.15)" },
                  { g: "from-emerald-500 to-teal-500", gl: "rgba(16,185,129,0.15)" },
                  { g: "from-amber-500 to-orange-500", gl: "rgba(245,158,11,0.15)" }
                ];
                
                const mappedMovies = lastMovies.map((m: any, idx: number) => {
                  const style = gradients[idx % gradients.length];
                  return {
                    id: idx,
                    title: m.title || "Unknown",
                    year: m.year || "N/A",
                    duration: "120m",
                    rating: "N/A",
                    match: `${98 - idx}%`,
                    genres: m.genre ? m.genre.split(", ").slice(0, 2) : ["Movie"],
                    gradient: style.g,
                    glow: style.gl,
                    poster: m.poster && m.poster !== "N/A" ? m.poster : null
                  };
                });
                setSuggestedMovies(mappedMovies);
            }
            setIsSubmitted(true);
            setIsFullMode(true);
            setActiveTab("chat");
          }
          setIsFetchingMovies(false);
        })
        .catch(err => {
          console.error("Failed to load chat history", err);
          setIsFetchingMovies(false);
        });
    }
  }, [currentSessionId]);

  // Auto-scroll chat to bottom when messages list changes or AI is typing
  useEffect(() => {
    if (activeTab === "chat" && chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages.length, isAiTyping, activeTab]);

  const scrollGallery = (direction: "left" | "right") => {
    const container = galleryScrollRef.current;
    if (container) {
      const scrollAmount = isFullMode ? 360 : 310; // offset width + gap
      const target = container.scrollLeft + (direction === "left" ? -scrollAmount : scrollAmount);
      container.scrollTo({
        left: target,
        behavior: "smooth"
      });
    }
  };
  
  // Custom interactive search box states
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Sizing & animation helper states
  const [prevLength, setPrevLength] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setIsAdding(inputValue.length > prevLength);
    setPrevLength(inputValue.length);
  }, [inputValue, prevLength]);
  
  // Keyboard Shortcut Fuzzy Search States
  const [isFuzzyOpen, setIsFuzzyOpen] = useState(false);
  const [fuzzyQuery, setFuzzyQuery] = useState("");
  const [fuzzyResults, setFuzzyResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const fuzzyInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayLayerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const galleryScrollRef = useRef<HTMLDivElement>(null);
  const [isHoveringGallery, setIsHoveringGallery] = useState(false);
  const isInitialScrollRef = useRef(true);

  // Reset the initial scroll ref when search is reset
  useEffect(() => {
    if (!isSubmitted) {
      isInitialScrollRef.current = true;
    }
  }, [isSubmitted]);

  // Auto-scroll screen down to results section with custom 40px top offset when search is submitted
  // Account for collapsing headers during the scrolling animation using layout height invariants.
  useEffect(() => {
    const scrollParent = document.querySelector('main');
    if (isSubmitted) {
      const timer = setTimeout(() => {
        const element = resultsRef.current;
        if (scrollParent && element) {
          const elementRect = element.getBoundingClientRect();
          const parentRect = scrollParent.getBoundingClientRect();
          
          // Get current heights of collapsing layout elements
          const curtain = document.querySelector('.curtain-container');
          const immerse = document.querySelector('.immerse-container');
          const curtainHeight = curtain ? curtain.getBoundingClientRect().height : 0;
          const immerseHeight = immerse ? immerse.getBoundingClientRect().height : 0;
          
          // Calculate current scroll position relative to the main container
          const currentTop = elementRect.top - parentRect.top + scrollParent.scrollTop;
          
          // Subtract the height that will be lost as they collapse to 0
          const targetScroll = currentTop - curtainHeight - immerseHeight - 40;
          
          scrollParent.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
        } else {
          element?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (scrollParent) {
        scrollParent.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [isSubmitted]);

  // Dispatch event to MainLayout to collapse the sidebar for Full Mode
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('toggle-full-mode', { detail: isFullMode && activeTab === "chat" }));
  }, [isFullMode, activeTab]);

  // Guarantee horizontal scroll resets to 0 whenever search results mount or tab changes
  useEffect(() => {
    if (isSubmitted && activeTab === "gallery") {
      const timer = setTimeout(() => {
        const container = galleryScrollRef.current;
        if (container) {
          container.scrollLeft = 0;
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isSubmitted, activeTab]);

  // Ambient premium auto-scrolling for the horizontal movie posters scroller
  useEffect(() => {
    const container = galleryScrollRef.current;
    if (!container || isHoveringGallery || activeTab !== "gallery" || !isSubmitted) return;

    let animationFrameId: number;
    const scrollSpeed = 0.5; // smooth pixel movement speed per frame
    let currentScrollPos = container.scrollLeft;

    const performScroll = () => {
      if (!container) return;
      
      // Only scroll if there is scrollable content
      if (container.scrollWidth > container.clientWidth) {
        currentScrollPos += scrollSpeed;
        container.scrollLeft = Math.round(currentScrollPos);

        // Loop back to the start if we reach the scroll end boundary
        if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 1) {
          currentScrollPos = 0;
          container.scrollLeft = 0;
        }
      }

      animationFrameId = requestAnimationFrame(performScroll);
    };

    // Calculate delay: 3 seconds for initial view, 1 second when resuming from hover
    const delay = isInitialScrollRef.current ? 3000 : 1000;
    
    // Explicitly reset scrollLeft to 0 on initial scroll to guarantee correct initial alignment
    if (isInitialScrollRef.current) {
      container.scrollLeft = 0;
      currentScrollPos = 0;
    }

    const timer = setTimeout(() => {
      if (container) {
        currentScrollPos = container.scrollLeft;
      }
      isInitialScrollRef.current = false; // Only flip initial scroll flag to false when timer fires
      animationFrameId = requestAnimationFrame(performScroll);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isHoveringGallery, activeTab, isSubmitted]);

  // Voice Recording states & refs
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Typewriter state
  const [placeholderText, setPlaceholderText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const fullText = PLACEHOLDERS[placeholderIndex];
      
      if (!isDeleting) {
        setPlaceholderText(fullText.substring(0, placeholderText.length + 1));
        
        // When finished typing, wait before deleting
        if (placeholderText === fullText) {
          setTimeout(() => setIsDeleting(true), 2500);
        }
      } else {
        setPlaceholderText(fullText.substring(0, placeholderText.length - 1));
        
        // When finished deleting, move to next string
        if (placeholderText === "") {
          setIsDeleting(false);
          setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        }
      }
    }, isDeleting ? 30 : 60);

    return () => clearTimeout(timeout);
  }, [placeholderText, isDeleting, placeholderIndex]);

  const suggestions = [
    { label: "Action & Adventure", icon: Flame, hoverColor: "group-hover:text-orange-400", colorClass: "text-orange-400" },
    { label: "Critically Acclaimed", icon: Star, hoverColor: "group-hover:text-yellow-400", colorClass: "text-yellow-400" },
    { label: "Sci-Fi Masterpieces", icon: Sparkles, hoverColor: "group-hover:text-cyan-400", colorClass: "text-cyan-400" },
    { label: "Hidden Gems", icon: Compass, hoverColor: "group-hover:text-emerald-400", colorClass: "text-emerald-400" },
    { label: "Mind-Bending", icon: Infinity, hoverColor: "group-hover:text-purple-400", colorClass: "text-purple-400" },
  ];

  // Initialize Fuse.js
  const fuse = useMemo(() => {
    return new Fuse(FUZZY_SEARCH_ITEMS, {
      keys: ['label', 'value', 'type'],
      threshold: 0.4,
    });
  }, []);

  // Update fuzzy results
  useEffect(() => {
    if (!fuzzyQuery.trim()) {
      setFuzzyResults(FUZZY_SEARCH_ITEMS.slice(0, 5));
      setSelectedIndex(0);
      return;
    }
    const results = fuse.search(fuzzyQuery);
    setFuzzyResults(results.map(r => r.item));
    setSelectedIndex(0);
  }, [fuzzyQuery, fuse]);

  // Auto-resize textarea height and sync scroll
  useEffect(() => {
    const textarea = textareaRef.current;
    const displayLayer = displayLayerRef.current;
    if (textarea && displayLayer) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const nextHeight = Math.min(scrollHeight, 112); // cap at 3 lines height (~112px)
      textarea.style.height = `${nextHeight}px`;
      displayLayer.style.height = `${nextHeight}px`;
      
      // Delay sync to allow browser rendering to catch up
      setTimeout(() => {
        displayLayer.scrollTop = textarea.scrollTop;
      }, 0);
    }
  }, [inputValue]);

  const handleTextareaScroll = () => {
    const textarea = textareaRef.current;
    const displayLayer = displayLayerRef.current;
    if (textarea && displayLayer) {
      displayLayer.scrollTop = textarea.scrollTop;
    }
  };

  // Global key listener for Shift + : (Colon key)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === ':') {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        setIsFuzzyOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Focus fuzzy input when opened
  useEffect(() => {
    if (isFuzzyOpen) {
      setTimeout(() => {
        fuzzyInputRef.current?.focus();
      }, 50);
      setFuzzyQuery("");
    }
  }, [isFuzzyOpen]);

  const handleSelectFuzzyItem = (item: any) => {
    if (item.type === "Tag") {
      const suggestion = suggestions.find(s => s.label === item.label);
      if (suggestion && !selectedTags.some(t => t.label === item.label)) {
        setSelectedTags([...selectedTags, suggestion]);
      }
    } else {
      setInputValue(prev => {
        const cleanPrev = prev.trim();
        if (!cleanPrev) return item.value;
        if (cleanPrev.endsWith(",") || cleanPrev.endsWith(".")) {
          return `${cleanPrev} ${item.value}`;
        }
        return `${cleanPrev}, ${item.value}`;
      });
    }
    setIsFuzzyOpen(false);
  };

  const handleFuzzyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, fuzzyResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + fuzzyResults.length) % Math.max(1, fuzzyResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (fuzzyResults[selectedIndex]) {
        handleSelectFuzzyItem(fuzzyResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsFuzzyOpen(false);
    }
  };

  // Speech-to-Text Voice Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await handleTranscribe(audioBlob);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200);
      setIsRecording(true);
      toast.info("Microphone is recording... speak now");
    } catch (err) {
      console.error("Failed to start recording:", err);
      toast.error("Microphone access denied or not supported.");
    }
  };

  const stopRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribe = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      
      const response = await api.post("/movie/transcribe", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      
      const text = response.data?.data?.text;
      if (text) {
        setInputValue(prev => {
          const cleanPrev = prev.trim();
          if (!cleanPrev) return text;
          if (cleanPrev.endsWith(",") || cleanPrev.endsWith(".")) {
            return `${cleanPrev} ${text}`;
          }
          return `${cleanPrev}, ${text}`;
        });
        toast.success("Speech transcribed successfully!");
      }
    } catch (err: any) {
      console.error("Transcription failed:", err);
      toast.error(err.response?.data?.message || "Failed to transcribe audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() && selectedTags.length === 0) return;
    
    const baseMsg = inputValue.trim();
    const tagsText = selectedTags.map(t => t.label).join(", ");
    
    // Combine text with tags as a hidden context marker for the AI
    const userMsg = baseMsg && selectedTags.length > 0 
      ? `${baseMsg} \n[GENRES: ${tagsText}]`
      : (baseMsg || tagsText);
      
    // UI just shows the clean text (or the tags if no text)
    const displayMsg = baseMsg || tagsText;
    
    setIsSubmitted(true);
    if (!params.slug) {
      window.history.pushState({}, '', '/dashboard');
    }
    
    const newMessages = [...chatMessages, { sender: "user" as const, text: displayMsg, timestamp: new Date() }];
    setChatMessages(newMessages);
    setInputValue("");
    setIsAiTyping(true);
    setIsFetchingMovies(true);
    
    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg, session_id: currentSessionId })
      });
      const data = await res.json();
      
      if (!currentSessionId && data.session_id) {
        setCurrentSessionId(data.session_id);
        window.history.pushState({}, '', `/chat/${data.session_id}`);
      }
      
      // Update Movies
      if (data.movies && data.movies.length > 0) {
        const gradients = [
          { g: "from-pink-500 to-rose-500", gl: "rgba(244,63,94,0.15)" },
          { g: "from-purple-500 to-indigo-500", gl: "rgba(99,102,241,0.15)" },
          { g: "from-cyan-500 to-blue-500", gl: "rgba(6,182,212,0.15)" },
          { g: "from-emerald-500 to-teal-500", gl: "rgba(16,185,129,0.15)" },
          { g: "from-amber-500 to-orange-500", gl: "rgba(245,158,11,0.15)" }
        ];
        
        const mappedMovies = data.movies.map((m: any, idx: number) => {
          const style = gradients[idx % gradients.length];
          return {
            id: m.imdbID || idx,
            imdbID: m.imdbID,
            title: m.title || "Unknown",
            year: m.year || "N/A",
            duration: "120m",
            rating: "N/A",
            match: `${98 - idx}%`,
            genres: m.genre ? m.genre.split(", ").slice(0, 2) : ["Movie"],
            gradient: style.g,
            glow: style.gl,
            poster: m.poster && m.poster !== "N/A" ? m.poster : null
          };
        });
        setSuggestedMovies(mappedMovies);
      } else {
        setSuggestedMovies([]);
      }
      setIsFetchingMovies(false);
      
      const responseText = data.reply;
      setIsAiTyping(false);
      
      let currentText = "";
      let charIdx = 0;
      setChatMessages(prev => [...prev, { sender: "ai" as const, text: "", timestamp: new Date(), movies: data.movies }]);
      
      const streamInterval = setInterval(() => {
        if (charIdx < responseText.length) {
          currentText += responseText.charAt(charIdx);
          setChatMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = { 
                ...updated[updated.length - 1], 
                text: currentText 
              };
            }
            return updated;
          });
          charIdx++;
          if (charIdx % 8 === 0) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        } else {
          clearInterval(streamInterval);
          setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }
      }, 15);
    } catch (error) {
      setIsAiTyping(false);
      setIsFetchingMovies(false);
      setChatMessages(prev => [...prev, { sender: "ai" as const, text: "Backend is down or threw an error bro! Is the Python server running?", timestamp: new Date() }]);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, suggestion: any) => {
    e.dataTransfer.setData('text/plain', suggestion.label);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Check if we are really leaving the container and not just a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const label = e.dataTransfer.getData('text/plain');
    if (label) {
      const suggestion = suggestions.find(s => s.label === label);
      if (suggestion && !selectedTags.some(t => t.label === label)) {
        setSelectedTags([...selectedTags, suggestion]);
      }
    }
  };

  const removeTag = (label: string) => {
    setSelectedTags(selectedTags.filter(t => t.label !== label));
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes type-fade-in {
          0% {
            transform: scale(1.6);
            opacity: 1;
            color: #a78bfa;
            text-shadow: 0 0 10px rgba(167, 139, 250, 0.7);
          }
          50% {
            color: #ffffff;
          }
          100% {
            transform: scale(1);
            color: #ffffff;
          }
        }
        .animate-char-type {
          display: inline-block;
          transform-origin: bottom center;
          animation: type-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 25s linear infinite;
        }
        /* Pause on hover over the container */
        .marquee-container:hover .animate-marquee {
          animation-play-state: paused;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }

        /* Premium scrollbar styles */
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          transition: background 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        /* Ensure scrollbar is invisible but functional */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }

        /* Prevent double-vision text during selection */
        textarea::selection {
          background: rgba(255, 255, 255, 0.15);
          color: transparent;
        }

        /* Premium CSS Grid-based Curtain Reveal Animations */
        .curtain-container {
          display: grid;
          grid-template-rows: 1fr;
          opacity: 1;
          transform: translateY(0);
          transition: grid-template-rows 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                      opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .curtain-container.collapsed {
          grid-template-rows: 0fr;
          opacity: 0;
          transform: translateY(-40px);
        }

        .immerse-container {
          display: grid;
          grid-template-rows: 1fr;
          opacity: 1;
          transform: translateY(0);
          transition: grid-template-rows 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                      opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .immerse-container.collapsed {
          grid-template-rows: 0fr;
          opacity: 0;
          transform: translateY(40px);
        }

        /* Premium Staggered Animations for Search Results */
        .stagger-card-1 {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
        }
        .stagger-card-2 {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards;
        }
        .stagger-card-3 {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards;
        }

        /* Ambient glowing pulse animation for recording */
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4), 0 0 0 1px rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0), 0 0 0 1px rgba(239, 68, 68, 0.4);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), 0 0 0 1px rgba(239, 68, 68, 0.4);
          }
        }
        .animate-pulse-ring {
          animation: pulse-ring 1.5s cubic-bezier(0.25, 0, 0, 1) infinite;
        }
      `}</style>
      
      <div className={cn(
        "flex flex-col mx-auto w-full px-6 pt-10 relative z-10 transition-all duration-500",
        (isFullMode && activeTab === "chat") 
          ? "max-w-7xl flex-1 min-h-0 overflow-hidden pb-0" 
          : cn("max-w-6xl", isSubmitted ? "min-h-screen pb-[25vh]" : "h-full pb-8")
      )}>
        
        {/* Header Container with curtain-raise transition */}
        <div className={cn(
          "curtain-container",
          isSubmitted ? "collapsed" : ""
        )}>
          <div className="min-h-0 overflow-hidden">
            {/* Cinematic Header */}
            <div className="flex flex-col items-start justify-center w-full max-w-6xl mx-auto mt-12 mb-10 fade-in-up">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground mb-4 leading-[1.1]">
                What are we watching <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary/80 to-purple-400 font-light italic pr-2">tonight?</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl font-light">
                Skip the endless scrolling. Describe your mood, a specific plot, or even a vague memory of a scene, and let AI curate the perfect movie.
              </p>
            </div>
          </div>
        </div>

        {/* V0-Style Command Box - Ultra Premium & Droppable */}
        <div 
          className={cn(
            "w-full mx-auto group transition-all duration-500 delay-100",
            (isFullMode && activeTab === "chat" && isSubmitted)
              ? "order-last flex-shrink-0 z-[60] w-full max-w-3xl px-6 pb-6 pt-2 mb-0"
              : "relative max-w-5xl mb-8 hover:-translate-y-1 focus-within:-translate-y-1 fade-in-up"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div 
            className={cn(
              "relative bg-[#09090b]/95 backdrop-blur-3xl border rounded-2xl p-3 flex flex-col transition-all duration-500 shadow-[0_10px_40px_rgba(0,0,0,0.4)] group-hover:border-white/30",
              isDraggingOver ? "border-primary/50 ring-2 ring-primary/30" : "border-white/15",
              "focus-within:border-white/40 focus-within:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Selected Tags Area */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 px-2 pt-1">
                {selectedTags.map((tag) => {
                  const Icon = tag.icon;
                  return (
                    <div 
                      key={tag.label} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 shadow-sm transition-all animate-[fade-in_0.2s_ease-out] hover:border-white/20"
                    >
                      <Icon className={cn("w-3.5 h-3.5", tag.colorClass)} />
                      <span className="text-sm font-medium text-white/90">{tag.label}</span>
                      <button 
                        onClick={() => removeTag(tag.label)}
                        className="ml-1 text-white/40 hover:text-white transition-colors p-0.5 rounded-full hover:bg-white/10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Premium Dual-Layer Interactive Textarea */}
            <div className="relative w-full overflow-hidden">
              {/* Display Layer (Renders styled characters) */}
              <div 
                ref={displayLayerRef}
                className={cn(
                  "absolute inset-0 pointer-events-none select-none text-xl font-light leading-relaxed tracking-wide px-2 py-2 whitespace-pre-wrap break-words overflow-y-auto text-left no-scrollbar m-0 box-border border-none",
                  selectedTags.length > 0 ? "min-h-[50px]" : "min-h-[90px]"
                )}
              >
                {inputValue === "" ? (
                  <span className="text-white/30">
                    {isDraggingOver 
                      ? "Drop to add genre..." 
                      : (isSubmitted && activeTab === "chat")
                        ? "Ask about the suggested movies or toggle genres..."
                        : placeholderText
                    }
                  </span>
                ) : (
                  <>
                    <span className={cn(
                      "transition-all duration-300 font-light whitespace-pre-wrap break-words",
                      (isHovered || isFocused) ? "text-white opacity-100" : "text-white/40 opacity-35"
                    )}>
                      {inputValue.slice(0, -1)}
                    </span>
                    {inputValue.slice(-1) && (
                      inputValue.slice(-1) === "\n" ? (
                        <br />
                      ) : (
                        <span className={cn(
                          "inline-block text-white font-light transition-all duration-300",
                          isAdding ? "animate-char-type" : "",
                          (isHovered || isFocused) ? "opacity-100" : "opacity-35"
                        )}>
                          {inputValue.slice(-1) === " " ? "\u00A0" : inputValue.slice(-1)}
                        </span>
                      )
                    )}
                  </>
                )}
              </div>

              {/* Input Layer (Captures cursor/typing, invisible text with visible caret) */}
              <textarea 
                ref={textareaRef}
                value={inputValue}
                onScroll={handleTextareaScroll}
                disabled={isAiTyping}
                className={cn(
                  "w-full bg-transparent border-none outline-none text-transparent caret-white text-xl font-light resize-none leading-relaxed tracking-wide px-2 py-2 transition-all relative z-10 block no-scrollbar overflow-y-auto m-0 box-border break-words whitespace-pre-wrap disabled:opacity-50",
                  selectedTags.length > 0 ? "min-h-[50px]" : "min-h-[90px]"
                )}
                style={{ height: "auto" }}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  window.dispatchEvent(new CustomEvent('typing-speed-burst'));
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  } else if (e.key === 'Tab' && !inputValue) {
                  e.preventDefault();
                    setInputValue(PLACEHOLDERS[placeholderIndex].replace('e.g. ', ''));
                  }
                  window.dispatchEvent(new CustomEvent('typing-speed-burst'));
                }}
              />
            </div>
            
            <div className="flex items-center justify-between mt-2 px-1">
              {/* Voice recording status indicator */}
              <div className="flex items-center gap-2">
                {isRecording && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    <span className="text-[10px] font-medium text-red-400 uppercase tracking-wide">Listening...</span>
                  </div>
                )}
                {isTranscribing && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping"></span>
                    <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wide">Transcribing...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleMicClick}
                  disabled={isTranscribing || isAiTyping}
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "rounded-full transition-all duration-300 h-10 w-10 relative",
                    isRecording 
                      ? "text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse-ring" 
                      : "text-white/40 hover:text-white hover:bg-white/10",
                    isAiTyping && "opacity-50 pointer-events-none"
                  )}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isAiTyping || (!inputValue && selectedTags.length === 0)}
                  size="icon"
                  className={cn(
                    "w-10 h-10 rounded-full transition-all duration-500 border border-transparent shadow-lg flex-shrink-0 group/btn overflow-hidden relative",
                    "bg-white/10 text-white hover:bg-white hover:text-black focus:ring-4 focus:ring-white/20 disabled:opacity-50 disabled:bg-white/5",
                    isAiTyping && "opacity-50"
                  )}
                >
                  {isAiTyping ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowUp className="w-5 h-5 transition-transform duration-500 group-hover/btn:-translate-y-1 group-hover/btn:scale-110" />
                  )}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-y-full group-hover/btn:animate-[shimmer_1s_forwards]"></div>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {(isFullMode && activeTab === "chat" && isSubmitted) && (
          <div className="absolute bottom-2 left-0 right-0 mx-auto z-[60] text-[10px] text-white/40 font-light pointer-events-none tracking-wide text-center w-full max-w-xl">
            CINE-MARK can make mistakes. Verify movie details.
          </div>
        )}

        {/* Marquee Container with fade/immerse transition */}
        <div className={cn(
          "immerse-container",
          isSubmitted ? "collapsed" : ""
        )}>
          <div className="min-h-0 overflow-hidden">
            <div className="py-2">
              {/* Premium Auto-Scrolling Marquee Pills */}
              <div className="w-full max-w-6xl mx-auto overflow-hidden fade-in-up delay-200 relative [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] marquee-container">
                <div className="animate-marquee py-2">
                  {[1, 2].map((listIndex) => (
                    <div key={listIndex} className="flex items-center gap-4 pr-4">
                      {suggestions.map((suggestion) => {
                        const Icon = suggestion.icon;
                        // If tag is already selected, don't show it in the scroller
                        if (selectedTags.some(t => t.label === suggestion.label)) return null;
                        
                        return (
                          <div 
                            key={`${listIndex}-${suggestion.label}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, suggestion)}
                            className="group flex-none flex items-center gap-2.5 px-5 py-3 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-300 shadow-lg hover:-translate-y-1 hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing"
                          >
                            <Icon className={cn("w-4 h-4 text-white/40 transition-colors", suggestion.hoverColor)} />
                            <span className="text-sm font-medium text-white/60 group-hover:text-white transition-colors tracking-wide select-none">{suggestion.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Area */}
        {isSubmitted && (
          <div 
            ref={resultsRef}
            className={cn(
              "w-full mx-auto flex flex-col pb-12 transition-all duration-500 relative z-10",
              activeTab === "chat" ? "max-w-4xl flex-1 min-h-0 mt-4" : "max-w-7xl min-h-[75vh] mt-8 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards] items-center"
            )}
          >
            {/* Glassmorphic card for results */}
            <div className={cn(
              "w-full relative transition-all duration-500",
              activeTab === "chat"
                ? "flex flex-col flex-1 min-h-0"
                : "bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden group/gallery"
            )}>
              {activeTab === "gallery" && (
                <>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10"></div>
                </>
              )}
              
              <div className={cn(
                "flex items-center",
                activeTab === "chat" ? "justify-center mb-8" : "justify-between mb-6 border-b border-white/10 pb-4"
              )}>
                {/* Premium Tab Toggles */}
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md relative">
                  {/* Sliding Pill */}
                  <div 
                    className={cn(
                      "w-[90px] h-[36px] absolute top-1 rounded-lg transition-all duration-300 ease-out bg-white shadow-[0_2px_10px_rgba(255,255,255,0.1)] pointer-events-none",
                      activeTab === "gallery" ? "left-1" : "left-[94px]"
                    )}
                  />
                  <button 
                  onClick={() => {
                    setActiveTab("gallery");
                    setIsFullMode(false);
                    window.history.pushState({}, '', '/dashboard');
                  }}
                  className={cn(
                      "w-[90px] py-2 rounded-lg text-sm font-medium transition-colors duration-300 cursor-pointer relative z-10",
                      activeTab === "gallery"
                        ? "text-black"
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    Gallery
                  </button>
                  <button 
                  onClick={() => {
                    setActiveTab("chat");
                    setIsFullMode(true);
                    window.history.pushState({}, '', '/chat');
                  }}
                  className={cn(
                      "w-[90px] py-2 rounded-lg text-sm font-medium transition-colors duration-300 cursor-pointer relative z-10",
                      activeTab === "chat"
                        ? "text-black"
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    Chat
                  </button>
                </div>

                {activeTab === "gallery" && (
                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={() => {
                          setIsSubmitted(false);
                          window.history.pushState({}, '', '/');
                      }}
                      variant="ghost" 
                      size="sm" 
                      className="text-white/40 hover:text-white hover:bg-white/10 rounded-full gap-1.5"
                    >
                      <X className="w-4 h-4" /> Reset Search
                    </Button>
                  </div>
                )}
              </div>

              {activeTab === "gallery" ? (
                <div className="py-2 relative">
                  {/* Floating Carousel Navigation Arrows */}
                  <button 
                    onClick={() => scrollGallery("left")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 hover:border-white/20 shadow-xl opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-300 pointer-events-auto cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => scrollGallery("right")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 hover:border-white/20 shadow-xl opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-300 pointer-events-auto cursor-pointer"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  <div 
                    ref={galleryScrollRef}
                    onMouseEnter={() => setIsHoveringGallery(true)}
                    onMouseLeave={() => setIsHoveringGallery(false)}
                    className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar [mask-image:linear-gradient(to_right,black_90%,transparent)] relative z-10"
                  >
                    {isFetchingMovies && suggestedMovies.length === 0 ? (
                      <div className="w-full flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
                        <span className="ml-3 text-white/50">Curating your recommendations...</span>
                      </div>
                    ) : suggestedMovies.length === 0 ? (
                      <div className="w-full flex items-center justify-center h-64 text-white/30 text-lg">
                        Ask the AI for a recommendation to see movies here!
                      </div>
                    ) : suggestedMovies.map((item, idx) => {
                      const isBookmarked = bookmarkedIds.includes(item.id);
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => item.imdbID ? router.push(`/movies/${item.imdbID}`) : null}
                          className={cn(
                            "flex-none aspect-[2/3] rounded-2xl p-6 flex flex-col justify-between transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_15px_35px_rgba(0,0,0,0.6)] border border-white/10 relative group overflow-hidden",
                            item.imdbID ? "cursor-pointer" : "",
                            item.poster ? "bg-cover bg-center" : `bg-gradient-to-br ${item.gradient}`,
                            isFullMode ? "w-[330px]" : "w-[280px]",
                            idx === 0 && "stagger-card-1",
                            idx === 1 && "stagger-card-2",
                            idx === 2 && "stagger-card-3",
                            idx >= 3 && "animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]"
                          )}
                          style={item.poster ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.4) 100%), url(${item.poster})` } : undefined}
                        >
                          {/* Ambient Glow Backdrop on hover */}
                          <div 
                            className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-2xl -z-10"
                            style={{ background: `radial-gradient(circle, ${item.glow} 0%, transparent 70%)` }}
                          />

                          {/* Card Header: Match Badge and Watchlist Action */}
                          <div className="flex justify-between items-center w-full z-10">
                            <span className="text-[10px] bg-black/40 backdrop-blur-md text-emerald-400 border border-white/10 px-2.5 py-1 rounded-lg font-semibold tracking-wide shadow-sm">
                              {item.match} Match
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookmark(item.id, item.title);
                              }}
                              className={cn(
                                "p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer",
                                isBookmarked 
                                  ? "bg-white text-yellow-500 border-white shadow-[0_0_10px_rgba(234,179,8,0.3)]" 
                                  : "bg-black/40 text-white/60 border-white/10 hover:text-white hover:bg-black/60"
                              )}
                            >
                              <Star className={cn("w-3.5 h-3.5", isBookmarked ? "fill-current animate-[ping_0.3s_ease-in-out_1]" : "")} />
                            </button>
                          </div>

                          {/* Removed Play Trailer Button overlay as requested */}

                          {/* Card Footer: Metadata and Title */}
                          <div className="bg-black/55 backdrop-blur-md rounded-xl p-4 border border-white/10 z-10 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                            <div className="flex gap-1.5 flex-wrap mb-1.5">
                              {item.genres.map(genre => (
                                <span key={genre} className="text-[9px] bg-white/15 text-white/90 px-1.5 py-0.5 rounded-md font-medium tracking-wide">
                                  {genre}
                                </span>
                              ))}
                            </div>
                            <h4 className="text-[15px] font-semibold text-white leading-tight tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-white/50 font-light mt-2">
                              <span>{item.year}</span>
                              <span>•</span>
                              <span>{item.duration}</span>
                              <span>•</span>
                              <div className="flex items-center gap-0.5 text-yellow-400">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                <span>{item.rating}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "py-2 flex flex-col transition-all duration-500 order-last",
                  isFullMode ? "flex-1 min-h-0" : "h-[380px]"
                )}>
                  {/* Chat Messages Log */}
                  <div className={cn(
                    "flex-1 overflow-y-auto scroll-smooth pr-2 flex flex-col mb-4 space-y-4 no-scrollbar",
                    isFullMode ? "w-full pb-4 pt-4" : ""
                  )}>
                    {chatMessages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "flex w-full animate-[fadeInUp_0.3s_ease-out_forwards]",
                          msg.sender === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className="flex flex-col gap-2 max-w-[85%] md:max-w-[75%] lg:max-w-3xl">
                          <div 
                            className={cn(
                              "inline-block flex-none w-fit rounded-3xl px-5 py-3.5 text-[15px] relative overflow-hidden",
                              msg.sender === "user" 
                                ? "bg-white/15 border border-white/10 text-white rounded-br-sm shadow-sm self-end" 
                                : "bg-primary/20 border border-primary/30 text-white rounded-bl-none shadow-md self-start"
                            )}
                          >
                            {msg.sender === "ai" && (
                              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 -z-10"></div>
                            )}
                            <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                          </div>
                          
                          {/* Render Mini Movie Cards if AI message has movies */}
                          {msg.sender === "ai" && msg.movies && msg.movies.length > 0 && (
                            <div className="flex flex-wrap gap-3 mt-1 pl-2">
                              {msg.movies.map((m: any, i: number) => {
                                const movieId = m.imdbID || m.id || i;
                                const isBookmarked = bookmarkedIds.includes(movieId);
                                return (
                                <div key={i} className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-lg w-[260px] hover:bg-white/10 transition-colors">
                                  {m.poster && m.poster !== "N/A" && (
                                    <img 
                                      src={m.poster} 
                                      alt={m.title} 
                                      className="w-[72px] object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                                      onClick={() => m.imdbID ? router.push(`/movies/${m.imdbID}`) : null}
                                    />
                                  )}
                                  <div className="p-3 flex flex-col justify-between flex-1">
                                    <h5 
                                      className="text-sm font-semibold text-white line-clamp-2 cursor-pointer hover:text-primary transition-colors leading-tight"
                                      onClick={() => m.imdbID ? router.push(`/movies/${m.imdbID}`) : null}
                                    >
                                      {m.title}
                                    </h5>
                                    <p className="text-[10px] text-white/50 mt-1 line-clamp-1">{m.genre}</p>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); toggleBookmark(movieId, m.title); }}
                                      className={cn(
                                        "mt-2 text-[11px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all w-full font-medium",
                                        isBookmarked 
                                          ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30" 
                                          : "bg-primary/20 text-primary-foreground hover:bg-primary/40"
                                      )}
                                    >
                                      {isBookmarked ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                      {isBookmarked ? "In Watchlist" : "Watch Later"}
                                    </button>
                                  </div>
                                </div>
                              )})}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Typing Indicator */}
                    {isAiTyping && (
                      <div className="flex animate-[fadeInUp_0.3s_ease-out_forwards] justify-start">
                        <div className="relative overflow-hidden flex items-center gap-1.5 justify-center bg-primary/20 border border-primary/30 rounded-3xl rounded-bl-none px-5 py-3 w-fit shadow-md">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 -z-10"></div>
                          <Film className="w-3.5 h-3.5 text-white/50 animate-pulse mr-1" />
                          <span className="text-white/80 text-[14px] font-medium tracking-wide flex items-center">
                            Curating
                            <span className="flex items-center gap-0.5 ml-1.5 mt-2">
                              <span className="w-1 h-1 rounded-full animate-bounce delay-100 bg-white/80"></span>
                              <span className="w-1 h-1 rounded-full animate-bounce delay-200 bg-white/80"></span>
                              <span className="w-1 h-1 rounded-full animate-bounce delay-300 bg-white/80"></span>
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Glassmorphic Keyboard Shortcut Fuzzy Search Popup */}
      {isFuzzyOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4 bg-black/60 backdrop-blur-md transition-all duration-300">
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={() => setIsFuzzyOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-[#0c0c0e]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] overflow-hidden animate-[fade-in-up_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex items-center border-b border-white/10 px-4 py-3.5 gap-3">
              <Search className="w-5 h-5 text-white/40" />
              <input
                ref={fuzzyInputRef}
                type="text"
                placeholder="Fuzzy search keywords, tags, themes..."
                value={fuzzyQuery}
                onChange={(e) => setFuzzyQuery(e.target.value)}
                onKeyDown={handleFuzzyKeyDown}
                className="w-full bg-transparent border-none outline-none text-white placeholder:text-white/30 text-base"
              />
              <span className="text-xs text-white/40 bg-white/5 border border-white/10 px-2 py-1 rounded">ESC</span>
            </div>

            {/* Results container */}
            <div className="max-h-[300px] overflow-y-auto py-2 custom-scrollbar">
              {fuzzyResults.length > 0 ? (
                fuzzyResults.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={`${item.type}-${item.label}-${idx}`}
                      onClick={() => handleSelectFuzzyItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "flex items-center justify-between px-4 py-2.5 mx-2 rounded-xl transition-all cursor-pointer",
                        isSelected ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {item.type === "Tag" && <Tag className="w-4 h-4 text-purple-400" />}
                        {item.type === "Genre" && <Hash className="w-4 h-4 text-cyan-400" />}
                        {item.type === "Theme" && <Sparkles className="w-4 h-4 text-yellow-400" />}
                        {item.type === "Movie" && <Film className="w-4 h-4 text-emerald-400" />}
                        
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-[10px] text-white/30 tracking-wide uppercase">{item.type}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] text-white/40">
                          <span>Select</span>
                          <CornerDownLeft className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center opacity-50">
                  <Search className="w-8 h-8 text-white/30 mb-2" />
                  <p className="text-sm text-white/70">No results found for "{fuzzyQuery}"</p>
                  <p className="text-xs text-white/40 mt-1">Try searching another genre, theme, or tag.</p>
                </div>
              )}
            </div>

            {/* Footer tips */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-t border-white/5 text-[10px] text-white/30">
              <span>Use ↑↓ keys to navigate, enter to select</span>
              <span>Type wrong spelling? Fuzzy matching works!</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

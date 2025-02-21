import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, ArrowRight, Linkedin, Instagram, Facebook, TrendingUp } from "lucide-react";
import { SiX } from "react-icons/si";
import { Header } from "@/components/ui/header";
import { motion, AnimatePresence } from "framer-motion";
import { Footer } from "@/components/ui/footer"

interface PopularSearch {
  query: string;
  count: number;
}

export default function Landing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Fetch popular searches when component mounts
    fetch("/api/popular-searches")
      .then(res => res.json())
      .then(data => setPopularSearches(data))
      .catch(console.error);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Pass the query as URL parameter
      setLocation(`/chat?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handlePopularSearchClick = (query: string) => {
    setLocation(`/chat?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <h1 className="text-6xl font-extralight mb-12 text-white">
          Find Help Here
        </h1>
        <form onSubmit={handleSearch} className="w-full max-w-2xl">
          <div className="bg-[#1E1E1E] rounded-xl overflow-hidden mb-8">
            <div className="flex items-center p-2 gap-2">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-transparent border-none text-white placeholder:text-gray-500 text-lg focus:ring-0"
              />
              <Button 
                type="button"
                variant="ghost" 
                size="icon"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <div className="h-6 w-px bg-gray-700 mx-1" />
              <Button 
                type="submit"
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Popular Searches Section */}
          {popularSearches.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 text-gray-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Popular searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {popularSearches.map((search, index) => (
                    <motion.div
                      key={search.query}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePopularSearchClick(search.query)}
                        className="bg-[#1E1E1E] hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                      >
                        {search.query}
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-6 mt-8">
            <a href="https://twitter.com/company" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <SiX className="h-6 w-6" />
            </a>
            <a href="https://linkedin.com/company" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Linkedin className="h-6 w-6 stroke-[1.5]" />
            </a>
            <a href="https://instagram.com/company" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Instagram className="h-6 w-6 stroke-[1.5]" />
            </a>
            <a href="https://facebook.com/company" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Facebook className="h-6 w-6 stroke-[1.5]" />
            </a>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
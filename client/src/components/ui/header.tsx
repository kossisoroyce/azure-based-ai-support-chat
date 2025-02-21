import { Plus } from "lucide-react"
import { useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"

interface HeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export function Header({ children, className = "" }: HeaderProps) {
  const [, setLocation] = useLocation()

  const handleNewChat = () => {
    setLocation("/")
  }

  return (
    <header className={`fixed top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-black/50 backdrop-blur-sm ${className}`}>
      <div className="flex items-center gap-2">
        <Bot className="h-8 w-8 text-primary" />
        <span className="text-xl font-semibold text-white">AI Support</span>
      </div>
      {children ? children : (
        <Button 
          onClick={handleNewChat}
          variant="ghost" 
          className="text-white/70 hover:text-white/90 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Chat
        </Button>
      )}
    </header>
  )
}
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { createWebSocket } from "@/lib/socket";
import { Bot, User, Loader2, Paperclip, X, ArrowRight, Check, CheckCheck, ThumbsUp, ThumbsDown, Share, SmilePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/ui/header";
import { Skeleton } from "@/components/ui/skeleton";

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface Message {
  id: number;
  content: string;
  role: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  suggestions?: string[];
  reactions?: Reaction[];
  attachment?: {
    type: string;
    data: string;
  };
}

const QUICK_RESPONSES = [
  "Thank you!",
  "Could you explain that further?",
  "I understand now.",
  "That's helpful.",
  "Can you give me an example?"
];

const AVAILABLE_REACTIONS = ["👍", "👎", "❤️", "😊", "🎉", "🤔"];

const MessageSkeleton = () => (
  <div className="flex justify-start">
    <div className="flex items-start gap-1.5 max-w-[65%]">
      <div className="flex-shrink-0 p-1 rounded-md bg-gray-800/90">
        <Skeleton className="h-3 w-3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-[200px] bg-gray-800/90" />
        <Skeleton className="h-4 w-[160px] bg-gray-800/90" />
        <div className="flex gap-2 mt-1">
          <Skeleton className="h-2 w-12 bg-gray-800/90" />
        </div>
      </div>
    </div>
  </div>
);

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null);
  const [showQuickResponses, setShowQuickResponses] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const socketRef = useRef<ReturnType<typeof createWebSocket>>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      description: "Message copied to clipboard",
      duration: 2000,
    });
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');

    socketRef.current = createWebSocket();

    socketRef.current.socket.addEventListener("open", () => {
      setIsConnecting(false);
      socketRef.current?.send("start_conversation", {
        customerId: "CUST001",
      });

      if (initialQuery) {
        setTimeout(() => {
          socketRef.current?.send("message", {
            content: initialQuery
          });
          setIsLoading(true);
        }, 100);
      }
    });

    socketRef.current.onMessage((data) => {
      switch (data.type) {
        case "conversation_started":
          if (!initialQuery) {
            setMessages(data.payload.messages || []);
          }
          break;
        case "typing":
          setIsTyping(true);
          break;
        case "stop_typing":
          setIsTyping(false);
          break;
        case "message":
          setIsTyping(false);
          setMessages((prev) => [...prev, { ...data.payload.message, status: 'sent' }]);
          setIsLoading(false);
          // Show quick responses when receiving a message from the assistant
          if (data.payload.message.role === "assistant") {
            setShowQuickResponses(true);
          }
          break;
        case "message_status":
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.payload.messageId
                ? { ...msg, status: data.payload.status }
                : msg
            )
          );
          break;
        case "error":
          setIsTyping(false);
          toast({
            variant: "destructive",
            title: "Error",
            description: data.payload.message,
          });
          setIsLoading(false);
          break;
      }
    });

    socketRef.current.onError(() => {
      setIsConnecting(false);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to chat server",
      });
    });

    return () => {
      socketRef.current?.socket.close();
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    // Send typing indicator
    socketRef.current?.send("typing", {});

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.send("stop_typing", {});
    }, 1000);
  };

  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*|application/pdf')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload only images or PDF files",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload files smaller than 5MB",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedFile) || isLoading || isConnecting) return;

    setIsLoading(true);

    let attachment;
    if (selectedFile) {
      const reader = new FileReader();
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        attachment = {
          type: selectedFile.type,
          data: base64Data
        };
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to process file",
        });
        setIsLoading(false);
        return;
      }
    }

    socketRef.current?.send("message", {
      content: input,
      attachment
    });

    setInput("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'thumbsUp':
        toast({ description: "Thanks for the positive feedback!" });
        break;
      case 'thumbsDown':
        toast({ description: "Sorry to hear that. How can we improve?" });
        break;
      case 'share':
        navigator.clipboard.writeText(window.location.href);
        toast({ description: "Chat link copied to clipboard!" });
        break;
      case 'refresh':
        socketRef.current?.send("refresh_conversation", {});
        break;
      default:
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent;
    handleSubmit(syntheticEvent);
  };

  const handleReaction = (messageId: number, emoji: string) => {
    setMessages(prevMessages => prevMessages.map(message => {
      if (message.id === messageId) {
        const reactions = message.reactions || [];
        const existingReaction = reactions.find(r => r.emoji === emoji);

        if (existingReaction) {
          // Remove reaction if user already reacted
          return {
            ...message,
            reactions: reactions.filter(r => r.emoji !== emoji)
          };
        } else {
          // Add new reaction
          return {
            ...message,
            reactions: [...reactions, { emoji, count: 1, users: ['user'] }]
          };
        }
      }
      return message;
    }));
    setShowReactionPicker(null);
  };

  const handleQuickResponse = (response: string) => {
    setInput(response);
    setShowQuickResponses(false);
    // Only send through WebSocket, don't set message locally
    socketRef.current?.send("message", { content: response });
    setIsLoading(true);
  };

  if (isConnecting) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Connecting to chat server...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      <Header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-4 px-4 py-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
          </div>
        </div>
      </Header>

      <div className="h-full flex flex-col max-w-4xl mx-auto p-4 pt-24">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-2">
            {isConnecting ? (
              <>
                <MessageSkeleton />
                <MessageSkeleton />
                <MessageSkeleton />
              </>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-2.5 max-w-[65%] group ${
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 p-1 rounded-md ${
                          message.role === "user"
                            ? "bg-primary/90"
                            : "bg-gray-800/90"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="h-3 w-3 text-white/90" />
                        ) : (
                          <Bot className="h-3 w-3 text-white/90" />
                        )}
                      </div>
                      <div
                        className={`relative px-6 py-4 rounded-lg shadow-sm ${
                          message.role === "user"
                            ? "bg-primary/90 text-white"
                            : "bg-gray-800/90 text-white"
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-snug">{message.content}</div>

                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {message.reactions.map((reaction, index) => (
                              <div
                                key={index}
                                className="flex items-center bg-gray-700/30 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-xs"
                              >
                                <span>{reaction.emoji}</span>
                                <span className="ml-0.5 text-[10px] text-gray-300">{reaction.count}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {message.suggestions.map((suggestion, index) => (
                              <Button
                                key={index}
                                variant="secondary"
                                size="sm"
                                className="rounded-full bg-gray-700/30 hover:bg-gray-600/30 backdrop-blur-sm text-xs py-1 px-2 h-auto min-h-0 transition-colors"
                                onClick={() => handleSuggestionClick(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                          <div className="flex items-center gap-1">
                            <span>{new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                            {message.role === "user" && (
                              <span className="text-primary/70">{getMessageStatusIcon(message.status)}</span>
                            )}
                          </div>
                          {message.role === "assistant" && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 hover:bg-gray-700/30 transition-colors"
                                onClick={() => handleQuickAction('thumbsUp')}
                              >
                                <ThumbsUp className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 hover:bg-gray-700/30 transition-colors"
                                onClick={() => handleQuickAction('thumbsDown')}
                              >
                                <ThumbsDown className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 hover:bg-gray-700/30 transition-colors"
                                onClick={() => setShowReactionPicker(message.id)}
                              >
                                <SmilePlus className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 hover:bg-gray-700/30 transition-colors"
                                onClick={() => handleQuickAction('share')}
                              >
                                <Share className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {showReactionPicker === message.id && (
                          <div className="absolute bottom-full left-0 mb-1 p-1 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg flex gap-1 z-10">
                            {AVAILABLE_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                className="hover:bg-gray-700/30 p-1 rounded-md transition-colors text-sm"
                                onClick={() => handleReaction(message.id, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-start gap-1.5 max-w-[65%]">
                      <div className="flex-shrink-0 p-1 rounded-md bg-gray-800/90">
                        <Bot className="h-3 w-3 text-white/90" />
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-gray-800/90 text-white min-w-[60px]">
                        <div className="flex gap-1">
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="text-primary"
                          >
                            ●
                          </motion.span>
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                            className="text-primary"
                          >
                            ●
                          </motion.span>
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                            className="text-primary"
                          >
                            ●
                          </motion.span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="mt-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {showQuickResponses && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-wrap gap-2 mb-3"
              >
                {QUICK_RESPONSES.map((response, index) => (
                  <Button
                    key={index}
                    variant="secondary"
                    size="sm"
                    className="rounded-full bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm transition-colors"
                    onClick={() => handleQuickResponse(response)}
                  >
                    {response}
                  </Button>
                ))}
              </motion.div>
            )}

            {selectedFile && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 backdrop-blur-sm rounded-xl">
                <Paperclip className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300 truncate flex-1">
                  {selectedFile.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-white transition-colors"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg">
              <div className="flex items-center p-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={() => setShowQuickResponses(!showQuickResponses)}
                >
                  <SmilePlus className="h-5 w-5" />
                </Button>
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask a question..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none text-white placeholder:text-gray-500 text-lg focus:ring-0 h-12"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <div className="h-6 w-px bg-gray-700 mx-1" />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    disabled={isLoading}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <ArrowRight className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
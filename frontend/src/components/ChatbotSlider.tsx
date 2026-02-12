import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles, Mic, Volume2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { ChatMessage } from '@/types';
import { API_ENDPOINTS } from '@/config/api';

interface ChatbotSliderProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatbotSlider({ isOpen, onClose }: ChatbotSliderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your data engineering assistant powered by AI. How can I help you optimize your Snowflake warehouse today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioDialogOpen, setAudioDialogOpen] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.');
      } else {
        alert('Error occurred during speech recognition: ' + event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = initializeSpeechRecognition();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const handlePlayAudio = (text: string) => {
    setCurrentAudio(text);
    setAudioDialogOpen(true);
    setProgress(0);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) {
      // Create speech synthesis
      const utterance = new SpeechSynthesisUtterance(currentAudio);
      utterance.onend = () => {
        setIsPlaying(false);
        setProgress(100);
      };
      
      // Simulate progress
      const duration = currentAudio.length * 50; // rough estimate
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1;
        });
      }, duration / 100);
      
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      } else {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      }
    }
  };

  const handleDialogClose = () => {
    window.speechSynthesis.cancel();
    setAudioDialogOpen(false);
    setIsPlaying(false);
    setProgress(0);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userInput }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.answer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error: ' + (data.message || 'Unknown error'),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat API error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I couldn\'t connect to the AI service. Please make sure the backend is running.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };



  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 z-50 bg-background/30 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      
      {/* Chat Slider - 3/4 width */}
        <div className="fixed right-0 top-0 z-50 h-full w-full md:w-3/4 lg:w-2/3 border-l border-border bg-white dark:bg-background shadow-elevated animate-slide-in-right">
        <div className="flex h-full flex-col">
          {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 md:px-5 py-2.5 md:py-3 bg-[#073155]/5 dark:bg-primary/5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#073155] dark:bg-primary shadow-glow animate-pulse-slow">
                <Sparkles className="h-6 w-6 text-white dark:text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#073155] dark:text-primary">AI Assistant</h2>
                <p className="text-sm text-muted-foreground">Powered by advanced AI</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
            <ScrollArea className="flex-1 p-3 md:p-4" ref={scrollRef}>
              <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 items-start ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    message.role === 'assistant' 
                      ? 'bg-[#073155] dark:bg-primary shadow-glow' 
                      : 'bg-secondary'
                  }`}>
                    {message.role === 'assistant' ? (
                      <Bot className="h-5 w-5 text-white dark:text-primary-foreground" />
                    ) : (
                      <User className="h-5 w-5 text-secondary-foreground" />
                    )}
                  </div>
                  <div className={`rounded-2xl px-5 py-4 max-w-[80%] ${
                    message.role === 'assistant'
                      ? 'bg-muted text-foreground shadow-card'
                      : 'bg-[#073155] dark:bg-primary text-white dark:text-primary-foreground shadow-elevated'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 hover:bg-[#073155]/10 dark:hover:bg-primary/10"
                    onClick={() => handlePlayAudio(message.content)}
                  >
                    <Volume2 className="h-5 w-5 text-[#073155] dark:text-primary" />
                  </Button>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#073155] dark:bg-primary shadow-glow">
                    <Bot className="h-5 w-5 text-white dark:text-primary-foreground" />
                  </div>
                  <div className="rounded-2xl bg-muted px-5 py-4 shadow-card">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#073155] dark:text-primary" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-4 md:p-6 bg-muted/30 dark:bg-muted/30">
            <div className="flex gap-3 w-full">
              <Input
                placeholder="Ask about your data warehouse..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 h-12"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className={`shrink-0 ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : ''}`}
                onClick={handleVoiceInput}
                title={isListening ? 'Recording... Click to stop' : 'Click to speak'}
              >
                <Mic className={`h-5 w-5 ${isListening ? 'text-red-500' : 'text-muted-foreground'}`} />
              </Button>
              <Button onClick={handleSend} disabled={!input.trim() || isLoading} variant="hero" size="icon" className="shrink-0 h-12 w-12 bg-[#073155] dark:bg-primary hover:bg-[#073155]/90 dark:hover:bg-primary/90">
                <Send className="h-5 w-5 text-white dark:text-primary-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Playback Dialog */}
      <Dialog open={audioDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-[#073155] dark:text-primary" />
              Audio Playback
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg max-h-32 overflow-y-auto">
              {currentAudio}
            </div>
            <div className="space-y-2">
              <Slider
                value={[progress]}
                max={100}
                step={1}
                className="w-full"
                disabled
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{Math.round(progress)}%</span>
                <span>Progress</span>
              </div>
            </div>
            <div className="flex justify-center">
              <Button
                onClick={togglePlayPause}
                variant="hero"
                size="lg"
                className="gap-2 bg-[#073155] dark:bg-primary hover:bg-[#073155]/90 dark:hover:bg-primary/90 text-white dark:text-primary-foreground"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-5 w-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Play
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

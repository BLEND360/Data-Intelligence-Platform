import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Database, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  Zap,
  Shield,
  BarChart3,
  Layers,
  Mail,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import heroBg from '@/assets/hero-bg.jpg';
import logo from '@/assets/logo.png';

// Static credentials
const STATIC_EMAIL = 'ritish@blend360.com';
const STATIC_PASSWORD = 'Blend@123$';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Check static credentials
    if (email === STATIC_EMAIL && password === STATIC_PASSWORD) {
      await login(email, password);
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in to your account.',
      });
      navigate('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid credentials',
        description: 'Please use admin@gmail.com / Admin@123',
      });
    }
    
    setIsLoading(false);
  };

  const features = [
    { icon: Sparkles, label: 'AI-Driven Data Understanding', delay: '0s' },
    { icon: TrendingUp, label: 'Data Quality & KPI Intelligence', delay: '0.2s' },
    { icon: Zap, label: 'Smart Insights & Visualization Guidance', delay: '0.4s' },
    { icon: Shield, label: 'Enterprise-Grade Security', delay: '0.6s' },
  ];

  const stats = [
    { icon: BarChart3, value: '100%', label: 'Realtime' },
    { icon: Database, value: 'Live', label: 'Data' },
    { icon: Sparkles, value: 'AI', label: 'Powered' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Hero Section - 3/4 width on desktop */}
      <div className="relative flex-1 lg:w-3/4 min-h-[40vh] lg:min-h-screen overflow-hidden">
        {/* Background Image with 40% opacity */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${heroBg})`,
            opacity: 0.4
          }}
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 gradient-overlay" />
        
        {/* Decorative elements */}
        {/* <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-72 md:w-96 h-72 md:h-96 bg-primary/30 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-56 md:w-72 h-56 md:h-72 bg-accent/25 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 right-1/3 w-48 md:w-64 h-48 md:h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '3s' }} />
        </div> */}

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center h-full px-6 py-12 md:px-12 lg:px-20">
          <div className="max-w-2xl">
            {/* Logo */}
            <div className="flex items-center gap-4 mb-8 md:mb-12 animate-fade-in">
              <img src={logo} alt="DataFlow Logo" className="h-12 md:h-14 w-auto" />
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-4xl font-bold text-white mb-4 md:mb-6 leading-tight animate-slide-up">
              Unlock the Full Intelligence of Your{' '}
              <span className="text-primary">
                Snowflake Data
              </span>
            </h1>
            
            <p className="text-base md:text-lg lg:text-xl text-white/80 mb-8 md:mb-10 leading-relaxed animate-slide-up max-w-2xl" style={{ animationDelay: '0.1s' }}>
              Connect your Snowflake environment and let Snowflake Cortex AI automatically understand, validate, and transform your data into trusted insights, KPIs, and recommendations—without manual effort.
            </p>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-3 mb-8 md:mb-12">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2.5 border border-white/20 animate-fade-in"
                  style={{ animationDelay: feature.delay }}
                >
                  <feature.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-white">{feature.label}</span>
                </div>
              ))}
            </div>

            {/* Stats - hidden on small mobile */}
            <div className="hidden sm:flex gap-8 md:gap-12 pt-6 md:pt-8 border-t border-white/20 animate-fade-in" style={{ animationDelay: '0.8s' }}>
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                    <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs md:text-sm text-white/70">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Login Form - 1/4 width on desktop */}
      <div className="w-full lg:w-1/4 lg:min-w-[400px] flex flex-col bg-background">
        {/* Theme toggle */}
        <div className="flex justify-end p-4 lg:p-6">
          <ThemeToggle />
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12 lg:px-8">
          <div className="w-full max-w-sm space-y-8 animate-fade-in">
            {/* Mobile logo - only shown on mobile */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-glow">
                <Database className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">DataFlow</span>
            </div>

            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-muted-foreground">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12" variant="hero" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>

              {/* Credentials hint */}
              {/* <div className="text-center p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold">Demo Credentials:</span><br />
                  admin@gmail.com / Admin@123
                </p>
              </div> */}
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button className="text-primary hover:underline font-medium">
                Contact admin
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

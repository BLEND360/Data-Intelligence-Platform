import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Sparkles, Settings, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { HistorySlider } from '@/components/HistorySlider';
import { ChatbotSlider } from '@/components/ChatbotSlider';
import { SettingsSlider } from '@/components/SettingsSlider';
import { ConnectionConfigSlider } from '@/components/ConnectionConfigSlider';
import { DomainInsights } from '@/components/DomainInsights';
import { useAuth } from '@/contexts/AuthContext';
import { LoadResult, SnowflakeConfig, DomainReport } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { API_ENDPOINTS } from '@/config/api';

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [history, setHistory] = useState<LoadResult[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnectionOpen, setIsConnectionOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reportHistory, setReportHistory] = useState<DomainReport[]>([]);
  const [apiReport, setApiReport] = useState<DomainReport | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const result = location.state?.result as LoadResult | undefined;
  const providedReport = location.state?.report as DomainReport | undefined;
  
  // Use API report if available, otherwise fall back to providedReport
  const report = apiReport ?? providedReport;

  const handleLoadAnalysis = () => {
    setIsConnectionOpen(true);
  };

  const handleAnalysisStart = () => {
    setIsRunningAnalysis(true);
  };

  // Fetch data from backend API on mount
  useEffect(() => {
    const fetchReportData = async () => {
      setIsFetchingData(true);
      try {
        console.log('Fetching report from API...');
        const response = await fetch(API_ENDPOINTS.CLEAN_REPORT);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const json = await response.json();
        console.log('Received JSON:', json);
        
        // The data field is now a direct object (not a string)
        let parsedData = json.data;
        
        if (!parsedData) {
          console.error('No data field in response');
          throw new Error('No data in response');
        }
        
        console.log('Parsed data:', parsedData);
        
        // Transform insights.key_points from API format to component format
        if (parsedData.insights && parsedData.insights.key_points) {
          const keyPoints = parsedData.insights.key_points;
          console.log('Original key_points:', keyPoints);
          
          // Convert array of objects to array of strings
          if (Array.isArray(keyPoints) && keyPoints.length > 0 && typeof keyPoints[0] === 'object') {
            const transformedKeyPoints: string[] = [];
            
            keyPoints.forEach((kp: any) => {
              if (kp.main_data_domains && Array.isArray(kp.main_data_domains)) {
                transformedKeyPoints.push(`Main domains: ${kp.main_data_domains.slice(0, 3).join(', ')}`);
              }
              if (kp.key_tables && Array.isArray(kp.key_tables)) {
                transformedKeyPoints.push(`Key tables: ${kp.key_tables.slice(0, 5).join(', ')}`);
              }
              if (kp.total_tables !== undefined) {
                transformedKeyPoints.push(`Total tables analyzed: ${kp.total_tables}`);
              }
              if (kp['data_quality_%'] !== undefined) {
                transformedKeyPoints.push(`Data quality score: ${kp['data_quality_%']}%`);
              }
            });
            
            console.log('Transformed key_points:', transformedKeyPoints);
            parsedData.insights.key_points = transformedKeyPoints.length > 0 
              ? transformedKeyPoints 
              : ['Data analysis completed successfully'];
          }
        } else {
          console.log('No insights.key_points found, creating defaults');
          // Ensure insights has proper structure
          parsedData.insights = parsedData.insights || {};
          parsedData.insights.key_points = ['Data analysis completed'];
          parsedData.insights.summary = parsedData.insights.summary || 'Domain analysis complete';
        }
        
        // Ensure all required fields exist with defaults
        parsedData.meta = parsedData.meta || { load_id: 'unknown', generated_at: new Date().toISOString(), schema_analyzed: 'UNKNOWN' };
        parsedData.summary = parsedData.summary || { tables_count: 0, kpis_count: 0, charts_count: 0, quality_score: 0 };
        parsedData.understanding = parsedData.understanding || { total_tables: 0, tables: [], relationships: [] };
        parsedData.kpis = parsedData.kpis || [];
        parsedData.charts = parsedData.charts || [];
        parsedData.data_quality = parsedData.data_quality || { overall_score: 0, issues: [] };
        parsedData.transformations = parsedData.transformations || [];
        
        console.log('Final transformed data:', parsedData);
        
        // Format the report to match DomainReport interface
        const formattedReport: DomainReport = {
          status: 'success',
          data: parsedData
        };
        
        console.log('Setting formatted report:', formattedReport);
        setApiReport(formattedReport);
      } catch (error) {
        console.error('Failed to fetch report data:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        // Continue with fallback data if fetch fails
        setApiReport(null);
      } finally {
        setIsFetchingData(false);
        console.log('Fetch complete, isFetchingData set to false');
      }
    };

    if (isAuthenticated) {
      console.log('User is authenticated, fetching data...');
      fetchReportData();
    } else {
      console.log('User not authenticated, skipping fetch');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (result) {
      // Add to history if not already there
      setHistory(prev => {
        const exists = prev.some(h => h.id === result.id);
        if (!exists) {
          return [result, ...prev];
        }
        return prev;
      });
    }
  }, [result]);



  const handleSelectHistory = (selectedResult: LoadResult) => {
    navigate('/dashboard', { state: { result: selectedResult } });
  };

  const handleSubmit = async (config: SnowflakeConfig) => {
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const result: LoadResult = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      config,
      agentSummary: `Analysis complete for database "${config.dbName}". Your Snowflake instance shows healthy performance metrics with some optimization opportunities. The data warehouse is running efficiently with an average query response time of 2.3 seconds. Total storage utilization is at 67% across 142 tables with 3.2TB of data processed daily.`,
      recommendations: [
        'Consider implementing clustering keys on frequently queried tables to improve scan efficiency',
        'Enable auto-suspend for warehouses with idle time exceeding 10 minutes',
        'Review and optimize TOP_N queries that consume 40% of compute resources',
        'Implement materialized views for complex aggregation queries',
        'Set up query result caching for repetitive analytical workloads',
      ],
      observations: [
        'Peak query activity occurs between 9 AM - 11 AM and 2 PM - 4 PM EST',
        '23 tables have no clustering keys defined despite high query frequency',
        'Warehouse XL-ANALYTICS shows 45% idle time during weekends',
        'Data loading jobs complete 15% faster during off-peak hours',
        'Storage costs have increased 12% month-over-month',
        'User session concurrency peaks at 85 simultaneous connections',
      ],
    };

    setHistory((prev) => [result, ...prev]);
    setIsLoading(false);
    setIsSettingsOpen(false);
    
    // Navigate to dashboard with result
    navigate('/dashboard', { state: { result } });
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Loading Overlay for Analysis */}
      {isRunningAnalysis && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <Card className="shadow-elevated border-border/50 max-w-md w-full mx-4">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#073155] dark:bg-primary shadow-glow mb-6">
                <Loader2 className="h-8 w-8 text-white dark:text-primary-foreground animate-spin" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Running Analysis</h2>
              <p className="text-muted-foreground max-w-md">
                Please wait while we analyze your data warehouse. This may take several minutes...
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Header 
        onHistoryClick={() => setIsHistoryOpen(true)} 
        onAnalysisClick={() => setIsSettingsOpen(true)}
        onLoadAnalysisClick={handleLoadAnalysis}
      />

      <main className="container py-6 md:py-8 px-4 md:px-6">
        <div className="space-y-6 md:space-y-8">
          {/* Welcome section */}
          <div className="animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Welcome back, <span className="text-[#073155] dark:text-primary">Admin</span>
            </h1>
            <p className="text-muted-foreground">
              {isFetchingData ? 'Loading your analysis report...' : (report || result) ? 'View your analysis report below' : 'Connect your Snowflake instance to get AI-powered insights'}
            </p>
          </div>

          {/* Loading State */}
          {isFetchingData && (
            <Card className="shadow-elevated border-border/50 overflow-hidden animate-fade-in w-full">
              <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#073155] dark:bg-primary shadow-glow mb-6">
                  <Loader2 className="h-8 w-8 text-white dark:text-primary-foreground animate-spin" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Loading Report</h2>
                <p className="text-muted-foreground max-w-md">
                  Fetching your latest domain insights from Snowflake...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Domain Insights at top if provided */}
          {!isFetchingData && report && <DomainInsights report={report} />}

          {/* Legacy Results or Empty State */}
          {!isFetchingData && (result ? (
            <ResultsDisplay result={result} />
          ) : !report ? (
            <Card className="shadow-elevated border-border/50 overflow-hidden animate-fade-in w-full" style={{ animationDelay: '0.1s' }}>
              <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#073155] dark:bg-primary shadow-glow mb-6">
                  <FileText className="h-8 w-8 text-white dark:text-primary-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No Analysis Report Yet</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Connect your Snowflake data warehouse to generate AI-powered insights, recommendations, and observations.
                </p>
                <Button variant="hero" size="lg" onClick={() => setIsSettingsOpen(true)} className="gap-2">
                  <Settings className="h-5 w-5" />
                  Connect Snowflake
                </Button>
              </CardContent>
            </Card>
          ) : null)}
        </div>
      </main>

      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-elevated group bg-[#073155] dark:bg-primary hover:bg-[#073155]/90 dark:hover:bg-primary/90"
        variant="hero"
        size="icon"
      >
        <div className="relative">
          <MessageSquare className="h-6 w-6 md:h-7 md:w-7 group-hover:scale-0 transition-transform text-white dark:text-primary-foreground" />
          <Sparkles className="h-6 w-6 md:h-7 md:w-7 absolute inset-0 scale-0 group-hover:scale-100 transition-transform text-white dark:text-primary-foreground" />
        </div>
      </Button>

      {/* Sliders */}
      <HistorySlider
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectLoad={handleSelectHistory}
        reportHistory={reportHistory}
        onSelectReport={(rep) => {
          console.log('Setting selected report from history:', rep);
          setApiReport(rep);
        }}
      />

      <ChatbotSlider
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      <SettingsSlider
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      <ConnectionConfigSlider
        isOpen={isConnectionOpen}
        onClose={() => setIsConnectionOpen(false)}
        onAnalysisStart={handleAnalysisStart}
      />
    </div>
  );
}

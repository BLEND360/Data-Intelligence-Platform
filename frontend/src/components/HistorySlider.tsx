import { X, Clock, Database, Calendar, Server, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadResult, DomainReport } from '@/types';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { API_ENDPOINTS, getApiUrl } from '@/config/api';

interface HistorySliderProps {
  isOpen: boolean;
  onClose: () => void;
  history: LoadResult[];
  onSelectLoad: (result: LoadResult) => void;
  reportHistory?: DomainReport[];
  onSelectReport?: (report: DomainReport) => void;
}

interface HistoryItem {
  load_id: string;
  load_datetime: string;
}

export function HistorySlider({ isOpen, onClose, history, onSelectLoad, reportHistory = [], onSelectReport }: HistorySliderProps) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isOpen) return;
      
      setIsLoading(true);
      try {
        console.log('Fetching history from API...');
        const response = await fetch(API_ENDPOINTS.CLEAN_REPORT_RUNS);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('History data received:', data);
        
        // Assuming API returns array of {load_id, load_datetime}
        setHistoryItems(data);
      } catch (error) {
        console.error('Failed to fetch history:', error);
        setHistoryItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen]);

  const handleViewReport = async (loadId: string) => {
    try {
      console.log('Fetching report for load_id:', loadId);
      const response = await fetch(getApiUrl(`/clean-report/${loadId}`));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const json = await response.json();
      const parsedData = json.data;
      
      // Transform insights.key_points
      if (parsedData.insights && parsedData.insights.key_points) {
        const keyPoints = parsedData.insights.key_points;
        
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
          
          parsedData.insights.key_points = transformedKeyPoints.length > 0 
            ? transformedKeyPoints 
            : ['Data analysis completed successfully'];
        }
      }
      
      const report: DomainReport = {
        status: 'success',
        data: parsedData
      };
      
      if (onSelectReport) {
        onSelectReport(report);
        onClose();
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      
      {/* Slider */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border bg-white dark:bg-background shadow-elevated animate-slide-in-right">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 md:px-5 py-2.5 md:py-3 bg-[#073155]/5 dark:bg-primary/5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#073155] dark:bg-primary shadow-glow">
                <Clock className="h-6 w-6 text-white dark:text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Analysis History</h2>
                <p className="text-sm text-muted-foreground">Your previous results</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-3 md:p-4 space-y-6">
            {/* Domain Reports from API */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Domain Reports</div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">Loading history...</p>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                    <Database className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground/70 max-w-xs">No analysis history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((item, index) => (
                    <div
                      key={item.load_id}
                      className="w-full rounded-xl border border-border bg-card p-4 transition-all hover:shadow-card hover:border-primary/30 group animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Server className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                              Analysis Report
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.load_datetime).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleViewReport(item.load_id)}>
                          View
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(item.load_datetime), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(item.load_datetime), 'HH:mm')}
                        </span>
                        <span className="font-mono text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-md">
                          {item.load_id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}

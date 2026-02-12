import { useState } from 'react';
import { X, Upload, Database, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { API_ENDPOINTS } from '@/config/api';

interface ConnectionConfigSliderProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisStart: () => void;
}

interface SnowflakeConfig {
  account: string;
  user: string;
  role: string;
  warehouse: string;
  database: string;
  schema: string;
  privateKeyFile: File | null;
  privateKeyPassphrase: string;
}

export function ConnectionConfigSlider({
  isOpen,
  onClose,
  onAnalysisStart,
}: ConnectionConfigSliderProps) {
  const [step, setStep] = useState<'config' | 'tables'>('config');
  const [config, setConfig] = useState<SnowflakeConfig>({
    account: '',
    user: '',
    role: '',
    warehouse: '',
    database: '',
    schema: '',
    privateKeyFile: null,
    privateKeyPassphrase: '',
  });
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.pem')) {
        setError('Please upload a .pem file');
        return;
      }
      setConfig({ ...config, privateKeyFile: file });
      setError('');
    }
  };

  const handleFetchTables = async () => {
    if (!config.account || !config.user || !config.database || !config.schema || !config.privateKeyFile) {
      setError('Please fill in all required fields and upload the private key file');
      return;
    }

    setIsLoadingTables(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('account', config.account);
      formData.append('user', config.user);
      formData.append('role', config.role);
      formData.append('warehouse', config.warehouse);
      formData.append('database', config.database);
      formData.append('schema', config.schema);
      formData.append('private_key_file', config.privateKeyFile);
      formData.append('private_key_passphrase', config.privateKeyPassphrase);

      const response = await fetch(API_ENDPOINTS.LIST_TABLES, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }

      const data = await response.json();
      setTables(data.tables || []);
      setStep('tables');
    } catch (err) {
      setError('Failed to connect to Snowflake. Please check your credentials.');
      console.error(err);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (selectedTables.size === 0) {
      setError('Please select at least one table');
      return;
    }

    setIsRunningAnalysis(true);
    setError('');
    onAnalysisStart();

    try {
      const formData = new FormData();
      formData.append('account', config.account);
      formData.append('user', config.user);
      formData.append('role', config.role);
      formData.append('warehouse', config.warehouse);
      formData.append('database', config.database);
      formData.append('schema', config.schema);
      formData.append('private_key_file', config.privateKeyFile!);
      formData.append('private_key_passphrase', config.privateKeyPassphrase);
      formData.append('tables', JSON.stringify(Array.from(selectedTables)));

      const response = await fetch(API_ENDPOINTS.RUN_ANALYSIS, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      console.log('Analysis completed:', result);
      
      // Close slider and refresh dashboard
      handleClose();
      window.location.reload();
    } catch (err) {
      setError('Failed to run analysis. Please try again.');
      console.error(err);
      setIsRunningAnalysis(false);
    }
  };

  const toggleTable = (table: string) => {
    const newSelected = new Set(selectedTables);
    if (newSelected.has(table)) {
      newSelected.delete(table);
    } else {
      newSelected.add(table);
    }
    setSelectedTables(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTables.size === tables.length) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(tables));
    }
  };

  const handleClose = () => {
    setStep('config');
    setConfig({
      account: '',
      user: '',
      role: '',
      warehouse: '',
      database: '',
      schema: '',
      privateKeyFile: null,
      privateKeyPassphrase: '',
    });
    setTables([]);
    setSelectedTables(new Set());
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Slider */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white dark:bg-background shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-[#073155] dark:text-primary" />
            <h2 className="text-xl font-semibold">
              {step === 'config' ? 'Snowflake Configuration' : 'Select Tables'}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5 text-[#073155] dark:text-primary" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'config' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account">Snowflake Account *</Label>
                <Input
                  id="account"
                  placeholder="WB19670-C2GPARTNERS"
                  value={config.account}
                  onChange={(e) => setConfig({ ...config, account: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user">User *</Label>
                <Input
                  id="user"
                  placeholder="CLARITY_SERVICE_ACCOUNT"
                  value={config.user}
                  onChange={(e) => setConfig({ ...config, user: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  placeholder="SNOW_SHERIFF"
                  value={config.role}
                  onChange={(e) => setConfig({ ...config, role: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse *</Label>
                <Input
                  id="warehouse"
                  placeholder="POWERHOUSE"
                  value={config.warehouse}
                  onChange={(e) => setConfig({ ...config, warehouse: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="database">Database *</Label>
                <Input
                  id="database"
                  placeholder="CLARITY_DB"
                  value={config.database}
                  onChange={(e) => setConfig({ ...config, database: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schema">Schema *</Label>
                <Input
                  id="schema"
                  placeholder="RETAIL"
                  value={config.schema}
                  onChange={(e) => setConfig({ ...config, schema: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="privateKey">Private Key File (.pem) *</Label>
                <div className="relative">
                  <Input
                    id="privateKey"
                    type="file"
                    accept=".pem"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                  <Upload className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#073155] dark:text-muted-foreground pointer-events-none" />
                </div>
                {config.privateKeyFile && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {config.privateKeyFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="passphrase">Private Key Passphrase (Optional)</Label>
                <Input
                  id="passphrase"
                  type="password"
                  placeholder="Leave blank if unencrypted"
                  value={config.privateKeyPassphrase}
                  onChange={(e) =>
                    setConfig({ ...config, privateKeyPassphrase: e.target.value })
                  }
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'tables' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <Label className="text-base font-medium">Select All Tables</Label>
                <Checkbox
                  checked={selectedTables.size === tables.length && tables.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </div>

              <div className="space-y-2">
                {tables.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No tables found in the specified schema
                  </p>
                ) : (
                  tables.map((table) => (
                    <Card
                      key={table}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedTables.has(table) ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => toggleTable(table)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <Database className="h-4 w-4 text-[#073155] dark:text-muted-foreground" />
                          <span className="font-medium">{table}</span>
                        </div>
                        <Checkbox
                          checked={selectedTables.has(table)}
                          onCheckedChange={() => toggleTable(table)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/20">
          {step === 'config' ? (
            <Button
              onClick={handleFetchTables}
              disabled={isLoadingTables}
              className="w-full"
              size="lg"
            >
              {isLoadingTables ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white dark:text-primary-foreground" />
                  Connecting...
                </>
              ) : (
                'Connect & Fetch Tables'
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground text-center">
                {selectedTables.size} of {tables.length} tables selected
              </div>
              <Button
                onClick={handleRunAnalysis}
                disabled={isRunningAnalysis || selectedTables.size === 0}
                className="w-full"
                size="lg"
              >
                {isRunningAnalysis ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-white dark:text-primary-foreground" />
                    Running Analysis...
                  </>
                ) : (
                  'Run Analysis'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

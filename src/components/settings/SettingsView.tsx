import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { generateUUID } from '../../lib/utils';
import {
  Settings,
  Store,
  Receipt,
  Percent,
  Database,
  Save,
  CheckCircle2,
  RefreshCw,
  Download,
  Cloud,
  CloudCheck,
  CloudUpload,
  CloudDownload,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  Code2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
  getSupabase,
} from '../../lib/supabase';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    addToast,
    resetToDemoData,
    isSupabaseConfigured,
    syncToCloud,
    loadFromCloud,
    products,
    customers,
    contracts,
    sales,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'supabase' | 'backup'>('supabase');
  const [formData, setFormData] = useState({ ...settings });

  // Supabase connection state
  const creds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(creds.url || '');
  const [supabaseKey, setSupabaseKey] = useState(creds.key || '');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tablesFound?: boolean;
  } | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [testInsertStatus, setTestInsertStatus] = useState<string | null>(null);
  const [isTestInserting, setIsTestInserting] = useState(false);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const handleTestSupabaseInsertClick = async () => {
    setIsTestInserting(true);
    setTestInsertStatus(null);
    const supabase = getSupabase();
    if (!supabase) {
      setTestInsertStatus('ERROR - Supabase client is null or not configured');
      setIsTestInserting(false);
      return;
    }
    try {
      const testCustId = generateUUID();
      let payload: any = {
        id: testCustId,
        customer_code: 'TST-' + Math.floor(1000 + Math.random() * 9000),
        full_name: 'Database Test Customer',
        father_name: 'Test Father',
        phone: '03001234567',
        address: 'Main Market, Burewala',
        city: 'Burewala',
        cnic: '36104-1234567-1',
        notes: 'Supabase connection verification test',
        status: 'active',
        created_at: new Date().toISOString(),
      };
      console.log('TEST SUPABASE CONNECTION: Inserting test customer into public.customers', payload);
      let { data, error } = await supabase.from('customers').insert(payload).select();
      console.log('TEST SUPABASE CONNECTION: response data:', data, 'error:', error);

      if (error && (error.code === '22P02' || error.message?.toLowerCase().includes('uuid'))) {
        delete payload.id;
        const retryRes = await supabase.from('customers').insert(payload).select();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error) {
        if (error.code === '42501' || error.message?.toLowerCase().includes('row-level security')) {
          setTestInsertStatus(`RLS ERROR (42501) - Row Level Security policy missing in Supabase. Please run the SQL schema in Supabase SQL Editor to allow saving.`);
        } else {
          setTestInsertStatus(`ERROR - ${error.message} (Code: ${error.code || 'UNKNOWN'})`);
        }
      } else {
        // Clean up dummy test row so user database stays clean
        try {
          await supabase.from('customers').delete().eq('customer_code', payload.customer_code);
        } catch {
          // Ignore cleanup error
        }
        setTestInsertStatus('SUCCESS - Supabase connection & write verified successfully!');
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('TEST SUPABASE CONNECTION Exception:', err);
      setTestInsertStatus(`ERROR - ${msg}`);
    } finally {
      setIsTestInserting(false);
    }
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    addToast('success', 'Store settings updated successfully.');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
      setTestResult(res);
      if (res.success) {
        addToast(
          res.tablesFound ? 'success' : 'warning',
          res.message,
          'Supabase Connection'
        );
      } else {
        addToast('error', res.message, 'Supabase Connection');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: msg });
      addToast('error', msg, 'Connection Test Failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSupabaseCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      addToast('warning', 'Please provide both Supabase Project URL and Anon Key.');
      return;
    }

    if (!supabaseUrl.startsWith('https://')) {
      addToast('error', 'URL must begin with https:// (e.g., https://your-project.supabase.co)');
      return;
    }

    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    addToast('success', 'Supabase credentials saved to system!');

    // Automatically test connection
    await handleTestConnection();
  };

  const handleDisconnectSupabase = () => {
    if (confirm('Disconnect from Supabase? The app will operate in local offline mode.')) {
      clearSupabaseCredentials();
      setSupabaseUrl('');
      setSupabaseKey('');
      setTestResult(null);
      addToast('info', 'Supabase disconnected. Using local storage.', 'Offline Mode');
    }
  };

  const handlePushToCloud = async () => {
    setIsSyncing(true);
    try {
      await syncToCloud();
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (
      confirm(
        'Download and replace local records with data from Supabase? Existing local records will be updated with cloud data.'
      )
    ) {
      setIsPulling(true);
      try {
        await loadFromCloud();
      } finally {
        setIsPulling(false);
      }
    }
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    addToast('success', 'Complete SQL schema copied to clipboard! Paste it into Supabase SQL Editor.');
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  const handleExportData = () => {
    const rawData = {
      timestamp: new Date().toISOString(),
      shop_name: settings.shop_name,
      products,
      customers,
      contracts,
      sales,
    };
    const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zohaib_dogar_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    addToast('success', 'Backup JSON downloaded successfully.');
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Top Header Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            System Configuration & Database
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage Supabase PostgreSQL cloud connection, store profile, and installment rules.
          </p>
        </div>

        {/* Cloud Status Badge */}
        <div className="flex items-center gap-2">
          {isSupabaseConfigured ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <CloudCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Supabase Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <Database className="w-3.5 h-3.5" />
              <span>Local Offline Mode</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'supabase'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Supabase Database</span>
          {isSupabaseConfigured && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'general'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Store & Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'backup'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Backups & Reset</span>
        </button>
      </div>

      {/* TAB 1: SUPABASE DATABASE CONNECTION */}
      {activeTab === 'supabase' && (
        <div className="space-y-6">
          {/* Main Credentials Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Cloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Supabase PostgreSQL Cloud Connection</span>
              </div>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-semibold"
              >
                <span>Open Supabase Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Connect <strong>Zohaib Dogar Electronics</strong> directly to your Supabase PostgreSQL cloud
              database to securely store products, customer installments, contracts, and daily sales in the cloud.
            </p>

            <form onSubmit={handleSaveSupabaseCredentials} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://your-project-id.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Found under: Project Settings &rarr; API &rarr; Project URL
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Supabase Anon Public API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Found under: Project Settings &rarr; API &rarr; Project API keys &rarr; <code>anon public</code>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95 text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Connect</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 text-xs transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin text-indigo-600' : ''}`} />
                  <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
                </button>

                {isSupabaseConfigured && (
                  <button
                    type="button"
                    onClick={handleDisconnectSupabase}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-800 text-xs transition-all"
                  >
                    <span>Disconnect Cloud</span>
                  </button>
                )}
              </div>

              {/* TEST SUPABASE CONNECTION BUTTON */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={handleTestSupabaseInsertClick}
                  disabled={!isSupabaseConfigured || isTestInserting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50"
                >
                  <Database className={`w-4 h-4 ${isTestInserting ? 'animate-spin' : ''}`} />
                  <span>{isTestInserting ? 'Testing Insert...' : 'TEST SUPABASE CONNECTION'}</span>
                </button>
                {!isSupabaseConfigured && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 block font-medium">
                    Please configure and save Supabase URL and Key above first to enable test connection.
                  </span>
                )}
                {testInsertStatus && (
                  <div className={`p-3 rounded-xl text-xs font-mono font-bold ${
                    testInsertStatus.startsWith('SUCCESS')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200'
                  }`}>
                    {testInsertStatus}
                  </div>
                )}
              </div>
            </form>

            {/* Test result display */}
            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed transition-all ${
                  testResult.success
                    ? testResult.tablesFound
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {testResult.success ? (
                    testResult.tablesFound ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    )
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {testResult.success
                        ? testResult.tablesFound
                          ? 'Connection Succeeded'
                          : 'Connected (Setup Required)'
                        : 'Connection Failed'}
                    </span>
                    <p className="mt-0.5 text-xs opacity-90">{testResult.message}</p>
                    {testResult.success && !testResult.tablesFound && (
                      <button
                        type="button"
                        onClick={handleCopySchema}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy SQL Schema Now</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cloud Synchronization Hub */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Cloud Synchronization Hub</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Synchronize current shop inventory, customers, installment contracts, and receipts with Supabase cloud.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <CloudUpload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Push Local Data to Supabase</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Upload all currently stored products ({products.length}), customers ({customers.length}), sales ({sales.length}), and contracts ({contracts.length}) to your Supabase tables.
                </p>
                <button
                  type="button"
                  onClick={handlePushToCloud}
                  disabled={!isSupabaseConfigured || isSyncing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs disabled:opacity-50 transition-all"
                >
                  <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isSyncing ? 'Pushing Data...' : 'Push All Records to Cloud'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <CloudDownload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Pull Latest Data from Supabase</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Fetch records already stored in Supabase PostgreSQL tables and refresh the app state.
                </p>
                <button
                  type="button"
                  onClick={handlePullFromCloud}
                  disabled={!isSupabaseConfigured || isPulling}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 transition-all"
                >
                  <CloudDownload className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                  <span>{isPulling ? 'Pulling Data...' : 'Pull Records from Cloud'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Setup Instructions & SQL Schema Script */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>3-Step Supabase Database Setup Guide</span>
              </div>
              <button
                type="button"
                onClick={handleCopySchema}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSchema ? 'Copied!' : 'Copy SQL Schema'}</span>
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Create a free project at{' '}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-bold underline"
                  >
                    supabase.com
                  </a>{' '}
                  (takes under 1 minute).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  In your Supabase project dashboard, open <strong>SQL Editor</strong>, click <strong>New query</strong>, click the <strong>Copy SQL Schema</strong> button above, paste the SQL, and press <strong>Run</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Go to <strong>Project Settings &rarr; API</strong>, copy your <strong>Project URL</strong> and <strong>anon public API key</strong>, paste them into the form above, and click <strong>Save & Connect</strong>!
                </p>
              </div>
            </div>

            {/* Collapsible Schema Preview */}
            <details className="mt-3 group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 overflow-hidden">
              <summary className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800">
                <span>View Complete PostgreSQL DDL Script</span>
                <span className="text-[11px] text-indigo-600 group-open:rotate-90 transition-transform">
                  &rarr;
                </span>
              </summary>
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-200 font-mono text-[11px] max-h-60 overflow-y-auto leading-relaxed">
                <pre>{SUPABASE_SQL_SCHEMA}</pre>
              </div>
            </details>
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL STORE & POS SETTINGS */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="space-y-6 text-xs">
          {/* Shop Profile */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Store className="w-4 h-4 text-indigo-600" />
              <span>Store Profile & Invoice Header</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Shop / Business Name</label>
                <input
                  type="text"
                  value={formData.shop_name}
                  onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Tagline / Slogan</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Primary Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Alternate Phone</label>
                <input
                  type="text"
                  value={formData.alternate_phone || ''}
                  onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">Official Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">Shop Physical Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Installment Rules */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Percent className="w-4 h-4 text-indigo-600" />
              <span>Installment (Qist) Pricing & Penalty Rules</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Default Markup (%)</label>
                <input
                  type="number"
                  value={formData.default_installment_markup_percentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_installment_markup_percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Default Down Payment (%)</label>
                <input
                  type="number"
                  value={formData.default_down_payment_percentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_down_payment_percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Late Penalty Fee (Rs. / Month)</label>
                <input
                  type="number"
                  value={formData.late_penalty_per_month}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      late_penalty_per_month: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Contract Terms & Agreement Clauses (Printed on Qist Contract)
              </label>
              <textarea
                rows={4}
                value={formData.installment_terms}
                onChange={(e) => setFormData({ ...formData, installment_terms: e.target.value })}
                className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-sans text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* Invoice Footer Notes */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <span>Cash POS Receipt Footer & Return Policy</span>
            </div>

            <div>
              <textarea
                rows={3}
                value={formData.invoice_footer_note}
                onChange={(e) => setFormData({ ...formData, invoice_footer_note: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-sans text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: BACKUPS & DEMO DATA RESET */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Database className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Local Backup & Data Operations</span>
            </div>
            <p className="text-xs text-slate-500">
              Download complete local JSON snapshot of your products, sales, customers, and contracts, or restore default sample records.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportData}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export System Backup (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset to initial sample demo data? Any new transactions will be reset.')) {
                    resetToDemoData();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset to Sample Demo Records</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

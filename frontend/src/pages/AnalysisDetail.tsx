import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ShieldAlert, 
  BarChart3, 
  MessageSquareCode, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Terminal, 
  Send, 
  FileCode2, 
  BookOpen, 
  Code
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import { Analysis, Repository, Issue, ChatMessage } from '../types';

export const AnalysisDetail: React.FC = () => {
  const { id: repoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab states
  const activeTab = searchParams.get('tab') || 'summary';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab, analysisId: searchParams.get('analysisId') || '' });
  };

  const [repo, setRepo] = useState<Repository | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Issues filters
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Generator states
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genType, setGenType] = useState<'tests' | 'docs' | null>(null);

  const loadLocalData = () => {
    try {
      const storedRepos = localStorage.getItem('auditor_repositories');
      const repositories = storedRepos ? JSON.parse(storedRepos) : [];
      const foundRepo = repositories.find((r: any) => r.id === parseInt(repoId || '0'));

      if (!foundRepo) {
        navigate('/dashboard');
        return;
      }

      setRepo(foundRepo);
      const runs = foundRepo.analyses || [];
      setAnalyses(runs);

      if (runs.length > 0) {
        const queryAnalysisId = searchParams.get('analysisId');
        const activeRun = queryAnalysisId 
          ? runs.find((a: Analysis) => a.id === parseInt(queryAnalysisId)) || runs[0]
          : runs[0];
        
        setSelectedAnalysis(activeRun);
        setIssues(activeRun.issues || []);

        // Load chat logs locally
        const storedChats = localStorage.getItem(`auditor_conversations_${repoId}`);
        setChatMessages(storedChats ? JSON.parse(storedChats) : []);
      }
    } catch (err) {
      console.error("Failed to load local repository audits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocalData();
  }, [repoId, searchParams.get('analysisId')]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleRunNewAnalysis = async () => {
    if (!repo) return;
    setLoading(true);

    const storedSettings = localStorage.getItem('auditor_settings');
    const settings = storedSettings ? JSON.parse(storedSettings) : {};
    const api_key = settings.gemini_api_key;

    if (!api_key) {
      alert("Google Gemini API Key is not configured. Please enter it in Settings first.");
      setLoading(false);
      return;
    }

    const newAnalysisId = Date.now();
    const newAnalysis: Analysis = {
      id: newAnalysisId,
      repo_id: repo.id,
      status: 'analyzing',
      branch: repo.default_branch || 'main',
      commit_hash: null,
      overall_score: 0,
      security_score: 0,
      performance_score: 0,
      maintainability_score: 0,
      documentation_score: 0,
      testing_score: 0,
      architecture_score: 0,
      executive_summary: null,
      strengths: [],
      weaknesses: [],
      refactoring_suggestions: [],
      complexity_data: null,
      issues: [],
      created_at: new Date().toISOString(),
      completed_at: null,
      error_message: null
    };

    // Update locally as analyzing
    const storedRepos = localStorage.getItem('auditor_repositories');
    const repositories = storedRepos ? JSON.parse(storedRepos) : [];
    const updated = repositories.map((r: any) => {
      if (r.id === repo.id) {
        return {
          ...r,
          analyses: [newAnalysis, ...(r.analyses || [])]
        };
      }
      return r;
    });
    localStorage.setItem('auditor_repositories', JSON.stringify(updated));
    setSearchParams({ tab: activeTab, analysisId: newAnalysisId.toString() });

    // Call stateless audit in background
    api.post('/analyze', {
      url: repo.url,
      branch: repo.default_branch || 'main',
      gemini_api_key: api_key,
      gemini_model: settings.gemini_model || 'gemini-2.5-flash',
      github_pat: settings.github_pat || null,
      custom_system_prompt: settings.custom_system_prompt || null
    }).then(res => {
      const currentStored = localStorage.getItem('auditor_repositories');
      const list = currentStored ? JSON.parse(currentStored) : [];
      const done = list.map((r: any) => {
        if (r.id === repo.id) {
          const updatedAnalyses = r.analyses.map((a: any) => {
            if (a.id === newAnalysisId) {
              return {
                ...a,
                ...res.data,
                status: 'completed',
                completed_at: new Date().toISOString()
              };
            }
            return a;
          });
          return { ...r, current_commit: res.data.commit_hash, analyses: updatedAnalyses };
        }
        return r;
      });
      localStorage.setItem('auditor_repositories', JSON.stringify(done));
      loadLocalData();
    }).catch(err => {
      const currentStored = localStorage.getItem('auditor_repositories');
      const list = currentStored ? JSON.parse(currentStored) : [];
      const fail = list.map((r: any) => {
        if (r.id === repo.id) {
          const updatedAnalyses = r.analyses.map((a: any) => {
            if (a.id === newAnalysisId) {
              return {
                ...a,
                status: 'failed',
                error_message: err.response?.data?.detail || "Stateless re-audit request timed out."
              };
            }
            return a;
          });
          return { ...r, analyses: updatedAnalyses };
        }
        return r;
      });
      localStorage.setItem('auditor_repositories', JSON.stringify(fail));
      loadLocalData();
    });
  };

  // Reports downloader using stateless generate POST
  const handleDownloadReport = async (format: string) => {
    if (!selectedAnalysis || !repo) return;
    try {
      const response = await api.post(`/reports/generate`, {
        format: format,
        repo_name: repo.name,
        analysis: selectedAnalysis,
        issues: issues
      }, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `code_review_${repo.name}_${selectedAnalysis.id}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error("Report download failed:", err);
      alert("Failed to download report. Ensure backend is running.");
    }
  };

  // Send Chat message using stateless conversation API
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !repo || !selectedAnalysis) return;

    const storedSettings = localStorage.getItem('auditor_settings');
    const settings = storedSettings ? JSON.parse(storedSettings) : {};
    const api_key = settings.gemini_api_key;

    if (!api_key) {
      alert("Google Gemini API Key is not configured. Please enter it in Settings first.");
      return;
    }

    const userText = chatInput;
    setChatInput('');
    setChatLoading(true);
    
    const dummyUserMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: userText,
      created_at: new Date().toISOString()
    };
    const updatedMessages = [...chatMessages, dummyUserMsg];
    setChatMessages(updatedMessages);
    localStorage.setItem(`auditor_conversations_${repoId}`, JSON.stringify(updatedMessages));

    try {
      // Map chat messages to role model API format
      const apiMessages = updatedMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content
      }));

      const summaryContext = (
        `Overall health score: ${selectedAnalysis.overall_score}/100\n` +
        `Executive Summary: ${selectedAnalysis.executive_summary || ''}\n` +
        `Strengths: ${(selectedAnalysis.strengths || []).join(', ')}\n` +
        `Weaknesses: ${(selectedAnalysis.weaknesses || []).join(', ')}\n` +
        `Refactoring: ${(selectedAnalysis.refactoring_suggestions || []).join(', ')}`
      );

      const res = await api.post('/chat', {
        messages: apiMessages,
        repo_name: repo.name,
        repo_url: repo.url,
        analysis_summary: summaryContext,
        gemini_api_key: api_key,
        gemini_model: settings.gemini_model || 'gemini-2.5-flash'
      });

      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.data.content,
        created_at: new Date().toISOString()
      };
      
      const savedMessages = [...updatedMessages, assistantMsg];
      setChatMessages(savedMessages);
      localStorage.setItem(`auditor_conversations_${repoId}`, JSON.stringify(savedMessages));
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: Date.now() + 2,
        role: 'assistant',
        content: `Error: ${err.response?.data?.detail || "Failed to communicate with AI chat service."}`,
        created_at: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // Code Generators helper using stateless endpoints
  const handleGenerate = async (type: 'tests' | 'docs') => {
    if (!repo || !selectedAnalysis) return;
    setGenType(type);
    setGenResult(null);
    setGenLoading(true);

    const storedSettings = localStorage.getItem('auditor_settings');
    const settings = storedSettings ? JSON.parse(storedSettings) : {};
    const api_key = settings.gemini_api_key;

    if (!api_key) {
      setGenResult("Failed to generate: Google Gemini API Key is not configured in Settings.");
      setGenLoading(false);
      return;
    }

    try {
      const summaryContext = selectedAnalysis.executive_summary || '';
      const complexMethods = selectedAnalysis.complexity_data?.most_complex_methods || [];

      const res = await api.post(`/generate/${type}`, {
        repo_name: repo.name,
        analysis_summary: summaryContext,
        most_complex_methods: complexMethods,
        gemini_api_key: api_key,
        gemini_model: settings.gemini_model || 'gemini-2.5-flash'
      });
      setGenResult(res.data.content);
    } catch (err: any) {
      setGenResult(`Failed to generate: ${err.response?.data?.detail || "Gemini SDK returned error."}`);
    } finally {
      setGenLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm">Parsing audit summaries...</p>
      </div>
    );
  }

  if (!repo || !selectedAnalysis) {
    return (
      <div className="py-20 text-center glass-panel rounded-xl">
        <p className="text-gray-400">Analysis report index not found.</p>
      </div>
    );
  }

  const isRunning = selectedAnalysis.status === 'pending' || selectedAnalysis.status === 'cloning' || selectedAnalysis.status === 'analyzing';
  const isFailed = selectedAnalysis.status === 'failed';

  // Filters mapping
  const filteredIssues = issues.filter(i => {
    const sevMatch = filterSeverity === 'all' || i.severity === filterSeverity;
    const catMatch = filterCategory === 'all' || i.category === filterCategory;
    return sevMatch && catMatch;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-450 border-emerald-500/20 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
    return 'text-red-400 border-red-500/20 bg-red-500/10';
  };

  const getComplexityDistribution = () => {
    if (!selectedAnalysis.complexity_data) return [];
    const dist = selectedAnalysis.complexity_data.mi_distribution;
    if (!dist) return [];
    return [
      { name: 'A (High: 80-100)', value: dist.A, fill: '#10b981' },
      { name: 'B (Medium: 50-79)', value: dist.B, fill: '#f59e0b' },
      { name: 'C (Low: 0-49)', value: dist.C, fill: '#ef4444' }
    ].filter(item => item.value > 0);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-glass-border/40 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-extrabold text-white leading-none">{repo.name}</h1>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              selectedAnalysis.status === 'completed' ? 'bg-emerald-500/15 text-emerald-450' :
              selectedAnalysis.status === 'failed' ? 'bg-red-500/15 text-red-400' :
              'bg-amber-500/15 text-amber-400 animate-pulse'
            }`}>
              {selectedAnalysis.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
               selectedAnalysis.status === 'failed' ? <AlertCircle className="w-3 h-3" /> :
               <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {selectedAnalysis.status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-550 truncate max-w-xl">{repo.url}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-450">
            <span>Branch: <code className="bg-slate-900 border border-glass-border px-1.5 py-0.5 rounded">{selectedAnalysis.branch}</code></span>
            {selectedAnalysis.commit_hash && (
              <span>Commit: <code className="bg-slate-900 border border-glass-border px-1.5 py-0.5 rounded">{selectedAnalysis.commit_hash.substring(0, 7)}</code></span>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Analysis History Run selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-semibold font-mono">Run:</label>
            <select
              value={selectedAnalysis.id}
              onChange={(e) => setSearchParams({ tab: activeTab, analysisId: e.target.value })}
              className="bg-slate-900 border border-glass-border text-gray-300 rounded-lg text-xs py-1.5 px-3 outline-none"
            >
              {analyses.map(run => (
                <option key={run.id} value={run.id}>
                  {new Date(run.created_at).toLocaleDateString()} ({run.status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunNewAnalysis}
            disabled={isRunning}
            className="px-3.5 py-1.5 rounded-lg bg-glass-bg hover:bg-glass-hover border border-glass-border text-gray-300 text-xs hover:text-white flex items-center gap-1.5 disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-audit
          </button>
        </div>
      </div>

      {/* Main Tab Panel Controls */}
      <div className="flex border-b border-glass-border overflow-x-auto whitespace-nowrap scrollbar-none pb-px">
        {[
          { id: 'summary', name: 'Executive Summary', icon: Sparkles },
          { id: 'complexity', name: 'Code Complexity', icon: BarChart3 },
          { id: 'issues', name: 'Issues Audit', icon: ShieldAlert },
          { id: 'chat', name: 'AI Workspace Chat', icon: MessageSquareCode },
          { id: 'exports', name: 'Reports Export', icon: Download },
          { id: 'generators', name: 'AI Generators', icon: FileCode2 }
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={(isRunning || isFailed) && tab.id !== 'summary'}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all duration-200 ${
                active 
                  ? 'border-brand-blue text-brand-blue bg-brand-blue/5' 
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-glass-hover/10'
              } disabled:opacity-30`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Active Tab Page Content */}
      <div className="flex-1">
        {isRunning ? (
          <div className="py-24 text-center glass-panel rounded-2xl flex flex-col items-center justify-center gap-4">
            <RefreshCw className="w-10 h-10 text-brand-blue animate-spin" />
            <div>
              <h3 className="font-bold text-gray-200">Analysis running in background...</h3>
              <p className="text-xs text-gray-550 mt-1 max-w-sm">Cloning, static checks (Ruff, Bandit, Radon), and calling Gemini audits. This page will update automatically when completed.</p>
            </div>
          </div>
        ) : isFailed ? (
          <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/25 flex flex-col gap-4 text-left max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-400 text-base">Analysis Pipeline Failed</h3>
                <p className="text-xs text-gray-400 mt-2 font-mono bg-slate-900 border border-glass-border/30 rounded-xl p-4 overflow-x-auto leading-relaxed">
                  {selectedAnalysis.error_message || "Unknown internal error occurred during the analysis run."}
                </p>
              </div>
            </div>
            <div className="border-t border-glass-border/40 pt-4 flex flex-col gap-2 text-xs text-gray-450 pl-9">
              <span className="font-bold text-gray-300">💡 Common Solutions:</span>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Go to <strong>Settings</strong> and check that your <strong>Gemini API Key</strong> is entered correctly.</li>
                <li>Make sure you aren't hitting rate limits on a Gemini free-tier key (wait a minute or two).</li>
                <li>Verify that the Git repository URL is correct and public.</li>
                <li>If the repository is private, verify your GitHub Personal Access Token (PAT) in Settings.</li>
              </ul>
            </div>
            <button
              onClick={handleRunNewAnalysis}
              className="mt-2 ml-9 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-indigo text-white font-semibold text-xs flex items-center gap-2 hover:opacity-95 shadow-md shadow-brand-blue/15 transition-all self-start"
            >
              <RefreshCw className="w-4 h-4" /> Try Re-auditing
            </button>
          </div>
        ) : (
          <>
            {/* 1. Summary Tab */}
            {activeTab === 'summary' && (
              <div className="flex flex-col gap-8">
                {/* Scores breakdown grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {[
                    { name: 'Overall Health', score: selectedAnalysis.overall_score },
                    { name: 'Security Audit', score: selectedAnalysis.security_score },
                    { name: 'Performance', score: selectedAnalysis.performance_score },
                    { name: 'Maintainability', score: selectedAnalysis.maintainability_score },
                    { name: 'Documentation', score: selectedAnalysis.documentation_score },
                    { name: 'Test Coverage', score: selectedAnalysis.testing_score },
                    { name: 'Architecture', score: selectedAnalysis.architecture_score }
                  ].map((s) => (
                    <div key={s.name} className="glass-panel p-4 rounded-xl text-center border border-glass-border flex flex-col items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider leading-tight mb-2 block">{s.name}</span>
                      <span className={`w-12 h-12 rounded-full border flex items-center justify-center font-bold text-sm ${getScoreColor(s.score)}`}>
                        {s.score}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Strengths & Weaknesses */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="glass-panel p-6 rounded-xl">
                      <h3 className="font-bold text-white text-base mb-4">Executive Review Summary</h3>
                      <p className="text-sm text-gray-300 leading-relaxed font-light whitespace-pre-wrap">{selectedAnalysis.executive_summary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="glass-panel p-6 rounded-xl border border-emerald-500/10">
                        <h4 className="font-bold text-emerald-400 text-sm mb-3 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4.5 h-4.5" /> Codebase Strengths
                        </h4>
                        <ul className="text-xs text-gray-300 space-y-2.5">
                          {(selectedAnalysis.strengths || []).map((str, idx) => (
                            <li key={idx} className="flex items-start gap-2 leading-relaxed">
                              <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                          {(!selectedAnalysis.strengths || selectedAnalysis.strengths.length === 0) && (
                            <li className="text-gray-500 italic">No key strengths logged.</li>
                          )}
                        </ul>
                      </div>

                      <div className="glass-panel p-6 rounded-xl border border-red-500/10">
                        <h4 className="font-bold text-red-400 text-sm mb-3 flex items-center gap-1.5">
                          <ShieldAlert className="w-4.5 h-4.5" /> Key Weaknesses
                        </h4>
                        <ul className="text-xs text-gray-300 space-y-2.5">
                          {(selectedAnalysis.weaknesses || []).map((weak, idx) => (
                            <li key={idx} className="flex items-start gap-2 leading-relaxed">
                              <span className="text-red-500 shrink-0 mt-0.5">•</span>
                              <span>{weak}</span>
                            </li>
                          ))}
                          {(!selectedAnalysis.weaknesses || selectedAnalysis.weaknesses.length === 0) && (
                            <li className="text-gray-500 italic">No critical weaknesses logged.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Recommendations */}
                  <div className="glass-panel p-6 rounded-xl border border-brand-blue/10 flex flex-col gap-4">
                    <h3 className="font-bold text-white text-base mb-1">Refactoring Guide</h3>
                    <p className="text-xs text-gray-550 leading-relaxed">Top recommendations to optimize complexity, testing, or API design</p>
                    <div className="flex flex-col gap-3.5 mt-2">
                      {(selectedAnalysis.refactoring_suggestions || []).map((rec, idx) => (
                        <div key={idx} className="p-3 bg-slate-900/60 border border-glass-border/30 rounded-lg text-xs leading-relaxed flex gap-2">
                          <span className="text-brand-blue font-bold shrink-0 mt-0.5">{idx + 1}.</span>
                          <span className="text-gray-300 font-light">{rec}</span>
                        </div>
                      ))}
                      {(!selectedAnalysis.refactoring_suggestions || selectedAnalysis.refactoring_suggestions.length === 0) && (
                        <p className="text-gray-500 italic text-xs mt-4">No refactoring suggestions available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Complexity Tab */}
            {activeTab === 'complexity' && selectedAnalysis.complexity_data && (
              <div className="flex flex-col gap-8">
                {/* Metrics boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="glass-panel p-5 rounded-xl">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Avg Complexity (CC)</span>
                    <h3 className="text-2xl font-bold text-white">{selectedAnalysis.complexity_data.average_cyclomatic_complexity}</h3>
                    <span className="text-[10px] text-gray-550 block mt-1 font-light">Lower complexity means simpler test paths</span>
                  </div>
                  <div className="glass-panel p-5 rounded-xl">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Avg Maintainability (MI)</span>
                    <h3 className="text-2xl font-bold text-white">{selectedAnalysis.complexity_data.average_maintainability_index}/100</h3>
                    <span className="text-[10px] text-gray-550 block mt-1 font-light">Rating index from Radon engine</span>
                  </div>
                  <div className="glass-panel p-5 rounded-xl">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Halstead Complexity</span>
                    <h3 className="text-2xl font-bold text-white">{selectedAnalysis.complexity_data.total_halstead_difficulty}</h3>
                    <span className="text-[10px] text-gray-550 block mt-1 font-light">Calculated difficult logic indexes</span>
                  </div>
                  <div className="glass-panel p-5 rounded-xl">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Source Code Files</span>
                    <h3 className="text-2xl font-bold text-white">{selectedAnalysis.complexity_data.file_count}</h3>
                    <span className="text-[10px] text-gray-550 block mt-1 font-light">Total parsed files in codebase</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: Distribution & Complex Methods */}
                  <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* Distribution Pie Chart */}
                    <div className="glass-panel p-6 rounded-xl flex items-center justify-between gap-6 flex-wrap">
                      <div>
                        <h4 className="font-bold text-white text-sm mb-1">Maintainability Distribution (MI)</h4>
                        <p className="text-xs text-gray-550 max-w-sm mt-1 leading-relaxed">Percentage of files falling into Maintainability Grades A (High), B (Medium), and C (Low).</p>
                        <div className="flex flex-col gap-2 mt-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                            <span className="text-gray-400">Grade A (MI &gt; 50): {selectedAnalysis.complexity_data.mi_distribution?.A || 0} files</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
                            <span className="text-gray-400">Grade B (MI 20-49): {selectedAnalysis.complexity_data.mi_distribution?.B || 0} files</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded bg-red-500"></span>
                            <span className="text-gray-400">Grade C (MI &lt; 20): {selectedAnalysis.complexity_data.mi_distribution?.C || 0} files</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-[140px] h-[140px] mx-auto sm:mx-0 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getComplexityDistribution()}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={45}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {getComplexityDistribution().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Complex methods */}
                    <div className="glass-panel p-6 rounded-xl">
                      <h4 className="font-bold text-white text-sm mb-4">Most Complex Functions / Classes (Top CC)</h4>
                      <div className="flex flex-col gap-3">
                        {(selectedAnalysis.complexity_data.most_complex_methods || []).slice(0, 5).map((method, idx) => (
                          <div key={idx} className="p-3 bg-slate-900/60 border border-glass-border/30 rounded-lg text-xs leading-relaxed flex items-center justify-between gap-4">
                            <div className="overflow-hidden">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mr-2 inline-block ${
                                method.type === 'class' ? 'bg-purple-500/20 text-purple-400' : 'bg-brand-blue/20 text-brand-blue'
                              }`}>
                                {method.type}
                              </span>
                              <span className="font-mono text-gray-250 font-semibold">{method.name}</span>
                              <p className="text-[10px] text-gray-500 truncate mt-0.5">{method.file} (Line {method.lineno})</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded font-bold font-mono ${
                              method.complexity > 10 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                            }`}>
                              CC {method.complexity}
                            </span>
                          </div>
                        ))}
                        {(!selectedAnalysis.complexity_data.most_complex_methods || selectedAnalysis.complexity_data.most_complex_methods.length === 0) && (
                          <p className="text-gray-500 italic text-xs text-center">No high complexity blocks logged.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: File metrics list */}
                  <div className="glass-panel p-6 rounded-xl flex flex-col max-h-[460px]">
                    <h4 className="font-bold text-white text-sm mb-1">File Maintainability Indices</h4>
                    <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">Grades calculated based on LOC, density, and operator volume</p>
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
                      {(selectedAnalysis.complexity_data.file_metrics || []).map((file, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-900/40 border border-glass-border/20 rounded-lg text-xs flex justify-between items-center gap-4">
                          <div className="overflow-hidden">
                            <p className="font-semibold text-gray-300 truncate">{file.file_path.split('/').pop()}</p>
                            <span className="text-[9px] text-gray-500 block mt-0.5 truncate font-light">{file.file_path}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-bold font-mono text-xs ${
                              file.mi > 50 ? 'text-emerald-450' : file.mi > 20 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              MI {Math.round(file.mi)}
                            </span>
                            <span className="text-[9px] text-gray-500 block font-light font-mono">{file.loc} lines</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Issues Tab */}
            {activeTab === 'issues' && (
              <div className="flex flex-col gap-6">
                {/* Filters Row */}
                <div className="flex items-center gap-4 flex-wrap bg-slate-900/60 p-4 border border-glass-border rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-550 font-bold font-mono">Severity:</label>
                    <select
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                      className="bg-slate-950 border border-glass-border text-gray-300 rounded-lg text-xs py-1.5 px-3 outline-none"
                    >
                      <option value="all">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-550 font-bold font-mono">Category:</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="bg-slate-950 border border-glass-border text-gray-300 rounded-lg text-xs py-1.5 px-3 outline-none"
                    >
                      <option value="all">All Categories</option>
                      <option value="security">Security</option>
                      <option value="performance">Performance</option>
                      <option value="bug">Bug</option>
                      <option value="style">Style</option>
                      <option value="architecture">Architecture</option>
                    </select>
                  </div>
                  
                  <span className="text-[10px] text-gray-500 font-mono ml-auto">Showing {filteredIssues.length} of {issues.length} findings</span>
                </div>

                {/* Issues List */}
                <div className="flex flex-col gap-4">
                  {filteredIssues.map((issue) => (
                    <div 
                      key={issue.id} 
                      className={`glass-panel p-6 rounded-xl border text-left flex flex-col gap-3.5 transition-all ${
                        issue.severity === 'critical' ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/30' :
                        issue.severity === 'warning' ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30' :
                        'border-blue-500/20 bg-blue-500/5 hover:border-blue-500/30'
                      }`}
                    >
                      {/* Top row metadata */}
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="overflow-hidden flex-1 pr-4">
                          <h4 className="font-bold text-sm text-gray-200 truncate leading-none mb-1.5 flex items-center gap-2">
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              issue.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                              issue.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-brand-blue/20 text-brand-blue'
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="font-mono text-gray-300 text-xs shrink-0">{issue.file_path} {issue.line_number ? `(Line ${issue.line_number})` : ''}</span>
                          </h4>
                        </div>
                        <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-gray-500">
                          Source: {issue.tool} • {issue.category}
                        </span>
                      </div>

                      {/* Explanation message */}
                      <p className="text-xs text-gray-300 leading-relaxed font-light">{issue.message}</p>

                      {/* Code block snippet if present */}
                      {issue.code_snippet && (
                        <div className="relative border border-glass-border/30 rounded-xl overflow-hidden bg-slate-950 font-mono text-[10px] text-gray-300">
                          <div className="bg-slate-900 border-b border-glass-border/30 px-4 py-1.5 flex justify-between text-gray-500">
                            <span>Snippet code</span>
                            <Code className="w-3.5 h-3.5" />
                          </div>
                          <pre className="p-4 overflow-x-auto"><code>{issue.code_snippet}</code></pre>
                        </div>
                      )}

                      {/* Suggested fix details */}
                      {issue.suggested_fix && (
                        <div className="p-3.5 rounded-lg bg-black/30 border border-glass-border/20 text-xs flex flex-col gap-1.5 text-gray-350 leading-relaxed font-light">
                          <span className="font-bold text-brand-blue text-[10px] uppercase font-mono tracking-wider flex items-center gap-1">🛠 Suggested Refactoring</span>
                          <p className="whitespace-pre-wrap">{issue.suggested_fix}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredIssues.length === 0 && (
                    <div className="py-16 text-center glass-panel rounded-xl text-gray-500 text-xs">
                      No issues match the selected filters.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Chat Tab */}
            {activeTab === 'chat' && (
              <div className="glass-panel rounded-xl flex flex-col h-[520px] overflow-hidden border border-glass-border">
                {/* Chat Header */}
                <div className="bg-slate-900 border-b border-glass-border/50 px-6 py-3 flex items-center gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-blue/15 border border-brand-blue/20 flex items-center justify-center text-brand-blue">
                    <MessageSquareCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-200">Interactive Codebase AI Chat</h4>
                    <p className="text-[10px] text-gray-500">Query architectural designs, logic flows, or request unit tests contextually.</p>
                  </div>
                </div>

                {/* Messages Box */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-950/40">
                  {chatMessages.length === 0 ? (
                    <div className="py-24 text-center text-xs text-gray-550 flex flex-col items-center gap-3 m-auto max-w-sm">
                      <Sparkles className="w-8 h-8 text-brand-blue animate-soft-pulse" />
                      <p>Ask anything about the codebase. The chatbot has access to your repository analysis, scores, and refactoring guidelines.</p>
                    </div>
                  ) : (
                    <>
                      {chatMessages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`flex gap-3 max-w-[85%] text-xs leading-relaxed ${
                            msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold font-mono text-xs border ${
                            msg.role === 'user' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-brand-blue/10 border-brand-blue/20 text-brand-blue'
                          }`}>
                            {msg.role === 'user' ? 'U' : 'AI'}
                          </div>
                          <div className={`p-3.5 rounded-2xl whitespace-pre-wrap font-light ${
                            msg.role === 'user' ? 'bg-brand-blue text-white rounded-tr-none' : 'bg-slate-900 border border-glass-border text-gray-200 rounded-tl-none'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {chatLoading && (
                    <div className="self-start flex gap-3 text-xs">
                      <div className="w-8 h-8 rounded-full bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue font-bold">AI</div>
                      <div className="p-3 bg-slate-900 border border-glass-border rounded-2xl rounded-tl-none flex items-center gap-2 text-gray-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef}></div>
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendChatMessage} className="bg-slate-900 border-t border-glass-border/50 p-4 flex gap-3 shrink-0">
                  <input 
                    type="text" 
                    placeholder="Ask about this codebase..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                    className="flex-1 bg-slate-950 border border-glass-border focus:border-brand-blue/50 text-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none transition-colors"
                  />
                  <button 
                    type="submit" 
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-indigo text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* 5. Exports Tab */}
            {activeTab === 'exports' && (
              <div className="max-w-2xl mx-auto flex flex-col gap-6 text-left">
                <div className="glass-panel p-6 rounded-xl flex flex-col gap-4">
                  <h3 className="font-bold text-white text-base">Export Code Review Documentation</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-light">
                    Generate and download local report packages representing cyclomatic complexity logs, linters index, security vulnerabilities checklist, and refactoring guidelines.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div className="p-4 border border-glass-border rounded-xl bg-slate-900/40 hover:border-brand-blue/30 transition-all flex flex-col justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-brand-blue uppercase font-mono tracking-wider">PDF Report Package</span>
                        <h4 className="font-bold text-gray-200 text-sm mt-1">Compiled PDF Document</h4>
                        <p className="text-[11px] text-gray-500 mt-1 font-light leading-relaxed">Formatted print-ready document containing cover page, score boards, static analysis charts, and detailed issue indexes.</p>
                      </div>
                      <button 
                        onClick={() => handleDownloadReport('pdf')}
                        className="px-3.5 py-2 bg-gradient-to-r from-brand-blue to-brand-indigo text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 hover:opacity-90 shadow-md shadow-brand-blue/15"
                      >
                        <Download className="w-3.5 h-3.5" /> Export PDF
                      </button>
                    </div>

                    <div className="p-4 border border-glass-border rounded-xl bg-slate-900/40 hover:border-brand-blue/30 transition-all flex flex-col justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-brand-cyan uppercase font-mono tracking-wider">Markdown Documentation</span>
                        <h4 className="font-bold text-gray-200 text-sm mt-1">Raw MD Audit Report</h4>
                        <p className="text-[11px] text-gray-500 mt-1 font-light leading-relaxed">Clean markdown file suitable for copy-pasting directly into GitHub README documentation, PR notes, or internal wikis.</p>
                      </div>
                      <button 
                        onClick={() => handleDownloadReport('md')}
                        className="px-3.5 py-2 bg-glass-bg border border-glass-border hover:bg-glass-hover text-gray-300 hover:text-white rounded-lg text-xs flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Export Markdown
                      </button>
                    </div>

                    <div className="p-4 border border-glass-border rounded-xl bg-slate-900/40 hover:border-brand-blue/30 transition-all flex flex-col justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-450 uppercase font-mono tracking-wider">HTML Static Dashboard</span>
                        <h4 className="font-bold text-gray-200 text-sm mt-1">Standalone HTML Report</h4>
                        <p className="text-[11px] text-gray-500 mt-1 font-light leading-relaxed">Self-contained browser file containing interactive elements, styling layout, and full diagnostics suitable for client presentation.</p>
                      </div>
                      <button 
                        onClick={() => handleDownloadReport('html')}
                        className="px-3.5 py-2 bg-glass-bg border border-glass-border hover:bg-glass-hover text-gray-300 hover:text-white rounded-lg text-xs flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Export HTML
                      </button>
                    </div>

                    <div className="p-4 border border-glass-border rounded-xl bg-slate-900/40 hover:border-brand-blue/30 transition-all flex flex-col justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-purple-400 uppercase font-mono tracking-wider">Raw JSON Data</span>
                        <h4 className="font-bold text-gray-200 text-sm mt-1">Raw API JSON Payload</h4>
                        <p className="text-[11px] text-gray-500 mt-1 font-light leading-relaxed">Raw audit schema file containing structural scores, Radon statistics, and issues coordinates suitable for pipeline integrations.</p>
                      </div>
                      <button 
                        onClick={() => handleDownloadReport('json')}
                        className="px-3.5 py-2 bg-glass-bg border border-glass-border hover:bg-glass-hover text-gray-300 hover:text-white rounded-lg text-xs flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Export JSON
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Generators Tab */}
            {activeTab === 'generators' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 text-left">
                {/* Left controls column */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                  <div className="glass-panel p-5 rounded-xl border border-glass-border flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Select AI Generator</h4>
                    
                    <button 
                      onClick={() => handleGenerate('tests')}
                      disabled={genLoading}
                      className={`w-full py-3 px-4 rounded-xl border text-xs font-semibold text-left flex items-center gap-3 transition-all ${
                        genType === 'tests' ? 'bg-brand-blue/10 border-brand-blue text-brand-blue' : 'bg-slate-900 border-glass-border/30 text-gray-400 hover:text-white'
                      } disabled:opacity-50`}
                    >
                      <FileCode2 className="w-4 h-4 shrink-0" />
                      <span>Unit Test Suite</span>
                    </button>

                    <button 
                      onClick={() => handleGenerate('docs')}
                      disabled={genLoading}
                      className={`w-full py-3 px-4 rounded-xl border text-xs font-semibold text-left flex items-center gap-3 transition-all ${
                        genType === 'docs' ? 'bg-brand-blue/10 border-brand-blue text-brand-blue' : 'bg-slate-900 border-glass-border/30 text-gray-400 hover:text-white'
                      } disabled:opacity-50`}
                    >
                      <BookOpen className="w-4 h-4 shrink-0" />
                      <span>Technical Docs</span>
                    </button>
                  </div>
                </div>

                {/* Right output column */}
                <div className="lg:col-span-3">
                  <div className="glass-panel rounded-xl min-h-[400px] flex flex-col border border-glass-border bg-slate-950/20 relative">
                    <div className="bg-slate-900 border-b border-glass-border/40 px-6 py-3 flex items-center justify-between shrink-0 text-xs">
                      <span className="font-bold text-gray-400">Generator output</span>
                      {genResult && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(genResult);
                            alert("Copied code block output!");
                          }}
                          className="px-2 py-1 bg-slate-800 border border-glass-border/60 hover:bg-slate-700 text-gray-300 rounded font-semibold text-[10px]"
                        >
                          Copy Output
                        </button>
                      )}
                    </div>

                    <div className="flex-1 p-6 font-light leading-relaxed text-xs text-gray-300 select-text overflow-y-auto">
                      {genLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/40 backdrop-blur-xs">
                          <RefreshCw className="w-8 h-8 text-brand-blue animate-spin" />
                          <p className="text-xs text-gray-500 font-medium">Generating content via Gemini API...</p>
                        </div>
                      ) : genResult ? (
                        <pre className="font-sans whitespace-pre-wrap select-text">{genResult}</pre>
                      ) : (
                        <div className="py-24 text-center text-gray-500 flex flex-col items-center gap-3 max-w-sm mx-auto justify-center h-full">
                          <Terminal className="w-8 h-8 text-gray-650" />
                          <p>Select a generator on the left and invoke to build AI test suites or extensive documentation files matching repository metrics.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

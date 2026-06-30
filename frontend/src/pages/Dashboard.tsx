import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitFork, 
  ShieldAlert, 
  Activity, 
  Heart,
  Plus,
  FolderOpen,
  ArrowUpRight,
  Github,
  Upload,
  Globe,
  PlusCircle,
  BookOpen
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from 'recharts';
import api from '../services/api';
import { DashboardStats, Repository } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Submit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitType, setSubmitType] = useState<'url' | 'zip'>('url');
  const [repoUrl, setRepoUrl] = useState('');
  const [repoBranch, setRepoBranch] = useState('main');
  const [zipName, setZipName] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const parseGithubUrl = (url: string) => {
    try {
      const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '');
      const parts = cleaned.split('/');
      if (parts.length >= 2) {
        const name = parts[parts.length - 1];
        const owner = parts[parts.length - 2];
        return { owner, name };
      }
    } catch (e) {}
    return { owner: 'local', name: 'repository' };
  };

  const computeStats = (repositories: any[]) => {
    const totalRepos = repositories.length;
    let totalAnalyses = 0;
    let totalIssues = 0;
    let totalScoreSum = 0;
    let completedAnalysesCount = 0;
    
    const issuesBySeverity = { critical: 0, warning: 0, info: 0 };
    const issuesByCategory = { security: 0, performance: 0, bug: 0, style: 0, architecture: 0 };
    const recentActivity: any[] = [];

    repositories.forEach(repo => {
      if (repo.analyses && Array.isArray(repo.analyses)) {
        totalAnalyses += repo.analyses.length;
        
        repo.analyses.forEach((analysis: any) => {
          recentActivity.push({
            repo_name: repo.name,
            repo_id: repo.id,
            analysis_id: analysis.id,
            status: analysis.status,
            score: analysis.overall_score || 0,
            created_at: analysis.created_at
          });

          if (analysis.status === 'completed') {
            completedAnalysesCount++;
            totalScoreSum += analysis.overall_score || 0;
            
            if (analysis.issues && Array.isArray(analysis.issues)) {
              totalIssues += analysis.issues.length;
              analysis.issues.forEach((issue: any) => {
                const sev = (issue.severity || 'info').toLowerCase();
                const cat = (issue.category || 'style').toLowerCase();
                
                if (sev in issuesBySeverity) issuesBySeverity[sev as keyof typeof issuesBySeverity]++;
                if (cat in issuesByCategory) issuesByCategory[cat as keyof typeof issuesByCategory]++;
              });
            }
          }
        });
      }
    });

    recentActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      total_repositories: totalRepos,
      total_analyses: totalAnalyses,
      average_health_score: completedAnalysesCount > 0 ? Math.round((totalScoreSum / completedAnalysesCount) * 10) / 10 : 0.0,
      total_issues_detected: totalIssues,
      issues_by_severity: issuesBySeverity,
      issues_by_category: issuesByCategory,
      recent_activity: recentActivity.slice(0, 5)
    };
  };

  const loadLocalStorageData = () => {
    try {
      const stored = localStorage.getItem('auditor_repositories');
      const loadedRepos = stored ? JSON.parse(stored) : [];
      setRepos(loadedRepos);
      setStats(computeStats(loadedRepos));
    } catch (err) {
      console.error("Failed to load local repositories data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocalStorageData();
  }, []);

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    // Retrieve settings
    const storedSettings = localStorage.getItem('auditor_settings');
    const settings = storedSettings ? JSON.parse(storedSettings) : {};
    const api_key = settings.gemini_api_key;

    if (!api_key) {
      setSubmitError("Google Gemini API Key is not configured. Please enter it in Settings first.");
      setSubmitting(false);
      return;
    }
    
    try {
      const repoId = Date.now();
      const analysisId = Date.now() + 1;
      let newRepo: any;

      if (submitType === 'url') {
        const parsed = parseGithubUrl(repoUrl);
        newRepo = {
          id: repoId,
          name: parsed.name,
          url: repoUrl,
          owner: parsed.owner,
          default_branch: repoBranch || 'main',
          current_commit: null,
          created_at: new Date().toISOString(),
          analyses: [
            {
              id: analysisId,
              repo_id: repoId,
              status: 'analyzing',
              branch: repoBranch || 'main',
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
            }
          ]
        };

        // Save immediately as pending in local storage
        const currentRepos = localStorage.getItem('auditor_repositories');
        const reposList = currentRepos ? JSON.parse(currentRepos) : [];
        reposList.push(newRepo);
        localStorage.setItem('auditor_repositories', JSON.stringify(reposList));
        
        // Reset states and update dashboard
        setModalOpen(false);
        setRepoUrl('');
        loadLocalStorageData();

        // Trigger stateless API call in background
        api.post('/analyze', {
          url: repoUrl,
          branch: repoBranch || 'main',
          gemini_api_key: api_key,
          gemini_model: settings.gemini_model || 'gemini-2.5-flash',
          github_pat: settings.github_pat || null,
          custom_system_prompt: settings.custom_system_prompt || null
        }).then(res => {
          // Success: update analysis results
          const storedRepos = localStorage.getItem('auditor_repositories');
          const list = storedRepos ? JSON.parse(storedRepos) : [];
          const updated = list.map((r: any) => {
            if (r.id === repoId) {
              const updatedAnalyses = r.analyses.map((a: any) => {
                if (a.id === analysisId) {
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
          localStorage.setItem('auditor_repositories', JSON.stringify(updated));
          loadLocalStorageData();
        }).catch(err => {
          // Failure: update status
          const storedRepos = localStorage.getItem('auditor_repositories');
          const list = storedRepos ? JSON.parse(storedRepos) : [];
          const updated = list.map((r: any) => {
            if (r.id === repoId) {
              const updatedAnalyses = r.analyses.map((a: any) => {
                if (a.id === analysisId) {
                  return {
                    ...a,
                    status: 'failed',
                    error_message: err.response?.data?.detail || "Stateless analysis pipeline timed out."
                  };
                }
                return a;
              });
              return { ...r, analyses: updatedAnalyses };
            }
            return r;
          });
          localStorage.setItem('auditor_repositories', JSON.stringify(updated));
          loadLocalStorageData();
        });

      } else {
        if (!zipFile) {
          setSubmitError("Please select a ZIP file.");
          setSubmitting(false);
          return;
        }

        const name = zipName || zipFile.name.replace(".zip", "");
        newRepo = {
          id: repoId,
          name: name,
          url: `zip-upload://${zipFile.name}`,
          owner: 'local',
          default_branch: 'main',
          current_commit: null,
          created_at: new Date().toISOString(),
          analyses: [
            {
              id: analysisId,
              repo_id: repoId,
              status: 'analyzing',
              branch: 'main',
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
            }
          ]
        };

        // Save immediately as pending in local storage
        const currentRepos = localStorage.getItem('auditor_repositories');
        const reposList = currentRepos ? JSON.parse(currentRepos) : [];
        reposList.push(newRepo);
        localStorage.setItem('auditor_repositories', JSON.stringify(reposList));
        
        // Reset states and update dashboard
        setModalOpen(false);
        setZipFile(null);
        setZipName('');
        loadLocalStorageData();

        // Trigger stateless ZIP upload API call in background
        const formData = new FormData();
        formData.append('file', zipFile);
        formData.append('gemini_api_key', api_key);
        formData.append('gemini_model', settings.gemini_model || 'gemini-2.5-flash');
        if (settings.custom_system_prompt) {
          formData.append('custom_system_prompt', settings.custom_system_prompt);
        }

        api.post('/analyze/zip', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).then(res => {
          // Success: update analysis results
          const storedRepos = localStorage.getItem('auditor_repositories');
          const list = storedRepos ? JSON.parse(storedRepos) : [];
          const updated = list.map((r: any) => {
            if (r.id === repoId) {
              const updatedAnalyses = r.analyses.map((a: any) => {
                if (a.id === analysisId) {
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
          localStorage.setItem('auditor_repositories', JSON.stringify(updated));
          loadLocalStorageData();
        }).catch(err => {
          // Failure: update status
          const storedRepos = localStorage.getItem('auditor_repositories');
          const list = storedRepos ? JSON.parse(storedRepos) : [];
          const updated = list.map((r: any) => {
            if (r.id === repoId) {
              const updatedAnalyses = r.analyses.map((a: any) => {
                if (a.id === analysisId) {
                  return {
                    ...a,
                    status: 'failed',
                    error_message: err.response?.data?.detail || "Stateless ZIP analysis pipeline failed."
                  };
                }
                return a;
              });
              return { ...r, analyses: updatedAnalyses };
            }
            return r;
          });
          localStorage.setItem('auditor_repositories', JSON.stringify(updated));
          loadLocalStorageData();
        });
      }
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit repository.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm">Compiling workspace data...</p>
      </div>
    );
  }

  // Formatting chart datasets
  const severityColors = {
    critical: '#ef4444',
    warning: '#f59e0b',
    info: '#388bfd'
  };

  const severityData = stats ? Object.entries(stats.issues_by_severity).map(([key, val]) => ({
    name: key.toUpperCase(),
    value: val,
    color: severityColors[key as keyof typeof severityColors] || '#ccc'
  })).filter(item => item.value > 0) : [];

  const categoryData = stats ? Object.entries(stats.issues_by_category).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    Issues: val
  })) : [];

  return (
    <div className="flex flex-col gap-8">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">Developer Dashboard</h1>
          <p className="text-sm text-gray-400">Continuous code auditing metrics and vulnerabilities index</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-indigo text-white font-semibold text-sm flex items-center gap-2 hover:scale-[1.01] hover:opacity-95 shadow-md shadow-brand-blue/15 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Repository
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-xl flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-brand-blue/10 flex items-center justify-center border border-brand-blue/20 text-brand-blue">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-550 font-semibold uppercase tracking-wider">Repositories</span>
            <h3 className="text-2xl font-bold text-gray-150 mt-0.5">{stats?.total_repositories}</h3>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-brand-blue/10 flex items-center justify-center border border-brand-blue/20 text-brand-blue">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-550 font-semibold uppercase tracking-wider">Analyses Runs</span>
            <h3 className="text-2xl font-bold text-gray-150 mt-0.5">{stats?.total_analyses}</h3>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-brand-blue/10 flex items-center justify-center border border-brand-blue/20 text-brand-blue">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-550 font-semibold uppercase tracking-wider">Avg Health Index</span>
            <h3 className="text-2xl font-bold text-gray-150 mt-0.5">{stats?.average_health_score}/100</h3>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-450">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-550 font-semibold uppercase tracking-wider">Issues Detected</span>
            <h3 className="text-2xl font-bold text-gray-150 mt-0.5 text-rose-400">{stats?.total_issues_detected}</h3>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Charts and Repos */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Category Chart */}
            <div className="glass-panel p-6 rounded-xl">
              <h4 className="text-sm font-bold text-gray-300 mb-6">Issues by Category</h4>
              <div className="h-[180px]">
                {stats?.total_issues_detected === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-500">No issues index</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                      <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}
                        labelStyle={{ color: '#f3f4f6', fontWeight: 'bold', fontSize: 11 }}
                        itemStyle={{ color: '#3b82f6', fontSize: 11 }}
                      />
                      <Bar dataKey="Issues" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Severity Chart */}
            <div className="glass-panel p-6 rounded-xl flex flex-col justify-between">
              <h4 className="text-sm font-bold text-gray-300 mb-2">Severity Breakdown</h4>
              {severityData.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-xs text-gray-500">No issues index</div>
              ) : (
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-[120px] h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {severityData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="text-gray-400 font-semibold">{item.name}:</span>
                        <span className="text-gray-200 font-bold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Repository List Cards */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold text-gray-300">My Repositories ({repos.length})</h4>
            {repos.length === 0 ? (
              <div className="glass-panel p-10 rounded-xl text-center flex flex-col items-center gap-4 border border-dashed border-glass-border">
                <Github className="w-10 h-10 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-400 font-bold">No repositories linked yet</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">To start, check Settings to configure your API key, then click below to run audits.</p>
                </div>
                <button 
                  onClick={() => setModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-indigo text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-brand-blue/15 hover:scale-[1.01] transition-all"
                >
                  <PlusCircle className="w-4 h-4" /> Link Your First Repository
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {repos.map((r) => {
                  const latestAnalysis = r.analyses && r.analyses.length > 0 ? r.analyses[0] : null;
                  const isAnalyzing = latestAnalysis && (latestAnalysis.status === 'analyzing' || latestAnalysis.status === 'pending' || latestAnalysis.status === 'cloning');
                  const isFailed = latestAnalysis && latestAnalysis.status === 'failed';
                  
                  return (
                    <div 
                      key={r.id} 
                      onClick={() => navigate(`/repos/${r.id}`)}
                      className="glass-panel p-6 rounded-xl hover:border-brand-blue/30 cursor-pointer flex flex-col justify-between group transition-all duration-200"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="font-bold text-base text-gray-200 group-hover:text-white truncate">{r.name}</h5>
                          <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-brand-blue transition-colors shrink-0" />
                        </div>
                        <p className="text-xs text-gray-500 truncate mb-4">{r.url}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-glass-border/40 pt-3 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <GitFork className="w-3.5 h-3.5" />
                          <span>{r.default_branch}</span>
                        </div>
                        {isAnalyzing ? (
                          <span className="text-brand-cyan font-semibold text-[10px] animate-pulse">analyzing...</span>
                        ) : isFailed ? (
                          <span className="text-rose-400 font-semibold text-[10px]">failed</span>
                        ) : (
                          <span className="text-gray-550 font-mono text-[10px]">
                            {r.current_commit ? r.current_commit.substring(0, 7) : 'no audits'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent activity */}
        <div className="glass-panel p-6 rounded-xl flex flex-col gap-6">
          <h4 className="text-sm font-bold text-gray-300">Recent Activity</h4>
          {stats?.recent_activity.length === 0 ? (
            <div className="py-24 text-center text-xs text-gray-500 flex-1 flex items-center justify-center">No recent analysis logs</div>
          ) : (
            <div className="flex flex-col gap-4 flex-1">
              {stats?.recent_activity.map((act, idx) => (
                <div key={idx} className="flex items-start gap-3 border-b border-glass-border/30 pb-3 last:border-b-0 last:pb-0 text-xs">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 border ${
                    act.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    act.status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                  }`}>
                    {act.status === 'completed' ? act.score : act.status.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="font-semibold text-gray-300 truncate">{act.repo_name}</p>
                    <span className="text-gray-500 text-[10px] block mt-0.5">
                      {act.status === 'completed' ? `Review complete (Score: ${act.score})` : `Analysis state: ${act.status}`}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono mt-1 block">
                      {new Date(act.created_at).toLocaleDateString()} {new Date(act.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md bg-slate-850 border border-glass-border rounded-2xl shadow-2xl overflow-hidden glass-panel">
            {/* Modal tab selector */}
            <div className="flex border-b border-glass-border bg-black/20">
              <button 
                onClick={() => setSubmitType('url')}
                className={`flex-1 py-3 text-center text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  submitType === 'url' ? 'border-brand-blue text-brand-blue bg-glass-hover/10' : 'border-transparent text-gray-400'
                }`}
              >
                <Globe className="w-4 h-4" /> Git URL
              </button>
              <button 
                onClick={() => setSubmitType('zip')}
                className={`flex-1 py-3 text-center text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  submitType === 'zip' ? 'border-brand-blue text-brand-blue bg-glass-hover/10' : 'border-transparent text-gray-400'
                }`}
              >
                <Upload className="w-4 h-4" /> Upload ZIP
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateRepo} className="p-6 flex flex-col gap-4">
              {submitError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {submitError}
                </div>
              )}

              {submitType === 'url' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-450 uppercase tracking-wider mb-2">GitHub Repository URL</label>
                    <input 
                      required
                      type="url" 
                      placeholder="https://github.com/user/project"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-glass-border focus:border-brand-blue/50 text-gray-200 rounded-xl py-3 px-4 text-sm outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-450 uppercase tracking-wider mb-2">Default Branch</label>
                    <input 
                      type="text" 
                      placeholder="main"
                      value={repoBranch}
                      onChange={(e) => setRepoBranch(e.target.value)}
                      className="w-full bg-slate-900 border border-glass-border focus:border-brand-blue/50 text-gray-200 rounded-xl py-3 px-4 text-sm outline-none transition-colors"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-450 uppercase tracking-wider mb-2">Project Display Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. My API microservice"
                      value={zipName}
                      onChange={(e) => setZipName(e.target.value)}
                      className="w-full bg-slate-900 border border-glass-border focus:border-brand-blue/50 text-gray-200 rounded-xl py-3 px-4 text-sm outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-455 uppercase tracking-wider mb-2">Select ZIP Package</label>
                    <input 
                      required
                      type="file" 
                      accept=".zip"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setZipFile(e.target.files[0]);
                          if (!zipName) setZipName(e.target.files[0].name.replace(".zip", ""));
                        }
                      }}
                      className="w-full bg-slate-900 border border-glass-border focus:border-brand-blue/50 text-gray-450 rounded-xl py-2.5 px-4 text-xs outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-brand-blue/10 file:text-brand-blue file:font-semibold hover:file:bg-brand-blue/20 transition-colors"
                    />
                  </div>
                </>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 justify-end mt-4">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-glass-bg border border-glass-border text-gray-300 text-xs hover:bg-glass-hover"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-blue to-brand-indigo text-white font-semibold text-xs hover:opacity-95 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>Run Auditor</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

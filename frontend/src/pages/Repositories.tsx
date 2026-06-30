import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderGit2, 
  Plus, 
  GitBranch, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Search,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import api from '../services/api';
import { Repository, Analysis } from '../types';

export const Repositories: React.FC = () => {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [latestAnalyses, setLatestAnalyses] = useState<{ [key: number]: Analysis }>({});
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  // Modal creation states
  const [modalOpen, setModalOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoBranch, setRepoBranch] = useState('main');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchRepositories = () => {
    try {
      const stored = localStorage.getItem('auditor_repositories');
      const list = stored ? JSON.parse(stored) : [];
      setRepos(list);
      
      const analysesMap: { [key: number]: Analysis } = {};
      list.forEach((r: any) => {
        if (r.analyses && r.analyses.length > 0) {
          analysesMap[r.id] = r.analyses[0];
        }
      });
      setLatestAnalyses(analysesMap);
    } catch (err) {
      console.error("Failed to load local repositories in index:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  // Poll active analysis status from LocalStorage updates
  useEffect(() => {
    const activeAnalyses = Object.values(latestAnalyses).some(
      (a) => a.status === 'pending' || a.status === 'cloning' || a.status === 'analyzing'
    );

    if (activeAnalyses) {
      const interval = setInterval(() => {
        fetchRepositories();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [latestAnalyses]);

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

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

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
      const parsed = parseGithubUrl(repoUrl);
      
      const newAnalysis: Analysis = {
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
      };

      const newRepo = {
        id: repoId,
        name: parsed.name,
        url: repoUrl,
        owner: parsed.owner,
        default_branch: repoBranch || 'main',
        current_commit: null,
        created_at: new Date().toISOString(),
        analyses: [newAnalysis]
      };

      // Save locally
      const stored = localStorage.getItem('auditor_repositories');
      const list = stored ? JSON.parse(stored) : [];
      list.push(newRepo);
      localStorage.setItem('auditor_repositories', JSON.stringify(list));
      
      setModalOpen(false);
      setRepoUrl('');
      fetchRepositories();

      // Trigger stateless API audit in background
      api.post('/analyze', {
        url: repoUrl,
        branch: repoBranch || 'main',
        gemini_api_key: api_key,
        gemini_model: settings.gemini_model || 'gemini-2.5-flash',
        github_pat: settings.github_pat || null,
        custom_system_prompt: settings.custom_system_prompt || null
      }).then(res => {
        const storedList = localStorage.getItem('auditor_repositories');
        const listData = storedList ? JSON.parse(storedList) : [];
        const updated = listData.map((r: any) => {
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
        fetchRepositories();
      }).catch(err => {
        const storedList = localStorage.getItem('auditor_repositories');
        const listData = storedList ? JSON.parse(storedList) : [];
        const updated = listData.map((r: any) => {
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
        fetchRepositories();
      });
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit repo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerAnalysis = async (e: React.MouseEvent, repoId: number) => {
    e.stopPropagation();
    
    const storedSettings = localStorage.getItem('auditor_settings');
    const settings = storedSettings ? JSON.parse(storedSettings) : {};
    const api_key = settings.gemini_api_key;

    if (!api_key) {
      alert("Google Gemini API Key is not configured. Please enter it in Settings first.");
      return;
    }

    const storedList = localStorage.getItem('auditor_repositories');
    const list = storedList ? JSON.parse(storedList) : [];
    const targetRepo = list.find((r: any) => r.id === repoId);
    if (!targetRepo) return;

    const newAnalysisId = Date.now();
    const newAnalysis: Analysis = {
      id: newAnalysisId,
      repo_id: repoId,
      status: 'analyzing',
      branch: targetRepo.default_branch || 'main',
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
    const updated = list.map((r: any) => {
      if (r.id === repoId) {
        return {
          ...r,
          analyses: [newAnalysis, ...(r.analyses || [])]
        };
      }
      return r;
    });
    localStorage.setItem('auditor_repositories', JSON.stringify(updated));
    fetchRepositories();

    // Trigger stateless API call in background
    api.post('/analyze', {
      url: targetRepo.url,
      branch: targetRepo.default_branch || 'main',
      gemini_api_key: api_key,
      gemini_model: settings.gemini_model || 'gemini-2.5-flash',
      github_pat: settings.github_pat || null,
      custom_system_prompt: settings.custom_system_prompt || null
    }).then(res => {
      const stored = localStorage.getItem('auditor_repositories');
      const currentList = stored ? JSON.parse(stored) : [];
      const done = currentList.map((r: any) => {
        if (r.id === repoId) {
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
      fetchRepositories();
    }).catch(err => {
      const stored = localStorage.getItem('auditor_repositories');
      const currentList = stored ? JSON.parse(stored) : [];
      const fail = currentList.map((r: any) => {
        if (r.id === repoId) {
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
      fetchRepositories();
    });
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm">Loading repositories log...</p>
      </div>
    );
  }

  const filteredRepos = repos.filter(
    (r) => r.name.toLowerCase().includes(filterQuery.toLowerCase()) || r.url.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">Codebases Index</h1>
          <p className="text-sm text-gray-400">List of analyzed repositories and active analysis status</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-indigo text-white font-semibold text-sm flex items-center gap-2 hover:scale-[1.01] hover:opacity-95 shadow-md shadow-brand-blue/15 transition-all"
        >
          <Plus className="w-4 h-4" /> Link Repo
        </button>
      </div>

      {/* Filter and Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input 
          type="text" 
          placeholder="Filter by repo name or URL..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="w-full bg-glass-bg border border-glass-border focus:border-brand-blue/50 text-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-colors"
        />
      </div>

      {/* Repos Cards List */}
      {filteredRepos.length === 0 ? (
        <div className="glass-panel p-16 rounded-xl text-center flex flex-col items-center justify-center gap-4">
          <FolderGit2 className="w-12 h-12 text-gray-500" />
          <p className="text-gray-400 text-sm">No repositories linked yet or matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRepos.map((r) => {
            const latest = latestAnalyses[r.id];
            const isProcessing = latest && (latest.status === 'pending' || latest.status === 'cloning' || latest.status === 'analyzing');
            const isFailed = latest && latest.status === 'failed';
            
            return (
              <div 
                key={r.id} 
                onClick={() => navigate(`/repos/${r.id}`)}
                className="glass-panel p-6 rounded-2xl hover:border-brand-blue/35 hover:scale-[1.005] group cursor-pointer flex flex-col justify-between relative transition-all duration-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-100 group-hover:text-white transition-colors">{r.name}</h3>
                      <span className="text-[10px] text-gray-500 font-mono tracking-wide">{r.owner}</span>
                    </div>
                    {latest && latest.status === 'completed' && (
                      <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center border font-bold text-base ${
                        latest.overall_score >= 80 ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-450' :
                        latest.overall_score >= 60 ? 'bg-amber-500/10 border-amber-500/25 text-amber-450' :
                        'bg-red-500/10 border-red-500/25 text-red-400'
                      }`}>
                        {latest.overall_score}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-5">{r.url}</p>
                </div>

                <div className="flex items-center justify-between border-t border-glass-border/30 pt-4 mt-2">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-gray-400">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>{r.default_branch}</span>
                    </div>
                    
                    {/* Status badge */}
                    {latest && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        latest.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        latest.status === 'failed' ? 'bg-red-500/15 text-red-405' :
                        'bg-amber-500/15 text-amber-400 animate-pulse'
                      }`}>
                        {latest.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                         latest.status === 'failed' ? <AlertCircle className="w-3 h-3" /> :
                         <RefreshCw className="w-3 h-3 animate-spin" />}
                        {latest.status.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => handleTriggerAnalysis(e, r.id)}
                      disabled={isProcessing}
                      className="p-2 rounded-lg bg-glass-bg hover:bg-glass-hover border border-glass-border hover:border-brand-blue/30 text-gray-400 hover:text-white transition-all disabled:opacity-40"
                      title="Run audit again"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      className="p-2 rounded-lg bg-glass-bg hover:bg-glass-hover border border-glass-border text-gray-400 hover:text-brand-blue transition-all"
                      title="Audit dashboard details"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* URL Link Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md bg-slate-850 border border-glass-border rounded-2xl shadow-2xl p-6 glass-panel">
            <h3 className="text-lg font-bold text-gray-200 mb-4">Link GitHub Repository</h3>
            <form onSubmit={handleCreateRepo} className="flex flex-col gap-4">
              {submitError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {submitError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-450 uppercase tracking-wider mb-2">GitHub URL</label>
                <input 
                  required
                  type="url" 
                  placeholder="https://github.com/owner/project"
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
                    <>Run Analysis</>
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

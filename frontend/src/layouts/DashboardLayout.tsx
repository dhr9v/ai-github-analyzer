import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderGit2, 
  Settings as SettingsIcon, 
  Search, 
  Menu, 
  X,
  Sparkles,
  Terminal,
  BookOpen
} from 'lucide-react';
import api from '../services/api';
import { SearchResultItem } from '../types';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Global hotkey '/' for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Local Search logic using LocalStorage
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setSearching(true);
        const query = searchQuery.toLowerCase();
        const localResults: SearchResultItem[] = [];

        try {
          const reposData = localStorage.getItem('auditor_repositories');
          const repositories = reposData ? JSON.parse(reposData) : [];

          repositories.forEach((repo: any) => {
            // 1. Match repository name or url
            if (repo.name.toLowerCase().includes(query) || repo.url.toLowerCase().includes(query)) {
              localResults.push({
                type: 'repository',
                title: repo.name,
                subtitle: `GitHub URL: ${repo.url}`,
                repo_id: repo.id,
                item_id: repo.id,
                path: null,
                line: null,
                analysis_id: null
              });
            }

            // Match within analyses
            if (repo.analyses && Array.isArray(repo.analyses)) {
              repo.analyses.forEach((analysis: any) => {
                if (analysis.status === 'completed') {
                  // 2. Match within issues
                  if (analysis.issues && Array.isArray(analysis.issues)) {
                    analysis.issues.forEach((issue: any) => {
                      if (issue.message.toLowerCase().includes(query) || issue.file_path.toLowerCase().includes(query)) {
                        localResults.push({
                          type: 'issue',
                          title: `Issue in ${issue.file_path.split('/').pop()} (Line ${issue.line_number || '-'})`,
                          subtitle: issue.message,
                          path: issue.file_path,
                          line: issue.line_number,
                          analysis_id: analysis.id,
                          repo_id: repo.id,
                          item_id: issue.id
                        });
                      }
                    });
                  }

                  // 3. Match within complex methods
                  if (analysis.complexity_data && analysis.complexity_data.most_complex_methods) {
                    analysis.complexity_data.most_complex_methods.forEach((m: any) => {
                      const mName = m.name || '';
                      const mFile = m.file || '';
                      const mType = m.type || 'method';
                      if (mName.toLowerCase().includes(query) || mFile.toLowerCase().includes(query)) {
                        localResults.push({
                          type: mType === 'function' ? 'function' : 'class',
                          title: `${mType.charAt(0).toUpperCase() + mType.slice(1)}: ${mName}`,
                          subtitle: `Complexity: ${m.complexity} in ${mFile} (Line ${m.lineno})`,
                          path: mFile,
                          line: m.lineno,
                          analysis_id: analysis.id,
                          repo_id: repo.id,
                          item_id: analysis.id
                        });
                      }
                    });
                  }
                }
              });
            }
          });

          setSearchResults(localResults.slice(0, 50));
        } catch (err) {
          console.error("Local search failed:", err);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Repositories', path: '/repos', icon: FolderGit2 },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const handleSearchItemClick = (item: SearchResultItem) => {
    setSearchOpen(false);
    setSearchQuery('');
    
    if (item.type === 'repository') {
      navigate(`/repos/${item.repo_id}`);
    } else if (item.type === 'issue' || item.type === 'function' || item.type === 'class') {
      navigate(`/repos/${item.repo_id}?analysisId=${item.analysis_id}&tab=issues&filePath=${encodeURIComponent(item.path || '')}`);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col md:flex-row relative">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-glass-bg border-b border-glass-border z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-glass-border flex items-center justify-center text-brand-blue">
            <Terminal className="w-4.5 h-4.5" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">Seven AI</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400 hover:text-white">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 w-64 glass-sidebar p-6 flex flex-col justify-between z-40 transform md:translate-x-0 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:relative md:h-full'}`}>
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-glass-border flex items-center justify-center text-brand-blue shadow-inner">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-white leading-none mb-1">Seven AI</h1>
              <span className="text-[9px] text-brand-cyan font-mono tracking-widest font-bold uppercase block">powered by ai</span>
            </div>
          </div>

          {/* Quick Search trigger */}
          <button 
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-850 border border-glass-border hover:border-brand-blue/30 text-gray-400 text-sm transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>Search...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-xs bg-slate-750 rounded border border-glass-border font-mono text-gray-500">/</kbd>
          </button>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active 
                      ? 'bg-gradient-to-r from-brand-blue/10 to-brand-indigo/10 border border-brand-blue/25 text-brand-blue' 
                      : 'border border-transparent text-gray-400 hover:text-white hover:bg-glass-hover'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${active ? 'text-brand-blue' : ''}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Info & Settings Footer */}
        <div className="flex flex-col gap-4 border-t border-glass-border pt-4 mt-auto">
          <button 
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 border border-transparent hover:border-brand-blue/20 transition-all duration-200"
          >
            <BookOpen className="w-4 h-4" />
            How to Use
          </button>
          
          <div className="text-[10px] text-gray-500 mt-2 flex flex-col gap-0.5 px-3">
            <span>made by</span>
            <span className="text-gray-300 font-semibold text-xs mb-1">Dhruv Jain</span>
            <a href="https://www.linkedin.com/in/dhr9v" target="_blank" rel="noreferrer" className="hover:text-brand-blue transition-colors">www.linkedin.com/in/dhr9v</a>
            <a href="https://github.com/dhr9v" target="_blank" rel="noreferrer" className="hover:text-brand-blue transition-colors">https://github.com/dhr9v</a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 z-10 overflow-y-auto h-full">
        {children}
      </main>

      {/* Global Search Overlay Modal */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4 z-50 transition-all duration-300">
          <div className="w-full max-w-2xl bg-slate-850 border border-glass-border rounded-xl shadow-2xl overflow-hidden glass-panel">
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-glass-border">
              <Search className="w-5 h-5 text-gray-400" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search files, components, functions, or detected vulnerabilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder-gray-500 font-sans"
              />
              <button 
                onClick={() => setSearchOpen(false)}
                className="px-2 py-1 text-xs bg-slate-750 rounded border border-glass-border text-gray-400 hover:text-white"
              >
                ESC
              </button>
            </div>

            {/* Results Body */}
            <div className="max-h-[350px] overflow-y-auto p-2">
              {searching ? (
                <div className="py-12 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                  Searching codebase...
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Type at least 2 characters to run a search.
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No matching repositories, files, issues, or functions found.
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {searchResults.map((item) => (
                    <button
                      key={`${item.type}-${item.item_id}`}
                      onClick={() => handleSearchItemClick(item)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-glass-hover border border-transparent hover:border-glass-border flex items-center justify-between group transition-all duration-150"
                    >
                      <div>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mr-3 inline-block ${
                          item.type === 'repository' ? 'bg-brand-blue/20 text-brand-blue' :
                          item.type === 'issue' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-sm font-semibold text-gray-200 group-hover:text-white">{item.title}</span>
                        <p className="text-xs text-gray-500 truncate max-w-lg mt-0.5">{item.subtitle}</p>
                      </div>
                      {item.line && (
                        <span className="text-xs font-mono text-gray-500">Line {item.line}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Search footer */}
            <div className="bg-black/25 px-4 py-2 border-t border-glass-border flex justify-between text-[11px] text-gray-600 font-mono">
              <span>Use ↑↓ keys to navigate</span>
              <span>Press / to open search anywhere</span>
            </div>
          </div>
        </div>
      )}

      {/* How to Use Modal */}
      {helpOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md bg-slate-850 border border-glass-border rounded-2xl shadow-2xl p-6 glass-panel flex flex-col gap-4 text-left">
            <div className="flex justify-between items-center border-b border-glass-border pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-blue" />
                How to Use Seven AI
              </h3>
              <button onClick={() => setHelpOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-gray-300 flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
              <div>
                <span className="font-bold text-brand-blue block mb-1">1. Setup Gemini API Key</span>
                <p className="text-xs text-gray-400">
                  Navigate to the <strong>Settings</strong> page from the sidebar menu. Enter your Google Gemini API Key (get one free from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-brand-cyan hover:underline">Google AI Studio</a>).
                </p>
              </div>
              <div>
                <span className="font-bold text-brand-blue block mb-1">2. Add a Repository</span>
                <p className="text-xs text-gray-400">
                  Go to the <strong>Dashboard</strong> and click the <strong>Add Repository</strong> button. You can paste a public GitHub URL (e.g., <code>https://github.com/expressjs/express</code>) or upload a local project as a <strong>ZIP file</strong>.
                </p>
              </div>
              <div>
                <span className="font-bold text-brand-blue block mb-1">3. Run Code Audits</span>
                <p className="text-xs text-gray-400">
                  The stateless backend will clone the repository (or extract the ZIP) into memory, run local static checks (<strong>Ruff</strong>, <strong>Bandit</strong>, and <strong>Radon complexity metrics</strong>), and invoke <strong>Gemini</strong> to scan critical files.
                </p>
              </div>
              <div>
                <span className="font-bold text-brand-blue block mb-1">4. Review Reports & Chat</span>
                <p className="text-xs text-gray-400">
                  Click on any repository to view scores, vulnerabilities, and suggestions. Generate unit tests, compile exportable reports (PDF/HTML/Markdown), or chat directly with the AI about your codebase.
                </p>
              </div>
              <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-3 text-xs text-gray-400 flex flex-col gap-1">
                <span className="font-bold text-brand-cyan">🔒 100% Private & Serverless</span>
                <p>All repositories, code analysis results, and API Keys are stored locally in your browser's <code>localStorage</code>. No data is saved on the server database, meaning your code stays private.</p>
              </div>
            </div>
            <button 
              onClick={() => setHelpOpen(false)}
              className="mt-2 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-indigo text-white font-semibold text-sm hover:opacity-90 shadow-md shadow-brand-blue/15"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

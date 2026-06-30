import React, { useState, useEffect } from 'react';
import { Sparkles, Shield, Key, Eye, EyeOff, Save, AlertCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const [model, setModel] = useState('gemini-2.5-flash');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [githubPat, setGithubPat] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchSettings = () => {
      try {
        const stored = localStorage.getItem('auditor_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          setModel(parsed.gemini_model || 'gemini-2.5-flash');
          setGeminiApiKey(parsed.gemini_api_key || '');
          setGithubPat(parsed.github_pat || '');
          setSystemPrompt(parsed.custom_system_prompt || '');
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const newSettings = {
        gemini_model: model,
        gemini_api_key: geminiApiKey ? geminiApiKey : null,
        github_pat: githubPat ? githubPat : null,
        custom_system_prompt: systemPrompt ? systemPrompt : null
      };
      localStorage.setItem('auditor_settings', JSON.stringify(newSettings));
      setMessage({ text: "Configurations saved successfully in browser local storage.", type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: "Failed to save settings.", type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm">Fetching settings profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">Auditor Settings</h1>
        <p className="text-sm text-gray-400">Configure LLM choices, credentials, and code review rulesets</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border-red-500/25 text-red-400'
        }`}>
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Gemini API Key input */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
            <Key className="w-5 h-5 text-brand-blue" />
            <span>Gemini API Authentication</span>
          </div>
          <p className="text-xs text-gray-550 leading-relaxed font-light">
            Enter your Google Gemini API Key. You can get one for free from the <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-brand-cyan hover:underline font-semibold">Google AI Studio</a>.
            This key is saved locally in your browser's private local storage, keeping your credentials secure.
          </p>

          <div className="relative mt-2">
            <input 
              type={showApiKey ? "text" : "password"}
              placeholder="AIzaSy..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full bg-slate-900 border border-glass-border focus:border-brand-blue/50 text-gray-200 rounded-xl py-3 pl-4 pr-12 text-sm outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Gemini Model Selector */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
            <Sparkles className="w-5 h-5 text-brand-blue" />
            <span>Google Gemini Model Configuration</span>
          </div>
          <p className="text-xs text-gray-550 leading-relaxed font-light">
            Select the model that fits your review budget and depth requirements. 
            Gemini 2.5 Flash is recommended for lightning fast analyses, while Pro provides deeper structural reviews.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <label className={`p-4 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
              model === 'gemini-2.5-flash' ? 'bg-brand-blue/5 border-brand-blue' : 'bg-slate-900 border-glass-border hover:border-glass-border/10'
            }`}>
              <input 
                type="radio" 
                name="geminiModel" 
                value="gemini-2.5-flash" 
                checked={model === 'gemini-2.5-flash'}
                onChange={() => setModel('gemini-2.5-flash')}
                className="sr-only"
              />
              <span className="font-bold text-xs text-gray-250">Gemini 2.5 Flash (Default)</span>
              <span className="text-[10px] text-gray-500 font-light mt-1">Extremely fast audits, highly cost-effective, great for routine push checks.</span>
            </label>

            <label className={`p-4 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
              model === 'gemini-2.5-pro' ? 'bg-brand-blue/5 border-brand-blue' : 'bg-slate-900 border-glass-border hover:border-glass-border/10'
            }`}>
              <input 
                type="radio" 
                name="geminiModel" 
                value="gemini-2.5-pro" 
                checked={model === 'gemini-2.5-pro'}
                onChange={() => setModel('gemini-2.5-pro')}
                className="sr-only"
              />
              <span className="font-bold text-xs text-gray-250">Gemini 2.5 Pro (Optional)</span>
              <span className="text-[10px] text-gray-500 font-light mt-1">Deep architectural audits, advanced logic tracking, optimized for high security checks.</span>
            </label>
          </div>
        </div>

        {/* GitHub PAT overrides */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
            <Key className="w-5 h-5 text-brand-blue" />
            <span>GitHub Access Authentication</span>
          </div>
          <p className="text-xs text-gray-550 leading-relaxed font-light">
            If you wish to scan private repositories owned by you or your organization, input a GitHub Personal Access Token (PAT). 
            This token is saved securely in your database context and is never exposed.
          </p>

          <div className="relative mt-2">
            <input 
              type={showPat ? "text" : "password"}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={githubPat}
              onChange={(e) => setGithubPat(e.target.value)}
              className="w-full bg-slate-900 border border-glass-border focus:border-brand-blue/50 text-gray-200 rounded-xl py-3 pl-4 pr-12 text-sm outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPat(!showPat)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Custom prompts rulesets */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
            <Shield className="w-5 h-5 text-brand-blue" />
            <span>Custom System instructions</span>
          </div>
          <p className="text-xs text-gray-550 leading-relaxed font-light">
            Inject custom rules or guidelines directly into Gemini review system instructions. (e.g. "Enforce SOLID principles", "Check PEP8 guidelines strictly", "Check React components styling overrides").
          </p>

          <textarea
            placeholder="e.g. You are a code review assistant. Focus heavily on memory leaks and Python asynchronous concurrency checks..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={5}
            className="w-full bg-slate-900 border border-glass-border focus:border-brand-blue/50 text-gray-200 rounded-xl py-3 px-4 text-xs outline-none transition-colors font-sans leading-5"
          />
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-blue to-brand-indigo text-white font-semibold text-sm flex items-center justify-center gap-2 hover:scale-[1.01] hover:opacity-95 shadow-md shadow-brand-blue/15 transition-all self-end disabled:opacity-55"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Configurations
            </>
          )}
        </button>
      </form>
    </div>
  );
};

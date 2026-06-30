export interface User {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface Setting {
  gemini_model: string;
  gemini_api_key: string | null;
  github_pat: string | null;
  custom_system_prompt: string | null;
}

export interface Repository {
  id: number;
  name: string;
  url: string;
  owner: string;
  default_branch: string;
  current_commit: string | null;
  created_at: string;
  user_id: number;
  analyses?: Analysis[];
}

export interface Issue {
  id: number;
  analysis_id: number;
  file_path: string;
  line_number: number | null;
  category: string;
  severity: string;
  tool: string;
  message: string;
  code_snippet: string | null;
  suggested_fix: string | null;
}

export interface ComplexMethod {
  file: string;
  name: string;
  type: string;
  complexity: number;
  lineno: number;
}

export interface FileMetric {
  file_path: string;
  mi: number;
  cc_average: number;
  loc: number;
}

export interface ComplexityData {
  average_cyclomatic_complexity: number;
  average_maintainability_index: number;
  total_halstead_volume: number;
  total_halstead_difficulty: number;
  total_halstead_bugs: number;
  file_count: number;
  function_count: number;
  mi_distribution: { A: number; B: number; C: number };
  most_complex_methods: ComplexMethod[];
  file_metrics: FileMetric[];
}

export interface Analysis {
  id: number;
  repo_id: number;
  status: 'pending' | 'cloning' | 'analyzing' | 'completed' | 'failed';
  branch: string;
  commit_hash: string | null;
  overall_score: number;
  security_score: number;
  performance_score: number;
  maintainability_score: number;
  documentation_score: number;
  testing_score: number;
  architecture_score: number;
  executive_summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  refactoring_suggestions: string[] | null;
  complexity_data: ComplexityData | null;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  issues?: Issue[];
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatConversation {
  id: number;
  repo_id: number;
  title: string;
  created_at: string;
  messages?: ChatMessage[];
}

export interface SearchResultItem {
  type: 'file' | 'issue' | 'repository' | 'function' | 'class';
  title: string;
  subtitle: string;
  path: string | null;
  line: number | null;
  repo_id: number | null;
  analysis_id: number | null;
  item_id: number;
}

export interface DashboardStats {
  total_repositories: number;
  total_analyses: number;
  average_health_score: number;
  total_issues_detected: number;
  issues_by_severity: { [key: string]: number };
  issues_by_category: { [key: string]: number };
  recent_activity: {
    repo_name: string;
    repo_id: number;
    analysis_id: number;
    status: string;
    score: number;
    created_at: string;
  }[];
}

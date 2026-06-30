# AI Code Reviewer

A stateless code review tool that analyzes GitHub repositories using Google's Gemini API.

## Overview
This tool performs deep static analysis on Python codebases and uses AI to generate actionable insights. It operates entirely without a database—your API keys, analysis history, and chat logs are stored securely in your browser's local storage.

## Features

### 🔍 Deep Static Analysis
- **Complexity Metrics**: Uses `radon` to compute Cyclomatic Complexity (CC), Maintainability Index (MI), and Halstead metrics to identify overly complex functions.
- **Security Audits**: Integrates `bandit` to scan AST nodes and flag common security vulnerabilities.
- **Linting & Style Checks**: Runs `ruff` to enforce best practices and clean code standards.

### 🧠 AI-Powered Insights
- **Executive Summaries**: Leverages Gemini 2.5 to read your static analysis metrics and generate high-level summaries, strengths, and critical weaknesses.
- **Actionable Refactoring**: Provides targeted refactoring recommendations based on the most complex files in the codebase.
- **Health Scores**: Computes overall health, security, performance, maintainability, documentation, testing, and architecture scores (0-100 scale).

### 💬 Interactive AI Workspace
- **Context-Aware Chat**: Chat directly with your codebase. The AI knows the repository's metrics, security issues, and logic flow, allowing you to ask specific architectural or debugging questions.
- **Test Suite Generator**: Automatically writes `pytest` unit tests for the most complex methods identified during the audit.
- **Documentation Generator**: Automatically generates technical documentation and docstrings for complex classes and functions.

### 📊 Dashboard & UI
- **Local Search**: Press `/` to quickly fuzzy-search through all your audited repositories, files, detected issues, and complex methods.
- **Issue Filtering**: Filter the audit findings by severity (Critical, Warning, Info) and category (Security, Performance, Bug, Style).
- **Complexity Visualizations**: Interactive pie charts and metric boards to easily visualize maintainability grades across the codebase.

### 📄 Exportable Reports
- **On-the-Fly Generation**: Compiles the audit findings into downloadable reports instantly.
- **Multiple Formats**: Export your code reviews as formatted PDFs, GitHub-ready Markdown, standalone HTML dashboards, or raw JSON payloads.

### 🔒 100% Stateless & Private
- **Zero Database Setup**: No Supabase, PostgreSQL, or SQLite required.
- **Local Storage**: All data, including your Gemini API key and audit history, stays exclusively in your browser's local storage.
- **Secure Processing**: The backend only serves as a transient processing pipeline and never stores repository data on disk permanently.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Vite, Recharts, Lucide Icons
- **Backend**: FastAPI, Python 3.12, GitPython, ReportLab (for PDF exports)
- **AI/LLM**: Google GenAI SDK (Gemini 2.5)

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.12+)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/dhr9v/ai-github-analyzer.git
cd ai-github-analyzer
```

2. **Start the Backend**
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`.

3. **Start the Frontend**
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## Usage
Once running, navigate to the **Settings** tab in the UI to input your Gemini API Key. Then, go to the **Dashboard** and enter any public GitHub repository URL to begin an audit.

## License
MIT

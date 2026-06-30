# Seven AI

> **AI-powered software quality platform for intelligent GitHub repository analysis.**

Seven AI combines industry-standard static analysis with Google's Gemini AI to perform comprehensive code reviews, detect security vulnerabilities, evaluate maintainability, and provide actionable recommendations—all through a modern, stateless web application.

Unlike traditional AI code reviewers, Seven AI first performs deterministic code analysis using professional developer tools before allowing Gemini to reason over the results, producing more accurate and context-aware insights.

---

## ✨ Features

### 🔍 Deep Static Analysis

Seven AI performs a complete audit of Python repositories using trusted open-source tooling.

- **Complexity Analysis**
  - Cyclomatic Complexity (CC)
  - Maintainability Index (MI)
  - Halstead Metrics
  - Complex function detection using **Radon**

- **Security Auditing**
  - AST-based vulnerability scanning
  - Common Python security issue detection
  - Powered by **Bandit**

- **Code Quality**
  - Linting
  - Style enforcement
  - Best practice validation
  - Powered by **Ruff**

---

## 🧠 AI-Powered Repository Intelligence

After collecting static analysis metrics, Gemini 2.5 generates intelligent repository insights.

- Executive repository summaries
- Architecture understanding
- Code quality assessment
- Refactoring recommendations
- Performance observations
- Maintainability analysis
- Documentation suggestions

### Repository Health Scores

Seven AI calculates scores across multiple categories.

- 🟢 Overall Health
- 🔒 Security
- ⚡ Performance
- 🧩 Maintainability
- 📚 Documentation
- ✅ Testing
- 🏗️ Architecture

---

## 💬 Interactive AI Workspace

Chat directly with your repository.

Gemini understands:

- repository structure
- complexity metrics
- detected security issues
- maintainability reports
- code relationships

You can ask questions like:

- "Which module should I refactor first?"
- "Why is this repository difficult to maintain?"
- "Explain this architecture."
- "Generate tests for this class."
- "Write documentation for these functions."

---

## 🧪 Automatic Code Generation

Seven AI can automatically generate:

- ✅ Pytest unit tests
- ✅ Function documentation
- ✅ Class docstrings
- ✅ Refactoring suggestions

---

## 📊 Interactive Dashboard

The dashboard provides an overview of your repository through interactive visualizations.

Features include:

- Repository health overview
- Complexity distribution charts
- Maintainability visualizations
- Issue severity breakdown
- Search across repositories
- File explorer
- Smart issue filtering

Press **/** anywhere to instantly search repositories, files, issues, and complex methods.

---

## 📄 Export Reports

Generate professional reports instantly.

Supported formats:

- PDF
- Markdown
- HTML
- JSON

Perfect for documentation, GitHub issues, audits, and sharing with teams.

---

## 🔒 Stateless & Privacy First

Seven AI never stores your repositories permanently.

- No database
- No authentication
- No cloud storage
- No repository history stored on the server

All user data—including:

- Gemini API Key
- Analysis history
- Chat history
- Preferences

remains securely inside your browser's Local Storage.

Repositories exist only during analysis and are immediately discarded afterwards.

---

# 🏗️ Architecture

```text
GitHub Repository
        │
        ▼
 Repository Clone
        │
        ▼
Static Analysis
 ├── Ruff
 ├── Bandit
 └── Radon
        │
        ▼
Repository Intelligence
        │
        ▼
 Gemini 2.5
        │
        ▼
Dashboard • Chat • Reports
```

---

# 🛠️ Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide Icons

## Backend

- FastAPI
- Python 3.12
- GitPython
- ReportLab

## AI

- Google Gemini 2.5
- Google GenAI SDK

---

# 🚀 Getting Started

## Prerequisites

- Node.js 18+
- Python 3.12+
- Google Gemini API Key

---

## Installation

### Clone the repository

```bash
git clone https://github.com/dhr9v/ai-github-analyzer.git
cd ai-github-analyzer
```

---

### Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend runs on:

```
http://localhost:8000
```

---

### Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---

# 📖 Usage

1. Open Seven AI.
2. Navigate to **Settings**.
3. Enter your Gemini API Key.
4. Go to **Dashboard**.
5. Paste any public GitHub repository URL.
6. Start the audit.
7. Explore AI insights, repository health, interactive chat, and downloadable reports.

---

# 🎯 Why Seven AI?

Traditional AI code reviewers rely almost entirely on LLMs.

Seven AI combines deterministic static analysis with modern AI reasoning, allowing Gemini to understand real software metrics before making recommendations.

This produces reviews that are more accurate, explainable, and actionable.

---

# 📜 License

MIT License

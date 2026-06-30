# AI Code Reviewer

A stateless code review tool that analyzes GitHub repositories using Google's Gemini API.

## Overview
This tool performs deep static analysis on Python codebases and uses AI to generate actionable insights. It operates entirely without a database—your API keys and analysis history are stored securely in your browser's local storage.

## Features
- **Stateless Architecture**: Zero database setup required.
- **Static Analysis Engine**: Leverages `radon`, `ruff`, and `bandit` to compute cyclomatic complexity, code maintainability, and security vulnerabilities.
- **AI-Powered Insights**: Uses Gemini 2.5 to read your metrics and generate executive summaries, highlight strengths/weaknesses, and suggest refactoring.
- **Interactive Chat & Generators**: Chat directly with your codebase context or ask the AI to generate missing unit tests and documentation.
- **Exportable Reports**: Generate compiled PDF, Markdown, HTML, and JSON reports on the fly.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: FastAPI, Python 3.12, GitPython, ReportLab

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

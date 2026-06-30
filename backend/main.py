from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.repo import router as repo_router
from backend.api.chat import router as chat_router
from backend.api.reports import router as reports_router
from backend.api.generation import router as generation_router

app = FastAPI(
    title="AI GitHub Code Reviewer",
    description="Stateless Production-Ready AI-Powered Code Reviewer SaaS API",
    version="1.0.0"
)

# CORS configuration for local/hosted UI integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register versioned stateless API routers
app.include_router(repo_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(generation_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AI GitHub Code Reviewer API (Stateless)",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

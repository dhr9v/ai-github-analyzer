FROM python:3.12-slim

# Install git CLI (mandatory for GitPython cloner logic) and compilation helpers
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/backend

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

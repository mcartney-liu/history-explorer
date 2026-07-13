from fastapi import FastAPI

app = FastAPI(
    title="History Explorer API",
    description="Backend API service foundation for History Explorer.",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "project": "History Explorer",
        "status": "running",
        "service": "backend",
    }

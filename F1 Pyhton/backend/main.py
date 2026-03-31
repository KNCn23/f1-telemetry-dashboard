from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import f1_service
import uvicorn
from typing import Optional

app = FastAPI(title="F1 Telemetri Paneli API")

# Ön yüz (Vite) farklı bir portta (örn. 5173) çalışacağı için CORS izinleri
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Geliştirme ortamı için esnek
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "F1 Dashboard API çalışıyor."}

@app.get("/api/years")
def get_years():
    return f1_service.get_available_years()

@app.get("/api/races/{year}")
def get_races(year: int):
    try:
        return f1_service.get_schedule(year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{year}/{round_number}")
def get_sessions(year: int, round_number: int):
    try:
        return f1_service.get_sessions(year, round_number)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/drivers/{year}/{round_number}/{session_id}")
def get_drivers(year: int, round_number: int, session_id: int):
    try:
        return f1_service.get_drivers(year, round_number, session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/telemetry/{year}/{round_number}/{session_id}")
def get_telemetry(
    year: int, 
    round_number: int, 
    session_id: int, 
    driver1: str = Query(..., description="1. Sürücü (örn. VER)"), 
    driver2: Optional[str] = Query(None, description="2. Sürücü (karşılaştırma için)")
):
    try:
        return f1_service.get_telemetry(year, round_number, session_id, driver1, driver2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

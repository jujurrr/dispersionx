# DispersionX — Backend IBKR (FastAPI + ib_insync)
# Phase 3 : service always-on qui maintient la connexion socket à IB Gateway/TWS.
# Lancement : uvicorn main:app --host 0.0.0.0 --port 8000
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware

from ib_service import IBService

IB_HOST = os.getenv("IB_HOST", "127.0.0.1")
IB_PORT = int(os.getenv("IB_PORT", "4002"))          # 4002 = Gateway paper, 4001 = Gateway live
IB_CLIENT_ID = int(os.getenv("IB_CLIENT_ID", "11"))
BACKEND_TOKEN = os.getenv("BACKEND_TOKEN", "")        # protège l'API (doit matcher le proxy Netlify)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

ib = IBService(IB_HOST, IB_PORT, IB_CLIENT_ID)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ib.connect()       # connexion au démarrage
    yield
    await ib.disconnect()    # déconnexion propre à l'arrêt


app = FastAPI(title="DispersionX IBKR Backend", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


def auth(authorization: str = Header(default="")):
    """Vérifie le bearer token si BACKEND_TOKEN est défini."""
    if BACKEND_TOKEN:
        if authorization != f"Bearer {BACKEND_TOKEN}":
            raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
async def health():
    return {"status": "ok" if ib.connected else "disconnected", "ib_connected": ib.connected}


@app.get("/quote", dependencies=[Depends(auth)])
async def quote(symbols: str):
    """Derniers prix temps réel. ?symbols=AAPL,MSFT"""
    syms = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not syms:
        return []
    try:
        return await ib.quotes(syms)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/options/atm", dependencies=[Depends(auth)])
async def options_atm(symbol: str, dte: int = 30):
    """IV ATM + greeks temps réel IBKR (straddle ATM)."""
    try:
        return await ib.atm_greeks(symbol.upper(), dte)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(e))

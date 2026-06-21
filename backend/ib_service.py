# Wrapper ib_insync : connexion persistante + requêtes prix / greeks ATM.
# ib_insync est asyncio-natif → s'intègre à la boucle d'événements de FastAPI.
import asyncio
from datetime import datetime, date

from ib_insync import IB, Stock, Option, util


class IBService:
    def __init__(self, host: str, port: int, client_id: int):
        self.host = host
        self.port = port
        self.client_id = client_id
        self.ib = IB()

    @property
    def connected(self) -> bool:
        return self.ib.isConnected()

    async def connect(self):
        if not self.ib.isConnected():
            try:
                await self.ib.connectAsync(self.host, self.port, clientId=self.client_id, timeout=15)
            except Exception as e:  # noqa: BLE001
                print(f"[IB] connexion échouée : {e}")

    async def disconnect(self):
        if self.ib.isConnected():
            self.ib.disconnect()

    async def _ensure(self):
        if not self.ib.isConnected():
            await self.connect()
        if not self.ib.isConnected():
            raise RuntimeError("IB Gateway non connecté")

    # ── Prix temps réel ──────────────────────────────────────────
    async def quotes(self, symbols: list[str]):
        await self._ensure()
        contracts = [Stock(s, "SMART", "USD") for s in symbols]
        await self.ib.qualifyContractsAsync(*contracts)
        tickers = await self.ib.reqTickersAsync(*contracts)
        out = []
        for s, t in zip(symbols, tickers):
            price = t.marketPrice() or t.last or t.close
            prev = t.close
            day = ((price - prev) / prev * 100) if (price and prev) else None
            out.append({
                "ticker": s,
                "price": round(price, 2) if price else None,
                "day": round(day, 2) if day is not None else None,
                "week": None,
            })
        return out

    # ── IV ATM + greeks (straddle) ───────────────────────────────
    async def atm_greeks(self, symbol: str, dte: int):
        await self._ensure()
        stock = Stock(symbol, "SMART", "USD")
        await self.ib.qualifyContractsAsync(stock)

        # Prix spot
        [stk_ticker] = await self.ib.reqTickersAsync(stock)
        spot = stk_ticker.marketPrice() or stk_ticker.last or stk_ticker.close
        if not spot:
            raise RuntimeError("prix spot indisponible")

        # Chaîne d'options
        chains = await self.ib.reqSecDefOptParamsAsync(stock.symbol, "", stock.secType, stock.conId)
        chain = next((c for c in chains if c.exchange == "SMART"), chains[0] if chains else None)
        if not chain:
            raise RuntimeError("chaîne d'options introuvable")

        # Échéance la plus proche du DTE demandé
        today = date.today()
        def dte_of(exp: str) -> int:
            return (datetime.strptime(exp, "%Y%m%d").date() - today).days
        expirations = sorted(chain.expirations, key=lambda e: abs(dte_of(e) - dte))
        expiry = expirations[0]

        # Strike ATM
        strike = min(chain.strikes, key=lambda k: abs(k - spot))

        call = Option(symbol, expiry, strike, "C", "SMART", tradingClass=chain.tradingClass)
        await self.ib.qualifyContractsAsync(call)

        # Greeks modèle via reqMktData (tick 13 = modelGreeks)
        ticker = self.ib.reqMktData(call, genericTickList="13", snapshot=False)
        # laisse IB renvoyer les greeks
        for _ in range(20):
            await asyncio.sleep(0.25)
            if ticker.modelGreeks and ticker.modelGreeks.impliedVol:
                break
        g = ticker.modelGreeks
        self.ib.cancelMktData(call)
        if not g:
            raise RuntimeError("greeks indisponibles (souscription données options ?)")

        iso = datetime.strptime(expiry, "%Y%m%d").date().isoformat()
        return {
            "symbol": symbol,
            "underlying_price": round(spot, 2),
            "strike": strike,
            "expiry": iso,
            "dte": dte_of(expiry),
            "iv": round(g.impliedVol * 100, 1) if g.impliedVol else None,
            "greeks": {
                "delta": round(g.delta, 3) if g.delta is not None else None,
                "gamma": round(g.gamma, 4) if g.gamma is not None else None,
                "vega": round(g.vega, 1) if g.vega is not None else None,
                "theta": round(g.theta, 1) if g.theta is not None else None,
                "strike": strike,
                "expiry": iso,
            },
            "source": "ibkr",
        }

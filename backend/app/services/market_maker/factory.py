from app.services.market_maker.base import MarketMaker
from app.services.market_maker.lmsr import LMSRMarketMaker

_makers: dict[str, MarketMaker] = {
    "lmsr": LMSRMarketMaker(),
}


def get_market_maker(amm_type: str = "lmsr") -> MarketMaker:
    maker = _makers.get(amm_type)
    if maker is None:
        raise ValueError(f"Unknown AMM type: {amm_type}")
    return maker

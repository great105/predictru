from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass
class MarketState:
    q_yes: Decimal
    q_no: Decimal
    liquidity_b: Decimal


class MarketMaker(Protocol):
    def get_price(self, state: MarketState, outcome: str) -> float:
        """Get current price for an outcome (0.0 to 1.0)."""
        ...

    def get_cost(self, state: MarketState, outcome: str, shares: float) -> float:
        """Get cost to buy `shares` of an outcome."""
        ...

    def get_shares_for_amount(
        self, state: MarketState, outcome: str, amount: float
    ) -> float:
        """Get number of shares purchasable for `amount`."""
        ...

    def get_sale_revenue(
        self, state: MarketState, outcome: str, shares: float
    ) -> float:
        """Get revenue from selling `shares` of an outcome."""
        ...

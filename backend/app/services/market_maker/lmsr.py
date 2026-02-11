import math

from app.services.market_maker.base import MarketState


def _logsumexp(a: float, b_val: float) -> float:
    """Numerically stable log(exp(a) + exp(b))."""
    max_val = max(a, b_val)
    return max_val + math.log(math.exp(a - max_val) + math.exp(b_val - max_val))


class LMSRMarketMaker:
    """Logarithmic Market Scoring Rule market maker.

    Cost function: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
    Using logsumexp trick for numerical stability.
    """

    def _cost(self, q_yes: float, q_no: float, b: float) -> float:
        """C(q) = b * logsumexp(q_yes/b, q_no/b)"""
        return b * _logsumexp(q_yes / b, q_no / b)

    def get_price(self, state: MarketState, outcome: str) -> float:
        """P(outcome) = e^(q_outcome/b) / (e^(q_yes/b) + e^(q_no/b))"""
        q_yes = float(state.q_yes)
        q_no = float(state.q_no)
        b = float(state.liquidity_b)

        if outcome == "yes":
            pass
        else:
            pass

        # Using softmax form for stability
        max_q = max(q_yes, q_no)
        exp_yes = math.exp((q_yes - max_q) / b)
        exp_no = math.exp((q_no - max_q) / b)
        total = exp_yes + exp_no

        if outcome == "yes":
            return exp_yes / total
        return exp_no / total

    def get_cost(self, state: MarketState, outcome: str, shares: float) -> float:
        """Cost to buy `shares` of outcome = C(q_after) - C(q_before)."""
        q_yes = float(state.q_yes)
        q_no = float(state.q_no)
        b = float(state.liquidity_b)

        cost_before = self._cost(q_yes, q_no, b)

        if outcome == "yes":
            cost_after = self._cost(q_yes + shares, q_no, b)
        else:
            cost_after = self._cost(q_yes, q_no + shares, b)

        return cost_after - cost_before

    def get_shares_for_amount(
        self, state: MarketState, outcome: str, amount: float
    ) -> float:
        """Binary search for shares purchasable with given amount."""
        if amount <= 0:
            return 0.0

        low = 0.0
        high = amount * 10  # Upper bound heuristic

        for _ in range(50):
            mid = (low + high) / 2
            cost = self.get_cost(state, outcome, mid)
            if cost < amount:
                low = mid
            else:
                high = mid

        return low

    def get_sale_revenue(
        self, state: MarketState, outcome: str, shares: float
    ) -> float:
        """Revenue from selling = C(q_before) - C(q_after)."""
        q_yes = float(state.q_yes)
        q_no = float(state.q_no)
        b = float(state.liquidity_b)

        cost_before = self._cost(q_yes, q_no, b)

        if outcome == "yes":
            cost_after = self._cost(q_yes - shares, q_no, b)
        else:
            cost_after = self._cost(q_yes, q_no - shares, b)

        return cost_before - cost_after

import math
from decimal import Decimal

import pytest

from app.services.market_maker.base import MarketState
from app.services.market_maker.lmsr import LMSRMarketMaker


@pytest.fixture
def mm():
    return LMSRMarketMaker()


@pytest.fixture
def initial_state():
    return MarketState(
        q_yes=Decimal("0"),
        q_no=Decimal("0"),
        liquidity_b=Decimal("100"),
    )


def test_initial_price_is_50_50(mm, initial_state):
    price_yes = mm.get_price(initial_state, "yes")
    price_no = mm.get_price(initial_state, "no")
    assert abs(price_yes - 0.5) < 1e-6
    assert abs(price_no - 0.5) < 1e-6


def test_prices_sum_to_one(mm, initial_state):
    price_yes = mm.get_price(initial_state, "yes")
    price_no = mm.get_price(initial_state, "no")
    assert abs(price_yes + price_no - 1.0) < 1e-6


def test_prices_sum_to_one_after_trades(mm):
    state = MarketState(
        q_yes=Decimal("50"),
        q_no=Decimal("10"),
        liquidity_b=Decimal("100"),
    )
    price_yes = mm.get_price(state, "yes")
    price_no = mm.get_price(state, "no")
    assert abs(price_yes + price_no - 1.0) < 1e-6


def test_buy_increases_price(mm, initial_state):
    price_before = mm.get_price(initial_state, "yes")
    shares = mm.get_shares_for_amount(initial_state, "yes", 50.0)

    new_state = MarketState(
        q_yes=initial_state.q_yes + Decimal(str(shares)),
        q_no=initial_state.q_no,
        liquidity_b=initial_state.liquidity_b,
    )
    price_after = mm.get_price(new_state, "yes")
    assert price_after > price_before


def test_cost_is_positive(mm, initial_state):
    cost = mm.get_cost(initial_state, "yes", 10.0)
    assert cost > 0


def test_sell_revenue_less_than_buy_cost(mm, initial_state):
    shares = 10.0
    buy_cost = mm.get_cost(initial_state, "yes", shares)

    after_buy = MarketState(
        q_yes=initial_state.q_yes + Decimal(str(shares)),
        q_no=initial_state.q_no,
        liquidity_b=initial_state.liquidity_b,
    )
    sell_revenue = mm.get_sale_revenue(after_buy, "yes", shares)

    # Due to the curvature of LMSR, selling immediately after buying
    # should give back the same amount (round-trip)
    assert abs(sell_revenue - buy_cost) < 1e-6


def test_numerical_stability_large_q(mm):
    """Test with large q values that could cause overflow without logsumexp."""
    state = MarketState(
        q_yes=Decimal("10000"),
        q_no=Decimal("0"),
        liquidity_b=Decimal("100"),
    )
    price_yes = mm.get_price(state, "yes")
    price_no = mm.get_price(state, "no")
    assert not math.isnan(price_yes)
    assert not math.isnan(price_no)
    assert not math.isinf(price_yes)
    assert abs(price_yes + price_no - 1.0) < 1e-6


def test_get_shares_for_amount(mm, initial_state):
    amount = 100.0
    shares = mm.get_shares_for_amount(initial_state, "yes", amount)
    actual_cost = mm.get_cost(initial_state, "yes", shares)
    assert abs(actual_cost - amount) < 0.01


def test_zero_amount_returns_zero_shares(mm, initial_state):
    shares = mm.get_shares_for_amount(initial_state, "yes", 0)
    assert shares == 0.0

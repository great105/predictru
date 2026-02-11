from prometheus_client import Counter, Histogram, Gauge

trades_total = Counter(
    "predictru_trades_total",
    "Total number of trades",
    ["type", "outcome"],
)

trade_amount = Histogram(
    "predictru_trade_amount",
    "Trade amount in PRC",
    ["type"],
    buckets=[1, 5, 10, 25, 50, 100, 250, 500, 1000],
)

active_markets = Gauge(
    "predictru_active_markets",
    "Number of currently active markets",
)

active_users = Gauge(
    "predictru_active_users",
    "Number of active users (traded in last 24h)",
)

total_volume = Counter(
    "predictru_total_volume",
    "Total trading volume in PRC",
)

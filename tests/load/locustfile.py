"""Load test for PredictRu API.

Run: locust -f locustfile.py --host=http://localhost:80
Target: 1000 concurrent users
"""
import hashlib
import hmac
import json
import random
import time
from urllib.parse import urlencode

from locust import HttpUser, between, task


def make_init_data(user_id: int, bot_token: str = "test:token") -> str:
    user = json.dumps({
        "id": user_id,
        "first_name": f"LoadUser{user_id}",
        "username": f"loaduser{user_id}",
        "language_code": "ru",
    })
    auth_date = str(int(time.time()))

    params = {"user": user, "auth_date": auth_date}
    data_check_string = "\n".join(f"{k}={params[k]}" for k in sorted(params.keys()))

    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    hash_value = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    params["hash"] = hash_value
    return urlencode(params)


class PredictRuUser(HttpUser):
    wait_time = between(1, 5)
    token = None
    user_id = None

    def on_start(self):
        self.user_id = random.randint(100000, 999999)
        init_data = make_init_data(self.user_id)
        r = self.client.post("/v1/auth/telegram", json={"init_data": init_data})
        if r.status_code == 200:
            self.token = r.json()["access_token"]

    @property
    def headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @task(5)
    def list_markets(self):
        self.client.get("/v1/markets", headers=self.headers)

    @task(3)
    def get_market(self):
        r = self.client.get("/v1/markets?limit=1", headers=self.headers)
        if r.status_code == 200:
            markets = r.json().get("items", [])
            if markets:
                market_id = markets[0]["id"]
                self.client.get(f"/v1/markets/{market_id}", headers=self.headers)

    @task(1)
    def buy_shares(self):
        r = self.client.get("/v1/markets?limit=1&status=open", headers=self.headers)
        if r.status_code == 200:
            markets = r.json().get("items", [])
            if markets:
                self.client.post(
                    "/v1/trade/buy",
                    json={
                        "market_id": markets[0]["id"],
                        "outcome": random.choice(["yes", "no"]),
                        "amount": random.randint(5, 50),
                    },
                    headers=self.headers,
                )

    @task(2)
    def get_leaderboard(self):
        self.client.get("/v1/users/leaderboard?period=all", headers=self.headers)

    @task(1)
    def health_check(self):
        self.client.get("/v1/health")

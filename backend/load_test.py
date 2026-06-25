"""
Performance / load test for SmartLaundry API.

Usage:
    # 1. Start the dev server first:
    #    python manage.py runserver
    #
    # 2. Run this script:
    #    python load_test.py

Requires two existing test accounts in the DB (created via the app or Django admin).
Edit BASE_URL, USER_EMAIL, USER_PASSWORD below before running.
"""

import statistics
import threading
import time

import requests

BASE_URL = "http://127.0.0.1:8000"
USER_EMAIL = "loadtest@test.com"
USER_PASSWORD = "loadtest123"


def login(email: str, password: str) -> str:
    """Return a JWT access token."""
    r = requests.post(
        f"{BASE_URL}/api/accounts/login/",
        json={"email": email, "password": password},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access"]


def measure_request(token: str, url: str, results: list, label: str):
    headers = {"Authorization": f"Bearer {token}"}
    start = time.perf_counter()
    try:
        r = requests.get(url, headers=headers, timeout=10)
        elapsed = (time.perf_counter() - start) * 1000
        results.append({"label": label, "status": r.status_code, "ms": elapsed})
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        results.append({"label": label, "status": "error", "ms": elapsed, "error": str(e)})


def run_concurrent_load(token: str, url: str, label: str, n_users: int = 10):
    """Simulate n_users hitting the same endpoint at the same time."""
    results = []
    barrier = threading.Barrier(n_users)

    def worker():
        barrier.wait()
        measure_request(token, url, results, label)

    threads = [threading.Thread(target=worker) for _ in range(n_users)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    return results


def print_summary(label: str, results: list):
    times = [r["ms"] for r in results]
    statuses = [r["status"] for r in results]
    ok = statuses.count(200)
    print(f"\n{'─' * 50}")
    print(f"  {label}")
    print(f"{'─' * 50}")
    print(f"  Zapytania:        {len(results)}")
    print(f"  Sukces (200):     {ok}/{len(results)}")
    print(f"  Śr. czas:         {statistics.mean(times):.1f} ms")
    print(f"  Mediana:          {statistics.median(times):.1f} ms")
    print(f"  Min / Maks:       {min(times):.1f} / {max(times):.1f} ms")
    if len(times) > 1:
        print(f"  Odch. std:        {statistics.stdev(times):.1f} ms")


def main():
    print("Logowanie...")
    try:
        token = login(USER_EMAIL, USER_PASSWORD)
    except Exception as e:
        print(f"Błąd logowania: {e}")
        print("Upewnij się że serwer działa i dane logowania są poprawne.")
        return
    print("OK\n")

    # Test 1: Endpoint profilu użytkownika — 10 równoczesnych użytkowników
    print("Test 1: 10 równoczesnych żądań — GET /api/accounts/me/")
    results1 = run_concurrent_load(token, f"{BASE_URL}/api/accounts/me/", "GET /api/accounts/me/", n_users=10)
    print_summary("GET /api/accounts/me/ (10 użytkowników)", results1)

    # Test 2: Lista rezerwacji — 10 równoczesnych użytkowników
    print("\nTest 2: 10 równoczesnych żądań — GET /api/territories/bookings/")
    results2 = run_concurrent_load(token, f"{BASE_URL}/api/territories/bookings/", "GET /api/territories/bookings/", n_users=10)
    print_summary("GET /api/territories/bookings/ (10 użytkowników)", results2)

    # Test 3: Skalowalność — wzrastające obciążenie
    print("\nTest 3: Skalowalność — wzrastające obciążenie na /api/accounts/me/")
    print(f"\n  {'Użytkownicy':>12} | {'Śr. czas (ms)':>14} | {'Maks (ms)':>10} | {'Sukces':>8}")
    print(f"  {'─' * 12}-+-{'─' * 14}-+-{'─' * 10}-+-{'─' * 8}")
    for n in [1, 5, 10, 20, 50]:
        r = run_concurrent_load(token, f"{BASE_URL}/api/accounts/me/", "scalability", n_users=n)
        times = [x["ms"] for x in r]
        ok = sum(1 for x in r if x["status"] == 200)
        print(f"  {n:>12} | {statistics.mean(times):>14.1f} | {max(times):>10.1f} | {ok:>6}/{n}")

    print(f"\n{'═' * 50}")
    print("  Test zakończony.")
    print(f"{'═' * 50}\n")


if __name__ == "__main__":
    main()

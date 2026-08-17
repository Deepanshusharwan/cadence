from datetime import date, timedelta


def _clear_starter_anchors(client):
    """New users get 3 starter anchors (see app/deps.py) — tests that build
    their own anchor list from scratch clear those first so assertions stay
    focused on what the test actually sets up.
    """
    for anchor in client.get("/anchors").json():
        client.delete(f"/anchors/{anchor['id']}")


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_me_lazily_creates_user(client):
    resp = client.get("/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "test-user"
    assert body["onboarded"] is False

    resp = client.patch("/me", json={"name": "Ada", "onboarded": True})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Ada"
    assert resp.json()["onboarded"] is True


def test_new_user_gets_starter_anchors(client):
    client.get("/me")  # triggers lazy creation
    anchors = client.get("/anchors").json()
    assert len(anchors) == 3
    assert {a["label"] for a in anchors} == {"Fixed commitment", "Evening focus"}
    assert all(a["recurrence"] == "daily" for a in anchors)


def test_category_crud(client):
    resp = client.post(
        "/categories",
        json={
            "name": "Deep Work",
            "tracking_mode": "hours",
            "weekly_target": 8,
            "priority_tier": 1,
            "weekend_preferred": False,
        },
    )
    assert resp.status_code == 201
    category = resp.json()
    assert category["color"] == "bg-marigold"

    resp = client.get("/categories")
    assert len(resp.json()) == 1

    resp = client.patch(f"/categories/{category['id']}", json={"weekly_target": 12})
    assert resp.status_code == 200
    assert resp.json()["weekly_target"] == 12

    resp = client.delete(f"/categories/{category['id']}")
    assert resp.status_code == 204
    assert client.get("/categories").json() == []


def test_category_not_found_for_other_user_scoped_id(client):
    resp = client.patch("/categories/does-not-exist", json={"name": "x"})
    assert resp.status_code == 404


def test_session_delete_does_not_orphan_history(client):
    cat = client.post(
        "/categories",
        json={"name": "Reading", "tracking_mode": "hours", "weekly_target": None, "priority_tier": 1},
    ).json()

    session = client.post(
        "/sessions",
        json={
            "category_id": cat["id"],
            "date": str(date.today()),
            "duration_minutes": 45,
            "tags": ["fiction"],
        },
    ).json()
    assert session["tags"] == ["fiction"]

    resp = client.patch(f"/sessions/{session['id']}", json={"duration_minutes": 60})
    assert resp.json()["duration_minutes"] == 60

    resp = client.delete(f"/sessions/{session['id']}")
    assert resp.status_code == 204
    assert client.get("/sessions").json() == []


def test_anchor_pinned_category_wins_over_planner(client):
    _clear_starter_anchors(client)
    low_priority = client.post(
        "/categories",
        json={"name": "Low", "tracking_mode": "hours", "weekly_target": 10, "priority_tier": 3},
    ).json()
    pinned = client.post(
        "/categories",
        json={"name": "Pinned", "tracking_mode": "hours", "weekly_target": 5, "priority_tier": 2},
    ).json()

    client.post(
        "/anchors",
        json={
            "label": "Evening focus",
            "start": "19:00",
            "end": "21:00",
            "recurrence": "daily",
            "days_of_week": [],
            "date": None,
            "is_focus_block": True,
            "category_ids": [pinned["id"]],
        },
    )

    resp = client.get("/today")
    assert resp.status_code == 200
    blocks = resp.json()
    assert len(blocks) == 1
    assert blocks[0]["label"] == "Pinned"  # not "Low", despite Low having a higher deficit


def test_today_merges_events_and_anchors_sorted_by_start(client):
    _clear_starter_anchors(client)
    cat = client.post(
        "/categories",
        json={"name": "Deep Work", "tracking_mode": "hours", "weekly_target": 5, "priority_tier": 1},
    ).json()
    client.post(
        "/anchors",
        json={
            "label": "Focus",
            "start": "19:00",
            "end": "21:00",
            "recurrence": "daily",
            "days_of_week": [],
            "date": None,
            "is_focus_block": True,
            "category_ids": [cat["id"]],
        },
    )
    client.post(
        "/events",
        json={
            "title": "Dentist",
            "date": str(date.today()),
            "start": "09:00",
            "end": "10:00",
            "type": "PERSONAL",
            "notes": "",
        },
    )

    blocks = client.get("/today").json()
    assert [b["label"] for b in blocks] == ["Dentist", "Deep Work"]
    assert blocks[0]["is_event"] is True
    assert blocks[1]["is_event"] is False


def test_leave_balance_carries_forward_capped(client):
    client.patch("/me", json={"leave_monthly_allowance": 7, "leave_carry_cap": 14})

    # Mark 2 reduced days (2 units) last month so 5 units are left to carry.
    today = date.today()
    last_month_first = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
    for offset in (0, 1):
        d = last_month_first + timedelta(days=offset)
        client.put(f"/day-types/{d.isoformat()}", json={"day_type": "REDUCED"})

    resp = client.get("/leave")
    assert resp.status_code == 200
    body = resp.json()
    assert body["monthly_allowance"] == 7
    assert body["carried"] == 5  # 7 - 2 used last month
    assert body["total_available"] == 12
    assert body["remaining"] == 12


def test_leave_carry_never_exceeds_cap(client):
    # Cap only 3 above the monthly allowance, so even a fully-unused last
    # month can only carry 3, not the full 7.
    client.patch("/me", json={"leave_monthly_allowance": 7, "leave_carry_cap": 10})
    resp = client.get("/leave")
    body = resp.json()
    assert body["carried"] == 3
    assert body["total_available"] == 10


def test_streak_forgiving_leave_day_bridges_but_does_not_count(client):
    cat = client.post(
        "/categories",
        json={"name": "Deep Work", "tracking_mode": "hours", "weekly_target": None, "priority_tier": 1},
    ).json()
    today = date.today()
    yesterday = today - timedelta(days=1)
    two_days_ago = today - timedelta(days=2)

    client.post(
        "/sessions",
        json={"category_id": cat["id"], "date": two_days_ago.isoformat(), "duration_minutes": 30, "tags": []},
    )
    client.put(f"/day-types/{yesterday.isoformat()}", json={"day_type": "LEAVE"})
    client.post(
        "/sessions",
        json={"category_id": cat["id"], "date": today.isoformat(), "duration_minutes": 30, "tags": []},
    )

    resp = client.get("/streaks")
    body = resp.json()
    # Both real sessions count; the leave day bridges the gap without
    # itself adding to the length.
    assert body["current"]["length"] == 2
    assert sorted(body["current"]["dates"]) == sorted(
        [two_days_ago.isoformat(), yesterday.isoformat(), today.isoformat()]
    )


def test_insight_fires_only_after_three_full_weeks_behind(client):
    cat = client.post(
        "/categories",
        json={"name": "Deep Work", "tracking_mode": "hours", "weekly_target": 10, "priority_tier": 1},
    ).json()
    today = date.today()
    this_monday = today - timedelta(days=today.weekday())

    # Two weeks ago: hit target (10h) -> should NOT trigger the insight.
    two_weeks_ago_monday = this_monday - timedelta(days=14)
    client.post(
        "/sessions",
        json={
            "category_id": cat["id"],
            "date": two_weeks_ago_monday.isoformat(),
            "duration_minutes": 600,
            "tags": [],
        },
    )

    resp = client.get("/insights")
    assert resp.json() == []


def test_review_upsert_and_get(client):
    week_start = date.today() - timedelta(days=date.today().weekday())
    resp = client.get(f"/weekly-review/{week_start.isoformat()}")
    assert resp.json()["wins"] == ""

    resp = client.put(f"/weekly-review/{week_start.isoformat()}", json={"wins": "Shipped it"})
    assert resp.status_code == 200
    assert resp.json()["wins"] == "Shipped it"

    resp = client.get(f"/weekly-review/{week_start.isoformat()}")
    assert resp.json()["wins"] == "Shipped it"

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


def test_category_tracking_mode_locked_once_sessions_exist(client):
    cat = client.post(
        "/categories",
        json={"name": "Reading", "tracking_mode": "hours", "weekly_target": 5, "priority_tier": 1},
    ).json()

    # No sessions yet -- tracking_mode is still freely editable.
    resp = client.patch(f"/categories/{cat['id']}", json={"tracking_mode": "sessions"})
    assert resp.status_code == 200
    assert resp.json()["tracking_mode"] == "sessions"

    client.post(
        "/sessions",
        json={"category_id": cat["id"], "date": str(date.today()), "duration_minutes": 45, "tags": []},
    )

    resp = client.patch(f"/categories/{cat['id']}", json={"tracking_mode": "hours"})
    assert resp.status_code == 400

    # Other fields (name, target, tier) stay editable regardless.
    resp = client.patch(f"/categories/{cat['id']}", json={"name": "Reading (renamed)", "priority_tier": 2})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Reading (renamed)"


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


def test_feedback_create(client):
    resp = client.post("/feedback", json={"type": "idea", "message": "Add a Pomodoro timer mode"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["type"] == "idea"
    assert body["message"] == "Add a Pomodoro timer mode"
    assert body["id"]


def test_feedback_list_requires_admin(client):
    client.post("/feedback", json={"type": "bug", "message": "Timer drifts on pause"})
    resp = client.get("/feedback")
    assert resp.status_code == 403


def test_feedback_list_admin_sees_all(client, monkeypatch):
    from app.config import get_settings

    monkeypatch.setenv("ADMIN_EMAILS", '["owner@example.com"]')
    monkeypatch.setattr("app.deps.get_clerk_primary_email", lambda user_id: "owner@example.com")
    get_settings.cache_clear()
    try:
        client.post("/feedback", json={"type": "bug", "message": "Timer drifts on pause"})
        client.post("/feedback", json={"type": "idea", "message": "Add a Pomodoro timer mode"})

        resp = client.get("/feedback")
        assert resp.status_code == 200
        rows = resp.json()
        messages = {row["message"] for row in rows}
        assert messages == {"Timer drifts on pause", "Add a Pomodoro timer mode"}
        assert all(row["user_id"] == "test-user" for row in rows)
        assert all(row["user_avatar"] == "cat" for row in rows)  # default avatar
    finally:
        get_settings.cache_clear()


def test_feedback_list_denies_email_not_in_allowlist(client, monkeypatch):
    from app.config import get_settings

    monkeypatch.setenv("ADMIN_EMAILS", '["owner@example.com"]')
    monkeypatch.setattr("app.deps.get_clerk_primary_email", lambda user_id: "someone-else@example.com")
    get_settings.cache_clear()
    try:
        resp = client.get("/feedback")
        assert resp.status_code == 403
    finally:
        get_settings.cache_clear()


def _as_admin(monkeypatch, email="owner@example.com"):
    from app.config import get_settings

    monkeypatch.setenv("ADMIN_EMAILS", f'["{email}"]')
    monkeypatch.setattr("app.deps.get_clerk_primary_email", lambda user_id: email)
    get_settings.cache_clear()
    return get_settings


def test_admin_emails_requires_admin(client):
    resp = client.get("/admin/emails")
    assert resp.status_code == 403


def test_admin_can_list_add_remove_emails(client, monkeypatch):
    get_settings = _as_admin(monkeypatch)
    try:
        resp = client.get("/admin/emails")
        assert resp.status_code == 200
        assert resp.json() == [{"id": None, "email": "owner@example.com", "source": "seed"}]

        resp = client.post("/admin/emails", json={"email": "New@Example.com"})
        assert resp.status_code == 201
        added = resp.json()
        assert added["email"] == "new@example.com"  # normalized to lowercase
        assert added["source"] == "added"
        assert added["id"]

        emails = {row["email"] for row in client.get("/admin/emails").json()}
        assert emails == {"owner@example.com", "new@example.com"}

        resp = client.delete(f"/admin/emails/{added['id']}")
        assert resp.status_code == 204
        emails = {row["email"] for row in client.get("/admin/emails").json()}
        assert emails == {"owner@example.com"}
    finally:
        get_settings.cache_clear()


def test_admin_cannot_add_duplicate_email(client, monkeypatch):
    get_settings = _as_admin(monkeypatch)
    try:
        resp = client.post("/admin/emails", json={"email": "owner@example.com"})
        assert resp.status_code == 400
    finally:
        get_settings.cache_clear()


def test_admin_cannot_remove_own_access(client, monkeypatch):
    get_settings = _as_admin(monkeypatch, email="owner@example.com")
    try:
        # Owner (seeded) adds two DB-only admins.
        second = client.post("/admin/emails", json={"email": "second-admin@example.com"}).json()
        third = client.post("/admin/emails", json={"email": "third-admin@example.com"}).json()

        # Switch identity to the DB-only "second-admin" and try to remove
        # their own row -- this is exactly the self-lockout case, since
        # unlike "owner" they have no seed fallback.
        monkeypatch.setattr(
            "app.deps.get_clerk_primary_email", lambda user_id: "second-admin@example.com"
        )
        resp = client.delete(f"/admin/emails/{second['id']}")
        assert resp.status_code == 400

        # "second-admin" removing a *different* DB admin is fine.
        resp = client.delete(f"/admin/emails/{third['id']}")
        assert resp.status_code == 204
    finally:
        get_settings.cache_clear()


def test_admin_users_requires_admin(client):
    resp = client.get("/admin/users")
    assert resp.status_code == 403


def test_admin_can_list_and_grant_plans(client, monkeypatch):
    get_settings = _as_admin(monkeypatch)
    try:
        client.get("/me")  # lazily creates the row

        resp = client.get("/admin/users")
        assert resp.status_code == 200
        users = resp.json()
        assert len(users) == 1
        assert users[0]["plan"] == "free"
        user_id = users[0]["id"]

        resp = client.patch(f"/admin/users/{user_id}/plan", json={"plan": "pro"})
        assert resp.status_code == 200
        assert resp.json()["plan"] == "pro"

        resp = client.get("/admin/users")
        assert resp.json()[0]["plan"] == "pro"
    finally:
        get_settings.cache_clear()


def test_admin_grant_plan_requires_admin(client):
    client.get("/me")
    resp = client.patch("/me", json={})  # just to have a real user id to target
    resp = client.patch(f"/admin/users/{resp.json()['id']}/plan", json={"plan": "pro"})
    assert resp.status_code == 403


def test_cannot_self_grant_plan_via_patch_me(client):
    client.get("/me")
    resp = client.patch("/me", json={"plan": "pro"})
    assert resp.status_code == 200  # unknown field is silently ignored, not an error
    assert resp.json()["plan"] == "free"


def test_review_upsert_and_get(client):
    week_start = date.today() - timedelta(days=date.today().weekday())
    resp = client.get(f"/weekly-review/{week_start.isoformat()}")
    assert resp.json()["wins"] == ""

    resp = client.put(f"/weekly-review/{week_start.isoformat()}", json={"wins": "Shipped it"})
    assert resp.status_code == 200
    assert resp.json()["wins"] == "Shipped it"

    resp = client.get(f"/weekly-review/{week_start.isoformat()}")
    assert resp.json()["wins"] == "Shipped it"

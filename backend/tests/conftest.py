import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import get_current_user_id
from app.db import Base, get_db
from app.main import app

TEST_USER_ID = "test-user"


@pytest.fixture()
def _engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture()
def client(_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    def override_get_current_user_id():
        return TEST_USER_ID

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_id] = override_get_current_user_id

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture()
def db_session(_engine):
    """Direct DB access, sharing client's in-memory database — for test
    setup that can't go through the API (e.g. creating a second user row,
    since the client fixture can only ever authenticate as TEST_USER_ID).
    """
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

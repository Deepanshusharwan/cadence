"""Vercel's Python serverless entrypoint.

Vercel's Python runtime expects a module here exposing an ASGI/WSGI
callable it can invoke per-request -- it doesn't run `uvicorn` or any
other long-lived process. This just re-exports the real app so the
actual application code (app/main.py) stays framework-agnostic and
identical to what runs locally/in Docker.
"""

from app.main import app  # noqa: F401

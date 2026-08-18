from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import (
    admin,
    anchors,
    categories,
    computed,
    day_types,
    events,
    feedback,
    me,
    reviews,
    sessions,
    webhooks,
)

app = FastAPI(title="Cadence API")

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(me.router)
app.include_router(categories.router)
app.include_router(anchors.router)
app.include_router(sessions.router)
app.include_router(events.router)
app.include_router(day_types.router)
app.include_router(reviews.router)
app.include_router(feedback.router)
app.include_router(admin.router)
app.include_router(webhooks.router)
app.include_router(computed.router)

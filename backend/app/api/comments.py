import uuid

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DbSession
from app.models.comment import Comment

router = APIRouter(tags=["comments"])


class CommentCreate(BaseModel):
    text: str
    parent_id: uuid.UUID | None = None


class CommentResponse(BaseModel):
    id: uuid.UUID
    market_id: uuid.UUID
    user_id: uuid.UUID
    username: str | None
    first_name: str
    text: str
    parent_id: uuid.UUID | None
    created_at: str


@router.get("/markets/{market_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    market_id: uuid.UUID,
    db: DbSession,
    limit: int = Query(default=50, le=100),
):
    result = await db.execute(
        select(Comment)
        .where(Comment.market_id == market_id)
        .order_by(Comment.created_at.asc())
        .limit(limit)
    )
    comments = result.scalars().all()

    return [
        CommentResponse(
            id=c.id,
            market_id=c.market_id,
            user_id=c.user_id,
            username=c.user.username if c.user else None,
            first_name=c.user.first_name if c.user else "Unknown",
            text=c.text,
            parent_id=c.parent_id,
            created_at=c.created_at.isoformat(),
        )
        for c in comments
    ]


@router.post("/markets/{market_id}/comments", response_model=CommentResponse)
async def create_comment(
    market_id: uuid.UUID,
    body: CommentCreate,
    user: CurrentUser,
    db: DbSession,
):
    if len(body.text.strip()) == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Comment cannot be empty")
    if len(body.text) > 1000:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Comment too long (max 1000 chars)"
        )

    comment = Comment(
        market_id=market_id,
        user_id=user.id,
        text=body.text.strip(),
        parent_id=body.parent_id,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        market_id=comment.market_id,
        user_id=comment.user_id,
        username=user.username,
        first_name=user.first_name,
        text=comment.text,
        parent_id=comment.parent_id,
        created_at=comment.created_at.isoformat(),
    )

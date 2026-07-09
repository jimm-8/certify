from __future__ import annotations

from typing import Generic, Optional, Type, TypeVar

from sqlalchemy.orm import Session

T = TypeVar("T")


class BaseRepository(Generic[T]):
    def __init__(self, db: Session, model: Type[T]):
        self.db = db
        self.model = model

    def query(self):
        return self.db.query(self.model)

    def query_with(self, *entities):
        return self.db.query(*entities)

    def get_by_id(self, entity_id: int) -> Optional[T]:
        return self.query().filter(self.model.id == entity_id).first()

    def first(self) -> Optional[T]:
        return self.query().first()

    def all(self) -> list[T]:
        return self.query().all()

    def add(self, entity: T) -> T:
        self.db.add(entity)
        return entity

    def delete(self, entity: T) -> None:
        self.db.delete(entity)

    def commit(self) -> None:
        self.db.commit()

    def refresh(self, entity: T) -> None:
        self.db.refresh(entity)

"""Persistence boundaries and implementations."""

from backend.app.repositories.errors import (
    DuplicateRecordError,
    PersistenceError,
    RecordNotFoundError,
)
from backend.app.repositories.interfaces import (
    BookCopyRepository,
    BookRepository,
    BookRequestRepository,
    FeedbackRepository,
    FineRepository,
    FineSettlementRepository,
    LoanRepository,
    ReportingRepository,
    ReservationRepository,
    UnitOfWork,
    UserRepository,
)

__all__ = [
    "BookCopyRepository",
    "BookRepository",
    "BookRequestRepository",
    "DuplicateRecordError",
    "FineRepository",
    "FineSettlementRepository",
    "FeedbackRepository",
    "LoanRepository",
    "PersistenceError",
    "RecordNotFoundError",
    "ReportingRepository",
    "ReservationRepository",
    "UnitOfWork",
    "UserRepository",
]

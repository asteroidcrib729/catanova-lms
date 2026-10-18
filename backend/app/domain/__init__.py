"""Core domain types for the library system."""

from backend.app.domain.enums import (
    BookCopyStatus,
    FeedbackStatus,
    FineSettlementKind,
    FineStatus,
    RequestStatus,
    ReservationStatus,
    UserRole,
)
from backend.app.domain.exceptions import DomainError, DomainValidationError
from backend.app.domain.models import (
    Book,
    BookCopy,
    BookRequest,
    Feedback,
    Fine,
    FineSettlement,
    Loan,
    Reservation,
    User,
    normalize_isbn,
)

__all__ = [
    "Book",
    "BookCopy",
    "BookCopyStatus",
    "BookRequest",
    "DomainError",
    "DomainValidationError",
    "Feedback",
    "FeedbackStatus",
    "Fine",
    "FineSettlement",
    "FineSettlementKind",
    "FineStatus",
    "Loan",
    "RequestStatus",
    "Reservation",
    "ReservationStatus",
    "User",
    "UserRole",
    "normalize_isbn",
]

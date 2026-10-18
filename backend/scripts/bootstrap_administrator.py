"""Create the first PostgreSQL administrator using masked local terminal input."""

from __future__ import annotations

import argparse
import getpass
import os
import warnings

from backend.app.postgres import PostgresDatabase, PostgresSettings
from backend.app.repositories.errors import PersistenceError
from backend.app.repositories.postgres import PostgresUnitOfWork
from backend.app.security import PasswordService
from backend.app.services import AccountService, ApplicationError


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--environment", choices=("development", "production"), required=True)
    parser.add_argument("--confirm-production", action="store_true")
    arguments = parser.parse_args()
    if arguments.environment != os.environ.get("LMS_ENVIRONMENT"):
        parser.error("Environment must match the explicitly loaded configuration.")
    if arguments.environment == "production" and not arguments.confirm_production:
        parser.error("Production setup requires --confirm-production.")
    database = PostgresDatabase(
        PostgresSettings(
            os.environ.get("DATABASE_URL", ""),
            environment=arguments.environment,
        )
    )
    database.open()
    try:
        if not database.schema_ready():
            print("Schema is unavailable or incompatible. No account was created.")
            return 1
        display_name = input("Administrator display name: ").strip()
        username = input("Administrator username: ").strip()
        # Fail closed rather than falling back to echoing a password.
        with warnings.catch_warnings():
            warnings.simplefilter("error", getpass.GetPassWarning)
            password = getpass.getpass("Administrator password (12–128 characters): ")
            confirmation = getpass.getpass("Confirm password: ")
        if password != confirmation:
            print("Passwords differ. No account was created.")
            return 1
        principal = AccountService(
            lambda: PostgresUnitOfWork(database),
            PasswordService(),
        ).bootstrap_administrator(display_name, username, password)
        print(f"First administrator created (account {principal.user_id}). Setup is now closed.")
        return 0
    except ApplicationError, PersistenceError, ValueError, getpass.GetPassWarning, EOFError:
        print("Administrator setup failed or is already closed. No credentials were logged.")
        return 1
    finally:
        database.close()


if __name__ == "__main__":
    raise SystemExit(main())

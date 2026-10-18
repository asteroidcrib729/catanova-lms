"""Create the first PostgreSQL administrator using masked local terminal input."""

from __future__ import annotations

import argparse
import getpass
import os
import warnings

from backend.app.domain.models import USERNAME_PATTERN
from backend.app.postgres import PostgresDatabase, PostgresSettings
from backend.app.repositories.errors import PersistenceError
from backend.app.repositories.postgres import PostgresUnitOfWork
from backend.app.security import PasswordService
from backend.app.services import AccountService, ApplicationError
from backend.app.services.accounts import PasswordPolicy
from backend.app.services.errors import (
    BootstrapClosedError,
    PasswordPolicyError,
    UsernameUnavailableError,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--environment", choices=("development", "production"), required=True)
    parser.add_argument("--confirm-production", action="store_true")
    arguments = parser.parse_args()
    if arguments.environment != os.environ.get("LMS_ENVIRONMENT"):
        parser.error(
            "Environment must match the explicitly loaded configuration. Existing terminal "
            "LMS_ENVIRONMENT and DATABASE_URL override uv --env-file; clear both before retrying."
        )
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
        if not display_name:
            print("Display name must not be empty. No account was created.")
            return 1
        if not USERNAME_PATTERN.fullmatch(username.casefold()):
            print(
                "Username must be 3-32 letters/numbers/dots/hyphens/underscores, "
                "starting with a letter or number (not an email address). No account was created."
            )
            return 1
        # Fail closed rather than falling back to echoing a password.
        with warnings.catch_warnings():
            warnings.simplefilter("error", getpass.GetPassWarning)
            password = getpass.getpass("Administrator password (12–128 characters): ")
            confirmation = getpass.getpass("Confirm password: ")
        if password != confirmation:
            print("Passwords differ. No account was created.")
            return 1
        PasswordPolicy().validate(password)
        principal = AccountService(
            lambda: PostgresUnitOfWork(database),
            PasswordService(),
        ).bootstrap_administrator(display_name, username, password)
        print(f"First administrator created (account {principal.user_id}). Setup is now closed.")
        return 0
    except BootstrapClosedError:
        print("Administrator setup is already closed: an administrator exists.")
        return 1
    except PasswordPolicyError:
        print("Password must be 12-128 characters and not only whitespace. No account was created.")
        return 1
    except UsernameUnavailableError:
        print("That username is unavailable. No account was created.")
        return 1
    except getpass.GetPassWarning, EOFError:
        print("Masked input requires an interactive terminal. Use Windows Terminal or PowerShell.")
        return 1
    except PersistenceError:
        print("Database operation failed or timed out. Check connectivity, then retry safely.")
        return 1
    except ApplicationError, ValueError:
        print("Account input was rejected. Check the stated field requirements and retry.")
        return 1
    finally:
        database.close()


if __name__ == "__main__":
    raise SystemExit(main())

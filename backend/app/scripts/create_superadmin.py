"""Create an initial superadmin user from the command line.

Usage:
  python create_superadmin.py --username admin --email admin@example.com --password secret
If a user with the given username exists, the script will exit.
"""
from dotenv import load_dotenv
import argparse
from app.database import SessionLocal
from app.models.user import User
from app.services.auth_service import get_password_hash


load_dotenv()


def create_superadmin(username: str, email: str, password: str):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"User '{username}' already exists. Skipping creation.")
            return

        user = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            role="superadmin",
        )
        db.add(user)
        db.commit()
        print(f"Created superadmin user '{username}'")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    create_superadmin(args.username, args.email, args.password)


if __name__ == "__main__":
    main()

"""Bootstrap the first AdminUser, linked to the "super_admin" role if it
already exists (run scripts.seed_rbac first, or run this first and it'll
just leave role_id unset — is_superuser alone is enough to bypass RBAC).

    docker compose exec backend python -m scripts.create_superuser <username> <email> <password>
"""

import asyncio
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.users.role import Role
from app.repositories.users.admin_user import AdminUserRepository


async def main() -> None:
    if len(sys.argv) != 4:
        print("Usage: python -m scripts.create_superuser <username> <email> <password>")
        raise SystemExit(1)

    username, email, password = sys.argv[1], sys.argv[2], sys.argv[3]

    async with AsyncSessionLocal() as session:
        repository = AdminUserRepository(session)
        if await repository.get_by_username(username) is not None:
            print(f"User '{username}' already exists.")
            return

        super_admin_role = (
            await session.execute(select(Role).where(Role.name == "super_admin"))
        ).scalar_one_or_none()

        await repository.create(
            {
                "username": username,
                "email": email,
                "hashed_password": hash_password(password),
                "is_active": True,
                "is_superuser": True,
                "role_id": super_admin_role.id if super_admin_role else None,
            }
        )
        await session.commit()
        print(f"Superuser '{username}' created.")


if __name__ == "__main__":
    asyncio.run(main())

from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models import Resource, GroupResourcePermission, UserResourcePermission


class ResourcePermissionService:

    async def _upsert_resource(
        self,
        db: AsyncSession,
        resource_type: str,
        external_id: str,
        name: str | None = None,
    ) -> Resource:
        result = await db.execute(
            select(Resource).where(
                Resource.resource_type == resource_type,
                Resource.external_id == external_id,
            )
        )
        resource = result.scalar_one_or_none()
        if resource is not None:
            if name:
                resource.name = name
            return resource
        resource = Resource(resource_type=resource_type, external_id=external_id, name=name)
        db.add(resource)
        await db.flush()
        return resource

    async def assign_group_resource_permissions(
        self,
        db: AsyncSession,
        kc_group_id: str,
        resource_type: str,
        resource_external_ids: list[str],
        permission_codes: list[str],
        resource_names: dict[str, str] | None = None,
    ) -> list[dict]:
        resource_names = resource_names or {}
        for external_id in resource_external_ids:
            resource = await self._upsert_resource(
                db, resource_type, external_id, resource_names.get(external_id)
            )
            for code in permission_codes:
                exists = await db.execute(
                    select(GroupResourcePermission).where(
                        GroupResourcePermission.kc_group_id == kc_group_id,
                        GroupResourcePermission.resource_id == resource.id,
                        GroupResourcePermission.permission_code == code,
                    )
                )
                if exists.scalar_one_or_none() is None:
                    db.add(GroupResourcePermission(
                        kc_group_id=kc_group_id,
                        resource_id=resource.id,
                        permission_code=code,
                    ))
        await db.commit()
        return await self.list_group_resource_permissions(db, kc_group_id, resource_type)

    async def assign_user_resource_permissions(
        self,
        db: AsyncSession,
        kc_user_sub: str,
        resource_type: str,
        resource_external_ids: list[str],
        permission_codes: list[str],
        resource_names: dict[str, str] | None = None,
    ) -> list[dict]:
        resource_names = resource_names or {}
        for external_id in resource_external_ids:
            resource = await self._upsert_resource(
                db, resource_type, external_id, resource_names.get(external_id)
            )
            await db.execute(
                delete(UserResourcePermission).where(
                    UserResourcePermission.kc_user_sub == kc_user_sub,
                    UserResourcePermission.resource_id == resource.id,
                    UserResourcePermission.permission_code.notin_(permission_codes),
                )
            )
            for code in permission_codes:
                exists = await db.execute(
                    select(UserResourcePermission).where(
                        UserResourcePermission.kc_user_sub == kc_user_sub,
                        UserResourcePermission.resource_id == resource.id,
                        UserResourcePermission.permission_code == code,
                    )
                )
                if exists.scalar_one_or_none() is None:
                    db.add(UserResourcePermission(
                        kc_user_sub=kc_user_sub,
                        resource_id=resource.id,
                        permission_code=code,
                    ))
        await db.commit()
        return await self.list_user_resource_permissions(db, kc_user_sub, resource_type)

    async def list_group_resource_permissions(
        self,
        db: AsyncSession,
        kc_group_id: str,
        resource_type: str | None = None,
    ) -> list[dict]:
        stmt = (
            select(GroupResourcePermission, Resource)
            .join(Resource, Resource.id == GroupResourcePermission.resource_id)
            .where(GroupResourcePermission.kc_group_id == kc_group_id)
        )
        if resource_type:
            stmt = stmt.where(Resource.resource_type == resource_type)
        rows = (await db.execute(stmt)).all()
        return [
            {
                "kc_group_id": grp.kc_group_id,
                "resource_id": res.id,
                "resource_type": res.resource_type,
                "resource_external_id": res.external_id,
                "resource_name": res.name,
                "permission_code": grp.permission_code,
            }
            for grp, res in rows
        ]

    async def list_user_resource_permissions(
        self,
        db: AsyncSession,
        kc_user_sub: str,
        resource_type: str | None = None,
    ) -> list[dict]:
        stmt = (
            select(UserResourcePermission, Resource)
            .join(Resource, Resource.id == UserResourcePermission.resource_id)
            .where(UserResourcePermission.kc_user_sub == kc_user_sub)
        )
        if resource_type:
            stmt = stmt.where(Resource.resource_type == resource_type)
        rows = (await db.execute(stmt)).all()
        return [
            {
                "kc_user_sub": usr.kc_user_sub,
                "resource_id": res.id,
                "resource_type": res.resource_type,
                "resource_external_id": res.external_id,
                "resource_name": res.name,
                "permission_code": usr.permission_code,
            }
            for usr, res in rows
        ]

    async def remove_group_resource_permission(
        self,
        db: AsyncSession,
        kc_group_id: str,
        resource_type: str,
        resource_external_id: str,
        permission_code: str,
    ) -> None:
        resource = await db.execute(
            select(Resource).where(
                Resource.resource_type == resource_type,
                Resource.external_id == resource_external_id,
            )
        )
        res = resource.scalar_one_or_none()
        if res is None:
            raise ValueError("resource_not_found")
        row = await db.execute(
            select(GroupResourcePermission).where(
                GroupResourcePermission.kc_group_id == kc_group_id,
                GroupResourcePermission.resource_id == res.id,
                GroupResourcePermission.permission_code == permission_code,
            )
        )
        item = row.scalar_one_or_none()
        if item is None:
            raise ValueError("permission_not_found")
        await db.delete(item)
        await db.commit()

    async def remove_user_resource_permission(
        self,
        db: AsyncSession,
        kc_user_sub: str,
        resource_type: str,
        resource_external_id: str,
        permission_code: str,
    ) -> None:
        resource = await db.execute(
            select(Resource).where(
                Resource.resource_type == resource_type,
                Resource.external_id == resource_external_id,
            )
        )
        res = resource.scalar_one_or_none()
        if res is None:
            raise ValueError("resource_not_found")
        row = await db.execute(
            select(UserResourcePermission).where(
                UserResourcePermission.kc_user_sub == kc_user_sub,
                UserResourcePermission.resource_id == res.id,
                UserResourcePermission.permission_code == permission_code,
            )
        )
        item = row.scalar_one_or_none()
        if item is None:
            raise ValueError("permission_not_found")
        await db.delete(item)
        await db.commit()

    async def list_all_permissions(self, db: AsyncSession) -> list[dict]:
        group_rows = (
            await db.execute(
                select(
                    GroupResourcePermission, 
                    Resource
                )
                .join(
                    Resource, 
                    Resource.id == GroupResourcePermission.resource_id
                )
        )).all()

        user_rows = (
            await db.execute(
                select(
                    UserResourcePermission, 
                    Resource
                )
                .join(
                    Resource, 
                    Resource.id == UserResourcePermission.resource_id
                )
        )).all()
        return [
            {
                "type": "group", 
                "kc_group_id": grp.kc_group_id, 
                "resource_type": res.resource_type,
                "resource_external_id": res.external_id, 
                "resource_name": res.name, 
                "permission_code": grp.permission_code,
            }
            for grp, res in group_rows
        ] + [
            {
                "type": "user", 
                "kc_user_sub": usr.kc_user_sub, 
                "resource_type": res.resource_type,
                "resource_external_id": res.external_id, 
                "resource_name": res.name, 
                "permission_code": usr.permission_code,
            }
            for usr, res in user_rows
        ]

    async def get_allowed_deployment_ids(
        self,
        db: AsyncSession,
        kc_user_sub: str,
        kc_group_ids: list[str],
        required_permission_codes: set[str] | None = None,
    ) -> set[str]:
        """Return deployment external_ids the user can access (direct + group grants)."""
        # Direct user grants
        stmt_user = (
            select(Resource.external_id)
            .join(UserResourcePermission, UserResourcePermission.resource_id == Resource.id)
            .where(
                UserResourcePermission.kc_user_sub == kc_user_sub,
                Resource.resource_type == "deployment",
            )
        )
        if required_permission_codes:
            stmt_user = stmt_user.where(
                UserResourcePermission.permission_code.in_(sorted(required_permission_codes))
            )

        # Group grants
        stmt_group = (
            select(Resource.external_id)
            .join(GroupResourcePermission, GroupResourcePermission.resource_id == Resource.id)
            .where(
                GroupResourcePermission.kc_group_id.in_(kc_group_ids) if kc_group_ids else False,
                Resource.resource_type == "deployment",
            )
        )
        if required_permission_codes:
            stmt_group = stmt_group.where(
                GroupResourcePermission.permission_code.in_(sorted(required_permission_codes))
            )

        user_rows = (await db.execute(stmt_user)).all()
        group_rows = (await db.execute(stmt_group)).all() if kc_group_ids else []

        return {row[0] for row in user_rows + group_rows if row[0]}


resource_permission_service = ResourcePermissionService()

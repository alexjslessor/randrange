from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from ..base import AuthBase
from ..mixins import TimestampMixin, UUIDPKMixin


class Resource(UUIDPKMixin, TimestampMixin, AuthBase):
    __tablename__ = "resources"
    __table_args__ = (
        UniqueConstraint("resource_type", "external_id", name="uq_resources_type_external_id"),
    )

    resource_type: Mapped[str] = mapped_column(String(64), index=True)
    external_id: Mapped[str] = mapped_column(String(255), index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)


class GroupResourcePermission(UUIDPKMixin, TimestampMixin, AuthBase):
    __tablename__ = "group_resource_permissions"
    __table_args__ = (
        UniqueConstraint("kc_group_id", "resource_id", "permission_code", name="uq_grp_res_perm"),
    )

    kc_group_id: Mapped[str] = mapped_column(String(36), index=True)
    resource_id: Mapped[str] = mapped_column(String(36), index=True)
    permission_code: Mapped[str] = mapped_column(String(64), index=True)


class UserResourcePermission(UUIDPKMixin, TimestampMixin, AuthBase):
    __tablename__ = "user_resource_permissions"
    __table_args__ = (
        UniqueConstraint("kc_user_sub", "resource_id", "permission_code", name="uq_usr_res_perm"),
    )

    kc_user_sub: Mapped[str] = mapped_column(String(36), index=True)
    resource_id: Mapped[str] = mapped_column(String(36), index=True)
    permission_code: Mapped[str] = mapped_column(String(64), index=True)

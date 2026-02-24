from datetime import datetime
from pydantic import BaseModel, Field


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    scope: str = ""


class UserProfile(BaseModel):
    id: str
    username: str
    email: str | None = None
    groups: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    is_superuser: bool = False
    is_group_admin: bool = False
    admin_group_ids: list[str] = Field(default_factory=list)


class UserRegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=128)
    email: str = Field(min_length=0, max_length=255)
    password: str = Field(min_length=8, max_length=256)
    first_name: str | None = None
    last_name: str | None = None


class ResourcePermissionAssignRequest(BaseModel):
    resource_type: str = Field(min_length=1, max_length=64)
    resource_external_ids: list[str] = Field(min_length=1)
    permission_codes: list[str] = Field(min_length=1)
    resource_names: dict[str, str] = Field(default_factory=dict)


class ResourcePermissionView(BaseModel):
    resource_id: str
    resource_type: str
    resource_external_id: str
    resource_name: str | None = None
    permission_code: str


class GroupResourcePermissionView(ResourcePermissionView):
    kc_group_id: str


class UserResourcePermissionView(ResourcePermissionView):
    kc_user_sub: str


class GroupCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=128)


class GroupUserAssignRequest(BaseModel):
    user_id: str


class PrefectDeploymentView(BaseModel):
    id: str
    name: str | None = None
    flow_id: str | None = None
    tags: list[str] = Field(default_factory=list)


class PermissionMatrixRow(BaseModel):
    id: str
    group_id: str
    group_name: str
    user_id: str
    username: str
    deployment_id: str
    deployment_name: str
    group_permissions: list[str] = Field(default_factory=list)
    direct_user_permissions: list[str] = Field(default_factory=list)
    effective_permissions: list[str] = Field(default_factory=list)
    source: str


class PermissionMatrixPage(BaseModel):
    rows: list[PermissionMatrixRow] = Field(default_factory=list)
    page: int
    page_size: int
    total: int
    total_pages: int
    sort_by: str
    sort_dir: str

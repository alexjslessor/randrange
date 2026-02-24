


# Keycloak
Core mismatch: realm JSON from 26.2.4 versus running image 26.3.4 via latest. 


# Keycloak Email Confguration

In your realm export, change these parts:

1. Enable email-driven account actions at the top of [demo-mcp-realm.json](/prefect/demo-mcp-realm.json):
```json
"verifyEmail": true,
"resetPasswordAllowed": true,
"loginWithEmailAllowed": true,
"duplicateEmailsAllowed": false
```
Right now you have `verifyEmail: false` and `resetPasswordAllowed: false`.

2. Replace empty SMTP config at [demo-mcp-realm.json:1322](/prefect/demo-mcp-realm.json:1322):
```json
"smtpServer": {
  "host": "mailhog",
  "port": "1025",
  "from": "no-reply@demo-mcp.local",
  "fromDisplayName": "Demo MCP",
  "replyTo": "support@demo-mcp.local",
  "replyToDisplayName": "Demo MCP Support",
  "envelopeFrom": "no-reply@demo-mcp.local",
  "auth": "false",
  "starttls": "false",
  "ssl": "false"
}
```
For real SMTP (SES/Gmail/etc), use:
- `"auth": "true"`
- `"user": "..."`
- `"password": "..."`
- usually `"starttls": "true"` and `"ssl": "false"`.

3. Keep required actions enabled (you already have `UPDATE_PASSWORD` and `VERIFY_EMAIL` enabled at [demo-mcp-realm.json:2129](/prefect/demo-mcp-realm.json:2129)).

4. Optional but recommended: increase user action token lifespan if 5 minutes is too short:
- `actionTokenGeneratedByUserLifespan` is currently `300` seconds.

Important for your setup:
- You currently have no SMTP service in `docker-compose`. Add one (e.g. MailHog/Mailpit) or point to an external SMTP host.
- Realm JSON re-import may not apply if realm already exists in persistent `keycloak_volume`; update via Admin Console/API or recreate Keycloak data volume for a fresh import.

# Signup User
Use Keycloak’s invite flow, not “email a random password,” for the closest secure match.

Your current code path is:
- UI requires `username + password` in create-user dialog ([DashboardCreateUserDialog.jsx:90](t/frontend-react/src/pages/account/components/DashboardCreateUserDialog.jsx:90)).
- Submit enforces both ([dashboard.jsx:733](/pages/account/dashboard.jsx:733)).
- Backend creates user with permanent password (`temporary: False`) ([auth_routes.py:1054](outers/auth_routes.py:1054)).
- Login uses password grant ([auth_routes.py:371](/h)), which does not support interactive required-action redirects in your app.

### Recommended implementation (close to your goal)
1. In create-user dialog, collect only email.
2. Backend `/admin/users`:
   - set `username = email` and `email = email`.
   - set `requiredActions = ["UPDATE_PASSWORD", "VERIFY_EMAIL"]`.
   - call Keycloak `PUT /users/{id}/execute-actions-email` with those actions.
3. User gets Keycloak email, sets password via secure link, then logs in normally.
4. Change login label from “Username” to “Email” ([login.jsx:49](/prefect/frontend-react/src/pages/login.jsx:49)).

### Important note
If you keep password grant, you cannot do a true “login then redirect to reset password” UX.  
For that behavior, switch auth to OIDC Authorization Code + PKCE (Keycloak-hosted login), where required actions are handled automatically.

### If you insist on random password email
- Generate server-side password, set credential `temporary: True`.
- Send email yourself (you have an unused SMTP helper: [email_client.py:6](/prefect/arch-auth/api/email_client.py:6)).
- Still force `UPDATE_PASSWORD`.
- This is less secure than action-link onboarding.

1. If you want, I can implement this now in your frontend + backend with minimal API changes.
2. I can also include a fallback login error message for “Account is not fully set up” to guide users to check email.


**Major Implications**
1. Security improves: you stop handling raw passwords in your app (`/login` password grant) and rely on Keycloak’s hosted auth + PKCE.
2. Required actions (`UPDATE_PASSWORD`, `VERIFY_EMAIL`) become native: Keycloak forces them in its own UI before issuing usable tokens.
3. Password grant endpoints become optional/legacy: [`auth_routes.py:371`](/prefect/arch-auth/api/routers/auth_routes.py:371) and [`auth_routes.py:403`](/prefect/arch-auth/api/routers/auth_routes.py:403).

**Codebase Changes You’d Make**
1. Frontend login flow changes from form-post username/password to browser redirect + callback handling:
[AuthContext.tsx](/prefect/frontend-react/src/context/AuthContext.tsx) and [login.jsx](/prefect/frontend-react/src/pages/login.jsx).
2. Create-user dialog can remove password input and use email as username:
[DashboardCreateUserDialog.jsx](/prefect/frontend-react/src/pages/account/components/DashboardCreateUserDialog.jsx).
3. Admin create-user backend should set required actions and send execute-actions email:
[`/admin/users` in auth_routes.py](/prefect/arch-auth/api/routers/auth_routes.py:1054).

**Operational/UX Tradeoffs**
1. Better UX for first-login password setup, but more dependence on Keycloak uptime and email configuration.
2. Token/session handling becomes more complex in SPA (callback parsing, refresh strategy, logout redirect).
3. You must ensure Keycloak token claims (`groups`, roles) are present exactly as your backend expects, or authorization behavior can drift.

**For your exact goal**
This switch is the cleanest way to support “admin enters email only, user gets onboarding email, first login forces password reset” without custom password-email logic in your app.




# Group deployment perm issues
## Why `admin@gmail.com` sees all deployments without assignment

`admin@gmail.com` is set as the configured superuser in local compose (`SUPERUSER_USERNAME`) and is seeded at startup:
- [docker-compose.override.yml](/home/hauwei/Dropbox/APPS/prefect-keycloak/docker-compose.override.yml:78)
- [bootstrap.py](/home/hauwei/Dropbox/APPS/prefect-keycloak/arch-auth/api/auth/bootstrap.py:146)

In the Admin Dashboard, deployment visibility is role-gated, not deployment-assignment-gated:
1. [dashboard.jsx](/home/hauwei/Dropbox/APPS/prefect-keycloak/frontend-react/src/pages/account/dashboard.jsx:265) computes:
   - `canManageDeploymentResourcePermissions = isSuperuser || isGroupAdmin`
2. [dashboard.jsx](/home/hauwei/Dropbox/APPS/prefect-keycloak/frontend-react/src/pages/account/dashboard.jsx:352) loads deployments with:
   - `useAdminPrefectDeployments({ enabled: canManageDeploymentResourcePermissions })`
3. [useAdminPrefectDeployments.jsx](/home/hauwei/Dropbox/APPS/prefect-keycloak/frontend-react/src/hooks/useAdminPrefectDeployments.jsx:10) calls:
   - `GET /admin/prefect/deployments`
4. [prefect_gateway_routes.py](/home/hauwei/Dropbox/APPS/prefect-keycloak/arch-auth/api/routers/prefect_gateway_routes.py:554) only checks:
   - `require_superuser_or_group_admin`
   - then returns `prefect_client.list_deployments(...)` for all deployments

There is no per-user deployment-assignment filter in this `/admin/prefect/deployments` path, so a superuser does not need any direct deployment assignments to see every deployment in the dashboard.

**Short answer**
You can assign deployments directly to users because the system now has a first-class **user-level deployment permission path** that is independent of group-level assignment.

**What the Groups tab currently does**
1. The old “Assign User to Group” card is commented out, so group membership is not managed from that card now: [DashboardGroupsTab.jsx](/home/hauwei/Dropbox/APPS/prefect/frontend-react/src/pages/account/components/DashboardGroupsTab.jsx:90).
2. Active group actions are:
   - assign generic client permissions to a group,
   - assign deployment resource permissions to a group: [DashboardGroupsTab.jsx](/home/hauwei/Dropbox/APPS/prefect/frontend-react/src/pages/account/components/DashboardGroupsTab.jsx:162), [DashboardGroupsTab.jsx](/home/hauwei/Dropbox/APPS/prefect/frontend-react/src/pages/account/components/DashboardGroupsTab.jsx:243).

**How group vs user deployment permissions are implemented**
1. Frontend has separate handlers for group and user deployment assignment:
   - group: [dashboard.jsx](/home/hauwei/Dropbox/APPS/prefect/frontend-react/src/pages/account/dashboard.jsx:1135)
   - user: [dashboard.jsx](/home/hauwei/Dropbox/APPS/prefect/frontend-react/src/pages/account/dashboard.jsx:1168)
2. Backend has separate endpoints/tables:
   - group resource perms: [auth_routes.py](/home/hauwei/Dropbox/APPS/prefect/arch-auth/api/routers/auth_routes.py:1293)
   - user resource perms: [auth_routes.py](/home/hauwei/Dropbox/APPS/prefect/arch-auth/api/routers/auth_routes.py:1373)
   - separate DB models: [models.py](/home/hauwei/Dropbox/APPS/prefect/arch-auth/api/models/auth/models.py:18), [models.py](/home/hauwei/Dropbox/APPS/prefect/arch-auth/api/models/auth/models.py:29)
3. Permission matrix explicitly models both sources (`group_permissions`, `direct_user_permissions`, `effective_permissions`): [auth_routes.py](/home/hauwei/Dropbox/APPS/prefect/arch-auth/api/routers/auth_routes.py:745).

**Why direct user assignment works without group assignment**
1. Effective deployment access is computed as union of:
   - direct user grants, and
   - group grants for user’s groups: [service.py](/home/hauwei/Dropbox/APPS/prefect/arch-auth/api/auth/service.py:261).
2. So assigning directly to user is intentionally valid and does not require prior group assignment.

**Likely Keycloak regression point (inference)**
1. Runtime group inheritance depends on `principal.groups` from JWT: [deps.py](/home/hauwei/Dropbox/APPS/prefect/arch-auth/api/auth/deps.py:199).
2. Group permission rows are keyed by Keycloak **group ID** (`kc_group_id`): [service.py](/home/hauwei/Dropbox/APPS/prefect/arch-auth/api/auth/service.py:288).
3. Your realm config mapper for `groups` appears to emit group names/paths (not IDs), which can break ID matching: [demo-mcp-realm.json](/home/hauwei/Dropbox/APPS/prefect/demo-mcp-realm.json:393).
4. If that mismatch exists in live tokens, group deployment permissions won’t be inherited reliably, and direct user grants will appear to be the only path that “works”.

1. If you want, I can map exactly what claim format your live token has and point to the minimal backend fix (name→ID resolution or token mapper change).

### Can i change it later?
You can change it later. It is not a hard blocker.

Main risks if you go live first and fix later:
1. When you fix group claim mapping, old group deployment grants can suddenly start applying and expand access unexpectedly.
2. If you assign many direct user permissions now, later moving to clean group-based access is manual cleanup/migration work.
3. Auditing “why user has access” gets harder while both models are mixed.

If you defer, safest approach is:
1. Use direct user deployment permissions only for now.
2. Avoid assigning deployment permissions to groups until you intentionally switch.
3. Before switching later, audit current group/user permission records and test in staging first.

If you want, I can add a small guard now to hide/disable group deployment assignment in the UI so there’s no accidental drift.

====================

# prefect==3.4.25

# FTE CALC
- runtime houtrs = runtime minutes / 60
- fte = (rununtime hours / 7.5)
- How many human hours the bots ran for today.
- 1 FTE = 1500 = 7.5 * 220
- 7500 = hours in a year
- 5 FTE = 7500 / 1500



# PREFECT UI FEATUREs
- skip a scheduled flow run.


- https://blog.apify.com/how-to-use-selenium-wire/
- https://www.selenium.dev/documentation/test_practices/design_strategies/
- https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/

# Flows
- A single flow function can contain all of your workflow’s code. 
- However, if you put all your code in a single flow function and any line of code fails, the entire flow fails and must be retried from the beginning. 
- Its possible to go overboard with encapsulation, but making your workflows more granular can often help make your code easier to reason about and debug.
- Flows are convenient for composition, deployment, and server-side interaction and maintain a consistent context for task runs.
- Tasks are quick, cacheable, retryable, have transactional semantics and are easy to run concurrently.

# Deployments
- https://docs.prefect.io/v3/concepts/deployments
- Deployments run flows on a schedule and trigger runs based on events.
- Deployments are server-side representations of flows. 
- They store the metadata for remote orchestration including when, where, and how a workflow should run.
- inherits the infrastructure configuration from the work pool, and can be overridden at deployment creation time or at runtime.

# docker-compose
- https://docs.prefect.io/v3/how-to-guides/self-hosted/docker-compose

# Examples
- https://github.com/PrefectHQ/prefect/blob/main/examples/simple_web_scraper.py


# Authentication

Rename the DB column permissions.client_id → permissions.oauth_client_id to match your other tables (AuthorizationCode.oauth_client_id, RefreshToken.oauth_client_id), then update code + the raw SQL in on_startup.py (line 146).

## realm_id vs tenant_id vs client_id

In your codebase there are really **two IDs** you’re juggling (plus one overloaded term):

- **`realm_id` (internal tenant/org ID)**  
  - **Where:** `realms.id` (`api/models/models.py:28`) and FK’d from `TenantMembership.realm_id`, `Group.realm_id`, `Resource.realm_id`, `OAuthClient.realm_id`, `Permission.realm_id`, etc. (`api/models/models.py:80`, `api/models/models.py:93`, `api/models/models.py:153`, `api/models/models.py:206`, `api/models/models.py:123`).  
  - **Meaning:** your **local tenant / organizational boundary** (“realm”).  
  - **Runtime:** enforced via token claims `realm_id`/`realm_ids` and `enforce_tenant_boundary()` (`api/auth/service.py:383`, `api/auth/deps.py:78`).

- **`client_id` (public OAuth client identifier string)**  
  - **Where:** `oauth_clients.client_id` (unique string like `"frontend-react"`) (`api/models/models.py:206`, `api/settings.py:36`).  
  - **Meaning:** the **OAuth app identifier** that comes over the wire on `/oauth/authorize` and `/oauth/token`, and is stamped into the access token claim `client_id` (`api/routers/auth_routes.py:222`, `api/auth/service.py:383`).  
  - **Note:** lots of *DB relationships* do **not** use this string; they use the OAuth client row’s PK.

- **`tenant_id` (term, not a field in your schema)**  
  - **In *your* architecture today:** “tenant” is implemented as **`realm`**, so “tenant_id” effectively means **`realm_id`** (see `tenant_memberships` uses `realm_id`, not `tenant_id`) (`api/models/models.py:80`).  
  - **In Azure/Entra contexts:** “tenant id” usually means the **external directory GUID**, which you do **not** currently store as a first-class column in these models.

If you want to remove ambiguity, the biggest win is to standardize naming: reserve **`client_id`** for the public string, and use **`oauth_client_id`** for the internal `oauth_clients.id` PK (your `Permission.client_id` is the main offender).

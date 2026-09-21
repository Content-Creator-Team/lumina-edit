# Plan

I’ll inspect the referenced project and compare it with this app, then copy the matching landing/demo/product experience into the target project using the existing TanStack patterns. I’ll keep the demo mode behavior and avoid changing backend assumptions unless the target project already has them.

## Steps
- Inspect the referenced project structure and its current framework/files.
- Identify the current app files that define the landing, theme, demo mode, auth/API shell, and product screens.
- Apply the necessary files and dependencies to the referenced project or confirm if cross-project write access is unavailable.
- Verify the app builds/renders without environment variables and report any blockers.

## Technical notes
- Preserve the current Keycloak/FastAPI architecture and local demo fallback.
- Keep all assets self-contained in the project; no external production endpoints or mock backend routes.
- Maintain route metadata and accessibility states.

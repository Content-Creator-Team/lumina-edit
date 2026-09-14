# Lumina Edit

Build a Next.js 14 App Router + TypeScript frontend for an AI video editing platform. Connect exclusively to an existing FastAPI REST API and Keycloak-based auth. Do not use Supabase for auth/data and do not invent a backend. Implement the following requirements exactly:

AUTH: Integrate Keycloak via next-auth Keycloak provider or keycloak-js, configured by NEXT_PUBLIC_KEYCLOAK_URL, NEXT_PUBLIC_KEYCLOAK_REALM, NEXT_PUBLIC_KEYCLOAK_CLIENT_ID. Login screen must redirect to hosted Keycloak authorization-code-with-PKCE login, with no custom login fields. Preserve Keycloak MFA/TOTP redirect flow. After login, store access and refresh tokens in httpOnly cookies via Next.js route handler, never localStorage. Silently refresh before expiry using refresh token. All API calls attach Authorization Bearer token. middleware.ts protects every route except /login and auth callback paths; unauthenticated users redirect to Keycloak login. Logout clears session and redirects to Keycloak end-session endpoint. Expose JWT parsed email/name/org/role through a session/user context and useAuth hook.

API CLIENT: Central lib/api-client.ts wraps fetch with base URL NEXT_PUBLIC_API_URL, attaches auth, on 401 refreshes then redirects to login, and on 429 provides clear quota/rate-limit messages. Include typed request/response interfaces for:
POST /api/v1/videos/upload → { upload_url, video_id }
POST /api/v1/videos/{id}/confirm
GET /api/v1/videos/{id}
GET /api/v1/videos/{id}/scenes
GET /api/v1/videos/{id}/transcript
GET /api/v1/videos/{id}/edit-plan
GET /api/v1/videos/{id}/edit-plans
GET /api/v1/edit-plans/{id}
PATCH /api/v1/edit-plans/{id}
POST /api/v1/edit-plans/{id}/approve
POST /api/v1/videos/{id}/edit-plans/{plan_id}/revise
GET /api/v1/render-jobs/{id}

Use shadcn/ui + Tailwind throughout, TanStack React Query for every server state operation (cache, polling, mutations, etc.), no mock production fallbacks. Ensure real empty, loading, and error states. Surface usable FastAPI errors and friendly detailed 429 messages. All async action states must be explicit.

PAGES:
- /login: minimal branded screen with only a Log in button triggering Keycloak redirect, no form inputs.
- / dashboard authenticated: videos grid/list with thumbnail/name/upload date/status badges (uploading, processing, plan_ready, approved, rendering, complete, failed); upload button; zero-video empty state; short interval polling while any video is non-terminal.
- /upload: dnd/file picker for mp4/mov/mkv, size validation before presigned URL request. POST /videos/upload, direct MinIO presigned upload with real progress tracking, POST /videos/{id}/confirm then redirect. Retry upload gracefully without losing selected file on transient failure.
- /videos/[id]: processing overview with polling and pipeline: scene detection, transcription, timeline extraction, vision tagging, plan generation. For plan_ready+ link/redirect to review.
- /videos/[id]/review: core desktop-first review interface that remains usable at 1024px. HTML5 video with source from backend presigned playback URL. Custom timeline overlay with scene bounds, events markers/tooltips, plan segments color-coded keep/cut plus icon/text and clickable seeking. Segment list with thumbnail, start/end, keep/cut toggle, inline editable caption and text overlay. Trim handles are draggable and constrained to scene start/end. Collapsible paginated clickable transcript sidebar. Batch changes locally and PATCH only using explicit Save changes; dirty state. Approve & Render POST approve then render view. Disable controls when plan not DRAFT, explain immutability and link/embed revision mechanism.
- Revision prompt component within review: chat-like field. POST revise; 10-30s clear AI is revising state. On success load new version, banner quoting instruction, previous-version navigation. 429 friendly cap message. PlanningError gives rephrase guidance, preserves text and current plan.
- /videos/[id]/versions: all plans via API with version number, date, source (auto/revision instruction), status. View read-only and restore with a NEW version copying segments, never mutate history. If a backend endpoint is not listed for restore, do not invent one: disable it with clear explanatory UI or route it through the supported revision flow only.
- /videos/[id]/render: poll render job status queued/processing/complete/failed; completed player and download for presigned result URL; failure clear retry approve same plan; granular progress if supplied, otherwise indeterminate progress+elapsed time.
- /settings: JWT-driven profile name/email/org and conditional team member experience based on role. Do not invent a team-member endpoint: show role/access explanation/empty unavailable state unless data is supplied by a supported API. Include Keycloak Account Console external link rather than password management. Link to Grafana/PostHog only when configured via environment URLs.

ACCESSIBILITY: keyboard navigable controls, ARIA labels for video/timeline controls, never rely on color alone. Responsive to tablet.

Also add a distinct public, 3D animated storytelling landing page with images/video visual treatments. It should feel premium and cinematic, explain the AI video-editing journey, use motion and layered 3D visuals without compromising performance/accessibility (respect reduced motion). Keep it separate from the protected product app routes. Use real supplied static assets only; if no assets are present, use CSS/gradient/abstract visual composition instead of committing mock data.

Build thoroughly, run checks, and ensure configuration/documentation makes required env vars clear.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/354303d4-926b-4210-b7b6-d94d137957ac).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

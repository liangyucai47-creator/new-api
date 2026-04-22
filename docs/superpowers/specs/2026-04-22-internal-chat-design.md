# Internal Chat Design

**Date:** 2026-04-22

## Goal

Build a first formal internal chat experience for administrators, separate from `Playground`, with:

- a top-menu-only `聊天` entry
- an independent route at `/console/internal-chat`
- a local conversation list
- per-conversation model switching
- text plus image input
- hidden token handling, where the default model is derived from the user's first token

The first slice should feel like a real product shell rather than a debug/test console, while still reusing the existing relay stack.

## Scope

This design includes:

- a new admin-only frontend entry in the top header menu
- a new admin-only chat page with left conversation list and center chat panel
- local-first conversation persistence on the frontend
- model switching at the conversation level
- default model resolution based on the first token in the user's token list
- a backend adjustment so internal chat requests can execute under a real owned token context
- reuse of the existing `/pg/chat/completions` relay path for the first version

This design explicitly does not include:

- a token selector in the UI
- non-admin availability
- server-side conversation persistence
- cross-device sync
- prompt library, tools, knowledge base, workspace panel, or RAG features
- replacing or removing `Playground`
- changing the public OpenAI-compatible `/v1/*` relay interfaces

## Existing Context

The current repo already has a powerful `Playground` page that supports message sending, model loading, and image paste flow. That page is suitable as a test console, but it is not a good long-term internal product surface because it exposes too much playground/debug framing and only stores a single message thread shape.

Two current behaviors matter for this design:

1. `/api/user/models` returns models available to the logged-in user based on group access, not on a specific token.
2. `/pg/chat/completions` currently runs under a temporary token-like context created from user/group data, so it does not enforce the model limits of a specific real token.

Because the approved UX says "default to the first token's models" while hiding token selection from users, the first slice needs a small backend enhancement. Otherwise the UI would only pretend to be token-aware.

## User Experience

### Entry And Access

- Add `聊天` to the top header menu only.
- Do not add the same entry to the left sidebar.
- Clicking `聊天` opens `/console/internal-chat`.
- Only administrators can see the menu item.
- Non-admin users who manually open `/console/internal-chat` are redirected to `/console`.

`Playground` stays available under its existing console entry for debugging and operational testing, but it is not presented as the primary chat experience.

### Page Layout

The page uses the approved two-column product layout:

- left column: local conversation list
- center column: active conversation area

The left column contains:

- `新建会话`
- conversation title list
- last update time
- lightweight preview of the latest message

The center column contains:

- a compact top toolbar
- a model selector
- a clear-current-conversation action
- the message stream
- a bottom input area for text and image attachments

The model selector is visible and user-switchable. Token selection is not visible in the UI.

### Conversation Behavior

- Each conversation stores its own selected model.
- Switching models affects only the current conversation.
- New conversations inherit the current default model.
- New conversations start with a placeholder title such as `新会话`.
- After the first user message is sent, the title is auto-derived from that message.
- Refreshing the page restores the last active conversation when possible.

## Frontend Data Design

### Persistence Split

The frontend should not store all conversation content in `localStorage`, because image attachments quickly exhaust browser storage limits.

Use a split storage design:

- `localStorage` stores conversation metadata and UI state
- `IndexedDB` stores conversation message bodies and image payloads

`localStorage` stores:

- conversation index list
- active conversation id
- per-conversation title
- per-conversation selected model
- per-conversation hidden resolved token id
- per-conversation updated timestamp
- per-conversation last message preview

`IndexedDB` stores:

- ordered message list for each conversation
- user image attachments
- assistant replies and streaming-complete message content

This keeps the first version local-first while making image support practical.

### Frontend State Model

Each conversation record should include at least:

- `id`
- `title`
- `model`
- `resolvedTokenId`
- `updatedAt`
- `lastMessagePreview`

Each message record should include at least:

- `id`
- `role`
- `content`
- `status`
- `createdAt`
- optional image attachment metadata

The hidden `resolvedTokenId` is an implementation detail. Users do not see it, but the app uses it to keep a conversation aligned with the token context it was initialized from.

## Default Token And Model Resolution

### Token Rule

On first load, the page fetches the user's token list from `/api/token/` and uses the first token returned by that list as the default token source.

With the current backend ordering, "first token" means the token at the top of the list returned by `GetAllUserTokens`, which is sorted by `id desc`. In practice, that means the newest created token becomes the default source unless the backend ordering changes later.

### Model Rule

The page also fetches the user's allowed models from `/api/user/models`.

It then computes the visible model list for the default token:

- if the default token has `model_limits_enabled = true`, use the intersection of:
  - the token's `model_limits`
  - the user's allowed model list
- if the default token does not enable model limits, use the user's allowed model list directly

The default selected model is the first model in that resolved list.

### Hidden Token Handling

The first slice does not show token switching in the UI.

Instead:

- the page resolves one hidden default token on load
- each new conversation stores that resolved token id internally
- the user only sees and changes the model selector

If the stored hidden token later disappears or becomes unusable, the app falls back to the current default token and revalidates the conversation's model.

## Backend Design

### Why A Backend Change Is Required

The current `Playground` controller writes a temporary token context based on the current user and selected group. That is good enough for a debugging console, but not enough for this feature because it does not actually enforce a specific owned token's model limits.

If internal chat is supposed to default to "the first token's models", the relay path must be able to execute under that token's real context.

### Proposed Backend Adjustment

Keep `/pg/chat/completions` as the first-version send endpoint, but make it token-aware for internal chat requests.

Add an optional `token_id` field to the playground request payload.

`dto.PlayGroundRequest` becomes conceptually:

```go
type PlayGroundRequest struct {
    Model   string `json:"model,omitempty"`
    Group   string `json:"group,omitempty"`
    TokenID int    `json:"token_id,omitempty"`
}
```

Then introduce a lightweight middleware before `Distribute()` for playground requests:

- parse `token_id` from the reusable request body
- verify the token belongs to the current logged-in user
- call `middleware.SetupContextForToken(...)`
- if `token_id` is absent, keep the current behavior for legacy playground callers

That route order becomes conceptually:

`UserAuth() -> PlaygroundTokenContext() -> Distribute() -> controller.Playground`

This preserves backward compatibility for the current playground page while allowing the new internal chat page to send requests under a real token context.

### Controller Behavior

`controller.Playground` should keep backward compatibility:

- if a real token context is already set by the new middleware, use it
- if no token context is set, keep the current temporary-token fallback for legacy playground usage

This design avoids introducing a brand new relay controller for the first slice.

## Request And Data Flow

### Page Bootstrap

1. Admin opens `/console/internal-chat`.
2. Frontend checks admin visibility and route access.
3. Frontend fetches:
   - `/api/token/`
   - `/api/user/models`
4. Frontend resolves the default token from the first token in the returned list.
5. Frontend computes the default visible model list.
6. Frontend restores the last local conversation or creates a new one.

### Message Send

1. User writes text and optionally adds an image.
2. Frontend persists the outgoing state locally.
3. Frontend sends `/pg/chat/completions` with:
   - `model`
   - `token_id`
   - existing compatible playground fields as needed
4. Backend middleware validates `token_id` ownership and sets real token context.
5. `Distribute()` and relay execution now see the token's model limit and group context.
6. Streaming or final assistant output is persisted back into the local conversation store.
7. Conversation metadata is updated in `localStorage`.

## Image Handling

The first version should support practical image input without building a file service.

Approved behavior:

- support local image attachment from the chat input through file selection
- support image paste into the chat input
- persist image payloads in `IndexedDB`, not `localStorage`
- enforce a frontend size limit before accepting an image into local storage

The first version does not need:

- media library management
- image deduplication across conversations
- remote object storage

## Error Handling

### Access Errors

- non-admin users do not see the top-menu entry
- non-admin direct access to `/console/internal-chat` redirects to `/console`

### Bootstrap Errors

- if the user has no tokens, show an empty state and disable sending
- if the resolved default token yields no visible models, show an empty state and disable sending
- if token fetch or model fetch fails, show a recoverable load error with retry

### Conversation Errors

- if a saved conversation model is no longer available, fall back to the resolved default model and show a lightweight notice
- if a saved hidden token no longer exists, rebind the conversation to the current default token and revalidate the model

### Storage Errors

- if `IndexedDB` write fails, keep the current in-memory session alive when possible and show a non-blocking warning
- if the browser storage quota is exceeded, reject new image persistence and explain that local storage space is full

### Send Errors

- invalid `token_id` or token ownership mismatch should fail closed with a clear JSON error
- oversized images should be blocked on the frontend before relay submission
- normal relay/provider errors continue to surface through the existing relay error format

## Testing Strategy

The first implementation should verify both the frontend product shell and the backend token-context addition.

### Frontend

- top header shows `聊天` only for admins
- left sidebar does not show a duplicate chat entry
- `/console/internal-chat` route renders correctly for admins
- non-admin access redirects away
- first load resolves a default model from the first token rule
- switching models only affects the active conversation
- new conversation inherits the current default model
- local conversation list survives refresh
- image attachment flow works with local persistence

### Backend

- playground token-context middleware accepts an owned `token_id`
- middleware rejects a token owned by another user
- playground requests without `token_id` continue to work for legacy callers
- token model limits are visible to downstream selection when `token_id` is present

### Integration

- an internal chat request sent with hidden `token_id` can only use models allowed by that token
- fallback behavior works when the stored model or stored token becomes invalid

## Notes

- This slice intentionally keeps token switching hidden even though token context is part of the implementation.
- `Playground` remains a separate operator/testing surface.
- Server-side conversation persistence can be added later without invalidating this layout or conversation model, because the local conversation schema already separates metadata from message bodies.

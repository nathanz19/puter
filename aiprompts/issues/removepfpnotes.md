# Remove Profile Picture — Implementation Notes

Goal

Add a button and backend support that allows users to remove their profile picture and revert to the default avatar.

High-level summary

- Add a "Remove" (or "Delete") control in the account/profile settings next to the current uploaded profile picture.
- Implement a backend endpoint that clears the profile picture reference for the user and removes the stored file (if applicable).
- Ensure the UI falls back to the default avatar immediately after removal.
- Add tests, accessibility, and i18n strings.

Contract (tiny)

- Inputs: authenticated user id, request to remove profile picture (no body needed).
- Outputs: 200 OK with JSON { ok: true } on success, 404 if user not found, 401 if not authenticated, 500 on server error.
- Side effects: delete or mark unused the stored file; update user's DB row to null/empty profile picture field.

UI/UX

- Place a small text button labeled "Remove" (or icon button with trash) next to the existing "Upload" button or current avatar preview in `Account settings`.
- Confirm pattern: optional small confirmation (Are you sure? This will restore your default avatar.) — make confirmation optional based on product preference. If team prefers quick undo, prefer a non-modal inline confirm.
- After success: show toast/snackbar "Profile picture removed" and show default avatar immediately.

API

- New endpoint (examples):
  - DELETE /api/me/avatar
  - POST /api/me/avatar/remove

- Behavior:
  - Verify user auth (session or token)
  - Look up user's avatar metadata (DB column: `avatar_url`, `avatar_key`, `profile_picture`, etc.)
  - If stored in object storage (S3, GCS, local), attempt deletion of the object; if deletion fails, still clear DB reference but log error and return 207/200 depending on policy.
  - Set DB avatar column to NULL or empty string
  - Return success

DB changes

- Usually none needed if avatar is already optional and stored as URL/key; otherwise ensure column allows NULL.
- If you store avatars in a separate table, delete related row or mark unused.

Storage cleanup

- If using a file store, delete the object when removing the avatar. Consider async deletion job if immediate deletion might fail.
- If using CDN caches, invalidate or use versioned keys so default avatar is returned for same endpoint.

Edge cases and considerations

- Race: concurrent replace + remove. Use optimistic checks: always clear DB to default; if replace arrives at same time, last-writer-wins (timestamp) or implement lock.
- Partial failure: deletion from storage fails but DB cleared. Log the error and provide a retry/backfill job to clean orphaned objects.
- Permissions: ensure only profile owner (or admins) can remove a user's avatar.
- Default avatar: ensure frontend uses the default when DB value is null/empty; do not rely on a specific URL being present.
- Empty state: allow users who never uploaded to still use UI (Remove button hidden or disabled when no avatar exists).
- Rate-limits and abuse: small risk — removal is cheap; no heavy constraints.

Accessibility (a11y)

- Button must have aria-label="Remove profile picture" when icon-only.
- Focus state and key-accessible (enter/space) for confirmation modal.

i18n

- Add key: `account.avatar.removeButton` and `account.avatar.removeConfirm` and `account.avatar.removedToast` to translations.

Testing

- Frontend:
  - Unit test: clicking Remove triggers API call and updates UI to default avatar.
  - Integration test: simulate user with avatar, remove it, assert avatar element uses default src.
- Backend:
  - Unit tests: removing when avatar exists clears DB and returns 200.
  - Tests for when user has no avatar: return 200 or 404 depending on policy; prefer idempotent 200.
  - Test unauthorized access returns 401.
- E2E:
  - Upload an avatar, remove it, assert default shown and storage object removed (if feasible).

Acceptance criteria

- UI shows Remove control only when a non-default avatar exists (or if shown, it should be disabled otherwise).
- Clicking Remove clears avatar and the UI shows default avatar immediately.
- Backend properly clears DB reference and (optionally) deletes storage object.
- Tests cover happy path and key edge cases.

Implementation checklist (step-by-step)

1. Frontend: add UI control
   - Add button next to avatar preview in `Account settings` component.
   - Add optional small confirmation modal or inline confirm.
   - Add `i18n` keys.
   - Hook call to API endpoint `DELETE /api/me/avatar`.
   - On success, update local user state (Redux/Context) to remove avatar URL and show default.

2. Backend: add endpoint
   - Add route handler `DELETE /api/me/avatar` (or chosen path).
   - Authenticate user via existing middleware.
   - Read user's avatar key/url from DB.
   - If storage-backed, call storage delete using existing storage client.
   - Update DB to set avatar = NULL or default value.
   - Return JSON success.

3. Storage/cleanup
   - Use existing storage client; if none, delete file on disk or mark for deletion.
   - If deletion may fail or be slow, enqueue cleanup job and still return success (but log and track orphaned objects).

4. Tests
   - Add unit tests for backend handler.
   - Add frontend tests for UI behavior.

5. Migrations & safety
   - If DB column isn't nullable, add migration to allow NULL (if required).

6. Docs & changelog
   - Add short note in `CHANGELOG.md` under Unreleased: "Allow users to remove profile picture from account settings."
   - Add short usage docs if you maintain an API docs site.

Code snippets (pseudo)

- Frontend fetch (JS/TS):

```js
// call remove endpoint
await fetch('/api/me/avatar', { method: 'DELETE', credentials: 'include' });
// then update UI state
setUser(prev => ({ ...prev, avatarUrl: null }));
```

- Backend (Express-like):

```js
app.delete('/api/me/avatar', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const user = await db.getUser(userId);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const avatarKey = user.avatar_key;
  if (avatarKey) {
    try { await storage.delete(avatarKey); } catch (err) { console.error('storage delete failed', err); }
  }

  await db.updateUser(userId, { avatar_key: null, avatar_url: null });
  res.json({ ok: true });
});
```

Rollout and monitoring

- Monitor logs for storage deletion errors
- Add a small metric counter `avatar_removed_total`
- Consider periodic job to clean orphaned files older than X days

Security

- Ensure only owners/admins can perform delete
- Ensure storage delete cannot be used to remove arbitrary keys (validate key belongs to user or is under user prefix)

Follow-ups / Next steps

- Tell me which stack you want me to implement this in (frontend framework and backend language) and I can implement the change end-to-end and add tests.
- If you want, I can open a PR with the UI + API + tests.

# <u>AI Process</u>
# Step 1: Small UI remove button (goal)

- Goal: Add a minimal, testable UI control that allows a user to remove their profile picture and persist the change locally by setting the profile picture to null. This step intentionally avoids backend file deletion, confirmation modal, and conditional hiding — those will be separate steps.

- Files changed in this step:
  - `src/gui/src/UI/Settings/UITabAccount.js` — added a "Remove" button under the avatar preview and a click handler that clears the UI and calls `update_profile(username, {picture: null})`.

- Behavior to verify manually:
 1. Open the app and go to Account settings.
 2. Upload or set a profile picture via the existing flow.
 3. Click the new "Remove" button under the avatar preview.
 4. The avatar preview should immediately revert to the default icon.
 5. The `.profile-image` element should lose the `profile-image-has-picture` CSS class.
 6. The user's `.profile` file should be updated by the existing `update_profile` helper to set `picture` to `null` or equivalent on next write.

- Notes / rationale:
  - This is a single, small change that is easy to test and review (follows the "Implement milestone step" guidance).
  - Next steps (each a separate milestone) should include: confirmation UI, conditional button visibility, i18n and aria attributes, backend endpoint to delete stored image files (if applicable), and tests.

# Step 2: Confirmation modal before removal (goal)

- Goal: Add a simple confirmation modal that asks users to confirm they want to remove their profile picture. The modal should be small, accessible, and call the removal handler only after confirmation. This remains UI-only and will not handle backend storage deletion.

- Files changed in this step:
  - `src/gui/src/UI/Settings/UIWindowConfirmRemoveAvatar.js` — new confirmation window component using existing `UIWindow` patterns.
  - `src/gui/src/UI/Settings/UITabAccount.js` — updated to open the confirmation modal and perform the UI + `update_profile(..., {picture: null})` only after the user confirms.

- Behavior to verify manually:
 1. Open the app and go to Account settings.
 2. Ensure you have a custom profile picture set.
 3. Click the new "Remove" button.
 4. A confirmation dialog should appear with "Remove" and "Cancel" options.
 5. Click "Cancel": dialog closes, avatar remains unchanged.
 6. Click "Remove": dialog closes, avatar preview reverts to the default icon, `.profile-image` loses `profile-image-has-picture`, and `update_profile` is invoked to persist `picture: null`.

- Notes / rationale:
  - Using a small modal matches other confirm flows (e.g., account deletion) and keeps UX consistent.
  - Accessibility: we'll add aria-labels and i18n keys in the next step.

# Step 3: i18n keys and accessibility (goal)

- Goal: Add internationalization keys and ARIA attributes so the Remove flow is accessible and translatable.

- Files changed in this step:
  - `src/gui/src/UI/Settings/UIWindowConfirmRemoveAvatar.js` — used `account.avatar.removeButton` and `account.avatar.removeConfirm` i18n keys where appropriate, and added `aria-label` attributes to the confirm/cancel buttons.
  - `src/gui/src/UI/Settings/UITabAccount.js` — added `aria-label` to the Remove button and used `account.avatar.removeButton` i18n key for the label.

- i18n keys to add to your translations files:
  - `account.avatar.removeButton` — label for the Remove button (e.g., "Remove").
  - `account.avatar.removeConfirm` — confirmation prompt text (e.g., "Are you sure you want to remove your profile picture? This will restore your default avatar.").
  - `account.avatar.removedToast` — optional success toast (e.g., "Profile picture removed").

- Behavior to verify manually:
  1. Open Account settings and click Remove.
  2. Confirm dialog should show the prompt translated if translations exist.
  3. Buttons should have aria-label attributes (inspect in devtools) for screen readers.

- Notes:
  - If your project uses a centralized JSON/YAML i18n store, add the keys there. If not, the code will gracefully fall back to existing `remove`/`cancel` keys or English text.
  - Next step can be to hide the Remove button when no custom avatar exists and to add a small toast message after successful removal.




## Quick scratchpad — GUI architecture & exploration notes

These notes collect the important places to look when you want to understand or change a GUI feature in this repository (Puter). Use this as a quick start when you review or implement features.

---

## 1) Entry / bootstrap
- `src/gui/src/index.js` and `src/gui/src/initgui.js` are the GUI bootstrap. They set globals (api/gui origins), load the appropriate bundles, and call `window.initgui(options)`.
- `initgui.js` launches services (`launch_services`) and then initializes the desktop or other flows.

## 2) Where UI is rendered
- UI is component/window-based. Look in `src/gui/src/UI/` for individual window modules. Common patterns:
  - `UIWindow({... body_content: h, ...})` — builds HTML string and mounts a window.
  - `UIComponentWindow({ component })` — mounts a Component instance into a window via a placeholder.
- Example files:
  - `UIWindowLogin.js` — login modal implemented as a UIWindow.
  - `UIDesktop.js` — desktop shell, socket wiring, global handlers.

## 3) Event handling
- DOM events are mostly registered with jQuery on elements returned from `UIWindow` (e.g. `$(el_window).find('.login-btn').on('click', ...)`).
- Realtime events use socket.io: `window.socket.on('event.name', handler)` (handlers in `UIDesktop.js`).
- Cross-service / app events use the internal service bus: services are registered in `launch_services()` and the global `services` exposes `get(name)` and `emit(id, args)`. Service instances implement `__on` handlers to receive emitted events.

## 4) Services & lifecycle
- Services are constructed and initialized in `initgui.js` via `register('name', new SomeService())`.
- Services expose `construct()` and `init()` lifecycle methods. Use `globalThis.services.get('name')` to call a service from UI code.

## 5) Backend / API calls
- UI code calls backend via `$.ajax(...)` or `fetch(...)` and uses `window.gui_origin` / `window.api_origin` to build URLs.
- Auth and storage often use the `puter` SDK (`puter.setAuthToken()`, `puter.kv`, etc.).

## 6) Concrete example: Login flow (how to trace)
1. UI: `src/gui/src/UI/UIWindowLogin.js` constructs the HTML and calls `UIWindow(...)`.
2. Event handler: `$(el_window).find('.login-btn').on('click', ...)` handles button clicks and does validation.
3. Backend: the handler issues `$.ajax({ url: window.gui_origin + "/login", type: 'POST', ... })` (or `fetch` for OTP endpoints).
4. Success handling: `window.update_auth_data(data.token, data.user)` and sometimes `window.location.replace(cleanUrl)` to redirect.
5. Other reactions: server may emit socket events, and `UIDesktop.js` contains `window.socket.on('...')` handlers that update UI globally.

## 7) How to explore a new feature (recipe)
1. Search `src/gui/src/UI/` for `UIWindow<Feature>.js` or `UIComponentWindow` usage.
2. In the UI file, find `.on('click'` or `$(...).on(` to see event handlers.
3. Find `$.ajax(` or `fetch(` to locate backend endpoints used by the feature.
4. Check `UIDesktop.js` for socket listeners related to the feature (`socket.on('...')`).
5. Check `src/gui/src/services/` if the behavior is cross-cutting or long-lived — consider adding a service instead of ad-hoc global wiring.

## 8) Useful searches (run at repo root)
 - Find window-based UI creators:
   rg "UIWindow\(" --hidden
 - Find socket listeners:
   rg "socket.on\(" --hidden
 - Find API calls (fetch/ajax):
   rg "(fetch\(|\\$\\.ajax\()" --hidden
 - Find service registration:
   rg "register\(" src/gui/src/initgui.js --hidden
 - Find uses of the service bus:
   rg "services.get\(" --hidden

If you don't have `rg` (ripgrep), use `grep -R` as a fallback.

## 9) Quick checklist before making changes
- Locate the UIWindow / Component responsible for the UI.
- Enumerate event handlers and DOM selectors used.
- Note backend endpoints and any socket events the feature relies on.
- Add i18n keys in `src/gui/src/i18n/` if you add user-facing strings.
- Reuse `window.gui_origin`/`window.api_origin` and `puter` SDK for auth/storage.
- Run the dev GUI (`dev-server.js`) and test locally.

## 10) Next steps you can ask me to do
- Trace another feature end-to-end (file sharing, publish, notifications, etc.).
- Produce a small diagram or a file-by-file call map for a chosen feature.
- Add inline TODO comments to specific files or create a short README for a feature.

---

File created automatically to collect notes during exploration.

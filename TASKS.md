# 📋 To-Do List Application — Development Roadmap
**Stack:** HTML · Tailwind CSS · TypeScript · Vite

---

## Phase 1: Type System & Data Model

- [x] **Task 1: Define Core TypeScript Types and Interfaces**
  * In `types/index.ts`, define and export the `Priority` union type: `export type Priority = 'low' | 'medium' | 'high'`.
  * Define and export the `TodoStatus` union type: `export type TodoStatus = 'pending' | 'completed'`.
  * Define and export the `Todo` interface with fields: `id: string`, `title: string`, `description: string`, `priority: Priority`, `status: TodoStatus`, `createdAt: number`, `completedAt: number | null`, `dueDate: number | null`.
  * Define and export the `FilterState` interface with fields: `status: TodoStatus | 'all'`, `priority: Priority | 'all'`, `searchQuery: string`.
  * Define and export the `AppState` interface with fields: `todos: Todo[]`, `filter: FilterState`, `editingId: string | null`.
  * **Tests:** Run `npx tsc --noEmit` and confirm zero type errors. Write a temporary object literal of type `Todo` with a deliberate wrong field type (e.g., `id: 123`), confirm the compiler reports an error, then revert.

- [x] **Task 2: Implement the ID Generation Utility**
  * Create `src/utils/id.ts` and export a single function `generateId(): string`.
  * Implement the function using `crypto.randomUUID()` — no external libraries, no `Math.random()`.
  * Ensure the function return type is explicitly annotated as `string`.
  * Export `generateId` from `src/utils/index.ts` via a re-export: `export { generateId } from './id'`.
  * In `src/main.ts`, call `generateId()` twice in sequence and `console.log` both values to manually verify they are different UUID strings during dev. Remove after verification.
  * **Tests:** Call `generateId()` 1000 times in a test loop and assert that all returned values are unique strings matching the UUID v4 regex `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`.

- [ ] **Task 3: Implement Date Utility Functions**
  * Create `src/utils/date.ts` and export three functions: `getNow(): number`, `formatDate(timestamp: number): string`, and `isOverdue(dueDate: number | null): boolean`.
  * `getNow` returns `Date.now()`.
  * `formatDate` converts a Unix timestamp (ms) to a human-readable string using `Intl.DateTimeFormat` with options `{ year: 'numeric', month: 'short', day: 'numeric' }`. It must never use external libraries.
  * `isOverdue` returns `false` if `dueDate` is `null`, otherwise returns `true` if `dueDate < Date.now()`.
  * Export all three from `src/utils/index.ts`.
  * **Tests:** Assert that `formatDate(new Date('2024-01-15').getTime())` returns `'Jan 15, 2024'`. Assert `isOverdue(null)` returns `false`. Assert `isOverdue(Date.now() - 1000)` returns `true`. Assert `isOverdue(Date.now() + 100000)` returns `false`.

---

## Phase 2: State Management (Store)

- [ ] **Task 4: Implement LocalStorage Persistence Utilities**
  * Create `src/store/persistence.ts` and export two functions: `saveState(state: AppState): void` and `loadState(): AppState | null`.
  * `saveState` serializes `state` via `JSON.stringify` and writes it to `localStorage` under the key `'todo-app-state'`. Wrap the call in a `try/catch` — on error, `console.error` the error and do nothing else (do not re-throw).
  * `loadState` reads from `localStorage` under `'todo-app-state'`. If the key is missing, return `null`. If `JSON.parse` throws, `console.error` the error and return `null`. Otherwise, return the parsed value cast as `AppState`.
  * Export both from `src/store/index.ts`.
  * **Tests:** Call `saveState` with a valid `AppState`, then call `loadState` and assert the returned object deeply equals the saved object. Call `loadState` on a fresh `localStorage` and assert `null` is returned. Simulate a corrupt JSON string in `localStorage` and assert `loadState` returns `null` without throwing.

- [ ] **Task 5: Define the Default Application State**
  * Create `src/store/defaultState.ts` and export a function `getDefaultState(): AppState`.
  * The returned object must have: `todos: []`, `filter: { status: 'all', priority: 'all', searchQuery: '' }`, `editingId: null`.
  * The function must return a new object on every call (no shared mutable reference).
  * Export `getDefaultState` from `src/store/index.ts`.
  * **Tests:** Call `getDefaultState()` twice and assert the two returned objects are deeply equal but not the same reference (`!==`).

- [ ] **Task 6: Implement the State Store with Subscriber Pattern**
  * Create `src/store/store.ts`. Define a module-level variable `let state: AppState` initialized by calling `loadState() ?? getDefaultState()`.
  * Define a `Set` of subscriber callbacks: `const subscribers = new Set<() => void>()`.
  * Export `getState(): AppState` — returns a shallow clone of state via `{ ...state }`.
  * Export `subscribe(cb: () => void): () => void` — adds `cb` to the set and returns an unsubscribe function that removes `cb` from the set.
  * Export `setState(updater: (prev: AppState) => AppState): void` — calls `updater(state)`, assigns the result back to `state`, calls `saveState(state)`, then iterates `subscribers` and calls each callback.
  * Export all four from `src/store/index.ts`.
  * **Tests:** Call `setState` with an updater that appends a todo, then call `getState` and assert the todo is present. Subscribe a callback, call `setState`, and assert the callback was invoked exactly once. Call the returned unsubscribe function, call `setState` again, and assert the callback was NOT invoked a second time.

- [ ] **Task 7: Implement All Todo Mutation Actions**
  * Create `src/store/actions.ts`. All functions here call `setState` internally.
  * `addTodo(title: string, description: string, priority: Priority, dueDate: number | null): void` — creates a new `Todo` using `generateId()` and `getNow()`, with `status: 'pending'` and `completedAt: null`, and spreads it into `state.todos`.
  * `removeTodo(id: string): void` — returns a new state where `todos` is filtered to exclude the todo with the matching `id`.
  * `toggleTodo(id: string): void` — flips the `status` of the matching todo between `'pending'` and `'completed'`. When toggling to `'completed'`, sets `completedAt: getNow()`. When toggling back to `'pending'`, sets `completedAt: null`.
  * `updateTodo(id: string, changes: Partial<Pick<Todo, 'title' | 'description' | 'priority' | 'dueDate'>>): void` — merges `changes` into the matching todo using object spread.
  * `setFilter(filter: Partial<FilterState>): void` — merges `filter` into `state.filter` using object spread.
  * `setEditingId(id: string | null): void` — sets `state.editingId`.
  * Export all six from `src/store/index.ts`.
  * **Tests:** For each action, call it with valid arguments and assert `getState()` reflects the expected change. Test `removeTodo` with a non-existent ID and assert state is unchanged. Test `toggleTodo` twice on the same todo and assert it returns to `'pending'` with `completedAt: null`.

- [ ] **Task 8: Implement the Derived Selector for Filtered Todos**
  * Create `src/store/selectors.ts` and export `getFilteredTodos(state: AppState): Todo[]`.
  * Apply `status` filter: if `state.filter.status` is not `'all'`, keep only todos where `todo.status === state.filter.status`.
  * Apply `priority` filter: if `state.filter.priority` is not `'all'`, keep only todos where `todo.priority === state.filter.priority`.
  * Apply `searchQuery` filter: if `state.filter.searchQuery` is non-empty, keep only todos where `todo.title.toLowerCase().includes(query.toLowerCase()) || todo.description.toLowerCase().includes(query.toLowerCase())`.
  * Sort the resulting array: `'pending'` todos by `createdAt` descending, then `'completed'` todos appended at the bottom sorted by `completedAt` descending.
  * Export `getFilteredTodos` from `src/store/index.ts`.
  * **Tests:** Seed a state with 5 todos of mixed status and priority. Assert the correct count is returned for each filter combination. Assert the sort order: most recently created pending todos appear first. Assert completed todos are always last regardless of their `createdAt`.

---

## Phase 3: UI Component Architecture

- [ ] **Task 9: Bootstrap the Root HTML Shell**
  * Replace the entire body content of `index.html` with a single `<div id="app"></div>`.
  * Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">` if not already present.
  * Set `<title>` to `Todo App`.
  * In `src/main.ts`, select `document.getElementById('app')` and assign it to a `const app` typed as `HTMLElement`. If `app` is `null`, throw an `Error('Root element #app not found')` — do not use non-null assertion (`!`).
  * Set `app.innerHTML` to the string `'<p>App mounting...</p>'` to confirm DOM access works, then remove it.
  * **Tests:** In a JSDOM environment, assert that `document.getElementById('app')` is not null after `index.html` is parsed. Assert that removing `#app` from the DOM and re-running the bootstrap throws the expected error.

- [ ] **Task 10: Implement the `createElement` DOM Utility**
  * Create `src/utils/dom.ts` and export a function `createElement<K extends keyof HTMLElementTagNameMap>(tag: K, classes?: string[], attributes?: Record<string, string>): HTMLElementTagNameMap[K]`.
  * The function calls `document.createElement(tag)`, then if `classes` is non-empty, sets `el.className = classes.join(' ')`, then iterates `attributes` and calls `el.setAttribute(key, value)` for each pair, then returns `el`.
  * Export `createElement` from `src/utils/index.ts`.
  * **Tests:** Call `createElement('button', ['btn', 'btn-primary'], { 'data-id': '123', 'aria-label': 'Close' })` and assert the returned element is an `HTMLButtonElement`, has className `'btn btn-primary'`, and has the correct attribute values.

- [ ] **Task 11: Implement the Header Component**
  * Create `src/components/Header.ts` and export a default function `Header(): HTMLElement`.
  * The function builds and returns a `<header>` element containing an `<h1>` with the text `My Todos` and a `<p>` subtitle with the text `Stay organized, stay productive.`
  * Apply Tailwind classes directly on the elements. The header must have a bottom border. The `<h1>` must use a large bold font. No inline styles — only Tailwind utility classes via `className`.
  * The function must be pure: calling it twice returns two independent DOM trees with no shared references.
  * Export `Header` from `src/components/index.ts`.
  * **Tests:** Call `Header()` and assert the returned element is an `HTMLElement` with `tagName === 'HEADER'`. Assert it contains exactly one `<h1>` with `textContent === 'My Todos'`. Assert calling it twice returns different object references.

- [ ] **Task 12: Implement the Stats Bar Component**
  * Create `src/components/StatsBar.ts` and export a default function `StatsBar(todos: Todo[]): HTMLElement`.
  * Compute three values from the `todos` array: `total` (length), `pending` (count where `status === 'pending'`), `completed` (count where `status === 'completed'`).
  * Build and return a `<div>` containing three labeled stat blocks displaying each value. Each block shows a numeric value and a label (e.g., `"12 Total"`, `"7 Pending"`, `"5 Completed"`).
  * Apply Tailwind classes for a horizontal flex layout with spacing.
  * The function must be pure — the same inputs always produce structurally identical DOM trees.
  * Export `StatsBar` from `src/components/index.ts`.
  * **Tests:** Pass an array of 3 pending and 2 completed todos. Assert the total text content includes `'5'`, the pending includes `'3'`, and the completed includes `'2'`. Pass an empty array and assert all three display `'0'`.

- [ ] **Task 13: Implement the Filter Bar Component**
  * Create `src/components/FilterBar.ts` and export a default function `FilterBar(filter: FilterState, onChange: (patch: Partial<FilterState>) => void): HTMLElement`.
  * Render a search `<input type="text">` with `placeholder="Search todos..."`. On the `input` event, call `onChange({ searchQuery: e.target.value })`.
  * Render a `<select>` for status filter with options: `all` (label `All`), `pending` (label `Pending`), `completed` (label `Completed`). On `change`, call `onChange({ status: e.target.value as FilterState['status'] })`.
  * Render a `<select>` for priority filter with options: `all` (label `All Priorities`), `high`, `medium`, `low`. On `change`, call `onChange({ priority: e.target.value as FilterState['priority'] })`.
  * Set the `value` property (not attribute) of both `<select>` elements and the `<input>` to reflect the current `filter` state immediately after creation.
  * Export `FilterBar` from `src/components/index.ts`.
  * **Tests:** Render with `filter = { status: 'completed', priority: 'high', searchQuery: 'test' }` and assert each control's `.value` matches. Simulate an `input` event on the search field and assert `onChange` is called with `{ searchQuery: <new value> }`.

- [ ] **Task 14: Implement the Add-Todo Form Component**
  * Create `src/components/AddTodoForm.ts` and export a default function `AddTodoForm(onSubmit: (title: string, description: string, priority: Priority, dueDate: number | null) => void): HTMLElement`.
  * Render a `<form>` (or a `<div>` with a button triggering submission — do not rely on the native `submit` event) containing: a required `<input type="text">` for `title`, a `<textarea>` for `description`, a `<select>` for `priority` with options `low`, `medium`, `high` defaulting to `medium`, an `<input type="date">` for `dueDate`, and a submit `<button>`.
  * On submission: if `title.trim()` is empty, add a visible `<p>` error message `"Title is required"` below the title input and do NOT call `onSubmit`. Remove the error message on the next submission attempt.
  * If `title.trim()` is non-empty: convert the date input value to a Unix timestamp (`new Date(dateValue).getTime()`) or `null` if empty, call `onSubmit(...)`, then reset all inputs to their default values.
  * Apply Tailwind classes for vertical form layout with consistent spacing.
  * Export `AddTodoForm` from `src/components/index.ts`.
  * **Tests:** Simulate a submit with an empty title and assert `onSubmit` was NOT called and an error `<p>` appears in the DOM. Simulate a valid submit with all fields filled and assert `onSubmit` was called with the correct typed arguments and the inputs are cleared afterward.

- [ ] **Task 15: Implement the Todo Card Component**
  * Create `src/components/TodoCard.ts` and export a default function `TodoCard(todo: Todo, callbacks: { onToggle: (id: string) => void; onDelete: (id: string) => void; onEdit: (id: string) => void }): HTMLElement`.
  * Render a `<li>` element containing: a checkbox `<input type="checkbox">` reflecting `todo.status === 'completed'`, the `todo.title` in a `<span>` (strike-through class when completed), the `todo.priority` as a colored `<span>` badge (green=low, yellow=medium, red=high using Tailwind bg/text classes), the formatted `createdAt` date, an overdue warning element (rendered only when `isOverdue(todo.dueDate)` is `true`), an edit `<button>`, and a delete `<button>`.
  * The checkbox `change` event calls `callbacks.onToggle(todo.id)`. The delete button `click` event calls `callbacks.onDelete(todo.id)`. The edit button `click` event calls `callbacks.onEdit(todo.id)`.
  * Do not attach event listeners to the `document` or `window` — all listeners are scoped to elements within the returned `<li>`.
  * Export `TodoCard` from `src/components/index.ts`.
  * **Tests:** Render a completed todo and assert the checkbox is checked and the title element has the strike-through class. Render a high-priority todo and assert the badge element has a red-related Tailwind class. Simulate clicking delete and assert `onDelete` was called with the correct ID.

- [ ] **Task 16: Implement the Edit-Todo Modal Component**
  * Create `src/components/EditTodoModal.ts` and export a default function `EditTodoModal(todo: Todo, onSave: (id: string, changes: Partial<Pick<Todo, 'title' | 'description' | 'priority' | 'dueDate'>>) => void, onClose: () => void): HTMLElement`.
  * Render a full-screen overlay `<div>` containing a centered modal `<div>`. The overlay itself is not clickable to close — the modal has an explicit close `<button>` that calls `onClose()`.
  * Inside the modal, render: a `<h2>` with text `Edit Todo`, an `<input type="text">` pre-filled with `todo.title`, a `<textarea>` pre-filled with `todo.description`, a `<select>` for priority pre-selected to `todo.priority`, an `<input type="date">` pre-filled with the ISO date string derived from `todo.dueDate` (or empty if null), a Save `<button>`, and the close button.
  * On Save: validate `title.trim()` is non-empty (show inline error if not). If valid, call `onSave(todo.id, { ... })` with only the changed fields (compare current values to original).
  * Apply Tailwind `z-50`, `fixed`, `inset-0`, `bg-black/50` on the overlay and appropriate sizing/padding classes on the modal card.
  * Export `EditTodoModal` from `src/components/index.ts`.
  * **Tests:** Render with a todo, change the title input value, simulate Save, and assert `onSave` was called with the new title. Assert `onSave` is NOT called when title is cleared. Simulate clicking the close button and assert `onClose` was called.

- [ ] **Task 17: Implement the Empty State Component**
  * Create `src/components/EmptyState.ts` and export a default function `EmptyState(isFiltered: boolean): HTMLElement`.
  * When `isFiltered` is `false`, render a `<div>` with an icon (use a Unicode emoji or inline SVG — no external icon library) and the text `No todos yet. Add one above!`.
  * When `isFiltered` is `true`, render the same structure but with the text `No todos match your current filters.`.
  * Apply Tailwind classes for centered layout, muted text color, and generous vertical padding.
  * Export `EmptyState` from `src/components/index.ts`.
  * **Tests:** Render with `isFiltered = false` and assert the text content contains `'No todos yet'`. Render with `isFiltered = true` and assert the text content contains `'No todos match'`.

---

## Phase 4: Application Shell & Rendering Engine

- [ ] **Task 18: Implement the Todo List Renderer**
  * Create `src/components/TodoList.ts` and export a default function `TodoList(todos: Todo[], editingId: string | null, callbacks: { onToggle: (id: string) => void; onDelete: (id: string) => void; onEdit: (id: string) => void; onSave: (id: string, changes: Partial<Pick<Todo, 'title' | 'description' | 'priority' | 'dueDate'>>) => void; onCloseEdit: () => void }): HTMLElement`.
  * Render a `<ul>` element. If `todos` is empty, return a `<div>` wrapping `EmptyState(false)` instead (the caller must pass an empty array only when no filter is active — the component itself is not responsible for the `isFiltered` distinction).
  * For each todo in `todos`, call `TodoCard(todo, callbacks)` and append the result to the `<ul>`.
  * If `editingId` is non-null and matches a todo in the array, also render `EditTodoModal(matchedTodo, callbacks.onSave, callbacks.onCloseEdit)` and append it to the returned element.
  * Export `TodoList` from `src/components/index.ts`.
  * **Tests:** Pass 3 todos and assert the returned `<ul>` has exactly 3 `<li>` children. Pass an `editingId` matching the second todo and assert the DOM contains an element with an `<h2>` of text `Edit Todo`. Pass an empty array and assert no `<ul>` is returned.

- [ ] **Task 19: Implement the Main App Render Function**
  * Create `src/app.ts` and export a single function `render(root: HTMLElement): void`.
  * At the start of `render`, call `root.innerHTML = ''` to fully clear the container.
  * Call `getState()` once and destructure `{ todos, filter, editingId }`.
  * Call `getFilteredTodos(state)` to derive the visible todo list.
  * Build the full DOM tree by calling component functions in this order and appending each to `root`: `Header()`, `AddTodoForm(...)`, `StatsBar(state.todos)`, `FilterBar(filter, ...)`, then either `TodoList(...)` or `EmptyState(true)` depending on whether filtered todos are empty while filter is active.
  * Wire all `onChange` / `onSubmit` / `onToggle` / `onDelete` / `onEdit` callbacks to their corresponding action imports from `src/store/index.ts`. Each callback must call `render(root)` as its last step.
  * `render` must not return a value and must not hold any state of its own.
  * **Tests:** Mount `render` onto a JSDOM `<div>`, assert the root contains a `<header>`, an element with `placeholder="Search todos..."`, and an empty-state element. Call `addTodo(...)` then `render(root)` and assert the todo card appears. Call `setFilter({ status: 'completed' })`, `render(root)`, and assert the empty-state shows the filtered variant.

- [ ] **Task 20: Bootstrap and Subscribe the Renderer in `main.ts`**
  * Replace all content of `src/main.ts` with the following logic: import `render` from `./app`, import `subscribe` from `@/store`, import `'./styles/main.css'`.
  * Select the root element: `const root = document.getElementById('app')`. If null, throw `new Error('Root element #app not found')`.
  * Call `render(root)` once immediately to perform the initial render.
  * Call `subscribe(() => render(root))` to re-render on every state change. Store the returned unsubscribe function in a `const`.
  * Do NOT call `render` anywhere else in the codebase — it is only called here and inside the subscription.
  * **Tests:** In a JSDOM environment, run the bootstrap sequence and assert that the DOM contains a `<header>`. Then dispatch `addTodo(...)` via the store and assert (without calling `render` manually) that the new todo card appears in the DOM.

---

## Phase 5: Accessibility & UX Polish

- [ ] **Task 21: Add ARIA Attributes to All Interactive Components**
  * In `AddTodoForm.ts`, add `aria-required="true"` to the title input, `aria-label="Todo title"` to the title input, `aria-label="Priority"` to the priority select, and `aria-label="Due date"` to the date input. If the validation error `<p>` is rendered, set `role="alert"` on it and `aria-describedby="<error-id>"` on the title input pointing to the error element's `id`.
  * In `TodoCard.ts`, add `aria-label="Mark as complete"` (or `"Mark as incomplete"`) to the checkbox, updating dynamically based on `todo.status`. Add `aria-label="Delete todo"` and `aria-label="Edit todo"` to their respective buttons.
  * In `EditTodoModal.ts`, add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the `<h2>`'s `id` on the modal container `<div>`.
  * In `FilterBar.ts`, add `aria-label="Search todos"` to the search input, `aria-label="Filter by status"` to the status select, `aria-label="Filter by priority"` to the priority select.
  * **Tests:** Render each component and assert the expected `aria-*` attributes are present using `getAttribute`. Render the modal and assert `role="dialog"` is set on the container. Render a completed todo's checkbox and assert `aria-label` contains `"incomplete"`.

- [ ] **Task 22: Implement Keyboard Trap for the Edit Modal**
  * In `EditTodoModal.ts`, after the modal element is constructed, attach a `keydown` event listener to the modal element (not `document`).
  * On `Escape` key: call `onClose()`.
  * On `Tab` key: collect all focusable elements within the modal (`input`, `textarea`, `select`, `button`) using `querySelectorAll`. If the focused element is the last focusable element and Tab (non-Shift) is pressed, call `e.preventDefault()` and `focus()` on the first focusable element. If the focused element is the first and Shift+Tab is pressed, call `e.preventDefault()` and `focus()` on the last focusable element.
  * After the modal element is appended to the DOM (this must be orchestrated by the caller in `TodoList.ts`), call `.focus()` on the first focusable element inside the modal.
  * **Tests:** Render the modal, simulate an `Escape` keydown event, and assert `onClose` was called. Simulate `Tab` on the last focusable element and assert focus moves to the first. Simulate `Shift+Tab` on the first and assert focus moves to the last.

---

## Phase 6: Final Build Validation

- [ ] **Task 23: Configure Vite Production Build Options**
  * In `vite.config.ts`, add a `build` config object with: `outDir: 'dist'`, `sourcemap: false`, `minify: 'esbuild'`, `target: 'es2020'`.
  * In `vite.config.ts`, set `base: './'` so asset paths are relative (correct for file:// serving and sub-path hosting).
  * In `tsconfig.json`, ensure `"noUnusedLocals": true` and `"noUnusedParameters": true` are set so the build fails on dead code.
  * Run `npx tsc --noEmit` and fix any type errors until the command exits cleanly.
  * Run `npm run build` and assert the output `dist/` folder contains `index.html`, at least one `.js` file, and at least one `.css` file.
  * **Tests:** Open `dist/index.html` in a browser (or serve it with `npx serve dist`) and perform a manual smoke test: add a todo, toggle it, filter by completed, verify it appears, delete it, verify it disappears, refresh the page, and verify the completed todo is gone (since it was deleted) and the state persists from `localStorage`.

- [ ] **Task 24: Validate Full LocalStorage Round-Trip on Page Reload**
  * Add 3 todos via the `AddTodoForm` in the running app (dev server).
  * Toggle one to `'completed'`.
  * Set the priority filter to `'high'`.
  * Hard-reload the page (`Ctrl+Shift+R`).
  * Assert in the browser console that `JSON.parse(localStorage.getItem('todo-app-state'))` returns an object with `todos.length === 3`, one of them having `status === 'completed'`, and `filter.priority === 'high'`.
  * Open `src/store/persistence.ts` and add a version guard: if the loaded state is missing the `filter` key (indicating an older schema), return `null` from `loadState` so the app starts fresh rather than crashing.
  * **Tests:** Manually corrupt `localStorage['todo-app-state']` to `{"todos": []}` (missing `filter` key) and reload. Assert the app renders without errors, showing the empty state rather than a runtime exception.
# Frontend React App

This app uses Vite with React Router.

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open http://localhost:5173 with your browser to see the result.


# Test Setup
- Below is the **clean, production-grade way** to set up **React Testing Library** for a **Vite + React + TypeScript** app **with `tests/` parallel to `src/`**, not nested inside it.
- This is the same approach used in large monorepos and CI-friendly setups. No hacks, no brittle config.


## 1️⃣ Directory Layout (what you want)

```text
core-vite/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── components/
│       └── Button.tsx
│
├── tests/
│   ├── setupTests.ts
│   ├── App.test.tsx
│   └── components/
│       └── Button.test.tsx
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

✔ Tests live **outside `src`**
✔ Paths stay clean
✔ Works with CI, coverage, and IDE tooling

# NPM CMDS
```sh
npm uninstall package-name
```

# Jest vs Vite
- https://vitest.dev/guide/comparisons.html#jest

## 2️⃣ Install Testing Dependencies (Vitest)

Use **Vitest** (native to Vite) + **Testing Library**.

```bash
npm install -D \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
 '@vitest/coverage-v8'

# or
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

---

## 3️⃣ Add Test Script to `package.json`

Update your scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build2": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage"
  }
}
```

---

## 4️⃣ Vitest Config (key step for parallel tests dir)

Create **`vitest.config.ts`** at repo root:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setupTests.ts",
    include: ["tests/**/*.test.{ts,tsx}"],
    css: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

### Why this matters

* `include` explicitly points to `tests/`
* `setupFiles` loads global matchers
* `jsdom` enables browser APIs
* Alias lets tests import from `src` cleanly

---

## 5️⃣ Test Setup File

Create **`tests/setupTests.ts`**

```ts
import "@testing-library/jest-dom";
```

That’s it. No Jest config needed.

---

## 6️⃣ TypeScript Config (important)

Update **`tsconfig.json`** so TypeScript sees both `src` and `tests`.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

---

## 7️⃣ Example Test (outside `src`)

**`tests/App.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import App from "@/App";

describe("App", () => {
  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByText(/hello/i)).toBeInTheDocument();
  });
});
```

---

## 8️⃣ Testing MUI / React Query / Router (real-world setup)

Create a **test wrapper** once:

```tsx
// tests/test-utils.tsx
import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

export function TestProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
}
```

Use it in tests:

```tsx
render(
  <TestProviders>
    <MyComponent />
  </TestProviders>
);
```

---

## 9️⃣ Run Tests

```bash
npm run test
npm run test:watch
npm run test:ui
```

---

## 10️⃣ Common Pitfalls (don’t ignore)

❌ Putting tests in `src/` — couples prod & test code
❌ Using Jest with Vite — slow and unnecessary
❌ Missing `jsdom` — DOM APIs break
❌ Forgetting `types: ["vitest/globals"]` — TS errors

---

## TL;DR (Correct Setup)

✔ `tests/` parallel to `src/`
✔ Vitest + Testing Library
✔ Explicit `include` path
✔ One shared setup file
✔ Clean alias imports

This setup scales cleanly into **monorepos, CI, and large React codebases**.

If you want:

* snapshot testing
* MSW for API mocks
* React Query cache isolation
* Vite + Cypress integration

say the word and I’ll wire it properly.


# src/api Architecture
- API Client functions default to httpClientPrivate, so normal app code gets the authenticated client automatically (withCredentials: true at adminClient.ts (line 9)).

Passing a custom instance is useful because:
- Tests can pass a mock/fake axios client instead of making real requests.
- Different call sites can use different axios configs (headers, interceptors, auth mode, base URL, timeouts).
- The API layer is less tightly coupled to one global client, so it’s easier to reuse and maintain.
- All methods (fetchAdminUsers, etc.) then consistently use that chosen instance via closure (adminClient.ts (line 22), adminClient.ts (line 27), adminClient.ts (line 32), adminClient.ts (line 37)).

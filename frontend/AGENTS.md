# Frontend Instructions

## Tech Stack

* React 19
* TypeScript
* Vite
* Tailwind CSS
* React Router
* Axios
* React Hook Form
* React Icons
* React Toastify
* Lodash
* ESLint

## File Structure
* `/app`

  * Holds configuration and routes of the app.
  
* `/components`

  * Reusable UI components.
  * `/ui` this are low-level ui components

* `/hooks`

  * Reusable and generic custom hooks.
  * Use only for logic that can be shared across the frontend.

* `/pages`

  * Page-level components.

* `/services`

  * Backend API calls and related implementations.
  * Keep API calls outside UI components.

* `/types`

  * Shared and reusable TypeScript types.

* `/utils`

  * Generic helper functions.
  * Avoid placing component-specific logic here.

* `/test`

  * Shared Vitest setup and reusable testing utilities.
  * Keep page, component, hook, and utility `*.test.ts` or `*.test.tsx` files beside the source file they test.

* `index.css`

  * Custom CSS.
  * Application-wide color theme.

## Coding Guidelines

* Use functional components.
* Prefer arrow functions when creating components.
* Use TypeScript for all frontend code.
* Avoid using `any`.
* Prefer `async`/`await` with `try`/`catch` over `.then()`/`.catch()` promise chains for asynchronous control flow when it improves readability.
* Continue using Promise utilities such as `Promise.all` when independent asynchronous operations should run concurrently.
* Reuse existing components when possible.
* Keep API calls inside `/src/services`.
* Keep components small, focused, and easy to understand.
* Follow the existing Tailwind CSS conventions.
* Do not modify backend code for frontend-only tasks.
* Avoid unnecessary abstraction or over-engineering.
* Do not make unrelated code changes.

## Components

* Check existing components before creating a new one.
* Reuse or extend an existing component when practical.
* Create a new component when it has a clear responsibility or can be reused.
* Design new reusable components around generic UI behavior rather than a specific feature or domain.
  * Name components after their visual or behavioral responsibility, such as `PageHeader`, `StatCard`, `ListItem`, or `AppSidebar`.
  * Pass feature-specific labels, icons, data, actions, and navigation targets through props.
  * Keep feature-specific composition and business rules in the relevant page or feature component.
  * Do not prefix a shared component with a feature or domain name when the same UI pattern can be used elsewhere.
  * A domain- or page-specific component is acceptable when there is strong reason to believe its UI and behavior are unique to that domain or page and making it generic would add unnecessary abstraction.
* Split large components when they:

  * Handle multiple responsibilities.
  * Become difficult to understand.
  * Contain reusable sections.
* Do not split components unnecessarily just to make them smaller.
* If an existing component needs to be updated:

  * Explain what will change.
  * Explain why the change is needed.
  * Avoid adding unnecessary complexity.

## Component Reuse Review

Before proposing or creating a new component:

* Search all existing components for similar structure, behavior, and visual responsibility.
* Compare component APIs and rendered markup, not only component names.
* For each proposed component, identify:

  * Existing components reviewed.
  * Why direct reuse is or is not appropriate.
  * Whether extending or composing an existing component would avoid duplication.
* Do not create the component until this comparison has been reported to the user.
* Prefer extending or composing an existing component when most of the structure or behavior already exists.

## Hooks

* Create custom hooks when logic can be reused.
* Keep reusable hooks generic.
* Avoid creating a hook for logic that is only used once unless it improves readability significantly.

## Utilities and Packages

* Before creating custom logic, check whether an existing installed package already provides the functionality.
* Prefer simple native JavaScript or TypeScript when it is clearer than using a package.
* Keep solutions simple and easy for other developers to understand.
* Avoid duplicating functionality already available in the project.

## Package Installation

* Do not install a new package without permission.
* If a package is needed:

  * Explain which package is required.
  * Explain what it will be used for.
  * Explain why the current dependencies are not enough.
  * Ask for permission before installing it.

## Color Theme

Use the existing application colors:

```css
--color-site-green: #14ae5d;
--color-content-text: #959cab;
```

* Prefer existing theme colors when creating pages or components.
* Do not introduce a new theme color without permission.
* If a new color is needed:

  * Provide the proposed color.
  * Explain where it will be used.
  * Ask for permission before adding it.

## Loading Placeholders

* Use the shared `Skeleton` shimmer only for an initial data or authorization request when a data-backed page would otherwise be blank.
* Match the placeholder to the page layout so the loading state does not cause a noticeable layout shift.
* Do not replace an interactive form while it is submitting; preserve entered values and use disabled controls with clear progress text instead.

## Comments

* Add comments when they help explain:

  * Complex logic.
  * Important implementation decisions.
  * Workarounds.
  * Code that may not be immediately obvious.
  * Feature boundaries such as authorization-dependent UI, cache behavior, and data-shape transformations.
* Keep explanatory comments close to the behavior they document so future changes update both together.
* Avoid comments that simply repeat what the code already says.

## Testing

* Use Vitest with Testing Library and jest-dom for frontend component and page tests; the shared jsdom setup belongs under `/src/test`.
* Name test files `*.test.ts` or `*.test.tsx`, test user-visible behavior, and mock external API boundaries instead of implementation details.
* Give each `it` or `test` case a clear behavior-based name that states the action or condition and the expected result (for example, `shows an email error when the address is invalid`); avoid vague names such as `works` or `handles errors` so developers can understand the test without reading its implementation.
* Run `npm test`, `npm run lint`, and `npm run typecheck` after frontend test or feature changes; keep future browser end-to-end tests in a separate setup.

## Before Starting a Task

* When the user provides `FTASK`, first respond with a brief flow of the frontend work you plan to perform.
* Do not create or modify files during this planning step, even when `FTASK` is already provided.
* Wait for the user to confirm the proposed flow before implementing the frontend changes.

* Review and understand the requested change.
* Review the existing related frontend code.
* Check for reusable:

  * Components.
  * Hooks.
  * Utilities.
  * Types.
  * Services.
* Identify:

  * New components that may be needed.
  * Existing components that need changes.
  * Hooks, utilities, types, or services that need changes.
  * Any package that may need to be installed.
* Report the proposed approach before making changes.
* Explain any new or modified component and its purpose.
* Wait for approval before starting implementation.

## Before Completing a Task

* Run:

```bash
npm test
npm run lint
npm run typecheck
```

* Fix issues introduced by the task.
* If a command fails because of an unrelated existing issue, report it instead of changing unrelated code.

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

* `index.css`

  * Custom CSS.
  * Application-wide color theme.

## Coding Guidelines

* Use functional components.
* Prefer arrow functions when creating components.
* Use TypeScript for all frontend code.
* Avoid using `any`.
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
* Split large components when they:

  * Handle multiple responsibilities.
  * Become difficult to understand.
  * Contain reusable sections.
* Do not split components unnecessarily just to make them smaller.
* If an existing component needs to be updated:

  * Explain what will change.
  * Explain why the change is needed.
  * Avoid adding unnecessary complexity.

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

## Comments

* Add comments when they help explain:

  * Complex logic.
  * Important implementation decisions.
  * Workarounds.
  * Code that may not be immediately obvious.
* Avoid comments that simply repeat what the code already says.

## Before Starting a Task

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
npm run lint
npm run typecheck
```

* Fix issues introduced by the task.
* If a command fails because of an unrelated existing issue, report it instead of changing unrelated code.

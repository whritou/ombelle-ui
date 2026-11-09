# Forms, navigation and overlays

Implement the expanded batch selected in chat: Input Group, Sheet, Alert Dialog,
Breadcrumb, Pagination, Toast, and the five requested variant additions. The user
explicitly expanded the scope during implementation. Combobox remains later work.

## Approach

Extend the reviewed source catalog and shared compiler, rather than introducing
a runtime library. Presentational components share templates between editions;
Sheet and Alert Dialog have dedicated Radix and Base UI templates. Use existing
Dialog primitives for Sheet and the dedicated Alert Dialog primitive for
confirmation. The alternative of adding only variants leaves navigation and
form composition gaps; adding only new primitives misses a low-cost Tabs gain.

## Contracts

- InputGroup, InputGroupInput, InputGroupTextarea, InputGroupAddon (align:
  inline-start/inline-end/block-start/block-end), InputGroupText,
  InputGroupButton. Native inputs, textareas and buttons, no cross-component
  imports. Buttons default to type=button; controls retain native validation,
  disabled state, naming, refs and event handling.
- Sheet, SheetTrigger, SheetClose, SheetContent (side:
  inline-start/inline-end/top/bottom; size: sm/default/lg), SheetHeader,
  SheetFooter, SheetTitle, SheetDescription. Default side inline-end, default
  size default. Focus trapping, Escape dismissal and focus return come from
  Dialog primitives. Logical inline positioning supports RTL. Include a named
  close control, constrained scrolling and reduced-motion styles.
- AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogCancel, AlertDialogAction. Use real alertdialog semantics,
  cancel-first focus and no pointer-outside dismissal. Base UI uses its native
  AlertDialog and render composition; Radix uses asChild composition.
- Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage,
  BreadcrumbSeparator, BreadcrumbEllipsis. Native named nav and ordered list;
  current page is noninteractive with aria-current=page; separators are hidden
  from accessibility APIs. Ellipsis is decorative, with overflow menus shown
  as composition examples rather than simulated interaction.
- Pagination, PaginationContent, PaginationItem, PaginationLink (isActive,
  disabled), PaginationPrevious, PaginationNext, PaginationEllipsis. Native
  named nav/list/links; active link has aria-current=page, disabled links have
  no href and are removed from tab order. Applications own paging and routing.
- TabsList gains appearance=contained|underline (default contained). Preserve
  existing default styles and behavior. Underline supports both orientations
  and both primitive editions. Recipe props export and preview the appearance.
- Table gains density=default|compact and striped=false|true; selection remains
  explicit and has visual priority over striping.
- Card gains appearance=default|outlined|subtle, independently of density.
- Badge gains size=default|sm and a decorative BadgeDot for composition.
- Alert gains success|warning|info, with polite status roles by default. Only
  destructive remains assertive. Introduce optional success/successForeground,
  warning/warningForeground and info/infoForeground palette pairs. Existing
  immutable presets remain valid and unchanged: new styles provide reviewed
  fallback pairs and overrides can opt into the new palette fields.
- Toast supports title, description, dismissal and an optional action with
  an accessible alternative description; primitives own timers, pausing,
  announcements and keyboard behavior. Provide both primitive editions with
  their documented composition model and preserve editor/export parity.

## Delivery constraints

Node 24.19.0 and pnpm 11.25.0. All five style families; liquid glass remains
experimental with opaque, reduced-transparency and forced-color fallbacks.
Retain controlled/uncontrolled primitive behavior and installed source ownership.
Add recipe schemas, specimen descriptions, appearance slots, catalog docs and
preview fixtures. Do not advertise these IDs as installable by published CLI
0.7.1: mark their website minimum CLI as 0.7.2 pending a separate release.
No release, deployment or push is part of this task.

## Verification

Exercise native semantics and component-owned defaults with rendered tests;
check deterministic compiler output, both editions, all families, and recipe
round trips. Run package build, typecheck, unit and integration tests, preview
and product builds, plus focused browser interaction and accessibility checks.
Report any environment limitations without treating historical evidence as a
new passing run. Existing default Tabs artifacts may change to expose the new
attribute, but default styling must stay equivalent.

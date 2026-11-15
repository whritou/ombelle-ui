# Security policy

## Reporting a vulnerability

Please do not open a public issue or discussion for a security problem.

Report it privately through GitHub: [Report a vulnerability](https://github.com/whritou/ombelle-ui/security/advisories/new). Include the affected package or component, the version, steps to reproduce, and the impact you expect.

We aim to acknowledge a report within 5 working days and to share an assessment or fix plan within 14 days. We will credit you in the advisory unless you prefer otherwise.

## Scope

In scope: the `@ombelle-ui/cli` installer (file writes, dependency installs, plan and apply safeguards), the compiler and generated component artifacts, and the hosted snapshot service at `ombelle-ui.vercel.app`.

Out of scope: vulnerabilities in third-party dependencies with no demonstrated impact on Ombelle (report them upstream), findings that need an already compromised local machine, and denial of service through unrealistic input sizes in local-only tooling.

## Supported versions

Only the latest published `@ombelle-ui/cli` release receives fixes. The project is in alpha.

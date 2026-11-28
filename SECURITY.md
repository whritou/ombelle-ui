# Security policy

## Reporting a vulnerability

Please do not open a public issue or discussion for a security problem.

Report it privately through GitHub: [Report a vulnerability](https://github.com/whritou/ombelle-ui/security/advisories/new). Include the affected package or component, the version, steps to reproduce, and the impact you expect.

We aim to acknowledge a report within 5 working days and to share an assessment or fix plan within 14 days. We will credit you in the advisory unless you prefer otherwise.

## Scope

In scope: the `@ombelle-ui/cli` installer (file writes, dependency installs, plan and apply safeguards), the compiler and generated component artifacts, and the hosted snapshot service at `ombelle-ui.com`.

Out of scope: vulnerabilities in third-party dependencies with no demonstrated impact on Ombelle (report them upstream), findings that need an already compromised local machine, and denial of service through unrealistic input sizes in local-only tooling.

## Supported versions

| Version | Receives security fixes |
| --- | --- |
| The latest published minor of the current major (`1.x` from 1.0) | Yes |
| Earlier minors of the current major | No: update to the latest minor. A fix that cannot be released without a breaking change says so in the advisory |
| `0.x` releases | No |

A fix is published as a new patch release of `@ombelle-ui/cli`; the hosted service is fixed in place. Installed component source is yours: a fix to a template reaches your project when you run `update` (or re-add the component) with the fixed CLI, and the advisory names the affected components.

Supported environment: Node 24.19.0 or a newer Node 24 for the CLI, and the React, Tailwind and package-manager versions listed in the [1.0 public contract](docs/1.0-public-contract.md#support-window). Reports that only reproduce outside that environment are triaged on a best-effort basis.

This project has one maintainer today, so the response targets above are best effort and a longer support window is not promised until a second maintainer exists ([1.0 decisions](docs/1.0-decisions.md)).

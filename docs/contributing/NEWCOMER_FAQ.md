# First contribution FAQ

**Where should I start?** Begin with a small documentation issue whose
problem and expected result have been verified. Browse the
[open issues](https://github.com/Thavarshan/honeymelon/issues) rather than
assuming a large architecture roadmap is a beginner task.

**Which app is stable?** The published desktop stable version is v2.2.3
(legacy Comet UI). Desktop v3.0.0-beta.1 is an unsigned test build with
a React UI. The repository's next desktop version is in development.

**Is the browser app live?** There is a browser app in the repository,
but public deployment and acceptance remain gated by
[web beta issue #85](https://github.com/Thavarshan/honeymelon/issues/85).

**Do I need a Cloudflare account?** Not for documentation, tests or
local source changes. Do not configure production deployments unless
an authorized maintainer explicitly requests that work.

**Do I need all native media tools to edit docs?** No. Markdown fixes
can run a formatter without packaging desktop binaries.

**How do I clone?** Fork the repository to your GitHub account.
Clone `https://github.com/YOUR_GITHUB_USERNAME/honeymelon.git`, then
add `https://github.com/Thavarshan/honeymelon.git` as the `upstream`
remote. Do not commit directly to the original repository.

**Which Node version?** The project pins Node.js 24.22.0 and
npm 12.2.0. Use `nvm install`, `nvm use`, and the npm version in
the contributor guide, then `npm ci` if the task requires dependencies.

**Which checks should I run?** For docs, start with
`npm run format:check` after installation. For code, use
`npm run lint`, `npm run typecheck` and the relevant tests.
CI also runs cross-platform suites. Note any skipped tests in the PR.

**Can I upload my failing audio or video?** Do not share private,
copyrighted, sensitive or customer data. Prefer generated test media
and record codecs, OS, version and reproduction steps.

**Can I rely on instant reviews?** No. Maintainers are volunteers and
review times vary. The goal is to acknowledge incoming contributions
within two working days where feasible, not a guaranteed SLA or merge.

**What makes a PR helpful?** One clearly explained problem, a small
change, a link to a verified issue, results of relevant checks, and
a note of any behavior you could not test.

## First PR checklist

1. Search for duplicates and read the issue's acceptance criteria.
2. Ask a focused question before coding if scope is unclear.
3. Create a branch in your own fork.
4. Change only files needed for that small issue.
5. Run the smallest relevant check and include its result.
6. Add screenshots only from non-private fixtures, with version labels.
7. Fill the PR template and respond constructively to review.

For a newcomer-friendly candidate inventory, see
[verification candidates](FIRST_ISSUE_CANDIDATES.md). The inventory is
**not a promise** that each suggestion is currently labeled or assigned.

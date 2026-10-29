import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  deploymentPolicy,
  requireSuccessfulChecks,
} from '../../site/scripts/deployment-policy.mjs';

// The web app follows the site's reviewed admission rules exactly: trusted
// main-branch dispatch, exact commit, green checks, distinct public origins.
export { deploymentPolicy, requireSuccessfulChecks };

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const policy = deploymentPolicy({
    event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    repository: process.env.GITHUB_REPOSITORY,
    sha: process.env.GITHUB_SHA,
    target: process.env.DEPLOY_TARGET,
    operation: process.env.DEPLOY_OPERATION,
    version: process.env.DEPLOY_VERSION,
    productionUrl: process.env.PRODUCTION_URL,
    previewUrl: process.env.PREVIEW_URL,
  });
  const response = await fetch(
    `https://api.github.com/repos/Thavarshan/honeymelon/commits/${process.env.GITHUB_SHA}/check-runs?filter=latest&per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
      },
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok) {
    throw new Error(`Cannot verify source commit checks: ${response.status}`);
  }

  const report = await response.json();
  if (!Array.isArray(report.check_runs) || report.total_count > 100) {
    throw new Error('Incomplete commit check inventory');
  }

  requireSuccessfulChecks(report.check_runs);
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `target=${policy.target}\napp_url=${policy.siteUrl}\nversion=${policy.version}\n`,
  );
}

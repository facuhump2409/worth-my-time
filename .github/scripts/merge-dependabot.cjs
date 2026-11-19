const mergeJob = 'Merge verified Dependabot updates';

function checksPassed(checks, statuses) {
  const validations = checks.filter(check =>
    check.name !== mergeJob || check.app?.slug !== 'github-actions',
  );
  const latestStatuses = new Map();
  for (const status of statuses) {
    if (!latestStatuses.has(status.context)) latestStatuses.set(status.context, status);
  }
  const ci = validations.some(check => check.name === 'Validate PWA' && check.app?.slug === 'github-actions');
  const vercel = validations.some(check => check.name === 'Vercel' && check.app?.slug === 'vercel') ||
    ['vercel[bot]', 'vercel'].includes(latestStatuses.get('Vercel')?.creator?.login);
  return ci && vercel && validations.every(check => check.status === 'completed' && check.conclusion === 'success') &&
    [...latestStatuses.values()].every(status => status.state === 'success');
}

async function mergeDependabot({ github, context, core }) {
  const { owner, repo } = context.repo;
  const { data: repository } = await github.rest.repos.get({ owner, repo });
  const mergeMethod = repository.allow_squash_merge ? 'squash'
    : repository.allow_merge_commit ? 'merge'
      : repository.allow_rebase_merge ? 'rebase' : null;
  if (!mergeMethod) throw new Error('No supported merge method is enabled.');

  const pulls = await github.paginate(github.rest.pulls.list, { owner, repo, state: 'open', base: repository.default_branch });
  for (const pull of pulls) {
    if (pull.user.login !== 'dependabot[bot]') continue;
    try {
      const { data: current } = await github.rest.pulls.get({ owner, repo, pull_number: pull.number });
      if (current.state !== 'open' || current.draft || current.user.login !== 'dependabot[bot]' ||
          current.head.repo?.full_name !== repository.full_name || current.base.ref !== repository.default_branch ||
          current.mergeable !== true || !['clean', 'unstable'].includes(current.mergeable_state)) {
        core.info(`#${pull.number}: not ready to merge.`);
        continue;
      }

      const ref = current.head.sha;
      const [checks, statuses] = await Promise.all([
        github.paginate(github.rest.checks.listForRef, { owner, repo, ref, filter: 'latest', per_page: 100 }),
        github.paginate(github.rest.repos.listCommitStatusesForRef, { owner, repo, ref, per_page: 100 }),
      ]);
      if (!checksPassed(checks, statuses)) {
        core.info(`#${pull.number}: waiting for CI, Vercel and all other reported checks to pass.`);
        continue;
      }

      const { data: result } = await github.rest.pulls.merge({
        owner, repo, pull_number: pull.number, sha: ref, merge_method: mergeMethod,
      });
      if (!result.merged) throw new Error(result.message);
      core.info(`#${pull.number}: merged ${ref}.`);
    } catch (error) {
      core.setFailed(`#${pull.number}: ${error.message}`);
    }
  }
}

module.exports = Object.assign(mergeDependabot, { checksPassed });

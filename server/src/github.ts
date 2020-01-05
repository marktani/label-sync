import { Octokit } from 'probot'

import { Maybe } from './data/maybe'

/**
 * Loads a file from Github.
 *
 * @param octokit
 * @param path
 */
export async function getFile(
  octokit: Octokit,
  { owner, repo, ref }: { owner: string; repo: string; ref: string },
  path: string,
): Promise<Maybe<string>> {
  try {
    const res = await octokit.repos.getContents({
      owner: owner,
      path: path,
      repo: repo,
      ref: ref,
    })

    switch (res.status) {
      case 200: {
        // expect a single file
        /* istanbul ignore if */
        if (Array.isArray(res.data) || !res.data.content) return null

        return Buffer.from(res.data.content, 'base64').toString()
      }
      /* istanbul ignore next */
      default: {
        return null
      }
    }
  } catch (err) /* istanbul ignore next */ {
    return null
  }
}

export interface GithubLabel {
  name: string
  description?: string
  color: string
  default?: boolean
}

// export interface GithubLabelDiff extends GithubLabel {
//   old: Partial<GithubLabel>
// }

/**
 * Fetches labels in a repository.
 */
export async function getRepositoryLabels(
  octokit: Octokit,
  { repo, owner }: { repo: string; owner: string },
): Promise<Maybe<Octokit.IssuesListLabelsForRepoResponseItem[]>> {
  try {
    const labels = octokit.issues.listLabelsForRepo.endpoint.merge({
      repo,
      owner,
    })

    return octokit.paginate(labels)
  } catch (err) /* istanbul ignore next */ {
    return null
  }
}

/**
 *
 * Create new labels in a repository.
 *
 * @param github
 * @param labels
 * @param repository
 */
export async function addLabelsToRepository(
  github: Octokit,
  { repo, owner }: { repo: string; owner: string },
  labels: GithubLabel[],
  persist: boolean,
): Promise<GithubLabel[]> {
  /* Return immediately on non-persistent sync. */
  if (!persist) return labels

  /* Perform sync on persist. */
  const actions = labels.map(label => addLabelToRepository(label))
  await Promise.all(actions)

  return labels

  /**
   * Helper functions
   */
  async function addLabelToRepository(
    label: GithubLabel,
  ): Promise<GithubLabel> {
    return github.issues
      .createLabel({
        owner: owner,
        repo: repo,
        name: label.name,
        description: label.description,
        color: label.color,
      })
      .then(res => res.data)
  }
}

/**
 *
 * Updates labels in repository.
 *
 * @param github
 * @param labels
 * @param repository
 */
export async function updateLabelsInRepository(
  github: Octokit,
  { repo, owner }: { repo: string; owner: string },
  labels: GithubLabel[],
  persist: boolean,
): Promise<GithubLabel[]> {
  /* Return immediately on non-persistent sync. */
  if (!persist) return labels

  /* Update values on persist. */
  const actions = labels.map(label => updateLabelInRepository(label))
  await Promise.all(actions)

  return labels

  /**
   * Helper functions
   */
  async function updateLabelInRepository(
    label: GithubLabel,
  ): Promise<GithubLabel> {
    return github.issues
      .updateLabel({
        current_name: label.name,
        owner: owner,
        repo: repo,
        name: label.name,
        description: label.description,
        color: label.color,
      })
      .then(res => res.data)
  }
}

/**
 *
 * Removes labels from repository.
 *
 * @param github
 * @param labels
 * @param repository
 */
export async function removeLabelsFromRepository(
  github: Octokit,
  { repo, owner }: { repo: string; owner: string },
  labels: GithubLabel[],
  persist: boolean,
): Promise<GithubLabel[]> {
  /* Return immediately on non-persistent sync. */
  if (!persist) return labels

  const actions = labels.map(label => removeLabelFromRepository(label))
  await Promise.all(actions)

  return labels

  /**
   * Helper functions
   */
  async function removeLabelFromRepository(
    label: GithubLabel,
  ): Promise<Octokit.IssuesDeleteLabelParams> {
    return github.issues
      .deleteLabel({
        owner: owner,
        repo: repo,
        name: label.name,
      })
      .then(res => res.data)
  }
}

/**
 *
 * Compares two labels by comparing all of their keys.
 *
 * @param label
 */
export function isLabel(local: GithubLabel): (remote: GithubLabel) => boolean {
  return remote =>
    local.name === remote.name &&
    local.description === remote.description &&
    local.color === remote.color
}

/**
 * Determines whether the two configurations configure the same label.
 *
 * @param local
 */
export function isLabelDefinition(
  local: GithubLabel,
): (remote: GithubLabel) => boolean {
  return remote => local.name === remote.name
}

/**
 * Opens an issue with a prescribed title and body.
 *
 * @param octokit
 * @param owner
 * @param reports
 */
export async function openIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string,
  body: string,
): Promise<Octokit.IssuesCreateResponse> {
  return octokit.issues
    .create({
      repo: repo,
      owner: owner,
      title: title,
      body: body,
    })
    .then(({ data }) => data)
}

/**
 * Creates a comment on a dedicated pull request.
 * @param octokit
 * @param owner
 * @param repo
 * @param number
 * @param message
 */
export async function createPRComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  number: number,
  message: string,
): Promise<Octokit.IssuesCreateCommentResponse> {
  return octokit.issues
    .createComment({
      owner: owner,
      repo: repo,
      body: message,
      issue_number: number,
    })
    .then(({ data }) => data)
}

/**
 * Tries to fetch a repository.
 *
 * @param github
 * @param owner
 * @param repo
 */
export async function getRepo(
  github: Octokit,
  owner: string,
  repo: string,
): Promise<
  { status: 'Exists'; repo: Octokit.ReposGetResponse } | { status: 'Unknown' }
> {
  return github.repos
    .get({
      owner: owner,
      repo: repo,
    })
    .then(res => {
      switch (res.status) {
        case 200: {
          return { status: 'Exists' as const, repo: res.data }
        }
        /* istanbul ignore next */
        default: {
          return { status: 'Unknown' as const }
        }
      }
    })
    .catch(() => {
      return { status: 'Unknown' as const }
    })
}

/**
 * Bootstraps a configuration repository to a prescribed destination.
 *
 * @param github
 * @param owner
 * @param repo
 */
export async function bootstrapConfigRepository(
  github: Octokit,
  owner: string,
  repo: string,
): Promise<Octokit.ReposCreateUsingTemplateResponse> {
  return github.repos
    .createUsingTemplate({
      name: repo,
      owner: owner,
      template_owner: 'maticzav',
      template_repo: 'label-sync-template',
      mediaType: {
        previews: ['baptiste'],
      },
    })
    .then(res => res.data)
}

export type InstallationAccess =
  | { status: 'Sufficient' }
  | { status: 'Insufficient'; missing: string[] }

/**
 * Determines whether LabelSync can access all requested repositories.
 * @param github
 * @param repos
 */
export async function checkInstallationAccess(
  github: Octokit,
  repos: string[],
): Promise<InstallationAccess> {
  const {
    data: { repositories },
  } = await github.apps.listRepos({ per_page: 100 })

  const missing = repos.filter(repo =>
    repositories.every(({ name }) => repo !== name),
  )

  if (missing.length === 0) {
    return { status: 'Sufficient' }
  }

  return {
    status: 'Insufficient',
    missing: missing,
  }
}

import chalk from 'chalk'
import mls from 'multilines'

import { GithubRepository } from '../../github'
import {
  LabelSyncReport,
  createTerminalReport as createLabelSyncReport,
} from '../../handlers/labels'
import {
  SiblingSyncReport,
  createTerminalReport as createSiblingSyncReport,
} from '../../handlers/siblings'
import { RepositoryManifest } from '../../manifest'
import { RepositoryConfig } from '../../types'

import { Config, ConfigError } from './config'
import { SyncOptions } from './sync'

export type SyncReport = {
  config: Config
  options: SyncOptions
  syncs: RepositorySyncReport[]
  configErrors: ConfigError[]
}

export type RepositorySyncReport =
  | {
      status: 'success'
      repository: GithubRepository
      config: RepositoryConfig
      manifest: RepositoryManifest
      labels: LabelSyncReport
      siblings: SiblingSyncReport
    }
  | {
      status: 'error'
      message: string
      repository: GithubRepository
      config: RepositoryConfig
    }

/**
 *
 * Creates a human readable terminal report of CI Sync.
 * (Uses chalk to make report more lively.)
 *
 * @param report
 */
export function createTerminalReport(report: SyncReport): string {
  return mls`
    | ${chalk.bgBlueBright('Label Sync Report')}
    | ${chalk.gray('This is an autogenerated report for your project.')}
    | (dry run: "${report.options.dryRun}")
    | 
    |
    | Hey 😁 we ran some things. Check the changes we made:
    |
    | ${syncsList(report.syncs)}
    |
    | We had some difficulties with these projects:
    |
    | ${configErrorsList(report.configErrors)}
  `

  function syncsList(reports: RepositorySyncReport[]): string {
    return reports
      .map(report => {
        switch (report.status) {
          case 'success': {
            return mls`
              | ${createLabelSyncReport(report.labels)}
              |
              | ${createSiblingSyncReport(report.siblings)}
            `
          }

          case 'error': {
            return mls`
              | ${chalk.bgRed(report.repository.full_name)}
              | ${report.message}
            `
          }
        }
      })
      .join('\n')
  }

  function configErrorsList(reports: ConfigError[]): string {
    if (reports.length === 0) return 'No problems!'
    return reports.map(report => report.message).join('\n')
  }
}

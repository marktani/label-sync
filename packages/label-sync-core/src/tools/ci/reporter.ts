import chalk from 'chalk'
import ml from 'multilines'

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
      siblings: SiblingSyncReport | null
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
  return ml`
    | ${chalk.bgBlueBright('Label Sync Report')}
    | ${chalk.gray('This is an autogenerated report for your project.')}
    | (dry run: "${report.options.dryRun}")
    |
    | ${syncsList(report.syncs)}
    |
    | ${configErrorsList(report.configErrors)}
  `

  function syncsList(reports: RepositorySyncReport[]): string {
    return reports
      .map(report => {
        switch (report.status) {
          case 'success': {
            if (report.siblings) {
              return ml`
              | ${chalk.bgGreen(report.repository.full_name)}
              | ${createLabelSyncReport(report.labels)}
              |
              | ${createSiblingSyncReport(report.siblings)}
              `
            } else {
              return ml`
              | ${chalk.bgGreen(report.repository.full_name)}
              | ${createLabelSyncReport(report.labels)}
              `
            }
          }

          case 'error': {
            return ml`
              | ${chalk.bgRed(report.repository.full_name)}
              | ${report.message}
            `
          }
        }
      })
      .join('\n')
  }

  function configErrorsList(reports: ConfigError[]): string {
    if (reports.length === 0) return 'Synced all repositories with no problems!'
    return ml`
    | Check the configuration of these projects:
    | ${reports.map(report => report.message).join('\n')}
    `
  }
}

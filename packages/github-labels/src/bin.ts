#!/usr/bin/env node

import * as meow from 'meow'
import * as path from 'path'

import {
  handleSync,
  generateSyncReport,
  Config,
  SyncOptions,
} from '@prisma/github-labels-core'

import {
  generateConfigurationFromJSONLabelsConfiguration,
  getGithubLabelsJSONConfiguration,
  getGithubLabelsJSConfiguration,
} from './config'

const cli = meow(
  `
Usage
  $ labels

Options
  --config Path to your configuration file.

Examples
  $ labels --config labels.config.js
`,
  {
    flags: {
      config: {
        type: 'string',
        alias: 'c',
      },
    },
  },
)

/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test') main(cli.flags.config)

/**
 * Main
 */

export async function main(relativeConfigPath: string): Promise<boolean> {
  /**
   * Environment
   */

  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_BRANCH) {
    console.warn('Missing Github credentials!')
    return false
  }

  /**
   * Configuration
   */

  const config = await getConfigurationFile(relativeConfigPath)

  if (config.status === 'err') {
    console.warn(config.message)
    return false
  }

  /**
   * Sync
   */

  const report = await handleSync(config.config, {
    dryRun: false,
    githubToken: 'token',
  })

  const message = generateSyncReport(report)

  /**
   * Report
   */

  console.log(message)

  return true

  /**
   * Helper functions
   *
   * Functions which help with the execution of the main
   * process of Label Sync.
   */

  /**
   *
   * Obtains the configuration file from relative path.
   *
   * @param relativeConfigPath
   */
  async function getConfigurationFile(
    relativeConfigPath: string,
  ): Promise<
    | { status: 'ok'; config: Config; options: SyncOptions }
    | { status: 'err'; message: string }
  > {
    const absoluteConfigPath = path.resolve(process.cwd(), relativeConfigPath)

    if (absoluteConfigPath.endsWith('.js')) {
      /** JavaScript configuration file */
      const config = getGithubLabelsJSConfiguration(absoluteConfigPath)

      if (config === null) {
        return {
          status: 'err',
          message: `Couldn't find a valid configuration file at ${absoluteConfigPath}`,
        }
      }

      return {
        status: 'ok',
        config,
        options: {
          githubToken: process.env.GITHUB_TOKEN!,
          dryRun: process.env.GITHUB_BRANCH !== 'master',
        },
      }
    } else if (absoluteConfigPath.endsWith('.json')) {
      /** JSON configuration file */
      const configFile = getGithubLabelsJSONConfiguration(absoluteConfigPath)

      if (configFile === null) {
        return {
          status: 'err',
          message: `Couldn't find a valid configuration file at ${absoluteConfigPath}`,
        }
      }

      /** Parse configuration file */
      const config = await generateConfigurationFromJSONLabelsConfiguration(
        configFile,
        {
          githubToken: process.env.GITHUB_TOKEN!,
        },
      )

      if (config.status === 'err') {
        return {
          status: 'err',
          message: config.message,
        }
      }

      return {
        status: 'ok',
        config: config.config,
        options: {
          githubToken: process.env.GITHUB_TOKEN!,
          dryRun: process.env.GITHUB_BRANCH! !== configFile.publish.branch,
        },
      }
    } else {
      /** Unsupported cases */
      return {
        status: 'err',
        message: `Unsupported configuration type ${relativeConfigPath}`,
      }
    }
  }
}

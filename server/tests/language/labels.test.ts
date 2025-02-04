import { LabelSyncReport } from '../../src/handlers/labels'
import { generateHumanReadableReport } from '../../src/language/labels'

describe('language:', () => {
  test('correctly generates human readable report', () => {
    const reports: LabelSyncReport[] = [
      {
        status: 'Failure',
        owner: 'maticzav',
        repo: 'labelsync',
        message: `Couldn't make a diff of labels.`,
        config: {
          labels: {
            'bug/0': {
              color: 'ff',
            },
            'bug/1': {
              color: '00',
            },
            'bug/2': {
              color: '33',
            },
          },
          strict: false,
        },
      },
      {
        status: 'Success',
        owner: 'maticzav',
        repo: 'graphql-shield',
        additions: [
          {
            name: 'bug/2',
            color: '33',
            default: false,
          },
        ],
        updates: [
          {
            name: 'bug/1',
            color: '00',
            default: false,
          },
        ],
        removals: [
          {
            name: 'bug/3',
            color: 'ff',
            default: false,
          },
        ],
        config: {
          labels: {
            'bug/0': {
              color: 'ff',
            },
            'bug/1': {
              color: '00',
            },
            'bug/2': {
              color: '33',
            },
          },
          strict: true,
        },
      },
    ]

    expect(generateHumanReadableReport(reports)).toMatchSnapshot()
  })
})

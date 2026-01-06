import cronstrue from 'cronstrue'

/**
 * Parse a cron expression to human-readable string
 */
export function parseCronToHuman(expression: string): string {
  try {
    return cronstrue.toString(expression)
  } catch {
    return 'Invalid cron expression'
  }
}

/**
 * Validate a cron expression
 */
export function isValidCron(expression: string): boolean {
  try {
    cronstrue.toString(expression)
    return true
  } catch {
    return false
  }
}

/**
 * Common cron presets
 */
export const CRON_PRESETS = [
  { label: 'Every Minute', value: '* * * * *' },
  { label: 'Every Hour', value: '0 * * * *' },
  { label: 'Daily at Midnight', value: '0 0 * * *' },
  { label: 'Weekly (Sunday)', value: '0 0 * * 0' },
  { label: 'Monthly', value: '0 0 1 * *' },
]

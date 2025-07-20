import fs from 'fs'
import path from 'path'
import os from 'os'

const logDir = path.join(os.homedir(), 'Library', 'Logs', 'ai-cli')
const logFile = path.join(logDir, 'cli.log')

// Helper to truncate long strings in any nested object or array
function truncateLongStrings(input, maxLength = 100) {
  if (typeof input === 'string') {
    return input.length > maxLength ? input.slice(0, maxLength) + '...' : input
  } else if (Array.isArray(input)) {
    return input.map((item) => truncateLongStrings(item, maxLength))
  } else if (input && typeof input === 'object') {
    const out = {}
    for (const key of Object.keys(input)) {
      out[key] = truncateLongStrings(input[key], maxLength)
    }
    return out
  } else {
    return input
  }
}

export function logCommand({ command, args, result }) {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })

    const entry = {
      timestamp: new Date().toISOString(),
      command,
      args: truncateLongStrings(args),
      result: truncateLongStrings(result)
    }

    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n')
  } catch (err) {
    console.error('⚠️ Logging failed:', err.message)
  }
}

export function getLogFilePath() {
  return logFile
}

// Helper: Return array of all deleted object ids, in order
function getDeletedIdsFor(prefix) {
  try {
    if (!fs.existsSync(logFile)) return []
    const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean)
    const ids = []
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (
          entry.command &&
          entry.command.startsWith(prefix + '.') &&
          entry.command.endsWith('.delete') &&
          entry.args &&
          entry.args.id
        ) {
          ids.push(entry.args.id)
        }
      } catch {
        // ignore malformed log lines
      }
    }
    return ids
  } catch (err) {
    console.error('⚠️ Failed to read deleted ids:', err.message)
    return []
  }
}

export function getLatestThreadId() {
  try {
    if (!fs.existsSync(logFile)) return undefined
    const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean)
    const deleted = new Set(getDeletedIdsFor('threads'))
    let latest = undefined
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (
          entry.command === 'threads.create' &&
          entry.result &&
          typeof entry.result.id === 'string' &&
          !deleted.has(entry.result.id)
        ) {
          latest = entry.result.id
        }
      } catch {}
    }
    return latest
  } catch {
    return undefined
  }
}

export function getLatestAssistantId() {
  try {
    if (!fs.existsSync(logFile)) return undefined
    const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean)
    const deleted = new Set(getDeletedIdsFor('assistants'))
    let latest = undefined
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (
          entry.command === 'assistants.create' &&
          entry.result &&
          typeof entry.result.id === 'string' &&
          !deleted.has(entry.result.id)
        ) {
          latest = entry.result.id
        }
      } catch {}
    }
    return latest
  } catch {
    return undefined
  }
}

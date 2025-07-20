import fs from 'fs'
import path from 'path'
import os from 'os'

const logDir = path.join(os.homedir(), 'Library', 'Logs', 'ai-cli')
const logFile = path.join(logDir, 'cli.log')

export function logCommand({ command, args, result }) {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })

    const entry = {
      timestamp: new Date().toISOString(),
      command,
      args,
      result
    }

    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n')
  } catch (err) {
    console.error('⚠️ Logging failed:', err.message)
  }
}

export function getLogFilePath() {
  return logFile
}

import assistantsModule from './src/assistants.js'
import vectorstoresModule from './src/vectorstores.js'
import filesModule from './src/files.js'
import threadsModule from './src/threads.js'
import { getLogFilePath } from './src/logger.js'

const commands = {
  ...assistantsModule,
  ...vectorstoresModule,
  ...filesModule,
  ...threadsModule
}

// Usage: ai-cli <category> <command> [--param value ...]
function parseArgs(argv, params) {
  const out = {}
  let key = null
  for (const arg of argv) {
    if (arg.startsWith('--')) key = arg.slice(2)
    else if (key) {
      out[key] = arg
      key = null
    }
  }
  // Required param check
  if (params)
    for (const p of params) {
      if (!p.optional && !(p.name in out)) {
        throw new Error(`Missing required param: --${p.name}\n${p.description}`)
      }
    }
  return out
}

function printHelp(commands, prefix = [], isTopLevel = true, indentLevel = 0) {
  const indent = indentLevel > 0 ? '  '.repeat(indentLevel) : ''
  for (const category of Object.keys(commands).sort()) {
    const catObj = commands[category]
    for (const cmd of Object.keys(catObj).sort()) {
      const entry = catObj[cmd]
      if (entry && Array.isArray(entry.params) && typeof entry.func === 'function') {
        const params = entry.params.map((p) => (p.optional ? `[--${p.name}]` : `--${p.name}`)).join(' ')
        // Indent only for true subcommands (deeper than 1)
        const cmdIndent = indentLevel > 1 ? indent : ''
        const fullCmd = ['ai-cli', ...prefix, category, cmd].join(' ')
        console.log(`${cmdIndent}${fullCmd} ${params}`.trim())
      } else if (entry && typeof entry === 'object') {
        // Only increase indentation for 2nd-level or deeper
        printHelp({ [cmd]: entry }, [...prefix, category], false, indentLevel + 1)
      }
    }
  }
  if (isTopLevel) {
    console.log(`\n📄 Log file: ${getLogFilePath()}`)
  }
}

function resolveNestedCommand(root, segments) {
  let current = root
  for (const segment of segments) {
    if (!current || typeof current !== 'object') return null
    current = current[segment]
  }
  return current
}

async function main() {
  const [, , ...args] = process.argv

  if (args.length === 0 || args.includes('--help')) {
    printHelp(commands)
    process.exit(0)
  }

  // Dynamically resolve nested commands
  let path = []
  let entry = commands
  let i = 0

  while (i < args.length && typeof entry === 'object' && !Array.isArray(entry)) {
    const next = entry[args[i]]
    if (!next) break
    path.push(args[i])
    entry = next
    i++
    if (typeof entry.func === 'function') break
  }

  if (!entry || typeof entry.func !== 'function') {
    console.error(`Unknown or invalid command: ${path.join(' ')}\n`)
    printHelp(commands)
    process.exit(1)
  }

  const argv = args.slice(i)

  try {
    const parsedArgs = parseArgs(argv, entry.params)
    await entry.func(parsedArgs)
  } catch (e) {
    console.error(e.message || e)
    process.exit(1)
  }
}

main()

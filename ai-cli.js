import assistantsModule from './src/assistants.js'
import vectorstoresModule from './src/vectorstores.js'
import filesModule from './src/files.js'
import threadsModule from './src/threads.js'

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

function printHelp(commands, prefix = []) {
  for (const category of Object.keys(commands)) {
    const catObj = commands[category]
    for (const cmd of Object.keys(catObj)) {
      const entry = catObj[cmd]
      if (entry && Array.isArray(entry.params) && typeof entry.func === 'function') {
        const params = entry.params.map((p) => (p.optional ? `[--${p.name}]` : `--${p.name}`)).join(' ')
        // Prefix (if inside vectorstores files ...)
        const fullCmd = ['ai-cli', ...prefix, category, cmd].join(' ')
        console.log(`  ${fullCmd} ${params}`)
      } else if (entry && typeof entry === 'object') {
        // Recurse into subcommands (e.g., files, filebatches)
        printHelp({ [cmd]: entry }, [...prefix, category])
      }
    }
  }
}
async function main() {
  const [, , category, cmd, ...argv] = process.argv
  if (!category || !cmd || argv.includes('--help')) {
    printHelp(commands)
    process.exit(0)
  }

  const entry = commands[category]?.[cmd]
  if (!entry) {
    console.error(`Unknown command: ${category} ${cmd}\n`)
    printHelp(commands)
    process.exit(1)
  }

  try {
    const args = parseArgs(argv, entry.params)
    await entry.func(args)
  } catch (e) {
    console.error(e.message || e)
    process.exit(1)
  }
}

main()

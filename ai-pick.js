import { execSync } from 'child_process'

function printHelp() {
  console.log(`
Usage: ai-pick [--files] [--folders] [--multiple] [--current] [--help]

Options:
  --files     Select files (default: single file)
  --folders   Select folder(s) instead of file(s)
  --multiple  Allow multiple selections (for files or folders)
  --current   Start dialog in current working directory
  --help      Show this help message
  `)
}

function getDirClause(current) {
  if (!current) return ''
  const cwd = process.cwd()
  // Use "default location" for best compatibility
  return `default location POSIX file "${cwd}" `
}

// Single file or folder
function pickSingle({ folders = false, current = false } = {}) {
  const type = folders ? 'folder' : 'file'
  const dirClause = getDirClause(current)
  const prompt = folders ? 'Select a folder:' : 'Select a file:'
  try {
    const cmd = `osascript -e 'set f to choose ${type} ${dirClause}with prompt "${prompt}"' -e 'POSIX path of f' 2>/dev/null`
    const result = execSync(cmd).toString().trim()
    return result
  } catch {
    return ''
  }
}

// Multiple files or folders
function pickMultiple({ folders = false, current = false } = {}) {
  const type = folders ? 'folder' : 'file'
  const dirClause = getDirClause(current)
  const prompt = folders ? 'Select folders:' : 'Select files:'
  try {
    const cmd = `osascript -e 'set fs to choose ${type} ${dirClause}with prompt "${prompt}" with multiple selections allowed true' \
-e 'set output to ""' \
-e 'repeat with f in fs' \
-e 'set output to output & POSIX path of f & "\\n"' \
-e 'end repeat' \
-e 'output' 2>/dev/null`
    const result = execSync(cmd).toString().trim()
    return result.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

// MAIN
const args = process.argv.slice(2)
const opts = {
  files: args.includes('--files'),
  folders: args.includes('--folders'),
  multiple: args.includes('--multiple'),
  current: args.includes('--current')
}

if (args.includes('--help')) {
  printHelp()
  process.exit(0)
} else if (opts.multiple) {
  const files = pickMultiple({ folders: opts.folders, current: opts.current })
  if (files.length) files.forEach((f) => console.log(f))
} else {
  const file = pickSingle({ folders: opts.folders, current: opts.current })
  if (file) console.log(file)
}

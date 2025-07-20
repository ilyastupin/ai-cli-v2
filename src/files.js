import https from 'https'
import { OpenAI } from 'openai'
import { convertTimestampsToISO } from './helpers.js'
import { logCommand, getLatestFileId } from './logger.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function resolveFileId(args) {
  let id = args.id
  if (!id) {
    id = getLatestFileId()
    if (id) {
      console.error(`[ai-cli] No --id specified. Using latest file id: ${id}`)
    } else {
      console.error('[ai-cli] Error: No --id specified and no recent file found.')
      process.exit(1)
    }
  }
  return id
}

const files = {}

// --- files.create ---
files.create = {
  params: [
    { name: 'file', optional: false, description: 'Path to file to upload' },
    { name: 'purpose', optional: true, description: "Purpose (default: 'assistants')" }
  ],
  func: async (args) => {
    const fs = await import('fs')
    const stream = fs.createReadStream(args.file)
    const purpose = args.purpose || 'assistants'
    const result = await openai.files.create({ file: stream, purpose })
    logCommand({ command: 'files.create', args, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

// --- files.retrieve ---
files.retrieve = {
  params: [{ name: 'id', optional: true, description: 'File ID (if omitted, uses latest)' }],
  func: async (args) => {
    const id = resolveFileId(args)
    const result = await openai.files.retrieve(id)
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

// --- files.list ---
files.list = {
  params: [],
  func: async () => {
    const result = await openai.files.list()
    console.log(JSON.stringify(convertTimestampsToISO(result.data), null, 2))
  }
}

// --- files.delete ---
files.delete = {
  params: [{ name: 'id', optional: true, description: 'File ID (if omitted, uses latest)' }],
  func: async (args) => {
    const id = resolveFileId(args)
    const result = await openai.files.delete(id)
    logCommand({ command: 'files.delete', args: { ...args, id }, result })
    console.log(JSON.stringify(result, null, 2))
  }
}

export default { files }

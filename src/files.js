import { OpenAI } from 'openai'
import { convertTimestampsToISO } from './helpers.js'
import { logCommand } from './logger.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
  params: [{ name: 'id', optional: false, description: 'File ID' }],
  func: async (args) => {
    const result = await openai.files.retrieve(args.id)
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
  params: [{ name: 'id', optional: false, description: 'File ID' }],
  func: async (args) => {
    const result = await openai.files.delete(args.id)
    logCommand({ command: 'files.delete', args, result })
    console.log(JSON.stringify(result, null, 2))
  }
}

// --- files.download ---
files.download = {
  params: [{ name: 'id', optional: false, description: 'File ID' }],
  func: async (args) => {
    console.log('Download is under construction.')
    // Future example:
    // const buffer = await openai.files.download(args.id)
    // fs.writeFileSync('downloaded_filename.ext', buffer)
  }
}

export default { files }

import https from 'https'
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
  params: [
    { name: 'id', optional: false, description: 'File ID' },
    { name: 'output', optional: false, description: 'Output file name (path to save the file)' }
  ],
  func: async (args) => {
    const apiKey = process.env.OPENAI_API_KEY
    const url = `https://api.openai.com/v1/files/${args.id}/content`
    const outFile = args.output

    try {
      await new Promise((resolve, reject) => {
        const req = https.get(
          url,
          {
            headers: { Authorization: `Bearer ${apiKey}` }
          },
          (res) => {
            if (res.statusCode !== 200) {
              // Collect error body
              let data = ''
              res.on('data', (chunk) => {
                data += chunk
              })
              res.on('end', () => {
                try {
                  const errorJson = JSON.parse(data)
                  reject(new Error(`Failed to download file: HTTP ${res.statusCode}\n${JSON.stringify(errorJson, null, 2)}`))
                } catch {
                  reject(new Error(`Failed to download file: HTTP ${res.statusCode}\n${data}`))
                }
              })
              return
            }
            const fileStream = fs.createWriteStream(outFile)
            res.pipe(fileStream)
            fileStream.on('finish', () => {
              fileStream.close(resolve)
            })
            fileStream.on('error', reject)
          }
        )
        req.on('error', reject)
      })
      console.log(`[ai-cli] File ${args.id} downloaded and saved to ${outFile}`)
    } catch (e) {
      console.error(`[ai-cli] Download failed: ${e.message || e}`)
      process.exit(1)
    }
  }
}
export default { files }

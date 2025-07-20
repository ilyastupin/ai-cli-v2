import { OpenAI } from 'openai'
import { convertTimestampsToISO } from './helpers.js'
import { logCommand, getLatestVectorStoreId, getLatestFileId } from './logger.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function resolveVectorStoreId(args) {
  let id = args.id || args.vector_store_id // allow both --id and --vector_store_id
  if (!id) {
    id = getLatestVectorStoreId()
    if (id) {
      console.error(`[ai-cli] No --id/--vector_store_id specified. Using latest vector store id: ${id}`)
    } else {
      console.error('[ai-cli] Error: No --id/--vector_store_id specified and no recent vector store found.')
      process.exit(1)
    }
  }
  return id
}

function resolveFileId(args) {
  let id = args.file_id
  if (!id) {
    id = getLatestFileId()
    if (id) {
      console.error(`[ai-cli] No --file_id specified. Using latest file id: ${id}`)
    } else {
      console.error('[ai-cli] Error: No --file_id specified and no recent file found.')
      process.exit(1)
    }
  }
  return id
}

const vectorstores = {}

// --- Top-level vectorstores commands ---

vectorstores.create = {
  params: [
    { name: 'name', optional: true, description: 'Vector store name' },
    { name: 'file_ids', optional: true, description: 'Array of file IDs to index' },
    { name: 'expires_after', optional: true, description: 'Expiration policy object' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.create(args)
    logCommand({ command: 'vectorstores.create', args, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

vectorstores.retrieve = {
  params: [{ name: 'id', optional: true, description: 'Vector store ID (if omitted, uses latest)' }],
  func: async (args) => {
    const id = resolveVectorStoreId(args)
    const result = await openai.vectorStores.retrieve(id)
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

vectorstores.delete = {
  params: [{ name: 'id', optional: true, description: 'Vector store ID (if omitted, uses latest)' }],
  func: async (args) => {
    const id = resolveVectorStoreId(args)
    await openai.vectorStores.delete(id)
    logCommand({ command: 'vectorstores.delete', args: { ...args, id }, result: 'deleted' })
    console.log(`Vector store ${id} deleted.`)
  }
}

vectorstores.update = {
  params: [
    { name: 'id', optional: true, description: 'Vector store ID (if omitted, uses latest)' },
    { name: 'name', optional: true, description: 'New name for the vector store' },
    { name: 'expires_after', optional: true, description: 'Expiration policy object' }
  ],
  func: async (args) => {
    const id = resolveVectorStoreId(args)
    const { name, expires_after } = args
    const updateFields = {}
    if (name) updateFields.name = name
    if (expires_after) updateFields.expires_after = expires_after
    const result = await openai.vectorStores.update(id, updateFields)
    logCommand({ command: 'vectorstores.update', args: { ...args, id }, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

vectorstores.list = {
  params: [
    { name: 'limit', optional: true, description: 'Max items to return' },
    { name: 'order', optional: true, description: 'asc or desc' },
    { name: 'after', optional: true, description: 'Pagination cursor' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.list(args)
    console.log(JSON.stringify(convertTimestampsToISO(result.data), null, 2))
  }
}

// --- vectorstores.files subcommands ---

vectorstores.files = {}

vectorstores.files.create = {
  params: [
    { name: 'vector_store_id', optional: true, description: 'Vector store ID (if omitted, uses latest)' },
    { name: 'file_id', optional: true, description: 'File ID to add to vector store (if omitted, uses latest)' }
  ],
  func: async (args) => {
    const vector_store_id = resolveVectorStoreId(args)
    const file_id = resolveFileId(args)
    const result = await openai.vectorStores.files.create(vector_store_id, { file_id })
    logCommand({ command: 'vectorstores.files.create', args: { ...args, vector_store_id, file_id }, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

vectorstores.files.retrieve = {
  params: [
    { name: 'vector_store_id', optional: true, description: 'Vector store ID (if omitted, uses latest)' },
    { name: 'file_id', optional: true, description: 'File ID in vector store (if omitted, uses latest)' }
  ],
  func: async (args) => {
    const vector_store_id = resolveVectorStoreId(args)
    const file_id = resolveFileId(args)
    const result = await openai.vectorStores.files.retrieve({
      vector_store_id,
      file_id
    })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

vectorstores.files.list = {
  params: [
    { name: 'vector_store_id', optional: true, description: 'Vector store ID (if omitted, uses latest)' },
    { name: 'limit', optional: true, description: 'Max items to return' },
    { name: 'order', optional: true, description: 'asc or desc' },
    { name: 'filter', optional: true, description: 'Filter by status (in_progress, completed, etc.)' }
  ],
  func: async (args) => {
    const vector_store_id = resolveVectorStoreId(args)
    const { vector_store_id: _, ...options } = args
    const result = await openai.vectorStores.files.list(vector_store_id, options)
    console.log(JSON.stringify(convertTimestampsToISO(result.data), null, 2))
  }
}

vectorstores.files.delete = {
  params: [
    { name: 'vector_store_id', optional: true, description: 'Vector store ID (if omitted, uses latest)' },
    { name: 'file_id', optional: true, description: 'File ID in vector store (if omitted, uses latest)' }
  ],
  func: async (args) => {
    const vector_store_id = resolveVectorStoreId(args)
    const file_id = resolveFileId(args)
    await openai.vectorStores.files.delete(file_id, { vector_store_id }) // <-- correct usage!
    logCommand({ command: 'vectorstores.files.delete', args: { ...args, vector_store_id, file_id }, result: 'deleted' })
    console.log(`File ${file_id} deleted from vector store ${vector_store_id}.`)
  }
}

// --- vectorstores.filebatches subcommands ---

vectorstores.filebatches = {}

vectorstores.filebatches.create = {
  params: [
    { name: 'vector_store_id', optional: true, description: 'Vector store ID (if omitted, uses latest)' },
    { name: 'file_ids', optional: false, description: 'Array of file IDs to batch add' }
  ],
  func: async (args) => {
    const vector_store_id = resolveVectorStoreId(args)
    const result = await openai.vectorStores.fileBatches.create({
      vector_store_id,
      file_ids: args.file_ids
    })
    logCommand({ command: 'vectorstores.filebatches.create', args: { ...args, vector_store_id }, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

vectorstores.filebatches.createandpoll = {
  params: [
    { name: 'vector_store_id', optional: true, description: 'Vector store ID (if omitted, uses latest)' },
    { name: 'file_ids', optional: false, description: 'Array of file IDs to batch add' }
  ],
  func: async (args) => {
    const vector_store_id = resolveVectorStoreId(args)
    const result = await openai.vectorStores.fileBatches.createAndPoll({
      vector_store_id,
      file_ids: args.file_ids
    })
    logCommand({ command: 'vectorstores.filebatches.createandpoll', args: { ...args, vector_store_id }, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

vectorstores.filebatches.uploadandpoll = {
  params: [
    { name: 'vector_store_id', optional: true, description: 'Vector store ID (if omitted, uses latest)' },
    { name: 'files', optional: false, description: 'Array of local file streams or paths' }
  ],
  func: async (args) => {
    const vector_store_id = resolveVectorStoreId(args)
    const result = await openai.vectorStores.fileBatches.uploadAndPoll({
      vector_store_id,
      files: args.files
    })
    logCommand({ command: 'vectorstores.filebatches.uploadandpoll', args: { ...args, vector_store_id }, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

vectorstores.filebatches.list = {
  params: [
    { name: 'vector_store_id', optional: true, description: 'Vector store ID (if omitted, uses latest)' },
    { name: 'limit', optional: true, description: 'Max items to return' },
    { name: 'order', optional: true, description: 'asc or desc' }
  ],
  func: async (args) => {
    const vector_store_id = resolveVectorStoreId(args)
    const { vector_store_id: _, ...rest } = args
    const result = await openai.vectorStores.fileBatches.list(vector_store_id, rest)
    console.log(JSON.stringify(convertTimestampsToISO(result.data), null, 2))
  }
}

vectorstores.filebatches.retrieve = {
  params: [
    { name: 'vector_store_id', optional: true, description: 'Vector store ID (if omitted, uses latest)' },
    { name: 'batch_id', optional: false, description: 'Batch ID to retrieve' }
  ],
  func: async (args) => {
    const vector_store_id = resolveVectorStoreId(args)
    const result = await openai.vectorStores.fileBatches.retrieve({
      vector_store_id,
      batch_id: args.batch_id
    })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

vectorstores.filebatches.cancel = {
  params: [
    { name: 'vector_store_id', optional: true, description: 'Vector store ID (if omitted, uses latest)' },
    { name: 'batch_id', optional: false, description: 'Batch ID to cancel' }
  ],
  func: async (args) => {
    const vector_store_id = resolveVectorStoreId(args)
    await openai.vectorStores.fileBatches.cancel({
      vector_store_id,
      batch_id: args.batch_id
    })
    logCommand({ command: 'vectorstores.filebatches.cancel', args: { ...args, vector_store_id }, result: 'cancelled' })
    console.log(`Batch ${args.batch_id} cancelled in vector store ${vector_store_id}.`)
  }
}

export default { vectorstores }

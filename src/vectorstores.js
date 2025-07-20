import { OpenAI } from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const vectorstores = {}

// --- Top-level vectorstores commands ---

// --- CREATE ---
vectorstores.create = {
  params: [
    { name: 'name', optional: true, description: 'Vector store name' },
    { name: 'file_ids', optional: true, description: 'Array of file IDs to index' },
    { name: 'expires_after', optional: true, description: 'Expiration policy object' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.create(args)
    console.log(JSON.stringify(result, null, 2))
  }
}

vectorstores.delete = {
  params: [{ name: 'id', optional: false, description: 'Vector store ID' }],
  func: async (args) => {
    await openai.vectorStores.delete(args.id) // <--- Pass the ID, not { vector_store_id: id }
    console.log(`Vector store ${args.id} deleted.`)
  }
}

vectorstores.retrieve = {
  params: [{ name: 'id', optional: false, description: 'Vector store ID' }],
  func: async (args) => {
    const result = await openai.vectorStores.retrieve(args.id) // <--- Pass the ID
    console.log(JSON.stringify(result, null, 2))
  }
}

vectorstores.update = {
  params: [
    { name: 'id', optional: false, description: 'Vector store ID' },
    { name: 'name', optional: true, description: 'New name for the vector store' },
    { name: 'expires_after', optional: true, description: 'Expiration policy object' }
  ],
  func: async (args) => {
    const { id, ...rest } = args
    const result = await openai.vectorStores.update(id, rest) // <--- ID, then body
    console.log(JSON.stringify(result, null, 2))
  }
}
// --- LIST ---
vectorstores.list = {
  params: [
    { name: 'limit', optional: true, description: 'Max items to return' },
    { name: 'order', optional: true, description: 'asc or desc' },
    { name: 'after', optional: true, description: 'Pagination cursor' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.list(args)
    console.log(JSON.stringify(result.data, null, 2))
  }
}

// --- vectorstores.files subcommands (lowercase) ---

vectorstores.files = {}

vectorstores.files.create = {
  params: [
    { name: 'vector_store_id', optional: false, description: 'Vector store ID' },
    { name: 'file_id', optional: false, description: 'File ID to add to vector store' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.files.create(args)
    console.log(JSON.stringify(result, null, 2))
  }
}

vectorstores.files.retrieve = {
  params: [
    { name: 'vector_store_id', optional: false, description: 'Vector store ID' },
    { name: 'file_id', optional: false, description: 'File ID in vector store' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.files.retrieve(args)
    console.log(JSON.stringify(result, null, 2))
  }
}

vectorstores.files.list = {
  params: [
    { name: 'vector_store_id', optional: false, description: 'Vector store ID' },
    { name: 'limit', optional: true, description: 'Max items to return' },
    { name: 'order', optional: true, description: 'asc or desc' },
    { name: 'filter', optional: true, description: 'Filter by status (in_progress, completed, etc.)' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.files.list(args)
    console.log(JSON.stringify(result.data, null, 2))
  }
}

vectorstores.files.delete = {
  params: [
    { name: 'vector_store_id', optional: false, description: 'Vector store ID' },
    { name: 'file_id', optional: false, description: 'File ID in vector store' }
  ],
  func: async (args) => {
    await openai.vectorStores.files.delete(args)
    console.log(`File ${args.file_id} deleted from vector store ${args.vector_store_id}.`)
  }
}

// --- vectorstores.filebatches subcommands (all lowercase) ---

vectorstores.filebatches = {}

vectorstores.filebatches.create = {
  params: [
    { name: 'vector_store_id', optional: false, description: 'Vector store ID' },
    { name: 'file_ids', optional: false, description: 'Array of file IDs to batch add' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.fileBatches.create(args)
    console.log(JSON.stringify(result, null, 2))
  }
}

vectorstores.filebatches.createandpoll = {
  params: [
    { name: 'vector_store_id', optional: false, description: 'Vector store ID' },
    { name: 'file_ids', optional: false, description: 'Array of file IDs to batch add' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.fileBatches.createAndPoll(args)
    console.log(JSON.stringify(result, null, 2))
  }
}

vectorstores.filebatches.uploadandpoll = {
  params: [
    { name: 'vector_store_id', optional: false, description: 'Vector store ID' },
    { name: 'files', optional: false, description: 'Array of local file streams or paths' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.fileBatches.uploadAndPoll(args)
    console.log(JSON.stringify(result, null, 2))
  }
}

vectorstores.filebatches.list = {
  params: [
    { name: 'vector_store_id', optional: false, description: 'Vector store ID' },
    { name: 'limit', optional: true, description: 'Max items to return' },
    { name: 'order', optional: true, description: 'asc or desc' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.fileBatches.list(args)
    console.log(JSON.stringify(result.data, null, 2))
  }
}

vectorstores.filebatches.retrieve = {
  params: [
    { name: 'vector_store_id', optional: false, description: 'Vector store ID' },
    { name: 'batch_id', optional: false, description: 'Batch ID to retrieve' }
  ],
  func: async (args) => {
    const result = await openai.vectorStores.fileBatches.retrieve(args)
    console.log(JSON.stringify(result, null, 2))
  }
}

vectorstores.filebatches.cancel = {
  params: [
    { name: 'vector_store_id', optional: false, description: 'Vector store ID' },
    { name: 'batch_id', optional: false, description: 'Batch ID to cancel' }
  ],
  func: async (args) => {
    await openai.vectorStores.fileBatches.cancel(args)
    console.log(`Batch ${args.batch_id} cancelled in vector store ${args.vector_store_id}.`)
  }
}

export default { vectorstores }

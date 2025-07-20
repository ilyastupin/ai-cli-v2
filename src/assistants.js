import { OpenAI } from 'openai'
import { convertTimestampsToISO } from './helpers.js'
import { logCommand, getLatestVectorStoreId, getLatestAssistantId } from './logger.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const assistants = {}

assistants.create = {
  params: [
    { name: 'name', optional: false, description: 'Assistant name' },
    { name: 'instructions', optional: true, description: 'Instructions (default: "You are a helpful assistant.")' },
    { name: 'model', optional: true, description: 'Model name (default: gpt-4.1)' },
    {
      name: 'vectorstoreids',
      optional: true,
      description: 'Comma-separated vector store IDs for file search tool (or leave blank to use latest)'
    }
  ],
  func: async (args) => {
    let tools, tool_resources
    const hasVectorParam = Object.prototype.hasOwnProperty.call(args, 'vectorstoreids')
    let vectorstoreids = args.vectorstoreids

    if (!hasVectorParam) {
      // No --vectorstoreids at all: plain assistant
      console.error('ℹ️ Creating plain assistant (no file search, no vector stores).')
    } else if (vectorstoreids === '' || vectorstoreids == null) {
      // --vectorstoreids present but no value
      const latest = getLatestVectorStoreId()
      if (!latest) {
        console.error('❌ No vector store found in log. Cannot proceed.')
        process.exit(1)
      }
      vectorstoreids = latest
      console.error(`ℹ️ Using latest vector store: ${vectorstoreids}`)
      tools = [{ type: 'file_search' }]
      tool_resources = { file_search: { vector_store_ids: [vectorstoreids] } }
    } else {
      // --vectorstoreids with explicit list
      const ids = vectorstoreids
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (!ids.length) {
        console.error('❌ No valid vector store IDs provided.')
        process.exit(1)
      }
      console.error(`ℹ️ Using vector store IDs: ${ids.join(', ')}`)
      tools = [{ type: 'file_search' }]
      tool_resources = { file_search: { vector_store_ids: ids } }
    }

    const payload = {
      name: args.name,
      instructions: args.instructions || 'You are a helpful assistant.',
      model: args.model || 'gpt-4.1'
    }
    if (tools) payload.tools = tools
    if (tool_resources) payload.tool_resources = tool_resources

    const result = await openai.beta.assistants.create(payload)
    logCommand({ command: 'assistants.create', args, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

// --- RETRIEVE ---
assistants.retrieve = {
  params: [{ name: 'id', optional: true, description: 'Assistant ID (if omitted, uses latest)' }],
  func: async (args) => {
    let assistantId = args.id
    if (!assistantId) {
      assistantId = getLatestAssistantId()
      if (assistantId) {
        console.log(`[ai-cli] No --id specified. Using latest assistant id: ${assistantId}`)
      } else {
        console.error('[ai-cli] Error: No assistant id specified and no recent assistant found.')
        process.exit(1)
      }
    }
    const result = await openai.beta.assistants.retrieve(assistantId)
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

// --- UPDATE ---
assistants.update = {
  params: [
    { name: 'id', optional: false, description: 'Assistant ID' },
    { name: 'name', optional: true, description: 'Assistant name' },
    { name: 'instructions', optional: true, description: 'Instructions' },
    { name: 'tools', optional: true, description: 'Array of tool objects' },
    { name: 'model', optional: true, description: 'Model name' }
  ],
  func: async (args) => {
    const { id, ...updateFields } = args
    const result = await openai.beta.assistants.update(id, updateFields)
    logCommand({ command: 'assistants.update', args, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

// --- DELETE ---
assistants.delete = {
  params: [{ name: 'id', optional: false, description: 'Assistant ID' }],
  func: async (args) => {
    await openai.beta.assistants.delete(args.id)
    logCommand({ command: 'assistants.delete', args, result: 'deleted' })
    console.log(`Assistant ${args.id} deleted.`)
  }
}

// --- LIST ---
assistants.list = {
  params: [
    { name: 'limit', optional: true, description: 'Max items to return (default 20)' },
    { name: 'order', optional: true, description: 'asc or desc (default desc)' },
    { name: 'after', optional: true, description: 'Pagination cursor' }
  ],
  func: async (args) => {
    const result = await openai.beta.assistants.list({
      limit: args.limit || 20,
      order: args.order || 'desc',
      after: args.after
    })
    console.log(JSON.stringify(convertTimestampsToISO(result.data), null, 2))
  }
}

export default { assistants }

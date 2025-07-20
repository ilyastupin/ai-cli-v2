import { OpenAI } from 'openai'
import { convertTimestampsToISO } from './helpers.js'
import { logCommand, getLatestThreadId, getLatestAssistantId, getLatestRunId, getLatestVectorStoreId } from './logger.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function resolveThreadId(args) {
  let threadId = args.id || args.thread_id
  if (!threadId) {
    threadId = getLatestThreadId()
    if (threadId) {
      console.log(`[ai-cli] No --id specified. Using latest thread id: ${threadId}`)
    } else {
      console.error('[ai-cli] Error: No thread id specified and no recent thread found.')
      process.exit(1)
    }
  }
  return threadId
}

const threads = {}

// --- threads.create ---
threads.create = {
  params: [],
  func: async () => {
    const result = await openai.beta.threads.create()
    logCommand({ command: 'threads.create', args: {}, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

// --- threads.retrieve ---
threads.retrieve = {
  params: [{ name: 'id', optional: true, description: 'Thread ID (if omitted, uses latest)' }],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    const result = await openai.beta.threads.retrieve(threadId)
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

// --- threads.update ---
threads.update = {
  params: [
    { name: 'id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    { name: 'vectorstoreids', optional: true, description: 'Comma-separated vector store IDs (or leave blank to clear)' },
    { name: 'metadata', optional: true, description: 'JSON string with metadata to set' }
  ],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    let payload = {}
    let vectorstoreidsExplicit = Object.prototype.hasOwnProperty.call(args, 'vectorstoreids')

    if (vectorstoreidsExplicit) {
      let vector_store_ids
      if (args.vectorstoreids === '' || args.vectorstoreids == null) {
        // Explicitly clear vector store link
        vector_store_ids = []
        console.error('ℹ️ Clearing vector store link from thread.')
      } else {
        vector_store_ids = args.vectorstoreids
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        if (!vector_store_ids.length) {
          console.error('❌ No valid vector store IDs provided.')
          process.exit(1)
        }
        // Only one allowed
        if (vector_store_ids.length > 1) {
          console.error('⚠️ Only one vector store can be attached to a thread. Using the first one.')
          vector_store_ids = [vector_store_ids[0]]
        }
        console.error(`ℹ️ Using vector store ID: ${vector_store_ids[0]}`)
      }
      payload.tool_resources = { file_search: { vector_store_ids } }
    }

    if (args.metadata) {
      try {
        payload.metadata = JSON.parse(args.metadata)
      } catch (e) {
        console.error('❌ Failed to parse metadata JSON:', e.message)
        process.exit(1)
      }
    }

    if (!Object.keys(payload).length) {
      console.error('❌ Nothing to update (no --vectorstoreids or --metadata provided).')
      process.exit(1)
    }

    // Debug log
    console.log({ threadId, payload })

    const result = await openai.beta.threads.update(threadId, payload)
    logCommand({ command: 'threads.update', args: { ...args, id: threadId }, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

// --- threads.delete ---
threads.delete = {
  params: [{ name: 'id', optional: true, description: 'Thread ID (if omitted, uses latest)' }],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    await openai.beta.threads.delete(threadId)
    logCommand({ command: 'threads.delete', args: { ...args, id: threadId }, result: 'deleted' })
    console.log(`Thread ${threadId} deleted.`)
  }
}

// --- threads.messages ---
threads.messages = {}

threads.messages.create = {
  params: [
    { name: 'thread_id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    { name: 'role', optional: true, description: "Message role ('user' or 'assistant') (default: user)" },
    { name: 'content', optional: false, description: 'Message content' },
    {
      name: 'attachments',
      optional: true,
      description: 'Comma‑separated list of file IDs to attach (each with file_search tool)'
    }
  ],
  func: async (args) => {
    let threadId = args.thread_id
    if (!threadId) {
      threadId = getLatestThreadId()
      if (threadId) {
        console.log(`[ai-cli] No --thread_id specified. Using latest thread id: ${threadId}`)
      } else {
        console.error('[ai-cli] Error: No thread id specified and no recent thread found.')
        process.exit(1)
      }
    }

    let attachments
    if (args.attachments) {
      const ids = args.attachments
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (ids.length === 0) {
        console.error('❌ No valid file IDs provided in --attachments.')
        process.exit(1)
      }
      attachments = ids.map((id) => ({
        file_id: id,
        tools: [{ type: 'file_search' }]
      }))
      console.log(`ℹ️ Attaching files with file_search: ${ids.join(', ')}`)
    }

    const payload = {
      role: args.role || 'user',
      content: args.content
    }
    if (attachments) payload.attachments = attachments

    const result = await openai.beta.threads.messages.create(threadId, payload)
    logCommand({ command: 'threads.messages.create', args: { ...args, thread_id: threadId }, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

threads.messages.list = {
  params: [
    { name: 'thread_id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    { name: 'limit', optional: true, description: 'Max messages to return' }
  ],
  func: async (args) => {
    let threadId = args.thread_id
    if (!threadId) {
      threadId = getLatestThreadId()
      if (threadId) {
        console.log(`[ai-cli] No --thread_id specified. Using latest thread id: ${threadId}`)
      } else {
        console.error('[ai-cli] Error: No thread id specified and no recent thread found.')
        process.exit(1)
      }
    }
    const result = await openai.beta.threads.messages.list(threadId, {
      limit: args.limit
    })
    console.log(JSON.stringify(convertTimestampsToISO(result.data), null, 2))
  }
}

// --- threads.runs ---
threads.runs = {}

// ... (runs methods unchanged; you can include as before) ...

export default { threads }

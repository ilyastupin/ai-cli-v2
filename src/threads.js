import { OpenAI } from 'openai'
import { convertTimestampsToISO } from './helpers.js'
import { logCommand, getLatestThreadId, getLatestAssistantId, getLatestRunId } from './logger.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
    let threadId = args.id
    if (!threadId) {
      threadId = getLatestThreadId()
      if (threadId) {
        console.log(`[ai-cli] No --id specified. Using latest thread id: ${threadId}`)
      } else {
        console.error('[ai-cli] Error: No thread id specified and no recent thread found.')
        process.exit(1)
      }
    }
    const result = await openai.beta.threads.retrieve(threadId)
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

// --- threads.delete ---
threads.delete = {
  params: [{ name: 'id', optional: true, description: 'Thread ID (if omitted, uses latest)' }],
  func: async (args) => {
    let threadId = args.id
    if (!threadId) {
      threadId = getLatestThreadId()
      if (threadId) {
        console.log(`[ai-cli] No --id specified. Using latest thread id: ${threadId}`)
      } else {
        console.error('[ai-cli] Error: No thread id specified and no recent thread found.')
        process.exit(1)
      }
    }
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

function resolveThreadId(args) {
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
  return threadId
}

function resolveAssistantId(args) {
  let assistantId = args.assistant_id
  if (!assistantId) {
    assistantId = getLatestAssistantId()
    if (assistantId) {
      console.log(`[ai-cli] No --assistant_id specified. Using latest assistant id: ${assistantId}`)
    } else {
      console.error('[ai-cli] Error: No assistant id specified and no recent assistant found.')
      process.exit(1)
    }
  }
  return assistantId
}

function resolveRunId(args, threadId) {
  let runId = args.run_id
  if (!runId) {
    runId = getLatestRunId(threadId)
    if (runId) {
      if (threadId) {
        console.log(`[ai-cli] No --run_id specified. Using latest run id for thread ${threadId}: ${runId}`)
      } else {
        console.log(`[ai-cli] No --run_id specified. Using latest run id: ${runId}`)
      }
    } else {
      console.error('[ai-cli] Error: No run id specified and no recent run found.')
      process.exit(1)
    }
  }
  return runId
}

threads.runs.create = {
  params: [
    { name: 'thread_id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    { name: 'assistant_id', optional: true, description: 'Assistant ID (if omitted, uses latest)' },
    { name: 'instructions', optional: true, description: 'Override instructions' }
  ],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    const assistantId = resolveAssistantId(args)
    const opts = { assistant_id: assistantId }
    if (args.instructions) opts.instructions = args.instructions
    const result = await openai.beta.threads.runs.create(threadId, opts)
    logCommand({ command: 'threads.runs.create', args: { ...args, thread_id: threadId, assistant_id: assistantId }, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

threads.runs.createandpoll = {
  params: [
    { name: 'thread_id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    { name: 'assistant_id', optional: true, description: 'Assistant ID (if omitted, uses latest)' },
    { name: 'instructions', optional: true, description: 'Override instructions' }
  ],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    const assistantId = resolveAssistantId(args)
    const opts = { assistant_id: assistantId }
    if (args.instructions) opts.instructions = args.instructions
    const result = await openai.beta.threads.runs.createAndPoll(threadId, opts)
    logCommand({
      command: 'threads.runs.createandpoll',
      args: { ...args, thread_id: threadId, assistant_id: assistantId },
      result
    })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

threads.runs.retrieve = {
  params: [
    { name: 'thread_id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    { name: 'run_id', optional: true, description: 'Run ID (if omitted, uses latest)' }
  ],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    const runId = resolveRunId(args, threadId)
    const result = await openai.beta.threads.runs.retrieve(runId, { thread_id: threadId })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

threads.runs.list = {
  params: [
    { name: 'thread_id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    { name: 'limit', optional: true, description: 'Max runs to return' }
  ],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    const result = await openai.beta.threads.runs.list(threadId, {
      limit: args.limit
    })
    console.log(JSON.stringify(convertTimestampsToISO(result.data), null, 2))
  }
}

threads.runs.stream = {
  params: [
    { name: 'thread_id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    { name: 'assistant_id', optional: true, description: 'Assistant ID (if omitted, uses latest)' },
    { name: 'instructions', optional: true, description: 'Override instructions' }
  ],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    const assistantId = resolveAssistantId(args)
    const opts = { assistant_id: assistantId }
    if (args.instructions) opts.instructions = args.instructions
    const stream = await openai.beta.threads.runs.stream(threadId, opts)
    for await (const chunk of stream) {
      process.stdout.write(typeof chunk === 'string' ? chunk : JSON.stringify(chunk))
    }
    process.stdout.write('\n')
  }
}

export default { threads }

import { OpenAI } from 'openai'
import { convertTimestampsToISO } from './helpers.js'
import { logCommand, getLatestThreadId } from './logger.js'

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
  params: [{ name: 'id', optional: false, description: 'Thread ID' }],
  func: async (args) => {
    const result = await openai.beta.threads.retrieve(args.id)
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

// --- threads.update ---
threads.update = {
  params: [
    { name: 'id', optional: false, description: 'Thread ID' },
    { name: 'metadata', optional: false, description: 'JSON string for metadata' }
  ],
  func: async (args) => {
    const metadata = JSON.parse(args.metadata)
    const result = await openai.beta.threads.update(args.id, { metadata })
    logCommand({ command: 'threads.update', args, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

// --- threads.delete ---
threads.delete = {
  params: [{ name: 'id', optional: false, description: 'Thread ID' }],
  func: async (args) => {
    await openai.beta.threads.delete(args.id)
    logCommand({ command: 'threads.delete', args, result: 'deleted' })
    console.log(`Thread ${args.id} deleted.`)
  }
}

// --- threads.messages ---
threads.messages = {}

threads.messages.create = {
  params: [
    { name: 'thread_id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    {
      name: 'role',
      optional: true,
      description: "Message role ('user' or 'assistant') (default: user)"
    },
    { name: 'content', optional: false, description: 'Message content' }
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
    const result = await openai.beta.threads.messages.create(threadId, {
      role: args.role || 'user',
      content: args.content
    })
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

threads.runs.create = {
  params: [
    { name: 'thread_id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    { name: 'assistant_id', optional: false, description: 'Assistant ID' },
    { name: 'instructions', optional: true, description: 'Override instructions' }
  ],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    const opts = { assistant_id: args.assistant_id }
    if (args.instructions) opts.instructions = args.instructions
    const result = await openai.beta.threads.runs.create(threadId, opts)
    logCommand({ command: 'threads.runs.create', args: { ...args, thread_id: threadId }, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

threads.runs.createandpoll = {
  params: [
    { name: 'thread_id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    { name: 'assistant_id', optional: false, description: 'Assistant ID' },
    { name: 'instructions', optional: true, description: 'Override instructions' }
  ],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    const opts = { assistant_id: args.assistant_id }
    if (args.instructions) opts.instructions = args.instructions
    const result = await openai.beta.threads.runs.createAndPoll(threadId, opts)
    logCommand({ command: 'threads.runs.createandpoll', args: { ...args, thread_id: threadId }, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

threads.runs.retrieve = {
  params: [
    { name: 'thread_id', optional: true, description: 'Thread ID (if omitted, uses latest)' },
    { name: 'run_id', optional: false, description: 'Run ID' }
  ],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    const result = await openai.beta.threads.runs.retrieve(threadId, args.run_id)
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
    { name: 'assistant_id', optional: false, description: 'Assistant ID' },
    { name: 'instructions', optional: true, description: 'Override instructions' }
  ],
  func: async (args) => {
    const threadId = resolveThreadId(args)
    const opts = { assistant_id: args.assistant_id }
    if (args.instructions) opts.instructions = args.instructions
    const stream = await openai.beta.threads.runs.stream(threadId, opts)
    for await (const chunk of stream) {
      process.stdout.write(typeof chunk === 'string' ? chunk : JSON.stringify(chunk))
    }
    process.stdout.write('\n')
  }
}

export default { threads }

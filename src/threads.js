import { OpenAI } from 'openai'
import { convertTimestampsToISO } from './helpers.js'
import { logCommand } from './logger.js'

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
    { name: 'thread_id', optional: false, description: 'Thread ID' },
    { name: 'role', optional: false, description: "Message role ('user' or 'assistant')" },
    { name: 'content', optional: false, description: 'Message content' }
  ],
  func: async (args) => {
    const result = await openai.beta.threads.messages.create(args.thread_id, {
      role: args.role,
      content: args.content
    })
    logCommand({ command: 'threads.messages.create', args, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

threads.messages.list = {
  params: [
    { name: 'thread_id', optional: false, description: 'Thread ID' },
    { name: 'limit', optional: true, description: 'Max messages to return' }
  ],
  func: async (args) => {
    const result = await openai.beta.threads.messages.list(args.thread_id, {
      limit: args.limit
    })
    console.log(JSON.stringify(convertTimestampsToISO(result.data), null, 2))
  }
}

// --- threads.runs ---
threads.runs = {}

threads.runs.create = {
  params: [
    { name: 'thread_id', optional: false, description: 'Thread ID' },
    { name: 'assistant_id', optional: false, description: 'Assistant ID' },
    { name: 'instructions', optional: true, description: 'Override instructions' }
  ],
  func: async (args) => {
    const opts = { assistant_id: args.assistant_id }
    if (args.instructions) opts.instructions = args.instructions
    const result = await openai.beta.threads.runs.create(args.thread_id, opts)
    logCommand({ command: 'threads.runs.create', args, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

threads.runs.createandpoll = {
  params: [
    { name: 'thread_id', optional: false, description: 'Thread ID' },
    { name: 'assistant_id', optional: false, description: 'Assistant ID' },
    { name: 'instructions', optional: true, description: 'Override instructions' }
  ],
  func: async (args) => {
    const opts = { assistant_id: args.assistant_id }
    if (args.instructions) opts.instructions = args.instructions
    const result = await openai.beta.threads.runs.createAndPoll(args.thread_id, opts)
    logCommand({ command: 'threads.runs.createandpoll', args, result })
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

threads.runs.retrieve = {
  params: [
    { name: 'thread_id', optional: false, description: 'Thread ID' },
    { name: 'run_id', optional: false, description: 'Run ID' }
  ],
  func: async (args) => {
    const result = await openai.beta.threads.runs.retrieve(args.thread_id, args.run_id)
    console.log(JSON.stringify(convertTimestampsToISO(result), null, 2))
  }
}

threads.runs.list = {
  params: [
    { name: 'thread_id', optional: false, description: 'Thread ID' },
    { name: 'limit', optional: true, description: 'Max runs to return' }
  ],
  func: async (args) => {
    const result = await openai.beta.threads.runs.list(args.thread_id, {
      limit: args.limit
    })
    console.log(JSON.stringify(convertTimestampsToISO(result.data), null, 2))
  }
}

threads.runs.stream = {
  params: [
    { name: 'thread_id', optional: false, description: 'Thread ID' },
    { name: 'assistant_id', optional: false, description: 'Assistant ID' },
    { name: 'instructions', optional: true, description: 'Override instructions' }
  ],
  func: async (args) => {
    const opts = { assistant_id: args.assistant_id }
    if (args.instructions) opts.instructions = args.instructions
    const stream = await openai.beta.threads.runs.stream(args.thread_id, opts)
    for await (const chunk of stream) {
      process.stdout.write(typeof chunk === 'string' ? chunk : JSON.stringify(chunk))
    }
    process.stdout.write('\n')
  }
}

export default { threads }

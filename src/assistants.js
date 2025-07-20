import { OpenAI } from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const assistants = {}

// --- CREATE ---
assistants.create = {
  params: [
    { name: 'name', optional: false, description: 'Assistant name' },
    { name: 'instructions', optional: false, description: 'Instructions for assistant' },
    { name: 'tools', optional: true, description: 'Array of tool objects' },
    { name: 'model', optional: true, description: 'Model name (default: gpt-4o)' }
  ],
  func: async (args) => {
    const result = await openai.beta.assistants.create(args)
    console.log(JSON.stringify(result, null, 2))
  }
}

// --- RETRIEVE ---
assistants.retrieve = {
  params: [{ name: 'id', optional: false, description: 'Assistant ID' }],
  func: async (args) => {
    const result = await openai.beta.assistants.retrieve(args.id)
    console.log(JSON.stringify(result, null, 2))
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
    console.log(JSON.stringify(result, null, 2))
  }
}

// --- DELETE ---
assistants.delete = {
  params: [{ name: 'id', optional: false, description: 'Assistant ID' }],
  func: async (args) => {
    await openai.beta.assistants.delete(args.id)
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
    const result = await openai.beta.assistants.list(args)
    // Just print the array for clarity
    console.log(JSON.stringify(result.data, null, 2))
  }
}

export default { assistants }

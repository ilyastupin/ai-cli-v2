import fs from 'fs'
import path from 'path'
import { toFile } from 'openai'
import OpenAI from 'openai'
import { putHistory } from '../history/history.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─────────────────────────────────────────────────────────────────────────────
// VECTOR STORAGE

/**
 * Creates a new vector store with the specified name.
 * 
 * @param {string} name - The name of the vector store to create.
 * @returns {Promise<string>} The ID of the created vector store.
 */
export async function createVectorStore(name) {
  const result = await openai.vectorStores.create({ name })
  putHistory('createVectorStore', { name }, result)
  return result.id
}

/**
 * Uploads files to a specified vector store.
 * 
 * @param {string} vectorStoreId - The ID of the vector store to upload files to.
 * @param {string[]} filePaths - Array of file paths to upload.
 * @param {Object} [metadata={}] - Optional metadata to associate with the upload.
 * @returns {Promise<number>} The number of new files uploaded.
 */
export async function uploadFilesToVectorStore(vectorStoreId, filePaths, metadata = {}) {
  const beforeFiles = await openai.vectorStores.files.list(vectorStoreId)
  const beforeFileIds = new Set(beforeFiles.data.map((f) => f.id))

  const files = await Promise.all(filePaths.map((p) => toFile(fs.createReadStream(p), path.relative(process.cwd(), p))))

  await openai.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, { files })

  const afterFiles = await openai.vectorStores.files.list(vectorStoreId)
  const afterFileIds = new Set(afterFiles.data.map((f) => f.id))

  const newFileIds = [...afterFileIds].filter((id) => !beforeFileIds.has(id))

  putHistory('uploadFilesToVectorStore', { vectorStoreId, filePaths, metadata }, newFileIds)

  return newFileIds.length
}

/**
 * Lists all files in a specified vector store.
 * 
 * @param {string} vectorStoreId - The ID of the vector store.
 * @returns {Promise<Object[]>} An array of file objects containing id, name, and status.
 */
export async function listVectorStoreFiles(vectorStoreId) {
  const result = await openai.vectorStores.files.list(vectorStoreId)
  return result.data.map((f) => ({
    id: f.id,
    name: f.file_name || f.filename || 'unknown',
    status: f.status
  }))
}

/**
 * Deletes a file from a specified vector store.
 * 
 * @param {string} vectorStoreId - The ID of the vector store.
 * @param {string} fileId - The ID of the file to delete.
 * @returns {Promise<Object>} The result of the deletion operation.
 */
export async function deleteVectorStoreFile(vectorStoreId, fileId) {
  const result = await openai.vectorStores.files.delete(fileId, {
    vector_store_id: vectorStoreId
  })
  putHistory('deleteVectorStoreFile', { vectorStoreId, fileId }, result)
  return result
}

/**
 * Deletes an entire vector store.
 * 
 * @param {string} vectorStoreId - The ID of the vector store to delete.
 * @returns {Promise<Object>} The result of the deletion operation.
 */
export async function deleteVectorStore(vectorStoreId) {
  const result = await openai.vectorStores.delete(vectorStoreId)
  putHistory('deleteVectorStore', { vectorStoreId }, result)
  return result
}

/**
 * Retrieves a vector store by ID.
 * 
 * @param {string} vectorStoreId - The ID of the vector store to retrieve.
 * @returns {Promise<Object>} The retrieved vector store object.
 */
export async function getVectorStore(vectorStoreId) {
  return await openai.vectorStores.retrieve(vectorStoreId)
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSISTANT

/**
 * Creates an assistant with specified parameters.
 * 
 * @param {Object} params - Parameters for creating the assistant.
 * @param {string} params.name - Name of the assistant.
 * @param {string} params.instructions - Instructions for the assistant.
 * @param {string} params.model - Model to be used by the assistant.
 * @param {string[]} [params.vectorStoreIds] - Optional vector store IDs for context.
 * @returns {Promise<string>} The ID of the created assistant.
 */
export async function createAssistant({ name, instructions, model, vectorStoreIds }) {
  const tool_resources = vectorStoreIds
    ? {
        file_search: { vector_store_ids: vectorStoreIds }
      }
    : undefined
  const result = await openai.beta.assistants.create({
    name,
    instructions,
    model,
    tools: [{ type: 'file_search' }],
    tool_resources
  })
  putHistory('createAssistant', { name, instructions, model, vectorStoreIds }, result)
  return result.id
}

/**
 * Updates the vector store context for an existing assistant.
 * 
 * @param {string} assistantId - The ID of the assistant to update.
 * @param {string[]} vectorStoreIds - Array of vector store IDs for context.
 * @returns {Promise<Object>} The result of the update operation.
 */
export async function updateAssistantVectorStores(assistantId, vectorStoreIds) {
  const result = await openai.beta.assistants.update(assistantId, {
    tool_resources: {
      file_search: { vector_store_ids: vectorStoreIds }
    }
  })
  putHistory('updateAssistantVectorStores', { assistantId, vectorStoreIds }, result)
  return result
}

/**
 * Deletes an assistant by ID.
 * 
 * @param {string} assistantId - The ID of the assistant to delete.
 * @returns {Promise<Object>} The result of the deletion operation.
 */
export async function deleteAssistant(assistantId) {
  const result = await openai.beta.assistants.delete(assistantId)
  putHistory('deleteAssistant', { assistantId }, result)
  return result
}

/**
 * Retrieves an assistant by ID.
 * 
 * @param {string} assistantId - The ID of the assistant to retrieve.
 * @returns {Promise<Object>} The retrieved assistant object.
 */
export async function getAssistant(assistantId) {
  return await openai.beta.assistants.retrieve(assistantId)
}

// ─────────────────────────────────────────────────────────────────────────────
// THREAD

/**
 * Creates a new thread.
 * 
 * @returns {Promise<string>} The ID of the created thread.
 */
export async function createThread() {
  const result = await openai.beta.threads.create()
  putHistory('createThread', {}, result)
  return result.id
}

/**
 * Sends a user question to an assistant and returns the response.
 * Supports attaching files to the user message (non-vector storage).
 *
 * @param {object} params
 * @param {string} params.assistantId - Assistant ID
 * @param {string} params.threadId - Thread ID
 * @param {string} params.question - User question
 * @param {Object} [params.context={}] - Optional additional context.
 * @param {string[]} [params.fileIds] - Optional file IDs to attach
 * @param {function} [params.onProgress] - Optional progress callback
 * @returns {Promise<string>} Assistant reply
 */
export async function askQuestion({ assistantId, threadId, question, context = {}, fileIds = [], onProgress = () => {} }) {
  await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: question,
    ...(fileIds.length > 0 && {
      attachments: fileIds.map((file_id) => ({
        file_id,
        tools: [{ type: 'file_search' }]
      }))
    })
  })

  let run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId
  })

  while (['queued', 'in_progress'].includes(run.status)) {
    onProgress(run.status)
    await new Promise((r) => setTimeout(r, 1000))
    run = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId })
  }

  const messages = await openai.beta.threads.messages.list(threadId)
  const reply = messages.data
    .filter((m) => m.role === 'assistant')
    .map((m) => m.content?.[0]?.text?.value)
    .filter(Boolean)[0]

  putHistory('askQuestion', { assistantId, threadId, question, fileIds, context }, reply)
  return reply
}

/**
 * Retrieves all messages from a specified thread.
 * 
 * @param {string} threadId - The ID of the thread.
 * @returns {Promise<Object[]>} An array of message objects.
 */
export async function getThreadMessages(threadId) {
  const res = await openai.beta.threads.messages.list(threadId)
  return res.data
}

/**
 * Deletes a thread by ID.
 * 
 * @param {string} threadId - The ID of the thread to delete.
 * @returns {Promise<Object>} The result of the deletion operation.
 */
export async function deleteThread(threadId) {
  const result = await openai.beta.threads.delete(threadId)
  putHistory('deleteThread', { threadId }, result)
  return result
}

/**
 * Estimates the number of tokens in a given thread plus a prompt.
 * 
 * @param {Object} params
 * @param {string} params.threadId - The ID of the thread.
 * @param {string} params.prompt - Prompt text to include in token count.
 * @returns {Promise<number>} The estimated token count.
 */
export async function estimateTokenCount({ threadId, prompt }) {
  const messages = await openai.beta.threads.messages.list(threadId)
  const text = messages.data.flatMap((m) => m.content.map((c) => c.text?.value || '')).join('\n') + '\n' + prompt
  const tokens = encode(text).length
  return tokens
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS

/**
 * Prepares a file for uploading with a logical path.
 * 
 * @param {string} filepath - The actual file path on the disk.
 * @param {string} logicalPath - The logical path representing the file in storage.
 * @returns {Promise<Object>} A file object prepared for uploading.
 */
export async function prepareFileWithLogicalPath(filepath, logicalPath) {
  const absPath = path.resolve(filepath)
  const stream = fs.createReadStream(absPath)
  return await toFile(stream, logicalPath)
}

/**
 * Retrieves all text files in a specified directory, optionally filtering by extension.
 * 
 * @param {string} dir - The directory to search within.
 * @param {string[]} [filterExt=['.js', '.ts', '.json', '.md']] - File extensions to include.
 * @returns {string[]} An array of paths to text files found in the directory.
 */
export function getAllTextFilesInDirectory(dir, filterExt = ['.js', '.ts', '.json', '.md']) {
  const files = []
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) walk(fullPath)
      else if (filterExt.includes(path.extname(entry.name))) files.push(fullPath)
    }
  }
  walk(dir)
  return files
}

/**
 * Splits an array into chunks of a specified size.
 * 
 * @param {Array} arr - The array to split into chunks.
 * @param {number} size - The size of each chunk.
 * @returns {Array[]} The array of chunks.
 */
export function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

/**
 * Uploads a file to OpenAI's storage and returns its file ID.
 *
 * @param {string} filePath - Absolute or relative path to file on disk
 * @param {string} [purpose='assistants'] - File purpose, defaults to 'assistants'
 * @returns {Promise<string>} OpenAI file ID
 */
export async function uploadFileToStorage(filePath, purpose = 'assistants') {
  const logicalPath = path.relative(process.cwd(), filePath)
  const file = await toFile(fs.createReadStream(filePath), logicalPath)

  const result = await openai.files.create({
    file,
    purpose
  })

  putHistory('uploadFileToStorage', { filePath, purpose }, result)
  return result.id
}
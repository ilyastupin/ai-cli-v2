// helpers.js

/**
 * Recursively adds `created_at_iso` to all objects (or elements in arrays)
 * that contain a `created_at` timestamp (UNIX seconds).
 *
 * @param {*} data - Object, array, or primitive
 * @returns {*} Deep copy of data with ISO timestamp fields added
 */
export function convertTimestampsToISO(data) {
  if (Array.isArray(data)) {
    return data.map(convertTimestampsToISO)
  } else if (data && typeof data === 'object') {
    const newObj = {}

    for (const [key, value] of Object.entries(data)) {
      newObj[key] = convertTimestampsToISO(value)
      if (key === 'created_at' && typeof value === 'number') {
        newObj.created_at_iso = new Date(value * 1000).toISOString()
      }
    }

    return newObj
  }

  return data
}

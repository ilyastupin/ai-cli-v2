/**
 * Recursively adds *_iso fields to any recognized UNIX timestamp fields.
 * Recognized fields: created_at, expires_at, expires_after, last_active_at.
 *
 * @param {*} data - Object, array, or primitive
 * @returns {*} Deep copy of data with ISO timestamp fields added
 */
export function convertTimestampsToISO(data) {
  const timestampKeys = ['created_at', 'expires_at', 'expires_after', 'last_active_at']

  if (Array.isArray(data)) {
    return data.map(convertTimestampsToISO)
  } else if (data && typeof data === 'object') {
    const newObj = {}

    for (const [key, value] of Object.entries(data)) {
      newObj[key] = convertTimestampsToISO(value)
      if (timestampKeys.includes(key) && typeof value === 'number') {
        newObj[`${key}_iso`] = new Date(value * 1000).toISOString()
      }
    }

    return newObj
  }

  return data
}

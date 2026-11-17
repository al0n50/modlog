// One place that turns database/network failures into messages a car person understands.
// Every data function throws a DataError: `message` is safe to show, `code` and `cause`
// keep the original details for logging and tests.

const CONSTRAINT_MESSAGES = {
  vehicles_year_range:     'Enter a model year between 1886 and next year.',
  vehicles_make_present:   'Enter the car\'s make.',
  vehicles_model_present:  'Enter the car\'s model.',
  vehicles_vin_format:     'VIN must be 17 letters and numbers (VINs never use I, O, or Q).',
  vehicles_color_hex:      'Pick a paint color from the color picker.',
  vehicles_body_style_known: 'Pick a body style from the list.',
  mods_name_present:       'Give the mod a name.',
  mods_category_valid:     'Pick a category from the list.',
  mods_price_nonnegative:  'Price can\'t be negative.',
  mods_priority_range:     'Priority must be 1 to 3 stars.',
  mods_status_valid:       'A mod is either done or planned.',
  follows_not_self:        'You can\'t follow yourself.',
  reactions_type_valid:    'That reaction isn\'t supported.',
  vehicles_text_lengths:   'Make, model and trim must be 60 characters or fewer.',
  vehicles_cover_url:      'The image link must start with https://.',
  mods_text_lengths:       'Keep names under 120 characters, brand and part number under 80, and notes under 2,000.',
  mods_url_http:           'The product link must start with https:// (or http://).',
  mods_install_date_range: 'Install date can\'t be in the future.',
  profiles_text_lengths:   'Keep your bio under 500 characters.',
}

export class DataError extends Error {
  constructor(message, { code = null, cause = null } = {}) {
    super(message)
    this.name = 'DataError'
    this.code = code
    this.cause = cause
  }
}

export function friendlyMessage(err) {
  if (!err) return 'Something went wrong. Try again.'
  if (err instanceof DataError) return err.message
  const code = err.code || ''
  const text = `${err.message || ''} ${err.details || ''}`
  if (err.name === 'TypeError' || /Failed to fetch|NetworkError|Load failed/i.test(text)) {
    return 'Can\'t reach ModLog right now. Check your connection and try again.'
  }
  if (code === '23514') {
    const name = Object.keys(CONSTRAINT_MESSAGES).find(c => text.includes(c))
    return name ? CONSTRAINT_MESSAGES[name] : 'Some details aren\'t valid. Check the form and try again.'
  }
  if (code === '23505') return 'That already exists.'
  if (code === '23502') return 'Fill in the required fields.'
  if (code === '22P02') return 'Not found. The link may be broken.'
  if (code === '22003') return 'That number is too large.'
  if (code === '22007' || code === '22008') return 'Enter a valid date.'
  if (code === '23503') return 'That item no longer exists. Refresh and try again.'
  if (code === 'PGRST116') return 'Not found. It may be private or deleted.'
  if (code === 'PGRST301' || code === 'PGRST303' || /JWT expired/i.test(text)) return 'Your session expired. Sign in again.'
  if (code === '42501' || /row-level security|permission denied/i.test(text)) {
    return 'You don\'t have permission to do that.'
  }
  return err.message || 'Something went wrong. Try again.'
}

export function toDataError(err) {
  if (err instanceof DataError) return err
  return new DataError(friendlyMessage(err), { code: err?.code ?? null, cause: err })
}

// Await a Supabase query and return its data, or throw a DataError.
export async function run(query) {
  let result
  try {
    result = await query
  } catch (e) {
    throw toDataError(e)
  }
  if (result?.error) throw toDataError(result.error)
  return result?.data ?? null
}

// Same, for queries that ask for a count ({ count: 'exact', head: true }).
export async function runCount(query) {
  let result
  try {
    result = await query
  } catch (e) {
    throw toDataError(e)
  }
  if (result?.error) throw toDataError(result.error)
  return result?.count ?? 0
}

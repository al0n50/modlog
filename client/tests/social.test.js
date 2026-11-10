import { describe, expect, it, vi } from 'vitest'
vi.mock('../src/lib/supabase', () => ({ supabase: {} }))
const { tallyReactions } = await import('../src/hooks/useSocial')

describe('tallyReactions', () => {
  it('counts each reaction type and marks the current user', () => {
    const rows = [
      { type: 'fire', user_id: 'a' }, { type: 'fire', user_id: 'b' },
      { type: 'eye', user_id: 'a' }, { type: 'bogus', user_id: 'a' },
    ]
    expect(tallyReactions(rows, 'a')).toEqual({
      counts: { fire: 2, wrench: 0, eye: 1 },
      mine:   { fire: true, wrench: false, eye: true },
    })
  })

  it('handles no data and signed-out users', () => {
    expect(tallyReactions(null, 'a').counts).toEqual({ fire: 0, wrench: 0, eye: 0 })
    expect(tallyReactions([{ type: 'fire', user_id: undefined }], undefined).mine.fire).toBe(false)
  })
})

import { describe, expect, it, vi } from 'vitest'

const upload = vi.fn().mockResolvedValue({ error: null })
vi.mock('../src/lib/supabase', () => ({
  supabase: { storage: { from: () => ({ upload, getPublicUrl: p => ({ data: { publicUrl: `https://cdn/${p}` } }) }) } },
}))
const { photoError, uploadVehiclePhoto, MAX_PHOTO_BYTES } = await import('../src/lib/storage')

const file = (name, type, size = 10) => ({ name, type, size })

describe('photo uploads', () => {
  it('accepts the photo types the bucket allows', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/heic']) expect(photoError(file('a', t))).toBeNull()
  })
  it('explains unsupported types and oversized files', () => {
    expect(photoError(file('anim.gif', 'image/gif'))).toMatch(/JPG, PNG, WebP, or HEIC/)
    expect(photoError(file('big.jpg', 'image/jpeg', MAX_PHOTO_BYTES + 1))).toMatch(/5 MB/)
  })
  it('never sends a rejected file to storage', async () => {
    await expect(uploadVehiclePhoto('u', 'v', file('anim.gif', 'image/gif'))).rejects.toThrow(/HEIC/)
    expect(upload).not.toHaveBeenCalled()
    const url = await uploadVehiclePhoto('u', 'v', file('car.jpg', 'image/jpeg'))
    expect(url).toMatch(/^https:\/\/cdn\/u\/v\/\d+\.jpg$/)
  })
})

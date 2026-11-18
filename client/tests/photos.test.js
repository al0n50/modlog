// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { extensionFor, fitWithin, MAX_PHOTO_BYTES, preparePhoto } from '../src/lib/photos'

const file = (name, type, size = 1000) => new File([new Uint8Array(size)], name, { type })

describe('fitWithin', () => {
  it('shrinks big photos to 2000 px on the long side, keeping the shape', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2000, height: 1500 })
    expect(fitWithin(3024, 4032)).toEqual({ width: 1500, height: 2000 })
  })
  it('never enlarges small photos', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
  it('rejects nonsense sizes', () => {
    expect(fitWithin(0, 100)).toBeNull()
    expect(fitWithin(NaN, 100)).toBeNull()
  })
})

describe('extensionFor', () => {
  it('names files by their real type', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg')
    expect(extensionFor('image/heic')).toBe('heic')
    expect(extensionFor('text/html')).toBe('jpg')
  })
})

describe('preparePhoto', () => {
  afterEach(() => vi.unstubAllGlobals())

  // A fake browser that can decode images: records the canvas size and returns a JPEG blob
  function fakeBrowser({ width, height, outBytes }) {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toBlob: (cb, type) => cb(new Blob([new Uint8Array(outBytes)], { type })) }
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width, height, close: vi.fn() })))
    const real = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(tag => (tag === 'canvas' ? canvas : real(tag)))
    return canvas
  }

  it('turns a huge phone photo into a 2000 px JPEG under the limit', async () => {
    const canvas = fakeBrowser({ width: 4032, height: 3024, outBytes: 600_000 })
    const out = await preparePhoto(file('IMG_1234.png', 'image/png', 9 * 1024 * 1024))
    expect(out.type).toBe('image/jpeg')
    expect(out.name).toBe('IMG_1234.jpg')
    expect(out.size).toBeLessThan(MAX_PHOTO_BYTES)
    expect([canvas.width, canvas.height]).toEqual([2000, 1500])
  })

  it('keeps a small photo as it is when the copy wouldn’t be smaller', async () => {
    fakeBrowser({ width: 800, height: 600, outBytes: 5000 })
    const original = file('car.jpg', 'image/jpeg', 2000)
    expect(await preparePhoto(original)).toBe(original)
  })

  it('uploads the original when the browser can’t read the photo (e.g. HEIC outside Safari)', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('unsupported') }))
    const heic = file('car.heic', 'image/heic')
    expect(await preparePhoto(heic)).toBe(heic)
  })
})

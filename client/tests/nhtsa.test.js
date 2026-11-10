import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeVIN } from '../src/lib/nhtsa'

const VIN = '1HGCM82633A004352'
const mockFetch = (body, ok = true) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: async () => body }))

afterEach(() => vi.unstubAllGlobals())

describe('decodeVIN', () => {
  it('rejects VINs that are not 17 characters', async () => {
    await expect(decodeVIN('')).rejects.toThrow(/17 characters/)
    await expect(decodeVIN('ABC123')).rejects.toThrow(/17 characters/)
  })

  it('maps NHTSA fields into vehicle + specs', async () => {
    mockFetch({ Results: [{
      ModelYear: '2003', Make: 'HONDA ', Model: 'Accord', Trim: 'EX',
      DisplacementL: '2.998', EngineCylinders: '6', FuelTypePrimary: 'Gasoline',
      DriveType: 'FWD', TransmissionStyle: 'Automatic', Doors: '2',
      BodyClass: 'Coupe', PlantCountry: 'UNITED STATES (USA)',
    }] })
    const v = await decodeVIN(` ${VIN.toLowerCase()} `)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/DecodeVinValues/${VIN.toLowerCase()}?format=json`))
    expect(v).toMatchObject({ vin: VIN, year: 2003, make: 'HONDA', model: 'Accord', trim: 'EX' })
    expect(v.specs).toMatchObject({ engine: '3.0L', cylinders: '6', drivetrain: 'FWD', bodyClass: 'Coupe' })
  })

  it('errors when the decode is incomplete or the API is down', async () => {
    mockFetch({ Results: [{ ModelYear: '', Make: '', Model: '' }] })
    await expect(decodeVIN(VIN)).rejects.toThrow(/incomplete/)
    mockFetch({ Results: [] })
    await expect(decodeVIN(VIN)).rejects.toThrow(/No data/)
    mockFetch({}, false)
    await expect(decodeVIN(VIN)).rejects.toThrow(/unreachable/)
  })
})

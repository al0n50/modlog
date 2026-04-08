const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'

// Decode a VIN and return clean vehicle data
export async function decodeVIN(vin) {
  if (!vin || vin.trim().length !== 17) {
    throw new Error('VIN must be exactly 17 characters')
  }

  const res = await fetch(`${BASE}/DecodeVinValues/${vin.trim()}?format=json`)
  if (!res.ok) throw new Error('NHTSA API unreachable. Check your connection.')

  const json = await res.json()
  const r = json.Results?.[0]
  if (!r) throw new Error('No data returned for this VIN.')

  // NHTSA returns empty strings for unknown fields
  const year  = parseInt(r.ModelYear)
  const make  = r.Make?.trim()
  const model = r.Model?.trim()
  const trim  = r.Trim?.trim()

  if (!year || !make || !model) {
    throw new Error('VIN decoded but vehicle data is incomplete. Try manual entry.')
  }

  return {
    vin: vin.trim().toUpperCase(),
    year,
    make,
    model,
    trim: trim || '',
    // Extra spec sheet data for future Sprint 2D
    specs: {
      engine:       r.DisplacementL ? `${parseFloat(r.DisplacementL).toFixed(1)}L` : '',
      cylinders:    r.EngineCylinders || '',
      fuel:         r.FuelTypePrimary || '',
      drivetrain:   r.DriveType || '',
      transmission: r.TransmissionStyle || '',
      doors:        r.Doors || '',
      bodyClass:    r.BodyClass || '',
      plantCountry: r.PlantCountry || '',
    }
  }
}
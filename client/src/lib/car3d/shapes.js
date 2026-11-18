/**
 * Low-detail 3D cars, one per body style, made from simple side profiles. Pure data and math
 * (tested in tests/car3d-shapes.test.js); CarViewer turns them into 3D.
 *
 * These models are ModLog's own (MIT, made in code): no third-party files to license.
 * Units are meters. x runs along the car from the rear bumper (0) to the front (length);
 * y is height from the ground.
 */
import { BODY_STYLES } from '../vehicles'

/*
 * length/width: overall size.  ride: body bottom.  belt: beltline (bottom of the windows).
 * roof: roof height.  hood: length from the nose to the windshield base.  aRake: how far the
 * windshield leans back.  rear: length from the rear bumper to the rear window base.
 * cRake: how far the rear window leans.  nose: height of the front face below the beltline.
 * wheel: tire radius.  overhang: [rear, front] bumper-to-axle lengths.
 */
const S = {
  sedan:       { length: 4.80, width: 1.84, ride: 0.18, belt: 0.92, roof: 1.44, hood: 1.30, aRake: 0.75, rear: 0.95, cRake: 0.70, nose: 0.24, wheel: 0.33, overhang: [1.05, 0.95] },
  coupe:       { length: 4.60, width: 1.86, ride: 0.15, belt: 0.86, roof: 1.32, hood: 1.45, aRake: 0.85, rear: 0.70, cRake: 0.95, nose: 0.26, wheel: 0.34, overhang: [0.95, 0.90] },
  convertible: { length: 4.50, width: 1.84, ride: 0.15, belt: 0.86, roof: 1.20, hood: 1.40, aRake: 0.45, rear: 0.90, cRake: 0.00, nose: 0.26, wheel: 0.33, overhang: [0.90, 0.88], open: true },
  hatchback:   { length: 4.20, width: 1.78, ride: 0.17, belt: 0.92, roof: 1.46, hood: 1.10, aRake: 0.75, rear: 0.10, cRake: 0.38, nose: 0.22, wheel: 0.31, overhang: [0.75, 0.85] },
  wagon:       { length: 4.85, width: 1.84, ride: 0.18, belt: 0.94, roof: 1.48, hood: 1.25, aRake: 0.75, rear: 0.12, cRake: 0.22, nose: 0.24, wheel: 0.33, overhang: [1.05, 0.95] },
  suv:         { length: 4.75, width: 1.92, ride: 0.28, belt: 1.12, roof: 1.74, hood: 1.20, aRake: 0.65, rear: 0.12, cRake: 0.24, nose: 0.14, wheel: 0.38, overhang: [0.95, 0.90] },
  pickup:      { length: 5.80, width: 2.02, ride: 0.32, belt: 1.22, roof: 1.92, hood: 1.65, aRake: 0.50, rear: 2.00, cRake: 0.06, nose: 0.10, wheel: 0.41, overhang: [1.25, 0.95] },
  minivan:     { length: 5.15, width: 1.98, ride: 0.20, belt: 1.08, roof: 1.76, hood: 0.95, aRake: 0.85, rear: 0.10, cRake: 0.15, nose: 0.18, wheel: 0.35, overhang: [1.05, 0.95] },
  van:         { length: 5.90, width: 2.03, ride: 0.24, belt: 1.12, roof: 2.15, hood: 0.70, aRake: 0.45, rear: 0.04, cRake: 0.04, nose: 0.10, wheel: 0.36, overhang: [1.30, 0.85] },
}

export const SHAPE_STYLES = Object.keys(S)

/** The shape for a body style; unknown or missing styles use the sedan. */
export function carShape(bodyStyle) {
  const key = Object.hasOwn(S, bodyStyle) ? bodyStyle : 'sedan'
  return { style: key, label: BODY_STYLES.find(([v]) => v === key)?.[1] ?? 'Sedan', ...S[key] }
}

/** Closed outline of the lower body (bumpers, hood, trunk), counterclockwise from the rear bottom. */
export function bodyProfile(s) {
  const r = Math.min(0.15, s.length * 0.03) // rounded bumper corners
  return [
    [0, s.ride + r], [r, s.ride], [s.length - r, s.ride], [s.length, s.ride + r],
    [s.length, s.belt - s.nose], [s.length - s.hood, s.belt], [0.06, s.belt], [0, s.belt - 0.08],
  ]
}

/** Closed outline of the cabin (windows and roof) sitting on the beltline. */
export function cabinProfile(s) {
  const front = s.length - s.hood // windshield base
  if (s.open) {
    // Top down: only the windshield frame stands above the beltline
    const top = front - s.aRake
    return [[front - 0.08, s.belt], [front, s.belt], [top, s.roof], [top - 0.07, s.roof]]
  }
  return [[s.rear, s.belt], [front, s.belt], [front - s.aRake, s.roof], [s.rear + s.cRake, s.roof]]
}

/** The painted roof panel: a thin slab along the top of the cabin (none on a convertible). */
export function roofProfile(s, thickness = 0.06) {
  if (s.open) return null
  const [, , [frontTop], [rearTop]] = cabinProfile(s)
  // The pillars lean, so the slab's lower edge is a little shorter than the roof line
  const lean = thickness / (s.roof - s.belt)
  return [
    [rearTop - s.cRake * lean, s.roof - thickness], [frontTop + s.aRake * lean, s.roof - thickness],
    [frontTop, s.roof], [rearTop, s.roof],
  ]
}

/**
 * How far the camera sits from the car so all of it fits on screen, for a view of this
 * width/height and vertical field of view (degrees). Narrow phone screens move it back.
 */
export function fitDistance(s, aspect, fovDeg = 35) {
  const radius = (Math.hypot(s.length, s.roof) / 2) * 1.05 // the side-view diagonal (the longest the car ever looks), plus margin
  const vHalf = (fovDeg * Math.PI) / 360
  const hHalf = Math.atan(Math.tan(vHalf) * Math.max(aspect, 0.1))
  return radius / Math.sin(Math.min(vHalf, hHalf))
}

/** Wheel centers along the car: [rear axle x, front axle x], with the tire radius. */
export function wheelLayout(s) {
  return { radius: s.wheel, axles: [s.overhang[0], s.length - s.overhang[1]], track: s.width / 2 - s.wheel * 0.35 }
}

/** The car's paint as a hex color; anything else becomes a neutral silver. */
export function paintColor(color) {
  return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color.trim()) ? color.trim().toLowerCase() : '#9ca3af'
}

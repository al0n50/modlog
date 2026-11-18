import { describe, expect, it } from 'vitest'
import { BODY_STYLES } from '../src/lib/vehicles'
import { bodyProfile, cabinProfile, carShape, fitDistance, paintColor, roofProfile, SHAPE_STYLES, wheelLayout } from '../src/lib/car3d/shapes'

describe('3D car shapes', () => {
  it('has a model for every body style the database allows', () => {
    expect(SHAPE_STYLES.sort()).toEqual(BODY_STYLES.map(([v]) => v).sort())
  })

  it('falls back to the sedan for a missing or unknown style', () => {
    expect(carShape(null).style).toBe('sedan')
    expect(carShape('spaceship').style).toBe('sedan')
    expect(carShape('__proto__').style).toBe('sedan')
    expect(carShape('suv').label).toBe('SUV / Crossover')
  })

  it.each(SHAPE_STYLES)('%s: outlines stay inside the car and the cabin sits on the body', (style) => {
    const s = carShape(style)
    for (const [x, y] of [...bodyProfile(s), ...cabinProfile(s)]) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(s.length)
      expect(y).toBeGreaterThanOrEqual(s.ride)
      expect(y).toBeLessThanOrEqual(s.roof)
    }
    expect(Math.min(...cabinProfile(s).map(([, y]) => y))).toBe(s.belt)
    expect(Math.max(...bodyProfile(s).map(([, y]) => y))).toBe(s.belt)
  })

  it.each(SHAPE_STYLES)('%s: the roof panel sits on top of the cabin, inside its outline', (style) => {
    const s = carShape(style)
    const roof = roofProfile(s)
    if (s.open) return expect(roof).toBeNull()
    const xs = cabinProfile(s).map(([x]) => x)
    for (const [x, y] of roof) {
      expect(y).toBeGreaterThan(s.roof - 0.1)
      expect(y).toBeLessThanOrEqual(s.roof)
      expect(x).toBeGreaterThanOrEqual(Math.min(...xs))
      expect(x).toBeLessThanOrEqual(Math.max(...xs))
    }
  })

  it.each(SHAPE_STYLES)('%s: wheels fit under the body and touch the ground', (style) => {
    const s = carShape(style)
    const w = wheelLayout(s)
    const [rearAxle, frontAxle] = w.axles
    expect(rearAxle).toBeGreaterThan(w.radius)
    expect(frontAxle).toBeLessThan(s.length - w.radius)
    expect(frontAxle - rearAxle).toBeGreaterThan(2) // a real wheelbase
    expect(w.radius).toBeGreaterThan(s.ride) // tires reach below the body to the ground
    expect(w.track).toBeLessThan(s.width / 2)
  })

  it('keeps the body styles recognizable relative to each other', () => {
    const h = (st) => carShape(st).roof
    expect(h('suv')).toBeGreaterThan(h('sedan'))
    expect(h('van')).toBeGreaterThan(h('minivan'))
    expect(h('coupe')).toBeLessThan(h('sedan'))
    expect(carShape('hatchback').length).toBeLessThan(carShape('sedan').length)
    const p = carShape('pickup') // the cab ends well before the back: that's the bed
    expect(cabinProfile(p)[0][0]).toBeGreaterThan(p.length * 0.3)
  })
})

describe('fitDistance', () => {
  it('moves the camera back for bigger cars and narrower screens', () => {
    const wide = 16 / 9
    expect(fitDistance(carShape('van'), wide)).toBeGreaterThan(fitDistance(carShape('hatchback'), wide))
    expect(fitDistance(carShape('sedan'), 0.6)).toBeGreaterThan(fitDistance(carShape('sedan'), wide))
  })
  it.each([0.75, 1.4, 2.5])('keeps the longest car in view, even side-on (screen %s:1)', (aspect) => {
    const s = carShape('van')
    const d = fitDistance(s, aspect, 35)
    const tanV = Math.tan((35 * Math.PI) / 360)
    // Seen from the side the length spans the screen's width, the height its height
    expect(d * tanV * aspect).toBeGreaterThan(s.length / 2)
    expect(d * tanV).toBeGreaterThan(s.roof / 2)
  })
})

describe('paintColor', () => {
  it('uses the car’s hex color', () => {
    expect(paintColor('#C0392B')).toBe('#c0392b')
    expect(paintColor(' #112233 ')).toBe('#112233')
  })
  it('falls back to silver for anything else', () => {
    for (const bad of [null, undefined, '', 'red', '#fff', '#12345g', 42]) expect(paintColor(bad)).toBe('#9ca3af')
  })
})

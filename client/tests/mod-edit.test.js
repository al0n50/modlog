import { describe, expect, it } from 'vitest'
import { editForm, localToday, modUpdate, upsertById } from '../src/lib/modEdit'
import { toWishItem } from '../src/lib/vehicles'

const TODAY = '2026-11-18'
const done = { id: 'm1', status: 'done', name: 'Coilovers', category: 'Suspension', brand: 'BC Racing', price: 1100, install_date: '2026-10-02', notes: 'Set to -1"' }

describe('editForm', () => {
  it('fills the form from a done mod', () => {
    expect(editForm(done)).toEqual({ status: 'done', name: 'Coilovers', category: 'Suspension', brand: 'BC Racing', price: '1100', install_date: '2026-10-02', notes: 'Set to -1"' })
  })
  it('fills the form from a wishlist item, using its estimated price', () => {
    const wish = toWishItem({ id: 'w1', status: 'planned', name: 'Downpipe', category: 'Exhaust', price: 450, notes: 'catted' })
    expect(editForm(wish)).toMatchObject({ status: 'planned', name: 'Downpipe', price: '450', install_date: '', notes: 'catted' })
  })
  it('handles empty fields and an unknown category', () => {
    expect(editForm({ status: 'done', name: 'Tint', category: 'Windows', price: 0 })).toMatchObject({ category: 'Other', brand: '', price: '0', install_date: '', notes: '' })
  })
})

describe('modUpdate', () => {
  const ok = (over = {}) => ({ ...editForm(done), ...over })

  it('maps a valid form to a clean row', () => {
    expect(modUpdate(ok({ name: '  Coilovers V2 ', brand: ' ', price: '$1,250', notes: '' }), TODAY)).toEqual({
      row: { status: 'done', name: 'Coilovers V2', category: 'Suspension', brand: null, price: 1250, install_date: '2026-10-02', notes: null },
    })
  })
  it('clears the install date when a mod goes back to planned', () => {
    expect(modUpdate(ok({ status: 'planned' }), TODAY).row).toMatchObject({ status: 'planned', install_date: null })
  })
  it('allows no price', () => {
    expect(modUpdate(ok({ price: '' }), TODAY).row.price).toBeNull()
  })
  it.each([
    [{ name: '   ' }, /name/],
    [{ name: 'x'.repeat(121) }, /120/],
    [{ brand: 'x'.repeat(81) }, /80/],
    [{ notes: 'x'.repeat(2001) }, /2000/],
    [{ category: 'Windows' }, /category/],
    [{ status: 'sold' }, /done or planned/],
    [{ price: '-5' }, /number/],
    [{ price: 'cheap' }, /number/],
    [{ install_date: '2026-11-19' }, /future/],
    [{ install_date: '1800-01-01' }, /real install date/],
    [{ install_date: 'yesterday' }, /real install date/],
  ])('rejects %j', (over, msg) => {
    const out = modUpdate(ok(over), TODAY)
    expect(out.row).toBeUndefined()
    expect(out.error).toMatch(msg)
  })
})

describe('upsertById', () => {
  it('replaces in place, keeping the order', () => {
    expect(upsertById([{ id: 'a', v: 1 }, { id: 'b' }], { id: 'a', v: 2 })).toEqual([{ id: 'a', v: 2 }, { id: 'b' }])
  })
  it('appends an item that wasn’t there', () => {
    expect(upsertById([{ id: 'a' }], { id: 'b' })).toEqual([{ id: 'a' }, { id: 'b' }])
  })
})

describe('localToday', () => {
  it('uses the local date', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
})

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const storage = { list: vi.fn(async () => ({ data: [], error: null })), getPublicUrl: () => ({ data: { publicUrl: '' } }) }
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: {}, from: () => ({}), storage: { from: () => storage } } }))
const { useGarageStore } = await import('../src/store/useGarageStore')
const { useAuthStore } = await import('../src/store/useAuthStore')
const { default: VehicleDetailPage } = await import('../src/pages/VehicleDetailPage')
const { default: PhotoGallery } = await import('../src/components/photos/PhotoGallery')

const car = {
  id: 'v1', user_id: 'owner', year: 2019, make: 'Subaru', model: 'WRX', is_public: true, cover_image: null, specs: {},
  mods: [{ id: 'm1', name: 'Coilovers', category: 'Suspension', status: 'done' }],
  wishlist_items: [{ id: 'w1', name: 'Downpipe', category: 'Exhaust', priority: 2 }],
}

let root, container
async function render(ui) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => { root.render(ui) })
  return container
}
afterEach(async () => { await act(async () => root.unmount()); container.remove() })

async function pageAs(userId) {
  useAuthStore.setState({ user: { id: userId }, loading: false })
  useGarageStore.setState({ activeVehicle: car, loading: false, error: null, fetchVehicleById: async () => {} })
  return render(
    <MemoryRouter initialEntries={['/vehicle/v1']}>
      <Routes><Route path="/vehicle/:id" element={<VehicleDetailPage />} /></Routes>
    </MemoryRouter>
  )
}
const click = async (el, text) => {
  const b = [...el.querySelectorAll('button')].find(x => x.textContent.trim() === text)
  await act(async () => b.click())
}

describe('build page: visitors get a read-only view', () => {
  it('shows the owner their controls', async () => {
    const el = await pageAs('owner')
    expect(el.textContent).toContain('Edit Photo')
    expect(el.textContent).toContain('🌎 Public')
    expect(el.textContent).toContain('AI Build Advisor')
    await click(el, 'Mods')
    expect(el.textContent).toContain('Add Mod')
  })

  it('hides every owner control from a visitor to a public build', async () => {
    const el = await pageAs('visitor')
    expect(el.textContent).toContain('2019 Subaru WRX')
    expect(el.textContent).not.toContain('Edit Photo')
    expect(el.textContent).not.toContain('🌎 Public')
    expect(el.textContent).not.toContain('AI Build Advisor')
    await click(el, 'Mods')
    expect(el.textContent).toContain('Coilovers')
    expect(el.textContent).not.toContain('Add Mod')
    expect([...el.querySelectorAll('button')].some(b => b.textContent.trim() === '✕')).toBe(false)
    await click(el, 'Wishlist')
    expect(el.textContent).toContain('Downpipe')
    expect(el.textContent).not.toContain('Install')
    expect(el.textContent).not.toContain('Add to Wishlist')
  })

  it('shows a placeholder when the car has no cover photo', async () => {
    const el = await pageAs('owner')
    expect(el.querySelector('img').src).toContain('placehold.co/600x400/1a1a1a/orange?text=Subaru%20WRX')
  })

  it('shows a clear error instead of a blank page when a build fails to load', async () => {
    useAuthStore.setState({ user: { id: 'owner' }, loading: false })
    useGarageStore.setState({ activeVehicle: null, loading: false, error: 'Not found. The link may be broken.', fetchVehicleById: async () => {} })
    const el = await render(
      <MemoryRouter initialEntries={['/vehicle/bad']}>
        <Routes><Route path="/vehicle/:id" element={<VehicleDetailPage />} /></Routes>
      </MemoryRouter>
    )
    expect(el.textContent).toContain('link may be broken')
    expect(el.textContent).toContain('Back to your garage')
  })
})

describe('photo gallery', () => {
  it('reads photos from the owner\'s folder, even for visitors', async () => {
    storage.list.mockClear()
    await render(<PhotoGallery vehicle={car} canEdit={false} />)
    expect(storage.list).toHaveBeenCalledWith('owner/v1', expect.anything())
  })
  it('lets only the owner upload', async () => {
    let el = await render(<PhotoGallery vehicle={car} canEdit />)
    expect(el.textContent).toContain('Upload Photos')
    await act(async () => root.unmount()); container.remove()
    el = await render(<PhotoGallery vehicle={car} canEdit={false} />)
    expect(el.textContent).not.toContain('Upload Photos')
  })
})

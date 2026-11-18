import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { bodyProfile, cabinProfile, carShape, fitDistance, paintColor, roofProfile, wheelLayout } from '../../lib/car3d/shapes'

/**
 * The car in 3D: its body style's low-detail model in its paint color. Drag to spin, pinch or
 * scroll to zoom. Loaded on demand (React.lazy) so three.js only downloads on build pages.
 */

// A side outline extruded across the car's width, centered on the car's middle
function extrude(points, depth, bevel) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4,
  })
  geo.translate(0, 0, -depth / 2)
  return geo
}

function buildCar(bodyStyle, color) {
  const s = carShape(bodyStyle)
  const car = new THREE.Group()
  const paint = new THREE.MeshStandardMaterial({ color: paintColor(color), metalness: 0.3, roughness: 0.45 })
  const glass = new THREE.MeshStandardMaterial({ color: 0x3b4a5e, metalness: 0.4, roughness: 0.12 })
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
  const rim = new THREE.MeshStandardMaterial({ color: 0xbfc5cc, metalness: 0.8, roughness: 0.3 })

  car.add(new THREE.Mesh(extrude(bodyProfile(s), s.width - 0.08, 0.04), paint))
  car.add(new THREE.Mesh(extrude(cabinProfile(s), s.width * (s.open ? 0.9 : 0.84), 0.03), glass))
  const roof = roofProfile(s)
  if (roof) {
    // The roof's top shares a plane with the glass under it: nudge it forward in depth so it doesn't flicker
    const roofPaint = paint.clone()
    roofPaint.polygonOffset = true
    roofPaint.polygonOffsetFactor = -1
    roofPaint.polygonOffsetUnits = -1
    car.add(new THREE.Mesh(extrude(roof, s.width * 0.86, 0.03), roofPaint))
  }

  const w = wheelLayout(s)
  const tire = new THREE.CylinderGeometry(w.radius, w.radius, 0.26, 24)
  const hub = new THREE.CylinderGeometry(w.radius * 0.6, w.radius * 0.6, 0.27, 16)
  for (const x of w.axles) {
    for (const z of [-w.track, w.track]) {
      const wheel = new THREE.Group()
      wheel.add(new THREE.Mesh(tire, rubber), new THREE.Mesh(hub, rim))
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(x, w.radius, z)
      car.add(wheel)
    }
  }
  car.position.x = -s.length / 2 // spin around the middle of the car
  return { car, size: s }
}

export default function CarViewer({ bodyStyle, color, label }) {
  const mount = useRef(null)

  useEffect(() => {
    const el = mount.current
    if (!el) return undefined
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight(0xffffff, 0x303030, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(4, 6, 5)
    scene.add(sun)
    // Rim light from behind, so dark paint still shows its outline against the dark page
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.4)
    rimLight.position.set(-5, 4, -6)
    scene.add(rimLight)

    const { car, size } = buildCar(bodyStyle, color)
    scene.add(car)
    // A turntable, plus a soft shadow on it so the car doesn't float
    const turntable = new THREE.Mesh(new THREE.CircleGeometry(size.length * 0.62, 64), new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 1 }))
    turntable.rotation.x = -Math.PI / 2
    scene.add(turntable)
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.scale.set(size.length * 0.62, size.width * 0.75, 1)
    shadow.position.y = 0.002
    scene.add(shadow)

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    // Front three-quarter view; the distance is set to fit the car once the size is known
    const viewDir = new THREE.Vector3(0.78, 0.42, 0.62).normalize()
    let userMoved = false
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, size.roof * 0.45, 0)
    controls.enablePan = false
    controls.enableDamping = true
    controls.minDistance = size.length * 0.6
    controls.maxDistance = size.length * 4
    controls.maxPolarAngle = Math.PI * 0.49 // stay above the ground
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.2
    const stopSpin = () => {
      controls.autoRotate = false
      userMoved = true
    }
    controls.addEventListener('start', stopSpin)

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el
      if (!w || !h) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      // Refit until the person takes over the camera
      if (!userMoved) camera.position.copy(viewDir).multiplyScalar(fitDistance(size, w / h, camera.fov)).add(controls.target)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(el)

    renderer.setAnimationLoop(() => {
      controls.update()
      renderer.render(scene, camera)
    })

    return () => {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      controls.removeEventListener('start', stopSpin)
      controls.dispose()
      scene.traverse((o) => {
        o.geometry?.dispose()
        if (o.material) [].concat(o.material).forEach((m) => m.dispose())
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [bodyStyle, color])

  return (
    <div
      ref={mount}
      className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      role="img"
      aria-label={`3D model of ${label}. Drag to spin, pinch or scroll to zoom.`}
    />
  )
}

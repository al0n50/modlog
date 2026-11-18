/** True when this browser can draw 3D (WebGL). Checked before the 3D code is even downloaded. */
export function hasWebGL() {
  try {
    if (typeof document === 'undefined' || typeof window === 'undefined' || !window.WebGLRenderingContext) return false
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

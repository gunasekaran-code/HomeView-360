/**
 * Field-of-view maths for wide "zoom out" views.
 *
 * A plain perspective camera cannot show 180° (the image stretches to
 * infinity), so the viewer runs Photo Sphere Viewer in fisheye mode: the
 * camera sits FISHEYE/2 sphere radii behind the centre. A camera ray at angle
 * α from the view axis then lands on the panorama at
 *     θ = α + asin(d · sin α),   d = FISHEYE / 2
 * from the sphere centre, which is what the visitor perceives as the angle.
 *
 * The tour config speaks in those perceived, horizontal angles; these helpers
 * turn them into PSV's camera settings (vertical camera FOV) for a given
 * screen aspect ratio.
 */

/** PSV `fisheye` option: 1 → camera at half a radius behind the centre. */
export const FISHEYE = 1;
const D = FISHEYE / 2;
/** PSV accepts up to 179°; stay clear of the degenerate edge. */
const MAX_CAMERA_FOV = 170;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Camera half-angle α (radians) that reaches scene half-angle θ (radians). */
function cameraHalfAngle(theta: number) {
  let lo = 0;
  let hi = theta;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (mid + Math.asin(D * Math.sin(mid)) < theta) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Perceived horizontal angle (degrees) → PSV vertical camera FOV (degrees). */
export function sceneHFovToCameraVFov(hfov: number, aspect: number) {
  const alpha = cameraHalfAngle(rad(Math.min(Math.max(hfov, 1), 180) / 2));
  const vfov = deg(2 * Math.atan(Math.tan(alpha) / Math.max(aspect, 0.1)));
  return Math.min(vfov, MAX_CAMERA_FOV);
}

export interface FovSettings {
  /** PSV minFov / maxFov (vertical camera FOV, degrees). */
  minFov: number;
  maxFov: number;
  /** PSV zoom level (0–100) that shows the initial angle. */
  initialZoom: number;
}

export function fovSettings(view: { minHfov: number; initialHfov: number; maxHfov: number }, aspect: number): FovSettings {
  const minFov = sceneHFovToCameraVFov(view.minHfov, aspect);
  const maxFov = sceneHFovToCameraVFov(view.maxHfov, aspect);
  const initial = sceneHFovToCameraVFov(view.initialHfov, aspect);
  // PSV maps zoom level linearly: fov = maxFov + level/100 · (minFov − maxFov)
  const initialZoom = maxFov === minFov ? 50 : ((maxFov - initial) / (maxFov - minFov)) * 100;
  return { minFov, maxFov, initialZoom: Math.min(100, Math.max(0, initialZoom)) };
}

// Haptic feedback for mobile devices
const canVibrate = () => 'vibrate' in navigator;

export function hapticShoot() {
  if (canVibrate()) navigator.vibrate(30);
}

export function hapticHit() {
  if (canVibrate()) navigator.vibrate([40, 30, 40]);
}

export function hapticKill() {
  if (canVibrate()) navigator.vibrate([60, 40, 80]);
}

export function hapticDamage() {
  if (canVibrate()) navigator.vibrate([80, 30, 80, 30, 60]);
}

export function hapticExplosion() {
  if (canVibrate()) navigator.vibrate([100, 50, 100]);
}

export function hapticInteract() {
  if (canVibrate()) navigator.vibrate(15);
}

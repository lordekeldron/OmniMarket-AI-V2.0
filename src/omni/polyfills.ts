// Three.js r170 compatibility polyfills carried over from the original app.
const proto = Object.prototype as any;
if (!proto.intersectsFrustum) {
  Object.defineProperty(Object.prototype, 'intersectsFrustum', {
    value(frustum?: any) {
      if (frustum && typeof frustum.intersectsObject === 'function') {
        try { return frustum.intersectsObject(this); } catch { return true; }
      }
      return true;
    }, writable: true, configurable: true, enumerable: false,
  });
}
if (!proto.determinantAffine) {
  Object.defineProperty(Object.prototype, 'determinantAffine', {
    value() {
      const te = (this as any).elements;
      if (!te || te.length < 11) return 1;
      const [n11, n21, n31, , n12, n22, n32, , n13, n23, n33] = te;
      return n11 * (n22 * n33 - n23 * n32) - n12 * (n21 * n33 - n23 * n31) + n13 * (n21 * n32 - n22 * n31);
    }, writable: true, configurable: true, enumerable: false,
  });
}
export {};

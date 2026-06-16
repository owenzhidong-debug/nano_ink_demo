(() => {
  const originalDrawFramedImage = window.drawFramedImage;
  if (typeof originalDrawFramedImage !== "function") return;

  window.drawFramedImage = function patchedDrawFramedImage(image, x, y, width, height) {
    const isLegacyFbiAvatarSlot = x === 290 && y === 560 && width === 118 && height === 118;
    if (isLegacyFbiAvatarSlot) {
      return originalDrawFramedImage.call(this, image, 139, 568, 226, 178);
    }
    return originalDrawFramedImage.call(this, image, x, y, width, height);
  };

  if (typeof window.renderCanvas === "function") window.renderCanvas();
})();

(() => {
  const input = document.getElementById("imageInput");
  const shell = document.querySelector(".app-shell");
  const editorView = document.getElementById("editorView");
  const templateView = document.getElementById("templateView");
  const backButton = document.getElementById("backButton");
  const resetButton = document.getElementById("resetButton");
  const pageTitle = document.getElementById("pageTitle");
  if (!input || !shell || window.__badgeCropAddonLoaded) return;
  window.__badgeCropAddonLoaded = true;

  const style = document.createElement("style");
  style.textContent = `
    .badge-crop-view {
      position: absolute;
      inset: 64px 0 0;
      z-index: 20;
      display: none;
      grid-template-rows: 1fr 162px;
      background: #111;
    }
    .badge-crop-view.active { display: grid; }
    .badge-crop-stage {
      min-height: 0;
      display: grid;
      place-items: center;
      padding: 12px 20px;
      overflow: hidden;
    }
    #badgeCropCanvas {
      display: block;
      width: 320px;
      height: 560px;
      max-width: 100%;
      max-height: 100%;
      border-radius: 12px;
      background: #171717;
      touch-action: none;
    }
    .badge-crop-panel {
      padding: 16px 20px 18px;
      border-top: 1px solid #2a2a2a;
      background: #fff;
    }
    .badge-crop-rotate {
      width: 100%;
      height: 40px;
      margin: -2px 0 12px;
      border: 1px solid #dfe4e8;
      border-radius: 20px;
      background: #fff;
      color: #111;
      font-size: 13px;
      font-weight: 800;
    }
    .badge-crop-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .badge-crop-actions button {
      height: 44px;
      border-radius: 22px;
      font-size: 13px;
      font-weight: 800;
    }
  `;
  document.head.appendChild(style);

  const cropView = document.createElement("section");
  cropView.className = "badge-crop-view";
  cropView.innerHTML = `
    <div class="badge-crop-stage">
      <canvas id="badgeCropCanvas" width="320" height="560"></canvas>
    </div>
    <section class="badge-crop-panel">
      <div class="control">
        <div class="control-head">
          <span>缩放</span>
          <output id="badgeCropZoomOutput">100%</output>
        </div>
        <input id="badgeCropZoom" type="range" min="100" max="400" step="1" value="100" />
      </div>
      <button class="badge-crop-rotate" id="badgeCropRotateButton">逆时针旋转 90°</button>
      <div class="badge-crop-actions">
        <button class="secondary" id="badgeCropCancelButton">取消</button>
        <button class="primary" id="badgeCropNextButton">下一步</button>
      </div>
    </section>
  `;
  shell.appendChild(cropView);

  const cropCanvas = document.getElementById("badgeCropCanvas");
  const cropCtx = cropCanvas.getContext("2d");
  const zoom = document.getElementById("badgeCropZoom");
  const zoomOutput = document.getElementById("badgeCropZoomOutput");
  const rotateButton = document.getElementById("badgeCropRotateButton");
  const cancelButton = document.getElementById("badgeCropCancelButton");
  const nextButton = document.getElementById("badgeCropNextButton");
  let crop = null;
  let dragStart = null;

  function cropSpec(target) {
    if (target === "shieldPhoto") return { key: "shieldPhoto", label: "裁剪照片", width: 196, height: 253 };
    if (target === "logo") return { key: "badgeLogo", label: "裁剪公司图标", width: 240, height: 240 };
    return { key: "badgeAvatar", label: "裁剪头像", width: 226, height: 178 };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function startCrop(image, target) {
    const spec = cropSpec(target);
    const ratio = spec.width / spec.height;
    let frameWidth = 280;
    let frameHeight = frameWidth / ratio;
    if (frameHeight > 410) {
      frameHeight = 410;
      frameWidth = frameHeight * ratio;
    }
    const frame = {
      x: Math.round((cropCanvas.width - frameWidth) / 2),
      y: Math.round((cropCanvas.height - frameHeight) / 2),
      width: Math.round(frameWidth),
      height: Math.round(frameHeight),
    };
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const minScale = Math.max(frame.width / imageWidth, frame.height / imageHeight);
    crop = {
      image,
      target,
      outputKey: spec.key,
      outputWidth: spec.width,
      outputHeight: spec.height,
      frame,
      imageWidth,
      imageHeight,
      minScale,
      maxScale: minScale * 4,
      scale: minScale,
      x: frame.x + (frame.width - imageWidth * minScale) / 2,
      y: frame.y + (frame.height - imageHeight * minScale) / 2,
    };
    constrain();
    zoom.value = "100";
    zoomOutput.textContent = "100%";
    templateView?.classList.add("hidden");
    editorView?.classList.add("hidden");
    cropView.classList.add("active");
    backButton?.classList.remove("hidden");
    resetButton?.classList.add("hidden");
    if (pageTitle) pageTitle.textContent = spec.label;
    render();
  }

  function closeCrop() {
    crop = null;
    cropView.classList.remove("active");
    editorView?.classList.remove("hidden");
    resetButton?.classList.remove("hidden");
    if (pageTitle && typeof currentTemplate === "function") pageTitle.textContent = currentTemplate().name;
    if (typeof renderCanvas === "function") renderCanvas();
  }

  function constrain() {
    if (!crop) return;
    crop.scale = clamp(crop.scale, crop.minScale, crop.maxScale);
    const drawnWidth = crop.imageWidth * crop.scale;
    const drawnHeight = crop.imageHeight * crop.scale;
    crop.x = drawnWidth <= crop.frame.width
      ? crop.frame.x + (crop.frame.width - drawnWidth) / 2
      : clamp(crop.x, crop.frame.x + crop.frame.width - drawnWidth, crop.frame.x);
    crop.y = drawnHeight <= crop.frame.height
      ? crop.frame.y + (crop.frame.height - drawnHeight) / 2
      : clamp(crop.y, crop.frame.y + crop.frame.height - drawnHeight, crop.frame.y);
  }

  function setScale(nextScale) {
    if (!crop) return;
    const centerX = crop.frame.x + crop.frame.width / 2;
    const centerY = crop.frame.y + crop.frame.height / 2;
    const imageCenterX = (centerX - crop.x) / crop.scale;
    const imageCenterY = (centerY - crop.y) / crop.scale;
    crop.scale = clamp(nextScale, crop.minScale, crop.maxScale);
    crop.x = centerX - imageCenterX * crop.scale;
    crop.y = centerY - imageCenterY * crop.scale;
    constrain();
    render();
  }

  function rotateCounterclockwise() {
    if (!crop) return;
    const activeCrop = crop;
    const rotatedCanvas = document.createElement("canvas");
    rotatedCanvas.width = activeCrop.imageHeight;
    rotatedCanvas.height = activeCrop.imageWidth;
    const rotatedCtx = rotatedCanvas.getContext("2d");
    rotatedCtx.translate(0, rotatedCanvas.height);
    rotatedCtx.rotate(-Math.PI / 2);
    rotatedCtx.drawImage(activeCrop.image, 0, 0, activeCrop.imageWidth, activeCrop.imageHeight);
    const rotated = new Image();
    rotated.onload = () => {
      startCrop(rotated, activeCrop.target);
      if (typeof showToast === "function") showToast("已逆时针旋转 90°");
    };
    rotated.src = rotatedCanvas.toDataURL("image/png");
  }

  function render() {
    if (!crop) return;
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.fillStyle = "#171717";
    cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.drawImage(crop.image, crop.x, crop.y, crop.imageWidth * crop.scale, crop.imageHeight * crop.scale);
    cropCtx.fillStyle = "rgba(0,0,0,.58)";
    cropCtx.beginPath();
    cropCtx.rect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.rect(crop.frame.x, crop.frame.y, crop.frame.width, crop.frame.height);
    cropCtx.fill("evenodd");
    cropCtx.strokeStyle = "#fff";
    cropCtx.lineWidth = 2;
    cropCtx.strokeRect(crop.frame.x, crop.frame.y, crop.frame.width, crop.frame.height);
    cropCtx.strokeStyle = "rgba(255,255,255,.38)";
    cropCtx.lineWidth = 1;
    cropCtx.beginPath();
    cropCtx.moveTo(crop.frame.x + crop.frame.width / 3, crop.frame.y);
    cropCtx.lineTo(crop.frame.x + crop.frame.width / 3, crop.frame.y + crop.frame.height);
    cropCtx.moveTo(crop.frame.x + crop.frame.width * 2 / 3, crop.frame.y);
    cropCtx.lineTo(crop.frame.x + crop.frame.width * 2 / 3, crop.frame.y + crop.frame.height);
    cropCtx.moveTo(crop.frame.x, crop.frame.y + crop.frame.height / 3);
    cropCtx.lineTo(crop.frame.x + crop.frame.width, crop.frame.y + crop.frame.height / 3);
    cropCtx.moveTo(crop.frame.x, crop.frame.y + crop.frame.height * 2 / 3);
    cropCtx.lineTo(crop.frame.x + crop.frame.width, crop.frame.y + crop.frame.height * 2 / 3);
    cropCtx.stroke();
  }

  function finishCrop() {
    if (!crop) return;
    const output = document.createElement("canvas");
    output.width = crop.outputWidth;
    output.height = crop.outputHeight;
    const outputCtx = output.getContext("2d");
    outputCtx.fillStyle = "#fff";
    outputCtx.fillRect(0, 0, output.width, output.height);
    const scaleToOutput = crop.outputWidth / crop.frame.width;
    outputCtx.drawImage(
      crop.image,
      (crop.x - crop.frame.x) * scaleToOutput,
      (crop.y - crop.frame.y) * scaleToOutput,
      crop.imageWidth * crop.scale * scaleToOutput,
      crop.imageHeight * crop.scale * scaleToOutput
    );
    const cropped = new Image();
    const activeCrop = crop;
    cropped.onload = () => {
      state[activeCrop.outputKey] = cropped;
      state.uploadTarget = activeCrop.target;
      closeCrop();
      if (typeof renderPanel === "function") renderPanel();
      if (typeof showToast === "function") showToast("裁剪已应用");
    };
    cropped.src = output.toDataURL("image/png");
  }

  function canvasPoint(event) {
    const rect = cropCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * cropCanvas.width / rect.width,
      y: (event.clientY - rect.top) * cropCanvas.height / rect.height,
    };
  }

  input.addEventListener("change", (event) => {
    if (typeof state === "undefined" || state.templateId !== "work-badge") return;
    const file = input.files?.[0];
    if (!file) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const image = new Image();
    image.onload = () => {
      const target = state.badgeType === "shield" ? "shieldPhoto" : (state.uploadTarget === "logo" ? "logo" : "avatar");
      startCrop(image, target);
      input.value = "";
    };
    image.src = URL.createObjectURL(file);
  }, true);

  zoom.addEventListener("input", () => {
    const percent = Number(zoom.value);
    zoomOutput.textContent = `${percent}%`;
    if (crop) setScale(crop.minScale * (percent / 100));
  });
  rotateButton.addEventListener("click", rotateCounterclockwise);
  cancelButton.addEventListener("click", closeCrop);
  nextButton.addEventListener("click", finishCrop);
  backButton?.addEventListener("click", (event) => {
    if (!crop) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeCrop();
  }, true);

  cropCanvas.addEventListener("pointerdown", (event) => {
    if (!crop) return;
    const point = canvasPoint(event);
    dragStart = { pointerX: point.x, pointerY: point.y, x: crop.x, y: crop.y };
    cropCanvas.setPointerCapture(event.pointerId);
  });
  cropCanvas.addEventListener("pointermove", (event) => {
    if (!dragStart || !crop) return;
    const point = canvasPoint(event);
    crop.x = dragStart.x + point.x - dragStart.pointerX;
    crop.y = dragStart.y + point.y - dragStart.pointerY;
    constrain();
    render();
  });
  cropCanvas.addEventListener("pointerup", () => { dragStart = null; });
  cropCanvas.addEventListener("pointercancel", () => { dragStart = null; });
})();

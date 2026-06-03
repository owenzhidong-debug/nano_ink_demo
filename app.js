const canvas = document.getElementById("previewCanvas");
const ctx = canvas.getContext("2d");
const input = document.getElementById("imageInput");
const panel = document.getElementById("panel");
const toast = document.getElementById("toast");
const templateView = document.getElementById("templateView");
const editorView = document.getElementById("editorView");
const templateGrid = document.getElementById("templateGrid");
const toolTabs = document.getElementById("toolTabs");
const backButton = document.getElementById("backButton");
const resetButton = document.getElementById("resetButton");
const pageTitle = document.getElementById("pageTitle");

const templates = [
  {
    id: "watermark-cover",
    name: "透明书封",
    desc: "上传图片，抠除背景，导出透明书封 PNG",
    chip: "PNG",
    art: "art-watermark",
    tabs: ["移动", "抠除", "参数"],
  },
  {
    id: "work-badge",
    name: "工卡模板",
    desc: "头像、姓名、职位和二维码名片",
    chip: "办公",
    art: "art-badge",
    tabs: ["资料", "版式", "图片"],
  },
  {
    id: "qr-card",
    name: "二维码卡片",
    desc: "微信、链接、Wi-Fi 或活动入口",
    chip: "扫码",
    art: "art-qr",
    tabs: ["内容", "版式", "检查"],
  },
  {
    id: "photo-ink",
    name: "照片墨水屏化",
    desc: "照片转黑白网点、线稿或高对比图",
    chip: "图片",
    art: "art-photo",
    tabs: ["效果", "裁切", "调节"],
  },
  {
    id: "note-card",
    name: "便签看板",
    desc: "待办、勿扰、会议中和桌面提醒",
    chip: "常驻",
    art: "art-note",
    tabs: ["文字", "样式", "排版"],
  },
  {
    id: "asset-label",
    name: "设备标签",
    desc: "资产编号、负责人、位置和二维码",
    chip: "批量",
    art: "art-device",
    tabs: ["资料", "编号", "版式"],
  },
];

const state = {
  view: "templates",
  templateId: "watermark-cover",
  panel: "效果",
  image: null,
  processed: null,
  fileName: "",
  imageWidth: 0,
  imageHeight: 0,
  output: "x4",
  outputWidth: 480,
  outputHeight: 800,
  tool: "move",
  x: 0,
  y: 0,
  scale: 1,
  zoom: 100,
  tolerance: 0,
  threshold: 128,
  feather: 0,
  brightness: 0,
  contrast: 0,
  gamma: 1,
  sharpen: 0,
  dither: 50,
  invert: false,
  keyColor: null,
  cropPreset: "fit",
  alpha: 92,
  name: "林可",
  role: "产品经理",
  company: "纸上科技",
  title: "今天只处理三件事",
  subtitle: "14:30 评审会",
  qrText: "zi.local/device",
};

const readingLines = [
  "第一章 红海早过了",
  "洋面上开驶着，船在印度",
  "去大部分地方，太阳依然",
  "给海风带着配红的颜色。",
  "又是一天开始。这是七月下",
  "旬，合中国旧历的三伏。",
  "一年最热的时候，在中国热得",
];

function currentTemplate() {
  return templates.find((item) => item.id === state.templateId);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function renderTemplateGrid() {
  templateGrid.innerHTML = templates
    .map(
      (template) => `
        <button class="template-card" data-template="${template.id}">
          <span class="template-art ${template.art}" aria-hidden="true"></span>
          <span class="template-copy">
            <strong>${template.name}</strong>
            <span>${template.desc}</span>
          </span>
          <span class="template-chip">${template.chip}</span>
        </button>
      `,
    )
    .join("");

  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => openEditor(button.dataset.template));
  });
}

function openEditor(templateId) {
  state.templateId = templateId;
  state.panel = currentTemplate().tabs[0];
  templateView.classList.add("hidden");
  editorView.classList.remove("hidden");
  backButton.classList.remove("hidden");
  resetButton.classList.remove("hidden");
  pageTitle.textContent = currentTemplate().name;
  renderTabs();
  renderPanel();
  renderCanvas();
}

function backToTemplates() {
  templateView.classList.remove("hidden");
  editorView.classList.add("hidden");
  backButton.classList.add("hidden");
  resetButton.classList.add("hidden");
  pageTitle.textContent = "图片模板";
}

function renderTabs() {
  const tabs = currentTemplate().tabs;
  toolTabs.style.setProperty("--tab-count", tabs.length);
  toolTabs.innerHTML = tabs
    .map(
      (tab) => `
        <button class="tool-tab ${tab === state.panel ? "active" : ""}" data-panel="${tab}">
          ${tab}
        </button>
      `,
    )
    .join("");

  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.panel = button.dataset.panel;
      renderTabs();
      renderPanel();
    });
  });
}

function setCanvasSize(width, height) {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function drawCheckerboard() {
  const cell = 12;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += cell) {
    for (let x = 0; x < canvas.width; x += cell) {
      ctx.fillStyle = (x / cell + y / cell) % 2 === 0 ? "#e8edf4" : "#ffffff";
      ctx.fillRect(x, y, cell, cell);
    }
  }
}

function drawReadingTextBackground() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#171717";
  ctx.textBaseline = "top";
  ctx.font = "700 24px Inter, sans-serif";
  ctx.fillText("《透明书封预览》", 42, 42);

  const lines = [
    "第一章 红海早过了",
    "洋面上开驶着，船在印度洋面上开驶着，",
    "去大部分地方，太阳依然给海风带着配红的颜色。",
    "又是一天开始。这是七月下旬，合中国旧历的三伏。",
    "一年最热的时候，在中国热得似乎已经没有了边际。",
    "他靠在窗边，看着纸面上的字一行一行地停下来。",
    "那些细小的墨点在白色背景上保持着清楚的轮廓。",
    "封面的图像如果太重，就会压住这些本来要读的文字。",
    "所以它应该像一层轻薄的影子，留下气氛，却不打扰阅读。",
    "这正是透明书封需要被反复调整的位置和强度。",
    "当背景被抠除后，文字会从透明区域直接透出来。",
    "如果主体太黑，可以降低对比度，或者提高黑白阈值。",
    "如果细节太碎，可以降低抖动强度，让画面更安静。",
    "最终导出的 PNG 只保留书封图层，阅读文字不会被导出。",
  ];

  ctx.font = "500 21px Inter, sans-serif";
  lines.forEach((line, index) => {
    ctx.fillText(line, 42, 92 + index * 43);
  });

  ctx.fillStyle = "#111";
  ctx.fillRect(42, canvas.height - 58, 132, 5);
  ctx.font = "400 17px Inter, sans-serif";
  ctx.fillText("20:06", 42, canvas.height - 42);
  ctx.fillText("42%", canvas.width - 78, canvas.height - 42);
}

function drawEmptyUploadState() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.fillRect(76, canvas.height / 2 - 84, canvas.width - 152, 136);
  ctx.strokeStyle = "#c8d2df";
  ctx.lineWidth = 2;
  ctx.strokeRect(76, canvas.height / 2 - 84, canvas.width - 152, 136);
  ctx.fillStyle = "#96a4b7";
  ctx.font = "700 22px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("拖拽或点击上传图片", canvas.width / 2, canvas.height / 2 + 18);
  ctx.strokeStyle = "#b8c3d1";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, canvas.height / 2 - 62);
  ctx.lineTo(canvas.width / 2, canvas.height / 2 - 108);
  ctx.lineTo(canvas.width / 2 - 18, canvas.height / 2 - 88);
  ctx.moveTo(canvas.width / 2, canvas.height / 2 - 108);
  ctx.lineTo(canvas.width / 2 + 18, canvas.height / 2 - 88);
  ctx.stroke();
  ctx.strokeRect(canvas.width / 2 - 30, canvas.height / 2 - 60, 60, 36);
  ctx.textAlign = "start";
}

function getDrawRect() {
  if (!state.image) return null;
  const width = state.imageWidth * state.scale;
  const height = state.imageHeight * state.scale;
  return { x: state.x, y: state.y, width, height };
}

function constrainImagePosition() {
  const rect = getDrawRect();
  if (!rect) return;
  const minX = Math.min(0, state.outputWidth - rect.width);
  const maxX = Math.max(0, state.outputWidth - rect.width);
  const minY = Math.min(0, state.outputHeight - rect.height);
  const maxY = Math.max(0, state.outputHeight - rect.height);
  state.x = Math.round(clamp(state.x, minX, maxX));
  state.y = Math.round(clamp(state.y, minY, maxY));
}

function drawSelectionHandles(rect) {
  if (!rect || state.tool !== "move") return;
  ctx.save();
  ctx.strokeStyle = "#304056";
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  const points = [
    [rect.x, rect.y],
    [rect.x + rect.width / 2, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x, rect.y + rect.height / 2],
    [rect.x + rect.width, rect.y + rect.height / 2],
    [rect.x, rect.y + rect.height],
    [rect.x + rect.width / 2, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height],
  ];
  ctx.fillStyle = "#304056";
  points.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawTransparentCoverPreview() {
  setCanvasSize(state.outputWidth, state.outputHeight);
  drawReadingTextBackground();
  if (!state.image) {
    drawEmptyUploadState();
    return;
  }
  if (state.processed) ctx.drawImage(state.processed, 0, 0);
  drawSelectionHandles(getDrawRect());
}

function drawBadgePreview() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.font = "700 28px Inter, sans-serif";
  ctx.fillText(state.company, 44, 58);
  ctx.beginPath();
  ctx.arc(112, 206, 58, 0, Math.PI * 2);
  ctx.fillStyle = "#d7dce0";
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.stroke();
  if (state.image) {
    ctx.save();
    ctx.clip();
    ctx.drawImage(state.image, 54, 148, 116, 116);
    ctx.restore();
  }
  ctx.fillStyle = "#111";
  ctx.font = "800 56px Inter, sans-serif";
  ctx.fillText(state.name, 196, 173);
  ctx.font = "400 28px Inter, sans-serif";
  ctx.fillText(state.role, 198, 223);
  drawMockQr(320, 546, 104);
  ctx.font = "700 26px Inter, sans-serif";
  ctx.fillText("扫码联系我", 44, 585);
}

function drawQrCardPreview() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.font = "800 44px Inter, sans-serif";
  ctx.fillText("扫码查看", 44, 84);
  ctx.font = "400 24px Inter, sans-serif";
  ctx.fillText(state.qrText, 44, 133);
  drawMockQr(116, 252, 248);
}

function drawPhotoInkPreview() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  const img = state.processed || state.image;
  if (img) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(img, 42, 105, 396, 520);
    ctx.restore();
  } else {
    ctx.fillStyle = "#111";
    ctx.fillRect(72, 140, 336, 368);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(158, 230, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d9d9d9";
    ctx.fillRect(112, 365, 248, 72);
  }
  ctx.fillStyle = "#111";
  ctx.font = "700 24px Inter, sans-serif";
  ctx.fillText("黑白高对比预览", 44, 690);
}

function drawNotePreview() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.font = "800 48px Inter, sans-serif";
  wrapText(state.title, 44, 96, 390, 58);
  ctx.font = "400 30px Inter, sans-serif";
  wrapText(state.subtitle, 44, 326, 390, 42);
  ctx.fillRect(44, 610, 150, 8);
  ctx.font = "700 26px Inter, sans-serif";
  ctx.fillText("勿扰", 44, 642);
}

function drawAssetPreview() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.font = "800 44px Inter, sans-serif";
  ctx.fillText("BOOX-042", 44, 84);
  ctx.font = "400 26px Inter, sans-serif";
  ctx.fillText(`负责人 ${state.name}`, 44, 142);
  ctx.fillText("会议室 A3", 44, 184);
  drawMockQr(260, 500, 128);
  ctx.strokeRect(44, 475, 380, 170);
  ctx.font = "700 28px Inter, sans-serif";
  ctx.fillText("资产标签", 66, 548);
}

function drawMockQr(x, y, size) {
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, size, size);
  ctx.fillStyle = "#111";
  const cell = size / 9;
  const dots = [
    [1, 1], [2, 1], [1, 2], [6, 1], [7, 1], [7, 2], [1, 6], [2, 7],
    [4, 4], [5, 3], [6, 5], [3, 6], [5, 7], [7, 7], [3, 2], [2, 4],
  ];
  dots.forEach(([cx, cy]) => ctx.fillRect(x + cx * cell, y + cy * cell, cell, cell));
  ctx.restore();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  let line = "";
  const chars = Array.from(text);
  chars.forEach((char, index) => {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = char;
      y += lineHeight;
    } else {
      line = testLine;
    }
    if (index === chars.length - 1) ctx.fillText(line, x, y);
  });
}

function renderCanvas() {
  if (state.templateId === "watermark-cover") {
    drawTransparentCoverPreview();
    return;
  }
  setCanvasSize(480, 800);
  if (state.templateId === "work-badge") drawBadgePreview();
  if (state.templateId === "qr-card") drawQrCardPreview();
  if (state.templateId === "photo-ink") drawPhotoInkPreview();
  if (state.templateId === "note-card") drawNotePreview();
  if (state.templateId === "asset-label") drawAssetPreview();
}

function imageToTransparent(source) {
  const work = document.createElement("canvas");
  work.width = state.templateId === "watermark-cover" ? state.outputWidth : source.naturalWidth || source.width;
  work.height = state.templateId === "watermark-cover" ? state.outputHeight : source.naturalHeight || source.height;
  const wctx = work.getContext("2d", { willReadFrequently: true });
  wctx.clearRect(0, 0, work.width, work.height);
  if (state.templateId === "watermark-cover") {
    const rect = getDrawRect();
    if (rect) wctx.drawImage(source, rect.x, rect.y, rect.width, rect.height);
  } else {
    wctx.drawImage(source, 0, 0);
  }

  let imgData = wctx.getImageData(0, 0, work.width, work.height);
  if (state.templateId === "watermark-cover" && state.sharpen > 0) {
    imgData = sharpenImageData(imgData, work.width, work.height, state.sharpen / 100);
  }
  const data = imgData.data;
  const contrast = (259 * (state.contrast + 255)) / (255 * (259 - state.contrast));
  const bayer = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5,
  ];
  const gamma = Math.max(0.1, state.gamma);

  for (let i = 0; i < data.length; i += 4) {
    const px = (i / 4) % work.width;
    const py = Math.floor(i / 4 / work.width);
    if (data[i + 3] === 0) continue;

    if (state.templateId === "watermark-cover" && state.keyColor) {
      const distance = Math.hypot(data[i] - state.keyColor.r, data[i + 1] - state.keyColor.g, data[i + 2] - state.keyColor.b);
      if (distance <= state.tolerance) {
        data[i + 3] = 0;
        continue;
      }
    }

    let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray = contrast * (gray - 128) + 128 + state.brightness;
    gray = clamp(gray, 0, 255);
    if (state.templateId !== "watermark-cover") {
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      continue;
    }

    gray = 255 * Math.pow(gray / 255, 1 / gamma);
    const ditherOffset = (bayer[(px % 4) + (py % 4) * 4] - 7.5) * state.dither / 6;
    const black = gray + ditherOffset < state.threshold;
    const outputBlack = state.invert ? !black : black;
    data[i] = outputBlack ? 17 : 255;
    data[i + 1] = outputBlack ? 17 : 255;
    data[i + 2] = outputBlack ? 17 : 255;
    data[i + 3] = 255;
  }

  wctx.putImageData(imgData, 0, 0);
  const result = new Image();
  result.onload = () => {
    state.processed = result;
    renderCanvas();
  };
  result.src = work.toDataURL("image/png");
}

function sharpenImageData(imgData, width, height, amount) {
  const source = new Uint8ClampedArray(imgData.data);
  const data = imgData.data;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = (y * width + x) * 4;
      if (source[i + 3] === 0) continue;
      for (let c = 0; c < 3; c += 1) {
        const center = source[i + c] * (1 + amount * 4);
        const neighbors = source[i - 4 + c] + source[i + 4 + c] + source[i - width * 4 + c] + source[i + width * 4 + c];
        data[i + c] = clamp(center - neighbors * amount, 0, 255);
      }
    }
  }
  return imgData;
}

function setOutputSize(output) {
  state.output = output;
  if (output === "x3") {
    state.outputWidth = 528;
    state.outputHeight = 792;
  } else {
    state.outputWidth = 480;
    state.outputHeight = 800;
  }
  applyCropPreset(state.cropPreset);
}

function applyCropPreset(preset) {
  state.cropPreset = preset;
  if (!state.image) {
    renderCanvas();
    return;
  }
  const fitScale = Math.min(state.outputWidth / state.imageWidth, state.outputHeight / state.imageHeight);
  const fillScale = Math.max(state.outputWidth / state.imageWidth, state.outputHeight / state.imageHeight);
  if (preset === "fit") state.scale = fitScale;
  if (preset === "fill") state.scale = fillScale;
  if (preset === "original") state.scale = 1;
  state.zoom = Math.round(state.scale * 100);
  const rect = getDrawRect();
  if (rect) {
    state.x = Math.round((state.outputWidth - rect.width) / 2);
    state.y = Math.round((state.outputHeight - rect.height) / 2);
  }
  constrainImagePosition();
  imageToTransparent(state.image);
}

function sampleMagicColor(outputX, outputY) {
  if (!state.image) return;
  const rect = getDrawRect();
  if (!rect) return;
  const sourceX = Math.floor((outputX - rect.x) / state.scale);
  const sourceY = Math.floor((outputY - rect.y) / state.scale);
  if (sourceX < 0 || sourceY < 0 || sourceX >= state.imageWidth || sourceY >= state.imageHeight) return;
  const sample = document.createElement("canvas");
  sample.width = state.imageWidth;
  sample.height = state.imageHeight;
  const sctx = sample.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(state.image, 0, 0);
  const pixel = sctx.getImageData(sourceX, sourceY, 1, 1).data;
  state.keyColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
  state.tolerance = Math.max(state.tolerance, 24);
  imageToTransparent(state.image);
  renderPanel();
  showToast("已取样背景色，可调整容差");
}

function exportTransparentPng() {
  if (!state.processed) {
    showToast("请先导入图片");
    return;
  }
  const link = document.createElement("a");
  link.download = `transparent-cover-${state.outputWidth}x${state.outputHeight}.png`;
  link.href = state.processed.src;
  link.click();
  showToast("已导出透明书封 PNG");
}

function bindRange(id, key, output = (v) => v) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", () => {
    state[key] = Number(el.value);
    const out = document.querySelector(`[data-output="${id}"]`);
    if (out) out.textContent = output(state[key]);
    if (key === "zoom") state.scale = state.zoom / 100;
    if (key === "zoom" && state.templateId === "watermark-cover") constrainImagePosition();
    if (["zoom", "scale", "x", "y", "tolerance", "threshold", "brightness", "contrast", "gamma", "sharpen", "dither"].includes(key) && state.image) {
      imageToTransparent(state.image);
    }
    renderCanvas();
  });
}

function bindText(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", () => {
    state[key] = el.value;
    renderCanvas();
  });
}

function control(label, id, key, min, max, step, format = (v) => String(v)) {
  return `
    <div class="control">
      <div class="control-head">
        <span>${label}</span>
        <output data-output="${id}">${format(state[key])}</output>
      </div>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${state[key]}" />
    </div>
  `;
}

function renderWatermarkPanel() {
  if (state.panel === "移动") {
    state.tool = "move";
    panel.innerHTML = `
      ${control("缩放", "zoom", "zoom", 10, 180, 1, (v) => `${Math.round(v)}%`)}
      <div class="preset-row">
        <button data-crop="fit">适应</button>
        <button data-crop="fill">铺满</button>
        <button data-crop="original">原始</button>
      </div>
      <p class="hint">在预览屏上直接拖动图片，图片不会被拖出屏幕边框。</p>
    `;
    bindRange("zoom", "zoom", (v) => `${Math.round(v)}%`);
    document.querySelectorAll("[data-crop]").forEach((button) => {
      button.addEventListener("click", () => {
        applyCropPreset(button.dataset.crop);
        renderPanel();
      });
    });
  }
  if (state.panel === "抠除") {
    state.tool = "wand";
    panel.innerHTML = `
      ${control("容差", "tolerance", "tolerance", 0, 180, 1)}
      <p class="hint">切换到抠图魔术棒后，点击想删除的背景区域。颜色接近的像素会变成透明棋盘格。</p>
      <button class="wide-light" id="clearKeyColor">清除抠图</button>
    `;
    bindRange("tolerance", "tolerance");
    document.getElementById("clearKeyColor").addEventListener("click", () => {
      state.keyColor = null;
      state.tolerance = 0;
      if (state.image) imageToTransparent(state.image);
      renderPanel();
    });
  }
  if (state.panel === "参数") {
    panel.innerHTML =
      control("亮度", "brightness", "brightness", -100, 100, 1) +
      control("对比度", "contrast", "contrast", -100, 100, 1) +
      control("Gamma", "gamma", "gamma", 0.2, 3, 0.1) +
      control("锐化", "sharpen", "sharpen", 0, 100, 1) +
      control("抖动强度", "dither", "dither", 0, 100, 1) +
      control("黑白阈值", "threshold", "threshold", 0, 255, 1);
    bindRange("brightness", "brightness");
    bindRange("contrast", "contrast");
    bindRange("gamma", "gamma");
    bindRange("sharpen", "sharpen");
    bindRange("dither", "dither");
    bindRange("threshold", "threshold");
  }
}

function renderGenericPanel() {
  if (["资料", "内容", "文字"].includes(state.panel)) {
    panel.innerHTML = `
      <div class="text-grid">
        <div class="field">
          <label>${state.templateId === "qr-card" ? "链接/文本" : "主文字"}</label>
          <input id="titleInput" value="${state.templateId === "qr-card" ? state.qrText : state.title}" />
        </div>
        <div class="field">
          <label>${state.templateId === "work-badge" ? "姓名" : "副文字"}</label>
          <input id="subtitleInput" value="${state.templateId === "work-badge" ? state.name : state.subtitle}" />
        </div>
      </div>
    `;
    bindText("titleInput", state.templateId === "qr-card" ? "qrText" : "title");
    bindText("subtitleInput", state.templateId === "work-badge" ? "name" : "subtitle");
  } else if (["图片", "裁切"].includes(state.panel)) {
    panel.innerHTML =
      control("缩放", "scale", "scale", 0.4, 2.2, 0.01, (v) => `${Math.round(v * 100)}%`) +
      control("亮度", "brightness", "brightness", -100, 100, 1);
    bindRange("scale", "scale", (v) => `${Math.round(v * 100)}%`);
    bindRange("brightness", "brightness");
  } else {
    panel.innerHTML =
      control("对比度", "contrast", "contrast", -100, 100, 1) +
      control("透明度", "alpha", "alpha", 0, 100, 1, (v) => `${v}%`) +
      `<p class="hint">推送前会检查文字大小、二维码留白和图片对比度。</p>`;
    bindRange("contrast", "contrast");
    bindRange("alpha", "alpha", (v) => `${v}%`);
  }
}

function renderPanel() {
  if (state.templateId === "watermark-cover") renderWatermarkPanel();
  else renderGenericPanel();
}

function resetEditingState() {
  Object.assign(state, {
    x: 0,
    y: 0,
    scale: 1,
    zoom: 100,
    threshold: 128,
    tolerance: 0,
    feather: 0,
    brightness: 0,
    contrast: 0,
    gamma: 1,
    sharpen: 0,
    dither: 50,
    invert: false,
    keyColor: null,
    cropPreset: "fit",
    alpha: 92,
  });
  if (state.templateId === "watermark-cover" && state.image) applyCropPreset("fit");
  else if (state.image) imageToTransparent(state.image);
  renderPanel();
  renderCanvas();
  showToast("已重置编辑参数");
}

document.getElementById("pickImageButton").addEventListener("click", () => input.click());
input.addEventListener("change", () => {
  const file = input.files?.[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    state.image = img;
    state.fileName = file.name;
    state.imageWidth = img.naturalWidth || img.width;
    state.imageHeight = img.naturalHeight || img.height;
    state.keyColor = null;
    state.tolerance = 0;
    if (state.templateId === "watermark-cover") applyCropPreset("fit");
    else imageToTransparent(img);
    renderPanel();
    showToast(state.templateId === "watermark-cover" ? "图片已导入，可移动或抠除背景" : "图片已导入模板");
  };
  img.src = URL.createObjectURL(file);
});

resetButton.addEventListener("click", resetEditingState);
backButton.addEventListener("click", backToTemplates);

document.getElementById("pushButton").addEventListener("click", () => {
  const message = state.templateId === "watermark-cover"
    ? `已生成 ${state.outputWidth}×${state.outputHeight} 透明书封`
    : `${currentTemplate().name}已生成，准备推送到设备`;
  showToast(message);
});

document.getElementById("exportButton").addEventListener("click", () => {
  if (state.templateId === "watermark-cover") exportTransparentPng();
  else showToast("当前模板暂未配置 PNG 导出");
});

let dragStart = null;
canvas.addEventListener("pointerdown", (event) => {
  if (state.templateId !== "watermark-cover" || !state.image) return;
  const point = canvasPoint(event);
  if (state.tool === "wand") {
    sampleMagicColor(point.x, point.y);
    return;
  }
  dragStart = { pointerX: point.x, pointerY: point.y, x: state.x, y: state.y };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragStart || state.tool !== "move") return;
  const point = canvasPoint(event);
  state.x = Math.round(dragStart.x + point.x - dragStart.pointerX);
  state.y = Math.round(dragStart.y + point.y - dragStart.pointerY);
  constrainImagePosition();
  if (state.image) imageToTransparent(state.image);
  if (state.panel === "移动") renderPanel();
});

canvas.addEventListener("pointerup", () => {
  dragStart = null;
});

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
  };
}

renderTemplateGrid();

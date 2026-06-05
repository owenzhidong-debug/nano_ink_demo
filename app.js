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
const pickImageButton = document.getElementById("pickImageButton");
const badgeTypeTabs = document.getElementById("badgeTypeTabs");
const badgeBaseImage = new Image();
const shieldBaseImage = new Image();
const calligraphyBaseImage = new Image();
const calligraphyParchmentImage = new Image();

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
    tabs: ["编辑"],
  },
  {
    id: "calligraphy-card",
    name: "书法字模板",
    desc: "输入文字，自动转简体并生成竖排书法",
    chip: "书法",
    art: "art-calligraphy",
    tabs: ["文字"],
  },
  {
    id: "bank-card",
    name: "银行卡模板",
    desc: "上传背景，生成图书银行竖版卡面",
    chip: "卡片",
    art: "art-bank",
    tabs: ["编辑"],
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
  uploadTarget: "main",
  badgeType: "fbi",
  badgeAvatar: null,
  badgeLogo: null,
  badgeName: "Arthas Hu",
  shieldPhoto: null,
  shieldName: "XXXXX XXX",
  shieldBirth: "XXXMAR05",
  shieldIssue: "XXXXJULXX",
  shieldExpire: "2042JUL21",
  shieldSerial: "A XXXXX",
  calligraphyPaper: "xuan",
  calligraphyTop: "何须多虑盈亏事",
  calligraphyBottom: "人生小满胜万全",
  quoteStyle: "plain",
  quoteText: "不必为两小时和八公里之外的事烦忧",
  quoteAuthor: "契诃夫",
  bankBackground: null,
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

badgeBaseImage.onload = () => {
  if (state.templateId === "work-badge") renderCanvas();
};
badgeBaseImage.src = "./work_badge_base_480x800.png";
shieldBaseImage.onload = () => {
  if (state.templateId === "work-badge") renderCanvas();
};
shieldBaseImage.src = "./work_badge_shield_480x800.png";
calligraphyBaseImage.onload = () => {
  if (state.templateId === "calligraphy-card") renderCanvas();
};
calligraphyBaseImage.src = "./calligraphy_base_480x800.png";
calligraphyParchmentImage.onload = () => {
  if (state.templateId === "calligraphy-card") renderCanvas();
};
calligraphyParchmentImage.src = "./calligraphy_parchment_480x800.png";

if (document.fonts) {
  document.fonts.load("48px DuanNingCaoShu").then(() => {
    if (state.templateId === "calligraphy-card") renderCanvas();
  });
}

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
  if (templateId === "work-badge") state.uploadTarget = "avatar";
  editorView.classList.toggle("bank-editor", templateId === "bank-card");
  templateView.classList.add("hidden");
  editorView.classList.remove("hidden");
  backButton.classList.remove("hidden");
  resetButton.classList.remove("hidden");
  pageTitle.textContent = currentTemplate().name;
  renderTopTemplateTabs();
  renderTabs();
  renderPanel();
  renderCanvas();
}

function backToTemplates() {
  templateView.classList.remove("hidden");
  editorView.classList.add("hidden");
  editorView.classList.remove("bank-editor");
  backButton.classList.add("hidden");
  resetButton.classList.add("hidden");
  badgeTypeTabs.classList.add("hidden");
  pageTitle.textContent = "图片模板";
}

function renderTopTemplateTabs() {
  if (state.templateId === "calligraphy-card") {
    renderCalligraphyPaperTabs();
    return;
  }
  if (state.templateId !== "work-badge") {
    badgeTypeTabs.classList.add("hidden");
    badgeTypeTabs.innerHTML = "";
    return;
  }
  badgeTypeTabs.classList.remove("hidden");
  badgeTypeTabs.innerHTML = `
    <button class="${state.badgeType === "fbi" ? "active" : ""}" data-badge-type="fbi">FBI</button>
    <button class="${state.badgeType === "shield" ? "active" : ""}" data-badge-type="shield">神盾局</button>
  `;
  document.querySelectorAll("[data-badge-type]").forEach((button) => {
    button.addEventListener("click", () => {
      state.badgeType = button.dataset.badgeType;
      state.uploadTarget = state.badgeType === "shield" ? "shieldPhoto" : "avatar";
      renderTopTemplateTabs();
      renderPanel();
      renderCanvas();
    });
  });
}

function renderQuoteStyleTabs() {
  badgeTypeTabs.classList.remove("hidden");
  badgeTypeTabs.innerHTML = `
    <button class="${state.quoteStyle === "plain" ? "active" : ""}" data-quote-style="plain">无落款</button>
    <button class="${state.quoteStyle === "signed" ? "active" : ""}" data-quote-style="signed">带落款</button>
  `;
  document.querySelectorAll("[data-quote-style]").forEach((button) => {
    button.addEventListener("click", () => {
      state.quoteStyle = button.dataset.quoteStyle;
      state.quoteText = limitChineseChars(state.quoteText, state.quoteStyle === "signed" ? 35 : 24);
      renderTopTemplateTabs();
      renderPanel();
      renderCanvas();
    });
  });
}

function renderCalligraphyPaperTabs() {
  badgeTypeTabs.classList.remove("hidden");
  badgeTypeTabs.innerHTML = `
    <button class="${state.calligraphyPaper === "xuan" ? "active" : ""}" data-paper="xuan">宣纸</button>
    <button class="${state.calligraphyPaper === "parchment" ? "active" : ""}" data-paper="parchment">羊皮纸</button>
  `;
  document.querySelectorAll("[data-paper]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calligraphyPaper = button.dataset.paper;
      renderTopTemplateTabs();
      renderCanvas();
    });
  });
}

function renderTabs() {
  if (["work-badge", "calligraphy-card", "bank-card"].includes(state.templateId)) {
    toolTabs.innerHTML = "";
    toolTabs.closest(".tools-row").classList.add("hidden");
    return;
  }
  toolTabs.closest(".tools-row").classList.remove("hidden");
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

function updateUploadButtonLabel() {
  pickImageButton.closest(".upload-row").classList.toggle("hidden", ["work-badge", "calligraphy-card", "bank-card"].includes(state.templateId));
  if (state.templateId === "work-badge") {
    pickImageButton.textContent = state.uploadTarget === "logo" ? "上传图标" : "上传头像";
    return;
  }
  pickImageButton.textContent = "导入图片";
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
  if (state.badgeType === "shield") {
    drawShieldBadgePreview();
    return;
  }
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (badgeBaseImage.complete && badgeBaseImage.naturalWidth) {
    ctx.drawImage(badgeBaseImage, 0, 0, canvas.width, canvas.height);
  }

  if (state.badgeLogo) {
    drawCircularImage(state.badgeLogo, 205, 150, 104);
  }

  if (state.badgeAvatar) {
    drawFramedImage(state.badgeAvatar, 290, 560, 118, 118);
  }

  drawBadgeName();
}

function drawShieldBadgePreview() {
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (shieldBaseImage.complete && shieldBaseImage.naturalWidth) {
    ctx.drawImage(shieldBaseImage, 0, 0, canvas.width, canvas.height);
  }

  if (state.shieldPhoto) {
    drawRotatedImage(state.shieldPhoto, 23, 203, 196, 253);
  }

  drawRotatedLabel(state.shieldName, 242, 214, 118, 68, 29);
  drawRotatedLabel(state.shieldBirth, 243, 365, 142, 36, 25);
  drawRotatedLabel(`${state.shieldIssue} / ${state.shieldExpire}`, 243, 422, 214, 34, 24);
  drawRotatedLabel(state.shieldSerial, 673, 422, 96, 34, 24);
}

function drawCalligraphyPreview() {
  ctx.fillStyle = "#f8f8f8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const base = state.calligraphyPaper === "parchment" ? calligraphyParchmentImage : calligraphyBaseImage;
  if (base.complete && base.naturalWidth) {
    ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
  }

  const columns = normalizeCalligraphyColumns();
  drawCalligraphyColumn(columns[0], 304, 86);
  drawCalligraphyColumn(columns[1], 184, 146);
}

function normalizeCalligraphyColumns() {
  return [
    toSimplified(limitChineseChars(state.calligraphyTop, 7) || "何须多虑盈亏事"),
    toSimplified(limitChineseChars(state.calligraphyBottom, 7) || "人生小满胜万全"),
  ];
}

function drawCalligraphyColumn(text, x, y) {
  const chars = Array.from(text);
  const maxHeight = 620;
  const fontSize = clamp(Math.floor(maxHeight / Math.max(chars.length, 1)), 44, 68) + 2;
  ctx.save();
  ctx.fillStyle = "#0d0d0d";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `${fontSize}px DuanNingCaoShu, STKaiti, "Kaiti SC", KaiTi, serif`;
  chars.forEach((char, index) => {
    const cy = y + index * fontSize * 1.14;
    ctx.save();
    ctx.translate(x + ((index % 2) - 0.5) * 5, cy);
    ctx.rotate((index % 3 - 1) * 0.025);
    ctx.fillText(char, 0, 0);
    ctx.globalAlpha = 0.16;
    ctx.fillText(char, -1, 1);
    ctx.restore();
  });
  ctx.restore();
}

function drawSeal(x, y, text) {
  ctx.save();
  ctx.strokeStyle = "#333";
  ctx.fillStyle = "#333";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, y, 20, 48);
  ctx.font = "14px DuanNingCaoShu, STKaiti, KaiTi, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  Array.from(text).forEach((char, index) => ctx.fillText(char, x + 10, y + 6 + index * 16));
  ctx.restore();
}

function toSimplified(text) {
  const map = {
    万: "萬", 与: "與", 丑: "醜", 专: "專", 业: "業", 东: "東", 丝: "絲", 严: "嚴", 丧: "喪", 个: "個",
    临: "臨", 为: "為", 举: "舉", 义: "義", 乌: "烏", 乐: "樂", 乔: "喬", 习: "習", 乡: "鄉", 书: "書",
    买: "買", 乱: "亂", 争: "爭", 于: "於", 亏: "虧", 云: "雲", 亚: "亞", 产: "產", 亩: "畝", 亲: "親",
    亿: "億", 仅: "僅", 从: "從", 仑: "侖", 仓: "倉", 仪: "儀", 们: "們", 优: "優", 会: "會", 伞: "傘",
    传: "傳", 伤: "傷", 伦: "倫", 伪: "偽", 体: "體", 余: "餘", 佛: "佛", 佣: "傭", 侠: "俠", 侣: "侶",
    侥: "僥", 侧: "側", 侦: "偵", 侨: "僑", 侩: "儈", 侪: "儕", 侬: "儂", 俣: "俁", 俦: "儔", 俨: "儼",
    债: "債", 倾: "傾", 偿: "償", 储: "儲", 儿: "兒", 兑: "兌", 党: "黨", 兰: "蘭", 关: "關", 兴: "興",
    养: "養", 兽: "獸", 冁: "囅", 内: "內", 冈: "岡", 册: "冊", 写: "寫", 军: "軍", 农: "農", 冯: "馮",
    冲: "沖", 决: "決", 况: "況", 冻: "凍", 净: "淨", 凉: "涼", 减: "減", 凑: "湊", 凛: "凜", 几: "幾",
    凤: "鳳", 凭: "憑", 凯: "凱", 击: "擊", 凿: "鑿", 刍: "芻", 划: "劃", 刘: "劉", 则: "則", 刚: "剛",
    创: "創", 删: "刪", 别: "別", 刬: "剗", 刭: "剄", 刹: "剎", 刽: "劊", 刾: "刺", 剂: "劑", 剐: "剮",
    剑: "劍", 剧: "劇", 劝: "勸", 办: "辦", 务: "務", 动: "動", 励: "勵", 劲: "勁", 劳: "勞", 势: "勢",
    勋: "勳", 勒: "勒", 勚: "勩", 匀: "勻", 匦: "匭", 匮: "匱", 区: "區", 医: "醫", 华: "華", 协: "協",
    单: "單", 卖: "賣", 卢: "盧", 卤: "鹵", 卧: "臥", 卫: "衛", 却: "卻", 厂: "廠", 厅: "廳", 历: "歷",
    厉: "厲", 压: "壓", 厌: "厭", 厕: "廁", 厘: "釐", 厢: "廂", 厣: "厴", 厦: "廈", 厨: "廚", 厩: "廄",
    厮: "廝", 县: "縣", 参: "參", 双: "雙", 发: "發", 变: "變", 叙: "敘", 叠: "疊", 叶: "葉", 号: "號",
    后: "後", 吓: "嚇", 吕: "呂", 吗: "嗎", 吨: "噸", 听: "聽", 吴: "吳", 告: "告", 员: "員", 呙: "咼",
    咏: "詠", 咙: "嚨", 咛: "嚀", 咸: "鹹", 响: "響", 哑: "啞", 哒: "噠", 哓: "嘵", 哔: "嗶", 哕: "噦",
    哗: "嘩", 哙: "噲", 哜: "嚌", 哝: "噥", 哟: "喲", 唤: "喚", 啧: "嘖", 啬: "嗇", 啭: "囀", 啮: "嚙",
    啰: "囉", 啴: "嘽", 啸: "嘯", 喷: "噴", 喽: "嘍", 嗳: "噯", 嘘: "噓", 嘤: "嚶", 嘱: "囑", 噜: "嚕",
    园: "園", 围: "圍", 国: "國", 图: "圖", 圆: "圓", 圣: "聖", 圹: "壙", 场: "場", 坏: "壞", 块: "塊",
    坚: "堅", 坛: "壇", 坜: "壢", 坝: "壩", 坞: "塢", 坟: "墳", 坠: "墜", 垄: "壟", 垅: "壟", 垆: "壚",
    垒: "壘", 垦: "墾", 垩: "堊", 垫: "墊", 垭: "埡", 垱: "壋", 垲: "塏", 垴: "堖", 埘: "塒", 埙: "塤",
    埚: "堝", 埯: "垵", 堑: "塹", 堕: "墮", 墙: "牆", 壮: "壯", 声: "聲", 壳: "殼", 壶: "壺", 处: "處",
    备: "備", 复: "復", 够: "夠", 头: "頭", 夹: "夾", 夺: "奪", 奁: "奩", 奂: "奐", 奋: "奮", 奖: "獎",
    奥: "奧", 妆: "妝", 妇: "婦", 妈: "媽", 妩: "嫵", 妪: "嫗", 妫: "媯", 姗: "姍", 姹: "奼", 娄: "婁",
    娅: "婭", 娆: "嬈", 娇: "嬌", 娈: "孌", 娲: "媧", 娴: "嫻", 婴: "嬰", 婵: "嬋", 婶: "嬸", 媪: "媼",
    嫒: "嬡", 嫔: "嬪", 嫱: "嬙", 孙: "孫", 学: "學", 孪: "孿", 宁: "寧", 宝: "寶", 实: "實", 宠: "寵",
    审: "審", 宪: "憲", 宫: "宮", 宽: "寬", 宾: "賓", 寝: "寢", 对: "對", 寻: "尋", 导: "導", 寿: "壽",
    将: "將", 尔: "爾", 尘: "塵", 尝: "嘗", 尧: "堯", 尴: "尷", 尸: "屍", 尽: "盡", 层: "層", 屉: "屜",
    属: "屬", 屡: "屢", 屦: "屨", 屿: "嶼", 岁: "歲", 岂: "豈", 岖: "嶇", 岗: "崗", 岘: "峴", 岙: "嶴",
    岚: "嵐", 岛: "島", 岭: "嶺", 岳: "嶽", 岽: "崬", 岿: "巋", 峃: "嶨", 峄: "嶧", 峡: "峽", 峣: "嶢",
    峤: "嶠", 峥: "崢", 峦: "巒", 崇: "崇", 巅: "巔", 巩: "鞏", 币: "幣", 帅: "帥", 师: "師", 帐: "帳",
    帘: "簾", 帜: "幟", 带: "帶", 帧: "幀", 帮: "幫", 帱: "幬", 帻: "幘", 帼: "幗", 幂: "冪", 干: "乾",
    并: "並", 广: "廣", 庄: "莊", 庆: "慶", 庐: "廬", 庑: "廡", 库: "庫", 应: "應", 庙: "廟", 庞: "龐",
    废: "廢", 开: "開", 异: "異", 弃: "棄", 弑: "弒", 张: "張", 弥: "彌", 弦: "弦", 弯: "彎", 归: "歸",
    当: "當", 录: "錄", 彦: "彥", 彻: "徹", 径: "徑", 徕: "徠", 御: "禦", 忆: "憶", 忏: "懺", 志: "誌",
    忧: "憂", 念: "念", 忾: "愾", 怀: "懷", 态: "態", 怂: "慫", 怃: "憮", 怄: "慪", 怅: "悵", 怆: "愴",
    怜: "憐", 总: "總", 怼: "懟", 怿: "懌", 恋: "戀", 恳: "懇", 恶: "惡", 恸: "慟", 恹: "懨", 恺: "愷",
    恻: "惻", 恼: "惱", 恽: "惲", 悦: "悅", 悫: "愨", 悬: "懸", 悭: "慳", 悯: "憫", 惊: "驚", 惧: "懼",
    惨: "慘", 惩: "懲", 惫: "憊", 惬: "愜", 惭: "慚", 惮: "憚", 惯: "慣", 愠: "慍", 愤: "憤", 愦: "憒",
    愿: "願", 慑: "懾", 慭: "憖", 懑: "懣", 懒: "懶", 戆: "戇", 戏: "戲", 户: "戶", 扑: "撲", 执: "執",
    扩: "擴", 扪: "捫", 扫: "掃", 扬: "揚", 扰: "擾", 抚: "撫", 抛: "拋", 抟: "摶", 抠: "摳", 抡: "掄",
    抢: "搶", 护: "護", 报: "報", 担: "擔", 拟: "擬", 拢: "攏", 拣: "揀", 拥: "擁", 拦: "攔", 拧: "擰",
    拨: "撥", 择: "擇", 挂: "掛", 挚: "摯", 挛: "攣", 挜: "掗", 挝: "撾", 挞: "撻", 挟: "挾", 挠: "撓",
    挡: "擋", 挢: "撟", 挣: "掙", 挤: "擠", 挥: "揮", 挦: "撏", 捞: "撈", 损: "損", 捡: "撿", 换: "換",
    据: "據", 捣: "搗", 捻: "撚", 掳: "擄", 掴: "摑", 掷: "擲", 掸: "撣", 掺: "摻", 揽: "攬", 揿: "撳",
    搀: "攙", 搁: "擱", 搂: "摟", 搅: "攪", 携: "攜", 摄: "攝", 摅: "攄", 摆: "擺", 摇: "搖", 摈: "擯",
    摊: "攤", 撄: "攖", 撑: "撐", 撵: "攆", 撷: "擷",撸: "擼", 撺: "攛", 擞: "擻", 攒: "攢", 敌: "敵",
    敛: "斂", 数: "數", 斋: "齋", 斓: "斕", 斗: "鬥", 斩: "斬", 断: "斷", 无: "無", 旧: "舊", 时: "時",
    旷: "曠", 昙: "曇", 昼: "晝", 显: "顯", 晋: "晉", 晒: "曬", 晓: "曉", 晔: "曄", 晕: "暈", 晖: "暉",
    暂: "暫", 暧: "曖", 术: "術", 机: "機", 杀: "殺", 杂: "雜", 权: "權", 杆: "桿", 条: "條", 来: "來",
    杨: "楊", 杩: "榪", 杰: "傑", 极: "極", 构: "構", 枞: "樅", 枢: "樞", 枣: "棗", 枥: "櫪", 枧: "梘",
    枨: "棖", 枪: "槍", 枫: "楓", 枭: "梟", 柜: "櫃", 柠: "檸", 查: "查", 栀: "梔", 栅: "柵", 标: "標",
    栈: "棧", 栉: "櫛", 栊: "櫳", 栋: "棟", 栌: "櫨", 栎: "櫟", 栏: "欄", 树: "樹", 栖: "棲", 样: "樣",
    栾: "欒", 桠: "椏", 桡: "橈", 桢: "楨", 档: "檔", 桤: "榿", 桥: "橋", 桦: "樺", 桧: "檜", 桨: "槳",
    桩: "樁", 梦: "夢", 梼: "檮", 梾: "棶", 梿: "槤", 检: "檢", 棂: "欞", 椁: "槨", 椟: "櫝", 椠: "槧",
    椤: "欏", 椭: "橢", 楼: "樓", 榄: "欖", 榅: "榲", 榇: "櫬", 榈: "櫚", 榉: "櫸", 槚: "檟", 槛: "檻",
    槟: "檳", 槠: "櫧", 横: "橫", 樯: "檣", 樱: "櫻", 橥: "櫫", 橱: "櫥", 橹: "櫓", 橼: "櫞", 欢: "歡",
    欤: "歟", 欧: "歐", 欲: "慾", 歼: "殲", 殁: "歿", 殇: "殤", 残: "殘", 殒: "殞", 殓: "殮", 殚: "殫",
    殡: "殯", 殴: "毆", 毁: "毀", 毂: "轂", 毕: "畢", 毙: "斃", 毡: "氈", 毵: "毿", 氇: "氌", 气: "氣",
    氢: "氫", 氩: "氬", 氲: "氳", 汇: "匯", 汉: "漢", 汤: "湯", 汹: "洶", 沟: "溝", 没: "沒", 沣: "灃",
    沤: "漚", 沥: "瀝", 沦: "淪", 沧: "滄", 沨: "渢", 沩: "溈", 沪: "滬", 沫: "沫", 泞: "濘", 泪: "淚",
    泶: "澩", 泷: "瀧", 泸: "瀘", 泺: "濼", 泻: "瀉", 泼: "潑", 泽: "澤", 泾: "涇", 洁: "潔", 洒: "灑",
    洼: "窪", 浃: "浹", 浅: "淺", 浆: "漿", 浇: "澆", 浈: "湞", 浊: "濁", 测: "測", 浍: "澮", 济: "濟",
    浏: "瀏", 浐: "滻", 浑: "渾", 浒: "滸", 浓: "濃", 浔: "潯", 涛: "濤", 涝: "澇", 涞: "淶", 涟: "漣",
    涠: "潿", 涡: "渦", 涢: "溳", 涣: "渙", 涤: "滌", 润: "潤", 涧: "澗", 涨: "漲", 涩: "澀", 渊: "淵",
    渌: "淥", 渍: "漬", 渎: "瀆", 渐: "漸", 渑: "澠", 渔: "漁", 渖: "瀋", 渗: "滲", 温: "溫", 湾: "灣",
    湿: "濕", 溃: "潰", 溅: "濺", 溆: "漵", 溇: "漊", 滗: "潷", 滚: "滾", 滞: "滯", 滟: "灧", 滠: "灄",
    满: "滿", 滢: "瀅", 滤: "濾", 滥: "濫", 滦: "灤", 滨: "濱", 滩: "灘", 滪: "澦", 漤: "濫", 潆: "瀠",
    潇: "瀟", 潋: "瀲", 潍: "濰", 潜: "潛", 潴: "瀦", 澜: "瀾", 濑: "瀨", 濒: "瀕", 灏: "灝", 灭: "滅",
    灯: "燈", 灵: "靈", 灾: "災", 灿: "燦", 炀: "煬", 炉: "爐", 炖: "燉", 炜: "煒", 炝: "熗", 点: "點",
    炼: "煉", 炽: "熾", 烁: "爍", 烂: "爛", 烃: "烴", 烛: "燭", 烟: "煙", 烦: "煩", 烧: "燒", 烨: "燁",
    烩: "燴", 烫: "燙", 烬: "燼", 热: "熱", 焕: "煥", 焖: "燜", 焘: "燾", 爱: "愛", 爷: "爺", 牍: "牘",
    牦: "氂", 牵: "牽", 牺: "犧", 犊: "犢", 状: "狀", 犷: "獷", 犸: "獁", 犹: "猶", 狈: "狽", 狝: "獮",
    狞: "獰", 独: "獨", 狭: "狹", 狮: "獅", 狯: "獪", 狰: "猙", 狱: "獄", 狲: "猻", 猃: "獫", 猎: "獵",
    猕: "獼", 猡: "玀", 猪: "豬", 猫: "貓", 猬: "蝟", 献: "獻", 獭: "獺", 玛: "瑪", 玮: "瑋", 环: "環",
    现: "現", 玱: "瑲", 玺: "璽", 珐: "琺", 珑: "瓏", 珰: "璫", 珲: "琿", 琏: "璉", 琐: "瑣", 琼: "瓊",
    瑶: "瑤", 瑷: "璦", 璎: "瓔", 瓒: "瓚", 瓮: "甕", 电: "電", 画: "畫", 畅: "暢", 畲: "畬", 疖: "癤",
    疗: "療", 疟: "瘧", 疠: "癘", 疡: "瘍", 疬: "癧", 疮: "瘡", 疯: "瘋", 疱: "皰", 疴: "痾", 痈: "癰",
    痉: "痙", 痒: "癢", 痖: "瘂", 痨: "癆", 痪: "瘓", 痫: "癇", 瘅: "癉", 瘗: "瘞", 瘘: "瘺", 瘪: "癟",
    瘫: "癱", 瘾: "癮", 瘿: "癭", 癞: "癩", 癣: "癬", 皑: "皚", 皱: "皺", 皲: "皸", 盏: "盞", 盐: "鹽",
    监: "監", 盖: "蓋", 盗: "盜", 盘: "盤", 眍: "瞘", 眦: "眥", 眬: "矓", 着: "著", 睁: "睜", 睐: "睞",
    睑: "瞼", 瞒: "瞞", 瞩: "矚", 矫: "矯", 矶: "磯", 矾: "礬", 矿: "礦", 砀: "碭", 码: "碼", 砖: "磚",
    砗: "硨", 砚: "硯", 砜: "碸", 砺: "礪", 砻: "礱", 砾: "礫", 础: "礎", 硁: "硜", 硕: "碩", 硖: "硤",
    硗: "磽", 硙: "磑", 硚: "礄", 确: "確", 碍: "礙", 碛: "磧", 碜: "磣", 礼: "禮", 祎: "禕", 祢: "禰",
    祯: "禎", 祷: "禱", 祸: "禍", 禀: "稟", 禄: "祿", 禅: "禪", 离: "離", 秃: "禿", 秆: "稈", 种: "種",
    积: "積", 称: "稱", 秽: "穢", 税: "稅", 稣: "穌", 稳: "穩", 穑: "穡", 穷: "窮", 窃: "竊", 窍: "竅",
    窎: "窵", 窑: "窯", 窜: "竄", 窝: "窩", 窥: "窺", 窦: "竇", 窭: "窶", 竖: "豎", 竞: "競", 笃: "篤",
    笋: "筍", 笔: "筆", 笕: "筧", 笺: "箋", 笼: "籠", 笾: "籩", 筚: "篳", 筛: "篩", 筜: "簹", 筝: "箏",
    筹: "籌", 筼: "篔", 签: "簽", 简: "簡", 箓: "籙", 箦: "簀", 箧: "篋", 箨: "籜", 箩: "籮", 箪: "簞",
    箫: "簫", 篑: "簣", 篓: "簍", 篮: "籃", 篱: "籬", 簖: "籪", 籁: "籟", 籴: "糴", 类: "類", 籼: "秈",
    粜: "糶", 粝: "糲", 粤: "粵", 粪: "糞", 粮: "糧", 糁: "糝", 糇: "餱", 糍: "餈", 糕: "糕", 糜: "糜",
    糟: "糟", 糠: "糠", 糨: "糨", 系: "係", 紧: "緊", 累: "纍", 絷: "縶", 纠: "糾", 纡: "紆", 红: "紅",
    纣: "紂", 纤: "纖", 纥: "紇", 约: "約", 级: "級", 纨: "紈", 纩: "纊", 纪: "紀", 纫: "紉", 纬: "緯",
    纭: "紜", 纯: "純", 纰: "紕", 纱: "紗", 纲: "綱", 纳: "納", 纵: "縱", 纶: "綸", 纷: "紛", 纸: "紙",
    纹: "紋", 纺: "紡", 纽: "紐", 纾: "紓", 线: "線", 绀: "紺", 绁: "紲", 绂: "紱", 练: "練", 组: "組",
    绅: "紳", 细: "細", 织: "織", 终: "終", 绉: "縐", 绊: "絆", 绋: "紼", 绌: "絀", 绍: "紹", 绎: "繹",
    经: "經", 绐: "紿", 绑: "綁", 绒: "絨", 结: "結", 绔: "絝", 绕: "繞", 绖: "絰", 绗: "絎", 绘: "繪",
    给: "給", 绚: "絢", 绛: "絳", 络: "絡", 绝: "絕", 绞: "絞", 统: "統", 绠: "綆", 绡: "綃", 绢: "絹",
    绣: "繡", 绥: "綏", 绦: "絛", 继: "繼", 绨: "綈", 绩: "績", 绪: "緒", 绫: "綾", 绬: "緓", 续: "續",
    绮: "綺", 绯: "緋", 绰: "綽", 绱: "緔", 绲: "緄", 绳: "繩", 维: "維", 绵: "綿", 绶: "綬", 绷: "繃",
    绸: "綢", 绹: "綯", 绺: "綹", 绻: "綣", 综: "綜", 绽: "綻", 绾: "綰", 绿: "綠", 缀: "綴", 缁: "緇",
    缂: "緙", 缃: "緗", 缄: "緘", 缅: "緬", 缆: "纜", 缇: "緹", 缈: "緲", 缉: "緝", 缊: "縕", 缋: "繢",
    缌: "緦", 缍: "綞", 缎: "緞", 缏: "緶", 缐: "線", 缑: "緱", 缒: "縋", 缓: "緩", 缔: "締", 缕: "縷",
    编: "編", 缗: "緡", 缘: "緣", 缙: "縉", 缚: "縛", 缛: "縟", 缜: "縝", 缝: "縫", 缟: "縞", 缠: "纏",
    缡: "縭", 缢: "縊", 缣: "縑", 缤: "繽", 缥: "縹", 缦: "縵", 缧: "縲", 缨: "纓", 缩: "縮", 缪: "繆",
    缫: "繅", 缬: "纈", 缭: "繚", 缮: "繕", 缯: "繒", 缰: "韁", 缱: "繾", 缲: "繰", 缳: "繯", 缴: "繳",
    缵: "纘", 罂: "罌", 网: "網", 罗: "羅", 罚: "罰", 罢: "罷", 罴: "羆", 羁: "羈", 羟: "羥", 羡: "羨",
    翘: "翹", 耢: "耮", 耧: "耬", 耸: "聳", 耻: "恥", 聂: "聶", 聋: "聾", 职: "職", 聍: "聹", 联: "聯",
    聩: "聵", 聪: "聰", 肃: "肅", 肠: "腸", 肤: "膚", 肮: "骯", 肴: "餚", 肾: "腎", 肿: "腫", 胀: "脹",
    胁: "脅", 胆: "膽", 胜: "勝", 胧: "朧", 胨: "腖", 胪: "臚", 胫: "脛", 胶: "膠", 脉: "脈", 脍: "膾",
    脏: "髒", 脐: "臍", 脑: "腦", 脓: "膿", 脔: "臠", 脚: "腳", 脱: "脫", 脶: "腡", 脸: "臉", 腊: "臘",
    腘: "膕", 腭: "齶", 腻: "膩", 腼: "靦", 腽: "膃", 腾: "騰", 膑: "臏", 臜: "臢", 舆: "輿", 舰: "艦",
    舱: "艙", 舻: "艫", 艰: "艱", 艳: "豔", 艺: "藝", 节: "節", 芈: "羋", 芗: "薌", 芜: "蕪", 芦: "蘆",
    芸: "蕓", 苁: "蓯", 苇: "葦", 苈: "藶", 苋: "莧", 苌: "萇", 苍: "蒼", 苎: "苧", 苏: "蘇", 苘: "檾",
    苹: "蘋", 范: "範", 茎: "莖", 茏: "蘢", 茑: "蔦", 茔: "塋", 茕: "煢", 茧: "繭", 荆: "荊", 荐: "薦",
    荙: "薘", 荚: "莢", 荛: "蕘", 荜: "蓽", 荞: "蕎", 荟: "薈", 荠: "薺", 荡: "蕩", 荣: "榮", 荤: "葷",
    荥: "滎", 荦: "犖", 荧: "熒", 荨: "蕁", 荩: "藎", 荪: "蓀", 荫: "蔭", 荬: "蕒", 荭: "葒", 荮: "葤",
    药: "藥", 莅: "蒞", 莜: "蓧", 莱: "萊", 莲: "蓮", 莳: "蒔", 莴: "萵", 莶: "薟", 获: "獲", 莸: "蕕",
    莹: "瑩", 莺: "鶯", 莼: "蓴", 萚: "蘀", 萝: "蘿", 萤: "螢", 营: "營", 萦: "縈", 萧: "蕭", 萨: "薩",
    葱: "蔥", 蒇: "蕆", 蒉: "蕢", 蒋: "蔣", 蒌: "蔞", 蓝: "藍", 蓟: "薊", 蓠: "蘺", 蓣: "蕷", 蓥: "鎣",
    蓦: "驀", 蔷: "薔", 蔹: "蘞", 蔺: "藺", 蔼: "藹", 蕲: "蘄", 蕴: "蘊", 薮: "藪", 藓: "蘚", 虏: "虜",
    虑: "慮", 虚: "虛", 虫: "蟲", 虬: "虯", 虮: "蟣", 虱: "蝨", 虽: "雖", 虾: "蝦", 虿: "蠆", 蚀: "蝕",
    蚁: "蟻", 蚂: "螞", 蚕: "蠶", 蚬: "蜆", 蛊: "蠱", 蛎: "蠣", 蛏: "蟶", 蛮: "蠻", 蛰: "蟄", 蛱: "蛺",
    蛲: "蟯", 蛳: "螄", 蛴: "蠐", 蜕: "蛻", 蜗: "蝸", 蜡: "蠟", 蝇: "蠅", 蝈: "蟈", 蝉: "蟬", 蝎: "蠍",
    蝼: "螻", 蝾: "蠑", 螀: "螿", 螨: "蟎", 蟏: "蠨", 衅: "釁", 衔: "銜", 补: "補", 表: "表", 衬: "襯",
    衮: "袞", 袄: "襖", 袜: "襪", 袭: "襲", 袯: "襏", 装: "裝", 裆: "襠", 裢: "褳", 裣: "襝", 裤: "褲",
    裥: "襇", 褛: "褸", 褴: "襤", 见: "見", 观: "觀", 规: "規", 觅: "覓", 视: "視", 览: "覽", 觉: "覺",
    觊: "覬", 觋: "覡", 觌: "覿", 觎: "覦", 觏: "覯", 觐: "覲", 觑: "覷", 觞: "觴", 触: "觸", 觯: "觶",
    誉: "譽", 誊: "謄", 计: "計", 订: "訂", 讣: "訃", 认: "認", 讥: "譏", 讦: "訐", 讧: "訌", 讨: "討",
    让: "讓", 讪: "訕", 讫: "訖", 训: "訓", 议: "議", 讯: "訊", 记: "記", 讲: "講", 讳: "諱", 讴: "謳",
    讵: "詎", 讶: "訝", 讷: "訥", 许: "許", 讹: "訛", 论: "論", 讼: "訟", 讽: "諷", 设: "設", 访: "訪",
    诀: "訣", 证: "證", 诂: "詁", 诃: "訶", 评: "評", 诅: "詛", 识: "識", 诈: "詐", 诉: "訴", 诊: "診",
    诋: "詆", 诌: "謅", 词: "詞", 诎: "詘", 诏: "詔", 译: "譯", 诒: "詒", 诓: "誆", 诔: "誄", 试: "試",
    诖: "詿", 诗: "詩", 诘: "詰", 诙: "詼", 诚: "誠", 诛: "誅", 诜: "詵", 话: "話", 诞: "誕", 诟: "詬",
    诠: "詮", 诡: "詭", 询: "詢", 诣: "詣", 诤: "諍", 该: "該", 详: "詳", 诧: "詫", 诨: "諢", 诩: "詡",
    诫: "誡", 诬: "誣", 语: "語", 诮: "誚", 误: "誤", 诰: "誥", 诱: "誘", 诲: "誨", 诳: "誑", 说: "說",
    诵: "誦", 诶: "誒", 请: "請", 诸: "諸", 诹: "諏", 诺: "諾", 读: "讀", 诼: "諑", 诽: "誹", 课: "課",
    诿: "諉", 谀: "諛", 谁: "誰", 谂: "諗", 调: "調", 谄: "諂", 谅: "諒", 谆: "諄", 谇: "誶", 谈: "談",
    谊: "誼", 谋: "謀", 谌: "諶", 谍: "諜", 谎: "謊", 谏: "諫", 谐: "諧", 谑: "謔", 谒: "謁", 谓: "謂",
    谔: "諤", 谕: "諭", 谖: "諼", 谗: "讒", 谘: "諮", 谙: "諳", 谚: "諺", 谛: "諦", 谜: "謎", 谝: "諞",
    谟: "謨", 谠: "讜", 谡: "謖", 谢: "謝", 谣: "謠", 谤: "謗", 谥: "謚", 谦: "謙", 谧: "謐", 谨: "謹",
    谩: "謾", 谪: "謫", 谫: "譾", 谬: "謬", 谭: "譚", 谮: "譖", 谯: "譙", 谰: "讕", 谱: "譜", 谲: "譎",
    谳: "讞", 谴: "譴", 谵: "譫", 谶: "讖", 谷: "穀", 豁: "豁", 豆: "豆", 象: "象", 豪: "豪", 豫: "豫",
    贝: "貝", 贞: "貞", 负: "負", 贡: "貢", 财: "財", 责: "責", 贤: "賢", 败: "敗", 账: "賬", 货: "貨",
    质: "質", 贩: "販", 贪: "貪", 贫: "貧", 贬: "貶", 购: "購", 贮: "貯", 贯: "貫", 贰: "貳", 贱: "賤",
    贲: "賁", 贳: "貰", 贴: "貼", 贵: "貴", 贶: "貺", 贷: "貸", 贸: "貿", 费: "費", 贺: "賀", 贻: "貽",
    贼: "賊", 贽: "贄", 贾: "賈", 贿: "賄", 赀: "貲", 赁: "賃", 赂: "賂", 赃: "贓", 资: "資", 赅: "賅",
    赆: "贐", 赇: "賕", 赈: "賑", 赉: "賚", 赊: "賒", 赋: "賦", 赌: "賭", 赍: "齎", 赎: "贖", 赏: "賞",
    赐: "賜", 赑: "贔", 赒: "賙", 赓: "賡", 赔: "賠", 赕: "賧", 赖: "賴", 赗: "賵", 赘: "贅", 赙: "賻",
    赚: "賺", 赛: "賽", 赜: "賾", 赝: "贗", 赞: "贊", 赟: "贇", 赠: "贈", 赡: "贍", 赢: "贏", 赣: "贛",
    赪: "赬", 赵: "趙", 赶: "趕", 趋: "趨", 趱: "趲", 跃: "躍", 跄: "蹌", 跞: "躒", 践: "踐", 跶: "躂",
    跷: "蹺", 跸: "蹕", 跹: "躚", 跻: "躋", 踊: "踴", 踌: "躊", 踪: "蹤", 踬: "躓", 踯: "躑", 蹑: "躡",
    蹒: "蹣", 蹰: "躕", 蹿: "躥", 躏: "躪", 躜: "躦", 躯: "軀", 车: "車", 轧: "軋", 轨: "軌", 轩: "軒",
    轪: "軑", 轫: "軔", 转: "轉", 轭: "軛", 轮: "輪", 软: "軟", 轰: "轟", 轱: "軲", 轲: "軻", 轳: "轤",
    轴: "軸", 轵: "軹", 轶: "軼", 轷: "軤", 轸: "軫", 轹: "轢", 轺: "軺", 轻: "輕", 轼: "軾", 载: "載",
    轾: "輊", 轿: "轎", 辀: "輈", 辁: "輇", 辂: "輅", 较: "較", 辄: "輒", 辅: "輔", 辆: "輛", 辇: "輦",
    辈: "輩", 辉: "輝", 辊: "輥", 辋: "輞", 辌: "輬", 辍: "輟", 辎: "輜", 辏: "輳", 辐: "輻", 辑: "輯",
    输: "輸", 辔: "轡", 辕: "轅", 辖: "轄", 辗: "輾", 辘: "轆", 辙: "轍", 辚: "轔", 辞: "辭", 辟: "闢",
    辣: "辣", 辨: "辨", 辩: "辯", 辫: "辮", 边: "邊", 辽: "遼", 达: "達", 迁: "遷", 过: "過", 迈: "邁",
    运: "運", 还: "還", 这: "這", 进: "進", 远: "遠", 违: "違", 连: "連", 迟: "遲", 迩: "邇", 迳: "逕",
    迹: "跡", 适: "適", 选: "選", 逊: "遜", 递: "遞", 逦: "邐", 逻: "邏", 遗: "遺", 遥: "遙", 邓: "鄧",
    邝: "鄺", 邬: "鄔", 邮: "郵", 邹: "鄒", 邺: "鄴", 邻: "鄰", 郁: "鬱", 郏: "郟", 郐: "鄶", 郑: "鄭",
    郓: "鄆", 郦: "酈", 郧: "鄖", 郸: "鄲", 酝: "醞", 酦: "醱", 酱: "醬", 酽: "釅", 酾: "釃", 酿: "釀",
    释: "釋", 里: "裡", 鉴: "鑒", 针: "針", 钉: "釘", 钊: "釗", 钋: "釙", 钌: "釕", 钍: "釷", 钎: "釺",
    钏: "釧", 钐: "釤", 钑: "鈒", 钒: "釩", 钓: "釣", 钔: "鍆", 钕: "釹", 钖: "鍚", 钗: "釵", 钘: "鈃",
    钙: "鈣", 钚: "鈈", 钛: "鈦", 钜: "鉅", 钝: "鈍", 钞: "鈔", 钟: "鐘", 钠: "鈉", 钡: "鋇", 钢: "鋼",
    钣: "鈑", 钤: "鈐", 钥: "鑰", 钦: "欽", 钧: "鈞", 钨: "鎢", 钩: "鉤", 钪: "鈧", 钫: "鈁", 钬: "鈥",
    钭: "鈄", 钮: "鈕", 钯: "鈀", 钰: "鈺", 钱: "錢", 钲: "鉦", 钳: "鉗", 钴: "鈷", 钵: "缽", 钶: "鈳",
    钷: "鉕", 钸: "鈽", 钹: "鈸", 钺: "鉞", 钻: "鑽", 钼: "鉬", 钽: "鉭", 钾: "鉀", 钿: "鈿", 铀: "鈾",
    铁: "鐵", 铂: "鉑", 铃: "鈴", 铄: "鑠", 铅: "鉛", 铆: "鉚", 铇: "鉋", 铈: "鈰", 铉: "鉉", 铊: "鉈",
    铋: "鉍", 铌: "鈮", 铍: "鈹", 铎: "鐸", 铏: "鉶", 铐: "銬", 铑: "銠", 铒: "鉺", 铓: "鋩", 铔: "錏",
    铕: "銪", 铖: "鋮", 铗: "鋏", 铘: "鋣", 铙: "鐃", 铚: "銍", 铛: "鐺", 铜: "銅", 铝: "鋁", 铞: "銱",
    铟: "銦", 铠: "鎧", 铡: "鍘", 铢: "銖", 铣: "銑", 铤: "鋌", 铥: "銩", 铦: "銛", 铧: "鏵", 铨: "銓",
    铩: "鎩", 铪: "鉿", 铫: "銚", 铬: "鉻", 铭: "銘", 铮: "錚", 铯: "銫", 铰: "鉸", 铱: "銥", 铲: "鏟",
    铳: "銃", 铴: "鐋", 铵: "銨", 银: "銀", 铷: "銣", 铸: "鑄", 铹: "鐒", 铺: "鋪", 铻: "鋙", 铼: "錸",
    铽: "鋱", 链: "鏈", 铿: "鏗", 销: "銷", 锁: "鎖", 锂: "鋰", 锃: "鋥", 锄: "鋤", 锅: "鍋", 锆: "鋯",
    锇: "鋨", 锈: "鏽", 锉: "銼", 锊: "鋝", 锋: "鋒", 锌: "鋅", 锍: "鋶", 锎: "鐦", 锏: "鐧", 锐: "銳",
    锑: "銻", 锒: "鋃", 锓: "鋟", 锔: "鋦", 锕: "錒", 锖: "錆", 锗: "鍺", 锘: "鍩", 错: "錯", 锚: "錨",
    锛: "錛", 锜: "錡", 锝: "鍀", 锞: "錁", 锟: "錕", 锠: "錩", 锡: "錫", 锢: "錮", 锣: "鑼", 锤: "錘",
    锥: "錐", 锦: "錦", 锧: "鑕", 锨: "鍁", 锩: "錈", 锪: "鍃", 锫: "錇", 锬: "錟", 锭: "錠", 键: "鍵",
    锯: "鋸", 锰: "錳", 锱: "錙", 锲: "鍥", 锳: "鍈", 锴: "鍇", 锵: "鏘", 锶: "鍶", 锷: "鍔", 锸: "鍤",
    锹: "鍬", 锺: "鍾", 锻: "鍛", 锼: "鎪", 锽: "鍠", 锾: "鍰", 锿: "鎄", 镀: "鍍", 镁: "鎂", 镂: "鏤",
    镃: "鎡", 镌: "鐫", 镅: "鎇", 镆: "鏌", 镇: "鎮", 镈: "鎛", 镉: "鎘", 镊: "鑷", 镋: "钂", 镌: "鐫",
    镍: "鎳", 镎: "鎿", 镏: "鎦", 镐: "鎬", 镑: "鎊", 镒: "鎰", 镓: "鎵", 镔: "鑌", 镕: "鎔", 镖: "鏢",
    镗: "鏜", 镘: "鏝", 镙: "鏍", 镚: "鏰", 镛: "鏞", 镜: "鏡", 镝: "鏑", 镞: "鏃", 镟: "鏇", 镠: "鏐",
    镡: "鐔", 镢: "鐝", 镣: "鐐", 镤: "鏷", 镥: "鑥", 镦: "鐓", 镧: "鑭", 镨: "鐠", 镩: "鑹", 镪: "鏹",
    镫: "鐙", 镬: "鑊", 镭: "鐳", 镮: "鐶", 镯: "鐲", 镰: "鐮", 镱: "鐿", 镲: "鑔", 镳: "鑣", 镴: "鑞",
    长: "長", 门: "門", 闩: "閂", 闪: "閃", 闫: "閆", 闭: "閉", 问: "問", 闯: "闖", 闰: "閏", 闱: "闈",
    闲: "閒", 闳: "閎", 间: "間", 闵: "閔", 闶: "閌", 闷: "悶", 闸: "閘", 闹: "鬧", 闺: "閨", 闻: "聞",
    闼: "闥", 闽: "閩", 闾: "閭", 闿: "闓", 阀: "閥", 阁: "閣", 阂: "閡", 阃: "閫", 阄: "鬮", 阅: "閱",
    阆: "閬", 阇: "闍", 阈: "閾", 阉: "閹", 阊: "閶", 阋: "鬩", 阌: "閿", 阍: "閽", 阎: "閻", 阏: "閼",
    阐: "闡", 阑: "闌", 阒: "闃", 阔: "闊", 阕: "闋", 阖: "闔", 阗: "闐", 阘: "闒", 阙: "闕", 阚: "闞",
    队: "隊", 阳: "陽", 阴: "陰", 阵: "陣", 阶: "階", 际: "際", 陆: "陸", 陇: "隴", 陈: "陳", 陉: "陘",
    陕: "陝", 陧: "隉", 陨: "隕", 险: "險", 随: "隨", 隐: "隱", 隶: "隸", 隽: "雋", 难: "難", 雏: "雛",
    雠: "讎", 雳: "靂", 雾: "霧", 霁: "霽", 霉: "黴", 霭: "靄", 靓: "靚", 静: "靜", 靥: "靨", 鞑: "韃",
    鞒: "鞽", 鞯: "韉", 韦: "韋", 韧: "韌", 韩: "韓", 韪: "韙", 韫: "韞", 韬: "韜", 韵: "韻", 页: "頁",
    顶: "頂", 顷: "頃", 顸: "頇", 项: "項", 顺: "順", 须: "須", 顼: "頊", 顽: "頑", 顾: "顧", 顿: "頓",
    颀: "頎", 颁: "頒", 颂: "頌", 颃: "頏", 预: "預", 颅: "顱", 领: "領", 颇: "頗", 颈: "頸", 颉: "頡",
    颊: "頰", 颋: "頲", 颌: "頜", 颍: "潁", 颎: "熲", 颏: "頦", 颐: "頤", 频: "頻", 颓: "頹", 颔: "頷",
    颕: "頴", 颖: "穎", 颗: "顆", 题: "題", 颙: "顒", 颚: "顎", 颛: "顓", 颜: "顏", 额: "額", 颞: "顳",
    颟: "顢", 颠: "顛", 颡: "顙", 颢: "顥", 颤: "顫", 颥: "顬", 颦: "顰", 颧: "顴", 风: "風", 飏: "颺",
    飐: "颭", 飑: "颮", 飒: "颯", 飓: "颶", 飔: "颸", 飕: "颼", 飖: "颻", 飘: "飄", 飙: "飆", 飞: "飛",
    饥: "飢", 饧: "餳", 饨: "飩", 饩: "餼", 饪: "飪", 饫: "飫", 饬: "飭", 饭: "飯", 饮: "飲", 饯: "餞",
    饰: "飾", 饱: "飽", 饲: "飼", 饳: "飿", 饴: "飴", 饵: "餌", 饶: "饒", 饷: "餉", 饸: "餄", 饹: "餎",
    饺: "餃", 饻: "餏", 饼: "餅", 饽: "餑", 饾: "餖", 饿: "餓", 馀: "餘", 馁: "餒", 馂: "餕", 馃: "餜",
    馄: "餛", 馅: "餡", 馆: "館", 馇: "餷", 馈: "饋", 馉: "餶", 馊: "餿", 馋: "饞", 馌: "饁", 馍: "饃",
    馎: "餺", 馏: "餾", 馐: "饈", 馑: "饉", 馒: "饅", 馓: "饊", 馔: "饌", 馕: "饢", 马: "馬", 驭: "馭",
    驮: "馱", 驯: "馴", 驰: "馳", 驱: "驅", 驲: "馹", 驳: "駁", 驴: "驢", 驵: "駔", 驶: "駛", 驷: "駟",
    驸: "駙", 驹: "駒", 驺: "騶", 驻: "駐", 驼: "駝", 驽: "駑", 驾: "駕", 驿: "驛", 骀: "駘", 骁: "驍",
    骂: "罵", 骄: "驕", 骅: "驊", 骆: "駱", 骇: "駭", 骈: "駢", 骊: "驪", 骋: "騁", 验: "驗", 骎: "駸",
    骏: "駿", 骐: "騏", 骑: "騎", 骒: "騍", 骓: "騅", 骖: "驂", 骗: "騙", 骘: "騭", 骙: "騤", 骚: "騷",
    骛: "騖", 骜: "驁", 骝: "騮", 骞: "騫", 骟: "騸", 骠: "驃", 骡: "騾", 骢: "驄", 骣: "驏", 骤: "驟",
    骥: "驥", 骦: "驦", 骧: "驤", 髅: "髏", 髋: "髖", 髌: "髕", 鬓: "鬢", 魇: "魘", 鱼: "魚", 鱿: "魷",
    鲁: "魯", 鲂: "魴", 鲅: "鮁", 鲆: "鮃", 鲇: "鯰", 鲈: "鱸", 鲋: "鮒", 鲍: "鮑", 鲎: "鱟", 鲐: "鮐",
    鲑: "鮭", 鲒: "鮚", 鲔: "鮪", 鲕: "鮞", 鲚: "鱭", 鲛: "鮫", 鲜: "鮮", 鲞: "鯗", 鲟: "鱘", 鲠: "鯁",
    鲡: "鱺", 鲢: "鰱", 鲣: "鰹", 鲤: "鯉", 鲥: "鰣", 鲦: "鰷", 鲧: "鯀", 鲨: "鯊", 鲩: "鯇", 鲫: "鯽",
    鲭: "鯖", 鲮: "鯪", 鲰: "鯫", 鲱: "鯡", 鲲: "鯤", 鲳: "鯧", 鲴: "鯝", 鲵: "鯢", 鲶: "鯰", 鲷: "鯛",
    鲸: "鯨", 鲺: "鯴", 鲻: "鯔", 鲼: "鱝", 鲽: "鰈", 鳀: "鯷", 鳃: "鰓", 鳄: "鱷", 鳅: "鰍", 鳆: "鰒",
    鳇: "鰉", 鳊: "鯿", 鳋: "鰠", 鳌: "鰲", 鳍: "鰭", 鳎: "鰨", 鳏: "鰥", 鳐: "鰩", 鳓: "鰳", 鳔: "鰾",
    鳕: "鱈", 鳖: "鱉", 鳗: "鰻", 鳘: "鰵", 鳙: "鱅", 鳜: "鱖", 鳝: "鱔", 鳞: "鱗", 鳟: "鱒", 鳢: "鱧",
    鸟: "鳥", 鸠: "鳩", 鸡: "雞", 鸢: "鳶", 鸣: "鳴", 鸥: "鷗", 鸦: "鴉", 鸧: "鶬", 鸨: "鴇", 鸩: "鴆",
    鸪: "鴣", 鸫: "鶇", 鸬: "鸕", 鸭: "鴨", 鸮: "鴞", 鸯: "鴦", 鸰: "鴒", 鸱: "鴟", 鸲: "鴝", 鸳: "鴛",
    鸴: "鷽", 鸵: "鴕", 鸶: "鷥", 鸷: "鷙", 鸸: "鴯", 鸹: "鴰", 鸺: "鵂", 鸻: "鴴", 鸼: "鵃", 鸽: "鴿",
    鸾: "鸞", 鸿: "鴻", 鹁: "鵓", 鹂: "鸝", 鹃: "鵑", 鹄: "鵠", 鹅: "鵝", 鹆: "鵒", 鹇: "鷳", 鹈: "鵜",
    鹉: "鵡", 鹊: "鵲", 鹋: "鶓", 鹌: "鵪", 鹍: "鵾", 鹎: "鵯", 鹏: "鵬", 鹐: "鵮", 鹑: "鶉", 鹒: "鶊",
    鹓: "鵷", 鹔: "鷫", 鹕: "鶘", 鹖: "鶡", 鹗: "鶚", 鹘: "鶻", 鹚: "鶿", 鹛: "鶥", 鹜: "鶩", 鹞: "鷂",
    鹟: "鶲", 鹠: "鶹", 鹡: "鶺", 鹢: "鷁", 鹣: "鶼", 鹤: "鶴", 鹥: "鷖", 鹦: "鸚", 鹧: "鷓", 鹨: "鷚",
    鹩: "鷯", 鹪: "鷦", 鹫: "鷲", 鹬: "鷸", 鹭: "鷺", 鹮: "鹮", 鹯: "鸇", 鹰: "鷹", 鹱: "鸌", 鹲: "鸏",
    鹳: "鸛", 鹴: "鸘", 鹾: "鹺", 麦: "麥", 麸: "麩", 黄: "黃", 黉: "黌", 黡: "黶", 黩: "黷", 黪: "黲",
    黾: "黽", 鼋: "黿", 鼍: "鼉", 鼹: "鼴", 齐: "齊", 齑: "齏", 齿: "齒", 龀: "齔", 龁: "齕", 龂: "齗",
    龃: "齟", 龄: "齡", 龅: "齙", 龆: "齠", 龇: "齜", 龈: "齦", 龉: "齬", 龊: "齪", 龋: "齲", 龌: "齷",
    龙: "龍", 龚: "龔", 龛: "龕"
  };
  const reverseMap = Object.fromEntries(Object.entries(map).map(([simple, traditional]) => [traditional, simple]));
  return Array.from(text).map((char) => reverseMap[char] || char).join("");
}

function drawRotatedImage(image, x, y, width, height) {
  ctx.save();
  ctx.translate(canvas.width - y - height, x);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "#403d38";
  ctx.fillRect(0, 0, width, height);
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  drawImageCover(image, 0, 0, width, height);
  ctx.restore();
}

function drawRotatedLabel(text, x, y, width, height, fontSize) {
  ctx.save();
  ctx.translate(canvas.width - y - height, x);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(-2, -2, width + 8, height + 8);
  ctx.fillStyle = "#111";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const size = fitUprightTextSize(text, width, fontSize, "Impact, Arial Black, sans-serif", 14);
  ctx.font = `700 ${size}px Impact, Arial Black, sans-serif`;
  wrapLatinText(text, 0, 0, width, Math.round(size * 1.1));
  ctx.restore();
}

function drawCircularImage(image, x, y, size) {
  ctx.save();
  ctx.fillStyle = "#f6f6f6";
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();
  drawImageCover(image, x + 8, y + 8, size - 16, size - 16);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "#f6f6f6";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFramedImage(image, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = "#f8f8f8";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);
  ctx.beginPath();
  ctx.rect(x + 5, y + 5, width - 10, height - 10);
  ctx.clip();
  drawImageCover(image, x + 5, y + 5, width - 10, height - 10);
  ctx.restore();
}

function drawImageCover(image, x, y, width, height) {
  const sourceRatio = (image.naturalWidth || image.width) / (image.naturalHeight || image.height);
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth || image.width;
  let sh = image.naturalHeight || image.height;
  if (sourceRatio > targetRatio) {
    sw = sh * targetRatio;
    sx = ((image.naturalWidth || image.width) - sw) / 2;
  } else {
    sh = sw / targetRatio;
    sy = ((image.naturalHeight || image.height) - sh) / 2;
  }
  ctx.save();
  ctx.filter = "grayscale(1) contrast(1.18)";
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  ctx.restore();
}

function drawBadgeName() {
  const text = state.badgeName.trim() || "Name";
  ctx.save();
  ctx.translate(108, 610);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "#f8f8f8";
  ctx.fillRect(-8, -31, 150, 45);
  ctx.fillStyle = "#2c2c2c";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const fontSize = fitTextSize(text, 134, 28, "Georgia, serif", 18);
  ctx.font = `italic ${fontSize}px Georgia, serif`;
  ctx.fillText(text, 68, -9);
  ctx.fillRect(8, 11, 122, 3);
  ctx.restore();
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

function drawQuotePreview() {
  ctx.fillStyle = "#f4f4f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawQuoteFrame();
  if (state.quoteStyle === "signed") drawSignedQuote();
  else drawPlainQuote();
}

function drawQuoteFrame() {
  ctx.save();
  ctx.strokeStyle = "#c4c4bf";
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 32, 380, 710);
  ctx.strokeStyle = "#d8d8d3";
  ctx.lineWidth = 1;
  ctx.strokeRect(68, 52, 344, 670);
  ctx.restore();
}

function drawPlainQuote() {
  const chars = Array.from(limitChineseChars(toSimplified(state.quoteText), 24));
  const rows = chunkChars(chars, 4).slice(0, 6);
  ctx.save();
  ctx.fillStyle = "#5e5e5a";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = "500 41px STSong, Songti SC, serif";
  rows.forEach((row, index) => {
    ctx.fillText(row.join(""), 86, 112 + index * 76);
  });
  ctx.restore();
}

function drawSignedQuote() {
  const chars = Array.from(limitChineseChars(toSimplified(state.quoteText), 35));
  const rows = chunkChars(chars, 5).slice(0, 7);
  ctx.save();
  ctx.fillStyle = "#343434";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = "400 34px STSong, Songti SC, serif";
  rows.forEach((row, index) => {
    ctx.fillText(row.join(""), 108, 224 + index * 52);
  });
  ctx.font = "400 21px STSong, Songti SC, serif";
  ctx.textAlign = "right";
  ctx.fillText(`——${toSimplified(state.quoteAuthor || "")}`, 368, 604);
  ctx.font = "500 14px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("CLOSED | 伴你营业", 92, 126);
  ctx.restore();
}

function drawBankCardPreview() {
  const card = { x: 0, y: 0, width: canvas.width, height: canvas.height, radius: 0 };
  ctx.save();
  if (state.bankBackground) {
    ctx.filter = "grayscale(1) contrast(1.05)";
    drawImageCover(state.bankBackground, card.x, card.y, card.width, card.height);
  } else {
    const gradient = ctx.createLinearGradient(card.x, card.y, card.x + card.width, card.y + card.height);
    gradient.addColorStop(0, "#d8d8d4");
    gradient.addColorStop(0.45, "#9d9f99");
    gradient.addColorStop(1, "#ededeb");
    ctx.fillStyle = gradient;
    ctx.fillRect(card.x, card.y, card.width, card.height);
    drawBankCardTexture(card);
  }
  ctx.filter = "none";
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fillRect(card.x, card.y, card.width, card.height);
  ctx.restore();

  const logoRightMargin = 96;
  const alignedY = 72;
  drawBookBankLogo(card.x + card.width - 96, alignedY);
  drawBankChip(card.x + logoRightMargin + 78, alignedY);
  drawBookUnion(card.x + logoRightMargin + 82, card.y + card.height - 178);
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBankCardTexture(card) {
  ctx.save();
  ctx.strokeStyle = "rgba(17,17,17,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 38; i += 1) {
    const x = card.x + 16 + ((i * 47) % (card.width - 32));
    const y = card.y + 20 + ((i * 73) % (card.height - 40));
    ctx.beginPath();
    ctx.arc(x, y, 18 + (i % 5) * 3, 0.2, Math.PI * 1.35);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBookBankLogo(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.88;
  ctx.font = "800 28px Inter, sans-serif";
  ctx.fillText("图书银行", 0, 0);
  ctx.font = "700 22px Inter, sans-serif";
  ctx.fillText("BOOK BANK", 0, 30);
  ctx.font = "500 18px Inter, sans-serif";
  ctx.fillText("Debit Card", 0, 58);
  ctx.restore();
}

function drawBankChip(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "#c8c8c8";
  ctx.strokeStyle = "#3f3f3f";
  ctx.lineWidth = 2;
  const cx = 0;
  const cy = 0;
  roundedRect(cx, cy, 94, 78, 9);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#5a5a5a";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx + 18, cy + 2);
  ctx.lineTo(cx + 18, cy + 24);
  ctx.quadraticCurveTo(cx + 18, cy + 35, cx + 29, cy + 35);
  ctx.lineTo(cx + 65, cy + 35);
  ctx.quadraticCurveTo(cx + 76, cy + 35, cx + 76, cy + 24);
  ctx.lineTo(cx + 76, cy + 2);
  ctx.moveTo(cx + 18, cy + 76);
  ctx.lineTo(cx + 18, cy + 54);
  ctx.quadraticCurveTo(cx + 18, cy + 43, cx + 29, cy + 43);
  ctx.lineTo(cx + 65, cy + 43);
  ctx.quadraticCurveTo(cx + 76, cy + 43, cx + 76, cy + 54);
  ctx.lineTo(cx + 76, cy + 76);
  ctx.moveTo(cx, cy + 24);
  ctx.lineTo(cx + 18, cy + 24);
  ctx.moveTo(cx, cy + 54);
  ctx.lineTo(cx + 18, cy + 54);
  ctx.moveTo(cx + 76, cy + 24);
  ctx.lineTo(cx + 94, cy + 24);
  ctx.moveTo(cx + 76, cy + 54);
  ctx.lineTo(cx + 94, cy + 54);
  ctx.moveTo(cx + 38, cy);
  ctx.lineTo(cx + 38, cy + 26);
  ctx.moveTo(cx + 56, cy);
  ctx.lineTo(cx + 56, cy + 26);
  ctx.moveTo(cx + 38, cy + 52);
  ctx.lineTo(cx + 38, cy + 78);
  ctx.moveTo(cx + 56, cy + 52);
  ctx.lineTo(cx + 56, cy + 78);
  ctx.stroke();
  ctx.restore();
}

function drawBookUnion(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 2);
  const gradient = ctx.createLinearGradient(0, 0, 128, 82);
  gradient.addColorStop(0, "#e8e8e2");
  gradient.addColorStop(0.42, "#b5b5ad");
  gradient.addColorStop(1, "#757575");
  ctx.fillStyle = gradient;
  roundedRect(0, 0, 128, 82, 10);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "900 italic 24px Inter, sans-serif";
  ctx.fillText("BookPay", 24, 30);
  ctx.font = "900 29px Inter, sans-serif";
  ctx.fillText("书联", 42, 63);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 8);
  ctx.lineTo(10, 72);
  ctx.moveTo(58, 7);
  ctx.lineTo(44, 75);
  ctx.stroke();
  ctx.restore();
}

function chunkChars(chars, size) {
  const rows = [];
  for (let i = 0; i < chars.length; i += size) rows.push(chars.slice(i, i + size));
  return rows;
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

function fitTextSize(text, maxWidth, startSize, family, minSize) {
  for (let size = startSize; size >= minSize; size -= 1) {
    ctx.font = `italic ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minSize;
}

function fitUprightTextSize(text, maxWidth, startSize, family, minSize) {
  for (let size = startSize; size >= minSize; size -= 1) {
    ctx.font = `700 ${size}px ${family}`;
    const longest = text.split(/\s+/).reduce((max, word) => Math.max(max, ctx.measureText(word).width), 0);
    if (longest <= maxWidth) return size;
  }
  return minSize;
}

function wrapLatinText(text, x, y, maxWidth, lineHeight) {
  const words = text.trim().split(/\s+/);
  let line = "";
  words.forEach((word, index) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = next;
    }
    if (index === words.length - 1) ctx.fillText(line, x, y);
  });
}

function renderCanvas() {
  if (state.templateId === "watermark-cover") {
    drawTransparentCoverPreview();
    return;
  }
  setCanvasSize(480, 800);
  if (state.templateId === "work-badge") drawBadgePreview();
  if (state.templateId === "calligraphy-card") drawCalligraphyPreview();
  if (state.templateId === "bank-card") drawBankCardPreview();
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

function exportCanvasPng() {
  renderCanvas();
  const link = document.createElement("a");
  link.download = `${state.templateId}-480x800.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  showToast("已导出 PNG");
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

function bindTextarea(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", () => {
    state[key] = el.value;
    renderCanvas();
  });
}

function bindLimitedText(id, key, maxChars) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", () => {
    const limited = limitChineseChars(el.value, maxChars);
    if (el.value !== limited) el.value = limited;
    state[key] = limited;
    renderCanvas();
  });
}

function limitChineseChars(value, maxChars) {
  return Array.from(value.replace(/\s+/g, "")).slice(0, maxChars).join("");
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

function renderBadgePanel() {
  if (state.badgeType === "shield") {
    panel.innerHTML = `
      <div class="text-grid">
        <div class="field">
          <label>姓名</label>
          <input id="shieldNameInput" value="${state.shieldName}" />
        </div>
        <div class="field">
          <label>出生年月</label>
          <input id="shieldBirthInput" value="${state.shieldBirth}" />
        </div>
        <div class="field">
          <label>发卡日期</label>
          <input id="shieldIssueInput" value="${state.shieldIssue}" />
        </div>
        <div class="field">
          <label>到期日期</label>
          <input id="shieldExpireInput" value="${state.shieldExpire}" />
        </div>
        <div class="field wide-field">
          <label>序列号</label>
          <input id="shieldSerialInput" value="${state.shieldSerial}" />
        </div>
      </div>
      <div class="upload-grid compact single-upload">
        <button data-upload-target="shieldPhoto">上传照片</button>
      </div>
    `;
    bindText("shieldNameInput", "shieldName");
    bindText("shieldBirthInput", "shieldBirth");
    bindText("shieldIssueInput", "shieldIssue");
    bindText("shieldExpireInput", "shieldExpire");
    bindText("shieldSerialInput", "shieldSerial");
    bindBadgeUploadButtons();
    return;
  }

  panel.innerHTML = `
    <div class="field">
      <label>姓名</label>
      <input id="badgeNameInput" value="${state.badgeName}" />
    </div>
    <div class="upload-grid compact">
      <button data-upload-target="avatar">上传头像</button>
      <button data-upload-target="logo">上传公司图标</button>
    </div>
  `;
  bindText("badgeNameInput", "badgeName");
  bindBadgeUploadButtons();
}

function renderCalligraphyPanel() {
  panel.innerHTML = `
    <div class="text-grid">
      <div class="field">
        <label>上句</label>
        <input id="calligraphyTopInput" maxlength="7" value="${state.calligraphyTop}" />
      </div>
      <div class="field">
        <label>下句</label>
        <input id="calligraphyBottomInput" maxlength="7" value="${state.calligraphyBottom}" />
      </div>
    </div>
  `;
  bindLimitedText("calligraphyTopInput", "calligraphyTop", 7);
  bindLimitedText("calligraphyBottomInput", "calligraphyBottom", 7);
}

function renderQuotePanel() {
  const maxChars = state.quoteStyle === "signed" ? 35 : 24;
  state.quoteText = limitChineseChars(state.quoteText, maxChars);
  panel.innerHTML = `
    <div class="field">
      <label>文字内容</label>
      <textarea id="quoteTextInput" rows="3" maxlength="${maxChars}">${state.quoteText}</textarea>
    </div>
    ${state.quoteStyle === "signed" ? `
      <div class="field quote-author-field">
        <label>落款</label>
        <input id="quoteAuthorInput" value="${state.quoteAuthor}" />
      </div>
    ` : ""}
  `;
  bindLimitedTextarea("quoteTextInput", "quoteText", maxChars);
  bindText("quoteAuthorInput", "quoteAuthor");
}

function renderBankPanel() {
  panel.innerHTML = `
    <div class="upload-grid compact single-upload">
      <button data-upload-target="bankBackground">${state.bankBackground ? "更换背景" : "上传背景"}</button>
    </div>
  `;
  bindBadgeUploadButtons();
}

function bindLimitedTextarea(id, key, maxChars) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", () => {
    const limited = limitChineseChars(el.value, maxChars);
    if (el.value !== limited) el.value = limited;
    state[key] = limited;
    renderCanvas();
  });
}

function bindBadgeUploadButtons() {
  document.querySelectorAll("[data-upload-target]").forEach((button) => {
    button.addEventListener("click", () => {
      state.uploadTarget = button.dataset.uploadTarget;
      input.click();
    });
  });
}

function renderPanel() {
  if (state.templateId === "watermark-cover") renderWatermarkPanel();
  else if (state.templateId === "work-badge") renderBadgePanel();
  else if (state.templateId === "calligraphy-card") renderCalligraphyPanel();
  else if (state.templateId === "bank-card") renderBankPanel();
  else renderGenericPanel();
  updateUploadButtonLabel();
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

pickImageButton.addEventListener("click", () => {
  if (state.templateId === "work-badge" && state.uploadTarget === "main") state.uploadTarget = "avatar";
  input.click();
});
input.addEventListener("change", () => {
  const file = input.files?.[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    if (state.templateId === "bank-card") {
      state.bankBackground = img;
      state.uploadTarget = "bankBackground";
      renderCanvas();
      renderPanel();
      showToast("银行卡背景已更新");
      input.value = "";
      return;
    }
    if (state.templateId === "work-badge") {
      if (state.badgeType === "shield") {
        state.shieldPhoto = img;
        state.uploadTarget = "shieldPhoto";
        showToast("照片已更新");
      } else if (state.uploadTarget === "logo") {
        state.badgeLogo = img;
        showToast("公司图标已更新");
      } else {
        state.badgeAvatar = img;
        state.uploadTarget = "avatar";
        showToast("头像已更新");
      }
      renderCanvas();
      renderPanel();
      input.value = "";
      return;
    }
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
    input.value = "";
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
  else exportCanvasPng();
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

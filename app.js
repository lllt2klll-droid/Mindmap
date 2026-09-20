/* MindMap Studio — engine */
const $ = (s) => document.querySelector(s);
const nodesEl = $('#nodes'), linksEl = $('#links');
const worldEl = $('#world'), viewportEl = $('#viewport');

const uid = () => 'n' + Math.random().toString(36).slice(2, 9);
function cleanNode(n) {
  const { _el, _x, _y, _w, _h, _bx, _by, ...rest } = n;
  return { ...rest, children: (n.children || []).map(cleanNode) };
}
const clone = (o) => cleanNode(o);
const cloneJSON = (o) => JSON.parse(JSON.stringify(cleanNode(o)));

function blankData() {
  return { id: uid(), text: 'Chủ đề trung tâm', shape: 'root', bg: '#e85454', color: '#ffffff', branchColor: '#e85454', branchWidth: 3, fontSize: 19, bold: true, italic: false, underline: false, font: "'Be Vietnam Pro',sans-serif", align: 'center', radius: 16, shadow: true, opacity: 100, children: [], _dx: 0, _dy: 0 };
}

function withDefaults(n) {
  n.font = n.font || "'Be Vietnam Pro',sans-serif";
  n.align = n.align || 'center';
  n.radius = (n.radius ?? 12);
  n.shadow = (n.shadow ?? true);
  n.opacity = (n.opacity ?? 100);
  n.underline = !!n.underline;
  (n.children || []).forEach(withDefaults);
  return n;
}

function sampleData() {
  // Giống hệt ảnh mẫu
  return {
    id: uid(), text: 'Phương pháp thực nghiệm\nkhoa học', shape: 'root',
    bg: '#e85454', color: '#ffffff', branchColor: '#e85454', branchWidth: 3.5,
    fontSize: 19, bold: true, children: [
      { id: uid(), text: 'Khái niệm', shape: 'pill', bg: '#fde8e9', color: '#1f2a37', branchColor: '#e85454', branchWidth: 3, fontSize: 15, bold: true, children: [], _dx: 0, _dy: 0 },
      { id: uid(), text: 'Vai trò', shape: 'pill', bg: '#fef3e6', color: '#1f2a37', branchColor: '#f97316', branchWidth: 3, fontSize: 15, bold: true, children: [], _dx: 0, _dy: 0 },
      {
        id: uid(), text: 'Đặc điểm', shape: 'pill', bg: '#fff8cc', color: '#1f2a37', branchColor: '#eab308', branchWidth: 3, fontSize: 15, bold: true, children: [
          { id: uid(), text: 'Xuất phát từ giả thuyết', shape: 'underline', bg: '#ffffff', color: '#1f2a37', branchColor: '#eab308', branchWidth: 2.5, fontSize: 14, children: [], _dx: 0, _dy: 0 },
          { id: uid(), text: 'Có kế hoạch, chính xác và có kiểm soát', shape: 'underline', bg: '#ffffff', color: '#1f2a37', branchColor: '#eab308', branchWidth: 2.5, fontSize: 14, children: [], _dx: 0, _dy: 0 },
          { id: uid(), text: 'Đối tượng thực nghiệm được chia làm\nnhóm thực nghiệm và nhóm đối chứng', shape: 'underline', bg: '#ffffff', color: '#1f2a37', branchColor: '#eab308', branchWidth: 2.5, fontSize: 14, children: [], _dx: 0, _dy: 0 },
        ], _dx: 0, _dy: 0
      },
      {
        id: uid(), text: 'Quy trình thực hiện', shape: 'pill', bg: '#e6f7e8', color: '#1f2a37', branchColor: '#22c55e', branchWidth: 3, fontSize: 15, bold: true, children: [
          { id: uid(), text: 'Xây dựng giả thuyết', shape: 'underline', bg: '#ffffff', color: '#1f2a37', branchColor: '#22c55e', branchWidth: 2.5, fontSize: 14, children: [], _dx: 0, _dy: 0 },
          { id: uid(), text: 'Chọn đối tượng và phân nhóm', shape: 'underline', bg: '#ffffff', color: '#1f2a37', branchColor: '#22c55e', branchWidth: 2.5, fontSize: 14, children: [], _dx: 0, _dy: 0 },
          { id: uid(), text: 'Tiến hành thực nghiệm', shape: 'underline', bg: '#ffffff', color: '#1f2a37', branchColor: '#22c55e', branchWidth: 2.5, fontSize: 14, children: [], _dx: 0, _dy: 0 },
          { id: uid(), text: 'Xử lí kết quả', shape: 'underline', bg: '#ffffff', color: '#1f2a37', branchColor: '#22c55e', branchWidth: 2.5, fontSize: 14, children: [], _dx: 0, _dy: 0 },
          { id: uid(), text: 'Kết luận và ứng dụng', shape: 'underline', bg: '#ffffff', color: '#1f2a37', branchColor: '#22c55e', branchWidth: 2.5, fontSize: 14, children: [], _dx: 0, _dy: 0 },
        ], _dx: 0, _dy: 0
      },
    ], _dx: 0, _dy: 0
  };
}

// ---------- STATE ----------
let root = null;
let selectedId = null;
let zoom = 1, ox = 400, oy = 350;
let undoStack = [], redoStack = [];
const OFFSET = 5000; // offset cho svg khổng lồ
let settings = { bg: '#fafaf7', grid: 'dots', lineStyle: 'curve', direction: 'right', fileName: 'Sơ đồ tư duy của tôi' };

try {
  const saved = localStorage.getItem('mindmap-studio-v1');
  root = saved ? withDefaults(JSON.parse(saved)) : sampleData();
  const ss = localStorage.getItem('mindmap-settings-v1');
  if (ss) settings = { ...settings, ...JSON.parse(ss) };
} catch { root = sampleData(); }

function save() { try { localStorage.setItem('mindmap-studio-v1', JSON.stringify(cleanNode(root))); localStorage.setItem('mindmap-settings-v1', JSON.stringify(settings)); const fn = $('#fileName'); if (fn && document.title) document.title = (fn.value || 'MindMap') + ' — MindMap Studio'; } catch {} }
let toastTimer = null;
function toast(msg) {
  setStatus(msg);
  const t = $('#toast'); if (!t) return;
  t.innerText = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.hidden = true, 2200);
}

// Chủ đề 1-click kiểu Canva
const THEMES = [
  { name: 'Khoa học (mẫu ảnh)', colors: ['#e85454', '#f97316', '#eab308', '#22c55e'], bgs: ['#fde8e9', '#fef3e6', '#fff8cc', '#e6f7e8'] },
  { name: 'Tím Canva', colors: ['#7c3aed', '#ec4899', '#3b82f6', '#14b8a6'], bgs: ['#ede9fe', '#fce7f3', '#dbeafe', '#ccfbf1'] },
  { name: 'Đại dương', colors: ['#0284c7', '#0891b2', '#2563eb', '#4f46e5'], bgs: ['#e0f2fe', '#cffafe', '#dbeafe', '#e0e7ff'] },
  { name: 'Rừng xanh', colors: ['#15803d', '#65a30d', '#0d9488', '#ca8a04'], bgs: ['#dcfce7', '#ecfccb', '#ccfbf1', '#fef9c3'] },
  { name: 'Hoàng hôn', colors: ['#ea580c', '#e11d48', '#9333ea', '#db2777'], bgs: ['#ffedd5', '#ffe4e6', '#f3e8ff', '#fce7f3'] },
  { name: 'Mono tinh tế', colors: ['#111827', '#4b5563', '#6b7280', '#9ca3af'], bgs: ['#f3f4f6', '#e5e7eb', '#f9fafb', '#f3f4f6'] },
];
const ICONS = ['💡','🎯','⭐','🔥','✅','📌','📚','🧪','🔬','📊','💻','🎨','🚀','🌱','❤️','⚠️','❓','🕒','💰','🏆','📝','🔑','🌍','🎉'];
function applyTheme(i) {
  const t = THEMES[i]; if (!t || !root.children) return;
  pushHistory();
  root.children.forEach((c, k) => {
    const col = t.colors[k % t.colors.length], bg = t.bgs[k % t.bgs.length];
    c.branchColor = col;
    if (c.shape === 'pill') c.bg = bg;
    (c.children || []).forEach(g => { g.branchColor = col; });
  });
  fullRender();
  toast('Đã áp dụng theme: ' + t.name);
}
function pushHistory() {
  undoStack.push(cloneJSON(root));
  if (undoStack.length > 80) undoStack.shift();
  redoStack = [];
}
function undo() {
  if (!undoStack.length) return toast('Không còn gì để Undo');
  redoStack.push(cloneJSON(root));
  root = undoStack.pop();
  selectedId = null; fullRender(); syncPanel();
}
function redo() {
  if (!redoStack.length) return toast('Không còn gì để Redo');
  undoStack.push(cloneJSON(root));
  root = redoStack.pop();
  fullRender(); syncPanel();
}

// ---------- TREE HELPERS ----------
function findNode(id, node = root, parent = null) {
  if (node.id === id) return { node, parent };
  for (const c of (node.children || [])) {
    const r = findNode(id, c, node);
    if (r) return r;
  }
  return null;
}
function countNodes(n = root) {
  return 1 + (n.children || []).reduce((a, c) => a + countNodes(c), 0);
}
function eachNode(n, fn, depth = 0) { fn(n, depth); (n.children || []).forEach(c => eachNode(c, fn, depth + 1)); }

// ---------- CLIPBOARD + REORDER HELPERS ----------
let clipboard = null; // {mode:'copy'|'cut', data, cutId}
function reassignIds(n) {
  n.id = uid();
  (n.children || []).forEach(reassignIds);
  return n;
}
function isDescendant(ancestor, maybeDescId) {
  if (ancestor.id === maybeDescId) return true;
  for (const c of (ancestor.children || [])) {
    if (isDescendant(c, maybeDescId)) return true;
  }
  return false;
}
function moveSelected(dir) {
  // dir: -1 lên, +1 xuống
  if (!selectedId) return setStatus('Hãy chọn 1 node trước');
  const f = findNode(selectedId);
  if (!f || !f.parent) return setStatus('Node trung tâm không đổi thứ tự được');
  const arr = f.parent.children;
  const i = arr.findIndex(c => c.id === selectedId);
  const j = i + dir;
  if (j < 0 || j >= arr.length) return setStatus('Đã ở đầu/cuối rồi');
  pushHistory();
  [arr[i], arr[j]] = [arr[j], arr[i]];
  arr.forEach(n => { n._dx = 0; n._dy = 0; });
  fullRender(); syncPanel();
  setStatus(dir < 0 ? 'Đã đưa lên trên ▲' : 'Đã đưa xuống dưới ▼');
}
function moveTopBottom(toTop) {
  if (!selectedId) return setStatus('Hãy chọn 1 node trước');
  const f = findNode(selectedId);
  if (!f || !f.parent) return;
  const arr = f.parent.children;
  const i = arr.findIndex(c => c.id === selectedId);
  if ((toTop && i === 0) || (!toTop && i === arr.length - 1)) return;
  pushHistory();
  const [n] = arr.splice(i, 1);
  if (toTop) arr.unshift(n); else arr.push(n);
  arr.forEach(x => { x._dx = 0; x._dy = 0; });
  fullRender(); syncPanel();
}
function duplicateSelected() {
  if (!selectedId) return setStatus('Hãy chọn 1 node trước');
  const f = findNode(selectedId);
  if (!f || !f.parent) return setStatus('Không nhân bản node trung tâm');
  pushHistory();
  const copy = cloneJSON(f.node);
  reassignIds(copy);
  copy.text += ' (copy)';
  copy._dx = 0; copy._dy = 0;
  const idx = f.parent.children.findIndex(c => c.id === selectedId);
  f.parent.children.splice(idx + 1, 0, copy);
  selectedId = copy.id;
  fullRender(); syncPanel();
  setStatus('Đã nhân bản ⧉');
}
function copySelected() {
  if (!selectedId) return setStatus('Hãy chọn 1 node trước');
  const f = findNode(selectedId);
  if (!f) return;
  clipboard = { mode: 'copy', data: cloneJSON(f.node) };
  setStatus('Đã copy 📋 — chọn node cha rồi Ctrl+V để dán');
}
function cutSelected() {
  if (!selectedId) return setStatus('Hãy chọn 1 node trước');
  const f = findNode(selectedId);
  if (!f || !f.parent) return setStatus('Không cut node trung tâm');
  clipboard = { mode: 'cut', data: cloneJSON(f.node), cutId: selectedId };
  pushHistory();
  f.parent.children = f.parent.children.filter(c => c.id !== selectedId);
  selectedId = f.parent.id;
  fullRender(); syncPanel();
  setStatus('Đã cut ✂ — chọn node cha rồi Ctrl+V để dán');
}
function pasteToSelected() {
  if (!clipboard) return setStatus('Clipboard trống — hãy Copy trước');
  const target = selectedId ? findNode(selectedId) : { node: root };
  if (!target) return;
  // không dán vào chính con cháu của nó
  if (clipboard.mode === 'cut' && isDescendant(clipboard.data, target.node.id)) {
    return setStatus('Không dán vào chính nhánh con của nó');
  }
  pushHistory();
  const fresh = cloneJSON(clipboard.data);
  if (clipboard.mode === 'copy') reassignIds(fresh);
  else {
    // cut: giữ id gốc (đã xóa khỏi chỗ cũ), chỉ reset offset
    const fixOffset = (n) => { n._dx = 0; n._dy = 0; (n.children || []).forEach(fixOffset); };
    fixOffset(fresh);
  }
  if (target.node.collapsed) target.node.collapsed = false;
  target.node.children = target.node.children || [];
  target.node.children.push(fresh);
  selectedId = fresh.id;
  if (clipboard.mode === 'cut') clipboard = null;
  else clipboard = { mode: 'copy', data: cloneJSON(fresh) };
  fullRender(); syncPanel();
  setStatus('Đã dán 📌');
}

// ---------- RENDER ----------
let searchQuery = '';
function fullRender() {
  nodesEl.innerHTML = '';
  // tạo div
  eachNode(root, (n) => {
    withDefaults(n);
    const d = document.createElement('div');
    d.className = 'node ' + (n.shape || 'pill');
    d.dataset.id = n.id;
    d.style.background = n.shape === 'underline' ? 'transparent' : (n.bg || '#fff');
    d.style.color = n.color || '#1f2a37';
    d.style.fontSize = (n.fontSize || 15) + 'px';
    d.style.fontWeight = n.bold ? '700' : '400';
    d.style.fontStyle = n.italic ? 'italic' : 'normal';
    d.style.textDecoration = n.underline ? 'underline' : 'none';
    d.style.fontFamily = n.font || "'Be Vietnam Pro',sans-serif";
    d.style.textAlign = n.align || 'center';
    d.style.opacity = (n.opacity ?? 100) / 100;
    if (n.shape === 'pill' || n.shape === 'box' || n.shape === 'ellipse' || n.shape === 'root') {
      d.style.borderRadius = n.shape === 'ellipse' ? '999px' : ((n.radius ?? 12) + 'px');
    }
    if (n.shadow === false) d.style.boxShadow = 'none';
    else if (n.shape === 'pill' || n.shape === 'box' || n.shape === 'ellipse') d.style.boxShadow = '0 4px 16px rgba(28,35,51,.10)';
    if (n.shape === 'box' || n.shape === 'underline') {
      d.style.borderColor = n.branchColor || '#e85454';
    }
    if (n.shape === 'underline') d.style.borderBottomColor = n.branchColor;
    d.innerText = n.text;
    if (searchQuery && !String(n.text).toLowerCase().includes(searchQuery)) d.style.opacity = 0.25;
    if (searchQuery && String(n.text).toLowerCase().includes(searchQuery)) d.style.boxShadow = '0 0 0 3px #f59e0b';
    if (n.id === selectedId) d.classList.add('selected');
    if (n.collapsed && n.children?.length) {
      const b = document.createElement('span');
      b.className = 'collapse-badge'; b.innerText = '+';
      d.appendChild(b);
    }
    // events
    d.addEventListener('click', (e) => { e.stopPropagation(); selectedId = n.id; syncPanel(); refreshSelection(); updateQuickBar(); });
    d.addEventListener('dblclick', (e) => { e.stopPropagation(); startEdit(d, n); });
    d.addEventListener('mousedown', (e) => startDragNode(e, n));
    d.addEventListener('contextmenu', (e) => nodeCtxMenu(e, n.id));
    nodesEl.appendChild(d);
    n._el = d;
  });
  // đo kích thước
  eachNode(root, (n) => {
    n._w = n._el.offsetWidth || 120;
    n._h = n._el.offsetHeight || 38;
  });
  layoutTree();
  applyTransform();
  drawLinks();
  $('#nodeCount').innerText = countNodes() + ' node';
  save();
}
function refreshSelection() {
  document.querySelectorAll('.node').forEach(el => el.classList.toggle('selected', el.dataset.id === selectedId));
  updateQuickBar();
}
function subtreeHeight(n) {
  if (!n.children?.length || n.collapsed) return (n._h || 40) + 18;
  return n.children.reduce((a, c) => a + subtreeHeight(c), 0);
}
function subtreeWidth(n) {
  if (!n.children?.length || n.collapsed) return (n._w || 120) + 30;
  return Math.max((n._w || 120) + 30, n.children.reduce((a, c) => a + subtreeWidth(c), 0));
}
function layoutTree() {
  root._x = 0; root._y = 0;
  const dir = settings.direction || 'right';
  if (dir === 'down') layoutDown(root);
  else layoutChildren(root, dir);
  function sideOf(child) {
    if (dir !== 'both') return 1;
    const idx = root.children.indexOf(child);
    // xen kẽ phải/trái cho cân
    return idx % 2 === 0 ? 1 : -1;
  }
  function layoutChildren(parent, d, side = 1) {
    if (!parent.children?.length || parent.collapsed) return;
    const gapX = parent === root ? 200 : 110;
    const total = parent.children.reduce((a, c) => a + subtreeHeight(c), 0);
    let y = parent._y - total / 2;
    for (const c of parent.children) {
      const h = subtreeHeight(c);
      let s = side;
      if (parent === root) s = sideOf(c);
      const cx = parent._x + s * (parent._w / 2 + gapX + c._w / 2);
      const cy = y + h / 2;
      c._side = s;
      c._x = cx + (c._dx || 0);
      c._y = cy + (c._dy || 0);
      c._bx = cx; c._by = cy;
      y += h;
      layoutChildren(c, d, s);
    }
    if (parent === root && d === 'right' && parent.children.length >= 4) {
      parent.children[0]._y -= 40; parent.children[0]._by -= 40;
      const last = parent.children[parent.children.length - 1];
      last._y += 30; last._by += 30;
      relayoutBranch(parent.children[0], 1); relayoutBranch(last, 1);
    }
  }
  function relayoutBranch(parent, s) {
    if (!parent.children?.length || parent.collapsed) return;
    const total = parent.children.reduce((a, c) => a + subtreeHeight(c), 0);
    let y = parent._y - total / 2;
    for (const c of parent.children) {
      const h = subtreeHeight(c);
      c._side = s;
      c._bx = parent._x + s * (parent._w / 2 + 110 + c._w / 2);
      c._by = y + h / 2;
      c._x = c._bx + (c._dx || 0); c._y = c._by + (c._dy || 0);
      y += h; relayoutBranch(c, s);
    }
  }
  function layoutDown(parent) {
    // root trên cùng, con xếp ngang bên dưới
    if (!parent.children?.length || parent.collapsed) { root._x += (root._dx || 0); root._y += (root._dy || 0); return; }
    const gapY = 110;
    const totalW = parent.children.reduce((a, c) => a + subtreeWidth(c), 0);
    let x = parent._x - totalW / 2;
    for (const c of parent.children) {
      const w = subtreeWidth(c);
      const cx = x + w / 2;
      const cy = parent._y + parent._h / 2 + gapY + c._h / 2;
      c._side = 0; c._down = true;
      c._x = cx + (c._dx || 0); c._y = cy + (c._dy || 0);
      c._bx = cx; c._by = cy;
      x += w;
      layoutDownChildren(c);
    }
    root._x += (root._dx || 0); root._y += (root._dy || 0);
  }
  function layoutDownChildren(parent) {
    if (!parent.children?.length || parent.collapsed) return;
    const gapY = 80;
    const totalW = parent.children.reduce((a, c) => a + subtreeWidth(c), 0);
    let x = parent._x - totalW / 2;
    for (const c of parent.children) {
      const w = subtreeWidth(c);
      const cx = x + w / 2;
      const cy = parent._y + parent._h / 2 + gapY + c._h / 2;
      c._side = 0; c._down = true;
      c._x = cx + (c._dx || 0); c._y = cy + (c._dy || 0);
      c._bx = cx; c._by = cy;
      x += w;
      layoutDownChildren(c);
    }
  }
  if (dir !== 'down') { root._x += (root._dx || 0); root._y += (root._dy || 0); }
  // reset flag down cho mode khác
  if (dir !== 'down') eachNode(root, n => { n._down = false; });
}
function applyTransform() {
  worldEl.style.transform = `translate(${ox}px,${oy}px) scale(${zoom})`;
  eachNode(root, (n) => {
    if (!n._el) return;
    n._el.style.left = n._x + 'px';
    n._el.style.top = n._y + 'px';
  });
  const zl = $('#zoomLabel'); if (zl) zl.innerText = Math.round(zoom * 100) + '%';
  const zs = $('#zoomSlider'); if (zs && document.activeElement !== zs) zs.value = Math.round(zoom * 100);
  updateQuickBar();
  applyCanvasStyle();
}
function applyCanvasStyle() {
  viewportEl.style.setProperty('--canvas-bg', settings.bg || '#fafaf7');
  viewportEl.classList.remove('grid-dots', 'grid-lines', 'grid-none');
  viewportEl.classList.add(settings.grid === 'lines' ? 'grid-lines' : settings.grid === 'none' ? 'grid-none' : 'grid-dots');
  const cb = $('#canvasBg'); if (cb && cb.value.toLowerCase() !== String(settings.bg).toLowerCase()) cb.value = settings.bg;
  const gs = $('#gridStyle'); if (gs && gs.value !== settings.grid) gs.value = settings.grid;
  const ls = $('#lineStyle'); if (ls && ls.value !== settings.lineStyle) ls.value = settings.lineStyle;
  ['dirRight', 'dirBoth', 'dirDown'].forEach(id => { const b = document.getElementById(id); if (b) b.classList.remove('active'); });
  const map = { right: 'dirRight', both: 'dirBoth', down: 'dirDown' };
  const ab = document.getElementById(map[settings.direction] || 'dirRight'); if (ab) ab.classList.add('active');
}
function updateQuickBar() {
  const q = $('#quickBar'); if (!q) return;
  const f = selectedId ? findNode(selectedId) : null;
  if (!f || !f.node._el) { q.hidden = true; return; }
  const rect = viewportEl.getBoundingClientRect();
  const sx = (f.node._x * zoom + ox) + rect.left;
  const sy = (f.node._y * zoom + oy) + rect.top - (f.node._h * zoom) / 2;
  const wrap = $('#canvasWrap').getBoundingClientRect();
  q.hidden = false;
  q.style.left = (sx - wrap.left) + 'px';
  q.style.top = (sy - wrap.top) + 'px';
}
function linkPathD(sx, sy, ex, ey, style) {
  const o = OFFSET;
  if (style === 'straight') return `M ${sx + o} ${sy + o} L ${ex + o} ${ey + o}`;
  if (style === 'elbow') {
    const mx = (sx + ex) / 2;
    return `M ${sx + o} ${sy + o} L ${mx + o} ${sy + o} L ${mx + o} ${ey + o} L ${ex + o} ${ey + o}`;
  }
  const dx = Math.max(50, Math.abs(ex - sx) / 2) * (ex >= sx ? 1 : -1);
  return `M ${sx + o} ${sy + o} C ${sx + dx + o} ${sy + o}, ${ex - dx + o} ${ey + o}, ${ex + o} ${ey + o}`;
}
function drawLinks() {
  linksEl.innerHTML = '';
  const NS = 'http://www.w3.org/2000/svg';
  const style = settings.lineStyle || 'curve';
  function endpoints(parent, child) {
    if (child._down || settings.direction === 'down') {
      const sx = parent._x, sy = parent._y + parent._h / 2 - 2;
      const ex = child._x, ey = child._y - child._h / 2 + 2;
      if (style === 'straight') return { d: `M ${sx + OFFSET} ${sy + OFFSET} L ${ex + OFFSET} ${ey + OFFSET}`, sx, sy, ex, ey };
      if (style === 'elbow') return { d: `M ${sx + OFFSET} ${sy + OFFSET} L ${sx + OFFSET} ${(sy + ey) / 2 + OFFSET} L ${ex + OFFSET} ${(sy + ey) / 2 + OFFSET} L ${ex + OFFSET} ${ey + OFFSET}`, sx, sy, ex, ey };
      const dy = Math.max(40, (ey - sy) / 2);
      return { d: `M ${sx + OFFSET} ${sy + OFFSET} C ${sx + OFFSET} ${sy + dy + OFFSET}, ${ex + OFFSET} ${ey - dy + OFFSET}, ${ex + OFFSET} ${ey + OFFSET}`, sx, sy, ex, ey };
    }
    const s = child._side || 1;
    let sx, sy;
    if (parent === root && settings.direction === 'right') {
      if (child._y < parent._y - 60) { sx = parent._x + 30; sy = parent._y - parent._h / 2 + 4; }
      else if (child._y > parent._y + 60) { sx = parent._x + 30; sy = parent._y + parent._h / 2 - 4; }
      else { sx = parent._x + parent._w / 2; sy = parent._y; }
    } else { sx = parent._x + s * parent._w / 2; sy = parent._y; }
    const ex = child._x - s * (child._w / 2 + 4);
    const ey = child._y;
    return { d: linkPathD(sx, sy, ex, ey, style), sx, sy, ex, ey };
  }
  function path(parent, child) {
    const { d } = endpoints(parent, child);
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('stroke', child.branchColor || parent.branchColor || '#e85454');
    p.setAttribute('stroke-width', child.branchWidth || 2.5);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke-linecap', 'round');
    if (style === 'straight') p.setAttribute('stroke-linejoin', 'round');
    linksEl.appendChild(p);
    (child.children || []).forEach(c => { if (!child.collapsed) path(child, c); });
  }
  (root.children || []).forEach(c => path(root, c));
}

// ---------- EDIT / ADD / DELETE ----------
function startEdit(div, n) {
  const ta = document.createElement('textarea');
  ta.value = n.text;
  ta.rows = Math.min(5, String(n.text).split('\n').length + 1);
  ta.style.width = Math.max(200, n._w) + 'px';
  ta.style.fontFamily = n.font || 'inherit';
  ta.style.fontSize = (n.fontSize || 15) + 'px';
  ta.style.textAlign = n.align === 'left' ? 'left' : 'center';
  div.innerHTML = ''; div.appendChild(ta);
  const auto = () => { ta.style.height = 'auto'; ta.style.height = Math.min(180, ta.scrollHeight) + 'px'; };
  auto(); ta.addEventListener('input', auto);
  ta.focus(); ta.select();
  let finished = false;
  const done = (ok) => {
    if (finished) return; finished = true;
    if (ok) { pushHistory(); n.text = ta.value.trim() || 'Trống'; fullRender(); syncPanel(); toast('Đã sửa ✔'); }
    else fullRender();
  };
  ta.addEventListener('blur', () => done(true));
  ta.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); done(true); }
    if (e.key === 'Escape') done(false);
  });
  ta.addEventListener('mousedown', e => e.stopPropagation());
  ta.addEventListener('contextmenu', e => e.stopPropagation());
}
function addChild() {
  const f = selectedId ? findNode(selectedId) : { node: root };
  if (!f) return;
  pushHistory();
  const t = f.node;
  if (t.collapsed) t.collapsed = false;
  const depth = getDepth(t);
  const colors = ['#e85454', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
  const c = {
    id: uid(), text: 'Nhánh mới', shape: depth >= 1 ? 'underline' : 'pill',
    bg: '#ffffff', color: '#1f2a37',
    branchColor: t.branchColor || colors[depth % colors.length],
    branchWidth: depth >= 1 ? 2.5 : 3, fontSize: depth >= 1 ? 14 : 15,
    font: t.font || "'Be Vietnam Pro',sans-serif", align: 'center', radius: 12, shadow: true, opacity: 100,
    children: [], _dx: 0, _dy: 0
  };
  t.children = t.children || []; t.children.push(c);
  selectedId = c.id; fullRender(); syncPanel();
  toast('Đã thêm nhánh con — double-click để sửa');
  const nf = findNode(c.id);
  if (nf && nf.node._el) startEdit(nf.node._el, nf.node);
}
function addSibling() {
  if (!selectedId) return addChild();
  const f = findNode(selectedId);
  if (!f || !f.parent) return addChild();
  pushHistory();
  const c = { id: uid(), text: 'Nhánh mới', shape: f.node.shape, bg: f.node.bg, color: f.node.color, branchColor: f.node.branchColor, branchWidth: f.node.branchWidth, fontSize: f.node.fontSize, font: f.node.font, align: f.node.align, radius: f.node.radius, shadow: f.node.shadow, opacity: f.node.opacity, children: [], _dx: 0, _dy: 0 };
  f.parent.children.push(c);
  selectedId = c.id; fullRender(); syncPanel();
}
function deleteNode() {
  if (!selectedId) return setStatus('Hãy chọn 1 node trước khi xóa');
  const f = findNode(selectedId);
  if (!f || !f.parent) return setStatus('Không xóa được node trung tâm (hãy dùng Mới)');
  pushHistory();
  f.parent.children = f.parent.children.filter(c => c.id !== selectedId);
  selectedId = f.parent.id; fullRender(); syncPanel();
}
function getDepth(target, node = root, d = 0) {
  if (node === target) return d;
  for (const c of (node.children || [])) { const r = getDepth(target, c, d + 1); if (r !== -1) return r; }
  return -1;
}

// ---------- DRAG NODE (tự do + đổi thứ tự + chuyển nhánh) + PAN + ZOOM ----------
function worldFromClient(cx, cy) {
  const rect = viewportEl.getBoundingClientRect();
  return { x: (cx - rect.left - ox) / zoom, y: (cy - rect.top - oy) / zoom };
}
function clearDropHighlights() {
  document.querySelectorAll('.node.drop-target').forEach(el => el.classList.remove('drop-target'));
}
function startDragNode(e, n) {
  if (e.button !== 0) return;
  e.stopPropagation();
  const startX = e.clientX, startY = e.clientY;
  const origDx = n._dx || 0, origDy = n._dy || 0;
  let moved = false, pushed = false;
  let dropTarget = null;
  const mv = (ev) => {
    const dx = (ev.clientX - startX) / zoom, dy = (ev.clientY - startY) / zoom;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    if (!moved) return;
    if (!pushed) { pushHistory(); pushed = true; }
    let ndx = origDx + dx, ndy = origDy + dy;
    // SNAP tinh tế: hút vào trục cha / anh em khi gần (8px)
    const f0 = findNode(n.id);
    const gv = $('#snapGuideV'), gh = $('#snapGuideH');
    let snapV = false, snapH = false;
    if (f0 && f0.parent) {
      const baseX = n._bx, baseY = n._by;
      const curX = baseX + ndx, curY = baseY + ndy;
      if (Math.abs(ndx) < 9) { ndx = 0; snapV = true; }
      for (const s of f0.parent.children) {
        if (s.id === n.id) continue;
        if (Math.abs(curY - s._y) < 9) { ndy = s._y - baseY; snapH = true; break; }
      }
      if (Math.abs(curX - f0.parent._x) < 10 && settings.direction !== 'down') { /* hút trục dọc cha */ }
    }
    n._dx = ndx; n._dy = ndy;
    refreshBranchPositions();
    if (gv && gh) {
      if (snapV) { gv.hidden = false; gv.style.left = n._x + 'px'; } else gv.hidden = true;
      if (snapH) { gh.hidden = false; gh.style.top = n._y + 'px'; } else gh.hidden = true;
    }
    // tìm node đích để chuyển nhánh (trừ chính nó + con cháu của nó)
    const w = worldFromClient(ev.clientX, ev.clientY);
    dropTarget = null;
    if (n.id !== root.id) {
      let best = null, bestD = 1e9;
      eachNode(root, (m) => {
        if (m.id === n.id || isDescendant(n, m.id)) return;
        const d = Math.hypot(w.x - m._x, w.y - m._y);
        const r = Math.max(m._w, m._h) / 2 + 18;
        if (d < r && d < bestD) { bestD = d; best = m; }
      });
      dropTarget = best;
    }
    clearDropHighlights();
    if (dropTarget && dropTarget._el) dropTarget._el.classList.add('drop-target');
  };
  const up = (ev) => {
    document.removeEventListener('mousemove', mv);
    document.removeEventListener('mouseup', up);
    clearDropHighlights();
    const gv = $('#snapGuideV'), gh = $('#snapGuideH');
    if (gv) gv.hidden = true; if (gh) gh.hidden = true;
    if (!moved) { selectedId = n.id; syncPanel(); refreshSelection(); updateQuickBar(); hideCtx(); return; }
    // undo lần push thừa nếu không có thay đổi thực? giữ lại cho đơn giản
    if (dropTarget && dropTarget.id !== n.id) {
      // CHUYỂN NHÁNH: kéo sang node khác
      const from = findNode(n.id);
      const to = findNode(dropTarget.id);
      if (from && from.parent && to && !isDescendant(n, to.node.id)) {
        // history đã push ở trên (trước khi đổi _dx) -> hoàn tác offset trước
        undoStack[undoStack.length - 1] && null;
        // Xóa khỏi cha cũ (trên bản hiện tại đã bị lệch offset, lấy bản sạch từ history)
        // Đơn giản: dùng cây hiện tại
        from.parent.children = from.parent.children.filter(c => c.id !== n.id);
        n._dx = 0; n._dy = 0;
        const resetDeep = (m) => { (m.children || []).forEach(k => { k._dx = 0; k._dy = 0; resetDeep(k); }); };
        resetDeep(n);
        if (to.node.collapsed) to.node.collapsed = false;
        to.node.children = to.node.children || [];
        to.node.children.push(n);
        selectedId = n.id;
        fullRender(); syncPanel();
        setStatus(`Đã chuyển "${shortText(n.text)}" sang "${shortText(to.node.text)}" ✔`);
        save();
        return;
      }
    }
    // ĐỔI THỨ TỰ: nếu thả lên/xuống khác vị trí trong cùng cha
    const f = findNode(n.id);
    if (f && f.parent) {
      const sibs = f.parent.children;
      const oldIdx = sibs.findIndex(c => c.id === n.id);
      // xếp sibs (trừ dragged) theo _y hiện tại để tìm vị trí mới
      const others = sibs.filter(c => c.id !== n.id).slice().sort((a, b) => a._y - b._y);
      let newIdx = others.findIndex(c => n._y < c._y);
      if (newIdx === -1) newIdx = others.length;
      if (newIdx !== oldIdx) {
        // kiểm tra có thực sự đổi chỗ không (tránh reorder khi chỉ kéo nhẹ theo X)
        const movedY = Math.abs((ev.clientY - startY) / zoom);
        if (movedY > 24) {
          const [item] = sibs.splice(oldIdx, 1);
          sibs.splice(newIdx, 0, item);
          sibs.forEach(x => { x._dx = 0; x._dy = 0; });
          fullRender(); syncPanel();
          setStatus(`Đã đổi thứ tự: vị trí ${oldIdx + 1} → ${newIdx + 1} ✔`);
          save();
          return;
        }
      }
    }
    // còn lại: giữ di chuyển tự do
    selectedId = n.id; syncPanel(); refreshSelection();
    save();
    setStatus('Đã di chuyển tự do — nút ✨ Xếp tự động để gọn lại');
  };
  document.addEventListener('mousemove', mv);
  document.addEventListener('mouseup', up);
}
function shortText(t) { const s = String(t || '').split('\n')[0]; return s.length > 24 ? s.slice(0, 24) + '…' : s; }

function refreshBranchPositions() {
  // tính lại _x,_y từ _bx,_by + offset tay, rồi vẽ lại
  eachNode(root, (n) => {
    if (n === root) { n._x = (n._bx ?? 0) + (n._dx || 0); n._y = (n._by ?? 0) + (n._dy || 0); }
    else { n._x = n._bx + (n._dx || 0); n._y = n._by + (n._dy || 0); }
  });
  root._bx = 0; root._by = 0;
  // con của root nếu root bị kéo thì cũng phải dịch theo? Không — giữ độc lập cho đơn giản, nhưng dịch cả cây:
  applyTransform(); drawLinks();
}
// gán _bx/_by sau layout
const _origLayout = layoutTree;
// pan viewport
let panning = false, psx = 0, psy = 0, pox = 0, poy = 0;
viewportEl.addEventListener('mousedown', (e) => {
  if (e.target.closest('.node')) return;
  panning = true; psx = e.clientX; psy = e.clientY; pox = ox; poy = oy;
});
document.addEventListener('mousemove', (e) => {
  if (!panning) return;
  ox = pox + (e.clientX - psx); oy = poy + (e.clientY - psy);
  applyTransform();
});
document.addEventListener('mouseup', () => panning = false);
viewportEl.addEventListener('wheel', (e) => {
  e.preventDefault();
  const f = e.deltaY < 0 ? 1.1 : 0.9;
  const rect = viewportEl.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const wx = (mx - ox) / zoom, wy = (my - oy) / zoom;
  zoom = Math.min(2.5, Math.max(0.25, zoom * f));
  ox = mx - wx * zoom; oy = my - wy * zoom;
  applyTransform();
}, { passive: false });

// ---------- CONTEXT MENU (chuột phải) ----------
const ctxMenu = () => document.getElementById('ctxMenu');
function hideCtx() { const m = ctxMenu(); if (m) m.hidden = true; }
document.addEventListener('click', (e) => {
  const m = ctxMenu();
  if (m && !m.hidden && !m.contains(e.target)) hideCtx();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideCtx(); });
viewportEl.addEventListener('scroll', hideCtx, true);

function showCtx(x, y, sections) {
  const m = ctxMenu();
  m.innerHTML = '';
  sections.forEach(sec => {
    if (sec === 'sep') { const s = document.createElement('div'); s.className = 'ctx-sep'; m.appendChild(s); return; }
    if (sec.label) { const l = document.createElement('div'); l.className = 'ctx-label'; l.innerText = sec.label; m.appendChild(l); return; }
    if (sec.colors) {
      const wrap = document.createElement('div'); wrap.className = 'ctx-colors';
      sec.colors.forEach(c => {
        const d = document.createElement('div');
        d.className = 'color-dot'; d.style.background = c; d.title = c;
        d.onclick = () => { sec.onPick(c); hideCtx(); };
        wrap.appendChild(d);
      });
      m.appendChild(wrap); return;
    }
    const b = document.createElement('button');
    b.className = 'ctx-item' + (sec.danger ? ' danger' : '');
    b.disabled = !!sec.disabled;
    b.innerHTML = `<span>${sec.icon || ''}</span><span>${sec.text}</span>${sec.shortcut ? `<span class="ctx-shortcut">${sec.shortcut}</span>` : ''}`;
    b.onclick = () => { hideCtx(); sec.action && sec.action(); };
    m.appendChild(b);
  });
  m.hidden = false;
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, window.innerWidth - r.width - 8) + 'px';
  m.style.top = Math.min(y, window.innerHeight - r.height - 8) + 'px';
}
function nodeCtxMenu(e, nodeId) {
  e.preventDefault(); e.stopPropagation();
  const f = findNode(nodeId);
  if (!f) return;
  selectedId = nodeId; syncPanel(); refreshSelection();
  const n = f.node;
  const hasParent = !!f.parent;
  const pal = ['#e85454', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#111827'];
  showCtx(e.clientX, e.clientY, [
    { label: shortText(n.text) || 'Node' },
    { icon: '✏️', text: 'Sửa chữ', shortcut: 'F2', action: () => { if (n._el) startEdit(n._el, n); } },
    'sep',
    { icon: '➕', text: 'Thêm nhánh con', shortcut: 'Tab', action: addChild },
    { icon: '↔', text: 'Thêm nhánh ngang', shortcut: 'Enter', action: addSibling, disabled: !hasParent },
    { icon: '⧉', text: 'Nhân bản nhánh', shortcut: 'Ctrl+D', action: duplicateSelected, disabled: !hasParent },
    'sep',
    { icon: '📋', text: 'Copy', shortcut: 'Ctrl+C', action: copySelected },
    { icon: '✂', text: 'Cut', shortcut: 'Ctrl+X', action: cutSelected, disabled: !hasParent },
    { icon: '📌', text: 'Paste vào đây', shortcut: 'Ctrl+V', action: pasteToSelected, disabled: !clipboard },
    'sep',
    { icon: '▲', text: 'Đưa lên trên', shortcut: 'Alt+↑', action: () => moveSelected(-1), disabled: !hasParent },
    { icon: '▼', text: 'Đưa xuống dưới', shortcut: 'Alt+↓', action: () => moveSelected(1), disabled: !hasParent },
    { icon: '⤒', text: 'Đưa lên đầu', action: () => moveTopBottom(true), disabled: !hasParent },
    { icon: '⤓', text: 'Đưa xuống cuối', action: () => moveTopBottom(false), disabled: !hasParent },
    'sep',
    { label: 'Màu nhánh' },
    { colors: pal, onPick: (c) => applyToSelected({ branchColor: c }) },
    { label: 'Kiểu node' },
    { icon: '🟥', text: 'Trung tâm', action: () => applyToSelected({ shape: 'root' }) },
    { icon: '💊', text: 'Pill bo tròn', action: () => applyToSelected({ shape: 'pill' }) },
    { icon: '〰', text: 'Gạch chân', action: () => applyToSelected({ shape: 'underline' }) },
    { icon: '⬜', text: 'Hộp viền', action: () => applyToSelected({ shape: 'box' }) },
    { icon: '⭕', text: 'Elip', action: () => applyToSelected({ shape: 'ellipse' }) },
    'sep',
    { icon: n.collapsed ? '📂' : '📁', text: n.collapsed ? 'Mở rộng' : 'Thu gọn', action: () => { pushHistory(); n.collapsed = !n.collapsed; fullRender(); } },
    { icon: '🧹', text: 'Reset vị trí kéo tay', action: () => { pushHistory(); const r = (m) => { m._dx = 0; m._dy = 0; (m.children || []).forEach(r); }; r(n); fullRender(); } },
    { icon: '🗑', text: 'Xóa nhánh', shortcut: 'Del', action: deleteNode, danger: true, disabled: !hasParent },
  ]);
}
function clearCache() {
  if (!confirm('Xóa toàn bộ cache (sơ đồ + cài đặt) và về mẫu mặc định?')) return;
  try {
    localStorage.removeItem('mindmap-studio-v1');
    localStorage.removeItem('mindmap-settings-v1');
  } catch {}
  pushHistory();
  settings = { bg: '#fafaf7', grid: 'dots', lineStyle: 'curve', direction: 'right', fileName: 'Sơ đồ tư duy của tôi' };
  root = sampleData();
  selectedId = null; clipboard = null;
  zoom = 0.95; ox = 380; oy = 380;
  const fn = $('#fileName'); if (fn) fn.value = settings.fileName;
  undoStack = []; redoStack = [];
  fullRender(); syncPanel(); applyCanvasStyle();
  toast('Đã xóa cache, về mẫu mặc định 🧹');
}
function canvasCtxMenu(e) {
  e.preventDefault();
  const w = worldFromClient(e.clientX, e.clientY);
  showCtx(e.clientX, e.clientY, [
    { label: 'Canvas' },
    { icon: '➕', text: 'Thêm nhánh vào trung tâm', action: () => { selectedId = root.id; addChild(); } },
    { icon: '📌', text: 'Dán vào trung tâm', action: () => { selectedId = root.id; pasteToSelected(); }, disabled: !clipboard },
    'sep',
    { icon: '✨', text: 'Xếp tự động', action: () => { pushHistory(); eachNode(root, x => { x._dx = 0; x._dy = 0; }); fullRender(); } },
    { icon: '🎯', text: 'Về giữa', action: () => { ox = viewportEl.clientWidth / 2 - 100; oy = viewportEl.clientHeight / 2; applyTransform(); } },
    { icon: '⛶', text: 'Fit màn hình', action: () => { zoom = 0.9; ox = viewportEl.clientWidth / 2 - 150; oy = viewportEl.clientHeight / 2; applyTransform(); } },
    'sep',
    { icon: '🧹', text: 'Xóa cache', action: clearCache, danger: true },
  ]);
}
// ---------- PANEL / COLORS ----------
const branchPalette = ['#e85454', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280', '#111827'];
const bgPalette = ['#ffffff', '#fde8e9', '#fef3e6', '#fff8cc', '#e6f7e8', '#dbeafe', '#f3e8ff', '#fce7f3', '#e85454', '#111827'];
function buildPalette(elId, colors, cb) {
  const el = $(elId); if (!el) return; el.innerHTML = '';
  colors.forEach(c => {
    const d = document.createElement('div');
    d.className = 'color-dot'; d.style.background = c; d.title = c;
    d.onclick = () => { cb(c); el.querySelectorAll('.color-dot').forEach(x => x.classList.remove('active')); d.classList.add('active'); };
    el.appendChild(d);
  });
}
buildPalette('#branchColors', branchPalette, (c) => applyToSelected({ branchColor: c }));
buildPalette('#bgColors', bgPalette, (c) => applyToSelected({ bg: c }));
function applyToSelected(patch) {
  if (!selectedId) return toast('Hãy chọn 1 node trước');
  pushHistory();
  Object.assign(findNode(selectedId).node, patch);
  fullRender(); syncPanel();
}
document.querySelectorAll('.shape-btns button').forEach(b => b.onclick = () => applyToSelected({ shape: b.dataset.shape }));
const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
on('#btnBold', () => { const f = selectedId && findNode(selectedId); if (!f) return; pushHistory(); f.node.bold = !f.node.bold; fullRender(); });
on('#btnItalic', () => { const f = selectedId && findNode(selectedId); if (!f) return; pushHistory(); f.node.italic = !f.node.italic; fullRender(); });
on('#btnUnderline', () => { const f = selectedId && findNode(selectedId); if (!f) return; pushHistory(); f.node.underline = !f.node.underline; fullRender(); });
on('#fontPlus', () => { const f = selectedId && findNode(selectedId); if (!f) return; pushHistory(); f.node.fontSize = Math.min(48, (f.node.fontSize || 15) + 1); fullRender(); syncPanel(); });
on('#fontMinus', () => { const f = selectedId && findNode(selectedId); if (!f) return; pushHistory(); f.node.fontSize = Math.max(10, (f.node.fontSize || 15) - 1); fullRender(); syncPanel(); });
const tc = $('#textColor'); if (tc) tc.oninput = (e) => applyToSelected({ color: e.target.value });

function syncPanel() {
  const f = selectedId ? findNode(selectedId) : null;
  if (!f) { const t = $('#propText'); if (t) t.value = ''; return; }
  const n = f.node;
  const set = (id, v) => { const el = $(id); if (el) el.value = v; };
  set('#propText', n.text);
  set('#propBg', toColor(n.bg)); set('#propColor', toColor(n.color));
  set('#propBranch', toColor(n.branchColor)); set('#propFontSize', n.fontSize || 15);
  set('#propShape', n.shape || 'pill'); set('#propWidth', n.branchWidth || 3);
  set('#propFont', n.font || "'Be Vietnam Pro',sans-serif"); set('#propAlign', n.align || 'center');
  set('#propRadius', n.radius ?? 12); set('#propOpacity', n.opacity ?? 100);
  const sh = $('#propShadow'); if (sh) sh.checked = n.shadow !== false;
}
function toColor(c) { if (!c) return '#000000'; if (/^#[0-9a-f]{6}$/i.test(c)) return c; if (/^#[0-9a-f]{3}$/i.test(c)) return c; return '#1f2a37'; }
on('#btnApply', () => {
  if (!selectedId) return;
  pushHistory();
  const n = findNode(selectedId).node;
  n.text = $('#propText').value; n.bg = $('#propBg').value; n.color = $('#propColor').value;
  n.branchColor = $('#propBranch').value; n.fontSize = +$('#propFontSize').value;
  n.shape = $('#propShape').value; n.branchWidth = +$('#propWidth').value;
  n.font = $('#propFont').value; n.align = $('#propAlign').value;
  n.radius = +$('#propRadius').value; n.opacity = +$('#propOpacity').value;
  n.shadow = $('#propShadow').checked;
  fullRender(); toast('Đã áp dụng ✔');
});
['propText'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('keydown', e => e.stopPropagation()); });

// ---------- TOOLBAR (Canva-style) ----------
viewportEl.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.node')) return;
  canvasCtxMenu(e);
});
// double-click nền: tạo nhánh mới vào trung tâm (rất Canva)
viewportEl.addEventListener('dblclick', (e) => {
  if (e.target.closest('.node')) return;
  selectedId = root.id; addChild();
});
const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
const newMap = () => { if (!confirm('Tạo mindmap mới?')) return; pushHistory(); root = blankData(); selectedId = root.id; ox = 400; oy = 350; zoom = 1; fullRender(); syncPanel(); toast('Đã tạo mới 📄'); };
const loadSample = () => { pushHistory(); root = sampleData(); selectedId = null; zoom = 0.95; ox = 380; oy = 360; fullRender(); syncPanel(); toast('Đã nạp mẫu ⭐'); };
bind('btnNew', newMap); bind('btnNew2', newMap);
bind('btnSample', loadSample); bind('btnSample2', loadSample);
bind('btnClearCache', clearCache); bind('btnClearCache2', clearCache); bind('btnClearCache3', clearCache);
bind('btnUndo', undo); bind('btnRedo', redo);
bind('btnAddChild', addChild); bind('btnAddSibling', addSibling); bind('btnDelete', deleteNode);
bind('btnMoveUp', () => moveSelected(-1));
bind('btnMoveDown', () => moveSelected(1));
bind('btnMoveTop', () => moveTopBottom(true));
bind('btnMoveBottom', () => moveTopBottom(false));
bind('btnDuplicate', duplicateSelected);
bind('btnCopy', copySelected);
bind('btnCut', cutSelected);
bind('btnPaste', pasteToSelected);
bind('btnCollapse', () => {
  const f = selectedId && findNode(selectedId); if (!f) return;
  pushHistory(); f.node.collapsed = !f.node.collapsed; fullRender(); toast(f.node.collapsed ? 'Đã thu gọn 📁' : 'Đã mở rộng 📂');
});
bind('btnAuto', () => { pushHistory(); eachNode(root, n => { n._dx = 0; n._dy = 0; }); fullRender(); toast('Đã xếp gọn ✨'); });
bind('btnClearOffset', () => { eachNode(root, n => { n._dx = 0; n._dy = 0; }); fullRender(); });
bind('btnCenter', () => { ox = viewportEl.clientWidth / 2 - 100; oy = viewportEl.clientHeight / 2; applyTransform(); });
bind('zoomIn', () => { zoom = Math.min(2.5, zoom * 1.15); applyTransform(); });
bind('zoomOut', () => { zoom = Math.max(0.25, zoom / 1.15); applyTransform(); });
bind('zoomFit', () => { zoom = 0.9; ox = viewportEl.clientWidth / 2 - 150; oy = viewportEl.clientHeight / 2; applyTransform(); });
const zs = $('#zoomSlider'); if (zs) zs.oninput = (e) => { zoom = (+e.target.value) / 100; applyTransform(); };
const cg = $('#chkGrid'); if (cg) { cg.checked = settings.grid !== 'none'; cg.onchange = (e) => { settings.grid = e.target.checked ? 'dots' : 'none'; const g = $('#gridStyle'); if (g) g.value = settings.grid; applyCanvasStyle(); save(); }; }
const gs2 = $('#gridStyle'); if (gs2) gs2.onchange = (e) => { settings.grid = e.target.value; applyCanvasStyle(); save(); };
const cb2 = $('#canvasBg'); if (cb2) cb2.oninput = (e) => { settings.bg = e.target.value; applyCanvasStyle(); save(); };
const ls2 = $('#lineStyle'); if (ls2) ls2.onchange = (e) => { pushHistory(); settings.lineStyle = e.target.value; drawLinks(); save(); toast('Kiểu đường: ' + e.target.selectedOptions[0].text); };
[['dirRight', 'right'], ['dirBoth', 'both'], ['dirDown', 'down']].forEach(([id, dir]) => bind(id, () => { pushHistory(); settings.direction = dir; applyCanvasStyle(); fullRender(); toast('Hướng: ' + dir); }));
document.querySelectorAll('.dir-switch button').forEach(b => b.onclick = () => { pushHistory(); settings.direction = b.dataset.dir; applyCanvasStyle(); fullRender(); });
bind('btnHelp', () => $('#helpModal').hidden = false);
bind('btnHelp2', () => $('#helpModal').hidden = false);
bind('btnCloseHelp', () => $('#helpModal').hidden = true);
bind('btnTheme', () => { renderThemes(); $('#themeModal').hidden = false; });
bind('btnIcons', () => { renderIcons(); $('#iconModal').hidden = false; });
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('.modal').hidden = true);
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; }));
// tabs inspector
document.querySelectorAll('.insp-tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.insp-tabs button').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  document.querySelectorAll('.insp-body').forEach(p => p.hidden = p.dataset.body !== b.dataset.tab);
});
// quickbar
document.querySelectorAll('#quickBar button').forEach(b => b.onclick = (e) => {
  e.stopPropagation();
  const q = b.dataset.q;
  if (q === 'child') addChild();
  else if (q === 'sibling') addSibling();
  else if (q === 'edit') startEditSelected();
  else if (q === 'bold') { const f = selectedId && findNode(selectedId); if (f) { pushHistory(); f.node.bold = !f.node.bold; fullRender(); } }
  else if (q === 'up') moveSelected(-1);
  else if (q === 'down') moveSelected(1);
  else if (q === 'dup') duplicateSelected();
  else if (q === 'del') deleteNode();
});
// search
const si = $('#searchInput');
if (si) {
  si.addEventListener('input', () => { searchQuery = si.value.trim().toLowerCase(); fullRender(); });
  si.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      let found = null;
      eachNode(root, (n) => { if (!found && String(n.text).toLowerCase().includes(searchQuery)) found = n; });
      if (found) { selectedId = found.id; syncPanel(); fullRender(); ox = viewportEl.clientWidth / 2 - found._x * zoom; oy = viewportEl.clientHeight / 2 - found._y * zoom; applyTransform(); toast('Đã tìm thấy: ' + shortText(found.text)); }
    }
    if (e.key === 'Escape') { si.value = ''; searchQuery = ''; fullRender(); }
  });
}
const sfn = $('#fileName');
if (sfn) { sfn.value = settings.fileName || sfn.value; sfn.addEventListener('input', () => { settings.fileName = sfn.value; save(); }); sfn.addEventListener('keydown', e => e.stopPropagation()); }

// keyboard
function startEditSelected() {
  if (!selectedId) return;
  const f = findNode(selectedId);
  if (f && f.node._el) startEdit(f.node._el, f.node);
}
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelected(); return; }
  if (mod && e.key.toLowerCase() === 'x') { e.preventDefault(); cutSelected(); return; }
  if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteToSelected(); return; }
  if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return; }
  if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); moveSelected(-1); return; }
  if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); moveSelected(1); return; }
  if (e.key === 'F2') { e.preventDefault(); startEditSelected(); return; }
  if (e.key === 'Tab') { e.preventDefault(); addChild(); }
  else if (e.key === 'Enter') { e.preventDefault(); addSibling(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteNode(); }
  else if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
});

// ---------- IMPORT / EXPORT ----------
$('#btnExportJSON').onclick = () => {
  const blob = new Blob([JSON.stringify(cleanNode(root), null, 2)], { type: 'application/json' });
  dl(URL.createObjectURL(blob), 'mindmap.json');
};
$('#btnImport').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { pushHistory(); root = JSON.parse(r.result); selectedId = null; fullRender(); syncPanel(); } catch { alert('File JSON không hợp lệ'); } };
  r.readAsText(f); e.target.value = '';
};
function dl(href, name) { const a = document.createElement('a'); a.href = href; a.download = name; a.click(); }

function renderThemes() {
  const g = $('#themeGrid'); if (!g) return; g.innerHTML = '';
  THEMES.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'theme-card';
    b.innerHTML = `<b>${t.name}</b><div class="theme-dots">${t.colors.map(c => `<span style="background:${c}"></span>`).join('')}</div>`;
    b.onclick = () => { applyTheme(i); $('#themeModal').hidden = true; };
    g.appendChild(b);
  });
}
function renderIcons() {
  const g = $('#iconGrid'); if (!g) return; g.innerHTML = '';
  ICONS.forEach(em => {
    const b = document.createElement('button'); b.innerText = em;
    b.onclick = () => {
      if (!selectedId) return toast('Hãy chọn 1 node trước');
      pushHistory();
      const n = findNode(selectedId).node;
      n.text = em + ' ' + n.text;
      fullRender(); syncPanel(); $('#iconModal').hidden = true; toast('Đã chèn ' + em);
    };
    g.appendChild(b);
  });
}

$('#btnExportPNG').onclick = exportPNG;
bind('btnExportSVG', exportSVG);
function bounds() {
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  eachNode(root, (n) => {
    minX = Math.min(minX, n._x - n._w / 2); maxX = Math.max(maxX, n._x + n._w / 2);
    minY = Math.min(minY, n._y - n._h / 2); maxY = Math.max(maxY, n._y + n._h / 2);
  });
  return { minX, maxX, minY, maxY };
}
function exportPNG() {
  const { minX, maxX, minY, maxY } = bounds();
  const scale = +($('#exportScale')?.value || 2);
  const transparent = $('#exportTransparent')?.checked;
  const pad = 80;
  const W = (maxX - minX + pad * 2) * scale, H = (maxY - minY + pad * 2) * scale;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  if (!transparent) { ctx.fillStyle = settings.bg || '#fafaf7'; ctx.fillRect(0, 0, W, H); }
  const X = (x) => (x - minX + pad) * scale, Y = (y) => (y - minY + pad) * scale;
  // links (tôn trọng kiểu đường + hướng)
  function link(p, c) {
    const s = c._side || 1;
    let sx, sy, ex, ey;
    if (c._down || settings.direction === 'down') { sx = p._x; sy = p._y + p._h / 2; ex = c._x; ey = c._y - c._h / 2; }
    else if (p === root && settings.direction === 'right') {
      if (c._y < p._y - 60) { sx = p._x + 30; sy = p._y - p._h / 2; }
      else if (c._y > p._y + 60) { sx = p._x + 30; sy = p._y + p._h / 2; }
      else { sx = p._x + p._w / 2; sy = p._y; }
      ex = c._x - c._w / 2; ey = c._y;
    } else { sx = p._x + s * p._w / 2; sy = p._y; ex = c._x - s * (c._w / 2); ey = c._y; }
    ctx.strokeStyle = c.branchColor || '#e85454'; ctx.lineWidth = (c.branchWidth || 2.5) * scale; ctx.lineCap = 'round';
    ctx.beginPath();
    const st = settings.lineStyle || 'curve';
    if (st === 'straight') { ctx.moveTo(X(sx), Y(sy)); ctx.lineTo(X(ex), Y(ey)); }
    else if (st === 'elbow') { ctx.moveTo(X(sx), Y(sy)); ctx.lineTo(X((sx + ex) / 2), Y(sy)); ctx.lineTo(X((sx + ex) / 2), Y(ey)); ctx.lineTo(X(ex), Y(ey)); }
    else {
      ctx.moveTo(X(sx), Y(sy));
      if (c._down) { const dy = Math.max(40, (Y(ey) - Y(sy)) / 2); ctx.bezierCurveTo(X(sx), Y(sy) + dy, X(ex), Y(ey) - dy, X(ex), Y(ey)); }
      else { const dx = Math.max(50 * scale, Math.abs(X(ex) - X(sx)) / 2); ctx.bezierCurveTo(X(sx) + Math.sign(X(ex) - X(sx) || 1) * dx * 0.5 + 20, Y(sy), X(ex) - Math.sign(X(ex) - X(sx) || 1) * dx * 0.5 - 20, Y(ey), X(ex), Y(ey)); }
    }
    ctx.stroke();
    (c.children || []).forEach(k => { if (!c.collapsed) link(c, k); });
  }
  (root.children || []).forEach(c => link(root, c));
  // nodes
  eachNode(root, (n, depth) => {
    if (n._skip) return;
    const w = n._w * scale, h = n._h * scale;
    const x = X(n._x) - w / 2, y = Y(n._y) - h / 2;
    ctx.save();
    ctx.globalAlpha = (n.opacity ?? 100) / 100;
    ctx.font = `${n.italic ? 'italic ' : ''}${n.bold ? '700' : '400'} ${(n.fontSize || 15) * scale}px ${n.font || "'Be Vietnam Pro', Arial"}`;
    ctx.textBaseline = 'middle';
    if (n.shape === 'root') {
      roundRect(ctx, x, y, w, h, 14 * scale, n.bg); ctx.fill();
      ctx.fillStyle = n.color; ctx.textAlign = 'center';
      multiline(ctx, n.text, X(n._x), Y(n._y), w - 20, (n.fontSize + 6) * scale);
    } else if (n.shape === 'underline') {
      ctx.strokeStyle = n.branchColor; ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
      ctx.fillStyle = n.color; ctx.textAlign = 'left';
      multiline(ctx, n.text, x + 14, Y(n._y), w - 18, (n.fontSize + 5) * scale, 'left');
    } else if (n.shape === 'ellipse') {
      ctx.beginPath(); ctx.ellipse(X(n._x), Y(n._y), w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = n.bg; ctx.fill();
      ctx.fillStyle = n.color; ctx.textAlign = 'center';
      multiline(ctx, n.text, X(n._x), Y(n._y), w - 24, (n.fontSize + 5) * scale);
    } else {
      roundRect(ctx, x, y, w, h, (n.radius ?? 10) * scale, n.shape === 'box' ? '#ffffff' : n.bg);
      if (n.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,.12)'; ctx.shadowBlur = 12 * scale; ctx.shadowOffsetY = 3 * scale; }
      if (n.shape === 'box') { ctx.strokeStyle = n.branchColor; ctx.lineWidth = 2 * scale; ctx.stroke(); }
      ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = n.color; ctx.textAlign = 'center';
      multiline(ctx, n.text, X(n._x), Y(n._y), w - 16, (n.fontSize + 5) * scale);
    }
    ctx.restore();
  });
  const name = (settings.fileName || 'mindmap').replace(/[\\/:*?"<>|]/g, '').slice(0, 60) || 'mindmap';
  dl(cv.toDataURL('image/png'), name + '.png');
  toast('Đã xuất PNG ' + scale + 'x ✔');
}
function exportSVG() {
  const { minX, maxX, minY, maxY } = bounds();
  const pad = 60, W = maxX - minX + pad * 2, H = maxY - minY + pad * 2;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W)}" height="${Math.round(H)}" viewBox="0 0 ${Math.round(W)} ${Math.round(H)}"><rect width="100%" height="100%" fill="${settings.bg || '#fafaf7'}"/>`;
  const X = (x) => x - minX + pad, Y = (y) => y - minY + pad;
  function svgLink(p, c) {
    const s = c._side || 1;
    let sx, sy, ex, ey, d;
    if (c._down || settings.direction === 'down') { sx = X(p._x); sy = Y(p._y + p._h / 2); ex = X(c._x); ey = Y(c._y - c._h / 2); d = `M ${sx} ${sy} C ${sx} ${sy + 40}, ${ex} ${ey - 40}, ${ex} ${ey}`; }
    else { sx = X(p._x + s * p._w / 2); sy = Y(p._y); ex = X(c._x - s * (c._w / 2)); ey = Y(c._y); const dx = Math.max(50, Math.abs(ex - sx) / 2); d = `M ${sx} ${sy} C ${sx + Math.sign(ex - sx || 1) * dx} ${sy}, ${ex - Math.sign(ex - sx || 1) * dx} ${ey}, ${ex} ${ey}`; }
    out += `<path d="${d}" stroke="${c.branchColor || '#e85454'}" stroke-width="${c.branchWidth || 2.5}" fill="none" stroke-linecap="round"/>`;
    (c.children || []).forEach(k => { if (!c.collapsed) svgLink(c, k); });
  }
  (root.children || []).forEach(c => svgLink(root, c));
  eachNode(root, (n) => {
    const w = n._w, h = n._h, x = X(n._x) - w / 2, y = Y(n._y) - h / 2;
    const lines = String(n.text).split('\n');
    const tsp = lines.map((l, i) => `<tspan x="${X(n._x)}" dy="${i === 0 ? -(lines.length - 1) * 9 : 18}">${esc(l)}</tspan>`).join('');
    if (n.shape === 'underline') out += `<text x="${x + 14}" y="${Y(n._y)}" font-size="${n.fontSize || 14}" fill="${n.color}" text-anchor="start" dominant-baseline="middle" font-family="Arial">${tsp}</text><line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${n.branchColor}" stroke-width="2.5"/>`;
    else out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${n.shape === 'ellipse' ? w / 2 : (n.radius ?? 12)}" fill="${n.shape === 'box' ? '#fff' : n.bg}" ${n.shape === 'box' ? `stroke="${n.branchColor}" stroke-width="2"` : ''}/><text x="${X(n._x)}" y="${Y(n._y)}" font-size="${n.fontSize || 15}" font-weight="${n.bold ? 700 : 400}" fill="${n.color}" text-anchor="middle" dominant-baseline="middle" font-family="Arial">${tsp}</text>`;
  });
  out += '</svg>';
  const blob = new Blob([out], { type: 'image/svg+xml' });
  dl(URL.createObjectURL(blob), (settings.fileName || 'mindmap') + '.svg');
  toast('Đã xuất SVG vector ✔');
}
function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  ctx.fillStyle = fill || '#fff';
}
function multiline(ctx, text, cx, cy, maxW, lh, align = 'center') {
  const lines = [];
  String(text).split('\n').forEach(par => {
    const words = par.split(' '); let cur = '';
    words.forEach(w => {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    lines.push(cur);
  });
  const startY = cy - (lines.length - 1) * lh / 2;
  lines.forEach((l, i) => {
    if (align === 'center') ctx.fillText(l, cx, startY + i * lh);
    else ctx.fillText(l, cx, startY + i * lh);
  });
}

function setStatus(t) { const s = $('#status'); if (s) s.innerText = t; }

// init
zoom = 0.95; ox = 380; oy = 380;
fullRender(); syncPanel(); applyCanvasStyle();
undoStack = []; redoStack = [];
setStatus('Sẵn sàng • Double-click nền để tạo nhánh • Chuột phải để mở menu');

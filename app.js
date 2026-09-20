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
let selectedEdge = null; // id node con của đường nối đang chọn
let zoom = 1, ox = 400, oy = 350;
let undoStack = [], redoStack = [];
const OFFSET = 5000; // offset cho svg khổng lồ
let settings = { bg: '#fafaf8', grid: 'dots', lineStyle: 'curve', direction: 'right', fileName: 'Sơ đồ tư duy của tôi' };

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
  setStatus('Đã copy — chọn node cha rồi Ctrl+V để dán');
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
  setStatus('Đã cut — chọn node cha rồi Ctrl+V để dán');
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
  setStatus('Đã dán xong');
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
    // Kích thước tùy chỉnh: có thì cố định, không thì tự co theo chữ
    if (n.cw) { d.style.width = n.cw + 'px'; d.style.maxWidth = 'none'; }
    if (n.ch) {
      d.style.height = n.ch + 'px';
      d.style.display = 'flex'; d.style.alignItems = 'center';
      d.style.justifyContent = n.align === 'left' ? 'flex-start' : 'center';
    }
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
    d.addEventListener('click', (e) => { e.stopPropagation(); hideEdgeBar(); selectedId = n.id; syncPanel(); refreshSelection(); updateQuickBar(); });
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
  syncResizeHandles();
}
// Tay nắm resize trực tiếp trên khối đang chọn
function syncResizeHandles() {
  document.querySelectorAll('.node .rz').forEach(el => el.remove());
  if (!selectedId) return;
  let f = null;
  try { f = findNode(selectedId); } catch { return; }
  if (!f || !f.node._el || f.node._el.querySelector('textarea')) return;
  const n = f.node, el = n._el;
  [['e', 'Kéo để đổi RỘNG'], ['s', 'Kéo để đổi CAO'], ['se', 'Kéo để đổi RỘNG + CAO']].forEach(([dir, title]) => {
    const h = document.createElement('span');
    h.className = 'rz rz-' + dir; h.title = title;
    h.addEventListener('mousedown', (e) => e.stopPropagation());
    h.addEventListener('pointerdown', (e) => startResize(e, n, dir));
    el.appendChild(h);
  });
}
function startResize(e, n, dir) {
  e.stopPropagation();
  if (e.preventDefault) e.preventDefault();
  pushHistory();
  if (!n.cw) n.cw = Math.round(n._w || 120);
  if ((dir === 's' || dir === 'se') && !n.ch) n.ch = Math.round(n._h || 40);
  const startX = e.clientX, startY = e.clientY, c0 = n.cw, h0 = n.ch || n._h;
  const el = n._el;
  const mv = (ev) => {
    const dx = (ev.clientX - startX) / zoom, dy = (ev.clientY - startY) / zoom;
    if (dir === 'e' || dir === 'se') n.cw = Math.min(800, Math.max(60, Math.round(c0 + dx)));
    if (dir === 's' || dir === 'se') n.ch = Math.min(600, Math.max(30, Math.round(h0 + dy)));
    el.style.width = n.cw + 'px'; el.style.maxWidth = 'none';
    if (n.ch) {
      el.style.height = n.ch + 'px';
      el.style.display = 'flex'; el.style.alignItems = 'center';
      el.style.justifyContent = n.align === 'left' ? 'flex-start' : 'center';
    }
    n._w = el.offsetWidth || n.cw; n._h = el.offsetHeight || n.ch || n._h;
    layoutTree(); applyTransform(); drawLinks();
  };
  const up = () => {
    document.removeEventListener('pointermove', mv);
    document.removeEventListener('pointerup', up);
    selectedId = n.id; fullRender(); syncPanel();
    setStatus('Đã đổi cỡ khối: ' + n.cw + ' × ' + (n.ch || 'tự động') + ' — xoá số trong panel để về tự động');
  };
  document.addEventListener('pointermove', mv);
  document.addEventListener('pointerup', up);
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
  viewportEl.style.setProperty('--canvas-bg', settings.bg || '#fafaf8');
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
  positionEdgeBar();
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
    const ep = endpoints(parent, child);
    const d = ep.d;
    child._emx = (ep.sx + ep.ex) / 2; child._emy = (ep.sy + ep.ey) / 2;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('stroke', child.branchColor || parent.branchColor || '#e85454');
    p.setAttribute('stroke-width', child.branchWidth || 2.5);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke-linecap', 'round');
    if (style === 'straight') p.setAttribute('stroke-linejoin', 'round');
    if (child.id === selectedEdge) p.classList.add('edge-sel');
    linksEl.appendChild(p);
    // Vùng bấm rộng (trong suốt) để click/chuột phải đường nối dễ dàng
    const hit = document.createElementNS(NS, 'path');
    hit.setAttribute('d', d);
    hit.setAttribute('stroke', 'rgba(0,0,0,0)');
    hit.setAttribute('stroke-width', 16);
    hit.setAttribute('fill', 'none');
    hit.style.pointerEvents = 'stroke';
    hit.style.cursor = 'pointer';
    hit.addEventListener('click', (ev) => { ev.stopPropagation(); selectEdge(child.id); });
    hit.addEventListener('contextmenu', (ev) => nodeCtxMenu(ev, child.id));
    linksEl.appendChild(hit);
    (child.children || []).forEach(c => { if (!child.collapsed) path(child, c); });
  }
  (root.children || []).forEach(c => path(root, c));
}

// ---------- SỬA ĐƯỜNG NỐI TRỰC TIẾP (click / chuột phải lên đường nối) ----------
const EDGE_PALETTE = ['#e85454', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
let edgeHistArmed = false;
function buildEdgeColors() {
  const wrap = document.getElementById('edgeColors');
  if (!wrap || wrap.childElementCount) return;
  EDGE_PALETTE.forEach(c => {
    const d = document.createElement('div');
    d.className = 'color-dot'; d.style.background = c; d.title = c; d.dataset.color = c;
    d.onclick = () => {
      const f = selectedEdge && findNode(selectedEdge);
      if (!f) return;
      pushHistory();
      f.node.branchColor = c;
      markEdgeColors(c);
      drawLinks(); save();
    };
    wrap.appendChild(d);
  });
}
function markEdgeColors(c) {
  document.querySelectorAll('#edgeColors .color-dot').forEach(o => o.classList.toggle('active', o.dataset.color === c));
}
function selectEdge(id) {
  const f = findNode(id);
  if (!f) return;
  selectedEdge = id; selectedId = null;
  hideCtx();
  refreshSelection(); syncPanel();
  edgeHistArmed = false;
  buildEdgeColors();
  markEdgeColors(f.node.branchColor);
  const t = document.getElementById('edgeTitle');
  if (t) t.textContent = 'Đường nối → ' + shortText(f.node.text);
  const w = document.getElementById('edgeWidth');
  if (w) w.value = f.node.branchWidth || 3;
  drawLinks();
  positionEdgeBar();
  const bar = document.getElementById('edgeBar');
  if (bar) bar.hidden = false;
  setStatus('Đang sửa đường nối → ' + shortText(f.node.text) + ' — đổi màu / dày ở thanh gắn trên đường');
}
function hideEdgeBar() {
  const bar = document.getElementById('edgeBar');
  if (!selectedEdge && (!bar || bar.hidden)) return;
  selectedEdge = null;
  if (bar) bar.hidden = true;
  drawLinks();
}
function positionEdgeBar() {
  const bar = document.getElementById('edgeBar');
  if (!bar || bar.hidden || !selectedEdge) return;
  const f = findNode(selectedEdge);
  if (!f || f.node._emx == null) { bar.hidden = true; return; }
  const rect = viewportEl.getBoundingClientRect();
  const wrap = document.getElementById('canvasWrap').getBoundingClientRect();
  const sx = (f.node._emx * zoom + ox) + rect.left;
  const sy = (f.node._emy * zoom + oy) + rect.top;
  bar.style.left = Math.max(8, (sx - wrap.left)) + 'px';
  bar.style.top = Math.max(8, (sy - wrap.top)) + 'px';
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
    setStatus('Đã di chuyển tự do — dùng Xếp gọn (menu Arrange) để căn lại');
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
  hideEdgeBar();
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
function hideCtx() { const m = ctxMenu(); if (m) { m.hidden = true; m.classList.remove('editable'); } }
document.addEventListener('click', (e) => {
  const m = ctxMenu();
  if (m && !m.hidden && !m.contains(e.target)) hideCtx();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideCtx(); });
viewportEl.addEventListener('scroll', hideCtx, true);

function showCtx(x, y, sections) {
  const m = ctxMenu();
  m.classList.remove('editable');
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
    b.innerHTML = `<span class="ci">${sec.icon || ''}</span><span>${sec.text}</span>${sec.shortcut ? `<span class="ctx-shortcut">${sec.shortcut}</span>` : ''}`;
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
  const m = ctxMenu();
  m.classList.add('editable');
  m.innerHTML = '';
  let touched = false;
  const touch = () => { if (!touched) { pushHistory(); touched = true; } };
  const live = () => { fullRender(); syncPanel(); };

  // header
  const head = document.createElement('div'); head.className = 'ctx-head';
  head.innerHTML = `<b>${escHtml(shortText(n.text)) || 'Node'}</b>`;
  const x = document.createElement('button'); x.className = 'ctx-close'; x.innerText = '✕'; x.title = 'Đóng (Esc)';
  x.onclick = () => hideCtx();
  head.appendChild(x); m.appendChild(head);

  // textarea sửa trực tiếp
  const ta = document.createElement('textarea');
  ta.className = 'ctx-edit'; ta.value = n.text; ta.placeholder = 'Nhập nội dung…';
  ta.addEventListener('mousedown', ev => ev.stopPropagation());
  ta.addEventListener('click', ev => ev.stopPropagation());
  ta.addEventListener('keydown', ev => ev.stopPropagation());
  ta.addEventListener('input', () => { touch(); n.text = ta.value || 'Trống'; live(); head.querySelector('b').innerText = (shortText(n.text) || 'Node'); });
  m.appendChild(ta);

  // cỡ chữ + B I U
  const row1 = document.createElement('div'); row1.className = 'ctx-row';
  const mkBtn = (t, title, isOn, fn) => { const b = document.createElement('button'); b.className = 'ctx-btn' + (isOn ? ' on' : ''); b.innerHTML = t; b.title = title; b.onclick = () => { touch(); fn(); live(); refreshCtxState(); }; return b; };
  const bMinus = mkBtn('A−', 'Giảm cỡ chữ', false, () => n.fontSize = Math.max(10, (n.fontSize || 15) - 1));
  const sizeLab = document.createElement('b'); sizeLab.style.minWidth = '34px'; sizeLab.style.textAlign = 'center';
  const bPlus = mkBtn('A+', 'Tăng cỡ chữ', false, () => n.fontSize = Math.min(48, (n.fontSize || 15) + 1));
  const bB = mkBtn('<b>B</b>', 'Đậm', !!n.bold, () => n.bold = !n.bold);
  const bI = mkBtn('<i>I</i>', 'Nghiêng', !!n.italic, () => n.italic = !n.italic);
  const bU = mkBtn('<u>U</u>', 'Gạch dưới', !!n.underline, () => n.underline = !n.underline);
  const paintSize = () => sizeLab.innerText = (n.fontSize || 15);
  paintSize(); row1.append(bMinus, sizeLab, bPlus, bB, bI, bU); m.appendChild(row1);

  // màu nhánh + nền (không đóng menu để thử nhiều màu)
  const labB = document.createElement('div'); labB.className = 'ctx-label'; labB.innerText = 'Màu nhánh — bấm thử trực tiếp';
  m.appendChild(labB);
  const pal = ['#e85454', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#111827'];
  const wrapB = document.createElement('div'); wrapB.className = 'ctx-colors';
  pal.forEach(c => {
    const d = document.createElement('div');
    d.className = 'color-dot' + (n.branchColor === c ? ' active' : '');
    d.style.background = c; d.title = c;
    d.onclick = () => { touch(); n.branchColor = c; live(); wrapB.querySelectorAll('.color-dot').forEach(o => o.classList.remove('active')); d.classList.add('active'); syncPanel(); };
    wrapB.appendChild(d);
  });
  m.appendChild(wrapB);
  const labBg = document.createElement('div'); labBg.className = 'ctx-label'; labBg.innerText = 'Màu nền';
  m.appendChild(labBg);
  const bgs = ['#ffffff', '#fde8e9', '#fef3e6', '#fff8cc', '#e6f7e8', '#dbeafe', '#f3e8ff', '#fce7f3'];
  const wrapBg = document.createElement('div'); wrapBg.className = 'ctx-colors';
  bgs.forEach(c => {
    const d = document.createElement('div');
    d.className = 'color-dot' + (n.bg === c ? ' active' : '');
    d.style.background = c; d.title = c;
    d.onclick = () => { touch(); n.bg = c; live(); wrapBg.querySelectorAll('.color-dot').forEach(o => o.classList.remove('active')); d.classList.add('active'); syncPanel(); };
    wrapBg.appendChild(d);
  });
  m.appendChild(wrapBg);

  // kiểu node dạng lưới icon
  const labS = document.createElement('div'); labS.className = 'ctx-label'; labS.innerText = 'Kiểu node';
  m.appendChild(labS);
  const grid = document.createElement('div'); grid.className = 'ctx-shape-grid';
  [['root', '●', 'Trung tâm'], ['pill', '▬', 'Pill'], ['underline', '＿', 'Gạch chân'], ['box', '□', 'Hộp'], ['ellipse', '○', 'Elip']].forEach(([v, ic, t]) => {
    const b = document.createElement('button');
    b.innerText = ic; b.title = t; if (n.shape === v) b.classList.add('on');
    b.onclick = () => { touch(); n.shape = v; live(); syncPanel(); grid.querySelectorAll('button').forEach(o => o.classList.remove('on')); b.classList.add('on'); };
    grid.appendChild(b);
  });
  m.appendChild(grid);

  // dày nhánh
  const labW = document.createElement('div'); labW.className = 'ctx-label'; labW.innerText = `Dày nhánh: ${(n.branchWidth || 3)}`;
  m.appendChild(labW);
  const sl = document.createElement('input');
  sl.type = 'range'; sl.min = '1'; sl.max = '8'; sl.step = '0.5'; sl.value = n.branchWidth || 3; sl.className = 'ctx-slider';
  sl.oninput = () => { touch(); n.branchWidth = +sl.value; labW.innerText = `Dày nhánh: ${sl.value}`; live(); syncPanel(); };
  m.appendChild(sl);

  // icon nhanh
  const labI = document.createElement('div'); labI.className = 'ctx-label'; labI.innerText = 'Chèn icon';
  m.appendChild(labI);
  const ico = document.createElement('div'); ico.className = 'ctx-icon-row';
  ['💡', '🎯', '⭐', '🔥', '✅', '📌', '❓', '🚀'].forEach(em => {
    const b = document.createElement('button'); b.innerText = em;
    b.onclick = () => { touch(); n.text = em + ' ' + n.text; ta.value = n.text; live(); syncPanel(); };
    ico.appendChild(b);
  });
  m.appendChild(ico);

  // actions
  const sep = document.createElement('div'); sep.className = 'ctx-sep'; m.appendChild(sep);
  const acts = document.createElement('div'); acts.className = 'ctx-actions';
  const act = (icon, text, fn, disabled) => {
    const b = document.createElement('button'); b.className = 'ctx-item'; b.innerHTML = `<span class="ci">${icon || ''}</span><span>${text}</span>`;
    if (disabled) b.disabled = true;
    b.onclick = () => { hideCtx(); fn && fn(); };
    acts.appendChild(b);
  };
  act('+', 'Con (Tab)', addChild);
  act('↔', 'Ngang (Enter)', addSibling, !hasParent);
  act('⧉', 'Nhân bản', duplicateSelected, !hasParent);
  act('', 'Copy', copySelected);
  act('', 'Cut', cutSelected, !hasParent);
  act('', 'Paste', pasteToSelected, !clipboard);
  act('▲', 'Lên', () => moveSelected(-1), !hasParent);
  act('▼', 'Xuống', () => moveSelected(1), !hasParent);
  act(n.collapsed ? '▸' : '▾', n.collapsed ? 'Mở ra' : 'Thu gọn', () => { pushHistory(); n.collapsed = !n.collapsed; fullRender(); });
  const del = document.createElement('button'); del.className = 'ctx-item danger'; del.innerHTML = '<span class="ci">✕</span><span>Xóa</span>';
  if (!hasParent) del.disabled = true;
  del.onclick = () => { hideCtx(); deleteNode(); };
  acts.appendChild(del);
  m.appendChild(acts);

  const foot = document.createElement('div'); foot.className = 'ctx-foot'; foot.innerText = 'Màu/kiểu/cỡ áp dụng ngay • 1 lần Undo cho cả menu • Esc đóng';
  m.appendChild(foot);

  function refreshCtxState() {
    bB.classList.toggle('on', !!n.bold); bI.classList.toggle('on', !!n.italic); bU.classList.toggle('on', !!n.underline);
    paintSize(); syncPanel();
  }

  // hiện menu
  m.hidden = false;
  requestAnimationFrame(() => { const r = m.getBoundingClientRect(); m.style.left = Math.min(e.clientX, window.innerWidth - r.width - 8) + 'px'; m.style.top = Math.min(e.clientY, window.innerHeight - r.height - 8) + 'px'; });
  setTimeout(() => { ta.focus(); ta.select(); }, 50);
}
function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function clearCache() {
  if (!confirm('Xóa toàn bộ cache (sơ đồ + cài đặt) và về mẫu mặc định?')) return;
  try {
    localStorage.removeItem('mindmap-studio-v1');
    localStorage.removeItem('mindmap-settings-v1');
  } catch {}
  pushHistory();
  settings = { bg: '#fafaf8', grid: 'dots', lineStyle: 'curve', direction: 'right', fileName: 'Sơ đồ tư duy của tôi' };
  root = sampleData();
  selectedId = null; clipboard = null;
  zoom = 0.95; ox = 380; oy = 380;
  const fn = $('#fileName'); if (fn) fn.value = settings.fileName;
  undoStack = []; redoStack = [];
  fullRender(); syncPanel(); applyCanvasStyle();
  toast('Đã xóa cache, về mẫu mặc định');
}
function canvasCtxMenu(e) {
  e.preventDefault();
  const w = worldFromClient(e.clientX, e.clientY);
  showCtx(e.clientX, e.clientY, [
    { label: 'Canvas' },
    { icon: '+', text: 'Thêm nhánh vào trung tâm', action: () => { selectedId = root.id; addChild(); } },
    { icon: '⧉', text: 'Dán vào trung tâm', action: () => { selectedId = root.id; pasteToSelected(); }, disabled: !clipboard },
    'sep',
    { icon: '↺', text: 'Xếp tự động', action: () => { pushHistory(); eachNode(root, x => { x._dx = 0; x._dy = 0; }); fullRender(); } },
    { icon: '◎', text: 'Về giữa', action: () => { ox = viewportEl.clientWidth / 2 - 100; oy = viewportEl.clientHeight / 2; applyTransform(); } },
    { icon: '▢', text: 'Fit màn hình', action: () => { zoom = 0.9; ox = viewportEl.clientWidth / 2 - 150; oy = viewportEl.clientHeight / 2; applyTransform(); } },
    'sep',
    { icon: '✕', text: 'Xóa cache', action: clearCache, danger: true },
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
  set('#propCW', n.cw || ''); set('#propCH', n.ch || '');
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
  const cw = parseInt($('#propCW').value, 10), ch = parseInt($('#propCH').value, 10);
  if (isNaN(cw)) delete n.cw; else n.cw = Math.min(800, Math.max(60, cw));
  if (isNaN(ch)) delete n.ch; else n.ch = Math.min(600, Math.max(30, ch));
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
const newMap = () => { if (!confirm('Tạo mindmap mới?')) return; pushHistory(); root = blankData(); selectedId = root.id; ox = 400; oy = 350; zoom = 1; fullRender(); syncPanel(); toast('Đã tạo mới'); };
const loadSample = () => { pushHistory(); root = sampleData(); selectedId = null; zoom = 0.95; ox = 380; oy = 360; fullRender(); syncPanel(); toast('Đã nạp mẫu'); };
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
  pushHistory(); f.node.collapsed = !f.node.collapsed; fullRender(); toast(f.node.collapsed ? 'Đã thu gọn' : 'Đã mở rộng');
});
bind('btnAuto', () => { pushHistory(); eachNode(root, n => { n._dx = 0; n._dy = 0; }); fullRender(); toast('Đã xếp gọn'); });
bind('btnClearOffset', () => { eachNode(root, n => { n._dx = 0; n._dy = 0; }); fullRender(); });
bind('btnCenter', () => { ox = viewportEl.clientWidth / 2 - 100; oy = viewportEl.clientHeight / 2; applyTransform(); });
bind('zoomIn', () => { zoom = Math.min(2.5, zoom * 1.15); applyTransform(); });
bind('zoomOut', () => { zoom = Math.max(0.25, zoom / 1.15); applyTransform(); });
bind('zoomFit', () => { zoom = 0.9; ox = viewportEl.clientWidth / 2 - 150; oy = viewportEl.clientHeight / 2; applyTransform(); });
const zs = $('#zoomSlider'); if (zs) zs.oninput = (e) => { zoom = (+e.target.value) / 100; applyTransform(); };
// Thanh sửa đường nối gắn trên canvas
buildEdgeColors();
const ew = $('#edgeWidth');
if (ew) {
  const armHist = () => { if (selectedEdge && !edgeHistArmed) { pushHistory(); edgeHistArmed = true; } };
  ew.addEventListener('pointerdown', armHist);
  ew.addEventListener('focus', armHist);
  ew.addEventListener('input', (e) => {
    const f = selectedEdge && findNode(selectedEdge);
    if (!f) return;
    armHist();
    f.node.branchWidth = +e.target.value;
    drawLinks(); save();
  });
}
const e2n = $('#edgeToNode');
if (e2n) e2n.onclick = () => { const id = selectedEdge; hideEdgeBar(); if (id && findNode(id)) { selectedId = id; syncPanel(); refreshSelection(); } };
const eX = $('#edgeClose');
if (eX) eX.onclick = () => hideEdgeBar();
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
function paintMindmapCanvas() {
  const { minX, maxX, minY, maxY } = bounds();
  const scale = +($('#exportScale')?.value || 2);
  const transparent = $('#exportTransparent')?.checked;
  const pad = 80;
  const W = (maxX - minX + pad * 2) * scale, H = (maxY - minY + pad * 2) * scale;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  if (!transparent) { ctx.fillStyle = settings.bg || '#fafaf8'; ctx.fillRect(0, 0, W, H); }
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
  const name = exportFileName();
  return { cv, scale, name };
}
function exportFileName() { return (settings.fileName || 'mindmap').replace(/[\\/:*?"<>|]/g, '').slice(0, 60) || 'mindmap'; }
function exportPNG() {
  const { cv, scale, name } = paintMindmapCanvas();
  dl(cv.toDataURL('image/png'), name + '.png');
  toast('Đã xuất PNG ' + scale + 'x ✔');
}
function exportPDF() {
  // Xuất PDF thật: vẽ lại sơ đồ lên canvas rồi nhúng vào file PDF bằng jsPDF.
  // Nếu thư viện CDN chưa tải được (mất mạng), dùng đường dự phòng: mở ảnh trong tab mới và gọi in.
  const { cv, name } = paintMindmapCanvas();
  const pdfName = name + '.pdf';
  try {
    if (window.jspdf && window.jspdf.jsPDF) {
      const worldW = cv.width / (+($('#exportScale')?.value || 2));
      const worldH = cv.height / (+($('#exportScale')?.value || 2));
      const k = 72 / 96; // px (96dpi) -> point
      const wPt = Math.max(72, worldW * k), hPt = Math.max(72, worldH * k);
      const pdf = new window.jspdf.jsPDF({ orientation: wPt >= hPt ? 'landscape' : 'portrait', unit: 'pt', format: [wPt, hPt], compress: true });
      pdf.addImage(cv.toDataURL('image/png'), 'PNG', 0, 0, wPt, hPt);
      pdf.save(pdfName);
      toast('Đã xuất PDF ✔');
    } else {
      const url = cv.toDataURL('image/png');
      const w = window.open('', '_blank');
      if (!w) { toast('Trình duyệt chặn popup — hãy cho phép popup rồi thử lại'); return; }
      w.document.write('<html><head><meta charset="UTF-8"><title>' + pdfName + '</title><style>body{margin:0}img{width:100%}</style></head><body><img src="' + url + '" onload="setTimeout(function(){print()},400)"></body></html>');
      w.document.close();
      toast('Đã mở bản in — chọn "Save as PDF" để lưu');
    }
  } catch { toast('Xuất PDF thất bại — thử lại hoặc dùng Xuất PNG'); }
}
function exportSVG() {
  const { minX, maxX, minY, maxY } = bounds();
  const pad = 60, W = maxX - minX + pad * 2, H = maxY - minY + pad * 2;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W)}" height="${Math.round(H)}" viewBox="0 0 ${Math.round(W)} ${Math.round(H)}"><rect width="100%" height="100%" fill="${settings.bg || '#fafaf8'}"/>`;
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

/* ============================================================
   UI LAYER — App Shell mới (không sửa engine cũ ở trên)
   Mọi lệnh đều gọi chức năng THẬT đã tồn tại. Không fake.
   ============================================================ */
(function uiLayer() {
  const $1 = (s) => document.querySelector(s);
  const click = (id) => { const el = document.getElementById(id); if (el) el.click(); };
  let tool = 'select';
  let minimapOn = true;

  /* ---------- Save status thật (bám theo save() đồng bộ localStorage) ---------- */
  let saveT = null;
  try {
    const _save = save;
    save = function () {
      const badge = $1('#saveStatus');
      if (badge) { badge.classList.add('saving'); badge.classList.remove('err'); const em = badge.querySelector('em'); if (em) em.textContent = 'Đang lưu…'; badge.title = 'Đang lưu…'; }
      let ok = true;
      try { _save(); } catch { ok = false; }
      clearTimeout(saveT);
      saveT = setTimeout(() => {
        if (!badge) return;
        badge.classList.remove('saving');
        const em = badge.querySelector('em');
        if (em) {
          if (ok) {
            const d = new Date();
            const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
            em.textContent = 'Đã lưu';
            badge.title = 'Đã lưu tự động • ' + hh + ':' + mm;
          } else { badge.classList.add('err'); em.textContent = 'Chưa lưu'; badge.title = 'Lưu local thất bại'; }
        }
      }, 500);
    };
  } catch {}

  /* ---------- Phản ánh Undo/Redo + Empty state + Minimap sau mỗi render ---------- */
  try {
    const _full = fullRender;
    fullRender = function () {
      _full();
      const u = $1('#btnUndo'), r = $1('#btnRedo');
      if (u) u.disabled = !undoStack.length;
      if (r) r.disabled = !redoStack.length;
      const es = $1('#emptyState');
      if (es) {
        try { es.hidden = !(root && (!root.children || root.children.length === 0)); }
        catch { es.hidden = true; }
      }
      const dh = $1('#docHint');
      if (dh) dh.classList.toggle('hide', !!selectedId);
      const sub = $1('#inspSub');
      if (sub) {
        if (!selectedId) sub.textContent = 'Tài liệu — chưa chọn node';
        else { try { const f = findNode(selectedId); sub.textContent = f ? ('Node: ' + shortText(f.node.text)) : 'Node đang chọn'; } catch { sub.textContent = 'Node đang chọn'; } }
      }
      syncMirrors();
      requestAnimationFrame(drawMinimap);
    };
    const _undo = undo, _redo = redo;
    undo = function () { _undo(); const u = $1('#btnUndo'), r = $1('#btnRedo'); if (u) u.disabled = !undoStack.length; if (r) r.disabled = !redoStack.length; requestAnimationFrame(drawMinimap); };
    redo = function () { _redo(); const u = $1('#btnUndo'), r = $1('#btnRedo'); if (u) u.disabled = !undoStack.length; if (r) r.disabled = !redoStack.length; requestAnimationFrame(drawMinimap); };
  } catch {}

  /* ---------- Mirror controls ở tab Trang <-> engine settings ---------- */
  function syncMirrors() {
    try {
      const pairs = [['#canvasBg2', settings.bg], ['#gridStyle2', settings.grid], ['#lineStyle2', settings.lineStyle], ['#dirSelect', settings.direction]];
      pairs.forEach(([sel, v]) => { const el = $1(sel); if (el && v != null && el.value !== String(v)) el.value = String(v); });
    } catch {}
  }
  const bg2 = $1('#canvasBg2');
  if (bg2) bg2.oninput = (e) => { settings.bg = e.target.value; applyCanvasStyle(); save(); };
  const gsM = $1('#gridStyle2');
  if (gsM) gsM.onchange = (e) => { settings.grid = e.target.value; applyCanvasStyle(); save(); toast('Kiểu lưới: ' + e.target.selectedOptions[0].text); };
  const lsM = $1('#lineStyle2');
  if (lsM) lsM.onchange = (e) => { pushHistory(); settings.lineStyle = e.target.value; drawLinks(); save(); };
  const dsM = $1('#dirSelect');
  if (dsM) dsM.onchange = (e) => { pushHistory(); settings.direction = e.target.value; applyCanvasStyle(); fullRender(); };

  /* ---------- Điều khiển trung tâm: mọi mục gọi chức năng thật ---------- */
  function setTool(t) {
    tool = t;
    document.querySelectorAll('.rail-btn[data-cmd]').forEach(b => b.classList.toggle('active', b.dataset.cmd === t));
    viewportEl.style.cursor = t === 'pan' ? 'grab' : '';
    setStatus(t === 'pan' ? 'Công cụ Pan — kéo nền để di chuyển canvas' : 'Công cụ Chọn — click node để chọn, kéo để di chuyển');
  }
  function toggleGrid() {
    settings.grid = settings.grid === 'none' ? 'dots' : 'none';
    applyCanvasStyle(); save();
    toast(settings.grid === 'none' ? 'Đã ẩn lưới' : 'Đã hiện lưới chấm');
  }
  function toggleMinimap() {
    minimapOn = !minimapOn;
    const m = $1('#minimap'); if (m) m.hidden = !minimapOn;
    const b = $1('#btnMinimap'); if (b) b.classList.toggle('off', !minimapOn);
    if (minimapOn) drawMinimap();
  }
  function toggleTheme() {
    const h = document.documentElement;
    const next = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    h.setAttribute('data-theme', next);
    try { localStorage.setItem('mindmap-theme', next); } catch {}
    toast(next === 'dark' ? 'Đã bật chế độ tối' : 'Đã bật chế độ sáng');
  }
  try {
    const th = localStorage.getItem('mindmap-theme');
    if (th === 'dark' || th === 'light') document.documentElement.setAttribute('data-theme', th);
  } catch {}
  function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    } catch { toast('Trình duyệt chặn toàn màn hình'); }
  }
  function openModal(id) { const m = $1('#' + id); if (m) m.hidden = false; }
  function closeModal(m) { if (m) m.hidden = true; }

  function runCmd(cmd) {
    switch (cmd) {
      case 'new': click('btnNew2'); break;
      case 'sample': click('btnSample'); break;
      case 'open': openModal('importModal'); break;
      case 'saveJson': click('btnExportJSON'); toast('Đã lưu file JSON'); break;
      case 'saveSvg': click('btnExportSVG'); break;
      case 'exportPdf': exportPDF(); break;
      case 'export': openModal('exportModal'); setTimeout(() => $1('#btnDoExport') && $1('#btnDoExport').focus(), 60); break;
      case 'clearCache': click('btnClearCache'); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'copy': copySelected(); break;
      case 'cut': cutSelected(); break;
      case 'paste': pasteToSelected(); break;
      case 'duplicate': duplicateSelected(); break;
      case 'delete': deleteNode(); break;
      case 'child': addChild(); break;
      case 'sibling': addSibling(); break;
      case 'edit': startEditSelected(); break;
      case 'up': moveSelected(-1); break;
      case 'down': moveSelected(1); break;
      case 'top': moveTopBottom(true); break;
      case 'bottom': moveTopBottom(false); break;
      case 'collapse': click('btnCollapse'); break;
      case 'auto': click('btnAuto'); break;
      case 'resetOffset': click('btnClearOffset'); toast('Đã reset vị trí kéo tay'); break;
      case 'zoomIn': click('zoomIn'); break;
      case 'zoomOut': click('zoomOut'); break;
      case 'fit': click('zoomFit'); break;
      case 'center': click('btnCenter'); break;
      case 'grid': toggleGrid(); break;
      case 'minimap': toggleMinimap(); break;
      case 'themeMode': toggleTheme(); break;
      case 'fullscreen': toggleFullscreen(); break;
      case 'dirRight': click('dirRight'); break;
      case 'dirBoth': click('dirBoth'); break;
      case 'dirDown': click('dirDown'); break;
      case 'theme': click('btnTheme'); break;
      case 'icons': click('btnIcons'); break;
      case 'shortcuts': openModal('helpModal'); break;
      case 'guide': openModal('helpModal'); break;
      case 'palette': openPalette(); break;
      case 'select': setTool('select'); break;
      case 'pan': setTool('pan'); break;
      case 'hardReload': {
        // Tải lại trang, ép trình duyệt bỏ qua cache để thấy bản cập nhật mới nhất
        try {
          const u = new URL(location.href);
          u.searchParams.set('r', Date.now().toString(36));
          location.href = u.toString();
        } catch { location.reload(); }
        break;
      }
      default: break;
    }
  }
  document.querySelectorAll('[data-cmd]').forEach(b => {
    if (b.closest('#quickBar')) return;
    b.addEventListener('click', (e) => { e.stopPropagation(); runCmd(b.dataset.cmd); closeAllMenus(); hideMobilePanels(); });
  });

  /* ---------- Menus ---------- */
  function closeAllMenus() { document.querySelectorAll('.menu.open').forEach(m => { m.classList.remove('open'); const btn = m.querySelector('.menu-btn,.avatar-btn'); if (btn) btn.setAttribute('aria-expanded', 'false'); }); }
  document.querySelectorAll('[data-menu] > .menu-btn, [data-menu] > .avatar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrap = btn.closest('[data-menu]');
      const was = wrap.classList.contains('open');
      closeAllMenus();
      if (!was) { wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('[data-menu]')) closeAllMenus(); });

  /* ---------- Panels collapse (desktop) + drawers (mobile) ---------- */
  const showEdge = () => {
    const l = $1('#edgeLeft'), r = $1('#edgeRight');
    if (l) l.hidden = !document.body.classList.contains('dock-collapsed');
    if (r) r.hidden = !document.body.classList.contains('insp-collapsed');
  };
  const bDL = $1('#btnDockLeft'); if (bDL) bDL.onclick = () => { document.body.classList.add('dock-collapsed'); showEdge(); };
  const bSL = $1('#btnShowLeft'); if (bSL) bSL.onclick = () => { document.body.classList.remove('dock-collapsed'); showEdge(); };
  const bIR = $1('#btnInspector'); if (bIR) bIR.onclick = () => { document.body.classList.add('insp-collapsed'); showEdge(); };
  const bSR = $1('#btnShowRight'); if (bSR) bSR.onclick = () => { document.body.classList.remove('insp-collapsed'); showEdge(); };
  function hideMobilePanels() { document.body.classList.remove('show-left', 'show-right'); }
  const bRL = $1('#btnRailLeft'); if (bRL) bRL.onclick = (e) => { e.stopPropagation(); document.body.classList.toggle('show-left'); document.body.classList.remove('show-right'); };
  const bDLM = $1('#btnDockLeftM'); if (bDLM) bDLM.onclick = (e) => { e.stopPropagation(); document.body.classList.toggle('show-left'); document.body.classList.remove('show-right'); };
  const bIRM = $1('#btnInspectorM'); if (bIRM) bIRM.onclick = (e) => { e.stopPropagation(); document.body.classList.toggle('show-right'); document.body.classList.remove('show-left'); };
  viewportEl.addEventListener('mousedown', hideMobilePanels);

  /* ---------- Nút phụ toolstrip ---------- */
  const bAT = $1('#btnAutoTop'); if (bAT) bAT.onclick = () => click('btnAuto');
  const bFT = $1('#btnFitTop'); if (bFT) bFT.onclick = () => click('zoomFit');
  const bGT = $1('#btnGridTop'); if (bGT) bGT.onclick = toggleGrid;
  const bMM = $1('#btnMinimap'); if (bMM) bMM.onclick = toggleMinimap;
  const bMMX = $1('#btnMinimapX'); if (bMMX) bMMX.onclick = toggleMinimap;
  const bTM = $1('#btnThemeMode'); if (bTM) bTM.onclick = toggleTheme;
  const bEO = $1('#btnExportOpen'); if (bEO) bEO.onclick = () => openModal('exportModal');
  const bPL = $1('#btnPalette'); if (bPL) bPL.onclick = openPalette;

  /* ---------- Export modal: chỉ PNG / SVG / JSON (đúng khả năng thật) ---------- */
  const bDO = $1('#btnDoExport');
  if (bDO) bDO.onclick = () => {
    const fmt = (document.querySelector('input[name="exportFmt"]:checked') || {}).value || 'png';
    closeModal($1('#exportModal'));
    if (fmt === 'png') exportPNG();
    else if (fmt === 'svg') exportSVG();
    else if (fmt === 'pdf') exportPDF();
    else click('btnExportJSON');
  };

  /* ---------- Import modal: chỉ JSON (đúng khả năng đọc thật) ---------- */
  function importJSONFile(f) {
    if (!f) return;
    if (!/\.json$/i.test(f.name)) { toast('Chỉ đọc được file .json'); return; }
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || typeof data !== 'object' || !('text' in data)) throw 0;
        pushHistory();
        root = withDefaults(data);
        selectedId = null; clipboard = null;
        closeModal($1('#importModal'));
        fullRender(); syncPanel();
        toast('Đã nhập ' + f.name);
      } catch { toast('File JSON không hợp lệ'); }
    };
    r.readAsText(f);
  }
  const dz = $1('#dropzone'), bBR = $1('#btnBrowse'), fi = $1('#fileInput');
  if (bBR && fi) bBR.onclick = (e) => { e.stopPropagation(); fi.click(); };
  if (fi) fi.addEventListener('change', (e) => {
    // input file gốc của engine đã có handler riêng; nếu file không do engine xử lý kịp thì fallback ở đây
    setTimeout(() => { if (e.target.files && e.target.files[0] && !document.querySelector('#importModal').hidden) importJSONFile(e.target.files[0]); }, 0);
  });
  if (dz) {
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; importJSONFile(f); });
    dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' && fi) fi.click(); });
    dz.addEventListener('click', (e) => { if (e.target === dz && fi) fi.click(); });
  }
  // Khi modal import mở mà engine đọc file xong thì tự đóng modal
  if (fi) {
    const prev = fi.onchange;
    fi.addEventListener('change', () => {
      setTimeout(() => { const m = $1('#importModal'); if (m && !m.hidden && fi.files && fi.files.length) { /* engine đã xử lý */ m.hidden = true; } }, 300);
    });
  }

  /* ---------- Command palette (Ctrl+K) — toàn lệnh thật ---------- */
  const CMDS = [
    { id: 'child', icon: '+', label: 'Thêm nhánh con', hint: 'Tab' },
    { id: 'sibling', icon: '↔', label: 'Thêm nhánh ngang', hint: 'Enter' },
    { id: 'edit', icon: '✎', label: 'Sửa node đang chọn', hint: 'F2' },
    { id: 'duplicate', icon: '⧉', label: 'Nhân bản node', hint: 'Ctrl+D' },
    { id: 'delete', icon: '✕', label: 'Xóa node', hint: 'Del' },
    { id: 'copy', icon: '', label: 'Copy node', hint: 'Ctrl+C' },
    { id: 'cut', icon: '', label: 'Cut node', hint: 'Ctrl+X' },
    { id: 'paste', icon: '', label: 'Paste vào node', hint: 'Ctrl+V' },
    { id: 'up', icon: '▲', label: 'Đưa node lên', hint: 'Alt+↑' },
    { id: 'down', icon: '▼', label: 'Đưa node xuống', hint: 'Alt+↓' },
    { id: 'collapse', icon: '▾', label: 'Thu gọn / mở rộng', hint: '' },
    { id: 'auto', icon: '↺', label: 'Xếp gọn tự động', hint: '' },
    { id: 'zoomIn', icon: '+', label: 'Phóng to', hint: '+' },
    { id: 'zoomOut', icon: '−', label: 'Thu nhỏ', hint: '−' },
    { id: 'fit', icon: '▢', label: 'Vừa màn hình', hint: 'Fit' },
    { id: 'center', icon: '◎', label: 'Về giữa', hint: '' },
    { id: 'grid', icon: '#', label: 'Bật/tắt lưới', hint: '' },
    { id: 'minimap', icon: '▭', label: 'Hiện/ẩn minimap', hint: '' },
    { id: 'themeMode', icon: '◐', label: 'Sáng / tối', hint: '' },
    { id: 'theme', icon: '', label: 'Theme 1-click…', hint: '' },
    { id: 'icons', icon: '', label: 'Chèn icon…', hint: '' },
    { id: 'dirRight', icon: '→', label: 'Hướng: Phải', hint: '' },
    { id: 'dirBoth', icon: '↔', label: 'Hướng: 2 bên', hint: '' },
    { id: 'dirDown', icon: '↓', label: 'Hướng: Dọc', hint: '' },
    { id: 'new', icon: '', label: 'Sơ đồ mới', hint: '' },
    { id: 'sample', icon: '', label: 'Nạp sơ đồ mẫu', hint: '' },
    { id: 'open', icon: '', label: 'Nhập file JSON…', hint: '' },
    { id: 'saveJson', icon: '', label: 'Lưu file JSON', hint: 'Ctrl+S' },
    { id: 'saveSvg', icon: '', label: 'Xuất SVG', hint: '' },
    { id: 'exportPdf', icon: '', label: 'Xuất PDF', hint: '' },
    { id: 'export', icon: '', label: 'Xuất PNG / SVG / PDF / JSON…', hint: '' },
    { id: 'undo', icon: '↩', label: 'Undo', hint: 'Ctrl+Z' },
    { id: 'redo', icon: '↪', label: 'Redo', hint: 'Ctrl+Y' },
    { id: 'shortcuts', icon: '', label: 'Phím tắt & trợ giúp', hint: '?' },
    { id: 'fullscreen', icon: '▢', label: 'Toàn màn hình', hint: '' },
    { id: 'clearCache', icon: '✕', label: 'Xóa cache…', hint: '' },
  ];
  let palSel = 0, palItems = CMDS.slice();
  function openPalette() { openModal('paletteModal'); const i = $1('#paletteInput'); if (i) { i.value = ''; paintPalette(''); setTimeout(() => i.focus(), 40); } }
  function closePalette() { closeModal($1('#paletteModal')); }
  function paintPalette(q) {
    const list = $1('#paletteList'); if (!list) return;
    q = (q || '').toLowerCase();
    palItems = CMDS.filter(c => (c.label + ' ' + c.id).toLowerCase().includes(q));
    palSel = 0;
    list.innerHTML = '';
    if (!palItems.length) { list.innerHTML = '<div class="palette-item">Không có lệnh nào khớp</div>'; return; }
    palItems.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'palette-item' + (i === palSel ? ' sel' : '');
      b.setAttribute('role', 'option');
      b.innerHTML = '<span class="pi">' + c.icon + '</span><span>' + c.label + '</span>' + (c.hint ? '<small>' + c.hint + '</small>' : '');
      b.onclick = () => { closePalette(); runCmd(c.id); };
      b.onmousemove = () => { palSel = i; syncPalSel(); };
      list.appendChild(b);
    });
  }
  function syncPalSel() {
    const list = $1('#paletteList'); if (!list) return;
    Array.from(list.children).forEach((el, i) => el.classList.toggle('sel', i === palSel));
    const cur = list.children[palSel]; if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }
  const pIn = $1('#paletteInput');
  if (pIn) {
    pIn.addEventListener('input', () => paintPalette(pIn.value));
    pIn.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palItems.length - 1, palSel + 1); syncPalSel(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, palSel - 1); syncPalSel(); }
      else if (e.key === 'Enter') { e.preventDefault(); const c = palItems[palSel]; if (c) { closePalette(); runCmd(c.id); } }
      else if (e.key === 'Escape') closePalette();
    });
  }

  /* ---------- Minimap thật (vẽ từ node, click/kéo để pan) ---------- */
  function drawMinimap() {
    const box = $1('#minimap');
    if (!box || box.hidden || !minimapOn) return;
    const cv = $1('#minimapCanvas'); if (!cv || !root) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    try {
      eachNode(root, (n) => {
        if (n.collapsed && n._skip) return;
        minX = Math.min(minX, n._x - n._w / 2); maxX = Math.max(maxX, n._x + n._w / 2);
        minY = Math.min(minY, n._y - n._h / 2); maxY = Math.max(maxY, n._y + n._h / 2);
      });
    } catch { return; }
    if (minX > maxX) return;
    const pad = 60, bw = (maxX - minX + pad * 2) || 1, bh = (maxY - minY + pad * 2) || 1;
    const s = Math.min(W / bw, H / bh);
    const X = (x) => (x - minX + pad) * s + (W - bw * s) / 2;
    const Y = (y) => (y - minY + pad) * s + (H - bh * s) / 2;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--panel-2') || '#f1f2f8';
    ctx.fillRect(0, 0, W, H);
    try {
      eachNode(root, (n) => {
        ctx.fillStyle = n.branchColor || '#c9cfe3';
        ctx.globalAlpha = 0.85;
        const w = Math.max(3, n._w * s), h = Math.max(3, n._h * s);
        ctx.fillRect(X(n._x) - w / 2, Y(n._y) - h / 2, w, h);
        if (n.id === selectedId) { ctx.globalAlpha = 1; ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 1.5; ctx.strokeRect(X(n._x) - w / 2 - 1, Y(n._y) - h / 2 - 1, w + 2, h + 2); }
      });
      ctx.globalAlpha = 1;
      const rect = viewportEl.getBoundingClientRect();
      const tl = { x: (0 - ox) / zoom, y: (0 - oy) / zoom };
      const br = { x: (rect.width - ox) / zoom, y: (rect.height - oy) / zoom };
      ctx.strokeStyle = '#101828'; ctx.lineWidth = 1.2;
      ctx.strokeRect(X(tl.x), Y(tl.y), (br.x - tl.x) * s, (br.y - tl.y) * s);
    } catch {}
    cv._nav = { minX, maxX, minY, maxY, pad, bw, bh, s, W, H };
  }
  function minimapGo(ev) {
    const cv = $1('#minimapCanvas'); if (!cv || !cv._nav) return;
    const r = cv.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (cv.width / r.width);
    const py = (ev.clientY - r.top) * (cv.height / r.height);
    const nv = cv._nav;
    const wx = (px - (nv.W - nv.bw * nv.s) / 2) / nv.s + nv.minX - nv.pad;
    const wy = (py - (nv.H - nv.bh * nv.s) / 2) / nv.s + nv.minY - nv.pad;
    const rect = viewportEl.getBoundingClientRect();
    ox = rect.width / 2 - wx * zoom; oy = rect.height / 2 - wy * zoom;
    applyTransform(); requestAnimationFrame(drawMinimap);
  }
  const mmC = $1('#minimapCanvas');
  if (mmC) {
    let dragging = false;
    mmC.addEventListener('mousedown', (e) => { dragging = true; minimapGo(e); });
    document.addEventListener('mousemove', (e) => { if (dragging) minimapGo(e); });
    document.addEventListener('mouseup', () => dragging = false);
  }

  /* ---------- Phím tắt bổ sung (không đè handler cũ): Ctrl+K/S, ?, V/H ---------- */
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const inField = t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable);
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); const m = $1('#paletteModal'); if (m && !m.hidden) closePalette(); else openPalette(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); click('btnExportJSON'); toast('Đã lưu file JSON'); return; }
    if (e.key === 'Escape') { closePalette(); closeAllMenus(); hideMobilePanels(); hideEdgeBar(); return; }
    if (inField || mod || e.altKey) return;
    if (e.key === '?') { e.preventDefault(); openModal('helpModal'); return; }
    if (e.key.toLowerCase() === 'v') setTool('select');
    else if (e.key.toLowerCase() === 'h') setTool('pan');
  });
  // Click chip tìm kiếm mở palette
  const tsKbd = document.querySelector('.top-search kbd');
  if (tsKbd) { tsKbd.style.cursor = 'pointer'; tsKbd.onclick = openPalette; }
  // Đóng modal khi click nền
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('mousedown', (e) => { if (e.target === m && m.id !== 'paletteModal') m.hidden = true; }));

  /* ---------- Kích hoạt trạng thái đầu ---------- */
  setTool('select');
  showEdge();
  syncMirrors();
  const u0 = $1('#btnUndo'), r0 = $1('#btnRedo');
  if (u0) u0.disabled = true;
  if (r0) r0.disabled = true;
  const mm0 = $1('#minimap'); if (mm0) mm0.hidden = !minimapOn;
  fullRender();
})();

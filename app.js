/* MindMap Studio — engine */
const $ = (s) => document.querySelector(s);
const nodesEl = $('#nodes'), linksEl = $('#links');
const worldEl = $('#world'), viewportEl = $('#viewport');

const uid = () => 'n' + Math.random().toString(36).slice(2, 9);
const clone = (o) => JSON.parse(JSON.stringify(o));

function blankData() {
  return { id: uid(), text: 'Chủ đề trung tâm', shape: 'root', bg: '#e85454', color: '#ffffff', branchColor: '#e85454', branchWidth: 3, fontSize: 19, bold: true, italic: false, children: [], _dx: 0, _dy: 0 };
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

try {
  const saved = localStorage.getItem('mindmap-studio-v1');
  root = saved ? JSON.parse(saved) : sampleData();
} catch { root = sampleData(); }

function save() { localStorage.setItem('mindmap-studio-v1', JSON.stringify(root)); }
function pushHistory() {
  undoStack.push(clone(root));
  if (undoStack.length > 80) undoStack.shift();
  redoStack = [];
}
function undo() {
  if (!undoStack.length) return setStatus('Không còn gì để Undo');
  redoStack.push(clone(root));
  root = undoStack.pop();
  selectedId = null; fullRender();
}
function redo() {
  if (!redoStack.length) return setStatus('Không còn gì để Redo');
  undoStack.push(clone(root));
  root = redoStack.pop();
  fullRender();
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

// ---------- RENDER ----------
function fullRender() {
  nodesEl.innerHTML = '';
  // tạo div
  eachNode(root, (n) => {
    const d = document.createElement('div');
    d.className = 'node ' + (n.shape || 'pill');
    d.dataset.id = n.id;
    d.style.background = n.shape === 'underline' ? 'transparent' : (n.bg || '#fff');
    d.style.color = n.color || '#1f2a37';
    d.style.fontSize = (n.fontSize || 15) + 'px';
    d.style.fontWeight = n.bold ? '700' : '400';
    d.style.fontStyle = n.italic ? 'italic' : 'normal';
    if (n.shape === 'box' || n.shape === 'underline') {
      d.style.borderColor = n.branchColor || '#e85454';
    }
    if (n.shape === 'underline') d.style.borderBottomColor = n.branchColor;
    d.innerText = n.text;
    if (n.id === selectedId) d.classList.add('selected');
    if (n.collapsed && n.children?.length) {
      const b = document.createElement('span');
      b.className = 'collapse-badge'; b.innerText = '+';
      d.appendChild(b);
    }
    // events
    d.addEventListener('click', (e) => { e.stopPropagation(); selectedId = n.id; syncPanel(); refreshSelection(); });
    d.addEventListener('dblclick', (e) => { e.stopPropagation(); startEdit(d, n); });
    d.addEventListener('mousedown', (e) => startDragNode(e, n));
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
}
function subtreeHeight(n) {
  if (!n.children?.length || n.collapsed) return (n._h || 40) + 18;
  return n.children.reduce((a, c) => a + subtreeHeight(c), 0);
}
function layoutTree() {
  root._x = 0; root._y = 0;
  layoutChildren(root);
  function layoutChildren(parent) {
    if (!parent.children?.length || parent.collapsed) return;
    const gapX = parent === root ? 200 : 110;
    const total = parent.children.reduce((a, c) => a + subtreeHeight(c), 0);
    let y = parent._y - total / 2;
    for (const c of parent.children) {
      const h = subtreeHeight(c);
      const cx = parent._x + parent._w / 2 + gapX + c._w / 2;
      const cy = y + h / 2;
      c._x = cx + (c._dx || 0);
      c._y = cy + (c._dy || 0);
      // lưu vị trí gốc để drag không cộng dồn
      c._bx = cx; c._by = cy;
      y += h;
      layoutChildren(c);
    }
    // root: tăng khoảng cách cụm trên/dưới cho cong đẹp như ảnh
    if (parent === root && parent.children.length >= 4) {
      // nới các nhánh đầu lên trên, nhánh cuối xuống dưới
      parent.children[0]._y -= 40; parent.children[0]._by -= 40;
      const last = parent.children[parent.children.length - 1];
      last._y += 30; last._by += 30;
      // layout lại con của các nhánh bị nới
      relayoutBranch(parent.children[0]); relayoutBranch(last);
    }
  }
  function relayoutBranch(parent) {
    if (!parent.children?.length || parent.collapsed) return;
    const total = parent.children.reduce((a, c) => a + subtreeHeight(c), 0);
    let y = parent._y - total / 2;
    for (const c of parent.children) {
      const h = subtreeHeight(c);
      c._bx = parent._x + parent._w / 2 + 110 + c._w / 2;
      c._by = y + h / 2;
      c._x = c._bx + (c._dx || 0); c._y = c._by + (c._dy || 0);
      y += h; relayoutBranch(c);
    }
  }
  // root cũng cộng offset tay
  root._x += (root._dx || 0); root._y += (root._dy || 0);
}
function applyTransform() {
  worldEl.style.transform = `translate(${ox}px,${oy}px) scale(${zoom})`;
  eachNode(root, (n) => {
    n._el.style.left = n._x + 'px';
    n._el.style.top = n._y + 'px';
  });
  $('#zoomLabel').innerText = Math.round(zoom * 100) + '%';
}
function drawLinks() {
  linksEl.innerHTML = '';
  const NS = 'http://www.w3.org/2000/svg';
  function path(parent, child) {
    let sx, sy;
    if (parent === root) {
      if (child._y < parent._y - 60) { sx = parent._x + 30; sy = parent._y - parent._h / 2 + 4; }
      else if (child._y > parent._y + 60) { sx = parent._x + 30; sy = parent._y + parent._h / 2 - 4; }
      else { sx = parent._x + parent._w / 2; sy = parent._y; }
    } else { sx = parent._x + parent._w / 2; sy = parent._y; }
    const ex = child._x - child._w / 2 - 4;
    const ey = child._y;
    const dx = Math.max(50, (ex - sx) / 2);
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M ${sx + OFFSET} ${sy + OFFSET} C ${sx + dx + OFFSET} ${sy + OFFSET}, ${ex - dx + OFFSET} ${ey + OFFSET}, ${ex + OFFSET} ${ey + OFFSET}`);
    p.setAttribute('stroke', child.branchColor || parent.branchColor || '#e85454');
    p.setAttribute('stroke-width', child.branchWidth || 2.5);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke-linecap', 'round');
    linksEl.appendChild(p);
    (child.children || []).forEach(c => { if (!child.collapsed) path(child, c); });
  }
  (root.children || []).forEach(c => path(root, c));
}

// ---------- EDIT / ADD / DELETE ----------
function startEdit(div, n) {
  const ta = document.createElement('textarea');
  ta.value = n.text; ta.rows = 2;
  ta.style.width = Math.max(180, n._w) + 'px';
  div.innerHTML = ''; div.appendChild(ta);
  ta.focus(); ta.select();
  const done = (ok) => {
    if (ok) { pushHistory(); n.text = ta.value.trim() || 'Trống'; }
    fullRender();
  };
  ta.addEventListener('blur', () => done(true));
  ta.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); done(true); }
    if (e.key === 'Escape') done(false);
  });
  ta.addEventListener('mousedown', e => e.stopPropagation());
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
    children: [], _dx: 0, _dy: 0
  };
  t.children = t.children || []; t.children.push(c);
  selectedId = c.id; fullRender(); syncPanel();
  setStatus('Đã thêm nhánh con — double-click để sửa chữ');
}
function addSibling() {
  if (!selectedId) return addChild();
  const f = findNode(selectedId);
  if (!f || !f.parent) return addChild();
  pushHistory();
  const c = { id: uid(), text: 'Nhánh mới', shape: f.node.shape, bg: f.node.bg, color: f.node.color, branchColor: f.node.branchColor, branchWidth: f.node.branchWidth, fontSize: f.node.fontSize, children: [], _dx: 0, _dy: 0 };
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

// ---------- DRAG NODE + PAN + ZOOM ----------
function startDragNode(e, n) {
  if (e.button !== 0) return;
  e.stopPropagation();
  const startX = e.clientX, startY = e.clientY;
  const origDx = n._dx || 0, origDy = n._dy || 0;
  let moved = false;
  const mv = (ev) => {
    const dx = (ev.clientX - startX) / zoom, dy = (ev.clientY - startY) / zoom;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    if (moved) {
      n._dx = origDx + dx; n._dy = origDy + dy;
      if (n === root) { n._x += dx * 0; } // root dùng layout
      // cập nhật nhanh không rebuild DOM
      refreshBranchPositions();
    }
  };
  const up = () => {
    document.removeEventListener('mousemove', mv);
    document.removeEventListener('mouseup', up);
    if (moved) { pushHistorySilent(); save(); }
    else { selectedId = n.id; syncPanel(); refreshSelection(); }
  };
  document.addEventListener('mousemove', mv);
  document.addEventListener('mouseup', up);
}
// history cho drag: chỉ push 1 lần trước khi drag? đơn giản: push trước khi bắt đầu move
let dragPushed = false;
function pushHistorySilent() { /* đã push ở lần move đầu thì thôi */ }

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

// ---------- PANEL / COLORS ----------
const branchPalette = ['#e85454', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280', '#111827'];
const bgPalette = ['#ffffff', '#fde8e9', '#fef3e6', '#fff8cc', '#e6f7e8', '#dbeafe', '#f3e8ff', '#fce7f3', '#e85454', '#111827'];
function buildPalette(elId, colors, cb) {
  const el = $(elId); el.innerHTML = '';
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
  if (!selectedId) return setStatus('Hãy chọn 1 node trước');
  pushHistory();
  Object.assign(findNode(selectedId).node, patch);
  fullRender(); syncPanel();
}
document.querySelectorAll('.shape-btns button').forEach(b => b.onclick = () => applyToSelected({ shape: b.dataset.shape }));
$('#btnBold').onclick = () => { const f = selectedId && findNode(selectedId); if (!f) return; pushHistory(); f.node.bold = !f.node.bold; fullRender(); };
$('#btnItalic').onclick = () => { const f = selectedId && findNode(selectedId); if (!f) return; pushHistory(); f.node.italic = !f.node.italic; fullRender(); };
$('#fontPlus').onclick = () => { const f = selectedId && findNode(selectedId); if (!f) return; pushHistory(); f.node.fontSize = Math.min(40, (f.node.fontSize || 15) + 1); fullRender(); syncPanel(); };
$('#fontMinus').onclick = () => { const f = selectedId && findNode(selectedId); if (!f) return; pushHistory(); f.node.fontSize = Math.max(10, (f.node.fontSize || 15) - 1); fullRender(); syncPanel(); };
$('#textColor').oninput = (e) => applyToSelected({ color: e.target.value });

function syncPanel() {
  const f = selectedId ? findNode(selectedId) : null;
  if (!f) { $('#propText').value = ''; return; }
  const n = f.node;
  $('#propText').value = n.text;
  $('#propBg').value = toColor(n.bg); $('#propColor').value = toColor(n.color);
  $('#propBranch').value = toColor(n.branchColor); $('#propFontSize').value = n.fontSize || 15;
  $('#propShape').value = n.shape || 'pill'; $('#propWidth').value = n.branchWidth || 3;
}
function toColor(c) { if (!c) return '#000000'; if (/^#[0-9a-f]{6}$/i.test(c)) return c; if (/^#[0-9a-f]{3}$/i.test(c)) return c; return '#000000'; }
$('#btnApply').onclick = () => {
  if (!selectedId) return;
  pushHistory();
  const n = findNode(selectedId).node;
  n.text = $('#propText').value; n.bg = $('#propBg').value; n.color = $('#propColor').value;
  n.branchColor = $('#propBranch').value; n.fontSize = +$('#propFontSize').value;
  n.shape = $('#propShape').value; n.branchWidth = +$('#propWidth').value;
  fullRender();
};
['propText'].forEach(id => $('#' + id).addEventListener('keydown', e => e.stopPropagation()));

// ---------- TOOLBAR ----------
$('#btnNew').onclick = () => { if (!confirm('Tạo mindmap mới? (bản hiện tại vẫn lưu Undo được)')) return; pushHistory(); root = blankData(); selectedId = root.id; ox = 400; oy = 350; zoom = 1; fullRender(); syncPanel(); };
$('#btnSample').onclick = () => { pushHistory(); root = sampleData(); selectedId = null; zoom = 0.95; ox = 380; oy = 360; fullRender(); syncPanel(); setStatus('Đã nạp mẫu giống ảnh — bấm Xuất PNG để ra ảnh'); };
$('#btnUndo').onclick = undo; $('#btnRedo').onclick = redo;
$('#btnAddChild').onclick = addChild; $('#btnAddSibling').onclick = addSibling; $('#btnDelete').onclick = deleteNode;
$('#btnCollapse').onclick = () => {
  const f = selectedId && findNode(selectedId); if (!f) return;
  pushHistory(); f.node.collapsed = !f.node.collapsed; fullRender();
};
$('#btnAuto').onclick = () => { pushHistory(); eachNode(root, n => { n._dx = 0; n._dy = 0; }); fullRender(); };
$('#btnClearOffset').onclick = () => { eachNode(root, n => { n._dx = 0; n._dy = 0; }); fullRender(); };
$('#btnCenter').onclick = () => { ox = viewportEl.clientWidth / 2 - 100; oy = viewportEl.clientHeight / 2; applyTransform(); };
$('#zoomIn').onclick = () => { zoom = Math.min(2.5, zoom * 1.15); applyTransform(); };
$('#zoomOut').onclick = () => { zoom = Math.max(0.25, zoom / 1.15); applyTransform(); };
$('#zoomFit').onclick = () => { zoom = 0.9; ox = viewportEl.clientWidth / 2 - 150; oy = viewportEl.clientHeight / 2; applyTransform(); };
$('#chkGrid').onchange = (e) => viewportEl.classList.toggle('grid', e.target.checked);
$('#btnHelp').onclick = () => $('#helpModal').hidden = false;
$('#btnCloseHelp').onclick = () => $('#helpModal').hidden = true;

// keyboard
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (e.key === 'Tab') { e.preventDefault(); addChild(); }
  else if (e.key === 'Enter') { e.preventDefault(); addSibling(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteNode(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
});

// ---------- IMPORT / EXPORT ----------
$('#btnExportJSON').onclick = () => {
  const blob = new Blob([JSON.stringify(root, null, 2)], { type: 'application/json' });
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

$('#btnExportPNG').onclick = exportPNG;
function exportPNG() {
  // tính bounds
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  eachNode(root, (n) => {
    if (n.collapsed) { /* vẫn vẽ parent */ }
    minX = Math.min(minX, n._x - n._w / 2); maxX = Math.max(maxX, n._x + n._w / 2);
    minY = Math.min(minY, n._y - n._h / 2); maxY = Math.max(maxY, n._y + n._h / 2);
  });
  const pad = 80, scale = 2;
  const W = (maxX - minX + pad * 2) * scale, H = (maxY - minY + pad * 2) * scale;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fafaf7'; ctx.fillRect(0, 0, W, H);
  const X = (x) => (x - minX + pad) * scale, Y = (y) => (y - minY + pad) * scale;
  // links
  function link(p, c) {
    let sx, sy;
    if (p === root) {
      if (c._y < p._y - 60) { sx = p._x + 30; sy = p._y - p._h / 2; }
      else if (c._y > p._y + 60) { sx = p._x + 30; sy = p._y + p._h / 2; }
      else { sx = p._x + p._w / 2; sy = p._y; }
    } else { sx = p._x + p._w / 2; sy = p._y; }
    const ex = c._x - c._w / 2, ey = c._y;
    ctx.strokeStyle = c.branchColor || '#e85454'; ctx.lineWidth = (c.branchWidth || 2.5) * scale; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X(sx), Y(sy));
    const dx = Math.max(50 * scale, (X(ex) - X(sx)) / 2);
    ctx.bezierCurveTo(X(sx) + dx / scale * scale * 0.5 + 40, Y(sy), X(ex) - dx / scale * scale * 0.5 - 40, Y(ey), X(ex), Y(ey));
    ctx.stroke();
    (c.children || []).forEach(k => { if (!c.collapsed) link(c, k); });
  }
  (root.children || []).forEach(c => link(root, c));
  // nodes
  eachNode(root, (n, depth) => {
    if (n._skip) return;
    const w = n._w * scale, h = n._h * scale;
    const x = X(n._x) - w / 2, y = Y(n._y) - h / 2;
    ctx.font = `${n.bold ? '700' : '400'} ${(n.fontSize || 15) * scale}px 'Be Vietnam Pro', Arial`;
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
      ctx.moveTo(x + 4, y + h); ctx.quadraticCurveTo(x - 6, y + h, x - 6, y + h / 2);
      ctx.lineTo(x - 6, y + 8); ctx.quadraticCurveTo(x - 6, y, x + 6, y);
      ctx.stroke();
      ctx.fillStyle = n.color; ctx.textAlign = 'left';
      multiline(ctx, n.text, x + 14, Y(n._y), w - 18, (n.fontSize + 5) * scale, 'left');
    } else {
      roundRect(ctx, x, y, w, h, 10 * scale, n.shape === 'box' ? '#ffffff' : n.bg);
      if (n.shape === 'box') { ctx.strokeStyle = n.branchColor; ctx.lineWidth = 2 * scale; ctx.stroke(); }
      ctx.fill(); ctx.fillStyle = n.color; ctx.textAlign = 'center';
      multiline(ctx, n.text, X(n._x), Y(n._y), w - 16, (n.fontSize + 5) * scale);
    }
  });
  dl(cv.toDataURL('image/png'), 'mindmap.png');
  setStatus('Đã xuất PNG nền trắng giống ảnh mẫu ✔');
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

function setStatus(t) { $('#status').innerText = t; }

// init
viewportEl.classList.add('grid');
zoom = 0.95; ox = 380; oy = 380;
fullRender(); syncPanel();
pushHistory0();
function pushHistory0() { undoStack.push(clone(root)); undoStack.shift?.(); undoStack = []; }
setStatus('Sẵn sàng • Bấm ⭐ Mẫu ảnh để xem mẫu giống file bạn gửi');

import { storage, getToken, clearToken } from './utils/storage.js';
import { renderReferenceCard, getLabelColor } from './components/card.js';

// State
let references = [];
let currentFilter = {
    search: '',
    label: null
};

// DOM Elements
const referenceGrid    = document.getElementById('referenceGrid');
const labelList        = document.getElementById('labelList');
const refCount         = document.getElementById('refCount');
const searchInput      = document.getElementById('searchInput');
const sortSelect       = document.getElementById('sortSelect');
const formModal        = document.getElementById('formModal');
const referenceForm    = document.getElementById('referenceForm');
const modalTitle       = document.getElementById('modalTitle');
const currentFilterLabel = document.getElementById('currentFilterLabel');
const syncStatus       = document.getElementById('syncStatus');

// Auth DOM
const loginView       = document.getElementById('loginView');
const dashboardView   = document.getElementById('dashboardView');
const loginForm       = document.getElementById('loginForm');
const loginPassword   = document.getElementById('loginPassword');
const loginErrorMsg   = document.getElementById('loginErrorMsg');
const logoutBtn       = document.getElementById('logoutBtn');

// ─── Sync indicator ───────────────────────────────────────────────────────────

function setSyncStatus(state) {
    if (!syncStatus) return;
    const states = {
        idle:    { icon: '☁️', title: 'Sincronizado com o banco',     cls: '' },
        saving:  { icon: '⏳', title: 'Salvando...',                  cls: 'syncing' },
        ok:      { icon: '✓',  title: 'Salvo no banco',               cls: 'sync-ok' },
        offline: { icon: '⚡', title: 'Modo offline (cache local)',    cls: 'sync-offline' },
        error:   { icon: '✗',  title: 'Erro ao salvar no banco',      cls: 'sync-error' },
    };
    const s = states[state] || states.idle;
    syncStatus.textContent  = s.icon;
    syncStatus.title        = s.title;
    syncStatus.className    = `sync-badge ${s.cls}`;
}

// ─── Initialization ───────────────────────────────────────────────────────────

async function init() {
    setSyncStatus('idle');
    setupEventListeners();
    
    // Auth Check
    if (!getToken()) {
        showLogin();
        return; // wait for login
    } else {
        hideLogin();
        await loadData();
    }
}

function showLogin() {
    loginView.style.display = 'flex';
    dashboardView.style.display = 'none';
}

function hideLogin() {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
}

async function loadData() {
    try {
        references = await storage.loadInitialData();
        renderAll();
        setSyncStatus('idle');
    } catch (err) {
        console.error('Failed to load initial data:', err);
        setSyncStatus('offline');
    }
}

// ─── Auth Events ────────────────────────────────────────────────────────────

window.addEventListener('auth:unauthorized', () => {
    showLogin();
    loginErrorMsg.textContent = 'Sessão expirada. Faça login novamente.';
    loginErrorMsg.style.display = 'block';
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErrorMsg.style.display = 'none';
    const btn = loginForm.querySelector('button');
    const oldText = btn.textContent;
    btn.textContent = 'Verificando...';
    btn.disabled = true;

    try {
        const ok = await storage.login(loginPassword.value);
        if (ok) {
            hideLogin();
            loginPassword.value = '';
            await loadData();
        } else {
            loginErrorMsg.textContent = 'Senha incorreta. Tente novamente.';
            loginErrorMsg.style.display = 'block';
        }
    } catch (err) {
        loginErrorMsg.textContent = 'Erro ao conectar com o servidor.';
        loginErrorMsg.style.display = 'block';
    } finally {
        btn.textContent = oldText;
        btn.disabled = false;
    }
});

logoutBtn.addEventListener('click', () => {
    clearToken();
    references = [];
    renderAll();
    showLogin();
});

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderAll() {
    const filtered = filterReferences();
    const sorted   = sortReferences(filtered);

    referenceGrid.innerHTML = '';
    sorted.forEach(ref => {
        const card = renderReferenceCard(ref, openEditModal, deleteReference, saveFichamento, openReadFichamento);
        referenceGrid.appendChild(card);
    });

    refCount.textContent = `${references.length} referências no total`;
    renderLabels();
}

function renderLabels() {
    const labels = {};
    references.forEach(ref => {
        ref.labels.forEach(l => {
            const t = l.trim();
            if (t) labels[t] = (labels[t] || 0) + 1;
        });
    });

    labelList.innerHTML = `
        <div class="label-item ${!currentFilter.label ? 'active' : ''}" data-label="all">
            <span>Todas</span>
            <span class="label-count">${references.length}</span>
        </div>
    `;

    Object.entries(labels).sort().forEach(([name, count]) => {
        const item     = document.createElement('div');
        const isActive = currentFilter.label === name;
        item.className   = `label-item ${isActive ? 'active' : ''}`;
        item.dataset.label = name;
        const c = getLabelColor(name);
        const tagStyle = isActive
            ? ''
            : `background:${c.bg};color:${c.text};border:1px solid ${c.border};`;
        item.innerHTML = `
            <span class="label-item-tag" style="${tagStyle}">${name}</span>
            <span class="label-count">${count}</span>
        `;
        item.onclick = () => {
            currentFilter.label = name;
            currentFilterLabel.textContent = `Filtrando por: ${name}`;
            renderAll();
        };
        labelList.appendChild(item);
    });

    labelList.querySelector('[data-label="all"]').onclick = () => {
        currentFilter.label = null;
        currentFilterLabel.textContent = 'Todas as Referências';
        renderAll();
    };
}

// ─── Filtering / Sorting ──────────────────────────────────────────────────────

function filterReferences() {
    return references.filter(ref => {
        const q = currentFilter.search.toLowerCase();
        const matchesSearch = !q ||
            ref.autor.toLowerCase().includes(q) ||
            ref.titulo.toLowerCase().includes(q) ||
            (ref.subtitulo && ref.subtitulo.toLowerCase().includes(q));
        const matchesLabel = !currentFilter.label || ref.labels.includes(currentFilter.label);
        return matchesSearch && matchesLabel;
    });
}

function sortReferences(data) {
    const criteria = sortSelect.value;
    return [...data].sort((a, b) => {
        if (criteria === 'date-desc')  return new Date(b.created_at) - new Date(a.created_at);
        if (criteria === 'date-asc')   return new Date(a.created_at) - new Date(b.created_at);
        if (criteria === 'author-asc') return a.autor.localeCompare(b.autor);
        if (criteria === 'title-asc')  return a.titulo.localeCompare(b.titulo);
        return 0;
    });
}

// ─── Tag Management ───────────────────────────────────────────────────────────

let activePills = [];

function renderTagPills() {
    const container = document.getElementById('activeTags');
    container.innerHTML = '';
    activePills.forEach(tag => {
        const pill = document.createElement('div');
        pill.className = 'tag-pill';
        const c = getLabelColor(tag);
        pill.style.cssText = `background:${c.bg};color:${c.text};border:1px solid ${c.border};`;
        pill.innerHTML = `
            <span>${tag}</span>
            <span class="remove-tag" data-tag="${tag}">&times;</span>
        `;
        pill.querySelector('.remove-tag').onclick = () => {
            activePills = activePills.filter(p => p !== tag);
            renderTagPills();
            renderSuggestedLabels();
        };
        container.appendChild(pill);
    });
}

function getUniqueLabels() {
    const labels = new Set();
    references.forEach(ref => ref.labels.forEach(l => { if (l.trim()) labels.add(l.trim()); }));
    return Array.from(labels).sort();
}

function renderSuggestedLabels() {
    const container = document.getElementById('suggestedLabels');
    container.innerHTML = '';
    const available = getUniqueLabels().filter(l => !activePills.includes(l));
    if (available.length > 0) {
        const title = document.createElement('div');
        title.style.cssText = 'width:100%;font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;';
        title.textContent = 'Sugestões:';
        container.appendChild(title);
        available.forEach(label => {
            const tag = document.createElement('div');
            tag.className = 'suggested-tag';
            const c = getLabelColor(label);
            tag.style.cssText = `background:${c.bg};color:${c.text};border-color:${c.border};`;
            tag.textContent = label;
            tag.onclick = () => {
                if (!activePills.includes(label)) {
                    activePills.push(label);
                    renderTagPills();
                    renderSuggestedLabels();
                }
            };
            container.appendChild(tag);
        });
    }
}

function setupTagInteraction() {
    const tagInputField = document.getElementById('tagInputField');
    tagInputField.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = tagInputField.value.trim();
            if (value && !activePills.includes(value)) {
                activePills.push(value);
                renderTagPills();
                renderSuggestedLabels();
                tagInputField.value = '';
            }
        }
    };
}

// ─── PDF Upload ───────────────────────────────────────────────────────────────

function setupPdfUpload() {
    const pdfUpload   = document.getElementById('pdf_upload');
    const pdfStatus   = document.getElementById('pdf_status');
    const pdfDataHidden = document.getElementById('pdf_data');

    pdfUpload.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            alert('Por favor, selecione apenas arquivos PDF.');
            pdfUpload.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('O arquivo é muito grande. Limite: 5 MB.');
            pdfUpload.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            pdfDataHidden.value  = ev.target.result;
            pdfStatus.textContent = `Arquivo pronto: ${file.name}`;
            pdfStatus.style.color = 'var(--primary)';
        };
        reader.readAsDataURL(file);
    };
}

// ─── Fichamento Read Modal ────────────────────────────────────────────────────

const FICHAMENTO_READ_FIELDS = [
    { key: 'texto',              label: 'Texto' },
    { key: 'argumento',         label: 'Argumento' },
    { key: 'implicacoes',       label: 'Implicações' },
    { key: 'teses_alternativas', label: 'Teses Alternativas' },
    { key: 'metodologia',       label: 'Metodologia' },
    { key: 'estrutura',         label: 'Estrutura' },
    { key: 'criticas',          label: 'Críticas' },
];

const fichamentoReadModal = document.getElementById('fichamentoReadModal');

function openReadFichamento(ref) {
    const fichamento = ref.fichamento || {};

    document.getElementById('fichReadAuthor').textContent   = ref.autor;
    document.getElementById('fichReadTitle').textContent    = ref.titulo;
    const sub = document.getElementById('fichReadSubtitle');
    sub.textContent = ref.subtitulo || '';
    sub.style.display = ref.subtitulo ? 'block' : 'none';

    const body = document.getElementById('fichReadBody');
    const filled = FICHAMENTO_READ_FIELDS.filter(f => fichamento[f.key]);

    if (filled.length === 0) {
        body.innerHTML = `
            <div class="fich-read-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>Nenhum campo de fichamento preenchido.</span>
            </div>`;
    } else {
        body.innerHTML = filled.map(f => `
            <div class="fich-read-field">
                <div class="fich-read-field-label">${f.label}</div>
                <p class="fich-read-field-text">${escapeHtml(fichamento[f.key])}</p>
            </div>
        `).join('');
    }

    fichamentoReadModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeReadFichamento() {
    fichamentoReadModal.classList.remove('open');
    document.body.style.overflow = '';
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.getElementById('closeFichReadModal').addEventListener('click', closeReadFichamento);
document.getElementById('printFichBtn').addEventListener('click', () => window.print());
fichamentoReadModal.addEventListener('click', (e) => {
    if (e.target === fichamentoReadModal) closeReadFichamento();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fichamentoReadModal.classList.contains('open')) closeReadFichamento();
});

// ─── Modal helpers ────────────────────────────────────────────────────────────

function openAddModal() {
    modalTitle.textContent = 'Nova Referência';
    referenceForm.reset();
    document.getElementById('refId').value        = '';
    document.getElementById('pdf_status').textContent = 'Nenhum arquivo selecionado';
    document.getElementById('pdf_status').style.color = '';
    document.getElementById('pdf_data').value     = '';
    activePills = [];
    renderTagPills();
    renderSuggestedLabels();
    formModal.style.display = 'block';
}

function openEditModal(ref) {
    modalTitle.textContent = 'Editar Referência';
    document.getElementById('refId').value      = ref.id;
    document.getElementById('autor').value      = ref.autor;
    document.getElementById('titulo').value     = ref.titulo;
    document.getElementById('subtitulo').value  = ref.subtitulo  || '';
    document.getElementById('editora').value    = ref.editora    || '';
    document.getElementById('edicao').value     = ref.edicao     || '';
    document.getElementById('data').value       = ref.data       || '';
    document.getElementById('local').value      = ref.local      || '';
    document.getElementById('link').value       = ref.link       || '';

    const pdfStatus   = document.getElementById('pdf_status');
    const pdfDataHidden = document.getElementById('pdf_data');
    if (ref.pdf_data) {
        pdfStatus.textContent = 'Arquivo PDF já anexado';
        pdfStatus.style.color = 'var(--primary)';
        pdfDataHidden.value   = ref.pdf_data;
    } else {
        pdfStatus.textContent = 'Nenhum arquivo selecionado';
        pdfStatus.style.color = '';
        pdfDataHidden.value   = '';
    }

    activePills = [...ref.labels];
    renderTagPills();
    renderSuggestedLabels();
    formModal.style.display = 'block';
}

// ─── CRUD Actions ─────────────────────────────────────────────────────────────

async function saveFichamento(id, newFichamento) {
    setSyncStatus('saving');
    try {
        await storage.saveFichamento(id, newFichamento);
        references = references.map(r =>
            r.id === id ? { ...r, fichamento: newFichamento } : r
        );
        storage.saveToLocalStorage(references);
        setSyncStatus('ok');
        setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
        console.error('Fichamento save error:', err);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('offline'), 3000);
        // Still keep locally
        references = references.map(r =>
            r.id === id ? { ...r, fichamento: newFichamento } : r
        );
        storage.saveToLocalStorage(references);
    }
}

async function deleteReference(id) {
    if (!confirm('Tem certeza que deseja excluir esta referência?')) return;
    setSyncStatus('saving');
    try {
        await storage.deleteReference(id);
        references = references.filter(r => r.id !== id);
        storage.saveToLocalStorage(references);
        renderAll();
        setSyncStatus('ok');
        setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
        console.error('Delete error:', err);
        // Optimistic local delete anyway
        references = references.filter(r => r.id !== id);
        storage.saveToLocalStorage(references);
        renderAll();
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('offline'), 3000);
    }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

function setupEventListeners() {
    document.getElementById('addRefBtn').onclick = openAddModal;

    setupTagInteraction();
    setupPdfUpload();

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => (formModal.style.display = 'none');
    });
    window.onclick = (e) => {
        if (e.target === formModal) formModal.style.display = 'none';
    };

    referenceForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('refId').value;

        const refData = {
            id: id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
            autor:     document.getElementById('autor').value,
            titulo:    document.getElementById('titulo').value,
            subtitulo: document.getElementById('subtitulo').value,
            editora:   document.getElementById('editora').value,
            edicao:    document.getElementById('edicao').value,
            data:      document.getElementById('data').value,
            local:     document.getElementById('local').value,
            link:      document.getElementById('link').value,
            pdf_data:  document.getElementById('pdf_data').value,
            labels:    [...activePills],
            fichamento: id ? (references.find(r => r.id === id)?.fichamento || {}) : {},
            created_at: id
                ? references.find(r => r.id === id)?.created_at
                : new Date().toISOString(),
        };

        formModal.style.display = 'none';
        setSyncStatus('saving');

        try {
            if (id) {
                const updated = await storage.updateReference(refData);
                references = references.map(r => r.id === id ? updated : r);
            } else {
                const created = await storage.createReference(refData);
                references.push(created);
            }
            storage.saveToLocalStorage(references);
            renderAll();
            setSyncStatus('ok');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err) {
            console.error('Save error:', err);
            // Optimistic local update on failure
            if (id) {
                references = references.map(r => r.id === id ? refData : r);
            } else {
                references.push(refData);
            }
            storage.saveToLocalStorage(references);
            renderAll();
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('offline'), 3000);
        }
    };

    searchInput.oninput = (e) => {
        currentFilter.search = e.target.value;
        renderAll();
    };
    sortSelect.onchange = renderAll;

    document.getElementById('exportBtn').onclick = () => storage.exportToJSON(references);

    const importInput = document.getElementById('importInput');
    document.getElementById('importBtn').onclick = () => importInput.click();
    importInput.onchange = async (e) => {
        if (!e.target.files.length) return;
        try {
            const imported = await storage.importFromJSON(e.target.files[0]);
            // Upsert all imported references into DB
            setSyncStatus('saving');
            const results = [];
            for (const ref of imported) {
                try {
                    // Try update first, then create
                    const existing = references.find(r => r.id === ref.id);
                    if (existing) {
                        const u = await storage.updateReference(ref);
                        results.push(u);
                    } else {
                        const c = await storage.createReference(ref);
                        results.push(c);
                    }
                } catch {
                    results.push(ref); // Keep offline copy
                }
            }
            references = results;
            storage.saveToLocalStorage(references);
            renderAll();
            setSyncStatus('ok');
            setTimeout(() => setSyncStatus('idle'), 2000);
            alert('Referências importadas com sucesso!');
        } catch (err) {
            alert('Erro ao importar arquivo: ' + err.message);
            setSyncStatus('error');
        }
    };
}

init();

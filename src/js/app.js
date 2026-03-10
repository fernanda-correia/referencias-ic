import { storage } from './utils/storage.js';
import { renderReferenceCard } from './components/card.js';

// State
let references = [];
let currentFilter = {
    search: '',
    label: null
};

// DOM Elements
const referenceGrid = document.getElementById('referenceGrid');
const labelList = document.getElementById('labelList');
const refCount = document.getElementById('refCount');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const formModal = document.getElementById('formModal');
const referenceForm = document.getElementById('referenceForm');
const modalTitle = document.getElementById('modalTitle');
const currentFilterLabel = document.getElementById('currentFilterLabel');

// Initialization
async function init() {
    setupEventListeners();
    renderAll(); // Initial empty render
    try {
        references = await storage.loadInitialData();
        renderAll(); // Update with loaded data
    } catch (err) {
        console.error('Failed to load initial data:', err);
    }
}

// Rendering
function renderAll() {
    const filtered = filterReferences();
    const sorted = sortReferences(filtered);

    // Render Grid
    referenceGrid.innerHTML = '';
    sorted.forEach(ref => {
        const card = renderReferenceCard(ref, openEditModal, deleteReference);
        referenceGrid.appendChild(card);
    });

    // Update Stats
    refCount.textContent = `${references.length} referências no total`;

    // Render Labels Sidebar
    renderLabels();
}

function renderLabels() {
    const labels = {};
    references.forEach(ref => {
        ref.labels.forEach(l => {
            const trimmed = l.trim();
            if (trimmed) labels[trimmed] = (labels[trimmed] || 0) + 1;
        });
    });

    labelList.innerHTML = `
        <div class="label-item ${!currentFilter.label ? 'active' : ''}" data-label="all">
            <span>Todas</span>
            <span class="label-count">${references.length}</span>
        </div>
    `;

    Object.entries(labels).sort().forEach(([name, count]) => {
        const item = document.createElement('div');
        item.className = `label-item ${currentFilter.label === name ? 'active' : ''}`;
        item.dataset.label = name;
        item.innerHTML = `
            <span>${name}</span>
            <span class="label-count">${count}</span>
        `;
        item.onclick = () => {
            currentFilter.label = name === 'all' ? null : name;
            currentFilterLabel.textContent = name === 'all' ? 'Todas as Referências' : `Filtrando por: ${name}`;
            renderAll();
        };
        labelList.appendChild(item);
    });

    // Add click listener for "Todas"
    labelList.querySelector('[data-label="all"]').onclick = () => {
        currentFilter.label = null;
        currentFilterLabel.textContent = 'Todas as Referências';
        renderAll();
    };
}

// Logic
function filterReferences() {
    return references.filter(ref => {
        const matchesSearch = !currentFilter.search ||
            ref.autor.toLowerCase().includes(currentFilter.search.toLowerCase()) ||
            ref.titulo.toLowerCase().includes(currentFilter.search.toLowerCase()) ||
            (ref.subtitulo && ref.subtitulo.toLowerCase().includes(currentFilter.search.toLowerCase()));

        const matchesLabel = !currentFilter.label || ref.labels.includes(currentFilter.label);

        return matchesSearch && matchesLabel;
    });
}

function sortReferences(data) {
    const criteria = sortSelect.value;
    return [...data].sort((a, b) => {
        if (criteria === 'date-desc') return new Date(b.created_at) - new Date(a.created_at);
        if (criteria === 'date-asc') return new Date(a.created_at) - new Date(b.created_at);
        if (criteria === 'author-asc') return a.autor.localeCompare(b.autor);
        if (criteria === 'title-asc') return a.titulo.localeCompare(b.titulo);
        return 0;
    });
}

// Tag Management Logic
let activePills = [];

function renderTagPills() {
    const activeTagsContainer = document.getElementById('activeTags');
    activeTagsContainer.innerHTML = '';
    activePills.forEach(tag => {
        const pill = document.createElement('div');
        pill.className = 'tag-pill';
        pill.innerHTML = `
            <span>${tag}</span>
            <span class="remove-tag" data-tag="${tag}">&times;</span>
        `;
        pill.querySelector('.remove-tag').onclick = () => {
            activePills = activePills.filter(p => p !== tag);
            renderTagPills();
            renderSuggestedLabels(); // Update suggestions (in case one became available again)
        };
        activeTagsContainer.appendChild(pill);
    });
}

function getUniqueLabels() {
    const labels = new Set();
    references.forEach(ref => {
        ref.labels.forEach(l => {
            const trimmed = l.trim();
            if (trimmed) labels.add(trimmed);
        });
    });
    return Array.from(labels).sort();
}

function renderSuggestedLabels() {
    const container = document.getElementById('suggestedLabels');
    container.innerHTML = '';

    const allLabels = getUniqueLabels();
    const availableLabels = allLabels.filter(l => !activePills.includes(l));

    if (availableLabels.length > 0) {
        const title = document.createElement('div');
        title.style.width = '100%';
        title.style.fontSize = '0.75rem';
        title.style.color = 'var(--text-muted)';
        title.style.marginBottom = '4px';
        title.textContent = 'Sugestões:';
        container.appendChild(title);

        availableLabels.forEach(label => {
            const tag = document.createElement('div');
            tag.className = 'suggested-tag';
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

// PDF Upload Logic
function setupPdfUpload() {
    const pdfUpload = document.getElementById('pdf_upload');
    const pdfStatus = document.getElementById('pdf_status');
    const pdfDataHidden = document.getElementById('pdf_data');

    pdfUpload.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Por favor, selecione apenas arquivos PDF.');
            pdfUpload.value = '';
            return;
        }

        // Check size (limit to 5MB for LocalStorage stability)
        if (file.size > 5 * 1024 * 1024) {
            alert('O arquivo é muito grande. O limite é 5MB para garantir a performance local.');
            pdfUpload.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            pdfDataHidden.value = event.target.result;
            pdfStatus.textContent = `Arquivo pronto: ${file.name}`;
            pdfStatus.style.color = 'var(--primary)';
        };
        reader.readAsDataURL(file);
    };
}

// Actions
function openAddModal() {
    modalTitle.textContent = 'Nova Referência';
    referenceForm.reset();
    document.getElementById('refId').value = '';
    document.getElementById('pdf_status').textContent = 'Nenhum arquivo selecionado';
    document.getElementById('pdf_status').style.color = '';
    document.getElementById('pdf_data').value = '';
    activePills = [];
    renderTagPills();
    renderSuggestedLabels();
    formModal.style.display = 'block';
}

function openEditModal(ref) {
    modalTitle.textContent = 'Editar Referência';
    document.getElementById('refId').value = ref.id;
    document.getElementById('autor').value = ref.autor;
    document.getElementById('titulo').value = ref.titulo;
    document.getElementById('subtitulo').value = ref.subtitulo || '';
    document.getElementById('editora').value = ref.editora || '';
    document.getElementById('edicao').value = ref.edicao || '';
    document.getElementById('data').value = ref.data || '';
    document.getElementById('local').value = ref.local || '';
    document.getElementById('link').value = ref.link || '';

    // PDF status
    const pdfStatus = document.getElementById('pdf_status');
    const pdfDataHidden = document.getElementById('pdf_data');
    if (ref.pdf_data || ref.pdf_path) {
        pdfStatus.textContent = 'Arquivo PDF já anexado';
        pdfStatus.style.color = 'var(--primary)';
        pdfDataHidden.value = ref.pdf_data || '';
    } else {
        pdfStatus.textContent = 'Nenhum arquivo selecionado';
        pdfStatus.style.color = '';
        pdfDataHidden.value = '';
    }

    activePills = [...ref.labels];
    renderTagPills();
    renderSuggestedLabels();
    formModal.style.display = 'block';
}

function deleteReference(id) {
    if (confirm('Tem certeza que deseja excluir esta referência?')) {
        references = references.filter(r => r.id !== id);
        storage.saveToLocalStorage(references);
        renderAll();
    }
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('addRefBtn').onclick = openAddModal;

    setupTagInteraction();
    setupPdfUpload();

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => formModal.style.display = 'none';
    });

    window.onclick = (event) => {
        if (event.target === formModal) formModal.style.display = 'none';
    };

    referenceForm.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('refId').value;

        const refData = {
            id: id || (window.crypto && window.crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
            autor: document.getElementById('autor').value,
            titulo: document.getElementById('titulo').value,
            subtitulo: document.getElementById('subtitulo').value,
            editora: document.getElementById('editora').value,
            edicao: document.getElementById('edicao').value,
            data: document.getElementById('data').value,
            local: document.getElementById('local').value,
            link: document.getElementById('link').value,
            pdf_data: document.getElementById('pdf_data').value,
            labels: [...activePills],
            created_at: id ? references.find(r => r.id === id).created_at : new Date().toISOString()
        };

        if (id) {
            references = references.map(r => r.id === id ? refData : r);
        } else {
            references.push(refData);
        }

        storage.saveToLocalStorage(references);
        renderAll();
        formModal.style.display = 'none';
    };

    searchInput.oninput = (e) => {
        currentFilter.search = e.target.value;
        renderAll();
    };

    sortSelect.onchange = renderAll;

    // Export/Import
    document.getElementById('exportBtn').onclick = () => storage.exportToJSON(references);

    const importInput = document.getElementById('importInput');
    document.getElementById('importBtn').onclick = () => importInput.click();

    importInput.onchange = async (e) => {
        if (e.target.files.length > 0) {
            try {
                references = await storage.importFromJSON(e.target.files[0]);
                renderAll();
                alert('Referências importadas com sucesso!');
            } catch (err) {
                alert('Erro ao importar arquivo: ' + err.message);
            }
        }
    };
}

init();

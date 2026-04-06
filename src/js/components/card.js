// Deterministic color palette for labels based on text hash
const LABEL_COLORS = [
    { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' }, // violet
    { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' }, // blue
    { bg: '#dcfce7', text: '#15803d', border: '#86efac' }, // green
    { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' }, // pink
    { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' }, // amber
    { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' }, // orange
    { bg: '#cffafe', text: '#0e7490', border: '#67e8f9' }, // cyan
    { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' }, // emerald
    { bg: '#fdf4ff', text: '#86198f', border: '#e879f9' }, // fuchsia
    { bg: '#fff1f2', text: '#be123c', border: '#fda4af' }, // rose
];

export function getLabelColor(label) {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
        hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

const FICHAMENTO_FIELDS = [
    { key: 'texto',             label: 'Texto' },
    { key: 'argumento',        label: 'Argumento' },
    { key: 'implicacoes',      label: 'Implicações' },
    { key: 'teses_alternativas', label: 'Teses Alternativas' },
    { key: 'metodologia',      label: 'Metodologia' },
    { key: 'estrutura',        label: 'Estrutura' },
    { key: 'criticas',         label: 'Críticas' },
];

export function renderReferenceCard(ref, onEdit, onDelete, onFichamento, onReadFichamento) {
    const card = document.createElement('div');
    card.className = 'ref-card';
    card.dataset.id = ref.id;

    const labelsHtml = ref.labels.map(label => {
        const c = getLabelColor(label);
        return `<span class="badge" style="background:${c.bg};color:${c.text};border-color:${c.border}">${label}</span>`;
    }).join('');

    const fichamento = ref.fichamento || {};
    const hasFichamento = FICHAMENTO_FIELDS.some(f => fichamento[f.key]);
    const fichamentoIndicator = hasFichamento
        ? `<span class="fichamento-indicator" title="Fichamento preenchido">✦</span>`
        : '';

    card.innerHTML = `
        <div class="card-body">
            <div class="author">${ref.autor}</div>
            <h3 class="title">${ref.titulo}</h3>
            ${ref.subtitulo ? `<div class="subtitle">${ref.subtitulo}</div>` : ''}
            <div class="meta">
                <span>${ref.data || 'Sem data'}</span>
                <span>${ref.editora || ''}</span>
            </div>
            <div class="labels">
                ${labelsHtml}
            </div>
        </div>
        <div class="card-actions">
            <button class="btn-icon edit-btn" title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn-icon btn-danger-icon delete-btn" title="Excluir">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
            ${ref.link ? `
            <a href="${ref.link}" target="_blank" class="btn-icon" title="Abrir link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>` : ''}
            ${(ref.pdf_data || ref.pdf_path) ? `
            <button class="btn-icon pdf-btn" title="Abrir PDF">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </button>` : ''}
            ${hasFichamento ? `
            <button class="btn-read-fichamento" title="Ler fichamento completo">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                Ler
            </button>` : ''}
            <button class="btn-icon fichamento-toggle-btn" title="Fichamento" style="margin-left:auto">
                ${fichamentoIndicator}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </button>
        </div>

        <!-- Fichamento Section -->
        <div class="fichamento-section" style="display:none;">
            <div class="fichamento-header">
                <span class="fichamento-title">Fichamento</span>
            </div>
            <div class="fichamento-fields">
                ${FICHAMENTO_FIELDS.map(f => `
                <div class="fichamento-field">
                    <label class="fichamento-label">${f.label}</label>
                    <textarea class="fichamento-textarea" data-field="${f.key}" placeholder="Escreva aqui..." rows="3">${fichamento[f.key] || ''}</textarea>
                </div>
                `).join('')}
            </div>
            <div class="fichamento-actions">
                <button class="btn-fichamento-save fichamento-save-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Salvar Fichamento
                </button>
            </div>
            <div class="fichamento-saved-msg" style="display:none;">✓ Salvo!</div>
        </div>
    `;

    // Edit & Delete
    card.querySelector('.edit-btn').addEventListener('click', () => onEdit(ref));
    card.querySelector('.delete-btn').addEventListener('click', () => onDelete(ref.id));

    // Read fichamento
    const readBtn = card.querySelector('.btn-read-fichamento');
    if (readBtn && onReadFichamento) {
        readBtn.addEventListener('click', () => onReadFichamento(ref));
    }

    // PDF
    const pdfBtn = card.querySelector('.pdf-btn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            if (ref.pdf_data) {
                const win = window.open();
                win.document.write(`<iframe src="${ref.pdf_data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
            } else if (ref.pdf_path) {
                alert(`Abrindo PDF local em: ${ref.pdf_path}\n\nNota: Devido a restrições de segurança do navegador, você pode precisar copiar esse caminho no explorador de arquivos.`);
            }
        });
    }

    // Fichamento toggle
    const fichamentoSection = card.querySelector('.fichamento-section');
    const toggleBtn = card.querySelector('.fichamento-toggle-btn');
    toggleBtn.addEventListener('click', () => {
        const isOpen = fichamentoSection.style.display !== 'none';
        fichamentoSection.style.display = isOpen ? 'none' : 'block';
        toggleBtn.classList.toggle('active', !isOpen);
    });

    // Save fichamento
    card.querySelector('.fichamento-save-btn').addEventListener('click', () => {
        const newFichamento = {};
        FICHAMENTO_FIELDS.forEach(f => {
            const val = card.querySelector(`.fichamento-textarea[data-field="${f.key}"]`).value.trim();
            if (val) newFichamento[f.key] = val;
        });
        onFichamento(ref.id, newFichamento);

        // Update indicator
        const hasData = Object.keys(newFichamento).length > 0;
        let indicator = toggleBtn.querySelector('.fichamento-indicator');
        if (hasData && !indicator) {
            indicator = document.createElement('span');
            indicator.className = 'fichamento-indicator';
            indicator.title = 'Fichamento preenchido';
            indicator.textContent = '✦';
            toggleBtn.insertBefore(indicator, toggleBtn.querySelector('svg'));
        } else if (!hasData && indicator) {
            indicator.remove();
        }

        // Show saved message
        const savedMsg = card.querySelector('.fichamento-saved-msg');
        savedMsg.style.display = 'block';
        setTimeout(() => { savedMsg.style.display = 'none'; }, 1800);
    });

    return card;
}

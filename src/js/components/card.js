export function renderReferenceCard(ref, onEdit, onDelete) {
    const card = document.createElement('div');
    card.className = 'ref-card';
    card.dataset.id = ref.id;

    const labelsHtml = ref.labels.map(label => `<span class="badge">${label}</span>`).join('');

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
        </div>
    `;

    card.querySelector('.edit-btn').addEventListener('click', () => onEdit(ref));
    card.querySelector('.delete-btn').addEventListener('click', () => onDelete(ref.id));

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

    return card;
}

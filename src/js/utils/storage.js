const STORAGE_KEY = 'refmanager_data';
const API_BASE = '/api';

// ─── Low-level HTTP helpers ───────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

// ─── Storage API ──────────────────────────────────────────────────────────────

export const storage = {

    // ── LocalStorage cache ────────────────────────────────────────────────────

    saveToLocalStorage(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('LocalStorage write failed:', e);
        }
    },

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    // ── Initial load: DB → localStorage cache → references.json ─────────────

    async loadInitialData() {
        // 1. Try the API (PostgreSQL)
        try {
            const refs = await apiFetch('/references');
            this.saveToLocalStorage(refs);
            return refs;
        } catch (err) {
            console.warn('Banco indisponível, usando cache local:', err.message);
        }

        // 2. Fallback: localStorage cache
        const cached = this.loadFromLocalStorage();
        if (cached) return cached;

        // 3. Last resort: bundled JSON seed
        try {
            const res = await fetch('./data/references.json');
            if (!res.ok) throw new Error('Arquivo não encontrado');
            const data = await res.json();
            return data.references || [];
        } catch (e) {
            return [];
        }
    },

    // ── Database CRUD ─────────────────────────────────────────────────────────

    async createReference(ref) {
        const created = await apiFetch('/references', {
            method: 'POST',
            body: JSON.stringify(ref),
        });
        return created;
    },

    async updateReference(ref) {
        const updated = await apiFetch(`/references/${ref.id}`, {
            method: 'PUT',
            body: JSON.stringify(ref),
        });
        return updated;
    },

    async deleteReference(id) {
        await apiFetch(`/references/${id}`, { method: 'DELETE' });
    },

    async saveFichamento(id, fichamento) {
        await apiFetch(`/references/${id}/fichamento`, {
            method: 'PATCH',
            body: JSON.stringify({ fichamento }),
        });
    },

    // ── Export / Import (keep local) ─────────────────────────────────────────

    exportToJSON(data) {
        const blob = new Blob(
            [JSON.stringify({ references: data, exported_at: new Date().toISOString() }, null, 2)],
            { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `references_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.references || !Array.isArray(data.references)) {
                        return reject(new Error('Formato de arquivo inválido'));
                    }
                    resolve(data.references);
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    },
};

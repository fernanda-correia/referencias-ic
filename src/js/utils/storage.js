const STORAGE_KEY = 'refmanager_data';

export const storage = {
    // Save to LocalStorage
    saveToLocalStorage(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    // Load from LocalStorage
    loadFromLocalStorage() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    },

    // Initial load from JSON file with timeout
    async loadInitialData() {
        const localData = this.loadFromLocalStorage();
        if (localData) return localData;

        try {
            // Use AbortController for timeout
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000); // 2 second timeout

            const response = await fetch('./data/references.json', { signal: controller.signal });
            clearTimeout(id);

            if (!response.ok) throw new Error('Não foi possível carregar data/references.json');

            const data = await response.json();
            this.saveToLocalStorage(data.references || []);
            return data.references || [];
        } catch (error) {
            console.warn('Usando base de dados vazia devido a erro ou timeout no carregamento:', error);
            return [];
        }
    },

    // Export to JSON file
    exportToJSON(data) {
        const refData = {
            references: data,
            exported_at: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(refData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `references_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Import from JSON file
    importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.references && Array.isArray(data.references)) {
                        this.saveToLocalStorage(data.references);
                        resolve(data.references);
                    } else {
                        reject(new Error('Formato de arquivo inválido'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }
};

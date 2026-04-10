const ENTITIES = [
  'Project', 'AlignmentRecord', 'SessionLog', 'TimelineItem',
  'ProjectCollaborator', 'Thread', 'Shot', 'Treatment',
  'GeneratedOutput', 'LogResponse', 'PromptCall',
];

function createStore(entityName) {
  const key = `amm_${entityName}`;

  const getAll = () => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  };

  const saveAll = (items) => localStorage.setItem(key, JSON.stringify(items));

  const applySort = (items, sortField) => {
    if (!sortField) return items;
    const desc = sortField.startsWith('-');
    const field = desc ? sortField.slice(1) : sortField;
    return [...items].sort((a, b) => {
      const av = a[field], bv = b[field];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
    });
  };

  return {
    filter(query = {}, sortField, limit) {
      let items = getAll().filter(item =>
        Object.entries(query).every(([k, v]) => item[k] === v)
      );
      items = applySort(items, sortField);
      if (limit) items = items.slice(0, limit);
      return Promise.resolve(items);
    },

    list(sortField, limit) {
      let items = applySort(getAll(), sortField);
      if (limit) items = items.slice(0, limit);
      return Promise.resolve(items);
    },

    create(data) {
      const items = getAll();
      const item = { ...data, id: crypto.randomUUID(), created_date: new Date().toISOString() };
      items.push(item);
      saveAll(items);
      return Promise.resolve(item);
    },

    update(id, data) {
      const items = getAll();
      const idx = items.findIndex(i => i.id === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...data };
        saveAll(items);
        return Promise.resolve(items[idx]);
      }
      return Promise.resolve(null);
    },

    delete(id) {
      saveAll(getAll().filter(i => i.id !== id));
      return Promise.resolve();
    },
  };
}

const entities = Object.fromEntries(ENTITIES.map(name => [name, createStore(name)]));

const auth = {
  me: () => Promise.resolve({ id: 'local-user', email: '', full_name: '' }),
};

export const base44 = { entities, auth };

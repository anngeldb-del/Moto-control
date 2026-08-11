// ==========================================================================
// MotoControl — data.js
// Capa de datos genérica. HOY: localStorage. FASE 2-conectada: se puede
// reemplazar internamente por Firestore sin tocar el código de los módulos
// (motocicletas.js, ventas.js, etc. solo llaman getAll/getById/save/remove).
// ==========================================================================

const PREFIX = 'motocontrol:';

function readCollection(name) {
  try {
    const raw = localStorage.getItem(PREFIX + name);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn(`[MotoControl] Error leyendo colección "${name}":`, err);
    return [];
  }
}

function writeCollection(name, items) {
  localStorage.setItem(PREFIX + name, JSON.stringify(items));
}

export function getAll(collectionName) {
  return readCollection(collectionName);
}

export function getById(collectionName, id) {
  return readCollection(collectionName).find((item) => item.id === id) || null;
}

export function save(collectionName, item) {
  const items = readCollection(collectionName);
  const idx = items.findIndex((i) => i.id === item.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...item, updatedAt: now };
  } else {
    items.push({ ...item, createdAt: now, updatedAt: now });
  }
  writeCollection(collectionName, items);
  return item;
}

export function remove(collectionName, id) {
  const items = readCollection(collectionName).filter((i) => i.id !== id);
  writeCollection(collectionName, items);
}

// Siembra datos DEMO en una colección solo si está vacía (para no pisar
// datos reales que el usuario ya haya capturado).
export function seedIfEmpty(collectionName, demoItems) {
  const existing = readCollection(collectionName);
  if (existing.length === 0) {
    writeCollection(collectionName, demoItems);
    return demoItems;
  }
  return existing;
}

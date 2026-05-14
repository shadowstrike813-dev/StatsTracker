// ─── IndexedDB setup ──────────────────────────────────────────────────────────

const DB_NAME    = 'health-tracker';
const DB_VERSION = 3;

const STORES = {
  entries:           { keyPath: 'id' },
  weight:            { keyPath: 'id' },
  profile:           { keyPath: 'id' },
  exercises:         { keyPath: 'id' },
  workouts:          { keyPath: 'id' },
  sleep:             { keyPath: 'id' },
  session_templates: { keyPath: 'id' },
  sessions:          { keyPath: 'id' },
};

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      Object.entries(STORES).forEach(([name, opts]) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, opts);
        }
      });
    };
    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = (e) => reject(e.target.error);
  });
}

function tx(store, mode = 'readonly') {
  return openDB().then(db => db.transaction(store, mode).objectStore(store));
}

function all(store) {
  return tx(store).then(s => new Promise((res, rej) => {
    const req = s.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }));
}

function get(store, id) {
  return tx(store).then(s => new Promise((res, rej) => {
    const req = s.get(id);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }));
}

function put(store, record) {
  return tx(store, 'readwrite').then(s => new Promise((res, rej) => {
    const req = s.put(record);
    req.onsuccess = () => res(record);
    req.onerror   = () => rej(req.error);
  }));
}

function remove(store, id) {
  return tx(store, 'readwrite').then(s => new Promise((res, rej) => {
    const req = s.delete(id);
    req.onsuccess = () => res(id);
    req.onerror   = () => rej(req.error);
  }));
}

function clear(store) {
  return tx(store, 'readwrite').then(s => new Promise((res, rej) => {
    const req = s.clear();
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  }));
}

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
}

const DB = {

  // ── Entries (tensiune) ──────────────────────────────────────────────────────

  getEntries: () => all('entries'),

  addEntry: async (data) => {
    const entry = {
      id:   uuid(),
      date: data.date,
      sys:  parseInt(data.sys),
      dia:  parseInt(data.dia),
      puls: parseInt(data.puls),
    };
    await put('entries', entry);
    return entry;
  },

  deleteEntry: (id) => remove('entries', id),

  // ── Weight ──────────────────────────────────────────────────────────────────

  getWeight: () => all('weight'),

  addWeight: async (data) => {
    const entry = {
      id:   uuid(),
      date: data.date,
      kg:   parseFloat(parseFloat(data.kg).toFixed(1)),
    };
    await put('weight', entry);
    return entry;
  },

  deleteWeight: (id) => remove('weight', id),

  // ── Profile ─────────────────────────────────────────────────────────────────

  getProfile: async () => {
    const all_records = await all('profile');
    return all_records[0] || {};
  },

  saveProfile: async (data) => {
    const existing = await DB.getProfile();
    const profile = {
      id:            existing.id || 'profile',
      name:          data.name          || '',
      birthdate:     data.birthdate     || '',
      height:        data.height        ? parseInt(data.height)              : null,
      target_weight: data.target_weight ? parseFloat(data.target_weight)     : null,
      medications:   data.medications   || '',
      description:   data.description   || '',
    };
    await put('profile', profile);
    return profile;
  },

  // ── Exercises ───────────────────────────────────────────────────────────────

  getExercises: () => all('exercises'),

  addExercise: async (data) => {
    const existing = await all('exercises');
    const maxOrder = existing.reduce((m, e) => Math.max(m, e.order || 0), 0);
    const exercise = {
      id:              uuid(),
      name:            data.name.trim(),
      muscle_group:    data.muscle_group    || '',
      type:            data.type            || 'compound',
      equipment:       data.equipment       || '',
      description:     data.description     || '',
      target_sets:     data.target_sets     ? parseInt(data.target_sets)         : null,
      target_reps:     data.target_reps     || '',
      starting_weight: data.starting_weight ? parseFloat(data.starting_weight)   : null,
      order:           maxOrder + 1,
      active:          true,
    };
    await put('exercises', exercise);
    return exercise;
  },

  updateExercise: async (id, data) => {
    const existing = await get('exercises', id);
    if (!existing) throw new Error('Exercitiul nu a fost gasit');
    const updated = { ...existing, ...data };
    await put('exercises', updated);
    return updated;
  },

  deleteExercise: (id) => remove('exercises', id),

  putExercise: (exercise) => put('exercises', exercise),

  reorderExercises: async (orderList) => {
    for (const { id, order } of orderList) {
      const ex = await get('exercises', id);
      if (ex) await put('exercises', { ...ex, order });
    }
  },

  // ── Workouts ────────────────────────────────────────────────────────────────

  getWorkouts: async (exercise_id = null) => {
    const records = await all('workouts');
    return exercise_id ? records.filter(w => w.exercise_id === exercise_id) : records;
  },

  getWorkoutsBySession: async (session_id) => {
    const records = await all('workouts');
    return records.filter(w => w.session_id === session_id);
  },

  addWorkout: async (data) => {
    const workout = {
      id:          uuid(),
      exercise_id: data.exercise_id,
      date:        data.date,
      sets:        data.sets.map(s => ({ kg: parseFloat(s.kg), reps: parseInt(s.reps), warmup: !!s.warmup })),
      notes:       data.notes || '',
      session_id:  data.session_id || null,
    };
    await put('workouts', workout);
    return workout;
  },

  deleteWorkout: (id) => remove('workouts', id),

  // ── Sleep ────────────────────────────────────────────────────────────────────

  getSleep: () => all('sleep'),

  addSleep: async (data) => {
    const entry = {
      id:         uuid(),
      sleep_date: data.sleep_date,
      sleep_time: data.sleep_time,
      wake_date:  data.wake_date,
      wake_time:  data.wake_time,
    };
    await put('sleep', entry);
    return entry;
  },

  deleteSleep: (id) => remove('sleep', id),

  // ── Session Templates ────────────────────────────────────────────────────────

  getSessionTemplates: () => all('session_templates'),

  addSessionTemplate: async (data) => {
    const template = {
      id:           uuid(),
      name:         data.name.trim(),
      exercise_ids: data.exercise_ids || [],
      created_at:   new Date().toISOString(),
    };
    await put('session_templates', template);
    return template;
  },

  updateSessionTemplate: async (id, data) => {
    const existing = await get('session_templates', id);
    if (!existing) throw new Error('Template negasit');
    const updated = { ...existing, ...data };
    await put('session_templates', updated);
    return updated;
  },

  deleteSessionTemplate: (id) => remove('session_templates', id),

  // ── Sessions ─────────────────────────────────────────────────────────────────

  getSessions: () => all('sessions'),

  getSession: (id) => get('sessions', id),

  getActiveSession: async () => {
    const sessions = await all('sessions');
    return sessions.find(s => s.status === 'active') || null;
  },

  addSession: async (data) => {
    const session = {
      id:               uuid(),
      template_id:      data.template_id,
      template_name:    data.template_name,
      exercise_ids:     data.exercise_ids,
      status:           'active',
      date_start:       null,
      date_end:         null,
      duration_minutes: null,
      created_at:       new Date().toISOString(),
    };
    await put('sessions', session);
    return session;
  },

  updateSession: async (id, data) => {
    const existing = await get('sessions', id);
    if (!existing) throw new Error('Sesiunea negasita');
    const updated = { ...existing, ...data };
    await put('sessions', updated);
    return updated;
  },

  deleteSession: (id) => remove('sessions', id),

  // ── Export / Import ─────────────────────────────────────────────────────────

  exportAll: async () => {
    return {
      version:           1,
      exported:          new Date().toISOString(),
      entries:           await all('entries'),
      weight:            await all('weight'),
      profile:           await all('profile'),
      exercises:         await all('exercises'),
      workouts:          await all('workouts'),
      sleep:             await all('sleep'),
      session_templates: await all('session_templates'),
      sessions:          await all('sessions'),
    };
  },

  importAll: async (json) => {
    const stores = ['entries', 'weight', 'profile', 'exercises', 'workouts', 'sleep', 'session_templates', 'sessions'];
    for (const store of stores) {
      await clear(store);
      if (Array.isArray(json[store])) {
        for (const record of json[store]) {
          await put(store, record);
        }
      }
    }
  },
};
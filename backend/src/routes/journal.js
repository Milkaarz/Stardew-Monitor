/** Diário da fazenda (changelog da máquina) e Quadro de Missões. */
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { noteQuerySchema, noteSchema, questPatchSchema, questSchema } from '../schemas.js';

const noteOut = (r) => ({
  id: r.id, machineId: r.machine_id, category: r.category, title: r.title, body: r.body,
  createdAt: r.created_at, updatedAt: r.updated_at, author: r.author || null,
});

const startOfToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const questOut = (r) => {
  // missões diárias "desmarcam" sozinhas a cada novo dia
  const done = r.done_at != null && (!r.daily || r.done_at >= startOfToday());
  return { id: r.id, text: r.text, daily: !!r.daily, done, doneAt: done ? r.done_at : null, createdAt: r.created_at };
};

export function journalRoutes({ db, machines, achievements, audit }) {
  const r = Router();

  // ---------- diário ----------

  r.get('/notes', validate(noteQuerySchema, 'query'), async (req, res) => {
    const { q, category, machine, limit } = req.validQuery;
    const where = [];
    const params = [];
    if (q) {
      // ESCAPE '\' funciona igual no SQLite e no PostgreSQL
      where.push(String.raw`(lower(n.title) LIKE ? ESCAPE '\' OR lower(n.body) LIKE ? ESCAPE '\')`);
      const like = `%${q.toLowerCase().replace(/[%_]/g, (c) => `\\${c}`)}%`;
      params.push(like, like);
    }
    if (category) { where.push('n.category = ?'); params.push(category); }
    if (machine) {
      const m = machines.resolve(machine);
      where.push('n.machine_id = ?');
      params.push(m ? m.row.id : -1);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT n.*, u.username AS author FROM notes n LEFT JOIN users u ON u.id = n.author_id ${w} ORDER BY n.created_at DESC, n.id DESC LIMIT ?`;
    const rows = await db.all(sql, [...params, limit]);
    res.json({ notes: rows.map(noteOut) });
  });

  r.post('/notes', requireAdmin, validate(noteSchema), async (req, res) => {
    const now = Date.now();
    const { title, body, category, machineId } = req.body;
    if (machineId != null && !machines.get(machineId)) return res.status(400).json({ error: 'Fazenda inválida.' });
    const id = await db.insert(
      'INSERT INTO notes (machine_id, category, title, body, created_at, updated_at, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [machineId ?? null, category, title, body, now, now, req.user.id],
    );
    await achievements.checkGlobal(machines.list().length);
    const row = await db.get('SELECT n.*, u.username AS author FROM notes n LEFT JOIN users u ON u.id = n.author_id WHERE n.id = ?', [id]);
    res.status(201).json({ note: noteOut(row) });
  });

  r.put('/notes/:id', requireAdmin, validate(noteSchema), async (req, res) => {
    const id = Number(req.params.id);
    const { title, body, category, machineId } = req.body;
    const result = await db.run(
      'UPDATE notes SET title = ?, body = ?, category = ?, machine_id = ?, updated_at = ? WHERE id = ?',
      [title, body, category, machineId ?? null, Date.now(), id],
    );
    if (!result.changes) return res.status(404).json({ error: 'Anotação não encontrada.' });
    const row = await db.get('SELECT n.*, u.username AS author FROM notes n LEFT JOIN users u ON u.id = n.author_id WHERE n.id = ?', [id]);
    res.json({ note: noteOut(row) });
  });

  r.delete('/notes/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const row = await db.get('SELECT title FROM notes WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Anotação não encontrada.' });
    await db.run('DELETE FROM notes WHERE id = ?', [id]);
    await audit.log({ user: req.user, action: 'note.delete', target: row.title, ip: req.ip });
    res.json({ ok: true });
  });

  // ---------- quadro de missões ----------

  r.get('/quests', async (_req, res) => {
    const rows = await db.all('SELECT * FROM quests ORDER BY id');
    res.json({ quests: rows.map(questOut) });
  });

  r.post('/quests', requireAdmin, validate(questSchema), async (req, res) => {
    const id = await db.insert('INSERT INTO quests (text, daily, created_at) VALUES (?, ?, ?)', [req.body.text, req.body.daily ? 1 : 0, Date.now()]);
    res.status(201).json({ quest: questOut(await db.get('SELECT * FROM quests WHERE id = ?', [id])) });
  });

  r.patch('/quests/:id', requireAdmin, validate(questPatchSchema), async (req, res) => {
    const id = Number(req.params.id);
    const row = await db.get('SELECT * FROM quests WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Missão não encontrada.' });
    const text = req.body.text ?? row.text;
    const daily = req.body.daily != null ? (req.body.daily ? 1 : 0) : row.daily;
    const doneAt = req.body.done == null ? row.done_at : req.body.done ? Date.now() : null;
    await db.run('UPDATE quests SET text = ?, daily = ?, done_at = ? WHERE id = ?', [text, daily, doneAt, id]);
    res.json({ quest: questOut(await db.get('SELECT * FROM quests WHERE id = ?', [id])) });
  });

  r.delete('/quests/:id', requireAdmin, async (req, res) => {
    const result = await db.run('DELETE FROM quests WHERE id = ?', [Number(req.params.id)]);
    if (!result.changes) return res.status(404).json({ error: 'Missão não encontrada.' });
    res.json({ ok: true });
  });

  return r;
}

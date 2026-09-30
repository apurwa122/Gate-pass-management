import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { db } from '../database/db.js';
import { authenticate, allow } from '../middleware/auth.js';

const router = Router();
const canSeeAll = "(p.requested_by = @userId OR @role IN ('approver','security','admin'))";
const passSelect = `SELECT p.*,v.name AS visitor_name,v.phone,v.email AS visitor_email,v.organization,u.name AS requester_name FROM gate_passes p JOIN visitors v ON v.id=p.visitor_id JOIN users u ON u.id=p.requested_by`;
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
  const user = db
    .prepare('SELECT * FROM users WHERE email=?')
    .get(String(email).trim().toLowerCase());
  if (!user || !bcrypt.compareSync(String(password), user.password_hash))
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'local-development-secret-change-me',
    { expiresIn: '8h' },
  );
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
router.use(authenticate);

router.get('/dashboard/stats', (req, res) => {
  const status = db
    .prepare(
      `SELECT status,COUNT(*) AS count FROM gate_passes ${req.user.role === 'requester' ? 'WHERE requested_by=?' : ''} GROUP BY status`,
    )
    .all(...(req.user.role === 'requester' ? [req.user.id] : []));
  const count = status.reduce((o, r) => ((o[r.status] = r.count), o), {});
  const records = db
    .prepare(
      `SELECT COUNT(*) AS entries, SUM(CASE WHEN exit_time IS NOT NULL THEN 1 ELSE 0 END) AS exits, SUM(CASE WHEN exit_time IS NULL THEN 1 ELSE 0 END) AS inside FROM entry_exit_records`,
    )
    .get();
  const total = db
    .prepare(
      `SELECT COUNT(*) n FROM gate_passes ${req.user.role === 'requester' ? 'WHERE requested_by=?' : ''}`,
    )
    .get(...(req.user.role === 'requester' ? [req.user.id] : [])).n;
  res.json({
    total,
    pending: count.Pending || 0,
    approved: count.Approved || 0,
    rejected: count.Rejected || 0,
    used: count.Used || 0,
    expired: count.Expired || 0,
    currentVisitors: records.inside || 0,
    totalEntries: records.entries || 0,
    totalExits: records.exits || 0,
  });
});
router.get('/passes', (req, res) =>
  res.json(
    db
      .prepare(`${passSelect} WHERE ${canSeeAll} ORDER BY p.created_at DESC`)
      .all({ userId: req.user.id, role: req.user.role }),
  ),
);
router.get('/passes/:id', (req, res) => {
  const row = db.prepare(`${passSelect} WHERE p.id=?`).get(Number(req.params.id));
  if (
    !row ||
    !(row.requested_by === req.user.id || ['approver', 'security', 'admin'].includes(req.user.role))
  )
    return res.status(404).json({ error: 'Gate pass not found.' });
  res.json(row);
});
router.post('/passes', allow('requester', 'admin'), (req, res) => {
  const { name, phone, email, organization, purpose, visitDate } = req.body || {};
  if (!name?.trim() || !phone?.trim() || !purpose?.trim() || !visitDate)
    return res
      .status(400)
      .json({ error: 'Visitor name, phone, purpose, and visit date are required.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || Number.isNaN(Date.parse(visitDate)))
    return res.status(400).json({ error: 'Enter a valid visit date.' });
  const create = db.transaction(() => {
    let visitor = db.prepare('SELECT id FROM visitors WHERE phone=?').get(phone.trim());
    if (visitor)
      db.prepare('UPDATE visitors SET name=?,email=?,organization=? WHERE id=?').run(
        name.trim(),
        email?.trim() || null,
        organization?.trim() || null,
        visitor.id,
      );
    else
      visitor = {
        id: db
          .prepare('INSERT INTO visitors(name,phone,email,organization) VALUES(?,?,?,?)')
          .run(name.trim(), phone.trim(), email?.trim() || null, organization?.trim() || null)
          .lastInsertRowid,
      };
    return db
      .prepare(
        'INSERT INTO gate_passes(visitor_id,requested_by,purpose,visit_date) VALUES(?,?,?,?)',
      )
      .run(visitor.id, req.user.id, purpose.trim(), visitDate).lastInsertRowid;
  });
  res.status(201).json(db.prepare(`${passSelect} WHERE p.id=?`).get(create()));
});
router.put('/passes/:id', allow('requester', 'admin'), (req, res) => {
  const { name, phone, email, organization, purpose, visitDate } = req.body || {};
  if (!name?.trim() || !phone?.trim() || !purpose?.trim() || !visitDate)
    return res
      .status(400)
      .json({ error: 'Visitor name, phone, purpose, and visit date are required.' });
  const pass = db.prepare('SELECT * FROM gate_passes WHERE id=?').get(Number(req.params.id));
  if (!pass || !(req.user.role === 'admin' || pass.requested_by === req.user.id))
    return res.status(404).json({ error: 'Gate pass not found.' });
  if (pass.status !== 'Pending')
    return res.status(409).json({ error: 'Only pending requests can be edited.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || Number.isNaN(Date.parse(visitDate)))
    return res.status(400).json({ error: 'Enter a valid visit date.' });
  const update = db.transaction(() => {
    db.prepare('UPDATE visitors SET name=?,phone=?,email=?,organization=? WHERE id=?').run(
      name.trim(),
      phone.trim(),
      email?.trim() || null,
      organization?.trim() || null,
      pass.visitor_id,
    );
    db.prepare(
      'UPDATE gate_passes SET purpose=?,visit_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
    ).run(purpose.trim(), visitDate, pass.id);
  });
  update();
  res.json(db.prepare(`${passSelect} WHERE p.id=?`).get(pass.id));
});
router.get('/approvals/pending', allow('approver', 'admin'), (req, res) =>
  res.json(db.prepare(`${passSelect} WHERE p.status='Pending' ORDER BY p.created_at`).all()),
);
router.get('/approvals', allow('approver', 'admin'), (req, res) =>
  res.json(
    db
      .prepare(
        'SELECT a.*,u.name AS approver_name,v.name AS visitor_name,p.purpose FROM approvals a JOIN users u ON u.id=a.approver_id JOIN gate_passes p ON p.id=a.pass_id JOIN visitors v ON v.id=p.visitor_id ORDER BY a.approved_at DESC',
      )
      .all(),
  ),
);
const decide = db.transaction((passId, decision, userId, remarks) => {
  const pass = db.prepare('SELECT * FROM gate_passes WHERE id=?').get(passId);
  if (!pass) return { error: 'Gate pass not found.', status: 404 };
  if (pass.status !== 'Pending')
    return { error: `This request is already ${pass.status.toLowerCase()}.`, status: 409 };
  db.prepare(
    'UPDATE gate_passes SET status=?,qr_reference=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
  ).run(decision, decision === 'Approved' ? randomUUID() : null, passId);
  db.prepare('INSERT INTO approvals(pass_id,approver_id,decision,remarks) VALUES(?,?,?,?)').run(
    passId,
    userId,
    decision,
    remarks?.trim() || null,
  );
  return { pass: db.prepare(`${passSelect} WHERE p.id=?`).get(passId) };
});
for (const decision of ['Approved', 'Rejected'])
  router.post(
    `/approvals/:id/${decision === 'Approved' ? 'approve' : 'reject'}`,
    allow('approver', 'admin'),
    (req, res) => {
      const result = decide(Number(req.params.id), decision, req.user.id, req.body?.remarks);
      if (result.error) return res.status(result.status).json({ error: result.error });
      res.json(result.pass);
    },
  );
router.get('/visitors', allow('approver', 'security', 'admin'), (req, res) =>
  res.json(
    db
      .prepare(
        'SELECT v.*,COUNT(p.id) AS pass_count,MAX(p.created_at) AS last_visit FROM visitors v LEFT JOIN gate_passes p ON p.visitor_id=v.id GROUP BY v.id ORDER BY v.created_at DESC',
      )
      .all(),
  ),
);
router.post('/visitors', allow('requester', 'admin'), (req, res) => {
  const { name, phone, email, organization } = req.body || {};
  if (!name?.trim() || !phone?.trim())
    return res.status(400).json({ error: 'Visitor name and phone are required.' });
  const info = db
    .prepare('INSERT INTO visitors(name,phone,email,organization) VALUES(?,?,?,?)')
    .run(name.trim(), phone.trim(), email?.trim() || null, organization?.trim() || null);
  res.status(201).json(db.prepare('SELECT * FROM visitors WHERE id=?').get(info.lastInsertRowid));
});
router.get('/visitors/:id', allow('approver', 'security', 'admin'), (req, res) => {
  const row = db.prepare('SELECT * FROM visitors WHERE id=?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Visitor not found.' });
  res.json({
    ...row,
    passes: db.prepare(`${passSelect} WHERE p.visitor_id=? ORDER BY p.created_at DESC`).all(row.id),
  });
});
router.put('/visitors/:id', allow('admin'), (req, res) => {
  const { name, phone, email, organization } = req.body || {};
  if (!name?.trim() || !phone?.trim())
    return res.status(400).json({ error: 'Visitor name and phone are required.' });
  const info = db
    .prepare('UPDATE visitors SET name=?,phone=?,email=?,organization=? WHERE id=?')
    .run(
      name.trim(),
      phone.trim(),
      email?.trim() || null,
      organization?.trim() || null,
      Number(req.params.id),
    );
  if (!info.changes) return res.status(404).json({ error: 'Visitor not found.' });
  res.json(db.prepare('SELECT * FROM visitors WHERE id=?').get(Number(req.params.id)));
});
router.post('/qr/generate', allow('requester', 'admin'), async (req, res) => {
  const pass = db
    .prepare('SELECT * FROM gate_passes WHERE id=? AND requested_by=?')
    .get(Number(req.body?.passId), req.user.id);
  if (!pass) return res.status(404).json({ error: 'Gate pass not found.' });
  if (pass.status !== 'Approved' && pass.status !== 'Used')
    return res.status(409).json({ error: 'A QR pass is available only after approval.' });
  res.json({
    reference: pass.qr_reference,
    qrDataUrl: await QRCode.toDataURL(pass.qr_reference, { width: 240, margin: 2 }),
  });
});
router.post('/qr/validate', allow('security', 'admin'), (req, res) => {
  const reference = String(req.body?.reference || '').trim();
  const pass = db.prepare(`${passSelect} WHERE p.qr_reference=?`).get(reference);
  if (!pass)
    return res.status(404).json({ valid: false, code: 'INVALID', message: 'Gate pass not found.' });
  if (pass.status === 'Rejected')
    return res
      .status(409)
      .json({ valid: false, code: 'REJECTED', message: 'Gate pass was rejected.' });
  if (pass.status === 'Used')
    return res
      .status(409)
      .json({ valid: false, code: 'ALREADY_USED', message: 'Gate pass has already been used.' });
  if (pass.status !== 'Approved')
    return res
      .status(409)
      .json({ valid: false, code: 'INVALID', message: 'Gate pass is not approved.' });
  if (pass.visit_date < new Date().toISOString().slice(0, 10)) {
    db.prepare(
      "UPDATE gate_passes SET status='Expired',updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).run(pass.id);
    return res
      .status(410)
      .json({ valid: false, code: 'EXPIRED', message: 'Gate pass has expired.' });
  }
  if (
    db
      .prepare('SELECT 1 FROM entry_exit_records WHERE pass_id=? AND exit_time IS NULL')
      .get(pass.id)
  )
    return res
      .status(409)
      .json({ valid: false, code: 'ALREADY_INSIDE', message: 'Visitor is already inside.' });
  res.json({ valid: true, code: 'VALID', message: 'Gate pass verified successfully.', pass });
});
router.post('/entry', allow('security', 'admin'), (req, res) => {
  const reference = String(req.body?.reference || '').trim();
  const pass = db.prepare('SELECT * FROM gate_passes WHERE qr_reference=?').get(reference);
  if (!pass) return res.status(404).json({ error: 'Gate pass not found.' });
  if (pass.status === 'Approved' && pass.visit_date < new Date().toISOString().slice(0, 10)) {
    db.prepare("UPDATE gate_passes SET status='Expired' WHERE id=?").run(pass.id);
    return res.status(410).json({ error: 'Gate pass has expired.' });
  }
  if (pass.status !== 'Approved')
    return res.status(409).json({
      error:
        pass.status === 'Used'
          ? 'Gate pass has already been used.'
          : `Gate pass is ${pass.status.toLowerCase()}.`,
    });
  if (
    db
      .prepare('SELECT 1 FROM entry_exit_records WHERE pass_id=? AND exit_time IS NULL')
      .get(pass.id)
  )
    return res.status(409).json({ error: 'Visitor is already inside.' });
  const txn = db.transaction(() => {
    db.prepare('INSERT INTO entry_exit_records(pass_id,verified_by) VALUES(?,?)').run(
      pass.id,
      req.user.id,
    );
    db.prepare("UPDATE gate_passes SET status='Used',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(
      pass.id,
    );
  });
  txn();
  res.status(201).json({ message: 'Entry recorded successfully.', passId: pass.id });
});
router.post('/exit', allow('security', 'admin'), (req, res) => {
  const reference = String(req.body?.reference || '').trim();
  const record = db
    .prepare(
      'SELECT r.* FROM entry_exit_records r JOIN gate_passes p ON p.id=r.pass_id WHERE p.qr_reference=? AND r.exit_time IS NULL',
    )
    .get(reference);
  if (!record) return res.status(404).json({ error: 'No active entry found for this gate pass.' });
  db.prepare('UPDATE entry_exit_records SET exit_time=CURRENT_TIMESTAMP WHERE id=?').run(record.id);
  res.json({ message: 'Exit recorded successfully.', passId: record.pass_id });
});
router.get('/entry-exit', allow('security', 'admin'), (req, res) =>
  res.json(
    db
      .prepare(
        'SELECT r.*,p.status,p.purpose,p.visit_date,v.name AS visitor_name,v.organization,u.name AS verified_by_name,p.qr_reference FROM entry_exit_records r JOIN gate_passes p ON p.id=r.pass_id JOIN visitors v ON v.id=p.visitor_id JOIN users u ON u.id=r.verified_by ORDER BY r.entry_time DESC',
      )
      .all(),
  ),
);
router.get('/users', allow('admin'), (req, res) =>
  res.json(db.prepare('SELECT id,name,email,role,created_at FROM users ORDER BY name').all()),
);
router.post('/users', allow('admin'), (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (
    !name?.trim() ||
    !email?.trim() ||
    !password ||
    !['requester', 'approver', 'security', 'admin'].includes(role)
  )
    return res.status(400).json({ error: 'Name, email, password, and a valid role are required.' });
  if (String(password).length < 8)
    return res.status(400).json({ error: 'Password must contain at least 8 characters.' });
  try {
    const id = db
      .prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)')
      .run(
        name.trim(),
        email.trim().toLowerCase(),
        bcrypt.hashSync(password, 10),
        role,
      ).lastInsertRowid;
    res
      .status(201)
      .json(db.prepare('SELECT id,name,email,role,created_at FROM users WHERE id=?').get(id));
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE')
      return res.status(409).json({ error: 'A user with that email already exists.' });
    throw e;
  }
});
router.put('/users/:id', allow('admin'), (req, res) => {
  const { name, email, role, password } = req.body || {};
  if (
    !name?.trim() ||
    !email?.trim() ||
    !['requester', 'approver', 'security', 'admin'].includes(role)
  )
    return res.status(400).json({ error: 'Name, email, and a valid role are required.' });
  if (password && String(password).length < 8)
    return res.status(400).json({ error: 'Password must contain at least 8 characters.' });
  try {
    const info = password
      ? db
          .prepare('UPDATE users SET name=?,email=?,role=?,password_hash=? WHERE id=?')
          .run(
            name.trim(),
            email.trim().toLowerCase(),
            role,
            bcrypt.hashSync(password, 10),
            Number(req.params.id),
          )
      : db
          .prepare('UPDATE users SET name=?,email=?,role=? WHERE id=?')
          .run(name.trim(), email.trim().toLowerCase(), role, Number(req.params.id));
    if (!info.changes) return res.status(404).json({ error: 'User not found.' });
    res.json(
      db
        .prepare('SELECT id,name,email,role,created_at FROM users WHERE id=?')
        .get(Number(req.params.id)),
    );
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE')
      return res.status(409).json({ error: 'A user with that email already exists.' });
    throw e;
  }
});
router.use((req, res) => res.status(404).json({ error: 'API route not found.' }));
export default router;

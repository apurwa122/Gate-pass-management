import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';

const demoUsers = [
  ['Ava Requester', 'requester@gatepass.local', 'requester'],
  ['Noah Approver', 'approver@gatepass.local', 'approver'],
  ['Mia Security', 'security@gatepass.local', 'security'],
  ['Leo Admin', 'admin@gatepass.local', 'admin'],
];

export function seedDatabase() {
  const productionMode = process.env.NODE_ENV === 'production' || process.env.DEMO_MODE === 'false';

  if (productionMode) {
    const existingAdmin = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();

    if (!existingAdmin) {
      const name = process.env.ADMIN_NAME?.trim() || 'GatePass Admin';
      const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const password = process.env.ADMIN_PASSWORD;

      if (!email || !password || password.length < 12) {
        throw new Error(
          'Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters before starting production.',
        );
      }

      db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)').run(
        name,
        email,
        bcrypt.hashSync(password, 12),
        'admin',
      );
    }

    return;
  }

  const addUser = db.prepare(
    'INSERT OR IGNORE INTO users(name,email,password_hash,role) VALUES(?,?,?,?)',
  );

  for (const [name, email, role] of demoUsers) {
    addUser.run(name, email, bcrypt.hashSync('GatePass123!', 10), role);
  }

  const requester = db.prepare("SELECT id FROM users WHERE role='requester'").get();
  const approver = db.prepare("SELECT id FROM users WHERE role='approver'").get();
  const hasVisitors = db.prepare('SELECT 1 FROM visitors LIMIT 1').get();

  if (hasVisitors) return;

  const firstVisitor = db
    .prepare('INSERT INTO visitors(name,phone,email,organization) VALUES(?,?,?,?)')
    .run('Jordan Lee', '555-0104', 'jordan@example.com', 'Northstar Analytics');
  const firstPass = db
    .prepare(
      'INSERT INTO gate_passes(visitor_id,requested_by,purpose,visit_date,status,qr_reference) VALUES(?,?,?,?,?,?)',
    )
    .run(
      firstVisitor.lastInsertRowid,
      requester.id,
      'Project kickoff meeting',
      new Date().toISOString().slice(0, 10),
      'Approved',
      randomUUID(),
    );

  db.prepare('INSERT INTO approvals(pass_id,approver_id,decision,remarks) VALUES(?,?,?,?)').run(
    firstPass.lastInsertRowid,
    approver.id,
    'Approved',
    'Welcome.',
  );

  const secondVisitor = db
    .prepare('INSERT INTO visitors(name,phone,email,organization) VALUES(?,?,?,?)')
    .run('Sam Rivera', '555-0188', 'sam@example.com', 'Blue Oak Studio');

  db.prepare(
    'INSERT INTO gate_passes(visitor_id,requested_by,purpose,visit_date) VALUES(?,?,?,?)',
  ).run(
    secondVisitor.lastInsertRowid,
    requester.id,
    'Design review',
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
}

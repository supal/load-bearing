/* Module 7: Security. All numbers are illustrative orders of magnitude. */
window.LESSONS = window.LESSONS || {};

/* ------------------------------------------------------------------ */
LESSONS['authn'] = {
  minutes: 8,
  diagram: {
    h: 480,
    nodes: [
      { id: 'user', kind: 'client', label: 'Browser', x: 100, y: 245, w: 140 },
      { id: 'idp', kind: 'lock', label: 'Identity provider', sub: 'SSO', w: 190, x: 440, y: 70 },
      { id: 'app', kind: 'server', label: 'App', x: 440, y: 245 },
      { id: 'db', kind: 'db', label: 'Users DB', sub: 'password hashes', w: 180, x: 780, y: 140 },
      { id: 'sess', kind: 'kv', label: 'Sessions', x: 780, y: 360 }
    ],
    edges: [['user', 'app'], ['user', 'idp'], ['app', 'idp'], ['app', 'db'], ['app', 'sess']]
  },
  steps: [
    {
      title: 'Who are you?',
      hide: ['idp'],
      focus: ['user', 'app'],
      body: `<p><strong>Authentication</strong> (authn) establishes who someone is. <strong>Authorization</strong> (authz, next lesson) decides what they may do. Mixing them up is the root of many security bugs.</p>
             <p>Authentication happens once at login. Every later request needs proof that it comes from the same person, usually a session cookie or a token.</p>`
    },
    {
      title: 'Store passwords so leaks hurt less',
      hide: ['idp'],
      slot: 850,
      badges: { db: 'argon2id(salt, password)' },
      flows: [
        { from: 'user', to: 'app', label: 'POST /login', seq: 0 },
        { from: 'app', to: 'db', label: 'fetch hash', seq: 1 },
        { from: 'db', to: 'app', kind: 'res', seq: 2 },
        { from: 'app', to: 'user', kind: 'res', label: 'verified', seq: 3 }
      ],
      body: `<p>Never store passwords, even encrypted. Store the output of a deliberately <strong>slow, salted</strong> password-hashing function such as Argon2id, scrypt or bcrypt. A unique random salt per user means identical passwords produce different hashes.</p>
             <p>Speed is the point. A fast hash lets an attacker with a stolen database try billions of guesses per second; a tuned password hash cuts that by many orders of magnitude.</p>`,
      code: `$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG
          ^ algorithm & cost        ^ salt      ^ hash`
    },
    {
      title: 'Sessions',
      hide: ['idp'],
      slot: 850,
      flows: [
        { from: 'app', to: 'sess', label: 'sid → user 42', seq: 0 },
        { from: 'app', to: 'user', kind: 'res', label: 'Set-Cookie: sid', seq: 1 },
        { from: 'user', to: 'app', label: 'cookie: sid', seq: 2 },
        { from: 'app', to: 'sess', label: 'look up', seq: 3 }
      ],
      body: `<p>After login, the server creates a random session ID, stores what it means server-side, and sends it as a cookie. Logging out or revoking access is just deleting the session.</p>
             <p>Cookie flags do real security work: <code>HttpOnly</code> keeps scripts from reading it, <code>Secure</code> sends it only over HTTPS, and <code>SameSite</code> limits cross-site requests that could forge actions.</p>`,
      code: `Set-Cookie: sid=Yp3…Qk; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1209600`
    },
    {
      title: 'Tokens',
      hide: ['idp', 'sess'],
      slot: 850,
      badges: { app: 'verify signature only' },
      flows: [
        { from: 'user', to: 'app', label: 'Bearer eyJ… (15 min)', seq: 0 },
        { from: 'app', to: 'user', kind: 'res', seq: 1 },
        { from: 'user', to: 'app', kind: 'warn', label: 'refresh token', seq: 2 },
        { from: 'app', to: 'user', kind: 'res', label: 'new access token', seq: 3 }
      ],
      body: `<p>A signed token (often a JWT) carries the user's identity and expiry, and any service can verify it without a lookup. That suits APIs, mobile apps and many services.</p>
             <p>Because tokens can't easily be revoked, keep <strong>access tokens</strong> short-lived (minutes) and issue a longer-lived <strong>refresh token</strong> that the server <em>can</em> revoke, used only to get new access tokens.</p>`
    },
    {
      title: 'Single sign-on',
      hide: ['sess', 'db'],
      slot: 700,
      flows: [
        { from: 'user', to: 'app', label: 'log in', seq: 0 },
        { from: 'app', to: 'user', kind: 'warn', label: 'redirect to IdP', seq: 1 },
        { from: 'user', to: 'idp', label: 'sign in + MFA', seq: 2 },
        { from: 'idp', to: 'user', kind: 'res', label: 'code', seq: 3 },
        { from: 'user', to: 'app', label: 'code', seq: 4 },
        { from: 'app', to: 'idp', label: 'exchange code', seq: 5 },
        { from: 'idp', to: 'app', kind: 'res', label: 'ID token', seq: 6 }
      ],
      body: `<p>With <strong>OpenID Connect</strong>, a dedicated identity provider handles login for many apps. The app never sees the password. It receives a short-lived code, swaps it server-to-server for a signed ID token, and starts its own session.</p>
             <p>Users log in once; security teams enforce MFA and disable departing employees in one place.</p>`
    },
    {
      title: 'Defending login',
      hide: ['idp'],
      states: { app: 'hot' },
      badges: { app: '5 tries / min / account' },
      flows: [{ from: 'user', to: 'app', kind: 'err', label: 'leaked passwords', stream: 4, period: 1200 }],
      body: `<p>Attackers replay username/password pairs leaked from other sites (<strong>credential stuffing</strong>). Rate-limit by account and by IP, check new passwords against known-breached lists, and add a second factor.</p>`,
      table: {
        head: ['Factor', 'Example', 'Resists phishing?'],
        rows: [
          ['Something you know', 'Password', 'No'],
          ['One-time code', 'Authenticator app, SMS', 'No (codes can be relayed)'],
          ['Passkey / security key', 'WebAuthn', 'Yes: bound to the real site']
        ]
      },
      tip: 'Use a well-tested library or identity provider for authentication. Write your own business logic, not your own login.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['authz'] = {
  minutes: 7,
  diagram: {
    h: 500,
    nodes: [
      { id: 'user', kind: 'client', label: 'Alice', sub: 'user 42', x: 100, y: 250, w: 140 },
      { id: 'gw', kind: 'lb', label: 'Gateway', sub: 'coarse checks', x: 330, y: 250 },
      { id: 'svc', kind: 'server', label: 'Docs service', w: 170, x: 590, y: 250 },
      { id: 'pdp', kind: 'shield', label: 'Policy engine', w: 170, x: 590, y: 70 },
      { id: 'rel', kind: 'kv', label: 'Relationships', sub: 'who → what', w: 170, x: 590, y: 430 },
      { id: 'data', kind: 'db', label: 'Documents', w: 140, x: 820, y: 250 }
    ],
    edges: [['user', 'gw'], ['gw', 'svc'], ['svc', 'pdp'], ['svc', 'rel'], ['svc', 'data']]
  },
  steps: [
    {
      title: 'Check every request, on the server',
      hide: ['pdp', 'rel'],
      slot: 800,
      badges: { svc: 'doc 43 belongs to Bob' },
      flows: [
        { from: 'user', to: 'gw', label: 'GET /docs/43', seq: 0 },
        { from: 'gw', to: 'svc', seq: 1 },
        { from: 'svc', to: 'gw', kind: 'err', label: '403', seq: 2 },
        { from: 'gw', to: 'user', kind: 'err', seq: 3 }
      ],
      body: `<p>Alice is logged in, so she's authenticated. Can she read document 43? Changing an ID in the URL to reach someone else's data is one of the most common real-world vulnerabilities.</p>
             <p>Rules of thumb: check on the server on <em>every</em> request, deny by default, and never trust that the UI hid a button.</p>`
    },
    {
      title: 'Roles (RBAC)',
      hide: ['pdp', 'rel'],
      badges: { user: 'role: editor' },
      flows: [
        { from: 'user', to: 'gw', label: 'PUT /docs/42', seq: 0 },
        { from: 'gw', to: 'svc', seq: 1 },
        { from: 'svc', to: 'data', label: 'editor may write ✓', seq: 2 }
      ],
      body: `<p>Role-based access control gives users roles and roles permissions. It's easy to understand and audit.</p>
             <p>It breaks down when access depends on the specific record ("editors, but only for their own team's documents"), and teams respond by creating ever more roles.</p>`,
      table: {
        head: ['Role', 'Read', 'Write', 'Delete', 'Manage users'],
        rows: [['viewer', '✓', '', '', ''], ['editor', '✓', '✓', '', ''], ['admin', '✓', '✓', '✓', '✓']]
      }
    },
    {
      title: 'Attributes and policies (ABAC)',
      hide: ['rel'],
      slot: 850,
      flows: [
        { from: 'svc', to: 'pdp', label: 'alice · edit · doc 42?', seq: 0 },
        { from: 'pdp', to: 'svc', kind: 'res', label: 'allow', seq: 1 },
        { from: 'svc', to: 'data', seq: 2 }
      ],
      body: `<p>Attribute-based access control evaluates rules over attributes of the user, the resource and the context: department, document classification, time, location.</p>
             <p>Putting rules in a separate <strong>policy engine</strong> means they're written once, tested and versioned, instead of scattered through <code>if</code> statements.</p>`,
      code: `allow if
  user.department == resource.department
  and resource.classification != "restricted"
  and action in ["read", "edit"]`
    },
    {
      title: 'Relationships (ReBAC)',
      hide: ['pdp'],
      slot: 850,
      badges: { rel: 'alice ∈ team-x → folder → doc 42' },
      flows: [
        { from: 'svc', to: 'rel', label: 'can alice view doc 42?', seq: 0 },
        { from: 'rel', to: 'svc', kind: 'res', label: 'yes, via team-x', seq: 1 }
      ],
      body: `<p>Sharing models, like "anyone in this team can see this folder and everything in it", are naturally graphs. Relationship-based access control stores tuples like <code>(doc:42, parent, folder:7)</code> and answers by following the graph.</p>
             <p>It handles nested groups and inherited sharing well, at the cost of running a dedicated authorization service.</p>`
    },
    {
      title: 'Where to enforce',
      flows: [
        { from: 'user', to: 'gw', stream: 2, period: 1600 },
        { from: 'gw', to: 'svc', stream: 2, period: 1600, offset: 0.3 },
        { from: 'svc', to: 'pdp', stream: 1, period: 1600, offset: 0.6 },
        { from: 'svc', to: 'data', stream: 1, period: 1600, offset: 0.9 }
      ],
      body: `<p>Use layers, each doing what it can see:</p>`,
      table: {
        head: ['Layer', 'Checks', 'Example'],
        rows: [
          ['Gateway', 'Valid identity, token scopes', 'Token has <code>docs:read</code>'],
          ['Service', 'Rules about this specific record', 'Alice may edit doc 42'],
          ['Database', 'Row-level security as a backstop', 'Queries only return Alice’s tenant'],
          ['Audit log', 'Who did what, and when', 'Investigations, compliance']
        ]
      },
      tip: 'Grant the least privilege that works, for people and for services. Most breaches get worse because something had more access than it needed.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['secrets'] = {
  minutes: 7,
  diagram: {
    h: 500,
    nodes: [
      { id: 'user', kind: 'client', label: 'Browser', x: 100, y: 250, w: 140 },
      { id: 'lb', kind: 'lb', label: 'Load balancer', sub: 'TLS ends here', w: 170, x: 340, y: 250 },
      { id: 'app', kind: 'server', label: 'App', x: 590, y: 250 },
      { id: 'db', kind: 'db', label: 'Database', sub: 'encrypted at rest', w: 180, x: 790, y: 90 },
      { id: 'kms', kind: 'key', label: 'KMS', sub: 'master keys', w: 150, x: 810, y: 420 },
      { id: 'vault', kind: 'lock', label: 'Secrets manager', w: 190, x: 590, y: 440 }
    ],
    edges: [['user', 'lb'], ['lb', 'app'], ['app', 'db'], ['app', 'kms'], ['app', 'vault']]
  },
  steps: [
    {
      title: 'Three things to protect',
      focus: ['lb', 'db', 'vault'],
      badges: { lb: 'in transit', db: 'at rest', vault: 'credentials' },
      body: `<p>Data moves across networks (<strong>in transit</strong>), sits on disks and in backups (<strong>at rest</strong>), and the system itself runs on <strong>secrets</strong>: database passwords, API keys, signing keys.</p>
             <p>Each needs its own protection, and the keys that protect everything else need the most care of all.</p>`
    },
    {
      title: 'TLS in transit',
      hide: ['kms', 'vault'],
      slot: 750,
      flows: [
        { from: 'user', to: 'lb', label: 'hello + key share', seq: 0 },
        { from: 'lb', to: 'user', kind: 'res', label: 'certificate + key share', seq: 1 },
        { from: 'user', to: 'lb', label: 'encrypted request', seq: 2 },
        { from: 'lb', to: 'app', label: 'mTLS', seq: 3 }
      ],
      body: `<p>TLS encrypts the connection and, through the server's certificate, proves the browser is talking to the real site. TLS 1.3 sets up a connection in one round trip.</p>
             <p>Don't stop at the load balancer. Inside the network, <strong>mutual TLS</strong> lets services prove their identity to each other too, so an attacker who gets onto the network can't simply listen or impersonate.</p>`
    },
    {
      title: 'Encryption at rest',
      hide: ['kms', 'vault'],
      badges: { db: 'disk: AES-256' },
      flows: [{ from: 'app', to: 'db', stream: 2, period: 1600 }],
      body: `<p>Encrypting disks and backups protects against a stolen drive, a mis-shared snapshot or a discarded server. Cloud providers mostly do this by default.</p>
             <p>Know what it doesn't do: the running database decrypts transparently, so SQL injection or a stolen app credential still reads plaintext. For the most sensitive fields, also encrypt them in the application before they're stored.</p>`
    },
    {
      title: 'Envelope encryption',
      hide: ['vault', 'user', 'lb'],
      slot: 850,
      flows: [
        { from: 'app', to: 'kms', label: 'unwrap data key', seq: 0 },
        { from: 'kms', to: 'app', kind: 'res', label: 'plaintext key (in memory)', seq: 1 },
        { from: 'app', to: 'db', label: 'ciphertext + wrapped key', seq: 2 }
      ],
      body: `<p>Encrypt each record or file with its own <strong>data key</strong>. Encrypt (wrap) that data key with a <strong>master key</strong> that never leaves the key management service. Store the wrapped key next to the data.</p>
             <p>To read, ask the KMS to unwrap the data key. Every unwrap is authorised and logged, and rotating the master key only re-wraps small keys, not terabytes of data.</p>`,
      code: `data_key            = random 256 bits
ciphertext          = AES-GCM(data_key, record)
wrapped_key         = KMS.encrypt(master_key_id, data_key)
store(ciphertext, wrapped_key)   // then forget data_key`
    },
    {
      title: 'Secrets out of code',
      hide: ['kms', 'user', 'lb'],
      slot: 850,
      badges: { vault: 'issued db creds · TTL 1 h' },
      flows: [
        { from: 'app', to: 'vault', label: 'I am app (identity)', seq: 0 },
        { from: 'vault', to: 'app', kind: 'res', label: 'db password, 1 h', seq: 1 },
        { from: 'app', to: 'db', label: 'connect', seq: 2 }
      ],
      body: `<p>Secrets committed to git live forever in history and in every clone. Instead, the app proves its identity (from its platform, not a password) to a <strong>secrets manager</strong> at startup and fetches what it needs.</p>
             <p>Better still are <strong>dynamic secrets</strong>: the manager creates a unique, short-lived database user for each app instance. A leaked credential expires on its own, and logs show exactly who used it.</p>`
    },
    {
      title: 'Rotate before you have to',
      hide: ['user'],
      flows: [
        { from: 'app', to: 'vault', stream: 1, period: 2200 },
        { from: 'app', to: 'kms', stream: 1, period: 2200, offset: 0.5 },
        { from: 'lb', to: 'app', stream: 2, period: 1600 }
      ],
      body: `<p>Assume every secret will leak eventually, and make replacing it routine. Support two valid credentials at once so you can roll the new one out before revoking the old one.</p>`,
      table: {
        head: ['Practice', 'Why'],
        rows: [
          ['TLS everywhere, auto-renewed certificates', 'Expired certificates cause outages too'],
          ['Keys in a KMS or HSM', 'Keys never sit in app memory dumps or disks'],
          ['Short-lived credentials', 'Leaks expire on their own'],
          ['Secret scanning in CI', 'Catch keys before they are pushed'],
          ['Audit logs on key use', 'Know what a leaked key touched']
        ]
      },
      tip: 'Don’t invent cryptography. Use standard libraries, managed key services and protocols that experts have reviewed.'
    }
  ]
};

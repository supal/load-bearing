/* Module 8: Delivery. All numbers are illustrative orders of magnitude. */
window.LESSONS = window.LESSONS || {};

/* ------------------------------------------------------------------ */
LESSONS['testing'] = {
  minutes: 7,
  diagram: {
    h: 480,
    nodes: [
      { id: 'test', kind: 'code', label: 'Test suite', x: 110, y: 240, w: 150 },
      { id: 'ord', kind: 'server', label: 'Orders', sub: 'under test', x: 400, y: 240 },
      { id: 'contract', kind: 'kv', label: 'Contract', sub: 'shared spec', x: 400, y: 70 },
      { id: 'pay', kind: 'server', label: 'Payments', x: 720, y: 110 },
      { id: 'db', kind: 'db', label: 'Database', x: 720, y: 380 }
    ],
    edges: [['test', 'ord'], ['ord', 'pay'], ['ord', 'db'], ['ord', 'contract'], ['pay', 'contract']]
  },
  steps: [
    {
      title: 'Many tests, few slow ones',
      focus: ['test'],
      body: `<p>In a distributed system, no single kind of test catches everything. Fast, focused tests catch most bugs cheaply; slow, broad tests catch what falls between components.</p>
             <p>Keep most tests at the cheap end. A suite that takes an hour gets run less often, and flaky tests teach people to ignore failures.</p>`,
      bars: {
        log: true,
        title: 'A typical service’s suite (log scale)',
        items: [
          { label: 'Unit', value: 2000, display: '2,000 · ms each', tone: 'res' },
          { label: 'Contract', value: 150, display: '150 · ms each', tone: 'res' },
          { label: 'Integration', value: 60, display: '60 · seconds each' },
          { label: 'End-to-end', value: 10, display: '10 · minutes each', tone: 'warn' }
        ]
      }
    },
    {
      title: 'Unit tests: logic in isolation',
      hide: ['pay', 'db', 'contract'],
      slot: 600,
      badges: { ord: 'in-memory fakes' },
      flows: [
        { from: 'test', to: 'ord', label: 'total(cart)', seq: 0 },
        { from: 'ord', to: 'test', kind: 'res', label: '✓', seq: 1 },
        { from: 'test', to: 'ord', label: 'apply(coupon)', seq: 2 },
        { from: 'ord', to: 'test', kind: 'res', label: '✓', seq: 3 }
      ],
      body: `<p>Unit tests exercise business logic with dependencies replaced by fakes. Thousands run in seconds on every save.</p>
             <p>They're only as good as the fakes. A fake payments client that never times out can't tell you how your code behaves when the real one does.</p>`
    },
    {
      title: 'Integration tests: real dependencies',
      hide: ['pay', 'contract'],
      slot: 800,
      badges: { db: 'real engine in a container' },
      flows: [
        { from: 'test', to: 'ord', label: 'create order', seq: 0 },
        { from: 'ord', to: 'db', label: 'real SQL', seq: 1 },
        { from: 'db', to: 'ord', kind: 'res', seq: 2 },
        { from: 'ord', to: 'test', kind: 'res', label: '✓', seq: 3 }
      ],
      body: `<p>Integration tests run the service against real infrastructure: the actual database engine, an actual queue, started fresh in containers.</p>
             <p>They catch what fakes hide: wrong SQL, missing migrations, transaction behaviour, serialisation bugs. Run them in CI on every change.</p>`
    },
    {
      title: 'Contract tests: agree without meeting',
      hide: ['test', 'db'],
      slot: 850,
      flows: [
        { from: 'ord', to: 'contract', label: 'I send {amount, currency}', seq: 0 },
        { from: 'pay', to: 'contract', label: 'verify I accept it', seq: 1 },
        { from: 'contract', to: 'pay', kind: 'res', label: '✓ compatible', seq: 2 }
      ],
      body: `<p>Two teams change two services independently. How do you know the payments team won't break orders?</p>
             <p>With <strong>consumer-driven contracts</strong>, the consumer (orders) records the requests it makes and the responses it relies on. The provider's CI replays them against every change. A breaking change fails the provider's build before it ships, without running both services together.</p>`
    },
    {
      title: 'End-to-end: a few critical journeys',
      hide: ['contract'],
      slot: 650,
      badges: { test: '8 minutes · sometimes flaky' },
      flows: [
        { from: 'test', to: 'ord', label: 'checkout', seq: 0 },
        { from: 'ord', to: 'pay', seq: 1 }, { from: 'ord', to: 'db', seq: 1 },
        { from: 'pay', to: 'ord', kind: 'res', seq: 2 }, { from: 'db', to: 'ord', kind: 'res', seq: 2 },
        { from: 'ord', to: 'test', kind: 'res', label: '✓', seq: 3 }
      ],
      body: `<p>End-to-end tests drive the whole deployed system the way a user would. They give the most confidence and cost the most: slow, brittle, and hard to debug when they fail.</p>
             <p>Keep a handful for journeys that must never break, such as signup, checkout and login. Push everything else down to cheaper tests.</p>`
    },
    {
      title: 'Inject failure on purpose',
      hide: ['contract'],
      slot: 800,
      states: { pay: 'down' },
      badges: { pay: 'injected: +2 s latency', ord: 'fallback: payment pending' },
      flows: [
        { from: 'test', to: 'ord', label: 'checkout', seq: 0 },
        { from: 'ord', to: 'pay', kind: 'err', label: 'timeout', seq: 1 },
        { from: 'ord', to: 'test', kind: 'res', label: 'degraded, not broken', seq: 2 }
      ],
      body: `<p>Most outages come from dependencies misbehaving, and normal tests assume they behave. <strong>Fault injection</strong> adds latency, errors or dropped connections and checks that timeouts, retries and fallbacks actually work.</p>
             <p><strong>Chaos engineering</strong> does this carefully in production: form a hypothesis ("losing one cache node won't raise errors"), limit the blast radius, run it, and learn. Add <strong>load tests</strong> to find limits before your users do.</p>`,
      tip: 'Test how the system fails, not only how it works. A tested fallback is worth more than another happy-path test.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['deploys'] = {
  minutes: 8,
  diagram: {
    h: 500,
    nodes: [
      { id: 'dev', kind: 'code', label: 'Git push', x: 100, y: 250, w: 140 },
      { id: 'ci', kind: 'gear', label: 'CI pipeline', sub: 'build · test · scan', w: 190, x: 340, y: 250 },
      { id: 'users', kind: 'users', label: 'Users', x: 590, y: 70, w: 130 },
      { id: 'lb', kind: 'lb', label: 'Load balancer', x: 590, y: 250 },
      { id: 'blue', kind: 'server', label: 'v41', sub: 'blue', x: 820, y: 130, w: 130 },
      { id: 'green', kind: 'server', label: 'v42', sub: 'green', x: 820, y: 370, w: 130 },
      { id: 'flags', kind: 'flag', label: 'Feature flags', w: 170, x: 590, y: 440 }
    ],
    edges: [['dev', 'ci'], ['users', 'lb'], ['lb', 'blue'], ['lb', 'green'], ['ci', 'green'], ['flags', 'green'], { a: 'ci', b: 'blue', curve: -40 }]
  },
  steps: [
    {
      title: 'Continuous integration',
      hide: ['users', 'lb', 'blue', 'green', 'flags'],
      slot: 1000,
      badges: { ci: '6 min · all green' },
      flows: [
        { from: 'dev', to: 'ci', label: 'commit a1f3', seq: 0 }
      ],
      body: `<p>Every commit to the main branch triggers a pipeline: build once, run the tests, scan for vulnerabilities and leaked secrets, and publish one versioned artifact, such as a container image.</p>
             <p>That same artifact moves through every environment. You never rebuild for production, so what you tested is exactly what you ship. Small, frequent merges keep each change easy to review and easy to undo.</p>`
    },
    {
      title: 'Blue-green: stand up the new version',
      hide: ['flags', 'ci-blue'],
      slot: 1000,
      badges: { blue: 'live', green: 'warming up' },
      flows: [
        { from: 'users', to: 'lb', stream: 3, period: 1500 },
        { from: 'lb', to: 'blue', stream: 3, period: 1500, offset: 0.4 },
        { from: 'ci', to: 'green', label: 'deploy v42', seq: 0 }
      ],
      body: `<p>Keep two production environments. Blue runs the current version and serves all traffic. Deploy the new version to green, which is idle, and run smoke tests against it there.</p>`
    },
    {
      title: 'Flip the switch',
      hide: ['flags', 'ci-blue', 'ci-green'],
      badges: { blue: 'idle · instant rollback', green: 'live' },
      flows: [
        { from: 'users', to: 'lb', stream: 3, period: 1500 },
        { from: 'lb', to: 'green', stream: 3, period: 1500, offset: 0.4 }
      ],
      body: `<p>Point the load balancer at green. If something's wrong, point it back: rollback takes seconds because blue is still running.</p>
             <p>The costs: double capacity during the switch, and both versions must work with the same database, which constrains how you change schemas.</p>`
    },
    {
      title: 'Canary: a little traffic first',
      hide: ['flags', 'ci-blue', 'ci-green'],
      badges: { blue: '95%', green: '5% · errors 0.1% ✓' },
      flows: [
        { from: 'users', to: 'lb', stream: 4, period: 1500 },
        { from: 'lb', to: 'blue', stream: 4, period: 1500, offset: 0.4 },
        { from: 'lb', to: 'green', stream: 1, period: 3000, offset: 0.6 }
      ],
      body: `<p>Send a small slice of real traffic to the new version and compare its error rate and latency with the old one. If it holds up, step up: 5% → 25% → 50% → 100%. If not, roll back automatically.</p>
             <p>A bad release now affects 5% of users for a few minutes, not everyone until someone notices.</p>`,
      metrics: [{ label: 'Error rate v41', value: '0.12%' }, { label: 'Error rate v42', value: '0.10%', tone: 'res' }, { label: 'Next step', value: '25% in 10 min' }]
    },
    {
      title: 'Feature flags: deploy is not release',
      hide: ['ci-blue', 'ci-green', 'blue', 'dev', 'ci'],
      slot: 1000,
      badges: { flags: 'new_checkout: 10%', green: 'code shipped, dark' },
      flows: [
        { from: 'flags', to: 'green', label: 'on for 10% of users', seq: 0 },
        { from: 'users', to: 'lb', stream: 2, period: 1500 },
        { from: 'lb', to: 'green', stream: 2, period: 1500, offset: 0.4 }
      ],
      body: `<p>Ship new code switched off, then turn it on with a flag: for staff, then beta users, then a percentage. If it misbehaves, turn the flag off in seconds, without a deploy.</p>
             <p>Flags separate the technical act of <em>deploying</em> from the business decision to <em>release</em>. Delete them once a feature is fully rolled out; old flags pile up into untested code paths.</p>`
    },
    {
      title: 'Database changes: expand, then contract',
      hide: ['flags', 'ci-blue', 'ci-green', 'dev', 'ci'],
      badges: { blue: 'reads old column', green: 'writes both' },
      flows: [
        { from: 'lb', to: 'blue', stream: 2, period: 1600 },
        { from: 'lb', to: 'green', stream: 2, period: 1600, offset: 0.5 }
      ],
      body: `<p>During any rollout, old and new code run at the same time against the same database. So never make a schema change the old code can't survive. Split it into backward-compatible steps:</p>`,
      table: {
        head: ['Step', 'Change', 'Old code still works?'],
        rows: [
          ['1 · Expand', 'Add the new column (nullable)', 'Yes'],
          ['2 · Dual write', 'Deploy code writing both columns', 'Yes'],
          ['3 · Backfill', 'Copy old rows into the new column', 'Yes'],
          ['4 · Switch reads', 'Deploy code reading the new column', 'Yes'],
          ['5 · Contract', 'Stop writing, then drop the old column', 'Old code is gone']
        ]
      },
      tip: 'Make every deploy small and every rollback boring. The faster you can undo, the less each mistake costs.'
    }
  ]
};

/* Module 4: Messaging. All numbers are illustrative orders of magnitude. */
window.LESSONS = window.LESSONS || {};

/* ------------------------------------------------------------------ */
LESSONS['api-styles'] = {
  minutes: 7,
  diagram: {
    h: 480,
    nodes: [
      { id: 'web', kind: 'client', label: 'Web app', x: 110, y: 100, w: 140 },
      { id: 'mob', kind: 'phone', label: 'Mobile app', x: 110, y: 390, w: 150 },
      { id: 'api', kind: 'server', label: 'Public API', x: 430, y: 245 },
      { id: 'ord', kind: 'server', label: 'Orders', sub: 'internal', x: 770, y: 100 },
      { id: 'usr', kind: 'server', label: 'Users', sub: 'internal', x: 770, y: 390 }
    ],
    edges: [['web', 'api'], ['mob', 'api'], ['api', 'ord'], ['api', 'usr']]
  },
  steps: [
    {
      title: 'An API is a contract',
      flows: [
        { from: 'web', to: 'api', seq: 0 }, { from: 'mob', to: 'api', seq: 0 },
        { from: 'api', to: 'ord', seq: 1 }, { from: 'api', to: 'usr', seq: 1 }
      ],
      body: `<p>Once other code depends on your API, changing it is expensive. Clients you don't control, such as old mobile app versions, may call it for years.</p>
             <p>Three styles cover most systems: <strong>REST</strong> (resources over HTTP), <strong>GraphQL</strong> (clients ask for exactly the data they need) and <strong>gRPC</strong> (typed remote procedure calls).</p>`
    },
    {
      title: 'REST: resources and verbs',
      focus: ['web', 'api'],
      slot: 900,
      flows: [
        { from: 'web', to: 'api', label: 'GET /orders/81', seq: 0 },
        { from: 'api', to: 'web', kind: 'res', label: '200 + JSON', seq: 1 }
      ],
      body: `<p>REST models everything as resources with URLs, and uses HTTP methods to act on them. Status codes report the outcome, and plain HTTP caching works for free.</p>
             <p>It's universal: every language, proxy and browser speaks it, and you can debug it with curl.</p>`,
      code: `GET    /orders/81          → 200 { "id": 81, "status": "paid" }
POST   /orders             → 201 Location: /orders/82
PATCH  /orders/81          → 200
DELETE /orders/81          → 204
GET    /orders?cursor=abc  → page of results`
    },
    {
      title: 'Too many round trips',
      slot: 600,
      badges: { mob: '3 round trips on 4G' },
      flows: [
        { from: 'mob', to: 'api', label: '/users/7', seq: 0 }, { from: 'api', to: 'mob', kind: 'res', seq: 1 },
        { from: 'mob', to: 'api', label: '/users/7/orders', seq: 2 }, { from: 'api', to: 'mob', kind: 'res', seq: 3 },
        { from: 'mob', to: 'api', label: '/orders/81/items', seq: 4 }, { from: 'api', to: 'mob', kind: 'res', seq: 5 }
      ],
      body: `<p>A mobile screen needs a user, their recent orders and each order's items. With resource-shaped endpoints that's several sequential requests, each paying mobile-network latency. Meanwhile each response includes fields the screen never shows.</p>
             <p>Teams often answer with screen-specific endpoints, sometimes called a <strong>backend for frontend</strong>.</p>`
    },
    {
      title: 'GraphQL: ask for exactly this',
      slot: 750,
      flows: [
        { from: 'mob', to: 'api', label: 'one query', seq: 0 },
        { from: 'api', to: 'usr', seq: 1 }, { from: 'api', to: 'ord', seq: 1 },
        { from: 'usr', to: 'api', kind: 'res', seq: 2 }, { from: 'ord', to: 'api', kind: 'res', seq: 2 },
        { from: 'api', to: 'mob', kind: 'res', label: 'just these fields', seq: 3 }
      ],
      body: `<p>GraphQL exposes a typed schema. The client sends one query describing the shape it wants, and the server's resolvers fetch the pieces.</p>
             <p>Trade-offs: HTTP caching is harder because everything is a POST to one URL, a deeply nested query can be very expensive (limit depth and cost), and naive resolvers cause many small database queries unless you batch them.</p>`,
      code: `query {
  user(id: 7) {
    name
    orders(last: 3) { id total items { name } }
  }
}`
    },
    {
      title: 'gRPC: fast calls between services',
      focus: ['api', 'ord', 'usr'],
      flows: [
        { from: 'api', to: 'ord', label: 'GetOrder()', stream: 3, period: 1200 },
        { from: 'ord', to: 'api', kind: 'res', stream: 3, period: 1200, offset: 0.5 }
      ],
      body: `<p>gRPC defines services and messages in a schema file, then generates client and server code in many languages. Messages are compact binary (protobuf) over HTTP/2, with support for streaming in both directions.</p>
             <p>It shines between your own services. Browsers can't call it directly without a proxy, so public APIs usually stay REST or GraphQL.</p>`,
      code: `service Orders {
  rpc GetOrder (GetOrderRequest) returns (Order);
  rpc WatchOrders (WatchRequest) returns (stream Order);
}
message GetOrderRequest { int64 id = 1; }`
    },
    {
      title: 'Choosing, and changing safely',
      flows: [
        { from: 'web', to: 'api', stream: 2, period: 1800 }, { from: 'mob', to: 'api', stream: 2, period: 1800, offset: 0.5 },
        { from: 'api', to: 'ord', stream: 2, period: 1800, offset: 0.25 }, { from: 'api', to: 'usr', stream: 2, period: 1800, offset: 0.75 }
      ],
      body: `<p>Many systems mix styles: REST or GraphQL at the edge, gRPC inside.</p>`,
      table: {
        head: ['', 'REST', 'GraphQL', 'gRPC'],
        rows: [
          ['Best for', 'Public APIs, simple CRUD', 'Varied clients, rich UIs', 'Service-to-service'],
          ['Payload', 'JSON', 'JSON', 'Binary protobuf'],
          ['Caching', 'HTTP caching built in', 'Needs app-level work', 'Needs app-level work'],
          ['Typing', 'Optional (OpenAPI)', 'Schema required', 'Schema required'],
          ['Browser support', 'Native', 'Native', 'Via proxy']
        ]
      },
      tip: "Evolve APIs by adding, never by changing or removing: new optional fields, new endpoints. Clients ignore what they don't know."
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['queues'] = {
  minutes: 8,
  diagram: {
    h: 480,
    nodes: [
      { id: 'web', kind: 'server', label: 'Web server', x: 110, y: 240, w: 150 },
      { id: 'q', kind: 'queue', label: 'Queue', sub: 'jobs', x: 420, y: 240 },
      { id: 'w1', kind: 'gear', label: 'Worker 1', x: 770, y: 90 },
      { id: 'w2', kind: 'gear', label: 'Worker 2', x: 770, y: 240 },
      { id: 'w3', kind: 'gear', label: 'Worker 3', x: 770, y: 390 },
      { id: 'dlq', kind: 'queue', label: 'Dead letters', x: 420, y: 410, w: 160 }
    ],
    edges: [['web', 'q'], ['q', 'w1'], ['q', 'w2'], ['q', 'w3'], ['q', 'dlq'], { a: 'web', b: 'w2', curve: -130 }]
  },
  steps: [
    {
      title: 'Doing slow work in the request',
      hide: ['q', 'dlq', 'w1', 'w3'],
      states: { w2: 'hot' },
      badges: { w2: 'email provider: 2.4 s', web: 'user waiting…' },
      slot: 1200,
      flows: [
        { from: 'web', to: 'w2', label: 'send welcome email', seq: 0 },
        { from: 'w2', to: 'web', kind: 'res', label: 'done', seq: 1 }
      ],
      body: `<p>A signup handler that sends the welcome email inline makes the user wait for the email provider. If the provider is down, signup fails, even though the account itself was created fine.</p>
             <p>The request is now only as fast and as reliable as its slowest dependency.</p>`
    },
    {
      title: 'Put a queue in between',
      hide: ['dlq', 'w1', 'w3', 'web-w2'],
      slot: 800,
      badges: { web: 'replied in 40 ms' },
      flows: [
        { from: 'web', to: 'q', label: 'job: welcome email', seq: 0 },
        { from: 'q', to: 'w2', seq: 1 }
      ],
      body: `<p>The web server writes a small job message to a queue and responds right away. A worker pulls the job and does the slow part on its own schedule.</p>
             <p>Producer and consumer no longer need to be up at the same time or run at the same speed. That's <strong>decoupling</strong>.</p>`
    },
    {
      title: 'Absorb spikes',
      hide: ['dlq', 'web-w2'],
      states: { q: 'hot' },
      badges: { q: 'depth 12,400 · oldest 40 s' },
      flows: [
        { from: 'web', to: 'q', stream: 6, period: 1100 },
        { from: 'q', to: 'w1', stream: 1, period: 1400 },
        { from: 'q', to: 'w2', stream: 1, period: 1400, offset: 0.33 },
        { from: 'q', to: 'w3', stream: 1, period: 1400, offset: 0.66 }
      ],
      body: `<p>During a burst, jobs arrive faster than workers finish them, and the queue grows. Nothing is dropped and nothing falls over; jobs just wait longer.</p>
             <p>Watch the <strong>age of the oldest message</strong>, not only the count, and add workers automatically when it climbs.</p>`,
      metrics: [{ label: 'In', value: '900 jobs/s', tone: 'warn' }, { label: 'Out', value: '600 jobs/s' }, { label: 'Backlog drains in', value: '≈ minutes after the burst' }]
    },
    {
      title: 'Workers acknowledge',
      hide: ['dlq', 'web-w2'],
      slot: 800,
      badges: { q: 'job 41 hidden for 30 s' },
      flows: [
        { from: 'q', to: 'w1', label: 'job 41', seq: 0 },
        { from: 'w1', to: 'q', kind: 'res', label: 'ack · delete', seq: 1 }
      ],
      body: `<p>Several workers read from the same queue, and each job goes to one of them. These are <strong>competing consumers</strong>, and adding workers adds throughput.</p>
             <p>A delivered job isn't deleted yet. It's hidden for a <strong>visibility timeout</strong>, and deleted only when the worker acknowledges it.</p>`
    },
    {
      title: 'Crash means redelivery',
      hide: ['dlq', 'web-w2'],
      slot: 900,
      states: { w2: 'down' },
      badges: { w2: 'crashed mid-job', w3: 'job 42 again' },
      flows: [
        { from: 'q', to: 'w2', label: 'job 42', seq: 0 },
        { from: 'q', to: 'w3', kind: 'warn', label: 'job 42 (timeout)', seq: 1 },
        { from: 'w3', to: 'q', kind: 'res', label: 'ack', seq: 2 }
      ],
      body: `<p>If a worker dies before acknowledging, the timeout expires and the job becomes visible again for another worker. No job is lost.</p>
             <p>The flip side: the first worker might have <em>almost</em> finished, for example sent the email but crashed before the ack. This is <strong>at-least-once</strong> delivery, so handlers must be <strong>idempotent</strong>: running twice has the same effect as running once.</p>`,
      code: `function handle(job) {
  if (db.exists('sent_emails', job.id)) return;   // already done
  email.send(job.to, job.template);
  db.insert('sent_emails', job.id);
}`
    },
    {
      title: 'Poison messages',
      hide: ['web-w2'],
      slot: 750,
      badges: { dlq: 'job 99 · 5 attempts' },
      flows: [
        { from: 'q', to: 'w1', kind: 'err', label: 'job 99 ✗', seq: 0 },
        { from: 'q', to: 'w3', kind: 'err', label: 'job 99 ✗', seq: 1 },
        { from: 'q', to: 'w2', kind: 'err', label: 'job 99 ✗', seq: 2 },
        { from: 'q', to: 'dlq', kind: 'warn', label: 'give up', seq: 3 }
      ],
      body: `<p>Some jobs fail every time: malformed data, a bug for one edge case. Retried forever, they waste workers and can block jobs behind them.</p>
             <p>After a set number of attempts, move the job to a <strong>dead-letter queue</strong>. Alert on it, inspect the jobs, fix the cause, then replay them.</p>`
    },
    {
      title: 'Delivery guarantees',
      hide: ['web-w2'],
      flows: [
        { from: 'web', to: 'q', stream: 3, period: 1500 },
        { from: 'q', to: 'w1', stream: 1, period: 1500 },
        { from: 'q', to: 'w2', stream: 1, period: 1500, offset: 0.33 },
        { from: 'q', to: 'w3', stream: 1, period: 1500, offset: 0.66 }
      ],
      body: `<p>Queues usually don't preserve strict order across many consumers. If order matters per customer, use a queue with ordered groups and send all of one customer's jobs to the same group.</p>`,
      table: {
        head: ['Guarantee', 'How', 'Risk'],
        rows: [
          ['At-most-once', 'Ack before processing', 'Lost jobs on crash'],
          ['At-least-once', 'Ack after processing', 'Duplicates'],
          ['"Exactly-once" effect', 'At-least-once + idempotent handler', 'You must build the dedupe']
        ]
      },
      tip: 'Assume every message can arrive twice and out of order. Design handlers so that it doesn’t matter.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['event-streams'] = {
  minutes: 7,
  diagram: {
    h: 480,
    nodes: [
      { id: 'ord', kind: 'server', label: 'Orders', sub: 'producer', x: 110, y: 240, w: 140 },
      { id: 'log', kind: 'queue', label: 'Event log', sub: 'topic: orders', w: 170, x: 420, y: 240 },
      { id: 'email', kind: 'server', label: 'Email', x: 770, y: 80 },
      { id: 'stats', kind: 'chart', label: 'Analytics', x: 770, y: 240 },
      { id: 'search', kind: 'server', label: 'Search', sub: 'index', x: 770, y: 400 }
    ],
    edges: [['ord', 'log'], ['log', 'email'], ['log', 'stats'], ['log', 'search']]
  },
  steps: [
    {
      title: 'One event, many listeners',
      slot: 900,
      flows: [
        { from: 'ord', to: 'log', label: 'OrderPlaced', seq: 0 },
        { from: 'log', to: 'email', seq: 1 }, { from: 'log', to: 'stats', seq: 1 }, { from: 'log', to: 'search', seq: 1 }
      ],
      body: `<p>A job queue delivers each message to <em>one</em> worker. Often, though, many parts of a system care that something happened: send a receipt, update dashboards, refresh the search index.</p>
             <p>With <strong>publish/subscribe</strong>, the producer publishes an event once and doesn't know who's listening. New consumers can be added without touching the producer.</p>`,
      code: `{
  "type": "OrderPlaced",
  "id": "evt_8f2a",
  "order_id": 81,
  "total": 42.50,
  "at": "2026-03-14T09:26:53Z"
}`
    },
    {
      title: 'A log, not a mailbox',
      focus: ['log'],
      badges: { log: 'offsets 0 … 1,204,331' },
      flows: [{ from: 'ord', to: 'log', stream: 4, period: 1500 }],
      body: `<p>Event streaming platforms store events in an append-only <strong>log</strong>. Each event gets a sequential <strong>offset</strong>, and events stay for a retention period (days, or forever) whether or not anyone has read them.</p>
             <p>Reading doesn't delete anything. Each consumer just remembers how far it has read.</p>`
    },
    {
      title: 'Each consumer has its own position',
      badges: { email: 'offset 1,204,331', stats: '1,198,002 · lag 6k', search: 'offset 1,204,330' },
      states: { stats: 'hot' },
      flows: [
        { from: 'log', to: 'email', stream: 3, period: 1400 },
        { from: 'log', to: 'stats', stream: 1, period: 1400 },
        { from: 'log', to: 'search', stream: 3, period: 1400, offset: 0.5 }
      ],
      body: `<p>Consumers read at their own pace. Analytics falling behind doesn't slow the email service at all. The gap between the newest offset and a consumer's offset is its <strong>lag</strong>, the key metric to alert on.</p>`
    },
    {
      title: 'Partitions: order and parallelism',
      badges: { log: '12 partitions · key = order_id' },
      flows: [
        { from: 'ord', to: 'log', label: 'order 81 → p5', seq: 0 },
        { from: 'log', to: 'search', label: 'p5 in order', seq: 1 }
      ],
      body: `<p>A topic is split into <strong>partitions</strong>, and each event's key decides which partition it goes to. Order is guaranteed only <em>within</em> a partition, so all events for order 81 stay in sequence.</p>
             <p>Within a consumer group, each partition is read by one consumer at a time. Twelve partitions allow up to twelve parallel consumers.</p>`
    },
    {
      title: 'Replay',
      states: { search: 'ok' },
      badges: { search: 'rebuilding from offset 0' },
      flows: [{ from: 'log', to: 'search', stream: 6, period: 900 }],
      body: `<p>Because the log keeps history, a consumer can rewind. Fix a bug in the search indexer and reprocess the last week. Launch a new service and let it build its state from the beginning.</p>
             <p>Taken to the limit, this is <strong>event sourcing</strong>: the log of events is the source of truth, and every table is a view derived from it.</p>`
    },
    {
      title: 'Queue or stream?',
      flows: [
        { from: 'ord', to: 'log', stream: 2, period: 1600 },
        { from: 'log', to: 'email', stream: 1, period: 1600, offset: 0.3 },
        { from: 'log', to: 'stats', stream: 1, period: 1600, offset: 0.6 },
        { from: 'log', to: 'search', stream: 1, period: 1600, offset: 0.9 }
      ],
      body: `<p>A classic trap: the order service writes to its database and then publishes an event. If it crashes between the two, they disagree. The <strong>outbox pattern</strong> fixes this: write the event to an outbox table in the same transaction, and have a relay publish it.</p>`,
      table: {
        head: ['', 'Job queue', 'Event stream'],
        rows: [
          ['Message read by', 'One worker', 'Every subscribing group'],
          ['After reading', 'Deleted', 'Kept until retention ends'],
          ['Replay', 'No', 'Yes, by resetting offset'],
          ['Ordering', 'Loose', 'Per partition'],
          ['Use for', 'Tasks to do', 'Facts that happened']
        ]
      },
      tip: 'Name events in the past tense (OrderPlaced, not PlaceOrder). An event records a fact; a command asks for work.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['realtime'] = {
  minutes: 7,
  diagram: {
    h: 480,
    nodes: [
      { id: 'a', kind: 'phone', label: 'Alice', x: 110, y: 110, w: 130 },
      { id: 'b', kind: 'client', label: 'Bob', x: 110, y: 380, w: 130 },
      { id: 's1', kind: 'server', label: 'Server 1', x: 430, y: 110 },
      { id: 's2', kind: 'server', label: 'Server 2', x: 430, y: 380 },
      { id: 'bus', kind: 'kv', label: 'Pub/sub', sub: 'between servers', w: 170, x: 770, y: 245 }
    ],
    edges: [['a', 's1'], ['b', 's2'], ['s1', 'bus'], ['s2', 'bus']]
  },
  steps: [
    {
      title: 'Polling: keep asking',
      hide: ['b', 's2', 'bus'],
      slot: 550,
      flows: [
        { from: 'a', to: 's1', label: 'anything new?', seq: 0 }, { from: 's1', to: 'a', kind: 'warn', label: 'no', seq: 1 },
        { from: 'a', to: 's1', label: 'anything new?', seq: 2 }, { from: 's1', to: 'a', kind: 'warn', label: 'no', seq: 3 },
        { from: 'a', to: 's1', label: 'anything new?', seq: 4 }, { from: 's1', to: 'a', kind: 'res', label: '1 message', seq: 5 }
      ],
      body: `<p>The client asks every few seconds. It's trivial to build and works through any proxy.</p>
             <p>But most answers are "no", each one a full HTTP request, and a new message waits on average half the interval before anyone sees it. 100,000 clients polling every 2 seconds is 50,000 requests per second of mostly nothing.</p>`
    },
    {
      title: 'Long polling: ask and wait',
      hide: ['b', 's2', 'bus'],
      slot: 700,
      badges: { s1: 'holding request…' },
      flows: [
        { from: 'a', to: 's1', label: 'GET (wait up to 30 s)', seq: 0 },
        { from: 's1', to: 'a', kind: 'res', label: 'message!', seq: 4 },
        { from: 'a', to: 's1', label: 'GET again', seq: 5 }
      ],
      body: `<p>The server holds the request open until there's something to say or a timeout passes, then the client immediately asks again.</p>
             <p>Messages arrive almost instantly with ordinary HTTP. It still sets up a new request per message, and the server holds many open connections.</p>`
    },
    {
      title: 'Server-Sent Events: a one-way stream',
      hide: ['b', 's2', 'bus'],
      flows: [{ from: 's1', to: 'a', kind: 'res', label: 'event: price', stream: 3, period: 1500 }],
      body: `<p>With SSE the client opens one long HTTP response and the server writes events into it as they happen. Browsers reconnect automatically and resume from the last event ID.</p>
             <p>It's server-to-client only. That's a good fit for notifications, live scores and progress bars; the client still sends ordinary requests for anything it wants to say.</p>`,
      code: `HTTP/1.1 200 OK
Content-Type: text/event-stream

id: 41
event: price
data: {"sym":"ACME","px":101.2}

id: 42
event: price
data: {"sym":"ACME","px":101.4}`
    },
    {
      title: 'WebSockets: both directions',
      hide: ['b', 's2', 'bus'],
      flows: [
        { from: 'a', to: 's1', label: 'typing…', stream: 2, period: 1500 },
        { from: 's1', to: 'a', kind: 'res', stream: 2, period: 1500, offset: 0.5 }
      ],
      body: `<p>A WebSocket starts as an HTTP request and is <strong>upgraded</strong> to a persistent two-way connection. Either side can send small messages at any time with very little overhead.</p>
             <p>It's the right tool for chat, multiplayer and collaborative editing. You take on more: heartbeats to detect dead connections, reconnect logic, and load balancers configured for long-lived connections.</p>`
    },
    {
      title: 'Scaling persistent connections',
      slot: 750,
      badges: { s1: '50k connections', s2: '50k connections' },
      flows: [
        { from: 'a', to: 's1', label: 'msg for Bob', seq: 0 },
        { from: 's1', to: 'bus', seq: 1 },
        { from: 'bus', to: 's2', label: 'Bob is here', seq: 2 },
        { from: 's2', to: 'b', kind: 'res', seq: 3 }
      ],
      body: `<p>Alice and Bob are connected to different servers. Servers relay messages through a shared <strong>pub/sub</strong> channel, so whichever server holds Bob's connection delivers it.</p>
             <p>Connection servers are stateful: each holds many open sockets and a little memory for each. On deploy, drain them gradually so clients don't all reconnect at the same moment.</p>`
    },
    {
      title: 'Picking a technique',
      flows: [
        { from: 'a', to: 's1', stream: 1, period: 1600 }, { from: 's2', to: 'b', kind: 'res', stream: 1, period: 1600, offset: 0.5 },
        { from: 's1', to: 'bus', stream: 1, period: 1600, offset: 0.25 }, { from: 'bus', to: 's2', stream: 1, period: 1600, offset: 0.75 }
      ],
      body: `<p>Use the simplest one that meets your latency need.</p>`,
      table: {
        head: ['', 'Polling', 'Long polling', 'SSE', 'WebSocket'],
        rows: [
          ['Direction', 'Client asks', 'Client asks', 'Server → client', 'Both ways'],
          ['Latency', 'Up to interval', 'Low', 'Low', 'Lowest'],
          ['Server cost', 'Many requests', 'Open requests', 'Open streams', 'Open sockets'],
          ['Complexity', 'Lowest', 'Low', 'Low', 'Highest'],
          ['Good for', 'Dashboards, job status', 'Fallback', 'Feeds, notifications', 'Chat, games, collaboration']
        ]
      },
      tip: 'Between servers, use webhooks or queues. Persistent connections are for clients that need to hear about changes within a second.'
    }
  ]
};

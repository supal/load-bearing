/* Course outline: 9 modules, 40 lessons.
   A lesson is playable when js/lessons/*.js registers it in window.LESSONS. */
window.CURRICULUM = [
  {
    id: 'foundations', title: 'Foundations',
    blurb: 'What happens between a click and a response, and how to reason about speed and size.',
    lessons: [
      { slug: 'request-journey', title: 'The Life of a Request', blurb: 'Follow one click from the browser through DNS, a load balancer, an app server, a cache and a database.' },
      { slug: 'latency-throughput', title: 'Latency vs Throughput', blurb: 'Two numbers that describe every system, the law that links them, and why the slow tail matters.' },
      { slug: 'napkin-math', title: 'Back-of-the-Envelope Math', blurb: 'Estimate traffic, storage and bandwidth in minutes with round numbers you can defend.' }
    ]
  },
  {
    id: 'scaling', title: 'Scaling Out',
    blurb: 'Add capacity without adding chaos.',
    lessons: [
      { slug: 'scale-up-out', title: 'Scaling Up vs Scaling Out', blurb: 'Bigger machines or more machines: what each one gets you and where each one runs out.' },
      { slug: 'load-balancing', title: 'Load Balancers', blurb: 'Round robin, least connections, health checks, and the difference between L4 and L7.' },
      { slug: 'stateless', title: 'Stateless Servers', blurb: 'Move sessions out of server memory so any server can handle any request.' },
      { slug: 'caching', title: 'Caching', blurb: 'Cache-aside, hit ratios, invalidation, eviction and the thundering herd.' },
      { slug: 'cdn', title: 'CDNs & the Edge', blurb: 'Put static content in edge locations close to users so the origin server sees far less traffic.' }
    ]
  },
  {
    id: 'data', title: 'Data',
    blurb: 'Where the hard problems live.',
    lessons: [
      { slug: 'relational-vs-nosql', title: 'Relational vs Non-relational', blurb: 'Tables and joins versus documents, wide columns and key-value stores, chosen by access pattern.' },
      { slug: 'indexes', title: 'Indexes', blurb: 'How an index turns a full scan into a few page reads, and what it costs on every write.' },
      { slug: 'storage-engines', title: 'B-Trees & LSM Trees', blurb: 'B-trees update data in place; LSM trees append and compact. Each favors reads or writes differently.' },
      { slug: 'replication', title: 'Replication', blurb: 'Leaders, followers, sync vs async copies, and the replication lag users can notice.' },
      { slug: 'partitioning', title: 'Partitioning', blurb: 'Split data across machines by range or by hash, and deal with hot keys.' },
      { slug: 'consistent-hashing', title: 'Consistent Hashing', blurb: 'Place keys on a ring so adding a node moves only a small slice of data.' },
      { slug: 'id-generation', title: 'Generating IDs', blurb: 'Auto-increment, UUIDs and time-ordered IDs, generated without a central bottleneck.' },
      { slug: 'consistency-models', title: 'CAP & Consistency Models', blurb: 'What CAP really says, and the spectrum from strong to eventual consistency.' },
      { slug: 'consensus', title: 'Leader Election & Consensus', blurb: 'How a cluster agrees on a leader and a log, even when nodes crash.' },
      { slug: 'isolation', title: 'Transactions & Isolation', blurb: 'ACID, isolation levels and the anomalies each one allows.' },
      { slug: 'blob-storage', title: 'Blob Storage & Media', blurb: 'Object storage, pre-signed uploads and asynchronous media processing.' }
    ]
  },
  {
    id: 'messaging', title: 'Messaging',
    blurb: 'How services talk to each other.',
    lessons: [
      { slug: 'api-styles', title: 'REST, gRPC & GraphQL', blurb: 'Resources, procedures and queries: when each API style fits.' },
      { slug: 'queues', title: 'Message Queues', blurb: 'Decouple producers from consumers, absorb spikes, and handle retries and poison messages.' },
      { slug: 'event-streams', title: 'Pub/Sub & Event Streams', blurb: 'Publish an event once, let many consumers react, and replay the log when needed.' },
      { slug: 'realtime', title: 'Polling, SSE & WebSockets', blurb: 'Four ways to push live updates to clients, and the cost of each.' }
    ]
  },
  {
    id: 'reliability', title: 'Reliability',
    blurb: 'Staying up when parts fall over.',
    lessons: [
      { slug: 'failover', title: 'Redundancy & Failover', blurb: 'Remove single points of failure with replicas, health checks and automatic failover.' },
      { slug: 'rate-limits', title: 'Rate Limiting', blurb: 'Token buckets, sliding windows and where to enforce limits.' },
      { slug: 'retries', title: 'Timeouts, Retries & Backoff', blurb: 'Exponential backoff with jitter, idempotency keys and circuit breakers.' },
      { slug: 'observability', title: 'Logs, Metrics & Traces', blurb: 'Three kinds of telemetry and the questions each one answers.' }
    ]
  },
  {
    id: 'architecture', title: 'Architecture',
    blurb: 'Shaping systems that teams can grow.',
    lessons: [
      { slug: 'service-boundaries', title: 'Monoliths & Microservices', blurb: 'When splitting a monolith helps, when it hurts, and how to draw boundaries.' },
      { slug: 'discovery', title: 'Service Discovery', blurb: 'How services find each other as instances come and go.' },
      { slug: 'sagas', title: 'Sagas', blurb: 'Coordinate multi-service workflows with local transactions and compensating steps.' },
      { slug: 'batch-stream', title: 'Batch vs Stream', blurb: 'Process data in scheduled batches or continuously as it arrives.' }
    ]
  },
  {
    id: 'security', title: 'Security',
    blurb: 'Who you are, what you may do, and what stays secret.',
    lessons: [
      { slug: 'authn', title: 'Authentication', blurb: 'Passwords, sessions, tokens and single sign-on: proving who someone is.' },
      { slug: 'authz', title: 'Authorization', blurb: 'Roles, attributes and relationships: deciding what someone may do.' },
      { slug: 'secrets', title: 'Encryption & Secrets', blurb: 'TLS in transit, encryption at rest, key management and secret rotation.' }
    ]
  },
  {
    id: 'delivery', title: 'Delivery',
    blurb: 'Shipping changes without breaking things.',
    lessons: [
      { slug: 'testing', title: 'Testing Distributed Systems', blurb: 'Unit, contract, integration and chaos testing for systems with many moving parts.' },
      { slug: 'deploys', title: 'CI/CD & Safe Deploys', blurb: 'Pipelines, blue-green deploys, canaries and feature flags.' }
    ]
  },
  {
    id: 'case-studies', title: 'Case Studies',
    blurb: 'Putting it all together.',
    lessons: [
      { slug: 'design-process', title: 'From Requirements to Design', blurb: 'From requirements and estimates to a high-level design, then down to component details.' },
      { slug: 'url-shortener', title: 'Design a URL Shortener', blurb: 'Short codes, redirects at scale, caching and click analytics.' },
      { slug: 'news-feed', title: 'Design a News Feed', blurb: 'Fan-out on write vs on read, ranking, and accounts with millions of followers.' },
      { slug: 'chat', title: 'Design a Chat Service', blurb: 'Persistent connections, message ordering, delivery receipts and presence.' }
    ]
  }
];

# Mesa Backlog: Future Engineering Improvements

These improvements represent the long-term technical roadmap for the Mesa protocol runtime. They have been moved to the backlog to prioritize developer onboarding, documentation, and market validation.

---

## 1. Saga / Compensation API
To ensure transaction consistency across distributed systems, Mesa will support a declarative Saga pattern for step-level rollbacks.
```ts
await Mesa.flow()
  .step({
    name: 'anchor-deposit',
    action: 'sep24-deposit',
    compensate: async (context) => {
      // rollback/refund code
    }
  })
```

## 2. Event-Driven Real-time Notifications (LISTEN / NOTIFY)
Currently, the execution scheduler polls the PostgreSQL database at regular intervals. In high-performance production environments, this will be replaced with PostgreSQL `LISTEN` / `NOTIFY` or an event bus to trigger execution ticks instantly upon workflow status updates.

## 3. Dynamic Provider Capability Discovery
Instead of hardcoding supported operations per adapter, adapters will expose a `capabilities()` method returning feature flags:
```ts
interface Provider {
  capabilities(): {
    sep24?: boolean;
    sep6?: boolean;
    sep38?: boolean;
    soroban?: boolean;
  };
}
```
This enables runtime validation before executing steps.

## 4. Structured Event Streaming
Export workflow and step transitions into structured logging backends (e.g., Elasticsearch, OpenTelemetry, Datadog) using a standard Event Sourcing pattern.

## 5. Configurable Retry & Backoff Policies
Allow developers to customize backoff algorithms, max attempts, and jitter parameters at the individual step level:
```ts
{
  name: 'send-funds',
  provider: 'stellar',
  retryPolicy: {
    maxAttempts: 10,
    backoff: 'exponential',
    initialDelayMs: 500,
  }
}
```

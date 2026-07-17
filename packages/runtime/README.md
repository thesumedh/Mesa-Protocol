# @mesaprotocol/runtime

Mesa is a financial workflow orchestration runtime for Stellar that lets developers build reliable financial workflows without writing custom orchestration code.

This package contains the self-hosted runner and scheduler engine, including the Postgres store schemas, core provider wrappers, and the Developer Console.

## Installation

```bash
npm install @mesaprotocol/runtime
```

## Running the Runtime

Start the database container:

```bash
docker compose up -d
```

Start the runner engine:

```bash
npx @mesaprotocol/runtime
```

## Open Developer Console

Once running, navigate to the visual timeline console to manage and simulate executions:
👉 **[http://localhost:3001/dashboard](http://localhost:3001/dashboard)**

## License

MIT

# nestjs-distributed-playground

A Node.js microservices playground built with NestJS, gRPC, NATS, RabbitMQ, and OpenTelemetry tracing.

## Stack

| Component | Role |
|---|---|
| **API Gateway** | HTTP entry point — auto-discovers routes from `google.api.http` proto annotations |
| **user-service** | gRPC microservice (NestJS) |
| **NATS + JetStream** | Async messaging / event streaming |
| **RabbitMQ** | Message broker |
| **Jaeger** | Distributed tracing (OpenTelemetry / OTLP) |
| **Buf** | Proto schema management & code generation |

## Quick Start

```bash
# Start the full stack
docker compose -f deployments/docker-compose.yml up --build

# Or with live-reload (Docker Compose Watch)
docker compose -f deployments/docker-compose.yml watch
```

## Services & Ports

| Service | Port |
|---|---|
| HTTP Gateway | `3000` |
| NATS | `4222` |
| NATS UI | `31311` |
| RabbitMQ Management | `15672` |
| Jaeger UI | `16686` |

## Proto

Contracts live in [`proto/`](proto/). Code is generated with [Buf](https://buf.build/):

```bash
cd proto && buf generate
```

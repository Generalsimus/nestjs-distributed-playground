import * as grpc from '@grpc/grpc-js';
import express, { Router, Request, Response } from 'express';
import fs from 'fs';
import { fromBinary, toBinary, createFileRegistry, FileRegistry, fromJson, toJson, Message, MessageShape, DescMessage } from "@bufbuild/protobuf";
import { FileDescriptorSetSchema } from "@bufbuild/protobuf/wkt";
import { getExtension, hasExtension } from '@bufbuild/protobuf';
import { http } from '../shared/proto/gen/ts/google/api/annotations_pb';
import { createValidator } from '@bufbuild/protovalidate';

const callGenericGrpc = (client: grpc.Client, grpcPath: string, requestInstance: Message<string>, InputDesc: DescMessage, OutputDesc: DescMessage, registry: FileRegistry): Promise<any> => {
    return new Promise((resolve, reject) => {
        const serialize = (req: MessageShape<DescMessage>) => Buffer.from(toBinary(InputDesc, req));
        const deserialize = (bytes: Buffer) => fromBinary(OutputDesc, bytes);

        client.makeUnaryRequest(grpcPath, serialize, deserialize, requestInstance, new grpc.Metadata(), {}, (error, responseInstance) => {
            if (error) return reject(error);
            if (!responseInstance) return resolve(null);
            const jsonResponse = toJson(OutputDesc, responseInstance, { registry });
            resolve(jsonResponse);
        });
    });
};

const grpcStatusToHttp: Record<number, number> = {
    [grpc.status.OK]: 200,
    [grpc.status.CANCELLED]: 499,
    [grpc.status.UNKNOWN]: 500,
    [grpc.status.INVALID_ARGUMENT]: 400,
    [grpc.status.DEADLINE_EXCEEDED]: 504,
    [grpc.status.NOT_FOUND]: 404,
    [grpc.status.ALREADY_EXISTS]: 409,
    [grpc.status.PERMISSION_DENIED]: 403,
    [grpc.status.RESOURCE_EXHAUSTED]: 429,
    [grpc.status.FAILED_PRECONDITION]: 400,
    [grpc.status.ABORTED]: 409,
    [grpc.status.OUT_OF_RANGE]: 400,
    [grpc.status.UNIMPLEMENTED]: 501,
    [grpc.status.INTERNAL]: 500,
    [grpc.status.UNAVAILABLE]: 503,
    [grpc.status.DATA_LOSS]: 500,
    [grpc.status.UNAUTHENTICATED]: 401,
};

const isGrpcServiceError = (error: unknown): error is grpc.ServiceError =>
    error instanceof Error && 'code' in error && typeof error.code === 'number';


const watchChannelState = (client: grpc.Client, address: string) => {
    const channel = client.getChannel();
    const currentState = channel.getConnectivityState(false);
    channel.watchConnectivityState(currentState, Infinity, () => {
        const newState = channel.getConnectivityState(false);
        const label = grpc.connectivityState[newState];
        console.log(`[gRPC] ${address} → ${label}`);
        if (newState === grpc.connectivityState.TRANSIENT_FAILURE || newState === grpc.connectivityState.IDLE) {
            channel.getConnectivityState(true);
        }
        watchChannelState(client, address);
    });
};

export const createGrpcRouter = (binPath: string, addresses: Record<string, string | undefined>, options?: { validateResponse: boolean }) => {
    const router = express.Router();

    const bytes = fs.readFileSync(binPath);
    const fds = fromBinary(FileDescriptorSetSchema, bytes);
    const registry = createFileRegistry(fds);
    const validator = createValidator();
    const validateResponse = !!options?.validateResponse

    for (const file of registry.files) {
        for (const service of file.services) {
            const address = addresses[service.name];
            if (!address) continue;

            // Create ONE generic network client per service
            const grpcClient = new grpc.Client(address, grpc.credentials.createInsecure(), {
                'grpc.keepalive_time_ms': 10_000,
                'grpc.keepalive_timeout_ms': 5_000,
                'grpc.keepalive_permit_without_calls': 1,
            });

            // ✅ FIX 1: Watch the channel state ONCE per client, not per method
            watchChannelState(grpcClient, address);

            for (const method of service.methods) {
                const methodOptions = method.proto.options;

                if (methodOptions && hasExtension(methodOptions, http)) {
                    const httpRule = getExtension(methodOptions, http);

                    if (httpRule.pattern.case === 'custom') {
                        console.warn(`⚠️ Custom HTTP rules not supported for ${service.name}.${method.name}.`);
                        continue;
                    }

                    const httpMethod = httpRule.pattern.case;
                    const httpPath = httpRule.pattern.value;

                    if (!httpMethod || !httpPath) {
                        console.warn(`⚠️ Invalid HTTP rule for ${service.name}.${method.name}`);
                        continue;
                    }

                    const routeMethod = httpMethod;
                    const routePath = httpPath.replace(/{(\w+)}/g, ':$1');
                    const grpcPath = `/${service.typeName}/${method.name}`;
                    router[routeMethod](routePath, async (req: Request, res: Response) => {
                        const payload = { ...req.params, ...req.query, ...req.body };

                        const inputDesc = method.input;
                        const outputDesc = method.output;

                        try {
                            const messageInstance = fromJson(inputDesc, payload, { registry: registry, ignoreUnknownFields: true });
                            const requestViolations = validator.validate(inputDesc, messageInstance);

                            if (requestViolations?.kind !== "valid") {
                                res.status(400).json({
                                    code: 400,
                                    message: "Request Validation Failed",
                                    details: (requestViolations.violations || []).map(v => ({
                                        "@type": "type.googleapis.com/google.rpc.BadRequest.FieldViolation",
                                        "field": v.field.toString(),
                                        "description": v.message,
                                        "reason": v.ruleId.toString()
                                    }))
                                });
                                return;
                            }

                            const response = await callGenericGrpc(grpcClient, grpcPath, messageInstance, inputDesc, outputDesc, registry);
                            if (!validateResponse) {
                                const responseInstance = fromJson(outputDesc, response, { registry, ignoreUnknownFields: true });
                                const responseViolations = validator.validate(outputDesc, responseInstance);
                                if (responseViolations?.kind !== "valid") {
                                    res.status(400).json({
                                        code: 400,
                                        message: "Response Validation Failed",
                                        details: (responseViolations.violations || []).map(v => ({
                                            "@type": "type.googleapis.com/google.rpc.BadResponse.FieldViolation",
                                            "field": v.field.toString(),
                                            "description": v.message,
                                            "reason": v.ruleId.toString()
                                        }))
                                    });
                                    return;
                                }

                            }
                            res.status(200).json(response);

                        } catch (error: unknown) {
                            if (isGrpcServiceError(error)) {
                                const httpStatus = grpcStatusToHttp[error.code] ?? 500;
                                res.status(httpStatus).json({
                                    code: httpStatus,
                                    message: error.message || 'Internal server error',
                                    details: []
                                });
                            } else {
                                res.status(500).json({ code: 500, message: 'Internal server error', details: [] });
                            }
                        }
                    });
                    console.log(`[gRPC] ${httpMethod.toUpperCase().padEnd(6)} ${routePath}  →  ${grpcPath} ✅ `);
                }
            }
        }
    }
    return router;
};
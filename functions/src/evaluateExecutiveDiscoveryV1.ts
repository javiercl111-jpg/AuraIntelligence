import type { Response } from 'express';
import type { Request } from 'firebase-functions/v2/https';
import type { ExecutiveDiscoveryCapability } from '../../src/core/eis/discovery';
import { ExecutiveDiscoveryErrorCode } from '../../src/core/eis/discovery';
import {
  errorEnvelope,
  ExecutiveDiscoveryApiErrorCode,
  ExecutiveDiscoveryHttpStatus,
  successEnvelope,
} from './httpEnvelopes';

const REQUEST_VALIDATION_ERROR_CODES = new Set<string>([
  ExecutiveDiscoveryErrorCode.INVALID_DISCOVERY_REQUEST,
  ExecutiveDiscoveryErrorCode.INVALID_DISCOVERY_EVIDENCE,
  ExecutiveDiscoveryErrorCode.UNSUPPORTED_SCHEMA_VERSION,
]);

function sendJson(response: Response, status: number, body: unknown): void {
  response.set('Cache-Control', 'no-store');
  response.status(status).json(body);
}

function hasJsonContentType(request: Request): boolean {
  const contentType = request.get('content-type');
  if (contentType === undefined) return false;
  return contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

function parseJsonBody(request: Request): unknown {
  if (Buffer.isBuffer(request.rawBody)) {
    return JSON.parse(request.rawBody.toString('utf8')) as unknown;
  }

  if (Buffer.isBuffer(request.body)) {
    return JSON.parse(request.body.toString('utf8')) as unknown;
  }

  if (typeof request.body === 'string') {
    return JSON.parse(request.body) as unknown;
  }

  if (request.body === undefined) {
    throw new SyntaxError('Missing JSON body');
  }

  return request.body as unknown;
}

export type EvaluateExecutiveDiscoveryV1Handler = (
  request: Request,
  response: Response,
) => Promise<void>;

export function createEvaluateExecutiveDiscoveryV1Handler(
  capability: Pick<ExecutiveDiscoveryCapability, 'execute'>,
): EvaluateExecutiveDiscoveryV1Handler {
  return async (request, response): Promise<void> => {
    if (request.method.toUpperCase() !== 'POST') {
      response.set('Allow', 'POST');
      sendJson(
        response,
        ExecutiveDiscoveryHttpStatus.BAD_REQUEST,
        errorEnvelope(
          ExecutiveDiscoveryApiErrorCode.INVALID_METHOD,
          'Only POST requests are accepted.',
        ),
      );
      return;
    }

    if (!hasJsonContentType(request)) {
      sendJson(
        response,
        ExecutiveDiscoveryHttpStatus.BAD_REQUEST,
        errorEnvelope(
          ExecutiveDiscoveryApiErrorCode.INVALID_CONTENT_TYPE,
          'Content-Type must be application/json.',
        ),
      );
      return;
    }

    let input: unknown;
    try {
      input = parseJsonBody(request);
    } catch {
      sendJson(
        response,
        ExecutiveDiscoveryHttpStatus.BAD_REQUEST,
        errorEnvelope(
          ExecutiveDiscoveryApiErrorCode.INVALID_JSON,
          'The request body must contain valid JSON.',
        ),
      );
      return;
    }

    try {
      const result = await capability.execute(input);
      if (result.success) {
        sendJson(
          response,
          ExecutiveDiscoveryHttpStatus.OK,
          successEnvelope(result.result, result.correlationId, result.warnings),
        );
        return;
      }

      if (REQUEST_VALIDATION_ERROR_CODES.has(result.error.code)) {
        sendJson(
          response,
          ExecutiveDiscoveryHttpStatus.UNPROCESSABLE_ENTITY,
          errorEnvelope(
            result.error.code,
            result.error.message,
            result.correlationId,
            result.error.safeDetails,
          ),
        );
        return;
      }

      sendJson(
        response,
        ExecutiveDiscoveryHttpStatus.INTERNAL_SERVER_ERROR,
        errorEnvelope(
          ExecutiveDiscoveryApiErrorCode.EXECUTIVE_DISCOVERY_FAILED,
          'Executive Discovery could not complete the request.',
          result.correlationId,
        ),
      );
    } catch {
      sendJson(
        response,
        ExecutiveDiscoveryHttpStatus.INTERNAL_SERVER_ERROR,
        errorEnvelope(
          ExecutiveDiscoveryApiErrorCode.EXECUTIVE_DISCOVERY_FAILED,
          'Executive Discovery could not complete the request.',
        ),
      );
    }
  };
}

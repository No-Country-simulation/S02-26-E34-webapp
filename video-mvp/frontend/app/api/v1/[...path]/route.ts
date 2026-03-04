/**
 * Proxy route for all /api/v1/* requests.
 *
 * Next.js rewrites have an internal body-size limit (~1 MB) inherited from
 * http-proxy, which silently drops large multipart uploads (video files).
 * This catch-all route handler replaces the rewrite and uses Node.js's native
 * http module to forward requests without any body-size restriction.
 */

import http from 'http';

const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '8000', 10);

// Force Node.js runtime (not Edge) so we can use the http module
export const runtime = 'nodejs';

// Allow up to 300 seconds for video processing endpoints
export const maxDuration = 300;

function forwardViaHttp(
  method: string,
  path: string,
  reqHeaders: Record<string, string>,
  body: Buffer | null,
): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path,
      method,
      headers: reqHeaders,
      timeout: 120_000, // 2 minutes to handle video processing
    };

    const req = http.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const respHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (value && typeof value === 'string') respHeaders[key] = value;
          else if (Array.isArray(value)) respHeaders[key] = value.join(', ');
        }
        resolve({
          status: res.statusCode ?? 500,
          headers: respHeaders,
          body: Buffer.concat(chunks),
        });
      });
      res.on('error', reject);
    });

    req.on('timeout', () => {
      req.destroy(new Error('Backend request timed out'));
    });
    req.on('error', reject);

    if (body && body.length > 0) {
      req.write(body);
    }
    req.end();
  });
}

async function proxyRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = `${url.pathname}${url.search}`;

  // Collect headers to forward
  const fwdHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const skip = ['host', 'connection', 'transfer-encoding'];
    if (!skip.includes(key.toLowerCase())) {
      fwdHeaders[key] = value;
    }
  });

  // Read the full request body for methods that have one
  let body: Buffer | null = null;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    try {
      const ab = await request.arrayBuffer();
      body = Buffer.from(ab);
    } catch {
      // empty or already consumed
    }
  }

  // Forward content-length if we have a body
  if (body) {
    fwdHeaders['content-length'] = String(body.length);
  }

  try {
    const resp = await forwardViaHttp(request.method, path, fwdHeaders, body);

    // Remove hop-by-hop headers from response
    const { 'transfer-encoding': _te, connection: _conn, ...safeHeaders } = resp.headers;

    return new Response(new Uint8Array(resp.body), {
      status: resp.status,
      headers: safeHeaders,
    });
  } catch (error) {
    console.error('[proxy] Backend request failed:', error);
    return new Response(
      JSON.stringify({ error: 'Backend unavailable', detail: String(error) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export async function GET(request: Request) {
  return proxyRequest(request);
}

export async function POST(request: Request) {
  return proxyRequest(request);
}

export async function PUT(request: Request) {
  return proxyRequest(request);
}

export async function PATCH(request: Request) {
  return proxyRequest(request);
}

export async function DELETE(request: Request) {
  return proxyRequest(request);
}

export async function OPTIONS(request: Request) {
  return proxyRequest(request);
}

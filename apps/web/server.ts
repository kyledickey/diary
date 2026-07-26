import { join } from "node:path";

interface StartServer {
    fetch(request: Request): StartResponse | Promise<StartResponse>;
}

interface StartResponse extends Response {
    readonly _response?: Response;
}

const serverModule = (await import("./dist/server/server.js")) as {
    default: StartServer;
};
const clientDirectory = join(import.meta.dir, "dist", "client");
const port = Number.parseInt(Bun.env.PORT ?? "3000", 10);

function getAssetPath(pathname: string): string | null {
    let decodedPath: string;
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch {
        return null;
    }

    const segments = decodedPath.split("/").filter(Boolean);
    if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
        return null;
    }

    return join(clientDirectory, ...segments);
}

const server = Bun.serve({
    port,
    async fetch(request) {
        if (request.method === "GET" || request.method === "HEAD") {
            const pathname = new URL(request.url).pathname;
            const assetPath = getAssetPath(pathname);

            if (assetPath) {
                const asset = Bun.file(assetPath);
                if (await asset.exists()) {
                    const immutable = pathname.startsWith("/assets/");
                    const headers = {
                        "Cache-Control": immutable
                            ? "public, max-age=31536000, immutable"
                            : "public, max-age=3600",
                        "Content-Type": asset.type
                    };
                    return request.method === "HEAD"
                        ? new Response(null, { headers })
                        : new Response(asset, { headers });
                }
            }
        }

        const response = await serverModule.default.fetch(request);
        return response._response ?? response;
    }
});

console.info(`Diary web listening on ${server.url}`);

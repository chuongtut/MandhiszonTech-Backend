const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = __dirname;
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 5501);
const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp"
};

const server = http.createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" });
        response.end("Method Not Allowed");
        return;
    }

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    } catch {
        response.writeHead(400);
        response.end("Bad Request");
        return;
    }

    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^[/\\]+/, "");
    const filePath = path.resolve(root, relativePath);
    if (!filePath.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
    }

    fs.stat(filePath, (statError, stats) => {
        if (statError || !stats.isFile()) {
            response.writeHead(404);
            response.end("Not Found");
            return;
        }

        response.writeHead(200, {
            "Content-Length": stats.size,
            "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
        });
        if (request.method === "HEAD") {
            response.end();
            return;
        }

        const stream = fs.createReadStream(filePath);
        stream.on("error", (error) => {
            console.error("Could not serve frontend file:", error.message);
            if (!response.headersSent) response.writeHead(500);
            response.end("Internal Server Error");
        });
        stream.pipe(response);
    });
});

server.listen(port, host, () => {
    console.log(`MandhiszonTech frontend running at http://${host}:${port}`);
});

server.on("error", (error) => {
    console.error("Could not start the frontend server:", error.message);
    process.exitCode = 1;
});

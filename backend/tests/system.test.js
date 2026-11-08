const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

test.after(async () => {
    await db.end();
});

const apiBase = (process.env.API_BASE || `http://127.0.0.1:${process.env.PORT || 5000}/api`).replace(/\/+$/, "");
const adminToken = jwt.sign(
    { id: 4_294_967_295, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
);
const adminHeaders = { Authorization: `Bearer ${adminToken}` };

async function request(endpoint, options = {}) {
    const response = await fetch(`${apiBase}${endpoint}`, options);
    let body;
    try {
        body = await response.json();
    } catch {
        body = null;
    }
    return { status: response.status, body };
}

test("configured MySQL database and application API work end to end", async () => {
    const ids = { contact: null, customer: null, service: null, project: null, blog: null };
    let uploadedImagePath;

    try {
        const [databaseRows] = await db.query("SELECT DATABASE() AS name");
        assert.equal(databaseRows[0].name, process.env.DB_NAME);
        const [tableRows] = await db.query(
            `SELECT TABLE_NAME AS name
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`
        );
        const tables = new Set(tableRows.map((row) => row.name));
        for (const table of ["admins", "contacts", "customers", "services", "projects", "blogs"]) {
            assert(tables.has(table), `missing database table: ${table}`);
        }

        const health = await request("/health");
        assert.equal(health.status, 200);
        assert.equal(health.body.database, process.env.DB_NAME);

        for (const [endpoint, property] of [
            ["/services", "services"],
            ["/projects", "projects"],
            ["/blogs", "blogs"]
        ]) {
            const result = await request(endpoint);
            assert.equal(result.status, 200, `${endpoint} should be publicly readable`);
            assert(Array.isArray(result.body[property]), `${endpoint} should return an array`);
        }

        for (const endpoint of ["/blogs/admin", "/contacts"]) {
            assert.equal((await request(endpoint)).status, 401, `${endpoint} must require admin auth`);
        }
        assert.equal(
            (await request("/services", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Unauthorized test" })
            })).status,
            401
        );

        const prefix = `system-test-${randomUUID()}`;
        const invalidContact = await request("/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Test", email: "not-an-email", message: "Invalid" })
        });
        assert.equal(invalidContact.status, 400);

        let result = await request("/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "System Test",
                email: `${prefix}@example.com`,
                subject: "Integration check",
                message: "Temporary contact message."
            })
        });
        assert.equal(result.status, 201);
        ids.contact = result.body.contactId;
        result = await request("/contacts", { headers: adminHeaders });
        assert.equal(result.status, 200);
        assert(result.body.contacts.some((contact) => contact.id === ids.contact));

        result = await request("/customers/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "System Test", email: `${prefix}@example.com`, password: "system-test-password-2026" })
        });
        assert.equal(result.status, 201);
        assert(result.body.token);
        ids.customer = result.body.customer.id;
        const customerHeaders = { Authorization: `Bearer ${result.body.token}` };

        result = await request("/customers/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: `${prefix.toUpperCase()}@EXAMPLE.COM`, password: "system-test-password-2026" })
        });
        assert.equal(result.status, 200);
        result = await request("/customers/me", { headers: customerHeaders });
        assert.equal(result.status, 200);
        assert.equal(result.body.customer.id, ids.customer);
        assert.equal((await request("/contacts", { headers: customerHeaders })).status, 403);

        result = await request("/services", {
            method: "POST",
            headers: { ...adminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ name: prefix, category: "Testing", description: "Temporary service." })
        });
        assert.equal(result.status, 201);
        ids.service = result.body.service.id;
        result = await request(`/services/${ids.service}`, {
            method: "PUT",
            headers: { ...adminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ name: `${prefix}-updated`, category: "Testing", description: "Updated service." })
        });
        assert.equal(result.status, 200);
        assert.equal(result.body.service.name, `${prefix}-updated`);

        const invalidUpload = new FormData();
        invalidUpload.append("image", new Blob(["not an image"], { type: "image/png" }), "invalid.png");
        assert.equal(
            (await request("/projects/upload-image", { method: "POST", headers: adminHeaders, body: invalidUpload })).status,
            400
        );

        const png = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0ioAAAAASUVORK5CYII=",
            "base64"
        );
        const upload = new FormData();
        upload.append("image", new Blob([png], { type: "image/png" }), "system-test.png");
        result = await request("/projects/upload-image", { method: "POST", headers: adminHeaders, body: upload });
        assert.equal(result.status, 201);
        assert.match(result.body.image_url, /^https?:\/\//);
        uploadedImagePath = path.join(
            __dirname,
            "..",
            "uploads",
            "projects",
            path.basename(new URL(result.body.image_url).pathname)
        );

        result = await request("/projects", {
            method: "POST",
            headers: { ...adminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
                title: prefix,
                description: "Temporary project.",
                technologies: "Node.js",
                image_url: result.body.image_url,
                github_url: "https://github.com/example/test",
                live_url: "https://example.com",
                category: "Testing"
            })
        });
        assert.equal(result.status, 201);
        ids.project = result.body.projectId;
        result = await request(`/projects/${ids.project}`);
        assert.equal(result.status, 200);
        assert(result.body.project.image_url);

        result = await request("/blogs", {
            method: "POST",
            headers: { ...adminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
                title: prefix,
                slug: prefix,
                content: "Temporary article content.",
                excerpt: "Temporary summary.",
                author: "System Test",
                category: "Testing",
                published: true
            })
        });
        assert.equal(result.status, 201);
        ids.blog = result.body.blogId;
        result = await request("/blogs/admin", { headers: adminHeaders });
        assert.equal(result.status, 200);
        assert(result.body.blogs.some((blog) => blog.id === ids.blog));
        result = await request(`/blogs/slug/${prefix}`);
        assert.equal(result.status, 200);

        result = await request(`/blogs/${ids.blog}`, {
            method: "PUT",
            headers: { ...adminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
                title: `${prefix}-draft`,
                slug: `${prefix}-draft`,
                content: "Updated draft content.",
                author: "System Test",
                published: false
            })
        });
        assert.equal(result.status, 200);
        result = await request("/blogs");
        assert(!result.body.blogs.some((blog) => blog.id === ids.blog), "draft articles must stay private");

        assert.equal((await request(`/blogs/${ids.blog}`, { method: "DELETE", headers: adminHeaders })).status, 200);
        ids.blog = null;
        assert.equal((await request(`/projects/${ids.project}`, { method: "DELETE", headers: adminHeaders })).status, 200);
        ids.project = null;
        assert.equal((await request(`/services/${ids.service}`, { method: "DELETE", headers: adminHeaders })).status, 200);
        ids.service = null;

        console.log("MySQL schema, public reads, admin authorization, customer auth, contacts, services, projects, uploads, and blog publishing passed.");
    } finally {
        if (ids.blog) await db.execute("DELETE FROM blogs WHERE id = ?", [ids.blog]);
        if (ids.project) await db.execute("DELETE FROM projects WHERE id = ?", [ids.project]);
        if (ids.service) await db.execute("DELETE FROM services WHERE id = ?", [ids.service]);
        if (ids.customer) await db.execute("DELETE FROM customers WHERE id = ?", [ids.customer]);
        if (ids.contact) await db.execute("DELETE FROM contacts WHERE id = ?", [ids.contact]);
        if (uploadedImagePath) {
            try {
                await fs.unlink(uploadedImagePath);
            } catch (error) {
                if (error.code !== "ENOENT") throw error;
            }
        }
    }
});

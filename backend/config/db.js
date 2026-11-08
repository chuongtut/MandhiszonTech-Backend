const mysql = require("mysql2/promise");
const path = require("node:path");

require("dotenv").config({
    path: path.resolve(__dirname, "..", ".env")
});

const requiredVariables = ["DB_HOST", "DB_USER", "DB_NAME"];
const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());

if (missingVariables.length > 0) {
    throw new Error(
        `Missing required database configuration: ${missingVariables.join(", ")}`
    );
}

const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535.");
}

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
});

module.exports = db;
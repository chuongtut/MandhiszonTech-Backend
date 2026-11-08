const db = require("./config/db");

async function createServicesTable() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS services (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(120) NOT NULL,
            category VARCHAR(100) NULL,
            description TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("Services table is ready.");
}

createServicesTable()
    .catch((error) => {
        console.error("Could not create services table:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.end();
    });

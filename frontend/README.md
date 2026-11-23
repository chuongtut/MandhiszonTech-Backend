# MandhiszonTech admin dashboard

This frontend contains the public MandhiszonTech website, customer sign-in/registration, and an administrator dashboard. By default, it uses the local API at `http://localhost:5000/api`. The API address can be changed with `API_BASE_URL` when starting the frontend server.

## Run locally

1. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `JWT_SECRET` in `backend/.env`. The backend loads this file relative to its own directory, whether started from the workspace root or the backend folder. Ensure the MySQL database exists, then initialize the required tables from the `backend` directory:
   ```powershell
   npm run db:setup
   npm run dev
   ```
   In another terminal, run the end-to-end checks from `backend` while the API is running:
   ```powershell
   npm test
   ```
2. In a separate VS Code terminal, start the frontend from the `frontend` folder (instead of opening `index.html` directly):
   ```powershell
   npm run dev
   ```
3. Open `http://localhost:5501` for the public website. Visitors can create an account or sign in at `account.html`. Administrators sign in at `login.html`; the dashboard is at `dashboard.html`.

## Deploy the backend to Render

1. In Render, create a **Blueprint** from this repository and use the root `render.yaml` file. The blueprint creates the backend web service in Frankfurt.
2. Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a strong `JWT_SECRET` in the service's environment settings. `DB_PORT` defaults to `3306`, and `FRONTEND_URL` is prefilled with the supplied Dev Tunnel URL. Use your existing MySQL provider's connection values; do not commit them to the repository. Make sure that provider allows connections from Render.
3. Wait for the `/api/health` check to pass, then copy the service's public URL.
4. Start the frontend server with that API URL (including `/api`). In PowerShell, from `frontend`:
   ```powershell
   $env:API_BASE_URL = "https://your-service.onrender.com/api"
   npm run dev
   ```
   Restart the frontend server whenever `API_BASE_URL` changes. The supplied Dev Tunnel frontend URL is also set as `FRONTEND_URL` in the Render blueprint; update it in Render if the tunnel URL changes.

Render's free web service has an ephemeral filesystem. Uploaded project images stored under `backend/uploads` can be lost when the service restarts or redeploys; use persistent/object storage before relying on uploaded images in production.

To provision the administrator, set `ADMIN_PASSWORD` in the environment and run `npm run db:create-admin` from the backend directory. Admin and customer sessions use separate browser-session tokens; customer access cannot authenticate admin endpoints. Customer passwords are hashed before storage and customer tokens expire after two hours.

The dashboard supports service, project, and blog article create, edit, delete, and search. Blog articles can be saved as drafts or published to the public website. Project images can be supplied as URLs or uploaded as PNG, JPEG, or WebP files up to 5 MB; uploaded files are stored under `backend/uploads/projects` and served by the API. Set `PUBLIC_API_URL` in the backend environment to the public API origin when the server is behind a reverse proxy. Back up the uploads directory because image files are stored on the backend host.

Public service, project, and published blog sections load from the backend API. The contact form submits to `/api/contacts`. The footer contains the supplied email, TikTok, Instagram, WhatsApp, and Facebook links.

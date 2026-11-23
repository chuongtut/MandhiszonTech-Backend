(() => {
    const API_BASE = window.MANDHISZONTECH_API_BASE || "http://localhost:5000/api";
    const TOKEN_KEY = "mandhiszontech_admin_token";
    const dashboard = document.querySelector(".dashboard-view");
    const navItems = Array.from(document.querySelectorAll(".nav-item"));
    const pageSections = Array.from(document.querySelectorAll("[data-page]"));
    const content = { services: [], projects: [], blogs: [] };
    const contentErrors = {};
    const sectionNames = {
        overview: "Overview",
        services: "Services",
        projects: "Projects",
        blogs: "Blog articles"
    };
    const tableConfig = {
        services: {
            label: "service",
            headers: ["Service", "Category", "Description", "Last updated", "Actions"],
            values: (item) => [
                firstValue(item.name, item.title, item.service_name),
                firstValue(item.category),
                firstValue(item.description, item.summary),
                formatDate(item.updated_at || item.created_at)
            ]
        },
        projects: {
            label: "project",
            headers: ["Project", "Category", "Technologies", "Date added", "Actions"],
            values: (item) => [
                firstValue(item.title, item.name),
                firstValue(item.category),
                firstValue(item.technologies),
                formatDate(item.created_at)
            ]
        },
        blogs: {
            label: "article",
            headers: ["Article", "Category", "Author", "Status", "Last updated", "Actions"],
            values: (item) => [
                firstValue(item.title),
                firstValue(item.category),
                firstValue(item.author),
                item.published ? "Published" : "Draft",
                formatDate(item.updated_at || item.created_at)
            ]
        }
    };

    document.getElementById("today-date").textContent = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(new Date());

    class ApiError extends Error {
        constructor(message, status) {
            super(message);
            this.name = "ApiError";
            this.status = status;
        }
    }

    async function apiRequest(path, options = {}) {
        const token = sessionStorage.getItem(TOKEN_KEY);
        let response;
        try {
            response = await fetch(`${API_BASE}${path}`, {
                ...options,
                headers: {
                    Accept: "application/json",
                    ...(options.body && !(options.body instanceof FormData)
                        ? { "Content-Type": "application/json" }
                        : {}),
                    ...options.headers,
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
        } catch {
            throw new ApiError("Could not connect to the server.", 0);
        }

        if (response.status === 204) return {};
        let payload;
        try {
            payload = await response.json();
        } catch {
            throw new ApiError("The server returned an unreadable response.", response.status);
        }
        if (!response.ok || payload.success === false) {
            throw new ApiError(payload.message || `The request failed (${response.status}).`, response.status);
        }
        return payload;
    }

    function firstValue(...values) {
        const value = values.find((entry) => typeof entry === "string" && entry.trim());
        return value ? value.trim() : "—";
    }

    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        }).format(date);
    }

    function logout() {
        sessionStorage.removeItem(TOKEN_KEY);
        window.location.replace("login.html");
    }

    document.getElementById("logout-button").addEventListener("click", logout);

    const serviceDialog = document.getElementById("service-dialog");
    const serviceForm = document.getElementById("service-form");
    const serviceDialogMessage = document.getElementById("service-dialog-message");
    const saveServiceButton = document.getElementById("save-service-button");
    const projectDialog = document.getElementById("project-dialog");
    const projectForm = document.getElementById("project-form");
    const projectDialogMessage = document.getElementById("project-dialog-message");
    const saveProjectButton = document.getElementById("save-project-button");
    const blogDialog = document.getElementById("blog-dialog");
    const blogForm = document.getElementById("blog-form");
    const blogDialogMessage = document.getElementById("blog-dialog-message");
    const saveBlogButton = document.getElementById("save-blog-button");

    function prepareDialog(form, message) {
        form.reset();
        message.textContent = "";
        message.classList.add("is-hidden");
    }

    function openServiceDialog(service) {
        prepareDialog(serviceForm, serviceDialogMessage);
        const editing = Boolean(service);
        document.getElementById("service-dialog-title").textContent = editing ? "Edit service" : "Add a service";
        saveServiceButton.textContent = editing ? "Save changes" : "Save service";
        document.getElementById("service-id").value = editing ? String(service.id) : "";
        document.getElementById("service-name").value = editing ? service.name || "" : "";
        document.getElementById("service-category").value = editing ? service.category || "" : "";
        document.getElementById("service-description").value = editing ? service.description || "" : "";
        serviceDialog.showModal();
        document.getElementById("service-name").focus();
    }

    function openProjectDialog(project) {
        prepareDialog(projectForm, projectDialogMessage);
        const editing = Boolean(project);
        document.getElementById("project-dialog-title").textContent = editing ? "Edit project" : "Add a project";
        saveProjectButton.textContent = editing ? "Save changes" : "Save project";
        document.getElementById("project-id").value = editing ? String(project.id) : "";
        document.getElementById("project-title").value = editing ? project.title || "" : "";
        document.getElementById("project-description").value = editing ? project.description || "" : "";
        document.getElementById("project-technologies").value = editing ? project.technologies || "" : "";
        document.getElementById("project-image").value = editing ? project.image_url || "" : "";
        document.getElementById("project-github").value = editing ? project.github_url || "" : "";
        document.getElementById("project-live").value = editing ? project.live_url || "" : "";
        document.getElementById("project-category").value = editing ? project.category || "" : "";
        projectDialog.showModal();
        document.getElementById("project-title").focus();
    }

    function slugify(value) {
        return value.trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function openBlogDialog(blog) {
        prepareDialog(blogForm, blogDialogMessage);
        const editing = Boolean(blog);
        document.getElementById("blog-dialog-title").textContent = editing ? "Edit article" : "Write an article";
        saveBlogButton.textContent = editing ? "Save changes" : "Save article";
        document.getElementById("blog-id").value = editing ? String(blog.id) : "";
        document.getElementById("blog-title").value = editing ? blog.title || "" : "";
        document.getElementById("blog-slug").value = editing ? blog.slug || "" : "";
        document.getElementById("blog-slug").dataset.touched = String(editing);
        document.getElementById("blog-content").value = editing ? blog.content || "" : "";
        document.getElementById("blog-excerpt").value = editing ? blog.excerpt || "" : "";
        document.getElementById("blog-author").value = editing ? blog.author || "" : "";
        document.getElementById("blog-image").value = editing ? blog.image_url || "" : "";
        document.getElementById("blog-category").value = editing ? blog.category || "" : "";
        document.getElementById("blog-published").checked = editing && Boolean(blog.published);
        blogDialog.showModal();
        document.getElementById("blog-title").focus();
    }

    document.getElementById("blog-title").addEventListener("input", (event) => {
        const slugInput = document.getElementById("blog-slug");
        if (slugInput.dataset.touched !== "true") {
            slugInput.value = slugify(event.target.value);
        }
    });
    document.getElementById("blog-slug").addEventListener("input", (event) => {
        event.target.dataset.touched = "true";
    });

    document.getElementById("add-service-button").addEventListener("click", () => openServiceDialog());
    document.getElementById("close-service-dialog").addEventListener("click", () => serviceDialog.close());
    document.getElementById("cancel-service-dialog").addEventListener("click", () => serviceDialog.close());
    document.getElementById("add-project-button").addEventListener("click", () => openProjectDialog());
    document.getElementById("close-project-dialog").addEventListener("click", () => projectDialog.close());
    document.getElementById("cancel-project-dialog").addEventListener("click", () => projectDialog.close());
    document.getElementById("add-blog-button").addEventListener("click", () => openBlogDialog());
    document.getElementById("close-blog-dialog").addEventListener("click", () => blogDialog.close());
    document.getElementById("cancel-blog-dialog").addEventListener("click", () => blogDialog.close());

    [serviceDialog, projectDialog, blogDialog].forEach((dialog) => {
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) dialog.close();
        });
    });

    serviceForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(serviceForm);
        const id = data.get("id");
        await saveContentForm({
            form: serviceForm,
            message: serviceDialogMessage,
            button: saveServiceButton,
            dialog: serviceDialog,
            path: id ? `/services/${encodeURIComponent(id)}` : "/services",
            method: id ? "PUT" : "POST",
            section: "services",
            body: {
                name: data.get("name"),
                category: data.get("category"),
                description: data.get("description")
            },
            successMessage: id ? "Service updated successfully." : "Service created successfully."
        });
    });

    projectForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(projectForm);
        const id = data.get("id");
        const imageFile = data.get("image_file");
        let imageUrl = data.get("image_url");

        if (imageFile instanceof File && imageFile.size > 0) {
            saveProjectButton.disabled = true;
            projectDialogMessage.textContent = "Uploading project image...";
            projectDialogMessage.classList.remove("is-hidden");
            try {
                const uploadData = new FormData();
                uploadData.append("image", imageFile);
                const upload = await apiRequest("/projects/upload-image", {
                    method: "POST",
                    body: uploadData
                });
                if (typeof upload.image_url !== "string" || !upload.image_url) {
                    throw new Error("The server did not return the uploaded image URL.");
                }
                imageUrl = upload.image_url;
                document.getElementById("project-image").value = imageUrl;
            } catch (error) {
                if (error.status === 401 || error.status === 403) {
                    logout();
                    return;
                }
                projectDialogMessage.textContent = error.message;
                return;
            } finally {
                saveProjectButton.disabled = false;
            }
        }

        await saveContentForm({
            form: projectForm,
            message: projectDialogMessage,
            button: saveProjectButton,
            dialog: projectDialog,
            path: id ? `/projects/${encodeURIComponent(id)}` : "/projects",
            method: id ? "PUT" : "POST",
            section: "projects",
            body: {
                title: data.get("title"),
                description: data.get("description"),
                technologies: data.get("technologies"),
                image_url: imageUrl,
                github_url: data.get("github_url"),
                live_url: data.get("live_url"),
                category: data.get("category")
            },
            successMessage: id ? "Project updated successfully." : "Project created successfully."
        });
    });

    blogForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(blogForm);
        const id = data.get("id");
        await saveContentForm({
            message: blogDialogMessage,
            button: saveBlogButton,
            dialog: blogDialog,
            path: id ? `/blogs/${encodeURIComponent(id)}` : "/blogs",
            method: id ? "PUT" : "POST",
            section: "blogs",
            body: {
                title: data.get("title"),
                slug: data.get("slug"),
                content: data.get("content"),
                excerpt: data.get("excerpt"),
                author: data.get("author"),
                image_url: data.get("image_url"),
                category: data.get("category"),
                published: data.get("published") === "on"
            },
            successMessage: id ? "Article updated successfully." : "Article created successfully."
        });
    });

    async function saveContentForm({ message, button, dialog, path, method, section, body, successMessage }) {
        message.textContent = "";
        message.classList.add("is-hidden");
        button.disabled = true;
        try {
            await apiRequest(path, { method, body: JSON.stringify(body) });
            dialog.close();
            await loadContent();
            selectSection(section);
            document.getElementById("dashboard-status").textContent = successMessage;
        } catch (error) {
            if (error.status === 401 || error.status === 403) {
                logout();
                return;
            }
            message.textContent = error.message;
            message.classList.remove("is-hidden");
        } finally {
            button.disabled = false;
        }
    }

    function selectSection(section) {
        if (!sectionNames[section]) return;
        navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.section === section));
        pageSections.forEach((page) => page.classList.toggle("is-hidden", page.dataset.page !== section));
        document.getElementById("topbar-section").textContent = sectionNames[section];
        dashboard.classList.remove("sidebar-open");
        if (section !== "overview") renderTable(section);
    }

    document.querySelectorAll("[data-section]").forEach((button) => {
        button.addEventListener("click", () => selectSection(button.dataset.section));
    });
    document.getElementById("menu-button").addEventListener("click", () => {
        dashboard.classList.toggle("sidebar-open");
    });

    async function loadContent() {
        document.getElementById("dashboard-status").textContent = "Loading website content...";
        const endpoints = [
            ["services", "/services", "services"],
            ["projects", "/projects", "projects"],
            ["blogs", "/blogs/admin", "blogs"]
        ];
        const results = await Promise.allSettled(endpoints.map(([, path]) => apiRequest(path)));
        results.forEach((result, index) => {
            const [section, , property] = endpoints[index];
            if (result.status === "fulfilled" && Array.isArray(result.value[property])) {
                content[section] = result.value[property];
                delete contentErrors[section];
            } else {
                content[section] = [];
                contentErrors[section] = result.status === "rejected"
                    ? result.reason.message
                    : `The server returned an invalid ${section} response.`;
            }
        });
        updateOverview();
        ["services", "projects", "blogs"].forEach(renderTable);
        const failedSections = Object.keys(contentErrors);
        document.getElementById("dashboard-status").textContent = failedSections.length
            ? `Could not load ${failedSections.map((section) => sectionNames[section].toLowerCase()).join(", ")}. See the section messages below.`
            : "";
    }

    function updateOverview() {
        ["services", "projects", "blogs"].forEach((section) => {
            const count = content[section].length;
            const overviewCount = section === "blogs"
                ? content.blogs.filter((blog) => Boolean(blog.published)).length
                : count;
            document.getElementById(`${section}-total`).textContent = String(overviewCount);
            document.getElementById(`${section}-nav-count`).textContent = String(count);
        });

        const recentItems = [
            ...content.services.map((item) => ({ ...item, section: "services" })),
            ...content.projects.map((item) => ({ ...item, section: "projects" })),
            ...content.blogs.map((item) => ({ ...item, section: "blogs" }))
        ].sort((first, second) => {
            const firstDate = new Date(first.created_at || first.updated_at || 0).getTime() || 0;
            const secondDate = new Date(second.created_at || second.updated_at || 0).getTime() || 0;
            return secondDate - firstDate;
        }).slice(0, 5);

        const recentList = document.getElementById("recent-list");
        recentList.replaceChildren();
        if (!recentItems.length) {
            const empty = document.createElement("p");
            empty.className = "empty-copy";
            empty.textContent = Object.keys(contentErrors).length
                ? "Recent content is unavailable until the API responds."
                : "No website content is available yet.";
            recentList.append(empty);
            return;
        }
        recentItems.forEach((item) => {
            const row = document.createElement("div");
            row.className = "recent-item";
            const type = document.createElement("span");
            type.className = `recent-type ${item.section}`;
            type.textContent = item.section === "services" ? "SV" : item.section === "projects" ? "PR" : "BL";
            const copy = document.createElement("span");
            copy.className = "recent-copy";
            const title = document.createElement("strong");
            title.textContent = firstValue(item.title, item.name, item.service_name, item.project_name);
            const category = document.createElement("small");
            category.textContent = `${sectionNames[item.section]}${item.category ? ` · ${item.category}` : ""}`;
            const date = document.createElement("span");
            date.className = "recent-date";
            date.textContent = formatDate(item.created_at || item.updated_at);
            copy.append(title, category);
            row.append(type, copy, date);
            recentList.append(row);
        });
    }

    function renderTable(section) {
        const panel = document.getElementById(`${section}-panel`);
        const config = tableConfig[section];
        const items = content[section];
        document.getElementById(`${section}-section-total`).textContent =
            `${items.length} ${items.length === 1 ? config.label : `${config.label}s`}`;
        panel.replaceChildren();

        if (contentErrors[section]) {
            const error = document.createElement("p");
            error.className = "inline-error";
            error.setAttribute("role", "alert");
            error.textContent = `Unable to load ${sectionNames[section].toLowerCase()}: ${contentErrors[section]}`;
            panel.append(error);
        }

        const toolbar = document.createElement("div");
        toolbar.className = "content-toolbar";
        const summary = document.createElement("p");
        summary.textContent = `${items.length} ${items.length === 1 ? config.label : `${config.label}s`} from your website API`;
        const searchLabel = document.createElement("label");
        searchLabel.className = "search-field";
        const searchIcon = document.createElement("span");
        searchIcon.className = "search-symbol";
        searchIcon.setAttribute("aria-hidden", "true");
        const search = document.createElement("input");
        search.type = "search";
        search.placeholder = `Search ${sectionNames[section].toLowerCase()}...`;
        search.setAttribute("aria-label", `Search ${sectionNames[section].toLowerCase()}`);
        searchLabel.append(searchIcon, search);
        toolbar.append(summary, searchLabel);
        panel.append(toolbar);

        const tableWrap = document.createElement("div");
        tableWrap.className = "table-wrap";
        const table = document.createElement("table");
        table.className = "content-table";
        const head = document.createElement("thead");
        const headerRow = document.createElement("tr");
        config.headers.forEach((label) => {
            const cell = document.createElement("th");
            cell.scope = "col";
            cell.textContent = label;
            headerRow.append(cell);
        });
        head.append(headerRow);
        const body = document.createElement("tbody");

        function drawRows() {
            body.replaceChildren();
            const query = search.value.trim().toLowerCase();
            const filtered = items.filter((item) => config.values(item)
                .some((value) => value.toLowerCase().includes(query)));
            if (!filtered.length) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");
                cell.className = "table-empty";
                cell.colSpan = config.headers.length;
                cell.textContent = query ? "No matching content found." : "No content available yet.";
                row.append(cell);
                body.append(row);
                return;
            }
            filtered.forEach((item) => {
                const row = document.createElement("tr");
                config.values(item).forEach((value, index) => {
                    const cell = document.createElement("td");
                    if (index === 0) {
                        const primary = document.createElement("span");
                        primary.className = "primary-cell";
                        primary.textContent = value;
                        cell.append(primary);
                    } else {
                        cell.textContent = value;
                    }
                    row.append(cell);
                });
                if (section === "services" || section === "projects" || section === "blogs") {
                    const actionsCell = document.createElement("td");
                    actionsCell.className = "table-actions";
                    ["edit", "delete"].forEach((action) => {
                        const button = document.createElement("button");
                        button.className = `table-action${action === "delete" ? " table-action-danger" : ""}`;
                        button.type = "button";
                        button.dataset.contentAction = action;
                        button.dataset.contentSection = section;
                        button.dataset.contentId = String(item.id);
                        button.textContent = action === "edit" ? "Edit" : "Delete";
                        actionsCell.append(button);
                    });
                    row.append(actionsCell);
                }
                body.append(row);
            });
        }

        search.addEventListener("input", drawRows);
        drawRows();
        table.append(head, body);
        tableWrap.append(table);
        panel.append(tableWrap);

        if (section === "services" || section === "projects" || section === "blogs") {
            body.addEventListener("click", async (event) => {
                const button = event.target.closest("button[data-content-action]");
                if (!button) return;
                const targetSection = button.dataset.contentSection;
                const target = content[targetSection].find((item) => String(item.id) === button.dataset.contentId);
                if (!target) return;
                if (button.dataset.contentAction === "edit") {
                    if (targetSection === "services") openServiceDialog(target);
                    else if (targetSection === "projects") openProjectDialog(target);
                    else openBlogDialog(target);
                    return;
                }
                const noun = targetSection === "services"
                    ? "service"
                    : targetSection === "projects" ? "project" : "article";
                const name = target.name || target.title || `this ${noun}`;
                if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
                button.disabled = true;
                try {
                    await apiRequest(`/${targetSection}/${encodeURIComponent(target.id)}`, { method: "DELETE" });
                    await loadContent();
                    selectSection(targetSection);
                    document.getElementById("dashboard-status").textContent = `${noun[0].toUpperCase()}${noun.slice(1)} deleted successfully.`;
                } catch (error) {
                    if (error.status === 401 || error.status === 403) {
                        logout();
                        return;
                    }
                    button.disabled = false;
                    document.getElementById("dashboard-status").textContent = `Could not delete ${noun}: ${error.message}`;
                }
            });
        }
    }

    async function start() {
        if (!sessionStorage.getItem(TOKEN_KEY)) {
            window.location.replace("login.html");
            return;
        }
        try {
            const result = await apiRequest("/auth/me");
            if (!result.admin) throw new ApiError("Administrator profile is missing.", 401);
            const name = result.admin.name || "Administrator";
            document.getElementById("admin-name").textContent = name;
            document.getElementById("welcome-heading").textContent = `Welcome back, ${name.split(" ")[0]}`;
            document.getElementById("profile-avatar").textContent = name.charAt(0).toUpperCase();
        } catch (error) {
            if (error.status === 401 || error.status === 403) {
                logout();
                return;
            }
            document.getElementById("dashboard-status").textContent =
                "Could not verify your administrator session. Check the API connection and reload.";
            return;
        }
        await loadContent();
    }

    start();
})();

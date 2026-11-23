(() => {
    const API_BASE = window.MANDHISZONTECH_API_BASE || "http://localhost:5000/api";
    const sections = {
        services: { endpoint: "/services", property: "services" },
        projects: { endpoint: "/projects", property: "projects" },
        blogs: { endpoint: "/blogs", property: "blogs" }
    };

    document.getElementById("public-year").textContent = String(new Date().getFullYear());

    const menuToggle = document.getElementById("public-menu-toggle");
    const publicNav = document.getElementById("public-nav");
    menuToggle.addEventListener("click", () => {
        const isOpen = publicNav.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
    publicNav.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
            publicNav.classList.remove("is-open");
            menuToggle.setAttribute("aria-expanded", "false");
        }
    });

    async function restoreCustomerSession() {
        const token = sessionStorage.getItem("mandhiszontech_customer_token");
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE}/customers/me`, {
                headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    sessionStorage.removeItem("mandhiszontech_customer_token");
                }
                return;
            }
            const result = await response.json();
            if (!result.customer) return;
            const accountLink = document.querySelector(".public-account-link");
            accountLink.textContent = `Hi, ${result.customer.name.split(" ")[0]}`;
            accountLink.href = "#";
            accountLink.addEventListener("click", (event) => {
                event.preventDefault();
                if (window.confirm("Sign out of your MandhiszonTech account?")) {
                    sessionStorage.removeItem("mandhiszontech_customer_token");
                    window.location.reload();
                }
            });
        } catch {
            return;
        }
    }

    async function getContent(path) {
        const response = await fetch(`${API_BASE}${path}`, {
            headers: { Accept: "application/json" }
        });
        let payload;
        try {
            payload = await response.json();
        } catch {
            throw new Error("The server returned an unreadable response.");
        }
        if (!response.ok || payload.success === false) {
            throw new Error(payload.message || `Request failed (${response.status}).`);
        }
        return payload;
    }

    function addText(parent, tag, className, value) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = value;
        parent.append(element);
        return element;
    }

    function showUnavailable(container, message) {
        container.replaceChildren();
        const notice = document.createElement("p");
        notice.className = "public-loading public-error";
        notice.textContent = message;
        container.append(notice);
    }

    async function loadServices() {
        const container = document.getElementById("public-services");
        try {
            const result = await getContent(sections.services.endpoint);
            container.replaceChildren();
            if (!Array.isArray(result.services) || !result.services.length) {
                showUnavailable(container, "Our service details are being updated. Please contact us to discuss your needs.");
                return;
            }
            result.services.forEach((service, index) => {
                const card = document.createElement("article");
                card.className = "public-service-card";
                addText(card, "span", "public-card-index", `0${index + 1}`);
                addText(card, "h3", "", service.name || service.title || "Service");
                addText(card, "p", "", service.description || "Get in touch to learn more about this service.");
                if (service.category) addText(card, "span", "public-category", service.category);
                container.append(card);
            });
        } catch (error) {
            showUnavailable(container, `Services are unavailable right now: ${error.message}`);
        }
    }

    async function loadProjects() {
        const container = document.getElementById("public-projects");
        try {
            const result = await getContent(sections.projects.endpoint);
            container.replaceChildren();
            if (!Array.isArray(result.projects) || !result.projects.length) {
                showUnavailable(container, "Our portfolio is growing. Check back soon or ask us about our recent work.");
                return;
            }
            result.projects.forEach((project) => {
                const card = document.createElement("article");
                card.className = "public-project-card";
                if (project.image_url) {
                    const image = document.createElement("img");
                    image.className = "project-card-image";
                    image.src = project.image_url;
                    image.alt = project.title ? `${project.title} project` : "Project preview";
                    image.loading = "lazy";
                    image.addEventListener("error", () => image.remove(), { once: true });
                    card.append(image);
                } else {
                    const placeholder = document.createElement("div");
                    placeholder.className = "project-card-placeholder";
                    placeholder.setAttribute("aria-hidden", "true");
                    placeholder.textContent = "M";
                    card.append(placeholder);
                }
                const copy = document.createElement("div");
                copy.className = "project-card-copy";
                if (project.category) addText(copy, "span", "public-category", project.category);
                addText(copy, "h3", "", project.title || "Project");
                addText(copy, "p", "", project.description || "");
                if (project.technologies) addText(copy, "span", "project-technologies", project.technologies);
                const links = document.createElement("div");
                links.className = "project-card-links";
                addSafeLink(links, project.live_url, "View project");
                addSafeLink(links, project.github_url, "GitHub");
                if (links.childElementCount) copy.append(links);
                card.append(copy);
                container.append(card);
            });
        } catch (error) {
            showUnavailable(container, `Projects are unavailable right now: ${error.message}`);
        }
    }

    async function loadBlogs() {
        const container = document.getElementById("public-blogs");
        try {
            const result = await getContent(sections.blogs.endpoint);
            container.replaceChildren();
            if (!Array.isArray(result.blogs) || !result.blogs.length) {
                showUnavailable(container, "New articles are on the way. In the meantime, get in touch with our team.");
                return;
            }
            result.blogs.forEach((blog) => {
                const card = document.createElement("article");
                card.className = "public-blog-card";
                if (blog.image_url) {
                    const image = document.createElement("img");
                    image.src = blog.image_url;
                    image.alt = "";
                    image.loading = "lazy";
                    image.addEventListener("error", () => image.remove(), { once: true });
                    card.append(image);
                }
                if (blog.category) addText(card, "span", "public-category", blog.category);
                addText(card, "h3", "", blog.title || "Article");
                if (blog.excerpt) addText(card, "p", "", blog.excerpt);
                addText(card, "span", "blog-byline", `${blog.author || "MandhiszonTech"} · ${formatDate(blog.created_at)}`);
                container.append(card);
            });
        } catch (error) {
            showUnavailable(container, `Articles are unavailable right now: ${error.message}`);
        }
    }

    function addSafeLink(container, value, label) {
        if (!value) return;
        try {
            const url = new URL(value);
            if (!["http:", "https:"].includes(url.protocol)) return;
            const link = document.createElement("a");
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = `${label} ↗`;
            container.append(link);
        } catch {
            return;
        }
    }

    function formatDate(value) {
        if (!value) return "Recent";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Recent";
        return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(date);
    }

    const contactForm = document.getElementById("public-contact-form");
    const contactMessage = document.getElementById("contact-form-message");
    const contactButton = document.getElementById("contact-submit");
    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        contactMessage.textContent = "";
        contactButton.disabled = true;
        contactButton.firstChild.textContent = "Sending...";
        const values = new FormData(contactForm);
        try {
            const response = await fetch(`${API_BASE}/contacts`, {
                method: "POST",
                headers: { Accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify(Object.fromEntries(values.entries()))
            });
            let payload;
            try {
                payload = await response.json();
            } catch {
                throw new Error("The server returned an unreadable response.");
            }
            if (!response.ok || payload.success === false) {
                throw new Error(payload.message || `Unable to send message (${response.status}).`);
            }
            contactForm.reset();
            contactMessage.textContent = "Thanks for reaching out. Your message has been received.";
            contactMessage.classList.remove("is-error");
        } catch (error) {
            contactMessage.textContent = error instanceof TypeError
                ? "Could not connect to the server. Please try again or email us directly."
                : error.message;
            contactMessage.classList.add("is-error");
        } finally {
            contactButton.disabled = false;
            contactButton.firstChild.textContent = "Send message ";
        }
    });

    loadServices();
    loadProjects();
    loadBlogs();
    restoreCustomerSession();
})();

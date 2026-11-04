(function () {
    "use strict";

    var SESSION_KEY = "gebze_varlik_session";
    var currentSession = null;
    var allAssetsCache = [];
    var currentAssetsList = [];
    var currentAssignmentsList = [];
    var currentMaintenancesList = [];
    var currentDepartmentsList = [];
    var currentBuildingsList = [];
    var currentCategoriesList = [];
    var currentTreeMode = "physical";
    var activeBuildingId = null;

    // DOM Referansları
    var loginScreen = document.getElementById("login-screen");
    var loginForm = document.getElementById("login-form");
    var loginError = document.getElementById("login-error");
    var currentUserNameEl = document.getElementById("current-user-name");
    var currentUserRoleEl = document.getElementById("current-user-role");
    var logoutBtn = document.getElementById("btn-logout");
    var toastContainer = document.getElementById("toast-container");

    // Varlık Filtre Alanları
    var queryInput = document.getElementById("filter-query");
    var filterDeptSelect = document.getElementById("filter-department");
    var filterBldSelect = document.getElementById("filter-building");
    var filterRoomSelect = document.getElementById("filter-room");
    var filterCatSelect = document.getElementById("filter-category");
    var filterStatusSelect = document.getElementById("filter-status");
    var clearBtn = document.getElementById("btn-clear-filters");
    var emptyResetBtn = document.getElementById("btn-empty-reset");
    var assetTableBody = document.getElementById("asset-table-body");
    var emptyState = document.getElementById("empty-state");
    var resultCountEl = document.getElementById("result-count");

    function formatCurrency(val) {
        var num = Number(val || 0);
        return num.toLocaleString("tr-TR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }) + " ₺";
    }

    function escapeHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function showToast(message, isError) {
        if (!toastContainer) return;
        var toast = document.createElement("div");
        toast.className = "toast" + (isError ? " toast-error" : "");
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 3800);
    }

    function getCsrfToken() {
        var matches = document.cookie.match(new RegExp('(?:^|; )XSRF-TOKEN=([^;]*)'));
        return matches ? decodeURIComponent(matches[1]) : null;
    }

    function checkMustChangePassword() {
        var modal = document.getElementById("modal-change-password");
        if (currentSession && currentSession.mustChangePassword) {
            if (modal) modal.hidden = false;
        } else {
            if (modal) modal.hidden = true;
        }
    }

    function apiRequest(url, options) {
        var opts = options || {};
        var method = (opts.method || "GET").toUpperCase();
        var headers = opts.headers || {};
        headers["Accept"] = "application/json";
        if (opts.body && !(opts.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }

        // SPA CSRF Token: GET ve HEAD dışındaki tüm isteklerde X-XSRF-TOKEN başlığı eklenir
        if (method !== "GET" && method !== "HEAD") {
            var csrf = getCsrfToken();
            if (csrf) {
                headers["X-XSRF-TOKEN"] = csrf;
            }
        }
        opts.headers = headers;

        return fetch(url, opts).then(function (response) {
            return response.json().catch(function () {
                return {};
            }).then(function (data) {
                if (!response.ok) {
                    if (response.status === 401) {
                        currentSession = null;
                        try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
                        if (loginScreen) loginScreen.hidden = false;
                    } else if (response.status === 403 && data && data.code === "PASSWORD_CHANGE_REQUIRED") {
                        if (currentSession) currentSession.mustChangePassword = true;
                        checkMustChangePassword();
                    }
                    var msg = (data && data.error) ? data.error : ("İstek hatası: HTTP " + response.status);
                    var err = new Error(msg);
                    err.status = response.status;
                    err.data = data;
                    throw err;
                }
                return data;
            });
        });
    }

    function getStatusClass(status) {
        var s = String(status || "").toLocaleLowerCase("tr-TR");
        if (s === "aktif" || s === "tamamlandi" || s === "zimmetli" || s === "zimmetlendi" || s === "kullanimda") return "status-aktif";
        if (s === "bakımda" || s === "bakimda" || s === "devam_ediyor" || s === "onarım gerekli" || s === "onarim gerekli") return "status-bakimda";
        if (s === "depoda" || s === "beklemede" || s === "satin_alindi" || s === "kaydedildi") return "status-depoda";
        if (s === "hurda" || s === "hurdaya_ayrildi") return "status-hurda";
        if (s === "zayiat_calinma" || s === "zayiat" || s === "çalınma" || s === "calinma") return "status-zayiat";
        if (s === "pasif" || s === "pasif_askida" || s === "devredildi" || s === "bagislandi" || s === "satildi" || s === "kullanım dışı" || s === "kullanim disi") return "status-pasif";
        return "status-depoda";
    }

    function getLifecycleLabel(status) {
        switch (String(status || "").toUpperCase()) {
            case "SATIN_ALINDI": return "Satın Alındı";
            case "KAYDEDILDI": return "Kaydedildi (Ambar)";
            case "ZIMMETLENDI": return "Zimmetlendi";
            case "KULLANIMDA": return "Kullanımda (Ortak)";
            case "BAKIMDA": return "Bakımda";
            case "PASIF_ASKIDA": return "Pasif / Askıda";
            case "HURDAYA_AYRILDI": return "Hurdaya Ayrıldı (HEK)";
            case "DEVREDILDI": return "Devredildi";
            case "BAGISLANDI": return "Bağışlandı";
            case "SATILDI": return "Satıldı";
            case "ZAYIAT_CALINMA": return "Zayiat / Çalınma";
            default: return status || "-";
        }
    }

    function applyRolePermissions() {
        if (!currentSession) return;
        if (currentUserNameEl) currentUserNameEl.textContent = currentSession.fullName;
        if (currentUserRoleEl) currentUserRoleEl.textContent = currentSession.role;

        var isReadOnly = currentSession.role === "AUDITOR" || currentSession.role === "VIEWER";
        var isWrite = Boolean(currentSession.canWrite) && !isReadOnly;
        var isAdmin = currentSession.role === "ADMIN";
        var canImport = currentSession.role === "ADMIN" || currentSession.role === "DEPT_MANAGER";

        var writeElements = document.querySelectorAll(".write-only");
        for (var i = 0; i < writeElements.length; i++) {
            writeElements[i].style.display = isWrite ? "" : "none";
        }

        var adminElements = document.querySelectorAll(".admin-only");
        for (var a = 0; a < adminElements.length; a++) {
            adminElements[a].style.display = isAdmin ? "" : "none";
        }

        var importElements = document.querySelectorAll(".import-only");
        for (var im = 0; im < importElements.length; im++) {
            importElements[im].style.display = canImport ? "" : "none";
        }

        // Salt okunur roller (AUDITOR ve VIEWER) için arayüzdeki yazma/düzenleme/silme butonlarını gizle
        var actionBtns = document.querySelectorAll(".btn-action-edit, .btn-action-delete, .btn-action-add");
        for (var b = 0; b < actionBtns.length; b++) {
            if (isReadOnly) {
                actionBtns[b].style.display = "none";
            }
        }
    }

    function performLogin(username, password) {
        if (loginError) loginError.hidden = true;
        apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ username: username, password: password })
        }).then(function (session) {
            currentSession = session;
            try {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
            } catch (e) {}
            if (loginScreen) loginScreen.hidden = true;
            applyRolePermissions();
            checkMustChangePassword();
            showToast("Hoş geldiniz, " + session.fullName + " (" + session.roleLabel + ")");
            if (!session.mustChangePassword) {
                refreshAllData();
            }
        }).catch(function (err) {
            if (loginError) {
                loginError.textContent = err.message;
                loginError.hidden = false;
            }
        });
    }

    function performLogout() {
        apiRequest("/api/auth/logout", { method: "POST" }).finally(function () {
            currentSession = null;
            try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
            if (loginScreen) loginScreen.hidden = false;
            var pwdModal = document.getElementById("modal-change-password");
            if (pwdModal) pwdModal.hidden = true;
            showToast("Oturum kapatıldı.");
        });
    }

    function restoreSession() {
        apiRequest("/api/auth/me").then(function (validSession) {
            currentSession = validSession;
            if (loginScreen) loginScreen.hidden = true;
            applyRolePermissions();
            checkMustChangePassword();
            if (!validSession.mustChangePassword) {
                refreshAllData();
            }
        }).catch(function () {
            currentSession = null;
            try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
            if (loginScreen) loginScreen.hidden = false;
        });
    }

    // ==========================================
    // SEKME GEÇİŞLERİ (TAB NAVIGATION)
    // ==========================================
    function switchView(viewName, skipLoad) {
        var views = [
            "dashboard", "tree", "assets", "locations", "departments", "personnel",
            "categories", "assignments", "maintenances", "movements",
            "stock", "fleet", "procurement", "counting", "qrcodes",
            "documents", "reports", "audit", "settings"
        ];
        for (var i = 0; i < views.length; i++) {
            var v = document.getElementById("view-" + views[i]);
            if (v) v.hidden = views[i] !== viewName;
        }
        var tabs = document.querySelectorAll(".nav-tab");
        for (var j = 0; j < tabs.length; j++) {
            tabs[j].classList.toggle("active", tabs[j].getAttribute("data-view") === viewName);
        }

        var viewTitles = {
            "dashboard": "Ana Ekran & Dashboard",
            "tree": "Kurumsal & Fiziksel Ağaç",
            "assets": "Demirbaş ve Varlık Envanteri",
            "locations": "Binalar, Katlar ve Odalar",
            "departments": "30 Kurumsal Müdürlük",
            "personnel": "Personel Yönetimi",
            "categories": "16 Ana Varlık Kategorisi",
            "assignments": "Zimmet İşlemleri ve Fişler",
            "maintenances": "Bakım & Onarım İş Emirleri",
            "movements": "Hareketler ve Konum Transferi",
            "stock": "Depo ve Stok Yönetimi",
            "fleet": "Araç & Filo (İş Makineleri Dahil)",
            "procurement": "Satın Alma & Tedarik Süreçleri",
            "counting": "Fiziksel Sayım & Kontrol",
            "qrcodes": "QR Kod & Etiket Yönetimi",
            "documents": "Belge & Evrak Arşivi",
            "reports": "Raporlama & Amortisman Analizi",
            "audit": "Sistem Denetim ve Onay Günlüğü",
            "settings": "Sistem Ayarları & Yetki Matrisi"
        };
        var currentViewTitleEl = document.getElementById("top-bar-current-view");
        if (currentViewTitleEl && viewTitles[viewName]) {
            currentViewTitleEl.textContent = viewTitles[viewName];
        }

        // Mobil çekmece açıksa kapat
        var appSidebar = document.getElementById("app-sidebar");
        var sidebarOverlay = document.getElementById("sidebar-overlay");
        if (appSidebar && appSidebar.classList.contains("open")) {
            appSidebar.classList.remove("open");
            if (sidebarOverlay) sidebarOverlay.classList.remove("active");
        }

        if (skipLoad) return;

        if (viewName === "dashboard") loadDashboard();
        else if (viewName === "tree") loadTree(currentTreeMode);
        else if (viewName === "assets") loadAssets();
        else if (viewName === "locations") loadLocations();
        else if (viewName === "departments") loadDepartments();
        else if (viewName === "personnel") loadPersonnel();
        else if (viewName === "categories") loadCategories();
        else if (viewName === "assignments") loadAssignments();
        else if (viewName === "maintenances") loadMaintenances();
        else if (viewName === "movements") loadMovements();
        else if (viewName === "stock") loadStock();
        else if (viewName === "fleet") loadFleet();
        else if (viewName === "procurement") loadProcurement();
        else if (viewName === "counting") loadCounting();
        else if (viewName === "qrcodes") loadQRCodes();
        else if (viewName === "documents") loadDocuments();
        else if (viewName === "reports") loadReports();
        else if (viewName === "audit") loadAuditLogs();
        else if (viewName === "settings") loadSettings();
    }

    function openModal(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) modal.hidden = false;
    }

    function closeModal(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) modal.hidden = true;
    }

    // ==========================================
    // 1. DASHBOARD EKRANI
    // ==========================================
    function loadDashboard() {
        apiRequest("/api/dashboard").then(function (data) {
            document.getElementById("kpi-total-assets").textContent = data.totalAssets || 0;
            document.getElementById("kpi-total-buildings").textContent = data.totalBuildings || 0;
            document.getElementById("kpi-total-departments").textContent = data.totalDepartments || 30;
            document.getElementById("kpi-total-rooms").textContent = data.totalRooms || 0;
            document.getElementById("kpi-active-assets").textContent = data.activeCount || 0;
            document.getElementById("kpi-storage-assets").textContent = data.inStorageCount || 0;
            document.getElementById("kpi-maint-assets").textContent = data.maintenanceCount || 0;
            document.getElementById("kpi-total-value").textContent = formatCurrency(data.totalEstimatedValue);

            // 30 Müdürlük Tablosu
            renderDashboardDepartmentsTable(data.unitSummaries);

            // Binalar Tablosu
            renderDashboardBuildingsTable(data.buildingsDistribution);

            // 16 Kategori Grid
            renderDashboardCategoriesGrid(data.byCategory);

            // En Çok Demirbaş Bulunan Odalar
            renderDashboardTopRooms(data.topRooms);

            // Son Hareketler
            renderDashboardMovements(data.recentMovements);

            // Akıllı Sistem Uyarıları
            loadSmartAlerts();
        }).catch(function (err) {
            showToast("Dashboard yüklenemedi: " + err.message, true);
        });
    }

    function renderDashboardDepartmentsTable(deptSummaries) {
        var tbody = document.getElementById("dash-departments-tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        var list = deptSummaries || [];
        if (list.length === 0) {
            tbody.innerHTML = "<tr><td colspan='9' style='text-align:center;'>Müdürlük kaydı bulunamadı.</td></tr>";
            return;
        }

        for (var i = 0; i < list.length; i++) {
            var d = list[i];
            var tr = document.createElement("tr");
            tr.innerHTML =
                "<td class='td-code'><code class='asset-code'>" + escapeHtml(d.code) + "</code></td>" +
                "<td class='td-name'><strong>" + escapeHtml(d.name) + "</strong></td>" +
                "<td class='td-manager'>" + escapeHtml(d.managerName || "Müdür Atanmamış") + "</td>" +
                "<td class='td-count' style='text-align: center;'><strong>" + (d.totalCount || 0) + "</strong></td>" +
                "<td class='td-active' style='text-align: center;'><span class='status-badge status-aktif'>" + (d.activeCount || 0) + "</span></td>" +
                "<td class='td-store' style='text-align: center;'><span class='status-badge status-depoda'>" + (d.storageCount || 0) + "</span></td>" +
                "<td class='td-maint' style='text-align: center;'><span class='status-badge status-bakimda'>" + (d.maintenanceCount || 0) + "</span></td>" +
                "<td class='td-val value-cell' style='text-align: right;'>" + formatCurrency(d.totalValue) + "</td>" +
                "<td class='td-action' style='text-align: center;'><button type='button' class='btn-action-sm' data-filter-dept-id='" + d.id + "'>Detayları Gör</button></td>";
            tbody.appendChild(tr);
        }
    }

    function renderDashboardBuildingsTable(buildings) {
        var tbody = document.getElementById("dash-buildings-tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        var list = buildings || [];
        for (var i = 0; i < list.length; i++) {
            var b = list[i];
            var tr = document.createElement("tr");
            tr.innerHTML =
                "<td><strong>" + escapeHtml(b.name) + "</strong></td>" +
                "<td><span class='sub-meta'>" + escapeHtml(b.type) + "</span></td>" +
                "<td style='text-align: right;'>" + b.roomCount + "</td>" +
                "<td style='text-align: right;'><strong>" + b.assetCount + "</strong></td>";
            tbody.appendChild(tr);
        }
    }

    function renderDashboardCategoriesGrid(categories) {
        var container = document.getElementById("dash-categories-list");
        if (!container) return;
        container.innerHTML = "";
        var list = categories || [];
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            var pill = document.createElement("div");
            pill.className = "category-pill-card";
            pill.setAttribute("data-filter-cat-name", c.name);
            pill.setAttribute("title", c.name + " kategorisindeki varlıkları listele");
            pill.innerHTML =
                "<div class='cat-pill-icon'>🏷️</div>" +
                "<div class='cat-pill-body'>" +
                "<div class='cat-pill-title'>" + escapeHtml(c.name) + "</div>" +
                "<div class='cat-pill-count'>" + c.count + " demirbaş</div>" +
                "</div>";
            container.appendChild(pill);
        }
    }

    function renderDashboardTopRooms(topRooms) {
        var tbody = document.getElementById("dash-top-rooms-tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        var list = topRooms || [];
        if (list.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4'>Kayıt bulunamadı.</td></tr>";
            return;
        }
        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            var tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            tr.innerHTML =
                "<td><strong>Oda " + escapeHtml(r.roomNumber) + "</strong> &mdash; " + escapeHtml(r.roomName) + "</td>" +
                "<td>" + escapeHtml(r.buildingName) + "</td>" +
                "<td><span class='room-type-tag'>" + escapeHtml(r.roomType) + "</span></td>" +
                "<td style='text-align: right;'><span class='badge-count'>" + r.assetCount + "</span></td>";
            (function (roomId) {
                tr.addEventListener("click", function () {
                    openRoomDetailModal(roomId);
                });
            })(r.roomId);
            tbody.appendChild(tr);
        }
    }

    function renderDashboardMovements(movements) {
        var tbody = document.getElementById("dash-movements-tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        var list = movements || [];
        if (list.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4'>Henüz hareket kaydı bulunmuyor.</td></tr>";
            return;
        }
        for (var i = 0; i < list.length; i++) {
            var m = list[i];
            var tr = document.createElement("tr");
            tr.innerHTML =
                "<td><code>" + escapeHtml(m.assetCode) + "</code><br><span class='sub-meta'>" + escapeHtml(m.assetName) + "</span></td>" +
                "<td><span class='status-badge status-aktif'>" + escapeHtml(m.typeLabel) + "</span></td>" +
                "<td><span class='sub-meta'>" + escapeHtml(m.fromLocation || "-") + "</span><br>&rarr; <strong>" + escapeHtml(m.toLocation) + "</strong></td>" +
                "<td><span class='sub-meta'>" + escapeHtml(m.timestamp) + "</span></td>";
            tbody.appendChild(tr);
        }
    }

    // ==========================================
    // 2. AĞAÇ GÖRÜNÜMÜ (TREE VIEW)
    // ==========================================
    function loadTree(mode) {
        currentTreeMode = mode || "physical";
        var container = document.getElementById("tree-container");
        if (!container) return;
        container.innerHTML = "<div class='loading-cell'>Ağaç hiyerarşisi yükleniyor...</div>";

        document.getElementById("tree-mode-physical").classList.toggle("active", currentTreeMode === "physical");
        document.getElementById("tree-mode-corporate").classList.toggle("active", currentTreeMode === "corporate");

        apiRequest("/api/hierarchy/tree?mode=" + currentTreeMode).then(function (rootNode) {
            container.innerHTML = "";
            renderTreeNode(rootNode, container, true);
        }).catch(function (err) {
            container.innerHTML = "<div class='alert-error'>Ağaç yüklenemedi: " + escapeHtml(err.message) + "</div>";
        });
    }

    function renderTreeNode(node, container, isRoot) {
        var itemDiv = document.createElement("div");
        itemDiv.className = "tree-node-item";
        itemDiv.setAttribute("data-node-id", node.id);
        itemDiv.setAttribute("data-node-type", node.type);

        var rowDiv = document.createElement("div");
        rowDiv.className = "tree-node-row";

        var hasChildren = node.children && node.children.length > 0;

        var iconSymbol = "🏢";
        if (node.type === "MUNICIPALITY") iconSymbol = "🏛️";
        else if (node.type === "BUILDING") iconSymbol = "🏢";
        else if (node.type === "FLOOR") iconSymbol = "🪜";
        else if (node.type === "DEPARTMENT") iconSymbol = "📑";
        else if (node.type === "SUB_UNIT") iconSymbol = "↳";
        else if (node.type === "ROOM") {
            var rt = (node.description || "").toLowerCase();
            if (rt.indexOf("müdür") !== -1) iconSymbol = "👔";
            else if (rt.indexOf("depo") !== -1 || rt.indexOf("ambar") !== -1) iconSymbol = "📦";
            else if (rt.indexOf("sistem") !== -1) iconSymbol = "🖥️";
            else if (rt.indexOf("arşiv") !== -1) iconSymbol = "🗄️";
            else if (rt.indexOf("toplantı") !== -1) iconSymbol = "👥";
            else iconSymbol = "🚪";
        }

        rowDiv.innerHTML =
            "<div class='tree-node-left'>" +
            (hasChildren ? "<span class='tree-toggle-arrow expanded'>&#9654;</span>" : "<span style='width:16px;display:inline-block;'></span>") +
            "<span class='tree-node-icon'>" + iconSymbol + "</span>" +
            "<span>" + escapeHtml(node.label) + "</span>" +
            "</div>" +
            (node.count != null ? "<span class='tree-node-badge'>" + node.count + "</span>" : "");

        itemDiv.appendChild(rowDiv);

        var childrenDiv = null;
        if (hasChildren) {
            childrenDiv = document.createElement("div");
            childrenDiv.className = "tree-node-children";
            for (var i = 0; i < node.children.length; i++) {
                renderTreeNode(node.children[i], childrenDiv, false);
            }
            itemDiv.appendChild(childrenDiv);
        }

        rowDiv.addEventListener("click", function (e) {
            // Aktif düğüm stili
            var allRows = document.querySelectorAll(".tree-node-row");
            for (var r = 0; r < allRows.length; r++) allRows[r].classList.remove("active");
            rowDiv.classList.add("active");

            // Ok tıklanmışsa veya çocukları varsa aç/kapa
            if (childrenDiv) {
                var isCollapsed = childrenDiv.classList.toggle("collapsed");
                var arrow = rowDiv.querySelector(".tree-toggle-arrow");
                if (arrow) arrow.classList.toggle("expanded", !isCollapsed);
            }

            // Seçilen herhangi bir düğümün (Oda, Kat, Bina, Müdürlük, Birim, Belediye) detayını sağ panele yükle!
            showNodeInTreeDetail(node);
        });

        container.appendChild(itemDiv);
    }

    function showNodeInTreeDetail(node) {
        var emptyEl = document.getElementById("tree-detail-empty");
        var contentEl = document.getElementById("tree-detail-content");
        if (emptyEl) emptyEl.hidden = true;
        if (contentEl) contentEl.hidden = false;

        var typeTagEl = document.getElementById("td-room-type");
        var titleEl = document.getElementById("td-room-title");
        var breadcrumbEl = document.getElementById("td-room-breadcrumb");
        var qrTextEl = document.getElementById("td-room-qr-text");
        var respEl = document.getElementById("td-responsible");
        var capEl = document.getElementById("td-capacity");
        var subEl = document.getElementById("td-subunit");
        var countEl = document.getElementById("td-asset-count");
        var tableTitleEl = document.querySelector(".room-assets-section h3");
        var btnAdd = document.getElementById("btn-add-asset-to-this-room");
        var tbody = document.getElementById("td-assets-tbody");

        var btnTreeEdit = document.getElementById("btn-tree-edit-node");
        if (!btnTreeEdit && btnAdd && btnAdd.parentNode) {
            btnTreeEdit = document.createElement("button");
            btnTreeEdit.id = "btn-tree-edit-node";
            btnTreeEdit.className = "btn-action-edit admin-only";
            btnTreeEdit.style.marginLeft = "0.5rem";
            btnAdd.parentNode.appendChild(btnTreeEdit);
        }

        var meta = node.metadata || {};
        var assetsUrl = "/api/assets";

        if (node.type === "ROOM") {
            var roomId = meta.roomId || (node.id && typeof node.id === "string" && node.id.indexOf("room-") === 0 ? node.id.replace("room-", "") : null);
            typeTagEl.textContent = meta.roomType || "Oda";
            titleEl.textContent = "Oda " + (meta.roomNumber || "") + " — " + (meta.name || node.label);
            breadcrumbEl.textContent = (meta.buildingName || "Yerleşke") + " > " + (meta.floorName || "Kat") + " > " + (meta.departmentName || "Müdürlük");
            qrTextEl.textContent = meta.qrCode || node.code || "-";
            respEl.textContent = meta.responsiblePerson || "Atanmamış";
            capEl.textContent = (meta.capacity || 4) + " kişi";
            subEl.textContent = meta.subUnitName || (meta.departmentName || "-");
            countEl.textContent = node.count != null ? node.count : (meta.assetCount || 0);
            if (tableTitleEl) tableTitleEl.textContent = "Bu Odada Bulunan Demirbaşlar";

            var qrVisualEl = document.getElementById("td-qr-visual");
            if (qrVisualEl) {
                qrVisualEl.innerHTML = "<svg width='44' height='44' viewBox='0 0 24 24' fill='currentColor'><path d='M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v3h-3v-3zm-5 0h3v3h-3v-3zm2 3h3v3h-3v-3zm3 0h3v5h-5v-2h2v-3zm-5 2h2v3h-2v-3z'/></svg>";
            }

            if (btnAdd) {
                btnAdd.style.display = "";
                btnAdd.textContent = "+ Bu Odaya Varlık Ekle";
                btnAdd.onclick = function () { openNewAssetModalWithPreselectedRoom(meta); };
            }

            if (btnTreeEdit) {
                btnTreeEdit.style.display = (currentSession && currentSession.role === "ADMIN") ? "" : "none";
                btnTreeEdit.textContent = "✏️ Odayı Düzenle";
                btnTreeEdit.onclick = function () { if (roomId) openEditRoomModal(roomId); };
            }

            assetsUrl = roomId ? ("/api/rooms/" + roomId + "/assets") : "/api/assets";

        } else if (node.type === "DEPARTMENT") {
            var deptId = meta.deptId || (node.id && typeof node.id === "string" && node.id.indexOf("dept-") === 0 ? node.id.replace("dept-", "") : null);
            typeTagEl.textContent = "Müdürlük";
            titleEl.textContent = node.label;
            breadcrumbEl.textContent = "Gebze Belediyesi > 30 Kurumsal Müdürlük";
            qrTextEl.textContent = meta.code || node.code || "GBZ-DEPT";
            respEl.textContent = meta.managerName || "Müdür Atanmamış";
            capEl.textContent = (node.children ? node.children.length : 0) + " Birim / Alan";
            subEl.textContent = meta.email || (meta.phone ? "Tel: " + meta.phone : "Kurumsal Birim");
            countEl.textContent = node.count != null ? node.count : 0;
            if (tableTitleEl) tableTitleEl.textContent = node.label + " Kapsamındaki Varlıklar";

            if (btnAdd) {
                btnAdd.style.display = "";
                btnAdd.textContent = "+ Bu Müdürlüğe Varlık Ekle";
                btnAdd.onclick = function () {
                    openNewAssetModal();
                    var dSel = document.getElementById("asset-department");
                    if (dSel && deptId) dSel.value = deptId;
                };
            }

            if (btnTreeEdit) {
                btnTreeEdit.style.display = (currentSession && currentSession.role === "ADMIN") ? "" : "none";
                btnTreeEdit.textContent = "✏️ Müdürlüğü Düzenle";
                btnTreeEdit.onclick = function () { if (deptId) openEditDepartmentModal(deptId); };
            }

            assetsUrl = deptId ? ("/api/assets?departmentId=" + deptId) : "/api/assets";

        } else if (node.type === "SUB_UNIT") {
            var subUnitId = meta.subUnitId || (node.id && typeof node.id === "string" && node.id.indexOf("sub-") === 0 ? node.id.replace("sub-", "") : null);
            typeTagEl.textContent = meta.unitType || "Şeflik / Alt Birim";
            titleEl.textContent = node.label;
            breadcrumbEl.textContent = (meta.deptName || "Müdürlük") + " > " + node.label;
            qrTextEl.textContent = meta.code || node.code || "GBZ-SUB";
            respEl.textContent = meta.managerName || "Birim Sorumlusu";
            capEl.textContent = (node.children ? node.children.length : 0) + " Çalışma Odası";
            subEl.textContent = meta.deptName || "Bağlı Müdürlük";
            countEl.textContent = node.count != null ? node.count : 0;
            if (tableTitleEl) tableTitleEl.textContent = node.label + " Varlıkları";

            if (btnAdd) {
                btnAdd.style.display = "";
                btnAdd.textContent = "+ Bu Birime Varlık Ekle";
                btnAdd.onclick = function () {
                    openNewAssetModal();
                    var dSel = document.getElementById("asset-department");
                    if (dSel && meta.deptId) dSel.value = meta.deptId;
                };
            }

            if (btnTreeEdit) {
                btnTreeEdit.style.display = (currentSession && currentSession.role === "ADMIN") ? "" : "none";
                btnTreeEdit.textContent = "✏️ Alt Birimi Düzenle";
                btnTreeEdit.onclick = function () { if (subUnitId) openEditSubUnitModal(subUnitId); };
            }

            assetsUrl = subUnitId ? ("/api/assets?subUnitId=" + subUnitId) : "/api/assets";

        } else if (node.type === "BUILDING") {
            var buildingId = meta.buildingId || (node.id && typeof node.id === "string" && node.id.indexOf("bld-") === 0 ? node.id.replace("bld-", "") : null);
            typeTagEl.textContent = meta.buildingType || "Hizmet Yerleşkesi";
            titleEl.textContent = node.label;
            breadcrumbEl.textContent = meta.address || "Gebze Belediyesi Yerleşkesi";
            qrTextEl.textContent = meta.code || node.code || "GBZ-BLD";
            respEl.textContent = meta.phone || "Gebze Belediyesi";
            capEl.textContent = (meta.totalFloors || 1) + " Kat • " + (meta.roomCount || 0) + " Oda";
            subEl.textContent = meta.buildingType || "-";
            countEl.textContent = node.count != null ? node.count : 0;
            if (tableTitleEl) tableTitleEl.textContent = node.label + " İçindeki Tüm Varlıklar";

            if (btnAdd) {
                btnAdd.style.display = "";
                btnAdd.textContent = "+ Bu Binaya Varlık Ekle";
                btnAdd.onclick = function () {
                    openNewAssetModal();
                    var bSel = document.getElementById("asset-building");
                    if (bSel && buildingId) {
                        bSel.value = buildingId;
                        loadFloorsForAssetForm(buildingId);
                    }
                };
            }

            if (btnTreeEdit) {
                btnTreeEdit.style.display = (currentSession && currentSession.role === "ADMIN") ? "" : "none";
                btnTreeEdit.textContent = "✏️ Binayı Düzenle";
                btnTreeEdit.onclick = function () { if (buildingId) openEditBuildingModal(buildingId); };
            }

            assetsUrl = buildingId ? ("/api/assets?buildingId=" + buildingId) : "/api/assets";

        } else if (node.type === "FLOOR") {
            var floorId = meta.floorId || (node.id && typeof node.id === "string" && node.id.indexOf("floor-") === 0 ? node.id.replace("floor-", "") : null);
            typeTagEl.textContent = "Bina Katı";
            titleEl.textContent = node.label;
            breadcrumbEl.textContent = (meta.buildingName || "Yerleşke") + " > " + (meta.floorName || node.label);
            qrTextEl.textContent = meta.floorCode || node.code || "-";
            respEl.textContent = meta.description || "Kat Yetkilisi";
            capEl.textContent = (meta.roomCount || 0) + " Oda / Alan";
            subEl.textContent = meta.buildingName || "Bağlı Bina";
            countEl.textContent = node.count != null ? node.count : 0;
            if (tableTitleEl) tableTitleEl.textContent = node.label + " Varlıkları";

            if (btnAdd) {
                btnAdd.style.display = "";
                btnAdd.textContent = "+ Bu Kata Varlık Ekle";
                btnAdd.onclick = function () {
                    openNewAssetModal();
                    var bSel = document.getElementById("asset-building");
                    if (bSel && meta.buildingId) {
                        bSel.value = meta.buildingId;
                        loadFloorsForAssetForm(meta.buildingId, function () {
                            var fSel = document.getElementById("asset-floor");
                            if (fSel && floorId) fSel.value = floorId;
                        });
                    }
                };
            }

            if (btnTreeEdit) {
                btnTreeEdit.style.display = (currentSession && currentSession.role === "ADMIN") ? "" : "none";
                btnTreeEdit.textContent = "✏️ Katı Düzenle";
                btnTreeEdit.onclick = function () { if (floorId) openEditFloorModal(floorId); };
            }
            assetsUrl = floorId ? ("/api/assets?floorId=" + floorId) : "/api/assets";

        } else {
            // MUNICIPALITY veya Genel Kök Düğüm
            typeTagEl.textContent = "Kurumsal Çatı";
            titleEl.textContent = node.label;
            breadcrumbEl.textContent = "Gebze Belediyesi Envanter Yönetimi • Kocaeli";
            qrTextEl.textContent = node.code || "GBZ-MUNICIPALITY";
            respEl.textContent = "Taşınır Kayıt ve Kontrol Yetkilileri";
            capEl.textContent = "12 Bina • 30 Müdürlük";
            subEl.textContent = "Tüm Kurumsal Birimler";
            countEl.textContent = node.count != null ? node.count : 0;
            if (tableTitleEl) tableTitleEl.textContent = "Gebze Belediyesi Genel Demirbaş Listesi";

            if (btnAdd) {
                btnAdd.style.display = "";
                btnAdd.textContent = "+ Yeni Varlık Ekle";
                btnAdd.onclick = function () { openNewAssetModal(); };
            }
            assetsUrl = "/api/assets";
        }

        tbody.innerHTML = "<tr><td colspan='7'>Demirbaşlar yükleniyor...</td></tr>";

        apiRequest(assetsUrl).then(function (assets) {
            tbody.innerHTML = "";
            if (!assets || assets.length === 0) {
                tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Bu seçime ait kayıtlı demirbaş bulunmuyor.</td></tr>";
                return;
            }
            for (var i = 0; i < assets.length; i++) {
                var a = assets[i];
                var tr = document.createElement("tr");
                tr.innerHTML =
                    "<td><code>" + escapeHtml(a.code) + "</code></td>" +
                    "<td><strong>" + escapeHtml(a.name) + "</strong></td>" +
                    "<td>" + escapeHtml(a.category) + "</td>" +
                    "<td>" + escapeHtml(a.brandModel || "-") + "</td>" +
                    "<td>" + escapeHtml(a.assignee || "-") + "</td>" +
                    "<td><span class='status-badge " + getStatusClass(a.status) + "'>" + escapeHtml(a.status) + "</span></td>" +
                    "<td><button type='button' class='btn-action-sm' data-open-detail-id='" + a.id + "'>Detay</button></td>";
                tbody.appendChild(tr);
            }
        }).catch(function (err) {
            tbody.innerHTML = "<tr><td colspan='7' class='alert-error'>" + escapeHtml(err.message) + "</td></tr>";
        });
    }

    // ==========================================
    // 3. BİNALAR & ODALAR EKRANI
    // ==========================================
    function loadLocations() {
        var pillsBar = document.getElementById("building-pills-bar");
        if (!pillsBar) return;

        apiRequest("/api/buildings").then(function (buildings) {
            currentBuildingsList = buildings;
            pillsBar.innerHTML = "";

            if (!activeBuildingId && buildings.length > 0) {
                activeBuildingId = buildings[0].id;
            }

            for (var i = 0; i < buildings.length; i++) {
                var b = buildings[i];
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "building-pill-btn" + (b.id === activeBuildingId ? " active" : "");
                btn.textContent = b.name + " (" + b.assetCount + " Varlık)";
                (function (bld) {
                    btn.onclick = function () {
                        activeBuildingId = bld.id;
                        var allPills = document.querySelectorAll(".building-pill-btn");
                        for (var p = 0; p < allPills.length; p++) allPills[p].classList.remove("active");
                        this.classList.add("active");
                        renderRoomsForBuilding(bld);
                    };
                })(b);
                pillsBar.appendChild(btn);
            }

            var activeBld = buildings.find(function (x) { return x.id === activeBuildingId; }) || buildings[0];
            if (activeBld) renderRoomsForBuilding(activeBld);
        });
    }

    function renderRoomsForBuilding(building) {
        document.getElementById("loc-bld-name").textContent = building.name + " (" + building.buildingType + ")";
        document.getElementById("loc-bld-address").textContent = building.address || "Adres bilgisi girilmemiş";
        document.getElementById("loc-bld-stats").innerHTML =
            "<span>" + building.totalFloors + " Kat</span> &bull; <span>" + building.roomCount + " Oda/Ambar</span> &bull; <strong>" + building.assetCount + " Demirbaş</strong>";

        var grid = document.getElementById("rooms-grid");
        grid.innerHTML = "<div class='loading-cell'>Odalar listeleniyor...</div>";

        var filterType = document.getElementById("loc-room-type-filter").value;

        apiRequest("/api/rooms?buildingId=" + building.id + (filterType ? "&roomType=" + encodeURIComponent(filterType) : ""))
            .then(function (rooms) {
                grid.innerHTML = "";
                if (!rooms || rooms.length === 0) {
                    grid.innerHTML = "<div class='empty-card'>Bu binada/kriterde tanımlı oda bulunamadı.</div>";
                    return;
                }

                var isAdmin = currentSession && currentSession.role === "ADMIN";
                for (var i = 0; i < rooms.length; i++) {
                    var r = rooms[i];
                    var card = document.createElement("div");
                    card.className = "room-card";
                    card.innerHTML =
                        "<div class='room-card-top'>" +
                        "<span class='room-card-number'>Oda " + escapeHtml(r.roomNumber) + "</span>" +
                        "<span class='room-type-tag'>" + escapeHtml(r.roomType) + "</span>" +
                        "<span class='room-cap-tag'>👥 " + (r.capacity || 4) + " Kişi</span>" +
                        "</div>" +
                        "<div class='room-card-title'>" + escapeHtml(r.name) + "</div>" +
                        "<div style='font-size:0.8rem;color:var(--gray-600);'>Kat: <strong>" + escapeHtml(r.floorName) + "</strong></div>" +
                        "<div style='font-size:0.8rem;color:var(--gray-600);'>Müdürlük: " + escapeHtml(r.departmentName || "-") + "</div>" +
                        "<div class='room-card-foot'>" +
                        "<span class='room-resp-tag'>👤 " + escapeHtml(r.responsiblePerson || "Atanmamış") + "</span>" +
                        "<span class='badge-count'>" + r.assetCount + " Demirbaş</span>" +
                        "</div>" +
                        (isAdmin ?
                            ("<div class='room-actions-bar'>" +
                            "<button type='button' class='btn-action-edit' data-edit-room-id='" + r.id + "'>✏️ Düzenle</button>" +
                            "<button type='button' class='btn-action-danger' data-del-room-id='" + r.id + "'>🗑️ Sil</button>" +
                            "</div>") : "");

                    (function (roomObj) {
                        card.addEventListener("click", function (e) {
                            if (e.target.closest("[data-edit-room-id]")) {
                                e.stopPropagation();
                                openEditRoomModal(roomObj.id);
                                return;
                            }
                            if (e.target.closest("[data-del-room-id]")) {
                                e.stopPropagation();
                                deleteRoom(roomObj.id);
                                return;
                            }
                            openRoomDetailModal(roomObj.id);
                        });
                    })(r);

                    grid.appendChild(card);
                }
            });
    }

    function openRoomDetailModal(roomId) {
        apiRequest("/api/rooms/" + roomId).then(function (room) {
            document.getElementById("mr-name").textContent = "Oda " + room.roomNumber + " — " + room.name;
            document.getElementById("mr-type").textContent = room.roomType;
            document.getElementById("mr-breadcrumb").textContent = room.buildingName + " > " + room.floorName;
            document.getElementById("mr-qr-code").textContent = room.qrCode;
            document.getElementById("mr-dept").textContent = room.departmentName || "-";
            document.getElementById("mr-resp").textContent = room.responsiblePerson || "Atanmamış";
            document.getElementById("mr-cap").textContent = (room.capacity || 4) + " kişi";
            document.getElementById("mr-count").textContent = room.assetCount || 0;

            var btnAdd = document.getElementById("mr-btn-add-asset");
            if (btnAdd) {
                btnAdd.onclick = function () {
                    closeModal("modal-room-detail");
                    openNewAssetModalWithPreselectedRoom(room);
                };
            }

            var btnEditRoom = document.getElementById("mr-btn-edit-room");
            if (!btnEditRoom && btnAdd && btnAdd.parentNode) {
                btnEditRoom = document.createElement("button");
                btnEditRoom.id = "mr-btn-edit-room";
                btnEditRoom.className = "btn-action-edit admin-only";
                btnEditRoom.style.marginLeft = "0.5rem";
                btnAdd.parentNode.appendChild(btnEditRoom);
            }
            if (btnEditRoom) {
                btnEditRoom.style.display = (currentSession && currentSession.role === "ADMIN") ? "" : "none";
                btnEditRoom.textContent = "✏️ Odayı Düzenle (Kapasite, İsim, Sorumlu vs.)";
                btnEditRoom.onclick = function () {
                    closeModal("modal-room-detail");
                    openEditRoomModal(roomId);
                };
            }

            var tbody = document.getElementById("mr-assets-tbody");
            tbody.innerHTML = "<tr><td colspan='5'>Demirbaşlar yükleniyor...</td></tr>";

            apiRequest("/api/rooms/" + roomId + "/assets").then(function (assets) {
                tbody.innerHTML = "";
                if (!assets || assets.length === 0) {
                    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Bu odada şu anda demirbaş bulunmuyor.</td></tr>";
                    return;
                }
                for (var i = 0; i < assets.length; i++) {
                    var a = assets[i];
                    var tr = document.createElement("tr");
                    tr.innerHTML =
                        "<td><code>" + escapeHtml(a.code) + "</code></td>" +
                        "<td><strong>" + escapeHtml(a.name) + "</strong></td>" +
                        "<td>" + escapeHtml(a.category) + "</td>" +
                        "<td>" + escapeHtml(a.assignee || "-") + "</td>" +
                        "<td><span class='status-badge " + getStatusClass(a.status) + "'>" + escapeHtml(a.status) + "</span></td>";
                    tbody.appendChild(tr);
                }
            });

            openModal("modal-room-detail");
        });
    }

    // ==========================================
    // 4. 30 MÜDÜRLÜK EKRANI
    // ==========================================
    function loadDepartments() {
        var grid = document.getElementById("departments-grid");
        if (!grid) return;
        grid.innerHTML = "<div class='loading-cell'>30 Müdürlük bilgileri yükleniyor...</div>";

        Promise.all([
            apiRequest("/api/departments"),
            apiRequest("/api/sub-units")
        ]).then(function (results) {
            var depts = results[0];
            var subUnits = results[1];
            currentDepartmentsList = depts;

            grid.innerHTML = "";
            var isAdmin = currentSession && currentSession.role === "ADMIN";
            for (var i = 0; i < depts.length; i++) {
                var d = depts[i];
                var deptSubs = subUnits.filter(function (s) { return s.departmentId === d.id; });

                var card = document.createElement("div");
                card.className = "department-card";

                var subsHtml = "";
                if (deptSubs.length > 0) {
                    subsHtml = "<div class='department-subunits-list'>";
                    for (var s = 0; s < deptSubs.length; s++) {
                        var sub = deptSubs[s];
                        subsHtml += "<span class='subunit-tag" + (isAdmin ? " subunit-clickable" : "") + "' " +
                            (isAdmin ? "data-edit-sub-id='" + sub.id + "' title='Alt birimi düzenlemek için tıklayın' style='cursor:pointer;'" : "") +
                            ">" + escapeHtml(sub.name) + (isAdmin ? " ✏️" : "") + "</span>";
                    }
                    subsHtml += "</div>";
                } else {
                    subsHtml = "<p style='font-size:0.78rem;color:var(--gray-500);margin:0.5rem 0;'>Tanımlı alt birim bulunmuyor.</p>";
                }

                card.innerHTML =
                    "<div class='department-card-header'>" +
                    "<span class='department-code-badge'>" + escapeHtml(d.code) + "</span>" +
                    "<span class='badge-count'>" + d.assetCount + " Demirbaş</span>" +
                    "</div>" +
                    "<h3 class='department-card-title'>" + escapeHtml(d.name) + "</h3>" +
                    "<p style='font-size:0.83rem;color:var(--gray-700);margin-bottom:0.4rem;'>👤 <strong>Müdür:</strong> " + escapeHtml(d.managerName || "Müdür Atanmamış") + "</p>" +
                    "<p style='font-size:0.78rem;color:var(--gray-500);'>Alt Birimler / Şeflikler:</p>" +
                    subsHtml +
                    "<div class='department-card-foot'>" +
                    "<span>İletişim: " + escapeHtml(d.phone || "Dahili: 100" + (i + 1)) + "</span>" +
                    "<div style='display:flex;gap:0.35rem;align-items:center;'>" +
                    "<button type='button' class='btn-action-sm' data-filter-dept-id='" + d.id + "'>Detayları Gör</button>" +
                    (isAdmin ?
                        ("<button type='button' class='btn-action-edit' data-edit-dept-id='" + d.id + "' title='Müdürlüğü Düzenle'>✏️</button>" +
                         "<button type='button' class='btn-action-danger' data-del-dept-id='" + d.id + "' title='Müdürlüğü Sil'>🗑️</button>") : "") +
                    "</div>" +
                    "</div>";

                grid.appendChild(card);
            }
        });
    }

    // ==========================================
    // 5. 16 KATEGORİ EKRANI
    // ==========================================
    function loadCategories() {
        var grid = document.getElementById("categories-large-grid");
        if (!grid) return;
        grid.innerHTML = "<div class='loading-cell'>16 Kategori listeleniyor...</div>";

        apiRequest("/api/categories").then(function (categories) {
            currentCategoriesList = categories;
            grid.innerHTML = "";
            for (var i = 0; i < categories.length; i++) {
                var c = categories[i];
                var card = document.createElement("div");
                card.className = "category-large-card";
                card.innerHTML =
                    "<div class='category-large-header'>" +
                    "<div class='category-large-icon'>🏷️</div>" +
                    "<div>" +
                    "<code style='font-size:0.75rem;color:var(--gray-500);'>" + escapeHtml(c.code) + "</code>" +
                    "<h3 style='font-size:1.05rem;color:var(--navy-900);margin:0;'>" + escapeHtml(c.name) + "</h3>" +
                    "</div>" +
                    "</div>" +
                    "<p style='font-size:0.84rem;color:var(--gray-600);margin:0.5rem 0;min-height:40px;'>" + escapeHtml(c.description || "-") + "</p>" +
                    "<div style='display:flex;justify-content:space-between;align-items:center;padding-top:0.6rem;border-top:1px solid var(--gray-200);'>" +
                    "<span class='badge-count'>" + c.assetCount + " Demirbaş</span>" +
                    "<button type='button' class='btn-action-sm' data-filter-cat-name='" + escapeHtml(c.name) + "'>Filtrele</button>" +
                    "</div>";
                grid.appendChild(card);
            }
        });
    }

    // ==========================================
    // 5.B PERSONEL YÖNETİMİ (BELEDİYE ÇALIŞANLARI)
    // ==========================================
    var cachedPersonnelList = [];

    function loadPersonnel() {
        var tbody = document.getElementById("tbody-personnel");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='8' class='loading-cell'>Belediye personeli yükleniyor...</td></tr>";

        apiRequest("/api/personnel").then(function (list) {
            cachedPersonnelList = list;
            populatePersonnelSelects();
            renderPersonnelTable();

            var deptFilter = document.getElementById("filter-pers-dept");
            if (deptFilter && deptFilter.options.length <= 1) {
                apiRequest("/api/departments").then(function (depts) {
                    currentDepartmentsList = depts;
                    deptFilter.innerHTML = "<option value=''>Tüm Müdürlükler (" + depts.length + ")</option>";
                    for (var i = 0; i < depts.length; i++) {
                        var opt = document.createElement("option");
                        opt.value = depts[i].id;
                        opt.textContent = depts[i].name;
                        deptFilter.appendChild(opt);
                    }
                });
            }
        }).catch(function (err) {
            tbody.innerHTML = "<tr><td colspan='8' class='empty-card'>Personel listesi yüklenemedi: " + escapeHtml(err.message) + "</td></tr>";
        });
    }

    function renderPersonnelTable() {
        var tbody = document.getElementById("tbody-personnel");
        var countInfo = document.getElementById("pers-count-info");
        if (!tbody) return;

        var searchVal = (document.getElementById("filter-pers-search") ? document.getElementById("filter-pers-search").value : "").trim().toLowerCase();
        var deptVal = document.getElementById("filter-pers-dept") ? document.getElementById("filter-pers-dept").value : "";

        var filtered = cachedPersonnelList.filter(function (p) {
            if (deptVal && String(p.departmentId) !== String(deptVal)) return false;
            if (searchVal) {
                var match = (p.fullName && p.fullName.toLowerCase().indexOf(searchVal) !== -1) ||
                            (p.title && p.title.toLowerCase().indexOf(searchVal) !== -1) ||
                            (p.registrationNumber && p.registrationNumber.toLowerCase().indexOf(searchVal) !== -1) ||
                            (p.departmentName && p.departmentName.toLowerCase().indexOf(searchVal) !== -1) ||
                            (p.roomName && p.roomName.toLowerCase().indexOf(searchVal) !== -1);
                if (!match) return false;
            }
            return true;
        });

        if (countInfo) countInfo.textContent = filtered.length + " Personel Listeleniyor";

        tbody.innerHTML = "";
        if (filtered.length === 0) {
            tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;padding:1.5rem;'>Arama kriterlerine uygun belediye personeli bulunamadı.</td></tr>";
            return;
        }

        var isAdmin = currentSession && currentSession.role === "ADMIN";

        for (var i = 0; i < filtered.length; i++) {
            var p = filtered[i];
            var tr = document.createElement("tr");
            var roomText = p.roomNumber ? ("Oda " + escapeHtml(p.roomNumber) + " — " + escapeHtml(p.roomName || "")) : "-";
            var contact = (p.phone ? "📞 " + escapeHtml(p.phone) : "") + (p.email ? "<br><span class='sub-meta'>✉️ " + escapeHtml(p.email) + "</span>" : "");

            tr.innerHTML =
                "<td><span class='asset-code'>" + escapeHtml(p.registrationNumber) + "</span></td>" +
                "<td><strong>" + escapeHtml(p.fullName) + "</strong></td>" +
                "<td>" + escapeHtml(p.title) + "</td>" +
                "<td>" + escapeHtml(p.departmentName || "-") + "</td>" +
                "<td>" + escapeHtml(p.subUnitName || "-") + "</td>" +
                "<td>" + roomText + "</td>" +
                "<td>" + (contact || "-") + "</td>" +
                "<td class='admin-only' style='text-align:center;white-space:nowrap;'>" +
                (isAdmin ?
                    ("<button type='button' class='btn-action-edit' data-edit-pers-id='" + p.id + "' title='Personeli Düzenle'>✏️</button> " +
                    "<button type='button' class='btn-action-danger' data-del-pers-id='" + p.id + "' title='Personeli Sil'>🗑️</button>") : "-") +
                "</td>";

            tbody.appendChild(tr);
        }
    }

    function populatePersonnelSelects() {
        var targets = [
            { id: "asset-assignee", defaultLabel: "Personel Seçin (Veritabanından)...", valKey: "fullName" },
            { id: "assign-person", defaultLabel: "Personel Seçin (Veritabanından)...", valKey: "id" },
            { id: "nr-resp", defaultLabel: "Sorumlu Personel Seçin (Veritabanından)...", valKey: "fullName" },
            { id: "trans-assignee", defaultLabel: "Yeni Sorumlu Personel Seçin (Opsiyonel)...", valKey: "fullName" },
            { id: "dept-form-manager", defaultLabel: "Yönetici Seçin (Veritabanından)...", valKey: "fullName" },
            { id: "sub-form-manager", defaultLabel: "Sorumlu Seçin (Veritabanından)...", valKey: "fullName" }
        ];

        targets.forEach(function (t) {
            var el = document.getElementById(t.id);
            if (!el) return;
            var curVal = el.value;
            el.innerHTML = "<option value=''>" + t.defaultLabel + "</option>";
            for (var i = 0; i < cachedPersonnelList.length; i++) {
                var p = cachedPersonnelList[i];
                var opt = document.createElement("option");
                opt.value = (t.valKey === "id") ? String(p.id) : p.fullName;
                opt.textContent = p.fullName + " — " + p.title + " (" + (p.departmentName || "") + ")";
                opt.setAttribute("data-person-id", p.id);
                opt.setAttribute("data-fullname", p.fullName);
                opt.setAttribute("data-title", p.title);
                opt.setAttribute("data-deptid", p.departmentId || "");
                opt.setAttribute("data-roomid", p.roomId || "");
                el.appendChild(opt);
            }
            if (curVal) el.value = curVal;
        });
    }

    // ==========================================
    // 6. VARLIKLAR LİSTESİ (ENVANTER)
    // ==========================================
    function updateRoomFilterOptions(buildingId) {
        if (!filterRoomSelect) return;
        var url = buildingId ? ("/api/rooms?buildingId=" + buildingId) : "/api/rooms";
        apiRequest(url).then(function (rooms) {
            filterRoomSelect.innerHTML = "<option value=''>Tüm Odalar (" + rooms.length + ")</option>";
            for (var i = 0; i < rooms.length; i++) {
                var opt = document.createElement("option");
                opt.value = rooms[i].id;
                opt.textContent = "Oda " + rooms[i].roomNumber + " — " + rooms[i].name;
                filterRoomSelect.appendChild(opt);
            }
        }).catch(function () {
            filterRoomSelect.innerHTML = "<option value=''>Tüm Odalar</option>";
        });
    }

    var dropdownsLoadedPromise = null;

    function populateDropdownsForFilter() {
        if (!dropdownsLoadedPromise) {
            dropdownsLoadedPromise = Promise.all([
                apiRequest("/api/departments").then(function (depts) {
                    if (filterDeptSelect) {
                        var cur = filterDeptSelect.value;
                        filterDeptSelect.innerHTML = "<option value=''>Tüm Müdürlükler (" + depts.length + ")</option>";
                        for (var i = 0; i < depts.length; i++) {
                            var opt = document.createElement("option");
                            opt.value = String(depts[i].id);
                            opt.textContent = depts[i].name;
                            filterDeptSelect.appendChild(opt);
                        }
                        if (cur) filterDeptSelect.value = String(cur);
                    }
                }),
                apiRequest("/api/buildings").then(function (blds) {
                    if (filterBldSelect) {
                        var cur = filterBldSelect.value;
                        filterBldSelect.innerHTML = "<option value=''>Tüm Binalar (" + blds.length + ")</option>";
                        for (var i = 0; i < blds.length; i++) {
                            var opt = document.createElement("option");
                            opt.value = String(blds[i].id);
                            opt.textContent = blds[i].name;
                            filterBldSelect.appendChild(opt);
                        }
                        if (cur) filterBldSelect.value = String(cur);
                    }
                }),
                apiRequest("/api/categories").then(function (cats) {
                    if (filterCatSelect) {
                        var cur = filterCatSelect.value;
                        filterCatSelect.innerHTML = "<option value=''>Tüm Kategoriler (" + cats.length + ")</option>";
                        for (var i = 0; i < cats.length; i++) {
                            var opt = document.createElement("option");
                            opt.value = cats[i].name;
                            opt.textContent = cats[i].name;
                            opt.setAttribute("data-id", cats[i].id);
                            filterCatSelect.appendChild(opt);
                        }
                        if (cur) filterCatSelect.value = cur;
                    }
                })
            ]);
        }
        return dropdownsLoadedPromise;
    }

    function filterByDepartment(deptId) {
        if (queryInput) queryInput.value = "";
        if (filterBldSelect) filterBldSelect.value = "";
        if (filterRoomSelect) { filterRoomSelect.value = ""; updateRoomFilterOptions(null); }
        if (filterCatSelect) filterCatSelect.value = "";
        if (filterStatusSelect) filterStatusSelect.value = "";

        switchView("assets", true);

        populateDropdownsForFilter().then(function () {
            if (filterDeptSelect) {
                filterDeptSelect.value = String(deptId);
            }
            loadAssets();
        });
    }

    function filterByCategory(catName) {
        if (queryInput) queryInput.value = "";
        if (filterDeptSelect) filterDeptSelect.value = "";
        if (filterBldSelect) filterBldSelect.value = "";
        if (filterRoomSelect) { filterRoomSelect.value = ""; updateRoomFilterOptions(null); }
        if (filterStatusSelect) filterStatusSelect.value = "";

        switchView("assets", true);

        populateDropdownsForFilter().then(function () {
            if (filterCatSelect) {
                filterCatSelect.value = catName;
            }
            loadAssets();
        });
    }

    function loadAssets() {
        populateDropdownsForFilter();
        var params = new URLSearchParams();

        if (queryInput && queryInput.value) params.set("query", queryInput.value.trim());
        if (filterDeptSelect && filterDeptSelect.value) params.set("departmentId", filterDeptSelect.value);
        if (filterBldSelect && filterBldSelect.value) params.set("buildingId", filterBldSelect.value);
        if (filterRoomSelect && filterRoomSelect.value) params.set("roomId", filterRoomSelect.value);
        if (filterCatSelect && filterCatSelect.value) {
            params.set("category", filterCatSelect.value);
            var selectedOpt = filterCatSelect.options[filterCatSelect.selectedIndex];
            if (selectedOpt && selectedOpt.getAttribute("data-id")) {
                params.set("categoryId", selectedOpt.getAttribute("data-id"));
            }
        }
        if (filterStatusSelect && filterStatusSelect.value) params.set("status", filterStatusSelect.value);

        if (assetTableBody) assetTableBody.innerHTML = "<tr><td colspan='9' class='loading-cell'>Varlıklar listeleniyor...</td></tr>";

        apiRequest("/api/assets?" + params.toString()).then(function (assets) {
            currentAssetsList = assets;
            renderAssetTable(assets);
            if (resultCountEl) resultCountEl.textContent = assets.length + " varlık listeleniyor";
            if (emptyState) {
                emptyState.hidden = assets.length > 0;
                var emptyH3 = emptyState.querySelector("h3");
                var emptyP = emptyState.querySelector("p");
                if (filterDeptSelect && filterDeptSelect.value && filterDeptSelect.selectedIndex > 0) {
                    var deptName = filterDeptSelect.options[filterDeptSelect.selectedIndex].textContent;
                    if (emptyH3) emptyH3.textContent = deptName + " bünyesinde kayıtlı varlık bulunamadı";
                    if (emptyP) emptyP.textContent = "Bu müdürlüğe yeni demirbaş kaydı ekleyebilir veya filtreleri temizleyebilirsiniz.";
                } else if (filterCatSelect && filterCatSelect.value) {
                    if (emptyH3) emptyH3.textContent = filterCatSelect.value + " kategorisinde varlık bulunamadı";
                    if (emptyP) emptyP.textContent = "Filtreleri temizleyerek tüm belediye demirbaşlarını listeleyebilirsiniz.";
                } else {
                    if (emptyH3) emptyH3.textContent = "Arama kriterlerine uygun varlık bulunamadı";
                    if (emptyP) emptyP.textContent = "Filtreleri temizleyerek tüm belediye demirbaşlarını listeleyebilirsiniz.";
                }
            }
        }).catch(function (err) {
            showToast("Varlıklar alınamadı: " + err.message, true);
        });
    }

    function renderAssetTable(assets) {
        if (!assetTableBody) return;
        assetTableBody.innerHTML = "";
        var canWrite = currentSession && currentSession.canWrite;
        var canDelete = currentSession && currentSession.canDelete;

        for (var i = 0; i < assets.length; i++) {
            var item = assets[i];
            var tr = document.createElement("tr");

            var bldFloorStr = item.buildingName ? (item.buildingName + (item.floorName ? " - " + item.floorName : "")) : "-";
            var roomStr = item.roomNumber ? ("Oda " + item.roomNumber + " (" + (item.roomName || "") + ")") : (item.location || "-");

            tr.innerHTML =
                "<td><span class='asset-code'>" + escapeHtml(item.code) + "</span><br><span class='sub-meta'>" + escapeHtml(item.barcode || "") + "</span></td>" +
                "<td><strong>" + escapeHtml(item.name) + "</strong><br><span class='sub-meta'>" + escapeHtml(item.brandModel || "") + "</span></td>" +
                "<td><span class='category-badge'>" + escapeHtml(item.category) + "</span></td>" +
                "<td>" + escapeHtml(bldFloorStr) + "</td>" +
                "<td>" + escapeHtml(roomStr) + "</td>" +
                "<td>" + escapeHtml(item.departmentName || item.unit) + "</td>" +
                "<td>" + escapeHtml(item.assignee || "-") + "</td>" +
                "<td><span class='status-badge " + getStatusClass(item.status) + "'>" + escapeHtml(item.status) + "</span></td>" +
                "<td>" +
                "<div class='row-actions'>" +
                "<button type='button' class='btn-action-sm' data-open-detail-id='" + item.id + "'>Detay</button>" +
                (canWrite ? "<button type='button' class='btn-action-sm' data-action='transfer' data-id='" + item.id + "' style='background-color:var(--teal-50);color:var(--teal-600);border-color:var(--teal-500);'>Konum Değiştir</button>" : "") +
                (canWrite ? "<button type='button' class='btn-action-sm' data-action='maintenance' data-id='" + item.id + "' style='background-color:#fff7ed;color:#c2410c;border-color:#fb923c;'>Bakım</button>" : "") +
                (canWrite ? "<button type='button' class='btn-action-sm' data-action='assign' data-id='" + item.id + "'>Zimmetle</button>" : "") +
                (canWrite ? "<button type='button' class='btn-action-sm' data-action='edit' data-id='" + item.id + "'>Düzenle</button>" : "") +
                (canDelete ? "<button type='button' class='btn-danger-sm' data-action='delete' data-id='" + item.id + "'>Sil</button>" : "") +
                "</div>" +
                "</td>";

            assetTableBody.appendChild(tr);
        }
    }

    // ==========================================
    // 7. YENİ VARLIK VE TRANSFER MODALLARI
    // ==========================================
    function openNewAssetModalWithPreselectedRoom(roomMeta) {
        openNewAssetModal();
        if (!roomMeta) return;

        var bldSelect = document.getElementById("asset-building");
        var deptSelect = document.getElementById("asset-department");

        if (bldSelect && roomMeta.buildingId) {
            bldSelect.value = roomMeta.buildingId;
            loadFloorsForAssetForm(roomMeta.buildingId, function () {
                var flrSelect = document.getElementById("asset-floor");
                if (flrSelect && roomMeta.floorId) {
                    flrSelect.value = roomMeta.floorId;
                    loadRoomsForAssetForm(roomMeta.buildingId, roomMeta.floorId, function () {
                        var rSelect = document.getElementById("asset-room");
                        if (rSelect && (roomMeta.roomId || roomMeta.id)) {
                            rSelect.value = roomMeta.roomId || roomMeta.id;
                        }
                    });
                }
            });
        }

        if (deptSelect && roomMeta.departmentId) {
            deptSelect.value = roomMeta.departmentId;
        }
    }

    function openNewAssetModal(assetToEdit) {
        var form = document.getElementById("form-asset");
        if (!form) return;
        form.reset();
        document.getElementById("asset-id").value = assetToEdit ? assetToEdit.id : "";
        document.getElementById("modal-asset-title").textContent = assetToEdit ? "Varlık Kaydını Düzenle" : "Yeni Varlık Kaydı";

        // Dropdownları doldur
        var deptSelect = document.getElementById("asset-department");
        var bldSelect = document.getElementById("asset-building");
        var catSelect = document.getElementById("asset-category");

        Promise.all([
            apiRequest("/api/departments"),
            apiRequest("/api/buildings"),
            apiRequest("/api/categories")
        ]).then(function (results) {
            var depts = results[0];
            var blds = results[1];
            var cats = results[2];

            deptSelect.innerHTML = "<option value=''>Müdürlük Seçin (30)...</option>";
            for (var i = 0; i < depts.length; i++) {
                var o1 = document.createElement("option");
                o1.value = depts[i].id;
                o1.textContent = depts[i].name;
                deptSelect.appendChild(o1);
            }

            bldSelect.innerHTML = "<option value=''>Hizmet Binası Seçin...</option>";
            for (var j = 0; j < blds.length; j++) {
                var o2 = document.createElement("option");
                o2.value = blds[j].id;
                o2.textContent = blds[j].name + " (" + blds[j].buildingType + ")";
                bldSelect.appendChild(o2);
            }

            catSelect.innerHTML = "<option value=''>Kategori Seçin (16)...</option>";
            for (var k = 0; k < cats.length; k++) {
                var o3 = document.createElement("option");
                o3.value = cats[k].name;
                o3.textContent = cats[k].name;
                catSelect.appendChild(o3);
            }

            // Personel Dropdown (Veritabanından)
            var persSelect = document.getElementById("asset-assignee");
            if (persSelect) {
                persSelect.innerHTML = "<option value=''>Personel Seçin (Veritabanından)...</option>";
                for (var p = 0; p < cachedPersonnelList.length; p++) {
                    var pe = cachedPersonnelList[p];
                    var po = document.createElement("option");
                    po.value = pe.fullName;
                    po.textContent = pe.fullName + " — " + pe.title + " (" + (pe.departmentName || "") + ")";
                    if (assetToEdit && assetToEdit.assignee && assetToEdit.assignee === pe.fullName) {
                        po.selected = true;
                    }
                    persSelect.appendChild(po);
                }
            }

            if (assetToEdit) {
                document.getElementById("asset-code").value = assetToEdit.code || "";
                document.getElementById("asset-barcode").value = assetToEdit.barcode || "";
                document.getElementById("asset-tif").value = assetToEdit.tifCode || "";
                document.getElementById("asset-name").value = assetToEdit.name || "";
                catSelect.value = assetToEdit.category || "";
                document.getElementById("asset-brand").value = assetToEdit.brandModel || "";
                document.getElementById("asset-serial").value = assetToEdit.serialNumber || "";
                var statusEl = document.getElementById("asset-status");
                if (statusEl) {
                    statusEl.value = assetToEdit.status || "Aktif";
                    statusEl.disabled = true;
                    statusEl.title = "Durum değişiklikleri durum makinesi geçiş butonları (Varlık Detayı) üzerinden yürütülür.";
                }
                document.getElementById("asset-condition").value = assetToEdit.condition || "Çok İyi";
                if (persSelect && assetToEdit.assignee) persSelect.value = assetToEdit.assignee;
                document.getElementById("asset-value").value = assetToEdit.estimatedValue || "";
                document.getElementById("asset-acq-date").value = assetToEdit.acquisitionDate || "";
                document.getElementById("asset-warranty-date").value = assetToEdit.warrantyEndDate || "";
                document.getElementById("asset-notes").value = assetToEdit.notes || "";

                if (assetToEdit.departmentId) {
                    deptSelect.value = assetToEdit.departmentId;
                    var subSelect = document.getElementById("asset-subunit");
                    if (subSelect) {
                        apiRequest("/api/sub-units?departmentId=" + assetToEdit.departmentId).then(function (subs) {
                            subSelect.innerHTML = "<option value=''>Alt Birim Seçin (Opsiyonel)...</option>";
                            for (var s = 0; s < subs.length; s++) {
                                var so = document.createElement("option");
                                so.value = subs[s].id;
                                so.textContent = subs[s].name;
                                if (assetToEdit.subUnitId && assetToEdit.subUnitId === subs[s].id) so.selected = true;
                                subSelect.appendChild(so);
                            }
                        });
                    }
                }
                if (assetToEdit.buildingId) {
                    bldSelect.value = assetToEdit.buildingId;
                    loadFloorsForAssetForm(assetToEdit.buildingId, function () {
                        var fSelect = document.getElementById("asset-floor");
                        if (fSelect && assetToEdit.floorId) {
                            fSelect.value = assetToEdit.floorId;
                            loadRoomsForAssetForm(assetToEdit.buildingId, assetToEdit.floorId, function () {
                                var rSelect = document.getElementById("asset-room");
                                if (rSelect && assetToEdit.roomId) rSelect.value = assetToEdit.roomId;
                            });
                        }
                    });
                }
            } else {
                var statusElNew = document.getElementById("asset-status");
                if (statusElNew) {
                    statusElNew.value = "Depoda";
                    statusElNew.disabled = true;
                    statusElNew.title = "Yeni varlıklar otomatik olarak 'KAYDEDILDI (Depoda)' durumuyla kaydedilir.";
                }
            }
        });

        openModal("modal-asset-form");
    }

    function loadFloorsForAssetForm(buildingId, callback) {
        var floorSelect = document.getElementById("asset-floor");
        if (!floorSelect) return;
        floorSelect.innerHTML = "<option value=''>Kat Yükleniyor...</option>";
        apiRequest("/api/floors?buildingId=" + buildingId).then(function (floors) {
            floorSelect.innerHTML = "<option value=''>Kat Seçin...</option>";
            for (var i = 0; i < floors.length; i++) {
                var opt = document.createElement("option");
                opt.value = floors[i].id;
                opt.textContent = floors[i].floorName;
                floorSelect.appendChild(opt);
            }
            if (callback) callback();
        }).catch(function () {
            floorSelect.innerHTML = "<option value=''>Kat listelenemedi</option>";
        });
    }

    function loadRoomsForAssetForm(buildingId, floorId, callback) {
        var roomSelect = document.getElementById("asset-room");
        if (!roomSelect) return;
        roomSelect.innerHTML = "<option value=''>Oda Yükleniyor...</option>";
        apiRequest("/api/rooms?buildingId=" + buildingId + "&floorId=" + floorId).then(function (rooms) {
            roomSelect.innerHTML = "<option value=''>Oda / Ambar Seçin...</option>";
            for (var i = 0; i < rooms.length; i++) {
                var opt = document.createElement("option");
                opt.value = rooms[i].id;
                opt.textContent = "Oda " + rooms[i].roomNumber + " — " + rooms[i].name + " (" + rooms[i].roomType + ")";
                roomSelect.appendChild(opt);
            }
            if (callback) callback();
        }).catch(function () {
            roomSelect.innerHTML = "<option value=''>Oda listelenemedi</option>";
        });
    }

    function openTransferModal(assetId) {
        var asset = currentAssetsList.find(function (a) { return String(a.id) === String(assetId); });
        if (!asset) return;

        document.getElementById("trans-asset-id").value = asset.id;
        document.getElementById("trans-asset-name").textContent = asset.code + " — " + asset.name;
        document.getElementById("trans-current-loc").textContent = (asset.buildingName || "-") + " / " + (asset.roomName ? ("Oda " + asset.roomNumber + " - " + asset.roomName) : asset.location);

        var bldSelect = document.getElementById("trans-building");
        bldSelect.innerHTML = "<option value=''>Hedef Bina Seçin...</option>";

        var pSelect = document.getElementById("trans-assignee");
        if (pSelect) {
            pSelect.innerHTML = "<option value=''>Yeni Sorumlu Personel Seçin (Opsiyonel)...</option>";
            for (var p = 0; p < cachedPersonnelList.length; p++) {
                var pers = cachedPersonnelList[p];
                var po = document.createElement("option");
                po.value = pers.fullName;
                po.textContent = pers.fullName + " — " + pers.title + " (" + (pers.departmentName || "") + ")";
                pSelect.appendChild(po);
            }
        }

        apiRequest("/api/buildings").then(function (blds) {
            for (var i = 0; i < blds.length; i++) {
                var opt = document.createElement("option");
                opt.value = blds[i].id;
                opt.textContent = blds[i].name;
                bldSelect.appendChild(opt);
            }
            openModal("modal-transfer-form");
        });
    }

    // ==========================================
    // 7B. EXCEL İLE TOPLU VARLIK İÇE AKTARIMI (BULK IMPORT)
    // ==========================================
    function initBulkImportModule() {
        var btnOpen = document.getElementById("btn-open-bulk-import");
        var btnDownload = document.getElementById("btn-download-import-template");
        var btnDryRun = document.getElementById("btn-run-dry-run");
        var btnCommit = document.getElementById("btn-commit-import");
        var fileInput = document.getElementById("bulk-import-file-input");
        var resultsBox = document.getElementById("bulk-dry-run-results");
        var validCountEl = document.getElementById("dry-run-valid-count");
        var invalidCountEl = document.getElementById("dry-run-invalid-count");
        var errContainer = document.getElementById("dry-run-error-container");
        var tbodyErrors = document.getElementById("tbody-import-errors");
        var partialBox = document.getElementById("dry-run-partial-box");
        var chkPartial = document.getElementById("chk-partial-import");
        var txtPartialCount = document.getElementById("txt-partial-valid-count");

        var lastValidationResult = null;

        function resetModal() {
            if (fileInput) fileInput.value = "";
            if (resultsBox) resultsBox.hidden = true;
            if (errContainer) errContainer.hidden = true;
            if (tbodyErrors) tbodyErrors.innerHTML = "";
            if (partialBox) partialBox.hidden = true;
            if (chkPartial) chkPartial.checked = false;
            if (btnCommit) btnCommit.disabled = true;
            lastValidationResult = null;
        }

        if (btnOpen) {
            btnOpen.addEventListener("click", function () {
                resetModal();
                openModal("modal-bulk-import");
            });
        }

        if (btnDownload) {
            btnDownload.addEventListener("click", function () {
                window.location.href = "/api/assets/export-template";
            });
        }

        if (chkPartial) {
            chkPartial.addEventListener("change", function () {
                if (!lastValidationResult) {
                    btnCommit.disabled = true;
                    return;
                }
                if (lastValidationResult.validRowsCount === 0) {
                    btnCommit.disabled = true;
                } else if (lastValidationResult.invalidRowsCount > 0) {
                    btnCommit.disabled = !chkPartial.checked;
                } else {
                    btnCommit.disabled = false;
                }
            });
        }

        if (btnDryRun) {
            btnDryRun.addEventListener("click", function () {
                if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                    alert("Lütfen yüklenecek bir .xlsx dosyası seçiniz.");
                    return;
                }
                var file = fileInput.files[0];
                if (!file.name.toLowerCase().endsWith(".xlsx")) {
                    alert("Yalnızca .xlsx uzantılı Excel dosyaları kabul edilir.");
                    return;
                }

                btnDryRun.disabled = true;
                btnDryRun.textContent = "⏳ Doğrulanıyor...";

                var formData = new FormData();
                formData.append("file", file);

                apiRequest("/api/assets/import/validate", {
                    method: "POST",
                    body: formData
                }).then(function (result) {
                    lastValidationResult = result;
                    resultsBox.hidden = false;
                    validCountEl.textContent = result.validRowsCount || 0;
                    invalidCountEl.textContent = result.invalidRowsCount || 0;
                    txtPartialCount.textContent = result.validRowsCount || 0;

                    if (result.errors && result.errors.length > 0) {
                        errContainer.hidden = false;
                        var rowsHtml = "";
                        for (var i = 0; i < result.errors.length; i++) {
                            var err = result.errors[i];
                            rowsHtml += "<tr>" +
                                "<td style='font-weight:700; text-align:center;'>" + (err.rowNumber || "-") + "</td>" +
                                "<td><code>" + escapeHtml(err.field || "-") + "</code></td>" +
                                "<td>" + escapeHtml(String(err.rejectedValue !== null && err.rejectedValue !== undefined ? err.rejectedValue : "-")) + "</td>" +
                                "<td style='color:var(--danger); font-size:0.78rem;'>" + escapeHtml(err.message || "") + "</td>" +
                                "</tr>";
                        }
                        tbodyErrors.innerHTML = rowsHtml;
                    } else {
                        errContainer.hidden = true;
                        tbodyErrors.innerHTML = "";
                    }

                    if (result.invalidRowsCount > 0) {
                        partialBox.hidden = (result.validRowsCount === 0);
                        btnCommit.disabled = true;
                        chkPartial.checked = false;
                    } else if (result.validRowsCount > 0) {
                        partialBox.hidden = true;
                        btnCommit.disabled = false;
                    } else {
                        partialBox.hidden = true;
                        btnCommit.disabled = true;
                    }
                }).catch(function (err) {
                    alert("Doğrulama sırasında hata oluştu: " + (err.message || "Bilinmeyen hata"));
                }).finally(function () {
                    btnDryRun.disabled = false;
                    btnDryRun.textContent = "🔍 Ön Doğrula (Dry-Run)";
                });
            });
        }

        if (btnCommit) {
            btnCommit.addEventListener("click", function () {
                if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                    alert("Lütfen önce dosya seçin ve ön doğrulama yapın.");
                    return;
                }
                var file = fileInput.files[0];
                var allowPartial = Boolean(chkPartial && chkPartial.checked);

                btnCommit.disabled = true;
                btnCommit.textContent = "⏳ İçe Aktarılıyor...";

                var formData = new FormData();
                formData.append("file", file);
                formData.append("partialImportAllowed", allowPartial ? "true" : "false");

                apiRequest("/api/assets/import/commit", {
                    method: "POST",
                    body: formData
                }).then(function (res) {
                    alert("✅ Toplu İçe Aktarım Başarılı!\n" +
                          "Aktarılan Varlık Sayısı: " + res.importedCount + "\n" +
                          "Toplu İşlem No (Batch ID): " + (res.batchId || res.importBatchId));
                    closeModal("modal-bulk-import");
                    resetModal();
                    loadAssetsTable();
                }).catch(function (err) {
                    alert("İçe aktarım başarısız oldu: " + (err.message || "Hata"));
                }).finally(function () {
                    btnCommit.disabled = false;
                    btnCommit.textContent = "🚀 İçe Aktarımı Tamamla (Commit)";
                });
            });
        }
    }

    // ==========================================
    // 8. ZİMMET, BAKIM VE DİĞER MODÜLLER
    // ==========================================
    function loadAssignments() {
        var tbody = document.getElementById("assignments-table-body");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='9' class='loading-cell'>Zimmet kayıtları yükleniyor...</td></tr>";

        apiRequest("/api/assignments").then(function (list) {
            currentAssignmentsList = list;
            tbody.innerHTML = "";
            if (list.length === 0) {
                tbody.innerHTML = "<tr><td colspan='9' style='text-align:center;'>Zimmet kaydı bulunamadı.</td></tr>";
                return;
            }
            for (var i = 0; i < list.length; i++) {
                var a = list[i];
                var tr = document.createElement("tr");
                tr.innerHTML =
                    "<td><code>" + escapeHtml(a.documentNo) + "</code></td>" +
                    "<td><strong>" + escapeHtml(a.assetName) + "</strong><br><span class='sub-meta'>" + escapeHtml(a.assetCode) + "</span></td>" +
                    "<td>" + escapeHtml(a.assigneeName) + "</td>" +
                    "<td>" + escapeHtml(a.assigneeTitle || "-") + "</td>" +
                    "<td>" + escapeHtml(a.unit) + "</td>" +
                    "<td>" + escapeHtml(a.location) + "</td>" +
                    "<td>" + escapeHtml(a.assignedAt) + "</td>" +
                    "<td><span class='status-badge " + (a.status === "AKTIF" ? "status-aktif" : "status-depoda") + "'>" + escapeHtml(a.status) + "</span></td>" +
                    "<td>" +
                    (a.status === "AKTIF" && currentSession && currentSession.canWrite ? "<button type='button' class='btn-action-sm' data-return-assign-id='" + a.id + "'>İade Al</button>" : "-") +
                    "</td>";
                tbody.appendChild(tr);
            }
        });
    }

    function loadMaintenances() {
        var tbody = document.getElementById("maintenances-table-body");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='9' class='loading-cell'>Bakım kayıtları yükleniyor...</td></tr>";

        apiRequest("/api/maintenances").then(function (list) {
            currentMaintenancesList = list;
            tbody.innerHTML = "";
            if (list.length === 0) {
                tbody.innerHTML = "<tr><td colspan='9' style='text-align:center;'>Bakım iş emri bulunamadı.</td></tr>";
                return;
            }
            for (var i = 0; i < list.length; i++) {
                var m = list[i];
                var tr = document.createElement("tr");
                tr.innerHTML =
                    "<td><code>" + escapeHtml(m.orderNo) + "</code></td>" +
                    "<td><strong>" + escapeHtml(m.assetName) + "</strong><br><span class='sub-meta'>" + escapeHtml(m.assetCode) + "</span></td>" +
                    "<td>" + escapeHtml(m.maintenanceType) + "</td>" +
                    "<td>" + escapeHtml(m.priority) + "</td>" +
                    "<td>" + escapeHtml(m.vendorOrTechnician || "-") + "</td>" +
                    "<td class='value-cell'>" + formatCurrency(m.cost) + "</td>" +
                    "<td>" + escapeHtml(m.startedAt) + "</td>" +
                    "<td><span class='status-badge " + (m.status === "TAMAMLANDI" ? "status-aktif" : "status-bakimda") + "'>" + escapeHtml(m.status) + "</span></td>" +
                    "<td>" +
                    (m.status === "DEVAM_EDIYOR" && currentSession && currentSession.canWrite ? "<button type='button' class='btn-action-sm' data-comp-maint-id='" + m.id + "'>Tamamla</button>" : "-") +
                    "</td>";
                tbody.appendChild(tr);
            }
        });
    }

    function loadMovements() {
        var tbody = document.getElementById("movements-table-body");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='7' class='loading-cell'>Hareketler yükleniyor...</td></tr>";

        apiRequest("/api/movements").then(function (list) {
            tbody.innerHTML = "";
            if (list.length === 0) {
                tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Hareket kaydı bulunamadı.</td></tr>";
                return;
            }
            for (var i = 0; i < list.length; i++) {
                var m = list[i];
                var tr = document.createElement("tr");
                tr.innerHTML =
                    "<td>" + escapeHtml(m.timestamp) + "</td>" +
                    "<td><code>" + escapeHtml(m.assetCode) + "</code><br><strong>" + escapeHtml(m.assetName) + "</strong></td>" +
                    "<td><span class='status-badge status-aktif'>" + escapeHtml(m.typeLabel) + "</span></td>" +
                    "<td>" + escapeHtml(m.fromLocation || "-") + "</td>" +
                    "<td><strong>" + escapeHtml(m.toLocation) + "</strong></td>" +
                    "<td>" + escapeHtml(m.performedBy) + "</td>" +
                    "<td>" + escapeHtml(m.note || "-") + "</td>";
                tbody.appendChild(tr);
            }
        });
    }

    function refreshAllData() {
        loadDashboard();
        loadAssets();
    }

    // ==========================================
    // 9. EVENT BINDINGS
    // ==========================================
    function bindEvents() {
        // Dropdown filtre seçeneklerini arkaplanda önceden yükle
        populateDropdownsForFilter();

        // Navigasyon sekmeleri
        var navTabs = document.querySelectorAll(".nav-tab");
        for (var i = 0; i < navTabs.length; i++) {
            navTabs[i].addEventListener("click", function () {
                switchView(this.getAttribute("data-view"));
            });
        }

        // Sidebar daraltma (collapse/expand) butonu
        var collapseBtn = document.getElementById("btn-collapse-sidebar");
        var appSidebar = document.getElementById("app-sidebar");
        if (collapseBtn && appSidebar) {
            collapseBtn.addEventListener("click", function () {
                var isCollapsed = appSidebar.classList.toggle("collapsed");
                try {
                    localStorage.setItem("gebze_sidebar_collapsed", isCollapsed ? "1" : "0");
                } catch (e) {}
            });
            try {
                if (localStorage.getItem("gebze_sidebar_collapsed") === "1") {
                    appSidebar.classList.add("collapsed");
                }
            } catch (e) {}
        }

        // Mobil hamburger menü butonu ve karartma overlay'i
        var mobileMenuBtn = document.getElementById("btn-mobile-menu");
        var sidebarOverlay = document.getElementById("sidebar-overlay");
        if (mobileMenuBtn && appSidebar) {
            mobileMenuBtn.addEventListener("click", function () {
                var isOpen = appSidebar.classList.toggle("open");
                if (sidebarOverlay) sidebarOverlay.classList.toggle("active", isOpen);
            });
        }
        if (sidebarOverlay && appSidebar) {
            sidebarOverlay.addEventListener("click", function () {
                appSidebar.classList.remove("open");
                sidebarOverlay.classList.remove("active");
            });
        }

        // Login Form
        if (loginForm) {
            loginForm.addEventListener("submit", function (e) {
                e.preventDefault();
                performLogin(
                    document.getElementById("login-username").value,
                    document.getElementById("login-password").value
                );
            });
        }

        // Hızlı Rol Butonları
        var roleBtns = document.querySelectorAll(".role-card-btn");
        for (var r = 0; r < roleBtns.length; r++) {
            roleBtns[r].addEventListener("click", function () {
                var u = this.getAttribute("data-user");
                var p = this.getAttribute("data-pass");
                var userInp = document.getElementById("login-username");
                var passInp = document.getElementById("login-password");
                if (userInp) userInp.value = u;
                if (p && passInp) {
                    passInp.value = p;
                    performLogin(u, p);
                } else if (passInp) {
                    passInp.value = "";
                    passInp.focus();
                }
            });
        }

        if (logoutBtn) logoutBtn.addEventListener("click", performLogout);

        // Zorunlu Şifre Değiştirme Formu
        var formChangePwd = document.getElementById("form-change-password");
        if (formChangePwd) {
            formChangePwd.addEventListener("submit", function (e) {
                e.preventDefault();
                var cur = document.getElementById("pwd-current").value;
                var nw = document.getElementById("pwd-new").value;
                var conf = document.getElementById("pwd-confirm").value;
                var errEl = document.getElementById("pwd-change-error");
                if (errEl) errEl.hidden = true;

                if (!cur) {
                    if (errEl) { errEl.textContent = "Mevcut şifrenizi giriniz."; errEl.hidden = false; }
                    return;
                }
                if (nw.length < 8) {
                    if (errEl) { errEl.textContent = "Yeni şifre en az 8 karakter uzunluğunda olmalıdır."; errEl.hidden = false; }
                    return;
                }
                if (nw !== conf) {
                    if (errEl) { errEl.textContent = "Yeni şifreler birbiriyle eşleşmiyor."; errEl.hidden = false; }
                    return;
                }

                apiRequest("/api/auth/change-password", {
                    method: "POST",
                    body: JSON.stringify({ currentPassword: cur, newPassword: nw })
                }).then(function (res) {
                    showToast(res.message || "Şifreniz güncellendi.");
                    var modal = document.getElementById("modal-change-password");
                    if (modal) modal.hidden = true;
                    if (currentSession) currentSession.mustChangePassword = false;
                    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentSession)); } catch (e) {}
                    refreshAllData();
                }).catch(function (err) {
                    if (errEl) {
                        errEl.textContent = err.message;
                        errEl.hidden = false;
                    }
                });
            });
        }

        var btnPwdLogout = document.getElementById("btn-pwd-logout");
        if (btnPwdLogout) {
            btnPwdLogout.addEventListener("click", performLogout);
        }

        // Modal Kapatma Butonları
        document.addEventListener("click", function (e) {
            var closeBtn = e.target.closest("[data-close-modal]");
            if (closeBtn) {
                closeModal(closeBtn.getAttribute("data-close-modal"));
            }
        });

        // Dashboard Hızlı Butonlar
        var dNewAsset = document.getElementById("dash-btn-new-asset");
        if (dNewAsset) dNewAsset.onclick = function () { openNewAssetModal(); };

        var dNewAssign = document.getElementById("dash-btn-new-assign");
        if (dNewAssign) dNewAssign.onclick = function () {
            populateAssignAssetSelect();
            openModal("modal-assign-form");
        };

        var dNewMaint = document.getElementById("dash-btn-new-maint");
        if (dNewMaint) dNewMaint.onclick = function () { openNewMaintenanceModal(); };

        var btnOpenNewMaint = document.getElementById("btn-open-new-maint");
        if (btnOpenNewMaint) btnOpenNewMaint.onclick = function () { openNewMaintenanceModal(); };

        var dNewMove = document.getElementById("dash-btn-new-move");
        if (dNewMove) dNewMove.onclick = function () {
            if (currentAssetsList.length > 0) openTransferModal(currentAssetsList[0].id);
        };

        // Ağaç Görünümü Mod Butonları
        var btnTreePhys = document.getElementById("tree-mode-physical");
        if (btnTreePhys) btnTreePhys.onclick = function () { loadTree("physical"); };

        var btnTreeCorp = document.getElementById("tree-mode-corporate");
        if (btnTreeCorp) btnTreeCorp.onclick = function () { loadTree("corporate"); };

        var btnTreeExp = document.getElementById("btn-tree-expand-all");
        if (btnTreeExp) {
            btnTreeExp.onclick = function () {
                var children = document.querySelectorAll(".tree-node-children");
                for (var c = 0; c < children.length; c++) children[c].classList.remove("collapsed");
                var arrows = document.querySelectorAll(".tree-toggle-arrow");
                for (var a = 0; a < arrows.length; a++) arrows[a].classList.add("expanded");
            };
        }

        var btnTreeCol = document.getElementById("btn-tree-collapse-all");
        if (btnTreeCol) {
            btnTreeCol.onclick = function () {
                var children = document.querySelectorAll(".tree-node-children");
                for (var c = 0; c < children.length; c++) children[c].classList.add("collapsed");
                var arrows = document.querySelectorAll(".tree-toggle-arrow");
                for (var a = 0; a < arrows.length; a++) arrows[a].classList.remove("expanded");
            };
        }

        // Ağaç içi arama filtresi
        var treeSearch = document.getElementById("tree-search-input");
        if (treeSearch) {
            treeSearch.addEventListener("input", function () {
                var val = this.value.toLocaleLowerCase("tr-TR").trim();
                var rows = document.querySelectorAll(".tree-node-item");
                for (var i = 0; i < rows.length; i++) {
                    var text = rows[i].textContent.toLocaleLowerCase("tr-TR");
                    rows[i].style.display = (val === "" || text.indexOf(val) !== -1) ? "" : "none";
                }
            });
        }

        // Envanter Filtreleri
        var filterInputs = [queryInput, filterDeptSelect, filterBldSelect, filterRoomSelect, filterCatSelect, filterStatusSelect];
        for (var f = 0; f < filterInputs.length; f++) {
            if (filterInputs[f]) filterInputs[f].addEventListener("change", loadAssets);
        }
        if (queryInput) queryInput.addEventListener("input", loadAssets);

        if (filterBldSelect) {
            filterBldSelect.addEventListener("change", function () {
                if (filterRoomSelect) {
                    filterRoomSelect.value = "";
                    updateRoomFilterOptions(this.value);
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener("click", function () {
                if (queryInput) queryInput.value = "";
                if (filterDeptSelect) filterDeptSelect.value = "";
                if (filterBldSelect) filterBldSelect.value = "";
                if (filterRoomSelect) {
                    filterRoomSelect.value = "";
                    updateRoomFilterOptions(null);
                }
                if (filterCatSelect) filterCatSelect.value = "";
                if (filterStatusSelect) filterStatusSelect.value = "";
                loadAssets();
            });
        }
        if (emptyResetBtn) {
            emptyResetBtn.addEventListener("click", function () {
                if (clearBtn) clearBtn.click();
            });
        }

        // Tablodaki işlem butonları delegasyonu
        if (assetTableBody) {
            assetTableBody.addEventListener("click", function (e) {
                var btn = e.target.closest("button[data-action]");
                if (!btn) return;
                var action = btn.getAttribute("data-action");
                var assetId = Number(btn.getAttribute("data-id"));

                if (action === "transfer") {
                    openTransferModal(assetId);
                } else if (action === "maintenance") {
                    openNewMaintenanceModal(assetId);
                } else if (action === "edit") {
                    var asset = currentAssetsList.find(function (a) { return a.id === assetId; });
                    if (asset) openNewAssetModal(asset);
                } else if (action === "assign") {
                    populateAssignAssetSelect(assetId);
                    openModal("modal-assign-form");
                } else if (action === "delete") {
                    if (confirm("Bu varlığı sistemden arşivlemek / pasife almak istediğinize emin misiniz?")) {
                        apiRequest("/api/assets/" + assetId, { method: "DELETE" }).then(function () {
                            showToast("Varlık başarıyla pasife alındı.");
                            refreshAllData();
                        }).catch(function (err) {
                            showToast(err.message, true);
                        });
                    }
                }
            });
        }

        // Detay açma butonları (Ağaç, Dashboard, Tablo ortak)
        document.addEventListener("click", function (e) {
            var btn = e.target.closest("[data-open-detail-id]");
            if (btn) {
                var assetId = btn.getAttribute("data-open-detail-id");
                openAssetDetailPopup(assetId);
            }

            var deptFilterBtn = e.target.closest("[data-filter-dept-id]");
            if (deptFilterBtn) {
                var deptId = deptFilterBtn.getAttribute("data-filter-dept-id");
                filterByDepartment(deptId);
            }

            var catFilterBtn = e.target.closest("[data-filter-cat-name]");
            if (catFilterBtn) {
                var catName = catFilterBtn.getAttribute("data-filter-cat-name");
                filterByCategory(catName);
            }
        });

        // Varlık Ekle Butonu
        var btnOpenNew = document.getElementById("btn-open-new-asset");
        if (btnOpenNew) btnOpenNew.onclick = function () { openNewAssetModal(); };

        // Excel ile Toplu İçe Aktarım Modülü
        initBulkImportModule();

        // Yeni Varlık Formu Cascading Dropdowns
        var aBld = document.getElementById("asset-building");
        if (aBld) {
            aBld.addEventListener("change", function () {
                if (this.value) loadFloorsForAssetForm(this.value);
            });
        }
        var aFlr = document.getElementById("asset-floor");
        if (aFlr) {
            aFlr.addEventListener("change", function () {
                var bId = document.getElementById("asset-building").value;
                if (bId && this.value) loadRoomsForAssetForm(bId, this.value);
            });
        }

        // Form Submit: Varlık Ekle / Güncelle
        var formAsset = document.getElementById("form-asset");
        if (formAsset) {
            formAsset.addEventListener("submit", function (e) {
                e.preventDefault();
                var id = document.getElementById("asset-id").value;
                var payload = {
                    code: document.getElementById("asset-code").value,
                    barcode: document.getElementById("asset-barcode").value,
                    tifCode: document.getElementById("asset-tif").value,
                    name: document.getElementById("asset-name").value,
                    category: document.getElementById("asset-category").value,
                    brandModel: document.getElementById("asset-brand").value,
                    serialNumber: document.getElementById("asset-serial").value,
                    status: document.getElementById("asset-status").value,
                    condition: document.getElementById("asset-condition").value,
                    assignee: document.getElementById("asset-assignee").value,
                    estimatedValue: Number(document.getElementById("asset-value").value || 0),
                    acquisitionDate: document.getElementById("asset-acq-date").value,
                    warrantyEndDate: document.getElementById("asset-warranty-date").value,
                    notes: document.getElementById("asset-notes").value,
                    departmentId: Number(document.getElementById("asset-department").value) || null,
                    buildingId: Number(document.getElementById("asset-building").value) || null,
                    floorId: Number(document.getElementById("asset-floor").value) || null,
                    roomId: Number(document.getElementById("asset-room").value) || null
                };

                var method = id ? "PUT" : "POST";
                var url = id ? ("/api/assets/" + id) : "/api/assets";

                apiRequest(url, {
                    method: method,
                    body: JSON.stringify(payload)
                }).then(function (res) {
                    closeModal("modal-asset-form");
                    showToast(res.code + " varlık kaydı başarıyla kaydedildi.");
                    refreshAllData();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // Transfer Form Cascading Dropdowns
        var tBld = document.getElementById("trans-building");
        if (tBld) {
            tBld.addEventListener("change", function () {
                var fSelect = document.getElementById("trans-floor");
                fSelect.innerHTML = "<option value=''>Kat Yükleniyor...</option>";
                apiRequest("/api/floors?buildingId=" + this.value).then(function (floors) {
                    fSelect.innerHTML = "<option value=''>Hedef Kat Seçin...</option>";
                    for (var i = 0; i < floors.length; i++) {
                        var opt = document.createElement("option");
                        opt.value = floors[i].id;
                        opt.textContent = floors[i].floorName;
                        fSelect.appendChild(opt);
                    }
                }).catch(function () {
                    fSelect.innerHTML = "<option value=''>Kat yüklenemedi</option>";
                });
            });
        }

        var tFlr = document.getElementById("trans-floor");
        if (tFlr) {
            tFlr.addEventListener("change", function () {
                var bId = document.getElementById("trans-building").value;
                var rSelect = document.getElementById("trans-room");
                rSelect.innerHTML = "<option value=''>Oda Yükleniyor...</option>";
                apiRequest("/api/rooms?buildingId=" + bId + "&floorId=" + this.value).then(function (rooms) {
                    rSelect.innerHTML = "<option value=''>Hedef Oda Seçin...</option>";
                    for (var i = 0; i < rooms.length; i++) {
                        var opt = document.createElement("option");
                        opt.value = rooms[i].id;
                        opt.textContent = "Oda " + rooms[i].roomNumber + " — " + rooms[i].name;
                        rSelect.appendChild(opt);
                    }
                }).catch(function () {
                    rSelect.innerHTML = "<option value=''>Oda yüklenemedi</option>";
                });
            });
        }

        // Form Submit: Transfer
        var formTrans = document.getElementById("form-transfer");
        if (formTrans) {
            formTrans.addEventListener("submit", function (e) {
                e.preventDefault();
                var assetId = document.getElementById("trans-asset-id").value;
                var payload = {
                    buildingId: Number(document.getElementById("trans-building").value),
                    floorId: Number(document.getElementById("trans-floor").value),
                    roomId: Number(document.getElementById("trans-room").value),
                    note: document.getElementById("trans-note").value
                };

                apiRequest("/api/assets/" + assetId + "/transfer", {
                    method: "POST",
                    body: JSON.stringify(payload)
                }).then(function (res) {
                    closeModal("modal-transfer-form");
                    showToast(res.code + " yeni odaya transfer edildi.");
                    refreshAllData();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // ==========================================
        // ODA YÖNETİMİ VE CASCADING DROPDOWNS
        // ==========================================
        var btnOpenNewRoom = document.getElementById("btn-open-new-room");
        if (btnOpenNewRoom) {
            btnOpenNewRoom.onclick = function () {
                openNewRoomModal(activeBuildingId, null);
            };
        }

        var nrBld = document.getElementById("nr-building");
        if (nrBld) {
            nrBld.addEventListener("change", function () {
                var fSelect = document.getElementById("nr-floor");
                if (!this.value) {
                    fSelect.innerHTML = "<option value=''>Önce Bina Seçin...</option>";
                    return;
                }
                fSelect.innerHTML = "<option value=''>Kat Yükleniyor...</option>";
                apiRequest("/api/floors?buildingId=" + this.value).then(function (floors) {
                    fSelect.innerHTML = "<option value=''>Kat Seçin...</option>";
                    for (var i = 0; i < floors.length; i++) {
                        var opt = document.createElement("option");
                        opt.value = floors[i].id;
                        opt.textContent = floors[i].floorName;
                        fSelect.appendChild(opt);
                    }
                }).catch(function () {
                    fSelect.innerHTML = "<option value=''>Kat yüklenemedi</option>";
                });
            });
        }

        var nrDept = document.getElementById("nr-dept");
        if (nrDept) {
            nrDept.addEventListener("change", function () {
                var subSelect = document.getElementById("nr-subunit");
                if (!subSelect) return;
                if (!this.value) {
                    subSelect.innerHTML = "<option value=''>Önce Müdürlük Seçin...</option>";
                    return;
                }
                subSelect.innerHTML = "<option value=''>Alt Birim Yükleniyor...</option>";
                apiRequest("/api/sub-units?departmentId=" + this.value).then(function (subs) {
                    subSelect.innerHTML = "<option value=''>Alt Birim Seçin (Opsiyonel)...</option>";
                    for (var s = 0; s < subs.length; s++) {
                        var opt = document.createElement("option");
                        opt.value = subs[s].id;
                        opt.textContent = subs[s].name;
                        subSelect.appendChild(opt);
                    }
                }).catch(function () {
                    subSelect.innerHTML = "<option value=''>Alt Birim yüklenemedi</option>";
                });
            });
        }

        var formNewRoom = document.getElementById("form-new-room");
        if (formNewRoom) {
            formNewRoom.addEventListener("submit", function (e) {
                e.preventDefault();
                var roomId = document.getElementById("nr-id").value;
                var subVal = document.getElementById("nr-subunit") ? document.getElementById("nr-subunit").value : null;
                var payload = {
                    buildingId: Number(document.getElementById("nr-building").value),
                    floorId: Number(document.getElementById("nr-floor").value),
                    roomNumber: document.getElementById("nr-number").value,
                    name: document.getElementById("nr-name").value,
                    roomType: document.getElementById("nr-type").value,
                    departmentId: Number(document.getElementById("nr-dept").value) || null,
                    subUnitId: Number(subVal) || null,
                    responsiblePerson: document.getElementById("nr-resp").value,
                    capacity: Number(document.getElementById("nr-capacity").value || 4),
                    description: document.getElementById("nr-desc").value
                };

                var method = roomId ? "PUT" : "POST";
                var url = roomId ? ("/api/rooms/" + roomId) : "/api/rooms";

                apiRequest(url, {
                    method: method,
                    body: JSON.stringify(payload)
                }).then(function (res) {
                    closeModal("modal-new-room");
                    showToast("Oda " + res.roomNumber + " (" + res.name + ") başarıyla kaydedildi.");
                    loadLocations();
                    loadDashboard();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // ==========================================
        // VARLIK FORMU CASCADING
        // ==========================================
        var aDept = document.getElementById("asset-department");
        if (aDept) {
            aDept.addEventListener("change", function () {
                var subSelect = document.getElementById("asset-subunit");
                if (!subSelect) return;
                if (!this.value) {
                    subSelect.innerHTML = "<option value=''>Önce Müdürlük Seçin...</option>";
                    return;
                }
                subSelect.innerHTML = "<option value=''>Alt Birim Yükleniyor...</option>";
                apiRequest("/api/sub-units?departmentId=" + this.value).then(function (subs) {
                    subSelect.innerHTML = "<option value=''>Alt Birim Seçin (Opsiyonel)...</option>";
                    for (var s = 0; s < subs.length; s++) {
                        var opt = document.createElement("option");
                        opt.value = subs[s].id;
                        opt.textContent = subs[s].name + " (" + subs[s].unitType + ")";
                        subSelect.appendChild(opt);
                    }
                }).catch(function () {
                    subSelect.innerHTML = "<option value=''>Alt birim listelenemedi</option>";
                });
            });
        }

        var aAssignee = document.getElementById("asset-assignee");
        if (aAssignee) {
            aAssignee.addEventListener("change", function () {
                var chosenName = this.value;
                if (!chosenName) return;
                var person = cachedPersonnelList.find(function (p) { return p.fullName === chosenName; });
                if (person) {
                    if (person.departmentId) {
                        var deptSel = document.getElementById("asset-department");
                        if (deptSel) {
                            deptSel.value = person.departmentId;
                            deptSel.dispatchEvent(new Event("change"));
                        }
                    }
                    if (person.roomId) {
                        apiRequest("/api/rooms/" + person.roomId).then(function (rm) {
                            var bSel = document.getElementById("asset-building");
                            if (bSel && rm.buildingId) {
                                bSel.value = rm.buildingId;
                                loadFloorsForAssetForm(rm.buildingId, function () {
                                    var fSel = document.getElementById("asset-floor");
                                    if (fSel && rm.floorId) {
                                        fSel.value = rm.floorId;
                                        loadRoomsForAssetForm(rm.buildingId, rm.floorId, function () {
                                            var rSel = document.getElementById("asset-room");
                                            if (rSel) rSel.value = rm.id;
                                        });
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }

        // ==========================================
        // ZİMMET FORMU VE DİNAMİK DROPDOWNS
        // ==========================================
        var assignPerson = document.getElementById("assign-person");
        if (assignPerson) {
            assignPerson.addEventListener("change", function () {
                var persId = this.value;
                var titleInput = document.getElementById("assign-title");
                var unitSelect = document.getElementById("assign-unit");
                var locSelect = document.getElementById("assign-location");

                var person = cachedPersonnelList.find(function (p) { return String(p.id) === String(persId); });
                if (person) {
                    if (titleInput) titleInput.value = person.title || "";
                    if (unitSelect && person.departmentName) {
                        for (var i = 0; i < unitSelect.options.length; i++) {
                            if (unitSelect.options[i].value === person.departmentName || unitSelect.options[i].getAttribute("data-dept-id") == person.departmentId) {
                                unitSelect.selectedIndex = i;
                                break;
                            }
                        }
                    }
                    if (locSelect && person.roomId) {
                        for (var j = 0; j < locSelect.options.length; j++) {
                            if (locSelect.options[j].getAttribute("data-room-id") == person.roomId) {
                                locSelect.selectedIndex = j;
                                break;
                            }
                        }
                    }
                } else {
                    if (titleInput) titleInput.value = "";
                }
            });
        }

        var formAssign = document.getElementById("form-assign");
        if (formAssign) {
            formAssign.addEventListener("submit", function (e) {
                e.preventDefault();
                var pSelect = document.getElementById("assign-person");
                var person = cachedPersonnelList.find(function (p) { return String(p.id) === String(pSelect.value); });
                var personName = person ? person.fullName : (pSelect.selectedIndex >= 0 ? pSelect.options[pSelect.selectedIndex].text : "");

                var payload = {
                    assetId: Number(document.getElementById("assign-asset-id").value),
                    assigneeName: personName,
                    assigneeTitle: document.getElementById("assign-title").value,
                    unit: document.getElementById("assign-unit").value,
                    location: document.getElementById("assign-location").value,
                    note: document.getElementById("assign-note").value
                };

                apiRequest("/api/assignments", {
                    method: "POST",
                    body: JSON.stringify(payload)
                }).then(function (res) {
                    closeModal("modal-assign-form");
                    showToast(res.documentNo + " numaralı zimmet fişi kesildi.");
                    refreshAllData();
                    loadAssignments();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // ==========================================
        // ADMIN KURUMSAL YÖNETİM BUTONLARI & MODALLARI
        // ==========================================
        // Bina Butonları
        var btnOpenNewBld = document.getElementById("btn-open-new-bld");
        if (btnOpenNewBld) btnOpenNewBld.onclick = function () { openNewBuildingModal(); };

        var btnEditActiveBld = document.getElementById("btn-edit-active-bld");
        if (btnEditActiveBld) {
            btnEditActiveBld.onclick = function () {
                if (activeBuildingId) openEditBuildingModal(activeBuildingId);
            };
        }

        var btnDeleteActiveBld = document.getElementById("btn-delete-active-bld");
        if (btnDeleteActiveBld) {
            btnDeleteActiveBld.onclick = function () {
                if (activeBuildingId) deleteBuilding(activeBuildingId);
            };
        }

        // Kat Butonları
        var btnOpenNewFloor = document.getElementById("btn-open-new-floor");
        if (btnOpenNewFloor) {
            btnOpenNewFloor.onclick = function () {
                openNewFloorModal(activeBuildingId);
            };
        }

        // Müdürlük & Alt Birim Butonları
        var btnOpenNewDept = document.getElementById("btn-open-new-dept");
        if (btnOpenNewDept) btnOpenNewDept.onclick = function () { openNewDepartmentModal(); };

        var btnOpenNewSubunit = document.getElementById("btn-open-new-subunit");
        if (btnOpenNewSubunit) btnOpenNewSubunit.onclick = function () { openNewSubUnitModal(); };

        // Personel Butonları & Filtreleri
        var btnOpenNewPers = document.getElementById("btn-open-new-pers");
        if (btnOpenNewPers) btnOpenNewPers.onclick = function () { openNewPersonnelModal(); };

        var filterPersSearch = document.getElementById("filter-pers-search");
        if (filterPersSearch) filterPersSearch.addEventListener("input", renderPersonnelTable);

        var filterPersDept = document.getElementById("filter-pers-dept");
        if (filterPersDept) filterPersDept.addEventListener("change", renderPersonnelTable);

        var btnResetPersFilter = document.getElementById("btn-reset-pers-filter");
        if (btnResetPersFilter) {
            btnResetPersFilter.onclick = function () {
                if (filterPersSearch) filterPersSearch.value = "";
                if (filterPersDept) filterPersDept.value = "";
                renderPersonnelTable();
            };
        }

        // Personel Formu Cascading
        var persDept = document.getElementById("pers-form-dept");
        if (persDept) {
            persDept.addEventListener("change", function () {
                var sSelect = document.getElementById("pers-form-subunit");
                if (!sSelect) return;
                if (!this.value) {
                    sSelect.innerHTML = "<option value=''>Önce Müdürlük Seçin...</option>";
                    return;
                }
                sSelect.innerHTML = "<option value=''>Alt Birim Yükleniyor...</option>";
                apiRequest("/api/sub-units?departmentId=" + this.value).then(function (subs) {
                    sSelect.innerHTML = "<option value=''>Alt Birim Seçin (Opsiyonel)...</option>";
                    for (var s = 0; s < subs.length; s++) {
                        var opt = document.createElement("option");
                        opt.value = subs[s].id;
                        opt.textContent = subs[s].name;
                        sSelect.appendChild(opt);
                    }
                }).catch(function () {
                    sSelect.innerHTML = "<option value=''>Alt birim yüklenemedi</option>";
                });
            });
        }

        // ==========================================
        // ADMIN FORMLARININ SUBMIT HANDLERLARI
        // ==========================================
        // Form: Müdürlük Ekle/Düzenle
        var formDept = document.getElementById("form-department");
        if (formDept) {
            formDept.addEventListener("submit", function (e) {
                e.preventDefault();
                var id = document.getElementById("dept-form-id").value;
                var payload = {
                    code: document.getElementById("dept-form-code").value,
                    name: document.getElementById("dept-form-name").value,
                    displayOrder: Number(document.getElementById("dept-form-order").value || 1),
                    managerName: document.getElementById("dept-form-manager").value,
                    phone: document.getElementById("dept-form-phone").value,
                    email: document.getElementById("dept-form-email").value
                };
                var method = id ? "PUT" : "POST";
                var url = id ? ("/api/departments/" + id) : "/api/departments";
                apiRequest(url, { method: method, body: JSON.stringify(payload) }).then(function (res) {
                    closeModal("modal-department-form");
                    showToast("Müdürlük başarıyla kaydedildi: " + res.name);
                    loadDepartments();
                    loadDashboard();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // Form: Alt Birim Ekle/Düzenle
        var formSub = document.getElementById("form-subunit");
        if (formSub) {
            formSub.addEventListener("submit", function (e) {
                e.preventDefault();
                var id = document.getElementById("sub-form-id").value;
                var payload = {
                    departmentId: Number(document.getElementById("sub-form-dept").value),
                    code: document.getElementById("sub-form-code").value,
                    unitType: document.getElementById("sub-form-type").value,
                    name: document.getElementById("sub-form-name").value,
                    managerName: document.getElementById("sub-form-manager").value,
                    phone: document.getElementById("sub-form-phone").value,
                    description: document.getElementById("sub-form-desc").value
                };
                var method = id ? "PUT" : "POST";
                var url = id ? ("/api/sub-units/" + id) : "/api/sub-units";
                apiRequest(url, { method: method, body: JSON.stringify(payload) }).then(function (res) {
                    closeModal("modal-subunit-form");
                    showToast("Alt birim başarıyla kaydedildi: " + res.name);
                    loadDepartments();
                    loadDashboard();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // Form: Bina Ekle/Düzenle
        var formBld = document.getElementById("form-building");
        if (formBld) {
            formBld.addEventListener("submit", function (e) {
                e.preventDefault();
                var id = document.getElementById("bld-form-id").value;
                var payload = {
                    code: document.getElementById("bld-form-code").value,
                    buildingType: document.getElementById("bld-form-type").value,
                    name: document.getElementById("bld-form-name").value,
                    totalFloors: Number(document.getElementById("bld-form-floors").value || 1),
                    address: document.getElementById("bld-form-address").value,
                    phone: document.getElementById("bld-form-phone").value,
                    description: document.getElementById("bld-form-desc").value
                };
                var method = id ? "PUT" : "POST";
                var url = id ? ("/api/buildings/" + id) : "/api/buildings";
                apiRequest(url, { method: method, body: JSON.stringify(payload) }).then(function (res) {
                    closeModal("modal-building-form");
                    showToast("Hizmet binası başarıyla kaydedildi: " + res.name);
                    loadLocations();
                    loadDashboard();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // Form: Kat Ekle/Düzenle
        var formFloor = document.getElementById("form-floor");
        if (formFloor) {
            formFloor.addEventListener("submit", function (e) {
                e.preventDefault();
                var id = document.getElementById("floor-form-id").value;
                var payload = {
                    buildingId: Number(document.getElementById("floor-form-bld").value),
                    floorCode: document.getElementById("floor-form-code").value,
                    floorName: document.getElementById("floor-form-name").value,
                    floorOrder: Number(document.getElementById("floor-form-order").value || 1),
                    description: document.getElementById("floor-form-desc").value
                };
                var method = id ? "PUT" : "POST";
                var url = id ? ("/api/floors/" + id) : "/api/floors";
                apiRequest(url, { method: method, body: JSON.stringify(payload) }).then(function (res) {
                    closeModal("modal-floor-form");
                    showToast("Kat başarıyla kaydedildi: " + res.floorName);
                    loadLocations();
                    loadDashboard();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // Form: Personel Ekle/Düzenle
        var formPers = document.getElementById("form-personnel");
        if (formPers) {
            formPers.addEventListener("submit", function (e) {
                e.preventDefault();
                var id = document.getElementById("pers-form-id").value;
                var subVal = document.getElementById("pers-form-subunit") ? document.getElementById("pers-form-subunit").value : null;
                var roomVal = document.getElementById("pers-form-room") ? document.getElementById("pers-form-room").value : null;
                var payload = {
                    registrationNumber: document.getElementById("pers-form-reg").value,
                    firstName: document.getElementById("pers-form-firstname").value,
                    lastName: document.getElementById("pers-form-lastname").value,
                    title: document.getElementById("pers-form-title").value,
                    departmentId: Number(document.getElementById("pers-form-dept").value) || null,
                    subUnitId: Number(subVal) || null,
                    roomId: Number(roomVal) || null,
                    phone: document.getElementById("pers-form-phone").value,
                    email: document.getElementById("pers-form-email").value
                };
                var method = id ? "PUT" : "POST";
                var url = id ? ("/api/personnel/" + id) : "/api/personnel";
                apiRequest(url, { method: method, body: JSON.stringify(payload) }).then(function (res) {
                    closeModal("modal-personnel-form");
                    showToast("Personel kaydı başarıyla kaydedildi: " + res.fullName);
                    loadPersonnel();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // ==========================================
        // LİSTE VE TABLO EVENT DELEGASYONLARI
        // ==========================================
        // Personel Tablosu: Düzenle / Sil
        var tbodyPersonnel = document.getElementById("tbody-personnel");
        if (tbodyPersonnel) {
            tbodyPersonnel.addEventListener("click", function (e) {
                var editBtn = e.target.closest("[data-edit-pers-id]");
                if (editBtn) {
                    var persId = editBtn.getAttribute("data-edit-pers-id");
                    openEditPersonnelModal(persId);
                    return;
                }
                var delBtn = e.target.closest("[data-del-pers-id]");
                if (delBtn) {
                    var delId = delBtn.getAttribute("data-del-pers-id");
                    deletePersonnel(delId);
                    return;
                }
            });
        }

        // Müdürlükler Ekranı: Düzenle / Sil / Alt Birim Düzenle
        var deptGrid = document.getElementById("departments-grid");
        if (deptGrid) {
            deptGrid.addEventListener("click", function (e) {
                var editDeptBtn = e.target.closest("[data-edit-dept-id]");
                if (editDeptBtn) {
                    var deptId = editDeptBtn.getAttribute("data-edit-dept-id");
                    openEditDepartmentModal(deptId);
                    return;
                }
                var delDeptBtn = e.target.closest("[data-del-dept-id]");
                if (delDeptBtn) {
                    var dId = delDeptBtn.getAttribute("data-del-dept-id");
                    deleteDepartment(dId);
                    return;
                }
                var editSubBtn = e.target.closest("[data-edit-sub-id]");
                if (editSubBtn) {
                    var subId = editSubBtn.getAttribute("data-edit-sub-id");
                    openEditSubUnitModal(subId);
                    return;
                }
            });
        }

        // Zimmet İade Al Butonları
        var assignTbody = document.getElementById("assignments-table-body");
        if (assignTbody) {
            assignTbody.addEventListener("click", function (e) {
                var retBtn = e.target.closest("[data-return-assign-id]");
                if (!retBtn) return;
                var assignId = retBtn.getAttribute("data-return-assign-id");
                if (confirm("Bu zimmetli varlığı iade almak istediğinize emin misiniz?")) {
                    apiRequest("/api/assignments/" + assignId + "/return", {
                        method: "POST",
                        body: JSON.stringify({ note: "Depo yetkilisi tarafından teslim alındı." })
                    }).then(function () {
                        showToast("Zimmet iade işlemi başarıyla gerçekleştirildi.");
                        loadAssignments();
                        refreshAllData();
                    }).catch(function (err) {
                        showToast(err.message, true);
                    });
                }
            });
        }

        // ==========================================
        // BAKIM & ONARIM FORMLARI
        // ==========================================
        var formMaint = document.getElementById("form-maintenance");
        if (formMaint) {
            formMaint.addEventListener("submit", function (e) {
                e.preventDefault();
                var assetIdVal = document.getElementById("maint-asset-id").value;
                if (!assetIdVal) {
                    showToast("Lütfen bakıma alınacak bir varlık seçin.", true);
                    return;
                }
                var descVal = document.getElementById("maint-desc").value.trim();
                if (!descVal) {
                    showToast("Arıza ve işlem açıklaması zorunludur.", true);
                    return;
                }
                var payload = {
                    assetId: Number(assetIdVal),
                    maintenanceType: document.getElementById("maint-type").value,
                    priority: document.getElementById("maint-priority").value,
                    vendorOrTechnician: document.getElementById("maint-vendor").value,
                    issueDescription: descVal,
                    estimatedCost: Number(document.getElementById("maint-cost").value || 0)
                };

                apiRequest("/api/maintenances", {
                    method: "POST",
                    body: JSON.stringify(payload)
                }).then(function (res) {
                    closeModal("modal-maintenance-form");
                    showToast("Bakım iş emri başarıyla oluşturuldu: " + res.orderNo);
                    refreshAllData();
                    loadMaintenances();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // Bakım Tamamla Butonları
        var maintTbody = document.getElementById("maintenances-table-body");
        if (maintTbody) {
            maintTbody.addEventListener("click", function (e) {
                var compBtn = e.target.closest("[data-comp-maint-id]");
                if (!compBtn) return;
                var maintId = Number(compBtn.getAttribute("data-comp-maint-id"));
                var record = currentMaintenancesList.find(function (m) { return m.id === maintId; });

                var form = document.getElementById("form-maint-complete");
                if (form) form.reset();

                document.getElementById("maint-comp-id").value = maintId;
                var infoEl = document.getElementById("maint-comp-info");
                if (infoEl) {
                    infoEl.textContent = (record ? (record.orderNo + " — " + record.assetName) : ("İş Emri #" + maintId));
                }
                var costInput = document.getElementById("maint-comp-cost");
                if (costInput && record) costInput.value = record.cost || "";

                document.getElementById("maint-comp-resolution").value = "Teknik kontrol, bakım ve parça testleri tamamlandı, çalışır vaziyette teslim edildi.";
                openModal("modal-maint-complete");
            });
        }

        var formMaintComp = document.getElementById("form-maint-complete");
        if (formMaintComp) {
            formMaintComp.addEventListener("submit", function (e) {
                e.preventDefault();
                var maintId = document.getElementById("maint-comp-id").value;
                var resVal = document.getElementById("maint-comp-resolution").value.trim();
                var payload = {
                    targetStatus: document.getElementById("maint-comp-status").value,
                    targetCondition: "Çok İyi",
                    returnLocation: "Merkez Taşınır Ana Ambarı",
                    finalCost: Number(document.getElementById("maint-comp-cost").value || 0),
                    resolutionNote: resVal || "Testleri ve bakımı tamamlandı."
                };

                apiRequest("/api/maintenances/" + maintId + "/complete", {
                    method: "POST",
                    body: JSON.stringify(payload)
                }).then(function () {
                    closeModal("modal-maint-complete");
                    showToast("Bakım iş emri başarıyla tamamlandı.");
                    loadMaintenances();
                    refreshAllData();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // ==========================================
        // KURUMSAL YENİ MODÜLLER ETKİNLİK DİNLEYİCİLERİ
        // ==========================================
        var btnOpenStockTx = document.getElementById("btn-open-stock-tx");
        if (btnOpenStockTx) {
            btnOpenStockTx.onclick = function () { openStockTxModal(); };
        }

        var formStockTx = document.getElementById("form-stock-tx");
        if (formStockTx) {
            formStockTx.addEventListener("submit", function (e) {
                e.preventDefault();
                submitStockTx();
            });
        }

        var stockFilterWh = document.getElementById("stock-filter-wh");
        if (stockFilterWh) stockFilterWh.onchange = function () { loadStock(); };
        var stockFilterCat = document.getElementById("stock-filter-cat");
        if (stockFilterCat) stockFilterCat.onchange = function () { loadStock(); };
        var stockFilterStat = document.getElementById("stock-filter-status");
        if (stockFilterStat) stockFilterStat.onchange = function () { loadStock(); };

        var fleetTbody = document.getElementById("fleet-table-body");
        if (fleetTbody) {
            fleetTbody.addEventListener("click", function (e) {
                var btn = e.target.closest("[data-veh-id]");
                if (btn) {
                    var vehId = Number(btn.getAttribute("data-veh-id"));
                    openVehicleStatusModal(vehId);
                }
            });
        }

        var formVehStatus = document.getElementById("form-vehicle-status");
        if (formVehStatus) {
            formVehStatus.addEventListener("submit", function (e) {
                e.preventDefault();
                submitVehicleStatus();
            });
        }

        var fleetFilterType = document.getElementById("fleet-filter-type");
        if (fleetFilterType) fleetFilterType.onchange = function () { loadFleet(); };
        var fleetFilterStat = document.getElementById("fleet-filter-status");
        if (fleetFilterStat) fleetFilterStat.onchange = function () { loadFleet(); };

        var formQuickScan = document.getElementById("form-quick-scan");
        if (formQuickScan) {
            formQuickScan.addEventListener("submit", function (e) {
                e.preventDefault();
                submitQuickScan();
            });
        }

        var formQrLookup = document.getElementById("form-qr-lookup");
        if (formQrLookup) {
            formQrLookup.addEventListener("submit", function (e) {
                e.preventDefault();
                submitQrLookup();
            });
        }

        var btnExportDep = document.getElementById("btn-export-depreciation");
        if (btnExportDep) {
            btnExportDep.onclick = function () { exportDepreciationCsv(); };
        }

        var formSettings = document.getElementById("form-system-settings");
        if (formSettings) {
            formSettings.addEventListener("submit", function (e) {
                e.preventDefault();
                submitSystemSettings();
            });
        }

        var persFilterDept = document.getElementById("pers-filter-dept");
        if (persFilterDept) persFilterDept.onchange = function () { loadPersonnel(); };
        var persFilterQ = document.getElementById("pers-filter-q");
        if (persFilterQ) {
            persFilterQ.oninput = function () {
                var q = this.value.toLowerCase().trim();
                var rows = document.querySelectorAll("#personnel-table-body tr");
                for (var r = 0; r < rows.length; r++) {
                    var txt = rows[r].textContent.toLowerCase();
                    rows[r].style.display = (!q || txt.includes(q)) ? "" : "none";
                }
            };
        }
    }

    // ==========================================
    // 10. CRUD VE DETAY YARDIMCI FONKSİYONLARI
    // ==========================================

    // --- ODA CRUD ---
    function openNewRoomModal(bldId, flrId) {
        var form = document.getElementById("form-new-room");
        if (form) form.reset();
        document.getElementById("nr-id").value = "";
        document.getElementById("modal-new-room-title").textContent = "Yeni Oda / Ambar Tanımla";
        var submitBtn = document.getElementById("btn-save-new-room");
        if (submitBtn) submitBtn.textContent = "Odayı Kaydet";

        var bSelect = document.getElementById("nr-building");
        var fSelect = document.getElementById("nr-floor");
        var dSelect = document.getElementById("nr-dept");
        var subSelect = document.getElementById("nr-subunit");
        var respSelect = document.getElementById("nr-resp");

        Promise.all([
            apiRequest("/api/buildings"),
            apiRequest("/api/departments")
        ]).then(function (res) {
            bSelect.innerHTML = "<option value=''>Bina Seçin...</option>";
            for (var i = 0; i < res[0].length; i++) {
                var o1 = document.createElement("option");
                o1.value = res[0][i].id;
                o1.textContent = res[0][i].name;
                bSelect.appendChild(o1);
            }
            dSelect.innerHTML = "<option value=''>Müdürlük Seçin...</option>";
            for (var j = 0; j < res[1].length; j++) {
                var o2 = document.createElement("option");
                o2.value = res[1][j].id;
                o2.textContent = res[1][j].name;
                dSelect.appendChild(o2);
            }

            if (respSelect) {
                respSelect.innerHTML = "<option value=''>Sorumlu Personel Seçin (Veritabanından)...</option>";
                for (var p = 0; p < cachedPersonnelList.length; p++) {
                    var pe = cachedPersonnelList[p];
                    var po = document.createElement("option");
                    po.value = pe.fullName;
                    po.textContent = pe.fullName + " — " + pe.title + " (" + (pe.departmentName || "") + ")";
                    respSelect.appendChild(po);
                }
            }

            var targetBld = bldId || activeBuildingId;
            if (targetBld) {
                bSelect.value = targetBld;
                apiRequest("/api/floors?buildingId=" + targetBld).then(function (floors) {
                    fSelect.innerHTML = "<option value=''>Kat Seçin...</option>";
                    for (var f = 0; f < floors.length; f++) {
                        var fo = document.createElement("option");
                        fo.value = floors[f].id;
                        fo.textContent = floors[f].floorName;
                        if (flrId && floors[f].id == flrId) fo.selected = true;
                        fSelect.appendChild(fo);
                    }
                });
            } else {
                fSelect.innerHTML = "<option value=''>Önce Bina Seçin...</option>";
            }

            if (subSelect) subSelect.innerHTML = "<option value=''>Önce Müdürlük Seçin...</option>";
            openModal("modal-new-room");
        });
    }

    function openEditRoomModal(roomId) {
        var form = document.getElementById("form-new-room");
        if (form) form.reset();
        document.getElementById("nr-id").value = roomId;
        document.getElementById("modal-new-room-title").textContent = "Odayı / Ambarı Düzenle";
        var submitBtn = document.getElementById("btn-save-new-room");
        if (submitBtn) submitBtn.textContent = "Değişiklikleri Kaydet";

        var bSelect = document.getElementById("nr-building");
        var fSelect = document.getElementById("nr-floor");
        var dSelect = document.getElementById("nr-dept");
        var subSelect = document.getElementById("nr-subunit");
        var respSelect = document.getElementById("nr-resp");

        Promise.all([
            apiRequest("/api/rooms/" + roomId),
            apiRequest("/api/buildings"),
            apiRequest("/api/departments")
        ]).then(function (res) {
            var room = res[0];
            var blds = res[1];
            var depts = res[2];

            bSelect.innerHTML = "<option value=''>Bina Seçin...</option>";
            for (var i = 0; i < blds.length; i++) {
                var o1 = document.createElement("option");
                o1.value = blds[i].id;
                o1.textContent = blds[i].name;
                bSelect.appendChild(o1);
            }
            bSelect.value = room.buildingId;

            dSelect.innerHTML = "<option value=''>Müdürlük Seçin...</option>";
            for (var j = 0; j < depts.length; j++) {
                var o2 = document.createElement("option");
                o2.value = depts[j].id;
                o2.textContent = depts[j].name;
                dSelect.appendChild(o2);
            }
            if (room.departmentId) dSelect.value = room.departmentId;

            apiRequest("/api/floors?buildingId=" + room.buildingId).then(function (floors) {
                fSelect.innerHTML = "<option value=''>Kat Seçin...</option>";
                for (var f = 0; f < floors.length; f++) {
                    var fo = document.createElement("option");
                    fo.value = floors[f].id;
                    fo.textContent = floors[f].floorName;
                    if (room.floorId && floors[f].id == room.floorId) fo.selected = true;
                    fSelect.appendChild(fo);
                }
            });

            if (subSelect && room.departmentId) {
                apiRequest("/api/sub-units?departmentId=" + room.departmentId).then(function (subs) {
                    subSelect.innerHTML = "<option value=''>Alt Birim Seçin (Opsiyonel)...</option>";
                    for (var s = 0; s < subs.length; s++) {
                        var so = document.createElement("option");
                        so.value = subs[s].id;
                        so.textContent = subs[s].name;
                        if (room.subUnitId && subs[s].id == room.subUnitId) so.selected = true;
                        subSelect.appendChild(so);
                    }
                });
            }

            if (respSelect) {
                respSelect.innerHTML = "<option value=''>Sorumlu Personel Seçin (Veritabanından)...</option>";
                for (var p = 0; p < cachedPersonnelList.length; p++) {
                    var pe = cachedPersonnelList[p];
                    var po = document.createElement("option");
                    po.value = pe.fullName;
                    po.textContent = pe.fullName + " — " + pe.title + " (" + (pe.departmentName || "") + ")";
                    if (room.responsiblePerson && pe.fullName === room.responsiblePerson) po.selected = true;
                    respSelect.appendChild(po);
                }
            }

            document.getElementById("nr-number").value = room.roomNumber || "";
            document.getElementById("nr-name").value = room.name || "";
            document.getElementById("nr-type").value = room.roomType || "Ofis";
            document.getElementById("nr-capacity").value = room.capacity || 4;
            document.getElementById("nr-desc").value = room.description || "";

            openModal("modal-new-room");
        }).catch(function (err) {
            showToast("Oda detayları alınamadı: " + err.message, true);
        });
    }

    function deleteRoom(roomId) {
        if (!confirm("Bu odayı/ambarı sistemden silmek istediğinize emin misiniz?")) return;
        apiRequest("/api/rooms/" + roomId, { method: "DELETE" }).then(function () {
            showToast("Oda başarıyla silindi.");
            loadLocations();
            loadDashboard();
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // --- MÜDÜRLÜK CRUD ---
    function openNewDepartmentModal() {
        var form = document.getElementById("form-department");
        if (form) form.reset();
        document.getElementById("dept-form-id").value = "";
        document.getElementById("m-dept-title").textContent = "Yeni Müdürlük Tanımla";
        document.getElementById("btn-save-department").textContent = "Müdürlüğü Kaydet";

        var mgrSelect = document.getElementById("dept-form-manager");
        if (mgrSelect) {
            mgrSelect.innerHTML = "<option value=''>Yönetici Seçin (Veritabanından)...</option>";
            for (var p = 0; p < cachedPersonnelList.length; p++) {
                var pers = cachedPersonnelList[p];
                var opt = document.createElement("option");
                opt.value = pers.fullName;
                opt.textContent = pers.fullName + " — " + pers.title + " (" + (pers.departmentName || "") + ")";
                mgrSelect.appendChild(opt);
            }
        }
        openModal("modal-department-form");
    }

    function openEditDepartmentModal(deptId) {
        var form = document.getElementById("form-department");
        if (form) form.reset();
        document.getElementById("dept-form-id").value = deptId;
        document.getElementById("m-dept-title").textContent = "Müdürlük Bilgilerini Düzenle";
        document.getElementById("btn-save-department").textContent = "Değişiklikleri Kaydet";

        var mgrSelect = document.getElementById("dept-form-manager");
        if (mgrSelect) {
            mgrSelect.innerHTML = "<option value=''>Yönetici Seçin (Veritabanından)...</option>";
            for (var p = 0; p < cachedPersonnelList.length; p++) {
                var pers = cachedPersonnelList[p];
                var opt = document.createElement("option");
                opt.value = pers.fullName;
                opt.textContent = pers.fullName + " — " + pers.title + " (" + (pers.departmentName || "") + ")";
                mgrSelect.appendChild(opt);
            }
        }

        apiRequest("/api/departments/" + deptId).then(function (d) {
            document.getElementById("dept-form-code").value = d.code || "";
            document.getElementById("dept-form-order").value = d.displayOrder || 1;
            document.getElementById("dept-form-name").value = d.name || "";
            if (mgrSelect && d.managerName) mgrSelect.value = d.managerName;
            document.getElementById("dept-form-phone").value = d.phone || "";
            document.getElementById("dept-form-email").value = d.email || "";
            openModal("modal-department-form");
        }).catch(function (err) {
            showToast("Müdürlük bilgisi alınamadı: " + err.message, true);
        });
    }

    function deleteDepartment(deptId) {
        if (!confirm("Bu müdürlüğü silmek istediğinize emin misiniz? (Müdürlüğe bağlı alt birimler ve varlıklar etkilenebilir)")) return;
        apiRequest("/api/departments/" + deptId, { method: "DELETE" }).then(function () {
            showToast("Müdürlük başarıyla silindi.");
            loadDepartments();
            loadDashboard();
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // --- ALT BİRİM CRUD ---
    function openNewSubUnitModal(deptId) {
        var form = document.getElementById("form-subunit");
        if (form) form.reset();
        document.getElementById("sub-form-id").value = "";
        document.getElementById("m-subunit-title").textContent = "Yeni Alt Birim / Şeflik Tanımla";
        document.getElementById("btn-save-subunit").textContent = "Alt Birimi Kaydet";

        var dSelect = document.getElementById("sub-form-dept");
        var mgrSelect = document.getElementById("sub-form-manager");

        apiRequest("/api/departments").then(function (depts) {
            dSelect.innerHTML = "<option value=''>Bağlı Müdürlük Seçin...</option>";
            for (var i = 0; i < depts.length; i++) {
                var opt = document.createElement("option");
                opt.value = depts[i].id;
                opt.textContent = depts[i].name;
                if (deptId && depts[i].id == deptId) opt.selected = true;
                dSelect.appendChild(opt);
            }

            if (mgrSelect) {
                mgrSelect.innerHTML = "<option value=''>Sorumlu Seçin (Veritabanından)...</option>";
                for (var p = 0; p < cachedPersonnelList.length; p++) {
                    var pers = cachedPersonnelList[p];
                    var po = document.createElement("option");
                    po.value = pers.fullName;
                    po.textContent = pers.fullName + " — " + pers.title + " (" + (pers.departmentName || "") + ")";
                    mgrSelect.appendChild(po);
                }
            }

            openModal("modal-subunit-form");
        });
    }

    function openEditSubUnitModal(subUnitId) {
        var form = document.getElementById("form-subunit");
        if (form) form.reset();
        document.getElementById("sub-form-id").value = subUnitId;
        document.getElementById("m-subunit-title").textContent = "Alt Birim & Şeflik Düzenle";
        document.getElementById("btn-save-subunit").textContent = "Değişiklikleri Kaydet";

        var dSelect = document.getElementById("sub-form-dept");
        var mgrSelect = document.getElementById("sub-form-manager");

        Promise.all([
            apiRequest("/api/sub-units/" + subUnitId),
            apiRequest("/api/departments")
        ]).then(function (results) {
            var sub = results[0];
            var depts = results[1];

            dSelect.innerHTML = "<option value=''>Bağlı Müdürlük Seçin...</option>";
            for (var i = 0; i < depts.length; i++) {
                var opt = document.createElement("option");
                opt.value = depts[i].id;
                opt.textContent = depts[i].name;
                if (sub.departmentId && depts[i].id == sub.departmentId) opt.selected = true;
                dSelect.appendChild(opt);
            }

            if (mgrSelect) {
                mgrSelect.innerHTML = "<option value=''>Sorumlu Seçin (Veritabanından)...</option>";
                for (var p = 0; p < cachedPersonnelList.length; p++) {
                    var pers = cachedPersonnelList[p];
                    var po = document.createElement("option");
                    po.value = pers.fullName;
                    po.textContent = pers.fullName + " — " + pers.title + " (" + (pers.departmentName || "") + ")";
                    if (sub.managerName && pers.fullName === sub.managerName) po.selected = true;
                    mgrSelect.appendChild(po);
                }
            }

            document.getElementById("sub-form-code").value = sub.code || "";
            document.getElementById("sub-form-type").value = sub.unitType || "Birim";
            document.getElementById("sub-form-name").value = sub.name || "";
            document.getElementById("sub-form-phone").value = sub.phone || "";
            document.getElementById("sub-form-desc").value = sub.description || "";

            openModal("modal-subunit-form");
        }).catch(function (err) {
            showToast("Alt birim bilgisi alınamadı: " + err.message, true);
        });
    }

    function deleteSubUnit(subUnitId) {
        if (!confirm("Bu alt birimi/şefliği silmek istediğinize emin misiniz?")) return;
        apiRequest("/api/sub-units/" + subUnitId, { method: "DELETE" }).then(function () {
            showToast("Alt birim başarıyla silindi.");
            loadDepartments();
            loadDashboard();
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // --- BİNA CRUD ---
    function openNewBuildingModal() {
        var form = document.getElementById("form-building");
        if (form) form.reset();
        document.getElementById("bld-form-id").value = "";
        document.getElementById("m-bld-title").textContent = "Yeni Hizmet Binası & Tesis Tanımla";
        document.getElementById("btn-save-building").textContent = "Binayı Kaydet";
        openModal("modal-building-form");
    }

    function openEditBuildingModal(bldId) {
        var form = document.getElementById("form-building");
        if (form) form.reset();
        document.getElementById("bld-form-id").value = bldId;
        document.getElementById("m-bld-title").textContent = "Hizmet Binasını Düzenle";
        document.getElementById("btn-save-building").textContent = "Değişiklikleri Kaydet";

        apiRequest("/api/buildings/" + bldId).then(function (b) {
            document.getElementById("bld-form-code").value = b.code || "";
            document.getElementById("bld-form-type").value = b.buildingType || "Hizmet Binası";
            document.getElementById("bld-form-name").value = b.name || "";
            document.getElementById("bld-form-floors").value = b.totalFloors || 3;
            document.getElementById("bld-form-address").value = b.address || "";
            document.getElementById("bld-form-phone").value = b.phone || "";
            document.getElementById("bld-form-desc").value = b.description || "";
            openModal("modal-building-form");
        }).catch(function (err) {
            showToast("Bina bilgisi alınamadı: " + err.message, true);
        });
    }

    function deleteBuilding(bldId) {
        if (!confirm("Bu hizmet binasını ve bağlı tüm kat/oda yapılarını silmek istediğinize emin misiniz?")) return;
        apiRequest("/api/buildings/" + bldId, { method: "DELETE" }).then(function () {
            showToast("Hizmet binası silindi.");
            activeBuildingId = null;
            loadLocations();
            loadDashboard();
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // --- KAT CRUD ---
    function openNewFloorModal(bldId) {
        var form = document.getElementById("form-floor");
        if (form) form.reset();
        document.getElementById("floor-form-id").value = "";
        document.getElementById("m-floor-title").textContent = "Yeni Kat Tanımla";
        document.getElementById("btn-save-floor").textContent = "Katı Kaydet";

        var bSelect = document.getElementById("floor-form-bld");
        apiRequest("/api/buildings").then(function (blds) {
            bSelect.innerHTML = "<option value=''>Hizmet Binası Seçin...</option>";
            for (var i = 0; i < blds.length; i++) {
                var opt = document.createElement("option");
                opt.value = blds[i].id;
                opt.textContent = blds[i].name;
                if ((bldId || activeBuildingId) && blds[i].id == (bldId || activeBuildingId)) opt.selected = true;
                bSelect.appendChild(opt);
            }
            openModal("modal-floor-form");
        });
    }

    function openEditFloorModal(floorId) {
        var form = document.getElementById("form-floor");
        if (form) form.reset();
        document.getElementById("floor-form-id").value = floorId;
        document.getElementById("m-floor-title").textContent = "Kat Bilgilerini Düzenle";
        document.getElementById("btn-save-floor").textContent = "Değişiklikleri Kaydet";

        var bSelect = document.getElementById("floor-form-bld");
        Promise.all([
            apiRequest("/api/floors/" + floorId),
            apiRequest("/api/buildings")
        ]).then(function (results) {
            var f = results[0];
            var blds = results[1];

            bSelect.innerHTML = "<option value=''>Hizmet Binası Seçin...</option>";
            for (var i = 0; i < blds.length; i++) {
                var opt = document.createElement("option");
                opt.value = blds[i].id;
                opt.textContent = blds[i].name;
                if (f.buildingId && blds[i].id == f.buildingId) opt.selected = true;
                bSelect.appendChild(opt);
            }

            document.getElementById("floor-form-code").value = f.floorCode || "";
            document.getElementById("floor-form-name").value = f.floorName || "";
            document.getElementById("floor-form-order").value = f.floorOrder || 1;
            document.getElementById("floor-form-desc").value = f.description || "";

            openModal("modal-floor-form");
        }).catch(function (err) {
            showToast("Kat bilgisi alınamadı: " + err.message, true);
        });
    }

    function deleteFloor(floorId) {
        if (!confirm("Bu katı ve bağlı oda ilişkilerini silmek istediğinize emin misiniz?")) return;
        apiRequest("/api/floors/" + floorId, { method: "DELETE" }).then(function () {
            showToast("Kat başarıyla silindi.");
            loadLocations();
            loadDashboard();
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // --- PERSONEL CRUD ---
    function openNewPersonnelModal() {
        var form = document.getElementById("form-personnel");
        if (form) form.reset();
        document.getElementById("pers-form-id").value = "";
        document.getElementById("m-pers-title").textContent = "Yeni Personel Kaydı Ekle";
        document.getElementById("btn-save-personnel").textContent = "Personeli Kaydet";

        var dSelect = document.getElementById("pers-form-dept");
        var sSelect = document.getElementById("pers-form-subunit");
        var rSelect = document.getElementById("pers-form-room");

        sSelect.innerHTML = "<option value=''>Önce Müdürlük Seçin...</option>";

        Promise.all([
            apiRequest("/api/departments"),
            apiRequest("/api/rooms")
        ]).then(function (res) {
            var depts = res[0];
            var rooms = res[1];

            dSelect.innerHTML = "<option value=''>Bağlı Müdürlük Seçin...</option>";
            for (var d = 0; d < depts.length; d++) {
                var optD = document.createElement("option");
                optD.value = depts[d].id;
                optD.textContent = depts[d].name;
                dSelect.appendChild(optD);
            }

            rSelect.innerHTML = "<option value=''>Çalışma Odası Seçin (Opsiyonel)...</option>";
            for (var r = 0; r < rooms.length; r++) {
                var optR = document.createElement("option");
                optR.value = rooms[r].id;
                optR.textContent = "Oda " + rooms[r].roomNumber + " — " + rooms[r].name + " (" + rooms[r].buildingName + ")";
                rSelect.appendChild(optR);
            }

            openModal("modal-personnel-form");
        });
    }

    function openEditPersonnelModal(persId) {
        var form = document.getElementById("form-personnel");
        if (form) form.reset();
        document.getElementById("pers-form-id").value = persId;
        document.getElementById("m-pers-title").textContent = "Personel Bilgilerini Düzenle";
        document.getElementById("btn-save-personnel").textContent = "Değişiklikleri Kaydet";

        var dSelect = document.getElementById("pers-form-dept");
        var sSelect = document.getElementById("pers-form-subunit");
        var rSelect = document.getElementById("pers-form-room");

        Promise.all([
            apiRequest("/api/personnel/" + persId),
            apiRequest("/api/departments"),
            apiRequest("/api/rooms")
        ]).then(function (res) {
            var p = res[0];
            var depts = res[1];
            var rooms = res[2];

            document.getElementById("pers-form-reg").value = p.registrationNumber || "";
            document.getElementById("pers-form-firstname").value = p.firstName || "";
            document.getElementById("pers-form-lastname").value = p.lastName || "";
            document.getElementById("pers-form-title").value = p.title || "";
            document.getElementById("pers-form-phone").value = p.phone || "";
            document.getElementById("pers-form-email").value = p.email || "";

            dSelect.innerHTML = "<option value=''>Bağlı Müdürlük Seçin...</option>";
            for (var d = 0; d < depts.length; d++) {
                var optD = document.createElement("option");
                optD.value = depts[d].id;
                optD.textContent = depts[d].name;
                if (p.departmentId && depts[d].id == p.departmentId) optD.selected = true;
                dSelect.appendChild(optD);
            }

            if (p.departmentId) {
                apiRequest("/api/sub-units?departmentId=" + p.departmentId).then(function (subs) {
                    sSelect.innerHTML = "<option value=''>Alt Birim Seçin (Opsiyonel)...</option>";
                    for (var s = 0; s < subs.length; s++) {
                        var optS = document.createElement("option");
                        optS.value = subs[s].id;
                        optS.textContent = subs[s].name;
                        if (p.subUnitId && subs[s].id == p.subUnitId) optS.selected = true;
                        sSelect.appendChild(optS);
                    }
                });
            } else {
                sSelect.innerHTML = "<option value=''>Önce Müdürlük Seçin...</option>";
            }

            rSelect.innerHTML = "<option value=''>Çalışma Odası Seçin (Opsiyonel)...</option>";
            for (var r = 0; r < rooms.length; r++) {
                var optR = document.createElement("option");
                optR.value = rooms[r].id;
                optR.textContent = "Oda " + rooms[r].roomNumber + " — " + rooms[r].name + " (" + rooms[r].buildingName + ")";
                if (p.roomId && rooms[r].id == p.roomId) optR.selected = true;
                rSelect.appendChild(optR);
            }

            openModal("modal-personnel-form");
        }).catch(function (err) {
            showToast("Personel bilgisi alınamadı: " + err.message, true);
        });
    }

    function deletePersonnel(persId) {
        if (!confirm("Bu personeli silmek istediğinize emin misiniz?")) return;
        apiRequest("/api/personnel/" + persId, { method: "DELETE" }).then(function () {
            showToast("Personel kaydı silindi.");
            loadPersonnel();
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // --- ZİMMET ARAMA VE SEÇİM ---
    function populateAssignAssetSelect(preselectedId) {
        var select = document.getElementById("assign-asset-id");
        var personSelect = document.getElementById("assign-person");
        var unitSelect = document.getElementById("assign-unit");
        var locSelect = document.getElementById("assign-location");
        var titleInput = document.getElementById("assign-title");
        var noteInput = document.getElementById("assign-note");

        if (titleInput) titleInput.value = "";
        if (noteInput) noteInput.value = "";

        if (select) {
            select.innerHTML = "<option value=''>Varlık Seçin...</option>";
            apiRequest("/api/assets").then(function (assets) {
                for (var i = 0; i < assets.length; i++) {
                    var a = assets[i];
                    var opt = document.createElement("option");
                    opt.value = a.id;
                    opt.textContent = a.code + " — " + a.name + " (" + a.status + " / " + (a.roomName ? ("Oda " + a.roomNumber) : a.location) + ")";
                    if (preselectedId && a.id === preselectedId) opt.selected = true;
                    select.appendChild(opt);
                }
            });
        }

        if (personSelect) {
            personSelect.innerHTML = "<option value=''>Personel Seçin (Veritabanından)...</option>";
            for (var p = 0; p < cachedPersonnelList.length; p++) {
                var pers = cachedPersonnelList[p];
                var optP = document.createElement("option");
                optP.value = pers.id;
                optP.textContent = pers.fullName + " — " + pers.title + " (" + (pers.departmentName || "") + ")";
                personSelect.appendChild(optP);
            }
        }

        if (unitSelect) {
            apiRequest("/api/departments").then(function (depts) {
                unitSelect.innerHTML = "<option value=''>Müdürlük Seçin...</option>";
                for (var d = 0; d < depts.length; d++) {
                    var optD = document.createElement("option");
                    optD.value = depts[d].name;
                    optD.setAttribute("data-dept-id", depts[d].id);
                    optD.textContent = depts[d].name;
                    unitSelect.appendChild(optD);
                }
            });
        }

        if (locSelect) {
            apiRequest("/api/rooms").then(function (rooms) {
                locSelect.innerHTML = "<option value=''>Konum / Oda Seçin...</option>";
                for (var r = 0; r < rooms.length; r++) {
                    var optR = document.createElement("option");
                    optR.value = "Oda " + rooms[r].roomNumber + " — " + rooms[r].name + " (" + rooms[r].buildingName + ")";
                    optR.setAttribute("data-room-id", rooms[r].id);
                    optR.textContent = "Oda " + rooms[r].roomNumber + " — " + rooms[r].name + " (" + rooms[r].buildingName + ")";
                    locSelect.appendChild(optR);
                }
            });
        }
    }

    // --- BAKIM İŞ EMRİ FORMU ---
    function openNewMaintenanceModal(preselectedAssetId) {
        if (currentSession && !currentSession.canWrite) {
            showToast("Salt okunur oturumda bakım iş emri açılamaz. Lütfen yetkili bir kullanıcıyla giriş yapın.", true);
            return;
        }

        var form = document.getElementById("form-maintenance");
        if (form) form.reset();

        var select = document.getElementById("maint-asset-id");
        if (!select) return;

        function populateMaintAssets(assets) {
            select.innerHTML = "<option value=''>Varlık Seçin...</option>";
            for (var i = 0; i < assets.length; i++) {
                var a = assets[i];
                var opt = document.createElement("option");
                opt.value = a.id;
                var locInfo = a.roomName ? ("Oda " + a.roomNumber + " — " + a.roomName) : (a.location || "-");
                opt.textContent = a.code + " — " + a.name + " (" + a.status + " / " + locInfo + ")";
                if (preselectedAssetId && String(a.id) === String(preselectedAssetId)) opt.selected = true;
                select.appendChild(opt);
            }
        }

        // Anında modal penceresini aç
        openModal("modal-maintenance-form");

        if (currentAssetsList && currentAssetsList.length > 0) {
            populateMaintAssets(currentAssetsList);
        } else {
            select.innerHTML = "<option value=''>Varlıklar yükleniyor...</option>";
            apiRequest("/api/assets").then(function (assets) {
                currentAssetsList = assets;
                populateMaintAssets(assets);
            }).catch(function (err) {
                showToast("Varlık listelenemedi: " + err.message, true);
            });
        }
    }

    function openAssetDetailPopup(assetId) {
        apiRequest("/api/assets/" + assetId).then(function (detail) {
            var asset = detail.asset;
            var movements = detail.movements || [];
            var assignments = detail.assignments || [];

            var body = document.getElementById("detail-modal-body");
            if (!body) return;

            var bldFloor = asset.buildingName ? (asset.buildingName + " - " + (asset.floorName || "")) : "-";
            var roomDetail = asset.roomNumber ? ("Oda " + asset.roomNumber + " — " + (asset.roomName || "")) : (asset.location || "-");

            var status = asset.status || "Aktif";
            var isAssigned = asset.assignee && !asset.assignee.toLowerCase().includes("atanmamış");
            var step1Class = "completed";
            var step2Class = "completed";
            var step3Class = "completed";
            var step4Class = isAssigned ? "completed" : (status === "Depoda" ? "active" : "completed");
            var step5Class = status === "Bakımda" ? "active" : (status === "Aktif" ? "active" : (isAssigned ? "completed" : ""));
            var step6Class = status === "Kullanım Dışı" ? "active" : "";

            var stepperHtml =
                "<div class='lifecycle-stepper'>" +
                "<div class='stepper-step " + step1Class + "'><div class='step-num'>✓</div><div class='step-text'>1. Satın Alındı</div></div>" +
                "<div class='stepper-step " + step2Class + "'><div class='step-num'>✓</div><div class='step-text'>2. Taşınır Kaydı</div></div>" +
                "<div class='stepper-step " + step3Class + "'><div class='step-num'>✓</div><div class='step-text'>3. Odaya Yerleşti</div></div>" +
                "<div class='stepper-step " + step4Class + "'><div class='step-num'>" + (isAssigned ? "✓" : "4") + "</div><div class='step-text'>4. Zimmetlendi</div></div>" +
                "<div class='stepper-step " + step5Class + "'><div class='step-num'>" + (status === "Bakımda" ? "🔧" : "✓") + "</div><div class='step-text'>5. Kullanım &amp; Bakım</div></div>" +
                "<div class='stepper-step " + step6Class + "'><div class='step-num'>" + (status === "Kullanım Dışı" ? "✕" : "6") + "</div><div class='step-text'>6. Hurda / Düşüm</div></div>" +
                "</div>";

            var lifecycle = asset.lifecycleStatus || "KULLANIMDA";
            var transitions = detail.availableTransitions || [];

            var transitionButtonsHtml = "";
            if (transitions.length > 0) {
                transitionButtonsHtml =
                    "<div style='margin-top:1rem;padding:0.85rem;background:#f8fafc;border-radius:8px;border:1px solid var(--gray-200);'>" +
                    "<div style='font-size:0.85rem;font-weight:700;color:var(--navy-900);margin-bottom:0.5rem;'>⚡ Yaşam Döngüsü Durum Geçişleri (Yetkili Eylemler):</div>" +
                    "<div style='display:flex;gap:0.5rem;flex-wrap:wrap;'>" +
                    transitions.map(function (t) {
                        return "<button type='button' class='btn-action-sm btn-lifecycle-trans' data-target='" + t + "'>➔ " + getLifecycleLabel(t) + "</button>";
                    }).join("") +
                    "</div></div>";
            }

            body.innerHTML =
                stepperHtml +
                "<div class='room-hero-card'>" +
                "<div class='room-hero-header'>" +
                "<div>" +
                "<span class='status-badge " + getStatusClass(lifecycle) + "'>" + escapeHtml(getLifecycleLabel(lifecycle)) + "</span>" +
                "<span class='status-badge " + getStatusClass(asset.status) + "' style='margin-left:0.3rem;opacity:0.85;'>(" + escapeHtml(asset.status) + ")</span>" +
                "<h3 style='font-size:1.3rem;margin:0.3rem 0;color:var(--navy-900);'>" + escapeHtml(asset.name) + "</h3>" +
                "<p style='color:var(--gray-600);font-size:0.85rem;'>Kod: <strong>" + escapeHtml(asset.code) + "</strong> &bull; Barkod: <strong>" + escapeHtml(asset.barcode || "-") + "</strong></p>" +
                "</div>" +
                "<div class='room-qr-box'>" +
                "<div class='qr-placeholder'>QR</div>" +
                "<code>" + escapeHtml(asset.roomQrCode || asset.code) + "</code>" +
                "</div>" +
                "</div>" +
                "<div class='room-meta-grid'>" +
                "<div><strong>Bina &amp; Kat:</strong> " + escapeHtml(bldFloor) + "</div>" +
                "<div><strong>Oda / Ambar:</strong> " + escapeHtml(roomDetail) + "</div>" +
                "<div><strong>Müdürlük:</strong> " + escapeHtml(asset.departmentName || asset.unit) + "</div>" +
                "<div><strong>Sorumlu Personel:</strong> " + escapeHtml(asset.assignee || "Atanmamış") + "</div>" +
                "<div><strong>Kategori:</strong> " + escapeHtml(asset.category) + "</div>" +
                "<div><strong>Kondisyon:</strong> " + escapeHtml(asset.condition || "Çok İyi") + "</div>" +
                "<div><strong>Tahmini Değer:</strong> " + formatCurrency(asset.estimatedValue) + "</div>" +
                "<div><strong>Son Güncelleme:</strong> " + escapeHtml(asset.updatedAt || "-") + "</div>" +
                "</div>" +
                "<div style='margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;border-top:1px solid var(--gray-200);padding-top:0.75rem;'>" +
                "<button type='button' class='btn-action-sm' id='pop-btn-maint'>🔧 Bakım İş Emri Aç</button>" +
                "<button type='button' class='btn-action-sm' id='pop-btn-trans'>🚚 Konum / Oda Transfer Et</button>" +
                "<button type='button' class='btn-action-sm' id='pop-btn-assign'>📋 Zimmet Ata</button>" +
                "</div>" +
                transitionButtonsHtml +
                "</div>" +
                "<h4 style='margin-top:1.2rem;margin-bottom:0.5rem;'>Konum ve Zimmet Geçmişi (" + movements.length + " Hareket)</h4>" +
                "<div class='table-responsive' style='max-height:200px;overflow-y:auto;'>" +
                "<table class='data-table'><thead><tr><th>Tarih</th><th>İşlem</th><th>Nereden</th><th>Nereye</th><th>İşlemi Yapan</th></tr></thead><tbody>" +
                (movements.length === 0 ? "<tr><td colspan='5'>Hareket kaydı bulunamadı.</td></tr>" :
                    movements.map(function (m) {
                        return "<tr><td>" + escapeHtml(m.timestamp) + "</td><td><span class='status-badge status-aktif'>" + escapeHtml(m.typeLabel) + "</span></td><td>" + escapeHtml(m.fromLocation || "-") + "</td><td><strong>" + escapeHtml(m.toLocation) + "</strong></td><td>" + escapeHtml(m.performedBy) + "</td></tr>";
                    }).join("")) +
                "</tbody></table></div>";

            var transBtns = body.querySelectorAll(".btn-lifecycle-trans");
            for (var tb = 0; tb < transBtns.length; tb++) {
                (function (btn) {
                    btn.onclick = function () {
                        var target = btn.getAttribute("data-target");
                        var label = getLifecycleLabel(target);
                        var reason = prompt("'" + asset.name + "' varlığını '" + label + "' durumuna geçirmek için gerekçe giriniz:", "Operasyonel süreç gereği durum geçişi");
                        if (reason === null) return;
                        apiRequest("/api/assets/" + asset.id + "/transition", {
                            method: "POST",
                            body: JSON.stringify({ targetStatus: target, reason: reason })
                        }).then(function (res) {
                            showToast("Yaşam döngüsü durumu güncellendi: " + label);
                            openAssetDetailPopup(asset.id);
                            loadAssetsTable();
                        }).catch(function (err) {
                            showToast("Durum geçişi başarısız: " + (err.message || err), true);
                        });
                    };
                })(transBtns[tb]);
            }

            var popMaint = document.getElementById("pop-btn-maint");
            if (popMaint) popMaint.onclick = function () { closeModal("modal-detail"); openNewMaintenanceModal(asset.id); };

            var popTrans = document.getElementById("pop-btn-trans");
            if (popTrans) popTrans.onclick = function () { closeModal("modal-detail"); openTransferModal(asset.id); };

            var popAssign = document.getElementById("pop-btn-assign");
            if (popAssign) popAssign.onclick = function () { closeModal("modal-detail"); populateAssignAssetSelect(asset.id); openModal("modal-assign-form"); };

            openModal("modal-detail");
        });
    }

    // ==========================================
    // 21. AKILLI BİLDİRİMLER (SMART ALERTS)
    // ==========================================
    function loadSmartAlerts() {
        var container = document.getElementById("dash-alerts-container");
        var listEl = document.getElementById("dash-alerts-list");
        var badge = document.getElementById("dash-alerts-badge");
        if (!container || !listEl) return;

        apiRequest("/api/alerts").then(function (alerts) {
            currentAlertsList = alerts;
            if (alerts.length === 0) {
                container.hidden = true;
                return;
            }
            container.hidden = false;
            if (badge) badge.textContent = alerts.length + " Kritik / Yaklaşan Uyarı";

            listEl.innerHTML = alerts.map(function (al) {
                var sevClass = "sev-info";
                var icon = "ℹ️";
                if (al.severity === "CRITICAL") {
                    sevClass = "sev-critical";
                    icon = "🚨";
                } else if (al.severity === "WARNING") {
                    sevClass = "sev-warning";
                    icon = "⚠️";
                }

                return "<div class='alert-chip-item " + sevClass + "' data-alert-view='" + escapeHtml(al.linkView) + "'>" +
                    "<div style='display:flex;align-items:center;justify-content:space-between;'>" +
                    "<strong>" + icon + " " + escapeHtml(al.title) + "</strong>" +
                    "<span style='font-size:0.75rem;font-weight:700;color:var(--gray-600);'>" + escapeHtml(al.dateInfo) + "</span>" +
                    "</div>" +
                    "<p style='font-size:0.83rem;color:var(--gray-700);margin-top:0.2rem;'>" + escapeHtml(al.description) + "</p>" +
                    "</div>";
            }).join("");

            var items = listEl.querySelectorAll(".alert-chip-item");
            for (var i = 0; i < items.length; i++) {
                items[i].onclick = function () {
                    var targetView = this.getAttribute("data-alert-view");
                    if (targetView) switchView(targetView);
                };
            }
        }).catch(function () {});
    }

    // ==========================================
    // 22. PERSONEL YÖNETİMİ
    // ==========================================
    function loadPersonnel() {
        var tbody = document.getElementById("personnel-table-body") || document.getElementById("tbody-personnel");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='8' class='loading-cell'>Belediye personeli yükleniyor...</td></tr>";

        var deptFilter = document.getElementById("pers-filter-dept") || document.getElementById("filter-pers-dept");
        var deptId = (deptFilter && deptFilter.value) ? deptFilter.value : "";

        if (deptFilter && deptFilter.options.length <= 1) {
            apiRequest("/api/departments").then(function (depts) {
                currentDepartmentsList = depts;
                deptFilter.innerHTML = "<option value=''>Tüm Müdürlükler (" + depts.length + ")</option>";
                for (var d = 0; d < depts.length; d++) {
                    var opt = document.createElement("option");
                    opt.value = depts[d].id;
                    opt.textContent = depts[d].name;
                    deptFilter.appendChild(opt);
                }
            });
        }

        var url = "/api/personnel" + (deptId ? "?departmentId=" + deptId : "");
        apiRequest(url).then(function (list) {
            if (list.length === 0) {
                tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>Personel kaydı bulunamadı.</td></tr>";
                return;
            }
            tbody.innerHTML = list.map(function (p) {
                var contact = [];
                if (p.phone) contact.push("📞 " + escapeHtml(p.phone));
                if (p.email) contact.push("✉️ " + escapeHtml(p.email));

                return "<tr>" +
                    "<td><code>" + escapeHtml(p.registrationNumber || "-") + "</code></td>" +
                    "<td><strong>" + escapeHtml(p.fullName) + "</strong></td>" +
                    "<td><span class='category-badge'>" + escapeHtml(p.title || "Personel") + "</span></td>" +
                    "<td>" + escapeHtml(p.departmentName || "-") + "</td>" +
                    "<td>" + escapeHtml(p.subUnitName || "-") + "</td>" +
                    "<td>" + (p.roomNumber ? ("Oda " + escapeHtml(p.roomNumber) + " (" + escapeHtml(p.roomName || "") + ")") : "-") + "</td>" +
                    "<td>" + (contact.length > 0 ? contact.join("<br>") : "-") + "</td>" +
                    "<td><span class='status-badge status-aktif'>Faal / Görevde</span></td>" +
                    "</tr>";
            }).join("");
        }).catch(function (err) {
            tbody.innerHTML = "<tr><td colspan='8' class='loading-cell'>Hata: " + escapeHtml(err.message) + "</td></tr>";
        });
    }

    // ==========================================
    // 23. DEPO & STOK YÖNETİMİ
    // ==========================================
    var currentStockList = [];

    function loadStock() {
        var tbody = document.getElementById("stock-table-body");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='10' class='loading-cell'>Stok verileri yükleniyor...</td></tr>";

        var wh = (document.getElementById("stock-filter-wh") || {}).value || "";
        var cat = (document.getElementById("stock-filter-cat") || {}).value || "";
        var stat = (document.getElementById("stock-filter-status") || {}).value || "";

        var params = new URLSearchParams();
        if (wh) params.append("warehouse", wh);
        if (cat) params.append("category", cat);
        if (stat) params.append("status", stat);

        apiRequest("/api/stock?" + params.toString()).then(function (items) {
            currentStockList = items;
            var totalItems = items.length;
            var criticalCount = 0;
            var totalVal = 0;
            var whSet = {};

            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                if (it.status === "KRITIK" || it.status === "TUKENDI") criticalCount++;
                totalVal += (it.currentQuantity || 0) * (it.unitPrice || 0);
                if (it.warehouseName) whSet[it.warehouseName] = true;
            }

            var kTot = document.getElementById("kpi-stock-total");
            if (kTot) kTot.textContent = totalItems;
            var kCrit = document.getElementById("kpi-stock-critical");
            if (kCrit) kCrit.textContent = criticalCount;
            var kVal = document.getElementById("kpi-stock-value");
            if (kVal) kVal.textContent = formatCurrency(totalVal);
            var kWh = document.getElementById("kpi-stock-warehouses");
            if (kWh) kWh.textContent = Object.keys(whSet).length || 5;

            if (items.length === 0) {
                tbody.innerHTML = "<tr><td colspan='10' style='text-align:center;'>Filtrelere uygun stok kalemi bulunamadı.</td></tr>";
            } else {
                tbody.innerHTML = items.map(function (it) {
                    var statusBadge = "<span class='status-badge status-aktif'>Normal</span>";
                    if (it.status === "KRITIK") {
                        statusBadge = "<span class='status-badge' style='background:#fee2e2;color:#b91c1c;'>Kritik Stok</span>";
                    } else if (it.status === "TUKENDI") {
                        statusBadge = "<span class='status-badge' style='background:#f1f5f9;color:#64748b;'>Tükendi</span>";
                    }
                    var itemTotVal = (it.currentQuantity || 0) * (it.unitPrice || 0);

                    return "<tr>" +
                        "<td><code>" + escapeHtml(it.itemCode) + "</code></td>" +
                        "<td><strong>" + escapeHtml(it.itemName) + "</strong></td>" +
                        "<td><span class='category-badge'>" + escapeHtml(it.category) + "</span></td>" +
                        "<td>" + escapeHtml(it.warehouseName) + "</td>" +
                        "<td><strong style='font-size:1.05rem;'>" + it.currentQuantity + "</strong> " + escapeHtml(it.unit) + "</td>" +
                        "<td>" + it.minThreshold + " " + escapeHtml(it.unit) + "</td>" +
                        "<td>" + formatCurrency(it.unitPrice) + "</td>" +
                        "<td class='value-cell'>" + formatCurrency(itemTotVal) + "</td>" +
                        "<td>" + statusBadge + "</td>" +
                        "<td><button type='button' class='btn-action-sm' data-stock-tx-id='" + it.id + "'>Hareket Yap</button></td>" +
                        "</tr>";
                }).join("");

                var txBtns = tbody.querySelectorAll("[data-stock-tx-id]");
                for (var b = 0; b < txBtns.length; b++) {
                    txBtns[b].onclick = function () {
                        var id = Number(this.getAttribute("data-stock-tx-id"));
                        openStockTxModal(id);
                    };
                }
            }

            loadStockTransactions();
        }).catch(function (err) {
            tbody.innerHTML = "<tr><td colspan='10' class='loading-cell'>Hata: " + escapeHtml(err.message) + "</td></tr>";
        });
    }

    function loadStockTransactions() {
        var tbody = document.getElementById("stock-tx-table-body");
        if (!tbody) return;
        apiRequest("/api/stock/transactions").then(function (txs) {
            if (txs.length === 0) {
                tbody.innerHTML = "<tr><td colspan='9' style='text-align:center;'>Henüz stok hareketi kaydedilmemiş.</td></tr>";
                return;
            }
            tbody.innerHTML = txs.map(function (tx) {
                var typeBadge = tx.txType === "GIRIS"
                    ? "<span class='status-badge status-aktif'>Giriş (İkmal)</span>"
                    : "<span class='status-badge status-bakimda'>Çıkış (Tahsis)</span>";
                return "<tr>" +
                    "<td><code>" + escapeHtml(tx.transactionCode) + "</code></td>" +
                    "<td>" + escapeHtml(tx.txDate) + "</td>" +
                    "<td><strong>" + escapeHtml(tx.itemName) + "</strong></td>" +
                    "<td>" + typeBadge + "</td>" +
                    "<td><strong>" + tx.quantity + "</strong> " + escapeHtml(tx.unit) + "</td>" +
                    "<td>" + escapeHtml(tx.departmentName || "-") + "</td>" +
                    "<td>" + escapeHtml(tx.recipientName || "-") + "</td>" +
                    "<td>" + escapeHtml(tx.performedBy) + "</td>" +
                    "<td>" + escapeHtml(tx.notes || "-") + "</td>" +
                    "</tr>";
            }).join("");
        }).catch(function () {});
    }

    function openStockTxModal(preselectedItemId) {
        var form = document.getElementById("form-stock-tx");
        if (form) form.reset();
        var sel = document.getElementById("stx-item-id");
        if (sel) {
            sel.innerHTML = "<option value=''>Malzeme Seçin...</option>";
            for (var i = 0; i < currentStockList.length; i++) {
                var it = currentStockList[i];
                var opt = document.createElement("option");
                opt.value = it.id;
                opt.textContent = it.itemCode + " — " + it.itemName + " (Mevcut: " + it.currentQuantity + " " + it.unit + ")";
                if (preselectedItemId && it.id === preselectedItemId) opt.selected = true;
                sel.appendChild(opt);
            }
        }
        var deptSel = document.getElementById("stx-dept");
        if (deptSel && deptSel.options.length <= 1) {
            apiRequest("/api/departments").then(function (depts) {
                for (var d = 0; d < depts.length; d++) {
                    var opt = document.createElement("option");
                    opt.value = depts[d].id;
                    opt.textContent = depts[d].name;
                    deptSel.appendChild(opt);
                }
            });
        }
        openModal("modal-stock-tx");
    }

    function submitStockTx() {
        var itemId = document.getElementById("stx-item-id").value;
        var txType = document.getElementById("stx-type").value;
        var qty = Number(document.getElementById("stx-qty").value || 0);
        var deptSel = document.getElementById("stx-dept");
        var deptId = deptSel ? deptSel.value : null;
        var deptName = (deptSel && deptSel.selectedIndex > 0) ? deptSel.options[deptSel.selectedIndex].textContent : "";
        var recipient = document.getElementById("stx-recipient").value.trim();
        var notes = document.getElementById("stx-notes").value.trim();

        if (!itemId || qty <= 0) {
            showToast("Lütfen malzeme ve geçerli bir miktar girin.", true);
            return;
        }

        var payload = {
            stockItemId: Number(itemId),
            txType: txType,
            quantity: qty,
            departmentId: deptId ? Number(deptId) : null,
            departmentName: deptName,
            recipientName: recipient,
            notes: notes
        };

        apiRequest("/api/stock/transactions", {
            method: "POST",
            body: JSON.stringify(payload)
        }).then(function () {
            closeModal("modal-stock-tx");
            showToast("Stok hareketi başarıyla işlendi.");
            loadStock();
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // ==========================================
    // 24. ARAÇ & FİLO VE İŞ MAKİNELERİ
    // ==========================================
    var currentFleetList = [];

    function loadFleet() {
        var tbody = document.getElementById("fleet-table-body");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='12' class='loading-cell'>Filo araçları yükleniyor...</td></tr>";

        var vType = (document.getElementById("fleet-filter-type") || {}).value || "";
        var vStat = (document.getElementById("fleet-filter-status") || {}).value || "";

        var params = new URLSearchParams();
        if (vType) params.append("vehicleType", vType);
        if (vStat) params.append("status", vStat);

        apiRequest("/api/fleet?" + params.toString()).then(function (vehicles) {
            currentFleetList = vehicles;
            var totalVehicles = vehicles.length;
            var activeCount = 0;
            var maintCount = 0;
            var inspAlertCount = 0;

            var today = new Date();
            var alertDate = new Date();
            alertDate.setDate(today.getDate() + 45);

            for (var i = 0; i < vehicles.length; i++) {
                var v = vehicles[i];
                if (v.status === "Görevde" || v.status === "Göreve Hazır") activeCount++;
                if (v.status && v.status.includes("Bakım")) maintCount++;
                if (v.inspectionDate) {
                    var inspD = new Date(v.inspectionDate);
                    if (inspD <= alertDate) inspAlertCount++;
                }
            }

            var kTot = document.getElementById("kpi-fleet-total");
            if (kTot) kTot.textContent = totalVehicles;
            var kAct = document.getElementById("kpi-fleet-active");
            if (kAct) kAct.textContent = activeCount;
            var kMnt = document.getElementById("kpi-fleet-maint");
            if (kMnt) kMnt.textContent = maintCount;
            var kInsp = document.getElementById("kpi-fleet-insp");
            if (kInsp) kInsp.textContent = inspAlertCount;

            if (vehicles.length === 0) {
                tbody.innerHTML = "<tr><td colspan='12' style='text-align:center;'>Filtreye uygun araç bulunamadı.</td></tr>";
                return;
            }

            tbody.innerHTML = vehicles.map(function (v) {
                var inspBadge = escapeHtml(v.inspectionDate || "-");
                if (v.inspectionDate) {
                    var d = new Date(v.inspectionDate);
                    var diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) {
                        inspBadge = "<span class='status-badge' style='background:#fee2e2;color:#b91c1c;'>" + escapeHtml(v.inspectionDate) + " (" + Math.abs(diffDays) + " gün gecikti!)</span>";
                    } else if (diffDays <= 30) {
                        inspBadge = "<span class='status-badge' style='background:#fef3c7;color:#92400e;'>" + escapeHtml(v.inspectionDate) + " (" + diffDays + " gün kaldı)</span>";
                    }
                }

                var statClass = "status-aktif";
                if (v.status && v.status.includes("Bakım")) statClass = "status-bakimda";
                else if (v.status === "Gayrifaal") statClass = "status-hurda";

                return "<tr>" +
                    "<td><strong style='font-size:1.05rem;color:var(--navy-900);'>" + escapeHtml(v.plateNumber) + "</strong><br><code style='font-size:0.75rem;'>" + escapeHtml(v.vehicleCode) + "</code></td>" +
                    "<td><span class='category-badge'>" + escapeHtml(v.vehicleType) + "</span></td>" +
                    "<td><strong>" + escapeHtml(v.brandModel) + "</strong></td>" +
                    "<td>" + v.modelYear + "</td>" +
                    "<td>" + escapeHtml(v.departmentName) + "</td>" +
                    "<td>" + escapeHtml(v.assignedDriver || "Atanmamış") + "</td>" +
                    "<td><strong>" + (v.currentKm || 0).toLocaleString("tr-TR") + "</strong> km</td>" +
                    "<td>" + escapeHtml(v.fuelType) + "</td>" +
                    "<td>" + inspBadge + "</td>" +
                    "<td><span style='font-size:0.8rem;'>" + escapeHtml(v.insuranceDate || "-") + "</span></td>" +
                    "<td><span class='status-badge " + statClass + "'>" + escapeHtml(v.status) + "</span></td>" +
                    "<td><button type='button' class='btn-action-sm' data-veh-id='" + v.id + "'>Durum Güncelle</button></td>" +
                    "</tr>";
            }).join("");
        }).catch(function (err) {
            tbody.innerHTML = "<tr><td colspan='12' class='loading-cell'>Hata: " + escapeHtml(err.message) + "</td></tr>";
        });
    }

    function openVehicleStatusModal(vehId) {
        var v = currentFleetList.find(function (item) { return item.id === vehId; });
        if (!v) return;
        document.getElementById("veh-id").value = v.id;
        document.getElementById("veh-info").textContent = v.plateNumber + " — " + v.brandModel + " (" + v.departmentName + ")";
        document.getElementById("veh-status").value = v.status || "Görevde";
        document.getElementById("veh-km").value = v.currentKm || 0;
        document.getElementById("veh-driver").value = v.assignedDriver || "";
        openModal("modal-vehicle-status");
    }

    function submitVehicleStatus() {
        var id = document.getElementById("veh-id").value;
        var payload = {
            status: document.getElementById("veh-status").value,
            currentKm: Number(document.getElementById("veh-km").value || 0),
            assignedDriver: document.getElementById("veh-driver").value.trim()
        };

        apiRequest("/api/fleet/" + id + "/status", {
            method: "POST",
            body: JSON.stringify(payload)
        }).then(function () {
            closeModal("modal-vehicle-status");
            showToast("Araç durumu başarıyla güncellendi.");
            loadFleet();
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // ==========================================
    // 25. SATIN ALMA VE TEDARİK
    // ==========================================
    function loadProcurement() {
        var tbody = document.getElementById("procurement-table-body");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='10' class='loading-cell'>Satın alma dosyaları yükleniyor...</td></tr>";

        apiRequest("/api/procurement").then(function (orders) {
            if (orders.length === 0) {
                tbody.innerHTML = "<tr><td colspan='10' style='text-align:center;'>Satın alma kaydı bulunamadı.</td></tr>";
                return;
            }

            tbody.innerHTML = orders.map(function (o) {
                var statBadge = "<span class='status-badge status-aktif'>" + escapeHtml(o.status) + "</span>";
                if (o.status === "TALEP_ALINDI") statBadge = "<span class='status-badge' style='background:#fef3c7;color:#92400e;'>Talep Alındı</span>";
                else if (o.status === "IHALEDE") statBadge = "<span class='status-badge' style='background:#dbeafe;color:#1e40af;'>İhalede</span>";
                else if (o.status === "TESLIM_EDILDI") statBadge = "<span class='status-badge status-aktif'>Teslim Edildi</span>";

                return "<tr>" +
                    "<td><code>" + escapeHtml(o.orderNo) + "</code></td>" +
                    "<td><strong>" + escapeHtml(o.title) + "</strong></td>" +
                    "<td>" + escapeHtml(o.departmentName) + "</td>" +
                    "<td><span class='category-badge'>" + escapeHtml(o.procurementType) + "</span></td>" +
                    "<td>" + escapeHtml(o.supplierName) + "</td>" +
                    "<td>" + formatCurrency(o.estimatedBudget) + "</td>" +
                    "<td class='value-cell'>" + (o.finalAmount ? formatCurrency(o.finalAmount) : "-") + "</td>" +
                    "<td>" + escapeHtml(o.orderDate) + "</td>" +
                    "<td>" + escapeHtml(o.deliveryDate || "-") + "</td>" +
                    "<td>" + statBadge + "</td>" +
                    "</tr>";
            }).join("");
        }).catch(function (err) {
            tbody.innerHTML = "<tr><td colspan='10' class='loading-cell'>Hata: " + escapeHtml(err.message) + "</td></tr>";
        });
    }

    // ==========================================
    // 26. SAYIM & ENVANTER KONTROLÜ
    // ==========================================
    var currentAuditsList = [];

    function loadCounting() {
        var tbody = document.getElementById("audit-scans-table-body");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='8' class='loading-cell'>Sayım kayıtları yükleniyor...</td></tr>";

        apiRequest("/api/audits").then(function (audits) {
            currentAuditsList = audits;
            if (audits.length > 0) {
                var a = audits[0];
                var hTitle = document.getElementById("audit-hero-title");
                if (hTitle) hTitle.textContent = a.title;
                var hCode = document.getElementById("audit-hero-code");
                if (hCode) hCode.textContent = a.auditCode;
                var hLead = document.getElementById("audit-hero-lead");
                if (hLead) hLead.textContent = a.leadAuditor;
                var sExp = document.getElementById("audit-stat-exp");
                if (sExp) sExp.textContent = a.totalExpected;
                var sScn = document.getElementById("audit-stat-scanned");
                if (sScn) sScn.textContent = a.totalScanned;
                var sMis = document.getElementById("audit-stat-missing");
                if (sMis) sMis.textContent = a.totalMissing;
                var sExc = document.getElementById("audit-stat-excess");
                if (sExc) sExc.textContent = a.totalExcess;

                loadAuditScans(a.id);
            }
        });
    }

    function loadAuditScans(auditId) {
        var tbody = document.getElementById("audit-scans-table-body");
        if (!tbody) return;
        apiRequest("/api/audits/" + auditId + "/scans").then(function (scans) {
            if (scans.length === 0) {
                tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>Bu sayım oturumunda henüz barkod okutulmadı.</td></tr>";
                return;
            }
            tbody.innerHTML = scans.map(function (s) {
                var matchBadge = "<span class='status-badge status-aktif'>✓ Doğru Konum</span>";
                if (s.matchStatus === "FARKLI_KONUMDA") {
                    matchBadge = "<span class='status-badge' style='background:#fef3c7;color:#92400e;'>⚠️ Farklı Konumda</span>";
                } else if (s.matchStatus === "FAZLA_KAYITSIZ") {
                    matchBadge = "<span class='status-badge' style='background:#dbeafe;color:#1e40af;'>ℹ️ Kayıtsız Varlık</span>";
                }
                return "<tr>" +
                    "<td>" + escapeHtml(s.scannedAt) + "</td>" +
                    "<td><code>" + escapeHtml(s.assetCode) + "</code></td>" +
                    "<td><strong>" + escapeHtml(s.assetName) + "</strong></td>" +
                    "<td>" + escapeHtml(s.expectedLocation || "-") + "</td>" +
                    "<td><strong style='color:var(--navy-900);'>" + escapeHtml(s.scannedLocation) + "</strong></td>" +
                    "<td>" + matchBadge + "</td>" +
                    "<td>" + escapeHtml(s.scannedBy) + "</td>" +
                    "<td>" + escapeHtml(s.notes || "-") + "</td>" +
                    "</tr>";
            }).join("");
        });
    }

    function submitQuickScan() {
        var code = document.getElementById("scan-input-code").value.trim();
        var loc = document.getElementById("scan-input-loc").value.trim();
        var fb = document.getElementById("scan-feedback-box");
        if (!code) return;

        var auditId = (currentAuditsList.length > 0) ? currentAuditsList[0].id : 1;

        apiRequest("/api/audits/" + auditId + "/scan", {
            method: "POST",
            body: JSON.stringify({ assetCode: code, scannedLocation: loc })
        }).then(function (res) {
            if (fb) {
                fb.style.display = "block";
                fb.style.background = "#f0fdf4";
                fb.style.color = "#166534";
                fb.style.border = "1px solid #bbf7d0";
                fb.textContent = "✓ " + code + " başarıyla sayıma işlendi ve konumu doğrulandı.";
            }
            document.getElementById("scan-input-code").value = "";
            document.getElementById("scan-input-code").focus();
            loadCounting();
        }).catch(function (err) {
            if (fb) {
                fb.style.display = "block";
                fb.style.background = "#fff1f2";
                fb.style.color = "#9f1239";
                fb.style.border = "1px solid #fecdd3";
                fb.textContent = "Hata: " + err.message;
            }
        });
    }

    // ==========================================
    // 27. QR KOD VE ETİKET YÖNETİMİ
    // ==========================================
    function loadQRCodes() {
        var container = document.getElementById("qr-labels-container");
        if (!container) return;

        var listToRender = currentAssetsList.length > 0 ? currentAssetsList.slice(0, 18) : [];
        if (listToRender.length === 0) {
            apiRequest("/api/assets").then(function (assets) {
                currentAssetsList = assets;
                renderQRLabels(assets.slice(0, 18));
            });
        } else {
            renderQRLabels(listToRender);
        }
    }

    function renderQRLabels(assets) {
        var container = document.getElementById("qr-labels-container");
        if (!container) return;
        container.innerHTML = assets.map(function (a) {
            var roomStr = a.roomNumber ? ("Oda " + a.roomNumber) : (a.location || "-");

            return "<div class='qr-label-card'>" +
                "<div class='qr-label-qr'><span>QR</span><span style='font-size:0.55rem;margin-top:2px;'>" + escapeHtml(a.code.substring(0, 12)) + "</span></div>" +
                "<div class='qr-label-info'>" +
                "<div class='qr-label-muni'>T.C. GEBZE BELEDİYESİ</div>" +
                "<div class='qr-label-name' title='" + escapeHtml(a.name) + "'>" + escapeHtml(a.name) + "</div>" +
                "<div class='qr-label-meta'>" +
                "<strong>Kod:</strong> " + escapeHtml(a.code) + "<br>" +
                "<strong>TİF:</strong> " + escapeHtml(a.tifCode || "255.02.01") + " &bull; <strong>Konum:</strong> " + escapeHtml(roomStr) + "<br>" +
                "<strong>Müdürlük:</strong> " + escapeHtml(a.departmentName || a.unit || "-") +
                "</div>" +
                "</div>" +
                "</div>";
        }).join("");
    }

    function submitQrLookup() {
        var input = document.getElementById("qr-lookup-input").value.trim();
        var resultBox = document.getElementById("qr-lookup-result");
        if (!input || !resultBox) return;

        resultBox.hidden = false;
        resultBox.innerHTML = "<div class='loading-cell'>Varlık hiyerarşisi ve zimmet geçmişi sorgulanıyor...</div>";

        apiRequest("/api/assets?query=" + encodeURIComponent(input)).then(function (assets) {
            if (assets.length === 0) {
                resultBox.innerHTML = "<div class='empty-card'><h3>Sistemde kayıtlı varlık bulunamadı.</h3><p>Girdiğiniz QR kod veya barkod Gebze Belediyesi taşınır envanterinde yer almıyor.</p></div>";
                return;
            }
            var a = assets[0];
            apiRequest("/api/assets/" + a.id).then(function (detail) {
                var asset = detail.asset;
                var movements = detail.movements || [];
                var bldFloor = asset.buildingName ? (asset.buildingName + " - " + (asset.floorName || "")) : "-";
                var roomStr = asset.roomNumber ? ("Oda " + asset.roomNumber + " — " + (asset.roomName || "")) : (asset.location || "-");

                resultBox.innerHTML =
                    "<div class='room-hero-card' style='border:2px solid var(--teal-600);background:#fff;'>" +
                    "<div class='room-hero-header'>" +
                    "<div>" +
                    "<span class='status-badge " + getStatusClass(asset.status) + "'>" + escapeHtml(asset.status) + "</span>" +
                    "<h3 style='font-size:1.3rem;margin:0.3rem 0;color:var(--navy-900);'>" + escapeHtml(asset.name) + "</h3>" +
                    "<p style='color:var(--gray-600);font-size:0.85rem;'>Kod: <strong>" + escapeHtml(asset.code) + "</strong> &bull; Barkod: <strong>" + escapeHtml(asset.barcode || "-") + "</strong></p>" +
                    "</div>" +
                    "<div class='room-qr-box'><div class='qr-placeholder'>QR</div><code>" + escapeHtml(asset.roomQrCode || asset.code) + "</code></div>" +
                    "</div>" +
                    "<div class='room-meta-grid'>" +
                    "<div><strong>Kurumsal Hiyerarşi:</strong> Gebze Belediyesi &gt; " + escapeHtml(asset.departmentName || asset.unit) + " &gt; " + escapeHtml(asset.subUnitName || "Merkez") + "</div>" +
                    "<div><strong>Fiziksel Lokasyon:</strong> " + escapeHtml(bldFloor) + " &gt; " + escapeHtml(roomStr) + "</div>" +
                    "<div><strong>Zimmetli Personel:</strong> " + escapeHtml(asset.assignee || "Atanmamış (Depoda)") + "</div>" +
                    "<div><strong>Kategori &amp; Durum:</strong> " + escapeHtml(asset.category) + " (" + escapeHtml(asset.condition || "Çok İyi") + ")</div>" +
                    "<div><strong>İlk Bedel / Tarih:</strong> " + formatCurrency(asset.estimatedValue) + " &bull; " + escapeHtml(asset.acquisitionDate || "-") + "</div>" +
                    "<div><strong>Son Hareket:</strong> " + (movements.length > 0 ? escapeHtml(movements[0].typeLabel + " (" + movements[0].timestamp + ")") : "Kayıt Başlangıcı") + "</div>" +
                    "</div>" +
                    "<div style='margin-top:1rem;display:flex;gap:0.5rem;'>" +
                    "<button type='button' class='btn-action-sm' onclick='window.appOpenMaint(" + asset.id + ")'>🔧 Bakım İş Emri Aç</button>" +
                    "<button type='button' class='btn-action-sm' onclick='window.appOpenTrans(" + asset.id + ")'>🚚 Konum Transferi Yap</button>" +
                    "</div>" +
                    "</div>";
            });
        }).catch(function (err) {
            resultBox.innerHTML = "<div class='empty-card'><h3>Hata: " + escapeHtml(err.message) + "</h3></div>";
        });
    }

    // ==========================================
    // 28. BELGE VE EVRAK YÖNETİMİ
    // ==========================================
    function loadDocuments() {
        var tbody = document.getElementById("documents-table-body");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='10' class='loading-cell'>Belgeler yükleniyor...</td></tr>";

        apiRequest("/api/documents").then(function (docs) {
            if (docs.length === 0) {
                tbody.innerHTML = "<tr><td colspan='10' style='text-align:center;'>Kayıtlı evrak / belge bulunamadı.</td></tr>";
                return;
            }

            tbody.innerHTML = docs.map(function (d) {
                return "<tr>" +
                    "<td><code>" + escapeHtml(d.docCode) + "</code></td>" +
                    "<td><span class='category-badge'>" + escapeHtml(d.documentType) + "</span></td>" +
                    "<td><strong>" + escapeHtml(d.title) + "</strong></td>" +
                    "<td>" + escapeHtml(d.assetName || "-") + "</td>" +
                    "<td><code>" + escapeHtml(d.documentNo || "-") + "</code></td>" +
                    "<td>" + escapeHtml(d.issuedBy || "-") + "</td>" +
                    "<td>" + escapeHtml(d.validUntil || "Süresiz") + "</td>" +
                    "<td>" + escapeHtml(d.fileName) + " (" + d.fileSizeKb + " KB)</td>" +
                    "<td>" + escapeHtml(d.createdAt) + "</td>" +
                    "<td><button type='button' class='btn-action-sm' onclick='alert(\"" + escapeHtml(d.title) + " belgesi indiriliyor...\")'>Görüntüle / İndir</button></td>" +
                    "</tr>";
            }).join("");
        }).catch(function (err) {
            tbody.innerHTML = "<tr><td colspan='10' class='loading-cell'>Hata: " + escapeHtml(err.message) + "</td></tr>";
        });
    }

    // ==========================================
    // 29. RAPORLAMA VE AMORTİSMAN
    // ==========================================
    var currentDepreciationReportData = [];

    function loadReports() {
        var tbody = document.getElementById("depreciation-table-body");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='11' class='loading-cell'>Amortisman cetveli hesaplanıyor...</td></tr>";

        apiRequest("/api/reports/depreciation").then(function (items) {
            currentDepreciationReportData = items;
            var sumOrig = 0;
            var sumAccum = 0;
            var sumBook = 0;

            for (var i = 0; i < items.length; i++) {
                sumOrig += (items[i].originalValue || 0);
                sumAccum += (items[i].accumulatedDepreciation || 0);
                sumBook += (items[i].currentBookValue || 0);
            }

            var kOrig = document.getElementById("kpi-rep-orig-val");
            if (kOrig) kOrig.textContent = formatCurrency(sumOrig);
            var kAccum = document.getElementById("kpi-rep-accum-dep");
            if (kAccum) kAccum.textContent = formatCurrency(sumAccum);
            var kBook = document.getElementById("kpi-rep-book-val");
            if (kBook) kBook.textContent = formatCurrency(sumBook);

            if (items.length === 0) {
                tbody.innerHTML = "<tr><td colspan='11' style='text-align:center;'>Amortisman kaydı bulunamadı.</td></tr>";
                return;
            }

            tbody.innerHTML = items.map(function (it) {
                return "<tr>" +
                    "<td><code>" + escapeHtml(it.assetCode) + "</code></td>" +
                    "<td><strong>" + escapeHtml(it.assetName) + "</strong></td>" +
                    "<td><span class='category-badge'>" + escapeHtml(it.category) + "</span></td>" +
                    "<td>" + escapeHtml(it.departmentName) + "</td>" +
                    "<td>" + escapeHtml(it.acquisitionDate) + "</td>" +
                    "<td class='value-cell'>" + formatCurrency(it.originalValue) + "</td>" +
                    "<td>" + it.usefulLifeYears + " Yıl</td>" +
                    "<td>%" + it.annualDepreciationRate + "</td>" +
                    "<td class='value-cell' style='color:var(--danger);'>" + formatCurrency(it.accumulatedDepreciation) + "</td>" +
                    "<td class='value-cell' style='color:var(--teal-600);font-weight:700;'>" + formatCurrency(it.currentBookValue) + "</td>" +
                    "<td><span class='status-badge " + getStatusClass(it.status) + "'>" + escapeHtml(it.status) + "</span></td>" +
                    "</tr>";
            }).join("");
        }).catch(function (err) {
            tbody.innerHTML = "<tr><td colspan='11' class='loading-cell'>Hata: " + escapeHtml(err.message) + "</td></tr>";
        });
    }

    function exportDepreciationCsv() {
        if (!currentDepreciationReportData || currentDepreciationReportData.length === 0) {
            showToast("İndirilecek rapor verisi bulunmuyor.", true);
            return;
        }

        var csvRows = [
            ["Varlik Kodu", "Demirbas Adi", "Kategori", "Mudurluk", "Edinim Tarihi", "Ilk Bedel TL", "Faydali Omur Yil", "Yillik Oran", "Birikmis Amortisman TL", "Guncel Net Defter Degeri TL", "Durum"].join(";")
        ];

        for (var i = 0; i < currentDepreciationReportData.length; i++) {
            var it = currentDepreciationReportData[i];
            csvRows.push([
                it.assetCode,
                '"' + (it.assetName || "").replace(/"/g, '""') + '"',
                '"' + (it.category || "") + '"',
                '"' + (it.departmentName || "") + '"',
                it.acquisitionDate,
                it.originalValue,
                it.usefulLifeYears,
                it.annualDepreciationRate,
                it.accumulatedDepreciation,
                it.currentBookValue,
                it.status
            ].join(";"));
        }

        var blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "Gebze_Belediyesi_Amortisman_Raporu_2026.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Amortisman raporu CSV formatında indirildi.");
    }

    // ==========================================
    // 30. DENETİM LOGLARI
    // ==========================================
    function loadAuditLogs() {
        var tbody = document.getElementById("audit-logs-table-body");
        if (!tbody) return;
        tbody.innerHTML = "<tr><td colspan='7' class='loading-cell'>Denetim logları yükleniyor...</td></tr>";

        apiRequest("/api/audit-logs?limit=50").then(function (logs) {
            if (logs.length === 0) {
                tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Denetim logu bulunamadı.</td></tr>";
                return;
            }
            tbody.innerHTML = logs.map(function (l) {
                return "<tr>" +
                    "<td><code>" + escapeHtml(l.createdAt) + "</code></td>" +
                    "<td><span class='status-badge status-aktif'>" + escapeHtml(l.actionType) + "</span></td>" +
                    "<td>" + escapeHtml(l.entityType) + "</td>" +
                    "<td><code>" + escapeHtml(l.entityId || "-") + "</code></td>" +
                    "<td><strong>" + escapeHtml(l.actorName) + "</strong> (" + escapeHtml(l.actorUsername) + ")</td>" +
                    "<td><code>" + escapeHtml(l.ipAddress) + "</code></td>" +
                    "<td>" + escapeHtml(l.description) + "</td>" +
                    "</tr>";
            }).join("");
        }).catch(function (err) {
            tbody.innerHTML = "<tr><td colspan='7' class='loading-cell'>Hata: " + escapeHtml(err.message) + "</td></tr>";
        });
    }

    // ==========================================
    // 31. SİSTEM AYARLARI
    // ==========================================
    function loadSettings() {
        apiRequest("/api/settings").then(function (settings) {
            for (var i = 0; i < settings.length; i++) {
                var s = settings[i];
                if (s.paramKey === "CURRENCY_SYMBOL") {
                    var el = document.getElementById("set-currency");
                    if (el) el.value = s.paramValue;
                } else if (s.paramKey === "DEPRECIATION_METHOD") {
                    var el2 = document.getElementById("set-dep-method");
                    if (el2) el2.value = s.paramValue;
                } else if (s.paramKey === "ALERT_WARRANTY_DAYS") {
                    var el3 = document.getElementById("set-warranty-alert");
                    if (el3) el3.value = s.paramValue;
                } else if (s.paramKey === "ALERT_INSPECTION_DAYS") {
                    var el4 = document.getElementById("set-insp-alert");
                    if (el4) el4.value = s.paramValue;
                } else if (s.paramKey === "QR_CODE_PREFIX") {
                    var el5 = document.getElementById("set-qr-prefix");
                    if (el5) el5.value = s.paramValue;
                } else if (s.paramKey === "LABEL_PRINT_FORMAT") {
                    var el6 = document.getElementById("set-label-size");
                    if (el6) el6.value = s.paramValue;
                }
            } else {
                var statusElNew = document.getElementById("asset-status");
                if (statusElNew) {
                    statusElNew.value = "Depoda";
                    statusElNew.disabled = true;
                    statusElNew.title = "Yeni varlıklar otomatik olarak 'KAYDEDILDI (Depoda)' durumuyla kaydedilir.";
                }
            }
        });
    }

    function submitSystemSettings() {
        var curr = document.getElementById("set-currency").value;
        var dep = document.getElementById("set-dep-method").value;
        var war = document.getElementById("set-warranty-alert").value;
        var insp = document.getElementById("set-insp-alert").value;
        var qr = document.getElementById("set-qr-prefix").value;

        Promise.all([
            apiRequest("/api/settings", { method: "POST", body: JSON.stringify({ paramKey: "CURRENCY_SYMBOL", paramValue: curr }) }),
            apiRequest("/api/settings", { method: "POST", body: JSON.stringify({ paramKey: "DEPRECIATION_METHOD", paramValue: dep }) }),
            apiRequest("/api/settings", { method: "POST", body: JSON.stringify({ paramKey: "ALERT_WARRANTY_DAYS", paramValue: war }) }),
            apiRequest("/api/settings", { method: "POST", body: JSON.stringify({ paramKey: "ALERT_INSPECTION_DAYS", paramValue: insp }) }),
            apiRequest("/api/settings", { method: "POST", body: JSON.stringify({ paramKey: "QR_CODE_PREFIX", paramValue: qr }) })
        ]).then(function () {
            showToast("Sistem parametreleri başarıyla güncellendi.");
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    window.appOpenMaint = function (id) {
        openNewMaintenanceModal(id);
    };
    window.appOpenTrans = function (id) {
        openTransferModal(id);
    };

    // Başlatma
    bindEvents();
    restoreSession();
})();

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

    function apiRequest(url, options) {
        var opts = options || {};
        var headers = opts.headers || {};
        headers["Accept"] = "application/json";
        if (opts.body) {
            headers["Content-Type"] = "application/json";
        }
        if (currentSession && currentSession.token) {
            headers["X-Auth-Token"] = currentSession.token;
        }
        opts.headers = headers;

        return fetch(url, opts).then(function (response) {
            return response.json().catch(function () {
                return {};
            }).then(function (data) {
                if (!response.ok) {
                    var msg = (data && data.error) ? data.error : ("İstek hatası: HTTP " + response.status);
                    throw new Error(msg);
                }
                return data;
            });
        });
    }

    function getStatusClass(status) {
        var s = String(status || "").toLocaleLowerCase("tr-TR");
        if (s === "aktif" || s === "tamamlandi") return "status-aktif";
        if (s === "bakımda" || s === "devam_ediyor" || s === "onarım gerekli") return "status-bakimda";
        if (s === "depoda" || s === "beklemede") return "status-depoda";
        return "status-bostan";
    }

    function applyRolePermissions() {
        if (!currentSession) return;
        if (currentUserNameEl) currentUserNameEl.textContent = currentSession.fullName;
        if (currentUserRoleEl) currentUserRoleEl.textContent = currentSession.role;

        var writeElements = document.querySelectorAll(".write-only");
        for (var i = 0; i < writeElements.length; i++) {
            writeElements[i].style.display = currentSession.canWrite ? "" : "none";
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
            showToast("Hoş geldiniz, " + session.fullName + " (" + session.roleLabel + ")");
            refreshAllData();
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
            showToast("Oturum kapatıldı.");
        });
    }

    function restoreSession() {
        try {
            var saved = sessionStorage.getItem(SESSION_KEY);
            if (!saved) return;
            var parsed = JSON.parse(saved);
            if (!parsed || !parsed.token) return;
            currentSession = parsed;
            apiRequest("/api/auth/me").then(function (validSession) {
                currentSession = validSession;
                if (loginScreen) loginScreen.hidden = true;
                applyRolePermissions();
                refreshAllData();
            }).catch(function () {
                currentSession = null;
                sessionStorage.removeItem(SESSION_KEY);
                if (loginScreen) loginScreen.hidden = false;
            });
        } catch (e) {}
    }

    // ==========================================
    // SEKME GEÇİŞLERİ (TAB NAVIGATION)
    // ==========================================
    function switchView(viewName) {
        var views = ["dashboard", "tree", "assets", "locations", "departments", "categories", "assignments", "maintenances", "movements"];
        for (var i = 0; i < views.length; i++) {
            var v = document.getElementById("view-" + views[i]);
            if (v) v.hidden = views[i] !== viewName;
        }
        var tabs = document.querySelectorAll(".nav-tab");
        for (var j = 0; j < tabs.length; j++) {
            tabs[j].classList.toggle("active", tabs[j].getAttribute("data-view") === viewName);
        }

        if (viewName === "dashboard") loadDashboard();
        else if (viewName === "tree") loadTree(currentTreeMode);
        else if (viewName === "assets") loadAssets();
        else if (viewName === "locations") loadLocations();
        else if (viewName === "departments") loadDepartments();
        else if (viewName === "categories") loadCategories();
        else if (viewName === "assignments") loadAssignments();
        else if (viewName === "maintenances") loadMaintenances();
        else if (viewName === "movements") loadMovements();
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
                "<td><code>" + escapeHtml(d.code) + "</code></td>" +
                "<td><strong>" + escapeHtml(d.name) + "</strong></td>" +
                "<td>" + escapeHtml(d.managerName || "Müdür Atanmamış") + "</td>" +
                "<td style='text-align: right;'><strong>" + d.totalCount + "</strong></td>" +
                "<td style='text-align: right;'><span class='status-badge status-aktif'>" + d.activeCount + "</span></td>" +
                "<td style='text-align: right;'><span class='status-badge status-depoda'>" + d.storageCount + "</span></td>" +
                "<td style='text-align: right;'><span class='status-badge status-bakimda'>" + d.maintenanceCount + "</span></td>" +
                "<td style='text-align: right;' class='value-cell'>" + formatCurrency(d.totalValue) + "</td>" +
                "<td><button type='button' class='btn-action-sm' data-filter-dept-id='" + d.id + "'>Varlıkları Gör</button></td>";
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
            pill.innerHTML =
                "<div style='font-size: 1.1rem;'>🏷️</div>" +
                "<div><strong>" + escapeHtml(c.name) + "</strong><br><span style='color:var(--teal-600);font-weight:700;'>" + c.count + " demirbaş</span></div>";
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

        var meta = node.metadata || {};
        var assetsUrl = "/api/assets";

        if (node.type === "ROOM") {
            typeTagEl.textContent = meta.roomType || "Oda";
            titleEl.textContent = "Oda " + (meta.roomNumber || "") + " — " + (meta.name || node.label);
            breadcrumbEl.textContent = (meta.buildingName || "Yerleşke") + " > " + (meta.floorName || "Kat") + " > " + (meta.departmentName || "Müdürlük");
            qrTextEl.textContent = meta.qrCode || node.code || "-";
            respEl.textContent = meta.responsiblePerson || "Atanmamış";
            capEl.textContent = (meta.capacity || 4) + " kişi";
            subEl.textContent = meta.subUnitName || (meta.departmentName || "-");
            countEl.textContent = node.count != null ? node.count : (meta.assetCount || 0);
            if (tableTitleEl) tableTitleEl.textContent = "Bu Odada Bulunan Demirbaşlar";

            if (btnAdd) {
                btnAdd.style.display = "";
                btnAdd.textContent = "+ Bu Odaya Varlık Ekle";
                btnAdd.onclick = function () { openNewAssetModalWithPreselectedRoom(meta); };
            }
            assetsUrl = "/api/rooms/" + meta.roomId + "/assets";

        } else if (node.type === "DEPARTMENT") {
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
                    if (dSel && meta.deptId) dSel.value = meta.deptId;
                };
            }
            assetsUrl = "/api/assets?departmentId=" + meta.deptId;

        } else if (node.type === "SUB_UNIT") {
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
            assetsUrl = "/api/assets?subUnitId=" + meta.subUnitId;

        } else if (node.type === "BUILDING") {
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
                    if (bSel && meta.buildingId) {
                        bSel.value = meta.buildingId;
                        loadFloorsForAssetForm(meta.buildingId);
                    }
                };
            }
            assetsUrl = "/api/assets?buildingId=" + meta.buildingId;

        } else if (node.type === "FLOOR") {
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
                            if (fSel && meta.floorId) fSel.value = meta.floorId;
                        });
                    }
                };
            }
            assetsUrl = "/api/assets?floorId=" + meta.floorId;

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

                for (var i = 0; i < rooms.length; i++) {
                    var r = rooms[i];
                    var card = document.createElement("div");
                    card.className = "room-card";
                    card.innerHTML =
                        "<div class='room-card-top'>" +
                        "<span class='room-card-number'>Oda " + escapeHtml(r.roomNumber) + "</span>" +
                        "<span class='room-type-tag'>" + escapeHtml(r.roomType) + "</span>" +
                        "</div>" +
                        "<div class='room-card-title'>" + escapeHtml(r.name) + "</div>" +
                        "<div style='font-size:0.8rem;color:var(--gray-600);'>Kat: <strong>" + escapeHtml(r.floorName) + "</strong></div>" +
                        "<div style='font-size:0.8rem;color:var(--gray-600);'>Müdürlük: " + escapeHtml(r.departmentName || "-") + "</div>" +
                        "<div class='room-card-foot'>" +
                        "<span>Sorumlu: " + escapeHtml(r.responsiblePerson || "-") + "</span>" +
                        "<span class='badge-count'>" + r.assetCount + " Demirbaş</span>" +
                        "</div>";

                    (function (roomId) {
                        card.addEventListener("click", function () {
                            openRoomDetailModal(roomId);
                        });
                    })(r.id);

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
            for (var i = 0; i < depts.length; i++) {
                var d = depts[i];
                var deptSubs = subUnits.filter(function (s) { return s.departmentId === d.id; });

                var card = document.createElement("div");
                card.className = "department-card";

                var subsHtml = "";
                if (deptSubs.length > 0) {
                    subsHtml = "<div class='department-subunits-list'>";
                    for (var s = 0; s < deptSubs.length; s++) {
                        subsHtml += "<span class='subunit-tag'>" + escapeHtml(deptSubs[s].name) + "</span>";
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
                    "<button type='button' class='btn-action-sm' data-filter-dept-id='" + d.id + "'>Varlıkları Gör</button>" +
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

    function populateDropdownsForFilter() {
        if (filterDeptSelect && filterDeptSelect.options.length <= 1) {
            apiRequest("/api/departments").then(function (depts) {
                filterDeptSelect.innerHTML = "<option value=''>Tüm Müdürlükler (" + depts.length + ")</option>";
                for (var i = 0; i < depts.length; i++) {
                    var opt = document.createElement("option");
                    opt.value = depts[i].id;
                    opt.textContent = depts[i].name;
                    filterDeptSelect.appendChild(opt);
                }
            });
        }

        if (filterBldSelect && filterBldSelect.options.length <= 1) {
            apiRequest("/api/buildings").then(function (blds) {
                filterBldSelect.innerHTML = "<option value=''>Tüm Binalar (" + blds.length + ")</option>";
                for (var i = 0; i < blds.length; i++) {
                    var opt = document.createElement("option");
                    opt.value = blds[i].id;
                    opt.textContent = blds[i].name;
                    filterBldSelect.appendChild(opt);
                }
            });
        }

        if (filterRoomSelect && filterRoomSelect.options.length <= 1) {
            updateRoomFilterOptions(filterBldSelect && filterBldSelect.value ? filterBldSelect.value : null);
        }

        if (filterCatSelect && filterCatSelect.options.length <= 1) {
            apiRequest("/api/categories").then(function (cats) {
                filterCatSelect.innerHTML = "<option value=''>Tüm Kategoriler (" + cats.length + ")</option>";
                for (var i = 0; i < cats.length; i++) {
                    var opt = document.createElement("option");
                    opt.value = cats[i].name;
                    opt.textContent = cats[i].name;
                    opt.setAttribute("data-id", cats[i].id);
                    filterCatSelect.appendChild(opt);
                }
            });
        }
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
            if (emptyState) emptyState.hidden = assets.length > 0;
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

            if (assetToEdit) {
                document.getElementById("asset-code").value = assetToEdit.code || "";
                document.getElementById("asset-barcode").value = assetToEdit.barcode || "";
                document.getElementById("asset-tif").value = assetToEdit.tifCode || "";
                document.getElementById("asset-name").value = assetToEdit.name || "";
                catSelect.value = assetToEdit.category || "";
                document.getElementById("asset-brand").value = assetToEdit.brandModel || "";
                document.getElementById("asset-serial").value = assetToEdit.serialNumber || "";
                document.getElementById("asset-status").value = assetToEdit.status || "Aktif";
                document.getElementById("asset-condition").value = assetToEdit.condition || "Çok İyi";
                document.getElementById("asset-assignee").value = assetToEdit.assignee || "";
                document.getElementById("asset-value").value = assetToEdit.estimatedValue || "";
                document.getElementById("asset-acq-date").value = assetToEdit.acquisitionDate || "";
                document.getElementById("asset-warranty-date").value = assetToEdit.warrantyEndDate || "";
                document.getElementById("asset-notes").value = assetToEdit.notes || "";

                if (assetToEdit.departmentId) deptSelect.value = assetToEdit.departmentId;
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
        // Navigasyon sekmeleri
        var navTabs = document.querySelectorAll(".nav-tab");
        for (var i = 0; i < navTabs.length; i++) {
            navTabs[i].addEventListener("click", function () {
                switchView(this.getAttribute("data-view"));
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
                performLogin(u, p);
            });
        }

        if (logoutBtn) logoutBtn.addEventListener("click", performLogout);

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
                switchView("assets");
                if (filterDeptSelect) {
                    filterDeptSelect.value = deptId;
                    loadAssets();
                }
            }

            var catFilterBtn = e.target.closest("[data-filter-cat-name]");
            if (catFilterBtn) {
                var catName = catFilterBtn.getAttribute("data-filter-cat-name");
                switchView("assets");
                if (filterCatSelect) {
                    filterCatSelect.value = catName;
                    loadAssets();
                }
            }
        });

        // Varlık Ekle Butonu
        var btnOpenNew = document.getElementById("btn-open-new-asset");
        if (btnOpenNew) btnOpenNew.onclick = function () { openNewAssetModal(); };

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

        // Form Submit: Yeni Oda Ekle
        var btnOpenNewRoom = document.getElementById("btn-open-new-room");
        if (btnOpenNewRoom) {
            btnOpenNewRoom.onclick = function () {
                var bSelect = document.getElementById("nr-building");
                var dSelect = document.getElementById("nr-dept");
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
                    openModal("modal-new-room");
                });
            };
        }

        var nrBld = document.getElementById("nr-building");
        if (nrBld) {
            nrBld.addEventListener("change", function () {
                var fSelect = document.getElementById("nr-floor");
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

        var formNewRoom = document.getElementById("form-new-room");
        if (formNewRoom) {
            formNewRoom.addEventListener("submit", function (e) {
                e.preventDefault();
                var payload = {
                    buildingId: Number(document.getElementById("nr-building").value),
                    floorId: Number(document.getElementById("nr-floor").value),
                    roomNumber: document.getElementById("nr-number").value,
                    name: document.getElementById("nr-name").value,
                    roomType: document.getElementById("nr-type").value,
                    departmentId: Number(document.getElementById("nr-dept").value) || null,
                    responsiblePerson: document.getElementById("nr-resp").value,
                    capacity: Number(document.getElementById("nr-capacity").value || 4),
                    description: document.getElementById("nr-desc").value
                };

                apiRequest("/api/rooms", {
                    method: "POST",
                    body: JSON.stringify(payload)
                }).then(function (res) {
                    closeModal("modal-new-room");
                    showToast("Oda " + res.roomNumber + " (" + res.name + ") başarıyla oluşturuldu.");
                    loadLocations();
                    loadDashboard();
                }).catch(function (err) {
                    showToast(err.message, true);
                });
            });
        }

        // Form Submit: Zimmet Ata
        var formAssign = document.getElementById("form-assign");
        if (formAssign) {
            formAssign.addEventListener("submit", function (e) {
                e.preventDefault();
                var payload = {
                    assetId: Number(document.getElementById("assign-asset-id").value),
                    assigneeName: document.getElementById("assign-person").value,
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
    }

    function populateAssignAssetSelect(preselectedId) {
        var select = document.getElementById("assign-asset-id");
        if (!select) return;
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

    function openAssetDetailPopup(assetId) {
        apiRequest("/api/assets/" + assetId).then(function (detail) {
            var asset = detail.asset;
            var movements = detail.movements || [];
            var assignments = detail.assignments || [];

            var body = document.getElementById("detail-modal-body");
            if (!body) return;

            var bldFloor = asset.buildingName ? (asset.buildingName + " - " + (asset.floorName || "")) : "-";
            var roomDetail = asset.roomNumber ? ("Oda " + asset.roomNumber + " — " + (asset.roomName || "")) : (asset.location || "-");

            body.innerHTML =
                "<div class='room-hero-card'>" +
                "<div class='room-hero-header'>" +
                "<div>" +
                "<span class='status-badge " + getStatusClass(asset.status) + "'>" + escapeHtml(asset.status) + "</span>" +
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
                "</div>" +
                "<h4 style='margin-top:1.2rem;margin-bottom:0.5rem;'>Konum ve Zimmet Geçmişi (" + movements.length + " Hareket)</h4>" +
                "<div class='table-responsive' style='max-height:200px;overflow-y:auto;'>" +
                "<table class='data-table'><thead><tr><th>Tarih</th><th>İşlem</th><th>Nereden</th><th>Nereye</th><th>İşlemi Yapan</th></tr></thead><tbody>" +
                (movements.length === 0 ? "<tr><td colspan='5'>Hareket kaydı bulunamadı.</td></tr>" :
                    movements.map(function (m) {
                        return "<tr><td>" + escapeHtml(m.timestamp) + "</td><td><span class='status-badge status-aktif'>" + escapeHtml(m.typeLabel) + "</span></td><td>" + escapeHtml(m.fromLocation || "-") + "</td><td><strong>" + escapeHtml(m.toLocation) + "</strong></td><td>" + escapeHtml(m.performedBy) + "</td></tr>";
                    }).join("")) +
                "</tbody></table></div>";

            openModal("modal-detail");
        });
    }

    // Başlatma
    bindEvents();
    restoreSession();
})();

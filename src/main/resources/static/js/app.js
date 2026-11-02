(function () {
    "use strict";

    var SESSION_KEY = "gebze_varlik_session";
    var currentSession = null;
    var allAssetsCache = [];
    var currentAssetsList = [];
    var currentAssignmentsList = [];
    var currentMaintenancesList = [];

    // DOM Referansları
    var loginScreen = document.getElementById("login-screen");
    var loginForm = document.getElementById("login-form");
    var loginError = document.getElementById("login-error");
    var loginUsername = document.getElementById("login-username");
    var loginPassword = document.getElementById("login-password");
    var currentUserNameEl = document.getElementById("current-user-name");
    var currentUserRoleEl = document.getElementById("current-user-role");
    var logoutBtn = document.getElementById("btn-logout");
    var toastContainer = document.getElementById("toast-container");

    // Varlık Filtre Alanları
    var filterForm = document.getElementById("asset-filter-form");
    var queryInput = document.getElementById("filter-query");
    var categorySelect = document.getElementById("filter-category");
    var unitSelect = document.getElementById("filter-unit");
    var statusSelect = document.getElementById("filter-status");
    var conditionSelect = document.getElementById("filter-condition");
    var warrantySelect = document.getElementById("filter-warranty");
    var sortSelect = document.getElementById("filter-sort");
    var clearBtn = document.getElementById("btn-clear-filters");
    var emptyResetBtn = document.getElementById("btn-empty-reset");
    var assetTableBody = document.getElementById("asset-table-body");
    var assetTableWrapper = document.getElementById("asset-table-wrapper");
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
        if (!toastContainer) {
            return;
        }
        var toast = document.createElement("div");
        toast.className = "toast" + (isError ? " toast-error" : "");
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
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
        if (s === "aktif" || s === "tamamlandi") {
            return "status-aktif";
        }
        if (s === "bakımda" || s === "devam_ediyor" || s === "onarım gerekli") {
            return "status-bakimda";
        }
        return "status-depoda";
    }

    function applyRolePermissions() {
        var canWrite = currentSession && currentSession.canWrite;
        var writeElements = document.querySelectorAll(".write-only");
        for (var i = 0; i < writeElements.length; i++) {
            writeElements[i].hidden = !canWrite;
        }
        if (currentSession) {
            if (currentUserNameEl) {
                currentUserNameEl.textContent = currentSession.fullName;
            }
            if (currentUserRoleEl) {
                currentUserRoleEl.textContent = currentSession.role;
            }
        }
    }

    // GİRİŞ VE OTURUM
    function performLogin(username, password) {
        if (loginError) {
            loginError.hidden = true;
        }
        apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ username: username, password: password })
        })
            .then(function (session) {
                currentSession = session;
                try {
                    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
                } catch (e) {
                    // ignore
                }
                if (loginScreen) {
                    loginScreen.hidden = true;
                }
                applyRolePermissions();
                showToast("Hoş geldiniz, " + session.fullName);
                refreshAllData();
            })
            .catch(function (err) {
                if (loginError) {
                    loginError.textContent = err.message;
                    loginError.hidden = false;
                }
            });
    }

    function performLogout() {
        apiRequest("/api/auth/logout", { method: "POST" }).finally(function () {
            currentSession = null;
            try {
                sessionStorage.removeItem(SESSION_KEY);
            } catch (e) {
                // ignore
            }
            if (loginScreen) {
                loginScreen.hidden = false;
            }
            showToast("Oturum kapatıldı.");
        });
    }

    function restoreSession() {
        try {
            var saved = sessionStorage.getItem(SESSION_KEY);
            if (!saved) {
                return;
            }
            var parsed = JSON.parse(saved);
            if (!parsed || !parsed.token) {
                return;
            }
            currentSession = parsed;
            apiRequest("/api/auth/me")
                .then(function (validSession) {
                    currentSession = validSession;
                    if (loginScreen) {
                        loginScreen.hidden = true;
                    }
                    applyRolePermissions();
                    refreshAllData();
                })
                .catch(function () {
                    currentSession = null;
                    sessionStorage.removeItem(SESSION_KEY);
                    if (loginScreen) {
                        loginScreen.hidden = false;
                    }
                });
        } catch (e) {
            // ignore
        }
    }

    // SEKME GEÇİŞLERİ
    function switchView(viewName) {
        var views = ["dashboard", "assets", "assignments", "maintenances", "movements", "reports"];
        for (var i = 0; i < views.length; i++) {
            var v = document.getElementById("view-" + views[i]);
            if (v) {
                v.hidden = views[i] !== viewName;
            }
        }
        var tabs = document.querySelectorAll(".nav-tab");
        for (var j = 0; j < tabs.length; j++) {
            var isTarget = tabs[j].getAttribute("data-view") === viewName;
            tabs[j].classList.toggle("active", isTarget);
        }
        if (viewName === "dashboard" || viewName === "reports") {
            loadDashboard();
        } else if (viewName === "assets") {
            loadAssets();
        } else if (viewName === "assignments") {
            loadAssignments();
        } else if (viewName === "maintenances") {
            loadMaintenances();
        } else if (viewName === "movements") {
            loadMovements();
        }
    }

    function openModal(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) {
            modal.hidden = false;
        }
    }

    function closeModal(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) {
            modal.hidden = true;
        }
    }

    // 1. DASHBOARD VE BİRİM RAPORLARI
    function renderBreakdown(containerId, mapData, total) {
        var container = document.getElementById(containerId);
        if (!container) {
            return;
        }
        container.innerHTML = "";
        var keys = Object.keys(mapData || {});
        if (keys.length === 0) {
            container.textContent = "Veri bulunmuyor.";
            return;
        }
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var count = mapData[k];
            var pct = total > 0 ? Math.round((count / total) * 100) : 0;

            var row = document.createElement("div");
            row.className = "breakdown-row";

            var meta = document.createElement("div");
            meta.className = "breakdown-meta";
            var labelSpan = document.createElement("span");
            labelSpan.textContent = k;
            var countSpan = document.createElement("span");
            countSpan.textContent = count + " adet (%" + pct + ")";
            meta.appendChild(labelSpan);
            meta.appendChild(countSpan);

            var track = document.createElement("div");
            track.className = "breakdown-bar-track";
            var fill = document.createElement("div");
            fill.className = "breakdown-bar-fill";
            fill.style.width = pct + "%";
            track.appendChild(fill);

            row.appendChild(meta);
            row.appendChild(track);
            container.appendChild(row);
        }
    }

    function renderActivityFeed(containerId, movements) {
        var container = document.getElementById(containerId);
        if (!container) {
            return;
        }
        container.innerHTML = "";
        if (!movements || movements.length === 0) {
            container.textContent = "Henüz hareket kaydı bulunmuyor.";
            return;
        }
        for (var i = 0; i < movements.length; i++) {
            var m = movements[i];
            var item = document.createElement("div");
            item.className = "activity-item";

            var top = document.createElement("div");
            top.className = "activity-item-top";
            var badge = document.createElement("span");
            badge.className = "asset-code";
            badge.textContent = m.typeLabel + " • " + m.assetCode;

            var time = document.createElement("span");
            time.className = "activity-time";
            time.textContent = m.timestamp + " (" + m.performedBy + ")";
            top.appendChild(badge);
            top.appendChild(time);

            var desc = document.createElement("div");
            desc.textContent = m.assetName + " — " + m.toUnit + " / " + m.toLocation + (m.note ? " (" + m.note + ")" : "");

            item.appendChild(top);
            item.appendChild(desc);
            container.appendChild(item);
        }
    }

    function renderAlertsList(warrantyAlerts, conditionAlerts) {
        var container = document.getElementById("dashboard-alerts-list");
        if (!container) {
            return;
        }
        container.innerHTML = "";
        var combined = [];
        var seen = {};

        var wList = warrantyAlerts || [];
        for (var i = 0; i < wList.length; i++) {
            var a = wList[i];
            seen[a.id] = true;
            combined.push({
                asset: a,
                reason: "Garanti Bitiş Tarihi: " + (a.warrantyEndDate || "-")
            });
        }

        var cList = conditionAlerts || [];
        for (var j = 0; j < cList.length; j++) {
            var c = cList[j];
            if (!seen[c.id]) {
                combined.push({
                    asset: c,
                    reason: "Fiziksel Kondisyon: " + c.condition
                });
            }
        }

        if (combined.length === 0) {
            container.textContent = "Dikkat gerektiren garanti veya kondisyon uyarısı bulunmuyor.";
            return;
        }

        for (var k = 0; k < combined.length; k++) {
            var entry = combined[k];
            var item = document.createElement("div");
            item.className = "activity-item alert-item";
            item.innerHTML =
                "<div class='activity-item-top'>" +
                "<span class='asset-code'>" + escapeHtml(entry.asset.code) + " • " + escapeHtml(entry.asset.condition) + "</span>" +
                "<span class='activity-time'>" + escapeHtml(entry.reason) + "</span>" +
                "</div>" +
                "<div><strong>" + escapeHtml(entry.asset.name) + "</strong> — " + escapeHtml(entry.asset.unit) + "</div>";
            container.appendChild(item);
        }
    }

    function renderUnitReportTable(unitSummaries) {
        var tbody = document.getElementById("unit-report-table-body");
        if (!tbody) {
            return;
        }
        tbody.innerHTML = "";
        var list = unitSummaries || [];
        for (var i = 0; i < list.length; i++) {
            var u = list[i];
            var tr = document.createElement("tr");
            tr.innerHTML =
                "<td><strong>" + escapeHtml(u.unit) + "</strong></td>" +
                "<td>" + u.totalCount + " adet</td>" +
                "<td><span class='status-badge status-aktif'>" + u.activeCount + " Aktif</span></td>" +
                "<td><span class='status-badge status-depoda'>" + u.storageCount + " Depoda</span></td>" +
                "<td><span class='status-badge status-bakimda'>" + u.maintenanceCount + " Bakımda</span></td>" +
                "<td class='value-cell'>" + formatCurrency(u.totalValue) + "</td>";
            tbody.appendChild(tr);
        }
    }

    function loadDashboard() {
        apiRequest("/api/dashboard").then(function (data) {
            document.getElementById("kpi-total-assets").textContent = data.totalAssets;
            document.getElementById("kpi-total-value").textContent = formatCurrency(data.totalEstimatedValue);
            document.getElementById("kpi-active-assets").textContent = data.activeAssets;
            document.getElementById("kpi-storage-assets").textContent = data.storageAssets;
            document.getElementById("kpi-maint-assets").textContent = data.openMaintenancesCount;
            document.getElementById("kpi-warranty-alerts").textContent = data.warrantyAlertsCount;

            renderBreakdown("category-breakdown", data.byCategory, data.totalAssets);
            renderBreakdown("unit-breakdown", data.byUnit, data.totalAssets);
            renderBreakdown("condition-breakdown", data.byCondition, data.totalAssets);
            renderAlertsList(data.warrantyAlerts, data.conditionAlerts);
            renderActivityFeed("dashboard-recent-movements", data.recentMovements);
            renderUnitReportTable(data.unitSummaries);
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // 2. VARLIKLAR LİSTESİ, FİLTRELEME, ETİKET VE CSV
    function syncFilterSelectOptions(assets) {
        function fillSelect(selectEl, defaultLabel, key) {
            if (!selectEl) {
                return;
            }
            var currentVal = selectEl.value;
            var seen = {};
            var values = [];
            for (var i = 0; i < assets.length; i++) {
                var v = assets[i][key];
                if (v && !seen[v]) {
                    seen[v] = true;
                    values.push(v);
                }
            }
            values.sort(function (a, b) {
                return a.localeCompare(b, "tr");
            });
            selectEl.innerHTML = "";
            var firstOpt = document.createElement("option");
            firstOpt.value = "";
            firstOpt.textContent = defaultLabel;
            selectEl.appendChild(firstOpt);

            for (var j = 0; j < values.length; j++) {
                var opt = document.createElement("option");
                opt.value = values[j];
                opt.textContent = values[j];
                selectEl.appendChild(opt);
            }
            selectEl.value = currentVal;
        }

        fillSelect(categorySelect, "Tüm Kategoriler", "category");
        fillSelect(unitSelect, "Tüm Birimler", "unit");
        fillSelect(statusSelect, "Tüm Durumlar", "status");
    }

    function renderAssetRows(assets) {
        if (!assetTableBody) {
            return;
        }
        assetTableBody.innerHTML = "";
        var canWrite = currentSession && currentSession.canWrite;
        var canDelete = currentSession && currentSession.canDelete;

        for (var i = 0; i < assets.length; i++) {
            var item = assets[i];
            var tr = document.createElement("tr");

            var tdCode = document.createElement("td");
            tdCode.innerHTML =
                "<span class='asset-code'>" + escapeHtml(item.code) + "</span>" +
                "<span class='sub-meta'>TİF: " + escapeHtml(item.tifCode || "-") + "</span>" +
                "<span class='sub-meta'>" + escapeHtml(item.barcode || "") + "</span>";

            var tdName = document.createElement("td");
            tdName.innerHTML =
                "<span class='asset-name'>" + escapeHtml(item.name) + "</span>" +
                "<span class='sub-meta'>" + escapeHtml(item.brandModel || "") + " • " + escapeHtml(item.serialNumber || "") + "</span>";

            var tdCategory = document.createElement("td");
            tdCategory.textContent = item.category;

            var tdUnit = document.createElement("td");
            tdUnit.textContent = item.unit;

            var tdLocation = document.createElement("td");
            tdLocation.textContent = item.location;

            var tdAssignee = document.createElement("td");
            tdAssignee.textContent = item.assignee;

            var tdValue = document.createElement("td");
            tdValue.className = "value-cell";
            tdValue.textContent = formatCurrency(item.estimatedValue);

            var tdStatus = document.createElement("td");
            tdStatus.innerHTML =
                "<span class='status-badge " + getStatusClass(item.status) + "'>" + escapeHtml(item.status) + "</span>" +
                "<span class='sub-meta'>Kondisyon: " + escapeHtml(item.condition || "İyi") + "</span>";

            var tdActions = document.createElement("td");
            var actionGroup = document.createElement("div");
            actionGroup.className = "row-actions";

            var btnDetail = document.createElement("button");
            btnDetail.type = "button";
            btnDetail.className = "btn-action-sm";
            btnDetail.textContent = "Detay";
            btnDetail.setAttribute("data-action", "detail");
            btnDetail.setAttribute("data-id", item.id);
            actionGroup.appendChild(btnDetail);

            var btnLabel = document.createElement("button");
            btnLabel.type = "button";
            btnLabel.className = "btn-action-sm";
            btnLabel.textContent = "Etiket";
            btnLabel.setAttribute("data-action", "label");
            btnLabel.setAttribute("data-id", item.id);
            actionGroup.appendChild(btnLabel);

            if (canWrite) {
                var btnAssign = document.createElement("button");
                btnAssign.type = "button";
                btnAssign.className = "btn-action-sm";
                btnAssign.textContent = "Zimmetle";
                btnAssign.setAttribute("data-action", "assign");
                btnAssign.setAttribute("data-id", item.id);
                actionGroup.appendChild(btnAssign);

                var btnMaint = document.createElement("button");
                btnMaint.type = "button";
                btnMaint.className = "btn-action-sm";
                btnMaint.textContent = "Bakım";
                btnMaint.setAttribute("data-action", "maint");
                btnMaint.setAttribute("data-id", item.id);
                actionGroup.appendChild(btnMaint);

                var btnEdit = document.createElement("button");
                btnEdit.type = "button";
                btnEdit.className = "btn-action-sm";
                btnEdit.textContent = "Düzenle";
                btnEdit.setAttribute("data-action", "edit");
                btnEdit.setAttribute("data-id", item.id);
                actionGroup.appendChild(btnEdit);
            }

            if (canDelete) {
                var btnDel = document.createElement("button");
                btnDel.type = "button";
                btnDel.className = "btn-danger-sm";
                btnDel.textContent = "Sil";
                btnDel.setAttribute("data-action", "delete");
                btnDel.setAttribute("data-id", item.id);
                actionGroup.appendChild(btnDel);
            }

            tdActions.appendChild(actionGroup);

            tr.appendChild(tdCode);
            tr.appendChild(tdName);
            tr.appendChild(tdCategory);
            tr.appendChild(tdUnit);
            tr.appendChild(tdLocation);
            tr.appendChild(tdAssignee);
            tr.appendChild(tdValue);
            tr.appendChild(tdStatus);
            tr.appendChild(tdActions);
            assetTableBody.appendChild(tr);
        }
    }

    function loadAssets() {
        var params = new URLSearchParams();
        if (queryInput && queryInput.value) {
            params.set("query", queryInput.value);
        }
        if (categorySelect && categorySelect.value) {
            params.set("category", categorySelect.value);
        }
        if (unitSelect && unitSelect.value) {
            params.set("unit", unitSelect.value);
        }
        if (statusSelect && statusSelect.value) {
            params.set("status", statusSelect.value);
        }
        if (conditionSelect && conditionSelect.value) {
            params.set("condition", conditionSelect.value);
        }
        if (warrantySelect && warrantySelect.value) {
            params.set("warrantyFilter", warrantySelect.value);
        }
        if (sortSelect && sortSelect.value) {
            params.set("sortBy", sortSelect.value);
        }

        apiRequest("/api/assets").then(function (allData) {
            allAssetsCache = allData;
            syncFilterSelectOptions(allData);
            return apiRequest("/api/assets?" + params.toString());
        }).then(function (filtered) {
            currentAssetsList = filtered;
            renderAssetRows(filtered);

            var filteredSum = 0;
            for (var i = 0; i < filtered.length; i++) {
                filteredSum += Number(filtered[i].estimatedValue || 0);
            }

            if (resultCountEl) {
                resultCountEl.textContent =
                    "Toplam " + allAssetsCache.length + " demo kayıttan " + filtered.length +
                    " tanesi gösteriliyor (Liste Toplam Değeri: " + formatCurrency(filteredSum) + ")";
            }

            if (filtered.length === 0) {
                if (assetTableWrapper) {
                    assetTableWrapper.hidden = true;
                }
                if (emptyState) {
                    emptyState.hidden = false;
                }
            } else {
                if (assetTableWrapper) {
                    assetTableWrapper.hidden = false;
                }
                if (emptyState) {
                    emptyState.hidden = true;
                }
            }
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    function exportCurrentAssetsCsv() {
        var rows = currentAssetsList && currentAssetsList.length > 0 ? currentAssetsList : allAssetsCache;
        if (!rows || rows.length === 0) {
            showToast("Dışa aktarılacak varlık kaydı bulunamadı.", true);
            return;
        }
        var headers = [
            "Varlık Kodu", "TİF Kodu", "Barkod", "Varlık Adı", "Kategori",
            "Marka/Model", "Seri No", "Birim", "Konum", "Sorumlu",
            "Durum", "Kondisyon", "Edinme Tarihi", "Garanti Bitiş", "Tahmini Değer (TL)"
        ];
        var lines = [headers.join(";")];
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var vals = [
                r.code, r.tifCode, r.barcode, r.name, r.category,
                r.brandModel, r.serialNumber, r.unit, r.location, r.assignee,
                r.status, r.condition, r.acquisitionDate, r.warrantyEndDate, r.estimatedValue
            ].map(function (v) {
                return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
            });
            lines.push(vals.join(";"));
        }
        var csvContent = "\uFEFF" + lines.join("\r\n");
        var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "gebze-varlik-envanter-demo.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(rows.length + " adet varlık kaydı CSV olarak indirildi.");
    }

    function openBarcodeLabelModal(assetId) {
        var found = null;
        for (var i = 0; i < allAssetsCache.length; i++) {
            if (String(allAssetsCache[i].id) === String(assetId)) {
                found = allAssetsCache[i];
                break;
            }
        }
        if (!found) {
            return;
        }
        document.getElementById("print-modal-title").textContent = "Kurumsal Envanter Barkod Etiketi (" + found.code + ")";
        var box = document.getElementById("print-preview-content");
        box.innerHTML =
            "<div style='text-align:center;border-bottom:2px solid #0f1e36;padding-bottom:0.5rem;margin-bottom:0.75rem;'>" +
            "<strong>GEBZE BELEDİYESİ TAŞINIR MAL ENVANTER ETİKETİ (DEMO)</strong>" +
            "</div>" +
            "<div class='detail-grid'>" +
            "<div class='detail-item'><span>Varlık Kodu</span><strong>" + escapeHtml(found.code) + "</strong></div>" +
            "<div class='detail-item'><span>TİF Hesap Kodu</span><strong>" + escapeHtml(found.tifCode || "-") + "</strong></div>" +
            "<div class='detail-item'><span>Varlık Adı</span><strong>" + escapeHtml(found.name) + "</strong></div>" +
            "<div class='detail-item'><span>Seri No</span><strong>" + escapeHtml(found.serialNumber || "-") + "</strong></div>" +
            "<div class='detail-item'><span>Birim</span><strong>" + escapeHtml(found.unit) + "</strong></div>" +
            "<div class='detail-item'><span>Konum</span><strong>" + escapeHtml(found.location) + "</strong></div>" +
            "</div>" +
            "<div class='barcode-visual'>" +
            "<div class='barcode-bars'>||| || |||| | ||| |||| || | |||| |||</div>" +
            "<div class='barcode-number'>" + escapeHtml(found.barcode || found.code) + "</div>" +
            "</div>";
        openModal("modal-print-preview");
    }

    function openZimmetSlipModal(assignmentId) {
        var found = null;
        for (var i = 0; i < currentAssignmentsList.length; i++) {
            if (String(currentAssignmentsList[i].id) === String(assignmentId)) {
                found = currentAssignmentsList[i];
                break;
            }
        }
        if (!found) {
            return;
        }
        document.getElementById("print-modal-title").textContent = "Taşınır Mal Zimmet Fişi (" + found.documentNo + ")";
        var box = document.getElementById("print-preview-content");
        box.innerHTML =
            "<div style='text-align:center;border-bottom:2px solid #0f1e36;padding-bottom:0.6rem;margin-bottom:0.85rem;'>" +
            "<h3>TAŞINIR MAL TESLİM / ZİMMET FİŞİ (DEMO BELGESİ)</h3>" +
            "<small>Fiş No: <strong>" + escapeHtml(found.documentNo) + "</strong> &bull; Düzenleme Tarihi: " + escapeHtml(found.assignedAt) + "</small>" +
            "</div>" +
            "<div class='detail-grid'>" +
            "<div class='detail-item'><span>Varlık Kodu</span><strong>" + escapeHtml(found.assetCode) + "</strong></div>" +
            "<div class='detail-item'><span>Varlık Adı</span><strong>" + escapeHtml(found.assetName) + "</strong></div>" +
            "<div class='detail-item'><span>Teslim Alan Sorumlu</span><strong>" + escapeHtml(found.assigneeName) + "</strong></div>" +
            "<div class='detail-item'><span>Görev / Unvan</span><strong>" + escapeHtml(found.assigneeTitle || "-") + "</strong></div>" +
            "<div class='detail-item'><span>Birim</span><strong>" + escapeHtml(found.unit) + "</strong></div>" +
            "<div class='detail-item'><span>Bulunduğu Yer / Oda</span><strong>" + escapeHtml(found.location) + "</strong></div>" +
            "<div class='detail-item'><span>Zimmet Durumu</span><strong>" + escapeHtml(found.status) + "</strong></div>" +
            "<div class='detail-item'><span>Açıklama</span><strong>" + escapeHtml(found.note || "-") + "</strong></div>" +
            "</div>" +
            "<div class='signature-grid'>" +
            "<div><strong>TESLİM EDEN (Taşınır Kayıt Yetkilisi)</strong><br><br>" + escapeHtml(found.assignedBy) + "<br><em>(İmza)</em></div>" +
            "<div><strong>TESLİM ALAN (Zimmet Sorumlusu)</strong><br><br>" + escapeHtml(found.assigneeName) + "<br><em>(İmza)</em></div>" +
            "</div>";
        openModal("modal-print-preview");
    }

    function openCreateAssetModal() {
        document.getElementById("modal-asset-title").textContent = "Yeni Demo Varlık Ekle";
        document.getElementById("form-asset").reset();
        document.getElementById("asset-id").value = "";
        document.getElementById("asset-status").value = "Depoda";
        document.getElementById("asset-condition").value = "Çok İyi";
        document.getElementById("asset-tif").value = "255.02.01.01";
        document.getElementById("asset-value").value = "25000";
        openModal("modal-asset-form");
    }

    function openEditAssetModal(assetId) {
        var found = null;
        for (var i = 0; i < allAssetsCache.length; i++) {
            if (String(allAssetsCache[i].id) === String(assetId)) {
                found = allAssetsCache[i];
                break;
            }
        }
        if (!found) {
            return;
        }
        document.getElementById("modal-asset-title").textContent = "Varlık Kaydını Düzenle (" + found.code + ")";
        document.getElementById("asset-id").value = found.id;
        document.getElementById("asset-code").value = found.code;
        document.getElementById("asset-tif").value = found.tifCode || "";
        document.getElementById("asset-barcode").value = found.barcode || "";
        document.getElementById("asset-name").value = found.name;
        document.getElementById("asset-category").value = found.category;
        document.getElementById("asset-status").value = found.status;
        document.getElementById("asset-condition").value = found.condition || "İyi";
        document.getElementById("asset-brand").value = found.brandModel || "";
        document.getElementById("asset-serial").value = found.serialNumber || "";
        document.getElementById("asset-unit").value = found.unit;
        document.getElementById("asset-location").value = found.location;
        document.getElementById("asset-assignee").value = found.assignee;
        document.getElementById("asset-value").value = found.estimatedValue != null ? found.estimatedValue : 0;
        document.getElementById("asset-date").value = found.acquisitionDate || "";
        document.getElementById("asset-warranty").value = found.warrantyEndDate || "";
        document.getElementById("asset-supplier").value = found.supplier || "DMO (Devlet Malzeme Ofisi - Demo)";
        document.getElementById("asset-notes").value = found.notes || "";
        openModal("modal-asset-form");
    }

    function renderMaintenanceFeed(containerId, maintenances) {
        var container = document.getElementById(containerId);
        if (!container) {
            return;
        }
        container.innerHTML = "";
        if (!maintenances || maintenances.length === 0) {
            container.textContent = "Bu varlığa ait bakım veya kalibrasyon kaydı bulunmuyor.";
            return;
        }
        for (var i = 0; i < maintenances.length; i++) {
            var m = maintenances[i];
            var div = document.createElement("div");
            div.className = "activity-item";
            div.innerHTML =
                "<div class='activity-item-top'>" +
                "<span class='asset-code'>" + escapeHtml(m.orderNo) + " • " + escapeHtml(m.maintenanceType) + "</span>" +
                "<span class='activity-time'>" + escapeHtml(m.startedAt) + " (" + escapeHtml(m.status) + ")</span>" +
                "</div>" +
                "<div><strong>" + escapeHtml(m.vendorOrTechnician) + ":</strong> " + escapeHtml(m.issueDescription) +
                (m.resolutionNote ? " &rarr; <em>" + escapeHtml(m.resolutionNote) + "</em>" : "") +
                " (" + formatCurrency(m.cost) + ")</div>";
            container.appendChild(div);
        }
    }

    function openAssetDetailModal(assetId) {
        apiRequest("/api/assets/" + assetId).then(function (data) {
            var a = data.asset;
            document.getElementById("detail-asset-title").textContent = a.code + " — " + a.name;

            var summaryEl = document.getElementById("detail-asset-summary");
            summaryEl.innerHTML = "";
            var fields = [
                ["Varlık Kodu", a.code],
                ["TİF Hesap Kodu", a.tifCode || "-"],
                ["Barkod No", a.barcode || "-"],
                ["Kategori", a.category],
                ["Marka / Model", a.brandModel || "-"],
                ["Seri Numarası", a.serialNumber || "-"],
                ["Mevcut Birim", a.unit],
                ["Mevcut Konum", a.location],
                ["Mevcut Sorumlu", a.assignee],
                ["Durum", a.status],
                ["Fiziksel Kondisyon", a.condition || "-"],
                ["Tahmini Değer", formatCurrency(a.estimatedValue)],
                ["Edinme Yöntemi", a.supplier || "-"],
                ["Edinme Tarihi", a.acquisitionDate || "-"],
                ["Garanti Bitiş Tarihi", a.warrantyEndDate || "-"],
                ["Son Güncelleme", a.updatedAt || "-"],
                ["Açıklama", a.notes || "-"]
            ];

            for (var i = 0; i < fields.length; i++) {
                var div = document.createElement("div");
                div.className = "detail-item";
                var sp = document.createElement("span");
                sp.textContent = fields[i][0];
                var st = document.createElement("strong");
                st.textContent = fields[i][1];
                div.appendChild(sp);
                div.appendChild(st);
                summaryEl.appendChild(div);
            }

            renderMaintenanceFeed("detail-asset-maintenances", data.maintenances);
            renderActivityFeed("detail-asset-movements", data.movements);
            openModal("modal-asset-detail");
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // 3. ZİMMET İŞLEMLERİ
    function populateAssetSelect(selectId, preselectedId) {
        var sel = document.getElementById(selectId);
        if (!sel) {
            return;
        }
        sel.innerHTML = "";
        for (var i = 0; i < allAssetsCache.length; i++) {
            var a = allAssetsCache[i];
            var opt = document.createElement("option");
            opt.value = a.id;
            opt.textContent = a.code + " — " + a.name + " [" + a.status + "]";
            sel.appendChild(opt);
        }
        if (preselectedId) {
            sel.value = String(preselectedId);
        }
    }

    function openAssignModal(preselectedAssetId) {
        apiRequest("/api/assets").then(function (assets) {
            allAssetsCache = assets;
            document.getElementById("form-assign").reset();
            populateAssetSelect("assign-asset-id", preselectedAssetId);

            var selectedId = preselectedAssetId || (assets[0] && assets[0].id);
            for (var i = 0; i < assets.length; i++) {
                if (String(assets[i].id) === String(selectedId)) {
                    document.getElementById("assign-unit").value = assets[i].unit;
                    document.getElementById("assign-location").value = assets[i].location;
                    break;
                }
            }
            openModal("modal-assign-form");
        });
    }

    function loadAssignments() {
        var statusFilter = document.getElementById("assign-status-filter").value;
        var url = "/api/assignments" + (statusFilter ? ("?status=" + encodeURIComponent(statusFilter)) : "");

        apiRequest(url).then(function (list) {
            currentAssignmentsList = list;
            var countEl = document.getElementById("assign-result-count");
            if (countEl) {
                countEl.textContent = "Toplam " + list.length + " zimmet kaydı listeleniyor";
            }

            var tbody = document.getElementById("assignment-table-body");
            tbody.innerHTML = "";
            var canWrite = currentSession && currentSession.canWrite;

            for (var i = 0; i < list.length; i++) {
                var a = list[i];
                var tr = document.createElement("tr");

                var tdDoc = document.createElement("td");
                tdDoc.innerHTML = "<span class='asset-code'>" + escapeHtml(a.documentNo) + "</span>";

                var tdAsset = document.createElement("td");
                tdAsset.innerHTML = "<strong>" + escapeHtml(a.assetCode) + "</strong><br>" + escapeHtml(a.assetName);

                var tdPerson = document.createElement("td");
                tdPerson.innerHTML = "<strong>" + escapeHtml(a.assigneeName) + "</strong><br><small>" + escapeHtml(a.assigneeTitle || "") + "</small>";

                var tdLoc = document.createElement("td");
                tdLoc.innerHTML = escapeHtml(a.unit) + "<br><small>" + escapeHtml(a.location) + "</small>";

                var tdAssignedAt = document.createElement("td");
                tdAssignedAt.textContent = a.assignedAt;

                var tdReturnedAt = document.createElement("td");
                tdReturnedAt.textContent = a.returnedAt || "—";

                var tdStatus = document.createElement("td");
                var isAktif = a.status === "AKTIF";
                tdStatus.innerHTML = "<span class='status-badge " + (isAktif ? "status-aktif" : "status-depoda") + "'>" +
                    (isAktif ? "Aktif Zimmet" : "İade Edildi") + "</span>";

                var tdAction = document.createElement("td");
                var actGroup = document.createElement("div");
                actGroup.className = "row-actions";

                var btnSlip = document.createElement("button");
                btnSlip.type = "button";
                btnSlip.className = "btn-action-sm";
                btnSlip.textContent = "Fiş Yazdır";
                btnSlip.setAttribute("data-slip-id", a.id);
                actGroup.appendChild(btnSlip);

                if (isAktif && canWrite) {
                    var btnRet = document.createElement("button");
                    btnRet.type = "button";
                    btnRet.className = "btn-action-sm";
                    btnRet.textContent = "İade Al";
                    btnRet.setAttribute("data-return-id", a.id);
                    actGroup.appendChild(btnRet);
                }

                tdAction.appendChild(actGroup);

                tr.appendChild(tdDoc);
                tr.appendChild(tdAsset);
                tr.appendChild(tdPerson);
                tr.appendChild(tdLoc);
                tr.appendChild(tdAssignedAt);
                tr.appendChild(tdReturnedAt);
                tr.appendChild(tdStatus);
                tr.appendChild(tdAction);
                tbody.appendChild(tr);
            }
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // 4. BAKIM VE KALİBRASYON
    function openMaintenanceModal(preselectedAssetId) {
        apiRequest("/api/assets").then(function (assets) {
            allAssetsCache = assets;
            document.getElementById("form-maint").reset();
            populateAssetSelect("maint-asset-id", preselectedAssetId);
            document.getElementById("maint-vendor").value = "Kurum İçi Teknik Servis Atölyesi (Demo)";
            document.getElementById("maint-cost").value = "2500";
            openModal("modal-maint-form");
        });
    }

    function loadMaintenances() {
        var statusFilter = document.getElementById("maint-status-filter").value;
        var url = "/api/maintenances" + (statusFilter ? ("?status=" + encodeURIComponent(statusFilter)) : "");

        apiRequest(url).then(function (list) {
            currentMaintenancesList = list;
            var countEl = document.getElementById("maint-result-count");
            if (countEl) {
                countEl.textContent = "Toplam " + list.length + " bakım / kalibrasyon iş emri listeleniyor";
            }

            var tbody = document.getElementById("maintenance-table-body");
            tbody.innerHTML = "";
            var canWrite = currentSession && currentSession.canWrite;

            for (var i = 0; i < list.length; i++) {
                var m = list[i];
                var tr = document.createElement("tr");
                var isOngoing = m.status === "DEVAM_EDIYOR";

                tr.innerHTML =
                    "<td><span class='asset-code'>" + escapeHtml(m.orderNo) + "</span></td>" +
                    "<td><strong>" + escapeHtml(m.assetCode) + "</strong><br>" + escapeHtml(m.assetName) + "</td>" +
                    "<td><strong>" + escapeHtml(m.maintenanceType) + "</strong><br><span class='sub-meta'>Öncelik: " + escapeHtml(m.priority) + "</span></td>" +
                    "<td>" + escapeHtml(m.vendorOrTechnician) + "</td>" +
                    "<td>" + escapeHtml(m.issueDescription) +
                    (m.resolutionNote ? "<br><small><strong>Sonuç:</strong> " + escapeHtml(m.resolutionNote) + "</small>" : "") + "</td>" +
                    "<td class='value-cell'>" + formatCurrency(m.cost) + "</td>" +
                    "<td>" + escapeHtml(m.startedAt) + "<br><small>" + escapeHtml(m.completedAt || "Devam ediyor") + "</small></td>";

                var tdAct = document.createElement("td");
                var badge = document.createElement("span");
                badge.className = "status-badge " + (isOngoing ? "status-bakimda" : "status-aktif");
                badge.textContent = isOngoing ? "Devam Ediyor" : "Tamamlandı";
                tdAct.appendChild(badge);

                if (isOngoing && canWrite) {
                    var btnComp = document.createElement("button");
                    btnComp.type = "button";
                    btnComp.className = "btn-action-sm";
                    btnComp.style.marginLeft = "0.4rem";
                    btnComp.textContent = "Tamamla";
                    btnComp.setAttribute("data-complete-maint-id", m.id);
                    tdAct.appendChild(btnComp);
                }

                tr.appendChild(tdAct);
                tbody.appendChild(tr);
            }
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // 5. HAREKETLER VE TRANSFER
    function openMovementModal() {
        apiRequest("/api/assets").then(function (assets) {
            allAssetsCache = assets;
            document.getElementById("form-movement").reset();
            populateAssetSelect("move-asset-id");
            if (assets[0]) {
                document.getElementById("move-to-unit").value = assets[0].unit;
                document.getElementById("move-to-location").value = assets[0].location;
            }
            openModal("modal-movement-form");
        });
    }

    function loadMovements() {
        var typeFilter = document.getElementById("movement-type-filter").value;
        var url = "/api/movements" + (typeFilter ? ("?type=" + encodeURIComponent(typeFilter)) : "");

        apiRequest(url).then(function (list) {
            var countEl = document.getElementById("movement-result-count");
            if (countEl) {
                countEl.textContent = "Toplam " + list.length + " hareket kaydı listeleniyor";
            }

            var tbody = document.getElementById("movement-table-body");
            tbody.innerHTML = "";

            for (var i = 0; i < list.length; i++) {
                var m = list[i];
                var tr = document.createElement("tr");
                tr.innerHTML =
                    "<td>" + escapeHtml(m.timestamp) + "</td>" +
                    "<td><span class='asset-code'>" + escapeHtml(m.typeLabel) + "</span></td>" +
                    "<td><strong>" + escapeHtml(m.assetCode) + "</strong><br>" + escapeHtml(m.assetName) + "</td>" +
                    "<td>" + escapeHtml(m.fromUnit || "-") + "<br><small>" + escapeHtml(m.fromLocation || "-") + "</small></td>" +
                    "<td><strong>" + escapeHtml(m.toUnit || "-") + "</strong><br><small>" + escapeHtml(m.toLocation || "-") + "</small></td>" +
                    "<td>" + escapeHtml(m.performedBy) + "</td>" +
                    "<td>" + escapeHtml(m.note || "—") + "</td>";
                tbody.appendChild(tr);
            }
        }).catch(function (err) {
            showToast(err.message, true);
        });
    }

    // 6. HIZLI BARKOD / KOD ENVANTER SORGULAMA
    function performLookup(term) {
        var box = document.getElementById("lookup-result-box");
        if (!term || !term.trim()) {
            showToast("Sorgulamak için barkod, varlık kodu veya seri no girin.", true);
            return;
        }
        apiRequest("/api/assets/lookup?term=" + encodeURIComponent(term.trim()))
            .then(function (data) {
                var a = data.asset;
                box.hidden = false;
                box.innerHTML =
                    "<div class='page-header' style='margin-bottom:0.75rem;'>" +
                    "<div><strong>Doğrulanan Kayıt: " + escapeHtml(a.code) + " — " + escapeHtml(a.name) + "</strong>" +
                    "<span class='sub-meta'>Barkod: " + escapeHtml(a.barcode) + " • TİF: " + escapeHtml(a.tifCode) + " • Seri No: " + escapeHtml(a.serialNumber) + "</span></div>" +
                    "<span class='status-badge " + getStatusClass(a.status) + "'>" + escapeHtml(a.status) + " (" + escapeHtml(a.condition) + ")</span>" +
                    "</div>" +
                    "<div class='detail-grid'>" +
                    "<div class='detail-item'><span>Birim</span><strong>" + escapeHtml(a.unit) + "</strong></div>" +
                    "<div class='detail-item'><span>Konum</span><strong>" + escapeHtml(a.location) + "</strong></div>" +
                    "<div class='detail-item'><span>Zimmet Sorumlusu</span><strong>" + escapeHtml(a.assignee) + "</strong></div>" +
                    "<div class='detail-item'><span>Tahmini Değer</span><strong>" + formatCurrency(a.estimatedValue) + "</strong></div>" +
                    "<div class='detail-item'><span>Garanti Bitiş</span><strong>" + escapeHtml(a.warrantyEndDate || "-") + "</strong></div>" +
                    "<div class='detail-item'><span>Toplam Hareket / Bakım</span><strong>" +
                    (data.movements ? data.movements.length : 0) + " Hareket / " +
                    (data.maintenances ? data.maintenances.length : 0) + " Bakım</strong></div>" +
                    "</div>";
                showToast(a.code + " envanter kaydı doğrulandı.");
            })
            .catch(function (err) {
                box.hidden = false;
                box.innerHTML = "<strong>Kayıt Bulunamadı:</strong> " + escapeHtml(err.message);
                showToast(err.message, true);
            });
    }

    function refreshAllData() {
        loadDashboard();
        loadAssets();
        loadAssignments();
        loadMaintenances();
        loadMovements();
    }

    // OLAY DİNLEYİCİLERİ
    function bindEvents() {
        if (loginForm) {
            loginForm.addEventListener("submit", function (e) {
                e.preventDefault();
                performLogin(loginUsername.value, loginPassword.value);
            });
        }

        var roleBtns = document.querySelectorAll(".role-card-btn");
        for (var i = 0; i < roleBtns.length; i++) {
            roleBtns[i].addEventListener("click", function () {
                var u = this.getAttribute("data-user");
                var p = this.getAttribute("data-pass");
                loginUsername.value = u;
                loginPassword.value = p;
                performLogin(u, p);
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener("click", performLogout);
        }

        var navTabs = document.querySelectorAll(".nav-tab");
        for (var j = 0; j < navTabs.length; j++) {
            navTabs[j].addEventListener("click", function () {
                switchView(this.getAttribute("data-view"));
            });
        }

        var jumpBtns = document.querySelectorAll("[data-jump-view]");
        for (var k = 0; k < jumpBtns.length; k++) {
            jumpBtns[k].addEventListener("click", function () {
                switchView(this.getAttribute("data-jump-view"));
            });
        }

        var closeBtns = document.querySelectorAll("[data-close-modal]");
        for (var c = 0; c < closeBtns.length; c++) {
            closeBtns[c].addEventListener("click", function () {
                closeModal(this.getAttribute("data-close-modal"));
            });
        }

        document.getElementById("btn-print-sheet").addEventListener("click", function () {
            window.print();
        });

        // Hızlı işlem butonları
        document.getElementById("dash-btn-new-asset").addEventListener("click", openCreateAssetModal);
        document.getElementById("btn-open-create-asset").addEventListener("click", openCreateAssetModal);
        document.getElementById("btn-export-csv").addEventListener("click", exportCurrentAssetsCsv);

        document.getElementById("dash-btn-new-assign").addEventListener("click", function () {
            openAssignModal();
        });
        document.getElementById("btn-open-assign-modal").addEventListener("click", function () {
            openAssignModal();
        });

        document.getElementById("dash-btn-new-maint").addEventListener("click", function () {
            openMaintenanceModal();
        });
        document.getElementById("btn-open-maint-modal").addEventListener("click", function () {
            openMaintenanceModal();
        });

        document.getElementById("dash-btn-new-move").addEventListener("click", openMovementModal);
        document.getElementById("btn-open-movement-modal").addEventListener("click", openMovementModal);

        // Varlık filtreleme olayları
        if (filterForm) {
            filterForm.addEventListener("submit", function (e) {
                e.preventDefault();
                loadAssets();
            });
        }
        var filterControls = [queryInput, categorySelect, unitSelect, statusSelect, conditionSelect, warrantySelect, sortSelect];
        for (var f = 0; f < filterControls.length; f++) {
            if (filterControls[f]) {
                var evtName = filterControls[f].tagName === "INPUT" ? "input" : "change";
                filterControls[f].addEventListener(evtName, loadAssets);
            }
        }

        function resetAssetFilters() {
            if (filterForm) {
                filterForm.reset();
            }
            loadAssets();
        }
        if (clearBtn) {
            clearBtn.addEventListener("click", resetAssetFilters);
        }
        if (emptyResetBtn) {
            emptyResetBtn.addEventListener("click", resetAssetFilters);
        }

        // Varlık tablosu satır içi işlemler
        if (assetTableBody) {
            assetTableBody.addEventListener("click", function (e) {
                var btn = e.target.closest("button[data-action]");
                if (!btn) {
                    return;
                }
                var action = btn.getAttribute("data-action");
                var id = btn.getAttribute("data-id");
                if (action === "detail") {
                    openAssetDetailModal(id);
                } else if (action === "label") {
                    openBarcodeLabelModal(id);
                } else if (action === "assign") {
                    openAssignModal(id);
                } else if (action === "maint") {
                    openMaintenanceModal(id);
                } else if (action === "edit") {
                    openEditAssetModal(id);
                } else if (action === "delete") {
                    apiRequest("/api/assets/" + id, { method: "DELETE" })
                        .then(function (res) {
                            showToast(res.code + " kodlu varlık kaydı silindi.");
                            refreshAllData();
                        })
                        .catch(function (err) {
                            showToast(err.message, true);
                        });
                }
            });
        }

        // Varlık Ekle / Düzenle
        document.getElementById("form-asset").addEventListener("submit", function (e) {
            e.preventDefault();
            var id = document.getElementById("asset-id").value;
            var payload = {
                code: document.getElementById("asset-code").value,
                tifCode: document.getElementById("asset-tif").value,
                barcode: document.getElementById("asset-barcode").value,
                name: document.getElementById("asset-name").value,
                category: document.getElementById("asset-category").value,
                status: document.getElementById("asset-status").value,
                condition: document.getElementById("asset-condition").value,
                brandModel: document.getElementById("asset-brand").value,
                serialNumber: document.getElementById("asset-serial").value,
                unit: document.getElementById("asset-unit").value,
                location: document.getElementById("asset-location").value,
                assignee: document.getElementById("asset-assignee").value,
                estimatedValue: Number(document.getElementById("asset-value").value || 0),
                acquisitionDate: document.getElementById("asset-date").value,
                warrantyEndDate: document.getElementById("asset-warranty").value,
                supplier: document.getElementById("asset-supplier").value,
                notes: document.getElementById("asset-notes").value
            };

            var method = id ? "PUT" : "POST";
            var url = id ? ("/api/assets/" + id) : "/api/assets";

            apiRequest(url, {
                method: method,
                body: JSON.stringify(payload)
            }).then(function (saved) {
                closeModal("modal-asset-form");
                showToast(saved.code + " varlık kaydı başarıyla kaydedildi.");
                refreshAllData();
            }).catch(function (err) {
                showToast(err.message, true);
            });
        });

        // Zimmet Fişi Oluşturma
        document.getElementById("form-assign").addEventListener("submit", function (e) {
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
            }).then(function (created) {
                closeModal("modal-assign-form");
                showToast(created.documentNo + " zimmet fişi oluşturuldu.");
                refreshAllData();
            }).catch(function (err) {
                showToast(err.message, true);
            });
        });

        // Zimmet Tablosu Aksiyonları (Fiş Yazdır / İade Al)
        document.getElementById("assignment-table-body").addEventListener("click", function (e) {
            var slipBtn = e.target.closest("button[data-slip-id]");
            if (slipBtn) {
                openZimmetSlipModal(slipBtn.getAttribute("data-slip-id"));
                return;
            }
            var retBtn = e.target.closest("button[data-return-id]");
            if (retBtn) {
                var assignId = retBtn.getAttribute("data-return-id");
                var found = null;
                for (var i = 0; i < currentAssignmentsList.length; i++) {
                    if (String(currentAssignmentsList[i].id) === String(assignId)) {
                        found = currentAssignmentsList[i];
                        break;
                    }
                }
                if (!found) {
                    return;
                }
                document.getElementById("return-assignment-id").value = found.id;
                document.getElementById("return-summary-text").textContent =
                    found.documentNo + " — " + found.assetCode + " (" + found.assetName + ") zimmeti " +
                    found.assigneeName + " sorumlusundan teslim alınıyor.";
                openModal("modal-return-form");
            }
        });

        document.getElementById("form-return").addEventListener("submit", function (e) {
            e.preventDefault();
            var assignId = document.getElementById("return-assignment-id").value;
            var payload = {
                targetStatus: document.getElementById("return-status").value,
                returnLocation: document.getElementById("return-location").value,
                returnNote: document.getElementById("return-note").value
            };

            apiRequest("/api/assignments/" + assignId + "/return", {
                method: "POST",
                body: JSON.stringify(payload)
            }).then(function (returned) {
                closeModal("modal-return-form");
                showToast(returned.documentNo + " zimmeti başarıyla iade alındı.");
                refreshAllData();
            }).catch(function (err) {
                showToast(err.message, true);
            });
        });

        // Bakım / Kalibrasyon İş Emri Oluşturma ve Tamamlama
        document.getElementById("form-maint").addEventListener("submit", function (e) {
            e.preventDefault();
            var payload = {
                assetId: Number(document.getElementById("maint-asset-id").value),
                maintenanceType: document.getElementById("maint-type").value,
                priority: document.getElementById("maint-priority").value,
                vendorOrTechnician: document.getElementById("maint-vendor").value,
                estimatedCost: Number(document.getElementById("maint-cost").value || 0),
                issueDescription: document.getElementById("maint-desc").value
            };

            apiRequest("/api/maintenances", {
                method: "POST",
                body: JSON.stringify(payload)
            }).then(function (created) {
                closeModal("modal-maint-form");
                showToast(created.orderNo + " bakım iş emri açıldı.");
                refreshAllData();
            }).catch(function (err) {
                showToast(err.message, true);
            });
        });

        document.getElementById("maintenance-table-body").addEventListener("click", function (e) {
            var btn = e.target.closest("button[data-complete-maint-id]");
            if (!btn) {
                return;
            }
            var maintId = btn.getAttribute("data-complete-maint-id");
            var found = null;
            for (var i = 0; i < currentMaintenancesList.length; i++) {
                if (String(currentMaintenancesList[i].id) === String(maintId)) {
                    found = currentMaintenancesList[i];
                    break;
                }
            }
            if (!found) {
                return;
            }
            document.getElementById("comp-maint-id").value = found.id;
            document.getElementById("comp-maint-summary").textContent =
                found.orderNo + " — " + found.assetCode + " (" + found.assetName + ") için " +
                found.maintenanceType + " işlemi tamamlanıyor.";
            document.getElementById("comp-final-cost").value = found.cost || 0;
            openModal("modal-maint-complete");
        });

        document.getElementById("form-maint-complete").addEventListener("submit", function (e) {
            e.preventDefault();
            var maintId = document.getElementById("comp-maint-id").value;
            var payload = {
                targetStatus: document.getElementById("comp-target-status").value,
                targetCondition: document.getElementById("comp-target-condition").value,
                returnLocation: document.getElementById("comp-return-location").value,
                finalCost: Number(document.getElementById("comp-final-cost").value || 0),
                resolutionNote: document.getElementById("comp-resolution").value
            };

            apiRequest("/api/maintenances/" + maintId + "/complete", {
                method: "POST",
                body: JSON.stringify(payload)
            }).then(function (done) {
                closeModal("modal-maint-complete");
                showToast(done.orderNo + " bakım kaydı tamamlandı.");
                refreshAllData();
            }).catch(function (err) {
                showToast(err.message, true);
            });
        });

        // Hareket / Transfer Kaydetme
        document.getElementById("form-movement").addEventListener("submit", function (e) {
            e.preventDefault();
            var payload = {
                assetId: Number(document.getElementById("move-asset-id").value),
                type: document.getElementById("move-type").value,
                toUnit: document.getElementById("move-to-unit").value,
                toLocation: document.getElementById("move-to-location").value,
                note: document.getElementById("move-note").value
            };

            apiRequest("/api/movements", {
                method: "POST",
                body: JSON.stringify(payload)
            }).then(function (mv) {
                closeModal("modal-movement-form");
                showToast(mv.assetCode + " için " + mv.typeLabel + " hareketi kaydedildi.");
                refreshAllData();
            }).catch(function (err) {
                showToast(err.message, true);
            });
        });

        // Sayım & Barkod Sorgulama
        document.getElementById("lookup-form").addEventListener("submit", function (e) {
            e.preventDefault();
            performLookup(document.getElementById("lookup-input").value);
        });

        var sampleChips = document.querySelectorAll("[data-sample-code]");
        for (var s = 0; s < sampleChips.length; s++) {
            sampleChips[s].addEventListener("click", function () {
                var code = this.getAttribute("data-sample-code");
                document.getElementById("lookup-input").value = code;
                performLookup(code);
            });
        }

        document.getElementById("assign-status-filter").addEventListener("change", loadAssignments);
        document.getElementById("maint-status-filter").addEventListener("change", loadMaintenances);
        document.getElementById("movement-type-filter").addEventListener("change", loadMovements);
    }

    function checkBackendHealth() {
        var healthDot = document.getElementById("health-dot");
        var healthText = document.getElementById("health-text");

        fetch("/api/health")
            .then(function (r) {
                return r.json();
            })
            .then(function (d) {
                if (d && d.status === "ok") {
                    healthDot.className = "status-dot ok";
                    healthText.textContent = "Servis Aktif";
                }
            })
            .catch(function () {
                if (healthDot) {
                    healthDot.className = "status-dot error";
                }
                if (healthText) {
                    healthText.textContent = "Bağlantı Yok";
                }
            });
    }

    bindEvents();
    checkBackendHealth();
    restoreSession();
})();

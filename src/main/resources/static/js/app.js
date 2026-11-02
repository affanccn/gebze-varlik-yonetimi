(function () {
    "use strict";

    var healthDot = document.getElementById("health-dot");
    var healthText = document.getElementById("health-text");

    function updateStatus(isOk, message) {
        if (!healthDot || !healthText) {
            return;
        }
        healthDot.className = "status-dot " + (isOk ? "ok" : "error");
        healthText.textContent = message;
    }

    fetch("/api/health", {
        method: "GET",
        headers: {
            "Accept": "application/json"
        }
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        })
        .then(function (data) {
            if (data && data.status === "ok") {
                updateStatus(true, "Arka uç servisi çalışıyor (/api/health: ok)");
            } else {
                updateStatus(false, "Beklenmeyen servis yanıtı");
            }
        })
        .catch(function () {
            updateStatus(false, "Arka uç servisine ulaşılamadı");
        });
})();


let entries = JSON.parse(localStorage.getItem("midnightDiaryEntries")) || [];
let currentId = null;

const dateInput = document.getElementById("entryDate");
const titleInput = document.getElementById("entryTitle");
const contentInput = document.getElementById("entryContent");
const entryList = document.getElementById("entryList");
const wordCount = document.getElementById("wordCount");
const pageTitle = document.getElementById("pageTitle");

function today() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().split("T")[0];
}

function formatDate(date) {
    if (!date) return "";
    return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function renderEntries() {
    entryList.innerHTML = "";

    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

    sorted.forEach(entry => {
        const button = document.createElement("button");
        button.className = "entry-item" + (entry.id === currentId ? " active" : "");
        button.innerHTML = `
            <strong>${escapeHtml(entry.title || "Untitled entry")}</strong>
            <span class="entry-date">${formatDate(entry.date)}</span>
        `;
        button.onclick = () => openEntry(entry.id);
        entryList.appendChild(button);
    });
}

function openEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    currentId = id;
    dateInput.value = entry.date;
    titleInput.value = entry.title;
    contentInput.value = entry.content;
    pageTitle.textContent = "Your thoughts";
    updateWordCount();
    renderEntries();
}

function newEntry() {
    currentId = null;
    dateInput.value = today();
    titleInput.value = "";
    contentInput.value = "";
    pageTitle.textContent = "Tonight's thoughts";
    updateWordCount();
    renderEntries();
    titleInput.focus();
}

function saveEntry() {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const date = dateInput.value || today();

    if (!title && !content) {
        alert("Write something first.");
        return;
    }

    if (currentId) {
        const entry = entries.find(e => e.id === currentId);
        entry.date = date;
        entry.title = title || "Untitled entry";
        entry.content = content;
    } else {
        const entry = {
            id: Date.now(),
            date: date,
            title: title || "Untitled entry",
            content: content
        };

        entries.push(entry);
        currentId = entry.id;
    }

    localStorage.setItem("midnightDiaryEntries", JSON.stringify(entries));
    renderEntries();
    alert("Entry saved.");
}

function deleteEntry() {
    if (!currentId) {
        newEntry();
        return;
    }

    if (!confirm("Delete this diary entry?")) return;

    entries = entries.filter(e => e.id !== currentId);
    localStorage.setItem("midnightDiaryEntries", JSON.stringify(entries));
    newEntry();
    renderEntries();
}

function updateWordCount() {
    const text = contentInput.value.trim();
    const count = text ? text.split(/\s+/).length : 0;
    wordCount.textContent = count + (count === 1 ? " word" : " words");
}


function exportBackup() {
    if (entries.length === 0) {
        alert("There are no diary entries to export yet.");
        return;
    }

    const backup = {
        app: "Midnight Diary",
        version: 1,
        exportedAt: new Date().toISOString(),
        entries: entries
    };

    const data = JSON.stringify(backup, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "midnight-diary-backup.json";
    link.click();

    URL.revokeObjectURL(url);
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);

            if (!backup || !Array.isArray(backup.entries)) {
                throw new Error("Invalid backup");
            }

            const validEntries = backup.entries.filter(entry =>
                entry &&
                typeof entry.id !== "undefined" &&
                typeof entry.date === "string" &&
                typeof entry.title === "string" &&
                typeof entry.content === "string"
            );

            if (validEntries.length !== backup.entries.length) {
                throw new Error("Invalid backup");
            }

            const currentIds = new Set(entries.map(entry => String(entry.id)));
            const newEntries = validEntries.filter(
                entry => !currentIds.has(String(entry.id))
            );

            if (newEntries.length === 0) {
                alert("No new entries were found. Your current diary was not changed.");
                event.target.value = "";
                return;
            }

            const message =
                "Found " + newEntries.length +
                " new entr" + (newEntries.length === 1 ? "y" : "ies") +
                ".\n\nYour current entries will be kept. Continue merging?";

            if (!confirm(message)) {
                event.target.value = "";
                return;
            }

            entries = [...entries, ...newEntries];
            entries.sort((a, b) => b.date.localeCompare(a.date));

            localStorage.setItem("midnightDiaryEntries", JSON.stringify(entries));

            renderEntries();

            if (entries.length > 0) {
                openEntry(entries[0].id);
            } else {
                newEntry();
            }

            alert(
                newEntries.length +
                " new entr" +
                (newEntries.length === 1 ? "y was" : "ies were") +
                " added. Your existing entries were kept."
            );
        } catch (error) {
            alert("This file is not a valid Midnight Diary backup.");
        }

        event.target.value = "";
    };

    reader.readAsText(file);
}

function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

contentInput.addEventListener("input", updateWordCount);

dateInput.value = today();
renderEntries();
updateWordCount();

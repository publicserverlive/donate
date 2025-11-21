// State
let projects = [];
let selectedIndices = new Set();
let favorites = new Set(JSON.parse(localStorage.getItem('favs') || '[]'));
let searchQuery = '';

// 1. Fetch and Parse
async function init() {
    try {
        const response = await fetch('README.md');
        const text = await response.text();
        parseData(text);
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.toLowerCase();
                renderGrid();
            });
        }

        renderGrid();
    } catch (e) {
        document.getElementById('grid').innerHTML = `<p style="color:red">ERROR: Could not load projects data</p>`;
    }
}

function parseData(text) {
    // Split by double newline
    const blocks = text.split(/\n\s*\n/);
    
    projects = blocks.map((block, index) => {
        const lines = block
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        if (lines.length < 2) return null; // Skip malformed

        const name = lines[0];
        const description = lines[1];
        const donationMethods = [];
        let updated = null;

        // Parse remaining lines as key:value, with special handling for "Updated"
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            const parts = line.split(':');
            if (parts.length >= 2) {
                const type = parts[0].trim();
                const value = parts.slice(1).join(':').trim();

                if (type.toLowerCase() === 'updated') {
                    updated = value;
                } else {
                    donationMethods.push({ type, address: value });
                }
            }
        }

        return { id: index, name, description, updated, donationMethods };
    }).filter(p => p !== null);
}

// 2. Rendering
function matchesSearch(project) {
    if (!searchQuery) return true;

    const q = searchQuery;
    const name = project.name.toLowerCase();
    const description = project.description.toLowerCase();
    const updated = (project.updated || '').toLowerCase();
    const methodsText = project.donationMethods
        .map(m => (m.type + ' ' + m.address).toLowerCase())
        .join(' ');

    return (
        name.includes(q) ||
        description.includes(q) ||
        updated.includes(q) ||
        methodsText.includes(q)
    );
}

function renderGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    const visibleProjects = projects.filter(p => matchesSearch(p));

    if (visibleProjects.length === 0) {
        grid.innerHTML = '<p style="color: var(--dim);">No projects match your search.</p>';
        updateCount();
        return;
    }

    visibleProjects.forEach(p => {
        // Sort so favorites appear first if we wanted, currently just standard order
        const card = document.createElement('div');
        const isFav = favorites.has(p.id);
        const isSel = selectedIndices.has(p.id);

        card.className = `card ${isSel ? 'selected' : ''}`;
        card.innerHTML = `
            <span class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(${p.id})">
                ${isFav ? '★' : '☆'}
            </span>
            <h3>${p.name}</h3>
            <p>${p.description}</p>
            ${p.updated ? `<p class="updated">Updated: ${p.updated}</p>` : ''}
            <div class="donation-links">
                ${renderLinks(p)}
            </div>
            <div class="actions">
                <button onclick="toggleSelect(${p.id})">
                    ${isSel ? '[ - REMOVE ]' : '[ + ADD TO LIST ]'}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    updateCount();
}

function renderLinks(project) {
    return project.donationMethods.map(m => {
        // Check if it looks like a crypto address or a URL
        const isUrl = m.address.startsWith('http');
        if (isUrl) {
            return `<span class="address-line"><a href="${m.address}" target="_blank" style="color:inherit">[${m.type}] Link</a></span>`;
        } else {
            return `<span class="address-line" onclick="showQR('${m.type}', '${m.address}')">[${m.type}] Copy/QR</span>`;
        }
    }).join('');
}

// 3. Interactions
function toggleSelect(id) {
    if (selectedIndices.has(id)) {
        selectedIndices.delete(id);
    } else {
        selectedIndices.add(id);
    }
    renderGrid();
}

function toggleFav(id) {
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    
    localStorage.setItem('favs', JSON.stringify(Array.from(favorites)));
    renderGrid();
}

function updateCount() {
    const el = document.getElementById('count');
    if (el) {
        el.innerText = selectedIndices.size;
    }
}

// 4. Hashing (Export/Import State)
function generateHash() {
    if (selectedIndices.size === 0) {
        alert("Select projects first.");
        return;
    }
    // Convert Set to Array -> JSON -> Base64
    const arr = Array.from(selectedIndices);
    const json = JSON.stringify(arr);
    const hash = btoa(json); // Encode
    
    const out = document.getElementById('hashOutput');
    out.style.display = 'block';
    out.innerText = hash;
    navigator.clipboard.writeText(hash).then(() => alert("Hash copied to clipboard!"));
}

function loadFromHash() {
    const input = document.getElementById('hashInput').value.trim();
    if (!input) return;

    try {
        const json = atob(input); // Decode
        const arr = JSON.parse(json);
        if (Array.isArray(arr)) {
            selectedIndices = new Set(arr);
            renderGrid();
            alert("List restored successfully.");
        }
    } catch (e) {
        alert("Invalid Hash.");
    }
}
// 5. QR Modal
function showQR(type, address) {
    const modal = document.getElementById('modal');
    const container = document.getElementById('qrContainer');
    document.getElementById('modalTitle').innerText = `Donate ${type}`;
    document.getElementById('modalAddress').innerText = address;
    
    container.innerHTML = ''; // Clear previous
    
    // Generate QR
    new QRCode(container, {
        text: address,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function animateHeaderDollars() {
    const pre = document.querySelector('.ascii-header');
    if (!pre) return;

    const original = pre.innerHTML;
    const splitIndex = original.indexOf('<a ');

    let head = original;
    let tail = '';

    if (splitIndex !== -1) {
        head = original.slice(0, splitIndex);
        tail = original.slice(splitIndex);
    }

    let transformed = '';

    for (let i = 0; i < head.length; i++) {
        const ch = head[i];
        if (ch === '$' && Math.random() < 0.45) {
            const delay = (Math.random() * 2).toFixed(2);
            transformed += `<span class="dollar-anim" style="animation-delay:${delay}s">$</span>`;
        } else {
            transformed += ch;
        }
    }

    pre.innerHTML = transformed + tail;
}

// Start
init();
animateHeaderDollars();
const grid = document.querySelector("#asset-grid");
const menu = document.querySelector("#sidebar-menu");
const searchInput = document.querySelector("#asset-search");
const assetCount = document.querySelector("#asset-count");
const pageTitle = document.querySelector("#page-title-text");
const pageDescription = document.querySelector(".page-description");
const loadError = document.querySelector("#load-error");

let assets = [];
let activeView = "assets";
let searchTerm = "";

const numberFormat = new Intl.NumberFormat("zh-TW");

function makeElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function renderMenu(items) {
    menu.replaceChildren();

    items.forEach((item) => {
        const button = makeElement("button", "sidebar-link");
        button.type = "button";
        button.dataset.view = item.id;
        button.setAttribute("aria-current", item.id === activeView ? "page" : "false");

        const icon = makeElement("span", "sidebar-icon", item.icon);
        icon.setAttribute("aria-hidden", "true");
        button.append(icon, makeElement("span", "", item.label));

        if (item.id === "assets") {
            button.append(makeElement("span", "sidebar-count", String(assets.length).padStart(2, "0")));
        }

        button.addEventListener("click", () => {
            activeView = item.id;
            menu.querySelectorAll(".sidebar-link").forEach((link) => {
                const selected = link.dataset.view === activeView;
                link.classList.toggle("is-active", selected);
                link.setAttribute("aria-current", selected ? "page" : "false");
            });
            updateHeading(item);
            renderAssets();
        });

        if (item.id === activeView) button.classList.add("is-active");
        menu.append(button);
    });
}

function updateHeading(item) {
    pageTitle.textContent = item.title;
    pageDescription.textContent = item.description;
}

function makeSpec(label, value) {
    const item = makeElement("div", "spec-item");
    item.append(makeElement("dt", "", label), makeElement("dd", "", value));
    return item;
}

function renderCard(asset, index) {
    const card = makeElement("article", "asset-card");
    card.style.setProperty("--card-delay", `${Math.min(index, 8) * 45}ms`);

    const preview = makeElement("div", `asset-preview preview--${asset.scene}`);
    preview.setAttribute("role", "img");
    preview.setAttribute("aria-label", `${asset.name} 的 3D 預覽`);
    preview.append(
        makeElement("span", "preview-index", `ASSET / ${String(index + 1).padStart(2, "0")}`),
        makeElement("span", "scene-object"),
        makeElement("span", "scene-orbit"),
        makeElement("span", "preview-kind", "3D PREVIEW"),
    );

    const overlay = makeElement("div", "asset-overlay");
    overlay.setAttribute("aria-label", "資產詳細規格");
    const specs = makeElement("dl", "spec-list");
    specs.append(
        makeSpec("POLY COUNT", numberFormat.format(asset.specs.poly)),
        makeSpec("VERTEX COUNT", numberFormat.format(asset.specs.vertices)),
        makeSpec("TEXTURE", asset.specs.texture),
        makeSpec("FORMAT", asset.specs.format),
    );
    overlay.append(makeElement("p", "overlay-title", "資產規格"), specs);
    preview.append(overlay);

    const content = makeElement("div", "asset-card-content");
    const titleRow = makeElement("div", "asset-title-row");
    titleRow.append(makeElement("h2", "asset-title", asset.name), makeElement("span", "asset-format", asset.specs.format));

    const tags = makeElement("div", "asset-tags");
    asset.tags.forEach((tag) => tags.append(makeElement("span", "asset-tag", tag)));

    const description = makeElement("p", "asset-description", asset.description);
    description.title = asset.description;

    const meta = makeElement("div", "asset-meta");
    meta.append(makeElement("span", "asset-owner", `◉ ${asset.owner}`), makeElement("span", "asset-license", asset.license));
    content.append(titleRow, tags, description, meta);
    card.append(preview, content);
    return card;
}

function renderAssets() {
    const matchingAssets = assets.filter((asset) => {
        const matchesView = activeView === "teams" ? asset.scope === "team" : true;
        const searchable = [asset.name, asset.description, asset.owner, ...asset.tags].join(" ").toLocaleLowerCase("zh-TW");
        return matchesView && searchable.includes(searchTerm);
    });

    assetCount.textContent = String(matchingAssets.length).padStart(2, "0");
    grid.setAttribute("aria-busy", "false");
    grid.replaceChildren();

    if (matchingAssets.length === 0) {
        const empty = makeElement("div", "empty-state");
        empty.append(
            makeElement("strong", "", searchTerm ? "找不到符合的資產" : "這裡還沒有團隊資產"),
            makeElement("span", "", searchTerm ? "試試其他名稱、標籤或擁有者。" : "切換到我的倉庫，查看個人資產。"),
        );
        grid.append(empty);
        return;
    }

    matchingAssets.forEach((asset, index) => grid.append(renderCard(asset, index)));
}

async function init() {
    try {
        const [menuResponse, assetsResponse] = await Promise.all([
            fetch("json/sidebar_menu.json"),
            fetch("json/dashboard_cards.json"),
        ]);

        if (!menuResponse.ok || !assetsResponse.ok) throw new Error("無法載入資產資料，請確認使用本機伺服器開啟頁面。");

        const [menuItems, assetData] = await Promise.all([menuResponse.json(), assetsResponse.json()]);
        assets = assetData.assets;
        renderMenu(menuItems);
        renderAssets();
    } catch (error) {
        grid.setAttribute("aria-busy", "false");
        assetCount.textContent = "--";
        loadError.hidden = false;
        loadError.textContent = error instanceof Error ? error.message : "資料載入失敗。";
    }
}

searchInput.addEventListener("input", (event) => {
    searchTerm = event.currentTarget.value.trim().toLocaleLowerCase("zh-TW");
    renderAssets();
});

document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.focus();
    }
});

init();
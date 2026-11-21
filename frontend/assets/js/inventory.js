import { setupAuth, onAuthStateChanged, signOut } from './auth-client.js';
let businessCurrency = 'BND';
/* =========================================
   MOCK CAFE INVENTORY DATA
========================================= */

let products = [
    {
        id: 1,
        name: "Coffee Beans",
        sku: "CAF-CB-001",
        category: "Coffee & Tea",
        stock: 6,
        unitType: "bags",
        reorderLevel: 3,
        supplier: "Roast House",
        costPrice: 24.00,
        expiryDate: "2027-02-20"
    },

    {
        id: 2,
        name: "Fresh Milk 1L",
        sku: "CAF-MILK-001",
        category: "Dairy",
        stock: 8,
        unitType: "cartons",
        reorderLevel: 10,
        supplier: "Fresh Dairy Co.",
        costPrice: 18.50,
        expiryDate: "2026-11-06"
    },

    {
        id: 3,
        name: "Oat Milk",
        sku: "CAF-OAT-001",
        category: "Dairy",
        stock: 4,
        unitType: "cartons",
        reorderLevel: 5,
        supplier: "Fresh Dairy Co.",
        costPrice: 22.00,
        expiryDate: "2026-12-05"
    },

    {
        id: 4,
        name: "Sugar",
        sku: "CAF-SUGAR-001",
        category: "Ingredients",
        stock: 12,
        unitType: "kg",
        reorderLevel: 5,
        supplier: "Food Supply Co.",
        costPrice: 2.20,
        expiryDate: ""
    },

    {
        id: 5,
        name: "Chocolate Powder",
        sku: "CAF-CHOCO-001",
        category: "Ingredients",
        stock: 5,
        unitType: "bags",
        reorderLevel: 3,
        supplier: "Cafe Essentials",
        costPrice: 14.00,
        expiryDate: "2027-01-15"
    },

    {
        id: 6,
        name: "Vanilla Syrup",
        sku: "CAF-VAN-001",
        category: "Syrups",
        stock: 6,
        unitType: "bottles",
        reorderLevel: 3,
        supplier: "Cafe Essentials",
        costPrice: 12.00,
        expiryDate: "2027-03-18"
    },

    {
        id: 7,
        name: "Caramel Syrup",
        sku: "CAF-CAR-001",
        category: "Syrups",
        stock: 2,
        unitType: "bottles",
        reorderLevel: 3,
        supplier: "Cafe Essentials",
        costPrice: 12.50,
        expiryDate: "2027-03-20"
    },

    {
        id: 8,
        name: "Croissants",
        sku: "CAF-CRO-001",
        category: "Bakery",
        stock: 24,
        unitType: "pcs",
        reorderLevel: 15,
        supplier: "BakeHouse",
        costPrice: 1.25,
        expiryDate: "2026-11-01"
    },

    {
        id: 9,
        name: "Eggs",
        sku: "CAF-EGG-001",
        category: "Ingredients",
        stock: 2,
        unitType: "trays",
        reorderLevel: 3,
        supplier: "Farm Fresh",
        costPrice: 7.50,
        expiryDate: "2026-11-10"
    },

    {
        id: 10,
        name: "Paper Cups 12oz",
        sku: "CAF-CUP-001",
        category: "Packaging",
        stock: 120,
        unitType: "pcs",
        reorderLevel: 100,
        supplier: "PackPro",
        costPrice: 0.18,
        expiryDate: ""
    },

    {
        id: 11,
        name: "Cup Lids",
        sku: "CAF-LID-001",
        category: "Packaging",
        stock: 90,
        unitType: "pcs",
        reorderLevel: 100,
        supplier: "PackPro",
        costPrice: 0.10,
        expiryDate: ""
    },

    {
        id: 12,
        name: "Napkins",
        sku: "CAF-NAP-001",
        category: "Packaging",
        stock: 0,
        unitType: "packs",
        reorderLevel: 5,
        supplier: "PackPro",
        costPrice: 3.20,
        expiryDate: ""
    }
];

/* =========================================
   INVENTORY STORAGE
========================================= */

const INVENTORY_STORAGE_KEY =
    "urus-cafe-inventory-v1";


function loadSavedInventory() {

    try {

        const saved =
            localStorage.getItem(
                INVENTORY_STORAGE_KEY
            );

        if (!saved) {
            return;
        }

        const parsed =
            JSON.parse(saved);

        if (Array.isArray(parsed)) {
            products = parsed;
        }

    } catch (error) {

        console.error(
            "Unable to load saved inventory:",
            error
        );

    }

}


function persistProducts() {

    try {

        localStorage.setItem(
            INVENTORY_STORAGE_KEY,
            JSON.stringify(products)
        );

    } catch (error) {

        console.error(
            "Unable to save inventory:",
            error
        );

    }

}


// Server data is loaded after Firebase authentication.

/* =========================================
   CATEGORY + SUPPLIER MASTER DATA
========================================= */

const CATEGORY_STORAGE_KEY =
    "urus-cafe-categories-v1";

const SUPPLIER_STORAGE_KEY =
    "urus-cafe-suppliers-v1";


const DEFAULT_CATEGORIES = [
    "Coffee & Tea",
    "Dairy",
    "Ingredients",
    "Syrups",
    "Bakery",
    "Packaging",
    "Cleaning"
];


const DEFAULT_SUPPLIERS = [
    "Roast House",
    "Fresh Dairy Co.",
    "Food Supply Co.",
    "Cafe Essentials",
    "BakeHouse",
    "Farm Fresh",
    "PackPro"
];


function loadStringList(
    storageKey,
    defaultValues
) {

    try {

        const saved =
            localStorage.getItem(
                storageKey
            );


        if (saved) {

            const parsed =
                JSON.parse(saved);


            if (Array.isArray(parsed)) {

                return parsed
                    .map(
                        value =>
                            String(value)
                                .trim()
                    )
                    .filter(Boolean);

            }

        }

    } catch (error) {

        console.error(
            `Unable to load ${storageKey}:`,
            error
        );

    }


    return [...defaultValues];

}


let categories =
    loadStringList(
        CATEGORY_STORAGE_KEY,
        DEFAULT_CATEGORIES
    );


let suppliers =
    loadStringList(
        SUPPLIER_STORAGE_KEY,
        DEFAULT_SUPPLIERS
    );
let activeSuppliers = [];


function persistCategories() {

    localStorage.setItem(
        CATEGORY_STORAGE_KEY,
        JSON.stringify(categories)
    );

}


function persistSuppliers() {

    localStorage.setItem(
        SUPPLIER_STORAGE_KEY,
        JSON.stringify(suppliers)
    );

}


function findExistingValue(
    list,
    value
) {

    const normalized =
        String(value || "")
            .trim()
            .toLowerCase();


    return (
        list.find(
            item =>
                item.toLowerCase() ===
                normalized
        )
        ||
        null
    );

}


function addUniqueMasterValue(
    list,
    value
) {

    const cleanValue =
        String(value || "")
            .trim();


    if (!cleanValue) {
        return null;
    }


    const existing =
        findExistingValue(
            list,
            cleanValue
        );


    if (existing) {
        return existing;
    }


    list.push(cleanValue);


    list.sort(
        (a, b) =>
            a.localeCompare(b)
    );


    return cleanValue;

}


/*
 Keep master lists in sync with products that may
 already exist in localStorage from an older version.
*/
// Do not display demo or localStorage data while the server session loads.
products = [];
categories = [];
suppliers = [];
products.forEach(product => {

    addUniqueMasterValue(
        categories,
        product.category
    );


    addUniqueMasterValue(
        suppliers,
        product.supplier
    );

});


// Master data is loaded from the server.


/* =========================================
   DOM ELEMENTS
========================================= */

const tableBody =
    document.getElementById("inventory-table-body");

const searchInput =
    document.getElementById("search-input");

const categoryFilter =
    document.getElementById("category-filter");

const statusFilter =
    document.getElementById("status-filter");

const productCount =
    document.getElementById("product-count");

const totalItemsDisplay =
    document.getElementById("total-items");

const lowStockDisplay =
    document.getElementById("low-stock-count");

const outStockDisplay =
    document.getElementById("out-stock-count");

const inventoryValueDisplay =
    document.getElementById("inventory-value");


/* =========================================
   MODALS
========================================= */

const addItemModal =
    document.getElementById("add-item-modal");

const addItemBtn =
    document.getElementById("add-item-btn");

const closeAddModal =
    document.getElementById("close-add-modal");

const cancelAddItem =
    document.getElementById("cancel-add-item");

const addItemForm =
    document.getElementById("add-item-form");


const stockModal =
    document.getElementById("stock-modal");

const closeStockModal =
    document.getElementById("close-stock-modal");

const cancelStockUpdate =
    document.getElementById("cancel-stock-update");

const stockUpdateForm =
    document.getElementById("stock-update-form");


const viewModal =
    document.getElementById("view-modal");

const closeViewModal =
    document.getElementById("close-view-modal");

const viewItemContent =
    document.getElementById("view-item-content");


/* =========================================
   CATEGORY + SUPPLIER UI
========================================= */

const itemCategorySelect =
    document.getElementById(
        "item-category"
    );

const editItemCategorySelect =
    document.getElementById(
        "edit-item-category"
    );

const itemSupplierSelect =
    document.getElementById(
        "item-supplier"
    );

const editItemSupplierSelect =
    document.getElementById(
        "edit-item-supplier"
    );


const addCategoryBtn =
    document.getElementById(
        "add-category-btn"
    );

const editAddCategoryBtn =
    document.getElementById(
        "edit-add-category-btn"
    );

const addSupplierBtn =
    document.getElementById(
        "add-supplier-btn"
    );

const editAddSupplierBtn =
    document.getElementById(
        "edit-add-supplier-btn"
    );


const newCategoryModal =
    document.getElementById(
        "new-category-modal"
    );

const newCategoryForm =
    document.getElementById(
        "new-category-form"
    );

const newCategoryName =
    document.getElementById(
        "new-category-name"
    );

const closeCategoryModalBtn =
    document.getElementById(
        "close-category-modal"
    );

const cancelCategoryBtn =
    document.getElementById(
        "cancel-category-btn"
    );

const categoryFormMessage =
    document.getElementById(
        "category-form-message"
    );


const newSupplierModal =
    document.getElementById(
        "new-supplier-modal"
    );

const newSupplierForm =
    document.getElementById(
        "new-supplier-form"
    );

const newSupplierName =
    document.getElementById(
        "new-supplier-name"
    );

const closeSupplierModalBtn =
    document.getElementById(
        "close-supplier-modal"
    );

const cancelSupplierBtn =
    document.getElementById(
        "cancel-supplier-btn"
    );

const supplierFormMessage =
    document.getElementById(
        "supplier-form-message"
    );


let categoryReturnTarget = null;
let supplierReturnTarget = null;


/* =========================================
   RENDER MASTER DATA DROPDOWNS
========================================= */

function fillSelect(
    selectElement,
    values,
    placeholderText = null
) {

    if (!selectElement) {
        return;
    }


    const previousValue =
        selectElement.value;


    selectElement.innerHTML = "";


    if (placeholderText !== null) {

        const placeholder =
            document.createElement(
                "option"
            );

        placeholder.value = "";

        placeholder.textContent =
            placeholderText;

        selectElement.appendChild(
            placeholder
        );

    }


    values.forEach(value => {

        const option =
            document.createElement(
                "option"
            );

        option.value = value;

        option.textContent = value;

        selectElement.appendChild(
            option
        );

    });


    if (
        values.includes(
            previousValue
        )
    ) {

        selectElement.value =
            previousValue;

    }

}


function refreshCategoryFilter() {

    const previousValue =
        categoryFilter.value;


    categoryFilter.innerHTML = "";


    const allOption =
        document.createElement(
            "option"
        );

    allOption.value = "all";

    allOption.textContent =
        "All Categories";


    categoryFilter.appendChild(
        allOption
    );


    categories.forEach(category => {

        const option =
            document.createElement(
                "option"
            );

        option.value = category;

        option.textContent = category;

        categoryFilter.appendChild(
            option
        );

    });


    if (
        previousValue === "all"
        ||
        categories.includes(
            previousValue
        )
    ) {

        categoryFilter.value =
            previousValue;

    } else {

        categoryFilter.value =
            "all";

    }

}


function refreshMasterDataUI() {

    fillSelect(
        itemCategorySelect,
        categories,
        "Select Category"
    );


    fillSelect(
        editItemCategorySelect,
        categories
    );


    fillSelect(
        itemSupplierSelect,
        activeSuppliers,
        "Select Supplier"
    );


    fillSelect(
        editItemSupplierSelect,
        suppliers
    );


    refreshCategoryFilter();

}


/* =========================================
   NEW CATEGORY
========================================= */

function openCategoryModal(
    targetSelect
) {

    categoryReturnTarget =
        targetSelect;


    newCategoryForm.reset();


    categoryFormMessage.textContent =
        "";


    categoryFormMessage.className =
        "";


    newCategoryModal
        .classList
        .remove("hidden");


    setTimeout(
        () =>
            newCategoryName.focus(),
        0
    );

}


function closeCategoryModal() {

    newCategoryModal
        .classList
        .add("hidden");


    newCategoryForm.reset();


    categoryFormMessage.textContent =
        "";


    categoryReturnTarget = null;

}


addCategoryBtn.addEventListener(
    "click",
    () =>
        openCategoryModal(
            itemCategorySelect
        )
);


editAddCategoryBtn.addEventListener(
    "click",
    () =>
        openCategoryModal(
            editItemCategorySelect
        )
);


closeCategoryModalBtn.addEventListener(
    "click",
    closeCategoryModal
);


cancelCategoryBtn.addEventListener(
    "click",
    closeCategoryModal
);


newCategoryForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const value =
            newCategoryName.value
                .trim();


        if (!value) {
            return;
        }


        const existing =
            findExistingValue(
                categories,
                value
            );


        if (existing) {

            if (categoryReturnTarget) {

                categoryReturnTarget.value =
                    existing;

            }


            closeCategoryModal();

            return;

        }


        const created =
            addUniqueMasterValue(
                categories,
                value
            );


        persistCategories();


        const target =
            categoryReturnTarget;


        refreshMasterDataUI();


        if (target && created) {

            target.value =
                created;

        }


        closeCategoryModal();

    }
);


/* =========================================
   NEW SUPPLIER
========================================= */

function openSupplierModal(
    targetSelect
) {

    supplierReturnTarget =
        targetSelect;


    newSupplierForm.reset();


    supplierFormMessage.textContent =
        "";


    supplierFormMessage.className =
        "";


    newSupplierModal
        .classList
        .remove("hidden");


    setTimeout(
        () =>
            newSupplierName.focus(),
        0
    );

}


function closeSupplierModal() {

    newSupplierModal
        .classList
        .add("hidden");


    newSupplierForm.reset();


    supplierFormMessage.textContent =
        "";


    supplierReturnTarget = null;

}


addSupplierBtn.addEventListener(
    "click",
    () =>
        openSupplierModal(
            itemSupplierSelect
        )
);


editAddSupplierBtn.addEventListener(
    "click",
    () =>
        openSupplierModal(
            editItemSupplierSelect
        )
);


closeSupplierModalBtn.addEventListener(
    "click",
    closeSupplierModal
);


cancelSupplierBtn.addEventListener(
    "click",
    closeSupplierModal
);


newSupplierForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const value =
            newSupplierName.value
                .trim();


        if (!value) {
            return;
        }


        const existing =
            findExistingValue(
                suppliers,
                value
            );


        if (existing) {

            if (supplierReturnTarget) {

                supplierReturnTarget.value =
                    existing;

            }


            closeSupplierModal();

            return;

        }


        const created =
            addUniqueMasterValue(
                suppliers,
                value
            );


        persistSuppliers();


        const target =
            supplierReturnTarget;


        refreshMasterDataUI();


        if (target && created) {

            target.value =
                created;

        }


        closeSupplierModal();

    }
);


newCategoryModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            newCategoryModal
        ) {

            closeCategoryModal();

        }

    }
);


newSupplierModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            newSupplierModal
        ) {

            closeSupplierModal();

        }

    }
);


/* =========================================
   STOCK STATUS
========================================= */

function getStockStatus(product) {

    if (product.stock <= 0) {
        return "Out of Stock";
    }

    if (product.stock <= product.reorderLevel) {
        return "Low Stock";
    }

    return "In Stock";
}


/* =========================================
   STATUS CLASS
========================================= */

function getStatusClass(status) {

    if (status === "In Stock") {
        return "status-in";
    }

    if (status === "Low Stock") {
        return "status-low";
    }

    return "status-out";
}


/* =========================================
   FORMAT QUANTITY
========================================= */

function formatQuantity(value) {

    if (Number.isInteger(value)) {
        return value;
    }

    return Number(value.toFixed(2));
}


/* =========================================
   RENDER TABLE
========================================= */

function renderProducts() {

    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();

    const selectedCategory =
        categoryFilter.value;

    const selectedStatus =
        statusFilter.value;


    const filteredProducts =
        products.filter(product => {

            const status =
                getStockStatus(product);

            const matchesSearch =
                product.name
                    .toLowerCase()
                    .includes(searchTerm)

                ||

                product.sku
                    .toLowerCase()
                    .includes(searchTerm)

                ||

                product.category
                    .toLowerCase()
                    .includes(searchTerm)

                ||

                product.supplier
                    .toLowerCase()
                    .includes(searchTerm);


            const matchesCategory =
                selectedCategory === "all"
                ||
                product.category === selectedCategory;


            const matchesStatus =
                selectedStatus === "all"
                ||
                status === selectedStatus;


            return (
                matchesSearch
                &&
                matchesCategory
                &&
                matchesStatus
            );

        });


    tableBody.innerHTML = "";


    if (filteredProducts.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-row">
                    No inventory items found.
                </td>
            </tr>
        `;

    } else {

        filteredProducts.forEach(product => {

            const status =
                getStockStatus(product);

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>

                    <div class="product-info">

                        <span class="product-name">
                            ${escapeHTML(product.name)}
                        </span>

                        <span class="product-sku">
                            ${escapeHTML(product.sku)}
                        </span>

                    </div>

                </td>


                <td>
                    ${escapeHTML(product.category)}
                </td>


                <td>

                    <strong>
                        ${formatQuantity(product.stock)}
                    </strong>

                    ${escapeHTML(product.unitType)}

                </td>


                <td>

                    ${formatQuantity(product.reorderLevel)}

                    ${escapeHTML(product.unitType)}

                </td>


                <td>
                    ${escapeHTML(product.supplier)}
                </td>


                <td>

                    <span
                        class="
                            status-badge
                            ${getStatusClass(status)}
                        "
                    >
                        ${status}
                    </span>

                </td>


                <td>
                    <div class="action-buttons">

                <button
                    class="table-action-btn"
                    onclick="viewProduct(${product.id})"
                >
                    View
                </button>

                <button
                    class="table-action-btn"
                    onclick="editProduct(${product.id})"
                >
                    Edit
                </button>

                <button
                    class="table-action-btn"
                    onclick="openStockModal(${product.id})"
                >
                    Stock
                </button>

                <button
                    class="table-action-btn delete-btn"
                    onclick="deleteProduct(${product.id})"
                >
                    Delete
                </button>

            </div>
              

                </td>

            `;


            if (status === 'Low Stock' || status === 'Out of Stock') {
                const action = row.querySelector('.action-buttons');
                if (product.supplierArchived) {
                    const unavailable = document.createElement('span');
                    unavailable.className = 'reorder-unavailable';
                    unavailable.textContent = 'Supplier archived';
                    action.append(unavailable);
                } else {
                    const link = document.createElement('a');
                    link.className = 'table-action-btn reorder-btn';
                    link.textContent = 'Create order';
                    link.href = `orders.html?reorder=${encodeURIComponent(product.id)}&business=${encodeURIComponent(serverBusiness)}`;
                    action.append(link);
                }
            }
            tableBody.appendChild(row);

        });

    }


    productCount.textContent =
        `${filteredProducts.length} item${
            filteredProducts.length === 1
                ? ""
                : "s"
        }`;


    updateKPIs();
}


/* =========================================
   KPI CALCULATIONS
========================================= */

function updateKPIs() {

    const totalItems =
        products.length;


    const lowStock =
        products.filter(
            product =>
                getStockStatus(product) === "Low Stock"
        ).length;


    const outOfStock =
        products.filter(
            product =>
                getStockStatus(product) === "Out of Stock"
        ).length;


    const inventoryValue =
        products.reduce(
            (total, product) =>
                total +
                (
                    product.stock
                    *
                    product.costPrice
                ),
            0
        );


    totalItemsDisplay.textContent =
        totalItems;


    lowStockDisplay.textContent =
        lowStock;


    outStockDisplay.textContent =
        outOfStock;


    inventoryValueDisplay.textContent =
        `${businessCurrency} ${inventoryValue.toFixed(2)}`;
}


/* =========================================
   SEARCH + FILTER EVENTS
========================================= */

searchInput.addEventListener(
    "input",
    renderProducts
);

categoryFilter.addEventListener(
    "change",
    renderProducts
);

statusFilter.addEventListener(
    "change",
    renderProducts
);


/* =========================================
   OPEN / CLOSE ADD ITEM MODAL
========================================= */

addItemBtn.addEventListener(
    "click",
    () => {

        refreshMasterDataUI();

        addItemModal.classList.remove("hidden");

    }
);


function closeAddItemModal() {

    addItemModal.classList.add("hidden");

    addItemForm.reset();

}


closeAddModal.addEventListener(
    "click",
    closeAddItemModal
);


cancelAddItem.addEventListener(
    "click",
    closeAddItemModal
);

/* =========================================
   DELETE ITEM
========================================= */

function deleteProduct(productId) {

    const product =
        products.find(
            product => product.id === productId
        );


    if (!product) {
        return;
    }


    const confirmed =
        confirm(
            `Are you sure you want to delete "${product.name}"?`
        );


    if (!confirmed) {
        return;
    }


    products =
        products.filter(
            product => product.id !== productId
        );

    persistProducts();
    
    renderProducts();

}


window.deleteProduct = deleteProduct;

/* =========================================
   ADD NEW ITEM
========================================= */

addItemForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const enteredSku =
            document.getElementById(
                "item-sku"
            ).value.trim();


        const skuAlreadyExists =
            products.some(
                product =>
                    String(product.sku)
                        .trim()
                        .toLowerCase()
                    ===
                    enteredSku.toLowerCase()
            );


        if (skuAlreadyExists) {

            alert(
                "That SKU already exists. Please use a unique SKU."
            );

            return;

        }


        const newProduct = {

            id:
                products.length === 0
                    ? 1
                    : Math.max(
                        ...products.map(
                            product => product.id
                        )
                    ) + 1,

            name:
                document.getElementById(
                    "item-name"
                ).value.trim(),

            sku:
                enteredSku,

            category:
                document.getElementById(
                    "item-category"
                ).value,

            stock:
                Number(
                    document.getElementById(
                        "item-stock"
                    ).value
                ),

            unitType:
                document.getElementById(
                    "item-unit"
                ).value,

            reorderLevel:
                Number(
                    document.getElementById(
                        "item-reorder"
                    ).value
                ),

            supplier:
                document.getElementById(
                    "item-supplier"
                ).value.trim(),

            costPrice:
                Number(
                    document.getElementById(
                        "item-cost"
                    ).value
                ),

            expiryDate:
                document.getElementById(
                    "item-expiry"
                ).value

        };


        products.push(newProduct);


        closeAddItemModal();
        persistProducts();
        renderProducts();

    }
);


/* =========================================
   STOCK UPDATE MODAL
========================================= */

function openStockModal(productId) {

    const product =
        products.find(
            product =>
                product.id === productId
        );


    if (!product) {
        return;
    }


    document.getElementById(
        "stock-product-id"
    ).value =
        product.id;


    document.getElementById(
        "stock-modal-product-name"
    ).textContent =
        product.name;


    document.getElementById(
        "current-stock-display"
    ).textContent =
        `${formatQuantity(product.stock)} ${product.unitType}`;


    document.getElementById(
        "stock-quantity"
    ).value =
        "";


    stockModal.classList.remove("hidden");

}


/*
Make function available to inline HTML buttons
*/
window.openStockModal =
    openStockModal;


/* =========================================
   CLOSE STOCK MODAL
========================================= */

function closeStockUpdateModal() {

    stockModal.classList.add("hidden");

    stockUpdateForm.reset();

}


closeStockModal.addEventListener(
    "click",
    closeStockUpdateModal
);


cancelStockUpdate.addEventListener(
    "click",
    closeStockUpdateModal
);


/* =========================================
   UPDATE STOCK
========================================= */

stockUpdateForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const productId =
            Number(
                document.getElementById(
                    "stock-product-id"
                ).value
            );


        const action =
            document.getElementById(
                "stock-action"
            ).value;


        const quantity =
            Number(
                document.getElementById(
                    "stock-quantity"
                ).value
            );


        const product =
            products.find(
                product =>
                    product.id === productId
            );


        if (!product) {
            return;
        }


        if (action === "in") {

            product.stock += quantity;

        }


        if (action === "out") {

            if (quantity > product.stock) {

                alert(
                    `You only have ${product.stock} ${product.unitType} available.`
                );

                return;

            }

            product.stock -= quantity;

        }

        persistProducts();

        closeStockUpdateModal();

        renderProducts();

    }
);


/* =========================================
   VIEW ITEM
========================================= */

function viewProduct(productId) {

    const product =
        products.find(
            product =>
                product.id === productId
        );


    if (!product) {
        return;
    }


    const status =
        getStockStatus(product);


    viewItemContent.innerHTML = `

        <div class="detail-list">

            <div class="detail-row">
                <span>Item</span>
                <span>${escapeHTML(product.name)}</span>
            </div>

            <div class="detail-row">
                <span>SKU</span>
                <span>${escapeHTML(product.sku)}</span>
            </div>

            <div class="detail-row">
                <span>Category</span>
                <span>${escapeHTML(product.category)}</span>
            </div>

            <div class="detail-row">
                <span>Current Stock</span>
                <span>
                    ${formatQuantity(product.stock)}
                    ${escapeHTML(product.unitType)}
                </span>
            </div>

            <div class="detail-row">
                <span>Reorder Level</span>
                <span>
                    ${formatQuantity(product.reorderLevel)}
                    ${escapeHTML(product.unitType)}
                </span>
            </div>

            <div class="detail-row">
                <span>Supplier</span>
                <span>${escapeHTML(product.supplier)}</span>
            </div>

            <div class="detail-row">
                <span>Cost per Unit</span>
                <span>
                    ${businessCurrency} ${product.costPrice.toFixed(2)}
                </span>
            </div>

            <div class="detail-row">
                <span>Status</span>
                <span>${status}</span>
            </div>

            <div class="detail-row">
                <span>Expiry</span>
                <span>
                    ${
                        product.expiryDate
                            ? product.expiryDate
                            : "Not applicable"
                    }
                </span>
            </div>

        </div>

    `;


    viewModal.classList.remove("hidden");

}


window.viewProduct =
    viewProduct;


/* =========================================
   CLOSE VIEW MODAL
========================================= */

closeViewModal.addEventListener(
    "click",
    () => {

        viewModal.classList.add("hidden");

    }
);

/* =========================================
   EDIT ITEM
========================================= */

const editItemModal =
    document.getElementById("edit-item-modal");

const editItemForm =
    document.getElementById("edit-item-form");

const closeEditModal =
    document.getElementById("close-edit-modal");

const cancelEditItem =
    document.getElementById("cancel-edit-item");


function editProduct(productId) {

    const product =
        products.find(
            product => product.id === productId
        );

    if (!product) {
        return;
    }


    // Refresh reusable category and supplier lists first
    refreshMasterDataUI();


    // Fill the form with existing product information

    document.getElementById("edit-item-id").value =
        product.id;

    document.getElementById("edit-item-name").value =
        product.name;

    document.getElementById("edit-item-sku").value =
        product.sku;

    document.getElementById("edit-item-category").value =
        product.category;

    document.getElementById("edit-item-stock").value =
        product.stock;

    document.getElementById("edit-item-unit").value =
        product.unitType;

    document.getElementById("edit-item-reorder").value =
        product.reorderLevel;

    document.getElementById("edit-item-supplier").value =
        product.supplier;

    document.getElementById("edit-item-cost").value =
        product.costPrice;

    document.getElementById("edit-item-expiry").value =
        product.expiryDate || "";


    editItemModal.classList.remove("hidden");
}


window.editProduct = editProduct;


/* =========================================
   SAVE EDITED ITEM
========================================= */

editItemForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const productId =
            Number(
                document.getElementById(
                    "edit-item-id"
                ).value
            );


        const product =
            products.find(
                product => product.id === productId
            );


        if (!product) {
            return;
        }


        const updatedSku =
            document.getElementById(
                "edit-item-sku"
            ).value.trim();


        const skuAlreadyExists =
            products.some(
                otherProduct =>
                    otherProduct.id !== productId
                    &&
                    String(otherProduct.sku)
                        .trim()
                        .toLowerCase()
                    ===
                    updatedSku.toLowerCase()
            );


        if (skuAlreadyExists) {

            alert(
                "That SKU already exists. Please use a unique SKU."
            );

            return;

        }


        product.name =
            document.getElementById(
                "edit-item-name"
            ).value.trim();


        product.sku =
            updatedSku;


        product.category =
            document.getElementById(
                "edit-item-category"
            ).value;


        product.stock =
            Number(
                document.getElementById(
                    "edit-item-stock"
                ).value
            );


        product.unitType =
            document.getElementById(
                "edit-item-unit"
            ).value;


        product.reorderLevel =
            Number(
                document.getElementById(
                    "edit-item-reorder"
                ).value
            );


        product.supplier =
            document.getElementById(
                "edit-item-supplier"
            ).value.trim();


        product.costPrice =
            Number(
                document.getElementById(
                    "edit-item-cost"
                ).value
            );


        product.expiryDate =
            document.getElementById(
                "edit-item-expiry"
            ).value;

        persistProducts();

        editItemModal.classList.add("hidden");

        renderProducts();

    }
);


/* =========================================
   CLOSE EDIT MODAL
========================================= */

function closeEditItemModal() {

    editItemModal.classList.add("hidden");

}


closeEditModal.addEventListener(
    "click",
    closeEditItemModal
);


cancelEditItem.addEventListener(
    "click",
    closeEditItemModal
);

/* =========================================
   CLOSE MODALS WHEN BACKDROP CLICKED
========================================= */

[
    addItemModal,
    stockModal,
    viewModal,
    editItemModal
].forEach(modal => {

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                modal.classList.add("hidden");

            }

        }
    );

});

/* =========================================
   EXCEL IMPORT / EXPORT
========================================= */

const importExcelBtn =
    document.getElementById(
        "import-excel-btn"
    );

const exportExcelBtn =
    document.getElementById(
        "export-excel-btn"
    );

const importExcelModal =
    document.getElementById(
        "import-excel-modal"
    );

const closeImportModalBtn =
    document.getElementById(
        "close-import-modal"
    );

const cancelImportBtn =
    document.getElementById(
        "cancel-import-btn"
    );

const downloadTemplateBtn =
    document.getElementById(
        "download-template-btn"
    );

const browseExcelBtn =
    document.getElementById(
        "browse-excel-btn"
    );

const excelFileInput =
    document.getElementById(
        "excel-file-input"
    );

const excelDropZone =
    document.getElementById(
        "excel-drop-zone"
    );

const selectedExcelFile =
    document.getElementById(
        "selected-excel-file"
    );

const importFileError =
    document.getElementById(
        "import-file-error"
    );

const importPreviewSection =
    document.getElementById(
        "import-preview-section"
    );

const importPreviewBody =
    document.getElementById(
        "import-preview-body"
    );

const importTotalCount =
    document.getElementById(
        "import-total-count"
    );

const importValidCount =
    document.getElementById(
        "import-valid-count"
    );

const importErrorCount =
    document.getElementById(
        "import-error-count"
    );


const importNewCategoryCount =
    document.getElementById(
        "import-new-category-count"
    );

const importNewSupplierCount =
    document.getElementById(
        "import-new-supplier-count"
    );

const importNewDataSection =
    document.getElementById(
        "import-new-data-section"
    );

const importNewCategoriesList =
    document.getElementById(
        "import-new-categories-list"
    );

const importNewSuppliersList =
    document.getElementById(
        "import-new-suppliers-list"
    );

const confirmImportBtn =
    document.getElementById(
        "confirm-import-btn"
    );

const previewLimitMessage =
    document.getElementById(
        "preview-limit-message"
    );


/* =========================================
   EXCEL CONFIGURATION
========================================= */

let IMPORT_HEADERS = [
    "Item Name",
    "SKU",
    "Category",
    "Quantity",
    "Unit",
    "Reorder Level",
    "Supplier",
    `Cost (${businessCurrency})`,
    "Expiry Date"
];


const ALLOWED_UNITS = [
    "pcs",
    "cartons",
    "boxes",
    "bags",
    "bottles",
    "kg",
    "g",
    "litres",
    "ml",
    "trays",
    "packs"
];


const MAX_IMPORT_ROWS = 5000;

const MAX_FILE_SIZE =
    10 * 1024 * 1024;


let pendingImportProducts = [];

let importPreviewData = [];

let pendingNewCategories = [];

let pendingNewSuppliers = [];


/* =========================================
   HTML SAFETY
========================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================
   OPEN IMPORT MODAL
========================================= */

importExcelBtn.addEventListener(
    "click",
    () => {

        resetImportModal();

        importExcelModal
            .classList
            .remove("hidden");

    }
);


/* =========================================
   CLOSE IMPORT MODAL
========================================= */

function closeImportExcelModal() {

    importExcelModal
        .classList
        .add("hidden");

    resetImportModal();

}


closeImportModalBtn.addEventListener(
    "click",
    closeImportExcelModal
);


cancelImportBtn.addEventListener(
    "click",
    closeImportExcelModal
);


importExcelModal.addEventListener(
    "click",
    event => {

        if (
            event.target === importExcelModal
        ) {

            closeImportExcelModal();

        }

    }
);


/* =========================================
   RESET IMPORT
========================================= */

function resetImportModal() {

    excelFileInput.value = "";

    selectedExcelFile
        .classList
        .add("import-hidden");

    selectedExcelFile.textContent = "";


    importFileError
        .classList
        .add("import-hidden");

    importFileError.textContent = "";


    importPreviewSection
        .classList
        .add("import-hidden");


    importPreviewBody.innerHTML = "";


    importTotalCount.textContent = "0";

    importValidCount.textContent = "0";

    importErrorCount.textContent = "0";

    importNewCategoryCount.textContent = "0";

    importNewSupplierCount.textContent = "0";

    importNewCategoriesList.innerHTML = "";

    importNewSuppliersList.innerHTML = "";

    importNewDataSection
        .classList
        .add("import-hidden");


    confirmImportBtn.disabled = true;

    confirmImportBtn.textContent =
        "Import Items";


    previewLimitMessage.textContent = "";


    pendingImportProducts = [];

    importPreviewData = [];

    pendingNewCategories = [];

    pendingNewSuppliers = [];

}


/* =========================================
   DOWNLOAD URUS TEMPLATE
========================================= */

downloadTemplateBtn.addEventListener(
    "click",
    downloadExcelTemplate
);


function downloadExcelTemplate() {

    if (
        typeof XLSX === "undefined"
    ) {

        showImportError(
            "Excel library could not be loaded."
        );

        return;

    }


    /*
     Inventory sheet:
     headers only so example rows are never
     imported by accident.
    */

    const inventorySheet =
        XLSX.utils.aoa_to_sheet(
            [
                IMPORT_HEADERS
            ]
        );


    inventorySheet["!cols"] = [
        { wch: 24 },
        { wch: 18 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 16 },
        { wch: 24 },
        { wch: 14 },
        { wch: 15 }
    ];


    /*
     Reference sheets show all current values.
     Users may still type a new category or
     supplier in Inventory. URUS will flag it
     as new and create it after confirmation.
    */

    const categoriesSheet =
        XLSX.utils.aoa_to_sheet(
            [
                ["Available Categories"],
                ...categories.map(
                    category => [category]
                )
            ]
        );


    categoriesSheet["!cols"] = [
        { wch: 30 }
    ];


    const suppliersSheet =
        XLSX.utils.aoa_to_sheet(
            [
                ["Available Suppliers"],
                ...suppliers.map(
                    supplier => [supplier]
                )
            ]
        );


    suppliersSheet["!cols"] = [
        { wch: 35 }
    ];


    const instructions = [

        [
            "URUS Cafe Inventory Import Template"
        ],

        [""],

        [
            "Instructions",
            "Enter inventory items in the Inventory sheet. Do not rename the column headers."
        ],

        [
            "Category",
            "Use a value from the Categories sheet, or type a new category. New categories will be shown for confirmation before import."
        ],

        [
            "Supplier",
            "Use a value from the Suppliers sheet, or type a new supplier. New suppliers will be shown for confirmation before import."
        ],

        [
            "SKU",
            "Required and must be unique. Example: CAF-MILK-001"
        ],

        [
            "Quantity",
            "Current quantity in stock. Must be 0 or greater."
        ],

        [
            "Unit",
            "pcs, cartons, boxes, bags, bottles, kg, g, litres, ml, trays, or packs"
        ],

        [
            "Reorder Level",
            "Stock quantity at which URUS marks the item as Low Stock."
        ],

        [
            `Cost (${businessCurrency})`,
            "Cost per selected stock unit."
        ],

        [
            "Expiry Date",
            "Optional. Use YYYY-MM-DD."
        ],

        [""],

        ["EXAMPLE"],

        IMPORT_HEADERS,

        [
            "Fresh Milk 1L",
            "CAF-MILK-001",
            "Dairy",
            8,
            "cartons",
            10,
            "Fresh Dairy Co.",
            18.50,
            "2026-11-06"
        ],

        [
            "Ice Cream",
            "CAF-ICE-001",
            "Frozen Foods",
            5,
            "boxes",
            2,
            "Borneo Frozen Supply",
            28.00,
            "2027-01-15"
        ]

    ];


    const instructionsSheet =
        XLSX.utils.aoa_to_sheet(
            instructions
        );


    instructionsSheet["!cols"] = [
        { wch: 24 },
        { wch: 95 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 16 },
        { wch: 24 },
        { wch: 14 },
        { wch: 15 }
    ];


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        inventorySheet,
        "Inventory"
    );


    XLSX.utils.book_append_sheet(
        workbook,
        categoriesSheet,
        "Categories"
    );


    XLSX.utils.book_append_sheet(
        workbook,
        suppliersSheet,
        "Suppliers"
    );


    XLSX.utils.book_append_sheet(
        workbook,
        instructionsSheet,
        "Instructions"
    );


    XLSX.writeFile(
        workbook,
        "URUS_Cafe_Inventory_Template.xlsx"
    );

}


/* =========================================
   EXPORT CURRENT INVENTORY
========================================= */

exportExcelBtn.addEventListener(
    "click",
    exportInventoryToExcel
);


function exportInventoryToExcel() {

    if (
        typeof XLSX === "undefined"
    ) {

        alert(
            "Excel library could not be loaded."
        );

        return;
    }


    if (
        products.length === 0
    ) {

        alert(
            "There are no inventory items to export."
        );

        return;
    }


    const exportData =
        products.map(product => {

            return {

                "Item Name":
                    product.name,

                "SKU":
                    product.sku,

                "Category":
                    product.category,

                "Quantity":
                    product.stock,

                "Unit":
                    product.unitType,

                "Reorder Level":
                    product.reorderLevel,

                "Supplier":
                    product.supplier,

                [`Cost (${businessCurrency})`]:
                    product.costPrice,

                "Expiry Date":
                    product.expiryDate || "",

                "Status":
                    getStockStatus(product),

                [`Inventory Value (${businessCurrency})`]:
                    Number(
                        (
                            product.stock *
                            product.costPrice
                        ).toFixed(2)
                    )

            };

        });


    const worksheet =
        XLSX.utils.json_to_sheet(
            exportData
        );


    worksheet["!cols"] = [
        { wch: 24 },
        { wch: 18 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 16 },
        { wch: 24 },
        { wch: 14 },
        { wch: 15 },
        { wch: 15 },
        { wch: 22 }
    ];


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Inventory"
    );

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
        ['Business', document.querySelector('.header h1').textContent],
        ['Currency', businessCurrency],
        ['Generated at (UTC)', new Date().toISOString()],
        ['Scope', 'All active products'],
        ['Valuation', 'Current quantity multiplied by current unit cost']
    ]), 'Information');


    const categoriesSheet =
        XLSX.utils.aoa_to_sheet(
            [
                ["Available Categories"],
                ...categories.map(
                    category => [category]
                )
            ]
        );


    const suppliersSheet =
        XLSX.utils.aoa_to_sheet(
            [
                ["Available Suppliers"],
                ...suppliers.map(
                    supplier => [supplier]
                )
            ]
        );


    XLSX.utils.book_append_sheet(
        workbook,
        categoriesSheet,
        "Categories"
    );


    XLSX.utils.book_append_sheet(
        workbook,
        suppliersSheet,
        "Suppliers"
    );


    const today =
        new Date()
            .toISOString()
            .slice(0, 10);


    XLSX.writeFile(
        workbook,
        `URUS_Inventory_${today}.xlsx`
    );

}


/* =========================================
   BROWSE FILE
========================================= */

browseExcelBtn.addEventListener(
    "click",
    () => {

        excelFileInput.click();

    }
);


excelFileInput.addEventListener(
    "change",
    event => {

        const file =
            event.target.files[0];

        if (file) {
            processExcelFile(file);
        }

    }
);


/* =========================================
   DRAG AND DROP
========================================= */

[
    "dragenter",
    "dragover"
].forEach(eventName => {

    excelDropZone.addEventListener(
        eventName,
        event => {

            event.preventDefault();

            event.stopPropagation();

            excelDropZone
                .classList
                .add("drag-over");

        }
    );

});


[
    "dragleave",
    "drop"
].forEach(eventName => {

    excelDropZone.addEventListener(
        eventName,
        event => {

            event.preventDefault();

            event.stopPropagation();

            excelDropZone
                .classList
                .remove("drag-over");

        }
    );

});


excelDropZone.addEventListener(
    "drop",
    event => {

        const file =
            event.dataTransfer.files[0];

        if (file) {
            processExcelFile(file);
        }

    }
);


/* =========================================
   PROCESS EXCEL FILE
========================================= */

async function processExcelFile(file) {

    clearImportError();


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    if (
        extension !== "xlsx"
        &&
        extension !== "xls"
    ) {

        showImportError(
            "Please upload an .xlsx or .xls Excel file."
        );

        return;
    }


    if (
        file.size > MAX_FILE_SIZE
    ) {

        showImportError(
            "The Excel file is too large. Maximum size is 10 MB."
        );

        return;
    }


    if (
        typeof XLSX === "undefined"
    ) {

        showImportError(
            "Excel library could not be loaded."
        );

        return;
    }


    try {

        const arrayBuffer =
            await file.arrayBuffer();


        const workbook =
            XLSX.read(
                arrayBuffer,
                {
                    cellDates: true
                }
            );


        if (
            workbook.SheetNames.length === 0
        ) {

            throw new Error(
                "The workbook does not contain any worksheets."
            );

        }


        /*
         Prefer the Inventory sheet.
         Otherwise use the first sheet.
        */

        const sheetName =
            workbook.SheetNames.includes(
                "Inventory"
            )
                ? "Inventory"
                : workbook.SheetNames[0];


        const worksheet =
            workbook.Sheets[sheetName];


        const matrix =
            XLSX.utils.sheet_to_json(
                worksheet,
                {
                    header: 1,
                    defval: "",
                    raw: true
                }
            );


        if (
            matrix.length === 0
        ) {

            showImportError(
                "The Excel sheet is empty."
            );

            return;
        }


        validateAndPreviewExcel(
            matrix
        );


        selectedExcelFile.textContent =
            `Selected file: ${file.name}`;


        selectedExcelFile
            .classList
            .remove("import-hidden");

    } catch (error) {

        console.error(
            "Excel import error:",
            error
        );


        showImportError(
            "URUS could not read this Excel file. Please use the URUS inventory template."
        );

    }

}


/* =========================================
   VALIDATE EXCEL
========================================= */

function validateAndPreviewExcel(matrix) {

    const headerRow =
        matrix[0].map(
            header =>
                String(header)
                    .trim()
        );


    const normalizedHeaders =
        headerRow.map(
            normalizeHeader
        );


    const headerIndexes = {};


    IMPORT_HEADERS.forEach(
        requiredHeader => {

            const index =
                normalizedHeaders
                    .indexOf(
                        normalizeHeader(
                            requiredHeader
                        )
                    );


            if (index !== -1) {

                headerIndexes[
                    requiredHeader
                ] = index;

            }

        }
    );


    const missingHeaders =
        IMPORT_HEADERS.filter(
            header =>
                headerIndexes[header] === undefined
        );


    if (
        missingHeaders.length > 0
    ) {

        showImportError(
            `Missing required column(s): ${missingHeaders.join(", ")}`
        );


        importPreviewSection
            .classList
            .add("import-hidden");


        return;

    }


    const dataRows =
        matrix
            .slice(1)
            .filter(
                row =>
                    !isEmptyExcelRow(row)
            );


    if (
        dataRows.length === 0
    ) {

        showImportError(
            "The Excel file contains no inventory items."
        );

        return;

    }


    if (
        dataRows.length >
        MAX_IMPORT_ROWS
    ) {

        showImportError(
            `This file contains more than ${MAX_IMPORT_ROWS} items. Please split it into smaller files.`
        );

        return;

    }


    const existingSKUs =
        new Set(
            products.map(
                product =>
                    String(product.sku)
                        .trim()
                        .toLowerCase()
            )
        );


    const fileSKUs =
        new Set();


    /*
     These maps make category/supplier matching
     case-insensitive inside the uploaded file.
     Example: "Frozen Foods" and "frozen foods"
     are treated as the same new category.
    */

    const fileCategoryNames =
        new Map();


    const fileSupplierNames =
        new Map();


    const validNewCategories =
        new Map();


    const validNewSuppliers =
        new Map();


    pendingImportProducts = [];

    importPreviewData = [];

    pendingNewCategories = [];

    pendingNewSuppliers = [];


    dataRows.forEach(
        (row, index) => {

            const excelRowNumber =
                index + 2;


            const rawData = {};


            IMPORT_HEADERS.forEach(
                header => {

                    rawData[header] =
                        row[
                            headerIndexes[
                                header
                            ]
                        ];

                }
            );


            const validation =
                validateImportRow(
                    rawData,
                    existingSKUs,
                    fileSKUs,
                    fileCategoryNames,
                    fileSupplierNames
                );


            importPreviewData.push({

                row:
                    excelRowNumber,

                name:
                    String(
                        rawData[
                            "Item Name"
                        ] || ""
                    ),

                sku:
                    String(
                        rawData.SKU || ""
                    ),

                valid:
                    validation.valid,

                errors:
                    validation.errors,

                notes:
                    validation.notes

            });


            if (
                validation.valid
            ) {

                pendingImportProducts.push(
                    validation.product
                );


                if (
                    validation.newCategory
                ) {

                    validNewCategories.set(
                        validation.newCategory
                            .toLowerCase(),
                        validation.newCategory
                    );

                }


                if (
                    validation.newSupplier
                ) {

                    validNewSuppliers.set(
                        validation.newSupplier
                            .toLowerCase(),
                        validation.newSupplier
                    );

                }

            }

        }
    );


    pendingNewCategories =
        Array.from(
            validNewCategories.values()
        )
            .sort(
                (a, b) =>
                    a.localeCompare(b)
            );


    pendingNewSuppliers =
        Array.from(
            validNewSuppliers.values()
        )
            .sort(
                (a, b) =>
                    a.localeCompare(b)
            );


    renderImportPreview();

}


/* =========================================
   VALIDATE ONE ROW
========================================= */

function validateImportRow(
    row,
    existingSKUs,
    fileSKUs,
    fileCategoryNames,
    fileSupplierNames
) {

    const errors = [];

    const notes = [];


    const name =
        String(
            row["Item Name"] || ""
        ).trim();


    const sku =
        String(
            row["SKU"] || ""
        ).trim();


    const rawCategory =
        String(
            row["Category"] || ""
        ).trim();


    const rawSupplier =
        String(
            row["Supplier"] || ""
        ).trim();


    if (!name) {

        errors.push(
            "Item Name is required"
        );

    }


    if (!sku) {

        errors.push(
            "SKU is required"
        );

    }


    const normalizedSKU =
        sku.toLowerCase();


    if (
        sku &&
        existingSKUs.has(
            normalizedSKU
        )
    ) {

        errors.push(
            "SKU already exists in inventory"
        );

    }


    if (
        sku &&
        fileSKUs.has(
            normalizedSKU
        )
    ) {

        errors.push(
            "Duplicate SKU in Excel file"
        );

    }


    if (sku) {

        fileSKUs.add(
            normalizedSKU
        );

    }


    /*
     CATEGORY

     Existing values are matched
     case-insensitively.

     A non-empty unknown category is not an
     error. It is marked as a new category
     that will be created after confirmation.
    */

    let category = null;

    let newCategory = null;


    if (!rawCategory) {

        errors.push(
            "Category is required"
        );

    } else if (
        rawCategory.length > 60
    ) {

        errors.push(
            "Category is too long"
        );

    } else {

        const existingCategory =
            findExistingValue(
                categories,
                rawCategory
            );


        if (existingCategory) {

            category =
                existingCategory;

        } else {

            const key =
                rawCategory.toLowerCase();


            if (
                fileCategoryNames.has(
                    key
                )
            ) {

                category =
                    fileCategoryNames.get(
                        key
                    );

            } else {

                fileCategoryNames.set(
                    key,
                    rawCategory
                );


                category =
                    rawCategory;

            }


            newCategory =
                category;


            notes.push(
                `New category: ${category}`
            );

        }

    }


    const unitType =
        findCanonicalValue(
            row["Unit"],
            ALLOWED_UNITS
        );


    if (!unitType) {

        errors.push(
            "Invalid Unit"
        );

    }


    const stock =
        parsePositiveNumber(
            row["Quantity"]
        );


    if (stock === null) {

        errors.push(
            "Quantity must be 0 or greater"
        );

    }


    const reorderLevel =
        parsePositiveNumber(
            row["Reorder Level"]
        );


    if (
        reorderLevel === null
    ) {

        errors.push(
            "Reorder Level must be 0 or greater"
        );

    }


    /*
     SUPPLIER

     Same behavior as category:
     unknown names are treated as new values,
     not invalid values.
    */

    let supplier = null;

    let newSupplier = null;


    if (!rawSupplier) {

        errors.push(
            "Supplier is required"
        );

    } else if (
        rawSupplier.length > 100
    ) {

        errors.push(
            "Supplier name is too long"
        );

    } else {

        const existingSupplier =
            findExistingValue(
                suppliers,
                rawSupplier
            );


        if (existingSupplier) {

            supplier =
                existingSupplier;

        } else {

            const key =
                rawSupplier.toLowerCase();


            if (
                fileSupplierNames.has(
                    key
                )
            ) {

                supplier =
                    fileSupplierNames.get(
                        key
                    );

            } else {

                fileSupplierNames.set(
                    key,
                    rawSupplier
                );


                supplier =
                    rawSupplier;

            }


            newSupplier =
                supplier;


            notes.push(
                `New supplier: ${supplier}`
            );

        }

    }


    const costPrice =
        parsePositiveNumber(
            row[`Cost (${businessCurrency})`]
        );


    if (
        costPrice === null
    ) {

        errors.push(
            "Cost must be 0 or greater"
        );

    }


    const expiryDate =
        normalizeExcelDate(
            row["Expiry Date"]
        );


    if (
        expiryDate === null
    ) {

        errors.push(
            "Invalid Expiry Date"
        );

    }


    if (
        errors.length > 0
    ) {

        return {

            valid: false,

            errors,

            notes,

            newCategory: null,

            newSupplier: null

        };

    }


    return {

        valid: true,

        errors: [],

        notes,

        newCategory,

        newSupplier,

        product: {

            name,
            sku,
            category,
            stock,
            unitType,
            reorderLevel,
            supplier,
            costPrice,
            expiryDate

        }

    };

}


/* =========================================
   IMPORT HELPERS
========================================= */

function normalizeHeader(value) {

    return String(value)
        .trim()
        .toLowerCase();

}


function isEmptyExcelRow(row) {

    return row.every(
        cell =>
            String(
                cell ?? ""
            )
                .trim() === ""
    );

}


function findCanonicalValue(
    value,
    allowedValues
) {

    const normalized =
        String(value || "")
            .trim()
            .toLowerCase();


    return (
        allowedValues.find(
            allowed =>
                allowed
                    .toLowerCase()
                    === normalized
        )
        ||
        null
    );

}


function parsePositiveNumber(
    value
) {

    if (
        value === ""
        ||
        value === null
        ||
        value === undefined
    ) {

        return null;

    }


    const cleaned =
        String(value)
            .replaceAll(",", "")
            .trim();


    const number =
        Number(cleaned);


    if (
        !Number.isFinite(number)
        ||
        number < 0
    ) {

        return null;

    }


    return number;

}


/* =========================================
   NORMALIZE EXCEL DATE
========================================= */

function normalizeExcelDate(
    value
) {

    if (
        value === ""
        ||
        value === null
        ||
        value === undefined
    ) {

        return "";

    }


    /*
     SheetJS can return actual Date objects.
    */

    if (
        value instanceof Date
    ) {

        if (
            Number.isNaN(
                value.getTime()
            )
        ) {

            return null;

        }


        return formatDateAsISO(
            value
        );

    }


    /*
     Excel may store dates as numbers.
    */

    if (
        typeof value === "number"
    ) {

        const parsed =
            XLSX.SSF.parse_date_code(
                value
            );


        if (!parsed) {
            return null;
        }


        return [
            String(parsed.y)
                .padStart(4, "0"),

            String(parsed.m)
                .padStart(2, "0"),

            String(parsed.d)
                .padStart(2, "0")

        ].join("-");

    }


    const text =
        String(value)
            .trim();


    /*
     Require YYYY-MM-DD for text dates.
    */

    if (
        !/^\d{4}-\d{2}-\d{2}$/
            .test(text)
    ) {

        return null;

    }


    const date =
        new Date(
            `${text}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return text;

}


function formatDateAsISO(
    date
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        )
            .padStart(2, "0");


    const day =
        String(
            date.getDate()
        )
            .padStart(2, "0");


    return `${year}-${month}-${day}`;

}


/* =========================================
   RENDER IMPORT PREVIEW
========================================= */

function renderImportPreview() {

    importPreviewBody.innerHTML = "";


    const validCount =
        importPreviewData.filter(
            item => item.valid
        ).length;


    const errorCount =
        importPreviewData.length -
        validCount;


    importTotalCount.textContent =
        importPreviewData.length;


    importValidCount.textContent =
        validCount;


    importErrorCount.textContent =
        errorCount;


    importNewCategoryCount.textContent =
        pendingNewCategories.length;


    importNewSupplierCount.textContent =
        pendingNewSuppliers.length;


    importNewCategoriesList.innerHTML =
        "";


    importNewSuppliersList.innerHTML =
        "";


    pendingNewCategories.forEach(
        category => {

            const item =
                document.createElement(
                    "li"
                );

            item.textContent =
                category;


            importNewCategoriesList
                .appendChild(item);

        }
    );


    pendingNewSuppliers.forEach(
        supplier => {

            const item =
                document.createElement(
                    "li"
                );

            item.textContent =
                supplier;


            importNewSuppliersList
                .appendChild(item);

        }
    );


    if (
        pendingNewCategories.length > 0
        ||
        pendingNewSuppliers.length > 0
    ) {

        importNewDataSection
            .classList
            .remove("import-hidden");

    } else {

        importNewDataSection
            .classList
            .add("import-hidden");

    }


    /*
     Preview at most 100 rows to keep
     browser rendering fast.
    */

    const rowsToDisplay =
        importPreviewData.slice(
            0,
            100
        );


    rowsToDisplay.forEach(
        item => {

            const row =
                document.createElement(
                    "tr"
                );


            const noteText =
                item.valid
                    ? (
                        item.notes.length > 0
                            ? item.notes.join(
                                "; "
                            )
                            : "—"
                    )
                    : item.errors.join(
                        "; "
                    );


            const statusClass =
                !item.valid
                    ? "import-row-error"
                    : (
                        item.notes.length > 0
                            ? "import-row-new"
                            : "import-row-valid"
                    );


            row.innerHTML = `

                <td>
                    ${item.row}
                </td>

                <td>
                    ${escapeHTML(item.name)}
                </td>

                <td>
                    ${escapeHTML(item.sku)}
                </td>

                <td class="${statusClass}">

                    ${
                        item.valid
                            ? (
                                item.notes.length > 0
                                    ? "Ready + New Data"
                                    : "Ready"
                            )
                            : "Needs Attention"
                    }

                </td>

                <td>
                    ${escapeHTML(noteText)}
                </td>

            `;


            importPreviewBody
                .appendChild(row);

        }
    );


    if (
        importPreviewData.length > 100
    ) {

        previewLimitMessage.textContent =
            `Showing the first 100 of ${importPreviewData.length} rows. All rows will still be validated and imported.`;

    } else {

        previewLimitMessage.textContent =
            "";

    }


    importPreviewSection
        .classList
        .remove("import-hidden");


    confirmImportBtn.disabled =
        validCount === 0;


    confirmImportBtn.textContent =
        validCount === 1
            ? "Import 1 Item"
            : `Import ${validCount} Items`;

}


/* =========================================
   CONFIRM IMPORT
========================================= */

confirmImportBtn.addEventListener(
    "click",
    () => {

        if (
            pendingImportProducts.length === 0
        ) {

            return;

        }


        const newCategoryCount =
            pendingNewCategories.length;


        const newSupplierCount =
            pendingNewSuppliers.length;


        /*
         Create any approved new master data first.
        */

        pendingNewCategories.forEach(
            category => {

                addUniqueMasterValue(
                    categories,
                    category
                );

            }
        );


        pendingNewSuppliers.forEach(
            supplier => {

                addUniqueMasterValue(
                    suppliers,
                    supplier
                );

            }
        );


        persistCategories();

        persistSuppliers();


        let nextId =
            products.reduce(
                (
                    highest,
                    product
                ) =>
                    Math.max(
                        highest,
                        Number(
                            product.id
                        ) || 0
                    ),
                0
            ) + 1;


        const importedProducts =
            pendingImportProducts.map(
                product => {

                    return {

                        id:
                            nextId++,

                        ...product

                    };

                }
            );


        products.push(
            ...importedProducts
        );


        persistProducts();


        refreshMasterDataUI();

        renderProducts();


        const importedCount =
            importedProducts.length;


        closeImportExcelModal();


        const details = [];


        if (newCategoryCount > 0) {

            details.push(
                `${newCategoryCount} new categor${
                    newCategoryCount === 1
                        ? "y"
                        : "ies"
                }`
            );

        }


        if (newSupplierCount > 0) {

            details.push(
                `${newSupplierCount} new supplier${
                    newSupplierCount === 1
                        ? ""
                        : "s"
                }`
            );

        }


        const extraMessage =
            details.length > 0
                ? ` ${details.join(" and ")} created.`
                : "";


        alert(
            `${importedCount} inventory item${
                importedCount === 1
                    ? ""
                    : "s"
            } imported successfully.${extraMessage}`
        );

    }
);


/* =========================================
   IMPORT ERROR
========================================= */

function showImportError(
    message
) {

    importFileError.textContent =
        message;


    importFileError
        .classList
        .remove("import-hidden");


    confirmImportBtn.disabled =
        true;

}


function clearImportError() {

    importFileError.textContent =
        "";


    importFileError
        .classList
        .add("import-hidden");

}

/* =========================================
   INITIAL LOAD
========================================= */

refreshMasterDataUI();

// The server bridge initializes rendering after authentication.
/* Authenticated API bridge for the original inventory interface. */
let serverUser, serverBusiness, serverCategories = [], serverSuppliers = [];
async function serverRequest(path, options = {}) {
    if (!serverUser || !serverBusiness) throw new Error('Please sign in and select a business first.');
    const headers = {Authorization: `Bearer ${await serverUser.getIdToken()}`, 'X-Business-ID': serverBusiness};
    if (options.body) headers['Content-Type'] = 'application/json';
    const response = await fetch('/api/v1' + path, {...options, headers});
    const contentType = response.headers.get('content-type') || '';
    const data = response.status === 204 ? null : contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) throw new Error(data?.error || `Server error (${response.status}). Please try again.`);
    if (response.status !== 204 && data === null) throw new Error('The server returned an unexpected response.');
    return data;
}
function selectBusinessDetails(item) {
    businessCurrency = item.currency;
    IMPORT_HEADERS[7] = `Cost (${businessCurrency})`;
    document.querySelectorAll('label[for="item-cost"], label[for="edit-item-cost"]').forEach(label => label.textContent = `Cost per Unit (${businessCurrency})`);
}
async function refreshServerData() {
    [serverCategories, serverSuppliers] = await Promise.all([serverRequest('/categories'), serverRequest('/suppliers')]);
    categories = serverCategories.map(x => x.name); suppliers = serverSuppliers.map(x => x.name);
    activeSuppliers = serverSuppliers.filter(x => !x.archived_at).map(x => x.name);
    let rows = [], batch, offset = 0;
    do { batch = await serverRequest(`/products?limit=500&offset=${offset}`); rows.push(...batch); offset += batch.length; } while (batch.length === 500);
    products = rows.map(p => ({id:p.id,name:p.name,sku:p.sku,category:serverCategories.find(c=>c.id===p.category_id)?.name || '',supplier:serverSuppliers.find(s=>s.id===p.supplier_id)?.name || '',supplierArchived:!!serverSuppliers.find(s=>s.id===p.supplier_id)?.archived_at,supplierIds:p.supplier_ids || [p.supplier_id],stock:Number(p.stock),unitType:p.unit,reorderLevel:Number(p.reorder_level),costPrice:Number(p.cost_price),expiryDate:p.expiry_date || ''}));
    refreshMasterDataUI(); renderProducts();
}
function itemPayload(prefix) {
    const val = key => document.getElementById(prefix + key).value;
    return {name:val('name'),sku:val('sku'),category_id:serverCategories.find(x=>x.name===val('category'))?.id,supplier_id:serverSuppliers.find(x=>x.name===val('supplier'))?.id,supplier_ids:[...document.querySelectorAll(`#${prefix}extra-suppliers input:checked`)].map(input=>Number(input.value)),stock:val('stock'),unit:val('unit'),reorder_level:val('reorder'),cost_price:val('cost'),expiry_date:val('expiry') || null};
}
function renderExtraSuppliers(prefix, selected = []) {
    const container = document.getElementById(`${prefix}extra-suppliers`);
    container.replaceChildren();
    serverSuppliers.filter(s => !s.archived_at || selected.includes(s.id)).forEach(s => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:8px;margin:6px 0';
        const input = document.createElement('input'); input.type='checkbox'; input.value=s.id; input.checked=selected.includes(s.id);
        label.append(input, document.createTextNode(s.name + (s.archived_at ? ' (archived)' : ''))); container.append(label);
    });
}
for (const prefix of ['item-', 'edit-item-']) {
    const group = document.getElementById(`${prefix}supplier`).closest('.form-group');
    const section = document.createElement('div'); section.className='form-group full-width';
    const heading = document.createElement('strong'); heading.textContent='Additional suppliers';
    const primaryLabel = document.querySelector(`label[for="${prefix}supplier"]`); if (primaryLabel) primaryLabel.textContent='Primary supplier';
    const list = document.createElement('div'); list.id=`${prefix}extra-suppliers`;
    section.append(heading,list); group.after(section);
}
addItemBtn.addEventListener('click', () => renderExtraSuppliers('item-'));
const originalEditProduct = window.editProduct;
window.editProduct = id => { originalEditProduct(id); renderExtraSuppliers('edit-item-', products.find(p=>p.id===id)?.supplierIds || []); };
const originalViewProduct = window.viewProduct;
window.viewProduct = id => {
    originalViewProduct(id);
    const product = products.find(p=>p.id===id);
    if (!product) return;
    const row = document.createElement('div'); row.className='detail-row';
    const label = document.createElement('span'); label.textContent='All suppliers';
    const value = document.createElement('span'); value.textContent=product.supplierIds.map(id=>serverSuppliers.find(s=>s.id===id)?.name).filter(Boolean).join(', ');
    row.append(label,value); viewItemContent.querySelector('.detail-list')?.append(row);
};
function showServerError(error) { alert(error.message || 'Request failed'); }
document.addEventListener('submit', async event => {
    const form = event.target;
    if (!['add-item-form','edit-item-form','stock-update-form','new-category-form','new-supplier-form'].includes(form.id)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    try {
        if (form.id === 'add-item-form' || form.id === 'edit-item-form') {
            const editing = form.id === 'edit-item-form';
            const id = document.getElementById('edit-item-id').value;
            await serverRequest('/products'+(editing?`/${id}`:''), {method:editing?'PATCH':'POST',body:JSON.stringify(itemPayload(editing?'edit-item-':'item-'))});
            if (editing) editItemModal.classList.add('hidden'); else closeAddItemModal();
        } else if (form.id === 'stock-update-form') {
            const id = document.getElementById('stock-product-id').value;
            await serverRequest(`/products/${id}/movements`,{method:'POST',body:JSON.stringify({action:document.getElementById('stock-action').value,quantity:document.getElementById('stock-quantity').value,reason:document.getElementById('stock-reason').value})});
            closeStockUpdateModal();
        } else {
            const isCategory = form.id === 'new-category-form';
            const name = (isCategory ? newCategoryName : newSupplierName).value.trim();
            const target = isCategory ? categoryReturnTarget : supplierReturnTarget;
            const list = isCategory ? serverCategories : serverSuppliers;
            let existing = list.find(x=>x.name.toLowerCase()===name.toLowerCase());
            if (existing?.archived_at) throw new Error('This supplier is archived. Restore it from the Suppliers archive first.');
            if (!existing) existing = await serverRequest(isCategory?'/categories':'/suppliers',{method:'POST',body:JSON.stringify({name})});
            await refreshServerData();
            if (target) target.value = existing.name;
            if (!isCategory) {
                const prefix = target === editItemSupplierSelect ? 'edit-item-' : 'item-';
                const chosen = [...document.querySelectorAll(`#${prefix}extra-suppliers input:checked`)].map(input => Number(input.value));
                renderExtraSuppliers(prefix, chosen);
            }
            if (isCategory) closeCategoryModal(); else closeSupplierModal();
            return;
        }
        await refreshServerData();
    } catch (error) { showServerError(error); }
}, true);
document.addEventListener('click', async event => {
    if (!event.target.closest('#confirm-import-btn')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    try {
        const rows = pendingImportProducts.map(p=>({name:p.name,sku:p.sku,category:p.category,supplier:p.supplier,stock:p.stock,unit:p.unitType,reorder_level:p.reorderLevel,cost_price:p.costPrice,expiry_date:p.expiryDate || null}));
        const preview = await serverRequest('/imports/products/preview',{method:'POST',body:JSON.stringify({rows})});
        if (preview.errors.length) throw new Error(preview.errors.map(e=>`Row ${e.row}: ${e.error}`).join('\n'));
        const result = await serverRequest('/imports/products/commit',{method:'POST',body:JSON.stringify({rows})});
        closeImportExcelModal(); await refreshServerData(); alert(`${result.imported} items imported.`);
    } catch(error) { showServerError(error); }
}, true);
window.deleteProduct = async id => {
    const product = products.find(p=>p.id===id);
    if (!product || !confirm(`Archive "${product.name}"?`)) return;
    try { await serverRequest(`/products/${id}`,{method:'DELETE'}); await refreshServerData(); } catch(error) { showServerError(error); }
};
try {
    const auth = await setupAuth();
    document.querySelector('.logout-btn')?.addEventListener('click',()=>signOut(auth));
    onAuthStateChanged(auth,async user=>{
        if (!user) { location.replace('/'); return; }
        serverUser=user;
        try {
            const response=await fetch('/api/v1/me',{headers:{Authorization:`Bearer ${await user.getIdToken()}`}});
            const type=response.headers.get('content-type') || '';
            const me=type.includes('application/json') ? await response.json() : null;
            if(!response.ok) throw new Error(me?.error || `Server error (${response.status})`);
            if(!me?.businesses?.length) { location.replace('/onboarding.html'); return; }
            const select = document.getElementById('business-switch');
            select.replaceChildren(...me.businesses.map(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = item.name; return option; }));
            select.hidden = me.businesses.length < 2;
            const saved = sessionStorage.getItem('urus-business-id');
            serverBusiness = me.businesses.some(item => String(item.id) === saved) ? saved : String(me.businesses[0].id);
            select.value = serverBusiness;
            sessionStorage.setItem('urus-business-id', serverBusiness);
            selectBusinessDetails(me.businesses.find(item => String(item.id) === serverBusiness));
            document.querySelector('.header h1').textContent = me.businesses.find(item => String(item.id) === serverBusiness).name;
            select.onchange = async () => {
                serverBusiness = select.value;
                sessionStorage.setItem('urus-business-id', serverBusiness);
                selectBusinessDetails(me.businesses.find(item => String(item.id) === serverBusiness));
                document.querySelector('.header h1').textContent = me.businesses.find(item => String(item.id) === serverBusiness).name;
                try { await refreshServerData(); } catch (error) { showServerError(error); }
            };
            await refreshServerData();
        } catch(error) { showServerError(error); }
    });
} catch(error) { showServerError(error); }

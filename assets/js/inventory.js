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
                            ${product.name}
                        </span>

                        <span class="product-sku">
                            SKU · ${product.sku}
                        </span>

                    </div>

                </td>


                <td>
                    ${product.category}
                </td>


                <td>

                    <strong>
                        ${formatQuantity(product.stock)}
                    </strong>

                    ${product.unitType}

                </td>


                <td>

                    ${formatQuantity(product.reorderLevel)}

                    ${product.unitType}

                </td>


                <td>
                    ${product.supplier}
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
        `BND ${inventoryValue.toFixed(2)}`;
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
                document.getElementById(
                    "item-sku"
                ).value.trim(),

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
                <span>${product.name}</span>
            </div>

            <div class="detail-row">
                <span>SKU</span>
                <span>${product.sku}</span>
            </div>

            <div class="detail-row">
                <span>Category</span>
                <span>${product.category}</span>
            </div>

            <div class="detail-row">
                <span>Current Stock</span>
                <span>
                    ${formatQuantity(product.stock)}
                    ${product.unitType}
                </span>
            </div>

            <div class="detail-row">
                <span>Reorder Level</span>
                <span>
                    ${formatQuantity(product.reorderLevel)}
                    ${product.unitType}
                </span>
            </div>

            <div class="detail-row">
                <span>Supplier</span>
                <span>${product.supplier}</span>
            </div>

            <div class="detail-row">
                <span>Cost per Unit</span>
                <span>
                    BND ${product.costPrice.toFixed(2)}
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


        product.name =
            document.getElementById(
                "edit-item-name"
            ).value.trim();


        product.sku =
            document.getElementById(
                "edit-item-sku"
            ).value.trim();


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
   INITIAL LOAD
========================================= */

renderProducts();
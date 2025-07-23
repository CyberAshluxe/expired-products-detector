document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const addProductForm = document.getElementById('addProductForm');
    const inventoryList = document.getElementById('inventoryList');
    const productScannerSelect = document.getElementById('productScannerSelect');
    const verifyProductBtn = document.getElementById('verifyProductBtn');
    const verificationResult = document.getElementById('verificationResult');

    // Regulator Dashboard Elements
    const totalProducts = document.getElementById('totalProducts');
    const nearExpiryCount = document.getElementById('nearExpiryCount');
    const expiredCount = document.getElementById('expiredCount');
    const reportedList = document.getElementById('reportedList');

    // --- Data Store ---
    // In a real application, this would be on a server/database.
    let inventory = [];
    let productIdCounter = 1;

    // --- Core Functions ---

    /**
     * Renders the entire inventory list and updates all dashboards.
     */
    function renderAll() {
        renderInventory();
        updateScannerOptions();
        updateRegulatorDashboard();
    }

    /**
     * Checks the status of a product based on its expiry date.
     * @param {Date} expiryDate - The expiry date of the product.
     * @returns {object} An object with status text and a bootstrap class.
     */
    function getProductStatus(expiryDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0); // Normalize expiry date

        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { status: 'Expired', class: 'list-group-item-danger' };
        } else if (diffDays <= 10) {
            return { status: `Expires in ${diffDays + 1} day(s)`, class: 'list-group-item-warning' };
        } else {
            return { status: 'Safe', class: '' };
        }
    }

    /**
     * Renders the list of products in the retailer's inventory.
     */
    function renderInventory() {
        inventoryList.innerHTML = ''; // Clear current list

        if (inventory.length === 0) {
            inventoryList.innerHTML = '<li class="list-group-item text-center text-muted">No products in inventory.</li>';
            return;
        }
        
        inventory.forEach(product => {
            const statusInfo = getProductStatus(product.expiryDate);
            const li = document.createElement('li');
            li.className = `list-group-item d-flex justify-content-between align-items-center ${statusInfo.class}`;
            
            li.innerHTML = `
                <div>
                    <strong>${product.name}</strong> (ID: ${product.id})<br>
                    <small class="text-muted">Batch: ${product.batch} | Expires: ${new Date(product.expiryDate).toDateString()}</small>
                </div>
                <span class="badge bg-secondary rounded-pill">${statusInfo.status}</span>
            `;
            inventoryList.appendChild(li);
        });
    }

    /**
     * Populates the consumer's "scanner" dropdown with current inventory.
     */
    function updateScannerOptions() {
        productScannerSelect.innerHTML = '<option selected>Select a product to "scan"...</option>';
        inventory.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (ID: ${product.id})`;
            productScannerSelect.appendChild(option);
        });
    }

    /**
     * Updates the stats on the regulator's dashboard.
     */
    function updateRegulatorDashboard() {
        let nearExpiry = 0;
        let expired = 0;

        inventory.forEach(product => {
            const statusInfo = getProductStatus(product.expiryDate);
            if (statusInfo.status === 'Expired') {
                expired++;
            } else if (statusInfo.class === 'list-group-item-warning') {
                nearExpiry++;
            }
        });

        totalProducts.textContent = inventory.length;
        nearExpiryCount.textContent = nearExpiry;
        expiredCount.textContent = expired;
    }

    /**
     * Handles the form submission to add a new product.
     * @param {Event} e - The form submission event.
     */
    function handleAddProduct(e) {
        e.preventDefault();

        const name = document.getElementById('productName').value;
        const batch = document.getElementById('batchNumber').value;
        const expiryDate = document.getElementById('expiryDate').value;
        
        // Create a new product object
        const newProduct = {
            id: `PROD${productIdCounter++}`,
            name,
            batch,
            expiryDate,
            reported: false
        };

        inventory.push(newProduct);
        addProductForm.reset();
        renderAll(); // Re-render everything
    }

    /**
     * Handles the consumer's action to verify a product.
     */
    function handleVerifyProduct() {
        const selectedId = productScannerSelect.value;
        const product = inventory.find(p => p.id === selectedId);
        
        verificationResult.innerHTML = ''; // Clear previous result

        if (!product) {
            verificationResult.innerHTML = `
                <div class="alert alert-secondary" role="alert">
                    Please select a product from the list to simulate scanning.
                </div>`;
            return;
        }
        
        const statusInfo = getProductStatus(product.expiryDate);
        let alertClass = 'alert-success';
        let reportButton = '';

        if (statusInfo.status === 'Expired') {
            alertClass = 'alert-danger';
            reportButton = `<button class="btn btn-danger mt-2" onclick="reportProduct('${product.id}')">Report Expired Product</button>`;
        } else if (statusInfo.class.includes('warning')) {
            alertClass = 'alert-warning';
        }

        verificationResult.innerHTML = `
            <div class="alert ${alertClass}" role="alert">
                <h4 class="alert-heading">Product Verified!</h4>
                <p><strong>Product:</strong> ${product.name}</p>
                <p><strong>Batch:</strong> ${product.batch}</p>
                <p><strong>Expiry Date:</strong> ${new Date(product.expiryDate).toDateString()}</p>
                <hr>
                <p class="mb-0"><strong>Status: ${statusInfo.status}</strong></p>
            </div>
            ${reportButton}
        `;
    }
    
    // --- Global Function for Reporting ---
    // Needs to be global to be called from dynamically created HTML
    window.reportProduct = function(productId) {
        const product = inventory.find(p => p.id === productId);
        if (product && !product.reported) {
            product.reported = true;
            
            if(reportedList.querySelector('.text-muted')){
                reportedList.innerHTML = ''; // Clear "no reports" message
            }

            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-danger';
            li.textContent = `Consumer reported ${product.name} (ID: ${product.id}, Batch: ${product.batch}) as expired.`;
            reportedList.appendChild(li);

            // Give feedback to the user
            verificationResult.innerHTML += `<div class="alert alert-info mt-2">Product has been reported to NAFDAC. Thank you!</div>`;
            document.querySelector(`button[onclick="reportProduct('${product.id}')"]`).disabled = true;
        }
    }


    // --- Event Listeners ---
    addProductForm.addEventListener('submit', handleAddProduct);
    verifyProductBtn.addEventListener('click', handleVerifyProduct);

    // Initial render on page load
    renderAll();
});
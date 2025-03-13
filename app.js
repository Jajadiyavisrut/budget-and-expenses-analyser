// Constants
const API_ENDPOINTS = {
    CATEGORIES: 'api/categories.php',
    BUDGETS: 'api/budgets.php',
    EXPENSES: 'api/expenses.php'
};

const PAYMENT_METHODS = {
    cash: { label: 'Cash', class: 'payment-cash' },
    online: { label: 'Online', class: 'payment-online' },
    credit_card: { label: 'Credit Card', class: 'payment-credit' },
    debit_card: { label: 'Debit Card', class: 'payment-debit' }
};

// State management
const today = new Date();
let currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
let categories = [];
let budgets = [];
let expenses = [];
let lastAddedBudgetId = null;
let notificationTimeout = null;

// Add these global variables to store chart instances
let budgetChartInstance = null;
let expenseChartInstance = null;

// Initialize month selector
function initializeMonthSelector() {
    // Create month selector elements
    const header = document.querySelector('header');
    
    // Create container for month selector
    const monthSelectorContainer = document.createElement('div');
    monthSelectorContainer.className = 'month-selector-container';
    
    // Create label
    const label = document.createElement('small');
    label.className = 'text-white mb-2 d-block';
    label.textContent = 'Select month (current or past only)';
    
    // Create month input
    const monthSelector = document.createElement('input');
    monthSelector.type = 'month';
    monthSelector.id = 'monthSelector';
    monthSelector.className = 'form-control mb-4';
    
    // Set max attribute to current month to prevent future selections
    const today = new Date();
    const currentYearMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    monthSelector.max = currentYearMonth;
    
    // Set initial value
    monthSelector.value = currentMonth;
    
    // Add event listener for month changes
    monthSelector.addEventListener('change', async (e) => {
        const selectedMonth = e.target.value;
        const selectedDate = new Date(selectedMonth + '-01');
        const now = new Date();
        
        // Reset to current month if future date is selected
        if (selectedDate > now) {
            e.target.value = currentMonth;
            showNotification('Cannot select future months', 'warning');
            return;
        }
        
        // Update current month and reload data
        currentMonth = selectedMonth;
        try {
            await loadBudgets();
            
            // Ensure Others category has a budget for the new month
            await ensureOthersCategoryBudget();
            
            await loadExpenses();
            
            // Update expense form date restrictions
            setupExpenseForm();
            
            // Show notification about the month change
            showNotification(`Switched to ${new Date(currentMonth + '-01').toLocaleDateString('en-US', {year: 'numeric', month: 'long'})}`, 'info');
        } catch (error) {
            showNotification('Failed to load data for the selected month', 'danger');
        }
    });
    
    // Append elements to container
    monthSelectorContainer.appendChild(label);
    monthSelectorContainer.appendChild(monthSelector);
    
    // Append container to header
    header.appendChild(monthSelectorContainer);
}

// API calls
async function fetchData(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        
        if (!response.ok) {
            let errorMessage = 'API request failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = `${response.status}: ${response.statusText}`;
            }
            console.error(`API Error (${endpoint}):`, errorMessage);
            throw new Error(errorMessage);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        // Don't alert here, let the calling function handle the error
        throw error;
    }
}

// Category management
async function loadCategories() {
    categories = await fetchData(API_ENDPOINTS.CATEGORIES);
    updateCategoryList();
    updateCategorySelects();
    return categories;
}

function updateCategoryList() {
    const container = document.getElementById('categoryList');
    
    const html = categories.map(category => `
        <div class="list-group-item bg-dark-glass d-flex justify-content-between align-items-center">
            <span>${category.name}</span>
            ${category.id !== 1 ? `
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary edit-category" data-id="${category.id}" data-name="${category.name}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger delete-category" data-id="${category.id}">Delete</button>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Add event listeners for edit and delete buttons
    setupCategoryEventListeners();
}

function updateCategorySelects() {
    // Update category selects in budget and expense forms
    const budgetCategorySelect = document.getElementById('budgetCategorySelect');
    const expenseCategorySelect = document.getElementById('expenseCategorySelect');
    
    // Clear existing options except the first one
    while (budgetCategorySelect.options.length > 1) {
        budgetCategorySelect.remove(1);
    }
    
    while (expenseCategorySelect.options.length > 1) {
        expenseCategorySelect.remove(1);
    }
    
    // Add new options
    categories.forEach(category => {
        const budgetOption = document.createElement('option');
        budgetOption.value = category.id;
        budgetOption.textContent = category.name;
        budgetCategorySelect.appendChild(budgetOption);
        
        const expenseOption = document.createElement('option');
        expenseOption.value = category.id;
        expenseOption.textContent = category.name;
        expenseCategorySelect.appendChild(expenseOption);
    });
}

function setupCategoryEventListeners() {
    const container = document.getElementById('categoryList');
    const categoryForm = document.getElementById('categoryForm');
    const categoryNameInput = document.getElementById('categoryNameInput');
    const editCategoryId = document.getElementById('editCategoryId');
    const categorySubmitBtn = document.getElementById('categorySubmitBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    
    // Event listeners for form submission
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryName = categoryNameInput.value.trim();
        
        if (editCategoryId.value) {
            // Update existing category
            await updateCategory(editCategoryId.value, categoryName);
            // Reset form to add mode
            editCategoryId.value = '';
            categorySubmitBtn.textContent = 'Add';
            cancelEditBtn.classList.add('d-none');
        } else {
            // Create new category
            await createCategory(categoryName);
        }
        
        categoryNameInput.value = '';
    });
    
    // Cancel edit button
    cancelEditBtn.addEventListener('click', () => {
        editCategoryId.value = '';
        categoryNameInput.value = '';
        categorySubmitBtn.textContent = 'Add';
        cancelEditBtn.classList.add('d-none');
    });
    
    // Edit category buttons
    container.querySelectorAll('.edit-category').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const name = button.dataset.name;
            
            // Set form to edit mode
            editCategoryId.value = id;
            categoryNameInput.value = name;
            categorySubmitBtn.textContent = 'Update';
            cancelEditBtn.classList.remove('d-none');
            
            // Focus on the input
            categoryNameInput.focus();
        });
    });
    
    container.querySelectorAll('.delete-category').forEach(button => {
        button.addEventListener('click', async () => {
            const categoryId = parseInt(button.dataset.id);
            const category = categories.find(c => c.id === categoryId);
            
            if (!category) return;
            
            // Count related data
            const relatedBudgets = budgets.filter(b => parseInt(b.category_id) === categoryId).length;
            const relatedExpenses = expenses.filter(e => parseInt(e.category_id) === categoryId).length;
            
            const confirmMessage = `Are you sure you want to delete the category "${category.name}"?\n\n` +
                `This will also delete:\n` +
                `- ${relatedBudgets} budget(s)\n` +
                `- ${relatedExpenses} expense(s)\n\n` +
                `This action cannot be undone.`;
                
            if (confirm(confirmMessage)) {
                await deleteCategory(categoryId);
            }
        });
    });
}

async function createCategory(name) {
    try {
        // Create the category
        const response = await fetchData(API_ENDPOINTS.CATEGORIES, {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        
        // Get the new category ID from the response
        const newCategoryId = response.id;
        
        // Reload categories
        await loadCategories();
        
        // Create a default budget with zero amount for the new category
        if (newCategoryId) {
            // Create a default budget with zero amount
            const budgetResponse = await fetchData(API_ENDPOINTS.BUDGETS, {
                method: 'POST',
                body: JSON.stringify({
                    category_id: newCategoryId,
                    amount: 0,
                    month: currentMonth
                })
            });
            
            // Store the ID of the newly added budget for highlighting
            if (budgetResponse && budgetResponse.id) {
                lastAddedBudgetId = budgetResponse.id;
            }
            
            // Show notification
            showNotification(`Category "${name}" created with default ₹0.00 budget`);
            
            // Reload budgets to show the new default budget
            await loadBudgets();
        }
    } catch (error) {
        showNotification('Failed to create category', 'danger');
    }
}

async function updateCategory(id, name) {
    await fetchData(API_ENDPOINTS.CATEGORIES, {
        method: 'PUT',
        body: JSON.stringify({ id, name })
    });
    await loadCategories();
}

async function deleteCategory(id) {
    try {
        // Find the category name before deleting
        const category = categories.find(c => c.id === parseInt(id));
        const categoryName = category ? category.name : 'Unknown';
        
        // Delete the category and all related data
        const response = await fetchData(`${API_ENDPOINTS.CATEGORIES}?id=${id}`, {
            method: 'DELETE'
        });
        
        // Show success notification with details about deleted data
        if (response && response.deleted_data) {
            const { expenses, budgets } = response.deleted_data;
            showNotification(
                `Category "${categoryName}" deleted successfully. Also removed: ${budgets} budget(s) and ${expenses} expense(s).`,
                'success'
            );
        } else {
            showNotification(`Category "${categoryName}" deleted successfully.`, 'success');
        }
        
        // Reload all data to update the UI
        await loadCategories();
        await loadBudgets();
        await loadExpenses();
        
        // Update charts
        renderCharts();
    } catch (error) {
        showNotification(`Failed to delete category: ${error.message}`, 'danger');
    }
}

// Budget management
async function loadBudgets() {
    try {
        // Fetch the latest budgets from the server
        budgets = await fetchData(`${API_ENDPOINTS.BUDGETS}?month=${currentMonth}`);
        
        // Update the budget list with the updated data
        updateBudgetList();
        
        // Also update charts since they depend on budget data
        renderCharts();
        
        return budgets;
    } catch (error) {
        console.error('Error loading budgets:', error);
        showNotification('Failed to load budgets', 'danger');
    }
}

function updateBudgetList() {
    const container = document.getElementById('budgetList');
    
    const html = budgets.map(budget => `
        <div class="list-group-item bg-dark-glass d-flex justify-content-between align-items-center
            ${lastAddedBudgetId && parseInt(budget.id) === parseInt(lastAddedBudgetId) ? 'newly-added-budget' : ''}">
            <span>${budget.category_name}</span>
            <div class="d-flex align-items-center">
                <span class="me-3 ${parseFloat(budget.amount) === 0 ? 'text-warning' : ''}">₹${parseFloat(budget.amount).toFixed(2)}</span>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary edit-budget" 
                        data-id="${budget.id}" 
                        data-category-id="${budget.category_id}" 
                        data-amount="${budget.amount}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger delete-budget" data-id="${budget.id}">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Add event listeners for budget buttons
    setupBudgetEventListeners();
}

function setupBudgetEventListeners() {
    const container = document.getElementById('budgetList');
    const budgetForm = document.getElementById('budgetForm');
    const budgetCategorySelect = document.getElementById('budgetCategorySelect');
    const budgetAmountInput = document.getElementById('budgetAmountInput');
    const editBudgetId = document.getElementById('editBudgetId');
    const budgetSubmitBtn = document.getElementById('budgetSubmitBtn');
    const editBudgetControls = document.getElementById('editBudgetControls');
    const cancelBudgetEditBtn = document.getElementById('cancelBudgetEditBtn');
    
    // Event listeners for form submission
    budgetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryId = budgetCategorySelect.value;
        const amount = budgetAmountInput.value;
        
        if (editBudgetId.value) {
            // Update existing budget
            await updateBudget(editBudgetId.value, amount);
            // Reset form to add mode
            resetBudgetForm();
        } else {
            // Create new budget
            await createBudget(categoryId, amount);
            budgetForm.reset();
        }
    });
    
    // Function to reset the budget form to add mode
    function resetBudgetForm() {
        editBudgetId.value = '';
        budgetCategorySelect.disabled = false;
        budgetSubmitBtn.textContent = 'Set';
        editBudgetControls.classList.add('d-none');
        budgetForm.reset();
    }
    
    // Cancel edit button
    cancelBudgetEditBtn.addEventListener('click', resetBudgetForm);
    
    // Edit budget buttons
    container.querySelectorAll('.edit-budget').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const categoryId = button.dataset.categoryId;
            const amount = button.dataset.amount;
            
            // Set form to edit mode
            editBudgetId.value = id;
            budgetCategorySelect.value = categoryId;
            budgetCategorySelect.disabled = true; // Disable category selection during edit
            budgetAmountInput.value = amount;
            budgetSubmitBtn.textContent = 'Update';
            editBudgetControls.classList.remove('d-none');
            
            // Focus on the amount input
            budgetAmountInput.focus();
            budgetAmountInput.select();
        });
    });
    
    container.querySelectorAll('.delete-budget').forEach(button => {
        button.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this budget?')) {
                await deleteBudget(button.dataset.id);
            }
        });
    });
}

async function createBudget(categoryId, amount) {
    // Default to zero if amount is empty or not provided
    const budgetAmount = amount === '' || amount === undefined ? 0 : amount;
    
    try {
        const response = await fetchData(API_ENDPOINTS.BUDGETS, {
            method: 'POST',
            body: JSON.stringify({
                category_id: categoryId,
                amount: budgetAmount,
                month: currentMonth
            })
        });
        
        // Store the ID of the newly added budget for highlighting
        lastAddedBudgetId = response.id;
        
        // Show success notification if not called from createCategory
        // (to avoid duplicate notifications)
        const callerFunction = new Error().stack.split('\n')[2].trim();
        if (!callerFunction.includes('createCategory')) {
            const categoryName = categories.find(c => c.id === parseInt(categoryId)).name;
            showNotification(`Budget for "${categoryName}" set to ₹${parseFloat(budgetAmount).toFixed(2)}`);
        }
        
        // Reload budgets and update UI
        await loadBudgets();
        
        // Update charts to reflect the new budget
        renderCharts();
        
        return response;
    } catch (error) {
        showNotification('Failed to create budget', 'danger');
        throw error;
    }
}

async function updateBudget(id, amount) {
    // Default to zero if amount is empty or not provided
    const budgetAmount = amount === '' || amount === undefined ? 0 : amount;
    
    try {
        await fetchData(API_ENDPOINTS.BUDGETS, {
            method: 'PUT',
            body: JSON.stringify({ id, amount: budgetAmount })
        });
        
        // Store the ID of the updated budget for highlighting
        lastAddedBudgetId = id;
        
        // Show success notification
        const budget = budgets.find(b => b.id === parseInt(id));
        if (budget) {
            showNotification(`Budget for "${budget.category_name}" updated to ₹${parseFloat(budgetAmount).toFixed(2)}`);
        }
        
        await loadBudgets();
        
        // Update charts to reflect the updated budget
        renderCharts();
    } catch (error) {
        showNotification('Failed to update budget', 'danger');
    }
}

async function deleteBudget(id) {
    try {
        // Find the budget before deleting it
        const budget = budgets.find(b => b.id === parseInt(id));
        const categoryName = budget ? budget.category_name : '';
        
        await fetchData(`${API_ENDPOINTS.BUDGETS}?id=${id}`, {
            method: 'DELETE'
        });
        
        if (categoryName) {
            showNotification(`Budget for "${categoryName}" has been deleted`);
        }
        
        await loadBudgets();
        
        // Update charts to reflect the deleted budget
        renderCharts();
    } catch (error) {
        showNotification('Failed to delete budget', 'danger');
    }
}

// Expense management
async function loadExpenses() {
    try {
        // Fetch the latest expenses from the server
        expenses = await fetchData(`${API_ENDPOINTS.EXPENSES}?month=${currentMonth}`);
        
        // Update the expense list with the updated data
        updateExpenseList();
        
        // Also update charts since they depend on expense data
        renderCharts();
        
        return expenses;
    } catch (error) {
        console.error('Error loading expenses:', error);
        showNotification('Failed to load expenses', 'danger');
    }
}

function updateExpenseList() {
    const container = document.getElementById('expenseList');
    
    // Group expenses by date
    const groupedExpenses = expenses.reduce((groups, expense) => {
        const date = expense.date;
        if (!groups[date]) groups[date] = [];
        groups[date].push(expense);
        return groups;
    }, {});
    
    const html = Object.entries(groupedExpenses)
        .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
        .map(([date, dayExpenses]) => `
            <div class="mb-4">
                <h5 class="mb-3">${new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}</h5>
                <div class="list-group">
                    ${dayExpenses.map(expense => `
                        <div class="list-group-item bg-dark-glass d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${expense.description}</strong>
                                <br>
                                <small>${expense.category_name}</small>
                                <span class="payment-method ${PAYMENT_METHODS[expense.payment_method].class}">
                                    ${PAYMENT_METHODS[expense.payment_method].label}
                                </span>
                            </div>
                            <div class="d-flex align-items-center">
                                <span class="me-3">₹${parseFloat(expense.amount).toFixed(2)}</span>
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-outline-primary edit-expense" 
                                        data-id="${expense.id}"
                                        data-category-id="${expense.category_id}"
                                        data-amount="${expense.amount}"
                                        data-description="${expense.description.replace(/"/g, '&quot;')}"
                                        data-date="${expense.date}"
                                        data-payment-method="${expense.payment_method}">Edit</button>
                                    <button class="btn btn-sm btn-outline-danger delete-expense" data-id="${expense.id}">Delete</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    
    container.innerHTML = html;
    
    // Add event listeners for expense buttons
    setupExpenseEventListeners();
}

function setupExpenseEventListeners() {
    const container = document.getElementById('expenseList');
    
    // Event listeners for edit buttons
    container.querySelectorAll('.edit-expense').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const categoryId = button.dataset.categoryId;
            const amount = button.dataset.amount;
            const description = button.dataset.description;
            const date = button.dataset.date;
            const paymentMethod = button.dataset.paymentMethod;
            
            // Get form elements
            const expenseForm = document.getElementById('expenseForm');
            const expenseCategorySelect = document.getElementById('expenseCategorySelect');
            const expenseAmountInput = document.getElementById('expenseAmountInput');
            const expenseDescriptionInput = document.getElementById('expenseDescriptionInput');
            const expenseDateInput = document.getElementById('expenseDateInput');
            const expensePaymentMethodSelect = document.getElementById('expensePaymentMethodSelect');
            const editExpenseId = document.getElementById('editExpenseId');
            const expenseSubmitBtn = document.getElementById('expenseSubmitBtn');
            const editExpenseControls = document.getElementById('editExpenseControls');
            
            // Set form to edit mode
            editExpenseId.value = id;
            expenseCategorySelect.value = categoryId;
            expenseAmountInput.value = amount;
            expenseDescriptionInput.value = description;
            expenseDateInput.value = date;
            expensePaymentMethodSelect.value = paymentMethod;
            expenseSubmitBtn.textContent = 'Update Expense';
            editExpenseControls.classList.remove('d-none');
            
            // Scroll to the form
            expenseForm.scrollIntoView({ behavior: 'smooth' });
            
            // Focus on the description input
            expenseDescriptionInput.focus();
        });
    });
    
    // Event listeners for delete buttons
    container.querySelectorAll('.delete-expense').forEach(button => {
        button.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this expense?')) {
                await deleteExpense(button.dataset.id);
            }
        });
    });
}

function setupExpenseForm() {
    const expenseForm = document.getElementById('expenseForm');
    const expenseCategorySelect = document.getElementById('expenseCategorySelect');
    const expenseAmountInput = document.getElementById('expenseAmountInput');
    const expenseDescriptionInput = document.getElementById('expenseDescriptionInput');
    const expenseDateInput = document.getElementById('expenseDateInput');
    const expensePaymentMethodSelect = document.getElementById('expensePaymentMethodSelect');
    const editExpenseId = document.getElementById('editExpenseId');
    const expenseSubmitBtn = document.getElementById('expenseSubmitBtn');
    const editExpenseControls = document.getElementById('editExpenseControls');
    const cancelExpenseEditBtn = document.getElementById('cancelExpenseEditBtn');
    const dateRestrictionMsg = document.getElementById('dateRestrictionMsg');
    
    // Update date restriction message
    dateRestrictionMsg.textContent = `Date must be within the selected month (${currentMonth})`;
    
    // Set date restrictions based on the current month
    const [year, month] = currentMonth.split('-');
    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(month), 0); // Last day of the month
    
    // Format dates for the date input min/max attributes
    const minDate = firstDay.toISOString().split('T')[0];
    const maxDate = lastDay.toISOString().split('T')[0];
    
    // Set min and max attributes to restrict date selection
    expenseDateInput.min = minDate;
    expenseDateInput.max = maxDate;
    
    // Set default date to the first day of the month if today is not in the selected month
    const today = new Date();
    if (today.getFullYear() === parseInt(year) && today.getMonth() === parseInt(month) - 1) {
        // Today is in the selected month, use today
        expenseDateInput.valueAsDate = today;
    } else {
        // Today is not in the selected month, use the middle of the selected month
        expenseDateInput.valueAsDate = new Date(parseInt(year), parseInt(month) - 1, Math.min(15, lastDay.getDate()));
    }
    
    // Event listener for form submission
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate that the date is within the selected month
        const selectedDate = new Date(expenseDateInput.value);
        const selectedMonth = selectedDate.getFullYear() + '-' + String(selectedDate.getMonth() + 1).padStart(2, '0');
        
        if (selectedMonth !== currentMonth) {
            showNotification('Please select a date within the current month', 'danger');
            return;
        }
        
        const formData = {
            category_id: expenseCategorySelect.value,
            amount: expenseAmountInput.value,
            description: expenseDescriptionInput.value,
            date: expenseDateInput.value,
            payment_method: expensePaymentMethodSelect.value
        };
        
        if (editExpenseId.value) {
            // Update existing expense
            formData.id = editExpenseId.value;
            await updateExpense(formData);
            // Reset form to add mode
            resetExpenseForm();
        } else {
            // Create new expense
            await createExpense(formData);
            expenseForm.reset();
            // Reset the date to the appropriate value for the current month
            if (today.getFullYear() === parseInt(year) && today.getMonth() === parseInt(month) - 1) {
                expenseDateInput.valueAsDate = today;
            } else {
                expenseDateInput.valueAsDate = new Date(parseInt(year), parseInt(month) - 1, Math.min(15, lastDay.getDate()));
            }
        }
    });
    
    // Function to reset the expense form to add mode
    function resetExpenseForm() {
        editExpenseId.value = '';
        expenseSubmitBtn.textContent = 'Add Expense';
        editExpenseControls.classList.add('d-none');
        expenseForm.reset();
        
        // Reset the date to the appropriate value for the current month
        if (today.getFullYear() === parseInt(year) && today.getMonth() === parseInt(month) - 1) {
            expenseDateInput.valueAsDate = today;
        } else {
            expenseDateInput.valueAsDate = new Date(parseInt(year), parseInt(month) - 1, Math.min(15, lastDay.getDate()));
        }
    }
    
    // Cancel edit button
    cancelExpenseEditBtn.addEventListener('click', resetExpenseForm);
    
    // Make the resetExpenseForm function available globally
    window.resetExpenseForm = resetExpenseForm;
}

async function createExpense(data) {
    try {
        await fetchData(API_ENDPOINTS.EXPENSES, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        // Show success notification
        const categoryName = categories.find(c => c.id === parseInt(data.category_id)).name;
        showNotification(`Expense of ₹${parseFloat(data.amount).toFixed(2)} added to "${categoryName}"`);
        
        await loadExpenses();
        
        // Update charts to reflect the new expense
        renderCharts();
    } catch (error) {
        showNotification('Failed to create expense', 'danger');
    }
}

async function updateExpense(data) {
    try {
        await fetchData(API_ENDPOINTS.EXPENSES, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        // Show success notification
        const categoryName = categories.find(c => c.id === parseInt(data.category_id)).name;
        showNotification(`Expense updated to ₹${parseFloat(data.amount).toFixed(2)} in "${categoryName}"`);
        
        await loadExpenses();
        
        // Update charts to reflect the updated expense
        renderCharts();
    } catch (error) {
        showNotification('Failed to update expense', 'danger');
    }
}

async function deleteExpense(id) {
    try {
        // Find the expense before deleting it
        const expense = expenses.find(e => e.id === parseInt(id));
        const amount = expense ? parseFloat(expense.amount).toFixed(2) : '0.00';
        const categoryName = expense ? expense.category_name : '';
        
        await fetchData(`${API_ENDPOINTS.EXPENSES}?id=${id}`, {
            method: 'DELETE'
        });
        
        if (categoryName) {
            showNotification(`Expense of ₹${amount} from "${categoryName}" has been deleted`);
        }
        
        await loadExpenses();
        
        // Update charts to reflect the deleted expense
        renderCharts();
    } catch (error) {
        showNotification('Failed to delete expense', 'danger');
    }
}

// UI Rendering
function renderCharts() {
    const budgetChartCanvas = document.getElementById('budgetChart');
    const expenseChartCanvas = document.getElementById('expenseChart');
    
    // Destroy existing charts if they exist
    if (budgetChartInstance) {
        budgetChartInstance.destroy();
    }
    
    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }
    
    // Prepare data for budget chart
    const budgetData = categories.map(category => {
        const budget = budgets.find(b => parseInt(b.category_id) === parseInt(category.id));
        return budget ? parseFloat(budget.amount) : 0;
    });
    
    // Prepare data for expense chart
    const expenseData = categories.map(category => {
        return expenses
            .filter(e => parseInt(e.category_id) === parseInt(category.id))
            .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    });
    
    // Budget vs Actual Chart
    budgetChartInstance = new Chart(budgetChartCanvas, {
        type: 'bar',
        data: {
            labels: categories.map(c => c.name),
            datasets: [
                {
                    label: 'Budget',
                    data: budgetData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Actual',
                    data: expenseData,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Budget vs. Actual Expenses',
                    color: '#ffffff',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });

    // Expense Distribution Chart
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    expenseChartInstance = new Chart(expenseChartCanvas, {
        type: 'doughnut',
        data: {
            labels: categories.map(c => c.name),
            datasets: [{
                data: expenseData,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                    'rgba(255, 159, 64, 0.5)',
                    'rgba(199, 199, 199, 0.5)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(199, 199, 199, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 12
                        },
                        boxWidth: 15
                    }
                },
                title: {
                    display: true,
                    text: 'Expense Distribution',
                    color: '#ffffff',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0;
                            return `${context.label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Add this function to show notifications
function showNotification(message, type = 'success') {
    // Clear any existing notification
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    
    // Remove existing notification
    const existingNotification = document.getElementById('notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = `alert alert-${type}`;
    notification.innerHTML = message;
    
    // Add to notification container
    const container = document.getElementById('notificationContainer');
    container.appendChild(notification);
    
    // Auto-hide after 3 seconds
    notificationTimeout = setTimeout(() => {
        notification.remove();
        notificationTimeout = null;
    }, 3000);
}

// Function to ensure all categories have budgets for the current month
async function ensureAllCategoriesBudgets() {
    try {
        // For each category, check if it has a budget for the current month
        for (const category of categories) {
            const hasBudget = budgets.some(b => 
                parseInt(b.category_id) === parseInt(category.id) && 
                b.month === currentMonth
            );
            
            // If no budget exists for this category in the current month, create one with amount 0
            if (!hasBudget) {
                console.log(`Creating default budget for "${category.name}" category for month ${currentMonth}`);
                await createBudget(category.id, 0);
            }
        }
        
        // Show notification
        showNotification(`Default budgets created for all categories without budgets`, 'info');
    } catch (error) {
        console.error('Failed to ensure all categories have budgets:', error);
    }
}

// Function to ensure the Others category has a default budget
async function ensureOthersCategoryBudget() {
    try {
        // Check if Others category (ID 1) has a budget for the current month
        const othersBudget = budgets.find(b => 
            parseInt(b.category_id) === 1 && 
            b.month === currentMonth
        );
        
        // If no budget exists for Others category in the current month, create one with amount 0
        if (!othersBudget) {
            console.log(`Creating default budget for Others category for month ${currentMonth}`);
            await createBudget(1, 0);
            
            // Show notification
            showNotification(`Default ₹0.00 budget created for "Others" category`, 'info');
        }
    } catch (error) {
        console.error('Failed to ensure Others category budget:', error);
    }
}

// Initialize application
async function initApp() {
    try {
        // Check if API endpoints are accessible
        try {
            // First, try to load categories as a basic connectivity test
            await loadCategories();
        } catch (error) {
            console.error('Failed to load categories:', error);
            showNotification('Failed to connect to the server. Please check your database connection.', 'danger');
            throw new Error('API connectivity issue');
        }
        
        // Load other data
        try {
            await loadBudgets();
            
            // Ensure Others category has a default budget
            await ensureOthersCategoryBudget();
        } catch (error) {
            console.error('Failed to load budgets:', error);
            // Continue initialization even if budgets fail to load
        }
        
        try {
            await loadExpenses();
        } catch (error) {
            console.error('Failed to load expenses:', error);
            // Continue initialization even if expenses fail to load
        }
        
        // Setup expense form
        setupExpenseForm();
        
        // Setup month selector
        initializeMonthSelector();
        
        // Show success message
        showNotification('Application initialized successfully', 'success');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Use the notification system instead of alert
        showNotification('Failed to initialize the application. Please check the console for details.', 'danger');
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initApp); 
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Budget Tracker</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Custom CSS -->
    <link href="css/style.css" rel="stylesheet">
</head>
<body class="bg-dark text-white">
    <div class="container py-4">
        <!-- Header without month selector -->
        <header class="text-center mb-5">
            <h1>Budget Tracker</h1>
        </header>

        <div class="row g-4">
            <!-- Category Manager -->
            <div class="col-md-6">
                <div class="card bg-dark-glass">
                    <div class="card-body">
                        <h2 class="card-title">Categories</h2>
                        <div id="categoryManager">
                            <!-- Category Form -->
                            <form id="categoryForm" class="mb-4">
                                <div class="input-group">
                                    <input type="text" class="form-control" id="categoryNameInput" placeholder="Category name" required>
                                    <input type="hidden" id="editCategoryId" value="">
                                    <button type="submit" class="btn btn-primary" id="categorySubmitBtn">Add</button>
                                    <button type="button" class="btn btn-secondary d-none" id="cancelEditBtn">Cancel</button>
                                </div>
                            </form>
                            <!-- Category List will be populated by JavaScript -->
                            <div class="list-group" id="categoryList"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Budget Manager -->
            <div class="col-md-6">
                <div class="card bg-dark-glass">
                    <div class="card-body">
                        <h2 class="card-title">Budgets</h2>
                        <div id="budgetManager">
                            <!-- Budget Form -->
                            <form id="budgetForm" class="mb-4">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <select class="form-select" id="budgetCategorySelect" required>
                                            <option value="">Select category</option>
                                            <!-- Options will be populated by JavaScript -->
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <input type="number" class="form-control" id="budgetAmountInput" placeholder="Amount (default: 0)" step="0.01" min="0">
                                        <input type="hidden" id="editBudgetId" value="">
                                    </div>
                                    <div class="col-md-2">
                                        <button type="submit" class="btn btn-primary w-100" id="budgetSubmitBtn">Set</button>
                                    </div>
                                </div>
                                <div class="row mt-2 d-none" id="editBudgetControls">
                                    <div class="col-12 text-end">
                                        <button type="button" class="btn btn-secondary" id="cancelBudgetEditBtn">Cancel Edit</button>
                                    </div>
                                </div>
                            </form>
                            <!-- Budget List will be populated by JavaScript -->
                            <div class="list-group" id="budgetList"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Expense Form -->
            <div class="col-md-6">
                <div class="card bg-dark-glass">
                    <div class="card-body">
                        <h2 class="card-title">Add Expense</h2>
                        <div id="expenseFormContainer">
                            <form id="expenseForm">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <select class="form-select" id="expenseCategorySelect" required>
                                            <option value="">Select category</option>
                                            <!-- Options will be populated by JavaScript -->
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <input type="number" class="form-control" id="expenseAmountInput" placeholder="Amount" step="0.01" min="0" required>
                                    </div>
                                    <div class="col-md-12">
                                        <input type="text" class="form-control" id="expenseDescriptionInput" placeholder="Description" required>
                                    </div>
                                    <div class="col-md-6">
                                        <input type="date" class="form-control" id="expenseDateInput" required>
                                        <small class="text-warning" id="dateRestrictionMsg">Date must be within the selected month</small>
                                    </div>
                                    <div class="col-md-6">
                                        <select class="form-select" id="expensePaymentMethodSelect" required>
                                            <option value="">Payment method</option>
                                            <option value="cash">Cash</option>
                                            <option value="online">Online</option>
                                            <option value="credit_card">Credit Card</option>
                                            <option value="debit_card">Debit Card</option>
                                        </select>
                                    </div>
                                    <input type="hidden" id="editExpenseId" value="">
                                    <div class="col-12">
                                        <button type="submit" class="btn btn-primary w-100" id="expenseSubmitBtn">Add Expense</button>
                                    </div>
                                </div>
                                <div class="row mt-2 d-none" id="editExpenseControls">
                                    <div class="col-12 text-end">
                                        <button type="button" class="btn btn-secondary" id="cancelExpenseEditBtn">Cancel Edit</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Expense List -->
            <div class="col-md-6">
                <div class="card bg-dark-glass">
                    <div class="card-body">
                        <h2 class="card-title">Expense History</h2>
                        <div id="expenseList">
                            <!-- Expenses will be populated by JavaScript -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts -->
            <div class="col-12">
                <div class="card bg-dark-glass">
                    <div class="card-body">
                        <h2 class="card-title">Analytics</h2>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="chart-container" style="position: relative; height: 300px; margin-bottom: 20px;">
                                    <canvas id="budgetChart"></canvas>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="chart-container" style="position: relative; height: 300px; margin-bottom: 20px;">
                                    <canvas id="expenseChart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Notification Container -->
    <div id="notificationContainer" class="position-fixed top-0 start-50 translate-middle-x mt-3" style="z-index: 1050;"></div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Custom JS -->
    <script src="js/app.js" type="module"></script>
</body>
</html> 
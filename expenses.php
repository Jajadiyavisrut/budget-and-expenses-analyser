<?php
require_once 'BaseAPI.php';

class ExpensesAPI extends BaseAPI {
    public function handleRequest() {
        switch ($this->method) {
            case 'GET':
                $this->getExpenses();
                break;
            case 'POST':
                $this->createExpense();
                break;
            case 'PUT':
                $this->updateExpense();
                break;
            case 'DELETE':
                $this->deleteExpense();
                break;
            default:
                $this->sendError('Method not allowed', 405);
        }
    }

    private function getExpenses() {
        $month = isset($_GET['month']) ? $this->sanitizeString($_GET['month']) : date('Y-m');
        
        try {
            $stmt = $this->pdo->prepare('
                SELECT e.*, c.name as category_name 
                FROM expenses e 
                JOIN categories c ON e.category_id = c.id 
                WHERE DATE_FORMAT(e.date, "%Y-%m") = ?
                ORDER BY e.date DESC, e.id DESC
            ');
            $stmt->execute([$month]);
            $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format dates for display
            foreach ($expenses as &$expense) {
                $expense['date'] = date('Y-m-d', strtotime($expense['date']));
            }
            
            $this->sendResponse($expenses);
        } catch (PDOException $e) {
            $this->sendError('Failed to fetch expenses', 500);
        }
    }

    private function createExpense() {
        $this->validateRequired($this->data, ['category_id', 'amount', 'description', 'date', 'payment_method']);
        
        $categoryId = $this->sanitizeNumber($this->data['category_id']);
        $amount = $this->sanitizeNumber($this->data['amount']);
        $description = $this->sanitizeString($this->data['description']);
        $date = $this->sanitizeString($this->data['date']);
        $paymentMethod = $this->sanitizeString($this->data['payment_method']);

        // Validate date format
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $this->sendError('Invalid date format. Use YYYY-MM-DD');
        }

        // Validate payment method
        $validPaymentMethods = ['cash', 'online', 'credit_card', 'debit_card'];
        if (!in_array($paymentMethod, $validPaymentMethods)) {
            $this->sendError('Invalid payment method');
        }

        try {
            $stmt = $this->pdo->prepare('
                INSERT INTO expenses (category_id, amount, description, date, payment_method) 
                VALUES (?, ?, ?, ?, ?)
            ');
            $stmt->execute([$categoryId, $amount, $description, $date, $paymentMethod]);
            
            $this->sendResponse([
                'id' => $this->pdo->lastInsertId(),
                'category_id' => $categoryId,
                'amount' => $amount,
                'description' => $description,
                'date' => $date,
                'payment_method' => $paymentMethod
            ], 201);
        } catch (PDOException $e) {
            $this->sendError('Failed to create expense', 500);
        }
    }

    private function updateExpense() {
        $this->validateRequired($this->data, ['id', 'category_id', 'amount', 'description', 'date', 'payment_method']);
        
        $id = $this->sanitizeNumber($this->data['id']);
        $categoryId = $this->sanitizeNumber($this->data['category_id']);
        $amount = $this->sanitizeNumber($this->data['amount']);
        $description = $this->sanitizeString($this->data['description']);
        $date = $this->sanitizeString($this->data['date']);
        $paymentMethod = $this->sanitizeString($this->data['payment_method']);

        // Validate date format
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $this->sendError('Invalid date format. Use YYYY-MM-DD');
        }

        // Validate payment method
        $validPaymentMethods = ['cash', 'online', 'credit_card', 'debit_card'];
        if (!in_array($paymentMethod, $validPaymentMethods)) {
            $this->sendError('Invalid payment method');
        }

        try {
            $stmt = $this->pdo->prepare('
                UPDATE expenses 
                SET category_id = ?, amount = ?, description = ?, date = ?, payment_method = ?
                WHERE id = ?
            ');
            $stmt->execute([$categoryId, $amount, $description, $date, $paymentMethod, $id]);
            
            if ($stmt->rowCount() === 0) {
                $this->sendError('Expense not found', 404);
            }
            
            $this->sendResponse([
                'id' => $id,
                'category_id' => $categoryId,
                'amount' => $amount,
                'description' => $description,
                'date' => $date,
                'payment_method' => $paymentMethod
            ]);
        } catch (PDOException $e) {
            $this->sendError('Failed to update expense', 500);
        }
    }

    private function deleteExpense() {
        $id = isset($_GET['id']) ? $this->sanitizeNumber($_GET['id']) : null;
        if (!$id) {
            $this->sendError('Expense ID is required');
        }

        try {
            $stmt = $this->pdo->prepare('DELETE FROM expenses WHERE id = ?');
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() === 0) {
                $this->sendError('Expense not found', 404);
            }
            
            $this->sendResponse(['message' => 'Expense deleted successfully']);
        } catch (PDOException $e) {
            $this->sendError('Failed to delete expense', 500);
        }
    }
}

$api = new ExpensesAPI();
$api->handleRequest(); 
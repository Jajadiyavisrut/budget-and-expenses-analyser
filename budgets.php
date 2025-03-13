<?php
require_once 'BaseAPI.php';

class BudgetsAPI extends BaseAPI {
    public function handleRequest() {
        switch ($this->method) {
            case 'GET':
                $this->getBudgets();
                break;
            case 'POST':
                $this->createBudget();
                break;
            case 'PUT':
                $this->updateBudget();
                break;
            case 'DELETE':
                $this->deleteBudget();
                break;
            default:
                $this->sendError('Method not allowed', 405);
        }
    }

    private function getBudgets() {
        $month = isset($_GET['month']) ? $this->sanitizeString($_GET['month']) : date('Y-m');
        
        try {
            $stmt = $this->pdo->prepare('
                SELECT b.*, c.name as category_name 
                FROM budgets b 
                JOIN categories c ON b.category_id = c.id 
                WHERE b.month = ?
                ORDER BY c.name
            ');
            $stmt->execute([$month]);
            $budgets = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->sendResponse($budgets);
        } catch (PDOException $e) {
            $this->sendError('Failed to fetch budgets', 500);
        }
    }

    private function createBudget() {
        $this->validateRequired($this->data, ['category_id', 'month']);
        
        $categoryId = $this->sanitizeNumber($this->data['category_id']);
        // Default to zero if amount is not provided or empty
        $amount = isset($this->data['amount']) ? $this->sanitizeNumber($this->data['amount']) : 0;
        $month = $this->sanitizeString($this->data['month']);

        // Validate month format (YYYY-MM)
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            $this->sendError('Invalid month format. Use YYYY-MM');
        }

        try {
            // Check if budget already exists for this category and month
            $stmt = $this->pdo->prepare('SELECT id FROM budgets WHERE category_id = ? AND month = ?');
            $stmt->execute([$categoryId, $month]);
            
            if ($stmt->fetch()) {
                $this->sendError('Budget already exists for this category and month');
            }

            $stmt = $this->pdo->prepare('INSERT INTO budgets (category_id, amount, month) VALUES (?, ?, ?)');
            $stmt->execute([$categoryId, $amount, $month]);
            
            $this->sendResponse([
                'id' => $this->pdo->lastInsertId(),
                'category_id' => $categoryId,
                'amount' => $amount,
                'month' => $month
            ], 201);
        } catch (PDOException $e) {
            $this->sendError('Failed to create budget', 500);
        }
    }

    private function updateBudget() {
        $this->validateRequired($this->data, ['id']);
        
        $id = $this->sanitizeNumber($this->data['id']);
        // Default to zero if amount is not provided or empty
        $amount = isset($this->data['amount']) ? $this->sanitizeNumber($this->data['amount']) : 0;

        try {
            $stmt = $this->pdo->prepare('UPDATE budgets SET amount = ? WHERE id = ?');
            $stmt->execute([$amount, $id]);
            
            if ($stmt->rowCount() === 0) {
                $this->sendError('Budget not found', 404);
            }
            
            $this->sendResponse(['id' => $id, 'amount' => $amount]);
        } catch (PDOException $e) {
            $this->sendError('Failed to update budget', 500);
        }
    }

    private function deleteBudget() {
        $id = isset($_GET['id']) ? $this->sanitizeNumber($_GET['id']) : null;
        if (!$id) {
            $this->sendError('Budget ID is required');
        }

        try {
            $stmt = $this->pdo->prepare('DELETE FROM budgets WHERE id = ?');
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() === 0) {
                $this->sendError('Budget not found', 404);
            }
            
            $this->sendResponse(['message' => 'Budget deleted successfully']);
        } catch (PDOException $e) {
            $this->sendError('Failed to delete budget', 500);
        }
    }
}

$api = new BudgetsAPI();
$api->handleRequest(); 
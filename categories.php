<?php
require_once 'BaseAPI.php';

class CategoriesAPI extends BaseAPI {
    public function handleRequest() {
        switch ($this->method) {
            case 'GET':
                $this->getCategories();
                break;
            case 'POST':
                $this->createCategory();
                break;
            case 'PUT':
                $this->updateCategory();
                break;
            case 'DELETE':
                $this->deleteCategory();
                break;
            default:
                $this->sendError('Method not allowed', 405);
        }
    }

    private function getCategories() {
        try {
            $stmt = $this->pdo->query('SELECT * FROM categories ORDER BY name');
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->sendResponse($categories);
        } catch (PDOException $e) {
            $this->sendError('Failed to fetch categories', 500);
        }
    }

    private function createCategory() {
        $this->validateRequired($this->data, ['name']);
        
        // Check if maximum categories limit reached (excluding "Others")
        $stmt = $this->pdo->query('SELECT COUNT(*) FROM categories WHERE id != 1');
        if ($stmt->fetchColumn() >= 6) {
            $this->sendError('Maximum number of categories (6) reached');
        }

        $name = $this->sanitizeString($this->data['name']);
        
        try {
            $stmt = $this->pdo->prepare('INSERT INTO categories (name) VALUES (?)');
            $stmt->execute([$name]);
            $this->sendResponse([
                'id' => $this->pdo->lastInsertId(),
                'name' => $name
            ], 201);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) { // Duplicate entry
                $this->sendError('Category already exists');
            }
            $this->sendError('Failed to create category', 500);
        }
    }

    private function updateCategory() {
        $this->validateRequired($this->data, ['id', 'name']);
        
        $id = $this->sanitizeNumber($this->data['id']);
        $name = $this->sanitizeString($this->data['name']);

        // Prevent updating "Others" category
        if ($id == 1) {
            $this->sendError('Cannot modify "Others" category');
        }

        try {
            $stmt = $this->pdo->prepare('UPDATE categories SET name = ? WHERE id = ?');
            $stmt->execute([$name, $id]);
            
            if ($stmt->rowCount() === 0) {
                $this->sendError('Category not found', 404);
            }
            
            $this->sendResponse(['id' => $id, 'name' => $name]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                $this->sendError('Category name already exists');
            }
            $this->sendError('Failed to update category', 500);
        }
    }

    private function deleteCategory() {
        $id = isset($_GET['id']) ? $this->sanitizeNumber($_GET['id']) : null;
        if (!$id) {
            $this->sendError('Category ID is required');
        }

        // Prevent deleting "Others" category
        if ($id == 1) {
            $this->sendError('Cannot delete "Others" category');
        }

        try {
            // Start a transaction to ensure all operations succeed or fail together
            $this->pdo->beginTransaction();
            
            // First, delete related expenses
            $expStmt = $this->pdo->prepare('DELETE FROM expenses WHERE category_id = ?');
            $expStmt->execute([$id]);
            $deletedExpenses = $expStmt->rowCount();
            
            // Then, delete related budgets
            $budgetStmt = $this->pdo->prepare('DELETE FROM budgets WHERE category_id = ?');
            $budgetStmt->execute([$id]);
            $deletedBudgets = $budgetStmt->rowCount();
            
            // Finally, delete the category
            $catStmt = $this->pdo->prepare('DELETE FROM categories WHERE id = ?');
            $catStmt->execute([$id]);
            
            if ($catStmt->rowCount() === 0) {
                // Roll back if category not found
                $this->pdo->rollBack();
                $this->sendError('Category not found', 404);
            }
            
            // Commit the transaction
            $this->pdo->commit();
            
            $this->sendResponse([
                'message' => 'Category deleted successfully',
                'deleted_data' => [
                    'expenses' => $deletedExpenses,
                    'budgets' => $deletedBudgets
                ]
            ]);
        } catch (PDOException $e) {
            // Roll back on error
            $this->pdo->rollBack();
            $this->sendError('Failed to delete category: ' . $e->getMessage(), 500);
        }
    }
}

$api = new CategoriesAPI();
$api->handleRequest(); 
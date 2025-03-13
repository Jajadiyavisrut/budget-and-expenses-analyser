<?php
class BaseAPI {
    protected $pdo;
    protected $method;
    protected $data;

    public function __construct() {
        require_once '../config/database.php';
        $this->pdo = $pdo;
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->data = $this->getRequestData();
    }

    protected function getRequestData() {
        if ($this->method === 'GET') {
            return $_GET;
        }
        
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        return $data ?? [];
    }

    protected function sendResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    protected function sendError($message, $statusCode = 400) {
        $this->sendResponse(['error' => $message], $statusCode);
    }

    protected function validateRequired($data, $fields) {
        foreach ($fields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $this->sendError("Missing required field: {$field}");
            }
        }
    }

    protected function sanitizeString($str) {
        return htmlspecialchars(strip_tags(trim($str)));
    }

    protected function sanitizeNumber($num) {
        return filter_var($num, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
    }
} 
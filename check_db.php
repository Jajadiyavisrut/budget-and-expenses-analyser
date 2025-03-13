<?php
// Database connection parameters
$host = 'localhost';
$user = 'root';
$pass = '';
$dbname = 'finance_manager';

// Function to output JSON response
function outputJson($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

try {
    // First try to connect to MySQL server without specifying a database
    $pdo = new PDO(
        "mysql:host=$host",
        $user,
        $pass,
        array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
    );
    
    // Check if database exists
    $stmt = $pdo->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$dbname'");
    $dbExists = $stmt->fetch();
    
    if (!$dbExists) {
        // Database doesn't exist, create it
        $pdo->exec("CREATE DATABASE IF NOT EXISTS $dbname");
        outputJson(['status' => 'success', 'message' => "Database '$dbname' created successfully"]);
    } else {
        // Database exists, check if we can connect to it
        try {
            $dbPdo = new PDO(
                "mysql:host=$host;dbname=$dbname",
                $user,
                $pass,
                array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
            );
            
            // Check if tables exist
            $stmt = $dbPdo->query("SHOW TABLES");
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            if (empty($tables)) {
                // No tables, we need to run the init script
                $initSql = file_get_contents('config/init.sql');
                $dbPdo->exec($initSql);
                outputJson(['status' => 'success', 'message' => "Database tables created successfully"]);
            } else {
                // Everything is fine
                outputJson(['status' => 'success', 'message' => "Database connection successful", 'tables' => $tables]);
            }
        } catch (PDOException $e) {
            outputJson(['status' => 'error', 'message' => "Failed to connect to database: " . $e->getMessage()], 500);
        }
    }
} catch (PDOException $e) {
    outputJson(['status' => 'error', 'message' => "Failed to connect to MySQL server: " . $e->getMessage()], 500);
}
?> 
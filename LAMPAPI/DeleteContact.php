<?php
    // Enable error reporting for debugging
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
    ini_set('error_log', '/tmp/php_errors.log');

    $origin = 'http://rickleinecker2025.me'; 
	header('Access-Control-Allow-Origin: ' . $origin);
	header('Vary: Origin'); 
	header('Access-Control-Allow-Methods: POST, OPTIONS');

	if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
		header('Access-Control-Allow-Headers: ' . $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']);
	} else {
		header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Authorization');
	}
	header('Content-Type: application/json');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    try {
        $inData = getRequestInfo();

        // Validate input data
        if (!isset($inData['userId']) || !isset($inData['contactId'])) {
            error_log("DeleteContact.php: Missing fields - userId: " . (isset($inData['userId']) ? 'set' : 'missing') . ", contactId: " . (isset($inData['contactId']) ? 'set' : 'missing'));
            returnWithError("Missing required fields: userId and contactId", 400);
            exit();
        }

        $userId    = intval($inData['userId']);
        $contactId = intval($inData['contactId']);

        if ($userId <= 0 || $contactId <= 0) {
            error_log("DeleteContact.php: Invalid userId ($userId) or contactId ($contactId)");
            returnWithError("Invalid userId or contactId", 400);
            exit();
        }

        $conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "COP4331");
        if ($conn->connect_error) {
            error_log("DeleteContact.php: DB connection failed: " . $conn->connect_error);
            returnWithError("Database connection failed: " . $conn->connect_error, 500);
            exit();
        }
        $conn->set_charset("utf8mb4");
        $conn->begin_transaction();

        // Ensure the contact exists
        $chk = $conn->prepare("SELECT ID FROM Contacts WHERE ID = ? AND UserID = ? LIMIT 1");
        if (!$chk) {
            error_log("DeleteContact.php: Prepare (check) failed: " . $conn->error);
            returnWithError("Database prepare failed: " . $conn->error, 500);
            $conn->close();
            exit();
        }
        $chk->bind_param("ii", $contactId, $userId);
        if (!$chk->execute()) {
            error_log("DeleteContact.php: Execute (check) failed: " . $chk->error);
            returnWithError("Database execute failed: " . $chk->error, 500);
            $chk->close();
            $conn->close();
            exit();
        }
        $res = $chk->get_result();
        if (!$res || $res->num_rows === 0) {
            $chk->close();
            $conn->rollback();
            $conn->close();
            error_log("DeleteContact.php: Contact not found or not owned by user. contactId=$contactId userId=$userId");
            returnWithError("Contact not found", 404);
            exit();
        }
        $chk->close();

        // Delete
        $del = $conn->prepare("DELETE FROM Contacts WHERE ID = ? AND UserID = ? LIMIT 1");
        if (!$del) {
            error_log("DeleteContact.php: Prepare (delete) failed: " . $conn->error);
            returnWithError("Database prepare failed: " . $conn->error, 500);
            $conn->close();
            exit();
        }
        $del->bind_param("ii", $contactId, $userId);
        if (!$del->execute()) {
            error_log("DeleteContact.php: Execute (delete) failed: " . $del->error);
            returnWithError("Database execute failed: " . $del->error, 500);
            $del->close();
            $conn->close();
            exit();
        }

        $affected = $del->affected_rows;
        $del->close();

        if ($affected < 1) {
            $conn->rollback();
            $conn->close();
            error_log("DeleteContact.php: No rows deleted. contactId=$contactId userId=$userId");
            returnWithError("Delete failed", 500);
            exit();
        }

        $conn->commit();
        $conn->close();

        error_log("DeleteContact.php: Deleted contactId=$contactId for userId=$userId");
        returnWithSuccess($contactId);

    } catch (Exception $e) {
        error_log("DeleteContact.php: Unexpected error: " . $e->getMessage());
        returnWithError("Unexpected server error: " . $e->getMessage(), 500);
    } catch (Error $e) {
        error_log("DeleteContact.php: Fatal error: " . $e->getMessage());
        returnWithError("Fatal server error: " . $e->getMessage(), 500);
    }

    // ---- Helpers ----
    function getRequestInfo()
    {
        $raw = file_get_contents('php://input');
        if ($raw === false) {
            throw new Exception("Failed to read request data");
        }
        $decoded = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON data: " . json_last_error_msg());
        }
        return $decoded;
    }

    function sendResultInfoAsJson($obj)
    {
        echo $obj;
    }

    function returnWithError($err, $httpCode = 500)
    {
        http_response_code($httpCode);
        $retValue = json_encode([
            "success"   => false,
            "deletedId" => 0,
            "error"     => $err
        ]);
        sendResultInfoAsJson($retValue);
    }

    function returnWithSuccess($deletedId)
    {
        http_response_code(200);
        $retValue = json_encode([
            "success"   => true,
            "deletedId" => intval($deletedId),
            "error"     => ""
        ]);
        sendResultInfoAsJson($retValue);
    }
?>

<?php
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);

    // ---- CORS ----
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

    // Handle preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit();
    }

    // ---- Helpers ----
    function getRequestInfo() {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    function sendResultInfoAsJson($obj) {
        header('Content-type: application/json');
        echo $obj;
    }

    function returnWithError($err, $code = 400) {
        http_response_code($code);
        $retValue = json_encode([
            "id"        => 0,
            "userId"    => 0,
            "firstName" => "",
            "lastName"  => "",
            "phone"     => "",
            "email"     => "",
            "error"     => $err
        ]);
        sendResultInfoAsJson($retValue);
    }

    function returnWithInfo($id, $userId, $firstName, $lastName, $phone, $email) {
        $retValue = json_encode([
            "id"        => intval($id),
            "userId"    => intval($userId),
            "firstName" => $firstName,
            "lastName"  => $lastName,
            "phone"     => $phone,
            "email"     => $email,
            "error"     => ""
        ]);
        sendResultInfoAsJson($retValue);
    }

    // ---- Input ----
    $inData    = getRequestInfo();

    // Required to identify the record
    $id     = isset($inData["id"]) ? intval($inData["id"]) : 0;
    $userId = isset($inData["userId"]) ? intval($inData["userId"]) : 0;

    // Optional fields to update (only non-empty strings will be updated)
    $firstName = array_key_exists("firstName", $inData) ? trim($inData["firstName"] ?? "") : null;
    $lastName  = array_key_exists("lastName",  $inData) ? trim($inData["lastName"]  ?? "") : null;
    $phone     = array_key_exists("phone",     $inData) ? trim($inData["phone"]     ?? "") : null;
    $email     = array_key_exists("email",     $inData) ? trim($inData["email"]     ?? "") : null;

    if ($id <= 0 || $userId <= 0) {
        returnWithError("Missing required field(s): id, userId");
        exit;
    }

    // Must provide at least one field to update
    if ($firstName === null && $lastName === null && $phone === null && $email === null) {
        returnWithError("Provide at least one of: firstName, lastName, phone, email");
        exit;
    }

    if ($email !== null && $email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        returnWithError("Invalid email format");
        exit;
    }

    // ---- DB ----
    $conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "COP4331");
    if ($conn->connect_error) {
        returnWithError($conn->connect_error, 500);
        exit;
    }

    $conn->begin_transaction();

    try {
        // 1) Ensure the contact exists and belongs to the user
        $find = $conn->prepare("SELECT ID, UserID, FirstName, LastName, Phone, Email FROM Contacts WHERE ID = ? AND UserID = ? LIMIT 1");
        $find->bind_param("ii", $id, $userId);
        $find->execute();
        $res = $find->get_result();

        if (!$res || $res->num_rows === 0) {
            $find->close();
            $conn->rollback();
            $conn->close();
            returnWithError("Contact not found for this user", 404);
            exit;
        }

        $current = $res->fetch_assoc();
        $find->close();

        // Values after update
        $newFirst = ($firstName !== null && $firstName !== "") ? $firstName : $current["FirstName"];
        $newLast  = ($lastName  !== null && $lastName  !== "") ? $lastName  : $current["LastName"];
        $newPhone = ($phone     !== null) ? $phone : $current["Phone"];
        $newEmail = ($email     !== null) ? $email : $current["Email"];   

        // 2) Duplicate guard:
        $dupSql = "
            SELECT ID
            FROM Contacts
            WHERE UserID = ?
              AND FirstName = ?
              AND LastName  = ?
              AND ID <> ?
              AND (
                    (? <> '' AND Email = ?) 
                 OR (? <> '' AND Phone = ?)
              )
            LIMIT 1
        ";
        $dup = $conn->prepare($dupSql);
        $dup->bind_param(
            "ississss",
            $userId, $newFirst, $newLast, $id,
            $newEmail, $newEmail,
            $newPhone, $newPhone
        );
        $dup->execute();
        $dupRes = $dup->get_result();
        if ($dupRes && $dupRes->num_rows > 0) {
            $dup->close();
            $conn->rollback();
            $conn->close();
            returnWithError("Another contact with the same name and email/phone already exists for this user");
            exit;
        }
        $dup->close();

        // 3) Perform update
        $stmt = $conn->prepare("
            UPDATE Contacts
            SET FirstName = ?, LastName = ?, Phone = ?, Email = ?
            WHERE ID = ? AND UserID = ?
            LIMIT 1
        ");
        $stmt->bind_param("ssssii", $newFirst, $newLast, $newPhone, $newEmail, $id, $userId);

        if (!$stmt->execute()) {
            $stmt->close();
            $conn->rollback();
            $conn->close();
            returnWithError("Failed to update contact", 500);
            exit;
        }
        $stmt->close();

        // 4) Commit and return updated record
        $conn->commit();
        $conn->close();

        returnWithInfo($id, $userId, $newFirst, $newLast, $newPhone, $newEmail);

    } catch (Throwable $e) {
        $conn->rollback();
        $conn->close();
        returnWithError("Server error: " . $e->getMessage(), 500);
    }
?>

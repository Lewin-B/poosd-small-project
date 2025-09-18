<?php
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);

    $origin = 'http://rickleinecker2025.me'; // be explicit if you can
	header('Access-Control-Allow-Origin: ' . $origin);
	header('Vary: Origin'); // helps caching proxies
	header('Access-Control-Allow-Methods: POST, OPTIONS');

	if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
		header('Access-Control-Allow-Headers: ' . $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']);
	} else {
		header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Authorization');
	}
	header('Content-Type: application/json');

    $inData = getRequestInfo();

    // ---- Inputs ----
    $userId    = isset($inData["userId"]) ? intval($inData["userId"]) : 0;
    $firstName = trim($inData["firstName"] ?? "");
    $lastName  = trim($inData["lastName"] ?? "");
    $phone     = trim($inData["phone"] ?? "");
    $email     = trim($inData["email"] ?? "");

    // Basic validation
    if ($userId <= 0 || $firstName === "" || $lastName === "") {
        returnWithError("Missing required field(s): userId, firstName, lastName");
        exit;
    }

    // Optional: simple email sanity check (non-fatal)
    if ($email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        returnWithError("Invalid email format");
        exit;
    }

    $conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "COP4331");
    if ($conn->connect_error) {
        returnWithError($conn->connect_error);
        exit;
    }

    // Use a transaction to be tidy (optional but nice)
    $conn->begin_transaction();

    try {
        // 1) Duplicate check (per user):
        //    Consider a contact duplicate if same first+last AND (same email OR same phone) for the same user.
        //    If you prefer a different rule, tweak the WHERE clause.
        $dupSql = "
            SELECT ID 
            FROM Contacts 
            WHERE UserID = ? 
              AND firstName = ? 
              AND lastName  = ?
              AND (
                    (? <> '' AND email = ?) 
                 OR (? <> '' AND phone = ?)
              )
            LIMIT 1
        ";
        $dup = $conn->prepare($dupSql);
        $dup->bind_param(
            "issssss",
            $userId, $firstName, $lastName,
            $email, $email,
            $phone, $phone
        );
        $dup->execute();
        $dupRes = $dup->get_result();

        if ($dupRes && $dupRes->num_rows > 0) {
            $dup->close();
            $conn->rollback();
            $conn->close();
            returnWithError("Contact already exists for this user");
            exit;
        }
        $dup->close();

        // 2) Insert new contact
        $stmt = $conn->prepare("
            INSERT INTO Contacts (UserID, FirstName, LastName, Phone, Email)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("issss", $userId, $firstName, $lastName, $phone, $email);

        if ($stmt->execute()) {
            $newId = $conn->insert_id;
            $conn->commit();
            returnWithInfo($newId, $userId, $firstName, $lastName, $phone, $email);
        } else {
            $conn->rollback();
            returnWithError("Failed to add contact");
        }

        $stmt->close();
        $conn->close();
    } catch (Throwable $e) {
        // Any unexpected error
        $conn->rollback();
        $conn->close();
        returnWithError("Server error: " . $e->getMessage());
    }

    function getRequestInfo()
    {
        return json_decode(file_get_contents('php://input'), true);
    }

    function sendResultInfoAsJson($obj)
    {
        header('Content-type: application/json');
        echo $obj;
    }

    function returnWithError($err)
    {
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

    function returnWithInfo($id, $userId, $firstName, $lastName, $phone, $email)
    {
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
?>

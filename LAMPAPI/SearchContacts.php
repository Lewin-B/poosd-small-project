<?php
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);

    // Set proper HTTP headers
	header('Content-Type: application/json');
	header('Access-Control-Allow-Origin: *');
	header('Access-Control-Allow-Methods: POST, OPTIONS');
	header('Access-Control-Allow-Headers: Content-Type');

    $inData = getRequestInfo();

    // ---- Inputs ----
    $userId    = isset($inData["userId"]) ? intval($inData["userId"]) : 0;
    $nameQuery = trim($inData["nameQuery"] ?? "");

    if ($userId <= 0) {
        returnWithError("Missing required field: userId");
        exit;
    }

    if ($nameQuery === "") {
        returnWithError("Missing required field: nameQuery");
        exit;
    }

    $conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "COP4331");
    if ($conn->connect_error) {
        returnWithError($conn->connect_error);
        exit;
    }

    try {
        // REGEXP is case-insensitive in MySQL by default (depends on collation).
        // This matches first or last names against the regex provided.
        $sql = "
            SELECT ID, UserID, FirstName, LastName, Phone, Email
            FROM Contacts
            WHERE UserID = ?
              AND (FirstName REGEXP ? OR LastName REGEXP ?)
            ORDER BY LastName ASC, FirstName ASC
            LIMIT 25
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iss", $userId, $nameQuery, $nameQuery);
        $stmt->execute();
        $result = $stmt->get_result();

        $contacts = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $contacts[] = [
                    "id"        => intval($row["ID"]),
                    "userId"    => intval($row["UserID"]),
                    "firstName" => $row["FirstName"] ?? "",
                    "lastName"  => $row["LastName"] ?? "",
                    "phone"     => $row["Phone"] ?? "",
                    "email"     => $row["Email"] ?? ""
                ];
            }
        }

        $stmt->close();
        $conn->close();

        returnWithResults($contacts);

    } catch (Throwable $e) {
        if ($conn && $conn->ping()) $conn->close();
        returnWithError("Server error: " . $e->getMessage());
    }

    // ---- Helpers ----
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
            "results" => [],
            "error"   => $err
        ]);
        sendResultInfoAsJson($retValue);
    }

    function returnWithResults($results)
    {
        $retValue = json_encode([
            "results" => $results,
            "error"   => ""
        ]);
        sendResultInfoAsJson($retValue);
    }
?>

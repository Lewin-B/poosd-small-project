<?php
    ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);

    // Set proper HTTP headers
	header('Content-Type: application/json');
	header('Access-Control-Allow-Origin: *');
	header('Access-Control-Allow-Methods: POST, OPTIONS');
	header('Access-Control-Allow-Headers: Content-Type');
    
	error_reporting(E_ALL);
    $inData = getRequestInfo();

    $firstName = trim($inData["firstName"] ?? "");
    $lastName  = trim($inData["lastName"] ?? "");
    $login     = trim($inData["username"] ?? "");
    $password  = $inData["password"] ?? "";

    // hashed passwords
    // $password = password_hash($password, PASSWORD_BCRYPT);

    if ($firstName === "" || $lastName === "" || $login === "" || $password === "") {
        returnWithError("Missing required field(s)");
        exit;
    }

    $conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "COP4331");
    if( $conn->connect_error )
    {
        returnWithError($conn->connect_error);
    }
    else
    {
        // 1) Check if login already exists
        $check = $conn->prepare("SELECT ID FROM Users WHERE Login=?");
        $check->bind_param("s", $login);
        $check->execute();
        $checkResult = $check->get_result();

        if ($checkResult && $checkResult->num_rows > 0) {
            $check->close();
            $conn->close();
            returnWithError("User already exists");
            exit;
        }
        $check->close();

        // 2) Insert new user
        $stmt = $conn->prepare("INSERT INTO Users (firstName, lastName, Login, Password) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $firstName, $lastName, $login, $password);

        if ($stmt->execute())
        {
            $newId = $conn->insert_id;
            returnWithInfo($firstName, $lastName, $newId);
        }
        else
        {
            returnWithError("Registration failed");
        }

        $stmt->close();
        $conn->close();
    }

    // ---------- Helpers (same style as your login file) ----------

    function getRequestInfo()
    {
        return json_decode(file_get_contents('php://input'), true);
    }

    function sendResultInfoAsJson( $obj )
    {
        header('Content-type: application/json');
        echo $obj;
    }

    function returnWithError( $err )
    {
        $retValue = '{"id":0,"firstName":"","lastName":"","error":"' . $err . '"}';
        sendResultInfoAsJson( $retValue );
    }

    function returnWithInfo( $firstName, $lastName, $id )
    {
        $retValue = '{"id":' . intval($id) . ',"firstName":"' . $firstName . '","lastName":"' . $lastName . '","error":""}';
        sendResultInfoAsJson( $retValue );
    }

?>

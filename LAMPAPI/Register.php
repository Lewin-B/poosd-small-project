<?php
    ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);

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

	error_reporting(E_ALL);
    $inData = getRequestInfo();

    $firstName = trim($inData["firstName"] ?? "");
    $lastName  = trim($inData["lastName"] ?? "");
    $login     = trim($inData["username"] ?? "");
    $password  = $inData["password"] ?? "";

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

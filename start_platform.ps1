# Start DocPlatform Frontend and Backend

# Function to check if a port is in use
function Test-PortInUse {
    param($port)
    $connection = New-Object System.Net.Sockets.TcpClient
    try {
        $connection.Connect("127.0.0.1", $port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Kill any existing processes on ports 3000 and 8000
Write-Host "Checking for existing processes..."
if (Test-PortInUse 3000) {
    Write-Host "Stopping process on port 3000..."
    Get-Process | Where-Object {$_.MainWindowTitle -like "*localhost:3000*"} | Stop-Process -Force
}
if (Test-PortInUse 8000) {
    Write-Host "Stopping process on port 8000..."
    Get-Process | Where-Object {$_.MainWindowTitle -like "*localhost:8000*"} | Stop-Process -Force
}

# Get the current directory
$currentDir = Get-Location

# Start the backend server
Write-Host "Starting Backend Server..."
$backendCmd = "cd '$currentDir\backend'; python start_server.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# Wait a moment for the backend to initialize
Start-Sleep -Seconds 2

# Start the frontend server
Write-Host "Starting Frontend Server..."
$frontendCmd = "cd '$currentDir\frontend'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host "Both servers are starting..."
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:3000"
Write-Host "API Docs: http://localhost:8000/docs" 
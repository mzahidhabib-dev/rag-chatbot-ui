$url = 'http://localhost:3000/api/rag/chat'
$body = @{ query = 'Hello'; sessionId = 'test-session-1' } | ConvertTo-Json

$request = [System.Net.HttpWebRequest]::Create($url)
$request.Method = 'POST'
$request.ContentType = 'application/json'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$request.ContentLength = $bytes.Length
$stream = $request.GetRequestStream()
$stream.Write($bytes, 0, $bytes.Length)
$stream.Close()

$response = $request.GetResponse()
$reader = New-Object System.IO.StreamReader($response.GetResponseStream())
while ($reader.Peek() -ge 0) {
    $line = $reader.ReadLine()
    Write-Host "LINE: $line"
}

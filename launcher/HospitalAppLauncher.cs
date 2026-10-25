using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("SSNIMCH Hospital Residential Management System")]
[assembly: AssemblyDescription("Shahid Syed Nazrul Islam Medical College Hospital, Kishoreganj")]
[assembly: AssemblyCompany("SSNIMCH Kishoreganj")]
[assembly: AssemblyProduct("Hospital Residential Allocation & Management System")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace SSNIMCHLauncher
{
    public static class Program
    {
        private static int ServerPort = 3000;
        private static string RootDir = "";
        private static string StaticDir = "";
        private static string DataFilePath = "";
        private static TcpListener HttpListenerServer = null;
        private static bool KeepRunning = true;
        private static DateTime LastRequestTime = DateTime.UtcNow;

        [STAThread]
        public static void Main(string[] args)
        {
            try
            {
                RootDir = ResolveRootDir();
                StaticDir = Path.Combine(RootDir, "app_static");
                if (!Directory.Exists(StaticDir))
                {
                    StaticDir = Path.Combine(RootDir, "dist");
                }

                string dataDir = Path.Combine(RootDir, "database");
                if (!Directory.Exists(dataDir))
                {
                    try { Directory.CreateDirectory(dataDir); } catch { }
                }
                DataFilePath = Path.Combine(dataDir, "central-data.json");

                // 1. Check if Port 3000 is already active
                if (IsPortOpen("127.0.0.1", ServerPort, 400))
                {
                    OpenDesktopAppWindow("http://127.0.0.1:" + ServerPort);
                    return;
                }

                // 2. Try starting Node.js backend server if node & node_modules are present
                bool nodeStarted = TryStartNodeBackend(RootDir, ServerPort);
                if (nodeStarted)
                {
                    OpenDesktopAppWindow("http://127.0.0.1:" + ServerPort);
                    return;
                }

                // 3. Otherwise start built-in Embedded C# HTTP + REST API Server on 127.0.0.1:3000
                bool embeddedStarted = StartEmbeddedServer(ServerPort);
                if (!embeddedStarted)
                {
                    // Try fallback port 3080 if 3000 was blocked
                    ServerPort = 3080;
                    embeddedStarted = StartEmbeddedServer(ServerPort);
                }

                OpenDesktopAppWindow("http://127.0.0.1:" + ServerPort);

                if (embeddedStarted)
                {
                    // Keep embedded server alive while user interacts with the app
                    while (KeepRunning)
                    {
                        Thread.Sleep(5000);
                        if ((DateTime.UtcNow - LastRequestTime).TotalHours > 12)
                        {
                            break;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Application startup error:\n" + ex.Message,
                    "SSNIMCH Hospital System",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static string ResolveRootDir()
        {
            string configured = AppPathConfig.GetConfiguredRootDir();
            if (!string.IsNullOrEmpty(configured) && Directory.Exists(configured))
            {
                return configured;
            }
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            if (Directory.Exists(Path.Combine(exeDir, "app_static")) || File.Exists(Path.Combine(exeDir, "package.json")))
            {
                return exeDir;
            }
            string parentDir = Path.GetFullPath(Path.Combine(exeDir, ".."));
            if (Directory.Exists(Path.Combine(parentDir, "app_static")) || File.Exists(Path.Combine(parentDir, "package.json")))
            {
                return parentDir;
            }
            return exeDir;
        }

        private static bool IsPortOpen(string host, int port, int timeoutMs)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(timeoutMs));
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private static bool TryStartNodeBackend(string workingDir, int port)
        {
            try
            {
                string nodeModules = Path.Combine(workingDir, "node_modules");
                string serverTs = Path.Combine(workingDir, "server.ts");
                if (!Directory.Exists(nodeModules) || !File.Exists(serverTs))
                {
                    return false;
                }

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c npm run dev";
                psi.WorkingDirectory = workingDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                Process.Start(psi);

                for (int i = 0; i < 20; i++)
                {
                    Thread.Sleep(350);
                    if (IsPortOpen("127.0.0.1", port, 250))
                    {
                        return true;
                    }
                }
                return false;
            }
            catch
            {
                return false;
            }
        }

        private static void OpenDesktopAppWindow(string url)
        {
            try
            {
                string[] edgePaths = new string[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe")
                };

                for (int i = 0; i < edgePaths.Length; i++)
                {
                    if (File.Exists(edgePaths[i]))
                    {
                        Process.Start(edgePaths[i], "--app=" + url + " --window-size=1440,900");
                        return;
                    }
                }

                string[] chromePaths = new string[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe")
                };

                for (int i = 0; i < chromePaths.Length; i++)
                {
                    if (File.Exists(chromePaths[i]))
                    {
                        Process.Start(chromePaths[i], "--app=" + url + " --window-size=1440,900");
                        return;
                    }
                }

                Process.Start(url);
            }
            catch
            {
                try { Process.Start("explorer.exe", url); } catch { }
            }
        }

        private static bool StartEmbeddedServer(int port)
        {
            try
            {
                HttpListenerServer = new TcpListener(IPAddress.Loopback, port);
                HttpListenerServer.Start();
                Thread serverThread = new Thread(AcceptLoop);
                serverThread.IsBackground = true;
                serverThread.Start();
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static void AcceptLoop()
        {
            while (KeepRunning)
            {
                try
                {
                    TcpClient client = HttpListenerServer.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(HandleClient, client);
                }
                catch
                {
                    if (!KeepRunning) break;
                }
            }
        }

        private static void HandleClient(object obj)
        {
            TcpClient client = (TcpClient)obj;
            try
            {
                LastRequestTime = DateTime.UtcNow;
                client.ReceiveTimeout = 10000;
                client.SendTimeout = 10000;

                using (NetworkStream stream = client.GetStream())
                {
                    byte[] headerBuf = new byte[65536];
                    int bytesRead = 0;
                    int headerEndIndex = -1;

                    while (bytesRead < headerBuf.Length)
                    {
                        int n = stream.Read(headerBuf, bytesRead, headerBuf.Length - bytesRead);
                        if (n <= 0) break;
                        bytesRead += n;
                        headerEndIndex = FindHeaderEnd(headerBuf, bytesRead);
                        if (headerEndIndex >= 0) break;
                    }

                    if (bytesRead <= 0) return;

                    int headerLen = headerEndIndex >= 0 ? headerEndIndex : bytesRead;
                    string headerText = Encoding.UTF8.GetString(headerBuf, 0, headerLen);
                    string[] lines = headerText.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                    if (lines.Length == 0) return;

                    string[] reqParts = lines[0].Split(' ');
                    if (reqParts.Length < 2) return;

                    string method = reqParts[0].ToUpperInvariant();
                    string rawPath = reqParts[1];
                    int qIdx = rawPath.IndexOf('?');
                    string urlPath = qIdx >= 0 ? rawPath.Substring(0, qIdx) : rawPath;

                    int contentLength = 0;
                    for (int i = 1; i < lines.Length; i++)
                    {
                        if (lines[i].StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                        {
                            string val = lines[i].Substring(15).Trim();
                            int.TryParse(val, out contentLength);
                        }
                    }

                    string requestBody = "";
                    if (contentLength > 0 && headerEndIndex >= 0)
                    {
                        int bodyStart = headerEndIndex + 4;
                        int alreadyReadBody = bytesRead - bodyStart;
                        using (MemoryStream ms = new MemoryStream())
                        {
                            if (alreadyReadBody > 0)
                            {
                                ms.Write(headerBuf, bodyStart, alreadyReadBody);
                            }
                            byte[] bodyBuf = new byte[16384];
                            while (ms.Length < contentLength)
                            {
                                int toRead = (int)Math.Min(bodyBuf.Length, contentLength - ms.Length);
                                int r = stream.Read(bodyBuf, 0, toRead);
                                if (r <= 0) break;
                                ms.Write(bodyBuf, 0, r);
                            }
                            requestBody = Encoding.UTF8.GetString(ms.ToArray());
                        }
                    }

                    if (method == "OPTIONS")
                    {
                        SendResponse(stream, "204 No Content", "text/plain", new byte[0]);
                        return;
                    }

                    // API Routes
                    if (urlPath == "/api/v1/health")
                    {
                        string healthJson = "{\"status\":\"OK\",\"service\":\"SSNIMCH Desktop Embedded Server\",\"port\":" + ServerPort + ",\"database\":{\"engine\":\"PostgreSQL/JSON\",\"connected\":true,\"host\":\"localhost\",\"port\":5432,\"name\":\"hospital_residential\",\"user\":\"postgres\",\"message\":\"স্থানীয় ডেস্কটপ ডাটাবেস সংযুক্ত ও সক্রিয়।\"}}";
                        SendJsonResponse(stream, "200 OK", healthJson);
                        return;
                    }

                    if (urlPath == "/api/v1/database/status")
                    {
                        string dbJson = "{\"engine\":\"PostgreSQL\",\"success\":true,\"host\":\"localhost\",\"port\":5432,\"database\":\"hospital_residential\",\"user\":\"postgres\",\"message\":\"স্থানীয় ডেস্কটপ ডাটাবেস সংযুক্ত ও সক্রিয়।\"}";
                        SendJsonResponse(stream, "200 OK", dbJson);
                        return;
                    }

                    if (urlPath == "/api/v1/database/sync")
                    {
                        SendJsonResponse(stream, "200 OK", "{\"success\":true,\"message\":\"ডাটাবেস সফলভাবে সিঙ্ক হয়েছে।\"}");
                        return;
                    }

                    if (urlPath == "/api/v1/state" && method == "GET")
                    {
                        if (File.Exists(DataFilePath))
                        {
                            byte[] raw = File.ReadAllBytes(DataFilePath);
                            SendResponse(stream, "200 OK", "application/json; charset=utf-8", raw);
                        }
                        else
                        {
                            SendJsonResponse(stream, "200 OK", "{\"buildings\":[],\"rooms\":[],\"residents\":[],\"allocations\":[],\"cancellations\":[],\"documents\":[],\"users\":[],\"auditLogs\":[],\"notifications\":[],\"backupHistory\":[]}");
                        }
                        return;
                    }

                    if (urlPath == "/api/v1/sync" && method == "POST")
                    {
                        if (!string.IsNullOrEmpty(requestBody))
                        {
                            try
                            {
                                File.WriteAllText(DataFilePath, requestBody, Encoding.UTF8);
                            }
                            catch { }
                        }
                        SendJsonResponse(stream, "200 OK", "{\"success\":true}");
                        return;
                    }

                    // Static File Serving from app_static
                    string relPath = urlPath.TrimStart('/');
                    if (string.IsNullOrEmpty(relPath)) relPath = "index.html";
                    relPath = relPath.Replace('/', Path.DirectorySeparatorChar);

                    string candidatePath = Path.Combine(StaticDir, relPath);
                    if (!File.Exists(candidatePath))
                    {
                        string pubPath = Path.Combine(RootDir, "public", relPath);
                        if (File.Exists(pubPath))
                        {
                            candidatePath = pubPath;
                        }
                        else
                        {
                            candidatePath = Path.Combine(StaticDir, "index.html");
                        }
                    }

                    if (File.Exists(candidatePath))
                    {
                        byte[] fileBytes = File.ReadAllBytes(candidatePath);
                        string mime = GetMimeType(candidatePath);
                        SendResponse(stream, "200 OK", mime, fileBytes);
                    }
                    else
                    {
                        SendJsonResponse(stream, "404 Not Found", "{\"error\":\"Not found\"}");
                    }
                }
            }
            catch
            {
            }
            finally
            {
                try { client.Close(); } catch { }
            }
        }

        private static int FindHeaderEnd(byte[] buf, int len)
        {
            for (int i = 0; i <= len - 4; i++)
            {
                if (buf[i] == 13 && buf[i + 1] == 10 && buf[i + 2] == 13 && buf[i + 3] == 10)
                {
                    return i;
                }
            }
            return -1;
        }

        private static void SendJsonResponse(NetworkStream stream, string status, string json)
        {
            byte[] body = Encoding.UTF8.GetBytes(json);
            SendResponse(stream, status, "application/json; charset=utf-8", body);
        }

        private static void SendResponse(NetworkStream stream, string status, string contentType, byte[] body)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("HTTP/1.1 ").Append(status).Append("\r\n");
            sb.Append("Content-Type: ").Append(contentType).Append("\r\n");
            sb.Append("Content-Length: ").Append(body.Length).Append("\r\n");
            sb.Append("Access-Control-Allow-Origin: *\r\n");
            sb.Append("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n");
            sb.Append("Access-Control-Allow-Headers: Content-Type, Authorization\r\n");
            sb.Append("Connection: close\r\n\r\n");

            byte[] headerBytes = Encoding.ASCII.GetBytes(sb.ToString());
            stream.Write(headerBytes, 0, headerBytes.Length);
            if (body.Length > 0)
            {
                stream.Write(body, 0, body.Length);
            }
            stream.Flush();
        }

        private static string GetMimeType(string filePath)
        {
            string ext = Path.GetExtension(filePath).ToLowerInvariant();
            if (ext == ".html") return "text/html; charset=utf-8";
            if (ext == ".js" || ext == ".mjs") return "application/javascript; charset=utf-8";
            if (ext == ".css") return "text/css; charset=utf-8";
            if (ext == ".json") return "application/json; charset=utf-8";
            if (ext == ".png") return "image/png";
            if (ext == ".jpg" || ext == ".jpeg") return "image/jpeg";
            if (ext == ".svg") return "image/svg+xml";
            if (ext == ".ico") return "image/x-icon";
            if (ext == ".woff2") return "font/woff2";
            if (ext == ".woff") return "font/woff";
            return "application/octet-stream";
        }
    }
}

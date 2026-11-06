<?php
/**
 * api/sync.php - Database Synchronization API for BUKU ARcell
 * Domain: ar-pro.my.id
 */

// Enable CORS for mobile app (Capacitor/WebView) and browser clients
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Sync-Key");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuration & Storage Paths
$dataDir = __DIR__ . '/data';
$dbFile = $dataDir . '/database.json';
$backupDir = $dataDir . '/backups';

// Default Security Key (can be modified in config or matched from client)
$defaultKey = 'arcell-sync-2026';

// Create directories if they do not exist
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
    // Protect data directory from direct web download
    @file_put_contents($dataDir . '/.htaccess', "Deny from all\n");
    @file_put_contents($dataDir . '/index.html', "");
}
if (!is_dir($backupDir)) {
    @mkdir($backupDir, 0755, true);
}

// Validate Security Key (Optional: checks header or query param)
$receivedKey = $_SERVER['HTTP_X_SYNC_KEY'] ?? ($_GET['key'] ?? ($_POST['key'] ?? ''));
if (!empty($defaultKey) && !empty($receivedKey) && $receivedKey !== $defaultKey) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Kunci sinkronisasi (Sync Key) tidak cocok.'
    ]);
    exit;
}

// Helper: Read Database
function readDatabase($file) {
    if (!file_exists($file)) {
        return null;
    }
    $raw = @file_get_contents($file);
    if (empty($raw)) {
        return null;
    }
    // Remove PHP protection wrapper if present
    if (strpos($raw, '<?php') === 0) {
        $pos = strpos($raw, "\n");
        $raw = substr($raw, $pos + 1);
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
}

// Helper: Save Database
function saveDatabase($file, $data, $backupDir) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    // Save with PHP exit protection so direct URL access is blank
    $content = "<?php exit; ?>\n" . $json;
    $res = @file_put_contents($file, $content, LOCK_EX);
    
    // Create timestamped backup (keep last 10)
    if ($res !== false) {
        $backupFile = $backupDir . '/db_' . date('Ymd_His') . '.json';
        @file_put_contents($backupFile, $json);
        cleanOldBackups($backupDir, 10);
    }
    return $res !== false;
}

// Helper: Clean old backup files
function cleanOldBackups($dir, $maxKeep = 10) {
    $files = glob($dir . '/db_*.json');
    if ($files && count($files) > $maxKeep) {
        usort($files, function($a, $b) {
            return filemtime($a) - filemtime($b);
        });
        $toDelete = count($files) - $maxKeep;
        for ($i = 0; $i < $toDelete; $i++) {
            @unlink($files[$i]);
        }
    }
}

// Helper: Merge list of entities with 'id'
function mergeEntitiesById($serverList, $clientList) {
    $serverList = is_array($serverList) ? $serverList : [];
    $clientList = is_array($clientList) ? $clientList : [];
    
    $map = [];
    foreach ($serverList as $item) {
        if (isset($item['id'])) {
            $map[$item['id']] = $item;
        }
    }
    
    foreach ($clientList as $item) {
        if (!isset($item['id'])) continue;
        $id = $item['id'];
        if (!isset($map[$id])) {
            $map[$id] = $item;
        } else {
            // If already exists, prefer item with newer updatedAt or merge payments for debts
            $serverItem = $map[$id];
            $serverTime = strtotime($serverItem['updatedAt'] ?? ($serverItem['createdAt'] ?? '2000-01-01'));
            $clientTime = strtotime($item['updatedAt'] ?? ($item['createdAt'] ?? '2000-01-01'));

            if ($clientTime >= $serverTime) {
                // Merge payments if present
                if (isset($item['payments']) || isset($serverItem['payments'])) {
                    $item['payments'] = mergePayments($serverItem['payments'] ?? [], $item['payments'] ?? []);
                }
                $map[$id] = $item;
            } else {
                if (isset($item['payments']) || isset($serverItem['payments'])) {
                    $serverItem['payments'] = mergePayments($serverItem['payments'] ?? [], $item['payments'] ?? []);
                }
                $map[$id] = $serverItem;
            }
        }
    }
    return array_values($map);
}

// Helper: Merge payments inside debt/receivable
function mergePayments($serverPayments, $clientPayments) {
    $map = [];
    foreach ($serverPayments as $p) {
        $pId = $p['id'] ?? ($p['date'] . '_' . ($p['amount'] ?? 0));
        $map[$pId] = $p;
    }
    foreach ($clientPayments as $p) {
        $pId = $p['id'] ?? ($p['date'] . '_' . ($p['amount'] ?? 0));
        $map[$pId] = $p;
    }
    return array_values($map);
}

// Router
$action = $_GET['action'] ?? '';

// ACTION: PING / TEST CONNECTION
if ($action === 'ping') {
    echo json_encode([
        'success' => true,
        'message' => 'Koneksi ke server database ar-pro.my.id berhasil.',
        'timestamp' => date('c'),
        'server' => 'ar-pro.my.id'
    ]);
    exit;
}

// ACTION: CHECK (Ultra lightweight check for real-time auto-sync between PC and Mobile)
if ($action === 'check' || $action === 'timestamp') {
    $db = readDatabase($dbFile);
    $ts = $db['updatedAt'] ?? '2000-01-01T00:00:00Z';
    $trxCount = count($db['transactions'] ?? []);
    $sessCount = count($db['dailySessions'] ?? []);
    $debtCount = count($db['debts'] ?? []) + count($db['receivables'] ?? []);
    $hash = md5($ts . '_' . $trxCount . '_' . $sessCount . '_' . $debtCount);
    echo json_encode([
        'success' => true,
        'timestamp' => $ts,
        'hash' => $hash,
        'count' => $trxCount
    ]);
    exit;
}

// ACTION: GET DATA
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'success' => true,
        'message' => 'Database sekarang menggunakan Supabase Realtime Cloud (PostgreSQL).',
        'timestamp' => date('c'),
        'data' => null
    ]);
    exit;
}

// ACTION: POST DATA (SYNC & MERGE)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);

    if (!$payload || !isset($payload['data'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Payload JSON tidak valid atau data kosong.'
        ]);
        exit;
    }

    $clientData = $payload['data'];
    $serverData = readDatabase($dbFile);

    // If server has no data yet, adopt client data directly
    if (!$serverData) {
        $clientData['updatedAt'] = date('c');
        $saved = saveDatabase($dbFile, $clientData, $backupDir);
        echo json_encode([
            'success' => true,
            'message' => 'Sinkronisasi inisial database server berhasil.',
            'timestamp' => $clientData['updatedAt'],
            'data' => $clientData
        ]);
        exit;
    }

    // Merge entities
    $merged = [];
    $merged['version'] = $clientData['version'] ?? '1.0';
    $merged['updatedAt'] = date('c');

    // Settings (prefer newer or client)
    $merged['settings'] = !empty($clientData['settings']) ? $clientData['settings'] : ($serverData['settings'] ?? []);

    // Categories & Deleted Categories Blacklist
    $deletedCats = array_unique(array_merge($serverData['deletedCategories'] ?? [], $clientData['deletedCategories'] ?? []));
    
    if (!empty($clientData['categoriesIn']) && is_array($clientData['categoriesIn'])) {
        $catIn = $clientData['categoriesIn'];
    } else {
        $catIn = $serverData['categoriesIn'] ?? [];
    }
    
    if (!empty($clientData['categoriesOut']) && is_array($clientData['categoriesOut'])) {
        $catOut = $clientData['categoriesOut'];
    } else {
        $catOut = $serverData['categoriesOut'] ?? [];
    }

    $merged['categoriesIn'] = array_values(array_unique(array_diff($catIn, $deletedCats)));
    $merged['categoriesOut'] = array_values(array_unique(array_diff($catOut, $deletedCats)));
    $merged['deletedCategories'] = array_values($deletedCats);

    // Save client data directly without reviving deleted items
    $merged['transactions'] = $clientData['transactions'] ?? [];
    $merged['receivables'] = $clientData['receivables'] ?? [];
    $merged['debts'] = $clientData['debts'] ?? [];
    $merged['dailySessions'] = $clientData['dailySessions'] ?? [];

    // Active session: keep newest active or latest closed
    $clientAct = $clientData['activeSession'] ?? null;
    $serverAct = $serverData['activeSession'] ?? null;
    if ($clientAct && !$serverAct) {
        $merged['activeSession'] = $clientAct;
    } elseif (!$clientAct && $serverAct) {
        $merged['activeSession'] = $serverAct;
    } elseif ($clientAct && $serverAct) {
        $clientOpen = strtotime($clientAct['openedAt'] ?? '2000-01-01');
        $serverOpen = strtotime($serverAct['openedAt'] ?? '2000-01-01');
        $merged['activeSession'] = ($clientOpen >= $serverOpen) ? $clientAct : $serverAct;
    } else {
        $merged['activeSession'] = null;
    }

    // Save merged database
    $saved = saveDatabase($dbFile, $merged, $backupDir);

    if (!$saved) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Gagal menulis database ke file di server. Periksa hak akses folder api/data.'
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Sinkronisasi berhasil (dua arah / two-way merge).',
        'timestamp' => $merged['updatedAt'],
        'data' => $merged
    ]);
    exit;
}

# Security & Threat Model

SiteCompiler operates an untrusted input processing pipeline (fetching and compiling arbitrary third-party websites provided by users). The system incorporates multi-layer security protections.

## 1. SSRF (Server-Side Request Forgery) Protection

### Threat:
Attackers attempt to supply internal IP ranges (e.g. `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254` AWS metadata endpoints) to probe internal infrastructure or extract cloud IAM credentials.

### Mitigation:
- **Lexical Guard (`validateUrlForSsrf`)**: Checks hostname syntax against forbidden private IP blocks, cloud metadata hostnames (`metadata.google.internal`, `instance-data`), and non-HTTP protocols (`file://`, `gopher://`, `dict://`).
- **Async DNS Resolution Guard (`validateUrlForSsrfAsync`)**: Resolves hostnames to IP addresses prior to initiating HTTP requests to prevent DNS rebinding attacks.

## 2. PII (Personally Identifiable Information) Redaction

### Threat:
Sensitive transaction information (UPI transaction IDs, UTR numbers, sender bank accounts) leaking via public polling APIs.

### Mitigation:
- **Public Serialization Boundary (`toPublicJob`)**: Strips `utrNumber`, `senderAccount`, `userEmail`, and internal server file paths before returning JSON payloads to client polling endpoints.

## 3. Remote Code Execution (RCE) & Prototype Pollution

### Threat:
Malicious scripts in crawled web pages executing inside Node.js processing environments.

### Mitigation:
- Headless Chromium runs in sandboxed, non-privileged user processes with JavaScript disabled for internal parsing.
- HTML cleaning is performed via AST manipulation (Cheerio / HTMLParser2) without using `eval()` or dynamic script execution.

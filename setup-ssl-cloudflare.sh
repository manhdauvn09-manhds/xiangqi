#!/bin/bash
# Cloudflare Origin Certificate Setup for xiangqi.games-core.com
# Run this on the server: sudo bash setup-ssl-cloudflare.sh

set -e

echo "🔐 Setting up Cloudflare Origin Certificate..."

# Create directory
sudo mkdir -p /etc/ssl/cloudflare
cd /etc/ssl/cloudflare

# Create certificate file
sudo tee xiangqi.crt > /dev/null <<'EOF'
-----BEGIN CERTIFICATE-----
MIIEqDCCA5CgAwIBAgIUUieXSUsbL0TKkdxth7brbVO24J4wDQYJKoZIhvcNAQEL
BQAwgYsxCzAJBgNVBAYTAlVTMRkwFwYDVQQKExBDbG91ZEZsYXJlLCBJbmMuMTQw
MgYDVQQLEytDbG91ZEZsYXJlIE9yaWdpbiBTU0wgQ2VydGlmaWNhdGUgQXV0aG9y
aXR5MRYwFAYDVQQHEw1TYW4gRnJhbmNpc2NvMRMwEQYDVQQIEwpDYWxpZm9ybmlh
MB4XDTI2MDUxMjIzNDcwMFoXDTQxMDUwODIzNDcwMFowYjEZMBcGA1UEChMQQ2xv
dWRGbGFyZSwgSW5jLjEdMBsGA1UECxMUQ2xvdWRGbGFyZSBPcmlnaW4gQ0ExJjAk
BgNVBAMTHUNsb3VkRmxhcmUgT3JpZ2luIENlcnRpZmljYXRlMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2qkBU6ISCKbfhnhAgJFMhTh0A9621ScM7+RM
dlGOpF+nhMN2d636mckp8wqN+YjwdoY2CfBDVBKxneYhWW2NYeXZtyEIsxlqW0nG
c38xigsaHw4dZdElh3DyG9fFECK9wmDsA1BSoXwhQHOGYncZr68xAJU7dwvFWs4k
gKwoTgO9RlEM0WhrlcQLo4p1/GT2eVcTxrvZVqoQyY+r36Cppa3hgokxpQj97I8V
KRlJps/uF1cYFF6xbxsNqrssJYfGmW8wJ/+O/aeh8bHldK62b4G/nvxhMRoIcP4F
LZw9XYYASw3X9T6Q2xwJsPnPLGcNNw0kzDcTdjFnY8eKBFwfbwIDAQABo4IBKjCC
ASYwDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcD
ATAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBQf0Sedh2JsK8kTEOzbkTF2zJrgnTAf
BgNVHSMEGDAWgBQk6FNXXXw0QIep65TbuuEWePwppDBABggrBgEFBQcBAQQ0MDIw
MAYIKwYBBQUHMAGGJGh0dHA6Ly9vY3NwLmNsb3VkZmxhcmUuY29tL29yaWdpbl9j
YTArBgNVHREEJDAighAqLmdhbWVzLWNvcmUuY29tgg5nYW1lcy1jb3JlLmNvbTA4
BgNVHR8EMTAvMC2gK6AphidodHRwOi8vY3JsLmNsb3VkZmxhcmUuY29tL29yaWdp
bl9jYS5jcmwwDQYJKoZIhvcNAQELBQADggEBAK9YWBUnEiWWnQgQPN98FOnNSdHf
XwhXPXGVsrknajliKy32GvT2ZMBVVNNZNnvAsJOYZzOFm8nzZ15JFGaxJ8q8srhS
Zk9HIjKRwR8y83PRiVZb7JhiNcrnqlefOGnerKwxtEr5V7Wsjz5FGgqI/ppNdj0f
7/ojMGWbAJBqQPhDx7fngzIViE2mfgjqtLQBc60RKrdn6wjgZyx/zhCDoX4Het8t
q1QZ/vAQwqGvGUrft9ttHM3spGVgeX2sMHppIt0oF7c3zn/54K7aC1TlHkHYU580
Uxkjrpvapj2qfLiUZ1jYU0uK0M2TSvJqCh4IBYnB8iRShyIblk/Wy7jN7/k=
-----END CERTIFICATE-----
EOF

# Create private key file
sudo tee xiangqi.key > /dev/null <<'EOF'
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDaqQFTohIIpt+G
eECAkUyFOHQD3rbVJwzv5Ex2UY6kX6eEw3Z3rfqZySnzCo35iPB2hjYJ8ENUErGd
5iFZbY1h5dm3IQizGWpbScZzfzGKCxofDh1l0SWHcPIb18UQIr3CYOwDUFKhfCFA
c4ZidxmvrzEAlTt3C8VaziSArChOA71GUQzRaGuVxAujinX8ZPZ5VxPGu9lWqhDJ
j6vfoKmlreGCiTGlCP3sjxUpGUmmz+4XVxgUXrFvGw2quywlh8aZbzAn/479p6Hx
seV0rrZvgb+e/GExGghw/gUtnD1dhgBLDdf1PpDbHAmw+c8sZw03DSTMNxN2MWdj
x4oEXB9vAgMBAAECggEALaF8ReQ6CDUuy2SX7VylD94Wk+Ir3HKQSBWoAT8G2fWe
Q135AIO9ms84omAO/caei9V5PHy3yDk4eL+YMQ3kJcxuMUHDC4EfyVotgFfIUkr7
0gRDjUZmowumcroGBVaCrChGyHBANjPtyoHxRuYc5aVVQA5kgPTjZA5F3tZOeOz6
4lnGdOwRSFgQS9gquy6+UFQ05y1f/wmoSMjK9r6e/vq6MTClMYZKoPG0XRni+SFe
7YpKrNj6VDhyzCHfkpEt3Q7tgW2/hgUT4/CcAsWUd2MxZ6lq5KRJpJrulTRcfcyn
YXZ8YHQpE7yvLSTKYIpGrx3CWL4KgYtdeQpZu9zitQKBgQD8oPicCk6x4k3MHCbw
/niAFljAwxWhr8IRE+2voHHkoDD9sobAIDtxFdcuCEOWcBDb+sq1OlhG35y2iIJ+
Nrf6BDnfwbcvo3Xa7WWNMl6cc48vfP13+OOkySV7V9aYWLozijGcTWor7KB1SZvR
wdj76SCrWuoCDX2Ujza+dQPlNQKBgQDdk/2dJ61CO8fF1+MhMss4C1OBsyCo1Vyu
rej4OMBbBwvw2fFPHu3fqZxMCruy85QyDky4rBQKMgAFHkJhiRUt+o/j8uFIXH6x
PN/FQe/UQmP/2vaeKIhVGEjwG+RBLpdZEoyXBTukvA9tZe+SFGRb8gSrHITVl9/z
lGS3yhu6kwKBgQC9TJF9u2uEd6L8EwxLASOiNxyCNKx834p36YrtUziErFSJhcDb
LkvcTRVUdPTQQWEgtSg37GRBl0WCsX+2u6HYQlprhGiT1dR2G/VAfEHQ0fa1Ct+T
inhp/h+L8SHoPnQoMqFCEfBAwarquCF+Z9cDzIiiXhmDOECllTrcNCqbEQKBgFtl
xRJDIIOWlxPztjumcQ8AFQUF923M/LsM/3EML8Qchv9lVtVVI7fDhbYUI1JwiOuQ
3HK8gFOoRjvWPHlxCyx5E0tqjyTDCntfaco7JYs/i3IpRtr8SygWqVdpmeCNMF7M
ePN+dBjCffaZOpXeFXubu/M9A0n7qKQXzOfG1WNDAoGAInjwhYgNdbT69PNBCw6U
EJComvbeYSVOznTahWn9vf/AQ5hzle5T2Oyw3WwIUWDL14ngFpaxIXFBQR3vgqnr
L2LgH+j966RI3PGeC/Zs8BljOtp5qHCIRSqDQEc/p6TBEkwxYN1X2zPQJS6RhO9F
iHcnt6AajnpPGaOJXPg9PcU=
-----END PRIVATE KEY-----
EOF

# Set proper permissions
sudo chmod 644 xiangqi.crt
sudo chmod 600 xiangqi.key
sudo chown root:root xiangqi.crt xiangqi.key

echo "✅ Certificate and key installed:"
echo "   - /etc/ssl/cloudflare/xiangqi.crt"
echo "   - /etc/ssl/cloudflare/xiangqi.key"

# Verify certificate
echo ""
echo "🔍 Certificate details:"
openssl x509 -in xiangqi.crt -text -noout | grep -E "Subject:|Issuer:|Not Before|Not After" | head -4

echo ""
echo "✅ Setup complete! Now run:"
echo "   cd /root/xiangqi && git pull origin main"
echo "   sudo cp nginx-xiangqi-vhost.conf /etc/nginx/sites-available/xiangqi.games-core.com"
echo "   sudo ln -sf /etc/nginx/sites-available/xiangqi.games-core.com /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl restart nginx"
echo "   cd ~/xiangqi-deploy && docker-compose down && docker-compose up -d"

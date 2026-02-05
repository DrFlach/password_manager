🔐 Secure Password Manager

A modern, secure password manager web application with end-to-end encryption and one-time password sharing capabilities.

![Password Manager](https://img.shields.io/badge/Go-1.20+-00ADD8?style=for-the-badge&logo=go)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## Features

### Security First
- **Client-side AES-GCM encryption** - All passwords are encrypted in your browser before storage
- **Web Crypto API** - Industry-standard cryptographic operations
- **No plaintext storage** - Passwords are never stored unencrypted
- **Secure sharing** - One-time use links with automatic expiration

### Password Management
- **Add/Edit/Delete** passwords with ease
- **Organized storage** - Service name, username, password, URL, and notes
- **Search & filter** - Quickly find any password
- **Local storage** - All data stays in your browser (encrypted)

### Secure Sharing
- **One-time password sharing** - Generate secure shareable links
- **Automatic expiration** - Links expire after 24 hours OR first view
- **Customizable expiration** - Choose 1, 12, or 24 hours
- **View tracking** - See when a link was opened
- **End-to-end encryption** - Passwords are encrypted during transit

### Password Generator
- **Customizable length** - 8 to 32 characters
- **Multiple character sets** - Uppercase, lowercase, numbers, symbols
- **Memorable passwords** - Word-based passwords (correct-horse-battery-staple style)
- **Strength meter** - Visual feedback on password strength
- **Cryptographically secure** - Uses Web Crypto API for random generation

### Modern UI
- **Dark theme** - Beautiful violet-black color scheme
- **Responsive design** - Works on desktop and mobile
- **Smooth animations** - Clean, modern transitions
- **Tailwind CSS** - Professional, consistent styling

## Architecture

```
password-manager/
├── backend/                 # Go backend server
│   ├── main.go             # Server entry point
│   ├── handlers.go         # API request handlers
│   └── models.go           # Data models and store
├── frontend/               # Frontend application
│   ├── index.html          # Main HTML structure
│   ├── app.js              # Application logic
│   └── crypto.js           # Encryption utilities
└── README.md               # This file
```

## Quick Start

### Prerequisites

- **Go 1.20+** - [Install Go](https://golang.org/doc/install)
- **Modern web browser** - Chrome, Firefox, Safari, or Edge

### Installation

1. **Clone or download the project**
   ```bash
   cd password-manager
   ```

2. **Start the backend server**
   ```bash
   cd backend
   go run main.go handlers.go models.go
   ```

   You should see:
   ```
   🔐 Password Manager Server starting on port 8080
   📍 Base URL: http://localhost:8080
   🌐 Frontend: http://localhost:8080
   🔧 API Health: http://localhost:8080/api/health
   ```

3. **Open your browser**
   
   Navigate to: **http://localhost:8080**

That's it! The application is now running.

## 📖 Usage Guide

### Adding a Password

1. Fill in the form on the left side:
   - **Service Name** (required) - e.g., "Gmail", "GitHub"
   - **Username** (required) - Your username or email
   - **Password** (required) - Your password
   - **URL** (optional) - Website URL
   - **Notes** (optional) - Any additional information

2. Click **Save**

3. Your password is encrypted and stored locally

### Generating a Password

1. Click the **Generate Password** button

2. Customize your password:
   - Adjust the length slider (8-32 characters)
   - Select character types (uppercase, lowercase, numbers, symbols)
   - Enable "Memorable" mode for word-based passwords

3. Click **Generate** to create a new password

4. Click **Use This** to insert it into the form, or **Copy** to copy it

### Sharing a Password Securely

1. Click the (share) button on any password card

2. Choose expiration time:
   - 1 hour
   - 12 hours
   - 24 hours (default)

3. Click **Create Link**

4. Copy the generated link and share it securely (e.g., via encrypted messaging)

5. **Important**: The link can only be opened **once** and expires automatically

### Viewing a Shared Password

1. Open the share link in your browser

2. The password is displayed **once** and the link is destroyed

3. Copy the password and store it securely

## 🔧 API Reference

### Backend Endpoints

#### `POST /api/share`

Create a secure shareable link for a password.

**Request:**
```json
{
  "encrypted_password": "base64_encrypted_string",
  "service_name": "Gmail",
  "username": "user@example.com",
  "expiration_hours": 24
}
```

**Response:**
```json
{
  "token": "secure_random_token",
  "share_url": "http://localhost:8080/share/secure_random_token",
  "expires_at": "2026-02-05T12:00:00Z"
}
```

#### `GET /api/share/:token`

Retrieve a shared password (one-time use).

**Response (Success):**
```json
{
  "encrypted_password": "base64_encrypted_string",
  "service_name": "Gmail",
  "username": "user@example.com",
  "created_at": "2026-02-04T12:00:00Z"
}
```

**Response (Already Viewed):**
```json
{
  "error": "This share has already been viewed",
  "details": {
    "service_name": "Gmail",
    "username": "user@example.com",
    "viewed_at": "2026-02-04T13:00:00Z"
  }
}
```

#### `DELETE /api/share/:token`

Manually delete a share link.

**Response:**
```json
{
  "message": "Share deleted successfully"
}
```

#### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "time": "2026-02-04T12:00:00Z"
}
```

## Security Features

### Client-Side Encryption

All passwords are encrypted using **AES-GCM** (256-bit) before being stored in `localStorage`.

- **Encryption key** - Generated once per browser and stored locally
- **Random IV** - Each encryption uses a unique initialization vector
- **No server access** - Your master key never leaves your browser

### Share Link Security

1. **Cryptographically secure tokens** - 32 bytes of random data (256 bits)
2. **One-time use** - Links are destroyed after first view
3. **Automatic expiration** - Links expire after specified time
4. **Encrypted transit** - Passwords are encrypted during sharing
5. **No persistence** - Shared passwords are deleted after viewing

### Best Practices

- **Backup your passwords** - Export data regularly (localStorage only)
- **Use strong master passwords** - Protect your password manager access
- **Verify share recipients** - Only share links via secure channels
- **Regular cleanup** - Delete old, unused passwords

## ⚙️ Configuration

### Environment Variables

Set these environment variables before starting the backend:

```bash
# Port (default: 8080)
export PORT=8080

# Base URL for share links (default: http://localhost:8080)
export BASE_URL=http://localhost:8080

# Run the server
cd backend
go run main.go handlers.go models.go
```

### Production Deployment

For production:

1. **Set BASE_URL** to your production domain:
   ```bash
   export BASE_URL=https://yourdomain.com
   ```

2. **Enable HTTPS** - Use a reverse proxy (Nginx, Caddy) with SSL/TLS

3. **Restrict CORS** - Update `corsMiddleware` in `main.go` to only allow your frontend domain

4. **Build the Go binary**:
   ```bash
   cd backend
   go build -o password-manager
   ./password-manager
   ```

## Customization

### Colors

Edit the Tailwind config in `index.html`:

```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#7C3AED',  // Change these
                    dark: '#6B46C1',
                    light: '#A78BFA',
                },
                // ... more colors
            }
        }
    }
}
```

## Troubleshooting

### Backend not starting

**Error**: `address already in use`

**Solution**: Another process is using port 8080. Change the port:
```bash
export PORT=3000
go run main.go handlers.go models.go
```

### Passwords won't decrypt

**Cause**: Your encryption key may have been cleared or changed.

**Solution**: Unfortunately, encrypted passwords cannot be recovered without the original key. Start fresh by clearing localStorage:
```javascript
// In browser console
localStorage.clear()
```

### Share links not working

**Cause**: Backend is not running or wrong API URL.

**Solution**: 
1. Ensure backend is running: `http://localhost:8080/api/health`
2. Check `apiBaseUrl` in `app.js` matches your backend URL

### CORS errors

**Cause**: Frontend domain doesn't match allowed origins.

**Solution**: Update the `corsMiddleware` in `backend/main.go` to include your domain.

## License

MIT License - feel free to use this project however you'd like!

## Acknowledgments

- Built with [Go](https://golang.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Encryption via [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

**Made with 💜 by a DevOpsSec Eduard Shanovskiy and fullstack Gleb Deviatka**

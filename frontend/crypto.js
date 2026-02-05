/**
 * Crypto.js - Client-side encryption using Web Crypto API
 * Implements AES-GCM encryption for password storage
 */

class CryptoManager {
    constructor() {
        this.keyName = 'passwordManagerKey';
        this.algorithm = {
            name: 'AES-GCM',
            length: 256
        };
    }

    /**
     * Generate a new encryption key or retrieve existing one
     */
    async getOrCreateKey() {
        // Try to get existing key from localStorage
        const storedKey = localStorage.getItem(this.keyName);
        
        if (storedKey) {
            // Import the stored key
            const keyData = this.base64ToArrayBuffer(storedKey);
            return await crypto.subtle.importKey(
                'raw',
                keyData,
                this.algorithm,
                true,
                ['encrypt', 'decrypt']
            );
        }

        // Generate a new key
        const key = await crypto.subtle.generateKey(
            this.algorithm,
            true,
            ['encrypt', 'decrypt']
        );

        // Export and store the key
        const exportedKey = await crypto.subtle.exportKey('raw', key);
        localStorage.setItem(this.keyName, this.arrayBufferToBase64(exportedKey));

        return key;
    }

    /**
     * Encrypt data using AES-GCM
     */
    async encrypt(data) {
        const key = await this.getOrCreateKey();
        
        // Generate a random IV (Initialization Vector)
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Convert data to ArrayBuffer
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        // Encrypt the data
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            dataBuffer
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encryptedData.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedData), iv.length);

        // Return as base64 string
        return this.arrayBufferToBase64(combined.buffer);
    }

    /**
     * Decrypt data using AES-GCM
     */
    async decrypt(encryptedData) {
        try {
            const key = await this.getOrCreateKey();
            
            // Convert base64 to ArrayBuffer
            const combined = this.base64ToArrayBuffer(encryptedData);
            
            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const data = combined.slice(12);

            // Decrypt the data
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                data
            );

            // Convert ArrayBuffer to string
            const decoder = new TextDecoder();
            return decoder.decode(decryptedData);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Encrypt a password entry object
     */
    async encryptPasswordEntry(entry) {
        return {
            id: entry.id,
            serviceName: await this.encrypt(entry.serviceName),
            username: await this.encrypt(entry.username),
            password: await this.encrypt(entry.password),
            url: entry.url ? await this.encrypt(entry.url) : null,
            notes: entry.notes ? await this.encrypt(entry.notes) : null,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
        };
    }

    /**
     * Decrypt a password entry object
     */
    async decryptPasswordEntry(encryptedEntry) {
        return {
            id: encryptedEntry.id,
            serviceName: await this.decrypt(encryptedEntry.serviceName),
            username: await this.decrypt(encryptedEntry.username),
            password: await this.decrypt(encryptedEntry.password),
            url: encryptedEntry.url ? await this.decrypt(encryptedEntry.url) : '',
            notes: encryptedEntry.notes ? await this.decrypt(encryptedEntry.notes) : '',
            createdAt: encryptedEntry.createdAt,
            updatedAt: encryptedEntry.updatedAt
        };
    }

    /**
     * Utility: Convert ArrayBuffer to Base64
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Utility: Convert Base64 to ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Generate a cryptographically secure random password
     */
    generatePassword(length = 16, options = {}) {
        const {
            uppercase = true,
            lowercase = true,
            numbers = true,
            symbols = true,
            memorable = false
        } = options;

        if (memorable) {
            return this.generateMemorablePassword();
        }

        let charset = '';
        if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (numbers) charset += '0123456789';
        if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (charset.length === 0) {
            charset = 'abcdefghijklmnopqrstuvwxyz'; // Fallback
        }

        const randomValues = new Uint32Array(length);
        crypto.getRandomValues(randomValues);

        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset[randomValues[i] % charset.length];
        }

        return password;
    }

    /**
     * Generate a memorable password (word-based)
     */
    generateMemorablePassword() {
        const words = [
            'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'theta', 'sigma',
            'ocean', 'mountain', 'river', 'forest', 'desert', 'valley', 'canyon', 'meadow',
            'tiger', 'eagle', 'dolphin', 'wolf', 'falcon', 'panther', 'jaguar', 'lynx',
            'swift', 'brave', 'bright', 'noble', 'quick', 'wise', 'bold', 'calm',
            'ruby', 'jade', 'pearl', 'amber', 'coral', 'onyx', 'opal', 'topaz'
        ];

        const randomIndices = new Uint32Array(4);
        crypto.getRandomValues(randomIndices);

        const selectedWords = [];
        for (let i = 0; i < 4; i++) {
            selectedWords.push(words[randomIndices[i] % words.length]);
        }

        // Capitalize random words
        const randomCapitalize = new Uint32Array(4);
        crypto.getRandomValues(randomCapitalize);
        
        const password = selectedWords.map((word, i) => {
            if (randomCapitalize[i] % 2 === 0) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word;
        });

        // Add a random number at the end
        const randomNumber = new Uint32Array(1);
        crypto.getRandomValues(randomNumber);
        password.push((randomNumber[0] % 900 + 100).toString());

        return password.join('-');
    }

    /**
     * Calculate password strength
     */
    calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength += 20;
        if (password.length >= 12) strength += 20;
        if (password.length >= 16) strength += 20;
        
        if (/[a-z]/.test(password)) strength += 10;
        if (/[A-Z]/.test(password)) strength += 10;
        if (/[0-9]/.test(password)) strength += 10;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 10;

        return Math.min(strength, 100);
    }

    /**
     * Get password strength label
     */
    getStrengthLabel(strength) {
        if (strength < 30) return { label: 'Weak', color: 'bg-red-500' };
        if (strength < 60) return { label: 'Fair', color: 'bg-yellow-500' };
        if (strength < 80) return { label: 'Good', color: 'bg-blue-500' };
        return { label: 'Strong', color: 'bg-green-500' };
    }

    /**
     * Reset encryption key (WARNING: This will make all stored passwords unreadable)
     */
    resetEncryptionKey() {
        localStorage.removeItem(this.keyName);
    }
}

// Export singleton instance
const cryptoManager = new CryptoManager();

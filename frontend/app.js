/**
 * App.js - Main application logic for Password Manager
 */

class PasswordManager {
    constructor() {
        this.passwords = [];
        this.currentEditId = null;
        this.currentSharePasswordId = null;
        // Автоматически определяем URL API
        this.apiBaseUrl = this.getApiBaseUrl();
        this.init();
    }

    /**
     * Определяет базовый URL для API (локально или на продакшене)
     */
    getApiBaseUrl() {
        // Если запущено локально
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8080/api';
        }
        // На продакшене используем текущий домен
        return `${window.location.protocol}//${window.location.host}/api`;
    }

    async init() {
        // Сначала проверяем, не share ли это страница
        const isSharePage = await this.checkSharePage();
        
        // Если это share страница, останавливаем инициализацию
        if (isSharePage) {
            return;
        }
        
        // Загружаем пароли и ждем завершения
        await this.loadPasswords();
        this.setupEventListeners();
        this.renderPasswords();
    }

    /**
     * Load passwords from localStorage
     */
    async loadPasswords() {
        const stored = localStorage.getItem('passwords');
        if (stored) {
            try {
                const encryptedPasswords = JSON.parse(stored);
                this.passwords = await Promise.all(
                    encryptedPasswords.map(p => cryptoManager.decryptPasswordEntry(p))
                );
            } catch (error) {
                console.error('Failed to load passwords:', error);
                this.showToast('Failed to decrypt passwords. Your encryption key may have changed.', 'error');
            }
        }
    }

    /**
     * Save passwords to localStorage
     */
    async savePasswords() {
        try {
            const encryptedPasswords = await Promise.all(
                this.passwords.map(p => cryptoManager.encryptPasswordEntry(p))
            );
            localStorage.setItem('passwords', JSON.stringify(encryptedPasswords));
        } catch (error) {
            console.error('Failed to save passwords:', error);
            this.showToast('Failed to save passwords', 'error');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Password form
        document.getElementById('passwordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.renderPasswords(e.target.value);
        });

        // Toggle password visibility
        document.getElementById('togglePassword').addEventListener('click', () => {
            const input = document.getElementById('password');
            input.type = input.type === 'password' ? 'text' : 'password';
        });

        // Cancel edit
        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.cancelEdit();
        });

        // Password Generator
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.openGenerator();
        });

        document.getElementById('closeGenerator').addEventListener('click', () => {
            this.closeGenerator();
        });

        document.getElementById('generateNewPassword').addEventListener('click', () => {
            this.generateNewPassword();
        });

        document.getElementById('usePassword').addEventListener('click', () => {
            this.useGeneratedPassword();
        });

        document.getElementById('copyGenerated').addEventListener('click', () => {
            const password = document.getElementById('generatedPassword').textContent;
            if (password && password !== 'Click generate') {
                this.copyToClipboard(password);
            }
        });

        // Generator options
        document.getElementById('lengthSlider').addEventListener('input', (e) => {
            document.getElementById('lengthValue').textContent = e.target.value;
        });

        document.getElementById('memorableMode').addEventListener('change', (e) => {
            const checkboxes = ['includeUppercase', 'includeLowercase', 'includeNumbers', 'includeSymbols'];
            checkboxes.forEach(id => {
                document.getElementById(id).disabled = e.target.checked;
            });
        });

        // Share Modal
        document.getElementById('closeShare').addEventListener('click', () => {
            this.closeShareModal();
        });

        document.getElementById('createShareLink').addEventListener('click', () => {
            this.createShareLink();
        });

        document.getElementById('copyShareLink').addEventListener('click', () => {
            const link = document.getElementById('shareLink').value;
            this.copyToClipboard(link);
        });
    }

    /**
     * Handle form submission (add/edit password)
     */
    async handleFormSubmit() {
        const serviceName = document.getElementById('serviceName').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const url = document.getElementById('url').value.trim();
        const notes = document.getElementById('notes').value.trim();

        if (!serviceName || !username || !password) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (this.currentEditId) {
            // Edit existing
            const index = this.passwords.findIndex(p => p.id === this.currentEditId);
            if (index !== -1) {
                this.passwords[index] = {
                    ...this.passwords[index],
                    serviceName,
                    username,
                    password,
                    url,
                    notes,
                    updatedAt: new Date().toISOString()
                };
                this.showToast('Password updated successfully', 'success');
            }
            this.currentEditId = null;
        } else {
            // Add new
            const newPassword = {
                id: Date.now().toString(),
                serviceName,
                username,
                password,
                url,
                notes,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.passwords.push(newPassword);
            this.showToast('Password added successfully', 'success');
        }

        await this.savePasswords();
        this.resetForm();
        this.renderPasswords();
    }

    /**
     * Edit a password
     */
    editPassword(id) {
        const password = this.passwords.find(p => p.id === id);
        if (!password) return;

        this.currentEditId = id;
        document.getElementById('serviceName').value = password.serviceName;
        document.getElementById('username').value = password.username;
        document.getElementById('password').value = password.password;
        document.getElementById('url').value = password.url || '';
        document.getElementById('notes').value = password.notes || '';

        document.getElementById('formTitle').textContent = 'Edit Password';
        document.getElementById('cancelEdit').classList.remove('hidden');
        
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Delete a password
     */
    async deletePassword(id) {
        if (!confirm('Are you sure you want to delete this password?')) return;

        this.passwords = this.passwords.filter(p => p.id !== id);
        await this.savePasswords();
        this.renderPasswords();
        this.showToast('Password deleted successfully', 'success');
    }

    /**
     * Cancel editing
     */
    cancelEdit() {
        this.currentEditId = null;
        this.resetForm();
    }

    /**
     * Reset form
     */
    resetForm() {
        document.getElementById('passwordForm').reset();
        document.getElementById('formTitle').textContent = 'Add New Password';
        document.getElementById('cancelEdit').classList.add('hidden');
    }

    /**
     * Render password list
     */
    renderPasswords(searchTerm = '') {
        const container = document.getElementById('passwordList');
        const emptyState = document.getElementById('emptyState');

        let filtered = this.passwords;
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = this.passwords.filter(p => 
                p.serviceName.toLowerCase().includes(term) ||
                p.username.toLowerCase().includes(term) ||
                (p.url && p.url.toLowerCase().includes(term))
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        container.innerHTML = filtered.map(password => `
            <div class="bg-bg-dark rounded-xl p-6 shadow-2xl border border-bg-medium hover:border-primary transition-all duration-300 slide-up">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold text-primary-light mb-1">${this.escapeHtml(password.serviceName)}</h3>
                        <p class="text-gray-400 text-sm">${this.escapeHtml(password.username)}</p>
                        ${password.url ? `<a href="${this.escapeHtml(password.url)}" target="_blank" class="text-accent text-sm hover:underline">🔗 ${this.escapeHtml(password.url)}</a>` : ''}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="passwordManager.sharePassword('${password.id}')" 
                            class="bg-accent hover:opacity-90 p-2 rounded-lg transition-all" title="Share">
                            📤
                        </button>
                        <button onclick="passwordManager.editPassword('${password.id}')" 
                            class="bg-primary hover:bg-primary-dark p-2 rounded-lg transition-all" title="Edit">
                            ✏️
                        </button>
                        <button onclick="passwordManager.deletePassword('${password.id}')" 
                            class="bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-all" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="bg-bg-medium rounded-lg p-3 mb-3 flex items-center justify-between">
                    <code class="font-mono text-accent">••••••••</code>
                    <div class="flex gap-2">
                        <button onclick="passwordManager.togglePasswordVisibility('${password.id}', this)" 
                            class="bg-primary hover:bg-primary-dark px-3 py-1 rounded transition-all text-sm">
                            👁️ Show
                        </button>
                        <button onclick="passwordManager.copyPassword('${password.id}')" 
                            class="bg-primary hover:bg-primary-dark px-3 py-1 rounded transition-all text-sm">
                            📋 Copy
                        </button>
                    </div>
                </div>

                ${password.notes ? `
                    <div class="text-gray-400 text-sm">
                        <strong>Notes:</strong> ${this.escapeHtml(password.notes)}
                    </div>
                ` : ''}

                <div class="text-gray-500 text-xs mt-3">
                    Updated: ${new Date(password.updatedAt).toLocaleString()}
                </div>
            </div>
        `).join('');
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(id, button) {
        const password = this.passwords.find(p => p.id === id);
        if (!password) return;

        const codeElement = button.parentElement.previousElementSibling;
        
        if (codeElement.textContent === '••••••••') {
            codeElement.textContent = password.password;
            button.innerHTML = '🙈 Hide';
        } else {
            codeElement.textContent = '••••••••';
            button.innerHTML = '👁️ Show';
        }
    }

    /**
     * Copy password to clipboard
     */
    async copyPassword(id) {
        const password = this.passwords.find(p => p.id === id);
        if (!password) return;

        await this.copyToClipboard(password.password);
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showToast('Failed to copy', 'error');
        }
    }

    /**
     * Open password generator
     */
    openGenerator() {
        document.getElementById('generatorModal').classList.remove('hidden');
        this.generateNewPassword();
    }

    /**
     * Close password generator
     */
    closeGenerator() {
        document.getElementById('generatorModal').classList.add('hidden');
    }

    /**
     * Generate a new password
     */
    generateNewPassword() {
        const length = parseInt(document.getElementById('lengthSlider').value);
        const memorable = document.getElementById('memorableMode').checked;
        
        const options = {
            uppercase: document.getElementById('includeUppercase').checked,
            lowercase: document.getElementById('includeLowercase').checked,
            numbers: document.getElementById('includeNumbers').checked,
            symbols: document.getElementById('includeSymbols').checked,
            memorable: memorable
        };

        const password = cryptoManager.generatePassword(length, options);
        document.getElementById('generatedPassword').textContent = password;

        // Update strength meter
        const strength = cryptoManager.calculatePasswordStrength(password);
        const strengthInfo = cryptoManager.getStrengthLabel(strength);
        
        const meter = document.getElementById('strengthMeter');
        meter.style.width = strength + '%';
        meter.className = `h-full ${strengthInfo.color} transition-all duration-300`;
        
        document.getElementById('strengthText').textContent = `${strengthInfo.label} (${strength}%)`;
    }

    /**
     * Use generated password
     */
    useGeneratedPassword() {
        const password = document.getElementById('generatedPassword').textContent;
        if (password && password !== 'Click generate') {
            document.getElementById('password').value = password;
            this.closeGenerator();
            this.showToast('Password inserted into form', 'success');
        }
    }

    /**
     * Share password
     */
    sharePassword(id) {
        this.currentSharePasswordId = id;
        document.getElementById('shareModal').classList.remove('hidden');
        document.getElementById('shareOptions').classList.remove('hidden');
        document.getElementById('shareSuccess').classList.add('hidden');
        document.getElementById('shareLoading').classList.add('hidden');
    }

    /**
     * Create share link
     */
    async createShareLink() {
        const password = this.passwords.find(p => p.id === this.currentSharePasswordId);
        if (!password) return;

        const expirationHours = parseInt(document.getElementById('expirationHours').value);

        // Show loading
        document.getElementById('shareOptions').classList.add('hidden');
        document.getElementById('shareLoading').classList.remove('hidden');

        try {
            // Передаем пароль напрямую - сервер хранит временно
            // (клиентское шифрование не подходит, т.к. ключ уникален для каждого браузера)

            const response = await fetch(`${this.apiBaseUrl}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: password.password,
                    service_name: password.serviceName,
                    username: password.username,
                    expiration_hours: expirationHours
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create share link');
            }

            const data = await response.json();

            // Формируем правильный share URL на основе текущего домена
            const shareUrl = `${window.location.protocol}//${window.location.host}/share/${data.token}`;

            // Show success
            document.getElementById('shareLoading').classList.add('hidden');
            document.getElementById('shareSuccess').classList.remove('hidden');
            document.getElementById('shareLink').value = shareUrl;
            document.getElementById('expiresAt').textContent = new Date(data.expires_at).toLocaleString();

            this.showToast('Share link created successfully!', 'success');
        } catch (error) {
            console.error('Failed to create share link:', error);
            this.showToast('Failed to create share link. Make sure the backend is running.', 'error');
            document.getElementById('shareLoading').classList.add('hidden');
            document.getElementById('shareOptions').classList.remove('hidden');
        }
    }

    /**
     * Close share modal
     */
    closeShareModal() {
        document.getElementById('shareModal').classList.add('hidden');
        this.currentSharePasswordId = null;
    }

    /**
     * Check if we're on a share page
     */
    async checkSharePage() {
        const path = window.location.pathname;
        const match = path.match(/\/share\/([^\/]+)/);
        
        if (match) {
            const token = match[1];
            await this.loadSharedPassword(token);
            return true; // Это share страница
        }
        return false; // Обычная страница
    }

    /**
     * Load shared password
     */
    async loadSharedPassword(token) {
        try {
            console.log('Loading shared password for token:', token);
            const response = await fetch(`${this.apiBaseUrl}/share/${token}`);
            
            if (!response.ok) {
                if (response.status === 410) {
                    const data = await response.json();
                    this.showSharePage(null, data.error);
                } else {
                    throw new Error('Failed to load shared password');
                }
                return;
            }

            const data = await response.json();
            console.log('Received share data:', data);
            
            // Пароль приходит напрямую, без шифрования
            this.showSharePage({
                serviceName: data.service_name,
                username: data.username,
                password: data.password,
                createdAt: data.created_at
            });
        } catch (error) {
            console.error('Failed to load shared password:', error);
            this.showSharePage(null, 'This share link is invalid or has expired.');
        }
    }

    /**
     * Show share page
     */
    showSharePage(shareData, errorMessage = null) {
        document.body.innerHTML = `
            <div class="min-h-screen flex items-center justify-center p-4">
                <div class="bg-bg-dark rounded-xl p-8 max-w-md w-full shadow-2xl border border-bg-medium">
                    <h1 class="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
                        🔐 Shared Password
                    </h1>

                    ${errorMessage ? `
                        <div class="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 mb-4">
                            <p class="text-red-300">❌ ${errorMessage}</p>
                        </div>
                        <a href="/" class="block text-center bg-primary hover:bg-primary-dark px-6 py-3 rounded-lg font-semibold transition-all">
                            Go to Password Manager
                        </a>
                    ` : `
                        <div class="bg-green-900 bg-opacity-30 border border-green-700 rounded-lg p-4 mb-6">
                            <p class="text-green-300">✓ Password retrieved successfully!</p>
                        </div>

                        <div class="space-y-4 mb-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Service</label>
                                <div class="bg-bg-medium rounded-lg p-3 text-white">${this.escapeHtml(shareData.serviceName)}</div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
                                <div class="bg-bg-medium rounded-lg p-3 text-white">${this.escapeHtml(shareData.username)}</div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
                                <div class="bg-bg-medium rounded-lg p-3 flex items-center justify-between">
                                    <code class="font-mono text-accent">${this.escapeHtml(shareData.password)}</code>
                                    <button onclick="navigator.clipboard.writeText('${this.escapeHtml(shareData.password).replace(/'/g, "\\'")}').then(() => alert('Copied!'))" 
                                        class="bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-all ml-2">
                                        📋 Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-4 mb-6">
                            <p class="text-yellow-300 text-sm">
                                ⚠️ <strong>Security Notice:</strong><br>
                                • This link has been destroyed and can no longer be accessed<br>
                                • Make sure to save the password securely<br>
                                • Shared at: ${new Date(shareData.createdAt).toLocaleString()}
                            </p>
                        </div>

                        <a href="/" class="block text-center bg-primary hover:bg-primary-dark px-6 py-3 rounded-lg font-semibold transition-all">
                            Go to Password Manager
                        </a>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// Initialize app
const passwordManager = new PasswordManager();

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
        // Проверяем, не share ли это страница - если да, ничего не делаем
        // (share страница обслуживается отдельным share.html)
        if (window.location.pathname.startsWith('/share/')) {
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
                        ${password.url ? `<a href="${this.escapeHtml(password.url)}" target="_blank" class="text-accent text-sm hover:underline flex items-center gap-1 mt-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                            ${this.escapeHtml(password.url)}
                        </a>` : ''}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="passwordManager.sharePassword('${password.id}')" 
                            class="bg-accent hover:opacity-90 p-2 rounded-lg transition-all" title="Share">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                            </svg>
                        </button>
                        <button onclick="passwordManager.editPassword('${password.id}')" 
                            class="bg-primary hover:bg-primary-dark p-2 rounded-lg transition-all" title="Edit">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="passwordManager.deletePassword('${password.id}')" 
                            class="bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-all" title="Delete">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="bg-bg-medium rounded-lg p-3 mb-3 flex items-center justify-between">
                    <code class="font-mono text-accent password-display">••••••••</code>
                    <div class="flex gap-2">
                        <button onclick="passwordManager.togglePasswordVisibility('${password.id}', this)" 
                            class="bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded transition-all text-sm flex items-center gap-1.5 font-medium">
                            <svg class="w-4 h-4 eye-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            <span class="btn-text">Show</span>
                        </button>
                        <button onclick="passwordManager.copyPassword('${password.id}')" 
                            class="bg-primary hover:bg-primary-dark px-3 py-1.5 rounded transition-all text-sm flex items-center gap-1.5 font-medium">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                            Copy
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
        const btnText = button.querySelector('.btn-text');
        const eyeIcon = button.querySelector('.eye-icon');
        
        if (codeElement.textContent === '••••••••') {
            codeElement.textContent = password.password;
            btnText.textContent = 'Hide';
            eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>';
        } else {
            codeElement.textContent = '••••••••';
            btnText.textContent = 'Show';
            eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
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
                    url: password.url || '',
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
            try {
                await this.loadSharedPassword(token);
            } catch (error) {
                console.error('Error in checkSharePage:', error);
                // Ensure we always show something even if there's an unexpected error
                this.showSharePage(null, 'An unexpected error occurred. Please try again.');
            }
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
            // Encode the token to handle special characters (base64 may contain +, /, =)
            const encodedToken = encodeURIComponent(token);
            const response = await fetch(`${this.apiBaseUrl}/share/${encodedToken}`);
            
            if (!response.ok) {
                if (response.status === 410) {
                    try {
                        const data = await response.json();
                        this.showSharePage(null, data.error || 'This share has already been viewed');
                    } catch (e) {
                        this.showSharePage(null, 'This share has already been viewed');
                    }
                } else if (response.status === 404) {
                    this.showSharePage(null, 'Share not found or has expired');
                } else {
                    this.showSharePage(null, 'Failed to load shared password');
                }
                return;
            }

            const data = await response.json();
            console.log('Received share data:', data);
            
            // Validate received data
            if (!data || !data.password) {
                this.showSharePage(null, 'Invalid share data received');
                return;
            }
            
            // Пароль приходит напрямую, без шифрования
            this.showSharePage({
                serviceName: data.service_name || 'Unknown Service',
                username: data.username || 'Unknown',
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
        // Use inline styles to ensure they work with dynamically injected HTML
        // (Tailwind CDN doesn't process dynamically added classes with custom config)
        const styles = {
            bgDark: 'background-color: #1A1A2E',
            bgMedium: 'background-color: #252541',
            textPrimary: 'color: #A78BFA',
            textAccent: 'color: #C084FC',
            textWhite: 'color: white',
            textGray: 'color: #9CA3AF',
            borderMedium: 'border-color: #252541',
        };
        
        document.body.innerHTML = `
            <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div style="${styles.bgDark}; border-radius: 0.75rem; padding: 2rem; max-width: 28rem; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid #252541;">
                    <h1 style="font-size: 1.875rem; font-weight: bold; margin-bottom: 1.5rem; text-align: center; ${styles.textPrimary}">
                        🔐 Shared Password
                    </h1>

                    ${errorMessage ? `
                        <div style="background-color: rgba(127, 29, 29, 0.3); border: 1px solid #b91c1c; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
                            <p style="color: #fca5a5;">❌ ${this.escapeHtml(errorMessage)}</p>
                        </div>
                        <a href="/" style="display: block; text-align: center; background-color: #7C3AED; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; ${styles.textWhite}; text-decoration: none;">
                            Go to Password Manager
                        </a>
                    ` : `
                        <div style="background-color: rgba(20, 83, 45, 0.3); border: 1px solid #15803d; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem;">
                            <p style="color: #86efac;">✓ Password retrieved successfully!</p>
                        </div>

                        <div style="margin-bottom: 1.5rem;">
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; font-size: 0.875rem; font-weight: 500; ${styles.textGray}; margin-bottom: 0.5rem;">Service</label>
                                <div style="${styles.bgMedium}; border-radius: 0.5rem; padding: 0.75rem; ${styles.textWhite}">${this.escapeHtml(shareData.serviceName)}</div>
                            </div>
                            
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; font-size: 0.875rem; font-weight: 500; ${styles.textGray}; margin-bottom: 0.5rem;">Username</label>
                                <div style="${styles.bgMedium}; border-radius: 0.5rem; padding: 0.75rem; ${styles.textWhite}">${this.escapeHtml(shareData.username)}</div>
                            </div>
                            
                            <div>
                                <label style="display: block; font-size: 0.875rem; font-weight: 500; ${styles.textGray}; margin-bottom: 0.5rem;">Password</label>
                                <div style="${styles.bgMedium}; border-radius: 0.5rem; padding: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
                                    <code style="font-family: monospace; ${styles.textAccent}">${this.escapeHtml(shareData.password)}</code>
                                    <button onclick="navigator.clipboard.writeText('${this.escapeHtml(shareData.password).replace(/'/g, "\\'")}').then(() => alert('Copied!'))" 
                                        style="background-color: #7C3AED; padding: 0.5rem 1rem; border-radius: 0.5rem; ${styles.textWhite}; border: none; cursor: pointer; margin-left: 0.5rem;">
                                        📋 Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style="background-color: rgba(113, 63, 18, 0.2); border: 1px solid #a16207; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem;">
                            <p style="color: #fde047; font-size: 0.875rem;">
                                ⚠️ <strong>Security Notice:</strong><br>
                                • This link has been destroyed and can no longer be accessed<br>
                                • Make sure to save the password securely<br>
                                • Shared at: ${shareData.createdAt ? new Date(shareData.createdAt).toLocaleString() : 'Unknown'}
                            </p>
                        </div>

                        <a href="/" style="display: block; text-align: center; background-color: #7C3AED; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; ${styles.textWhite}; text-decoration: none;">
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
        if (text === null || text === undefined) {
            return '';
        }
        const str = String(text);
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return str.replace(/[&<>"']/g, m => map[m]);
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

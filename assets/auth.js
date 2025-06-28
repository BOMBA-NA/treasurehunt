// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initializeAuth();
    }

    initializeAuth() {
        // Check if user is already logged in
        const savedUser = storageManager.getCurrentUser();
        if (savedUser) {
            this.currentUser = savedUser;
        }
    }

    async register(userData) {
        try {
            const { username, password, confirmPassword, avatarFile } = userData;

            // Validation
            if (!Utils.isValidUsername(username)) {
                throw new Error('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
            }

            if (!Utils.isValidPassword(password)) {
                throw new Error('Password must be at least 6 characters long');
            }

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (!avatarFile) {
                throw new Error('Profile picture is required');
            }

            // Check if username already exists
            const existingUser = storageManager.getUserByUsername(username);
            if (existingUser) {
                throw new Error('Username already exists');
            }

            // Process avatar
            const avatarBase64 = await Utils.resizeImage(avatarFile, 200, 200, 0.8);

            // Create new user
            const newUser = {
                id: Utils.generateId(),
                username: username,
                password: password, // In real app, hash this
                avatar: avatarBase64,
                balance: storageManager.getGameSettings().defaultBalance,
                isAdmin: false,
                createdAt: Date.now(),
                stats: {
                    gamesPlayed: 0,
                    gamesWon: 0,
                    totalWinnings: 0
                }
            };

            // Save user
            const users = storageManager.getUsers();
            users.push(newUser);
            storageManager.setUsers(users);

            Utils.showNotification('Registration successful! Welcome to Treasure Hunt!', 'success');
            return { success: true, user: newUser };

        } catch (error) {
            Utils.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    async login(username, password) {
        try {
            if (!username || !password) {
                throw new Error('Please enter both username and password');
            }

            const user = storageManager.getUserByUsername(username);
            if (!user) {
                throw new Error('Invalid username or password');
            }

            // In real app, compare hashed passwords
            if (user.password !== password) {
                throw new Error('Invalid username or password');
            }

            // Set current user
            this.currentUser = user;
            storageManager.setCurrentUser(user);

            Utils.showNotification(`Welcome back, ${user.username}!`, 'success');
            return { success: true, user: user };

        } catch (error) {
            Utils.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    logout() {
        this.currentUser = null;
        storageManager.setCurrentUser(null);
        Utils.showNotification('Logged out successfully', 'info');
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.isAdmin;
    }

    async updateProfile(updateData) {
        try {
            if (!this.currentUser) {
                throw new Error('Not logged in');
            }

            const { username, password, confirmPassword, avatarFile } = updateData;

            // Validate username if changed
            if (username && username !== this.currentUser.username) {
                if (!Utils.isValidUsername(username)) {
                    throw new Error('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
                }

                const existingUser = storageManager.getUserByUsername(username);
                if (existingUser && existingUser.id !== this.currentUser.id) {
                    throw new Error('Username already exists');
                }
            }

            // Validate password if provided
            if (password) {
                if (!Utils.isValidPassword(password)) {
                    throw new Error('Password must be at least 6 characters long');
                }

                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
            }

            // Prepare update object
            const updates = {};
            
            if (username && username !== this.currentUser.username) {
                updates.username = username;
            }

            if (password) {
                updates.password = password; // In real app, hash this
            }

            if (avatarFile) {
                updates.avatar = await Utils.resizeImage(avatarFile, 200, 200, 0.8);
            }

            // Update user
            if (Object.keys(updates).length > 0) {
                const updatedUser = storageManager.updateUser(this.currentUser.id, updates);
                this.currentUser = updatedUser;
                Utils.showNotification('Profile updated successfully!', 'success');
                return { success: true, user: updatedUser };
            }

            return { success: true, user: this.currentUser };

        } catch (error) {
            Utils.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    updateBalance(amount) {
        if (!this.currentUser) return false;

        const newBalance = Math.max(0, this.currentUser.balance + amount);
        const updatedUser = storageManager.updateUser(this.currentUser.id, { balance: newBalance });
        
        if (updatedUser) {
            this.currentUser = updatedUser;
            return true;
        }
        
        return false;
    }

    canAffordBet(amount) {
        return this.currentUser && this.currentUser.balance >= amount;
    }

    updateStats(statsUpdate) {
        if (!this.currentUser) return false;

        const updatedStats = storageManager.updateUserStats(this.currentUser.id, statsUpdate);
        if (updatedStats) {
            this.currentUser.stats = updatedStats;
            return true;
        }
        
        return false;
    }
}

// Global auth manager instance
window.authManager = new AuthManager();

// Auth form handlers
document.addEventListener('DOMContentLoaded', function() {
    // Switch between login and register tabs
    window.switchTab = function(tab) {
        soundManager.playButton();
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${tab}-form`).classList.add('active');
    };

    // Login form handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;

            const result = await authManager.login(username, password);
            if (result.success) {
                soundManager.playWin();
                showPage('home');
            } else {
                soundManager.playLose();
            }
        });
    }

    // Register form handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('register-username').value.trim();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm').value;
            const avatarFile = document.getElementById('register-avatar').files[0];

            const result = await authManager.register({
                username,
                password,
                confirmPassword,
                avatarFile
            });

            if (result.success) {
                soundManager.playWin();
                // Auto-login after successful registration
                await authManager.login(username, password);
                showPage('home');
            } else {
                soundManager.playLose();
            }
        });
    }

    // Avatar preview for registration
    const avatarInput = document.getElementById('register-avatar');
    if (avatarInput) {
        avatarInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                try {
                    const preview = document.getElementById('avatar-preview');
                    const resizedImage = await Utils.resizeImage(file, 100, 100, 0.8);
                    preview.innerHTML = `<img src="${resizedImage}" alt="Avatar Preview">`;
                } catch (error) {
                    Utils.showNotification('Failed to process image', 'error');
                }
            }
        });
    }

    // Profile form handler
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('profile-username').value.trim();
            const password = document.getElementById('profile-password').value;
            const confirmPassword = document.getElementById('profile-confirm').value;
            const avatarFile = document.getElementById('new-avatar').files[0];

            const result = await authManager.updateProfile({
                username,
                password,
                confirmPassword,
                avatarFile
            });

            if (result.success) {
                soundManager.playWin();
                updateUserInterface();
            } else {
                soundManager.playLose();
            }
        });
    }

    // New avatar handler
    const newAvatarInput = document.getElementById('new-avatar');
    if (newAvatarInput) {
        newAvatarInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                try {
                    const resizedImage = await Utils.resizeImage(file, 200, 200, 0.8);
                    document.getElementById('profile-avatar').src = resizedImage;
                } catch (error) {
                    Utils.showNotification('Failed to process image', 'error');
                }
            }
        });
    }
});

// Logout function
window.logout = function() {
    soundManager.playButton();
    authManager.logout();
    showPage('auth');
};


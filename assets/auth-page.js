// Authentication Page Controller
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize storage manager first
    window.storageManager = new StorageManager();
    await storageManager.initializeStorage();

    // Initialize sound manager
    window.soundManager = new SoundManager();
    await soundManager.initializeAudio();

    // Initialize auth manager
    window.authManager = new AuthManager();
    authManager.initializeAuth();

    // Check if user is already logged in
    const currentUser = authManager.getCurrentUser();
    if (currentUser) {
        // Redirect to home page if already logged in
        window.location.href = 'home.html';
        return;
    }

    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }, 1000);

    // Switch between login and register tabs
    window.switchTab = function(tab) {
        if (window.soundManager) {
            soundManager.playButton();
        }
        
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
                if (window.soundManager) {
                    soundManager.playWin();
                }
                // Redirect to home page
                window.location.href = 'home.html';
            } else {
                if (window.soundManager) {
                    soundManager.playLose();
                }
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
                if (window.soundManager) {
                    soundManager.playWin();
                }
                // Auto-login after successful registration
                await authManager.login(username, password);
                window.location.href = 'home.html';
            } else {
                if (window.soundManager) {
                    soundManager.playLose();
                }
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

    // Modal functions
    window.closeModal = function() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.style.display = 'none';
        }
    };

    // Handle modal close on background click
    document.addEventListener('click', (event) => {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            closeModal();
        }
    });

    // Handle escape key for modal
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
});

// Main Application Controller
class App {
    constructor() {
        this.currentPage = 'auth';
        this.isInitialized = false;
        this.loadingComplete = false;
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize all managers
            await this.initializeManagers();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Check authentication state
            this.checkAuthState();
            
            // Hide loading screen and show appropriate page
            await this.completeInitialization();
            
            this.isInitialized = true;
            console.log('Treasure Hunt application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            Utils.showNotification('Failed to initialize application', 'error');
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    async initializeManagers() {
        // Storage manager is already initialized globally
        // Auth manager is already initialized globally
        // Game manager is already initialized globally
        // Admin manager is already initialized globally
        // Sound manager is already initialized globally
        
        // Give managers time to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    setupEventListeners() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.showPage(event.state.page, false);
            }
        });

        // Handle clicks on navigation links
        document.addEventListener('click', (event) => {
            const link = event.target.closest('.nav-link');
            if (link && link.onclick) {
                event.preventDefault();
            }
        });

        // Handle modal close events
        document.addEventListener('click', (event) => {
            const modal = document.getElementById('modal');
            if (event.target === modal) {
                this.closeModal();
            }
        });

        // Handle escape key for modal
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeModal();
            }
        });

        // Update interface when storage changes
        window.addEventListener('storage', () => {
            this.updateUserInterface();
        });
    }

    checkAuthState() {
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
            this.currentPage = 'home';
        } else {
            this.currentPage = 'auth';
        }
    }

    async completeInitialization() {
        // Simulate loading time for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('animate-fadeOut');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                loadingScreen.classList.remove('animate-fadeOut');
            }, 400);
        }

        // Show appropriate page
        this.showPage(this.currentPage, false);
        this.loadingComplete = true;
    }

    showPage(pageName, addToHistory = true) {
        if (!this.loadingComplete && pageName !== 'auth') {
            return;
        }

        soundManager.playButton();

        // Hide all pages
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active', 'animate-fadeIn');
            setTimeout(() => {
                targetPage.classList.remove('animate-fadeIn');
            }, 400);
        }

        // Update navigation
        this.updateNavigation(pageName);

        // Update page-specific content
        this.updatePageContent(pageName);

        // Update browser history
        if (addToHistory) {
            history.pushState({ page: pageName }, '', `#${pageName}`);
        }

        this.currentPage = pageName;
    }

    updateNavigation(pageName) {
        const navbar = document.getElementById('navbar');
        const currentUser = authManager.getCurrentUser();

        if (currentUser && pageName !== 'auth') {
            navbar.classList.remove('hidden');
            
            // Update active nav link
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('onclick')?.includes(pageName)) {
                    link.classList.add('active');
                }
            });

            // Show/hide admin link
            const adminLink = document.querySelector('.nav-link[onclick*="admin"]');
            if (adminLink) {
                adminLink.style.display = currentUser.isAdmin ? 'flex' : 'none';
            }
        } else {
            navbar.classList.add('hidden');
        }
    }

    updatePageContent(pageName) {
        switch (pageName) {
            case 'home':
                this.updateHomePage();
                break;
            case 'leaderboard':
                this.updateLeaderboard();
                break;
            case 'profile':
                this.updateProfilePage();
                break;
            case 'admin':
                this.updateAdminPage();
                break;
            case 'game':
                this.updateGamePage();
                break;
        }
    }

    updateHomePage() {
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return;

        // Update user avatar
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.src = currentUser.avatar;
        }

        // Update user name
        const userName = document.getElementById('user-name');
        if (userName) {
            userName.textContent = `Welcome, ${currentUser.username}!`;
        }

        // Update balance
        const userBalance = document.getElementById('user-balance');
        if (userBalance) {
            userBalance.textContent = Utils.formatCurrency(currentUser.balance);
        }

        // Update stats
        const stats = currentUser.stats || { gamesPlayed: 0, gamesWon: 0, totalWinnings: 0 };
        
        const gamesPlayedElement = document.getElementById('games-played');
        if (gamesPlayedElement) {
            gamesPlayedElement.textContent = stats.gamesPlayed;
        }

        const gamesWonElement = document.getElementById('games-won');
        if (gamesWonElement) {
            gamesWonElement.textContent = stats.gamesWon;
        }

        const winRateElement = document.getElementById('win-rate');
        if (winRateElement) {
            const winRate = stats.gamesPlayed > 0 ? 
                Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
            winRateElement.textContent = `${winRate}%`;
        }
    }

    updateLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;

        const leaderboard = storageManager.getLeaderboard(10);

        if (leaderboard.length === 0) {
            leaderboardList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-trophy"></i>
                    <h3>No players yet</h3>
                    <p>Be the first to play and claim the top spot!</p>
                </div>
            `;
            return;
        }

        leaderboardList.innerHTML = leaderboard.map((player, index) => {
            const rank = index + 1;
            let rankClass = '';
            let rankIcon = '';

            if (rank === 1) {
                rankClass = 'gold';
                rankIcon = '<i class="fas fa-crown"></i>';
            } else if (rank === 2) {
                rankClass = 'silver';
                rankIcon = '<i class="fas fa-medal"></i>';
            } else if (rank === 3) {
                rankClass = 'bronze';
                rankIcon = '<i class="fas fa-medal"></i>';
            }

            return `
                <div class="leaderboard-item animate-slideInLeft" style="animation-delay: ${index * 0.1}s">
                    <div class="rank ${rankClass}">
                        ${rankIcon || rank}
                    </div>
                    <div class="player-info">
                        <img class="player-avatar" src="${player.avatar}" alt="${player.username}">
                        <span class="player-name">${Utils.sanitizeHTML(player.username)}</span>
                    </div>
                    <div class="player-balance">
                        ${Utils.formatCurrency(player.balance)} coins
                    </div>
                </div>
            `;
        }).join('');
    }

    updateProfilePage() {
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return;

        // Update profile avatar
        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar) {
            profileAvatar.src = currentUser.avatar;
        }

        // Update profile form
        const profileUsername = document.getElementById('profile-username');
        if (profileUsername) {
            profileUsername.value = currentUser.username;
        }

        // Clear password fields
        const profilePassword = document.getElementById('profile-password');
        const profileConfirm = document.getElementById('profile-confirm');
        if (profilePassword) profilePassword.value = '';
        if (profileConfirm) profileConfirm.value = '';
    }

    updateAdminPage() {
        if (!authManager.isAdmin()) {
            this.showPage('home');
            Utils.showNotification('Access denied', 'error');
            return;
        }

        adminManager.refreshUsersList();
        adminManager.loadGameSettings();
    }

    updateGamePage() {
        gameManager.updateGameBalance();
        gameManager.updateGameInterface();
    }

    updateUserInterface() {
        const currentUser = authManager.getCurrentUser();
        
        if (!currentUser) {
            this.showPage('auth');
            return;
        }

        // Update all balance displays
        const balanceElements = document.querySelectorAll('[id$="balance"]');
        balanceElements.forEach(element => {
            if (element.id === 'user-balance' || element.id === 'game-balance') {
                element.textContent = Utils.formatCurrency(currentUser.balance);
            }
        });

        // Update user name displays
        const nameElements = document.querySelectorAll('[id$="name"]');
        nameElements.forEach(element => {
            if (element.id === 'user-name') {
                element.textContent = `Welcome, ${currentUser.username}!`;
            }
        });

        // Update avatar displays
        const avatarElements = document.querySelectorAll('[id*="avatar"]');
        avatarElements.forEach(element => {
            if (element.tagName === 'IMG') {
                element.src = currentUser.avatar;
            }
        });

        // Update current page content
        this.updatePageContent(this.currentPage);
    }

    showModal(title, content, buttons = []) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalBody) return;

        let modalContent = '';
        
        if (title) {
            modalContent += `<h3>${Utils.sanitizeHTML(title)}</h3>`;
        }
        
        modalContent += `<div class="modal-text">${content}</div>`;
        
        if (buttons.length > 0) {
            modalContent += '<div class="modal-buttons">';
            buttons.forEach(button => {
                modalContent += `<button class="btn ${button.class || 'btn-primary'}" onclick="${button.onclick}">${button.text}</button>`;
            });
            modalContent += '</div>';
        }
        
        modalBody.innerHTML = modalContent;
        modal.style.display = 'block';
        modal.classList.add('animate-fadeIn');
    }

    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.add('animate-fadeOut');
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('animate-fadeIn', 'animate-fadeOut');
            }, 300);
        }
    }

    // Error handling
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        Utils.showNotification(`An error occurred${context ? ' in ' + context : ''}`, 'error');
    }

    // Utility methods for global access
    getCurrentPage() {
        return this.currentPage;
    }

    isInitialized() {
        return this.isInitialized;
    }
}

// Global app instance
window.app = new App();

// Global functions for page navigation
window.showPage = function(pageName) {
    if (window.app) {
        window.app.showPage(pageName);
    }
};

window.updateUserInterface = function() {
    if (window.app) {
        window.app.updateUserInterface();
    }
};

window.updateLeaderboard = function() {
    if (window.app) {
        window.app.updateLeaderboard();
    }
};

window.showModal = function(title, content, buttons) {
    if (window.app) {
        window.app.showModal(title, content, buttons);
    }
};

window.closeModal = function() {
    if (window.app) {
        window.app.closeModal();
    }
};

// Handle page load and initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Treasure Hunt game...');
    
    // Add some CSS for missing styles
    const style = document.createElement('style');
    style.textContent = `
        .no-data {
            text-align: center;
            padding: 3rem;
            color: #666;
        }
        
        .no-data i {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: #ddd;
        }
        
        .no-data h3 {
            margin-bottom: 0.5rem;
            color: #888;
        }
        
        .modal-text {
            margin: 1rem 0;
            line-height: 1.6;
        }
        
        .modal-buttons {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 2rem;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .no-users {
            text-align: center;
            padding: 2rem;
            color: #666;
            font-style: italic;
        }
        
        @media (max-width: 768px) {
            .modal-buttons {
                flex-direction: column;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Set up global error handler
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
        if (window.app) {
            window.app.handleError(event.error, 'global');
        }
    });
    
    // Set up unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        if (window.app) {
            window.app.handleError(event.reason, 'promise');
        }
    });
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}


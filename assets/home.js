// Home Page Controller
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

    // Check authentication
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Show/hide admin link
    const adminLink = document.querySelector('.admin-only');
    if (adminLink) {
        adminLink.style.display = currentUser.isAdmin ? 'flex' : 'none';
    }

    // Update user interface
    updateHomePage();

    // Set up daily bonus
    checkDailyBonus();

    // Load achievements
    loadAchievements();

    function updateHomePage() {
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

        // Update level
        const userLevel = document.getElementById('user-level');
        if (userLevel) {
            const level = calculateUserLevel(currentUser.stats?.gamesPlayed || 0);
            userLevel.textContent = level;
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

        const totalWinningsElement = document.getElementById('total-winnings');
        if (totalWinningsElement) {
            totalWinningsElement.textContent = Utils.formatCurrency(stats.totalWinnings || 0);
        }
    }

    function calculateUserLevel(gamesPlayed) {
        if (gamesPlayed < 10) return 1;
        if (gamesPlayed < 25) return 2;
        if (gamesPlayed < 50) return 3;
        if (gamesPlayed < 100) return 4;
        if (gamesPlayed < 200) return 5;
        return Math.min(10, Math.floor(gamesPlayed / 100) + 5);
    }

    function checkDailyBonus() {
        const lastBonus = Utils.getStorage('lastDailyBonus', 0);
        const today = new Date().toDateString();
        const lastBonusDate = new Date(lastBonus).toDateString();

        if (today !== lastBonusDate) {
            // Show daily bonus notification
            setTimeout(() => {
                Utils.showNotification('Daily bonus available! Click the gift button to claim.', 'info', 5000);
            }, 2000);
        }
    }

    function loadAchievements() {
        const achievementsList = document.getElementById('achievements-list');
        if (!achievementsList) return;

        const achievements = getRecentAchievements();
        
        if (achievements.length === 0) {
            achievementsList.innerHTML = `
                <div class="no-achievements">
                    <i class="fas fa-medal"></i>
                    <p>No achievements yet. Start playing to earn them!</p>
                </div>
            `;
            return;
        }

        achievementsList.innerHTML = achievements.map(achievement => `
            <div class="achievement-item">
                <i class="fas fa-${achievement.icon}"></i>
                <div class="achievement-info">
                    <h4>${achievement.title}</h4>
                    <p>${achievement.description}</p>
                    <small>${Utils.formatDate(achievement.date)}</small>
                </div>
            </div>
        `).join('');
    }

    function getRecentAchievements() {
        const stats = currentUser.stats || {};
        const achievements = [];

        // First game achievement
        if (stats.gamesPlayed >= 1) {
            achievements.push({
                icon: 'play',
                title: 'First Adventure',
                description: 'Played your first treasure hunt game',
                date: currentUser.createdAt
            });
        }

        // First win achievement
        if (stats.gamesWon >= 1) {
            achievements.push({
                icon: 'trophy',
                title: 'First Victory',
                description: 'Won your first treasure hunt game',
                date: currentUser.createdAt
            });
        }

        // Level achievements
        const level = calculateUserLevel(stats.gamesPlayed);
        if (level >= 2) {
            achievements.push({
                icon: 'star',
                title: `Level ${level} Hunter`,
                description: `Reached level ${level}`,
                date: Date.now()
            });
        }

        return achievements.slice(-3); // Show last 3 achievements
    }

    // Global functions
    window.showDailyBonus = function() {
        const lastBonus = Utils.getStorage('lastDailyBonus', 0);
        const today = new Date().toDateString();
        const lastBonusDate = new Date(lastBonus).toDateString();

        if (today === lastBonusDate) {
            Utils.showNotification('Daily bonus already claimed today!', 'warning');
            return;
        }

        const bonusAmount = 100;
        authManager.updateBalance(bonusAmount);
        Utils.setStorage('lastDailyBonus', Date.now());
        
        soundManager.playCoin();
        Utils.showNotification(`Daily bonus claimed! +${bonusAmount} coins`, 'success');
        
        // Update balance display
        updateHomePage();
    };

    window.logout = function() {
        soundManager.playButton();
        authManager.logout();
        window.location.href = 'index.html';
    };
});

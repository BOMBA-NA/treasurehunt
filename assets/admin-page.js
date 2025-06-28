// Admin Page Extended Controller
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

    // Initialize admin manager
    window.adminManager = new AdminManager();
    adminManager.initializeAdmin();

    // Check authentication and admin privileges
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) {
        window.location.href = 'main.html';
        return;
    }

    if (!currentUser.isAdmin) {
        window.location.href = 'home.html';
        Utils.showNotification('Access denied', 'error');
        return;
    }

    // Initialize admin dashboard
    loadDashboard();
    loadRecentActivity();

    function loadDashboard() {
        const users = storageManager.getUsers().filter(user => !user.isAdmin);
        const totalUsers = users.length;
        const totalGames = users.reduce((sum, user) => sum + (user.stats?.gamesPlayed || 0), 0);
        const totalCoins = users.reduce((sum, user) => sum + user.balance, 0);
        const totalWins = users.reduce((sum, user) => sum + (user.stats?.gamesWon || 0), 0);
        const avgWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

        // Update dashboard cards
        updateDashboardCard('total-users-count', totalUsers);
        updateDashboardCard('total-games-count', Utils.formatCurrency(totalGames));
        updateDashboardCard('total-coins-count', Utils.formatCurrency(totalCoins));
        updateDashboardCard('avg-win-rate', `${avgWinRate}%`);
    }

    function updateDashboardCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    function loadRecentActivity() {
        const activityList = document.getElementById('recent-activity-list');
        if (!activityList) return;

        // Get recent game history
        const gameHistory = Utils.getStorage('gameHistory', []);
        const recentGames = gameHistory.slice(-10).reverse();

        if (recentGames.length === 0) {
            activityList.innerHTML = `
                <div class="no-activity">
                    <i class="fas fa-clock"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        activityList.innerHTML = recentGames.map(game => {
            const user = storageManager.getUserById(game.userId);
            const username = user ? user.username : 'Unknown User';
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${game.result}">
                        <i class="fas fa-${game.result === 'won' ? 'trophy' : 'times'}"></i>
                    </div>
                    <div class="activity-details">
                        <span class="activity-user">${Utils.sanitizeHTML(username)}</span>
                        <span class="activity-action">
                            ${game.result === 'won' ? 'won' : 'lost'} ${Utils.formatCurrency(Math.abs(game.winnings))}
                        </span>
                        <span class="activity-time">${Utils.formatDate(game.date, { timeStyle: 'short' })}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Enhanced admin functions
    window.addBonusToAll = function() {
        const bonusAmount = prompt('Enter bonus amount for all users:', '100');
        if (bonusAmount === null) return;

        const bonus = parseInt(bonusAmount);
        if (isNaN(bonus) || bonus <= 0) {
            Utils.showNotification('Invalid bonus amount', 'error');
            return;
        }

        const users = storageManager.getUsers().filter(user => !user.isAdmin);
        users.forEach(user => {
            storageManager.updateUser(user.id, { balance: user.balance + bonus });
        });

        Utils.showNotification(`Added ${Utils.formatCurrency(bonus)} bonus to ${users.length} users`, 'success');
        adminManager.refreshUsersList();
        loadDashboard();
    };

    window.exportUsers = function() {
        const users = storageManager.getUsers().filter(user => !user.isAdmin);
        
        const csvContent = [
            ['Username', 'Balance', 'Games Played', 'Games Won', 'Win Rate', 'Total Winnings', 'Join Date'],
            ...users.map(user => {
                const stats = user.stats || { gamesPlayed: 0, gamesWon: 0, totalWinnings: 0 };
                const winRate = stats.gamesPlayed > 0 ? 
                    Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
                
                return [
                    user.username,
                    user.balance,
                    stats.gamesPlayed,
                    stats.gamesWon,
                    `${winRate}%`,
                    stats.totalWinnings || 0,
                    Utils.formatDate(user.createdAt)
                ];
            })
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `treasure-hunt-users-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Utils.showNotification('Users data exported successfully', 'success');
    };

    window.searchUsers = function() {
        const searchTerm = document.getElementById('user-search')?.value.toLowerCase().trim();
        if (!searchTerm) {
            adminManager.refreshUsersList();
            return;
        }

        const users = adminManager.getAllUsers().filter(user => 
            user.username.toLowerCase().includes(searchTerm)
        );

        // Update users list with filtered results
        const usersList = document.getElementById('admin-users-list');
        if (usersList) {
            if (users.length === 0) {
                usersList.innerHTML = '<div class="no-users">No users found matching your search</div>';
            } else {
                usersList.innerHTML = users.map(user => `
                    <div class="user-item">
                        <div class="user-details">
                            <img class="user-avatar" src="${user.avatar}" alt="${user.username}">
                            <div class="user-info">
                                <div class="user-name">${Utils.sanitizeHTML(user.username)}</div>
                                <div class="user-stats">
                                    Balance: ${Utils.formatCurrency(user.balance)} |
                                    Games: ${user.stats?.gamesPlayed || 0} |
                                    Won: ${user.stats?.gamesWon || 0}
                                </div>
                            </div>
                        </div>
                        <div class="user-actions">
                            <button class="btn btn-sm btn-warning" onclick="adminManager.editUserBalance('${user.id}')">
                                <i class="fas fa-coins"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="adminManager.resetUserStats('${user.id}')">
                                <i class="fas fa-redo"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminManager.deleteUser('${user.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }
    };

    window.resetDailyBonuses = function() {
        if (confirm('Reset daily bonuses for all users? This will allow them to claim bonuses again.')) {
            Utils.setStorage('lastDailyBonus', 0);
            Utils.showNotification('Daily bonuses reset successfully', 'success');
        }
    };

    window.cleanupOldGames = function() {
        const gameHistory = Utils.getStorage('gameHistory', []);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const recentGames = gameHistory.filter(game => game.date > thirtyDaysAgo);
        
        Utils.setStorage('gameHistory', recentGames);
        Utils.showNotification(`Cleaned up ${gameHistory.length - recentGames.length} old games`, 'success');
    };

    window.optimizeStorage = function() {
        // Remove duplicate entries and optimize storage
        const keys = ['gameHistory', 'treasureHunt_users', 'treasureHunt_userStats'];
        let optimized = 0;

        keys.forEach(key => {
            const data = Utils.getStorage(key, null);
            if (data) {
                Utils.setStorage(key, data);
                optimized++;
            }
        });

        Utils.showNotification(`Optimized ${optimized} storage items`, 'success');
    };

    window.sendNotificationToAll = function() {
        const message = document.getElementById('notification-message')?.value.trim();
        const type = document.getElementById('notification-type')?.value || 'info';

        if (!message) {
            Utils.showNotification('Please enter a notification message', 'error');
            return;
        }

        // Store notification for all users to see on next login
        const notifications = Utils.getStorage('globalNotifications', []);
        notifications.push({
            id: Utils.generateId(),
            message: message,
            type: type,
            date: Date.now(),
            read: false
        });
        
        Utils.setStorage('globalNotifications', notifications);
        
        // Clear form
        document.getElementById('notification-message').value = '';
        
        Utils.showNotification('Notification sent to all users', 'success');
    };

    // Refresh dashboard periodically
    setInterval(() => {
        loadDashboard();
        loadRecentActivity();
    }, 30000); // Refresh every 30 seconds

    window.logout = function() {
        soundManager.playButton();
        authManager.logout();
        window.location.href = 'main.html';
    };
});

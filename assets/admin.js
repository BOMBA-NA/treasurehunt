// Admin Manager
class AdminManager {
    constructor() {
        this.initializeAdmin();
    }

    initializeAdmin() {
        // Admin-specific initialization
    }

    // User Management
    getAllUsers() {
        return storageManager.getUsers().filter(user => !user.isAdmin);
    }

    deleteUser(userId) {
        try {
            const user = storageManager.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (user.isAdmin) {
                throw new Error('Cannot delete admin user');
            }

            storageManager.deleteUser(userId);
            Utils.showNotification(`User ${user.username} deleted successfully`, 'success');
            this.refreshUsersList();
            return true;

        } catch (error) {
            Utils.showNotification(error.message, 'error');
            return false;
        }
    }

    updateUserBalance(userId, newBalance) {
        try {
            const user = storageManager.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (newBalance < 0) {
                throw new Error('Balance cannot be negative');
            }

            storageManager.updateUser(userId, { balance: newBalance });
            Utils.showNotification(`Updated ${user.username}'s balance to ${Utils.formatCurrency(newBalance)}`, 'success');
            this.refreshUsersList();
            return true;

        } catch (error) {
            Utils.showNotification(error.message, 'error');
            return false;
        }
    }

    resetUserStats(userId) {
        try {
            const user = storageManager.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const resetStats = {
                gamesPlayed: 0,
                gamesWon: 0,
                totalWinnings: 0
            };

            storageManager.updateUser(userId, { stats: resetStats });
            storageManager.updateUserStats(userId, resetStats);

            Utils.showNotification(`Reset ${user.username}'s statistics`, 'success');
            this.refreshUsersList();
            return true;

        } catch (error) {
            Utils.showNotification(error.message, 'error');
            return false;
        }
    }

    // Game Settings Management
    updateGameSettings(settings) {
        try {
            const currentSettings = storageManager.getGameSettings();
            const updatedSettings = { ...currentSettings, ...settings };

            // Validation
            if (updatedSettings.defaultBalance < 0) {
                throw new Error('Default balance cannot be negative');
            }

            if (updatedSettings.maxBet < 1) {
                throw new Error('Max bet must be at least 1');
            }

            if (updatedSettings.winMultiplier < 1) {
                throw new Error('Win multiplier must be at least 1.0');
            }

            storageManager.setGameSettings(updatedSettings);
            Utils.showNotification('Game settings updated successfully', 'success');
            return true;

        } catch (error) {
            Utils.showNotification(error.message, 'error');
            return false;
        }
    }

    getGameSettings() {
        return storageManager.getGameSettings();
    }

    // Statistics
    getSystemStats() {
        const users = this.getAllUsers();
        const totalUsers = users.length;
        const totalBalance = users.reduce((sum, user) => sum + user.balance, 0);
        const totalGamesPlayed = users.reduce((sum, user) => sum + (user.stats?.gamesPlayed || 0), 0);
        const totalGamesWon = users.reduce((sum, user) => sum + (user.stats?.gamesWon || 0), 0);
        const totalWinnings = users.reduce((sum, user) => sum + (user.stats?.totalWinnings || 0), 0);

        return {
            totalUsers,
            totalBalance,
            totalGamesPlayed,
            totalGamesWon,
            totalWinnings,
            averageBalance: totalUsers > 0 ? Math.floor(totalBalance / totalUsers) : 0,
            winRate: totalGamesPlayed > 0 ? Math.round((totalGamesWon / totalGamesPlayed) * 100) : 0
        };
    }

    // Data Management
    exportAllData() {
        try {
            const data = storageManager.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `treasure-hunt-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Utils.showNotification('Data exported successfully', 'success');
            return true;

        } catch (error) {
            Utils.showNotification('Failed to export data', 'error');
            return false;
        }
    }

    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const success = storageManager.importData(e.target.result);
                    if (success) {
                        Utils.showNotification('Data imported successfully', 'success');
                        this.refreshAllData();
                        resolve(true);
                    } else {
                        throw new Error('Invalid data format');
                    }
                } catch (error) {
                    Utils.showNotification('Failed to import data: ' + error.message, 'error');
                    reject(error);
                }
            };

            reader.onerror = () => {
                Utils.showNotification('Failed to read file', 'error');
                reject(new Error('File read error'));
            };

            reader.readAsText(file);
        });
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            storageManager.clearAllData();
            Utils.showNotification('All data cleared successfully', 'success');
            this.refreshAllData();
            return true;
        }
        return false;
    }

    // UI Management
    refreshUsersList() {
        const usersList = document.getElementById('admin-users-list');
        if (!usersList) return;

        const users = this.getAllUsers();
        
        if (users.length === 0) {
            usersList.innerHTML = '<div class="no-users">No users found</div>';
            return;
        }

        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-details">
                    <img class="user-avatar" src="${user.avatar}" alt="${user.username}">
                    <div class="user-info">
                        <div class="user-name">${Utils.sanitizeHTML(user.username)}</div>
                        <div class="user-stats">
                            Balance: ${Utils.formatCurrency(user.balance)} |
                            Games: ${user.stats?.gamesPlayed || 0} |
                            Won: ${user.stats?.gamesWon || 0} |
                            Win Rate: ${user.stats?.gamesPlayed > 0 ? Math.round((user.stats.gamesWon / user.stats.gamesPlayed) * 100) : 0}%
                        </div>
                        <div class="user-meta">
                            Joined: ${Utils.formatDate(user.createdAt)}
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

    editUserBalance(userId) {
        const user = storageManager.getUserById(userId);
        if (!user) return;

        const newBalance = prompt(`Enter new balance for ${user.username}:`, user.balance);
        if (newBalance !== null) {
            const balance = parseInt(newBalance);
            if (!isNaN(balance)) {
                this.updateUserBalance(userId, balance);
            } else {
                Utils.showNotification('Invalid balance amount', 'error');
            }
        }
    }

    loadGameSettings() {
        const settings = this.getGameSettings();
        if (!settings) return;

        const defaultBalanceInput = document.getElementById('default-balance');
        const maxBetInput = document.getElementById('max-bet');
        const winMultiplierInput = document.getElementById('win-multiplier');

        if (defaultBalanceInput) defaultBalanceInput.value = settings.defaultBalance;
        if (maxBetInput) maxBetInput.value = settings.maxBet;
        if (winMultiplierInput) winMultiplierInput.value = settings.winMultiplier;
    }

    refreshAllData() {
        this.refreshUsersList();
        this.loadGameSettings();
        
        // Refresh other parts of the application
        if (window.updateUserInterface) {
            window.updateUserInterface();
        }
        if (window.updateLeaderboard) {
            window.updateLeaderboard();
        }
    }
}

// Global admin manager instance
window.adminManager = new AdminManager();

// Admin panel functions
window.switchAdminTab = function(tab) {
    soundManager.playButton();
    
    // Update tab buttons
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Update sections
    document.querySelectorAll('.admin-section').forEach(section => section.classList.remove('active'));
    document.getElementById(`admin-${tab}`).classList.add('active');

    if (tab === 'users') {
        adminManager.refreshUsersList();
    } else if (tab === 'settings') {
        adminManager.loadGameSettings();
    }
};

window.saveGameSettings = function() {
    const defaultBalance = parseInt(document.getElementById('default-balance').value);
    const maxBet = parseInt(document.getElementById('max-bet').value);
    const winMultiplier = parseFloat(document.getElementById('win-multiplier').value);

    adminManager.updateGameSettings({
        defaultBalance,
        maxBet,
        winMultiplier
    });
};

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // File import handler
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    document.body.appendChild(importInput);

    importInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            try {
                await adminManager.importData(file);
            } catch (error) {
                console.error('Import failed:', error);
            }
        }
    });

    // Add admin controls to the admin page
    window.exportData = function() {
        adminManager.exportAllData();
    };

    window.importData = function() {
        importInput.click();
    };

    window.clearAllData = function() {
        adminManager.clearAllData();
    };
});


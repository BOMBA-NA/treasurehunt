// Local Storage Management
class StorageManager {
    constructor() {
        this.keys = {
            USERS: 'treasureHunt_users',
            CURRENT_USER: 'treasureHunt_currentUser',
            GAME_SETTINGS: 'treasureHunt_gameSettings',
            USER_STATS: 'treasureHunt_userStats'
        };
        this.initializeStorage();
    }

    initializeStorage() {
        // Initialize users if not exists
        if (!this.getUsers()) {
            this.setUsers([]);
        }

        // Initialize game settings
        if (!this.getGameSettings()) {
            this.setGameSettings({
                defaultBalance: 1000,
                maxBet: 500,
                winMultiplier: 2.0
            });
        }

        // Create admin user if not exists
        this.createAdminUser();
    }

    createAdminUser() {
        const users = this.getUsers();
        const adminExists = users.find(user => user.username === 'administrator');
        
        if (!adminExists) {
            const adminUser = {
                id: 'admin_' + Date.now(),
                username: 'administrator',
                password: 'administrator', // In real app, this would be hashed
                avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiMzNDk4ZGIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMjUgNzVjMC0xMy44IDExLjItMjUgMjUtMjVzMjUgMTEuMiAyNSAyNXYxMEgyNXYtMTB6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
                balance: 999999,
                isAdmin: true,
                createdAt: Date.now(),
                stats: {
                    gamesPlayed: 0,
                    gamesWon: 0,
                    totalWinnings: 0
                }
            };
            users.push(adminUser);
            this.setUsers(users);
        }
    }

    // User Management
    getUsers() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.USERS)) || [];
        } catch (e) {
            return [];
        }
    }

    setUsers(users) {
        localStorage.setItem(this.keys.USERS, JSON.stringify(users));
    }

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.CURRENT_USER));
        } catch (e) {
            return null;
        }
    }

    setCurrentUser(user) {
        localStorage.setItem(this.keys.CURRENT_USER, JSON.stringify(user));
    }

    getUserById(id) {
        const users = this.getUsers();
        return users.find(user => user.id === id);
    }

    getUserByUsername(username) {
        const users = this.getUsers();
        return users.find(user => user.username === username);
    }

    updateUser(userId, updatedData) {
        const users = this.getUsers();
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updatedData };
            this.setUsers(users);
            
            // Update current user if it's the same user
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                this.setCurrentUser(users[userIndex]);
            }
            
            return users[userIndex];
        }
        return null;
    }

    deleteUser(userId) {
        const users = this.getUsers();
        const filteredUsers = users.filter(user => user.id !== userId);
        this.setUsers(filteredUsers);
    }

    // Game Settings
    getGameSettings() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.GAME_SETTINGS));
        } catch (e) {
            return null;
        }
    }

    setGameSettings(settings) {
        localStorage.setItem(this.keys.GAME_SETTINGS, JSON.stringify(settings));
    }

    // User Stats
    getUserStats(userId) {
        try {
            const stats = JSON.parse(localStorage.getItem(this.keys.USER_STATS)) || {};
            return stats[userId] || {
                gamesPlayed: 0,
                gamesWon: 0,
                totalWinnings: 0
            };
        } catch (e) {
            return {
                gamesPlayed: 0,
                gamesWon: 0,
                totalWinnings: 0
            };
        }
    }

    updateUserStats(userId, statsUpdate) {
        try {
            const allStats = JSON.parse(localStorage.getItem(this.keys.USER_STATS)) || {};
            const userStats = allStats[userId] || {
                gamesPlayed: 0,
                gamesWon: 0,
                totalWinnings: 0
            };
            
            // Update stats
            Object.keys(statsUpdate).forEach(key => {
                if (typeof statsUpdate[key] === 'number') {
                    userStats[key] += statsUpdate[key];
                } else {
                    userStats[key] = statsUpdate[key];
                }
            });
            
            allStats[userId] = userStats;
            localStorage.setItem(this.keys.USER_STATS, JSON.stringify(allStats));
            
            // Also update user object
            this.updateUser(userId, { stats: userStats });
            
            return userStats;
        } catch (e) {
            console.error('Error updating user stats:', e);
            return null;
        }
    }

    // Utility Methods
    clearAllData() {
        Object.values(this.keys).forEach(key => {
            localStorage.removeItem(key);
        });
        this.initializeStorage();
    }

    exportData() {
        const data = {};
        Object.values(this.keys).forEach(key => {
            data[key] = localStorage.getItem(key);
        });
        return JSON.stringify(data, null, 2);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            Object.keys(data).forEach(key => {
                if (data[key]) {
                    localStorage.setItem(key, data[key]);
                }
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    // Leaderboard
    getLeaderboard(limit = 10) {
        const users = this.getUsers();
        return users
            .filter(user => !user.isAdmin) // Exclude admin from leaderboard
            .sort((a, b) => b.balance - a.balance)
            .slice(0, limit);
    }
}

// Global storage instance
window.storageManager = new StorageManager();


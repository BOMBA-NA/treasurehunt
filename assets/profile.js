// Profile Page Controller
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

    // Initialize profile page
    loadProfileData();
    loadAchievements();
    loadGameHistory();
    setupSettings();

    function loadProfileData() {
        // Update profile avatar
        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar) {
            profileAvatar.src = currentUser.avatar;
        }

        // Update display name
        const displayName = document.getElementById('profile-display-name');
        if (displayName) {
            displayName.textContent = currentUser.username;
        }

        // Update join date
        const joinDate = document.getElementById('join-date');
        if (joinDate) {
            joinDate.textContent = Utils.formatDate(currentUser.createdAt, { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }

        // Update level
        const profileLevel = document.getElementById('profile-level');
        if (profileLevel) {
            const level = calculateUserLevel(currentUser.stats?.gamesPlayed || 0);
            profileLevel.textContent = level;
        }

        // Update profile form
        const profileUsername = document.getElementById('profile-username');
        if (profileUsername) {
            profileUsername.value = currentUser.username;
        }

        // Update statistics
        const stats = currentUser.stats || { 
            gamesPlayed: 0, 
            gamesWon: 0, 
            totalWinnings: 0,
            bestStreak: 0
        };

        const statElements = {
            'stat-balance': currentUser.balance,
            'stat-games-played': stats.gamesPlayed,
            'stat-games-won': stats.gamesWon,
            'stat-win-rate': stats.gamesPlayed > 0 ? 
                Math.round((stats.gamesWon / stats.gamesPlayed) * 100) + '%' : '0%',
            'stat-total-winnings': stats.totalWinnings || 0,
            'stat-best-streak': stats.bestStreak || 0
        };

        Object.entries(statElements).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                if (elementId.includes('balance') || elementId.includes('winnings')) {
                    element.textContent = Utils.formatCurrency(value);
                } else {
                    element.textContent = value;
                }
            }
        });
    }

    function calculateUserLevel(gamesPlayed) {
        if (gamesPlayed < 10) return 1;
        if (gamesPlayed < 25) return 2;
        if (gamesPlayed < 50) return 3;
        if (gamesPlayed < 100) return 4;
        if (gamesPlayed < 200) return 5;
        return Math.min(10, Math.floor(gamesPlayed / 100) + 5);
    }

    function loadAchievements() {
        const achievementsGrid = document.getElementById('achievements-grid');
        if (!achievementsGrid) return;

        const achievements = getAllAchievements();
        
        achievementsGrid.innerHTML = achievements.map(achievement => `
            <div class="achievement-card ${achievement.earned ? 'earned' : 'locked'}">
                <div class="achievement-icon">
                    <i class="fas fa-${achievement.icon}"></i>
                </div>
                <div class="achievement-info">
                    <h4>${achievement.title}</h4>
                    <p>${achievement.description}</p>
                    ${achievement.earned ? 
                        `<small>Earned: ${Utils.formatDate(achievement.earnedDate)}</small>` : 
                        `<div class="progress-bar">
                            <div class="progress-fill" style="width: ${achievement.progress}%"></div>
                            <span class="progress-text">${achievement.progress}%</span>
                        </div>`
                    }
                </div>
            </div>
        `).join('');
    }

    function getAllAchievements() {
        const stats = currentUser.stats || { gamesPlayed: 0, gamesWon: 0, totalWinnings: 0 };
        const level = calculateUserLevel(stats.gamesPlayed);

        return [
            {
                id: 'first_game',
                title: 'First Adventure',
                description: 'Play your first game',
                icon: 'play',
                earned: stats.gamesPlayed >= 1,
                earnedDate: currentUser.createdAt,
                progress: Math.min(100, stats.gamesPlayed * 100)
            },
            {
                id: 'first_win',
                title: 'First Victory',
                description: 'Win your first game',
                icon: 'trophy',
                earned: stats.gamesWon >= 1,
                earnedDate: currentUser.createdAt,
                progress: Math.min(100, stats.gamesWon * 100)
            },
            {
                id: 'veteran',
                title: 'Veteran Hunter',
                description: 'Play 100 games',
                icon: 'star',
                earned: stats.gamesPlayed >= 100,
                earnedDate: Date.now(),
                progress: Math.min(100, (stats.gamesPlayed / 100) * 100)
            },
            {
                id: 'winner',
                title: 'Champion',
                description: 'Win 50 games',
                icon: 'crown',
                earned: stats.gamesWon >= 50,
                earnedDate: Date.now(),
                progress: Math.min(100, (stats.gamesWon / 50) * 100)
            },
            {
                id: 'rich',
                title: 'Wealthy Hunter',
                description: 'Earn 10,000 coins total',
                icon: 'coins',
                earned: (stats.totalWinnings || 0) >= 10000,
                earnedDate: Date.now(),
                progress: Math.min(100, ((stats.totalWinnings || 0) / 10000) * 100)
            },
            {
                id: 'skilled',
                title: 'Master Hunter',
                description: 'Achieve 80% win rate (min 20 games)',
                icon: 'medal',
                earned: stats.gamesPlayed >= 20 && (stats.gamesWon / stats.gamesPlayed) >= 0.8,
                earnedDate: Date.now(),
                progress: stats.gamesPlayed >= 20 ? 
                    Math.min(100, ((stats.gamesWon / stats.gamesPlayed) / 0.8) * 100) : 0
            }
        ];
    }

    function loadGameHistory() {
        const historyTableBody = document.getElementById('history-table-body');
        if (!historyTableBody) return;

        const gameHistory = Utils.getStorage('gameHistory', []);
        const userHistory = gameHistory.filter(game => game.userId === currentUser.id);
        const filteredHistory = applyHistoryFilter(userHistory);

        if (filteredHistory.length === 0) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-data">No game history found</td>
                </tr>
            `;
            return;
        }

        historyTableBody.innerHTML = filteredHistory.slice(-50).reverse().map(game => `
            <tr class="history-row ${game.result}">
                <td>${Utils.formatDate(game.date, { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}</td>
                <td>${Utils.formatCurrency(game.bet)}</td>
                <td>${game.treasures}</td>
                <td>${game.bombs}</td>
                <td class="result-cell ${game.result}">
                    <i class="fas fa-${game.result === 'won' ? 'trophy' : 
                                     game.result === 'cashed_out' ? 'hand-holding-usd' : 'times'}"></i>
                    ${game.result === 'won' ? 'Won' : 
                      game.result === 'cashed_out' ? 'Cashed Out' : 'Lost'}
                </td>
                <td class="winnings-cell ${game.result}">
                    ${game.result === 'lost' ? '' : '+'}${Utils.formatCurrency(game.winnings)}
                </td>
            </tr>
        `).join('');
    }

    function applyHistoryFilter(history) {
        const filter = document.getElementById('history-filter')?.value || 'all';
        
        switch (filter) {
            case 'won':
                return history.filter(game => game.result === 'won');
            case 'lost':
                return history.filter(game => game.result === 'lost');
            default:
                return history;
        }
    }

    function setupSettings() {
        // Sound settings
        const soundEnabled = document.getElementById('sound-enabled');
        const soundVolume = document.getElementById('sound-volume');
        
        if (soundEnabled) {
            soundEnabled.checked = Utils.getStorage('soundEnabled', true);
            soundEnabled.addEventListener('change', function() {
                Utils.setStorage('soundEnabled', this.checked);
                if (soundManager) {
                    if (this.checked) {
                        soundManager.unmute();
                    } else {
                        soundManager.mute();
                    }
                }
            });
        }

        if (soundVolume) {
            soundVolume.value = Utils.getStorage('soundVolume', 50);
            soundVolume.addEventListener('input', function() {
                const volume = parseInt(this.value) / 100;
                Utils.setStorage('soundVolume', this.value);
                if (soundManager) {
                    soundManager.setVolume(volume);
                }
            });
        }

        // Auto-save setting
        const autoSave = document.getElementById('auto-save');
        if (autoSave) {
            autoSave.checked = Utils.getStorage('autoSave', true);
            autoSave.addEventListener('change', function() {
                Utils.setStorage('autoSave', this.checked);
            });
        }

        // Animations setting
        const animationsEnabled = document.getElementById('animations-enabled');
        if (animationsEnabled) {
            animationsEnabled.checked = Utils.getStorage('animationsEnabled', true);
            animationsEnabled.addEventListener('change', function() {
                Utils.setStorage('animationsEnabled', this.checked);
                document.body.classList.toggle('no-animations', !this.checked);
            });
        }

        // History filter
        const historyFilter = document.getElementById('history-filter');
        if (historyFilter) {
            historyFilter.addEventListener('change', loadGameHistory);
        }
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
                loadProfileData();
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

    // Global functions
    window.exportGameHistory = function() {
        const gameHistory = Utils.getStorage('gameHistory', []);
        const userHistory = gameHistory.filter(game => game.userId === currentUser.id);
        
        const csvContent = [
            ['Date', 'Bet', 'Treasures', 'Bombs', 'Result', 'Winnings', 'Found Treasures'],
            ...userHistory.map(game => [
                Utils.formatDate(game.date),
                game.bet,
                game.treasures,
                game.bombs,
                game.result === 'cashed_out' ? 'Cashed Out' : 
                game.result === 'won' ? 'Won' : 'Lost',
                game.winnings,
                game.foundTreasures || 0
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `treasure-hunt-history-${currentUser.username}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Utils.showNotification('Game history exported successfully', 'success');
    };

    window.logout = function() {
        soundManager.playButton();
        authManager.logout();
        window.location.href = 'index.html';
    };
});

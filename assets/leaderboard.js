// Leaderboard Page Controller
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
        window.location.href = 'main.html';
        return;
    }

    // Show/hide admin link
    const adminLink = document.querySelector('.admin-only');
    if (adminLink) {
        adminLink.style.display = currentUser.isAdmin ? 'flex' : 'none';
    }

    // Initialize leaderboard
    loadLeaderboard();
    loadCommunityStats();
    setupFilters();
    setupSearch();

    function loadLeaderboard() {
        const sortBy = document.getElementById('sort-by')?.value || 'balance';
        const timePeriod = document.getElementById('time-period')?.value || 'all';
        
        let users = storageManager.getUsers().filter(user => !user.isAdmin);
        
        // Apply time filter
        if (timePeriod !== 'all') {
            const now = Date.now();
            const timeFilter = getTimeFilter(timePeriod);
            // For now, we'll show all users since we don't have time-based data
            // In a real app, you'd filter based on activity within the time period
        }

        // Sort users
        users.sort((a, b) => {
            switch (sortBy) {
                case 'balance':
                    return b.balance - a.balance;
                case 'winnings':
                    return (b.stats?.totalWinnings || 0) - (a.stats?.totalWinnings || 0);
                case 'winRate':
                    const aWinRate = a.stats?.gamesPlayed > 0 ? 
                        (a.stats.gamesWon / a.stats.gamesPlayed) : 0;
                    const bWinRate = b.stats?.gamesPlayed > 0 ? 
                        (b.stats.gamesWon / b.stats.gamesPlayed) : 0;
                    return bWinRate - aWinRate;
                case 'gamesPlayed':
                    return (b.stats?.gamesPlayed || 0) - (a.stats?.gamesPlayed || 0);
                default:
                    return b.balance - a.balance;
            }
        });

        renderLeaderboard(users);
        showCurrentUserRank(users);
    }

    function renderLeaderboard(users) {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;

        if (users.length === 0) {
            leaderboardList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-trophy"></i>
                    <h3>No players yet</h3>
                    <p>Be the first to play and claim the top spot!</p>
                </div>
            `;
            return;
        }

        leaderboardList.innerHTML = users.slice(0, 50).map((player, index) => {
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

            const stats = player.stats || { gamesPlayed: 0, gamesWon: 0, totalWinnings: 0 };
            const winRate = stats.gamesPlayed > 0 ? 
                Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

            const isCurrentUser = player.id === currentUser.id;

            return `
                <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''} animate-slideInLeft" 
                     style="animation-delay: ${Math.min(index * 0.05, 1)}s">
                    <div class="rank ${rankClass}">
                        ${rankIcon || rank}
                    </div>
                    <div class="player-info">
                        <img class="player-avatar" src="${player.avatar}" alt="${player.username}">
                        <div class="player-details">
                            <span class="player-name">${Utils.sanitizeHTML(player.username)}</span>
                            <div class="player-stats">
                                Games: ${stats.gamesPlayed} | Win Rate: ${winRate}%
                            </div>
                        </div>
                    </div>
                    <div class="player-metrics">
                        <div class="player-balance">
                            ${Utils.formatCurrency(player.balance)} coins
                        </div>
                        <div class="player-winnings">
                            Total: ${Utils.formatCurrency(stats.totalWinnings || 0)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function showCurrentUserRank(users) {
        const currentUserRank = document.getElementById('current-user-rank');
        if (!currentUserRank) return;

        const userIndex = users.findIndex(user => user.id === currentUser.id);
        
        if (userIndex === -1) {
            currentUserRank.innerHTML = `
                <div class="rank-card">
                    <h4>Your Rank</h4>
                    <p>Start playing to appear on the leaderboard!</p>
                </div>
            `;
            return;
        }

        const rank = userIndex + 1;
        const stats = currentUser.stats || { gamesPlayed: 0, gamesWon: 0, totalWinnings: 0 };
        const winRate = stats.gamesPlayed > 0 ? 
            Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

        currentUserRank.innerHTML = `
            <div class="rank-card current-user-highlight">
                <h4>Your Current Rank: #${rank}</h4>
                <div class="rank-details">
                    <span>Balance: ${Utils.formatCurrency(currentUser.balance)}</span>
                    <span>Win Rate: ${winRate}%</span>
                    <span>Games: ${stats.gamesPlayed}</span>
                </div>
            </div>
        `;
    }

    function loadCommunityStats() {
        const users = storageManager.getUsers().filter(user => !user.isAdmin);
        
        const totalPlayers = users.length;
        const totalGames = users.reduce((sum, user) => sum + (user.stats?.gamesPlayed || 0), 0);
        const totalWinnings = users.reduce((sum, user) => sum + (user.stats?.totalWinnings || 0), 0);
        const totalWins = users.reduce((sum, user) => sum + (user.stats?.gamesWon || 0), 0);
        const averageWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

        // Update stats display
        const totalPlayersElement = document.getElementById('total-players');
        const totalGamesElement = document.getElementById('total-games');
        const totalWinningsElement = document.getElementById('total-winnings');
        const averageWinRateElement = document.getElementById('average-win-rate');

        if (totalPlayersElement) totalPlayersElement.textContent = totalPlayers;
        if (totalGamesElement) totalGamesElement.textContent = Utils.formatCurrency(totalGames);
        if (totalWinningsElement) totalWinningsElement.textContent = Utils.formatCurrency(totalWinnings);
        if (averageWinRateElement) averageWinRateElement.textContent = `${averageWinRate}%`;
    }

    function setupFilters() {
        const sortBySelect = document.getElementById('sort-by');
        const timePeriodSelect = document.getElementById('time-period');

        [sortBySelect, timePeriodSelect].forEach(select => {
            if (select) {
                select.addEventListener('change', loadLeaderboard);
            }
        });
    }

    function setupSearch() {
        const searchInput = document.getElementById('player-search');
        if (!searchInput) return;

        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = this.value.toLowerCase().trim();
                
                if (query === '') {
                    loadLeaderboard();
                    return;
                }

                const users = storageManager.getUsers()
                    .filter(user => !user.isAdmin)
                    .filter(user => user.username.toLowerCase().includes(query))
                    .sort((a, b) => b.balance - a.balance);

                renderLeaderboard(users);
                
                if (users.length === 0) {
                    const leaderboardList = document.getElementById('leaderboard-list');
                    if (leaderboardList) {
                        leaderboardList.innerHTML = `
                            <div class="no-data">
                                <i class="fas fa-search"></i>
                                <h3>No players found</h3>
                                <p>No players match your search query.</p>
                            </div>
                        `;
                    }
                }
            }, 300);
        });
    }

    function getTimeFilter(period) {
        const now = Date.now();
        switch (period) {
            case 'today':
                return now - (24 * 60 * 60 * 1000);
            case 'week':
                return now - (7 * 24 * 60 * 60 * 1000);
            case 'month':
                return now - (30 * 24 * 60 * 60 * 1000);
            default:
                return 0;
        }
    }

    // Global functions
    window.refreshLeaderboard = function() {
        soundManager.playButton();
        loadLeaderboard();
        loadCommunityStats();
        Utils.showNotification('Leaderboard refreshed', 'success');
    };

    window.logout = function() {
        soundManager.playButton();
        authManager.logout();
        window.location.href = 'main.html';
    };
});

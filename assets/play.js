// Play Page Controller
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

    // Initialize game manager
    window.gameManager = new GameManager();
    gameManager.initializeGame();

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

    // Initialize game manager
    gameManager.updateGameBalance();
    gameManager.updateGameInterface();

    // Set up difficulty presets
    setupDifficultyPresets();

    // Load game history
    loadGameHistory();

    // Set up auto-reveal feature
    setupAutoReveal();

    function setupDifficultyPresets() {
        const difficultySelect = document.getElementById('difficulty-level');
        const treasureInput = document.getElementById('treasure-count');
        const bombInput = document.getElementById('bomb-count');
        const betInput = document.getElementById('bet-amount');

        if (difficultySelect) {
            difficultySelect.addEventListener('change', function() {
                const difficulty = this.value;
                let treasures, bombs, bet;

                switch (difficulty) {
                    case 'easy':
                        treasures = 15;
                        bombs = 3;
                        bet = 5;
                        break;
                    case 'medium':
                        treasures = 10;
                        bombs = 8;
                        bet = 10;
                        break;
                    case 'hard':
                        treasures = 6;
                        bombs = 12;
                        bet = 20;
                        break;
                    case 'expert':
                        treasures = 3;
                        bombs = 20;
                        bet = 50;
                        break;
                    default:
                        return;
                }

                if (treasureInput) treasureInput.value = treasures;
                if (bombInput) bombInput.value = bombs;
                if (betInput) betInput.value = bet;

                updateGameStatistics();
            });
        }

        // Update stats when inputs change
        [treasureInput, bombInput, betInput].forEach(input => {
            if (input) {
                input.addEventListener('input', updateGameStatistics);
            }
        });

        // Initial stats update
        updateGameStatistics();
    }

    function updateGameStatistics() {
        const treasures = parseInt(document.getElementById('treasure-count')?.value) || 0;
        const bombs = parseInt(document.getElementById('bomb-count')?.value) || 0;
        const bet = parseInt(document.getElementById('bet-amount')?.value) || 0;

        // Update win probability
        const winProbElement = document.getElementById('win-probability');
        if (winProbElement && treasures + bombs > 0) {
            const winProb = Math.round((treasures / (treasures + bombs)) * 100);
            winProbElement.textContent = `${winProb}%`;
        }

        // Update risk level
        const riskElement = document.getElementById('risk-level');
        if (riskElement) {
            const riskRatio = bombs / (treasures + bombs);
            let riskLevel = 'Low';
            if (riskRatio > 0.7) riskLevel = 'Extreme';
            else if (riskRatio > 0.5) riskLevel = 'High';
            else if (riskRatio > 0.3) riskLevel = 'Medium';
            
            riskElement.textContent = riskLevel;
        }

        // Update multiplier
        const multiplierElement = document.getElementById('win-multiplier');
        if (multiplierElement && treasures > 0 && bombs > 0) {
            const gameSettings = storageManager.getGameSettings();
            const baseMultiplier = gameSettings ? gameSettings.winMultiplier : 2.0;
            const riskMultiplier = 1 + (bombs / treasures) * 0.5;
            const finalMultiplier = (baseMultiplier * riskMultiplier).toFixed(1);
            multiplierElement.textContent = `${finalMultiplier}x`;
        }

        // Update potential win
        gameManager.updatePotentialWin();
    }

    function loadGameHistory() {
        const historyList = document.getElementById('game-history-list');
        if (!historyList) return;

        const gameHistory = Utils.getStorage('gameHistory', []);
        const userHistory = gameHistory.filter(game => game.userId === currentUser.id);
        const recentGames = userHistory.slice(-5).reverse();

        if (recentGames.length === 0) {
            historyList.innerHTML = `
                <div class="no-history">
                    <i class="fas fa-history"></i>
                    <p>No game history yet. Start playing!</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = recentGames.map(game => `
            <div class="history-item ${game.result}">
                <div class="history-info">
                    <span class="bet-amount">${Utils.formatCurrency(game.bet)}</span>
                    <span class="game-config">${game.treasures}T/${game.bombs}B</span>
                    <span class="result ${game.result}">
                        ${game.result === 'won' ? 'Won' : 
                          game.result === 'cashed_out' ? 'Cashed Out' : 'Lost'}
                    </span>
                    <span class="winnings ${game.result}">
                        ${game.result === 'lost' ? '' : '+'}${Utils.formatCurrency(game.winnings)}
                    </span>
                </div>
                <div class="history-date">${Utils.formatDate(game.date, { timeStyle: 'short' })}</div>
            </div>
        `).join('');
    }

    function setupAutoReveal() {
        const autoRevealBtn = document.getElementById('auto-reveal-btn');
        if (autoRevealBtn) {
            autoRevealBtn.addEventListener('click', function() {
                if (!gameManager.gameState.isActive) {
                    Utils.showNotification('Start a game first', 'warning');
                    return;
                }

                // Auto-reveal safe cells (non-treasure, non-bomb)
                const grid = gameManager.gameState.grid;
                let revealedCount = 0;

                grid.forEach((row, rowIndex) => {
                    row.forEach((cell, colIndex) => {
                        if (!cell.revealed && cell.type === 'safe') {
                            setTimeout(() => {
                                gameManager.revealCell(rowIndex, colIndex);
                            }, revealedCount * 200);
                            revealedCount++;
                        }
                    });
                });

                if (revealedCount === 0) {
                    Utils.showNotification('No safe cells to reveal', 'info');
                } else {
                    Utils.showNotification(`Auto-revealing ${revealedCount} safe cells`, 'info');
                    soundManager.playButton();
                }
            });
        }
    }

    // Override game manager methods to save history
    const originalHandleGameWin = gameManager.handleGameWin;
    const originalHandleGameLoss = gameManager.handleGameLoss;
    const originalCashOut = gameManager.cashOut;

    gameManager.handleGameWin = function() {
        originalHandleGameWin.call(this);
        saveGameToHistory('won', this.gameState.potentialWin);
        loadGameHistory();
    };

    gameManager.handleGameLoss = function() {
        originalHandleGameLoss.call(this);
        saveGameToHistory('lost', -this.gameState.currentBet);
        loadGameHistory();
    };

    gameManager.cashOut = function() {
        // Calculate cash out amount before calling original method
        const treasureRatio = this.gameState.foundTreasures / this.gameState.totalTreasures;
        const gameSettings = storageManager.getGameSettings();
        const baseMultiplier = gameSettings ? gameSettings.winMultiplier : 2.0;
        const riskFactor = this.gameState.totalBombs / (this.gameState.totalTreasures + this.gameState.totalBombs);
        const progressiveMultiplier = 1 + (riskFactor * 0.8);
        const baseCashOut = this.gameState.currentBet * treasureRatio * baseMultiplier;
        const cashOutAmount = Math.floor(baseCashOut * progressiveMultiplier);
        
        originalCashOut.call(this);
        saveGameToHistory('cashed_out', cashOutAmount);
        loadGameHistory();
    };

    function saveGameToHistory(result, winnings) {
        const gameHistory = Utils.getStorage('gameHistory', []);
        const gameRecord = {
            userId: currentUser.id,
            date: Date.now(),
            bet: gameManager.gameState.currentBet,
            treasures: gameManager.gameState.totalTreasures,
            bombs: gameManager.gameState.totalBombs,
            result: result,
            winnings: winnings,
            foundTreasures: gameManager.gameState.foundTreasures,
            cashOutTiming: result === 'cashed_out' ? 
                `${gameManager.gameState.foundTreasures}/${gameManager.gameState.totalTreasures}` : null
        };

        gameHistory.push(gameRecord);
        
        // Keep only last 100 games per user
        const userGames = gameHistory.filter(game => game.userId === currentUser.id);
        if (userGames.length > 100) {
            const otherGames = gameHistory.filter(game => game.userId !== currentUser.id);
            const recentUserGames = userGames.slice(-100);
            Utils.setStorage('gameHistory', [...otherGames, ...recentUserGames]);
        } else {
            Utils.setStorage('gameHistory', gameHistory);
        }
    }

    // Make saveGameToHistory available globally for game manager
    window.saveGameToHistory = saveGameToHistory;

    // Global functions
    window.autoReveal = function() {
        const autoRevealBtn = document.getElementById('auto-reveal-btn');
        if (autoRevealBtn) {
            autoRevealBtn.click();
        }
    };

    window.logout = function() {
        soundManager.playButton();
        authManager.logout();
        window.location.href = 'index.html';
    };
});

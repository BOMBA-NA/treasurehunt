// Game Manager
class GameManager {
    constructor() {
        this.gameState = {
            isActive: false,
            grid: null,
            currentBet: 0,
            foundTreasures: 0,
            totalTreasures: 0,
            totalBombs: 0,
            revealedCells: 0,
            potentialWin: 0
        };
        
        this.settings = {
            gridSize: 5,
            minTreasures: 1,
            maxTreasures: 24,
            minBombs: 1,
            maxBombs: 24,
            defaultTreasures: 5,
            defaultBombs: 5,
            defaultBet: 10
        };
        
        this.initializeGame();
    }

    initializeGame() {
        this.updateGameBalance();
        this.setupGameControls();
        this.resetGameState();
    }

    setupGameControls() {
        // Update treasure/bomb counts when they change
        const treasureInput = document.getElementById('treasure-count');
        const bombInput = document.getElementById('bomb-count');
        
        if (treasureInput && bombInput) {
            const validateInputs = () => {
                const treasures = parseInt(treasureInput.value) || 0;
                const bombs = parseInt(bombInput.value) || 0;
                const total = treasures + bombs;
                const maxTotal = this.settings.gridSize * this.settings.gridSize; // Allow all 25 cells to be treasures/bombs
                
                if (total > maxTotal) {
                    const excess = total - maxTotal;
                    if (treasures > bombs) {
                        treasureInput.value = Math.max(1, treasures - excess);
                    } else {
                        bombInput.value = Math.max(1, bombs - excess);
                    }
                }
                
                this.updatePotentialWin();
            };
            
            treasureInput.addEventListener('input', validateInputs);
            bombInput.addEventListener('input', validateInputs);
            
            // Also validate bet amount
            const betInput = document.getElementById('bet-amount');
            if (betInput) {
                betInput.addEventListener('input', () => {
                    this.updatePotentialWin();
                });
            }
        }
    }

    resetGameState() {
        this.gameState = {
            isActive: false,
            grid: null,
            currentBet: 0,
            foundTreasures: 0,
            totalTreasures: 0,
            totalBombs: 0,
            revealedCells: 0,
            potentialWin: 0
        };
        
        this.updateGameInterface();
        this.clearGrid();
    }

    startGame() {
        try {
            if (!authManager.isLoggedIn()) {
                Utils.showNotification('Please log in to play', 'error');
                return false;
            }

            const treasures = parseInt(document.getElementById('treasure-count').value) || this.settings.defaultTreasures;
            const bombs = parseInt(document.getElementById('bomb-count').value) || this.settings.defaultBombs;
            const betAmount = parseInt(document.getElementById('bet-amount').value) || this.settings.defaultBet;

            // Validation
            if (treasures < this.settings.minTreasures || treasures > this.settings.maxTreasures) {
                throw new Error(`Treasures must be between ${this.settings.minTreasures} and ${this.settings.maxTreasures}`);
            }

            if (bombs < this.settings.minBombs || bombs > this.settings.maxBombs) {
                throw new Error(`Bombs must be between ${this.settings.minBombs} and ${this.settings.maxBombs}`);
            }

            if (treasures + bombs > this.settings.gridSize * this.settings.gridSize) {
                throw new Error('Too many treasures and bombs for the grid');
            }

            if (betAmount <= 0) {
                throw new Error('Bet amount must be greater than 0');
            }

            if (!authManager.canAffordBet(betAmount)) {
                throw new Error('Insufficient balance for this bet');
            }

            // Deduct bet from balance
            authManager.updateBalance(-betAmount);

            // Initialize game state
            this.gameState.isActive = true;
            this.gameState.currentBet = betAmount;
            this.gameState.totalTreasures = treasures;
            this.gameState.totalBombs = bombs;
            this.gameState.foundTreasures = 0;
            this.gameState.revealedCells = 0;
            this.gameState.potentialWin = this.calculatePotentialWin(betAmount, treasures, bombs);

            // Generate game grid
            this.gameState.grid = Utils.generateGameGrid(
                this.settings.gridSize,
                this.settings.gridSize,
                treasures,
                bombs
            );

            // Update interface
            this.updateGameInterface();
            this.renderGrid();
            this.updateGameBalance();

            // Update user stats
            authManager.updateStats({ gamesPlayed: 1 });

            soundManager.playButton();
            Utils.showNotification('Game started! Find the treasures and avoid the bombs!', 'info');

            return true;

        } catch (error) {
            Utils.showNotification(error.message, 'error');
            soundManager.playLose();
            return false;
        }
    }

    revealCell(row, col) {
        if (!this.gameState.isActive || !this.gameState.grid) {
            return;
        }

        const cell = this.gameState.grid[row][col];
        if (cell.revealed) {
            return; // Already revealed
        }

        cell.revealed = true;
        this.gameState.revealedCells++;

        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cellElement) {
            cellElement.classList.add('revealed', 'animate-flip');
            
            setTimeout(() => {
                cellElement.classList.remove('animate-flip');
            }, 600);
        }

        if (cell.type === 'treasure') {
            this.handleTreasureFound(cell, cellElement);
        } else if (cell.type === 'bomb') {
            this.handleBombFound(cell, cellElement);
        } else {
            this.handleSafeCell(cell, cellElement);
        }

        this.updateGameInterface();
    }

    handleTreasureFound(cell, cellElement) {
        this.gameState.foundTreasures++;
        
        if (cellElement) {
            cellElement.classList.add('treasure', 'treasure-found');
            cellElement.innerHTML = '<i class="fas fa-gem"></i>';
            Utils.addSparkles(cellElement);
        }

        soundManager.playTreasure();
        Utils.showNotification('Treasure found! 💎', 'success', 2000);

        // Check win condition
        if (this.gameState.foundTreasures === this.gameState.totalTreasures) {
            this.handleGameWin();
        }
    }

    handleBombFound(cell, cellElement) {
        if (cellElement) {
            cellElement.classList.add('bomb', 'bomb-exploded');
            cellElement.innerHTML = '<i class="fas fa-bomb"></i>';
        }

        soundManager.playBomb();
        Utils.showNotification('Boom! You hit a bomb! 💣', 'error', 3000);

        // Reveal all bombs
        this.revealAllBombs();
        this.handleGameLoss();
    }

    handleSafeCell(cell, cellElement) {
        if (cellElement) {
            cellElement.classList.add('safe');
            cellElement.innerHTML = '<i class="fas fa-check"></i>';
        }

        soundManager.playClick();
    }

    handleGameWin() {
        this.gameState.isActive = false;
        const winAmount = this.gameState.potentialWin;
        
        // Add winnings to balance
        authManager.updateBalance(winAmount);
        
        // Update stats
        authManager.updateStats({ 
            gamesWon: 1,
            totalWinnings: winAmount
        });

        // Show win effects
        this.showWinEffects();
        
        soundManager.playWin();
        Utils.showNotification(`Congratulations! You won ${Utils.formatCurrency(winAmount)} coins! 🎉`, 'success', 5000);

        this.updateGameBalance();
        this.updateGameInterface();
    }

    handleGameLoss() {
        this.gameState.isActive = false;
        
        soundManager.playLose();
        Utils.showNotification(`Game Over! You lost ${Utils.formatCurrency(this.gameState.currentBet)} coins.`, 'error', 4000);

        this.updateGameInterface();
    }

    cashOut() {
        if (!this.gameState.isActive || this.gameState.foundTreasures === 0) {
            Utils.showNotification('Cannot cash out now - no treasures found yet', 'warning');
            return;
        }

        // Calculate cash out amount based on found treasures and game difficulty
        const treasureRatio = this.gameState.foundTreasures / this.gameState.totalTreasures;
        const gameSettings = storageManager.getGameSettings();
        const baseMultiplier = gameSettings ? gameSettings.winMultiplier : 2.0;
        
        // Progressive multiplier based on risk taken
        const riskFactor = this.gameState.totalBombs / (this.gameState.totalTreasures + this.gameState.totalBombs);
        const progressiveMultiplier = 1 + (riskFactor * 0.8); // Up to 80% bonus for high risk
        
        // Calculate final cash out amount
        const baseCashOut = this.gameState.currentBet * treasureRatio * baseMultiplier;
        const cashOutAmount = Math.floor(baseCashOut * progressiveMultiplier);

        // Add cash out amount to balance
        authManager.updateBalance(cashOutAmount);
        
        // Update stats (count as partial win)
        authManager.updateStats({ 
            gamesWon: 1,
            totalWinnings: cashOutAmount
        });

        this.gameState.isActive = false;

        // Show celebration effects
        this.showCashOutEffects();

        soundManager.playCoin();
        
        const treasureText = this.gameState.foundTreasures === 1 ? 'treasure' : 'treasures';
        Utils.showNotification(
            `Smart move! Cashed out with ${this.gameState.foundTreasures} ${treasureText} found. Earned ${Utils.formatCurrency(cashOutAmount)} coins!`, 
            'success', 
            5000
        );

        this.updateGameBalance();
        this.updateGameInterface();
        
        // Save to game history
        this.saveGameResult('cashed_out', cashOutAmount);
    }

    showCashOutEffects() {
        // Add glow effect to cash out button
        const cashOutBtn = document.getElementById('cash-out-btn');
        if (cashOutBtn) {
            cashOutBtn.classList.add('animate-glow');
            setTimeout(() => {
                cashOutBtn.classList.remove('animate-glow');
            }, 2000);
        }

        // Add sparkles to found treasures
        const treasureCells = document.querySelectorAll('.grid-cell.treasure');
        treasureCells.forEach((cell, index) => {
            setTimeout(() => {
                Utils.addSparkles(cell);
            }, index * 200);
        });

        // Animate balance update
        const balanceElement = document.getElementById('game-balance');
        if (balanceElement) {
            balanceElement.classList.add('balance-update');
            setTimeout(() => {
                balanceElement.classList.remove('balance-update');
            }, 2000);
        }
    }

    saveGameResult(result, winnings) {
        // Save game to history for tracking
        if (typeof window !== 'undefined' && window.saveGameToHistory) {
            window.saveGameToHistory(result, winnings);
        }
    }

    revealAllBombs() {
        if (!this.gameState.grid) return;

        this.gameState.grid.forEach(row => {
            row.forEach(cell => {
                if (cell.type === 'bomb' && !cell.revealed) {
                    cell.revealed = true;
                    const cellElement = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
                    if (cellElement) {
                        cellElement.classList.add('revealed', 'bomb');
                        cellElement.innerHTML = '<i class="fas fa-bomb"></i>';
                    }
                }
            });
        });
    }

    showWinEffects() {
        // Add sparkles to the grid
        const gridElement = document.getElementById('game-grid');
        if (gridElement) {
            Utils.addSparkles(gridElement);
            
            // Add glow effect
            gridElement.classList.add('animate-glow');
            setTimeout(() => {
                gridElement.classList.remove('animate-glow');
            }, 3000);
        }

        // Animate balance update
        const balanceElement = document.getElementById('game-balance');
        if (balanceElement) {
            balanceElement.classList.add('balance-update');
            setTimeout(() => {
                balanceElement.classList.remove('balance-update');
            }, 2000);
        }
    }

    renderGrid() {
        const gridElement = document.getElementById('game-grid');
        if (!gridElement || !this.gameState.grid) return;

        gridElement.innerHTML = '';

        this.gameState.grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellElement = document.createElement('button');
                cellElement.className = 'grid-cell';
                cellElement.setAttribute('data-row', rowIndex);
                cellElement.setAttribute('data-col', colIndex);
                
                cellElement.addEventListener('click', () => {
                    this.revealCell(rowIndex, colIndex);
                });

                gridElement.appendChild(cellElement);
            });
        });
    }

    clearGrid() {
        const gridElement = document.getElementById('game-grid');
        if (gridElement) {
            gridElement.innerHTML = '';
        }
    }

    calculatePotentialWin(bet, treasures, bombs) {
        const gameSettings = storageManager.getGameSettings();
        const multiplier = gameSettings ? gameSettings.winMultiplier : 2.0;
        return Utils.calculatePayout(bet, treasures, bombs, multiplier);
    }

    updatePotentialWin() {
        const betAmount = parseInt(document.getElementById('bet-amount')?.value) || 0;
        const treasures = parseInt(document.getElementById('treasure-count')?.value) || 0;
        const bombs = parseInt(document.getElementById('bomb-count')?.value) || 0;

        if (betAmount > 0 && treasures > 0 && bombs > 0) {
            const potentialWin = this.calculatePotentialWin(betAmount, treasures, bombs);
            const potentialWinElement = document.getElementById('potential-win');
            if (potentialWinElement) {
                potentialWinElement.textContent = Utils.formatCurrency(potentialWin);
            }
        }
    }

    updateGameInterface() {
        // Update current bet display
        const currentBetElement = document.getElementById('current-bet');
        if (currentBetElement) {
            currentBetElement.textContent = Utils.formatCurrency(this.gameState.currentBet);
        }

        // Update potential win display
        const potentialWinElement = document.getElementById('potential-win');
        if (potentialWinElement) {
            potentialWinElement.textContent = Utils.formatCurrency(this.gameState.potentialWin);
        }

        // Update found treasures display
        const foundTreasuresElement = document.getElementById('found-treasures');
        if (foundTreasuresElement) {
            foundTreasuresElement.textContent = `${this.gameState.foundTreasures}/${this.gameState.totalTreasures}`;
        }

        // Update button states
        const startButton = document.getElementById('start-game-btn');
        const cashOutButton = document.getElementById('cash-out-btn');
        const resetButton = document.getElementById('reset-game-btn');

        if (startButton) {
            startButton.disabled = this.gameState.isActive;
            startButton.textContent = this.gameState.isActive ? 'Game in Progress' : 'Start Game';
        }

        if (cashOutButton) {
            const canCashOut = this.gameState.isActive && this.gameState.foundTreasures > 0;
            cashOutButton.classList.toggle('hidden', !canCashOut);
            
            if (canCashOut) {
                // Update cash out button text with potential earnings
                const treasureRatio = this.gameState.foundTreasures / this.gameState.totalTreasures;
                const gameSettings = storageManager.getGameSettings();
                const baseMultiplier = gameSettings ? gameSettings.winMultiplier : 2.0;
                const riskFactor = this.gameState.totalBombs / (this.gameState.totalTreasures + this.gameState.totalBombs);
                const progressiveMultiplier = 1 + (riskFactor * 0.8);
                const baseCashOut = this.gameState.currentBet * treasureRatio * baseMultiplier;
                const cashOutAmount = Math.floor(baseCashOut * progressiveMultiplier);
                
                cashOutButton.innerHTML = `
                    <i class="fas fa-money-bill"></i> 
                    Cash Out (${Utils.formatCurrency(cashOutAmount)})
                `;
                
                // Add pulsing effect if player has found multiple treasures
                if (this.gameState.foundTreasures >= 2) {
                    cashOutButton.classList.add('animate-pulse');
                } else {
                    cashOutButton.classList.remove('animate-pulse');
                }
                
                // Add treasure reveal animation to cash out button
                if (this.gameState.foundTreasures > 0) {
                    cashOutButton.classList.add('treasure-reveal');
                    setTimeout(() => {
                        cashOutButton.classList.remove('treasure-reveal');
                    }, 800);
                }
            }
        }

        if (resetButton) {
            resetButton.disabled = this.gameState.isActive;
        }

        // Disable/enable configuration inputs
        const configInputs = ['treasure-count', 'bomb-count', 'bet-amount'];
        configInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.disabled = this.gameState.isActive;
            }
        });
    }

    updateGameBalance() {
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
            const balanceElement = document.getElementById('game-balance');
            if (balanceElement) {
                balanceElement.textContent = Utils.formatCurrency(currentUser.balance);
            }
        }
    }
}

// Global game manager instance
window.gameManager = new GameManager();

// Game control functions
window.startGame = function() {
    gameManager.startGame();
};

window.cashOut = function() {
    soundManager.playButton();
    gameManager.cashOut();
};

window.resetGame = function() {
    soundManager.playButton();
    gameManager.resetGameState();
    Utils.showNotification('Game reset', 'info');
};

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set default values
    const treasureInput = document.getElementById('treasure-count');
    const bombInput = document.getElementById('bomb-count');
    const betInput = document.getElementById('bet-amount');

    if (treasureInput) treasureInput.value = gameManager.settings.defaultTreasures;
    if (bombInput) bombInput.value = gameManager.settings.defaultBombs;
    if (betInput) betInput.value = gameManager.settings.defaultBet;

    // Update potential win initially
    gameManager.updatePotentialWin();
});


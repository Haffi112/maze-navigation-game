// Game state
let currentLevel = 0;
let currentMazeIndex = 0;
let currentMaze = null;
let playerPos = { x: 0, y: 0 };
let visitedCells = new Map(); // Track visit counts for each cell
let visibleCells = new Set(); // Track cells that are currently visible
let permanentlyVisible = new Set(); // Track cells that have ever been visible
let moves = 0;
let gameActive = false;
let mazeSizes = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
let currentSizeIndex = 0;

// Canvas and rendering
let canvas = null;
let ctx = null;
let cellSize = 40;
let hoveredCell = null; // Track which cell is being hovered
let clickableCells = new Set(); // Track which cells are clickable

function startGame() {
    document.getElementById('intro').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    
    canvas = document.getElementById('mazeCanvas');
    ctx = canvas.getContext('2d');
    
    // Add keyboard listeners
    document.addEventListener('keydown', handleKeyPress);
    
    // Add mouse/touch listeners for mobile navigation
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleCanvasTouch);
    canvas.addEventListener('mousemove', handleCanvasHover);
    canvas.addEventListener('mouseout', handleCanvasMouseOut);
    
    // Start with first maze
    loadMaze(0, 0);
}

function loadMaze(sizeIndex, mazeIndex) {
    if (sizeIndex >= mazeSizes.length) {
        // Generate procedural mazes for sizes beyond 15x15
        generateProceduralMaze(16 + (sizeIndex - mazeSizes.length));
        return;
    }
    
    const size = mazeSizes[sizeIndex];
    const mazesForSize = getMazesForSize(size);
    
    if (!mazesForSize || mazeIndex >= mazesForSize.length) {
        // Move to next size
        loadMaze(sizeIndex + 1, 0);
        return;
    }
    
    currentSizeIndex = sizeIndex;
    currentMazeIndex = mazeIndex;
    currentMaze = mazesForSize[mazeIndex];
    
    // Reset game state
    playerPos = { x: currentMaze.start[0], y: currentMaze.start[1] };
    visitedCells.clear();
    visibleCells.clear();
    permanentlyVisible.clear();
    moves = 0;
    gameActive = true;
    
    // Update UI
    updateStatus();
    
    // Set canvas size based on container width and screen size
    const container = document.getElementById('container');
    const maxCanvasWidth = Math.min(container.offsetWidth - 40, 600); // 40px for padding
    const maxCanvasHeight = window.innerHeight * 0.5; // Use 50% of viewport height
    
    // Calculate cell size to fit the maze within constraints
    const cellSizeByWidth = Math.floor(maxCanvasWidth / currentMaze.width);
    const cellSizeByHeight = Math.floor(maxCanvasHeight / currentMaze.height);
    cellSize = Math.min(40, cellSizeByWidth, cellSizeByHeight);
    
    // Ensure minimum cell size for touch interaction
    if (window.innerWidth <= 768) {
        cellSize = Math.max(cellSize, 30); // Minimum 30px on mobile
    }
    
    canvas.width = currentMaze.width * cellSize;
    canvas.height = currentMaze.height * cellSize;
    
    // Mark starting position as visited
    const startKey = `${playerPos.x},${playerPos.y}`;
    visitedCells.set(startKey, 1);
    
    // Update visibility
    updateVisibility();
    
    // Update button states
    updateButtonStates();
    
    // Initial render
    render();
}

function updateVisibility() {
    // Clear previous visibility and clickable cells
    visibleCells.clear();
    clickableCells.clear();
    
    // Get current cell
    const cell = currentMaze.cells[playerPos.y][playerPos.x];
    
    // Check each direction and mark visible cells
    const directions = [
        { name: 'north', dx: 0, dy: -1 },
        { name: 'south', dx: 0, dy: 1 },
        { name: 'east', dx: 1, dy: 0 },
        { name: 'west', dx: -1, dy: 0 }
    ];
    
    for (const dir of directions) {
        let x = playerPos.x;
        let y = playerPos.y;
        
        // First check if we can move in this direction (for clickable cells)
        const currentCell = currentMaze.cells[y][x];
        if (!currentCell.walls[dir.name]) {
            const neighborX = playerPos.x + dir.dx;
            const neighborY = playerPos.y + dir.dy;
            if (neighborX >= 0 && neighborX < currentMaze.width && 
                neighborY >= 0 && neighborY < currentMaze.height) {
                clickableCells.add(`${neighborX},${neighborY}`);
            }
        }
        
        // Keep moving in this direction until we hit a wall
        while (true) {
            const currentCell = currentMaze.cells[y][x];
            
            // Check if there's a wall in this direction
            if (currentCell.walls[dir.name]) {
                break;
            }
            
            // Move to next cell
            x += dir.dx;
            y += dir.dy;
            
            // Check bounds
            if (x < 0 || x >= currentMaze.width || y < 0 || y >= currentMaze.height) {
                break;
            }
            
            // Mark as visible
            const cellKey = `${x},${y}`;
            visibleCells.add(cellKey);
            permanentlyVisible.add(cellKey);
        }
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw cells
    for (let y = 0; y < currentMaze.height; y++) {
        for (let x = 0; x < currentMaze.width; x++) {
            const cell = currentMaze.cells[y][x];
            const key = `${x},${y}`;
            
            // Determine cell color
            if (visitedCells.has(key)) {
                // White for visited cells
                ctx.fillStyle = 'white';
            } else if (permanentlyVisible.has(key)) {
                // Light gray for permanently visible cells
                ctx.fillStyle = '#e0e0e0';
            } else {
                // Black for unknown cells
                ctx.fillStyle = 'black';
            }
            
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            
            // Draw clickable cell indicator
            if (clickableCells.has(key) && gameActive) {
                ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                
                // Draw a subtle border for clickable cells
                ctx.strokeStyle = '#4CAF50';
                ctx.lineWidth = 2;
                ctx.strokeRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
            }
            
            // Draw hover effect
            if (hoveredCell && hoveredCell.x === x && hoveredCell.y === y && clickableCells.has(key)) {
                ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
            
            // Draw walls for visited cells
            if (visitedCells.has(key)) {
                drawCellWalls(x, y, cell);
                
                // Draw visit count
                const visitCount = visitedCells.get(key);
                ctx.fillStyle = '#999';
                ctx.font = '10px Arial';
                ctx.fillText(visitCount.toString(), x * cellSize + 8, y * cellSize + 16);
            }
            
            // Draw cell borders (subtle grid)
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
    
    // Draw goal
    const goalX = currentMaze.end[0];
    const goalY = currentMaze.end[1];
    ctx.fillStyle = '#f44336';
    ctx.fillRect(goalX * cellSize + cellSize * 0.2, goalY * cellSize + cellSize * 0.2, 
                 cellSize * 0.6, cellSize * 0.6);
    
    // Draw player
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(playerPos.x * cellSize + cellSize / 2, playerPos.y * cellSize + cellSize / 2, 
            cellSize * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

function drawCellWalls(x, y, cell) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    const margin = 4; // Small margin to keep walls inside the cell
    const startX = x * cellSize + margin;
    const startY = y * cellSize + margin;
    const endX = (x + 1) * cellSize - margin;
    const endY = (y + 1) * cellSize - margin;
    
    // Draw north wall
    if (cell.walls.north) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, startY);
        ctx.stroke();
    }
    
    // Draw south wall
    if (cell.walls.south) {
        ctx.beginPath();
        ctx.moveTo(startX, endY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
    
    // Draw east wall
    if (cell.walls.east) {
        ctx.beginPath();
        ctx.moveTo(endX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
    
    // Draw west wall
    if (cell.walls.west) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX, endY);
        ctx.stroke();
    }
}

function handleKeyPress(e) {
    if (!gameActive) return;
    
    let dx = 0, dy = 0;
    
    switch(e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
            dy = -1;
            break;
        case 'arrowdown':
        case 's':
            dy = 1;
            break;
        case 'arrowleft':
        case 'a':
            dx = -1;
            break;
        case 'arrowright':
        case 'd':
            dx = 1;
            break;
        default:
            return;
    }
    
    e.preventDefault();
    attemptMove(dx, dy);
}

function attemptMove(dx, dy) {
    const currentCell = currentMaze.cells[playerPos.y][playerPos.x];
    
    // Check which direction we're trying to move
    let directionName = '';
    if (dx === 1) directionName = 'east';
    else if (dx === -1) directionName = 'west';
    else if (dy === 1) directionName = 'south';
    else if (dy === -1) directionName = 'north';
    
    // Check if there's a wall
    if (currentCell.walls[directionName]) {
        showMessage('You hit a wall!', 'warning');
        return;
    }
    
    // Check bounds
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;
    
    if (newX < 0 || newX >= currentMaze.width || newY < 0 || newY >= currentMaze.height) {
        showMessage('You hit a wall!', 'warning');
        return;
    }
    
    // Move player
    playerPos.x = newX;
    playerPos.y = newY;
    moves++;
    
    // Update visit count
    const cellKey = `${playerPos.x},${playerPos.y}`;
    const currentVisits = visitedCells.get(cellKey) || 0;
    visitedCells.set(cellKey, currentVisits + 1);
    
    // Check win condition
    if (playerPos.x === currentMaze.end[0] && playerPos.y === currentMaze.end[1]) {
        handleWin();
        return;
    }
    
    // Check loss conditions
    const moveLimit = 3 * currentMaze.width * currentMaze.height;
    if (moves >= moveLimit) {
        handleLoss('Too many moves! You exceeded the move limit.');
        return;
    }
    
    if (currentVisits + 1 >= 10) {
        handleLoss('You visited the same cell 10 times!');
        return;
    }
    
    // Update visibility and render
    updateVisibility();
    updateStatus();
    updateButtonStates();
    render();
}

function handleWin() {
    gameActive = false;
    showMessage('Congratulations! You reached the goal!', 'success');
    
    // Disable all buttons
    document.getElementById('upButton').disabled = true;
    document.getElementById('downButton').disabled = true;
    document.getElementById('leftButton').disabled = true;
    document.getElementById('rightButton').disabled = true;
    
    // Show full maze after completion
    setTimeout(() => {
        revealFullMaze();
        setTimeout(() => {
            // Load next maze
            if (currentMazeIndex < 4) {
                loadMaze(currentSizeIndex, currentMazeIndex + 1);
            } else {
                loadMaze(currentSizeIndex + 1, 0);
            }
        }, 3000);
    }, 1000);
}

function handleLoss(message) {
    gameActive = false;
    showMessage(message, 'failure');
    
    // Disable all buttons
    document.getElementById('upButton').disabled = true;
    document.getElementById('downButton').disabled = true;
    document.getElementById('leftButton').disabled = true;
    document.getElementById('rightButton').disabled = true;
    
    // Show full maze after failure
    setTimeout(() => {
        revealFullMaze();
        setTimeout(() => {
            // Retry same maze
            loadMaze(currentSizeIndex, currentMazeIndex);
        }, 3000);
    }, 1000);
}

function revealFullMaze() {
    // Redraw maze with all cells visible and walls shown
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all cells as white
    for (let y = 0; y < currentMaze.height; y++) {
        for (let x = 0; x < currentMaze.width; x++) {
            ctx.fillStyle = 'white';
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
    
    // Draw walls
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    
    for (let y = 0; y < currentMaze.height; y++) {
        for (let x = 0; x < currentMaze.width; x++) {
            const cell = currentMaze.cells[y][x];
            
            if (cell.walls.north) {
                ctx.beginPath();
                ctx.moveTo(x * cellSize, y * cellSize);
                ctx.lineTo((x + 1) * cellSize, y * cellSize);
                ctx.stroke();
            }
            if (cell.walls.south) {
                ctx.beginPath();
                ctx.moveTo(x * cellSize, (y + 1) * cellSize);
                ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
                ctx.stroke();
            }
            if (cell.walls.east) {
                ctx.beginPath();
                ctx.moveTo((x + 1) * cellSize, y * cellSize);
                ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
                ctx.stroke();
            }
            if (cell.walls.west) {
                ctx.beginPath();
                ctx.moveTo(x * cellSize, y * cellSize);
                ctx.lineTo(x * cellSize, (y + 1) * cellSize);
                ctx.stroke();
            }
        }
    }
    
    // Highlight path taken
    for (const [cellKey, visits] of visitedCells) {
        const [x, y] = cellKey.split(',').map(Number);
        const alpha = Math.min(0.5, visits * 0.1);
        ctx.fillStyle = `rgba(76, 175, 80, ${alpha})`;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
    
    // Draw start and end
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(currentMaze.start[0] * cellSize + cellSize * 0.2, 
                 currentMaze.start[1] * cellSize + cellSize * 0.2,
                 cellSize * 0.6, cellSize * 0.6);
    
    ctx.fillStyle = '#f44336';
    ctx.fillRect(currentMaze.end[0] * cellSize + cellSize * 0.2, 
                 currentMaze.end[1] * cellSize + cellSize * 0.2,
                 cellSize * 0.6, cellSize * 0.6);
}

function updateStatus() {
    const currentSize = currentMaze ? currentMaze.width : 5;
    const moveLimit = 3 * currentSize * currentSize;
    
    document.getElementById('levelDisplay').textContent = currentLevel + 1;
    document.getElementById('sizeDisplay').textContent = `${currentSize}×${currentSize}`;
    document.getElementById('movesDisplay').textContent = moves;
    document.getElementById('limitDisplay').textContent = moveLimit;
    
    currentLevel++;
}

function showMessage(text, className = '') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = className;
    
    // Clear message after a few seconds
    if (className !== 'failure' && className !== 'success') {
        setTimeout(() => {
            messageEl.textContent = '';
            messageEl.className = '';
        }, 2000);
    }
}

// Procedural maze generation for levels beyond 15x15
function generateProceduralMaze(size) {
    showMessage(`Congratulations! You've completed all pre-generated mazes. Generating ${size}×${size} maze...`, 'success');
    
    // For now, we'll need to implement DFS maze generation
    // This is a placeholder that creates a simple maze
    const maze = generateDFSMaze(size, size);
    currentMaze = maze;
    
    // Reset game state
    playerPos = { x: 0, y: 0 };
    visitedCells.clear();
    visibleCells.clear();
    permanentlyVisible.clear();
    moves = 0;
    gameActive = true;
    
    // Update UI
    updateStatus();
    
    // Set canvas size based on container width and screen size
    const container = document.getElementById('container');
    const maxCanvasWidth = Math.min(container.offsetWidth - 40, 600); // 40px for padding
    const maxCanvasHeight = window.innerHeight * 0.5; // Use 50% of viewport height
    
    // Calculate cell size to fit the maze within constraints
    const cellSizeByWidth = Math.floor(maxCanvasWidth / maze.width);
    const cellSizeByHeight = Math.floor(maxCanvasHeight / maze.height);
    cellSize = Math.min(40, cellSizeByWidth, cellSizeByHeight);
    
    // Ensure minimum cell size for touch interaction
    if (window.innerWidth <= 768) {
        cellSize = Math.max(cellSize, 30); // Minimum 30px on mobile
    }
    
    canvas.width = maze.width * cellSize;
    canvas.height = maze.height * cellSize;
    
    // Mark starting position as visited
    const startKey = `${playerPos.x},${playerPos.y}`;
    visitedCells.set(startKey, 1);
    
    // Update visibility and render
    updateVisibility();
    render();
}

// DFS maze generation algorithm
function generateDFSMaze(width, height) {
    // Initialize maze with all walls
    const cells = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            row.push({
                x: x,
                y: y,
                walls: { north: true, south: true, east: true, west: true },
                visited: false
            });
        }
        cells.push(row);
    }
    
    // DFS algorithm
    const stack = [];
    const startX = 0, startY = 0;
    cells[startY][startX].visited = true;
    stack.push({ x: startX, y: startY });
    
    const directions = [
        { dx: 0, dy: -1, wall: 'north', opposite: 'south' },
        { dx: 1, dy: 0, wall: 'east', opposite: 'west' },
        { dx: 0, dy: 1, wall: 'south', opposite: 'north' },
        { dx: -1, dy: 0, wall: 'west', opposite: 'east' }
    ];
    
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        
        // Get unvisited neighbors
        const neighbors = [];
        for (const dir of directions) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !cells[ny][nx].visited) {
                neighbors.push({ x: nx, y: ny, dir: dir });
            }
        }
        
        if (neighbors.length > 0) {
            // Choose random neighbor
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            
            // Remove walls between current and next
            cells[current.y][current.x].walls[next.dir.wall] = false;
            cells[next.y][next.x].walls[next.dir.opposite] = false;
            
            // Mark next as visited and add to stack
            cells[next.y][next.x].visited = true;
            stack.push({ x: next.x, y: next.y });
        } else {
            // Backtrack
            stack.pop();
        }
    }
    
    // Clean up visited flags
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            delete cells[y][x].visited;
        }
    }
    
    return {
        width: width,
        height: height,
        start: [0, 0],
        end: [width - 1, height - 1],
        cells: cells,
        size: width,
        seed: 'procedural',
        filename: `procedural_${width}x${height}`
    };
}

// Mouse/Touch event handlers for mobile navigation
function handleCanvasClick(e) {
    if (!gameActive) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    const cellKey = `${x},${y}`;
    if (clickableCells.has(cellKey)) {
        // Move to the clicked cell
        const dx = x - playerPos.x;
        const dy = y - playerPos.y;
        attemptMove(dx, dy);
    }
}

function handleCanvasTouch(e) {
    if (!gameActive) return;
    e.preventDefault(); // Prevent scrolling
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.floor((touch.clientX - rect.left) / cellSize);
    const y = Math.floor((touch.clientY - rect.top) / cellSize);
    
    const cellKey = `${x},${y}`;
    if (clickableCells.has(cellKey)) {
        // Move to the touched cell
        const dx = x - playerPos.x;
        const dy = y - playerPos.y;
        attemptMove(dx, dy);
    }
}

function handleCanvasHover(e) {
    if (!gameActive) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    const cellKey = `${x},${y}`;
    if (clickableCells.has(cellKey)) {
        hoveredCell = { x, y };
        canvas.style.cursor = 'pointer';
    } else {
        hoveredCell = null;
        canvas.style.cursor = 'default';
    }
    render();
}

function handleCanvasMouseOut(e) {
    hoveredCell = null;
    canvas.style.cursor = 'default';
    if (gameActive) render();
}

// Navigation button functions
function moveUp() {
    if (gameActive) attemptMove(0, -1);
}

function moveDown() {
    if (gameActive) attemptMove(0, 1);
}

function moveLeft() {
    if (gameActive) attemptMove(-1, 0);
}

function moveRight() {
    if (gameActive) attemptMove(1, 0);
}

// Update button states based on available moves
function updateButtonStates() {
    const cell = currentMaze.cells[playerPos.y][playerPos.x];
    
    document.getElementById('upButton').disabled = cell.walls.north || playerPos.y === 0;
    document.getElementById('downButton').disabled = cell.walls.south || playerPos.y === currentMaze.height - 1;
    document.getElementById('leftButton').disabled = cell.walls.west || playerPos.x === 0;
    document.getElementById('rightButton').disabled = cell.walls.east || playerPos.x === currentMaze.width - 1;
}

// Handle window resize for responsive canvas
function handleResize() {
    if (!currentMaze) return;
    
    // Recalculate canvas size
    const container = document.getElementById('container');
    const maxCanvasWidth = Math.min(container.offsetWidth - 40, 600);
    const maxCanvasHeight = window.innerHeight * 0.5;
    
    const cellSizeByWidth = Math.floor(maxCanvasWidth / currentMaze.width);
    const cellSizeByHeight = Math.floor(maxCanvasHeight / currentMaze.height);
    cellSize = Math.min(40, cellSizeByWidth, cellSizeByHeight);
    
    if (window.innerWidth <= 768) {
        cellSize = Math.max(cellSize, 30);
    }
    
    canvas.width = currentMaze.width * cellSize;
    canvas.height = currentMaze.height * cellSize;
    
    // Redraw
    render();
}

// Add resize listener
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

// Make navigation functions available globally for onclick handlers
window.moveUp = moveUp;
window.moveDown = moveDown;
window.moveLeft = moveLeft;
window.moveRight = moveRight;
window.startGame = startGame;
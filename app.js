// Game State
let players = [];
let colors = ["#f1c40f", "#e67e22", "#e74c3c", "#9b59b6", "#3498db", "#1abc9c", "#2ecc71"];
let currentAngle = 0;
let isSpinning = false;

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const usernameInput = document.getElementById('username');
const joinBtn = document.getElementById('join-btn');
const startBtn = document.getElementById('start-btn');
const playerList = document.getElementById('players');
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');

// Join Lobby
joinBtn.addEventListener('click', () => {
    const initials = usernameInput.value.trim().toUpperCase();
    if (initials) {
        // In a real app, this pushes to Firebase. For now, it's local.
        const playerColor = colors[players.length % colors.length];
        players.push({ name: initials, color: playerColor });
        
        updateLobby();
        
        // Show start button if at least 2 players
        if (players.length >= 2) {
            startBtn.style.display = "inline-block";
        }
    }
});

function updateLobby() {
    playerList.innerHTML = "";
    players.forEach(p => {
        const li = document.createElement('li');
        li.textContent = p.name;
        li.style.color = p.color;
        li.style.fontWeight = "bold";
        li.style.fontSize = "20px";
        playerList.appendChild(li);
    });
}

// Start Game
startBtn.addEventListener('click', () => {
    setupScreen.style.display = "none";
    gameScreen.style.display = "block";
    drawWheel();
});

// Draw the Roulette Wheel
function drawWheel() {
    const numSlices = players.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numSlices; i++) {
        const startAngle = currentAngle + i * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        // Draw Slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = players[i].color;
        ctx.fill();
        ctx.stroke();

        // Draw Text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Arial";
        ctx.fillText(players[i].name, radius - 20, 10);
        ctx.restore();
    }
}

// Spin Animation Logic
spinBtn.addEventListener('click', () => {
    if (isSpinning) return;
    isSpinning = true;

    // Calculate a random target angle (multiple full rotations + random extra)
    const spinTarget = currentAngle + (Math.PI * 2 * 5) + (Math.random() * Math.PI * 2);
    let spinVelocity = 0.5;

    function animateSpin() {
        if (spinVelocity > 0.005) {
            currentAngle += spinVelocity;
            spinVelocity *= 0.98; // Friction to slow down
            drawWheel();
            requestAnimationFrame(animateSpin);
        } else {
            isSpinning = false;
            determineLoser();
        }
    }
    
    animateSpin();
});

function determineLoser() {
    const sliceAngle = (2 * Math.PI) / players.length;
    // Calculate which slice ended up at the top (270 degrees or 1.5 * PI)
    const normalizedAngle = currentAngle % (2 * Math.PI);
    const pointerAngle = (1.5 * Math.PI - normalizedAngle + 2 * Math.PI) % (2 * Math.PI);
    
    const loserIndex = Math.floor(pointerAngle / sliceAngle);
    const loser = players[loserIndex];
    
    setTimeout(() => {
        alert(`${loser.name} is eliminated! Bottoms up! 🍻`);
        // Remove player logic would go here
    }, 500);
}

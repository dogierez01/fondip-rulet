// Import Firebase directly from the web
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Your exact Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCN6b-FRru6LhcJlgyZBirLtyq7SiOyn6k",
  authDomain: "fondip-abb7a.firebaseapp.com",
  projectId: "fondip-abb7a",
  storageBucket: "fondip-abb7a.firebasestorage.app",
  messagingSenderId: "321764333207",
  appId: "1:321764333207:web:89a5f0364804d019a83bd2"
};

// Initialize Firebase Engine
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Database References
const playersRef = ref(db, 'players');
const spinRef = ref(db, 'spin');
const screenRef = ref(db, 'screen');

// Game State Variables
let players = [];
const colors = ["#f1c40f", "#e67e22", "#e74c3c", "#9b59b6", "#3498db", "#1abc9c", "#2ecc71", "#e84393", "#00cec9"];
let currentAngle = 0;
let isSpinning = false;

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const usernameInput = document.getElementById('username');
const joinBtn = document.getElementById('join-btn');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const playerList = document.getElementById('players');
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');

// Popup DOM Elements
const popup = document.getElementById('elimination-popup');
const overlay = document.getElementById('overlay');
const loserNameText = document.getElementById('loser-name-text');
const closePopupBtn = document.getElementById('close-popup-btn');

// Close Popup Logic
closePopupBtn.addEventListener('click', () => {
    popup.style.display = "none";
    overlay.style.display = "none";
});

// ----------------------------------------------------
// 1. LOBBY & PLAYER SYNC
// ----------------------------------------------------

joinBtn.addEventListener('click', () => {
    const initials = usernameInput.value.trim().toUpperCase();
    if (initials) {
        const playerColor = colors[players.length % colors.length];
        
        push(playersRef, {
            name: initials,
            color: playerColor
        });
        
        usernameInput.style.display = "none";
        joinBtn.style.display = "none";
    }
});

onValue(playersRef, (snapshot) => {
    players = [];
    playerList.innerHTML = "";
    
    snapshot.forEach((childSnapshot) => {
        const p = childSnapshot.val();
        p.id = childSnapshot.key; // Save the unique Firebase ID so we can delete them later
        players.push(p);
        
        const li = document.createElement('li');
        li.textContent = p.name;
        li.style.color = p.color;
        li.style.fontWeight = "bold";
        li.style.fontSize = "20px";
        playerList.appendChild(li);
    });

    if (players.length >= 2) {
        startBtn.style.display = "inline-block";
    } else {
        startBtn.style.display = "none";
    }
    
    // Redraw wheel or clear it if empty
    if(players.length > 0) {
        drawWheel();
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
});

resetBtn.addEventListener('click', () => {
    remove(playersRef);
    set(screenRef, 'lobby');
    window.location.reload();
});

// ----------------------------------------------------
// 2. SCREEN SYNC
// ----------------------------------------------------

startBtn.addEventListener('click', () => {
    set(screenRef, 'game'); 
});

onValue(screenRef, (snapshot) => {
    const screenState = snapshot.val();
    if (screenState === 'game') {
        setupScreen.style.display = "none";
        gameScreen.style.display = "block";
        drawWheel();
    } else {
        setupScreen.style.display = "block";
        gameScreen.style.display = "none";
    }
});

// ----------------------------------------------------
// 3. WHEEL DRAWING & SPIN SYNC
// ----------------------------------------------------

function drawWheel() {
    if(players.length === 0) return;
    
    const numSlices = players.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numSlices; i++) {
        const startAngle = currentAngle + i * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = players[i].color;
        ctx.fill();
        ctx.stroke();

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

spinBtn.addEventListener('click', () => {
    if (isSpinning || players.length === 0) return;
    
    const targetAngle = currentAngle + (Math.PI * 2 * 5) + (Math.random() * Math.PI * 2);
    const spinId = Date.now(); 
    
    set(spinRef, {
        target: targetAngle,
        id: spinId
    });
});

let lastSpinId = 0;
onValue(spinRef, (snapshot) => {
    const spinData = snapshot.val();
    
    if (spinData && spinData.id !== lastSpinId && !isSpinning) {
        lastSpinId = spinData.id;
        executeSpin(spinData.target);
    }
});

function executeSpin(targetAngle) {
    isSpinning = true;
    let spinVelocity = 0.5;

    function animateSpin() {
        if (currentAngle < targetAngle && spinVelocity > 0.005) {
            currentAngle += spinVelocity;
            
            const distanceLeft = targetAngle - currentAngle;
            if (distanceLeft < 10) spinVelocity *= 0.97; 
            
            drawWheel();
            requestAnimationFrame(animateSpin);
        } else {
            currentAngle = targetAngle; 
            drawWheel();
            isSpinning = false;
            determineLoser();
        }
    }
    
    animateSpin();
}

function determineLoser() {
    const sliceAngle = (2 * Math.PI) / players.length;
    const normalizedAngle = currentAngle % (2 * Math.PI);
    const pointerAngle = (1.5 * Math.PI - normalizedAngle + 2 * Math.PI) % (2 * Math.PI);
    
    const loserIndex = Math.floor(pointerAngle / sliceAngle);
    const loser = players[loserIndex];
    
    setTimeout(() => {
        // Show the custom popup instead of the browser alert
        loserNameText.textContent = loser.name;
        popup.style.display = "block";
        overlay.style.display = "block";
        
        // Delete the eliminated player directly from the Firebase database
        remove(ref(db, 'players/' + loser.id));
    }, 500);
}

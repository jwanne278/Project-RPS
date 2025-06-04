/***************************************
 * GAME STATE VARIABLES
 * Tracks the current state of the game including:
 * - Player's wallet balance
 * - Currently selected move
 * - Wheel rotation position
 ***************************************/
let wallet = 0;                  // Player's current gem balance
let selectedChoice = null;       // Player's selected move (rock, paper, or scissors)
let currentRotation = 0;         // Current rotation angle of the wheel in degrees

/***************************************
 * GAME CONFIGURATION
 * Core game settings and constants:
 * - Wheel segments and options
 * - Color schemes
 * - Canvas setup
 ***************************************/
const segmentCount = 12;         // Number of segments on the wheel
const options = ['rock', 'paper', 'scissors'];  // Possible game moves
const colors = [
    getComputedStyle(document.documentElement).getPropertyValue('--wheel-color-1').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--wheel-color-2').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--wheel-color-3').trim()
];
const wheelTextColor = getComputedStyle(document.documentElement).getPropertyValue('--wheel-text-color').trim();
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

/***************************************
 * AUDIO SYSTEM SETUP
 * Handles all game sound effects:
 * - Win/lose/tie sounds
 * - Wheel spinning sound
 * - Audio context and processing
 ***************************************/
const sounds = {
  win: document.getElementById('winSound'),
  tie: document.getElementById('tieSound'),
  lose: document.getElementById('loseSound'),
  tick: document.getElementById('tickSound')
};

// Audio context setup for ticking sound during wheel spin
let audioContext;
let tickSource;
let gainNode;

// Initialize audio context on first user interaction
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const tickAudio = document.getElementById('tickSound');
        tickSource = audioContext.createMediaElementSource(tickAudio);
        gainNode = audioContext.createGain();
        tickSource.connect(gainNode).connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Add click listener to initialize audio
document.addEventListener('click', initAudio, { once: true });

/***************************************
 * UTILITY FUNCTIONS
 * Helper functions for DOM manipulation
 ***************************************/
const $ = id => document.getElementById(id);

/***************************************
 * WHEEL RENDERING
 * Handles the visual creation of the wheel:
 * - Segment drawing
 * - Text placement
 * - Color application
 ***************************************/
function drawWheel() {
  const anglePerSegment = (2 * Math.PI) / segmentCount;
  for (let i = 0; i < segmentCount; i++) {
    const angle = i * anglePerSegment;
    // Draw segment
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.arc(200, 200, 200, angle, angle + anglePerSegment);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    // Draw text
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(angle + anglePerSegment / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = wheelTextColor;
    ctx.font = 'bold 14px Orbitron';
    ctx.fillText(options[i % 3].toUpperCase(), 180, 5);
    ctx.restore();
  }
}

/***************************************
 * WALLET MANAGEMENT
 * Handles all gem-related operations:
 * - Balance updates
 * - Adding funds
 ***************************************/
function updateWallet(amount) {
  wallet += amount;
  $('wallet').textContent = wallet.toFixed(2);
}

// Function to add funds to the player's wallet
function addFunds() {
  const amount = parseFloat($('add-funds').value);
  if (!amount || amount <= 0) return alert('Enter a valid amount of gems');
  updateWallet(amount);
  $('add-funds').value = '';
}

/***************************************
 * GAME MECHANICS
 * Core game logic functions:
 * - Player choice handling
 * - Wheel position calculation
 * - Outcome determination
 ***************************************/
function selectChoice(choice) {
  selectedChoice = choice;
  $('result').textContent = `Selected: ${choice.toUpperCase()}`;
}

// Function to determine which segment the pointer is pointing to
function getPointerSegment(angle) {
  const normalized = (angle % 360 + 360) % 360;
  const adjusted = (360 - normalized + 0) % 360;
  const index = Math.floor(adjusted / (360 / segmentCount));
  return options[index % options.length];
}

// Function to determine the game outcome
function getOutcome(player, wheel) {
  if (player === wheel) return { result: 'tie', msg: `🤝 It's a tie!` };
  const win =
    (player === 'rock' && wheel === 'scissors') ||
    (player === 'paper' && wheel === 'rock') ||
    (player === 'scissors' && wheel === 'paper');
  return win
    ? { result: 'win', msg: `✅ You win! ${player} beats ${wheel}.` }
    : { result: 'lose', msg: `❌ You lose! ${wheel} beats ${player}.` };
}

/***************************************
 * SOUND EFFECTS
 * Handles the wheel spinning sound:
 * - Sound initialization
 * - Volume control
 * - Fade out effect
 ***************************************/
function playTickingSound(duration = 4000) {
    if (!audioContext) initAudio();
    
    const tickAudio = document.getElementById('tickSound');
    tickAudio.currentTime = 0;
    gainNode.gain.setValueAtTime(1, audioContext.currentTime);
    
    // Ensure the audio context is running
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            tickAudio.play().catch(err => console.log('Audio playback failed:', err));
        });
    } else {
        tickAudio.play().catch(err => console.log('Audio playback failed:', err));
    }

    // Fade out the ticking sound near the end
    const fadeStartTime = audioContext.currentTime + (duration - 1000) / 1000;
    gainNode.gain.setTargetAtTime(0, fadeStartTime, 0.5);

    // Stop the sound after duration
    setTimeout(() => {
        tickAudio.pause();
        tickAudio.currentTime = 0;
        gainNode.gain.setValueAtTime(1, audioContext.currentTime);
    }, duration);
}

/***************************************
 * SPIN MECHANICS
 * Handles the wheel spinning action:
 * - Input validation
 * - Animation control
 * - Result processing
 ***************************************/
function triggerSpin() {
  // Validate player input
  if (!selectedChoice) return alert('Select Rock, Paper, or Scissors');
  const bet = parseFloat($('bet-amount').value);
  if (!bet || bet <= 0) return alert('Enter a valid bet amount in gems');
  if (bet > wallet) return alert('Insufficient gems');

  // Calculate spin animation
  const minSpins = 5;  // Minimum number of full rotations
  const extraSpins = Math.floor(Math.random() * 3);  // Add 0-2 extra spins for variety
  const totalSpins = minSpins + extraSpins;
  const landingOffset = Math.floor(Math.random() * 360);  // Random final position
  
  // Calculate the new total rotation
  const totalRotation = (360 * totalSpins) + landingOffset;
  const spinDuration = 4000;  // 4 seconds spin duration

  // Animate the wheel
  canvas.style.transition = `transform ${spinDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
  canvas.style.transform = `rotate(${totalRotation}deg)`;

  // Play spinning sound effect
  playTickingSound(spinDuration);

  // Update current rotation to the new landing position
  currentRotation = landingOffset;

  // Handle game outcome after spin
  setTimeout(() => {
    const landed = getPointerSegment(currentRotation);
    const result = getOutcome(selectedChoice, landed);

    // Update UI with result
    $('result').textContent = result.msg;
    $('history').innerHTML += `<p>${result.result.toUpperCase()} — ${result.msg}</p>`;

    // Update wallet based on outcome
    if (result.result === 'win') updateWallet(bet);
    if (result.result === 'lose') updateWallet(-bet);

    // Play result sound and reset game state
    sounds[result.result].play();
    $('bet-amount').value = '';  // Clear the bet input
    selectedChoice = null;
  }, spinDuration + 200);
}

/***************************************
 * GAME RESET
 * Handles resetting the game state:
 * - Clear wallet
 * - Reset selections
 * - Clear history
 ***************************************/
function restartGame() {
  wallet = 0;
  selectedChoice = null;
  currentRotation = 0;
  $('wallet').textContent = '0';
  $('result').textContent = 'Make your move.';
  $('history').innerHTML = '<strong>Game History:</strong>';
  $('bet-amount').value = '';
  canvas.style.transition = 'none';
  canvas.style.transform = 'rotate(0deg)';
}

/***************************************
 * INITIALIZATION
 * Initial setup when page loads
 ***************************************/
drawWheel();


  
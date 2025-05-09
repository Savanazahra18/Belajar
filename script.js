// DOM Elements
const video = document.getElementById('video');
const emotionText = document.getElementById('emotion');
const loginPage = document.getElementById('loginPage');
const registerPage = document.getElementById('registerPage');
const mainPage = document.getElementById('mainPage');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const emotionList = document.querySelector('.emotion-list');
const startCameraBtn = document.getElementById('startCamera');
const stopCameraBtn = document.getElementById('stopCamera');
const videoContainer = document.getElementById('videoContainer');
const cameraOverlay = document.getElementById('cameraOverlay');
const moodIcon = document.getElementById('moodIcon');

// Camera stream reference
let currentStream = null;

// Dummy user database
let users = [
    { username: 'demo', password: 'demo123', email: 'demo@example.com' }
];

// Event Listeners
startCameraBtn?.addEventListener('click', async () => {
    try {
        await initializeEmotionDetection();
        toggleCameraUI(true);
    } catch (error) {
        alert('Tidak dapat mengakses kamera: ' + error.message);
        console.error(error);
    }
});

stopCameraBtn?.addEventListener('click', stopCamera);

// Show/hide pages
function showLogin() {
    registerPage?.classList.add('hidden');
    loginPage?.classList.remove('hidden');
}

function showRegister() {
    loginPage?.classList.add('hidden');
    registerPage?.classList.remove('hidden');
}

function login(event) {
    event.preventDefault();
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        loginPage?.classList.add('hidden');
        mainPage?.classList.remove('hidden');
    } else {
        alert('Invalid credentials! Try demo/demo123 or register a new account.');
    }
}

function register(event) {
    event.preventDefault();
    const username = document.getElementById('regUsername')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const confirmPassword = document.getElementById('regConfirmPassword')?.value;

    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    if (users.some(u => u.username === username)) {
        alert('Username already exists!');
        return;
    }

    users.push({ username, password, email });
    alert('Registration successful! Please login.');
    showLogin();
}

function logout() {
    loginPage?.classList.remove('hidden');
    mainPage?.classList.add('hidden');
    stopCamera();
}

// Start/stop camera
function toggleCameraUI(isRunning) {
    startCameraBtn?.classList.toggle('hidden', isRunning);
    stopCameraBtn?.classList.toggle('hidden', !isRunning);
    videoContainer?.classList.toggle('hidden', !isRunning);
    cameraOverlay?.classList.toggle('hidden', isRunning);
    emotionText.textContent = isRunning ? 'Menganalisis...' : 'Menunggu Kamera...';
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    video.srcObject = null;
    toggleCameraUI(false);
    resetEmotionDisplay();
}

// Load face-api.js models and start video
async function initializeEmotionDetection() {
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'),
        faceapi.nets.faceExpressionNet.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights')
    ]);
    await startVideo();
}

async function startVideo() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 720, height: 560 } });
    video.srcObject = stream;
    currentStream = stream;
}

// Emotion tracking
let recentEmotions = [];

function updateEmotionHistory(emotion) {
    recentEmotions.unshift({ emotion, timestamp: new Date() });
    recentEmotions = recentEmotions.slice(0, 5);

    emotionList.innerHTML = recentEmotions.map(({ emotion, timestamp }) => {
        const timeStr = timestamp.toLocaleTimeString();
        const icons = {
            happy: 'fa-face-laugh-beam',
            sad: 'fa-face-sad-tear',
            angry: 'fa-face-angry'
        };
        const iconClass = icons[emotion.toLowerCase()] || 'fa-face-meh';

        return `
            <div class="emotion-item ${emotion.toLowerCase()}">
                <i class="fas ${iconClass}"></i>
                <span>${emotion}</span>
                <span style="margin-left:auto;font-size:0.9em;color:#666">${timeStr}</span>
            </div>`;
    }).join('');
}

function resetEmotionDisplay() {
    ['happy', 'sad', 'angry'].forEach(emotion => {
        document.getElementById(`${emotion}Progress`).style.width = '0%';
        document.getElementById(`${emotion}Percentage`).textContent = '0%';
    });
    moodIcon.className = 'fas fa-face-meh';
}

video?.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    video.parentElement.appendChild(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
        if (!detections.length) return;

        const expressions = detections[0].expressions;
        const percentages = {
            happy: Math.round(expressions.happy * 100),
            sad: Math.round(expressions.sad * 100),
            angry: Math.round(expressions.angry * 100)
        };

        for (const [emotion, value] of Object.entries(percentages)) {
            document.getElementById(`${emotion}Progress`).style.width = `${value}%`;
            document.getElementById(`${emotion}Percentage`).textContent = `${value}%`;
        }

        const dominant = Object.entries(expressions)
            .filter(([key]) => ['happy', 'sad', 'angry'].includes(key))
            .reduce((a, b) => a[1] > b[1] ? a : b)[0];

        const capitalizedEmotion = dominant.charAt(0).toUpperCase() + dominant.slice(1);
        emotionText.textContent = capitalizedEmotion;
        moodIcon.className = `fas ${
            dominant === 'happy' ? 'fa-face-laugh-beam' :
            dominant === 'sad' ? 'fa-face-sad-tear' :
            dominant === 'angry' ? 'fa-face-angry' : 'fa-face-meh'
        } ${dominant}`;

        updateEmotionHistory(capitalizedEmotion);

        const resized = faceapi.resizeResults(detections, displaySize);
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceExpressions(canvas, resized);
    }, 100);
});

// Form bindings
loginForm?.addEventListener('submit', login);
registerForm?.addEventListener('submit', register);
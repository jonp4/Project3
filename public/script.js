// API URLs
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://your-render-app-name.onrender.com/api';  // Replace with your actual Render URL
const TRIVIA_API_URL = 'https://opentdb.com/api.php';
const TRIVIA_CATEGORIES_URL = 'https://opentdb.com/api_category.php';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const signupScreen = document.getElementById('signup-screen');
const startScreen = document.querySelector('.start-screen');
const quizScreen = document.querySelector('.quiz');
const endScreen = document.querySelector('.end-screen');
const profileScreen = document.querySelector('.profile-screen');
const leaderboardScreen = document.querySelector('.leaderboard-screen');

// Auth Elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');

// Quiz Elements
const categorySelect = document.getElementById('category');
const numQuestionsSelect = document.getElementById('num-questions');
const timeSelect = document.getElementById('time');
const startBtn = document.querySelector('.btn.start');
const submitBtn = document.querySelector('.btn.submit');
const nextBtn = document.querySelector('.btn.next');
const questionNumber = document.querySelector('.number .current');
const totalQuestions = document.querySelector('.number .total');
const questionText = document.querySelector('.question');
const answerWrapper = document.querySelector('.answer-wrapper');
const progressBar = document.querySelector('.progress-bar');
const progressText = document.querySelector('.progress-text');

// State Management
let token = localStorage.getItem('token');
let currentUser = null;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer = null;
let timeLeft = 0;

// Initialize App
async function init() {
    if (token) {
        try {
            const response = await fetch(`${API_URL}/auth/verify`, {
                headers: { 'x-auth-token': token }
            });
            if (response.ok) {
                currentUser = await response.json();
                showStartScreen();
            } else {
                showLoginScreen();
            }
        } catch (error) {
            console.error('Error verifying token:', error);
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
    await loadCategories();
}

// Authentication Functions
async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            currentUser = data.user;
            showStartScreen();
        } else {
            alert(data.msg);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Error logging in');
    }
}

async function signup(username, email, password) {
    try {
        // Basic client-side validation
        if (!username || !email || !password) {
            alert('Please fill in all fields');
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }

        // Password validation (at least 6 characters)
        if (password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();

        if (response.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            currentUser = data.user;
            showStartScreen();
        } else {
            // Show specific error message from server
            if (data.msg) {
                alert(data.msg);
            } else if (data.fields) {
                // Handle field-specific errors
                const missingFields = Object.entries(data.fields)
                    .filter(([_, missing]) => missing)
                    .map(([field]) => field);
                alert(`Please fill in the following fields: ${missingFields.join(', ')}`);
            } else {
                alert('Error during signup. Please try again.');
            }
        }
    } catch (error) {
        // Network or connection errors
        if (!navigator.onLine) {
            alert('Please check your internet connection and try again');
        } else if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            alert('Unable to connect to the server. Please check if the server is running and try again.');
        } else {
            alert(`Error signing up: ${error.message || 'Please try again later'}`);
        }
        console.error('Signup error details:', error);
    }
}

// Quiz Functions
async function loadCategories() {
    try {
        const response = await fetch(TRIVIA_CATEGORIES_URL);
        const data = await response.json();
        categorySelect.innerHTML = '<option value="">Any Category</option>';
        data.trivia_categories.forEach(category => {
            categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function startQuiz() {
    const numQuestions = numQuestionsSelect.value;
    const category = categorySelect.value;
    const url = `${TRIVIA_API_URL}?amount=${numQuestions}${category ? `&category=${category}` : ''}&type=multiple`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        questions = data.results;
        currentQuestionIndex = 0;
        score = 0;
        showQuizScreen();
        loadQuestion();
    } catch (error) {
        console.error('Error starting quiz:', error);
        alert('Error loading questions');
    }
}

function loadQuestion() {
    const question = questions[currentQuestionIndex];
    questionNumber.textContent = currentQuestionIndex + 1;
    totalQuestions.textContent = `/${questions.length}`;
    questionText.textContent = decodeHTML(question.question);

    const answers = [...question.incorrect_answers, question.correct_answer]
        .sort(() => Math.random() - 0.5);

    answerWrapper.innerHTML = answers.map(answer => `
        <div class="answer">
            <span class="text">${decodeHTML(answer)}</span>
            <span class="checkbox">
                <i class="fas fa-check"></i>
            </span>
        </div>
    `).join('');

    // Reset timer
    timeLeft = parseInt(timeSelect.value);
    startTimer();
}

function startTimer() {
    clearInterval(timer);
    progressBar.style.width = '100%';
    updateTimerText();

    timer = setInterval(() => {
        timeLeft--;
        updateTimerText();
        progressBar.style.width = `${(timeLeft / timeSelect.value) * 100}%`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            handleAnswer(null);
        }
    }, 1000);
}

function updateTimerText() {
    progressText.textContent = `${timeLeft}s`;
}

function handleAnswer(selectedAnswer) {
    clearInterval(timer);
    const correctAnswer = questions[currentQuestionIndex].correct_answer;
    
    if (selectedAnswer === correctAnswer) {
        score++;
    }

    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        endQuiz();
    }
}

async function endQuiz() {
    clearInterval(timer);
    
    // Save score to database
    try {
        await fetch(`${API_URL}/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({
                score,
                totalQuestions: questions.length,
                category: categorySelect.options[categorySelect.selectedIndex].text,
                timePerQuestion: parseInt(timeSelect.value)
            })
        });
    } catch (error) {
        console.error('Error saving score:', error);
    }

    showEndScreen();
}

// Profile Functions
async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/scores/user`, {
            headers: { 'x-auth-token': token }
        });
        const scores = await response.json();
        
        document.querySelector('.username').textContent = currentUser.username;
        document.querySelector('.email').textContent = currentUser.email;
        
        const historyList = document.querySelector('.history-list');
        historyList.innerHTML = scores.map(score => `
            <div class="history-item">
                <div>
                    <div>Category: ${score.category}</div>
                    <div>Score: ${score.score}/${score.totalQuestions}</div>
                </div>
                <div>${new Date(score.date).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Leaderboard Functions
async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/scores/leaderboard`);
        const scores = await response.json();
        
        const leaderboardList = document.querySelector('.leaderboard-list');
        leaderboardList.innerHTML = scores.map((score, index) => `
            <div class="leaderboard-item">
                <div>
                    <div>#${index + 1} ${score.user.username}</div>
                    <div>Score: ${score.score}/${score.totalQuestions}</div>
                </div>
                <div>${score.category}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Social Media Sharing
function shareOnTwitter() {
    const text = `I scored ${score}/${questions.length} on the Quiz App!`;
    const url = 'https://your-quiz-app-url.com';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
}

function shareOnFacebook() {
    const url = 'https://your-quiz-app-url.com';
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
}

// Utility Functions
function decodeHTML(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

function showScreen(screen) {
    [loginScreen, signupScreen, startScreen, quizScreen, endScreen, profileScreen, leaderboardScreen]
        .forEach(s => s.classList.add('hide'));
    screen.classList.remove('hide');
}

const showLoginScreen = () => showScreen(loginScreen);
const showSignupScreen = () => showScreen(signupScreen);
const showStartScreen = () => showScreen(startScreen);
const showQuizScreen = () => showScreen(quizScreen);
const showEndScreen = () => {
    document.querySelector('.final-score').textContent = score;
    document.querySelector('.total-score').textContent = `/${questions.length}`;
    showScreen(endScreen);
};
const showProfileScreen = () => {
    loadProfile();
    showScreen(profileScreen);
};
const showLeaderboardScreen = () => {
    loadLeaderboard();
    showScreen(leaderboardScreen);
};

// Event Listeners
loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    login(email, password);
});

signupForm.addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    signup(username, email, password);
});

showSignupLink.addEventListener('click', showSignupScreen);
showLoginLink.addEventListener('click', showLoginScreen);

startBtn.addEventListener('click', startQuiz);

answerWrapper.addEventListener('click', e => {
    const answer = e.target.closest('.answer');
    if (!answer) return;

    const selectedAnswer = answer.querySelector('.text').textContent;
    handleAnswer(selectedAnswer);
});

document.querySelectorAll('.view-profile').forEach(btn => 
    btn.addEventListener('click', showProfileScreen)
);

document.querySelectorAll('.view-leaderboard').forEach(btn => 
    btn.addEventListener('click', showLeaderboardScreen)
);

document.querySelectorAll('.back-to-start').forEach(btn => 
    btn.addEventListener('click', showStartScreen)
);

document.querySelector('.share-twitter').addEventListener('click', shareOnTwitter);
document.querySelector('.share-facebook').addEventListener('click', shareOnFacebook);

// Initialize the app
init(); 
// ==========================================
// STATE VARIABLES & USER DATA
// ==========================================
let questionBank = [];
let currentQuizSession = [];
let currentQuestionIndex = 0;
let sessionScore = 0;
let sessionXP = 0;

// Load user data from localStorage, or set defaults if new user
let userData = {
    totalXP: parseInt(localStorage.getItem('isc_totalXP')) || 0,
    streakCount: parseInt(localStorage.getItem('isc_streakCount')) || 0,
    lastPlayedDate: localStorage.getItem('isc_lastPlayedDate') || null
};

// ==========================================
// DOM ELEMENTS
// ==========================================
// Views
const dashboardView = document.getElementById('dashboard-view');
const quizView = document.getElementById('quiz-view');
const resultsView = document.getElementById('results-view');

// Dashboard Elements
const streakDisplay = document.getElementById('streak-display');
const xpDisplay = document.getElementById('xp-display');
const rankDisplay = document.getElementById('rank-display');
const startBtn = document.getElementById('start-btn');

// Quiz Elements
const progressBarFill = document.getElementById('progress-bar-fill');
const difficultyTag = document.getElementById('difficulty-tag');
const blueprintTag = document.getElementById('blueprint-tag');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedbackContainer = document.getElementById('feedback-container');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackExplanation = document.getElementById('feedback-explanation');
const nextBtn = document.getElementById('next-btn');
const quitBtn = document.getElementById('quit-btn');

// Results Elements
const finalScoreDisplay = document.getElementById('final-score');
const earnedXpDisplay = document.getElementById('earned-xp');
const homeBtn = document.getElementById('home-btn');


// ==========================================
// INITIALIZATION
// ==========================================
async function initApp() {
    updateDashboardUI();
    
    try {
        // Fetch the questions from our JSON file
        const response = await fetch('questions.json');
        if (!response.ok) throw new Error("Could not load questions");
        questionBank = await response.json();
    } catch (error) {
        console.error(error);
        questionText.innerText = "Error loading questions. Make sure you are running this on a web server!";
    }
}

// ==========================================
// UI & NAVIGATION FUNCTIONS
// ==========================================
function showView(viewToShow) {
    dashboardView.classList.add('hidden');
    quizView.classList.add('hidden');
    resultsView.classList.add('hidden');
    viewToShow.classList.remove('hidden');
}

function updateDashboardUI() {
    streakDisplay.innerText = userData.streakCount;
    xpDisplay.innerText = `${userData.totalXP} XP`;
    rankDisplay.innerText = calculateRank(userData.totalXP);
}

function calculateRank(xp) {
    if (xp < 500) return "Intern";
    if (xp < 2000) return "Staff Auditor";
    if (xp < 5000) return "Senior Auditor";
    return "Partner";
}

// ==========================================
// QUIZ LOGIC
// ==========================================
function startQuiz() {
    if (questionBank.length === 0) return; // Prevent starting if no questions loaded

    // Reset session variables
    currentQuestionIndex = 0;
    sessionScore = 0;
    sessionXP = 0;
    
    // Pick 5 random questions for a "bite-sized" session
    currentQuizSession = shuffleArray([...questionBank]).slice(0, 5);
    
    showView(quizView);
    renderQuestion();
}

function renderQuestion() {
    // Hide feedback from previous question
    feedbackContainer.classList.add('hidden');
    feedbackContainer.classList.remove('correct-state', 'incorrect-state');
    optionsContainer.innerHTML = ''; // Clear old options

    const currentQuestion = currentQuizSession[currentQuestionIndex];
    
    // Update Progress Bar
    const progressPercent = (currentQuestionIndex / currentQuizSession.length) * 100;
    progressBarFill.style.width = `${progressPercent}%`;

    // Populate Metadata Tags
    let diffText = currentQuestion.metadata.difficulty === 1 ? "Easy" : 
                   currentQuestion.metadata.difficulty === 2 ? "Medium" : "Hard";
    difficultyTag.innerText = diffText;
    
    // Grab the first part of the blueprint string for a cleaner tag
    blueprintTag.innerText = currentQuestion.metadata.blueprint_area.split('.')[0] || "General";

    // Populate Question Text
    questionText.innerText = currentQuestion.content.prompt;

    // Create Option Buttons
    currentQuestion.content.options.forEach(option => {
        const btn = document.createElement('button');
        btn.classList.add('option-btn');
        btn.innerText = option;
        btn.onclick = () => handleAnswer(btn, option, currentQuestion);
        optionsContainer.appendChild(btn);
    });
}

function handleAnswer(selectedBtn, selectedText, questionObj) {
    // Disable all buttons so user can't click twice
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(btn => btn.style.pointerEvents = 'none');
    
    const isCorrect = selectedText === questionObj.content.correct_answer;
    
    // Handle Correct Answer
    if (isCorrect) {
        selectedBtn.classList.add('correct');
        feedbackTitle.innerText = "Correct!";
        feedbackContainer.classList.add('correct-state');
        sessionScore++;
        
        // Calculate XP based on difficulty
        const xpReward = questionObj.metadata.difficulty * 10;
        sessionXP += xpReward;
    } 
    // Handle Incorrect Answer
    else {
        selectedBtn.classList.add('incorrect');
        feedbackTitle.innerText = "Incorrect";
        feedbackContainer.classList.add('incorrect-state');
        
        // Highlight the correct answer for them
        allBtns.forEach(btn => {
            if (btn.innerText === questionObj.content.correct_answer) {
                btn.classList.add('correct');
            }
        });
    }

    // Show Explanation
    feedbackExplanation.innerText = questionObj.content.explanation;
    feedbackContainer.classList.remove('hidden');
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuizSession.length) {
        renderQuestion();
    } else {
        finishQuiz();
    }
}

// ==========================================
// RESULTS & SAVING DATA
// ==========================================
function finishQuiz() {
    // 1. Update Progress Bar to 100%
    progressBarFill.style.width = `100%`;

    // 2. Update Streak Logic
    const today = new Date().toDateString();
    if (userData.lastPlayedDate !== today) {
        // If they played yesterday, add to streak. Otherwise, reset to 1.
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (userData.lastPlayedDate === yesterday.toDateString()) {
            userData.streakCount++;
        } else {
            userData.streakCount = 1; 
        }
        userData.lastPlayedDate = today;
        localStorage.setItem('isc_lastPlayedDate', userData.lastPlayedDate);
        localStorage.setItem('isc_streakCount', userData.streakCount);
    }

    // 3. Update XP
    userData.totalXP += sessionXP;
    localStorage.setItem('isc_totalXP', userData.totalXP);

    // 4. Update UI
    finalScoreDisplay.innerText = `${sessionScore} / ${currentQuizSession.length}`;
    earnedXpDisplay.innerText = `+${sessionXP} XP`;
    
    // 5. Show Results View
    setTimeout(() => {
        showView(resultsView);
    }, 500); // Small delay feels more natural
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
// Fisher-Yates Shuffle algorithm for randomizing questions
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==========================================
// EVENT LISTENERS
// ==========================================
startBtn.addEventListener('click', startQuiz);
nextBtn.addEventListener('click', nextQuestion);
quitBtn.addEventListener('click', () => {
    updateDashboardUI();
    showView(dashboardView);
});
homeBtn.addEventListener('click', () => {
    updateDashboardUI();
    showView(dashboardView);
});

// Run initialization on load
initApp();
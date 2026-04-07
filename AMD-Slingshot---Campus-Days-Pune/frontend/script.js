// Baseline User Profile (Mocked)
let dailyGoal = {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fats: 60
};

// DOM Elements
const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status-text');
const manualForm = document.getElementById('manual-form');
const textInput = document.getElementById('text-input');
const logOutput = document.getElementById('log-output');
const loadingSpinner = document.getElementById('loading-spinner');

const remCal = document.getElementById('rem-cal');
const remPro = document.getElementById('rem-pro');
const remCarb = document.getElementById('rem-carb');
const remFat = document.getElementById('rem-fat');

const recommendBtn = document.getElementById('recommend-btn');
const recLoading = document.getElementById('rec-loading');
const placesList = document.getElementById('places-list');
const recContext = document.getElementById('rec-context');

// Update UI Macros
function updateMacrosUI() {
    remCal.textContent = Math.max(0, Math.round(dailyGoal.calories));
    remPro.textContent = Math.max(0, Math.round(dailyGoal.protein)) + 'g';
    remCarb.textContent = Math.max(0, Math.round(dailyGoal.carbs)) + 'g';
    remFat.textContent = Math.max(0, Math.round(dailyGoal.fats)) + 'g';
}

updateMacrosUI(); // Initial state

// Speech Recognition Setup
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (window.SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        micBtn.classList.add('recording');
        statusText.textContent = "Listening... tell me what you ate.";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        textInput.value = transcript;
        statusText.textContent = `Captured: "${transcript}"`;
        analyzeFood(transcript);
    };

    recognition.onerror = (event) => {
        statusText.textContent = `Error occurred in recognition: ${event.error}`;
        micBtn.classList.remove('recording');
    };

    recognition.onend = () => {
        micBtn.classList.remove('recording');
        if(statusText.textContent.includes("Listening")) {
             statusText.textContent = "Tap the mic and say what you ate!";
        }
    };

    micBtn.addEventListener('click', () => {
        recognition.start();
    });
} else {
    // Graceful degrading
    micBtn.style.display = 'none';
    statusText.textContent = "Voice input is not supported in this browser. Please type.";
}

// Manual Form Submit
manualForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (textInput.value.trim()) {
        analyzeFood(textInput.value.trim());
    }
});

// API Calls
async function analyzeFood(text) {
    loadingSpinner.classList.remove('hidden');
    logOutput.textContent = "";
    
    try {
        const response = await fetch('/api/analyze-food', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        
        if (!response.ok) throw new Error("Could not analyze your input.");
        
        const data = await response.json();
        
        if (data.total) {
            // Subtract from daily goals
            dailyGoal.calories -= data.total.calories || 0;
            dailyGoal.protein -= data.total.protein || 0;
            dailyGoal.carbs -= data.total.carbs || 0;
            dailyGoal.fats -= data.total.fats || 0;
            
            updateMacrosUI();
            
            // Build summary
            const itemsList = data.items.map(i => i.name).join(', ');
            logOutput.innerHTML = `Successfully logged: <strong>${itemsList}</strong><br>
                                   Macros: ${data.total.calories}kcal, ${data.total.protein}g P, ${data.total.carbs}g C, ${data.total.fats}g F`;
            textInput.value = '';
        }

    } catch (err) {
        logOutput.innerHTML = `<span style="color: #ef4444;">${err.message}</span>`;
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

// Recommend Meal Logic
recommendBtn.addEventListener('click', async () => {
    recLoading.classList.remove('hidden');
    placesList.innerHTML = '';
    recContext.textContent = 'Locating you and fetching recommendations...';

    // Mock coordinates for demo, or attempt geolocation
    const getCoords = () => {
        return new Promise((resolve) => {
            if ("geolocation" in navigator) {
                // Short timeout for demo stability
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
                    () => resolve({ lat: 34.0522, lng: -118.2437 }), // Fallback LA
                    { timeout: 3000 }
                );
            } else {
                resolve({ lat: 34.0522, lng: -118.2437 });
            }
        });
    };

    const coords = await getCoords();

    try {
        const response = await fetch('/api/recommend-meal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lat: coords.lat,
                lng: coords.lng,
                remaining_calories: dailyGoal.calories,
                remaining_protein: dailyGoal.protein,
                remaining_carbs: dailyGoal.carbs,
                remaining_fats: dailyGoal.fats
            })
        });

        if (!response.ok) throw new Error("Could not fetch recommendations.");

        const data = await response.json();
        recContext.textContent = data.context_message || 'Here are some healthy options near you:';

        if (data.recommendations && data.recommendations.length > 0) {
            data.recommendations.forEach(place => {
                const li = document.createElement('li');
                li.className = 'place-item';
                
                const gmapsUri = place.googleMapsUri ? `<a href="${place.googleMapsUri}" target="_blank" class="place-link">View on Google Maps</a>` : '';
                const rating = place.rating ? `⭐ ${place.rating}` : 'No rating';
                
                li.innerHTML = `
                    <div class="place-name">${place.displayName.text}</div>
                    <div class="place-details">${place.formattedAddress} &bull; ${rating}</div>
                    ${gmapsUri}
                `;
                placesList.appendChild(li);
            });
        } else {
             placesList.innerHTML = '<li class="place-item">No places found nearby.</li>';
        }

    } catch (err) {
        recContext.textContent = err.message;
    } finally {
        recLoading.classList.add('hidden');
    }
});

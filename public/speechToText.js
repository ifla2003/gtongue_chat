const micbutton = document.getElementById('mic-icon');
const textInput = document.getElementById('Textarea');

micbutton.addEventListener('click', startRecordingAndRecognition);

function startRecordingAndRecognition() {
    // Clear previous data
    audioChunks = [];
    textInput.value = '';
    // audioPlayer.src = '';

    // Initialize Speech Recognition
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

    // Set recognition properties based on selected language
    const selectedLan = document.getElementById('selected_lan');
    const selectedLanguage = selectedLan.options[selectedLan.selectedIndex].attributes['lan_code'].value;
    recognition.lang = selectedLanguage;
    recognition.continuous = true;
    console.log(recognition);
    // Handle the speech recognition result
    recognition.onresult = function(event) {
        const transcript = event.results[event.resultIndex][0].transcript;
        textInput.value += transcript;

        // Convert transcribed text to speech
        // const utterance = new SpeechSynthesisUtterance(transcript);
        // utterance.lang = selectedLanguage;   Match the recognition language
        // speechSynthesis.speak(utterance);
    };

    // Handle errors
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
    };

    // Start recognition
    recognition.start();

    // Access the microphone and start recording
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
            mediaStream = stream;
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = function(e) {
                audioChunks.push(e.data);
            };

            mediaRecorder.onstop = function() {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                // audioPlayer.src = URL.createObjectURL(audioBlob);
                // audioPlayer.style.display = 'block';
            };

            // Enable and disable buttons
            // startRecordingButton.disabled = true;
            // stopRecordingButton.disabled = false;
            // playRecordingButton.disabled = true;

            mediaRecorder.start();
        })
        .catch(function(err) {
            console.error('Error accessing microphone:', err);
        });
}
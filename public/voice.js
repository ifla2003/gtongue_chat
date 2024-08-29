document.addEventListener('DOMContentLoaded', () => {
    const messageArea = document.getElementById('messageArea');
    const voiceButton = document.getElementById('voice-button');

    let mediaRecorder;
    let audioChunks = [];

    // Replace these with actual values (e.g., retrieved from user session or UI)
    // const senderId =/* Retrieve the logged-in user's ID */
    // const receiverName = /* Retrieve the recipient's username */

    voiceButton.addEventListener('click', async () => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();

                mediaRecorder.addEventListener('dataavailable', event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener('stop', async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Use 'audio/webm' for better compatibility
                    const formData = new FormData();
                    formData.append('voiceMessage', audioBlob, 'voiceMessage.webm'); // Include a filename
                    formData.append('sender_id', userId);
                    formData.append('receiver_name', selectedContact);

                    try {
                        const response = await fetch('/sendVoiceMessage', {
                            method: 'POST',
                            body: formData
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Server error: ${errorText}`);
                        }

                        const result = await response.text();
                        console.log(result); // Handle the response (e.g., show confirmation to the user)

                        // Optionally, emit the voice message to the receiver via Socket.io
                        // This depends on your application's architecture
                        // socket.emit('voiceMessage', { senderId, receiverName, audioBlob });

                        // Display the audio in the UI
                        const audioUrl = URL.createObjectURL(audioBlob);
                        const audioElement = document.createElement('audio');
                        audioElement.src = audioUrl;
                        audioElement.controls = true;
                        const audioDiv = document.createElement('div');
                        audioDiv.appendChild(audioElement);
                        messageArea.appendChild(audioDiv);
                    } catch (error) {
                        console.error('Error sending voice message:', error);
                    }

                    audioChunks = []; // Clear audio chunks after recording stops
                });

                voiceButton.textContent = 'Stop Recording';
            } catch (error) {
                console.error('Error accessing microphone:', error);
            }
        } else {
            // Stop recording
            mediaRecorder.stop();
            voiceButton.textContent = '🎤';
        }
    });
});

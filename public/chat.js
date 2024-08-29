const socket = io();
let name;
let userId;
let selectedContact = null;
let selectedMessageId = null;

let localStream;
let remoteStream;
let peerConnection;

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

let textarea = document.querySelector('#Textarea');
let messageArea = document.querySelector('.message_area');
let sendButton = document.querySelector('#sendButton');

let chatDiv = document.querySelector('#chat');
let registerDiv = document.querySelector('#register');
let loginDiv = document.querySelector('#login');

let contactList = document.querySelector('#contactList');
let contactUsername = document.querySelector('#contactUsername');
let allUsersList = document.querySelector('#allUsersList');
let contactNameDisplay = document.querySelector('#contactNameDisplay');
let logoutButton = document.querySelector('#logoutButton');
let contextMenu = document.querySelector('#contextMenu');
let deleteForMeButton = document.querySelector('#deleteForMe');
let deleteForEveryoneButton = document.querySelector('#deleteForEveryone');
let languageselector = document.querySelector('#selected_lan');

let attachButton = document.querySelector('#attachButton');
let fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

attachButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            const data = reader.result;
            socket.emit('fileMessage', { file: data, fileName: file.name, to: selectedContact });
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('addContactForm').addEventListener('submit', (event) => {
    event.preventDefault();

    fetch('/addContact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: name,
            contactName: contactUsername.value
        })
    }).then(response => response.text())
      .then(data => {
          alert(data);

          if (data === 'Contact added') {
              const newContact = contactUsername.value;
              const li = document.createElement('li');
              li.textContent = newContact;
              li.addEventListener('click', () => selectContact(newContact));
              contactList.appendChild(li);
              contactUsername.value = '';

              let contacts = JSON.parse(localStorage.getItem('contacts')) || [];
              contacts.push(newContact);
              localStorage.setItem('contacts', JSON.stringify(contacts));
          }
      });
});

textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent the default action (new line)
        if (textarea.value.trim() !== '') {
            sendMessage(textarea.value);
        }
    } 
});

sendButton.addEventListener('click', () => {
    if (textarea.value.trim() !== '') {
        sendMessage(textarea.value);
    }
});

messageArea.addEventListener('contextmenu', (event) => {
    event.preventDefault();

    if (event.target.closest('.message')) {
        selectedMessageId = event.target.closest('.message').dataset.id;
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.style.left = `${event.clientX}px`;
        contextMenu.style.display = 'block';
    }
});

document.addEventListener('click', (event) => {
    if (!event.target.closest('.context-menu')) {
        contextMenu.style.display = 'none';
    }
});

deleteForMeButton.addEventListener('click', () => {
    deleteMessageForMe(selectedMessageId);
    contextMenu.style.display = 'none';
});

deleteForEveryoneButton.addEventListener('click', () => {
    deleteMessageForEveryone(selectedMessageId);
    contextMenu.style.display = 'none';
});

function sendMessage(message) {
    let msg = {
        id: Date.now(),
        userId: userId,
        user: name,
        to: selectedContact,
        language: languageselector.value,
        message: message.trim(),
        timestamp: new Date().toISOString()
    };
    console.log('Sending message:', msg);
    appendMessage(msg, 'outgoing');
    socket.emit('privateMessage', msg);
    textarea.value = '';
    scrollToBottom();

    saveChatHistory(selectedContact, msg);
}


function appendMessage(msg, type) {
    let mainDiv = document.createElement('div');
    mainDiv.classList.add('message', type);
    mainDiv.setAttribute('data-id', msg.id);

    let formattedMessage = msg.message.replace(/\n/g, '<br>'); // Replace newlines with <br>

    let timestamp = convertToIST(msg.timestamp);
    
    let markup = `
        <p>${formattedMessage}</p>

        <span class="timestamp">${timestamp}</span>
    `;

    mainDiv.innerHTML = markup;
    
    //add the audio if exists - [After Message]
    if(msg.audioElement) mainDiv.appendChild(msg.audioElement);

    let lastMessage = messageArea.lastElementChild;
    let lastDay = lastMessage?.querySelector('.day');
    let messageDate = new Date(msg.timestamp);

    if (!lastDay || !isSameDay(messageDate, new Date(lastDay.dataset.date))) {
        let dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.dataset.date = msg.timestamp.split('T')[0]; // Store date without time part

        if (isOlderThanAWeek(messageDate)) {
            dayDiv.textContent = formatDate(messageDate);
        } else {
            dayDiv.textContent = getMessageDate(messageDate);
        }

        messageArea.appendChild(dayDiv);
        
    }

    messageArea.appendChild(mainDiv);
}




function selectContact(contact) {
    selectedContact = contact;
    contactNameDisplay.textContent = contact;
    messageArea.innerHTML = '';

    let chatHistory = JSON.parse(localStorage.getItem(`chatHistory_${contact}`)) || [];
    if (chatHistory.length > 0) {
        chatHistory.forEach(message => {
            let type = message.userId === userId ? 'outgoing' : 'incoming';
            appendMessage(message, type);
        });
    } else {
        fetchChatHistory(contact);
    }
}

function fetchChatHistory(contact) {
    fetch('/getMessages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, contactName: contact })
    }).then(response => response.json())
      .then(data => {
          console.log('Fetched chat history:', data);
          let translationPromises = data.map(message => translateMessage(message, languageselector.value));

          Promise.all(translationPromises).then(translatedMessages => {
              console.log('Translated chat history:', translatedMessages);
              translatedMessages.forEach(message => {
                let type = message.sender_id === userId ? 'outgoing' : 'incoming';
                // Handle message audio if it exists
                if (message.audio instanceof Blob) {
                    const audioUrl = URL.createObjectURL(message.audio);
                    // Example of creating an audio element to play the audio
                    const audioElement = new Audio(audioUrl);
                    // You can also add controls or other attributes if needed
                    audioElement.controls = true;
                    // Append the audio element to the message container
                    appendMessage({
                        user: message.user,
                        message: message.message.replace(/\n/g, '<br>'), // Replace newlines with <br>
                        id: message.id,
                        timestamp: message.timestamp,
                        audioElement: audioElement // Pass the audio element
                    }, type);
                } else {
                    // Handle cases where there is no audio
                    appendMessage({
                        user: message.user,
                        message: message.message.replace(/\n/g, '<br>'), // Replace newlines with <br>
                        id: message.id,
                        timestamp: message.timestamp
                    }, type);
                }
              });

              localStorage.setItem(`chatHistory_${contact}`, JSON.stringify(translatedMessages));
          });
      })
      .catch(error => {
          console.error('Error fetching chat history:', error);
      });
}



function translateMessage(message, targetLanguage) {
    return new Promise((resolve, reject) => {
        if (message.language !== targetLanguage) {
            fetch('http://localhost/gtongue/api/translate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: message.language, to: targetLanguage, fromText: message.message })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Translation API response:', data);
                // message.message = data.translated_array.join('');
                message.message = concatenateStrings(data.translated_array); // Use the translated text instead of the array
                message.audio = combineAudioObjects(data.translated_array); 
                resolve(message);
            })
            .catch(error => {
                console.error('Translation error:', error);
                resolve(message); // Resolve with the original message in case of error
            });
        } else {
            resolve(message); // No translation needed
        }
    });
}


function saveChatHistory(contact, message) {
    let chatHistory = JSON.parse(localStorage.getItem(`chatHistory_${contact}`)) || [];
    chatHistory.push(message);
    localStorage.setItem(`chatHistory_${contact}`, JSON.stringify(chatHistory));
}

socket.on('privateMessage', (msg) => {
    if (msg.to === name) {
        // console.log('Received private message:', msg);
        translateMessage(msg, languageselector.value).then(translatedMsg => {
            console.log('Translated message:', translatedMsg);

            if (selectedContact === translatedMsg.user) {
                let type = translatedMsg.userId === userId ? 'outgoing' : 'incoming';
               // Handle message audio if it exists
               if (translatedMsg.audio instanceof Promise) {
                // Handle the Promise and process the audio Blob
                translatedMsg.audio
                    .then(blob => {
                        // Create a URL for the audio Blob
                        const audioUrl = URL.createObjectURL(blob);

                        // Create an audio element
                        const audioElement = new Audio(audioUrl);
                        audioElement.controls = true;

                        // Append the message with audio
                        appendMessage({
                            user: translatedMsg.user,
                            message: translatedMsg.message.replace(/\n/g, '<br>'), // Replace newlines with <br>
                            id: translatedMsg.id,
                            timestamp: translatedMsg.timestamp,
                            audioElement: audioElement // Pass the audio element
                        }, type);
                    })
                    .catch(error => {
                        console.error('Error loading audio:', error);
                        // Append message without audio if there's an error
                        appendMessage({
                            user: translatedMsg.user,
                            message: translatedMsg.message.replace(/\n/g, '<br>'), // Replace newlines with <br>
                            id: translatedMsg.id,
                            timestamp: translatedMsg.timestamp
                        }, type);
                    });
            } else {
                    // Handle cases where there is no audio
                    appendMessage({
                        user: translatedMsg.user,
                        message: translatedMsg.message.replace(/\n/g, '<br>'), // Replace newlines with <br>
                        id: translatedMsg.id,
                        timestamp: translatedMsg.timestamp
                    }, type);
                }
                scrollToBottom();
            }
            saveChatHistory(translatedMsg.user, translatedMsg);
        });
    }
});



function getMessageDate(date) {
    if (isToday(date)) {
        return 'Today';
    } else if (isYesterday(date)) {
        return 'Yesterday';
    } else {
        return formatDate(date);
    }
}

function isOlderThanAWeek(date) {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    return date < weekAgo;
}

function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function isYesterday(date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
           date.getMonth() === yesterday.getMonth() &&
           date.getFullYear() === yesterday.getFullYear();
}

function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

function formatDate(timestamp) {
    let date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}



function deleteMessageForMe(msgId) {
    let messageDiv = document.querySelector(`div[data-id='${msgId}']`);
    if (messageDiv) {
        messageDiv.remove();
    }

    let chatHistory = JSON.parse(localStorage.getItem(`chatHistory_${selectedContact}`)) || [];
    chatHistory = chatHistory.filter(msg => msg.id !== msgId);
    localStorage.setItem(`chatHistory_${selectedContact}`, JSON.stringify(chatHistory));
}

function deleteMessageForEveryone(msgId) {
    socket.emit('deleteMessageForEveryone', { msgId, userId });
}

socket.on('deleteMessageForEveryone', (msgId) => {
    let messageDiv = document.querySelector(`div[data-id='${msgId}']`);
    if (messageDiv) {
        messageDiv.remove();
    }

    let chatHistory = JSON.parse(localStorage.getItem(`chatHistory_${selectedContact}`)) || [];
    chatHistory = chatHistory.filter(msg => msg.id !== msgId);
    localStorage.setItem(`chatHistory_${selectedContact}`, JSON.stringify(chatHistory));
});

document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.setItem('isLoggedIn', 'false');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    window.location.reload();
});

function scrollToBottom() {
    messageArea.scrollTop = messageArea.scrollHeight;
}

function populateContactLists(contacts, allUsers) {
    contactList.innerHTML = '';
    contacts.forEach(contact => {
        let li = document.createElement('li');
        li.textContent = contact;
        li.addEventListener('click', () => selectContact(contact));
        contactList.appendChild(li);
    });

  allUsersList.innerHTML = '';
    allUsers.forEach(user => {
        let li = document.createElement('li');
        li.textContent = user;
        li.addEventListener('click', () => {
            contactUsername.value = user;
        });
        allUsersList.appendChild(li);
    });
}

window.addEventListener('load', () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        name = localStorage.getItem('username');
        userId = localStorage.getItem('userId');
        usernameDisplay.textContent = name;
        authDiv.style.display = 'none';
        chatDiv.style.display = 'flex';
        socket.emit('join', name);

        let contacts = JSON.parse(localStorage.getItem('contacts')) || [];
        let allUsers = JSON.parse(localStorage.getItem('allUsers')) || [];
        populateContactLists(contacts, allUsers);
    }
});

function convertToIST(dateString) {
    let date = new Date(dateString);
    let options = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
    return new Intl.DateTimeFormat('en-IN', options).format(date);
}

// Function to combine Base64-encoded audio strings into a single Blob
async function combineAudioObjects(translated_objects, mimeType = "audio/wav") {
    // Extract Base64 strings from the objects
    const base64Strings = translated_objects.map(obj => obj.audio).filter(base64 => base64 !== '');

    // Convert each Base64 string to an ArrayBuffer
    const buffers = await Promise.all(base64Strings.map(base64ToArrayBuffer));

    // Concatenate all ArrayBuffers into a single ArrayBuffer
    const combinedBuffer = concatenateArrayBuffers(buffers);

    // Create a Blob from the combined ArrayBuffer
    return new Blob([combinedBuffer], { type: mimeType });
}

// Function to concatenate text strings from the objects
function concatenateStrings(translated_objects) {
    return translated_objects.map(obj => obj.lan_text).join(' ');
}

// Helper function to convert a Base64 string to an ArrayBuffer
function base64ToArrayBuffer(base64) {
    return new Promise((resolve) => {
        // Decode Base64 string to binary string
        const binaryString = decodeBase64(base64);

        // Create an ArrayBuffer and Uint8Array
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        // Convert binary string to Uint8Array
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Resolve with the ArrayBuffer
        resolve(bytes.buffer);
    });
}

// Helper function to concatenate multiple ArrayBuffers into a single ArrayBuffer
function concatenateArrayBuffers(buffers) {
    // Calculate the total length of the combined ArrayBuffer
    const totalLength = buffers.reduce((length, buffer) => length + buffer.byteLength, 0);

    // Create a new ArrayBuffer with the total length
    const combinedBuffer = new Uint8Array(totalLength);

    // Copy each buffer into the combined buffer
    let offset = 0;
    buffers.forEach(buffer => {
        combinedBuffer.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
    });

    return combinedBuffer.buffer; // Return as an ArrayBuffer
}

function decodeBase64(base64String) {
    try {
        // Ensure the string is valid Base64 and remove any unwanted characters
        const cleanedBase64 = base64String.replace(/[^A-Za-z0-9+/=]/g, '');
        // Decode the Base64 string
        const decodedString = atob(cleanedBase64);
        return decodedString;
    } catch (e) {
        console.error('Failed to decode Base64 string:', e);
    }
}
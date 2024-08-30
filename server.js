const express = require('express');
const app = express();
const http = require('http').createServer(app);
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const io = require('socket.io')(http);
const session = require('express-session');
const fs = require('fs'); // If using buffer from file
const multer = require('multer'); // For handling multipart/form-data requests

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up session middleware
app.use(session({
    secret: 'your_secret_key', // Change this to a secure key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.get('/', (req, res) => {
    console.log("working");
    res.sendFile(__dirname + '/public/index.html');
});


// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chatapp'
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL Connected...');
});

// Setting up Multer to handle file uploads
const upload = multer();

// Registration route
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    // Check if username already exists
    const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
    db.query(checkUserQuery, [username], (err, results) => {
        if (err) {
            console.error('Error checking user existence:', err);
            return res.status(500).send('Error checking user existence');
        }

        if (results.length > 0) {
            console.log(`Username ${username} already taken`);
            // Username already exists
            return res.status(400).send('Username already taken');
        } else {
            // Proceed with registration
            bcrypt.hash(password, 10, (err, hash) => {
                if (err) {
                    console.error('Error hashing password:', err);
                    return res.status(500).send('Error hashing password');
                }

                const user = { username, password: hash };
                const sql = 'INSERT INTO users SET ?';
                db.query(sql, user, (err, result) => {
                    if (err) {
                        console.error('Error registering user:', err);
                        return res.status(500).send('Error registering user');
                    }
                    console.log('User registered successfully');
                    res.send('User registered');
                });
            });
        }
    });
});


// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            bcrypt.compare(password, results[0].password, (err, match) => {
                if (match) {
                    req.session.userId = results[0].id; // Save user ID in session
                    const userId = results[0].id;
                    const getContactsQuery = `
                        SELECT u.username FROM contacts c
                        JOIN users u ON c.contact_id = u.id
                        WHERE c.user_id = ?
                    `;
                    db.query(getContactsQuery, [userId], (err, contactResults) => {
                        if (err) throw err;
                        const contacts = contactResults.map(contact => contact.username);

                        const getAllUsersQuery = 'SELECT username FROM users WHERE id != ?';
                        db.query(getAllUsersQuery, [userId], (err, allUsersResults) => {
                            if (err) throw err;
                            const allUsers = allUsersResults.map(user => user.username);

                            res.json({ message: 'Login successful', contacts, allUsers, userId });
                        });
                    });
                } else {
                    res.send('Incorrect password');
                }
            });
        } else {
            res.send('User not found');
        }
    });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Failed to logout');
        }
        res.send('Logout successful');
    });
});

// Add contact route
app.post('/addContact', (req, res) => {
    const { username, contactName } = req.body;

    const getUserQuery = 'SELECT id FROM users WHERE username = ?';
    db.query(getUserQuery, [username], (err, userResults) => {
        if (err) return res.status(500).send('Error occurred');
        if (userResults.length === 0) return res.status(404).send('User not found');

        const userId = userResults[0].id;

        db.query(getUserQuery, [contactName], (err, contactResults) => {
            if (err) return res.status(500).send('Error occurred');
            if (contactResults.length === 0) return res.status(404).send('Contact not found');

            const contactId = contactResults[0].id;
            const addContactQuery = 'INSERT INTO contacts (user_id, contact_id) VALUES (?, ?)';

            db.query(addContactQuery, [userId, contactId], (err, result) => {
                if (err) return res.status(500).send('Error occurred');
                res.send('Contact added');
            });
        });
    });
});

// Fetch chat history
app.post('/getMessages', (req, res) => {
    const { userId, contactName } = req.body;

    const getUserQuery = 'SELECT id FROM users WHERE username = ?';
    db.query(getUserQuery, [contactName], (err, contactResults) => {
        if (err) return res.status(500).send('Error occurred');
        if (contactResults.length === 0) return res.status(404).send('Contact not found');

        const contactId = contactResults[0].id;

        const getMessagesQuery = `
            SELECT * FROM messages 
            WHERE ((sender_id = ? AND receiver_id = ?) 
               OR (sender_id = ? AND receiver_id = ?))
               AND ((sender_id = ? AND deleted_for_sender = FALSE)
               OR (receiver_id = ? AND deleted_for_receiver = FALSE))
            ORDER BY timestamp LIMIT 20
        `;

        db.query(getMessagesQuery, [userId, contactId, contactId, userId, userId, userId], (err, messageResults) => {
            if (err) return res.status(500).send('Error occurred');
            res.json(messageResults);
        });
    });
});

// Save message
function saveMessage(senderId, receiverName, message, language, callback) {
    const getUserQuery = 'SELECT id FROM users WHERE username = ?';
    db.query(getUserQuery, [receiverName], (err, results) => {
        if (err) return callback(err);
        if (results.length === 0) return callback(new Error('Receiver not found'));

        const receiverId = results[0].id;
        const newMessage = { sender_id: senderId, receiver_id: receiverId, message, timestamp: new Date() };
        const insertMessageQuery = 'INSERT INTO messages SET ?';

        db.query(insertMessageQuery, newMessage, (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    });
}

// Voice message route
app.post('/sendVoiceMessage', upload.single('voiceMessage'), (req, res) => {
    console.log('Received POST request to /sendVoiceMessage');

    const { sender_id, receiver_name } = req.body;
    console.log(`Sender ID: ${sender_id}, Receiver Name: ${receiver_name}`);

    if (!req.file) {
        console.error('No file received');
        return res.status(400).send('No file uploaded');
    }

    const audioBuffer = req.file.buffer;
    console.log(`Received audio file of size: ${audioBuffer.length} bytes`);

    // Retrieve receiver's ID
    const getUserQuery = 'SELECT id FROM users WHERE username = ?';
    db.query(getUserQuery, [receiver_name], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        if (results.length === 0) {
            console.error('Receiver not found');
            return res.status(404).send('Receiver not found');
        }

        const receiver_id = results[0].id;

        // Insert the voice message into the database
        const newVoiceMessage = {
            sender_id: sender_id,
            receiver_id: receiver_id,
            audio_data: audioBuffer
        };

        const insertVoiceMessageQuery = 'INSERT INTO voice_messages SET ?';
        db.query(insertVoiceMessageQuery, newVoiceMessage, (err, insertResult) => {
            if (err) {
                console.error('Error inserting voice message:', err);
                return res.status(500).send('Error saving voice message');
            }

            console.log('Voice message saved with ID:', insertResult.insertId);

            // Optionally, emit the voice message to the receiver via Socket.io
            io.to(receiver_name).emit('voiceMessage', {
                sender_id: sender_id,
                audio_url: `/getVoiceMessage/${insertResult.insertId}`
            });

            res.send('Voice message saved successfully');
        });
    });
});


app.get('/getVoiceMessage/:id', (req, res) => {
    const messageId = req.params.id;

    const getVoiceMessageQuery = 'SELECT audio_data FROM voice_messages WHERE id = ?';
    db.query(getVoiceMessageQuery, [messageId], (err, result) => {
        if (err) return res.status(500).send('Error fetching voice message');
        if (result.length === 0) return res.status(404).send('Voice message not found');

        res.set('Content-Type', 'audio/webm'); // Set appropriate content type
        res.send(result[0].audio_data); // Send the audio data as response
    });
});


// Mark message as deleted for sender
function deleteMessageForSender(msgId, callback) {
    const deleteMessageQuery = 'UPDATE messages SET deleted_for_sender = TRUE WHERE id = ?';
    db.query(deleteMessageQuery, [msgId], (err, result) => {
        if (err) return callback(err);
        callback(null, result);
    });
}

// Mark message as deleted for receiver
function deleteMessageForReceiver(msgId, callback) {
    const deleteMessageQuery = 'UPDATE messages SET deleted_for_receiver = TRUE WHERE id = ?';
    db.query(deleteMessageQuery, [msgId], (err, result) => {
        if (err) return callback(err);
        callback(null, result);
    });
}

// Delete message for everyone
function deleteMessageForEveryone(msgId, callback) {
    const deleteMessageQuery = 'DELETE FROM messages WHERE id = ?';
    db.query(deleteMessageQuery, [msgId], (err, result) => {
        if (err) return callback(err);
        callback(null, result);
    });
}

// Socket.io connection
io.on('connection', (socket) => {
    console.log('Connected...');

    socket.on('join', (username) => {
        socket.join(username);
    });

    // socket.on('privateMessage', (msg) => {
    //     const { userId, to, message, language } = msg;
    //     saveMessage(userId, to, message, language, (err, result) => {
    //         if (err) {
    //             console.error(err);
    //             return;
    //         }
    //         io.to(to).emit('privateMessage', msg);
    //     });
    // });

    socket.on('privateMessage', (msg) => {
        if (msg.messageType === 'voice') {
            const audioUrl = URL.createObjectURL(msg.audioBlob);
            const audioElement = document.createElement('audio');
            audioElement.src = audioUrl;
            audioElement.controls = true;
            const audioDiv = document.createElement('div');
            audioDiv.appendChild(audioElement);
            messageArea.appendChild(audioDiv);
        } else {
            // Handle text messages
            const { userId, to, message, language } = msg;
        saveMessage(userId, to, message, language, (err, result) => {
            if (err) {
                console.error(err);
                return;
            }
            io.to(to).emit('privateMessage', msg);
        });
        }
    });
    

    socket.on('deleteMessageForMe', ({ msgId, userId }) => {
        const getMessageQuery = 'SELECT * FROM messages WHERE id = ?';
        db.query(getMessageQuery, [msgId], (err, results) => {
            if (err) {
                console.error(err);
                return;
            }
            if (results.length > 0) {
                const message = results[0];
                if (message.sender_id === userId) {
                    deleteMessageForSender(msgId, (err, result) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        socket.emit('deleteMessageForMe', msgId);
                    });
                } else if (message.receiver_id === userId) {
                    deleteMessageForReceiver(msgId, (err, result) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        socket.emit('deleteMessageForMe', msgId);
                    });
                }
            }
        });
    });

    socket.on('deleteMessageForEveryone', ({ msgId }) => {
        deleteMessageForEveryone(msgId, (err, result) => {
            if (err) {
                console.error(err);
                return;
            }
            io.emit('deleteMessageForEveryone', msgId);
        });
    });

    socket.on('callRequest', (data) => {
        io.to(data.to).emit('callRequest', data);
    });

    socket.on('contactAttachment', (data) => {
        io.to(data.to).emit('contactAttachment', data);
    });

    socket.on('callAccepted', (data) => {
        io.to(data.to).emit('callAccepted', data);
    });

    socket.on('offer', (data) => {
        io.to(data.to).emit('offer', data);
    });

    socket.on('answer', (data) => {
        io.to(data.to).emit('answer', data);
    });

    socket.on('candidate', (data) => {
        io.to(data.to).emit('candidate', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
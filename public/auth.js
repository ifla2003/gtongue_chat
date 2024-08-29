let registerButton = document.querySelector('#registerButton');
let loginButton = document.querySelector('#loginButton');
let regUsername = document.querySelector('#reg_username');
let regPassword = document.querySelector('#reg_password');
let logUsername = document.querySelector('#log_username');
let logPassword = document.querySelector('#log_password');
let showLoginLink = document.querySelector('#showLogin');
let showRegisterLink = document.querySelector('#showRegister');
let authDiv = document.querySelector('#auth');
let usernameDisplay = document.querySelector('#usernameDisplay');


showLoginLink.addEventListener('click', () => {
    registerDiv.style.display = 'none';
    loginDiv.style.display = 'block';
});

showRegisterLink.addEventListener('click', () => {
    loginDiv.style.display = 'none';
    registerDiv.style.display = 'block';
});

registerButton.addEventListener('click', () => {
    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: regUsername.value,
            password: regPassword.value
        })
    }).then(response => response.text())
      .then(data => alert(data));
});

loginButton.addEventListener('click', () => {
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: logUsername.value,
            password: logPassword.value
        })
    }).then(response => response.json())
      .then(data => {
          if (data.message === 'Login successful') {
              name = logUsername.value;
              userId = data.userId;
              usernameDisplay.textContent = name;
              localStorage.setItem('isLoggedIn', 'true');
              localStorage.setItem('username', name);
              localStorage.setItem('userId', userId);
              localStorage.setItem('contacts', JSON.stringify(data.contacts));
              localStorage.setItem('allUsers', JSON.stringify(data.allUsers));
              authDiv.style.display = 'none';
              chatDiv.style.display = 'flex';
              socket.emit('join', name);

              populateContactLists(data.contacts, data.allUsers);
          } else {
              alert(data.message);
          }
      });
});

logoutButton.addEventListener('click', () => {
    chatDiv.style.display = 'none';
    authDiv.style.display = 'block';
    loginDiv.style.display = 'block';
    usernameDisplay.textContent = '';
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('contacts');
    localStorage.removeItem('allUsers');
    localStorage.removeItem('chatHistory');
});
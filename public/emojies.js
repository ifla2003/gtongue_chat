document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chat-window');
    const messageInput = document.getElementById('Textarea');  // Ensure this matches the HTML ID
    const sendButton = document.getElementById('sendButton');
    const emojiButton = document.getElementById('emoji-button');
    const emojiPicker = document.getElementById('emoji-picker');

    const emojis = [
        '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', 
        '😊', '😋', '😎', '😍', '😘', '🥰', '😙', '😚', '☺️', 
        '🙂', '😣', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', 
        '🙄', '😏', '😛', '😥', '😮', '🤐', '😯', '😪', '😫', 
        '🥱', '😴', '😌', '😲', '😜', '😝', '🤤', '😒', '😓',
        '😔', '😕', '🙃', '🤑', '😧', '☹️', '🙁', '😖', '😞',
        '😟', '😤', '😢', '😭', '😦', '🤪', '😨', '😩', '🤯',
        '😬', '😰', '😱', '🥵', '🥶', '😳', '🤓', '😵', '😡',
        '😠', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🥳', 
        '🥺', '🤠', '🤡', '🤥', '🤫', '🤭', '🧐','👽','👻',
        '❤️','🩷','💚','🤍','🖤','💔','❤️‍','🔥','💞','❣️',
        '💕', '💝','💘','💖','💗','💫','💌','🩵',
        '☠️','😹','🙈','🙉','🙊','🐵','🐭','🍔','🍕','🍿',
        '🥚','🍳','🍗','🍖','🎂','🍰','🍫','🍭','🥂','🍽️',
        '🛺','🛻','🚗','🚐','🚑', '🦽','🦼','🛹','🚲','🚍',
        '🚄','🏍️','🛫','🚁','⛴️','🛥️','🚦',
        '🧯','🛋️','🛏️','🌓','🌦️','🕌','🕋','⛪','🛕','🏝️','🏖️',
        '🥝','🍌','🍉','🍎','🍇','🥕','🫑','🍅',
        '🌹','🌷','🥀','🌳','🌴','🎈',
        '🎆','🎉','🎊','🎁','🧥','👖','👕','🩳','🥻','👗','👜','🧸',
        '💊','💻','🌍','🪐','📸','📹','📌',
        '👩','👨','👴','👸','🤴','👩‍','👨‍','👩‍','👧‍','👦',
        '🏃‍','💃','🚣‍','♂️','👊','👍','👎','🫶','🤲'
    ];

    emojiButton.addEventListener('click', () => {
        emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
    });

    emojis.forEach(emoji => {
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = emoji;
        emojiSpan.addEventListener('click', () => {
            messageInput.value += emoji;
            emojiPicker.style.display = 'none';
        });
        emojiPicker.appendChild(emojiSpan);
    });
});

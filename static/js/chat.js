// chat.js

// Elements from the DOM
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const userMessageInput = document.getElementById('user-message');
const toggleButton = document.getElementById('toggle-description');
const characterInfoModal = document.getElementById('character-info-modal');
const closeModalButton = document.getElementById('close-modal');
const typingIndicator = document.getElementById('typing-indicator');

chatMessages.style.height = 'calc(100vh - 200px)';

// Variables for pagination
let currentPage = 1;
let hasMore = true;

// Socket.IO connection
const socket = io({
    transports: ['websocket'],
    withCredentials: true,
});

// Join the chat room
socket.emit('join', { 'character_id': characterId });

// Handle new messages from the server
socket.on('new_message', (data) => {
    addMessage(data.role, data.content);
});

// Handle partial AI responses
socket.on('partial_ai_response', (data) => {
    addPartialMessage('assistant', data.token);
});

// Handle AI response completion
socket.on('ai_response_complete', (data) => {
    finalizePartialMessage('assistant', data.content);
    hideTypingIndicator();
});

// Handle errors
socket.on('error', (data) => {
    console.error('Socket error:', data.error);
    addMessage('assistant', 'Sorry, there was an error processing your message. Please try again.');
    hideTypingIndicator();
});

// Event listeners for UI elements
toggleButton.addEventListener('click', () => {
    characterInfoModal.classList.toggle('hidden');
    characterInfoModal.classList.toggle('flex');
});

closeModalButton.addEventListener('click', () => {
    characterInfoModal.classList.add('hidden');
    characterInfoModal.classList.remove('flex');
});

characterInfoModal.addEventListener('click', (e) => {
    if (e.target === characterInfoModal) {
        characterInfoModal.classList.add('hidden');
        characterInfoModal.classList.remove('flex');
    }
});

// Function to add messages to the chat
function addMessage(role, content, prepend = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role} flex items-start mb-4 ${role === 'user' ? 'justify-end' : ''}`;

    const avatarImg = document.createElement('img');
    avatarImg.src = role === 'user' ? userAvatar : characterAvatar;
    avatarImg.alt = role === 'user' ? 'User' : characterName;
    avatarImg.className = `w-8 h-8 rounded-full ${role === 'user' ? 'order-2 ml-2' : 'mr-2'}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = `flex-grow ${role === 'user' ? 'text-right' : ''}`;
    contentDiv.innerHTML = `<p class="bg-gray-700 inline-block rounded-lg px-4 py-2">${content}</p>`;

    messageDiv.appendChild(avatarImg);
    messageDiv.appendChild(contentDiv);

    if (prepend) {
        chatMessages.prepend(messageDiv);
    } else {
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Variables to handle partial AI messages
let aiMessageDiv = null;

function addPartialMessage(role, token) {
    if (!aiMessageDiv) {
        aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = `message ${role} flex items-start mb-4`;

        const avatarImg = document.createElement('img');
        avatarImg.src = characterAvatar;
        avatarImg.alt = characterName;
        avatarImg.className = `w-8 h-8 rounded-full mr-2`;

        const contentDiv = document.createElement('div');
        contentDiv.className = `flex-grow`;
        contentDiv.innerHTML = `<p class="bg-gray-700 inline-block rounded-lg px-4 py-2"></p>`;

        aiMessageDiv.appendChild(avatarImg);
        aiMessageDiv.appendChild(contentDiv);
        chatMessages.appendChild(aiMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    const contentParagraph = aiMessageDiv.querySelector('p');
    contentParagraph.innerHTML += token;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function finalizePartialMessage(role, fullContent) {
    if (aiMessageDiv) {
        const contentParagraph = aiMessageDiv.querySelector('p');
        contentParagraph.innerHTML = fullContent;
        aiMessageDiv = null;
    } else {
        addMessage(role, fullContent);
    }
}

// Show and hide typing indicator
function showTypingIndicator() {
    typingIndicator.classList.remove('hidden');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    typingIndicator.classList.add('hidden');
}

// Load previous conversation messages
async function loadConversation() {
    try {
        const response = await fetch(`/api/get_conversation/${characterId}`, {
            method: 'GET',
            credentials: 'include',
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        const data = await response.json();

        if (data.info) {
            chatMessages.innerHTML = `<p class="text-info">${data.info}</p>`;
        } else if (data.messages && data.messages.length > 0) {
            data.messages.reverse().forEach((message) => {
                addMessage(message.role, message.content, true);
            });
            hasMore = data.has_more;
            currentPage++;
        } else {
            chatMessages.innerHTML = '<p class="text-info">No previous messages found. Start chatting to begin!</p>';
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
        chatMessages.innerHTML = `<p class="text-danger">Failed to load previous messages: ${error.message}. Please refresh the page or try again later.</p>`;
    }
}

// Load more messages on scroll
async function loadMoreMessages() {
    if (!hasMore) return;

    try {
        const response = await fetch(`/api/get_conversation/${characterId}?page=${currentPage}`, {
            method: 'GET',
            credentials: 'include',
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
            data.messages.reverse().forEach((message) => {
                addMessage(message.role, message.content, true);
            });

            hasMore = data.has_more;
            currentPage++;
        } else {
            hasMore = false;
        }
    } catch (error) {
        console.error('Error loading more messages:', error);
    }
}

// Scroll event listener for loading more messages
chatMessages.addEventListener('scroll', () => {
    if (chatMessages.scrollTop === 0 && hasMore) {
        loadMoreMessages();
    }
});

// Load initial conversation
loadConversation();

// Send a message
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userMessage = userMessageInput.value.trim();
    if (!userMessage) return;

    addMessage('user', userMessage);
    userMessageInput.value = '';

    // Send message via WebSocket
    socket.emit('send_message', {
        'character_id': characterId,
        'message': userMessage,
    });

    showTypingIndicator();
});
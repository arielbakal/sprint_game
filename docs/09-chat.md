# Chat & LLM System

## Overview

The chat system allows players to interact with NPCs (Chief Ruru) using a chat interface. The system includes:

- **ChatManager**: UI management and message flow
- **LLMService**: Integration with language models (currently a stub with random responses)

---

## ChatManager

**Location**: `base/modular/js/classes/ChatManager.js`

### Responsibilities

- Manage chat UI visibility
- Load NPC lore files
- Interface with LLM service
- Handle message history
- Display typing indicators

### Constructor

```javascript
constructor(engine) {
    this.engine = engine;
    this.llm = new LLMService();
    this.isOpen = false;
    this.currentEntity = null;
    this.history = [];
    
    // UI references
    this.ui = {
        container: document.getElementById('chat-interface'),
        messages: document.getElementById('chat-messages'),
        input: document.getElementById('chat-input'),
        sendBtn: document.getElementById('chat-send-btn'),
        closeBtn: document.getElementById('chat-close-btn'),
        typingIndicator: document.getElementById('chat-typing')
    };
    
    this.setupEventListeners();
}
```

### Event Listeners

```javascript
setupEventListeners() {
    // Send button
    this.ui.sendBtn.addEventListener('click', () => this.sendMessage());
    
    // Enter key in input
    this.ui.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            this.sendMessage();
        }
        e.stopPropagation();  // Prevent 'E' key from game
    });
    
    // Close button
    this.ui.closeBtn.addEventListener('click', () => this.closeChat());
}
```

---

## Opening Chat

### openChat()

```javascript
async openChat(entity) {
    if (!this.ui.container) return;
    
    this.isOpen = true;
    this.currentEntity = entity;
    this.history = [];
    
    // Show chat UI
    this.ui.container.style.display = 'flex';
    this.ui.messages.innerHTML = '';
    this.ui.input.value = '';
    this.ui.input.focus();
    
    // Load lore file if exists
    let lore = "You are a generic NPC.";
    if (entity.userData.loreFile) {
        try {
            const res = await fetch(entity.userData.loreFile);
            if (res.ok) {
                lore = await res.text();
            }
        } catch (err) {
            console.warn("Could not load lore:", err);
        }
    }
    
    // Set system prompt
    this.llm.setSystemPrompt(lore);
    
    // Show connection message
    this.addMessage("System", "Connected to " + (entity.userData.name || "NPC"));
}
```

### Lore File

The lore file is loaded from `base/modular/data/chief_lore.txt`:

```txt
[Chief Ruru's system prompt in Spanish]
```

The Chief's character is described as paranoid but friendly, speaking in third person.

---

## Sending Messages

### sendMessage()

```javascript
async sendMessage() {
    if (this.isSending) return;
    
    const text = this.ui.input.value.trim();
    if (!text) return;
    
    this.isSending = true;
    this.ui.sendBtn.disabled = true;
    
    // Add user message to UI
    this.addMessage("You", text, true);
    this.ui.input.value = '';
    
    // Show typing indicator
    this.ui.typingIndicator.style.display = 'block';
    
    // Get response from LLM
    const response = await this.llm.sendChat(text, this.history);
    
    // Hide typing, show response
    this.ui.typingIndicator.style.display = 'none';
    this.addMessage(
        this.currentEntity?.userData.name || "NPC", 
        response, 
        false
    );
    
    // Update history
    this.history.push({ role: "user", content: text });
    this.history.push({ role: "assistant", content: response });
    
    this.isSending = false;
    this.ui.sendBtn.disabled = false;
    this.ui.input.focus();
}
```

---

## Displaying Messages

### addMessage()

```javascript
addMessage(sender, text, isUser = false) {
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user-message' : 'npc-message'}`;
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    
    this.ui.messages.appendChild(div);
    this.ui.messages.scrollTop = this.ui.messages.scrollHeight;
}
```

### CSS Classes

```css
.message {
    padding: 8px 12px;
    margin: 4px 0;
    border-radius: 8px;
    max-width: 80%;
}

.user-message {
    background: #4a90d9;
    color: white;
    margin-left: auto;
}

.npc-message {
    background: #f0f0f0;
    color: #333;
}
```

---

## Closing Chat

### closeChat()

```javascript
closeChat() {
    this.isOpen = false;
    this.ui.container.style.display = 'none';
    this.currentEntity = null;
    
    // Optional: re-request pointer lock
    // this.engine.world.renderer.domElement.requestPointerLock();
}
```

---

## LLMService

**Location**: `base/modular/js/services/LLMService.js`

### Current Status

**This is a stub implementation.** It returns random fallback responses instead of actual LLM calls.

### Class

```javascript
export default class LLMService {
    constructor() {
        this.systemPrompt = "You are a helpful assistant in a video game.";
        
        this.fallbackResponses = [
            "Hmm, interesting... Tell me more.",
            "I don't have much to say about that.",
            "*Nods slowly*",
            "The island holds many secrets...",
            "I've been here a long time, traveler.",
            "Be careful out there.",
            "Have you explored the whole island yet?",
            "*Looks around nervously*",
            "I wish I could help more.",
            "That's a good question... I'm not sure."
        ];
    }
    
    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
    }
    
    async sendChat(userMessage, history = []) {
        // Return random fallback
        const idx = Math.floor(Math.random() * this.fallbackResponses.length);
        return this.fallbackResponses[idx];
    }
}
```

---

## Integration with Game

### Triggering Chat

In `InputHandler.handlePickup()`:

```javascript
if (root.userData.type === 'chief') {
    document.exitPointerLock();
    const d = document.getElementById('dialog-box');
    if (d) d.style.display = 'none';
    
    this.engine.chatManager.openChat(root);
    audio.sing();
    return;
}
```

### Entity Data

Chief entities have:

```javascript
{
    type: 'chief',
    name: 'Chief Ruru',
    loreFile: 'data/chief_lore.txt',
    canChat: true,
    radius: 0.6,
    color: creatureColor,
    moveSpeed: 0.045,
    fleeTimer: 0
}
```

---

## Extending for Real LLM

To integrate a real LLM (e.g., OpenAI, Anthropic, Gemini), modify `LLMService.js`:

```javascript
async sendChat(userMessage, history = []) {
    // Build messages array
    const messages = [
        { role: "system", content: this.systemPrompt },
        ...history,
        { role: "user", content: userMessage }
    ];
    
    // Call LLM API
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
}
```

### Configuration

API keys are stored in `config.js`:

```javascript
// base/modular/js/config.js
export default {
    GEMINI_API_KEY: 'your-api-key-here',
    GEMINI_MODEL: 'gemini-pro',
    GEMINI_URL: 'https://generativelanguage.googleapis.com/v1beta/models/...'
};
```

**Note**: The config currently has a Gemini key that is unused/commented out.

---

## Dialog System

For non-chat NPCs (like the Stone Golem), there's a simpler dialog system:

### Trigger

In `InputHandler.handlePickup()`:

```javascript
if (root.userData.type === 'golem') {
    document.exitPointerLock();
    const d = document.getElementById('dialog-box');
    if (d) {
        d.style.display = 'flex';
        document.getElementById('dialog-text').innerHTML = 
            "STONE GOLEM:<br>" + (root.userData.dialog || "...");
    }
    return;
}
```

### Entity Data

Golem entities have:

```javascript
{
    type: 'golem',
    dialog: "need. soul. soul. in. big. green. roof.",
    radius: 2.5,
    interactive: true
}
```

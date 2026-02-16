// =====================================================
// MESSAGE PROTOCOL - Encode / decode network messages
// =====================================================

export default class MessageProtocol {
    /**
     * Encode a message object for transmission
     * @param {Object} msg
     * @returns {string} JSON string (upgrade to binary later)
     */
    static encode(msg) {
        return JSON.stringify(msg);
    }

    /**
     * Decode an incoming message
     * @param {string|ArrayBuffer} raw
     * @returns {Object|null}
     */
    static decode(raw) {
        try {
            if (raw instanceof ArrayBuffer) {
                raw = new TextDecoder().decode(raw);
            }
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[Protocol] Failed to decode message:', e);
            return null;
        }
    }

    // --- Message type constants ---
    static get TYPES() {
        return {
            WELCOME:       'welcome',
            PLAYER_JOIN:   'player_join',
            PLAYER_LEAVE:  'player_leave',
            PLAYER_STATE:  'player_state',
            WORLD_EVENT:   'world_event',
            CHAT:          'chat',
            ENTITY_SPAWN:  'entity_spawn',
            ENTITY_REMOVE: 'entity_remove'
        };
    }
}

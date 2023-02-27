/* global $STM_Config */
import React, { PureComponent } from 'react';

class ChatWidgetSimple extends PureComponent {

    render() {
        if ($STM_Config.openhive_chat_iframe_integration_enable) {
            return (
                <div
                    style={{
                        zIndex: 200,
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                    }}
                >
                    <iframe
                        src={`${$STM_Config.openhive_chat_uri}/channel/general/?layout=embedded`}
                        title="Chat"
                        id="chat-iframe"
                        style={{
                            overflowY: 'auto',
                            width: '320px',
                            height: '400px',
                        }}
                    />
                </div>
            );
        }
        return null;
    }
}

export default ChatWidgetSimple;

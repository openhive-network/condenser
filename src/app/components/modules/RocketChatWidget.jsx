/*global $STM_Config*/

//
// From https://github.com/onesebun/rocket-chat-widget
//

import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Button from '@mui/material/Button';
import ChatIcon from '@mui/icons-material/Chat';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import LaunchIcon from '@mui/icons-material/Launch';
import Draggable from 'react-draggable';
import tt from 'counterpart';

function RocketChatWidget({
    iframeSrc,
    iframeTitle,
    anchor,
    tooltip,
    closeText,
    rootStyle,
    drawerWidth,
    draggable,
    icon,
    open,
    ...rest
}) {
    const [state, setState] = React.useState({
        top: false,
        left: false,
        bottom: false,
        right: false,
    });
    const [badgeContent, setBadgeContent] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);

    const onMessageReceivedFromIframe = (event) => {

        // console.log("onMessageReceivedFromIframe event", event.origin, event.data, event);

        if (event.origin !== $STM_Config.openhive_chat_uri) {
            return;
        }
        // See https://developer.rocket.chat/rocket.chat/iframe-integration/iframe-events

        // Fires when iframe window's title changes. This way we replay
        // the logic of Rocket Chat's badge in our badge.
        if (event.data.eventName === 'unread-changed') {
            setBadgeContent(event.data.data || 0);
        }

    };

    const addIframeListener = () => {
        window.addEventListener("message", onMessageReceivedFromIframe);
    };
    const removeIframeListener = () => {
        window.removeEventListener("message", onMessageReceivedFromIframe);
    };

    React.useEffect(() => {
        addIframeListener();
        return () => {
            removeIframeListener();
        };
    }, []);

    const toggleDrawer = (anchoredAt, isOpened) => (event) => {
        if (
            event
            && event.type === 'keydown'
            && (event.key === 'Tab' || event.key === 'Shift')
        ) {
            return;
        }

        setState({ ...state, [anchoredAt]: isOpened });
    };

    const isAnchorTopOrBottom = anchor === 'top' || anchor === 'bottom';

    const list = (anchoredAt) => (
        <Box
            sx={{
                width: isAnchorTopOrBottom ? 'auto' : '100vw',
                maxWidth: isAnchorTopOrBottom ? 'auto' : drawerWidth,
                height: '100vh',
                display: 'flex',
                flexDirection: 'column'
            }}
            role="presentation"
            onClick={toggleDrawer(anchoredAt, false)}
            onKeyDown={toggleDrawer(anchoredAt, false)}
        >
            <iframe
                id="chat-iframe"
                src={iframeSrc}
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block'
                }}
                title={iframeTitle}
            />
            <div style={{ display: 'flex' }}>
                <Button style={{ flex: 1 }}>
                    {tt('rocket_chat_widget_jsx.close_text')}
                </Button>
                <IconButton
                    color="primary"
                    aria-label="launch"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={iframeSrc}
                >
                    <LaunchIcon />
                </IconButton>
            </div>
        </Box>
    );

    return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <div style={rootStyle} {...rest}>
            <React.Fragment key={anchor}>
                <Draggable
                    disabled={!draggable}
                    axis="both"
                    onStart={() => setIsDragging(false)}
                    onDrag={() => setIsDragging(true)}
                    onStop={() => setIsDragging(false)}
                >
                    <Tooltip title={tt('rocket_chat_widget_jsx.tooltip')} placement="top">
                        <IconButton
                            size="large"
                            color="primary"
                            disabled={isDragging}
                            onClick={toggleDrawer(anchor, true)}
                            sx={{ ml: 2, fontSize: '72px' }}
                            aria-controls={open ? 'account-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={open ? 'true' : undefined}
                        >
                            <Badge color="error" badgeContent={badgeContent}>
                                {icon || <ChatIcon fontSize="large" />}
                            </Badge>
                        </IconButton>
                    </Tooltip>
                </Draggable>

                <SwipeableDrawer
                    anchor={anchor}
                    open={state[anchor]}
                    onClose={toggleDrawer(anchor, false)}
                    onOpen={toggleDrawer(anchor, true)}
                    ModalProps={{
                        keepMounted: true,
                    }}
                >
                    {list(anchor)}
                </SwipeableDrawer>
            </React.Fragment>
        </div>
    );
}

RocketChatWidget.propTypes = {
    iframeSrc: PropTypes.string.isRequired,
    iframeTitle: PropTypes.string,
    rootStyle: PropTypes.shape({}),
    anchor: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
    tooltip: PropTypes.string,
    drawerWidth: PropTypes.number,
    closeText: PropTypes.string,
    draggable: PropTypes.bool,
    icon: PropTypes.node,
    open: PropTypes.bool,
};

RocketChatWidget.defaultProps = {
    iframeTitle: 'Rocket.Chat',
    anchor: 'right',
    tooltip: 'Chat',
    closeText: 'Close',
    rootStyle: { right: 10, bottom: 10, position: 'fixed' },
    drawerWidth: 500,
    draggable: false,
    icon: <ChatIcon />,
    open: false,
};

export default RocketChatWidget;

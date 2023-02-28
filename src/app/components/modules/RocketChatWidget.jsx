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
    ...rest
}) {
    const [state, setState] = React.useState({
        top: false,
        left: false,
        bottom: false,
        right: false,
    });
    const [count, setCount] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);

    const onMessageReceivedFromIframe = (event) => {
        console.log("onMessageReceivedFromIframe event", event);
        if (event.origin !== $STM_Config.openhive_chat_uri) {
            return;
        }
        if (!state[anchor] && event.data.eventName === 'new-message') {
            setCount((prev) => prev + 1);
        }
    };

    React.useEffect(() => {
        if (state[anchor]) {
            setCount(0);
        }
    }, [state]);

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

    const toggleDrawer = (anchor, open) => (event) => {
        if (
            event
            && event.type === 'keydown'
            && (event.key === 'Tab' || event.key === 'Shift')
        ) {
            return;
        }

        setState({ ...state, [anchor]: open });
    };

    const isAnchorTopOrBottom = anchor === 'top' || anchor === 'bottom';

    const list = (anchor) => (
        <Box
            sx={{
                width: isAnchorTopOrBottom ? 'auto' : '100vw',
                maxWidth: isAnchorTopOrBottom ? 'auto' : drawerWidth,
                height: '100vh',
                display: 'flex',
                flexDirection: 'column'
            }}
            role="presentation"
            onClick={toggleDrawer(anchor, false)}
            onKeyDown={toggleDrawer(anchor, false)}
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
                <Button style={{ flex: 1 }}>{closeText}</Button>
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
                    <Tooltip title={tooltip} placement="top">
                        <IconButton
                            disabled={isDragging}
                            onClick={toggleDrawer(anchor, true)}
                            // size="small"
                            sx={{ ml: 2 }}
                            aria-controls={open ? 'account-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={open ? 'true' : undefined}
                        >
                            <Badge color="secondary" badgeContent={count}>
                                {icon || <ChatIcon />}
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
    icon: PropTypes.node
};

RocketChatWidget.defaultProps = {
    iframeTitle: 'Rocket.chat',
    anchor: 'right',
    tooltip: 'Chat',
    closeText: 'Close',
    rootStyle: { right: 10, bottom: 10, position: 'fixed' },
    drawerWidth: 500,
    draggable: false,
    icon: <ChatIcon />
};

export default RocketChatWidget;

/*global $STM_Config*/

//
// Initially based on https://github.com/onesebun/rocket-chat-widget
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
import { connect } from 'react-redux';
import { logger } from '../../utils/Logger';
import { inIframe } from '../../utils/Helpers';

/**
 * Login to Rocket Chat via iframe.
 *
 * @export
 * @param {*} data Object with property `chatAuthToken`.
 * @param {*} iframeRef Reference to iframe html element with Rocket Chat
 */
export function chatLogin(data, iframeRef) {
    logger.log('chatLogin start');
    if ($STM_Config.openhive_chat_iframe_integration_enable) {
        logger.log('chatLogin openhive_chat_iframe_integration_enable is true');
        try {
            if (data && data.chatAuthToken) {
                const message = {
                    event: 'login-with-token',
                    loginToken: data.chatAuthToken,
                    loginType: data.loginType || 'login',
                };
                logger.log('chatLogin posting message', message, data);
                iframeRef.current.contentWindow.postMessage(
                    {...message},
                    `${$STM_Config.openhive_chat_uri}`,
                );
            } else {
                logger.warn('chatLogin not posting message, data is wrong', data);
            }
        } catch (error) {
            logger.error('chatLogin not posting message', data);
        }
    } else {
        logger.log('chatLogin openhive_chat_iframe_integration_enable is false');
    }
}

/**
 * Logout from Rocket Chat via iframe.
 *
 * @export
 * @param {*} iframeRef Reference to iframe html element with Rocket Chat
 */
export function chatLogout(iframeRef) {
    if ($STM_Config.openhive_chat_iframe_integration_enable) {
        try {
            logger.log('chatLogout posting message');
            iframeRef.current.contentWindow.postMessage(
                {
                    externalCommand: 'logout',
                },
                `${$STM_Config.openhive_chat_uri}`
            );
        } catch (error) {
            logger.error('chatLogout error', error);
        }
    }
}

/**
 * React component showing iframe with Rocket Chat.
 *
 * @param {*} {
 *     iframeSrc,
 *     iframeTitle,
 *     anchor,
 *     tooltip,
 *     closeText,
 *     rootStyle,
 *     drawerWidth,
 *     draggable,
 *     icon,
 *     open,
 *     username,
 *     loginType,
 *     chatAuthToken,
 *     ...rest
 * }
 * @returns
 */
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
    username,
    loginType,
    chatAuthToken,
    ...rest
}) {

    const [state, setState] = React.useState({
        top: false,
        left: false,
        bottom: false,
        right: false,
    });
    const [init, setInit] = React.useState(true);
    const [badgeContent, setBadgeContent] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const [disabled, setDisabled] = React.useState(true);
    const [loggedIn, setLoggedIn] = React.useState(false);
    const [isIframeLoaded, setIsIframeLoaded] = React.useState(false);
    const iframeRef = React.useRef(null);

    const onMessageReceivedFromIframe = (event) => {

        //
        // See https://developer.rocket.chat/rocket.chat/iframe-integration/iframe-events
        // Warning: above documentation looks to be outdated. I noticed
        // events not mentioned there.
        //

        if (event.origin !== $STM_Config.openhive_chat_uri) {
            return;
        }

        logger.log("chat onMessageReceivedFromIframe event", event.origin,
                event.data, event);

        // Fires when iframe window's title changes. This way we replay
        // the behavior of native Rocket Chat's badge in our badge.
        if (event.data.eventName === 'unread-changed') {
            setBadgeContent(event.data.data || 0);
        }

        if (event.data.eventName === 'ready') {
            logger.log('Chat application is ready');
            setIsIframeLoaded(true);
        }

        // User has logged in.
        if (event.data.eventName === 'Custom_Script_Logged_In') {
            // // Should not be needed, but without this chat is not in
            // // `embedded` mode sometimes. Also sometimes user is not
            // // redirected to default channel.
            // iframeRef.current.contentWindow.postMessage(
            //     {
            //         externalCommand: "go",
            //         path: "/channel/general"
            //     },
            //     `${$STM_Config.openhive_chat_uri}`,
            // );
            setDisabled(false);
        }

        // User has logged out.
        if (event.data.eventName === 'Custom_Script_Logged_Out') {
            setState({ ...state, [anchor]: false });
            setDisabled(true);
        }

    };

    const addIframeListener = () => {
        window.addEventListener("message", onMessageReceivedFromIframe);
    };

    const removeIframeListener = () => {
        window.removeEventListener("message", onMessageReceivedFromIframe);
    };

    React.useEffect(() => {
        // `init` is true when component operates on initial, default
        // values.
        if (!init) {
            if (chatAuthToken) {
                setLoggedIn(true);
                if (isIframeLoaded) {
                    chatLogin({chatAuthToken, loginType}, iframeRef);
                }
            } else if (!chatAuthToken) {
                if (isIframeLoaded) {
                    chatLogout(iframeRef);
                }
            }
        } else {
            addIframeListener();
            setInit(false);
        }
    }, [chatAuthToken, isIframeLoaded]);

    const onIframeLoad = () => {
        logger.log('Chat iframe has been loaded');
        return () => {
            removeIframeListener();
        };
    };

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
                ref={iframeRef}
                onLoad={onIframeLoad}
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
        <>
            {!inIframe() && loggedIn && (
                <div
                    style={{
                        ...rootStyle,
                        ...{
                            display: $STM_Config.openhive_chat_iframe_visible
                            ? 'block'
                            : 'none'
                        },
                    }}
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...rest}
                >
                    <React.Fragment key={anchor}>
                        <Draggable
                            disabled={!draggable}
                            axis="both"
                            onStart={() => setIsDragging(false)}
                            onDrag={() => setIsDragging(true)}
                            onStop={() => setIsDragging(false)}
                        >
                            <div>
                                <Tooltip
                                    title={tt('rocket_chat_widget_jsx.tooltip')}
                                    placement="top"
                                >
                                    <span>
                                        <IconButton
                                            size="large"
                                            color="primary"
                                            disabled={disabled || isDragging}
                                            onClick={toggleDrawer(anchor, true)}
                                            sx={{ ml: 2, fontSize: 48 }}
                                            aria-controls={
                                                open
                                                ? 'account-menu'
                                                : undefined
                                            }
                                            aria-haspopup="true"
                                            aria-expanded={
                                                open
                                                ? 'true'
                                                : undefined
                                            }
                                        >
                                            <Badge
                                                color="error"
                                                badgeContent={badgeContent}
                                            >
                                                {icon}
                                            </Badge>
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </div>
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
            )}
        </>
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
    username: PropTypes.string,
    loginType: PropTypes.string,
    chatAuthToken: PropTypes.string,
};

RocketChatWidget.defaultProps = {
    iframeTitle: 'Chat',
    anchor: 'right',
    tooltip: 'Chat',
    closeText: 'Close',
    rootStyle: {
        right: 10,
        bottom: 10,
        position: 'fixed',
    },
    drawerWidth: 500,
    draggable: false,
    icon: <ChatIcon style={{ fontSize: 48 }} />,
    open: false,
    username: '',
    loginType: '',
    chatAuthToken: '',
};

const mapStateToProps = (state) => {
    const username = state.user.getIn(['current', 'username']);
    const loginType = state.user.getIn(['current', 'loginType']);
    const chatAuthToken = state.user.getIn(['current', 'chatAuthToken']);
    return {
        username,
        loginType,
        chatAuthToken,
    };
};

const mapDispatchToProps = () => {
    return {};
};

export default connect(mapStateToProps, mapDispatchToProps)(RocketChatWidget);

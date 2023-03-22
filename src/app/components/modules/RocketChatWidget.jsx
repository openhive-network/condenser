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
import { connect } from 'react-redux';

/**
 * Login to Rocket Chat via iframe.
 *
 * @export
 */
export function chatLogin(data, iframeRef) {
    if ($STM_Config.openhive_chat_iframe_integration_enable) {
        console.log('bamboo running chatLogin', data, iframeRef);
        try {
            if (data && data.chatAuthToken) {
                // document.querySelector("#chat-iframe").contentWindow.postMessage(
                iframeRef.current.contentWindow.postMessage(
                    {
                        event: 'login-with-token',
                        loginToken: data.chatAuthToken,
                        loginType: data.loginType || 'login',
                    },
                    `${$STM_Config.openhive_chat_uri}`,
                );
                // Should not be needed, but without this chat is not in
                // `embedded` mode sometimes. Also sometimes user is not
                // redirected to default channel.
                // document.querySelector("#chat-iframe").contentWindow.postMessage(
                iframeRef.current.contentWindow.postMessage(
                    {
                        externalCommand: "go",
                        path: "/channel/general"
                    },
                    `${$STM_Config.openhive_chat_uri}`,
                );
            }
        } catch (error) {
            console.error('bamboo chatLogin error', error);
        }
    }
}

/**
 * Logout from Rocket Chat via iframe.
 *
 * @export
 */
export function chatLogout(iframeRef) {
    if ($STM_Config.openhive_chat_iframe_integration_enable) {
        console.log('bamboo running chatLogout');
        try {
            iframeRef.current.contentWindow.postMessage(
                {
                    externalCommand: 'logout',
                },
                `${$STM_Config.openhive_chat_uri}`
            );
        } catch (error) {
            console.error('bamboo chatLogout error', error);
        }
    }
}

export const IframeRenderer = ({
    iframeRef,
    src,
    title,
    style,
}) => {
    console.log('bamboo IframeRenderer iframeRef', iframeRef);
    return (
        <iframe
            ref={iframeRef}
            src={src}
            title={title}
            style={style}
         />
    );
};

export const useIsIframeLoaded = (
    iframeRef
) => {
    const [isIframeLoaded, setIsIframeLoaded] = React.useState(false);
    const iframeCurrent = iframeRef.current;
    React.useEffect(() => {
        if (iframeCurrent) {
            iframeCurrent.addEventListener(
                'load',
                () => setIsIframeLoaded(true)
                );
        }
        return () => {
            if (iframeCurrent) {
                iframeCurrent.removeEventListener(
                    'load',
                    () => setIsIframeLoaded(true)
                    );
            }
        };
    }, [iframeCurrent]);
    return isIframeLoaded;
};

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
    const iframeRef = React.useRef(null);
    const isIframeLoaded = useIsIframeLoaded(iframeRef);

    const onMessageReceivedFromIframe = (event) => {

        //
        // See https://developer.rocket.chat/rocket.chat/iframe-integration/iframe-events
        // Warning: above documentation looks to be outdated. I noticed
        // events not mentioned there.
        //

        if (event.origin !== $STM_Config.openhive_chat_uri) {
            return;
        }

        // console.log("onMessageReceivedFromIframe event", event.origin, event.data, event);

        // Fires when iframe window's title changes. This way we replay
        // the logic of Rocket Chat's badge in our badge.
        if (event.data.eventName === 'unread-changed') {
            setBadgeContent(event.data.data || 0);
        }

        // User has logged in.
        if (event.data.eventName === 'Custom_Script_Logged_In') {
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
        addIframeListener();
        return () => {
            removeIframeListener();
        };
    });

    // React.useEffect(() => {
    //     console.log('bamboo chatAuthToken', chatAuthToken);
    //     if (!init) {
    //         if (chatAuthToken && loginType) {
    //             setLoggedIn(true);
    //             console.log('bamboo isIframeLoaded', isIframeLoaded);
    //             // TODO I don't like this timeout, but we get error
    //             // without this.
    //             // setTimeout( () => {
    //                 chatLogin({chatAuthToken, loginType}, iframeRef);
    //             // }, 2000);
    //         } else if (!chatAuthToken && !loginType) {
    //             chatLogout(iframeRef);
    //             setLoggedIn(false);
    //         }
    //     }
    //     if (init) {
    //         setInit(false);
    //     }
    // }, [chatAuthToken]);

    React.useEffect(() => {
        console.log('bamboo isIframeLoaded', isIframeLoaded);
        if (isIframeLoaded) {
            chatLogin({chatAuthToken, loginType}, iframeRef);
        }
    }, [isIframeLoaded]);

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
            <IframeRenderer
                iframeRef={iframeRef}
                src={iframeSrc}
                title={iframeTitle}
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block'
                }}
            />
            {/* <iframe
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
            /> */}
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
            {username && chatAuthToken && (
                <div
                    style={{
                        ...rootStyle,
                        ...{display: $STM_Config.openhive_chat_iframe_visible ? 'block' : 'none'},
                    }}
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
                                <Tooltip title={tt('rocket_chat_widget_jsx.tooltip')} placement="top">
                                    <span>
                                        <IconButton
                                            size="large"
                                            color="primary"
                                            disabled={disabled || isDragging}
                                            onClick={toggleDrawer(anchor, true)}
                                            sx={{ ml: 2, fontSize: 48 }}
                                            aria-controls={open ? 'account-menu' : undefined}
                                            aria-haspopup="true"
                                            aria-expanded={open ? 'true' : undefined}
                                        >
                                            <Badge color="error" badgeContent={badgeContent}>
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
    iframeTitle: 'Rocket.Chat',
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

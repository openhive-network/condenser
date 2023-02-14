import RequestTimer from './utils/RequestTimer';

export default function requestTime(statsLoggerClient) {
    return async (ctx, next) => {
        ctx.state.requestTimer = new RequestTimer(
            statsLoggerClient,
            'request',
            `method=${ctx.request.method} path=${ctx.request.path}`
        );

        await next();

        ctx.state.requestTimer.finish();
    };
}

module.exports = requestTime;

import SDC from 'statsd-client';

/**
 * In production, log stats to statsd.
 * In dev, console.log 'em.
 */
export default class StatsLoggerClient {
    constructor(STATSD_IP) {
        if (STATSD_IP) {
            this.SDC = new SDC({
                host: STATSD_IP,
                prefix: 'condenser',
            });
        } else {
            console.log('StatsLoggerClient: no server available, logging to console.');
            // Implement debug loggers here, as any new calls are added in methods below.
            this.SDC = {
                timing() {
                    // eslint-disable-next-line prefer-rest-params
                    console.log('StatsLoggerClient call: ', arguments);
                },
            };
        }
    }

    /**
     * Given an array of timer tuples that look like [namespace, value]
     * log them all to statsd.
     */
    logTimers(tuples) {
        // eslint-disable-next-line array-callback-return
        tuples.map((tuple) => {
            this.SDC.timing(tuple[0], tuple[1]);
        });
    }
}

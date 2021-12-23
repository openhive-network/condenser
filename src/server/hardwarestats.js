import cpuStat from 'cpu-stat';
import memStat from 'mem-stat';
import diskStat from 'disk-stat';

module.exports = hardwareStats;

const stats = {};

function handleError(err) {
    // perpetually throws the same error down the chain for promises
    throw err;
}

function startPromise() {
    return new Promise((resolve) => {
        resolve();
    });
}

function getCpuUsage() {
    return new Promise((resolve) => {
        // eslint-disable-next-line consistent-return
        cpuStat.usagePercent((err, percent) => {
            if (err) return err;
            stats.cpuPercent = percent;
            resolve();
        });
    });
}

function getMemoryUsage() {
    return new Promise((resolve) => {
        stats.memoryStatsInGiB = memStat.allStats('GiB');
        resolve();
    });
}

function getDiskUsage() {
    return new Promise((resolve) => {
        stats.diskStats = diskStat.raw();
        resolve();
    });
}

function hardwareStats() {
    return startPromise()
        .then(getCpuUsage, handleError)
        .then(getMemoryUsage, handleError)
        .then(getDiskUsage, handleError)
        .then(() => {
            console.log(JSON.stringify(stats));
        }, handleError)
        .then(null, (err) => {
            console.log('error getting hardware stats: ' + err);
        });
}

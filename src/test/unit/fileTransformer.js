const path = require('path');

module.exports = {
    process(src, filename) {
        // add a leading slash because it makes sense for path in browser environment
        const filepath = `/${path.basename(filename)}`;
        return `module.exports = ${JSON.stringify(filepath)};`;
    },
};

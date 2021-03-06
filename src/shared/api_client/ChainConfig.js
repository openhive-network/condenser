import * as steem from '@hiveio/hive-js';

steem.config.set('address_prefix', 'STM');

let chain_id = '';
for (let i = 0; i < 32; i += 1) chain_id += '00';

module.exports = {
    address_prefix: 'STM',
    expire_in_secs: 15,
    chain_id,
};

import React from 'react';
import { fromJS } from 'immutable';
import { storiesOf } from '@storybook/react';
import rootReducer from 'app/redux/RootReducer';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { IntlProvider } from 'react-intl';
import Voting from './Voting';

const store = createStore(rootReducer);
const post = JSON.parse('{"post_id":106486213,"author":"creativemary","permlink":"my-real-life-story-about-homelessness-and-how-i-coped-with-adversity-in-my-life","category":"hive-148441","title":"My real life story about homelessness and how I coped with adversity in my life","body":"Hello! My name is Mary and for those of you who know me from Hive you are most likely aware of the fact that I am very creative. ","json_metadata":{"tags":["lifestory","real","proofofbrain","adversity","gratitude","faith","god"],"users":["galenkp","appreciator","bluemist","gems","bdcommunity","discovery-it","nftshowroom","onchainart","threespeak","qurator","proofofbrain","makeuppower","nerday","freewriters","sketchbook","ocd","curangel","acidyo","hiddenblade","chekohler","tarazkp","jaynie","darthknight","ranchorelaxo","haejin","meesterboom","abh12345","m31","nuthman","bdmillergallery","kommienezuspadt","ammonite","gabrielatravels","alejandra.her","papilloncharity","maxwellmarcusart","nonameslefttouse","vincentnijman","anggreklestari","ackhoo","ewkaw","emiliocabrera","dswigle","isaria","brumest","wiseagent","trucklife-family","ecency","kristal24","tipu","nainaztengra","kgakakillerg","trafalgar","ladybug146","teknon","my-musings","phage93","foxkoit","wendywoodall","blocktrades","anmolsingh3006"],"image":["https:\\/\\/images.hive.blog\\/DQmdWrkSMyQda3nRzt8nDx8kWv77QvT45ZwZxVnJ9BLvVwB\\/IMG_20200615_185722.jpg","https:\\/\\/images.hive.blog\\/DQmZ9WC6AjgtjzxgKgqhryUyFMTYeZ7ivYDWqXempi1Xcjy\\/IMG_20180701_202808.jpg","https:\\/\\/images.hive.blog\\/DQmYrYSUitKju8Yx9wdbAeyXVHLG1qChkPRfJt6MmPwg89p\\/9.jpg","https:\\/\\/images.hive.blog\\/DQmS5AumGa1yvyuouUfM98UedMexQaYTcEHqPBmmUnMsuV2\\/DSC_0034.JPG","https:\\/\\/images.hive.blog\\/DQmS3Y3WyBruZ5uxr7E6gyLBi1EvhEX4FMLWhbeNkxhqL4q\\/DSC_0042.JPG","https:\\/\\/images.hive.blog\\/DQmUFsJfMFs8JWz6WnAUN1pVzsaSm2c7XYR146dK7ve7cGb\\/21.jpg","https:\\/\\/images.hive.blog\\/DQmY167vfyfH7jmkPh4SF3pjobG2XgQFa9Mi9WQrmXXAFN8\\/IMG_20180528_171959.jpg","https:\\/\\/images.hive.blog\\/DQmcPfSqmo3qYddGg2LpK2dRMDUMadwi1P4VaunjU1be2iU\\/IMG_20180528_172012.jpg","https:\\/\\/images.hive.blog\\/DQmaWdv3VDfgB5A8FHVfUFSgWv2g142uXEJTBcrnpmQ5VaG\\/IMG_20180607_181958.jpg","https:\\/\\/images.hive.blog\\/DQmUPmJrhrTx7p5hKugtCujsSXCHcr45imAghBtQsqvCq97\\/IMG_20180607_182003.jpg","https:\\/\\/images.hive.blog\\/DQmWGeQ49naFHE5aoCxt2qXk2GPqU792k3TyjmzoX1WYfto\\/IMG_20180615_204830.jpg","https:\\/\\/images.hive.blog\\/DQmV14Tqec6JxWrw5L2UrYiK9YsPH7MeMLRdt4wKrsawgte\\/IMG_20180619_185804.jpg","https:\\/\\/images.hive.blog\\/DQmdvPiQjeYTWmhA9GmRm4fh2CXxVKM1xbtY2Dh6rhL3Nch\\/IMG_20200705_072129.jpg","https:\\/\\/images.hive.blog\\/DQmXn2YvJT7qHmiy877ovAVDuZoEn5GYay39W1L6SV757TR\\/IMG_20200705_105623.jpg","https:\\/\\/images.hive.blog\\/DQmSXJ5UDEyuTaz6VGLNPkizaMpQkeEVKGXN8T73Mn8Z2nW\\/IMG_20200705_105723.jpg","https:\\/\\/images.hive.blog\\/DQmeLYfVyehL7TJhXTFS2aGigH63yg48eh7yhqU7MAPsusW\\/IMG_20200210_094100.jpg","https:\\/\\/images.hive.blog\\/DQmXJR1anfvuDCTjcvY8DFF9PK1UH3KvpdvhzoPdb4CyoSr\\/IMG_20200405_190512.jpg","https:\\/\\/images.hive.blog\\/DQmcPqvFngj2SjBn7VRKWbidZBhYKYEQajEFbH4PoLLLSWg\\/IMG_20200407_092424.jpg","https:\\/\\/images.hive.blog\\/DQmUjKp79ydZ8sRzCEQk2BE4Mm3cpZG3uATFftNtoA57EpZ\\/IMG_20200415_181530.jpg","https:\\/\\/images.hive.blog\\/DQmbBVZQbsNfqgp8dwDWxGCyEUeUqbxPAdUkVZ1LnpujWxp\\/dendrol.jpg","https:\\/\\/images.hive.blog\\/DQmPEJGLjSQUirZiHkacHwKMT5SUNGvwcfcQ4CvTxY8bM3Y\\/IMG_20190427_150131.jpg","https:\\/\\/images.hive.blog\\/DQmdVZXGH4H7JT2Stiud961gj42y17C3Q8fM3Gi9tbcaVwp\\/IMG_20200601_191353.jpg","https:\\/\\/images.hive.blog\\/DQmYYuoLfUi8SCieZt7dA1cMgFFhNDMrj3ihhxdhMBVMsVw\\/IMG_20200513_141034.jpg","https:\\/\\/images.hive.blog\\/DQmPYpGYoGMTiA3rhNepnMPHT9ihASXPvUczzHVHuUybXmF\\/IMG_20200513_141042.jpg","https:\\/\\/images.hive.blog\\/DQmavmvyQX7wH93g6BCHYzqwT2TCADMRQuisyZ9PR9af9Rj\\/IMG_20200513_141233.jpg","https:\\/\\/images.hive.blog\\/DQmahzDTEguZ2B6femrTh4DyXm5MD1Kj4yTQxScBs1BWdWT\\/IMG_20200615_180521.jpg","https:\\/\\/images.hive.blog\\/DQmWYmv2VbNWdfrdvZ6Mvyb5DSwT6o9LTPD3JYa8umdEcTb\\/IMG_20200615_181826.jpg","https:\\/\\/images.hive.blog\\/DQmaQ1DfHzRpfc1Nb14o4R5o4t4W1gg7rcHYFdqiMqiHUZT\\/IMG_20200615_182935.jpg","https:\\/\\/images.hive.blog\\/DQmSJ4GMgrKWX31g2uNCkVCf9C1tptemYzm9CeCSq8gZR9P\\/IMG_20200615_190431.jpg"],"app":"hiveblog\\/0.1","format":"markdown"},"created":"2021-09-22T17:52:39","updated":"2021-09-22T17:53:24","depth":0,"children":45,"net_rshares":458511354635775,"is_paidout":false,"payout_at":"2021-09-29T17:52:39","payout":390.558,"pending_payout_value":"390.558 HBD","author_payout_value":"0.000 HBD","curator_payout_value":"0.000 HBD","promoted":"0.000 HBD","replies":["discovery-it\\/qzuki0","phage93\\/qzukk3","anmolsingh3006\\/re-creativemary-2021922t233013488z","teknon\\/re-creativemary-qzul09","foxkoit\\/re-creativemary-2021922t21729247z","fixie\\/qzulml","papilloncharity\\/re-creativemary-2021922t201913533z","meesterboom\\/qzum8k","bdmillergallery\\/re-creativemary-qzumfm","patschwork\\/qzumzi","vikthor\\/qzunl6","yahia-lababidi\\/re-creativemary-2021922t15447971z","topofracchio86\\/re-creativemary-qzunzr","hivebuzz\\/hivebuzz-notify-creativemary-20210922t191440","revoko\\/qzuoe6","ewkaw\\/qzup56","gabrielatravels\\/re-creativemary-qzupce","slobberchops\\/re-creativemary-qzupmr","tarazkp\\/re-creativemary-qzupol","geraldhm\\/qzur2j","ericvancewalton\\/qzur5x","m31\\/qzurjt","davidosas\\/re-creativemary-qzusf2","santigs\\/re-creativemary-qzusw7","abh12345\\/re-creativemary-qzuu0n","chekohler\\/re-creativemary-qzuube","galenkp\\/re-creativemary-qzuuks","mlrequena78\\/qzuwzb","ammonite\\/re-creativemary-qzux85","crosheille\\/re-creativemary-qzuy68","hivebuzz\\/hivebuzz-notify-creativemary-20210923t001401","peterale\\/re-creativemary-qzv2c1","almaslu12\\/re-creativemary-2021923t81512862z","kingtamarah\\/qzv8bp","sanjeevm\\/re-creativemary-qzv8hc","kingscrown\\/qzvbb4","tykee\\/re-creativemary-2021923t5594072z","revisesociology\\/re-creativemary-qzvhy5","destinee1234\\/re-creativemary-qzvi25","kgakakillerg\\/qzvj2t","nuthman\\/re-creativemary-qzvjz5","tajimkhan\\/re-creativemary-qzvli6","thisismylife\\/re-creativemary-qzvlxu"],"author_reputation":73.11,"stats":{"hide":false,"gray":false,"total_votes":1043,"flag_weight":0.0},"url":"\\/hive-148441\\/@creativemary\\/my-real-life-story-about-homelessness-and-how-i-coped-with-adversity-in-my-life","beneficiaries":[],"max_accepted_payout":"1000000.000 HBD","percent_hbd":10000,"active_votes":[],"blacklists":[],"community":"hive-148441","community_title":"GEMS","author_role":"guest","author_title":""}');

storiesOf('Elements', module)
    .addDecorator((getStory) => <Provider store={store}>{getStory()}</Provider>)
    .add('Voting', () => (
        <IntlProvider locale="en">
            <Voting
                post={fromJS(post)}
                post_obj={{
                    get: (arg) => {
                        switch (arg) {
                            case 'is_paidout':
                                return true;

                            case 'payout_at':
                                return '2016';

                            case 'pending_payout_value':
                                return 5;

                            case 'author_payout_value':
                                return 15;

                            case 'curator_payout_value':
                                return 13;

                            default:
                                return 'cool';
                        }
                    },
                    getIn: () => {},
                }}
            />
        </IntlProvider>
    ));

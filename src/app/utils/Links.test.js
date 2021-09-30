import assert from 'assert';
import secureRandom from 'secure-random';
import * as linksRe from 'app/utils/Links';
import youtubeRegex from 'app/components/elements/EmbeddedPlayers/youtube';
import threespeakRegex from 'app/components/elements/EmbeddedPlayers/threespeak';
import twitterRegex from 'app/components/elements/EmbeddedPlayers/twitter';
import spotifyRegex from 'app/components/elements/EmbeddedPlayers/spotify';
import mixcloudRegex from 'app/components/elements/EmbeddedPlayers/mixcloud';
import archiveorg from 'app/components/elements/EmbeddedPlayers/archiveorg';
import bandcamp from 'app/components/elements/EmbeddedPlayers/bandcamp';
import redditRegex from 'app/components/elements/EmbeddedPlayers/reddit';
import gist from 'app/components/elements/EmbeddedPlayers/gist';
import truvvl from 'app/components/elements/EmbeddedPlayers/truvvl';
import tiktokRegex from 'app/components/elements/EmbeddedPlayers/tiktok';
import instagramRegex from 'app/components/elements/EmbeddedPlayers/instagram';
import { PARAM_VIEW_MODE, VIEW_MODE_WHISTLE } from '../../shared/constants';

describe('Links', () => {
    it('all', () => {
        match(linksRe.any(), "https://example.com/wiki/Poe's_law", "https://example.com/wiki/Poe's_law");
        match(linksRe.any(), "https://example.com'", 'https://example.com');
        match(linksRe.any(), '"https://example.com', 'https://example.com');
        match(linksRe.any(), 'https://example.com"', 'https://example.com');
        match(linksRe.any(), "https://example.com'", 'https://example.com');
        match(linksRe.any(), 'https://example.com<', 'https://example.com');
        match(linksRe.any(), 'https://example.com>', 'https://example.com');
        match(linksRe.any(), 'https://example.com\n', 'https://example.com');
        match(linksRe.any(), ' https://example.com ', 'https://example.com');
        match(linksRe.any(), 'https://example.com ', 'https://example.com');
        match(linksRe.any(), 'https://example.com.', 'https://example.com');
        match(linksRe.any(), 'https://example.com/page.', 'https://example.com/page');
        match(linksRe.any(), 'https://example.com,', 'https://example.com');
        match(linksRe.any(), 'https://example.com/page,', 'https://example.com/page');
    });
    it('multiple matches', () => {
        const all = linksRe.any('ig');
        let match = all.exec('\nhttps://example.com/1\nhttps://example.com/2');
        assert.equal(match[0], 'https://example.com/1');
        match = all.exec('https://example.com/1 https://example.com/2');
        assert.equal(match[0], 'https://example.com/2');
    });
    it('by domain', () => {
        const locals = ['https://localhost/', 'http://hive.blog', 'http://hive.blog/group'];
        match(linksRe.local(), locals);
        matchNot(linksRe.remote(), locals);

        const remotes = ['https://peakd.com/', 'http://abc.co'];
        match(linksRe.remote(), remotes);
        matchNot(linksRe.local(), remotes);
    });
    it('by image', () => {
        match(linksRe.image(), 'https://example.com/a.jpeg');
        match(linksRe.image(), 'https://example.com/a/b.jpeg');
        match(
            linksRe.image(),
            '![](https://example.com/img2/nehoshtanit.jpg)',
            'https://example.com/img2/nehoshtanit.jpg'
        );
        match(
            linksRe.image(),
            '<img src="https://example.com/img2/nehoshtanit.jpg"',
            'https://example.com/img2/nehoshtanit.jpg'
        );
        match(linksRe.image(), 'http://example.com\nhttps://example.com/a.jpeg', 'https://example.com/a.jpeg');
        match(linksRe.image(), 'http://i.imgur.com/MWufFQi.jpg")', 'http://i.imgur.com/MWufFQi.jpg');
        matchNot(linksRe.image(), ['http://imgur.com/iznWRVq', 'https://openmerchantaccount.com/']);
    });
});

describe('makeParams', () => {
    it('creates an empty string when there are no params', () => {
        assert(linksRe.makeParams([]) === '', 'not empty on array');
        assert(linksRe.makeParams({}) === '', 'not empty on object');
        assert(linksRe.makeParams({}, false) === '', 'not empty on object with prefix false');
        assert(linksRe.makeParams([], false) === '', 'not empty on array with prefix false');
        assert(linksRe.makeParams([], '?') === '', 'not empty on array with prefix string');
        assert(linksRe.makeParams({}, '?') === '', 'not empty on object  with prefix string');
    });
    it('creates the correct string when passed an array', () => {
        assert(linksRe.makeParams(['bop=boop', 'troll=bridge']) === '?bop=boop&troll=bridge', 'incorrect string with');
        assert(
            linksRe.makeParams(['bop=boop', 'troll=bridge'], false) === 'bop=boop&troll=bridge',
            'incorrect string with prefix false'
        );
        assert(
            linksRe.makeParams(['bop=boop', 'troll=bridge'], '&') === '&bop=boop&troll=bridge',
            'incorrect string with prefix &'
        );
    });
    it('creates the correct string when passed an object', () => {
        assert(linksRe.makeParams({ bop: 'boop', troll: 'bridge' }) === '?bop=boop&troll=bridge', 'incorrect string');
        assert(
            linksRe.makeParams({ bop: 'boop', troll: 'bridge' }, false) === 'bop=boop&troll=bridge',
            'incorrect string with prefix false'
        );
        assert(
            linksRe.makeParams({ bop: 'boop', troll: 'bridge' }, '&') === '&bop=boop&troll=bridge',
            'incorrect string with prefix &'
        );
    });
});

describe('determineViewMode', () => {
    it('returns empty string when no parameter in search', () => {
        assert(linksRe.determineViewMode('') === '', linksRe.determineViewMode('') + 'not empty on empty string');
        assert(linksRe.determineViewMode('?afs=asdf') === '', 'not empty on incorrect parameter');
        assert(linksRe.determineViewMode('?afs=asdf&apple=sauce') === '', 'not empty on incorrect parameter');
    });

    it('returns empty string when unrecognized value for parameter in search', () => {
        assert(linksRe.determineViewMode(`?${PARAM_VIEW_MODE}=asd`) === '', 'not empty on incorrect parameter value');
        assert(
            linksRe.determineViewMode(`?${PARAM_VIEW_MODE}=${VIEW_MODE_WHISTLE}1`) === '',
            'not empty on incorrect parameter value'
        );
        assert(
            linksRe.determineViewMode(`?${PARAM_VIEW_MODE}=asdf&apple=sauce`) === '',
            'not empty on incorrect parameter value'
        );
        assert(
            linksRe.determineViewMode(`?apple=sauce&${PARAM_VIEW_MODE}=asdf`) === '',
            'not empty on incorrect parameter value'
        );
    });
    it('returns correct value when recognized value for parameter in search', () => {
        assert(
            linksRe.determineViewMode(`?${PARAM_VIEW_MODE}=${VIEW_MODE_WHISTLE}`) === VIEW_MODE_WHISTLE,
            'wrong response on correct parameter'
        );
        assert(
            linksRe.determineViewMode(`?${PARAM_VIEW_MODE}=${VIEW_MODE_WHISTLE}&apple=sauce`) === VIEW_MODE_WHISTLE,
            'wrong response on correct parameter'
        );
        assert(
            linksRe.determineViewMode(`?apple=sauce&${PARAM_VIEW_MODE}=${VIEW_MODE_WHISTLE}`) === VIEW_MODE_WHISTLE,
            'wrong response on correct parameter'
        );
    });
});

// 1st in the browser it is very expensive to re-create a regular expression many times, however, in nodejs is is very in-expensive (it is as if it is caching it).
describe('Performance', () => {
    const largeData = secureRandom.randomBuffer(1024 * 10).toString('hex');
    it('any, ' + largeData.length + ' bytes x 10,000', () => {
        for (let i = 0; i < 10000; i += 1) {
            const match = (largeData + 'https://example.com').match(linksRe.any());
            assert(match, 'no match');
            assert(match[0] === 'https://example.com', 'no match');
        }
    });
    it('image (large), ' + largeData.length + ' bytes x 10,000', () => {
        for (let i = 0; i < 10000; i += 1) {
            matchNot(
                linksRe.image(),
                'https://lh3.googleusercontent.com/OehcduRZPcVIX_2tlOKgYHADtBvorTfL4JtjfGAPWZyiiI9p_g2ZKEUKfuv3By-aiVfirXaYvEsViJEbxts6IeVYqidnpgkkkXAe0Q79_ARXX6CU5hBK2sZaHKa20U3jBzYbMxT-OVNX8-JYf-GYa2geUQa6pVpUDY35iaiiNBObF-TMIUOqm0P61gCdukTFwLgld2BBlxoVNNt_w6VglYHJP0W4izVNkEu7ugrU-qf2Iw9hb22SGIFNpbzL_ldomDMthIuYfKSYGsqe2ClvNKRz-_vVCQr7ggRXra16uQOdUUv5IVnkK67p9yR8ioajJ4tiGdzazYVow46pbeZ76i9_NoEYnOEX2_a7niofnC5BgAjoQEeoes1cMWVM7V8ZSexBA-cxmi0EVLds4RBkInvaUZjVL7h3oJ5I19GugPTzlyVyYtkf1ej6LNttkagqHgMck87UQGvCbwDX9ECTngffwQPYZlZKnthW0DlkFGgHN8T9uqEpl-3ki50gTa6gC0Q16mEeDRKZe7_g5Sw52OjMsfWxmBBWWMSHzlQKKAIKMKKaD6Td0O_zpiXXp7Fyl7z_iESvCpOAUAIKnyJyF_Y0UYktEmw=w2066-h1377-no'
            );
        }
    });
    it('image, ' + largeData.length + ' bytes x 10,000', () => {
        for (let i = 0; i < 10000; i += 1) {
            const match = (largeData + 'https://example.com/img.jpeg').match(linksRe.image());
            assert(match, 'no match');
            assert(match[0] === 'https://example.com/img.jpeg', 'no match');
        }
    });
    it('remote, ' + largeData.length + ' bytes x 10,000', () => {
        for (let i = 0; i < 10000; i += 1) {
            const match = (largeData + 'https://example.com').match(linksRe.remote());
            assert(match, 'no match');
            assert(match[0] === 'https://example.com', 'no match');
        }
    });
    it('youTube', () => {
        match(youtubeRegex.main, 'https://youtu.be/xG7ajrbj4zs?t=7s');
        match(youtubeRegex.main, 'https://www.youtube.com/watch?v=xG7ajrbj4zs&t=14s');
        match(youtubeRegex.main, 'https://www.youtube.com/watch?v=xG7ajrbj4zs&feature=youtu.be&t=14s');
    });
    it('youTubeId', () => {
        match(youtubeRegex.contentId, 'https://youtu.be/xG7ajrbj4zs?t=7s', 'xG7ajrbj4zs', 1);
        match(youtubeRegex.contentId, 'https://www.youtube.com/watch?v=xG7ajrbj4zs&t=14s', 'xG7ajrbj4zs', 1);
        match(
            youtubeRegex.contentId,
            'https://www.youtube.com/watch?v=xG7ajrbj4zs&feature=youtu.be&t=14s',
            'xG7ajrbj4zs',
            1
        );
    });
    it('threespeak', () => {
        match(threespeakRegex.main, 'https://3speak.co/watch?v=artemislives/tvxkobat');
        match(threespeakRegex.main, 'https://3speak.tv/watch?v=artemislives/tvxkobat');
        match(threespeakRegex.main, 'https://3speak.co/watch?v=artemislives/tvxkobat&jwsource=cl');
        match(threespeakRegex.main, 'https://3speak.tv/watch?v=artemislives/tvxkobat&jwsource=cl');
        match(threespeakRegex.main, 'https://3speak.co/embed?v=artemislives/tvxkobat');
        match(threespeakRegex.main, 'https://3speak.tv/embed?v=artemislives/tvxkobat');
    });
    it('threespeakId', () => {
        match(threespeakRegex.main, 'https://3speak.tv/watch?v=artemislives/tvxkobat', 'artemislives/tvxkobat', 1);
        match(
            threespeakRegex.main,
            'https://3speak.tv/watch?v=artemislives/tvxkobat&jwsource=cl',
            'artemislives/tvxkobat',
            1
        );
        match(threespeakRegex.main, 'https://3speak.tv/embed?v=artemislives/tvxkobat', 'artemislives/tvxkobat', 1);

        match(threespeakRegex.main, 'https://3speak.tv/watch?v=artemislives/tvxkobat', 'artemislives/tvxkobat', 1);
        match(
            threespeakRegex.main,
            'https://3speak.tv/watch?v=artemislives/tvxkobat&jwsource=cl',
            'artemislives/tvxkobat',
            1
        );
        match(threespeakRegex.main, 'https://3speak.tv/embed?v=artemislives/tvxkobat', 'artemislives/tvxkobat', 1);
    });
    it('threespeakImageLink', () => {
        match(
            threespeakRegex.htmlReplacement,
            '<a href="https://3speak.tv/watch?v=artemislives/tvxkobat" rel="noopener" title="This link will take you away from this site" class="steem-keychain-checked"><img src="https://images.hive.blog/768x0/https://img.3speakcontent.online/tvxkobat/post.png"></a>'
        );
    });
    it('twitter', () => {
        match(twitterRegex.main, 'https://twitter.com/quochuync/status/1274676558641299459');
        match(twitterRegex.sanitize, 'https://twitter.com/quochuync/status/1274676558641299459?ref_src=something');
        match(
            twitterRegex.htmlReplacement,
            '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Dear government and elites in the UK, a short thread about your attempted suppression of Tommy Robinson through your ability to control private enterprises like Twitter, Facebook and YouTube /1</p>&mdash; 🇮🇱Dr BrianofLondon.me (@brianoflondon) <a href="https://twitter.com/brianoflondon/status/1219518959168389121?ref_src=twsrc%5Etfw">January 21, 2020</a></blockquote>'
        );
        match(
            twitterRegex.htmlReplacement,
            '<blockquote><p>Dear government and elites in the UK, a short thread about your attempted suppression of Tommy Robinson through your ability to control private enterprises like Twitter, Facebook and YouTube /1</p>&amp;mdash; 🇮🇱Dr BrianofLondon.me (<a href="/@brianoflondon" class="keychainify-checked">@brianoflondon</a>) <a href="https://twitter.com/brianoflondon/status/1219518959168389121?ref_src=twsrc%5Etfw" rel="nofollow noopener" title="This link will take you away from hive.blog">January 21, 2020</a></blockquote>'
        );
    });
    it('tiktok', () => {
        match(tiktokRegex.main, 'https://www.tiktok.com/@quochuync/video/7009483703462202625?is_copy_url=1&is_from_webapp=v1');
        match(tiktokRegex.main, 'https://www.tiktok.com/@quochuync/video/7009483703462202625');
        match(
            tiktokRegex.htmlReplacement,
            '<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@quochuync/video/7009483703462202625" data-video-id="7009483703462202625" style="max-width: 605px;min-width: 325px;" > <section> <a target="_blank" title="@quochuync" href="https://www.tiktok.com/@quochuync">@quochuync</a> <p>Making an aluminium flat bar mark tree. <a title="chime" target="_blank" href="https://www.tiktok.com/tag/chime">##chime</a> <a title="windchime" target="_blank" href="https://www.tiktok.com/tag/windchime">##windchime</a> <a title="marktree" target="_blank" href="https://www.tiktok.com/tag/marktree">##marktree</a> <a title="percussion" target="_blank" href="https://www.tiktok.com/tag/percussion">##percussion</a> <a title="musicinstrument" target="_blank" href="https://www.tiktok.com/tag/musicinstrument">##musicinstrument</a> <a title="music" target="_blank" href="https://www.tiktok.com/tag/music">##music</a> <a title="crafts" target="_blank" href="https://www.tiktok.com/tag/crafts">##crafts</a> <a title="diy" target="_blank" href="https://www.tiktok.com/tag/diy">##diy</a></p> <a target="_blank" title="♬ original sound - Quốc Huy" href="https://www.tiktok.com/music/original-sound-7009483610071845634">♬ original sound - Quốc Huy</a> </section> </blockquote> <script async src="https://www.tiktok.com/embed.js"></script>'
        );
    });
    it('instagram', () => {
        match(instagramRegex.main, 'https://www.instagram.com/p/CUHErIOAM1v/');
        match(instagramRegex.main, 'https://www.instagram.com/p/CUHErIOAM1v');
        match(
            instagramRegex.htmlReplacement,
            '<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/reel/CUHErIOAM1v/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="13" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/reel/CUHErIOAM1v/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;"> View this post on Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/reel/CUHErIOAM1v/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">A post shared by Quoc-Huy NGUYEN DINH (@quochuyinoz)</a></p></div></blockquote> <script async src="//www.instagram.com/embed.js"></script>'
        );
    });
    it('reddit', () => {
        match(
            redditRegex.main,
            'https://www.reddit.com/r/Kefir/comments/l1ntst/is_this_kahn_yeast_its_always_start_appearing/'
        );
        match(
            redditRegex.sanitize,
            'https://www.reddit.com/r/Kefir/comments/l1ntst/is_this_kahn_yeast_its_always_start_appearing/'
        );
        match(
            redditRegex.htmlReplacement,
            '<blockquote class="reddit-card" data-card-created="1614855336"><a href="https://www.reddit.com/r/CryptoCurrency/comments/lxcmup/to_all_the_small_hodlers_keeping_your_coins_at_an/">To all the small hodlers, keeping your coins at an exchange might be the best thing for you</a> from <a href="http://www.reddit.com/r/CryptoCurrency">r/CryptoCurrency</a></blockquote>\n'
                + '<script async src="//embed.redditmedia.com/widgets/platform.js" charset="UTF-8"></script>'
        );
        match(
            redditRegex.htmlReplacement,
            '<blockquote class="reddit-card" data-card-created="1614855336"><a href="https://www.reddit.com/r/CryptoCurrency/comments/lxcmup/to_all_the_small_hodlers_keeping_your_coins_at_an/">To all the small hodlers, keeping your coins at an exchange might be the best thing for you</a> from <a href="http://www.reddit.com/r/CryptoCurrency">r/CryptoCurrency</a></blockquote>\n'
                + '<script async src="//embed.redditmedia.com/widgets/platform.js" charset="UTF-8"></script>'
        );
    });
    it('spotify', () => {
        match(spotifyRegex.main, 'https://open.spotify.com/playlist/37i9dQZF1DWSDCcNkUu5tr?si=WPhzYzqATGSIa0d3kbNgBg');
        match(spotifyRegex.main, 'https://open.spotify.com/show/37i9dQZF1DWSDCcNkUu5tr?si=WPhzYzqATGSIa0d3kbNgBg');
        match(spotifyRegex.main, 'https://open.spotify.com/episode/37i9dQZF1DWSDCcNkUu5tr?si=WPhzYzqATGSIa0d3kbNgBg');
        match(spotifyRegex.main, 'https://open.spotify.com/album/7f6Vo2c0GMRcvkdgsLaPld?si=RChe9-s5TxaoHGNxG5mAHw');
        match(spotifyRegex.main, 'https://open.spotify.com/track/7ngO2TJ9Gg9VCzNSJF2O4N');
        match(spotifyRegex.main, 'https://open.spotify.com/artist/70eAfg5WeShjPxtD9Yi6P9');
        match(spotifyRegex.sanitize, 'https://open.spotify.com/embed/playlist/37i9dQZF1DWSDCcNkUu5tr');
        match(spotifyRegex.sanitize, 'https://open.spotify.com/embed-podcast/show/37i9dQZF1DWSDCcNkUu5tr');
        match(spotifyRegex.sanitize, 'https://open.spotify.com/embed-podcast/episode/37i9dQZF1DWSDCcNkUu5tr');
        match(spotifyRegex.sanitize, 'https://open.spotify.com/embed/album/7f6Vo2c0GMRcvkdgsLaPld');
        match(spotifyRegex.sanitize, 'https://open.spotify.com/embed/track/6V4oUHrin3AlMarW8MsnIK?si=03e929f5a0ad4893');
        match(
            spotifyRegex.sanitize,
            'https://open.spotify.com/embed/artist/70eAfg5WeShjPxtD9Yi6P9?si=VDDO-Ju9TOqTw_pS5piraA'
        );
    });
    it('mixcloud', () => {
        match(
            mixcloudRegex.main,
            'https://www.mixcloud.com/MagneticMagazine/ambient-meditations-vol-21-anane/',
            'https://www.mixcloud.com/MagneticMagazine/ambient-meditations-vol-21-anane'
        );
        match(
            mixcloudRegex.sanitize,
            'https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2FMagneticMagazine%2Fambient-meditations-vol-21-anane%2F'
        );
    });
    it('archiveorg', () => {
        match(archiveorg.main, 'https://archive.org/details/geometry_dash_1.9');
        match(archiveorg.sanitize, 'https://archive.org/embed/geometry_dash_1.9');
    });
    it('bandcamp', () => {
        match(
            bandcamp.sanitize,
            'https://bandcamp.com/EmbeddedPlayer/album=313320652/size=large/bgcol=ffffff/linkcol=0687f5/tracklist=false/transparent=true/'
        );
    });
    it('gist', () => {
        match(gist.main, 'https://gist.github.com/huysbs/647a50197b95c4027550a2cc558af6aa');
        match(gist.sanitize, 'https://gist.github.com/huysbs/647a50197b95c4027550a2cc558af6aa.js');
        match(
            gist.htmlReplacement,
            '<script src="https://gist.github.com/huysbs/647a50197b95c4027550a2cc558af6aa.js"></script>'
        );
    });
    it('truvvl', () => {
        match(
            truvvl.main,
            'https://travelfeed.io/@tvt3st/prague-to-sarajevo-cool-places-in-europe-europe-prague-zagreb-bosnia-20210420t103208397z'
        );
        match(
            truvvl.sanitize,
            'https://embed.truvvl.com/@tvt3st/prague-to-sarajevo-cool-places-in-europe-europe-prague-zagreb-bosnia-20210420t103208397z'
        );
    });
});

const match = (...args) => compare(true, ...args);
const matchNot = (...args) => compare(false, ...args);
const compare = (matching, re, input, output = input, pos = 0) => {
    if (Array.isArray(input)) {
        for (let i = 0; i < input.length; i += 1) compare(matching, re, input[i], output[i]);
        return;
    }
    // console.log('compare, input', input)
    // console.log('compare, output', output)
    const m = input.match(re);
    if (matching) {
        assert(m, `No match --> ${input} --> output ${output} --> using ${re.toString()}`);
        // console.log('m', m)
        assert.equal(
            m[pos],
            output,
            `Unmatched ${m[pos]} --> input ${input} --> output ${output} --> using ${re.toString()}`
        );
    } else {
        assert(!m, `False match --> input ${input} --> output ${output} --> using ${re.toString()}`);
    }
};

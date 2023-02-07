import koa_router from 'koa-router';
import { routeRegex } from 'app/ResolveRoute';
import { api } from '@hiveio/hive-js';
import GDPRUserList from 'app/utils/GDPRUserList';

export default function usePostJson(app) {
    const router = koa_router();
    app.use(router.routes());

    router.get(routeRegex.PostJson, async (ctx) => {
        // validate and build post details in JSON
        const author = ctx.url.match(/(@[\w\d.-]+)/)[0].replace('@', '');
        const permalink = ctx.url.match(/(@[\w\d.-]+)\/?([\w\d-]+)/)[2];
        let status = '';
        let post = await api.getContentAsync(author, permalink);

        if (GDPRUserList.includes(post.author)) {
            post = 'Content unavailable';
            status = '451';
        } else if (post.author) {
            status = '200';
            // try parse for post metadata
            try {
                post.json_metadata = JSON.parse(post.json_metadata);
            } catch (e) {
                post.json_metadata = '';
            }
        } else {
            post = 'No post found';
            status = '404';
        }
        // return response and status code
        ctx.body = { post, status };
    });
}

/**
 * Render html page using server template.
 *
 * @param {string} [title='Oauth Flow']
 * @param {string} [content='']
 * @param {string} [script='']
 * @param {string} [style='']
 * @returns
 */
export default function renderServerPage(
        title = 'Blog',
        content = '',
        script = '',
        style = ''
        ) {

    return `
    <!DOCTYPE html>
    <html>

        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="icon" type="image/ico" href="/favicon.ico" />
            <title>${title} - hive.blog</title>

            <style>
                body {
                    margin: 0 auto;
                    font-family: Tahoma, Verdana, Arial, sans-serif;
                    padding: 20px;
                }
                .content {
                    max-width: 35em;
                }
                .center-x {
                    margin-left: auto;
                    margin-right: auto;
                }
                .center-text {
                    text-align: center;
                }
                #countdown {
                    font-weight: bold;
                    color: red;
                }
                ${style}
            </style>

            ${script ? '<script>' + script + '</script>' : ''}

        </head>

        <body>

            <div class="content center-x">
                <div>
                    <img alt="logo" width="150" height="40" src="/images/hive-blog-logo.svg">
                </div>
                <div>
                    <h1>${title}</h1>
                    ${content}
                </div>
            </div>

        </body>
    </html>
    `;
}

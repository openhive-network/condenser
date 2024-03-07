const remarkableParagraph = (md) => {
    console.log('remarkableParagraph');
    md.renderer.rules.paragraph_open = function (tokens, idx /*, options, env */) {
        return tokens[idx].tight ? '' : '<p dir="auto">';
    };
};

export default remarkableParagraph;

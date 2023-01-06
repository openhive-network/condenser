/** Removes all markdown leaving just plain text */
const remarkableTable = (md) => {
    md.renderer.rules.table_open = () => {
        return '<div class="table-responsive"><table>\n';
    };

    md.renderer.rules.table_close = () => {
        return '</table></div>\n';
    };
};

export default remarkableTable;

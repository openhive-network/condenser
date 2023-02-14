import React, { PureComponent } from 'react';
import tt from 'counterpart';
import classNames from "classnames";
import PropTypes from 'prop-types';

class Pagination extends PureComponent {
    static propTypes = {
        nbReplies: PropTypes.number.isRequired,
        currentReplyPage: PropTypes.number.isRequired,
        nbRepliesPerPage: PropTypes.number.isRequired,
        onClick: PropTypes.func.isRequired,
    };

    render() {
        const {
            currentReplyPage, nbRepliesPerPage = 20, nbReplies, onClick,
        } = this.props;

        const nbPages = Math.ceil(nbReplies / nbRepliesPerPage);

        const pageLinks = [];

        const handleClick = (page) => {
            onClick(page);
        };

        let fromPage = currentReplyPage - 5;
        if (fromPage < 0) {
            fromPage = 0;
        }

        let toPage = nbPages < 10 ? nbPages : currentReplyPage + 5;
        if (toPage > nbPages) {
            toPage = nbPages;
        }

        if (
            nbPages > 4
            && fromPage >= 4
            && toPage >= (nbPages - 4)
        ) {
            for (let pi = 0; pi < 4; pi += 1) {
                pageLinks.push(
                    <button
                        key={pi.toString()}
                        type="button"
                        className="Post__reply_pagelink"
                        onClick={() => {
                            handleClick(pi + 1);
                        }}
                    >
                        {pi + 1}
                    </button>
                );
            }

            pageLinks.push(
                <span className="Post_reply_pagelink_separator">...</span>
            );
        }

        for (let pi = fromPage; pi < toPage; pi += 1) {
            pageLinks.push(
                <button
                    key={pi.toString()}
                    type="button"
                    className={classNames('Post__reply_pagelink', (pi + 1) === currentReplyPage && 'current_page')}
                    onClick={() => {
                        handleClick(pi + 1);
                    }}
                >
                    {pi + 1}
                </button>
            );
        }

        if (nbPages > 4 && toPage < (nbPages - 4)) {
            pageLinks.push(
                <span className="Post_reply_pagelink_separator">...</span>
            );

            for (let pi = nbPages - 4; pi < nbPages; pi += 1) {
                pageLinks.push(
                    <button
                        key={pi.toString()}
                        type="button"
                        className="Post__reply_pagelink"
                        onClick={() => {
                            handleClick(pi + 1);
                        }}
                    >
                        {pi + 1}
                    </button>
                );
            }
        }

        if (nbPages <= 1) {
            return null;
        }

        return (
            <div className="Post__reply_pagination">
                <b>{tt('pagination_jsx.numberOfPages', { count: nbPages })}</b>
                <div>
                    <span className="Post__reply_label">{tt('pagination_jsx.pages')}</span>
                    {pageLinks}
                </div>
            </div>
        );
    }
}

export default Pagination;
